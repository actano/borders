import { expect } from 'chai'
import Context from '../src/context'

describe('backend', () => {
  const ONE_PARAM = 'oneParam'
  const TWO_PARAM = 'twoParam'
  const MAGIC = 'payload'

  const command = (type, payload = MAGIC) => ({ type, payload })

  let backend
  let borders

  const executeCommand = (type, payload) => borders.execute(function* () {
    return yield command(type, payload)
  }())

  beforeEach('create backend', () => {
    backend = {
      context: 'root',
      [ONE_PARAM](payload) {
        const args = arguments.length
        return { self: this, payload, args }
      },
      async [TWO_PARAM](payload, commandContext) {
        const args = arguments.length
        const { execute, subcontext, next } = payload
        const result = {
          self: this, payload, commandContext, args,
        }

        if (next && commandContext.next) {
          result.result = await commandContext.next()
        } else if (execute) {
          if (subcontext) {
            result.child = Object.assign(Object.create(this), { context: 'child' })
            result.result = await commandContext.execute(execute(), result.child)
          } else {
            result.result = await commandContext.execute(execute())
          }
        }
        return result
      },
    }
  })

  describe('single backend', () => {
    beforeEach('create single backend context', () => {
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

    it('should pass an execute function taking two parameters as part of context', async () => {
      const { commandContext } = await executeCommand(TWO_PARAM)

      expect(commandContext).to.respondTo('execute')
      const { execute } = commandContext
      expect(execute).to.have.lengthOf(2)
    })

    it('should execute generator with same context', async () => {
      const { result } = await executeCommand(TWO_PARAM, {
        * execute() {
          return yield command(ONE_PARAM)
        },
      })

      const { self } = result
      expect(self).to.equal(backend)
    })

    it('should execute generator with new context', async () => {
      const { self, child, result } = await executeCommand(TWO_PARAM, {
        subcontext: true,
        * execute() {
          return yield command(ONE_PARAM)
        },
      })
      expect(self).to.equal(backend)
      expect(result.self).to.equal(child)
    })
  })

  describe('multiple backends', () => {
    const FRONT_ONLY = 'FRONT_ONLY'
    let frontBackend

    beforeEach('create front backend', () => {
      frontBackend = Object.assign({}, backend, { context: 'front', FRONT_ONLY: backend[TWO_PARAM] })
    })

    beforeEach('create multiple backends context', () => {
      borders = new Context().use(frontBackend, backend)
    })

    it('should provide a next function for chaining backends', async () => {
      const { commandContext } = await executeCommand(TWO_PARAM)
      expect(commandContext).to.respondTo('next')
      const { next } = commandContext
      expect(next).to.have.lengthOf(0)
    })

    it('should not provide a `next` function for simple commands', async () => {
      const { args } = await executeCommand(ONE_PARAM)
      expect(args).to.equal(1)
    })

    it('should not provide a `next` function if the command does not exist in the next backend', async () => {
      const { commandContext } = await executeCommand(FRONT_ONLY)
      expect(commandContext).to.not.respondTo('next')
    })

    it('should call next command with correct context', async () => {
      const { self, result } = await executeCommand(TWO_PARAM, { next: true })
      expect(self).to.equal(frontBackend)
      expect(result.self).to.equal(backend)
    })

    it('should allow creating a subcontext from the first backend', async () => {
      const { self, child, result } = await executeCommand(TWO_PARAM, {
        subcontext: true,
        * execute() {
          return yield command(TWO_PARAM, { next: true })
        },
      })
      expect(self).to.equal(frontBackend)
      expect(result.self).to.equal(child)
    })

    it('should allow creating a subcontext from the next backend', async () => {
      const { self, result } = await executeCommand(TWO_PARAM, {
        next: true,
        subcontext: true,
        * execute() {
          return yield command(TWO_PARAM, { next: true })
        },
      })
      expect(self, 'first backend of call').to.equal(frontBackend)
      expect(result.self, 'second backend of call').to.equal(backend)
      expect(result.result.self, 'first backend of subcontext call').to.equal(frontBackend)
      expect(result.result.result.self, 'second backend of subcontext call').to.equal(result.child)
    })
  })
})
