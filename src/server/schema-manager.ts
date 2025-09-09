/**
 * Schema Manager
 * Manages supertag schemas, name→ID mappings, and tool generation
 */

import { z } from 'zod';
import { promises as fs } from 'fs';
import { join } from 'path';
import {
  SchemaConfig,
  SupertagSchema,
  SchemaField,
  NameIdMapping,
  ToolGenerationOptions,
  GeneratedToolMeta
} from '../types/schema-config';

// Zod schemas for validation
const SchemaFieldSchema = z.object({
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
});

const SupertagSchemaSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  fields: z.array(SchemaFieldSchema),
  toolDescription: z.string().optional(),
  examples: z.array(z.object({
    title: z.string(),
    description: z.string(),
    input: z.record(z.any())
  })).optional()
});

const SchemaConfigSchema = z.object({
  version: z.string(),
  workspace: z.object({
    id: z.string().optional(),
    name: z.string().optional()
  }),
  mappings: z.object({
    supertags: z.record(z.string()),
    fields: z.record(z.string())
  }),
  schemas: z.array(SupertagSchemaSchema),
  validation: z.object({
    strictMode: z.boolean(),
    dateFormat: z.enum(['iso', 'flexible']),
    urlRequireProtocol: z.boolean()
  })
});

export class SchemaManager {
  private config: SchemaConfig | null = null;
  private configPath: string;
  private generatedTools: Map<string, GeneratedToolMeta> = new Map();

  constructor(configPath?: string) {
    this.configPath = configPath || join(process.cwd?.() || '.', 'tana-schema-config.json');
  }

  /**
   * Load schema configuration from file
   */
  async loadConfig(): Promise<SchemaConfig> {
    try {
      const configData = await fs.readFile(this.configPath, 'utf-8');
      const rawConfig = JSON.parse(configData);
      
      // Validate the configuration
      const validatedConfig = SchemaConfigSchema.parse(rawConfig);
      this.config = validatedConfig;
      
      return validatedConfig;
    } catch (error) {
      if ((error as any).code === 'ENOENT') {
        // File doesn't exist, create default config
        const defaultConfig = this.createDefaultConfig();
        await this.saveConfig(defaultConfig);
        this.config = defaultConfig;
        return defaultConfig;
      }
      throw new Error(`Failed to load schema config: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Save schema configuration to file
   */
  async saveConfig(config: SchemaConfig): Promise<void> {
    try {
      // Validate before saving
      SchemaConfigSchema.parse(config);
      
      const configData = JSON.stringify(config, null, 2);
      await fs.writeFile(this.configPath, configData, 'utf-8');
      this.config = config;
    } catch (error) {
      throw new Error(`Failed to save schema config: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Create default configuration
   */
  private createDefaultConfig(): SchemaConfig {
    return {
      version: '1.0.0',
      workspace: {
        name: 'Default Workspace'
      },
      mappings: {
        supertags: {},
        fields: {}
      },
      schemas: [],
      validation: {
        strictMode: false,
        dateFormat: 'iso',
        urlRequireProtocol: true
      }
    };
  }

  /**
   * Add a new supertag schema
   */
  async addSchema(schema: SupertagSchema): Promise<void> {
    if (!this.config) {
      await this.loadConfig();
    }

    // Validate the schema
    SupertagSchemaSchema.parse(schema);

    // Check for duplicate IDs
    const existingSchema = this.config!.schemas.find(s => s.id === schema.id);
    if (existingSchema) {
      throw new Error(`Schema with ID '${schema.id}' already exists`);
    }

    // Add to config
    this.config!.schemas.push(schema);
    
    // Save updated config
    await this.saveConfig(this.config!);
  }

  /**
   * Update name→ID mappings
   */
  async updateMappings(mappings: Partial<NameIdMapping>): Promise<void> {
    if (!this.config) {
      await this.loadConfig();
    }

    if (mappings.supertags) {
      Object.assign(this.config!.mappings.supertags, mappings.supertags);
    }
    
    if (mappings.fields) {
      Object.assign(this.config!.mappings.fields, mappings.fields);
    }

    await this.saveConfig(this.config!);
  }

  /**
   * Get all schemas
   */
  async getSchemas(): Promise<SupertagSchema[]> {
    if (!this.config) {
      await this.loadConfig();
    }
    return this.config!.schemas;
  }

  /**
   * Get schema by ID
   */
  async getSchema(id: string): Promise<SupertagSchema | undefined> {
    const schemas = await this.getSchemas();
    return schemas.find(s => s.id === id);
  }

  /**
   * Get schema by name (using mappings)
   */
  async getSchemaByName(name: string): Promise<SupertagSchema | undefined> {
    if (!this.config) {
      await this.loadConfig();
    }
    
    const schemaId = this.config!.mappings.supertags[name];
    if (!schemaId) {
      return undefined;
    }
    
    return this.getSchema(schemaId);
  }

  /**
   * Resolve field ID from name
   */
  async resolveFieldId(fieldName: string): Promise<string | undefined> {
    if (!this.config) {
      await this.loadConfig();
    }
    return this.config!.mappings.fields[fieldName];
  }

  /**
   * Resolve supertag ID from name
   */
  async resolveSupertagId(supertagName: string): Promise<string | undefined> {
    if (!this.config) {
      await this.loadConfig();
    }
    return this.config!.mappings.supertags[supertagName];
  }

  /**
   * Generate tool names from schemas
   */
  async getGeneratedToolNames(options: ToolGenerationOptions = {}): Promise<string[]> {
    const schemas = await this.getSchemas();
    const prefix = options.prefix || 'create_';
    
    return schemas.map(schema => {
      const toolName = this.schemaNameToToolName(schema.name, prefix);
      return toolName;
    });
  }

  /**
   * Convert schema name to tool name
   */
  private schemaNameToToolName(schemaName: string, prefix: string = 'create_'): string {
    // Convert "Task" -> "create_task", "Meeting Notes" -> "create_meeting_notes"
    const cleanName = schemaName
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '') // Remove special chars
      .replace(/\s+/g, '_') // Replace spaces with underscores
      .replace(/_+/g, '_'); // Remove duplicate underscores
    
    return `${prefix}${cleanName}`;
  }

  /**
   * Get current configuration
   */
  async getConfig(): Promise<SchemaConfig> {
    if (!this.config) {
      await this.loadConfig();
    }
    return this.config!;
  }

  /**
   * Register a generated tool
   */
  registerGeneratedTool(toolName: string, schemaId: string, schema: SupertagSchema): void {
    this.generatedTools.set(toolName, {
      toolName,
      schemaId,
      schema,
      generatedAt: new Date()
    });
  }

  /**
   * Get metadata for generated tools
   */
  getGeneratedToolsMeta(): GeneratedToolMeta[] {
    return Array.from(this.generatedTools.values());
  }
}