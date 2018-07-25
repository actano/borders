import { commandWithStackFrame } from './stack-frame'

export const TYPE_MAP = 'MAP'

export default commandWithStackFrame((collection, iteratee) => ({
  type: TYPE_MAP,
  payload: { collection: Array.from(collection), iteratee },
}))
