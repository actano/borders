import chai from 'chai'
import chaiAsPromised from 'chai-as-promised'
import execute, { echoCommand } from './_execute'
import parallel from '../src/commands/parallel'

const { expect } = chai.use(chaiAsPromised)

describe('execute/parallel', () => {
  it('should execute elements of an array', async () => {
    const result = execute(parallel([echoCommand('echo'), echoCommand('literal')]))
    await expect(result).to.eventually.eql(['echo', 'literal'])
  })

  it('it should execute elements of an iterable and return an array of results', async () => {
    const result = execute(parallel(new Set([echoCommand('1'), echoCommand('2')])))
    await expect(result).to.eventually.eql(['1', '2'])
  })
})

