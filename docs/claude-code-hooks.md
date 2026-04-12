# Claude Code Hooks for CodeView

CodeView can receive real-time notifications when Claude Code writes or edits files, enabling instant visualization updates.

## Setup

Add this to your project's `.claude/settings.json`:

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Write|Edit",
        "hooks": [
          {
            "type": "command",
            "command": "curl -s -X POST http://localhost:4200/api/file-changed -H 'Content-Type: application/json' -d '{\"event\": \"file-changed\"}' > /dev/null 2>&1 || true",
            "timeout": 3
          }
        ]
      }
    ]
  }
}
```

## How It Works

1. Claude Code writes or edits a file via the `Write` or `Edit` tool
2. The PostToolUse hook fires and sends a notification to CodeView's local server
3. CodeView's file watcher detects the change (via chokidar) within ~300ms
4. Only the changed file is re-parsed (not the full codebase)
5. The architecture graph updates with animated transitions

## Without Hooks

Even without the hook configured, CodeView's file watcher (chokidar) will detect changes automatically. The hook just makes it slightly faster since it triggers immediately rather than waiting for the filesystem event.

## Troubleshooting

- **Hook not firing?** Make sure CodeView is running on port 4200 (or adjust the port in the hook command)
- **Changes not showing?** The file watcher has a 300ms debounce — rapid changes are batched
- **Wrong files updating?** Check that your `.gitignore` is configured correctly — CodeView respects it
