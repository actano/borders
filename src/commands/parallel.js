import { commandWithStackFrame } from '../stack-frame'

export const TYPE_PARALLEL = 'PARALLEL'

export default commandWithStackFrame(payload => ({
  type: TYPE_PARALLEL,
  payload,
}))
