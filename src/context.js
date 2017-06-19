import assert from 'assert'
import pMap from 'p-map'
import { isFunction, isString, isPromise, isCommand, isGenerator, generatorForSingleValue,
  isIterable } from './utils'

export default class Context {
  constructor() {
    this._commands = {}
    this._fork = this._fork.bind(this)
  }

  use(backend) {
    for (const op of Object.keys(backend)) {
      if (this._commands[op]) {
        throw new Error(`Command ${op} already bound`)
      }
      this._commands[op] = backend[op].bind(backend)
    }
    return this
  }

  executeCommand(command) {
    const { type, payload } = command
    assert(isString(type), 'command.type must be string')
    assert(isFunction(this._commands[type]), `command.type "${type}" is unknown`)
    return this._commands[type](payload)
  }

  async execute(generator) {
    let v = generator.next()
    if (isPromise(v)) v = await v
    let { done, value } = v
    while (!done) {
      let nextValue
      try {
        if (isCommand(value)) {
          nextValue = this.executeCommand(value)
          if (isPromise(nextValue)) {
            nextValue = await nextValue // eslint-disable-line no-await-in-loop
          }
        } else if (isPromise(value)) {
          nextValue = await value // eslint-disable-line no-await-in-loop
        } else if (isIterable(value)) {
          // eslint-disable-next-line no-await-in-loop
          nextValue = await pMap(value, this._fork)
        } else {
          throw new Error(`Neither promise nor action was yielded: ${value}`)
        }
        v = generator.next(nextValue)
        if (isPromise(v)) v = await v; // eslint-disable-line no-await-in-loop
        ({ done, value } = v)
      } catch (e) {
        v = generator.throw(e)
        if (isPromise(v)) v = await v; // eslint-disable-line no-await-in-loop
        ({ done, value } = v)
      }
    }
    return value
  }

  async _fork(instructions) {
    if (isGenerator(instructions)) {
      return this.execute(instructions)
    }

    return this.execute(generatorForSingleValue(instructions))
  }
}
