import { expect } from 'chai'

import StatisticEntry from '../src/statistic-entry'

describe('statistic-entry', () => {
  const LO = 10
  const HI = 20

  const entryWithSamples = (...samples) => {
    const entry = new StatisticEntry()
    for (const sample of samples) {
      entry.addSample(sample)
    }
    return entry
  }

  it('should contain count', async () => {
    const entry = entryWithSamples(LO, HI)
    expect(entry).to.have.property('count', 2)
  })

  it('should contain sum', async () => {
    const entry = entryWithSamples(LO, HI)
    expect(entry).to.have.property('sum')
    expect(entry.sum).to.be.at.least(LO + HI)
  })

  it('should contain min', () => {
    const entry = entryWithSamples(LO, HI)
    expect(entry).to.have.property('min')
    expect(entry.min).to.be.at.least(LO)
    expect(entry.min).to.be.below(HI)
  })

  it('should contain max', () => {
    const entry = entryWithSamples(LO, HI)
    expect(entry).to.have.property('max')
    expect(entry.max).to.be.above(LO)
    expect(entry.max).to.be.at.least(HI)
  })

  it('should contain avg', () => {
    const entry = entryWithSamples(LO, HI)
    expect(entry).to.have.property('avg')
    const _expect = (entry.min + entry.max) / 2
    expect(entry.avg).to.at.most(Math.ceil(_expect))
    expect(entry.avg).to.at.least(Math.floor(_expect))
  })

  it('should contain variance', () => {
    const entry = entryWithSamples(LO, HI)
    expect(entry).to.have.property('variance')
    // const { avg } = entry
    // const _expect = (((LO - avg) ** 2) + ((HI - avg) ** 2)) / 2
    const _expect = 5 ** 2
    expect(entry.variance).to.deep.equal(_expect)
  })
})
