import assert from 'assert'
import getCommands from './backends/get-commands'
import { TYPE_ITERATE } from './commands/iterate'
import iteratorToAsync from './iterator-to-async'
import { TYPE_MAP } from './commands/map'
import { TYPE_PARALLEL } from './commands/parallel'
import { evaluateWithStackFrame, withStackFrame } from './stack-frame'
import './symbol-async-iterator'
import { isCommand, isFunction, isString } from './utils'
import yieldToEventLoop from './yield-to-event-loop'

class Executor {
  constructor() {
    let _id = 0

    const connect = (...backends) => {
      assert(backends.length > 0, 'Must provide at least one backend')

      const connectBackend = (backend, nextBackend) => {
        _id += 1
        const key = `_backend.${_id}`
        this[key] = backend
        const invoker = (fn, next) => {
          if (fn.length === 1) {
            return function directCommand(payload) {
              return fn.call(this[key], payload)
            }
          }
          return function contextCommand(payload) {
            const execute = async (value, subcontext) => {
              const { stackFrame } = payload
              const _ctx = subcontext
                ? Object.create(this, { [key]: { value: subcontext } })
                : this
              if (isCommand(value)) {
                let _backend = await value.backend
                if (isFunction(_backend)) {
                  _backend = await _backend(connect)
                }
                return _ctx._command(value, _backend)
              }
              return _ctx.execute(evaluateWithStackFrame(stackFrame, value))
            }
            const commandContext = {
              execute,
            }
            if (next) {
              commandContext.next = () => next.call(this, payload)
            }
            return fn.call(this[key], payload, commandContext)
          }
        }

        const result = {}
        for (const op of getCommands(backend)) {
          const fn = backend[op]
          assert(fn.length <= 2, `command.type "${op}" must take max two arguments (not ${fn.length})`)
          result[op] = invoker(fn, nextBackend && nextBackend[op])
        }
        return result
      }

      return backends.reduceRight((prev, backend) => connectBackend(backend, prev), null)
    }

    this._connect = connect

    this._use = (...backends) => {
      assert(backends.length > 0, 'Must provide at least one backend')
      const commands = getCommands(backends[0])
      assert(commands.filter(op => this[op]).length === 0, `Commands already bound: ${commands.filter(op => this[op]).join(', ')}`)
      Object.assign(this, this._connect(...backends))
    }
  }

  [TYPE_PARALLEL](payload) {
    return Promise.all(payload.map(v => this.execute(v)))
  }

  [TYPE_ITERATE](payload) {
    return iteratorToAsync(this._iterate(payload))
  }

  [TYPE_MAP](payload) {
    const { collection, iteratee } = payload

    function* mapCollection() {
      for (const item of collection) {
        yield this.execute(iteratee(item))
      }
    }

    return iteratorToAsync(mapCollection.call(this))
  }

  async _command(value, backend) {
    const { type, payload, stackFrame } = value
    assert(isString(type), 'command.type must be string')
    assert(type[0] !== '_', `command.type "${type}" must not start with _`)
    const fn = backend ? backend[type] : this[type]
    assert(isFunction(fn), `command.type "${type}" is not a function`)
    return withStackFrame(stackFrame, () => fn.call(this, payload))
  }

  async execute(value) {
    if (isCommand(value)) {
      return this._command(value)
    }
    const v = await this._iterate(value).next()
    if (!v.done) {
      throw new Error(`yielding literal values inside execute is not allowed: ${v.value}`)
    }
    return v.value
  }

  async* _step(iterator, value) {
    let nextValue
    try {
      if (isCommand(value)) {
        nextValue = await this._command(value)
      } else {
        nextValue = yield value
      }
      await yieldToEventLoop()
    } catch (e) {
      return iterator.throw(e)
    }
    return iterator.next(nextValue)
  }

  async* _iterate(iterator) {
    let v = await iterator.next()
    while (!v.done) {
      v = yield* this._step(iterator, v.value)
    }
    return v.value
  }
}

export default Executor
