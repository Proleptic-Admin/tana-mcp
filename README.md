# Tana MCP Server

A [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) server that connects to [Tana's Input API](https://tana.inc/docs/input-api), allowing Large Language Models (LLMs) and other MCP clients to create and manipulate data in Tana workspaces.

<a href="https://glama.ai/mcp/servers/r6v3135zsm">
  <img width="380" height="200" src="https://glama.ai/mcp/servers/r6v3135zsm/badge" alt="Tana Server MCP server" />
</a>

## Features

This MCP server provides comprehensive access to Tana's Input API with:

### 🛠️ Tools (15+ available)
- **create_plain_node**: Create basic text nodes with optional supertags
- **create_reference_node**: Create nodes that reference existing nodes
- **create_date_node**: Create date nodes with ISO 8601 formatted dates
- **create_url_node**: Create URL nodes for web links
- **create_checkbox_node**: Create checkbox nodes for tasks and toggleable items
- **create_file_node**: Create file nodes with base64-encoded file data
- **create_field_node**: Create field nodes under target nodes with specific attributes
- **create_node_structure**: Build complex nested node hierarchies with children and fields
- **set_node_name**: Update the name of existing nodes
- **create_supertag**: Create new supertag definitions in your workspace
- **create_field**: Create new field definitions in your workspace

#### 🎯 Schema-Aware Smart Capture (NEW!)
- **Dynamic tool generation**: Define supertag schemas once, get typed tools like `create_task`, `create_person`
- **Name→ID mapping**: Use human-readable names instead of workspace IDs
- **Input validation**: Automatic validation and normalization of dates, URLs, booleans
- **Schema management**: `add_schema`, `update_mappings`, `get_schemas`, `get_config` tools

*See [API.md](./API.md) for detailed documentation of all tools with parameters and examples.*
*See [SCHEMA-GUIDE.md](./SCHEMA-GUIDE.md) for the complete schema-aware functionality guide.*

### 💬 Prompts (4+ templates)
- **create-task**: Interactive task creation with due dates, priorities, and assignments
- **create-project**: Complete project structures with goals, milestones, and team members
- **create-meeting-notes**: Formatted meeting notes with attendees, agenda, and action items
- **create-knowledge-entry**: Organized knowledge entries with categories, sources, and related topics
- **Schema-generated prompts**: Dynamic prompts created from your supertag schemas

*Prompts provide interactive templates for common use cases. Schema-based prompts adapt to your workspace structure.*

### 📚 Resources (4 available)
- **api-docs** (`tana://api/documentation`): Complete Tana Input API reference
- **node-types** (`tana://reference/node-types`): Detailed guide to all supported node types
- **examples** (`tana://examples/common-patterns`): Common usage patterns and best practices
- **server-info** (`tana://info`): Current server status and configuration details

*Resources provide built-in documentation accessible through your MCP client.*

## Quick Reference

### Schema-Aware Tools (NEW!)
- `add_schema`: Define supertag schemas to generate typed tools
- `update_mappings`: Map human-readable names to workspace IDs
- `create_[schema_name]`: Auto-generated tools from your schemas
- `get_schemas`, `get_config`: Manage your schema configuration

### Most Common Tools
- `create_plain_node`: Create basic text nodes
- `create_node_structure`: Build complex hierarchies
- `create_checkbox_node`: Create tasks/todos
- `set_node_name`: Update existing nodes

### Prompt Templates
- `create-task`: Interactive task creation
- `create-project`: Project setup wizard
- `create-meeting-notes`: Meeting documentation
- `create-knowledge-entry`: Knowledge base entries

*For complete tool documentation with parameters and examples, see [API.md](./API.md)*

## Requirements

- Node.js 18 or higher
- A Tana workspace with API access enabled
- Tana API token (generated from Tana settings)

## Installation

### Global Installation (Recommended)

```bash
npm install -g tana-mcp
```

### Local Installation

```bash
npm install tana-mcp
```

## Configuration

### Claude Desktop

Add this to your Claude Desktop configuration file:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`  
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "tana-mcp": {
      "command": "npx",
      "args": ["-y", "tana-mcp"],
      "env": {
        "TANA_API_TOKEN": "your-api-token-here"
      }
    }
  }
}
```

### Raycast

1. Install the MCP extension in Raycast
2. Open "Manage MCP Servers" command
3. Add a new server with this configuration:

```json
{
  "tana-mcp": {
    "command": "npx",
    "args": ["-y", "tana-mcp"],
    "env": {
      "TANA_API_TOKEN": "your-api-token-here"
    }
  }
}
```

### Other MCP Clients

For other MCP-compatible clients, use:
- **Command**: `npx -y tana-mcp` (or `tana-mcp` if installed globally)
- **Environment**: `TANA_API_TOKEN=your-api-token-here`

## Getting Your Tana API Token

1. Open Tana in your browser
2. Go to Settings → API tokens
3. Create a new token with appropriate permissions
4. Copy the token and add it to your MCP client configuration

## Usage Examples

Once configured, you can interact with Tana through your MCP client:

### Creating a Simple Node
```
Create a new node titled "Project Ideas" in my Tana workspace
```

### Creating a Task
```
Create a task "Review Q4 budget" with high priority due next Friday
```

### Creating a Project Structure
```
Create a project called "Website Redesign" with milestones for design, development, and launch
```

### Using Prompts
MCP clients that support prompts can use templates like:
- `create-task` - Interactive task creation
- `create-project` - Structured project setup
- `create-meeting-notes` - Meeting documentation
- `create-knowledge-entry` - Knowledge base entries

## API Limitations

- Maximum 100 nodes per request
- Rate limit: 1 request per second per token
- Payload size: 5000 characters maximum
- Workspace limit: 750,000 nodes

## Documentation

- **[API Reference](./API.md)**: Comprehensive documentation of all 11 tools, 4 prompts, and 4 resources
- **[Developer Guide](./DEVELOPMENT.md)**: Architecture, setup, and contribution guidelines
- **[Contributing Guide](./CONTRIBUTING.md)**: How to contribute code, documentation, and bug reports
- **[Architecture Overview](./ARCHITECTURE.md)**: System design and component interactions
- **[Examples](./examples/)**: Usage examples and common patterns
- **[Changelog](./CHANGELOG.md)**: Version history and release notes

## Development

### Building from Source

```bash
git clone https://github.com/tim-mcdonnell/tana-mcp.git
cd tana-mcp
npm install
npm run build
```

### Running in Development

```bash
TANA_API_TOKEN=your-token npm run dev
```

## Troubleshooting

### "Missing expected parameter key: items" (Raycast)
This error was fixed in v1.2.0. Please update to the latest version.

### Connection Issues
- Verify your API token is correct
- Check that your workspace hasn't exceeded the 750k node limit
- Ensure you're not exceeding the rate limit (1 request/second)

### Node Creation Failures
- Verify the target node ID exists (if specified)
- Check that supertag/field IDs are valid for your workspace
- Ensure payload is under 5000 characters

## Contributing

We welcome contributions! Please see our [Developer Guide](./DEVELOPMENT.md) for:

- Development setup and workflow
- Architecture overview and code organization  
- Guidelines for adding new tools and features
- Testing and code quality standards
- How to submit pull requests

For issues and feature requests, please use the [GitHub Issues](https://github.com/tim-mcdonnell/tana-mcp/issues) page.

## License

MIT License - see LICENSE file for details

## Support

For issues and feature requests, please use the [GitHub Issues](https://github.com/tim-mcdonnell/tana-mcp/issues) page.