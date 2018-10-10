import { isCommand, isIterable, isIterator, isString } from './utils'

export const COMMAND = '_command'
export const ITERATOR = '_iterator'
export const ARRAY = '_array'
export const ITERABLE = '_iterable'

export default (value) => {
  if (isCommand(value)) {
    return COMMAND
  }

  if (isIterator(value)) {
    return ITERATOR
  }

  if (Array.isArray(value)) {
    return ARRAY
  }

  if (isIterable(value) && !isString(value)) {
    return ITERABLE
  }

  return null
}
