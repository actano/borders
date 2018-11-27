import { performance } from 'perf_hooks'
import { isPromise, promiseFinally } from './utils'

export default class StatisticEntry {
  constructor() {
    this.count = 0
    this.sum = 0.0
    this.min = Number.NaN
    this.max = Number.NaN
    this.avg = 0.0
    this.varianceTimesCount = 0.0
  }

  get variance() {
    return this.varianceTimesCount / this.count
  }

  addSample(diff) {
    this.count += 1
    this.sum += diff
    this.min = Number.isNaN(this.min) ? diff : Math.min(this.min, diff)
    this.max = Number.isNaN(this.max) ? diff : Math.max(this.max, diff)
    const oldAvg = this.avg
    const diffMinusOldAvg = diff - oldAvg
    this.avg += (diffMinusOldAvg) / this.count
    this.varianceTimesCount += diffMinusOldAvg * (diff - this.avg)
  }

  addCall(fn) {
    const start = performance.now()
    const done = () => this.addSample(performance.now() - start)
    const result = fn()
    if (isPromise(result)) {
      return promiseFinally(result, done)
    }
    done()
    return result
  }
}
