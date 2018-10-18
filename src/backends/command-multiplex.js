import MultiplexBackend from './multiplex'
import getCommands from '../get-commands'

export default class CommandMultiplexBackend extends MultiplexBackend {
  constructor(...backends) {
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

    super(selectBackend, createBackend, Object.keys(commandToBackend))
  }
}
