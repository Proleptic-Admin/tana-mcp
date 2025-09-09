# AI Assistant Guidelines for Tana MCP Server

This document provides comprehensive guidance for AI assistants (GitHub Copilot, Claude, GPT, etc.) working on the Tana MCP Server repository to ensure safe, accurate, and effective contributions.

## Table of Contents

- [Repository Overview](#repository-overview)
- [Core Functionality](#core-functionality)
- [Safety Guidelines](#safety-guidelines)
- [API Reference](#api-reference)
- [Common Patterns](#common-patterns)
- [Avoiding Hallucinations](#avoiding-hallucinations)
- [Testing and Validation](#testing-and-validation)
- [Documentation Standards](#documentation-standards)

## Repository Overview

### What This Repository Does
- **Primary Purpose**: Provides a Model Context Protocol (MCP) server for Tana's Input API
- **Target Users**: LLM clients (Claude Desktop, etc.) that need to interact with Tana workspaces
- **Core Technology**: TypeScript, MCP SDK, Tana Input API
- **Architecture**: MCP Server ↔ Tana API bridge

### What This Repository Does NOT Do
- **No Discord Integration**: This repository does not interact with Discord APIs
- **No KChat Integration**: This repository does not interact with KChat APIs  
- **No Other Chat Platforms**: Focus is exclusively on Tana workspace management
- **No Authentication Systems**: Uses Tana API tokens only
- **No Database Operations**: All data operations go through Tana's API

## Core Functionality

### Available Tools (11 total)
1. `create_plain_node` - Basic text nodes
2. `create_reference_node` - Nodes referencing other nodes
3. `create_date_node` - Date/time nodes
4. `create_url_node` - URL/link nodes
5. `create_checkbox_node` - Task/checkbox nodes
6. `create_file_node` - File attachment nodes
7. `create_field_node` - Field nodes with attributes
8. `create_node_structure` - Complex nested structures
9. `set_node_name` - Update existing node names
10. `create_supertag` - Create new supertag definitions
11. `create_field` - Create new field definitions

### Available Prompts (4 total)
- `create-task` - Interactive task creation
- `create-project` - Project structure setup
- `create-meeting-notes` - Meeting documentation
- `create-knowledge-entry` - Knowledge base entries

### Available Resources (4 total)
- `api-docs` - Tana API documentation
- `node-types` - Node type reference
- `examples` - Common usage patterns
- `server-info` - Server status and config

## Safety Guidelines

### Before Making Changes
1. **Read Existing Documentation**: Check README.md, API.md, DEVELOPMENT.md, ARCHITECTURE.md
2. **Understand the Scope**: This is a Tana-only integration, not a multi-platform system
3. **Check Type Definitions**: Review `src/types/tana-api.ts` for accurate data structures
4. **Validate Against Source**: Cross-reference with actual implementation in `src/server/`

### Code Modification Rules
1. **Preserve Type Safety**: Always maintain TypeScript type definitions
2. **Follow MCP Standards**: Adhere to Model Context Protocol specifications
3. **Maintain API Compatibility**: Don't break existing tool interfaces
4. **Validate Parameters**: Use Zod schemas for input validation
5. **Handle Errors Gracefully**: Follow established error handling patterns

### File Structure Awareness
```
src/
├── index.ts                 # Entry point
├── server/
│   ├── tana-mcp-server.ts  # Main MCP server implementation
│   └── tana-client.ts      # Tana API client
└── types/
    └── tana-api.ts         # Type definitions
```

## API Reference

### Tana API Endpoints
- **Primary Endpoint**: `https://europe-west1-tagr-prod.cloudfunctions.net/addToNodeV2`
- **Authentication**: Bearer token via `TANA_API_TOKEN` environment variable
- **Rate Limits**: Maximum 100 nodes per request
- **Data Format**: JSON with specific Tana node structures

### Node Types Supported
```typescript
type TanaNodeType = 
  | 'plain'     // Text content
  | 'reference' // Reference to existing node
  | 'date'      // ISO 8601 date
  | 'url'       // Web URL
  | 'boolean'   // Checkbox/toggle
  | 'file'      // Base64 encoded file
```

### Required Environment Variables
- `TANA_API_TOKEN` (required): Tana workspace API token
- `TANA_API_ENDPOINT` (optional): Custom API endpoint

## Common Patterns

### Creating Simple Nodes
```typescript
const request: TanaCreateNodesRequest = {
  targetNodeId: "parent-node-id", // optional
  nodes: [{
    name: "Node content",
    description: "Optional description"
  }]
};
```

### Creating Supertag Nodes
```typescript
const nodeWithSupertags = {
  name: "Tagged node",
  supertags: [{
    id: "supertag-id-from-workspace",
    fields: {
      "field-id": "field-value"
    }
  }]
};
```

### Error Handling Pattern
```typescript
try {
  const result = await this.tanaClient.createNodes(targetNodeId, nodes);
  return { content: [{ type: "text", text: `Created ${result.length} nodes` }] };
} catch (error) {
  throw new Error(`Failed to create nodes: ${error.message}`);
}
```

## Avoiding Hallucinations

### Accurate API Information
- **Only Tana API**: Do not suggest Discord, Slack, Teams, or other platform integrations
- **Actual Tool Names**: Use exact tool names from the implementation
- **Real Parameters**: Reference actual parameter schemas from Zod definitions
- **Valid Examples**: Base examples on working code patterns

### Source of Truth Files
- `src/server/tana-mcp-server.ts` - Tool implementations and schemas
- `src/types/tana-api.ts` - Official type definitions
- `API.md` - User-facing API documentation
- Tana's official docs at `https://tana.inc/docs/input-api`

### Validation Checklist
Before suggesting code or documentation changes:
- [ ] Does this tool/feature actually exist in the codebase?
- [ ] Are the parameter names correct according to Zod schemas?
- [ ] Is this functionality related to Tana workspaces?
- [ ] Have I checked the actual implementation?
- [ ] Are examples based on real usage patterns?

## Testing and Validation

### Manual Testing
```bash
# Build the project
npm run build

# Run with sample API token
TANA_API_TOKEN=your-token npm start

# Test MCP functionality through Claude Desktop or other MCP client
```

### Type Checking
```bash
# Verify TypeScript compilation
npx tsc --noEmit

# Check for type errors
npm run build
```

### Code Quality
- Follow existing code style and formatting
- Maintain consistent error handling patterns
- Use descriptive variable and function names
- Add appropriate TypeScript types for new functionality

## Documentation Standards

### When Adding New Tools
1. Update `src/server/tana-mcp-server.ts` with tool definition
2. Add Zod schema for parameter validation
3. Document in `API.md` with complete examples
4. Update README.md feature list
5. Add usage examples to `examples/README.md`

### Documentation Format
- Use clear, concise descriptions
- Provide working code examples
- Include error scenarios
- Cross-reference related tools/features
- Maintain consistent markdown formatting

### Example Documentation Template
```markdown
### tool_name

Brief description of what the tool does.

**Parameters:**
- `param1` (required, type): Description
- `param2` (optional, type): Description

**Example:**
```typescript
{
  "param1": "example value",
  "param2": "optional example"
}
```

**Returns:**
Description of return value and format.

**Errors:**
Common error scenarios and messages.
```

## Integration Boundaries

### What to Integrate With
- ✅ Tana Input API
- ✅ Model Context Protocol framework
- ✅ TypeScript type system
- ✅ Node.js ecosystem tools

### What NOT to Integrate With
- ❌ Discord APIs or webhooks
- ❌ KChat or other chat platforms
- ❌ Social media APIs
- ❌ Database systems (other than Tana)
- ❌ Authentication providers (other than Tana tokens)

### Future Extension Points
If extending functionality, consider:
- Additional Tana API endpoints as they become available
- Enhanced MCP protocol features
- Better error reporting and logging
- Performance optimizations for large workspaces
- Additional node types as supported by Tana

---

## Quick Reference

**Key Files to Understand:**
- `src/server/tana-mcp-server.ts` - Main server logic
- `src/types/tana-api.ts` - Type definitions
- `API.md` - Complete API reference

**Common Mistakes to Avoid:**
- Suggesting non-existent integrations (Discord, KChat, etc.)
- Using incorrect parameter names or types
- Ignoring existing error handling patterns
- Breaking MCP protocol compliance
- Adding unnecessary dependencies

**Before Every Contribution:**
1. Read the existing documentation
2. Check the actual implementation
3. Validate types and schemas
4. Test with real Tana API tokens
5. Update documentation as needed

This repository is focused exclusively on Tana workspace integration through the official Tana Input API. Any suggestions or contributions should align with this core purpose.