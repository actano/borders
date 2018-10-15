import { isCommand, isIterator } from './utils'

export const COMMAND = '_command'
export const ITERATOR = '_iterator'
export const ARRAY = '_array'

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

  return null
}
