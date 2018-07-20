// Simple node8 compatible polyfill to not need core-js as peerDependency
const name = 'asyncIterator'
if (!Symbol[name]) {
  Object.defineProperty(Symbol, name, { value: Symbol(`Symbol.${name}`) })
}
