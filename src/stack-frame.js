const BORDERS_STACK_PATTERN = /^.*\/borders\/lib\/.*$/

const filterStack = stack => stack.filter(part => !BORDERS_STACK_PATTERN.test(part))

export class StackFrame extends Error {
  constructor() {
    super()
    Error.captureStackTrace(this, StackFrame)
  }

  attachStack(err) {
    const newStack = [
      ...err.stack.split('\n'),
      'From previous event:',
      ...this.stack.split('\n').slice(1),
    ]

    const filteredStack = filterStack(newStack)

    Object.defineProperty(
      err,
      'stack',
      {
        configurable: true,
        enumerable: false,
        writable: true,
        value: filteredStack.join('\n'),
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
