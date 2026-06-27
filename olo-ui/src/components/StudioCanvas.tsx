import { WorkflowCanvas, type WorkflowCanvasMode } from './canvas/WorkflowCanvas'

export interface StudioCanvasProps {
  mode?: WorkflowCanvasMode
}

export function StudioCanvas({ mode = 'builder' }: StudioCanvasProps) {
  const readOnly = mode === 'log'
  return (
    <div className="studio-canvas">
      <WorkflowCanvas readOnly={readOnly} mode={mode} />
    </div>
  )
}
