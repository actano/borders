import { expect } from 'chai'
import sinon from 'sinon'
import getCommands from '../src/backends/get-commands'

import { multiplex } from '../src/backends'
import Context from '../src/context'
import { echoCommand } from './_execute'

describe('backends/multiplex', () => {
  const supportedCommands = ['echo']

  let backend = null
  let selected = null
  let selectSpy = null
  let createBackendSpy = null
  let context = null

  beforeEach(() => {
    const selectBackend = () => {
      selected = 'myBackend'
      return selected
    }
    const createBackend = () => ({
      echo() {},
    })
    createBackendSpy = sinon.spy(createBackend)
    selectSpy = sinon.spy(selectBackend)
    backend = multiplex(selectSpy, createBackendSpy, supportedCommands)
    context = new Context().use(backend)
  })

  it('should call sync `selectBackend` with payload and command type', async () => {
    const cmd = echoCommand('a')
    await context.execute(cmd)
    expect(selectSpy.callCount).to.eq(1)
    expect(selectSpy.calledOnceWith(cmd.payload, cmd.type)).to.eq(true)
  })

  it('should call async `createBackend` with return value from selectBackend', async () => {
    await context.execute(echoCommand('a'))
    expect(createBackendSpy.callCount).to.eq(1)
    expect(createBackendSpy.calledOnceWith(selected)).to.eq(true)
  })

  it('should call `selectBackend` once per command', async () => {
    await context.execute(echoCommand('a'))
    await context.execute(echoCommand('b'))
    expect(selectSpy.callCount).to.eq(2)
  })

  it('should call `createBackend` only once per backend', async () => {
    await context.execute(echoCommand('a'))
    await context.execute(echoCommand('b'))
    expect(createBackendSpy.callCount).to.eq(1)
  })

  it('should should allow to return an array of backends from createBackend')

  it('should register all commands of `supportedCommands`', async () => {
    expect(getCommands(backend)).to.deep.eq(supportedCommands)
  })

  it('should delegate commands to selected backend')
})
