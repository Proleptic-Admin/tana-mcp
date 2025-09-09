# Developer Guide: Extending Schema-Aware Functionality

This guide is for developers who want to extend, modify, or contribute to the schema-aware functionality.

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Core Components](#core-components)
- [Adding New Field Types](#adding-new-field-types)
- [Extending Validation](#extending-validation)
- [Custom Tool Generation](#custom-tool-generation)
- [Adding New Schema Features](#adding-new-schema-features)
- [Testing & Development](#testing--development)
- [Contributing Guidelines](#contributing-guidelines)

## Architecture Overview

The schema-aware system consists of several key components:

```
┌─────────────────────┐
│   MCP Client        │  (Claude, Raycast, etc.)
└─────────┬───────────┘
          │ MCP Protocol
┌─────────▼───────────┐
│ Tana MCP Server     │
├─────────────────────┤
│ Schema System:      │
│ ┌─────────────────┐ │
│ │ SchemaManager   │ │  ← Configuration & persistence
│ └─────────────────┘ │
│ ┌─────────────────┐ │
│ │ InputValidator  │ │  ← Field validation & normalization
│ └─────────────────┘ │
│ ┌─────────────────┐ │
│ │ ToolGenerator   │ │  ← Dynamic tool & prompt creation
│ └─────────────────┘ │
└─────────┬───────────┘
          │ Tana API
┌─────────▼───────────┐
│   Tana Workspace    │
└─────────────────────┘
```

## Core Components

### SchemaManager (`src/server/schema-manager.ts`)

**Responsibilities**:
- Load and validate schema configuration
- Persist changes to configuration file
- Manage supertag and field mappings
- Provide schema lookup and validation

**Key Methods**:
```typescript
class SchemaManager {
  loadConfig(): Promise<SchemaConfig>
  saveConfig(config: SchemaConfig): Promise<void>
  addSchema(schema: Schema): Promise<void>
  updateMappings(mappings: Mappings): Promise<void>
  getSchemaById(id: string): Schema | undefined
  validateConfig(config: SchemaConfig): ValidationResult
}
```

**Extension Points**:
- Add new configuration formats (YAML, TOML)
- Implement remote configuration storage
- Add configuration versioning/migration
- Add schema inheritance or composition

### InputValidator (`src/server/input-validator.ts`)

**Responsibilities**:
- Validate field inputs according to type and rules
- Normalize inputs (dates, URLs, booleans)
- Provide detailed error messages
- Support custom validation patterns

**Key Methods**:
```typescript
class InputValidator {
  validateField(value: any, field: FieldDefinition): ValidationResult
  normalizeDate(dateStr: string): string
  normalizeUrl(url: string): string
  normalizeBoolean(value: any): boolean
  validatePattern(value: string, pattern: string): boolean
}
```

**Extension Points**:
- Add new field types (email, phone, color, etc.)
- Implement custom validation functions
- Add internationalization for error messages
- Support complex validation rules (conditional, cross-field)

### SchemaToolGenerator (`src/server/schema-tool-generator.ts`)

**Responsibilities**:
- Generate MCP tools from schema definitions
- Create Zod validation schemas
- Generate MCP prompts for conversational interaction
- Map human-readable names to Tana IDs

**Key Methods**:
```typescript
class SchemaToolGenerator {
  generateTools(schemas: Schema[]): McpTool[]
  generatePrompts(schemas: Schema[]): McpPrompt[]
  createZodSchema(fields: FieldDefinition[]): ZodSchema
  generateToolCall(schema: Schema, input: any): TanaApiCall
}
```

**Extension Points**:
- Add custom tool templates
- Implement tool composition (combine multiple schemas)
- Add tool versioning and deprecation
- Support different output formats (GraphQL, REST, etc.)

## Adding New Field Types

To add a new field type (e.g., "email"), follow these steps:

### 1. Update Type Definitions

Add the new type to `src/types/schema-config.ts`:

```typescript
export type FieldType = 
  | 'text'
  | 'date' 
  | 'url'
  | 'boolean'
  | 'number'
  | 'reference'
  | 'email';  // ← Add new type

export interface EmailFieldValidation {
  allowPlus?: boolean;      // Allow + in email addresses
  domains?: string[];       // Restrict to specific domains
  maxLength?: number;       // Maximum email length
}

export interface FieldValidation {
  // ... existing validation types
  email?: EmailFieldValidation;  // ← Add validation options
}
```

### 2. Add Validation Logic

Extend `InputValidator` to handle the new type:

```typescript
// In src/server/input-validator.ts
export class InputValidator {
  validateField(value: any, field: FieldDefinition): ValidationResult {
    switch (field.type) {
      // ... existing cases
      case 'email':
        return this.validateEmail(value, field.validation?.email);
      default:
        return { isValid: false, error: `Unknown field type: ${field.type}` };
    }
  }

  private validateEmail(value: any, rules?: EmailFieldValidation): ValidationResult {
    if (typeof value !== 'string') {
      return { isValid: false, error: 'Email must be a string' };
    }

    // Basic email regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      return { isValid: false, error: 'Invalid email format' };
    }

    // Apply domain restrictions
    if (rules?.domains) {
      const domain = value.split('@')[1];
      if (!rules.domains.includes(domain)) {
        return { 
          isValid: false, 
          error: `Email domain must be one of: ${rules.domains.join(', ')}` 
        };
      }
    }

    // Apply length restrictions
    if (rules?.maxLength && value.length > rules.maxLength) {
      return { 
        isValid: false, 
        error: `Email must be ${rules.maxLength} characters or less` 
      };
    }

    return { isValid: true, normalizedValue: value.toLowerCase() };
  }
}
```

### 3. Update Tool Generation

Modify `SchemaToolGenerator` to generate proper Zod schemas:

```typescript
// In src/server/schema-tool-generator.ts
private createZodFieldSchema(field: FieldDefinition): ZodSchema {
  switch (field.type) {
    // ... existing cases
    case 'email':
      let schema = z.string().email('Must be a valid email address');
      
      if (field.validation?.email?.maxLength) {
        schema = schema.max(field.validation.email.maxLength);
      }
      
      if (field.validation?.email?.domains) {
        schema = schema.refine(
          (email) => {
            const domain = email.split('@')[1];
            return field.validation!.email!.domains!.includes(domain);
          },
          { message: `Email domain must be one of: ${field.validation.email.domains.join(', ')}` }
        );
      }
      
      return schema;
  }
}
```

### 4. Add Tests

Create tests for the new field type:

```typescript
// In tests/input-validator.test.ts
describe('Email validation', () => {
  test('validates valid emails', () => {
    const result = validator.validateField('user@example.com', {
      name: 'email',
      type: 'email'
    });
    expect(result.isValid).toBe(true);
  });

  test('rejects invalid emails', () => {
    const result = validator.validateField('invalid-email', {
      name: 'email', 
      type: 'email'
    });
    expect(result.isValid).toBe(false);
  });

  test('enforces domain restrictions', () => {
    const result = validator.validateField('user@badomain.com', {
      name: 'email',
      type: 'email',
      validation: {
        email: { domains: ['example.com', 'company.org'] }
      }
    });
    expect(result.isValid).toBe(false);
  });
});
```

### 5. Update Documentation

Add the new field type to documentation:

- Update `SCHEMA-GUIDE.md` with usage examples
- Add to `QUICK-START.md` field types section
- Include in `example-schema-config.json`

## Extending Validation

### Custom Validation Functions

You can add custom validation functions that work across field types:

```typescript
export interface CustomValidation {
  function: string;          // Name of validation function
  parameters?: any;          // Parameters for the function
  errorMessage?: string;     // Custom error message
}

export interface FieldValidation {
  custom?: CustomValidation[];
}

// In InputValidator
private validateCustom(value: any, rules: CustomValidation[]): ValidationResult {
  for (const rule of rules) {
    const validator = this.customValidators[rule.function];
    if (!validator) {
      return { isValid: false, error: `Unknown validation function: ${rule.function}` };
    }
    
    const result = validator(value, rule.parameters);
    if (!result.isValid) {
      return { 
        isValid: false, 
        error: rule.errorMessage || result.error 
      };
    }
  }
  return { isValid: true };
}

// Register custom validators
registerCustomValidator('creditCard', (value: string) => {
  // Luhn algorithm implementation
  return { isValid: isValidCreditCard(value) };
});
```

### Conditional Validation

Implement validation that depends on other field values:

```typescript
export interface ConditionalValidation {
  condition: {
    field: string;           // Other field name
    operator: 'equals' | 'not_equals' | 'contains';
    value: any;
  };
  validation: FieldValidation;
}

// Usage in schema
{
  "name": "phone",
  "type": "text",
  "validation": {
    "conditional": [{
      "condition": {
        "field": "contact_method",
        "operator": "equals", 
        "value": "phone"
      },
      "validation": {
        "required": true,
        "pattern": "^\\+?[1-9]\\d{1,14}$"
      }
    }]
  }
}
```

## Custom Tool Generation

### Tool Templates

Create custom tool templates for specialized use cases:

```typescript
export interface ToolTemplate {
  name: string;
  description: string;
  generateTool(schema: Schema, config: TemplateConfig): McpTool;
}

class BulkCreateTemplate implements ToolTemplate {
  name = 'bulk_create';
  description = 'Generate bulk creation tools';
  
  generateTool(schema: Schema, config: TemplateConfig): McpTool {
    return {
      name: `bulk_create_${schema.name.toLowerCase()}`,
      description: `Create multiple ${schema.name} instances`,
      inputSchema: {
        type: 'object',
        properties: {
          items: {
            type: 'array',
            items: this.createZodSchema(schema.fields)
          },
          batchSize: {
            type: 'number',
            default: 10
          }
        }
      }
    };
  }
}
```

### Tool Composition

Combine multiple schemas into composite tools:

```typescript
class CompositeToolGenerator {
  generateProjectTool(schemas: Schema[]): McpTool {
    const taskSchema = schemas.find(s => s.name === 'Task');
    const personSchema = schemas.find(s => s.name === 'Person');
    
    return {
      name: 'create_project_with_team',
      description: 'Create a project with tasks and team members',
      inputSchema: {
        type: 'object',
        properties: {
          project: this.getProjectFields(),
          tasks: {
            type: 'array',
            items: this.createZodSchema(taskSchema.fields)
          },
          team: {
            type: 'array', 
            items: this.createZodSchema(personSchema.fields)
          }
        }
      }
    };
  }
}
```

## Adding New Schema Features

### Schema Versioning

Add support for schema evolution:

```typescript
export interface VersionedSchema extends Schema {
  version: string;
  migrations?: SchemaMigration[];
  deprecated?: boolean;
  deprecationMessage?: string;
}

export interface SchemaMigration {
  from: string;
  to: string;
  migrate: (oldSchema: Schema) => Schema;
}

class SchemaMigrator {
  migrateSchema(schema: VersionedSchema, targetVersion: string): VersionedSchema {
    // Apply migration chain
  }
}
```

### Schema Inheritance

Support schema inheritance and composition:

```typescript
export interface InheritableSchema extends Schema {
  extends?: string;          // Parent schema ID
  abstract?: boolean;        // Cannot be instantiated directly
  overrides?: FieldOverride[]; // Override parent fields
}

export interface FieldOverride {
  fieldName: string;
  newDefinition: FieldDefinition;
}

// Usage
{
  "id": "priority-task-schema",
  "name": "PriorityTask", 
  "extends": "task-schema",    // Inherits from basic task
  "overrides": [{
    "fieldName": "priority",
    "newDefinition": {
      "required": true,        // Make priority required
      "validation": {
        "options": ["high", "critical"]  // Restrict options
      }
    }
  }]
}
```

## Testing & Development

### Running Tests

```bash
# Run all tests
npm test

# Run schema-specific tests
npm test -- --grep "schema"

# Run with coverage
npm run test:coverage
```

### Development Workflow

1. **Create feature branch**:
   ```bash
   git checkout -b feature/new-field-type
   ```

2. **Add tests first** (TDD approach):
   ```typescript
   describe('New field type', () => {
     test('should validate correctly', () => {
       // Write test first
     });
   });
   ```

3. **Implement feature**:
   - Update type definitions
   - Add validation logic
   - Update tool generation
   - Add documentation

4. **Test thoroughly**:
   ```bash
   npm test
   npm run lint
   npm run build
   ```

5. **Create example configuration**:
   - Add to `example-schema-config.json`
   - Create usage example in `examples/`

### Debugging

Enable debug logging for development:

```bash
DEBUG=tana-mcp:schema* npm run dev
```

Use the debug configuration for detailed logging:

```typescript
import debug from 'debug';
const log = debug('tana-mcp:schema:validation');

log('Validating field %s with value %o', field.name, value);
```

## Contributing Guidelines

### Code Style

- Use TypeScript for all new code
- Follow existing naming conventions
- Add JSDoc comments for public methods
- Use meaningful variable names

### Pull Request Process

1. **Create issue first** for new features
2. **Write tests** before implementation
3. **Update documentation** with your changes
4. **Add examples** showing new functionality
5. **Ensure backwards compatibility**

### Commit Messages

Use conventional commit format:

```bash
feat(schema): add email field type validation
fix(validator): handle edge case in date parsing
docs(schema): add examples for custom validation
test(schema): add coverage for new field types
```

### Documentation Requirements

For new features, update:
- `SCHEMA-GUIDE.md` - User-facing documentation
- `API.md` - Tool reference
- `TROUBLESHOOTING.md` - Common issues
- Code comments - Implementation details
- `example-schema-config.json` - Working examples

## Future Roadmap

Planned enhancements to the schema system:

1. **Enhanced Field Types**:
   - Rich text/markdown fields
   - File upload fields
   - Geolocation fields
   - Color picker fields

2. **Advanced Validation**:
   - Cross-field validation
   - Async validation (API calls)
   - Custom validation functions
   - Validation rule composition

3. **Schema Management**:
   - Schema versioning and migration
   - Schema inheritance and composition
   - Remote schema repositories
   - Schema sharing between workspaces

4. **Tool Enhancement**:
   - Batch operations
   - Undo/redo functionality
   - Tool chaining and workflows
   - Custom tool templates

5. **Performance**:
   - Lazy loading of schemas
   - Validation caching
   - Optimized tool generation
   - Memory usage optimization

---

**Questions or Ideas?** 

Open an issue or discussion in the GitHub repository to share feedback or propose new features!