# Tana MCP Server Developer Guide

This guide provides comprehensive information for developers who want to understand, contribute to, or extend the Tana MCP Server.

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Project Structure](#project-structure)
- [Development Setup](#development-setup)
- [Core Components](#core-components)
- [API Client](#api-client)
- [Type System](#type-system)
- [Testing](#testing)
- [Contributing](#contributing)
- [Extending the Server](#extending-the-server)

## Architecture Overview

The Tana MCP Server is built using the [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) framework and provides a bridge between LLMs and Tana's Input API.

### High-Level Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   LLM Client    │◄──►│  Tana MCP Server │◄──►│   Tana API      │
│  (Claude, etc.) │    │                  │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

### Key Design Principles

1. **Protocol Compliance**: Full compliance with MCP specification
2. **Type Safety**: Comprehensive TypeScript types for all API interactions
3. **Error Resilience**: Robust error handling and validation
4. **Modularity**: Clear separation of concerns between components
5. **Extensibility**: Easy to add new tools, prompts, and resources

### Communication Flow

1. LLM client connects to MCP server via stdio transport
2. MCP server exposes tools, prompts, and resources
3. Client calls tools with validated parameters
4. Server translates MCP calls to Tana API requests
5. Results are formatted and returned to the client

## Project Structure

```
tana-mcp/
├── src/
│   ├── index.ts              # Main entry point and server startup
│   ├── server/
│   │   ├── tana-mcp-server.ts    # Core MCP server implementation
│   │   └── tana-client.ts        # Tana API client wrapper
│   └── types/
│       └── tana-api.ts           # TypeScript type definitions
├── examples/
│   └── example-usage.js          # Usage examples and patterns
├── dist/                         # Compiled JavaScript output
├── package.json                  # Dependencies and scripts
├── tsconfig.json                # TypeScript configuration
├── .env.example                 # Environment variable template
├── README.md                    # User documentation
├── API.md                       # API reference documentation
└── DEVELOPMENT.md               # This developer guide
```

### Source Code Organization

- **`src/index.ts`**: Application entry point, environment setup, server initialization
- **`src/server/tana-mcp-server.ts`**: Core MCP server with all tools, prompts, and resources
- **`src/server/tana-client.ts`**: Abstraction layer for Tana API interactions
- **`src/types/tana-api.ts`**: Type definitions matching Tana's API specification

## Development Setup

### Prerequisites

- Node.js 18+ 
- npm or yarn
- TypeScript knowledge
- Tana workspace with API access
- Valid Tana API token

### Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/tim-mcdonnell/tana-mcp.git
   cd tana-mcp
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment**
   ```bash
   cp .env.example .env
   # Edit .env and add your TANA_API_TOKEN
   ```

4. **Build the project**
   ```bash
   npm run build
   ```

5. **Run in development mode**
   ```bash
   npm run dev
   ```

### Available Scripts

- `npm run build`: Compile TypeScript to JavaScript
- `npm run start`: Run the compiled server
- `npm run dev`: Run in development mode with ts-node
- `npm run prepublishOnly`: Pre-publish build hook

### Environment Variables

- `TANA_API_TOKEN` (required): Your Tana API token
- `TANA_API_ENDPOINT` (optional): Custom Tana API endpoint URL

## Core Components

### TanaMcpServer Class

The main server class that implements the MCP protocol.

**Key Methods:**
- `constructor(apiToken, endpoint?)`: Initialize with Tana credentials
- `start()`: Start the MCP server with stdio transport
- `registerTools()`: Register all available tools
- `registerPrompts()`: Register interactive prompt templates
- `registerResources()`: Register documentation resources

**Tool Registration Pattern:**
```typescript
this.server.tool(
  'tool_name',
  {
    param1: z.string(),
    param2: z.number().optional()
  },
  async ({ param1, param2 }) => {
    try {
      // Tool implementation
      const result = await this.tanaClient.someMethod(param1, param2);
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        isError: false
      };
    } catch (error) {
      return {
        content: [{ type: 'text', text: `Error: ${error.message}` }],
        isError: true
      };
    }
  }
);
```

### Input Validation

All tools use Zod schemas for runtime type validation:

```typescript
// Schema definitions
const SupertagSchema = z.object({
  id: z.string(),
  fields: z.record(z.string()).optional()
});

const NodeSchema = z.lazy(() => 
  z.object({
    name: z.string().optional(),
    description: z.string().optional(),
    supertags: z.array(SupertagSchema).optional(),
    children: z.array(z.any()).optional(),
    // ... other properties
  })
);
```

## API Client

### TanaClient Class

Handles all HTTP communication with Tana's Input API.

**Key Features:**
- Automatic error handling and retries
- Request/response logging
- Rate limit compliance
- Payload validation

**Core Methods:**

```typescript
class TanaClient {
  // Create multiple nodes
  async createNodes(targetNodeId?: string, nodes: TanaNode[]): Promise<TanaNodeResponse[]>
  
  // Create single node
  async createNode(targetNodeId?: string, node: TanaNode): Promise<TanaNodeResponse>
  
  // Update node name
  async setNodeName(nodeId: string, newName: string): Promise<TanaNodeResponse>
  
  // Low-level API request
  private async makeRequest(request: TanaAPIRequest): Promise<TanaAPIResponse>
}
```

**Error Handling:**
```typescript
try {
  const response = await this.makeRequest(request);
  return response.children || [];
} catch (error) {
  if (axios.isAxiosError(error) && error.response) {
    throw new Error(`Tana API error: ${error.response.status} ${error.response.statusText}`);
  }
  throw new Error(`Network error: ${error.message}`);
}
```

### API Limitations

The client enforces Tana API constraints:
- Maximum 100 nodes per request
- Rate limit: 1 request per second
- Payload size: 5000 characters maximum
- Workspace limit: 750,000 nodes

## Type System

### Core Type Definitions

The type system closely mirrors Tana's API specification:

```typescript
// Base node interface
export interface TanaBaseNode {
  name?: string;
  description?: string;
  supertags?: TanaSupertag[];
  children?: TanaNode[];
}

// Specific node types
export interface TanaPlainNode extends TanaBaseNode {
  dataType?: 'plain';
}

export interface TanaReferenceNode {
  dataType: 'reference';
  id: string;
}

export interface TanaDateNode extends TanaBaseNode {
  dataType: 'date';
  name: string; // ISO 8601 format
}

// Union type for all node types
export type TanaNode = 
  | TanaPlainNode 
  | TanaReferenceNode 
  | TanaDateNode 
  | TanaUrlNode 
  | TanaBooleanNode 
  | TanaFileNode 
  | TanaFieldNode;
```

### API Request/Response Types

```typescript
export interface TanaCreateNodesRequest {
  targetNodeId?: string;
  nodes: TanaNode[];
}

export interface TanaAPIResponse {
  children?: TanaNodeResponse[];
  // ... other response fields
}
```

### Field Nodes

Special handling for Tana's field system:

```typescript
export interface TanaFieldNode {
  type: 'field';
  attributeId: string;
  children?: TanaNode[];
}
```

## Testing

### Current Testing Status

⚠️ **Note**: The project currently has no automated tests (`npm test` returns "no test specified").

### Recommended Testing Strategy

1. **Unit Tests**: Test individual functions and classes
2. **Integration Tests**: Test API client against Tana API
3. **MCP Protocol Tests**: Validate MCP compliance
4. **End-to-End Tests**: Test full workflow with mock LLM client

### Testing Framework Recommendations

```bash
# Recommended testing stack
npm install --save-dev jest @types/jest ts-jest
npm install --save-dev @testing-library/node
npm install --save-dev nock  # For API mocking
```

### Sample Test Structure

```typescript
// tests/tana-client.test.ts
describe('TanaClient', () => {
  let client: TanaClient;
  
  beforeEach(() => {
    client = new TanaClient({ apiToken: 'test-token' });
  });
  
  it('should create a plain node', async () => {
    // Mock API response
    // Test node creation
    // Verify request format
  });
  
  it('should handle API errors gracefully', async () => {
    // Test error scenarios
  });
});
```

## Contributing

### Development Workflow

1. **Fork the repository**
2. **Create a feature branch**
   ```bash
   git checkout -b feature/new-tool
   ```
3. **Make changes with tests**
4. **Ensure code quality**
   ```bash
   npm run build  # Check compilation
   # Run tests (when available)
   # Run linter (when available)
   ```
5. **Submit a pull request**

### Code Style Guidelines

- Use TypeScript for all new code
- Follow existing naming conventions
- Add JSDoc comments for public APIs
- Validate all inputs with Zod schemas
- Handle errors gracefully
- Keep functions focused and small

### Adding New Tools

1. **Define the tool schema**
   ```typescript
   const NewToolSchema = z.object({
     param1: z.string(),
     param2: z.number().optional()
   });
   ```

2. **Implement the tool handler**
   ```typescript
   this.server.tool(
     'new_tool_name',
     NewToolSchema,
     async (params) => {
       // Implementation
     }
   );
   ```

3. **Add to API documentation**
4. **Create usage examples**
5. **Add tests**

### Adding New Node Types

1. **Define TypeScript interface**
   ```typescript
   export interface TanaNewNode extends TanaBaseNode {
     dataType: 'new_type';
     specificField: string;
   }
   ```

2. **Update union type**
   ```typescript
   export type TanaNode = ... | TanaNewNode;
   ```

3. **Add tool for creation**
4. **Update documentation**

## Extending the Server

### Custom MCP Servers

You can extend the base server for custom use cases:

```typescript
import { TanaMcpServer } from './src/server/tana-mcp-server';

class CustomTanaServer extends TanaMcpServer {
  constructor(apiToken: string, endpoint?: string) {
    super(apiToken, endpoint);
    this.registerCustomTools();
  }
  
  private registerCustomTools(): void {
    this.server.tool(
      'custom_tool',
      { param: z.string() },
      async ({ param }) => {
        // Custom implementation
      }
    );
  }
}
```

### Plugin Architecture

Consider implementing a plugin system for easier extension:

```typescript
interface TanaPlugin {
  name: string;
  version: string;
  register(server: TanaMcpServer): void;
}

class ProjectManagementPlugin implements TanaPlugin {
  name = 'project-management';
  version = '1.0.0';
  
  register(server: TanaMcpServer): void {
    // Register project-specific tools
  }
}
```

### Custom Transports

While the server uses stdio by default, you can implement other transports:

```typescript
import { SseServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';

// For web-based MCP clients
const transport = new SseServerTransport('/mcp', response);
await this.server.connect(transport);
```

### Environment-Specific Configuration

```typescript
interface ServerConfig {
  apiToken: string;
  endpoint?: string;
  rateLimit?: number;
  maxNodes?: number;
}

class ConfigurableTanaServer extends TanaMcpServer {
  constructor(config: ServerConfig) {
    super(config.apiToken, config.endpoint);
    // Apply custom configuration
  }
}
```

### Monitoring and Logging

Add monitoring for production deployments:

```typescript
class MonitoredTanaServer extends TanaMcpServer {
  private logger: Logger;
  private metrics: MetricsCollector;
  
  constructor(apiToken: string, logger: Logger, metrics: MetricsCollector) {
    super(apiToken);
    this.logger = logger;
    this.metrics = metrics;
    this.addMonitoring();
  }
  
  private addMonitoring(): void {
    // Add request/response logging
    // Track performance metrics
    // Monitor error rates
  }
}
```

## Best Practices

### Security

- Never log API tokens or sensitive data
- Validate all inputs before processing
- Use environment variables for configuration
- Implement proper error handling without exposing internals

### Performance

- Implement request caching where appropriate
- Batch API calls when possible
- Respect rate limits
- Monitor memory usage for large payloads

### Reliability

- Implement retry logic for transient failures
- Graceful degradation when API is unavailable
- Comprehensive error messages for debugging
- Health checks and monitoring

### Documentation

- Keep API documentation in sync with code
- Provide comprehensive examples
- Document breaking changes
- Maintain changelog for releases

## Future Enhancements

Potential areas for improvement:

1. **Testing Infrastructure**: Comprehensive test suite
2. **Plugin System**: Modular architecture for extensions
3. **Caching Layer**: Reduce API calls for read operations
4. **Batch Operations**: Optimize bulk data operations
5. **Real-time Updates**: WebSocket support for live data
6. **Schema Validation**: Enhanced input validation
7. **Monitoring**: Built-in metrics and logging
8. **Documentation**: Interactive API explorer