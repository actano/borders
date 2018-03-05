import sinon from 'sinon'
import { expect } from 'chai'
import waitFor from 'p-wait-for'
import Context from '../src/context'
import { StackFrame } from '../src/stack-frame'
import lazy from '../src/lazy/command'

function expectIterable(iterable) {
  expect(typeof iterable[Symbol.iterator]).to.equal('function')

  return {
    toIterateOver(expectedValues) {
      const errorMessage = `expected ${iterable} to iterate over ${expectedValues}`
      const actualIterator = iterable[Symbol.iterator]()
      const expectedIterator = expectedValues[Symbol.iterator]()

      let actualState = actualIterator.next()
      let expectedState = expectedIterator.next()

      while (!actualState.done) {
        expect(actualState.value).to.equal(expectedState.value, errorMessage)
        actualState = actualIterator.next()
        expectedState = expectedIterator.next()
      }

      expect(expectedState.done).to.equal(true, errorMessage)
    },
  }
}

describe('borders/context', () => {
  it('should return result of generator', async () => {
    const result = {}
    const context = new Context()
    context.use({ test() { } })
    const received = await context.execute(function* test() {
      yield { type: 'test' }
      return result
    }())
    expect(received).to.eq(result)
  })

  it('should delegate command with payload to backend', async () => {
    const type = 'test'
    const payload = 'payload'
    const context = new Context()
    const spy = sinon.spy()
    context.use({ [type]: spy })
    await context.execute(function* test() {
      yield { type, payload }
    }())
    expect(spy.callCount).to.eq(1)
    expect(spy.alwaysCalledWithExactly(payload)).to.eq(true)
  })

  it('should resolve promises before passing back', async () => {
    const result = {}
    const context = new Context()
    const backend = { test() { return Promise.resolve(result) } }
    context.use(backend)
    await context.execute(function* test() {
      const received = yield { type: 'test' }
      expect(received).to.eq(result)
    }())
  })

  it('should resolve yielded promises and pass them back', async () => {
    const result = {}
    const context = new Context()
    await context.execute(function* test() {
      const received = yield Promise.resolve(result)
      expect(received).to.eq(result)
    }())
  })

  it('should not allow overriding of backend commands', () => {
    const context = new Context()
    const backend = { test() { } }
    context.use(backend)
    expect(() => context.use(backend)).to.throw(Error)
  })

  context('when backend throws error while executing a command', () => {
    let backendError
    let backend

    beforeEach(() => {
      backendError = new Error('Backend Error')
      backend = {
        test() {
          throw backendError
        },
      }
    })

    it('should throw the error in the generator', async () => {
      let thrownError
      const context = new Context()

      context.use(backend)

      await context.execute(function* test() {
        try {
          yield { type: 'test' }
        } catch (e) {
          thrownError = e
        }
      }())

      expect(thrownError).to.equal(backendError)
    })

    context('when command contains a stack frame', () => {
      it('should append the stack frame of the command to the error', async () => {
        let thrownError
        const stackFrame = new StackFrame()
        const originalStack = backendError.stack
        const context = new Context()

        context.use(backend)

        await context.execute(function* test() {
          try {
            yield { type: 'test', stackFrame }
          } catch (e) {
            thrownError = e
          }
        }())

        expect(thrownError.stack).to.equal([
          ...originalStack.split('\n'),
          'From previous event:',
          ...stackFrame.stack.split('\n').slice(1),
        ].join('\n'))
      })
    })
  })

  describe('executing multiple commands at once', () => {
    function createIterableOf(items) {
      const iterable = {}
      iterable[Symbol.iterator] = function* iterate() {
        for (const item of items) {
          yield item
        }
      }
      return iterable
    }

    it('should run multiple commands and return their results', async () => {
      const context = new Context()
      const backend = {
        command1() { return 101 },
        command2() { return 102 },
      }
      context.use(backend)

      await context.execute(function* test() {
        const result = yield createIterableOf([
          { type: 'command1' },
          { type: 'command2' },
        ])
        expectIterable(result)
          .toIterateOver([101, 102])
      }())
    })

    it('should run multiple generators and return their results', async () => {
      const context = new Context()
      const backend = {
        command1() { return 101 },
        command2() { return 102 },
      }
      context.use(backend)

      function* generator1() {
        const a = yield { type: 'command1' }
        return a - 10
      }

      function* generator2() {
        const a = yield { type: 'command2' }
        return a - 20
      }

      await context.execute(function* test() {
        const result = yield createIterableOf([
          generator1(),
          generator2(),
        ])
        expectIterable(result)
          .toIterateOver([91, 82])
      }())
    })

    it('should run commands in parallel', async () => {
      const context = new Context()
      let command1Started = false
      let command2Started = false
      const backend = {
        async command1() {
          command1Started = true
          await waitFor(() => command2Started)
          return 101
        },
        async command2() {
          command2Started = true
          await waitFor(() => command1Started)
          return 102
        },
      }
      context.use(backend)

      await context.execute(function* test() {
        const result = yield createIterableOf([
          { type: 'command1' },
          { type: 'command2' },
        ])

        expectIterable(result)
          .toIterateOver([101, 102])
      }())
    })
  })

  describe('lazy evaluation', () => {
    it('should evaluate commands lazily', async () => {
      const callSequence = []

      const backend = {
        async get(id) {
          callSequence.push({ id, call: 'get' })
          return { id }
        },
        async put({ id, value }) {
          callSequence.push({ id, call: 'put', value })
        },
      }

      const context = new Context()
      context.use(backend)


      function* getItem(id) {
        return yield { type: 'get', payload: id }
      }

      function* putItem(id, value) {
        return yield { type: 'put', payload: { id, value } }
      }

      function* allItems() {
        let id = 1
        while (true) {
          yield* getItem(id)
          id += 1
        }
      }

      async function* even(asyncIterable) {
        for await (const item of asyncIterable) {
          if (item.id % 2 === 0) {
            yield item
          }
        }
      }

      async function* take(n, asyncIterable) {
        let i = 1

        if (i > n) {
          return
        }

        for await (const item of asyncIterable) {
          yield item

          if (i >= n) {
            break
          }

          i += 1
        }
      }

      async function* setValue(asyncIterable) {
        for await (const item of asyncIterable) {
          yield {
            id: item.id,
            value: `item-${item.id}`,
          }
        }
      }

      async function* consumeItems(allItemsLazy) {
        // Take the first five even items and set their value
        const evenItems = even(allItemsLazy)
        const fiveEvenItems = take(5, evenItems)
        const fiveEvenItemsWithValue = setValue(fiveEvenItems)

        for await (const item of fiveEvenItemsWithValue) {
          yield* putItem(item.id, item.value)
        }
      }

      await context.execute(async function* test() {
        const allItemsLazy = yield lazy(allItems())
        yield* consumeItems(allItemsLazy)
      }())

      // Each item has to be fetched with `get`. Only the first five even items are put with a
      // value.
      expect(callSequence).to.deep.equal([
        { id: 1, call: 'get' },
        { id: 2, call: 'get' },
        { id: 2, call: 'put', value: 'item-2' },
        { id: 3, call: 'get' },
        { id: 4, call: 'get' },
        { id: 4, call: 'put', value: 'item-4' },
        { id: 5, call: 'get' },
        { id: 6, call: 'get' },
        { id: 6, call: 'put', value: 'item-6' },
        { id: 7, call: 'get' },
        { id: 8, call: 'get' },
        { id: 8, call: 'put', value: 'item-8' },
        { id: 9, call: 'get' },
        { id: 10, call: 'get' },
        { id: 10, call: 'put', value: 'item-10' },
      ])
    })
  })
})
