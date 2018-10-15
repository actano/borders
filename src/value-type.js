import { isCommand } from './utils'

export const COMMAND = '_command'

export default (value) => {
  if (isCommand(value)) {
    return COMMAND
  }



  return null
}
