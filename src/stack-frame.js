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

export const commandWithStackFrame = (() => {
  if (process.env.NODE_ENV === 'development') {
    return commandCreator => (...args) => {
      const command = commandCreator(...args)
      command.stackFrame = new StackFrame()
      return command
    }
  }

  return commandCreator => commandCreator
})()
