import chai from 'chai'
import chaiAsPromised from 'chai-as-promised'
import waitFor from 'p-wait-for'
import Context from '../src/context'
import execute, { echoCommand } from './_execute'

const { expect } = chai.use(chaiAsPromised)

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

const describe = process.throwDeprecation ? global.describe.skip : global.describe
describe('execute/deprecated', () => {
  it('should execute elements of an array', async () => {
    const result = execute([echoCommand('echo'), echoCommand('literal')])
    await expect(result).to.eventually.eql(['echo', 'literal'])
  })

  it('should execute elements of an iterable and return an array of results', async () => {
    const result = execute(new Set([echoCommand('1'), echoCommand('2')]))
    expect(result).to.eventually.eql(['1', '2'])
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
})
