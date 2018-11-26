export const isFunction = value => typeof value === 'function'

export const isString = value => typeof value === 'string'

export const isPromise = value => !!value && isFunction(value.then)

export const isCommand = value => !!value && isString(value.type)

const polyfillPromiseFinally = (promise, onFinally) => promise.then(async (value) => {
  await onFinally()
  return value
}, async (reason) => {
  await onFinally()
  throw reason
})

export const promiseFinally = Promise.prototype.finally
  ? (promise, onFinally) => promise.finally(onFinally)
  : polyfillPromiseFinally
