# Tana MCP Server API Reference

This document provides a comprehensive reference for all tools, prompts, and resources available in the Tana MCP Server.

## Table of Contents

- [Tools](#tools)
- [Prompts](#prompts)
- [Resources](#resources)
- [Data Types](#data-types)
- [Error Handling](#error-handling)

## Tools

The Tana MCP Server provides 11 tools for creating and manipulating nodes in Tana workspaces.

### create_plain_node

Creates a plain text node in Tana.

**Parameters:**
- `targetNodeId` (optional, string): ID of the parent node to create this node under
- `name` (required, string): The name/content of the node
- `description` (optional, string): Description for the node
- `supertags` (optional, array): Array of supertag objects to apply to the node

**Supertag Schema:**
```typescript
{
  id: string;           // Supertag ID from your Tana workspace
  fields?: {            // Optional field values
    [fieldId: string]: string;
  };
}
```

**Example:**
```typescript
{
  "targetNodeId": "node-123",
  "name": "Meeting Notes",
  "description": "Weekly team meeting",
  "supertags": [
    {
      "id": "meeting-tag-id",
      "fields": {
        "priority": "high",
        "status": "scheduled"
      }
    }
  ]
}
```

**Returns:** JSON object with the created node information including its ID.

---

### create_reference_node

Creates a reference node that points to an existing node in Tana.

**Parameters:**
- `targetNodeId` (optional, string): ID of the parent node to create this node under
- `referenceId` (required, string): ID of the node to reference

**Example:**
```typescript
{
  "targetNodeId": "parent-node-123",
  "referenceId": "existing-node-456"
}
```

**Returns:** JSON object with the created reference node information.

---

### create_date_node

Creates a date node with ISO 8601 formatted date.

**Parameters:**
- `targetNodeId` (optional, string): ID of the parent node to create this node under
- `date` (required, string): Date in ISO 8601 format (e.g., "2023-12-25", "2023-12-25T14:30:00Z")
- `description` (optional, string): Description for the date node
- `supertags` (optional, array): Array of supertag objects to apply to the node

**Example:**
```typescript
{
  "targetNodeId": "project-node-123",
  "date": "2023-12-25",
  "description": "Project deadline",
  "supertags": [
    {
      "id": "deadline-tag-id"
    }
  ]
}
```

**Returns:** JSON object with the created date node information.

---

### create_url_node

Creates a URL node for web links.

**Parameters:**
- `targetNodeId` (optional, string): ID of the parent node to create this node under
- `url` (required, string): Valid URL (must include protocol, e.g., https://)
- `description` (optional, string): Description for the URL node
- `supertags` (optional, array): Array of supertag objects to apply to the node

**Example:**
```typescript
{
  "targetNodeId": "research-node-123",
  "url": "https://example.com",
  "description": "Useful research link",
  "supertags": [
    {
      "id": "bookmark-tag-id",
      "fields": {
        "category": "research"
      }
    }
  ]
}
```

**Returns:** JSON object with the created URL node information.

---

### create_checkbox_node

Creates a checkbox node (boolean node) for tasks and toggleable items.

**Parameters:**
- `targetNodeId` (optional, string): ID of the parent node to create this node under
- `name` (required, string): The name/label for the checkbox
- `checked` (optional, boolean): Initial checked state (default: false)
- `description` (optional, string): Description for the checkbox node
- `supertags` (optional, array): Array of supertag objects to apply to the node

**Example:**
```typescript
{
  "targetNodeId": "task-list-123",
  "name": "Complete project documentation",
  "checked": false,
  "description": "Write comprehensive API docs",
  "supertags": [
    {
      "id": "task-tag-id",
      "fields": {
        "priority": "high",
        "assignee": "john-doe"
      }
    }
  ]
}
```

**Returns:** JSON object with the created checkbox node information.

---

### create_file_node

Creates a file node with base64-encoded file data.

**Parameters:**
- `targetNodeId` (optional, string): ID of the parent node to create this node under
- `file` (required, string): Base64-encoded file data
- `filename` (required, string): Original filename with extension
- `contentType` (required, string): MIME type of the file (e.g., "image/png", "application/pdf")
- `description` (optional, string): Description for the file node
- `supertags` (optional, array): Array of supertag objects to apply to the node

**Example:**
```typescript
{
  "targetNodeId": "documents-node-123",
  "file": "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==",
  "filename": "screenshot.png",
  "contentType": "image/png",
  "description": "UI mockup screenshot",
  "supertags": [
    {
      "id": "document-tag-id"
    }
  ]
}
```

**Returns:** JSON object with the created file node information.

---

### upload_file

Uploads a file from various sources (local path, raw bytes, or URL) and creates a file node.

**Parameters:**
- `path` (optional, string): Local file path to upload
- `bytes` (optional, string): Base64-encoded file data
- `url` (optional, string): URL to download and upload file from
- `target` (optional, string): ID of the parent node to create this node under
- `filename` (optional, string): Override filename (auto-detected if not provided)
- `contentType` (optional, string): Override MIME type (auto-detected if not provided)
- `description` (optional, string): Description for the file node
- `supertags` (optional, array): Array of supertag objects to apply to the node

**Note:** Exactly one of `path`, `bytes`, or `url` must be provided.

**Examples:**

Upload from local path:
```typescript
{
  "path": "/home/user/documents/report.pdf",
  "target": "documents-node-123",
  "description": "Q4 financial report"
}
```

Upload from URL:
```typescript
{
  "url": "https://example.com/image.jpg",
  "target": "images-node-456",
  "description": "Downloaded image"
}
```

Upload from raw bytes:
```typescript
{
  "bytes": "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==",
  "filename": "pixel.png",
  "contentType": "image/png",
  "target": "graphics-node-789"
}
```

**Returns:** JSON object with the created file node information.

---

### create_field_node

Creates a field node under a target node with specified attribute.

**Parameters:**
- `targetNodeId` (required, string): ID of the parent node to create this field under
- `attributeId` (required, string): ID of the field definition/attribute in your Tana workspace
- `children` (optional, array): Array of child nodes to create under this field

**Example:**
```typescript
{
  "targetNodeId": "task-node-123",
  "attributeId": "due-date-field-id",
  "children": [
    {
      "dataType": "date",
      "name": "2023-12-31"
    }
  ]
}
```

**Returns:** JSON object with the created field node information.

---

### set_node_name

Updates the name of an existing node.

**Parameters:**
- `nodeId` (required, string): ID of the node to update
- `newName` (required, string): New name for the node

**Example:**
```typescript
{
  "nodeId": "existing-node-123",
  "newName": "Updated Node Name"
}
```

**Returns:** JSON object with the updated node information.

---

### create_node_structure

Creates a complex node structure with nested children and fields.

**Parameters:**
- `targetNodeId` (optional, string): ID of the parent node to create this structure under
- `node` (required, object): Node object with potential children and field structures

**Node Object Schema:**
```typescript
{
  name?: string;
  description?: string;
  supertags?: Array<{
    id: string;
    fields?: Record<string, string>;
  }>;
  children?: Array<{
    // Can be any valid node type or field node
    name?: string;
    dataType?: 'plain' | 'reference' | 'date' | 'url' | 'boolean' | 'file';
    type?: 'field';  // For field nodes
    attributeId?: string;  // For field nodes
    children?: Array<any>;  // Recursive structure
    // ... other node-specific properties
  }>;
}
```

**Example:**
```typescript
{
  "targetNodeId": "project-123",
  "node": {
    "name": "Sprint Planning",
    "description": "Q4 Sprint planning session",
    "supertags": [
      {
        "id": "meeting-tag-id",
        "fields": {
          "type": "planning"
        }
      }
    ],
    "children": [
      {
        "type": "field",
        "attributeId": "agenda-field-id",
        "children": [
          {
            "name": "Review backlog items"
          },
          {
            "name": "Estimate story points"
          }
        ]
      },
      {
        "dataType": "date",
        "name": "2023-12-15",
        "description": "Meeting date"
      }
    ]
  }
}
```

**Returns:** JSON object with the created node structure information.

---

### create_supertag

Creates a new supertag definition in Tana.

**Parameters:**
- `name` (required, string): Name of the supertag

**Example:**
```typescript
{
  "name": "Project Task"
}
```

**Returns:** JSON object with the created supertag information including its ID.

---

### create_field

Creates a new field definition in Tana.

**Parameters:**
- `name` (required, string): Name of the field

**Example:**
```typescript
{
  "name": "Due Date"
}
```

**Returns:** JSON object with the created field definition information including its ID.

## Prompts

The Tana MCP Server provides 4 interactive prompt templates for common use cases.

### create-task

Interactive template for creating structured tasks in Tana.

**Parameters:**
- `title` (required, string): Task title
- `description` (optional, string): Task description
- `dueDate` (optional, string): Due date in YYYY-MM-DD format
- `priority` (optional, string): Priority level (low, medium, high, critical)
- `assignee` (optional, string): Person assigned to the task
- `tags` (optional, string): Comma-separated list of tags

**Generated Structure:**
- Creates a task node with checkbox for completion
- Adds due date as a date node child (if provided)
- Applies priority and assignee as structured fields
- Includes tags as supertags (if available in workspace)

### create-project

Interactive template for creating project structures in Tana.

**Parameters:**
- `name` (required, string): Project name
- `description` (optional, string): Project description
- `goals` (optional, string): Comma-separated list of project goals
- `startDate` (optional, string): Project start date in YYYY-MM-DD format
- `endDate` (optional, string): Project end date in YYYY-MM-DD format
- `team` (optional, string): Comma-separated list of team members

**Generated Structure:**
- Creates a project node with description
- Adds goals as child nodes
- Includes start and end dates as date nodes
- Lists team members as child nodes

### create-meeting-notes

Interactive template for structured meeting documentation.

**Parameters:**
- `title` (required, string): Meeting title
- `date` (required, string): Meeting date in YYYY-MM-DD format
- `attendees` (optional, string): Comma-separated list of attendees
- `agenda` (optional, string): Comma-separated list of agenda items
- `notes` (optional, string): Meeting notes content
- `actionItems` (optional, string): Comma-separated list of action items

**Generated Structure:**
- Creates a meeting node with date
- Lists attendees as child nodes
- Includes agenda items as structured list
- Adds notes as content
- Creates action items as checkbox nodes

### create-knowledge-entry

Interactive template for knowledge base entries.

**Parameters:**
- `topic` (required, string): Knowledge topic/title
- `category` (optional, string): Knowledge category
- `content` (required, string): Main content
- `sources` (optional, string): Comma-separated list of sources
- `relatedTopics` (optional, string): Comma-separated list of related topics

**Generated Structure:**
- Creates a knowledge entry node
- Categorizes with appropriate tags
- Includes content and sources
- Links to related topics

## Resources

The Tana MCP Server provides 4 built-in resources for documentation and examples.

### api-docs

**URI:** `tana://api/documentation`
**Description:** Complete Tana Input API documentation including endpoints, rate limits, and usage guidelines.

### node-types

**URI:** `tana://reference/node-types`
**Description:** Comprehensive guide to all supported node types with examples and use cases.

### examples

**URI:** `tana://examples/common-patterns`
**Description:** Collection of common usage patterns and best practices for the Tana MCP Server.

### server-info

**URI:** `tana://info`
**Description:** Current server status, configuration, and runtime information.

## Data Types

### Supported Node Types

- **plain**: Basic text nodes (default type)
- **reference**: Nodes that reference other existing nodes
- **date**: Nodes containing ISO 8601 formatted dates
- **url**: Nodes containing web URLs
- **boolean**: Checkbox nodes for tasks and toggleable items
- **file**: Nodes containing base64-encoded file data

### Field Nodes

Field nodes are special nodes that represent structured data fields under parent nodes. They require:
- `type`: Must be set to 'field'
- `attributeId`: ID of the field definition in your Tana workspace
- `children`: Array of nodes that represent the field value(s)

## Error Handling

### Common Error Types

1. **Authentication Errors**
   - Invalid or missing API token
   - Expired token
   - Insufficient permissions

2. **Validation Errors**
   - Missing required parameters
   - Invalid parameter types
   - Malformed data (e.g., invalid dates, URLs)

3. **API Limit Errors**
   - Rate limit exceeded (1 request/second)
   - Payload too large (>5000 characters)
   - Too many nodes (>100 per request)
   - Workspace node limit reached (750,000 nodes)

4. **Resource Errors**
   - Target node not found
   - Invalid supertag or field IDs
   - Permission denied for workspace resources

### Error Response Format

All tools return errors in a consistent format:

```json
{
  "content": [
    {
      "type": "text",
      "text": "Error description with details"
    }
  ],
  "isError": true
}
```

### Best Practices

1. **Always validate inputs** before sending to avoid API errors
2. **Handle rate limits** by implementing delays between requests
3. **Check node limits** before bulk operations
4. **Verify IDs exist** in your workspace before referencing them
5. **Use appropriate data types** for each node type
6. **Keep payloads small** to avoid size limits