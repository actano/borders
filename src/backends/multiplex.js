import assert from 'assert'
import { isString } from '../utils'

export default class MultiplexBackend {
  constructor(selectBackend, createBackend, supportedCommands) {
    const backends = {}

    for (const type of supportedCommands) {
      this[type] = async (payload, { execute }) => {
        const backend = async (connect) => {
          const selected = await selectBackend(payload, type)
          assert(isString(selected))
          if (!backends[selected]) {
            backends[selected] = (async () => connect(await createBackend(selected)))()
          }
        }
        return execute({ type, payload: { ...payload, backend } })
      }
    }
  }
}
