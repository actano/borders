const { performance } = require('perf_hooks')

const { createHook, executionAsyncId } = require('async_hooks')

// track time outside nodes event loop
let lastAfter = Number.NaN
let blackTime = 0.0

const contexts = new Map()

const init = (asyncId, type, triggerAsyncId, resource) => {
  const parentId = executionAsyncId()
  const parent = contexts.get(parentId)
  if (parent) {
    const { executionContext } = parent
    contexts.set(asyncId, { type, executionContext })
  }
}

const destroy = (asyncId) => {
  contexts.delete(asyncId)
}

const before = (asyncId) => {
  const now = performance.now()
  if (!Number.isNaN(lastAfter)) {
    blackTime += now - lastAfter
    lastAfter = Number.NaN
  }
  const context = contexts.get(asyncId)
  if (context) {
    context.startTime = now
  }
}

const after = (asyncId) => {
  const now = performance.now()
  lastAfter = now
  const context = contexts.get(asyncId)
  if (context) {
    const { type, startTime, executionContext } = context
    executionContext.add(type, startTime, now)
    // For promises before/after will be called max one time (but no destroy)
    if (context.type === 'PROMISE') {
      destroy(asyncId)
    }
  }
}

const promiseResolve = (asyncId) => {
  const context = contexts.get(asyncId)
  // if startTime is set, callback is currently executed, done shall be called in after()
  if (context && Number.isNaN(context.startTime)) {
    destroy(asyncId)
  }
}

const hook = createHook({
  init, destroy, before, after, promiseResolve,
})

export default class ExecutionContext {
  constructor() {
    hook.enable()
    this.duration = 0
    this.counts = {}
    this.startBlackTime = blackTime
    this.endTime = Number.NaN
    this.endBlackTime = Number.NaN
  }

  get blackTime() {
    return this.endBlackTime - this.startBlackTime
  }

  add(type, startTime, endTime) {
    this.endTime = endTime
    this.endBlackTime = blackTime
    this.duration += endTime - startTime
    const total = this.counts[type] || 0
    this.counts[type] = total + 1
  }

  run(fn) {
    const id = executionAsyncId()
    const prev = contexts.get(id)
    contexts.set(id, { executionContext: this })
    const startTime = performance.now()
    try {
      return fn()
    } finally {
      const endTime = performance.now()
      if (prev) {
        contexts.set(id, prev)
      } else {
        contexts.delete(id)
      }
      this.add('RUN', startTime, endTime)
    }
  }
}

export const disable = () => hook.disable()
