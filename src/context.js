import assert from 'assert'
import execute from './execute'
import { isFunction } from './utils'

export const CREATE_INITIAL_CONTEXT = '_CREATE_INITIAL_CONTEXT'

export default class Context {
  constructor() {
    this._commands = {}
    this._evaluator = execute(this._commands)
    this._id = 0
  }

  use(backend) {
    const context = backend[CREATE_INITIAL_CONTEXT] ? backend[CREATE_INITIAL_CONTEXT]() : backend
    this._id += 1
    const key = `_backend.${this._id}`
    this._commands[key] = context

    const invoker = (fn) => {
      if (fn.length === 1) {
        return function directCommand(payload) {
          return fn.call(this[key], payload)
        }
      }
      return function contextCommand(payload, commandContext) {
        const _context = Object.create(commandContext, {
          execute: {
            value: (value, subcontext) => {
              if (subcontext) {
                const _ctx = Object.create(this, {
                  [key]: {
                    value: subcontext,
                  },
                })
                return commandContext.execute(value, _ctx)
              }
              return commandContext.execute(value)
            },
          },
        })
        return fn.call(this[key], payload, _context)
      }
    }

    for (const op of Object.keys(backend)) {
      assert(!this._commands[op], `command.type ${op} already bound`)
      const fn = backend[op]
      assert(isFunction(fn), `command.type "${op}" must be a function`)
      assert(fn.length <= 2, `command.type "${op}" must take max two arguments (not ${fn.length})`)
      this._commands[op] = invoker(fn)
    }
    return this
  }
  async execute(value) {
    return this._evaluator.execute(value)
  }
}
