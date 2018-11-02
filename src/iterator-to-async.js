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
  let unresolvedPromises = 0
  let queuedItems = 0
  let readAheadRunning = false

  const fetch = () => {
    unresolvedPromises += 1
    return Promise.resolve(promiseIterator.next())
      .then(({ value, done }) => {
        if (done) {
          srcDone = true
          return true
        }
        unresolvedPromises += 1
        buffer.push(Promise.resolve(value).finally(() => {
          unresolvedPromises -= 1
          queuedItems += 1
        }))
        return false
      }).finally(() => {
        unresolvedPromises -= 1
      })
  }

  const _readAhead = () => {
    if (readAheadRunning) return
    if (!srcDone && unresolvedPromises < concurrency && queuedItems < readAhead) {
      readAheadRunning = true
      fetch().then(x => {
        readAheadRunning = false
        return (x ? null : _readAhead())
      })
    }
  }

  const next = async () => {
    if (!buffer.length && (srcDone || await fetch())) {
      return { done: true }
    }
    const item = buffer.shift()
    queuedItems -= 1
    _readAhead()
    const value = await item
    return { done: false, value }
  }

  _readAhead()
  const iterator = { next }
  return {
    [Symbol.asyncIterator]() { return iterator },
    next,
  }
}

export default queue
