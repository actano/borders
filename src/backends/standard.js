import toAsyncIterator from '../async-iterator'
import { TYPE_ITERATE } from '../commands/iterate'
import { TYPE_MAP } from '../commands/map'
import { TYPE_PARALLEL } from '../commands/parallel'
import iteratorToAsync from '../iterator-to-async'

export default () => ({
  [TYPE_ITERATE](payload, { iterate }) {
    return iteratorToAsync(iterate(payload))
  },

  [TYPE_PARALLEL](payload, { execute }) {
    return Promise.all(payload.map(execute))
  },

  [TYPE_MAP](payload, { execute }) {
    const { collection, iteratee } = payload

    return iteratorToAsync(toAsyncIterator(collection, item => execute(iteratee(item))))
  },
})
