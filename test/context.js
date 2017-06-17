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

  it('should resolve array of promises before passing back', async () => {
    const result1 = {}
    const result2 = {}
    const result3 = {}
    const context = new Context()
    const backend = {
      test() {
        return Promise.all([
          Promise.resolve(result1),
          Promise.resolve(result2),
          Promise.resolve(result3),
        ])
      },
    }
    context.use(backend)
    await context.execute(function* test() {
      const received = yield { type: 'test' }
      expect(received[0]).to.eq(result1)
      expect(received[1]).to.eq(result2)
      expect(received[2]).to.eq(result3)
    }())
  })

  it('should resolve yielded array of promises and pass them back', async () => {
    const result1 = {}
    const result2 = {}
    const result3 = {}
    const context = new Context()
    context.use({ })
    await context.execute(function* test() {
      const received = yield [
        Promise.resolve(result1),
        Promise.resolve(result2),
        Promise.resolve(result3),
      ]
      expect(received[0]).to.eq(result1)
      expect(received[1]).to.eq(result2)
      expect(received[2]).to.eq(result3)
    }())
  })

  it('should not allow overriding of backend commands', () => {
    const context = new Context()
    const backend = { test() { } }
    context.use(backend)
    expect(() => context.use(backend)).to.throw(Error)
  })
})
