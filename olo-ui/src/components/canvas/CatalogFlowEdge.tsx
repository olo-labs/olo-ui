import { memo } from 'react'
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  type EdgeProps,
} from '@xyflow/react'

export interface CatalogFlowEdgeData {
  tooltip?: string
}

function CatalogFlowEdgeComponent({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected,
  markerEnd,
  style,
}: EdgeProps) {
  const edgeData = (data ?? {}) as CatalogFlowEdgeData
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  })

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          ...style,
          stroke: selected ? '#60a5fa' : '#52525b',
          strokeWidth: selected ? 2 : 1.5,
        }}
      />
      {edgeData.tooltip ? (
        <EdgeLabelRenderer>
          <div
            className="catalog-flow-edge-label"
            style={{
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            }}
          >
            <span className="catalog-flow-edge-hit" aria-hidden />
            <span className="catalog-flow-edge-tooltip" role="tooltip">
              {edgeData.tooltip}
            </span>
          </div>
        </EdgeLabelRenderer>
      ) : null}
    </>
  )
}

export const CatalogFlowEdge = memo(CatalogFlowEdgeComponent)
