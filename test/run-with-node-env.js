function requireNoCache(module) {
  delete require.cache[require.resolve(module)]
  // eslint-disable-next-line global-require,import/no-dynamic-require
  return require(module)
}

const runWithNodeEnv = (nodeEnv) => {
  let oldEnv
  let commandWithStackFrame

  before(() => {
    oldEnv = process.env.NODE_ENV
    process.env.NODE_ENV = nodeEnv
  })

  before(() => {
    ({ commandWithStackFrame } = requireNoCache('../src/stack-frame'))
  })

  after(() => {
    process.env.NODE_ENV = oldEnv
  })

  return () => commandWithStackFrame
}

export default runWithNodeEnv
