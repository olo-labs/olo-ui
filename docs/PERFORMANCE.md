# Performance guardrails

Define rules before Execution Tree, Timeline, Raw events, and Logs hit rendering bottlenecks.

---

## Rule: virtualize long lists (hard law)

**Any list potentially exceeding 100 items must be implemented virtualized by default.**

- Do not build a non-virtual list first and refactor later — refactor pain increases once shipped. Implement with a virtual list from the start when the list can grow beyond 100 items.
- Use a virtual list (e.g. **react-virtual**, **@tanstack/react-virtual**, or similar) so only visible rows are in the DOM.
- Apply this to: run lists, event logs, tree views (when large), timeline rows.
- Do not render hundreds or thousands of list items directly; it will cause jank and memory issues.

---

## Adoption

- Add **react-virtual** (or chosen library) as a dependency when implementing the first feature that needs it.
- Document the pattern in this file and in ARCHITECTURE so new contributors virtualize by default for large lists.

Making this architectural policy now avoids costly refactors later.
