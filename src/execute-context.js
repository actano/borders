import { executionAsyncId } from 'async_hooks'
import { performance } from 'perf_hooks'

import CodeTypeStatisticsEntry from './code-type-statistics-entry'

let nextExecCtxId = 1

const CODE_TYPE_BORDERS = 'borders'
const CODE_TYPE_USERLAND = 'userland'
const CODE_TYPE_BACKEND = 'backend'

class ExecuteContext {
  constructor(timeBlackStart, timeUntrackedStart) {
    this.countSubExecute = 0
    this.timeBlackStart = timeBlackStart
    this.timeUntrackedStart = timeUntrackedStart
    this.timeStart = performance.now()
    this.startAsyncId = executionAsyncId()
    this.id = nextExecCtxId
    nextExecCtxId += 1
    this.asyncContextByAsyncId = new Map()
    this.asyncContextByAsyncId.set(
      this.startAsyncId,
      {
        codeType: CODE_TYPE_BORDERS,
        resourceType: 'PROMISE',
        timeStart: this.timeStart,
      },
    )
    this.codeTypeStats = {
      [CODE_TYPE_BORDERS]: new CodeTypeStatisticsEntry(),
      [CODE_TYPE_USERLAND]: new CodeTypeStatisticsEntry(),
      [CODE_TYPE_BACKEND]: new CodeTypeStatisticsEntry(),
    }
    this.codeTypeStats[CODE_TYPE_BORDERS].addGroupMeasurement()
    this.countExceptions = 0
  }

  executeNonBorderCode(codeType, code, groupId) {
    this.codeTypeStats[codeType].addGroupMeasurement(groupId)
    return Promise
      .resolve() // create new separate root async id
      .then(() => {
        // switch to target codetype/groupId
        const asyncCtx = this.asyncContext
        asyncCtx.codeType = codeType
        asyncCtx.groupId = groupId
        return code()
      })
      .then(
        (result) => {
          // switch back borders codetype
          const asyncCtx = this.asyncContext
          asyncCtx.codeType = CODE_TYPE_BORDERS
          asyncCtx.groupId = ''
          return result
        },
        (error) => {
          // switch back borders codetype
          const asyncCtx = this.asyncContext
          asyncCtx.codeType = CODE_TYPE_BORDERS
          asyncCtx.groupId = ''
          throw error
        },
      )
  }

  get asyncContext() {
    return this.asyncContextByAsyncId.get(executionAsyncId())
  }

  end(timeBlackEnd, timeUntrackedEnd) {
    this.timeEnd = performance.now()
    this.timeBlack = timeBlackEnd - this.timeBlackStart
    this.timeUntracked = timeUntrackedEnd - this.timeUntrackedStart
  }

  get json() {
    const json = {
      executeContextId: this.id,
      duration: this.timeEnd - this.timeStart,
    }
    const jsonCodeType = {}
    let durationRemaining = json.duration
    let timeSumTask = 0

    for (const codeType of Object.keys(this.codeTypeStats)) {
      const codeJson = this.codeTypeStats[codeType].json
      jsonCodeType[`codeType:${codeType}`] = codeJson

      timeSumTask += codeJson.time
      json[`time-${codeType}`] = codeJson.time
      if (json.duration > 0) {
        json[`time-${codeType}-percent`] = 100 * codeJson.time / json.duration
        durationRemaining -= codeJson.time
      }
    }

    json['time-untracked'] = this.timeUntracked
    if (json.duration > 0) {
      json['time-untracked-percent'] = 100 * this.timeUntracked / json.duration
    }
    json['time-other'] = durationRemaining - this.timeUntracked - this.timeBlack
    if (json.duration > 0) {
      json['time-other-percent'] = 100 * (durationRemaining - this.timeUntracked - this.timeBlack) / json.duration
    }
    json['time-black'] = this.timeBlack
    if (json.duration > 0) {
      json['time-black-percent'] = 100 * this.timeBlack / json.duration
    }
    json['time-sum-task(userland+borders+backend)'] = timeSumTask
    if (json.duration > 0) {
      json['time-sum-task-percent'] = 100 * timeSumTask / json.duration
    }
    json['time-sum-none-task'] = json.duration - timeSumTask
    if (json.duration > 0) {
      json['time-sum-none-task-percent'] = 100 * (json.duration - timeSumTask) / json.duration
    }

    return {
      ...json,
      countSubExecute: this.countSubExecute,
      ...jsonCodeType,
    }
  }
}

export default ExecuteContext
export {
  CODE_TYPE_BORDERS,
  CODE_TYPE_USERLAND,
  CODE_TYPE_BACKEND,
}
