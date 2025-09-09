/**
 * Schema-Based Tool Generator
 * Generates typed MCP tools from supertag schemas
 */

import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SupertagSchema, SchemaField, ToolGenerationOptions } from '../types/schema-config';
import { TanaClient } from './tana-client';
import { SchemaManager } from './schema-manager';
import { InputValidator } from './input-validator';
import { TanaPlainNode, TanaSupertag } from '../types/tana-api';

export class SchemaToolGenerator {
  private schemaManager: SchemaManager;
  private tanaClient: TanaClient;
  private validator: InputValidator;

  constructor(schemaManager: SchemaManager, tanaClient: TanaClient, validator: InputValidator) {
    this.schemaManager = schemaManager;
    this.tanaClient = tanaClient;
    this.validator = validator;
  }

  /**
   * Generate and register all schema-based tools
   */
  async generateAndRegisterTools(server: McpServer, options: ToolGenerationOptions = {}): Promise<void> {
    const schemas = await this.schemaManager.getSchemas();
    
    for (const schema of schemas) {
      await this.generateSchemaBasedTool(server, schema, options);
    }
  }

  /**
   * Generate a single schema-based tool
   */
  private async generateSchemaBasedTool(
    server: McpServer, 
    schema: SupertagSchema, 
    options: ToolGenerationOptions
  ): Promise<void> {
    const toolName = this.generateToolName(schema, options.prefix);
    const zodSchema = this.generateZodSchema(schema);
    const description = this.generateToolDescription(schema);

    // Register the tool with the MCP server
    server.tool(
      toolName,
      description,
      zodSchema,
      async (params: any) => {
        try {
          return await this.handleSchemaBasedToolCall(schema, params);
        } catch (error) {
          return {
            content: [
              {
                type: 'text' as const,
                text: `Error in ${toolName}: ${error instanceof Error ? error.message : String(error)}`
              }
            ],
            isError: true
          };
        }
      }
    );

    // Register the generated tool metadata
    this.schemaManager.registerGeneratedTool(toolName, schema.id, schema);
  }

