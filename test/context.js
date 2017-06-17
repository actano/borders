import sinon from 'sinon'
import { expect } from 'chai'
import Context from '../src/context'

describe('borders/context', () => {
  it('should return result of generator', async () => {
    const result = {}
    const context = new Context()
    context.use({ test() { } })
    const received = await context.execute(function* test() {
      yield { type: 'test' }
      return result
    }())
    expect(received).to.eq(result)
  })

  it('should delegate command with payload to backend', async () => {
    const type = 'test'
    const payload = 'payload'
    const context = new Context()
    const spy = sinon.spy()
    context.use({ [type]: spy })
    await context.execute(function* test() {
      yield { type, payload }
    }())
    expect(spy.callCount).to.eq(1)
    expect(spy.alwaysCalledWithExactly(payload)).to.eq(true)
  })

  it('should resolve promises before passing back', async () => {
    const result = {}
    const context = new Context()
    const backend = { test() { return Promise.resolve(result) } }
    context.use(backend)
    await context.execute(function* test() {
      const received = yield { type: 'test' }
      expect(received).to.eq(result)
    }())
  })

  it('should resolve yielded promises and pass them back', async () => {
    const result = {}
    const context = new Context()
    await context.execute(function* test() {
      const received = yield Promise.resolve(result)
      expect(received).to.eq(result)
    }())
  })

  it('should not allow overriding of backend commands', () => {
    const context = new Context()
    const backend = { test() { } }
    context.use(backend)
    expect(() => context.use(backend)).to.throw(Error)
  })
})
