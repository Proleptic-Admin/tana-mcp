/**
 * Tana MCP Server
 * An MCP server that connects to the Tana Input API
 */

import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { promises as fs } from 'fs';
import { extname } from 'path';
import axios from 'axios';
import { TanaClient } from './tana-client';
import { SchemaManager } from './schema-manager';
import { InputValidator } from './input-validator';
import { SchemaToolGenerator } from './schema-tool-generator';
import { MirrorStorage } from './mirror-storage';
import { PublishScraper } from './publish-scraper';
import {
  TanaBooleanNode,
  TanaDateNode,
  TanaFileNode,
  TanaPlainNode,
  TanaReferenceNode,
  TanaSupertag,
  TanaUrlNode
} from '../types/tana-api';
import { SchemaConfig, SupertagSchema } from '../types/schema-config';

// Define Zod schemas for validating inputs
const SupertagSchema = z.object({
  id: z.string(),
  fields: z.record(z.string()).optional()
});

// We need a recursive type for NodeSchema to handle field nodes and other nested structures
const NodeSchema = z.lazy(() => 
  z.object({
    name: z.string().optional(),
    description: z.string().optional(),
    supertags: z.array(SupertagSchema).optional(),
    children: z.array(z.any()).optional(), // Will be validated by implementation 
    // Fields for specific node types
    dataType: z.enum(['plain', 'reference', 'date', 'url', 'boolean', 'file']).optional(),
    id: z.string().optional(), // For reference nodes
    value: z.boolean().optional(), // For boolean nodes
    file: z.string().optional(), // For file nodes (base64)
    filename: z.string().optional(), // For file nodes
    contentType: z.string().optional(), // For file nodes
    // Field node properties
    type: z.literal('field').optional(),
    attributeId: z.string().optional()
  })
);

export class TanaMcpServer {
  private readonly server: McpServer;
  private readonly tanaClient: TanaClient;
  private readonly schemaManager: SchemaManager;
  private readonly inputValidator: InputValidator;
  private readonly schemaToolGenerator: SchemaToolGenerator;
  private readonly mirrorStorage: MirrorStorage;
  private readonly publishScraper: PublishScraper;
  private toolsRegistered = false;

  constructor(apiToken: string, endpoint?: string, configPath?: string) {
    // Create mirror storage
    this.mirrorStorage = new MirrorStorage();
    
    // Create the Tana client with mirror storage
    this.tanaClient = new TanaClient({
      apiToken,
      endpoint
    }, this.mirrorStorage);

    // Create publish scraper
    this.publishScraper = new PublishScraper();

    // Create schema manager
    this.schemaManager = new SchemaManager(configPath);

    // Create input validator (will be initialized from config)
    this.inputValidator = new InputValidator();

    // Create schema tool generator
    this.schemaToolGenerator = new SchemaToolGenerator(
      this.schemaManager,
      this.tanaClient,
      this.inputValidator
    );

    // Create the MCP server with proper capabilities
    this.server = new McpServer({
      name: 'Tana MCP Server',
      version: '1.2.0'
    });

    // Don't initialize here - wait for start()
  }

  /**
   * Initialize the server with schema-based configuration
   */
  private async initializeServer(): Promise<void> {
    try {
      // Load schema configuration
      const config = await this.schemaManager.loadConfig();
      
      // Update input validator with config settings
      Object.assign(this.inputValidator, InputValidator.fromConfig(config));

      // Register standard tools
      this.registerTools();

      // Register standard prompts
      this.registerPrompts();

      // Register resources
      this.registerResources();

      // Generate and register schema-based tools (only for new schemas)
      await this.schemaToolGenerator.generateAndRegisterTools(this.server, {
        prefix: 'create_',
        includePrompts: false, // Avoid prompt conflicts
        validateInputs: true,
        normalizeInputs: true
      });

      // Add schema management tools
      this.registerSchemaManagementTools();

      // Add mirror and publish management tools
      this.registerMirrorAndPublishTools();

    } catch (error) {
      // If initialization fails, continue with standard tools only
      console.error('Warning: Schema initialization failed, using standard tools only:', error);
      
      // Only register standard tools if not already registered
      if (!this.toolsRegistered) {
        this.registerTools();
        this.registerPrompts();
        this.registerResources();
        this.registerMirrorAndPublishTools();
        this.toolsRegistered = true;
      }
    }
  }

  /**
   * Start the MCP server
   */
  async start(): Promise<void> {
    // Initialize the server first
    await this.initializeServer();

    // Create the transport
    const transport = new StdioServerTransport();

    // Connect the server to the transport
    await this.server.connect(transport);
    
    // Server is ready - no logging to stderr to avoid protocol interference
  }

