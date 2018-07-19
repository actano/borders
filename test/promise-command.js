import { expect } from 'chai'
import execute from './_execute'
import promise from '../src/promise-command'

describe('execute/promise', () => {
  it('it should resolve a promise and inject its value', async () => {
    await execute(function* () {
      const result = yield promise(Promise.resolve('resolved'))
      expect(result).to.eql('resolved')
    }())
  })
})
