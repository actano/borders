import getCommands from '../get-commands'

export default class ChainBackend {
  constructor(...backends) {
    const commands = getCommands(backends[0])
    let _backend

    for (const type of commands) {
      // eslint-disable-next-line no-loop-func
      this[type] = async (payload, { execute }) => {
        const backend = async (connect) => {
          if (!_backend) {
            _backend = connect(...backends)
          }

          return _backend
        }
        return execute({ type, backend, payload })
      }
    }
  }
}
