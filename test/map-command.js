import chai from 'chai'
import chaiAsPromised from 'chai-as-promised'
import execute, { echoCommand } from './_execute'
import map from '../src/commands/map'

const { expect } = chai.use(chaiAsPromised)

describe('execute/map', () => {
  it('should return an async iterator', async () => {
    await execute(function* () {
      const asyncIterator = yield map([], () => {
      })
      expect(asyncIterator).to.respondTo(Symbol.asyncIterator)
    }())
  })

  it('should apply iteratee to collection and return results', async () => {
    await execute(async function* () {
      const results = ['item_2', 'item_4', 'item_6']
      const asyncIterator = yield map([1, 2, 3], value => echoCommand(`item_${value * 2}`))
      let i = 0
      for await (const result of asyncIterator) {
        expect(result).to.eq(results[i])
        i += 1
      }
      expect(i).to.eq(3)
    }())
  })

  it('should run async iteratees in parallel', async () => {
    const pending = []
    const later = timeout => new Promise(resolve => setTimeout(resolve, timeout))

    // returns a pending promise, that will return the number of pending promises before the call
    const addPending = () => Promise.race([later(100), new Promise((resolve) => {
      const result = pending.length
      pending.push(() => resolve(result))
    })])

    // resolves all pending promises and returns the number of promises
    const resolve = () => {
      const result = pending.length
      pending.forEach(fn => fn())
      return result
    }

    await execute(async function* () {
      const collection = [true, true, true, false]
      const fn = value => echoCommand(value ? addPending() : resolve())
      const asyncIterator = yield map(collection, fn)
      // expect to iterate over the number of queued pending promises
      // if resolve() wouldn't have been called, all promises would have been resolved by 'later'
      const results = [0, 1, 2, 3]
      let i = 0
      for await (const result of asyncIterator) {
        expect(result).to.eq(results[i])
        i += 1
      }
      expect(i).to.eq(4)
      expect(pending.length).to.eq(3)
    }())
  })

  it('should stop executing iteratees if iteration over results is stopped', async () => {
    await execute(async function* () {
      const collection = []
      while (collection.length < 100) collection.push(collection.length)
      let callCount = 0
      const fn = (v) => {
        callCount += 1
        return echoCommand(v)
      }

      const asyncIterator = yield map(collection, fn)
      for await (const result of asyncIterator) {
        if (result === 20) break
      }

      expect(callCount).to.be.lte(90)
    }())
  })
})
