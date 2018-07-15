import chai from 'chai'
import chaiAsPromised from 'chai-as-promised'
import Context from '../src/context'
import parallel from '../src/parallel-command'

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

describe('borders/parallel-command', () => {
  describe('executing multiple commands at once', () => {
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
        const result = yield parallel([
          generator1(),
          generator2(),
        ])
        expectIterable(result)
          .toIterateOver([91, 82])
      }())
    })
  })
})
