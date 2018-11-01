import beautifyBenchmark from 'beautify-benchmark'
import Benchmark from 'benchmark'
import { map } from '../src/commands'
import iteratorToAsync from '../src/iterator-to-async'
import Context from '../src/context'

// ms to delay a command to simulate I/O, lower values will show the overhead of borders
const ioTime = 10
// Commands executed per 'op', lower values will likely show the overhead of context creation
const ioCommandsPerOp = 100
// No-Ops executed per 'op', higher values will likely show the overhead of borders
const noopCommandsPerOp = 10000

const immediate = () => new Promise(resolve => setImmediate(resolve))
const timeout = ms => new Promise(resolve => setTimeout(resolve, ms))
const delay = ms => (ms < 1 ? immediate() : timeout(ms))

const performIo = () => delay(ioTime)
const performNoop = () => Promise.resolve()

const io = () => ({ type: 'io' })
const noop = () => ({ type: 'noop' })

const backend = {
  io() {
    return performIo()
  },
  noop() {
    return Promise.resolve()
  },
}

const context = new Context().use(backend)

const consume = async (generator) => {
  let { value, done } = await generator.next()
  while (!done) {
    ({ value, done } = await generator.next()) // eslint-disable-line no-await-in-loop
  }
  return value
}

let suite = null
let running = Promise.resolve()

const describe = (desc, fn) => {
  const run = () => new Promise((resolve) => {
    suite = new Benchmark.Suite()
    fn()
    suite
      .on('cycle', ({ target }) => {
        beautifyBenchmark.add(target)
      })
      .on('complete', () => {
        beautifyBenchmark.log()
        resolve()
      })
      .run({ async: true })
  })

  if (global.describe && global.it) {
    global.describe(desc, () => {
      global.it('Executing benchmark', async function () {
        this.timeout(120000)
        await run()
      })
    })
  } else {
    running = running.then(() => {
      console.log(`Running ${desc}`)
      return run()
    })
  }
}

const it = (desc, fn) => {
  suite.add(desc, {
    defer: true,
    fn(deferred) {
      fn().then(() => deferred.resolve())
    },
  })
}

describe('sequential commands', () => {
  it('plain sequential async/await for io promise', async () => {
    for (let i = 0; i < ioCommandsPerOp; i += 1) {
      await performIo() // eslint-disable-line no-await-in-loop
    }
    for (let i = 0; i < noopCommandsPerOp; i += 1) {
      await performNoop() // eslint-disable-line no-await-in-loop
    }
  })

  it('running sequential io commands via context.execute()', async () => {
    for (let i = 0; i < ioCommandsPerOp; i += 1) {
      await context.execute(io()) // eslint-disable-line no-await-in-loop
    }
    for (let i = 0; i < noopCommandsPerOp; i += 1) {
      await context.execute(noop()) // eslint-disable-line no-await-in-loop
    }
  })

  it('running borders-service generator sequential yielding commands via context.execute()', async () => {
    await context.execute((function* () {
      for (let i = 0; i < ioCommandsPerOp; i += 1) {
        yield io()
      }
      for (let i = 0; i < noopCommandsPerOp; i += 1) {
        yield noop()
      }
    })())
  })
})

describe('parallel commands', () => {
  it('using iteratorToAsync to directly perform io in parallel', async () => {
    const generator = (function* () {
      for (let i = 0; i < ioCommandsPerOp; i += 1) {
        yield performIo()
      }
      for (let i = 0; i < noopCommandsPerOp; i += 1) {
        yield performNoop()
      }
    }())
    await consume(iteratorToAsync(generator))
  })

  it('running map command yielding commands via context.execute()', async () => {
    await context.execute(async function* () {
      const iterator = (function* () {
        for (let i = 0; i < ioCommandsPerOp; i += 1) {
          yield io()
        }
        for (let i = 0; i < noopCommandsPerOp; i += 1) {
          yield noop()
        }
      }())
      const asyncIterator = yield map(iterator, x => x)
      await consume(asyncIterator)
    }())
  })
})
