import { performance } from 'perf_hooks'
import ExecutionContext from './async-tracking'
import { isPromise, promiseFinally } from './utils'

export const NOOP = 'noop'
export const ASYNC = 'async'
export const DIFF = 'diff'

const sampler = {
  [ASYNC](fn, entry) {
    const executionContext = new ExecutionContext()
    const result = executionContext.run(fn)
    Promise.resolve(result).then(() => {
      entry.addSample(executionContext.duration + executionContext.blackTime)
    })
    return result
  },

  [DIFF](fn, entry) {
    const start = performance.now()
    const done = () => entry.addSample(performance.now() - start)
    const result = fn()
    if (isPromise(result)) {
      return promiseFinally(result, done)
    }
    done()
    return result
  },
}

export default (id) => {
  const result = sampler[id]
  if (!result) throw new Error(`Sampler '${id}' is unknown`)
  return result
}
