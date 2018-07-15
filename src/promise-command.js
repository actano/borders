export const TYPE_PROMISE = 'PROMISE'

export default promise => ({
  type: TYPE_PROMISE,
  payload: Promise.resolve(promise),
})
