import assert from 'assert'
import { isString } from '../utils'

export default (selectBackend, createBackend, supportedCommands) => {
  const backends = {}
  const result = {}

  for (const type of supportedCommands) {
    result[type] = async (payload, { execute }) => {
      const selected = await selectBackend(payload, type)
      assert(isString(selected))

      if (!backends[selected]) {
        backends[selected] = createBackend(selected)
        assert(backends[selected], `No backend was created for '${selected}'`)
      }

      const backend = backends[selected]
      return execute({ type, backend, payload })
    }
  }
  return result
}

