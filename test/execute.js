import chai from 'chai'
import chaiAsPromised from 'chai-as-promised'
import execute, { echoCommand } from './util/_execute'

const { expect } = chai.use(chaiAsPromised)

describe('execute', () => {
  function* echoService() {
    return yield echoCommand('echo')
  }

  async function* asyncEchoService() {
    return yield echoCommand('echo')
  }

  it('should return a promise', async () => {
    const result = execute(echoService())
    expect(result).to.be.a('promise')
    await result
  })

  it('should yield to event loop when running a service', async () => {
    let immediateRan = false
    setImmediate(() => { immediateRan = true })
    await execute(echoService())
    expect(immediateRan).to.eql(true)
  })

  it('should execute command', async () => {
    const result = execute(echoCommand('echo'))
    await expect(result).to.eventually.eql('echo')
  })

  it('should execute a service', async () => {
    const result = execute(echoService())
    await expect(result).to.eventually.eql('echo')
  })

  it('should execute an async service', async () => {
    const result = execute(asyncEchoService())
    await expect(result).to.eventually.eql('echo')
  })
})
