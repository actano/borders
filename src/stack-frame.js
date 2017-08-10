export class StackFrame extends Error {
  constructor() {
    super()
    Error.captureStackTrace(this, StackFrame)
  }

  attachStack(err) {
    const newStack = `${err.stack}\nFrom previous event:\n${this.stack}`
    Object.defineProperty(
      err,
      'stack',
      {
        configurable: true,
        enumerable: false,
        writable: true,
        value: newStack,
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
