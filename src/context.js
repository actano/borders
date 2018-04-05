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

const withStackFrame = (stackFrame, fn) => {
  if (!stackFrame) {
    return fn()
  }

  let result
  try {
    result = fn()
  } catch (e) {
    stackFrame.attachStack(e)
    throw e
  }

  if (isGenerator(result)) {
    return (function* () {
      try {
        return yield* result
      } catch (e) {
        stackFrame.attachStack(e)
        throw e
      }
    }())
  }

  if (!isPromise(result)) {
    return result
  }

  return result.then(undefined, (reason) => {
    stackFrame.attachStack(reason)
    throw reason
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
    const { type, payload, stackFrame } = command
    assert(isString(type), 'command.type must be string')
    assert(isFunction(this._commands[type]), `command.type "${type}" is unknown`)
    return withStackFrame(stackFrame, () => this._commands[type](payload))
  }

  /* eslint-disable no-await-in-loop */
  async execute(generator) {
    const fromAny = async (value) => {
      if (isCommand(value)) {
        const result = this.executeCommand(value)
        if (isGenerator(result)) {
          return this.execute(result)
        }
        return result
      }
      if (isPromise(value)) {
        return value
      }
      if (isIterable(value)) {
        return pMap(value, this._fork)
      }
      throw new Error(`Neither promise nor action was yielded: ${value}`)
    }

    let v = await generator.next()
    while (!v.done) {
      try {
        const nextValue = await fromAny(v.value)
        v = await generator.next(nextValue)
      } catch (e) {
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
