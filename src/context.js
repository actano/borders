import assert from 'assert'
import EventEmitter from 'events'
import { getListeningEvents, standard, listenerName } from './backends'
import getCommands from './backends/get-commands'
import { withStackFrame } from './stack-frame'
import './symbol-async-iterator'
import { isCommand, isString } from './utils'
import yieldToEventLoop from './yield-to-event-loop'
import getBackends from './get-backends'

export const EVENT_INVOKE = 'invoke'

export default class Context extends EventEmitter {
  constructor() {
    super()
    const keys = new Map()
    this._keyFor = (backend) => {
      const key = keys.get(backend)
      if (key) return key
      const newKey = `_backend.${keys.size + 1}`
      keys.set(backend, newKey)
      return newKey
    }
    this._commands = {}
    this.use(standard())
  }

  use(...backends) {
    assert(backends.length > 0, 'Must provide at least one backend')
    const commands = getCommands(backends[0])
    assert(commands.filter(op => this._commands[op]).length === 0, `Commands already bound: ${commands.filter(op => this._commands[op]).join(', ')}`)
    for (const op of commands) {
      this._commands[op] = backends
    }
    backends.forEach((backend) => {
      const events = getListeningEvents(backend)
      events.forEach((event) => {
        const key = this._keyFor(backend)
        const fn = backend[listenerName(event)]
        this.on(event, function listener(...args) {
          const context = this[key] || backend
          return fn.apply(context, args)
        })
      })
    })
    return this
  }

  _command(value, ...backends) {
    const { type, payload, stackFrame } = value
    const _backends = backends.length === 0 ? this._commands[type] : backends

    assert(_backends, `No backends for command ${type}`)
    assert(isString(type), 'command.type must be string')
    assert(type[0] !== '_', `command.type "${type}" must not start with _`)

    this.emit(EVENT_INVOKE, type, payload)

    const createNext = (index) => {
      const fn = index < _backends.length && _backends[index][type]
      if (!fn) {
        return null
      }

      assert(fn.length <= 2, `command.type "${type}" must take max two arguments (not ${fn.length})`)

      return () => {
        const backend = _backends[index]
        const key = this._keyFor(backend)
        const context = this[key] || backend

        if (fn.length === 1) {
          return fn.call(context, payload)
        }

        const next = createNext(index + 1)
        const withContext = subcontext => (subcontext
          ? Object.create(this, { [key]: { value: subcontext } })
          : this)

        const execute = (_value, subcontext) => {
          const _subbackends = getBackends(_value)
          if (_subbackends.length) {
            return withContext(subcontext)._command(_value, ..._subbackends)
          }
          return withContext(subcontext).execute(_value)
        }

        const iterate = (_value, subcontext) => withContext(subcontext).iterate(_value)

        const commandContext = next ? { execute, iterate, next } : { execute, iterate }
        return fn.call(context, payload, commandContext)
      }
    }

    return withStackFrame(stackFrame, createNext(0))
  }

  async execute(value) {
    const v = await this.iterate(value).next()
    if (!v.done) {
      throw new Error(`yielding literal values inside execute is not allowed: ${v.value}`)
    }
    return v.value
  }

  async* iterate(value) {
    if (isCommand(value)) {
      return this._command(value)
    }

    const context = this
    const step = async function* step(v) {
      let nextValue
      try {
        if (isCommand(v)) {
          nextValue = await context._command(v)
        } else {
          nextValue = yield v
        }
        await yieldToEventLoop()
      } catch (e) {
        return value.throw(e)
      }
      return value.next(nextValue)
    }

    let v = await value.next()
    while (!v.done) {
      v = yield* step(v.value)
    }
    return v.value
  }
}
