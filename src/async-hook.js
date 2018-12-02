import { createHook, executionAsyncId, triggerAsyncId } from 'async_hooks'
import { performance } from 'perf_hooks'

import ExecuteContext from './execute-context'


let countExecContext = 0
let lastTimeAfter = NaN
let timeBlack = 0
let lastTimeBeginUntracked = NaN
let timeUntracked = 0
let executeContextByAsyncId = new Map()

const doLog = false
const log = []

const flushLog = () => {
  log.splice(0).forEach(
    (entry) => {
      console.log(JSON.stringify(entry))
    },
  )
}

const logEntry = (data) => {
  const eaid = executionAsyncId()
  const execCtx = executeContextByAsyncId.get(eaid)
  log.push({
    eaid: executionAsyncId(),
    taid: triggerAsyncId(),
    ctx: execCtx ? execCtx.id : null,
    data,
  })
}

global._flushLog = flushLog
global._log = log
global._logEntry = logEntry

const getCurrentExecuteContext = () =>
  executeContextByAsyncId.get(executionAsyncId())

const startExecuteContext = () => {
  if (countExecContext === 0) {
    log.push({ event: 'reset black' })
    timeBlack = 0
    timeUntracked = 0
  }
  countExecContext += 1
  const execCtx = new ExecuteContext(timeBlack, timeUntracked)

  // mark current async context to be part of an execution context
  executeContextByAsyncId.set(executionAsyncId(), execCtx)

  return execCtx
}

const endExecuteContext = (execCtx) => {
  execCtx.end(timeBlack, timeUntracked)

  // unmark current async context to be part of an execution context
  executeContextByAsyncId.delete(executionAsyncId())
  countExecContext -= 1
}

const init = (asyncId, resourceType, _triggerAsyncId) => {
  const time = performance.now()

  // get execution context from parent async context
  const execAsyncId = executionAsyncId()
  const execCtx = executeContextByAsyncId.get(execAsyncId)

  if (doLog) {
    const eaid = executionAsyncId()
    log.push({
      time,
      event: `init${eaid !== _triggerAsyncId ? '*' : ''}`,
      eaid,
      taid: triggerAsyncId(),
      ctx: execCtx ? execCtx.id : null,
      asyncId,
      resourceType,
      triggerAsyncId: _triggerAsyncId,
    })
  }

  // exec context found
  if (execCtx) {
    // mark new async context to be also part of parent execution context
    executeContextByAsyncId.set(asyncId, execCtx)

    // mark code type initially to be same as parent
    const { codeType, groupId } = execCtx.asyncContextByAsyncId.get(execAsyncId)

    execCtx.asyncContextByAsyncId.set(asyncId, {
      codeType, groupId, resourceType, timeInit: time,
    })
  }
}

const destroy = (asyncId) => {
  const time = performance.now()

  if (doLog) {
    const execCtx = executeContextByAsyncId.get(asyncId)
    log.push({
      time,
      event: 'destroy',
      eaid: executionAsyncId(),
      taid: triggerAsyncId(),
      asyncId,
      ctx: execCtx ? execCtx.id : null,
    })
  }
}

const before = (asyncId) => {
  const time = performance.now()

  if (!Number.isNaN(lastTimeAfter)) {
    timeBlack += time - lastTimeAfter
    lastTimeAfter = NaN
  }

  const execCtx = executeContextByAsyncId.get(asyncId)

  if (doLog) {
    log.push({
      time,
      event: 'before',
      eaid: executionAsyncId(),
      taid: triggerAsyncId(),
      asyncId,
      ctx: execCtx ? execCtx.id : null,
    })
  }

  if (execCtx) {
    const asyncCtx = execCtx.asyncContextByAsyncId.get(asyncId)
    asyncCtx.timeStart = time
  } else {
    lastTimeBeginUntracked = time
  }
  global._execCtx_ = execCtx
}

const after = (asyncId) => {
  const time = performance.now()
  lastTimeAfter = time

  const execCtx = executeContextByAsyncId.get(asyncId)

  if (doLog) {
    log.push({
      time,
      event: 'after',
      eaid: executionAsyncId(),
      taid: triggerAsyncId(),
      asyncId,
      ctx: execCtx ? execCtx.id : null,
    })
  }

  if (execCtx) {
    const {
      codeType, groupId, resourceType, timeInit, timeStart,
    } = execCtx.asyncContextByAsyncId.get(asyncId)
    const delay = timeStart - timeInit
    const execTime = time - timeStart
    execCtx.codeTypeStats[codeType].addCallMeasurement(
      groupId, resourceType, execTime, delay,
    )
  } else if (!Number.isNaN(lastTimeBeginUntracked)) {
    timeUntracked += time - lastTimeBeginUntracked
    lastTimeBeginUntracked = NaN
  }

  global._execCtx_ = null
}

const asyncHook = createHook({
  init,
  destroy,
  before,
  after,
})

asyncHook.enable()

const removeEndedExecuteContexts = () => {
  const newExecuteContextByAsyncId = new Map()

  for (const asyncId of executeContextByAsyncId.keys()) {
    const executeCtx = executeContextByAsyncId.get(asyncId)

    if (executeCtx && executeCtx.timeEnd === undefined) {
      newExecuteContextByAsyncId.set(asyncId, executeCtx)
    }
  }

  executeContextByAsyncId = newExecuteContextByAsyncId
}

setTimeout(removeEndedExecuteContexts, 1000)

export {
  getCurrentExecuteContext,
  startExecuteContext,
  endExecuteContext,
}
