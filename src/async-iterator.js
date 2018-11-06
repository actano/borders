const toAsyncIterator = (collection, fn) => {
  if (typeof collection.next === 'function') {
    const next = async () => {
      const item = await collection.next()
      if (item.done) return item
      const value = await fn(item.value)
      return { done: false, value }
    }

    // full generator
    if (collection.throw && collection.return) {
      return {
        next,
        async throw(exception) {
          return collection.throw(exception)
        },
        async return(value) {
          return collection.return(value)
        },
      }
    }

    // iterator only
    return { next }
  }

  if (collection[Symbol.iterator]) {
    return toAsyncIterator(collection[Symbol.iterator](), fn)
  }

  if (collection[Symbol.asyncIterator]) {
    return toAsyncIterator(collection[Symbol.asyncIterator](), fn)
  }

  throw new Error(`Cannot identify ${collection} as iterator or generator`)
}

export default toAsyncIterator
