import { isCommand, isIterator } from './utils'

export const COMMAND = '_command'
export const ITERATOR = '_iterator'

export default (value) => {
  if (isCommand(value)) {
    return COMMAND
  }

  if (isIterator(value)) {
    return ITERATOR
  }

  return null
}
