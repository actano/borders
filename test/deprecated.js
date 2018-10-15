import chai from 'chai'
import chaiAsPromised from 'chai-as-promised'
import execute, { echoCommand } from './_execute'

const { expect } = chai.use(chaiAsPromised)

const describe = process.throwDeprecation ? global.describe.skip : global.describe
describe('execute/deprecated', () => {
  it('should execute elements of an array', async () => {
    const result = execute([echoCommand('echo'), echoCommand('literal')])
    await expect(result).to.eventually.eql(['echo', 'literal'])
  })
})
