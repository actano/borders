export const isFunction = value => typeof value === 'function'

export const isString = value => typeof value === 'string'

export const isPromise = value => !!value && isFunction(value.then)

export const isCommand = value => !!value && isString(value.type)

export const isGenerator = value =>
  !!value && isFunction(value.next) && isFunction(value.throw) && isFunction(value.return)

export const generatorForSingleValue = (value) => {
  function* generateSingleValue() {
    return yield value
  }

  return generateSingleValue()
}
