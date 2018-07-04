import sinon from 'sinon'
import chai from 'chai'
import chaiAsPromised from 'chai-as-promised'
import waitFor from 'p-wait-for'
import Context from '../src/context'

chai.use(chaiAsPromised)

const { expect } = chai

function expectIterable(iterable) {
  expect(typeof iterable[Symbol.iterator]).to.equal('function')

  return {
    toIterateOver(expectedValues) {
      const errorMessage = `expected ${iterable} to iterate over ${expectedValues}`
      const actualIterator = iterable[Symbol.iterator]()
      const expectedIterator = expectedValues[Symbol.iterator]()

      let actualState = actualIterator.next()
      let expectedState = expectedIterator.next()

      while (!actualState.done) {
        expect(actualState.value).to.equal(expectedState.value, errorMessage)
        actualState = actualIterator.next()
        expectedState = expectedIterator.next()
      }

      expect(expectedState.done).to.equal(true, errorMessage)
    },
  }
}

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

    describe('executing multiple commands at once', () => {
      function createIterableOf(items) {
        const iterable = {}
        iterable[Symbol.iterator] = function* iterate() {
          for (const item of items) {
            yield item
          }
        }
        return iterable
      }

      it('should run multiple commands and return their results', async () => {
        const context = new Context()
        const backend = {
          command1() { return 101 },
          command2() { return 102 },
        }
        context.use(backend)

        await context.execute(function* test() {
          const result = yield createIterableOf([
            { type: 'command1' },
            { type: 'command2' },
          ])
          expectIterable(result)
            .toIterateOver([101, 102])
        }())
      })

      it('should run multiple generators and return their results', async () => {
        const context = new Context()
        const backend = {
          command1() { return 101 },
          command2() { return 102 },
        }
        context.use(backend)

        function* generator1() {
          const a = yield { type: 'command1' }
          return a - 10
        }

        function* generator2() {
          const a = yield { type: 'command2' }
          return a - 20
        }

        await context.execute(function* test() {
          const result = yield createIterableOf([
            generator1(),
            generator2(),
          ])
          expectIterable(result)
            .toIterateOver([91, 82])
        }())
      })

      it('should run commands in parallel', async () => {
        const context = new Context()
        let command1Started = false
        let command2Started = false
        const backend = {
          async command1() {
            command1Started = true
            await waitFor(() => command2Started)
            return 101
          },
          async command2() {
            command2Started = true
            await waitFor(() => command1Started)
            return 102
          },
        }
        context.use(backend)

        await context.execute(function* test() {
          const result = yield createIterableOf([
            { type: 'command1' },
            { type: 'command2' },
          ])

          expectIterable(result)
            .toIterateOver([101, 102])
        }())
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

    it('should run backends with generator functions', async () => {
      const context = new Context()
      const backend = {
        * testGenerator({ id }) {
          return yield { type: 'test', payload: { value: id } }
        },
        test({ value }) {
          return value
        },
      }
      context.use(backend)

      const result = await context.execute(function* () {
        return yield { type: 'testGenerator', payload: { id: 42 } }
      }())

      expect(result).to.equal(42)
    })

    describe('execution context', () => {
      it('should track call stacks via execution context', async () => {
        const context = new Context()

        const runningCalls = new Map()
        const backend = {
          getDataViaContext(payload, ctx) {
            for (const [id, data] of runningCalls) {
              if (ctx.isDescendantOf(id)) {
                return data
              }
            }

            return null
          },
          * test({ data }, ctx) {
            runningCalls.set(ctx.getId(), data)
            const result = yield { type: 'getDataViaContext' }
            runningCalls.delete(ctx.getId())
            return result
          },
        }
        context.use(backend)

        const result = await context.execute(function* () {
          return yield [
            { type: 'test', payload: { data: 20 } },
            { type: 'getDataViaContext' },
            { type: 'test', payload: { data: 30 } },
          ]
        }())

        expect(result).to.deep.equal([20, null, 30])
      })
    })
  })
})
