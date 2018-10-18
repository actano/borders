import Bluebird from 'bluebird'
import thenify from 'thenify'
import { expect } from 'chai'
import { isPromise } from '../src/utils'

describe('utils', () => {
  describe('promise', () => {
    it('should detect a native resolved promise', () => {
      const p = Promise.resolve()
      expect(isPromise(p)).to.eq(true)
    })
    it('should detect a native rejected promise', () => {
      const p = Promise.reject(new Error('native'))
      p.catch(() => {})
      expect(isPromise(p)).to.eq(true)
    })
    it('should detect a bluebird resolved promise', () => {
      const p = Bluebird.resolve()
      expect(isPromise(p)).to.eq(true)
    })
    it('should detect a bluebird rejected promise', () => {
      const p = Bluebird.reject(new Error('bluebird'))
      p.catch(() => {})
      expect(isPromise(p)).to.eq(true)
    })
    it('should detect a thenify resolved promise', () => {
      const fn = thenify((cb) => { cb() })
      const p = fn()
      expect(isPromise(p)).to.eq(true)
    })
    it('should detect a thenify rejected promise', () => {
      const fn = thenify((cb) => { cb(new Error('thenify')) })
      const p = fn()
      p.catch(() => {})
      expect(isPromise(p)).to.eq(true)
    })
  })
})
