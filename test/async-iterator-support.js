import chai from 'chai'

const { expect } = chai

describe('async iterator', () => {
  it('should iterate async', async () => {
    async function* fn() {
      yield Promise.resolve(1)
      yield Promise.resolve(2)
    }

    let n = 0
    for await (const x of fn()) {
      n += 1
      expect(x).to.eql(n)
    }
    expect(n).to.eql(2)
  })
})
