import { commandWithStackFrame } from './stack-frame'

export const TYPE_PARALLEL = 'PARALLEL'

export default commandWithStackFrame(values => ({
  type: TYPE_PARALLEL,
  payload: Array.from(values),
}))
