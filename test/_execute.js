import Executor from '../src/execute'

export const echoCommand = payload => ({ type: 'echo', payload })

const echoBackend = {
  echo(payload) {
    return payload
  },
}

export default value => Object.assign(new Executor(), echoBackend).execute(value)
