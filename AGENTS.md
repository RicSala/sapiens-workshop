## Others

- When the user ask for a feature that is way easier to do with a library, suggest it
- Use libraries idiomatically. Check the official docs and existing skills
- Before handoff to the user: typecheck + eslint. If relevant changes: build
- NEVER leave the app running. The user will do it.
- NEVER run prisma migrate / reset commands. Ask the user to do it. Provide command.
- Several agents are working in parallel. Expect moving ground. Commit only the changes relevant to your current work. If conflict, ask the user.

## User commands

When user says:

- "explain" / "clarify" (explicitly), they mean no code edit
