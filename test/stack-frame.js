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
  let backend
  let backendErrorStack

  beforeEach(() => {
    backend = {
      test() {
        const backendError = new Error()
        backendErrorStack = backendError.stack
        throw backendError
      },
    }
  })

  context('development environment', runWithNodeEnv('development', () => {
    let commandWithStackFrame

    before(() => {
      ({ commandWithStackFrame } = requireNoCache('../src/stack-frame'))
    })

    it('should append the stack frame of the command to the error', async () => {
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

      expect(command).to.have.property('stackFrame')
      expect(thrownError.stack).to.equal([
        ...backendErrorStack.split('\n'),
        'From previous event:',
        ...command.stackFrame.stack.split('\n').slice(1),
      ].join('\n'))
    })
  }))

  context('non-development environment', runWithNodeEnv('production', () => {
    let commandWithStackFrame

    before(() => {
      ({ commandWithStackFrame } = requireNoCache('../src/stack-frame'))
    })

    it('should have the original backend error stack', async () => {
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

      expect(command).to.not.have.property('stackFrame')
      expect(thrownError.stack).to.equal(backendErrorStack)
    })
  }))
})
