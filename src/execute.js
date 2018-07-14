import assert from 'assert'
import { deprecate } from 'util'
// import iteratorToAsync from './iterator-to-async'
import { withStackFrame } from './stack-frame'
import { isGenerator, isString } from './utils'
import valueType, { ARRAY, COMMAND, ITERABLE, ITERATOR, PROMISE } from './value-type'
import yieldToEventLoop from './yield-to-event-loop'

const deprecateIterable = deprecate(() => {
}, 'yielding an iterable is deprecated, yield values directly from a generator passed to borders.iterate() instead and iterate over the results')
const deprecatePromise = deprecate(() => {
}, 'yielding a promise is deprecated, await the promise in an async generator instead')

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
    const getId = () => this.id
    const isDescendantOf = _id => this.ancestors.has(_id)
    return withStackFrame(stackFrame, () => commands[type](payload, { getId, isDescendantOf }))
  },

  async [ITERATOR](value) {
    return this.execute(value)
    // return iteratorToAsync(this.iterate(value))
  },

  async [ARRAY](value) {
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
    const result = await executor[type](value)
    if (type === COMMAND && isGenerator(result)) {
      return executor.execute(result)
    }
    return result
  },

  async* step(iterator, value) {
    const type = valueType(value)
    let nextValue
    try {
      if (type === null) {
        nextValue = yield value
      } else {
        nextValue = await this[type](value)
        if (type === COMMAND && isGenerator(nextValue)) {
          const executor = createExecutor(commands, this.ancestors)
          nextValue = yield* executor.iterate(nextValue)
        }
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
