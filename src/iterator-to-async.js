import './symbol-async-iterator'

// this file wants to be a standalone module, once this proposal is stage 4
/**
 * convert any iterator to an async iterator (https://github.com/tc39/proposal-async-iteration).
 *
 * The source iterator will be eagerly consumed up to
 * * a defined readAhead or
 * * a defined number of concurrently running promises
 */

async function* queue(
  promiseIterator,
  concurrency = 8,
  readAhead = concurrency * 4,
) {
  if (concurrency < 1) concurrency = 1 // eslint-disable-line no-param-reassign
  if (readAhead < 1) readAhead = 1 // eslint-disable-line no-param-reassign
  const buffer = []
  let nextItem = null
  let runningPromises = 0
  let srcDone = false

  const concurrencyAvailable = () => runningPromises <= concurrency
  const readAheadAvailable = () => buffer.length < readAhead

  const promise = async (value) => {
    runningPromises += 1
    try {
      return await value
    } finally {
      runningPromises -= 1
    }
  }

  const pullNext = async () => {
    if (srcDone) return false

    if (nextItem === null) {
      nextItem = promise(promiseIterator.next())
    }
    const { done, value } = await nextItem
    if (done) {
      srcDone = true
      return false
    }
    nextItem = null
    buffer.push(promise(value))
    return true
  }

  const isNextAvailable = async () => {
    while (!srcDone && concurrencyAvailable() && readAheadAvailable()) {
      await pullNext() // eslint-disable-line no-await-in-loop
    }
    if (buffer.length > 0) return true
    return pullNext()
  }

  const shift = async () => {
    if (await isNextAvailable()) {
      return buffer.shift()
    }
    return undefined
  }

  while (await isNextAvailable()) { // eslint-disable-line no-await-in-loop
    yield await shift() // eslint-disable-line no-await-in-loop
  }
}

export default queue
