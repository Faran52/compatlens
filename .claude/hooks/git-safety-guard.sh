#!/usr/bin/env bash
# Deny Git operations that can overwrite or hide concurrent work.
cmd=$(jq -r '.tool_input.command // ""')
if printf '%s' "$cmd" | grep -qE 'git[[:space:]]+stash|--no-verify|--amend|git[[:space:]]+add[[:space:]]+(-A\b|--all\b|\.([[:space:]]|$))'; then
  jq -n '{hookSpecificOutput:{hookEventName:"PreToolUse",permissionDecision:"deny",permissionDecisionReason:"Banned git operation. Stage only your own files by explicit path; use a throwaway worktree for baseline checks."}}'
fi
exit 0
