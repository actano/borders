import { performance } from 'perf_hooks'
import { isPromise, promiseFinally } from './utils'

export default class StatisticEntry {
  constructor() {
    this.count = 0
    this.sum = 0.0
    this.min = Number.NaN
    this.max = Number.NaN
    this._squareSum = 0.0
  }

  get avg() {
    return this.sum / this.count
  }

  get variance() {
    const a = this._squareSum / this.count
    const b = (this.sum ** 2) / (this.count ** 2)
    return a - b
  }

  addSample(diff) {
    this.count += 1
    this.sum += diff
    this.min = Number.isNaN(this.min) ? diff : Math.min(this.min, diff)
    this.max = Number.isNaN(this.max) ? diff : Math.max(this.max, diff)
    this._squareSum += diff ** 2
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
