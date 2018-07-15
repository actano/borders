import { expect } from 'chai'
import Context from '../src/context'
import promise from '../src/promise-command'

describe('borders/promise-command', () => {
  it('should resolve yielded promises and pass them back', async () => {
    const result = {}
    const context = new Context()
    await context.execute(function* test() {
      const received = yield promise(Promise.resolve(result))
      expect(received).to.eq(result)
    }())
  })
})
