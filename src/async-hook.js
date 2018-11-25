import { createHook, executionAsyncId } from 'async_hooks'
import { performance } from 'perf_hooks'

import ExecuteContext from './execute-context'

let executeContextByAsyncId = {}

const getCurrentExecuteContext = () =>
  executeContextByAsyncId[executionAsyncId()]

const startExecuteContext = () => {
  const execCtx = new ExecuteContext()

  // mark current async context to be part of an execution context
  executeContextByAsyncId[executionAsyncId()] = execCtx

  return execCtx
}

const endExecuteContext = (execCtx) => {
  execCtx.end()

  // unmark current async context to be part of an execution context
  executeContextByAsyncId[executionAsyncId()] = undefined
}

const init = (asyncId, resourceType, _triggerAsyncId) => {
  // get execution context from parent async context
  let parentAsyncId = _triggerAsyncId
  let execCtx = executeContextByAsyncId[parentAsyncId]
  const execAsyncId = executionAsyncId()

  if (!execCtx && execAsyncId !== _triggerAsyncId) {
    parentAsyncId = execAsyncId
    execCtx = executeContextByAsyncId[parentAsyncId]
  }

  // exec context found
  if (execCtx) {
    // mark new async context to be also part of parent execution context
    executeContextByAsyncId[asyncId] = execCtx

    // mark code type initially to be same as parent
    const { codeType, groupId } = execCtx.asyncContextByAsyncId[parentAsyncId]
    const timeInit = performance.now()

    execCtx.asyncContextByAsyncId[asyncId] = {
      codeType, groupId, parentAsyncId, resourceType, timeInit,
    }
  }
}

const before = (asyncId) => {
  const execCtx = executeContextByAsyncId[asyncId]

  if (execCtx) {
    const timeStart = performance.now()
    const asyncCtx = execCtx.asyncContextByAsyncId[asyncId]
    asyncCtx.timeStart = timeStart
  }
}

const after = (asyncId) => {
  const execCtx = executeContextByAsyncId[asyncId]

  if (execCtx) {
    const timeEnd = performance.now()
    const {
      codeType, groupId, resourceType, timeInit, timeStart,
    } = execCtx.asyncContextByAsyncId[asyncId]
    const delay = timeStart - timeInit
    const execTime = timeEnd - timeStart
    execCtx.codeTypeStats[codeType].addCallMeasurement(
      groupId, resourceType, execTime, delay,
    )
  }
}

const asyncHook = createHook({
  init,
  before,
  after,
})

asyncHook.enable()

const removeEndedExecuteContexts = () => {
  const newExecuteContextByAsyncId = {}

  for (const asyncId of Object.keys(executeContextByAsyncId)) {
    const executeCtx = executeContextByAsyncId[asyncId]

    if (executeCtx && executeCtx.timeEnd === undefined) {
      newExecuteContextByAsyncId[asyncId] = executeCtx
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
