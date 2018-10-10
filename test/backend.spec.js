import { expect } from 'chai'
import Context from '../src/context'

describe('backend', () => {
  const ONE_PARAM = 'oneParam'
  const TWO_PARAM = 'twoParam'
  const EXECUTE = 'execute'
  const MAGIC = 'payload'

  const command = (type, payload = MAGIC) => ({ type, payload })

  let backend
  let borders

  const executeCommand = (type, payload) => borders.execute(function* () {
    return yield command(type, payload)
  }())

  beforeEach(() => {
    backend = {
      context: 'root',
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
    }

    borders = new Context().use(backend)
  })

  it('should pass backend object as this to commands without explicit context', async () => {
    const { self } = await executeCommand(ONE_PARAM)
    expect(self).to.equal(backend)
  })

  it('should pass payload as first parameter to commands', async () => {
    const { payload } = await executeCommand(ONE_PARAM)

    expect(payload).to.equal(MAGIC)
  })

  it('should pass one parameter to commands with one parameter', async () => {
    const { args } = await executeCommand(ONE_PARAM)

    expect(args).to.equal(1)
  })

  it('should pass context as second parameter to commands with two parameters', async () => {
    const { args, commandContext } = await executeCommand(TWO_PARAM)

    expect(args).to.equal(2)
    expect(commandContext).to.be.an('object')
  })

  it('should pass an execute function taking to parameter as part of context', async () => {
    const { commandContext } = await executeCommand(TWO_PARAM)

    expect(commandContext).to.respondTo('execute')
    const { execute } = commandContext
    expect(execute).to.have.lengthOf(2)
  })

  it('should execute generator with same context', async () => {
    const { commandContext } = await executeCommand(TWO_PARAM)

    const { execute } = commandContext
    const { self } = await execute(function* () {
      return yield { type: ONE_PARAM, payload: MAGIC }
    }())
    expect(self).to.equal(backend)
  })

  it('should execute generator with new context', async () => {
    const { root, child, self } = await executeCommand(EXECUTE)

    expect(root).to.equal(backend)
    expect(self).to.equal(child)
  })
})
