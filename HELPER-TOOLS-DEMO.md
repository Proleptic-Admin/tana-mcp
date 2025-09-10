# Demo: New Helper Tools

This document demonstrates the new `rename` and `append_children` tools added to the Tana MCP Server.

## Tool: `rename`

Simple wrapper around `set_node_name` for easy node renaming.

### Usage Example:
```json
{
  "tool": "rename",
  "arguments": {
    "nodeId": "existing-node-123",
    "newName": "My Updated Node Name"
  }
}
```

### Response:
```json
{
  "content": [
    {
      "type": "text",
      "text": "{\n  \"nodeId\": \"existing-node-123\",\n  \"name\": \"My Updated Node Name\"\n}"
    }
  ],
  "isError": false
}
```

## Tool: `append_children`

Append multiple child nodes to an existing target node. Supports special targets like INBOX, SCHEMA, or any specific node ID.

### Example 1: Append to SCHEMA
```json
{
  "tool": "append_children",
  "arguments": {
    "targetNodeId": "SCHEMA",
    "children": [
      {
        "name": "New Field Definition",
        "description": "Custom field for tracking progress",
        "supertags": [{"id": "SYS_T02"}]
      }
    ]
  }
}
```

### Example 2: Append to INBOX
```json
{
  "tool": "append_children",
  "arguments": {
    "targetNodeId": "INBOX",
    "children": [
      {
        "name": "Quick Note",
        "description": "Something to remember"
      },
      {
        "name": "Task Item",
        "dataType": "boolean",
        "value": false
      }
    ]
  }
}
```

### Example 3: Append to specific node
```json
{
  "tool": "append_children",
  "arguments": {
    "targetNodeId": "project-node-456",
    "children": [
      {
        "name": "Milestone 1",
        "dataType": "date",
        "name": "2024-03-15"
      },
      {
        "name": "Team Meeting",
        "children": [
          {"name": "Agenda item 1"},
          {"name": "Agenda item 2"}
        ]
      }
    ]
  }
}
```

### Response:
```json
{
  "content": [
    {
      "type": "text",
      "text": "[\n  {\n    \"nodeId\": \"new-node-789\",\n    \"name\": \"Milestone 1\"\n  },\n  {\n    \"nodeId\": \"new-node-790\",\n    \"name\": \"Team Meeting\",\n    \"children\": [...]\n  }\n]"
    }
  ],
  "isError": false
}
```

## Benefits

### For `rename`:
- Simpler interface than `set_node_name`
- Clear, descriptive name
- Same functionality, more discoverable

### For `append_children`:
- Batch append multiple children at once
- Support for special targets (INBOX, SCHEMA, Library)
- Complex nested structures supported
- Efficient for building hierarchies

These tools provide the "tiny tools" functionality requested in the issue, making rename and append operations more accessible and user-friendly for MCP clients.