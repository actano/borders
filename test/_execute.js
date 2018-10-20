import Executor from '../src/execute'

export const echoCommand = payload => ({ type: 'echo', payload })

const echoBackend = {
  echo(payload) {
    return payload
  },
}

export default value => new Executor().use(echoBackend).execute(value)
