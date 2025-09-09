/**
 * Schema-Aware Usage Example
 * Demonstrates how to use the schema functionality with MCP clients
 */

// Example 1: Setting up schemas programmatically
const taskSchema = {
  id: "task-schema",
  name: "Task", 
  description: "A task with priority and due date",
  fields: [
    {
      id: "title-field",
      name: "title",
      type: "text",
      required: true,
      description: "The task title"
    },
    {
      id: "due-date-field-id",
      name: "due_date", 
      type: "date",
      description: "When the task is due"
    },
    {
      id: "priority-field-id",
      name: "priority",
      type: "text",
      validation: {
        options: ["low", "medium", "high", "critical"]
      }
    }
  ]
};

// Add the schema using the MCP tool
// This would be done through your MCP client
const addSchemaResult = await tanaServer.callTool('add_schema', {
  schema: taskSchema
});

// Update mappings to connect human names to workspace IDs  
const updateMappingsResult = await tanaServer.callTool('update_mappings', {
  supertags: {
    "Task": "your-actual-task-supertag-id-from-tana"
  },
  fields: {
    "due_date": "your-actual-due-date-field-id-from-tana",
    "priority": "your-actual-priority-field-id-from-tana"
  }
});

// Example 2: Using the generated tools
// After adding the schema, you can now use the generated create_task tool

// Before (manual approach):
const manualTaskResult = await tanaServer.callTool('create_plain_node', {
  name: "Review budget",
  supertags: [{
    id: "your-actual-task-supertag-id-from-tana",
    fields: {
      "your-actual-priority-field-id-from-tana": "high",
      "your-actual-due-date-field-id-from-tana": "2024-01-31"
    }
  }]
});

// After (schema-aware approach):
const schemaTaskResult = await tanaServer.callTool('create_task', {
  title: "Review budget",
  priority: "high", 
  due_date: "2024-01-31"
});

// Example 3: Using generated prompts
// The system automatically creates a create-task prompt that MCP clients can use
// In Claude: "Use the create-task prompt to create a task for reviewing budget"

// Example 4: Validation and error handling
// The schema system validates inputs automatically
const validationExample = await tanaServer.callTool('create_task', {
  title: "Invalid task",
  priority: "super-high", // Invalid - not in allowed options
  due_date: "invalid-date" // Invalid - not a proper date
});
// This would return validation errors instead of creating the task

// Example 5: Complex schema with multiple field types
const personSchema = {
  id: "person-schema", 
  name: "Person",
  fields: [
    {
      id: "name-field",
      name: "name",
      type: "text",
      required: true
    },
    {
      id: "email-field", 
      name: "email",
      type: "text",
      validation: {
        pattern: "^[^@]+@[^@]+\\.[^@]+$" // Email regex
      }
    },
    {
      id: "website-field",
      name: "website", 
      type: "url"
    },
    {
      id: "active-field",
      name: "active",
      type: "boolean",
      defaultValue: "true"
    }
  ]
};

// After adding this schema, you get a create_person tool:
const personResult = await tanaServer.callTool('create_person', {
  name: "John Doe",
  email: "john@example.com", 
  website: "https://johndoe.com",
  active: true
});

// Example 6: Getting schema information
const schemasInfo = await tanaServer.callTool('get_schemas');
// Returns all configured schemas and their generated tools

const configInfo = await tanaServer.callTool('get_config');
// Returns the full configuration including mappings and validation settings

/**
 * Benefits of the schema approach:
 * 
 * 1. Human-readable: Use "priority" instead of "field-id-abc123"
 * 2. Type safety: Automatic validation of dates, emails, enums
 * 3. Consistency: Same structure for all tasks/people/etc
 * 4. Maintainable: Change schema once, updates everywhere
 * 5. Conversational: MCP prompts enable natural language interaction
 * 6. Error prevention: Validation catches mistakes before API calls
 */