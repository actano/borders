import { TYPE_MAP } from '../commands/map'
import { TYPE_PARALLEL } from '../commands/parallel'
import iteratorToAsync from '../iterator-to-async'

export default () => ({
  [TYPE_PARALLEL](payload, { execute }) {
    return Promise.all(payload.map(execute))
  },

  [TYPE_MAP](payload, { execute }) {
    const { collection, iteratee } = payload

    function* mapCollection() {
      for (const item of collection) {
        yield execute(iteratee(item))
      }
    }

    return iteratorToAsync(mapCollection())
  },
})
