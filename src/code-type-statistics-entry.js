import AsyncStatisticEntry from './async-statistic-entry'

class CodeTypeStatisticsEntry {
  constructor() {
    this.byGroupId = {}
  }

  getGroup(groupId) {
    let group = this.byGroupId[groupId]

    if (!group) {
      group = {
        countSeparateGroups: 0,
        byResourceType: {},
      }
      this.byGroupId[groupId] = group
    }

    return group
  }

  addGroupMeasurement(groupId = '') {
    const group = this.getGroup(groupId)
    group.countSeparateGroups += 1
  }

  addCallMeasurement(groupId = '', resourceType, execTime, delay) {
    const group = this.getGroup(groupId)
    let stats = group.byResourceType[resourceType]

    if (!stats) {
      stats = new AsyncStatisticEntry()
      group.byResourceType[resourceType] = stats
    }

    stats.addCallMeasurement(execTime, delay)
  }

  get json() {
    const json = {}
    const sum = new AsyncStatisticEntry()

    for (const groupId of Object.keys(this.byGroupId)) {
      const group = this.byGroupId[groupId]
      const groupSum = new AsyncStatisticEntry()
      const jsonByAsyncResourceType = {}

      for (const resourceType of Object.keys(group.byResourceType)) {
        const statsEntry = group.byResourceType[resourceType]
        groupSum.addEntry(statsEntry)
        jsonByAsyncResourceType[`asyncResourceType:${resourceType}`] = statsEntry.json
      }

      sum.addEntry(groupSum)

      json[`groupId:${groupId}`] = {
        countSeparateGroups: group.countSeparateGroups,
        ...groupSum.json,
        ...jsonByAsyncResourceType,
      }
    }

    return {
      ...sum.json,
      ...json,
    }
  }
}

export default CodeTypeStatisticsEntry
