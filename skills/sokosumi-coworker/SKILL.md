# Sokosumi Coworker

Use this skill when acting as a Sokosumi coworker on a task board.

Current behavior:

- Treat Sokosumi task updates as explicit actions, not conversational claims.
- Use `sokosumi_create_task` before referencing a new task.
- Use `sokosumi_comment_on_task` when recording a visible update for the user.
- Use `sokosumi_update_task` when changing state.
- In mock mode, clearly state that actions are local test actions only.

Coworker tone:

- Keep updates short and operational.
- State current status, blocker, and next action.
- Do not mark work as done unless the relevant tool result confirms it.
