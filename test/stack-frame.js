import { expect } from 'chai'

import Context from '../src/context'
import { commandCreatorForEnvironment } from '../src/stack-frame'

describe('commandWithStackFrame', () => {
  let backendErrorStack
  let commandWithStackFrame

  async function runTestWithError(testCommand, devMode) {
    let thrownError

    const setError = (e, stack = e.stack) => {
      backendErrorStack = stack
      return e
    }

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

  async function runTestWithoutError(_commandWithStackFrame, devMode) {
    const createCommand = commandWithStackFrame(() => ({ type: 'test' }))
    const command = createCommand()

    const context = new Context()
    const backend = {
      test() {},
    }
    context.use(backend)

    await context.execute(function* test() {
      yield command
    }())

    if (devMode) {
      expect(command).to.have.property('stackFrame')
    } else {
      expect(command).to.not.have.property('stackFrame')
    }
  }

  context('development environment', () => {
    before(() => {
      commandWithStackFrame = commandCreatorForEnvironment('development')
    })

    context('when backend throws error synchronously', () => {
      it('should append the stack frame of the command to the error', async () => {
        const test = (setError) => {
          throw setError(new Error())
        }

        await runTestWithError(test, true)
      })
    })

    context('when backend is async', () => {
      it('should append the stack frame of the command to the error', async () => {
        const test = async (setError) => {
          throw setError(new Error())
        }

        await runTestWithError(test, true)
      })
    })

    context('when backend does not throw an error', () => {
      it('should pass', async () => {
        await runTestWithoutError(commandWithStackFrame, true)
      })
    })

    context('when the same error object is attached multiple times', () => {
      it('should attach the stack frame to the original error stack', async () => {
        const backendError = new Error()
        backendErrorStack = backendError.stack

        const test = (setError) => {
          throw setError(backendError, backendErrorStack)
        }

        await runTestWithError(test, true)
        await runTestWithError(test, true)
      })
    })
  })

  context('production environment', () => {
    before(() => {
      commandWithStackFrame = commandCreatorForEnvironment('production')
    })

    it('should use identity function for commandCreator', () => {
      const test = {}
      expect(commandWithStackFrame(test)).to.equal(test)
    })

    context('when backend throws error synchronously', () => {
      it('should append the stack frame of the command to the error', async () => {
        const test = (setError) => {
          throw setError(new Error())
        }

        await runTestWithError(test, false)
      })
    })

    context('when backend is async', () => {
      it('should append the stack frame of the command to the error', async () => {
        const test = async (setError) => {
          throw setError(new Error())
        }

        await runTestWithError(test, false)
      })
    })

    context('when backend does not throw an error', () => {
      it('should pass', async () => {
        await runTestWithoutError(commandWithStackFrame, false)
      })
    })
  })
})
