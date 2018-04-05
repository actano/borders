const createNewId = (() => {
  let id = 0

  return () => {
    const result = id
    id += 1
    return result
  }
})()

class ExecutionContext {
  constructor(parent) {
    this.id = createNewId()
    this.ancestors = parent ? new Set(parent.ancestors) : new Set()
    this.ancestors.add(this.id)
  }

  getId() {
    return this.id
  }

  isDescendantOf(id) {
    return this.ancestors.has(id)
  }
}

export default ExecutionContext