  /**
   * Handle a schema-based tool call
   */
  private async handleSchemaBasedToolCall(schema: SupertagSchema, params: any) {
    const { targetNodeId, ...fieldValues } = params;

    // Validate and normalize field values
    const validationResult = this.validator.validateFields(fieldValues, schema.fields);
    
    if (!validationResult.isValid) {
      const errorMessages = Object.entries(validationResult.errors)
        .map(([field, errors]) => `${field}: ${errors.join(', ')}`)
        .join('\n');
      
      return {
        content: [
          {
            type: 'text' as const,
            text: `Validation errors:\n${errorMessages}`
          }
        ],
        isError: true
      };
    }

    // Build the Tana node
    const node = await this.buildTanaNode(schema, validationResult.normalizedValues);
    
    // Create the node in Tana
    const result = await this.tanaClient.createNode(targetNodeId, node);

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(result, null, 2)
        }
      ],
      isError: false
    };
  }

  /**
   * Build a Tana node from schema and validated values
   */
  private async buildTanaNode(schema: SupertagSchema, values: Record<string, any>): Promise<TanaPlainNode> {
    // Get the supertag ID
    const supertagId = await this.schemaManager.resolveSupertagId(schema.name) || schema.id;
    
    // Create the base node
    const node: TanaPlainNode = {
      name: values.name || schema.name,
      description: values.description || schema.description,
      supertags: [
        {
          id: supertagId,
          fields: {}
        }
      ]
    };

    // Add field values to the supertag
    const supertag = node.supertags![0];
    
    for (const field of schema.fields) {
      if (values[field.name] !== undefined) {
        const fieldId = await this.schemaManager.resolveFieldId(field.name) || field.id;
        supertag.fields![fieldId] = this.convertValueForTana(values[field.name], field);
      }
    }

    // Add child nodes for complex field types
    if (this.hasComplexFields(schema)) {
      node.children = await this.buildChildNodes(schema, values);
    }

    return node;
  }

  /**
   * Convert field value to appropriate format for Tana
   */
  private convertValueForTana(value: any, field: SchemaField): string {
    switch (field.type) {
      case 'boolean':
        return value ? 'true' : 'false';
      case 'date':
        // Ensure ISO format for dates
        return value;
      case 'number':
        return String(value);
      default:
        return String(value);
    }
  }

  /**
   * Check if schema has complex fields that need child nodes
   */
  private hasComplexFields(schema: SupertagSchema): boolean {
    return schema.fields.some(field => 
      field.type === 'date' || 
      field.type === 'reference' || 
      field.type === 'boolean'
    );
  }

  /**
   * Build child nodes for complex field types
   */
  private async buildChildNodes(schema: SupertagSchema, values: Record<string, any>): Promise<any[]> {
    const children: any[] = [];

    for (const field of schema.fields) {
      const value = values[field.name];
      if (value === undefined) continue;

      const fieldId = await this.schemaManager.resolveFieldId(field.name) || field.id;

      switch (field.type) {
        case 'date':
          children.push({
            type: 'field',
            attributeId: fieldId,
            children: [
              {
                dataType: 'date',
                name: value
              }
            ]
          });
          break;

        case 'boolean':
          children.push({
            type: 'field',
            attributeId: fieldId,
            children: [
              {
                dataType: 'boolean',
                name: field.name,
                value: value
              }
            ]
          });
          break;

        case 'reference':
          children.push({
            type: 'field',
            attributeId: fieldId,
            children: [
              {
                dataType: 'reference',
                id: value
              }
            ]
          });
          break;
      }
    }

    return children;
  }

  /**
   * Generate tool name from schema
   */
  private generateToolName(schema: SupertagSchema, prefix: string = 'create_'): string {
    const cleanName = schema.name
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '_')
      .replace(/_+/g, '_');
    
    return `${prefix}${cleanName}`;
  }

  /**
   * Generate Zod schema for tool parameters
   */
  private generateZodSchema(schema: SupertagSchema): Record<string, z.ZodType<any>> {
    const zodFields: Record<string, z.ZodType<any>> = {
      targetNodeId: z.string().optional().describe('Optional target node ID to create this node under')
    };

    for (const field of schema.fields) {
      let zodType: z.ZodType<any>;

      switch (field.type) {
        case 'text':
          zodType = z.string();
          break;
        case 'date':
          zodType = z.string().describe('Date in ISO 8601 format (YYYY-MM-DD)');
          break;
        case 'url':
          zodType = z.string().url();
          break;
        case 'boolean':
          zodType = z.boolean();
          break;
        case 'number':
          zodType = z.number();
          break;
        case 'reference':
          zodType = z.string().describe('Reference to another node ID');
          break;
        default:
          zodType = z.string();
      }

      // Apply validation constraints
      if (field.validation) {
        if (field.type === 'text' && field.validation.min) {
          zodType = (zodType as z.ZodString).min(field.validation.min);
        }
        if (field.type === 'text' && field.validation.max) {
          zodType = (zodType as z.ZodString).max(field.validation.max);
        }
        if (field.type === 'number' && field.validation.min !== undefined) {
          zodType = (zodType as z.ZodNumber).min(field.validation.min);
        }
        if (field.type === 'number' && field.validation.max !== undefined) {
          zodType = (zodType as z.ZodNumber).max(field.validation.max);
        }
        if (field.validation.options) {
          zodType = z.enum(field.validation.options as [string, ...string[]]);
        }
      }

      // Make optional if not required
      if (!field.required) {
        zodType = zodType.optional();
      }

      // Add description
      if (field.description) {
        zodType = zodType.describe(field.description);
      }

      zodFields[field.name] = zodType;
    }

    return zodFields;
  }

  /**
   * Generate tool description from schema
   */
  private generateToolDescription(schema: SupertagSchema): string {
    if (schema.toolDescription) {
      return schema.toolDescription;
    }

    let description = `Create a ${schema.name}`;
    
    if (schema.description) {
      description += ` - ${schema.description}`;
    }

    if (schema.fields.length > 0) {
      const fieldNames = schema.fields.map(f => f.name).join(', ');
      description += `\n\nFields: ${fieldNames}`;
    }

    if (schema.examples && schema.examples.length > 0) {
      description += '\n\nExample:\n' + schema.examples[0].description;
    }

    return description;
  }

  /**
   * Generate MCP prompt templates from schemas
   */
  async generatePromptTemplates(server: McpServer, options: ToolGenerationOptions = {}): Promise<void> {
    if (!options.includePrompts) {
      return;
    }

    const schemas = await this.schemaManager.getSchemas();
    
    for (const schema of schemas) {
      await this.generatePromptTemplate(server, schema);
    }
  }

  /**
   * Generate a single prompt template from schema
   */
  private async generatePromptTemplate(server: McpServer, schema: SupertagSchema): Promise<void> {
    const promptName = this.generatePromptName(schema);
    const promptTemplate = this.generatePromptContent(schema);

    server.prompt(
      promptName,
      promptTemplate.description,
      promptTemplate.arguments,
      () => {
        return {
          messages: [{
            role: 'user',
            content: {
              type: 'text',
              text: promptTemplate.template
            }
          }]
        };
      }
    );
  }
  private generatePromptName(schema: SupertagSchema): string {
    const cleanName = schema.name
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '-');
    
    return `create-${cleanName}`;
  }

  /**
   * Generate prompt content from schema
   */
  private generatePromptContent(schema: SupertagSchema) {
    const description = `Interactive template for creating a ${schema.name}`;
    
    const args: Record<string, any> = {};
    
    for (const field of schema.fields) {
      args[field.name] = {
        description: field.description || `${field.name} for the ${schema.name}`,
        required: field.required || false
      };
    }

    const template = this.generatePromptText(schema);

    return {
      description,
      arguments: args,
      template
    };
  }

  /**
   * Generate prompt template text
   */
  private generatePromptText(schema: SupertagSchema): string {
    let template = `Create a ${schema.name} with the following details:\n\n`;

    for (const field of schema.fields) {
      const placeholder = `{{${field.name}}}`;
      const required = field.required ? ' (required)' : '';
      template += `- ${field.name}${required}: ${placeholder}\n`;
    }

    template += `\nThis will create a structured ${schema.name} in your Tana workspace with all the specified information organized properly.`;

    return template;
  }
}