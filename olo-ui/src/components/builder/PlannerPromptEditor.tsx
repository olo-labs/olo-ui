import { useMemo, useRef, useState } from 'react'
import type { WorkflowPlannerPrompt } from '../../lib/plannerContext'
import {
  PLANNER_MACRO_AGENTS,
  PLANNER_MACRO_CAPABILITIES,
  plannerAutocompleteOptions,
} from '../../lib/plannerContext'

export interface PlannerPromptEditorProps {
  prompt: WorkflowPlannerPrompt
  workflowVariableNames?: string[]
  disabled?: boolean
  onChange: (patch: Partial<WorkflowPlannerPrompt>) => void
  onInsertMacro?: (macro: 'capabilities' | 'agents', enabled: boolean) => void
}

type InsertMenu = 'variable' | null

export function PlannerPromptEditor({
  prompt,
  workflowVariableNames = [],
  disabled,
  onChange,
  onInsertMacro,
}: PlannerPromptEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [insertMenu, setInsertMenu] = useState<InsertMenu>(null)
  const [autocompleteFilter, setAutocompleteFilter] = useState<string | null>(null)

  const autocompleteOptions = useMemo(
    () => plannerAutocompleteOptions(workflowVariableNames),
    [workflowVariableNames],
  )

  const filteredAutocomplete = useMemo(() => {
    if (autocompleteFilter === null) return []
    const query = autocompleteFilter.toLowerCase()
    return autocompleteOptions.filter((option) => option.label.toLowerCase().includes(query))
  }, [autocompleteFilter, autocompleteOptions])

  const insertAtCursor = (text: string) => {
    const value = prompt.promptTemplate
    const element = textareaRef.current
    if (!element) {
      onChange({ promptTemplate: `${value}${text}` })
      return
    }
    const start = element.selectionStart ?? value.length
    const end = element.selectionEnd ?? value.length
    const next = `${value.slice(0, start)}${text}${value.slice(end)}`
    onChange({ promptTemplate: next })
    requestAnimationFrame(() => {
      element.focus()
      const position = start + text.length
      element.setSelectionRange(position, position)
    })
  }

  const handleInput = (nextValue: string) => {
    onChange({ promptTemplate: nextValue })
    const element = textareaRef.current
    if (!element) return
    const cursor = element.selectionStart ?? nextValue.length
    const prefix = nextValue.slice(0, cursor)
    const match = prefix.match(/\{([A-Za-z0-9_]*)$/)
    setAutocompleteFilter(match ? match[1] : null)
  }

  const applyAutocomplete = (token: string) => {
    const value = prompt.promptTemplate
    const element = textareaRef.current
    if (!element) {
      insertAtCursor(token)
      setAutocompleteFilter(null)
      return
    }
    const cursor = element.selectionStart ?? value.length
    const prefix = value.slice(0, cursor)
    const match = prefix.match(/\{([A-Za-z0-9_]*)$/)
    if (!match) {
      insertAtCursor(token)
      setAutocompleteFilter(null)
      return
    }
    const start = cursor - match[0].length
    const next = `${value.slice(0, start)}${token}${value.slice(cursor)}`
    onChange({ promptTemplate: next })
    setAutocompleteFilter(null)
    requestAnimationFrame(() => {
      element.focus()
      const position = start + token.length
      element.setSelectionRange(position, position)
    })
  }

  const insertCapabilityMacro = () => {
    onInsertMacro?.('capabilities', true)
    insertAtCursor(`\n\nYou may use:\n\n{${PLANNER_MACRO_CAPABILITIES}}\n`)
    setInsertMenu(null)
  }

  const insertAgentMacro = () => {
    onInsertMacro?.('agents', true)
    insertAtCursor(`\n\nYou may delegate to:\n\n{${PLANNER_MACRO_AGENTS}}\n`)
    setInsertMenu(null)
  }

  return (
    <div className="planner-prompt-editor">
      <div className="planner-prompt-toolbar">
        <div className="planner-prompt-toolbar-group">
          <button
            type="button"
            className="builder-btn small"
            disabled={disabled}
            onClick={() => setInsertMenu(insertMenu === 'variable' ? null : 'variable')}
          >
            Insert variable
          </button>
          {insertMenu === 'variable' ? (
            <ul className="planner-insert-menu">
              {workflowVariableNames.length === 0 ? (
                <li className="planner-insert-empty">Define workflow variables first.</li>
              ) : (
                workflowVariableNames.map((name) => (
                  <li key={name}>
                    <button
                      type="button"
                      onClick={() => {
                        insertAtCursor(`{${name}}`)
                        setInsertMenu(null)
                      }}
                    >
                      {name}
                    </button>
                  </li>
                ))
              )}
            </ul>
          ) : null}
        </div>
        <button
          type="button"
          className="builder-btn small"
          disabled={disabled}
          onClick={insertCapabilityMacro}
        >
          Insert capability macro
        </button>
        <button
          type="button"
          className="builder-btn small"
          disabled={disabled}
          onClick={insertAgentMacro}
        >
          Insert agent macro
        </button>
      </div>
      <div className="planner-prompt-textarea-wrap">
        <textarea
          ref={textareaRef}
          className="builder-input planner-prompt-textarea"
          rows={10}
          value={prompt.promptTemplate}
          disabled={disabled}
          placeholder="Write the planner prompt. Use {variableName} placeholders from workflow variables."
          onChange={(e) => handleInput(e.target.value)}
        />
        {filteredAutocomplete.length > 0 ? (
          <ul className="planner-autocomplete" role="listbox">
            {filteredAutocomplete.map((option) => (
              <li key={option.value}>
                <button type="button" onClick={() => applyAutocomplete(option.value)}>
                  <span>{option.label}</span>
                  <span className="planner-autocomplete-group">{option.group}</span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  )
}
