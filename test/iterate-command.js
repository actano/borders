import chai from 'chai'
import chaiAsPromised from 'chai-as-promised'
import execute, { echoCommand } from './util/_execute'
import iterate from '../src/commands/iterate'

const { expect } = chai.use(chaiAsPromised)

describe('execute/iterate', () => {
  it('should execute and iterate a nested generator', async () => {
    function* nested() {
      yield 1
      const echo = yield echoCommand('echo')
      yield echo
      yield 2
    }

    async function* asyncIteratingService() {
      const result = []
      for await (const x of yield iterate(nested())) {
        result.push(x)
      }
      expect(result).to.eql([1, 'echo', 2])
    }

    await execute(asyncIteratingService())
  })

  it('should execute a nested generator as async iterator', async () => {
    async function* asyncIterator() {
      await Promise.resolve()
      yield 1
      const echo = yield echoCommand('echo')
      yield echo
      yield Promise.resolve(2)
    }

    async function* asyncIteratingService() {
      const result = []
      for await (const x of yield iterate(asyncIterator())) {
        result.push(x)
      }
      expect(result).to.eql([1, 'echo', 2])
    }

    await execute(asyncIteratingService())
  })
})
