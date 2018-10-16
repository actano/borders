import { deprecate } from 'util'

import _parallel from './parallel-command'
import _iterate from './iterate-command'
import _map from './map-command'
import _getCommands from './get-commands'

export { default } from './context'

export const parallel = deprecate(_parallel, 'import { parallel } from \'borders/commands\'')
export const iterate = deprecate(_iterate, 'import { iterate } from \'borders/commands\'')
export const map = deprecate(_map, 'import { map } from \'borders/commands\'')

export const getCommands = deprecate(_getCommands, 'import getCommands from \'borders/get-commands\'')
