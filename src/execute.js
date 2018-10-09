import assert from 'assert'
import { deprecate } from 'util'
import { TYPE_ITERATE } from './iterate-command'
import iteratorToAsync from './iterator-to-async'
import { TYPE_MAP } from './map-command'
import { TYPE_PARALLEL } from './parallel-command'
import { evaluateWithStackFrame, withStackFrame } from './stack-frame'
import './symbol-async-iterator'
import { isGenerator, isString } from './utils'
import valueType, { ARRAY, COMMAND, ITERABLE, ITERATOR } from './value-type'
import yieldToEventLoop from './yield-to-event-loop'

const deprecateIterable = deprecate(() => {
}, 'yielding an iterable is deprecated, yield values directly from a generator passed to borders.iterate() instead and iterate over the results')
const deprecateIterator = deprecate(() => {
}, 'yielding an iterator is deprecated, yield `iterate` or `parallel` commands instead')
const deprecateArray = deprecate(() => {
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
  async [COMMAND](value) {
    const { type, payload, stackFrame } = value
    assert(isString(type), 'command.type must be string')
    if (type === TYPE_PARALLEL) {
      return withStackFrame(stackFrame, () => Promise.all(payload.map(v => this.execute(v))))
    }
    if (type === TYPE_ITERATE) {
      return iteratorToAsync(this.iterate(evaluateWithStackFrame(stackFrame, payload)))
    }
    if (type === TYPE_MAP) {
      const { collection, iteratee } = payload
      return iteratorToAsync(mapCollection(this, collection, iteratee))
    }

    const res = withStackFrame(stackFrame, () => this[type](payload))
    if (isGenerator(res)) {
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

  async [ITERABLE](value) {
    deprecateIterable()
    const result = []
    for (const x of value) {
      result.push(this.execute(x))
    }
    return Promise.all(result)
  }

  async execute(value) {
    const type = valueType(value)
    if (type === null) {
      throw new Error(`Cannot execute ${value}`)
    }
    if (type === ITERATOR) {
      const v = await this.iterate(value).next()
      if (!v.done) {
        throw new Error(`yielding literal values inside execute is not allowed: ${v.value}`)
      }
      return v.value
    }
    return this[type](value)
  }

  async* step(iterator, value) {
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

  async* iterate(iterator) {
    let v = await iterator.next()
    while (!v.done) {
      v = yield* this.step(iterator, v.value)
    }
    return v.value
  }
}

export default Executor
