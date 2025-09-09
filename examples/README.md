# Tana MCP Server Examples

This directory contains examples and usage patterns for the Tana MCP Server.

## Available Examples

### example-usage.js

A comprehensive example showing how to interact with the Tana MCP Server from an LLM client. This pseudocode demonstrates:

#### Basic Operations
- Connecting to the MCP server
- Getting available tools
- Creating simple plain nodes
- Updating node names

#### Advanced Usage
- Creating complex nested structures
- Working with different node types (date, boolean, file)
- Using supertags and fields
- Building hierarchical data structures

#### Node Types Demonstrated

1. **Plain Nodes**: Basic text content
   ```javascript
   await tanaServer.callTool('create_plain_node', {
     name: 'My first node from MCP',
     description: 'Created via Model Context Protocol'
   });
   ```

2. **Date Nodes**: ISO 8601 formatted dates
   ```javascript
   {
     dataType: 'date',
     name: '2023-12-25',
     description: 'Christmas Day'
   }
   ```

3. **Boolean Nodes**: Checkbox/task nodes
   ```javascript
   {
     dataType: 'boolean',
     name: 'Task to complete',
     value: false
   }
   ```

4. **Reference Nodes**: Links to existing nodes
   ```javascript
   {
     dataType: 'reference',
     id: 'existing-node-id'
   }
   ```

5. **Field Nodes**: Structured data fields
   ```javascript
   {
     type: 'field',
     attributeId: 'due-date-field-id',
     children: [
       {
         dataType: 'date',
         name: '2024-01-15'
       }
     ]
   }
   ```

#### Supertag Usage

Examples show how to apply supertags to nodes for categorization and structured data:

```javascript
{
  name: 'Node with supertags',
  supertags: [
    {
      id: 'your-supertag-id-here',
      fields: {
        'field-id-1': 'field value 1',
        'field-id-2': 'field value 2'
      }
    }
  ]
}
```

#### Complex Structures

The examples demonstrate building complex hierarchies with:
- Parent-child relationships
- Mixed node types
- Field nodes with typed values
- Multiple supertags on single nodes

#### Real-World LLM Integration

The example includes a commented section showing how this would work in practice with an LLM like Claude:

```
User: "Create a new project in Tana called 'Website Redesign' with a deadline of December 15, 2023"

LLM: [internally calls the MCP tools to create structured project data]

LLM: "I've created a new project in Tana called 'Website Redesign' with a 
      deadline set to December 15, 2023."
```

## Usage Patterns

### Project Management
- Creating project structures with milestones
- Task management with due dates and assignments
- Progress tracking with boolean nodes

### Knowledge Management  
- Organizing information with categories
- Linking related topics with reference nodes
- Source attribution and metadata

### Meeting Documentation
- Structured meeting notes
- Attendee tracking
- Action item management

### Content Organization
- Hierarchical content structures
- Tagging and categorization
- Cross-references and relationships

## Best Practices Demonstrated

1. **Error Handling**: All examples show proper error handling patterns
2. **Data Validation**: Examples use appropriate data types and formats
3. **Hierarchical Thinking**: Shows how to structure data in Tana's node-based system
4. **Field Usage**: Demonstrates proper field node creation and usage
5. **Supertag Strategy**: Shows effective use of supertags for data organization

## Running Examples

These are pseudocode examples for reference. To see the server in action:

1. Set up the MCP server following the main README
2. Connect from an MCP-compatible client
3. Use the patterns shown in the examples
4. Refer to the [API documentation](../API.md) for exact parameter specifications

## Contributing Examples

When adding new examples:

1. Follow the established pattern structure
2. Include error handling
3. Show both simple and complex use cases
4. Document the business purpose/use case
5. Use realistic data and scenarios
6. Include comments explaining the approach