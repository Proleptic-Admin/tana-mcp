# Tana MCP Server Architecture

This document describes the architecture and design of the Tana MCP Server.

## Overview

The Tana MCP Server acts as a bridge between Large Language Models (LLMs) and Tana's Input API, implementing the Model Context Protocol (MCP) specification.

```
┌─────────────────────────────────────────────────────────────────┐
│                        LLM Ecosystem                            │
├─────────────────┬─────────────────┬─────────────────────────────┤
│  Claude Desktop │     Raycast     │    Other MCP Clients       │
└─────────────────┴─────────────────┴─────────────────────────────┘
         │                 │                      │
         └─────────────────┼──────────────────────┘
                           │ MCP Protocol (stdio)
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Tana MCP Server                               │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │     Tools       │  │    Prompts      │  │   Resources     │  │
│  │   (11 tools)    │  │  (4 templates)  │  │  (4 built-in)   │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  │
│                           │                                     │
│  ┌─────────────────────────┼─────────────────────────────────┐  │
│  │         MCP Server Framework                             │  │
│  │  ┌─────────────────┐    │    ┌─────────────────────────┐  │  │
│  │  │   Validation    │    │    │    Error Handling       │  │  │
│  │  │   (Zod Schema)  │    │    │                         │  │  │
│  │  └─────────────────┘    │    └─────────────────────────┘  │  │
│  └─────────────────────────┼─────────────────────────────────┘  │
│                           │                                     │
│  ┌─────────────────────────▼─────────────────────────────────┐  │
│  │              Tana API Client                             │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐   │  │
│  │  │Rate Limiting│  │HTTP Client  │  │  Response       │   │  │
│  │  │   Handler   │  │  (Axios)    │  │  Processing     │   │  │
│  │  └─────────────┘  └─────────────┘  └─────────────────┘   │  │
│  └─────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                           │ HTTPS API Calls
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Tana Input API                              │
│                  (europe-west1-tagr-prod)                      │
└─────────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Tana Workspace                               │
│                   (User's Data)                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Core Components

### 1. MCP Protocol Layer

**Location**: `src/server/tana-mcp-server.ts`

The main server class that implements the MCP specification:

- **Transport**: Uses stdio transport for communication with LLM clients
- **Capabilities**: Exposes tools, prompts, and resources
- **Protocol Compliance**: Follows MCP standard for request/response handling

```typescript
export class TanaMcpServer {
  private readonly server: McpServer;
  private readonly tanaClient: TanaClient;
  
  constructor(apiToken: string, endpoint?: string) {
    this.server = new McpServer({
      name: 'Tana MCP Server',
      version: '1.2.0'
    });
  }
}
```

### 2. API Client Layer

**Location**: `src/server/tana-client.ts`

Handles all communication with Tana's Input API:

- **HTTP Management**: Axios-based HTTP client
- **Rate Limiting**: Enforces 1 request/second limit
- **Error Handling**: Converts API errors to meaningful messages
- **Request Validation**: Ensures payloads meet API constraints

```typescript
export class TanaClient {
  private readonly apiToken: string;
  private readonly endpoint: string;
  
  async createNodes(targetNodeId?: string, nodes: TanaNode[]): Promise<TanaNodeResponse[]>
  async setNodeName(nodeId: string, newName: string): Promise<TanaNodeResponse>
}
```

### 3. Type System

**Location**: `src/types/tana-api.ts`

Comprehensive TypeScript definitions:

- **Node Types**: All supported Tana node types
- **API Interfaces**: Request/response structures
- **Validation Schemas**: Zod schemas for runtime validation

```typescript
export type TanaNode = 
  | TanaPlainNode 
  | TanaReferenceNode 
  | TanaDateNode 
  | TanaUrlNode 
  | TanaBooleanNode 
  | TanaFileNode 
  | TanaFieldNode;
