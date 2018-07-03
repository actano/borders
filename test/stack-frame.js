import { expect } from 'chai'

import Context from '../src/context'

function requireNoCache(module) {
  delete require.cache[require.resolve(module)]
  // eslint-disable-next-line global-require,import/no-dynamic-require
  return require(module)
}

const runWithNodeEnv = (nodeEnv, fn) => () => {
  let oldEnv

  before(() => {
    oldEnv = process.env.NODE_ENV
    process.env.NODE_ENV = nodeEnv
  })

  fn()

  after(() => {
    process.env.NODE_ENV = oldEnv
  })
}

describe('commandWithStackFrame', () => {
  let backendErrorStack

  async function runTestWithError(commandWithStackFrame, backend, devMode) {
    let thrownError

    const createCommand = commandWithStackFrame(() => ({ type: 'test' }))
    const command = createCommand()

    const context = new Context()
    context.use(backend)

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

  context('development environment', runWithNodeEnv('development', () => {
    let commandWithStackFrame

    before(() => {
      ({ commandWithStackFrame } = requireNoCache('../src/stack-frame'))
    })

    context('when backend throws error synchronously', () => {
      it('should append the stack frame of the command to the error', async () => {
        const backend = {
          test() {
            const backendError = new Error()
            backendErrorStack = backendError.stack
            throw backendError
          },
        }

        await runTestWithError(commandWithStackFrame, backend, true)
      })
    })

    context('when backend is a generator function', () => {
      it('should append the stack frame of the command to the error', async () => {
        const backend = {
          // eslint-disable-next-line require-yield
          * test() {
            const backendError = new Error()
            backendErrorStack = backendError.stack
            throw backendError
          },
        }

        await runTestWithError(commandWithStackFrame, backend, true)
      })
    })

    context('when backend is async', () => {
      it('should append the stack frame of the command to the error', async () => {
        const backend = {
          async test() {
            const backendError = new Error()
            backendErrorStack = backendError.stack
            throw backendError
          },
        }

        await runTestWithError(commandWithStackFrame, backend, true)
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

        const backend = {
          test() {
            throw backendError
          },
        }

        await runTestWithError(commandWithStackFrame, backend, true)
        await runTestWithError(commandWithStackFrame, backend, true)
      })
    })
  }))

  context('non-development environment', runWithNodeEnv('production', () => {
    let commandWithStackFrame

    before(() => {
      ({ commandWithStackFrame } = requireNoCache('../src/stack-frame'))
    })

    context('when backend throws error synchronously', () => {
      it('should append the stack frame of the command to the error', async () => {
        const backend = {
          test() {
            const backendError = new Error()
            backendErrorStack = backendError.stack
            throw backendError
          },
        }

        await runTestWithError(commandWithStackFrame, backend, false)
      })
    })

    context('when backend is a generator function', () => {
      it('should append the stack frame of the command to the error', async () => {
        const backend = {
          // eslint-disable-next-line require-yield
          * test() {
            const backendError = new Error()
            backendErrorStack = backendError.stack
            throw backendError
          },
        }

        await runTestWithError(commandWithStackFrame, backend, false)
      })
    })

    context('when backend is async', () => {
      it('should append the stack frame of the command to the error', async () => {
        const backend = {
          async test() {
            const backendError = new Error()
            backendErrorStack = backendError.stack
            throw backendError
          },
        }

        await runTestWithError(commandWithStackFrame, backend, false)
      })
    })

    context('when backend does not throw an error', () => {
      it('should pass', async () => {
        await runTestWithoutError(commandWithStackFrame, false)
      })
    })
  }))
})
