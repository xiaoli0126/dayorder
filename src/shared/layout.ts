export interface LaneInfo {
  lane: number
  lanes: number
}

interface LayoutInput {
  id: string
  startMin: number
  durationMin: number
}

/**
 * 把一天内重叠的时间块分到不同车道。
 * 复杂度 O(n log n)；用 first-fit 贪心，结果稳定（与 Google Calendar 同款取舍）。
 */
export function computeLanes(blocks: ReadonlyArray<LayoutInput>): Map<string, LaneInfo> {
  const result = new Map<string, LaneInfo>()
  if (blocks.length === 0) return result

  const sorted = [...blocks].sort(
    (a, b) => a.startMin - b.startMin || b.durationMin - a.durationMin || a.id.localeCompare(b.id)
  )

  const clusters: Array<{ blocks: LayoutInput[]; endMin: number }> = []
  for (const block of sorted) {
    const end = block.startMin + block.durationMin
    const current = clusters[clusters.length - 1]
    if (!current || block.startMin >= current.endMin) {
      clusters.push({ blocks: [block], endMin: end })
    } else {
      current.blocks.push(block)
      current.endMin = Math.max(current.endMin, end)
    }
  }

  for (const cluster of clusters) {
    const laneEnds: number[] = []
    for (const block of cluster.blocks) {
      const end = block.startMin + block.durationMin
      let lane = laneEnds.findIndex((laneEnd) => laneEnd <= block.startMin)
      if (lane === -1) {
        lane = laneEnds.length
        laneEnds.push(end)
      } else {
        laneEnds[lane] = end
      }
      result.set(block.id, { lane, lanes: 1 })
    }
    for (const block of cluster.blocks) {
      const info = result.get(block.id)
      if (info) info.lanes = laneEnds.length
    }
  }

  return result
}
