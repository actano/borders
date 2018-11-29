import { expect } from 'chai'
import { disable } from '../src/async-tracking'

import Context from '../src/context'
import { ASYNC, DIFF } from '../src/sampler'
import StatisticEntry from '../src/statistic-entry'
import EchoBackend from './util/echo-backend'

class DelayBackend {
// eslint-disable-next-line class-methods-use-this
  delay({ ms }, { next }) {
    const promise = new Promise((resolve) => {
      setTimeout(resolve, ms + 1)
    })
    if (next) return promise.then(() => next())
    return promise
  }
}

const delayCommand = ms => ({
  type: 'delay',
  payload: { ms },
})

for (const statistics of [DIFF, ASYNC]) {
  const LO = 10
  const HI = 20

  const expectations = (context, key, factor = 1) => {
    const entry = context.statistics().get(key)
    expect(entry, `statistics do not contain ${key}`).to.be.an.instanceof(StatisticEntry)
    const {
      count, sum, min, max,
    } = entry
    const lo = factor * LO
    const hi = factor * HI

    expect(count).to.equal(2)
    expect(sum, 'sum is to low').to.be.at.least(lo + hi)
    expect(min, 'min is to high').to.be.at.least(lo)
    expect(min, 'min is to high').to.be.below(hi)
    expect(max, 'max is to low').to.be.above(lo)
    expect(max, 'max is to low').to.be.at.least(hi)
  }

  describe(`statistics with sampler engine '${statistics}'`, () => {
    after(() => {
      disable()
    })

    it('should respond to `statistics` returning a map', () => {
      const context = new Context({ statistics })
      expect(context).to.respondTo('statistics')
      expect(context.statistics()).to.be.an.instanceof(Map)
    })

    it('should have entries for each command', () => {
      const context = new Context({ statistics })
      context.use(new EchoBackend())
      const result = context.statistics()
      expect(result.get('echo')).to.be.an.instanceof(StatisticEntry)
    })

    it('should calculate statistics', async () => {
      const context = new Context({ statistics })
      context.use(new EchoBackend()).use(new DelayBackend())
      await context.execute(delayCommand(LO))
      await context.execute(delayCommand(HI))
      expectations(context, 'delay')
    })

    it('should have entries for `command.<n>` for each backend', async () => {
      const context = new Context({ statistics })
      context.use(new DelayBackend(), new DelayBackend())
      await context.execute(delayCommand(LO))
      await context.execute(delayCommand(HI))
      expectations(context, 'delay.1')
      expectations(context, 'delay.0', 2)
      expectations(context, 'delay', 2)
    })

    it('should have entries for `command.<n>:<selector>` for multiplexed backend')
  })
}
