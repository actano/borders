import { isCommand } from './utils'

export default (command) => {
  if (isCommand(command) && command.backend) {
    const _backends = command.backend
    if (Array.isArray(_backends)) {
      return _backends
    }
    if (_backends) {
      return [_backends]
    }
  }
  return []
}

