export const isFunction = value => typeof value === 'function'

export const isString = value => typeof value === 'string'

export const isPromise = value => !!value && isFunction(value.then)

export const isCommand = value => !!value && isString(value.type)

export const isIterable = value => !!value && isFunction(value[Symbol.iterator])

export const isIterator = value => !!value && isFunction(value.next)

export const isGenerator = value => isIterator(value)
  && isFunction(value.throw) && isFunction(value.return)
