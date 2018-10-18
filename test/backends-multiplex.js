import assert from 'assert'
import sinon from 'sinon'
import { expect } from 'chai'

import MultiplexBackend from '../src/backends/multiplex'
import Context from '../src/context'
import { echoCommand } from './_execute'

describe('backends/multiplex', () => {
  it('should call sync `selectBackend` with payload and command type', async () => {
    const selectBackend = () => ''
    const createBackend = () => ({
      echo() {},
    })
    const selectSpy = sinon.spy(selectBackend)
    const context = new Context().use(new MultiplexBackend(selectSpy, createBackend, ['echo']))
    const cmd = echoCommand('a')
    await context.execute(cmd)
    expect(selectSpy.callCount).to.eq(1)
    expect(selectSpy.calledOnceWith(cmd.payload, cmd.type)).to.eq(true)
  })
  it('should call async `createBackend` with return value from selectBackend')
  it('should call `createBackend` only once per backend')
  it('should register all commands of `supportedCommands`')
  it('should delegate commands to selected backend')
})
