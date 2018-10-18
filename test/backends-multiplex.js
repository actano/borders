import MultiplexBackend from '../src/backends/multiplex'
import Context from '../src/context'
import { echoCommand } from './_execute'

describe('backends/multiplex', () => {
  it('should call sync `selectBackend` with payload and command type', async () => {
    const selectBackend = () => {}
    const createBackend = () => {}
    const context = new Context().use(new MultiplexBackend(selectBackend, createBackend, []))
    await context.execute(echoCommand('a'))
  })
  it('should call async `createBackend` with return value from selectBackend')
  it('should call `createBackend` only once per backend')
  it('should register all commands of `supportedCommands`')
  it('should delegate commands to selected backend')
})
