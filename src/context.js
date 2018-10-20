import assert from 'assert'
import { standard } from './backends'
import getCommands from './backends/get-commands'
import { TYPE_ITERATE } from './commands/iterate'
import iteratorToAsync from './iterator-to-async'
import { evaluateWithStackFrame, withStackFrame } from './stack-frame'
import './symbol-async-iterator'
import { isCommand, isString } from './utils'
import yieldToEventLoop from './yield-to-event-loop'
import getBackends from './get-backends'

export default class Context {
  constructor() {
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
    return this
  }

  _command(value, ...backends) {
    const { type, payload, stackFrame } = value
    if (type === TYPE_ITERATE) {
      return iteratorToAsync(this._iterate(evaluateWithStackFrame(stackFrame, payload)))
    }
    const _backends = backends.length === 0 ? this._commands[type] : backends

    assert(isString(type), 'command.type must be string')
    assert(type[0] !== '_', `command.type "${type}" must not start with _`)

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
        const execute = (_value, subcontext) => {
          const _subcontext = (subcontext
            ? Object.create(this, { [key]: { value: subcontext } })
            : this)
          const _subbackends = getBackends(_value)
          if (_subbackends.length) {
            return _subcontext._command(_value, ..._subbackends)
          }
          return _subcontext.execute(_value)
        }

        const commandContext = next ? { execute, next } : { execute }
        return fn.call(context, payload, commandContext)
      }
    }

    return withStackFrame(stackFrame, createNext(0))
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