```

## Data Flow

### 1. Request Flow

```
LLM Client → MCP Protocol → Tool Validation → API Client → Tana API
```

1. **LLM makes request** via MCP protocol (stdio)
2. **Server validates input** using Zod schemas
3. **Tool handler processes** the request
4. **API client formats** the Tana API call
5. **HTTP request sent** to Tana Input API
6. **Response processed** and returned to LLM

### 2. Error Flow

```
Tana API Error → Client Processing → MCP Error Format → LLM Client
```

1. **API returns error** (HTTP error, validation failure, etc.)
2. **Client processes error** into meaningful message
3. **Server formats as MCP error** response
4. **LLM receives** structured error information

## Tool Architecture

### Tool Registration Pattern

```typescript
this.server.tool(
  'tool_name',
  {
    param1: z.string(),
    param2: z.number().optional()
  },
  async ({ param1, param2 }) => {
    try {
      // 1. Validate and process parameters
      // 2. Call Tana API via client
      // 3. Format response for MCP
      return {
        content: [{ type: 'text', text: JSON.stringify(result) }],
        isError: false
      };
    } catch (error) {
      // 4. Handle errors gracefully
      return {
        content: [{ type: 'text', text: `Error: ${error.message}` }],
        isError: true
      };
    }
  }
);
```

### Available Tools

1. **Node Creation Tools** (6 tools)
   - create_plain_node, create_reference_node, create_date_node
   - create_url_node, create_checkbox_node, create_file_node

2. **Structure Tools** (3 tools)
   - create_field_node, create_node_structure, set_node_name

3. **Schema Tools** (2 tools)
   - create_supertag, create_field

## Prompt Architecture

### Prompt Templates

Interactive templates for common use cases:

```typescript
this.server.prompt(
  'prompt-name',
  'Description of what this prompt does',
  [
    {
      name: 'param1',
      description: 'Parameter description',
      required: true
    }
  ],
  async (params) => {
    // Generate structured prompt response
    return {
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: 'Generated prompt text with parameters'
          }
        }
      ]
    };
  }
);
```

## Resource Architecture

### Built-in Resources

Static and dynamic documentation resources:

```typescript
this.server.resource(
  'resource-name',
  'tana://uri/path',
  'Resource description',
  'text/markdown',
  async () => {
    return {
      contents: [
        {
          type: 'text',
          text: 'Resource content'
        }
      ]
    };
  }
);
```

## Configuration Management

### Environment Variables

- `TANA_API_TOKEN`: Required API token
- `TANA_API_ENDPOINT`: Optional custom endpoint

### Validation and Security

- Input validation using Zod schemas
- API token security (never logged)
- Rate limiting enforcement
- Payload size validation

## Error Handling Strategy

### Layered Error Handling

1. **Input Validation**: Zod schema validation
2. **Business Logic**: Application-level validation
3. **API Client**: HTTP and network errors
4. **Protocol Level**: MCP-compliant error responses

### Error Categories

- **Validation Errors**: Invalid input parameters
- **Authentication Errors**: API token issues
- **Rate Limit Errors**: Too many requests
- **API Errors**: Tana service errors
- **Network Errors**: Connection issues

## Performance Considerations

### Rate Limiting

- 1 request per second to Tana API
- Request queuing and throttling
- Error handling for rate limit exceeded

### Memory Management

- Streaming for large payloads
- Efficient JSON processing
- Garbage collection considerations

### Scalability

- Stateless design for horizontal scaling
- Connection pooling for HTTP requests
- Efficient resource utilization

## Security Architecture

### Token Management

- Environment variable storage
- No token logging or exposure
- Secure transmission to Tana API

### Input Sanitization

- Comprehensive input validation
- XSS prevention
- Injection attack prevention

### API Security

- HTTPS-only communication
- Proper error message handling
- No sensitive data exposure

## Extension Points

### Adding New Tools

1. Define Zod schema for parameters
2. Implement tool handler function
3. Register with MCP server
4. Add documentation and tests

### Custom Transports

The server can be extended to support other transports:
- WebSocket for real-time communication
- HTTP for web-based clients
- IPC for local process communication

### Plugin Architecture

Future extension possibilities:
- Plugin system for custom tools
- Middleware for request processing
- Custom validation rules
- Alternative API backends

## Deployment Architecture

### Packaging

- npm package for easy distribution
- Binary executable via pkg
- Docker container for containerized deployment

### Runtime Requirements

- Node.js 18+ runtime
- Stdio access for MCP communication
- Network access to Tana API
- Environment variable support

This architecture provides a solid foundation for the Tana MCP Server while maintaining flexibility for future enhancements and extensions.