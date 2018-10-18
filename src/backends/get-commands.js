import { isFunction } from '../utils'

function* collectCommandNames(backend) {
  if (backend === Object.prototype) return
  for (const k of Object.getOwnPropertyNames(backend)) {
    if (k[0] !== '_' && k !== 'constructor' && isFunction(backend[k])) {
      yield k
    }
  }
  yield* collectCommandNames(Object.getPrototypeOf(backend))
}

export default backend => Array.from(new Set(collectCommandNames(backend))).sort()
