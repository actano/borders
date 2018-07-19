import _execute from '../src/execute'

export const echoCommand = payload => ({ type: 'echo', payload })

const echoBackend = {
  echo(payload) {
    return payload
  },
}

export default value => _execute(echoBackend).execute(value)
