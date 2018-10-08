import { expect } from 'chai'
import Context from '../src/context'

function requireNoCache(module) {
  delete require.cache[require.resolve(module)]
  // eslint-disable-next-line global-require,import/no-dynamic-require
  return require(module)
}

async function runTestWithError(testCommand, devMode) {
  let thrownError
  let backendErrorStack = null

  const setError = (e, stack = e.stack) => {
    backendErrorStack = stack
    return e
  }

  const { commandWithStackFrame } = requireNoCache('../src/stack-frame')
  const createCommand = commandWithStackFrame(() => ({ type: 'test', payload: setError }))
  const command = createCommand()

  const context = new Context()
  context.use({ test: testCommand })

  await context.execute(function* test() {
    try {
      yield command
    } catch (e) {
      thrownError = e
    }
  }())

  if (devMode) {
    expect(command).to.have.property('stackFrame')
    expect(thrownError.stack).to.equal([
      ...backendErrorStack.split('\n'),
      'From previous event:',
      ...command.stackFrame.stack.split('\n').slice(1),
    ].join('\n'))
  } else {
    expect(command).to.not.have.property('stackFrame')
    expect(thrownError.stack).to.equal(backendErrorStack)
  }
}

export default runTestWithError
