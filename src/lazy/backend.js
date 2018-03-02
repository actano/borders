import { TYPE } from './command'

export default fork => ({
  [TYPE](iterable) {
    return {
      * [Symbol.iterator]() {
        for (const value of iterable) {
          yield fork(value)
        }
      },
    }
  },
})
