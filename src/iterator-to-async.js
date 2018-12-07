import './symbol-async-iterator'

// this file wants to be a standalone module, once this proposal is stage 4
/**
 * convert any iterator to an async iterator (https://github.com/tc39/proposal-async-iteration).
 *
 * The source iterator will be eagerly consumed up to
 * * a defined readAhead or
 * * a defined number of concurrently running promises
 */

function queue(
  promiseIterator,
  concurrency = 8,
  readAhead = concurrency * 4,
) {
  if (concurrency < 1) concurrency = 1 // eslint-disable-line no-param-reassign
  if (readAhead < 1) readAhead = 1 // eslint-disable-line no-param-reassign

  const buffer = []
  let srcDone = false
  let waiting = 0

  const withWaiting = fn => (...args) => {
    waiting += 1
    return fn(...args).then((result) => {
      waiting -= 1
      return result
    }, (reason) => {
      waiting -= 1
      throw reason
    })
  }

  const next = withWaiting(() => Promise.resolve(promiseIterator.next()))

  const startReadAhead = () => {
    while (!srcDone && waiting < concurrency && buffer.length < readAhead) {
      buffer.push(next().then((result) => {
        startReadAhead()
        return result
      }, (reason) => {
        startReadAhead()
        return { reason, done: false }
      }))
    }
  }

  const iterator = {
    async next() {
      startReadAhead()
      const item = buffer.length ? await buffer.shift() : { done: true }
      if (item.done) {
        if (!srcDone) {
          srcDone = true
        }
        buffer.length = 0
      }
      if (item.reason) {
        const stack = new Error()
        const error = new Error('Exception from source iterator')
        Object.defineProperty(error, 'stack', {
          configurable: true,
          enumerable: false,
          get() {
            return `${stack.stack}\n\n${item.reason.stack}`
          },
        })
        throw error
      }
      return item
    },

    async return(value) {
      srcDone = true
      if (promiseIterator.return) await promiseIterator.return(value)
      return { done: true, value }
    },

    async throw(exception) {
      srcDone = true
      if (promiseIterator.throw) await promiseIterator.throw(exception)
      return { done: true }
    },

    [Symbol.asyncIterator]() {
      return iterator
    },
  }

  return iterator
}

export default queue
