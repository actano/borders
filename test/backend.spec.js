import { expect } from 'chai'
import Context, { CREATE_INITIAL_CONTEXT } from '../src/context'

describe('backend', () => {
  const ONE_PARAM = 'oneParam'
  const TWO_PARAM = 'twoParam'
  const EXECUTE = 'execute'
  const MAGIC = 'payload'

  const command = type => ({ type, payload: MAGIC })

  let backend
  let borders
  let context

  beforeEach(() => {
    context = {
      context: 'root',
    }

    backend = {
      [ONE_PARAM](payload) {
        const args = arguments.length
        return { self: this, payload, args }
      },
      [TWO_PARAM](payload, commandContext) {
        const args = arguments.length
        return {
          self: this, payload, commandContext, args,
        }
      },
      async [EXECUTE](payload, commandContext) {
        const { execute } = commandContext
        const child = Object.create(this)
        child.context = 'child'
        const result = await execute((function* () {
          return yield { type: ONE_PARAM, payload }
        }()), child)
        return {
          root: this, child, ...result,
        }
      },
      [CREATE_INITIAL_CONTEXT]() {
        return context
      },
    }

    borders = new Context().use(backend)
  })

  it('should pass backend object as this to commands without explicit context', async () => {
    delete backend[CREATE_INITIAL_CONTEXT]
    const { self } = await new Context().use(backend).execute(function* () {
      return yield command(ONE_PARAM)
    }())
    expect(self).to.equal(backend)
  })

  it('should pass context object as this to commands', async () => {
    const { self } = await borders.execute(function* () {
      return yield command(ONE_PARAM)
    }())
    expect(self).to.equal(context)
  })

  it('should pass payload as first parameter to commands', async () => {
    const { payload } = await borders.execute(function* () {
      return yield command(ONE_PARAM)
    }())
    expect(payload).to.equal(MAGIC)
  })

  it('should pass one parameter to commands with one parameter', async () => {
    const { args } = await borders.execute(function* () {
      return yield command(ONE_PARAM)
    }())
    expect(args).to.equal(1)
  })

  it('should pass context as second parameter to commands with two parameters', async () => {
    const { args, commandContext } = await borders.execute(function* () {
      return yield command(TWO_PARAM)
    }())
    expect(args).to.equal(2)
    expect(commandContext).to.be.an('object')
  })

  it('should pass an execute function taking to parameter as part of context', async () => {
    const { commandContext } = await borders.execute(function* () {
      return yield command(TWO_PARAM)
    }())
    expect(commandContext).to.respondTo('execute')
    const { execute } = commandContext
    expect(execute).to.have.lengthOf(2)
  })

  it('should execute generator with same context', async () => {
    const { commandContext } = await borders.execute(function* () {
      return yield command(TWO_PARAM)
    }())
    const { execute } = commandContext
    const { self } = await execute(function* () {
      return yield { type: ONE_PARAM, payload: MAGIC }
    }())
    expect(self).to.equal(context)
  })

  it('should execute generator with new context', async () => {
    const { root, child, self } = await borders.execute(function* () {
      return yield command(EXECUTE)
    }())
    expect(root).to.equal(context)
    expect(self).to.equal(child)
  })
})
