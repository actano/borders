import Context from '../../src/context'
import EchoBackend from './echo-backend'

export default value => new Context().use(new EchoBackend()).execute(value)
