import assert from 'assert'
import { deprecate } from 'util'
import { TYPE_ITERATE } from './iterate-command'
import iteratorToAsync from './iterator-to-async'
import { TYPE_PARALLEL } from './parallel-command'
import { TYPE_PROMISE } from './promise-command'
import { evaluateWithStackFrame, withStackFrame } from './stack-frame'
import { isGenerator, isString } from './utils'
import valueType, { ARRAY, COMMAND, ITERABLE, ITERATOR, PROMISE } from './value-type'
import yieldToEventLoop from './yield-to-event-loop'

const deprecateIterable = deprecate(() => {
}, 'yielding an iterable is deprecated, yield values directly from a generator passed to borders.iterate() instead and iterate over the results')
const deprecatePromise = deprecate(() => {
}, 'yielding a promise is deprecated, await the promise in an async generator instead')
const deprecateIterator = deprecate(() => {
}, 'yielding an iterator is deprecated, yield `iterate` or `parallel` commands instead')
const deprecateArray = deprecate(() => {
}, 'yielding an array is deprecated, yield `iterate` or `parallel` commands instead')

const createNewId = (() => {
  let id = 0

  return () => {
    const result = id
    id += 1
    return result
  }
})()

const createExecutor = (commands, ancestors = new Set(), id = createNewId()) => ({
  id,
  ancestors: new Set(ancestors).add(id),
  async [COMMAND](value) {
    const { type, payload, stackFrame } = value
    assert(isString(type), 'command.type must be string')
    if (type === TYPE_PROMISE) {
      return payload
    }
    if (type === TYPE_PARALLEL) {
      return withStackFrame(stackFrame, () => Promise.all(payload.map(v => this.execute(v))))
    }
    if (type === TYPE_ITERATE) {
      return iteratorToAsync(this.iterate(evaluateWithStackFrame(stackFrame, payload)))
    }
    const getId = () => this.id
    const isDescendantOf = _id => this.ancestors.has(_id)
    const res = withStackFrame(stackFrame, () => commands[type](payload, { getId, isDescendantOf }))
    if (isGenerator(res)) {
      return this.execute(evaluateWithStackFrame(stackFrame, res))
    }

    return res
  },

  async [ITERATOR](value) {
    deprecateIterator()
    return this.execute(value)
  },

  async [ARRAY](value) {
    deprecateArray()
    return Promise.all(value.map(v => this.execute(v)))
  },

  async [PROMISE](value) {
    deprecatePromise()
    return value
  },

  async [ITERABLE](value) {
    deprecateIterable()
    const result = []
    for (const x of value) {
      result.push(this.execute(x))
    }
    return Promise.all(result)
  },

  async execute(value) {
    const type = valueType(value)
    if (type === null) {
      return value
    }
    const executor = createExecutor(commands, this.ancestors)
    if (type === ITERATOR) {
      const v = await executor.iterate(value).next()
      if (!v.done) {
        throw new Error(`yielding literal values inside execute is not allowed: ${v.value}`)
      }
      return v.value
    }
    return executor[type](value)
  },

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
  },

  async* iterate(iterator) {
    let v = await iterator.next()
    while (!v.done) {
      v = yield* this.step(iterator, v.value)
    }
    return v.value
  },
})

export default commands => createExecutor(commands)
