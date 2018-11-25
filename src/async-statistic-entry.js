class AsyncStatisticEntry {
  constructor() {
    this.countAsyncContexts = 0
    this.time = 0
    this.delaySum = 0
  }

  addCallMeasurement(execTime, delay) {
    this.countAsyncContexts += 1
    this.time += execTime
    this.delaySum += delay

    if (this.execTimeMin === undefined || this.execTimeMin > execTime) {
      this.execTimeMin = execTime
    }

    if (this.execTimeMax === undefined || this.execTimeMax < execTime) {
      this.execTimeMax = execTime
    }

    if (this.delayMin === undefined || this.delayMin > delay) {
      this.delayMin = delay
    }

    if (this.delayMax === undefined || this.delayMax < delay) {
      this.delayMax = delay
    }
  }

  addEntry(entry) {
    this.countAsyncContexts += entry.countAsyncContexts
    this.time += entry.time
    this.isSum = true
  }

  get json() {
    if (this.countAsyncContexts === 0) {
      return { countAsyncContexts: 0 }
    }

    if (this.isSum) {
      return {
        countAsyncContexts: this.countAsyncContexts,
        time: this.time,
      }
    }

    return {
      countAsyncContexts: this.countAsyncContexts,
      time: this.time,
      execTimeMin: this.execTimeMin,
      execTimeAvg: this.time / this.countAsyncContexts,
      execTimeMax: this.execTimeMax,
      delayMin: this.delayMin,
      delayAvg: this.delaySum / this.countAsyncContexts,
      delayMax: this.delayMax,
    }
  }
}

export default AsyncStatisticEntry
