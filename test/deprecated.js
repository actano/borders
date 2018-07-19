import chai from 'chai'
import chaiAsPromised from 'chai-as-promised'
import execute, { echoCommand } from './_execute'

const { expect } = chai.use(chaiAsPromised)

describe('execute/deprecated', () => {
  it('should execute elements of an array', async () => {
    const result = execute([echoCommand('echo'), echoCommand('literal')])
    await expect(result).to.eventually.eql(['echo', 'literal'])
  })

  it('should resolve a yielded promise and inject its value', async () => {
    await execute(function* () {
      const result = yield Promise.resolve('resolved')
      expect(result).to.eql('resolved')
    }())
  })

  it('should execute elements of an iterable and return an array of results', async () => {
    const result = execute(new Set([echoCommand('1'), echoCommand('2')]))
    expect(result).to.eventually.eql(['1', '2'])
  })
})
