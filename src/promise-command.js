import { commandWithStackFrame } from './stack-frame'

export const TYPE_PROMISE = 'PROMISE'

export default commandWithStackFrame(promise => ({
  type: TYPE_PROMISE,
  payload: Promise.resolve(promise),
}))
