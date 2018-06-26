import assert from 'assert'
import execute from './execute'
import { isFunction } from './utils'

export default class Context {
  constructor() {
    this._commands = {}
    this._evaluator = execute(this._commands)
  }

  use(backend) {
    for (const op of Object.keys(backend)) {
      assert(!this._commands[op], `command.type ${op} already bound`)
      assert(isFunction(backend[op]), `command.type "${op}" must be a function`)
      assert(backend[op].length <= 2, `command.type "${op}" must take max two arguments (not ${backend[op].length})`)
      this._commands[op] = backend[op].bind(backend)
    }
    return this
  }
  async execute(value) {
    return this._evaluator.execute(value)
  }
}
