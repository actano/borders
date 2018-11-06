import Context from '../../src/context'

export const echoCommand = payload => ({ type: 'echo', payload })

const echoBackend = {
  echo(payload) {
    return payload
  },
}

export default value => new Context().use(echoBackend).execute(value)
