import chai from 'chai'
import chaiAsPromised from 'chai-as-promised'
import _execute from '../src/execute'

const { expect } = chai.use(chaiAsPromised)

describe('execute', () => {
  const echoCommand = payload => ({ type: 'echo', payload })

  const echoBackend = {
    echo(payload) {
      return payload
    },
  }

  function* echoService() {
    return yield echoCommand('echo')
  }

  async function* asyncEchoService() {
    return yield echoCommand('echo')
  }

  async function* asyncIterator() {
    yield 1
    const echo = yield echoCommand('echo')
    yield echo
    yield 2
  }

  async function* asyncIteratingService() {
    const result = []
    for await (const x of yield asyncIterator()) {
      result.push(x)
    }
    return result
  }

  const execute = value => _execute(echoBackend).execute(value)

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

  it.skip('should execute a nested generator as async iterator', async () => {
    const result = execute(asyncIteratingService())
    await expect(result).to.eventually.eql([1, 'echo', 2])
  })

  it('should execute elements of an array', async () => {
    const result = execute([echoCommand('echo'), echoCommand('literal')])
    await expect(result).to.eventually.eql(['echo', 'literal'])
  })

  it('DEPRECATED: it should resolve a yielded promise and inject its value', async () => {
    await execute(function* () {
      const result = yield Promise.resolve('resolved')
      expect(result).to.eql('resolved')
    }())
  })

  it('DEPRECATED: it should execute elements of an iterable and return an array of results', async () => {
    const result = execute(new Set([echoCommand('1'), echoCommand('2')]))
    expect(result).to.eventually.eql(['1', '2'])
  })
})
