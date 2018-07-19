import Bluebird from 'bluebird'
import thenify from 'thenify'
import { expect } from 'chai'
import Context from '../src/context'

const catchMeIfYouCan = fn => async () => {
  let unhandled = null
  let handled = null
  process.on('unhandledRejection', (reason, promise) => {
    unhandled = { reason, promise }
  })
  try {
    await fn()
  } catch (e) {
    handled = e
  } finally {
    process.removeAllListeners('unhandledRejection')
  }
  expect(unhandled, 'Unhandled rejection found').to.eq(null)
  expect(handled, 'Rejection not handled').to.not.eq(null)
}

describe('promise compatibility', () => {
  let listeners

  before('remove process listener', () => {
    listeners = process.listeners('unhandledRejection')
    process.removeAllListeners('unhandledRejection')
  })

  after('re-attach process listener', () => {
    for (const listener of listeners) {
      process.on('unhandledRejection', listener)
    }
  })

  function createTests(resolve, reject) {
    it('should handle reject without borders', catchMeIfYouCan(async () => {
      await reject(new Error('Rejected'))
    }))

    it('should handle resolve and reject without borders', catchMeIfYouCan(async () => {
      await resolve()
      await reject(new Error('Rejected'))
    }))

    it('should handle reject in borders context', catchMeIfYouCan(async () => {
      await new Context().execute(function* test() {
        yield reject(new Error('Reject'))
      }())
    }))

    it('should handle resolve followed by reject in borders context', catchMeIfYouCan(async () => {
      await resolve()
      await new Context().execute(function* test() {
        yield reject(new Error('Reject'))
      }())
    }))
  }

  describe('Native', () => {
    createTests(Promise.resolve, Promise.reject)
  })

  // This does not work in should handle resolve followed by reject in borders context
  describe('Bluebird', () => {
    createTests(Bluebird.resolve, Bluebird.reject)
  })

  describe('Native.resolve/Bluebird.reject', () => {
    createTests(Promise.resolve, Bluebird.reject)
  })

  describe('Bluebird.resolve/Native.reject', () => {
    createTests(Bluebird.resolve, Promise.reject)
  })

  describe('Bluebird.resolve/thenify.reject', () => {
    const fail = (err, cb) => cb(err)
    createTests(Bluebird.resolve, thenify(fail))
  })
})
