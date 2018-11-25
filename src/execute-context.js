import { executionAsyncId } from 'async_hooks'
import { performance } from 'perf_hooks'

import CodeTypeStatisticsEntry from './code-type-statistics-entry'

let nextExecCtxId = 0

const CODE_TYPE_BORDERS = 'borders'
const CODE_TYPE_USERLAND = 'userland'
const CODE_TYPE_BACKEND = 'backend'

class ExecuteContext {
  constructor() {
    this.timeStart = performance.now()
    this.startAsyncId = executionAsyncId()
    this.id = nextExecCtxId
    nextExecCtxId += 1
    this.asyncContextByAsyncId = {
      [this.startAsyncId]: {
        codeType: CODE_TYPE_BORDERS,
        resourceType: 'PROMISE',
        timeStart: this.timeStart,
      },
    }
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
    return this.asyncContextByAsyncId[executionAsyncId()]
  }

  get duration() {
    return this.timeEnd !== undefined
      ? this.timeEnd - this.timeStart
      : -1
  }

  end() {
    this.timeEnd = performance.now()
  }

  get json() {
    const json = {
      executeContextId: this.id,
      duration: this.duration,
    }
    const jsonCodeType = {}
    let durationUnused = json.duration

    for (const codeType of Object.keys(this.codeTypeStats)) {
      const codeJson = this.codeTypeStats[codeType].json
      jsonCodeType[`codeType:${codeType}`] = codeJson

      if (json.duration > 0) {
        json[`time-percent-${codeType}`] = 100 * codeJson.time / json.duration
        durationUnused -= codeJson.time
      }
    }

    if (json.duration > 0) {
      json['time-percent-unused'] = 100 * durationUnused / json.duration
    }

    return {
      ...json,
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
