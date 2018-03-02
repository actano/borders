import assert from 'assert'

import { commandWithStackFrame } from '../stack-frame'
import { isIterable } from '../utils'

export const TYPE = '@@BORDERS/lazy'

export default commandWithStackFrame((iterable) => {
  assert(isIterable(iterable), 'lazy command can only be used with an iterable')
  return {
    type: TYPE,
    payload: iterable,
  }
})
