import assert from 'assert'
import { isFunction, isString } from '../utils'

export default class MultiplexBackend {
  constructor(selectBackend, createBackend, supportedCommands) {
    const backends = {}

    for (const type of supportedCommands) {
      this[type] = async (payload, { execute }) => {
        const backend = async (connect) => {
          const selected = await selectBackend(payload, type)
          assert(isString(selected))
          if (!backends[selected]) {
            backends[selected] = (async () => {
              const createdBackend = await createBackend(selected)
              assert(createdBackend, `No backend was created for '${selected}'`)
              if (Array.isArray(createdBackend)) {
                return connect(...createdBackend)
              }
              return connect(createdBackend)
            })()
          }
          const selectedBackend = await backends[selected]
          assert(isFunction(selectedBackend[type]), `Created backend does not support command '${type}'`)
          return selectedBackend
        }
        return execute({ type, backend, payload })
      }
    }
  }
}
