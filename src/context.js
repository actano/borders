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
import ExecutionContext from './execution-context'
import { TYPE_PARALLEL } from './parallel-command'
import { TYPE_PROMISE } from './promise-command'

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

  async execute(generator) {
    return this._execute(generator, null)
  }

  _executeCommand(command, executionContext) {
    const { type, payload, stackFrame } = command
    assert(isString(type), 'command.type must be string')
    if (type === TYPE_PROMISE) {
      return payload
    }
    if (type === TYPE_PARALLEL) {
      return Promise.all(payload.map(v => this._execute(v, executionContext)))
    }
    assert(isFunction(this._commands[type]), `command.type "${type}" is unknown`)
    return withStackFrame(stackFrame, () => this._commands[type](payload, executionContext))
  }

  /* eslint-disable no-await-in-loop */
  async _execute(generator, parentExecutionContext) {
    const executionContext = new ExecutionContext(parentExecutionContext)
    const fromAny = async (value) => {
      if (isCommand(value)) {
        const result = this._executeCommand(value, executionContext)
        if (isGenerator(result)) {
          return this._execute(result, executionContext)
        }
        return result
      }
      if (isPromise(value)) {
        return value
      }
      if (isIterable(value)) {
        return pMap(value, x => this._fork(x, executionContext))
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

  async _fork(instructions, executionContext) {
    if (isGenerator(instructions)) {
      return this._execute(instructions, executionContext)
    }

    return this._execute(generatorForSingleValue(instructions), executionContext)
  }
}
