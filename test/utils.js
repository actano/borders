import { expect } from 'chai'
import { isGenerator } from '../src/utils'

describe('utils', () => {
  describe('isGenerator', () => {
    it('should detect a generator', () => {
      const fn = function* () { yield null }
      expect(isGenerator(fn())).to.eq(true)
    })

    it('should detect an async generator', () => {
      const fn = async function* () { yield null }
      expect(isGenerator(fn())).to.eq(true)
    })

    it('should not detect an iterator', () => {
      const iterator = [][Symbol.iterator]()
      expect(isGenerator(iterator)).to.eq(false)
    })
  })
})
