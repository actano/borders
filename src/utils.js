export const isFunction = value => typeof value === 'function'

export const isString = value => typeof value === 'string'

export const isPromise = value => !!value && isFunction(value.then)

export const isCommand = value => !!value && isString(value.type)
