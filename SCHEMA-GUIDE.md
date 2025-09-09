# Schema-Aware Smart Capture

This document describes the new schema-aware functionality that allows users to define supertag schemas and automatically generate typed tools for creating structured content in Tana.

## Overview

The schema-aware system addresses the problem of needing to manually specify supertag and field IDs by:

1. **Schema Definition**: Define supertag schemas with field definitions once
2. **Automatic Tool Generation**: Generate typed tools like `create_task`, `create_person` from schemas
3. **Name→ID Mapping**: Store human-readable name mappings to workspace IDs
4. **Input Validation**: Validate and normalize inputs (dates, URLs, booleans) automatically
5. **MCP Prompts**: Generate conversational prompt templates from schemas

## Getting Started

### 1. Schema Configuration

Create a `tana-schema-config.json` file in your project directory:

```json
{
  "version": "1.0.0",
  "workspace": {
    "name": "My Workspace"
  },
  "mappings": {
    "supertags": {
      "Task": "your-task-supertag-id",
      "Person": "your-person-supertag-id"
    },
    "fields": {
      "due_date": "your-due-date-field-id",
      "priority": "your-priority-field-id"
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
          "id": "your-due-date-field-id",
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

### 2. Field Types

Supported field types with automatic validation:

- **`text`**: String fields with length validation
- **`date`**: ISO 8601 dates with flexible parsing
- **`url`**: URLs with protocol validation
- **`boolean`**: Boolean values with flexible input
- **`number`**: Numeric values with range validation
- **`reference`**: References to other nodes

### 3. Validation Rules

Each field can have validation rules:

```json
{
  "id": "priority-field",
  "name": "priority",
  "type": "text",
  "validation": {
    "options": ["low", "medium", "high", "critical"],
    "pattern": "^[a-z_]+$",
    "min": 1,
    "max": 20
  }
}
```

## Generated Tools

When you define a schema, the system automatically generates:

### Tools
- `create_[schema_name]`: Typed tool for creating that entity
- Input validation and normalization
- Automatic supertag and field application

### Prompts
- `create-[schema-name]`: Interactive template for conversational creation
- Pre-filled parameter descriptions
- Example usage templates

## Configuration Management

Use the built-in tools to manage your schema configuration:

### Add Schema
```javascript
// Use the add_schema tool
{
  "schema": {
    "id": "meeting-schema",
    "name": "Meeting",
    "fields": [
      {
        "id": "date-field",
        "name": "date",
        "type": "date",
        "required": true
      }
    ]
  }
}
```

### Update Mappings
```javascript
// Use the update_mappings tool
{
  "supertags": {
    "Meeting": "meeting-supertag-id-xyz"
  },
  "fields": {
    "meeting_date": "date-field-id-abc"
  }
}
```

### Get Configuration
```javascript
// Use get_config tool to view current configuration
// Use get_schemas tool to see all schemas and generated tools
```

## How to Get Tana IDs

To use the schema system, you need to get the actual IDs from your Tana workspace:

### Method 1: Show API Schema
1. In Tana, right-click on a supertag → "Show API schema"
2. Copy the supertag ID and field IDs from the JSON
3. Add them to your configuration mappings

### Method 2: Tana Input API
1. Use Tana's Input API to inspect existing nodes
2. Extract supertag and field IDs from the response
3. Map them to human-readable names in your config

## Example Usage

Once configured, you can use the generated tools:

### Using Generated Tools
```javascript
// Instead of manually specifying IDs:
create_plain_node({
  name: "Review budget",
  supertags: [{ 
    id: "task-supertag-id-123",
    fields: {
      "priority-field-id-222": "high",
      "due-date-field-id-111": "2024-01-31"
    }
  }]
})

// Use the generated create_task tool:
create_task({
  title: "Review budget",
  priority: "high",
  due_date: "2024-01-31"
})
```

### Using Generated Prompts
In Claude or other MCP clients:
```
Use the create-task prompt to create a new task for reviewing the quarterly budget with high priority due next Friday.
```

The prompt will guide the conversation and generate the proper API calls.

## Advanced Features

### Validation Options
```json
{
  "validation": {
    "strictMode": true,        // Strict validation rules
    "dateFormat": "flexible",  // Allow flexible date parsing
    "urlRequireProtocol": false // Auto-add https:// to URLs
  }
}
```

### Field Validation
```json
{
  "validation": {
    "pattern": "^[A-Z][a-z]+$",     // Regex pattern
    "min": 1, "max": 100,           // Length/number range
    "options": ["opt1", "opt2"]     // Enum values
  }
}
```

### Complex Schemas
```json
{
  "id": "project-schema",
  "name": "Project",
  "fields": [
    {
      "name": "title",
      "type": "text",
      "required": true
    },
    {
      "name": "start_date",
      "type": "date"
    },
    {
      "name": "team_lead",
      "type": "reference",
      "description": "Reference to a Person node"
    },
    {
      "name": "budget",
      "type": "number",
      "validation": { "min": 0 }
    }
  ]
}
```

## Benefits

1. **Reduced Errors**: No more manual ID management
2. **Type Safety**: Automatic validation of field types and values
3. **Better UX**: Human-readable field names instead of IDs
4. **Consistency**: Standardized structure across all content creation
5. **Conversational**: MCP prompts enable natural language interaction
6. **Maintainable**: Centralized schema management

## Migration Guide

To migrate existing MCP tools to use schemas:

1. **Identify Patterns**: Look for repeated supertag/field combinations
2. **Create Schemas**: Define schemas for common entities
3. **Map IDs**: Add your workspace IDs to the mappings
4. **Test**: Verify generated tools work correctly
5. **Update Clients**: Switch from manual tools to generated ones

The schema system works alongside existing tools, so you can migrate gradually.