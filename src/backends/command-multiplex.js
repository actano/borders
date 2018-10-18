import { deprecate } from 'util'
import multiplex from './multiplex'
import getCommands from './get-commands'

const deprecateCommandMultiplex = deprecate(() => {}, 'Use separate `.use()` calls or merge backends together')

export default class CommandMultiplexBackend {
  constructor(...backends) {
    deprecateCommandMultiplex()
    const commandToBackend = {}
    const _backends = {}
    let idCounter = 0

    for (const backend of backends) {
      const _id = String(idCounter)
      const commands = getCommands(backend)
      for (const command of commands) {
        commandToBackend[command] = _id
      }
      _backends[_id] = backend
      idCounter += 1
    }

    const selectBackend = (payload, type) => commandToBackend[type]

    const createBackend = id => _backends[id]

    Object.assign(this, multiplex(selectBackend, createBackend, Object.keys(commandToBackend)))
  }
}
