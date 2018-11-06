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
    return fn(...args).finally(() => {
      waiting -= 1
    })
  }

  const next = withWaiting(() => Promise.resolve(promiseIterator.next()))

  const startReadAhead = () => {
    while (!srcDone && waiting < concurrency && buffer.length < readAhead) {
      buffer.push(next().finally(startReadAhead))
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
  }

  return { ...iterator, [Symbol.asyncIterator]() { return iterator } }
}

export default queue
