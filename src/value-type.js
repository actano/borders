import { isCommand, isIterable, isIterator, isPromise, isString } from './utils'

export const COMMAND = 'command'
export const ITERATOR = 'iterator'
export const ARRAY = 'array'
export const PROMISE = 'promise'
export const ITERABLE = 'iterable'

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

  if (isPromise(value)) {
    return PROMISE
  }

  if (isIterable(value) && !isString(value)) {
    return ITERABLE
  }

  return null
}
