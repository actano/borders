// Yield to the node.js event loop to make sure that other tasks are not blocked by the
// current execution. Note: Just awaiting a promise is not enough since promises which don't
// contain i/o are immediately resolved afterwards on the micro-task queue before any other
// task has the chance to run.

export default async () => new Promise((resolve) => {
  setImmediate(resolve)
})
