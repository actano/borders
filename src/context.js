import assert from 'assert'
import pMap from 'p-map'
import {
  isFunction,
  isString,
  isPromise,
  isCommand,
  isGenerator,
  generatorForSingleValue,
  isIterable,
} from './utils'

async function yieldToEventLoop() {
  return new Promise((resolve) => {
    setImmediate(resolve)
  })
}

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

  /* eslint-disable no-await-in-loop */
  async execute(generator) {
    let v = await generator.next()
    while (!v.done) {
      const { value } = v
      let nextValue
      let stackFrame
      try {
        if (isCommand(value)) {
          ({ stackFrame } = value)
          nextValue = await this.executeCommand(value)
        } else if (isPromise(value)) {
          nextValue = await value
        } else if (isIterable(value)) {
          nextValue = await pMap(value, this._fork)
        } else {
          throw new Error(`Neither promise nor action was yielded: ${value}`)
        }
        v = await generator.next(nextValue)
      } catch (e) {
        if (stackFrame) {
          stackFrame.attachStack(e)
        }
        v = await generator.throw(e)
      }

      // Yield to the node.js event loop to make sure that other tasks are not blocked by the
      // current execution. Note: Just awaiting a promise is not enough since promises which don't
      // contain i/o are immediately resolved afterwards on the micro-task queue before any other
      // task has the chance to run.
      await yieldToEventLoop()
    }
    return v.value
  }
  /* eslint-enable no-await-in-loop */

  async _fork(instructions) {
    if (isGenerator(instructions)) {
      return this.execute(instructions)
    }

    return this.execute(generatorForSingleValue(instructions))
  }
}
