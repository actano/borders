import assert from 'assert'
import { isFunction, isString, isPromise, isCommand } from './utils'

export default class Context {
  constructor() {
    this._commands = {}
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

  async execute(iterator) {
    let v = iterator.next()
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
        } else {
          throw new Error(`Neither promise nor action was yielded: ${value}`)
        }
        v = iterator.next(nextValue)
        if (isPromise(v)) v = await v; // eslint-disable-line no-await-in-loop
        ({ done, value } = v)
      } catch (e) {
        v = iterator.throw(e)
        if (isPromise(v)) v = await v; // eslint-disable-line no-await-in-loop
        ({ done, value } = v)
      }
    }
    return value
  }
}
