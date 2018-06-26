import assert from 'assert'
import { deprecate } from 'util'
import ExecutionContext from './execution-context'
import iteratorToAsync from './iterator-to-async'
import { withStackFrame } from './stack-frame'
import { isGenerator, isString } from './utils'
import valueType, { ARRAY, COMMAND, ITERABLE, ITERATOR, PROMISE } from './value-type'

// Yield to the node.js event loop to make sure that other tasks are not blocked by the
// current execution. Note: Just awaiting a promise is not enough since promises which don't
// contain i/o are immediately resolved afterwards on the micro-task queue before any other
// task has the chance to run.

async function yieldToEventLoop() {
  return new Promise((resolve) => {
    setImmediate(resolve)
  })
}

const deprecateIterable = deprecate(() => {
}, 'yielding an iterable is deprecated, yield values directly from a generator passed to borders.iterate() instead and iterate over the results')
const deprecatePromise = deprecate(() => {
}, 'yielding a promise is depracted, await the promise in an async generator instead')

export default commands => ({
  async [COMMAND](value, context) {
    const { type, payload, stackFrame } = value
    assert(isString(type), 'command.type must be string')
    return withStackFrame(stackFrame, () => commands[type](payload, context))
  },

  async [ITERATOR](value, context) {
    return iteratorToAsync(this.iterate(value, context))
  },

  async [ARRAY](value, context) {
    return Promise.all(value.map(v => this.execute(v, context)))
  },

  async [PROMISE](value) {
    deprecatePromise()
    return value
  },

  async [ITERABLE](value, context) {
    deprecateIterable()
    const result = []
    for (const x of value) {
      result.push(this.execute(x, context))
    }
    return Promise.all(result)
  },

  async execute(value, parentContext) {
    const type = valueType(value)
    if (type === null) {
      return value
    }
    const context = new ExecutionContext(parentContext)
    if (type === ITERATOR) {
      const v = await this.iterate(value, context).next()
      if (!v.done) {
        throw new Error(`yielding literal values inside execute is not allowed: ${v.value}`)
      }
      return v.value
    }
    const result = await this[type](value, context)
    if (type === COMMAND && isGenerator(result)) {
      return this.execute(result, context)
    }
    return result
  },

  async* step(iterator, value, context) {
    await yieldToEventLoop()
    const type = valueType(value)
    let nextValue
    try {
      if (type === null) {
        nextValue = yield value
      } else {
        nextValue = await this[type](value, context)
        if (type === COMMAND && isGenerator(nextValue)) {
          nextValue = yield* this.iterate(nextValue, new ExecutionContext(context))
        }
      }
    } catch (e) {
      return iterator.throw(e)
    }
    return iterator.next(nextValue)
  },

  async* iterate(iterator, context) {
    let v = await iterator.next()
    while (!v.done) {
      v = yield* this.step(iterator, v.value, context)
    }
    return v.value
  },
})
