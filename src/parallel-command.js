export const TYPE_PARALLEL = 'PARALLEL'

export default values => ({
  type: TYPE_PARALLEL,
  payload: Array.from(values),
})
