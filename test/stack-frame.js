import { expect } from 'chai'

import Context from '../src/context'
import runTestWithError from './run-test-with-error'
import runWithNodeEnv from './run-with-node-env'

function requireNoCache(module) {
  delete require.cache[require.resolve(module)]
  // eslint-disable-next-line global-require,import/no-dynamic-require
  return require(module)
}

describe('commandWithStackFrame', () => {
  let backendErrorStack

  async function runTestWithoutError(commandWithStackFrame, devMode) {
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
    runWithNodeEnv('development')

    let commandWithStackFrame

    before(() => {
      ({ commandWithStackFrame } = requireNoCache('../src/stack-frame'))
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

  context('non-development environment', () => {
    runWithNodeEnv('production')
    let commandWithStackFrame

    before(() => {
      ({ commandWithStackFrame } = requireNoCache('../src/stack-frame'))
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
