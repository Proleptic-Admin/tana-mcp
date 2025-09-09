# Quick Start Guide: Schema-Aware Smart Capture

Get up and running with schema-aware functionality in 5 minutes.

## What You'll Learn

Transform from this (manual ID management):
```javascript
create_plain_node({
  name: "Review budget",
  supertags: [{ 
    id: "task-supertag-id-123",  // ❌ Cryptic IDs
    fields: {
      "priority-field-id-222": "high",
      "due-date-field-id-111": "2024-01-31"
    }
  }]
})
```

To this (human-readable schema-based):
```javascript
create_task({
  title: "Review budget",      // ✅ Clear field names
  priority: "high",           // ✅ Validated inputs
  due_date: "2024-01-31"      // ✅ Type-safe
})
```

## Prerequisites

- Tana MCP Server installed and configured ([Installation Guide](./README.md#installation))
- A Tana workspace with API access
- Basic familiarity with Tana supertags and fields

## Step 1: Get Your Tana IDs

Before using schemas, you need to discover the actual IDs from your Tana workspace.

### Method 1: Show API Schema (Recommended)

1. **In Tana**: Right-click on any supertag → "Show API schema"
2. **Copy the JSON** that appears
3. **Extract IDs** from the JSON structure:

```json
{
  "schema": {
    "type": "object",
    "properties": {
      "name": "Task",
      "id": "task-supertag-id-abc123",  ← This is your supertag ID
      "fields": [
        {
          "name": "Priority",
          "id": "priority-field-id-xyz789"  ← This is your field ID
        }
      ]
    }
  }
}
```

### Method 2: Inspect Existing Nodes

1. Use the `create_plain_node` tool to create a test node with supertags
2. Check the response for the actual IDs used
3. Note down the supertag and field IDs for your schema configuration

## Step 2: Create Your First Schema

Create a file called `tana-schema-config.json` in your project directory:

```json
{
  "version": "1.0.0",
  "workspace": {
    "name": "My Workspace"
  },
  "mappings": {
    "supertags": {
      "Task": "task-supertag-id-abc123"
    },
    "fields": {
      "priority": "priority-field-id-xyz789",
      "due_date": "due-date-field-id-def456"
    }
  },
  "schemas": [
    {
      "id": "task-schema",
      "name": "Task",
      "description": "A task with priority and due date",
      "fields": [
        {
          "id": "title-field",
          "name": "title",
          "type": "text",
          "required": true,
          "description": "The task title"
        },
        {
          "id": "priority-field-id-xyz789",
          "name": "priority",
          "type": "text",
          "description": "Task priority level",
          "validation": {
            "options": ["low", "medium", "high", "critical"]
          }
        },
        {
          "id": "due-date-field-id-def456",
          "name": "due_date",
          "type": "date",
          "description": "When the task is due"
        }
      ]
    }
  ],
  "validation": {
    "strictMode": false,
    "dateFormat": "iso",
    "urlRequireProtocol": true
  }
}
```

**Key Points:**
- Replace `task-supertag-id-abc123` with your actual supertag ID from Step 1
- Replace `priority-field-id-xyz789` with your actual field ID from Step 1
- The `id` field in schema fields should match the actual field ID from Tana
- The `name` field is what you'll use in the generated tools

## Step 3: Load Your Schema

Use your MCP client (like Claude) to load the schema:

```
Please use the add_schema tool to add this task schema to the configuration.
```

Or programmatically:
```javascript
await tanaServer.callTool('add_schema', {
  schema: {
    id: "task-schema",
    name: "Task",
    // ... rest of schema from above
  }
});
```

## Step 4: Update ID Mappings

Tell the system how to map human names to Tana IDs:

```
Please use the update_mappings tool to map "Task" to "task-supertag-id-abc123" and "priority" to "priority-field-id-xyz789".
```

Or programmatically:
```javascript
await tanaServer.callTool('update_mappings', {
  supertags: {
    "Task": "task-supertag-id-abc123"
  },
  fields: {
    "priority": "priority-field-id-xyz789",
    "due_date": "due-date-field-id-def456"
  }
});
```

## Step 5: Use Your New Schema-Based Tool

Now you have a new `create_task` tool available! Use it:

```
Create a task called "Review quarterly budget" with high priority due on January 31st, 2024.
```

The system will automatically:
- ✅ Validate that "high" is a valid priority option
- ✅ Parse "January 31st, 2024" into proper ISO date format
- ✅ Map "priority" to the correct field ID
- ✅ Apply the Task supertag with the correct ID
- ✅ Create the node in Tana with proper structure

## Step 6: Verify It Works

Check your generated tools:
```
Please use the get_schemas tool to show me all available schema-based tools.
```

You should see:
- `create_task` tool with proper parameters
- `create-task` prompt for conversational interaction
- Validation rules and descriptions

## Common First-Time Issues

### ❌ "Supertag ID not found"
**Problem**: The ID in your mappings doesn't match your Tana workspace  
**Solution**: Double-check the supertag ID from "Show API schema" in Tana

### ❌ "Field validation failed"
**Problem**: You're passing invalid values (e.g., "super-high" when only "high" is allowed)  
**Solution**: Check the `validation.options` in your schema definition

### ❌ "Cannot find schema file"
**Problem**: The `tana-schema-config.json` file isn't in the right location  
**Solution**: Ensure the file is in your project directory where the MCP server runs

### ❌ "Date parsing failed"
**Problem**: Date format isn't recognized  
**Solution**: Use ISO format (YYYY-MM-DD) or common formats like "Jan 31, 2024"

## Next Steps

1. **Add more schemas**: Create schemas for Person, Meeting, Project, etc.
2. **Explore validation**: Add regex patterns, number ranges, required fields
3. **Use prompts**: Try conversational interaction with `create-task` prompt
4. **Read full guide**: Check out [SCHEMA-GUIDE.md](./SCHEMA-GUIDE.md) for advanced features

## Need Help?

- **Full Documentation**: [SCHEMA-GUIDE.md](./SCHEMA-GUIDE.md)
- **API Reference**: [API.md](./API.md)
- **Code Examples**: [examples/](./examples/)
- **Troubleshooting**: [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)
- **Issues**: [GitHub Issues](https://github.com/tim-mcdonnell/tana-mcp/issues)

---

**💡 Pro Tip**: Start with one simple schema (like Task) and get it working before adding more complex schemas. The learning curve is much easier this way!