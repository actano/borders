import chai from 'chai'
import chaiAsPromised from 'chai-as-promised'
import sinon from 'sinon'

import Context from '../src/context'

chai.use(chaiAsPromised)

const { expect } = chai

describe('borders', () => {
  describe('execute', () => {
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

    it('should not allow overriding of backend commands', () => {
      const context = new Context()
      const backend = { test() { } }
      context.use(backend)
      expect(() => context.use(backend)).to.throw(Error)
    })

    context('when backend throws error while executing a command', () => {
      let backendError
      let backend

      beforeEach(() => {
        backendError = new Error('Backend Error')
        backend = {
          test() {
            throw backendError
          },
        }
      })

      it('should throw the error in the generator', async () => {
        let thrownError
        const context = new Context()

        context.use(backend)

        await context.execute(function* test() {
          try {
            yield { type: 'test' }
          } catch (e) {
            thrownError = e
          }
        }())

        expect(thrownError).to.equal(backendError)
      })
    })

    describe('when generator yields unsupported value', () => {
      it('should throw an error', async () => {
        const context = new Context()
        const backend = {
          test() {
            return 42
          },
        }
        context.use(backend)

        const executePromise = context.execute(function* test() {
          yield { type: 'test' }
          yield 123
        }())

        await expect(executePromise).to.be.rejectedWith(Error)
      })
    })

    it('should execute async generators', async () => {
      const context = new Context()
      const backend = {
        test() {
          return 42
        },
      }
      context.use(backend)

      const result = await context.execute(async function* test() {
        const command = await Promise.resolve({ type: 'test' })
        yield command
        return 101
      }())

      expect(result).to.equal(101)
    })
  })
})
