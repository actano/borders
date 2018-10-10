import Executor from './execute'

export default class Context {
  constructor() {
    this._commands = new Executor()
  }

  use(...backends) {
    this._commands._use(...backends)
    return this
  }

  async execute(value) {
    return this._commands.execute(value)
  }
}
