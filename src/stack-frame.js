import { isPromise } from './utils'

const BORDERS_STACK_PATTERN = /^.*\/borders\/lib\/.*$/

const filterStack = stack => stack.filter(part => !BORDERS_STACK_PATTERN.test(part))

export class StackFrame extends Error {
  constructor() {
    super()
    Error.captureStackTrace(this, StackFrame)
  }

  attachStack(err) {
    if (!err.__originalStack__) {
      Object.defineProperty(
        err,
        '__originalStack__',
        {
          configurable: true,
          enumerable: false,
          writable: false,
          value: err.stack,
        },
      )
    }

    const self = this

    Object.defineProperty(
      err,
      'stack',
      {
        configurable: true,
        enumerable: false,
        get() {
          const newStack = [
            ...this.__originalStack__.split('\n'),
            'From previous event:',
            ...self.stack.split('\n').slice(1),
          ]

          const filteredStack = filterStack(newStack)
          return filteredStack.join('\n')
        },
      },
    )
  }
}

const _commandWithStackFrame = commandCreator => (...args) => {
  const command = commandCreator(...args)
  command.stackFrame = new StackFrame()
  return command
}

export const commandCreatorForEnvironment = env =>
  (env === 'production' ? commandCreator => commandCreator : _commandWithStackFrame)

export const commandWithStackFrame = commandCreatorForEnvironment(process.env.NODE_ENV)

export const withStackFrame = (stackFrame, fn) => {
  if (!stackFrame) {
    return fn()
  }

  let result
  try {
    result = fn()
  } catch (e) {
    stackFrame.attachStack(e)
    throw e
  }

  if (!isPromise(result)) {
    return result
  }

  return result.then(undefined, (reason) => {
    stackFrame.attachStack(reason)
    throw reason
  })
}

export async function* evaluateWithStackFrame(stackFrame, generator) {
  if (!stackFrame) return yield* generator
  try {
    return yield* generator
  } catch (e) {
    stackFrame.attachStack(e)
    throw e
  }
}
