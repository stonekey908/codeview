# Setting Up Claude Code with CodeView

## 1. Add MCP Server

Create `.mcp.json` in your project root:

```json
{
  "mcpServers": {
    "codeview": {
      "command": "npx",
      "args": ["tsx", "/path/to/codeview/packages/mcp-server/src/stdio.ts", "--project", "."]
    }
  }
}
```

## 2. Add Auto-Response Hook

Add this to your project's `.claude/settings.json` to make Claude automatically respond when you click "Ask Claude" in the CodeView web UI:

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": ".*",
        "hooks": [
          {
            "type": "command",
            "command": "if [ -f .codeview/pending-question.json ]; then echo 'CODEVIEW_QUESTION_PENDING'; fi",
            "timeout": 2
          }
        ]
      }
    ]
  }
}
```

When Claude sees "CODEVIEW_QUESTION_PENDING" in hook output, it should call `get_pending_question` and then `save_explanation`.

## 3. Alternative: Manual Trigger

If you don't want the hook, you can manually ask Claude Code:

```
Check if there's a pending CodeView question — call get_pending_question,
read the file, and call save_explanation with your answer.
```

## 4. Generate All Descriptions at Once

To have Claude describe every component in your project:

```
Call generate_descriptions, then read each file listed and call
save_descriptions with plain English descriptions for all of them.
```

This caches descriptions in `.codeview/descriptions.json` — they'll show up in CodeView automatically on next page load.
