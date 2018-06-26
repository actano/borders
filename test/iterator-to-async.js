/* eslint-disable no-await-in-loop */
import { expect } from 'chai'
import toAsync from '../src/iterator-to-async'

describe('borders/iterator-to-async', () => {
  let iterationCount

  function* countIterations(iterator) {
    iterationCount = 0
    let { done, value } = iterator.next()
    while (!done) {
      yield value
      iterationCount += 1;
      ({ done, value } = iterator.next())
    }
  }

  function* generator(n) {
    let i = 0
    while (i < n) {
      yield i
      i += 1
    }
  }

  const later = () => new Promise((resolve) => {
    setTimeout(resolve, 10)
  })

  const iterate = n => countIterations(generator(n))

  it('should return an async iterable and an iterator', () => {
    const result = toAsync(iterate(10))
    expect(result).to.respondTo(Symbol.asyncIterator)
    expect(result).to.respondTo('next')
  })

  it('should deliver an iterator of all values in source order', async () => {
    const iterator = iterate(10)
    let count = 0
    for await (const x of toAsync(iterator)) {
      expect(x).to.eq(count)
      count += 1
    }
    expect(count).to.eq(10)
    expect(iterationCount).to.eq(10)
  })

  it('should stop consuming if iteration is stopped', async () => {
    const iterator = iterate(100)
    let count = 0
    for await (const x of toAsync(iterator)) { // eslint-disable-line no-unused-vars
      count += 1
      if (count === 10) break
    }
    expect(iterationCount).to.be.above(9)
    expect(iterationCount).to.be.below(100)
  })

  it('should read ahead promises up to concurrency with unresolved promises', async () => {
    const BREAK_AT = 10
    const CONCURRENCY = 10
    const READ_AHEAD = 50

    function* generate() {
      for (let i = 0; i < READ_AHEAD; i += 1) {
        if (i < BREAK_AT) {
          yield i
        } else {
          yield later()
        }
      }
    }

    const iterator = countIterations(generate())
    let count = 0
    // eslint-disable-next-line no-unused-vars
    for await (const x of toAsync(iterator, CONCURRENCY, READ_AHEAD)) {
      count += 1
      if (count === BREAK_AT - 1) break
    }
    expect(iterationCount).to.eq(BREAK_AT + CONCURRENCY)
  })

  it('should read ahead promises up to readAhead with resolved promises', async () => {
    const BREAK_AT = 10
    const READ_AHEAD = 10
    const iterator = iterate(100)
    let count = 0
    for await (const x of toAsync(iterator, 0, READ_AHEAD)) { // eslint-disable-line no-unused-vars
      count += 1
      if (count === BREAK_AT) break
    }
    expect(iterationCount).to.be.above(BREAK_AT)
    expect(iterationCount).to.be.below(BREAK_AT + READ_AHEAD)
  })
})
