import { isFunction } from '../utils'

export const LISTEN_PREFIX = '_listen.'

function* collectListeningEventNames(backend) {
  if (backend === Object.prototype) return
  for (const k of Object.getOwnPropertyNames(backend)) {
    if (k.startsWith(LISTEN_PREFIX) && isFunction(backend[k])) {
      yield k.substring(LISTEN_PREFIX.length)
    }
  }
  yield* collectListeningEventNames(Object.getPrototypeOf(backend))
}

export const getListeningEvents = backend => Array.from(new Set(collectListeningEventNames(backend))).sort()

export default eventName => `${LISTEN_PREFIX}${eventName}`
