import assert from 'assert'
import { deprecate } from 'util'
import Executor from './execute'
import { evaluateWithStackFrame } from './stack-frame'
import { isFunction } from './utils'

export const CREATE_INITIAL_CONTEXT = '_CREATE_INITIAL_CONTEXT'

const deprecateInitialContext = deprecate(() => {
}, 'using initial context is deprecated, use this with prototype to hide non-command-functions')

function* collectCommandNames(backend) {
  if (backend === Object.prototype) return
  for (const k of Object.getOwnPropertyNames(backend)) {
    if (k[0] !== '_' && k !== 'constructor' && isFunction(backend[k])) {
      yield k
    }
  }
  yield* collectCommandNames(Object.getPrototypeOf(backend))
}

export default class Context {
  constructor() {
    this._commands = new Executor()
    this._id = 0
  }

  use(...backends) {
    assert(backends.length > 0, 'Must provide at least one backend')
    const commands = Array.from(new Set(collectCommandNames(backends[0])))
    assert(commands.filter(op => this._commands[op]).length === 0, `Commands already bound: ${commands.filter(op => this._commands[op]).join(', ')}`)

    const backendData = backends.map((backend) => {
      let context
      if (backend[CREATE_INITIAL_CONTEXT]) {
        deprecateInitialContext()
        context = backend[CREATE_INITIAL_CONTEXT]()
      } else {
        context = backend
      }
      this._id += 1
      const key = `_backend.${this._id}`
      this._commands[key] = context
      const invoker = (fn, next) => {
        if (fn.length === 1) {
          return function directCommand(payload) {
            return fn.call(this[key], payload)
          }
        }
        return function contextCommand(payload) {
          const execute = (value, subcontext) => {
            const { stackFrame } = payload
            const _ctx = subcontext
              ? Object.create(this, { [key]: { value: subcontext } })
              : this

            return _ctx.execute(evaluateWithStackFrame(stackFrame, value))
          }
          const commandContext = { execute }
          if (next) {
            commandContext.next = () => next.call(this, payload)
          }
          return fn.call(this[key], payload, commandContext)
        }
      }

      return { backend, invoker }
    })


    for (const op of commands) {
      this._commands[op] = backendData.reduceRight((previousValue, { backend, invoker }) => {
        const fn = backend[op]
        if (!fn) return null
        assert(isFunction(fn), `command.type "${op}" must be a function`)
        assert(fn.length <= 2, `command.type "${op}" must take max two arguments (not ${fn.length})`)
        return invoker(fn, previousValue)
      }, null)
    }
    return this
  }
  async execute(value) {
    return this._commands.execute(value)
  }
}
