import Context from '../../src/context'
import EchoBackend from './echo-backend'

export const echoCommand = payload => ({ type: 'echo', payload })

export default value => new Context().use(new EchoBackend()).execute(value)
