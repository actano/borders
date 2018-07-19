import { commandWithStackFrame } from './stack-frame'

export const TYPE_ITERATE = 'ITERATE'

export default commandWithStackFrame(generator => ({
  type: TYPE_ITERATE,
  payload: generator,
}))
