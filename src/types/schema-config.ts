/**
 * Schema Configuration Types
 * Types for managing supertag schemas and generating typed tools
 */

// Field definition in a supertag schema
export interface SchemaField {
  id: string;
  name: string;
  type: 'text' | 'date' | 'url' | 'boolean' | 'number' | 'reference';
  required?: boolean;
  description?: string;
  defaultValue?: string;
  validation?: {
    pattern?: string;
    min?: number;
    max?: number;
    options?: string[];
  };
}

// Supertag schema definition
export interface SupertagSchema {
  id: string;
  name: string;
  description?: string;
  fields: SchemaField[];
  // Template for generating tool descriptions
  toolDescription?: string;
  // Example usage for documentation
  examples?: Array<{
    title: string;
    description: string;
    input: Record<string, any>;
  }>;
}

// Configuration mapping names to IDs
export interface NameIdMapping {
  supertags: Record<string, string>; // name -> ID
  fields: Record<string, string>;    // name -> ID
}

// Full schema configuration
export interface SchemaConfig {
  version: string;
  workspace: {
    id?: string;
    name?: string;
  };
  mappings: NameIdMapping;
  schemas: SupertagSchema[];
  // Global validation settings
  validation: {
    strictMode: boolean;
    dateFormat: 'iso' | 'flexible';
    urlRequireProtocol: boolean;
  };
}

// Tool generation options
export interface ToolGenerationOptions {
  prefix?: string; // e.g., 'create_' -> 'create_task'
  includePrompts?: boolean;
  validateInputs?: boolean;
  normalizeInputs?: boolean;
}

// Generated tool metadata
export interface GeneratedToolMeta {
  toolName: string;
  schemaId: string;
  schema: SupertagSchema;
  generatedAt: Date;
}