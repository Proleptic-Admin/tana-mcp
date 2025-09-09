# Troubleshooting Guide

Common issues and solutions for the Tana MCP Server schema-aware functionality.

## Table of Contents

- [Schema Configuration Issues](#schema-configuration-issues)
- [ID Discovery Problems](#id-discovery-problems)
- [Validation Errors](#validation-errors)
- [Tool Generation Issues](#tool-generation-issues)
- [Runtime Errors](#runtime-errors)
- [Performance Issues](#performance-issues)
- [Debugging Tips](#debugging-tips)

## Schema Configuration Issues

### ❌ "Schema file not found"

**Error**: `Cannot find schema configuration file`

**Causes & Solutions**:
- **File location**: Ensure `tana-schema-config.json` is in the correct directory where MCP server runs
- **File permissions**: Check that the file is readable by the MCP server process
- **File name**: Must be exactly `tana-schema-config.json` (case-sensitive)

**Fix**:
```bash
# Check file exists and is readable
ls -la tana-schema-config.json
cat tana-schema-config.json | head -5
```

### ❌ "Invalid schema format"

**Error**: `Schema validation failed: Invalid format`

**Common Issues**:
- JSON syntax errors (missing commas, brackets)
- Required fields missing (id, name, type)
- Invalid field types

**Fix**:
```bash
# Validate JSON syntax
cat tana-schema-config.json | python -m json.tool
```

**Valid Schema Structure**:
```json
{
  "version": "1.0.0",
  "mappings": {
    "supertags": {
      "SchemaName": "actual-supertag-id"
    },
    "fields": {
      "field_name": "actual-field-id"
    }
  },
  "schemas": [
    {
      "id": "unique-schema-id",
      "name": "SchemaName",
      "fields": [
        {
          "id": "field-id-or-identifier",
          "name": "field_name",
          "type": "text|date|url|boolean|number|reference",
          "required": true|false
        }
      ]
    }
  ]
}
```

### ❌ "Duplicate schema ID"

**Error**: `Schema with ID 'task-schema' already exists`

**Solution**: Use unique IDs for each schema:
```json
{
  "schemas": [
    {"id": "task-schema", "name": "Task"},
    {"id": "person-schema", "name": "Person"},  // Not "task-schema" again
    {"id": "meeting-schema", "name": "Meeting"}
  ]
}
```

## ID Discovery Problems

### ❌ "Supertag ID not found in workspace"

**Error**: `Supertag ID 'invalid-id-123' does not exist in workspace`

**Root Cause**: The ID in your mappings doesn't match your actual Tana workspace.

**Solution Steps**:

1. **Get the correct ID from Tana**:
   - Right-click supertag → "Show API schema"
   - Copy the `id` field from the JSON

2. **Update your mappings**:
   ```json
   {
     "mappings": {
       "supertags": {
         "Task": "correct-supertag-id-from-tana"
       }
     }
   }
   ```

3. **Verify with a test**:
   ```javascript
   // Test with the basic tool first
   create_plain_node({
     name: "Test",
     supertags: [{"id": "correct-supertag-id-from-tana"}]
   })
   ```

### ❌ "Field ID not found"

**Error**: `Field ID 'invalid-field-id' not found in supertag`

**Solution**:
1. Check the supertag's API schema for the correct field ID
2. Ensure the field exists in the supertag definition
3. Update both the schema field ID and mappings

**Example Fix**:
```json
{
  "mappings": {
    "fields": {
      "priority": "correct-priority-field-id"  // ← Update this
    }
  },
  "schemas": [{
    "fields": [{
      "id": "correct-priority-field-id",       // ← And this
      "name": "priority"
    }]
  }]
}
```

### ❌ "Cannot access Tana API Schema"

**Problem**: Can't get IDs from Tana's "Show API schema" feature.

**Alternative Solutions**:

1. **Use existing nodes**:
   ```javascript
   // Create a test node and check the response
   const result = await create_plain_node({
     name: "Test",
     supertags: [{"id": "known-supertag-id"}]
   });
   // Response contains the actual IDs used
   ```

2. **Use Tana's export features**:
   - Export workspace data
   - Find supertag and field definitions in the export

3. **Browser developer tools**:
   - Open Tana in browser
   - Use Network tab to see API calls
   - Extract IDs from the network requests

## Validation Errors

### ❌ "Invalid option value"

**Error**: `Value 'super-high' is not in allowed options [low, medium, high, critical]`

**Cause**: Trying to use a value not in the validation options.

**Solutions**:
1. **Check allowed values**:
   ```json
   {
     "validation": {
       "options": ["low", "medium", "high", "critical"]
     }
   }
   ```

2. **Use correct values**:
   ```javascript
   create_task({
     priority: "high"  // ✅ Valid
   })
   ```

3. **Update schema if needed**:
   ```json
   {
     "validation": {
       "options": ["low", "medium", "high", "critical", "super-high"]
     }
   }
   ```

### ❌ "Date parsing failed"

**Error**: `Cannot parse date 'next Friday'`

**Supported Date Formats**:
- ISO 8601: `2024-01-31`, `2024-01-31T14:30:00Z`
- Common formats: `Jan 31, 2024`, `January 31, 2024`
- Relative (limited): `today`, `tomorrow`, `yesterday`

**Fix**:
```javascript
// ❌ This fails
create_task({due_date: "next Friday"})

// ✅ These work
create_task({due_date: "2024-01-31"})
create_task({due_date: "Jan 31, 2024"})
create_task({due_date: "today"})
```

### ❌ "Required field missing"

**Error**: `Required field 'title' is missing`

**Solution**: Ensure all required fields are provided:
```javascript
// ❌ Missing required title
create_task({
  priority: "high"
})

// ✅ Includes required title
create_task({
  title: "Review budget",  // Required field
  priority: "high"
})
```

## Tool Generation Issues

### ❌ "No tools generated from schema"

**Problem**: Schema is added but no `create_[schema_name]` tool appears.

**Checklist**:
1. **Schema name matches mapping**:
   ```json
   {
     "mappings": {
       "supertags": {
         "Task": "supertag-id"  // ← Must match schema name
       }
     },
     "schemas": [{
       "name": "Task"  // ← Must match mapping key
     }]
   }
   ```

2. **Restart MCP server** after schema changes

3. **Check for errors** in server logs

4. **Verify with get_schemas**:
   ```javascript
   const schemas = await get_schemas();
   console.log(schemas.generated_tools);
   ```

### ❌ "Tool parameters not validated"

**Problem**: Generated tool accepts invalid inputs.

**Solution**: Check field definitions have proper validation:
```json
{
  "fields": [{
    "name": "priority",
    "type": "text",
    "validation": {          // ← Add validation
      "options": ["low", "medium", "high"]
    }
  }]
}
```

## Runtime Errors

### ❌ "API rate limit exceeded"

**Error**: `Rate limit exceeded: 1 request per second`

**Solutions**:
- Add delays between requests
- Batch operations when possible
- Use fewer parallel requests

### ❌ "Node creation failed"

**Error**: `Failed to create node: Invalid supertag reference`

**Debug Steps**:
1. **Test with basic tool**:
   ```javascript
   await create_plain_node({
     name: "Test",
     supertags: [{"id": "your-supertag-id"}]
   })
   ```

2. **Check API token permissions**

3. **Verify workspace limits** (750k nodes max)

4. **Check payload size** (5000 chars max)

## Performance Issues

### ❌ "Slow schema loading"

**Problem**: Schema configuration takes long to load.

**Optimizations**:
- Reduce number of schemas
- Simplify validation rules
- Remove unused field definitions

### ❌ "Memory usage high"

**Solutions**:
- Restart MCP server periodically
- Reduce schema complexity
- Use local vs remote validation when possible

## Debugging Tips

### Enable Debug Logging

```bash
# Set debug environment variable
DEBUG=tana-mcp* npm start
```

### Test Schema Step by Step

```javascript
// 1. Test basic node creation
await create_plain_node({name: "Test"})

// 2. Test with supertag
await create_plain_node({
  name: "Test", 
  supertags: [{"id": "your-supertag-id"}]
})

// 3. Test with fields
await create_plain_node({
  name: "Test",
  supertags: [{
    "id": "your-supertag-id",
    "fields": {"field-id": "value"}
  }]
})

// 4. Test schema tool
await create_task({title: "Test"})
```

### Check Configuration

```javascript
// View current configuration
const config = await get_config();
console.log('Mappings:', config.mappings);
console.log('Schemas:', config.schemas);

// View generated tools
const schemas = await get_schemas();
console.log('Generated tools:', schemas.generated_tools);
```

### Validate JSON Configuration

```bash
# Check JSON syntax
cat tana-schema-config.json | python -m json.tool

# Or use online JSON validators
# https://jsonlint.com/
```

## Getting Help

If these solutions don't resolve your issue:

1. **Check the logs** for specific error messages
2. **Create a minimal reproduction** case
3. **Share your configuration** (remove sensitive IDs)
4. **Post in GitHub Issues** with:
   - Error message
   - Configuration (sanitized)
   - Steps to reproduce
   - Expected vs actual behavior

## Common Working Configurations

### Minimal Working Example

```json
{
  "version": "1.0.0",
  "mappings": {
    "supertags": {"Task": "task-supertag-id"},
    "fields": {"title": "title-field-id"}
  },
  "schemas": [{
    "id": "task-schema",
    "name": "Task",
    "fields": [{
      "id": "title-field-id",
      "name": "title", 
      "type": "text",
      "required": true
    }]
  }]
}
```

### Complex Working Example

See [example-schema-config.json](./example-schema-config.json) for a complete, tested configuration.

---

**💡 Pro Tip**: Start with the minimal example and add complexity gradually. This makes it easier to identify where issues are introduced.