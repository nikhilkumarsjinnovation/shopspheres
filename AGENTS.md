# Git Commit & Push Restrictions

## CRITICAL MANDATORY RULE: No Autonomous Git Commits or Remote Pushes

1. **PROHIBITION:** You must NEVER execute `git commit`, `git push`, or push changes to GitHub or any remote repository unless the user EXTERNALLY and EXPLICITLY tells you to do so in their prompt (e.g., "commit these changes", "push to github").
2. **WORKFLOW:** After finishing tasks, fixing bugs, or creating features, leave the files in the working directory (staged or unstaged). Do NOT commit them automatically as a wrap-up step.
3. **REPORTING:** Provide a summary of modified and created files, and wait for the user to review and explicitly instruct if/when to commit or push.
4. **SCOPE:** This rule applies across the entire repository to all commands, background tasks, and subagents without exception.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