  /**
   * Register tools for interacting with Tana
   */
  private registerTools(): void {
    // Create a plain node tool
    this.server.tool(
      'create_plain_node',
      {
        targetNodeId: z.string().optional(),
        name: z.string(),
        description: z.string().optional(),
        supertags: z.array(SupertagSchema).optional()
      },
      async ({ targetNodeId, name, description, supertags }) => {
        try {
          const node: TanaPlainNode = {
            name,
            description,
            supertags
          };

          const result = await this.tanaClient.createNode(targetNodeId, node);

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result, null, 2)
              }
            ],
            isError: false
          };
        } catch (error) {
          return {
            content: [
              {
                type: 'text',
                text: `Error creating plain node: ${error instanceof Error ? error.message : String(error)}`
              }
            ],
            isError: true
          };
        }
      }
    );

    // Create a reference node tool
    this.server.tool(
      'create_reference_node',
      {
        targetNodeId: z.string().optional(),
        referenceId: z.string()
      },
      async ({ targetNodeId, referenceId }) => {
        try {
          const node: TanaReferenceNode = {
            dataType: 'reference',
            id: referenceId
          };

          const result = await this.tanaClient.createNode(targetNodeId, node);

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result, null, 2)
              }
            ],
            isError: false
          };
        } catch (error) {
          return {
            content: [
              {
                type: 'text',
                text: `Error creating reference node: ${error instanceof Error ? error.message : String(error)}`
              }
            ],
            isError: true
          };
        }
      }
    );

    // Create a date node tool
    this.server.tool(
      'create_date_node',
      {
        targetNodeId: z.string().optional(),
        date: z.string(),
        description: z.string().optional(),
        supertags: z.array(SupertagSchema).optional()
      },
      async ({ targetNodeId, date, description, supertags }) => {
        try {
          const node: TanaDateNode = {
            dataType: 'date',
            name: date,
            description,
            supertags
          };

          const result = await this.tanaClient.createNode(targetNodeId, node);

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result, null, 2)
              }
            ],
            isError: false
          };
        } catch (error) {
          return {
            content: [
              {
                type: 'text',
                text: `Error creating date node: ${error instanceof Error ? error.message : String(error)}`
              }
            ],
            isError: true
          };
        }
      }
    );

    // Create a URL node tool
    this.server.tool(
      'create_url_node',
      {
        targetNodeId: z.string().optional(),
        url: z.string().url(),
        description: z.string().optional(),
        supertags: z.array(SupertagSchema).optional()
      },
      async ({ targetNodeId, url, description, supertags }) => {
        try {
          const node: TanaUrlNode = {
            dataType: 'url',
            name: url,
            description,
            supertags
          };

          const result = await this.tanaClient.createNode(targetNodeId, node);

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result, null, 2)
              }
            ],
            isError: false
          };
        } catch (error) {
          return {
            content: [
              {
                type: 'text',
                text: `Error creating URL node: ${error instanceof Error ? error.message : String(error)}`
              }
            ],
            isError: true
          };
        }
      }
    );

    // Create a checkbox node tool
    this.server.tool(
      'create_checkbox_node',
      {
        targetNodeId: z.string().optional(),
        name: z.string(),
        checked: z.boolean(),
        description: z.string().optional(),
        supertags: z.array(SupertagSchema).optional()
      },
      async ({ targetNodeId, name, checked, description, supertags }) => {
        try {
          const node: TanaBooleanNode = {
            dataType: 'boolean',
            name,
            value: checked,
            description,
            supertags
          };

          const result = await this.tanaClient.createNode(targetNodeId, node);

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result, null, 2)
              }
            ],
            isError: false
          };
        } catch (error) {
          return {
            content: [
              {
                type: 'text',
                text: `Error creating checkbox node: ${error instanceof Error ? error.message : String(error)}`
              }
            ],
            isError: true
          };
        }
      }
    );

    // Create a file node tool
    this.server.tool(
      'create_file_node',
      {
        targetNodeId: z.string().optional(),
        fileData: z.string(), // base64 encoded file data
        filename: z.string(),
        contentType: z.string(),
        description: z.string().optional(),
        supertags: z.array(SupertagSchema).optional()
      },
      async ({ targetNodeId, fileData, filename, contentType, description, supertags }) => {
        try {
          const node: TanaFileNode = {
            dataType: 'file',
            file: fileData,
            filename,
            contentType,
            description,
            supertags
          };

          const result = await this.tanaClient.createNode(targetNodeId, node);

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result, null, 2)
              }
            ],
            isError: false
          };
        } catch (error) {
          return {
            content: [
              {
                type: 'text',
                text: `Error creating file node: ${error instanceof Error ? error.message : String(error)}`
              }
            ],
            isError: true
          };
        }
      }
    );

    // Upload file tool - handles path, bytes, or URL input
    this.server.tool(
      'upload_file',
      {
        path: z.string().optional(),
        bytes: z.string().optional(), // base64 encoded bytes
        url: z.string().optional(),
        target: z.string().optional(), // targetNodeId
        filename: z.string().optional(), // Override filename
        contentType: z.string().optional(), // Override content type
        description: z.string().optional(),
        supertags: z.array(SupertagSchema).optional()
      },
      async ({ path, bytes, url, target, filename, contentType, description, supertags }) => {
        try {
          // Validate that exactly one input source is provided
          const inputSources = [path, bytes, url].filter(Boolean);
          if (inputSources.length !== 1) {
            throw new Error('Exactly one of path, bytes, or url must be provided');
          }

          let fileData: string; // base64 encoded data
          let detectedFilename: string;
          let detectedContentType: string;

          if (path) {
            // Read file from filesystem
            try {
              const buffer = await fs.readFile(path);
              fileData = buffer.toString('base64');
              detectedFilename = path.split('/').pop() || path.split('\\').pop() || 'unknown';
              detectedContentType = this.getMimeType(path);
            } catch (error) {
              throw new Error(`Failed to read file from path: ${error instanceof Error ? error.message : String(error)}`);
            }
          } else if (bytes) {
            // Use provided base64 bytes
            fileData = bytes;
            detectedFilename = filename || 'upload';
            detectedContentType = contentType || 'application/octet-stream';
          } else if (url) {
            // Download file from URL
            try {
              const response = await axios.get(url, { 
                responseType: 'arraybuffer',
                timeout: 30000, // 30 second timeout
                maxContentLength: 50 * 1024 * 1024 // 50MB max
              });
              
              const buffer = Buffer.from(response.data);
              fileData = buffer.toString('base64');
              
              // Try to get filename from URL or Content-Disposition header
              detectedFilename = this.extractFilenameFromUrl(url, response.headers['content-disposition']);
              detectedContentType = response.headers['content-type'] || 'application/octet-stream';
            } catch (error) {
              throw new Error(`Failed to download file from URL: ${error instanceof Error ? error.message : String(error)}`);
            }
          } else {
            throw new Error('No valid input source provided');
          }

          // Use provided overrides or detected values
          const finalFilename = filename || detectedFilename;
          const finalContentType = contentType || detectedContentType;

          // Create the file node using existing logic
          const node: TanaFileNode = {
            dataType: 'file',
            file: fileData,
            filename: finalFilename,
            contentType: finalContentType,
            description,
            supertags
          };

          const result = await this.tanaClient.createNode(target, node);

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result, null, 2)
              }
            ],
            isError: false
          };
        } catch (error) {
          return {
            content: [
              {
                type: 'text',
                text: `Error uploading file: ${error instanceof Error ? error.message : String(error)}`
              }
            ],
            isError: true
          };
        }
      }
    );

    // Create a field node tool
    this.server.tool(
      'create_field_node',
      {
        targetNodeId: z.string().optional(),
        attributeId: z.string(),
        children: z.array(NodeSchema).optional()
      },
      async ({ targetNodeId, attributeId, children }) => {
        try {
          // Properly type the field node according to TanaFieldNode interface
          const fieldNode = {
            type: 'field' as const, // Use 'as const' to ensure type is "field"
            attributeId,
            children
          };

          // Cast to TanaNode to satisfy the type system
          const result = await this.tanaClient.createNode(targetNodeId, fieldNode as any);

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result, null, 2)
              }
            ],
            isError: false
          };
        } catch (error) {
          return {
            content: [
              {
                type: 'text',
                text: `Error creating field node: ${error instanceof Error ? error.message : String(error)}`
              }
            ],
            isError: true
          };
        }
      }
    );

    // Set node name tool
    this.server.tool(
      'set_node_name',
      {
        nodeId: z.string(),
        newName: z.string()
      },
      async ({ nodeId, newName }) => {
        try {
          const result = await this.tanaClient.setNodeName(nodeId, newName);

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result, null, 2)
              }
            ],
            isError: false
          };
        } catch (error) {
          return {
            content: [
              {
                type: 'text',
                text: `Error setting node name: ${error instanceof Error ? error.message : String(error)}`
              }
            ],
            isError: true
          };
        }
      }
    );

    // Create a complex node structure tool
    this.server.tool(
      'create_node_structure',
      {
        targetNodeId: z.string().optional(),
        node: NodeSchema
      },
      async ({ targetNodeId, node }) => {
        try {
          // Cast to TanaNode to satisfy the type system
          const result = await this.tanaClient.createNode(targetNodeId, node as any);

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result, null, 2)
              }
            ],
            isError: false
          };
        } catch (error) {
          return {
            content: [
              {
                type: 'text',
                text: `Error creating node structure: ${error instanceof Error ? error.message : String(error)}`
              }
            ],
            isError: true
          };
        }
      }
    );

    // Create a supertag tool
    this.server.tool(
      'create_supertag',
      {
        targetNodeId: z.string().optional().default('SCHEMA'),
        name: z.string(),
        description: z.string().optional()
      },
      async ({ targetNodeId, name, description }) => {
        try {
          const node: TanaPlainNode = {
            name,
            description,
            supertags: [{ id: 'SYS_T01' }]
          };

          const result = await this.tanaClient.createNode(targetNodeId, node);
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result, null, 2)
              }
            ],
            isError: false
          };
        } catch (error) {
          return {
            content: [
              {
                type: 'text',
                text: `Error creating supertag: ${error instanceof Error ? error.message : String(error)}`
              }
            ],
            isError: true
          };
        }
      }
    );

    // Create a field tool
    this.server.tool(
      'create_field',
      {
        targetNodeId: z.string().optional().default('SCHEMA'),
        name: z.string(),
        description: z.string().optional()
      },
      async ({ targetNodeId, name, description }) => {
        try {
          const node: TanaPlainNode = {
            name,
            description,
            supertags: [{ id: 'SYS_T02' }]
          };

          const result = await this.tanaClient.createNode(targetNodeId, node);
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result, null, 2)
              }
            ],
            isError: false
          };
        } catch (error) {
          return {
            content: [
              {
                type: 'text',
                text: `Error creating field: ${error instanceof Error ? error.message : String(error)}`
              }
            ],
            isError: true
          };
        }
      }
    );
  }

  /**
   * Register prompts for common Tana operations
   */
  private registerPrompts(): void {
    // Prompt for creating a task
    this.server.prompt(
      'create-task',
      'Create a task node in Tana with optional due date and tags',
      {
        title: z.string().describe('Task title'),
        description: z.string().optional().describe('Task description'),
        dueDate: z.string().optional().describe('Due date in ISO format (YYYY-MM-DD)'),
        priority: z.enum(['high', 'medium', 'low']).optional().describe('Task priority'),
        tags: z.string().optional().describe('Comma-separated tags to apply to the task')
      },
      ({ title, description, dueDate, priority, tags }) => {
        const parts = [`Create a task in Tana: "${title}"`];
        
        if (description) parts.push(`Description: ${description}`);
        if (dueDate) parts.push(`Due date: ${dueDate}`);
        if (priority) parts.push(`Priority: ${priority}`);
        if (tags) parts.push(`Tags: ${tags}`);
        
        return {
          messages: [{
            role: 'user',
            content: {
              type: 'text',
              text: parts.join('\n')
            }
          }]
        };
      }
    );

    // Prompt for creating a project
    this.server.prompt(
      'create-project',
      'Create a project structure in Tana with goals and milestones',
      {
        name: z.string().describe('Project name'),
        description: z.string().optional().describe('Project description'),
        goals: z.string().optional().describe('Comma-separated list of project goals'),
        startDate: z.string().optional().describe('Start date in ISO format'),
        endDate: z.string().optional().describe('End date in ISO format'),
        team: z.string().optional().describe('Comma-separated team member names')
      },
      ({ name, description, goals, startDate, endDate, team }) => {
        const parts = [`Create a project in Tana: "${name}"`];
        
        if (description) parts.push(`Description: ${description}`);
        if (goals) {
          parts.push('Goals:');
          const goalList = goals.split(',').map(g => g.trim());
          goalList.forEach(goal => parts.push(`- ${goal}`));
        }
        if (startDate) parts.push(`Start date: ${startDate}`);
        if (endDate) parts.push(`End date: ${endDate}`);
        if (team) parts.push(`Team: ${team}`);
        
        return {
          messages: [{
            role: 'user',
            content: {
              type: 'text',
              text: parts.join('\n')
            }
          }]
        };
      }
    );

    // Prompt for creating meeting notes
    this.server.prompt(
      'create-meeting-notes',
      'Create structured meeting notes in Tana',
      {
        title: z.string().describe('Meeting title'),
        date: z.string().describe('Meeting date in ISO format'),
        attendees: z.string().describe('Comma-separated list of attendees'),
        agenda: z.string().optional().describe('Comma-separated meeting agenda items'),
        notes: z.string().optional().describe('Meeting notes'),
        actionItems: z.string().optional().describe('Action items as JSON string array with task, assignee, and dueDate fields')
      },
      ({ title, date, attendees, agenda, notes, actionItems }) => {
        const parts = [
          `Create meeting notes in Tana:`,
          `Title: ${title}`,
          `Date: ${date}`,
          `Attendees: ${attendees}`
        ];
        
        if (agenda) {
          parts.push('\nAgenda:');
          const agendaItems = agenda.split(',').map(a => a.trim());
          agendaItems.forEach(item => parts.push(`- ${item}`));
        }
        
        if (notes) {
          parts.push(`\nNotes:\n${notes}`);
        }
        
        if (actionItems) {
          parts.push('\nAction Items:');
          try {
            const items = JSON.parse(actionItems);
            if (Array.isArray(items)) {
              items.forEach((item: any) => {
                let actionText = `- ${item.task}`;
                if (item.assignee) actionText += ` (assigned to: ${item.assignee})`;
                if (item.dueDate) actionText += ` [due: ${item.dueDate}]`;
                parts.push(actionText);
              });
            }
          } catch (e) {
            parts.push(`- ${actionItems}`);
          }
        }
        
        return {
          messages: [{
            role: 'user',
            content: {
              type: 'text',
              text: parts.join('\n')
            }
          }]
        };
      }
    );

    // Prompt for knowledge base entry
    this.server.prompt(
      'create-knowledge-entry',
      'Create a knowledge base entry in Tana',
      {
        topic: z.string().describe('Topic or title'),
        category: z.string().optional().describe('Category or type'),
        content: z.string().describe('Main content'),
        sources: z.string().optional().describe('Comma-separated reference sources or links'),
        relatedTopics: z.string().optional().describe('Comma-separated related topics for linking')
      },
      ({ topic, category, content, sources, relatedTopics }) => {
        const parts = [`Create a knowledge entry in Tana about: "${topic}"`];
        
        if (category) parts.push(`Category: ${category}`);
        parts.push(`\nContent:\n${content}`);
        
        if (sources) {
          parts.push('\nSources:');
          const sourceList = sources.split(',').map(s => s.trim());
          sourceList.forEach(source => parts.push(`- ${source}`));
        }
        
        if (relatedTopics) {
          parts.push(`\nRelated topics: ${relatedTopics}`);
        }
        
        return {
          messages: [{
            role: 'user',
            content: {
              type: 'text',
              text: parts.join('\n')
            }
          }]
        };
      }
    );
  }

  /**
   * Register resources for interacting with Tana
   */
  private registerResources(): void {
    // API documentation resource
    this.server.resource(
      'api-docs',
      'tana://api/documentation',
      {
        name: 'Tana API Documentation',
        description: 'Overview of Tana Input API capabilities and usage',
        mimeType: 'text/markdown'
      },
      async () => ({
        contents: [{
          uri: 'tana://api/documentation',
          mimeType: 'text/markdown',
          text: `# Tana Input API Documentation

## Overview
This MCP server provides access to Tana's Input API, allowing you to create and manipulate nodes in your Tana workspace.

## Available Node Types
- **Plain nodes**: Basic text nodes with optional formatting
- **Reference nodes**: Links to existing nodes by ID
- **Date nodes**: Nodes representing dates
- **URL nodes**: Web links with metadata
- **Checkbox nodes**: Boolean/task nodes
- **File nodes**: Attachments with base64 encoded data
- **Field nodes**: Structured data fields

## Tools Available

### Basic Node Creation
- \`create_plain_node\`: Create a simple text node
- \`create_reference_node\`: Create a reference to another node
- \`create_date_node\`: Create a date node
- \`create_url_node\`: Create a URL node
- \`create_checkbox_node\`: Create a checkbox/task node
- \`create_file_node\`: Create a file attachment node

### Advanced Features
- \`create_field_node\`: Create structured field nodes
- \`create_node_structure\`: Create complex nested node structures
- \`set_node_name\`: Update the name of an existing node

### Schema Management
- \`create_supertag\`: Create new supertags (node types)
- \`create_field\`: Create new field definitions

## API Limits
- Maximum 100 nodes per request
- 1 request per second per token
- Payload limit: 5000 characters
- Workspace limit: 750k nodes`
        }]
      })
    );

    // Node types reference
    this.server.resource(
      'node-types',
      'tana://reference/node-types',
      {
        name: 'Tana Node Types Reference',
        description: 'Detailed information about all supported node types',
        mimeType: 'text/markdown'
      },
      async () => ({
        contents: [{
          uri: 'tana://reference/node-types',
          mimeType: 'text/markdown',
          text: `# Tana Node Types Reference

## Plain Node
The most basic node type, used for text content.
\`\`\`json
{
  "name": "Node title",
  "description": "Node content with **formatting**",
  "supertags": [{"id": "tagId"}],
  "children": []
}
\`\`\`

## Reference Node
Links to an existing node.
\`\`\`json
{
  "dataType": "reference",
  "id": "targetNodeId"
}
\`\`\`

## Date Node
Represents a date value.
\`\`\`json
{
  "dataType": "date",
  "name": "2024-01-01",
  "description": "Optional description"
}
\`\`\`

## URL Node
Stores web links.
\`\`\`json
{
  "dataType": "url",
  "name": "https://example.com",
  "description": "Link description"
}
\`\`\`

## Checkbox Node
Boolean/task nodes.
\`\`\`json
{
  "dataType": "boolean",
  "name": "Task name",
  "value": false
}
\`\`\`

## File Node
File attachments.
\`\`\`json
{
  "dataType": "file",
  "file": "base64EncodedData",
  "filename": "document.pdf",
  "contentType": "application/pdf"
}
\`\`\`

## Field Node
Structured data fields.
\`\`\`json
{
  "type": "field",
  "attributeId": "fieldId",
  "children": [/* nested nodes */]
}
\`\`\``
        }]
      })
    );

    // Examples resource
    this.server.resource(
      'examples',
      'tana://examples/common-patterns',
      {
        name: 'Common Usage Examples',
        description: 'Example patterns for common Tana operations',
        mimeType: 'text/markdown'
      },
      async () => ({
        contents: [{
          uri: 'tana://examples/common-patterns',
          mimeType: 'text/markdown',
          text: `# Common Tana Usage Examples

## Creating a Task with Due Date
\`\`\`javascript
// Use create_checkbox_node with a child date node
{
  "name": "Complete project proposal",
  "checked": false,
  "children": [
    {
      "type": "field",
      "attributeId": "SYS_A13", // Due date field
      "children": [{
        "dataType": "date",
        "name": "2024-12-31"
      }]
    }
  ]
}
\`\`\`

## Creating a Project Structure
\`\`\`javascript
// Use create_node_structure for complex hierarchies
{
  "name": "Q1 2024 Product Launch",
  "supertags": [{"id": "projectTagId"}],
  "children": [
    {
      "name": "Milestones",
      "children": [
        {"name": "Design Complete", "dataType": "date", "name": "2024-01-15"},
        {"name": "Development Done", "dataType": "date", "name": "2024-02-28"}
      ]
    },
    {
      "name": "Tasks",
      "children": [
        {"dataType": "boolean", "name": "Create mockups", "value": false},
        {"dataType": "boolean", "name": "Write documentation", "value": false}
      ]
    }
  ]
}
\`\`\`

## Adding Multiple Tags
\`\`\`javascript
{
  "name": "Important Note",
  "supertags": [
    {"id": "tag1Id"},
    {"id": "tag2Id", "fields": {"priority": "high"}}
  ]
}
\`\`\``
        }]
      })
    );

    // Server info resource
    this.server.resource(
      'server-info',
      'tana://info',
      {
        name: 'Server Information',
        description: 'Current server status and configuration',
        mimeType: 'text/plain'
      },
      async () => ({
        contents: [{
          uri: 'tana://info',
          mimeType: 'text/plain',
          text: `Tana MCP Server v1.2.0
Status: Connected
API Endpoint: ${this.tanaClient['endpoint']}

Capabilities:
- Tools: Multiple tools available for node creation and management
- Prompts: Pre-configured prompts for common tasks  
- Resources: Documentation and examples available

For detailed API documentation, see the 'api-docs' resource.
For examples, see the 'examples' resource.
For mirror data, see 'tana://mirror/*' resources.
For publish pages, see 'tana://publish/*' resources.`
        }]
      })
    );

    // Mirror resources - local mirror data
    this.registerMirrorResources();

    // Publish resources - scraped Tana Publish pages  
    this.registerPublishResources();
  }

  /**
   * Register schema management tools
   */
  private registerSchemaManagementTools(): void {
    // Add schema tool
    this.server.tool(
      'add_schema',
      'Add a new supertag schema to generate typed tools. Provide the complete schema definition including fields and validation rules.',
      {
        schema: z.object({
          id: z.string(),
          name: z.string(),
          description: z.string().optional(),
          fields: z.array(z.object({
            id: z.string(),
            name: z.string(),
            type: z.enum(['text', 'date', 'url', 'boolean', 'number', 'reference']),
            required: z.boolean().optional(),
            description: z.string().optional(),
            defaultValue: z.string().optional(),
            validation: z.object({
              pattern: z.string().optional(),
              min: z.number().optional(),
              max: z.number().optional(),
              options: z.array(z.string()).optional()
            }).optional()
          })),
          toolDescription: z.string().optional(),
          examples: z.array(z.object({
            title: z.string(),
            description: z.string(),
            input: z.record(z.any())
          })).optional()
        })
      },
      async ({ schema }: { schema: any }) => {
        try {
          await this.schemaManager.addSchema(schema);
          
          // Regenerate tools after adding schema
          await this.schemaToolGenerator.generateAndRegisterTools(this.server, {
            prefix: 'create_',
            includePrompts: true,
            validateInputs: true,
            normalizeInputs: true
          });

          return {
            content: [
              {
                type: 'text',
                text: `Schema '${schema.name}' added successfully. Generated tool: create_${schema.name.toLowerCase().replace(/\s+/g, '_')}`
              }
            ],
            isError: false
          };
        } catch (error) {
          return {
            content: [
              {
                type: 'text',
                text: `Error adding schema: ${error instanceof Error ? error.message : String(error)}`
              }
            ],
            isError: true
          };
        }
      }
    );

    // Update mappings tool
    this.server.tool(
      'update_mappings',
      'Update name→ID mappings for supertags and fields. Use this to map human-readable names to Tana workspace IDs.',
      {
        supertags: z.record(z.string()).optional(),
        fields: z.record(z.string()).optional()
      },
      async ({ supertags, fields }: { supertags?: Record<string, string>; fields?: Record<string, string> }) => {
        try {
          await this.schemaManager.updateMappings({ supertags, fields });

          return {
            content: [
              {
                type: 'text',
                text: 'Name→ID mappings updated successfully'
              }
            ],
            isError: false
          };
        } catch (error) {
          return {
            content: [
              {
                type: 'text',
                text: `Error updating mappings: ${error instanceof Error ? error.message : String(error)}`
              }
            ],
            isError: true
          };
        }
      }
    );

    // Get schemas tool
    this.server.tool(
      'get_schemas',
      'Get all configured schemas and their generated tools',
      {},
      async () => {
        try {
          const schemas = await this.schemaManager.getSchemas();
          const generatedTools = this.schemaManager.getGeneratedToolsMeta();

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  schemas,
                  generatedTools: generatedTools.map(tool => ({
                    toolName: tool.toolName,
                    schemaName: tool.schema.name,
                    generatedAt: tool.generatedAt
                  }))
                }, null, 2)
              }
            ],
            isError: false
          };
        } catch (error) {
          return {
            content: [
              {
                type: 'text',
                text: `Error getting schemas: ${error instanceof Error ? error.message : String(error)}`
              }
            ],
            isError: true
          };
        }
      }
    );

    // Get configuration tool
    this.server.tool(
      'get_config',
      'Get the current schema configuration including mappings and validation settings',
      {},
      async () => {
        try {
          const config = await this.schemaManager.getConfig();

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(config, null, 2)
              }
            ],
            isError: false
          };
        } catch (error) {
          return {
            content: [
              {
                type: 'text',
                text: `Error getting configuration: ${error instanceof Error ? error.message : String(error)}`
              }
            ],
            isError: true
          };
        }
      }
    );
  }

  /**
   * Register mirror and publish management tools
   */
  private registerMirrorAndPublishTools(): void {
    // Query mirror tool
    this.server.tool(
      'query_mirror',
      'Query nodes from the local mirror. Returns copies of nodes created by this server.',
      {
        category: z.string().optional().describe('Filter by category (tasks, projects, notes, etc.)'),
        supertag: z.string().optional().describe('Filter by supertag ID'),
        since: z.string().optional().describe('Filter by date (ISO 8601 timestamp)'),
        limit: z.number().optional().default(50).describe('Maximum number of results (default 50)')
      },
      async ({ category, supertag, since, limit }) => {
        try {
          const results = await this.mirrorStorage.queryNodes({ category, supertag, since, limit });
          
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  total: results.length,
                  results: results.map(entry => ({
                    id: entry.id,
                    category: entry.category,
                    supertags: entry.supertags,
                    timestamp: entry.timestamp,
                    nodeData: entry.nodeData
                  }))
                }, null, 2)
              }
            ],
            isError: false
          };
        } catch (error) {
          return {
            content: [
              {
                type: 'text',
                text: `Error querying mirror: ${error instanceof Error ? error.message : String(error)}`
              }
            ],
            isError: true
          };
        }
      }
    );

    // Get mirror stats tool
    this.server.tool(
      'get_mirror_stats',
      'Get statistics about the local mirror storage',
      {},
      async () => {
        try {
          const stats = await this.mirrorStorage.getStats();
          const categories = await this.mirrorStorage.getCategories();
          const supertags = await this.mirrorStorage.getSupertags();
          
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  ...stats,
                  availableCategories: categories,
                  availableSupertags: supertags
                }, null, 2)
              }
            ],
            isError: false
          };
        } catch (error) {
          return {
            content: [
              {
                type: 'text',
                text: `Error getting mirror stats: ${error instanceof Error ? error.message : String(error)}`
              }
            ],
            isError: true
          };
        }
      }
    );

    // Add publish page tool
    this.server.tool(
      'add_publish_page',
      'Add a Tana Publish page to monitor and scrape for read-only content',
      {
        slug: z.string().describe('Unique identifier for this publish page'),
        url: z.string().url().describe('URL of the Tana Publish page'),
        title: z.string().optional().describe('Optional title for the page'),
        scrapeInterval: z.number().optional().default(60).describe('Scrape interval in minutes (default 60)')
      },
      async ({ slug, url, title, scrapeInterval }) => {
        try {
          await this.publishScraper.addPublishPage(slug, url, { title, scrapeInterval });
          
          return {
            content: [
              {
                type: 'text',
                text: `Publish page '${slug}' added successfully. Content will be available at tana://publish/${slug}`
              }
            ],
            isError: false
          };
        } catch (error) {
          return {
            content: [
              {
                type: 'text',
                text: `Error adding publish page: ${error instanceof Error ? error.message : String(error)}`
              }
            ],
            isError: true
          };
        }
      }
    );

    // Remove publish page tool
    this.server.tool(
      'remove_publish_page',
      'Remove a Tana Publish page from monitoring',
      {
        slug: z.string().describe('Unique identifier of the publish page to remove')
      },
      async ({ slug }) => {
        try {
          await this.publishScraper.removePublishPage(slug);
          
          return {
            content: [
              {
                type: 'text',
                text: `Publish page '${slug}' removed successfully`
              }
            ],
            isError: false
          };
        } catch (error) {
          return {
            content: [
              {
                type: 'text',
                text: `Error removing publish page: ${error instanceof Error ? error.message : String(error)}`
              }
            ],
            isError: true
          };
        }
      }
    );

    // List publish pages tool
    this.server.tool(
      'list_publish_pages',
      'List all configured Tana Publish pages',
      {},
      async () => {
        try {
          const pages = await this.publishScraper.getPublishPages();
          
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(pages, null, 2)
              }
            ],
            isError: false
          };
        } catch (error) {
          return {
            content: [
              {
                type: 'text',
                text: `Error listing publish pages: ${error instanceof Error ? error.message : String(error)}`
              }
            ],
            isError: true
          };
        }
      }
    );

    // Scrape publish page tool
    this.server.tool(
      'scrape_publish_page',
      'Manually scrape a specific Tana Publish page',
      {
        slug: z.string().describe('Unique identifier of the publish page to scrape'),
        force: z.boolean().optional().default(false).describe('Force scrape even if within interval')
      },
      async ({ slug, force }) => {
        try {
          const content = await this.publishScraper.scrapePage(slug, force);
          
          return {
            content: [
              {
                type: 'text',
                text: `Scraped '${content.title}' (${content.wordCount} words) at ${content.lastScraped}`
              }
            ],
            isError: false
          };
        } catch (error) {
          return {
            content: [
              {
                type: 'text',
                text: `Error scraping publish page: ${error instanceof Error ? error.message : String(error)}`
              }
            ],
            isError: true
          };
        }
      }
    );

    // Get publish page content tool
    this.server.tool(
      'get_publish_page',
      'Get content from a specific scraped Tana Publish page',
      {
        slug: z.string().describe('Unique identifier of the publish page')
      },
      async ({ slug }) => {
        try {
          const content = await this.publishScraper.getCachedContent(slug);
          
          return {
            content: [
              {
                type: 'text',
                text: `# ${content.title}

**Source:** ${content.url}  
**Last Updated:** ${content.lastScraped}  
**Word Count:** ${content.wordCount}

---

${content.content}`
              }
            ],
            isError: false
          };
        } catch (error) {
          return {
            content: [
              {
                type: 'text',
                text: `Error getting publish page: ${error instanceof Error ? error.message : String(error)}`
              }
            ],
            isError: true
          };
        }
      }
    );

    // Rename tool - simple wrapper around set_node_name
    this.server.tool(
      'rename',
      'Rename a node by setting its name',
      {
        nodeId: z.string().describe('ID of the node to rename'),
        newName: z.string().describe('New name for the node')
      },
      async ({ nodeId, newName }) => {
        try {
          const result = await this.tanaClient.setNodeName(nodeId, newName);

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result, null, 2)
              }
            ],
            isError: false
          };
        } catch (error) {
          return {
            content: [
              {
                type: 'text',
                text: `Error renaming node: ${error instanceof Error ? error.message : String(error)}`
              }
            ],
            isError: true
          };
        }
      }
    );

    // Append children tool - append multiple nodes to an existing target
    this.server.tool(
      'append_children',
      'Append children nodes to an existing target node (supports INBOX, SCHEMA, or any nodeId)',
      {
        targetNodeId: z.string().describe('ID of target node to append to (use "INBOX", "SCHEMA", or specific node ID)'),
        children: z.array(NodeSchema).describe('Array of child nodes to append')
      },
      async ({ targetNodeId, children }) => {
        try {
          // Cast children to TanaNode array to satisfy the type system
          const result = await this.tanaClient.createNodes(targetNodeId, children as any[]);

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result, null, 2)
              }
            ],
            isError: false
          };
        } catch (error) {
          return {
            content: [
              {
                type: 'text',
                text: `Error appending children: ${error instanceof Error ? error.message : String(error)}`
              }
            ],
            isError: true
          };
        }
      }
    );
  }

  /**
   * Register mirror resources for local mirror data
   */
  private registerMirrorResources(): void {
    // Mirror tasks resource
    this.server.resource(
      'mirror-tasks',
      'tana://mirror/tasks',
      {
        name: 'Mirror: Tasks',
        description: 'Tasks and boolean nodes created by this server',
        mimeType: 'application/json'
      },
      async () => {
        try {
          const tasks = await this.mirrorStorage.queryNodes({ category: 'tasks', limit: 100 });
          return {
            contents: [{
              uri: 'tana://mirror/tasks',
              mimeType: 'application/json',
              text: JSON.stringify({
                type: 'mirror_data',
                category: 'tasks',
                count: tasks.length,
                tasks: tasks.map(entry => ({
                  id: entry.id,
                  name: 'name' in entry.nodeData ? entry.nodeData.name : 'Unnamed',
                  checked: 'value' in entry.nodeData ? entry.nodeData.value : false,
                  timestamp: entry.timestamp,
                  supertags: entry.supertags
                }))
              }, null, 2)
            }]
          };
        } catch (error) {
          return {
            contents: [{
              uri: 'tana://mirror/tasks',
              mimeType: 'text/plain',
              text: `Error loading mirror tasks: ${error instanceof Error ? error.message : String(error)}`
            }]
          };
        }
      }
    );

    // Mirror projects resource
    this.server.resource(
      'mirror-projects',
      'tana://mirror/projects',
      {
        name: 'Mirror: Projects',
        description: 'Project nodes created by this server',
        mimeType: 'application/json'
      },
      async () => {
        try {
          const projects = await this.mirrorStorage.queryNodes({ category: 'projects', limit: 100 });
          return {
            contents: [{
              uri: 'tana://mirror/projects',
              mimeType: 'application/json',
              text: JSON.stringify({
                type: 'mirror_data',
                category: 'projects',
                count: projects.length,
                projects: projects.map(entry => ({
                  id: entry.id,
                  name: 'name' in entry.nodeData ? entry.nodeData.name : 'Unnamed',
                  description: 'description' in entry.nodeData ? entry.nodeData.description : undefined,
                  timestamp: entry.timestamp,
                  supertags: entry.supertags
                }))
              }, null, 2)
            }]
          };
        } catch (error) {
          return {
            contents: [{
              uri: 'tana://mirror/projects',
              mimeType: 'text/plain',
              text: `Error loading mirror projects: ${error instanceof Error ? error.message : String(error)}`
            }]
          };
        }
      }
    );

    // Mirror notes resource
    this.server.resource(
      'mirror-notes',
      'tana://mirror/notes',
      {
        name: 'Mirror: Notes',
        description: 'General notes and plain nodes created by this server',
        mimeType: 'application/json'
      },
      async () => {
        try {
          const notes = await this.mirrorStorage.queryNodes({ category: 'notes', limit: 100 });
          return {
            contents: [{
              uri: 'tana://mirror/notes',
              mimeType: 'application/json',
              text: JSON.stringify({
                type: 'mirror_data',
                category: 'notes',
                count: notes.length,
                notes: notes.map(entry => ({
                  id: entry.id,
                  name: 'name' in entry.nodeData ? entry.nodeData.name : 'Unnamed',
                  description: 'description' in entry.nodeData ? entry.nodeData.description : undefined,
                  timestamp: entry.timestamp,
                  supertags: entry.supertags
                }))
              }, null, 2)
            }]
          };
        } catch (error) {
          return {
            contents: [{
              uri: 'tana://mirror/notes',
              mimeType: 'text/plain',
              text: `Error loading mirror notes: ${error instanceof Error ? error.message : String(error)}`
            }]
          };
        }
      }
    );

    // Mirror stats resource
    this.server.resource(
      'mirror-stats',
      'tana://mirror/stats',
      {
        name: 'Mirror: Statistics',
        description: 'Statistics about the local mirror storage',
        mimeType: 'application/json'
      },
      async () => {
        try {
          const stats = await this.mirrorStorage.getStats();
          const categories = await this.mirrorStorage.getCategories();
          return {
            contents: [{
              uri: 'tana://mirror/stats',
              mimeType: 'application/json',
              text: JSON.stringify({
                type: 'mirror_stats',
                ...stats,
                availableCategories: categories,
                availableResources: [
                  'tana://mirror/tasks',
                  'tana://mirror/projects', 
                  'tana://mirror/notes',
                  'tana://mirror/stats'
                ]
              }, null, 2)
            }]
          };
        } catch (error) {
          return {
            contents: [{
              uri: 'tana://mirror/stats',
              mimeType: 'text/plain',
              text: `Error loading mirror stats: ${error instanceof Error ? error.message : String(error)}`
            }]
          };
        }
      }
    );
  }

  /**
   * Register publish resources for scraped Tana Publish pages
   */
  private registerPublishResources(): void {
    // Publish index resource
    this.server.resource(
      'publish-index',
      'tana://publish/',
      {
        name: 'Publish Pages Index',
        description: 'List of all configured Tana Publish pages',
        mimeType: 'application/json'
      },
      async () => {
        try {
          const pages = await this.publishScraper.getPublishPages();
          return {
            contents: [{
              uri: 'tana://publish/',
              mimeType: 'application/json',
              text: JSON.stringify({
                type: 'publish_index',
                count: pages.length,
                pages: pages.map(page => ({
                  slug: page.slug,
                  title: page.title || page.slug,
                  url: page.url,
                  lastScraped: page.lastScraped,
                  enabled: page.enabled,
                  resourceUri: `tana://publish/${page.slug}`
                }))
              }, null, 2)
            }]
          };
        } catch (error) {
          return {
            contents: [{
              uri: 'tana://publish/',
              mimeType: 'text/plain',
              text: `Error loading publish index: ${error instanceof Error ? error.message : String(error)}`
            }]
          };
        }
      }
    );

    // Note: Dynamic publish page resources will be handled by the resource handler
    // when a specific URI like tana://publish/slug is requested
  }

  /**
   * Get MIME type based on file extension
   */
  private getMimeType(filename: string): string {
    const ext = extname(filename).toLowerCase();
    const mimeTypes: Record<string, string> = {
      // Images
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.svg': 'image/svg+xml',
      '.bmp': 'image/bmp',
      '.ico': 'image/x-icon',
      
      // Documents
      '.pdf': 'application/pdf',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.xls': 'application/vnd.ms-excel',
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      '.ppt': 'application/vnd.ms-powerpoint',
      '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      '.txt': 'text/plain',
      '.rtf': 'application/rtf',
      '.odt': 'application/vnd.oasis.opendocument.text',
      '.ods': 'application/vnd.oasis.opendocument.spreadsheet',
      '.odp': 'application/vnd.oasis.opendocument.presentation',
      
      // Audio
      '.mp3': 'audio/mpeg',
      '.wav': 'audio/wav',
      '.ogg': 'audio/ogg',
      '.m4a': 'audio/mp4',
      '.aac': 'audio/aac',
      '.flac': 'audio/flac',
      '.wma': 'audio/x-ms-wma',
      
      // Video
      '.mp4': 'video/mp4',
      '.avi': 'video/x-msvideo',
      '.mov': 'video/quicktime',
      '.wmv': 'video/x-ms-wmv',
      '.flv': 'video/x-flv',
      '.webm': 'video/webm',
      '.mkv': 'video/x-matroska',
      
      // Archives
      '.zip': 'application/zip',
      '.rar': 'application/vnd.rar',
      '.7z': 'application/x-7z-compressed',
      '.tar': 'application/x-tar',
      '.gz': 'application/gzip',
      
      // Text/Code
      '.html': 'text/html',
      '.htm': 'text/html',
      '.xml': 'application/xml',
      '.json': 'application/json',
      '.js': 'application/javascript',
      '.css': 'text/css',
      '.csv': 'text/csv',
      '.md': 'text/markdown',
      
      // Other
      '.bin': 'application/octet-stream'
    };
    
    return mimeTypes[ext] || 'application/octet-stream';
  }

  /**
   * Extract filename from URL or Content-Disposition header
   */
  private extractFilenameFromUrl(url: string, contentDisposition?: string): string {
    // First try to get filename from Content-Disposition header
    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
      if (filenameMatch && filenameMatch[1]) {
        const filename = filenameMatch[1].replace(/['"]/g, '');
        if (filename && filename !== '') {
          return filename;
        }
      }
    }
    
    // Fallback to extracting from URL
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      const filename = pathname.split('/').pop();
      
      if (filename && filename !== '' && filename.includes('.')) {
        return decodeURIComponent(filename);
      }
    } catch (error) {
      // Invalid URL, continue to fallback
    }
    
    // Final fallback
    return 'download';
  }

} 