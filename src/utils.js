export const isFunction = value => typeof value === 'function'

export const isString = value => typeof value === 'string'

export const isPromise = value => !!value && isFunction(value.then)

export const isCommand = value => !!value && isString(value.type)

export const isPromiseArray = (value) => {
  if (value instanceof Array) {
    for (const item of value) {
      if (!isPromise(item)) {
        return false
      }
    }
    return true
  }

  return false
}
