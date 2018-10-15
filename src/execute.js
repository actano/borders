import assert from 'assert'
import { deprecate } from 'util'
import getCommands from './get-commands'
import { TYPE_ITERATE } from './iterate-command'
import iteratorToAsync from './iterator-to-async'
import { TYPE_MAP } from './map-command'
import { TYPE_PARALLEL } from './parallel-command'
import { evaluateWithStackFrame, withStackFrame } from './stack-frame'
import './symbol-async-iterator'
import { isFunction, isGenerator, isString } from './utils'
import valueType, { ARRAY, COMMAND, ITERATOR } from './value-type'
import yieldToEventLoop from './yield-to-event-loop'

const deprecateIterator = deprecate(() => {
  // throw new Error()
}, 'yielding an iterator is deprecated, yield `iterate` or `parallel` commands instead')
const deprecateArray = deprecate(() => {
  // throw new Error()
}, 'yielding an array is deprecated, yield `iterate` or `parallel` commands instead')

function* mapCollection(self, collection, iteratee) {
  for (const item of collection) {
    const value = iteratee(item)
    const type = valueType(value)
    if (type === COMMAND || type === ITERATOR) {
      yield self.execute(value)
    } else {
      yield value
    }
  }
}

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
            const execute = (value, subcontext) => {
              const { stackFrame } = payload
              const _ctx = subcontext
                ? Object.create(this, { [key]: { value: subcontext } })
                : this

              return _ctx.execute(evaluateWithStackFrame(stackFrame, value))
            }
            const invoke = (command, _backend) => this[COMMAND](command, _backend)
            const commandContext = { execute, connect, invoke }
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
    return iteratorToAsync(mapCollection(this, collection, iteratee))
  }

  async [COMMAND](value, backend) {
    const { type, payload, stackFrame } = value
    assert(isString(type), 'command.type must be string')
    assert(type[0] !== '_', `command.type "${type}" must not start with _`)
    const fn = backend ? backend[type] : this[type]
    assert(isFunction(fn), `command.type "${type}" is not a function`)
    const res = withStackFrame(stackFrame, () => fn.call(this, payload))
    if (isGenerator(res) && type !== TYPE_ITERATE && type !== TYPE_MAP && type !== TYPE_PARALLEL) {
      throw new Error('implementing a command as generator is deprecated, call execute (2nd parameter) instead')
    }

    return res
  }

  async [ITERATOR](value) {
    deprecateIterator()
    return this.execute(value)
  }

  async [ARRAY](value) {
    deprecateArray()
    return Promise.all(value.map(v => this.execute(v)))
  }

  async execute(value) {
    const type = valueType(value)
    if (type === null) {
      throw new Error(`Cannot execute ${value}`)
    }
    if (type === ITERATOR) {
      const v = await this._iterate(value).next()
      if (!v.done) {
        throw new Error(`yielding literal values inside execute is not allowed: ${v.value}`)
      }
      return v.value
    }
    return this[type](value)
  }

  async* _step(iterator, value) {
    const type = valueType(value)
    let nextValue
    try {
      if (type === null) {
        nextValue = yield value
      } else {
        nextValue = await this[type](value)
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
