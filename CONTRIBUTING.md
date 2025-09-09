# Contributing to Tana MCP Server

Thank you for your interest in contributing to the Tana MCP Server! This document provides guidelines and information for contributors.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Process](#development-process)
- [Types of Contributions](#types-of-contributions)
- [Coding Standards](#coding-standards)
- [Testing Guidelines](#testing-guidelines)
- [Documentation Standards](#documentation-standards)
- [Pull Request Process](#pull-request-process)
- [Community and Support](#community-and-support)

## Code of Conduct

This project adheres to a code of conduct that we expect all contributors to follow:

- **Be respectful**: Treat everyone with respect and kindness
- **Be inclusive**: Welcome contributors from all backgrounds
- **Be collaborative**: Work together constructively
- **Be patient**: Help newcomers learn and grow
- **Be constructive**: Provide helpful feedback and suggestions

## Getting Started

### Prerequisites

- Node.js 18+ installed
- Git for version control
- A Tana workspace with API access
- Basic knowledge of TypeScript and the MCP protocol

### Development Setup

1. **Fork the repository** on GitHub
2. **Clone your fork locally**:
   ```bash
   git clone https://github.com/YOUR_USERNAME/tana-mcp.git
   cd tana-mcp
   ```
3. **Install dependencies**:
   ```bash
   npm install
   ```
4. **Set up environment**:
   ```bash
   cp .env.example .env
   # Add your TANA_API_TOKEN to .env
   ```
5. **Build and test**:
   ```bash
   npm run build
   npm run dev  # Test the server
   ```

### Development Resources

- [API Reference](./API.md): Complete tool and API documentation
- [Developer Guide](./DEVELOPMENT.md): Architecture and implementation details
- [Examples](./examples/): Usage patterns and best practices

## Development Process

### Branching Strategy

1. **Main branch**: Stable, production-ready code
2. **Feature branches**: New features and enhancements
3. **Bugfix branches**: Bug fixes and patches
4. **Documentation branches**: Documentation improvements

### Branch Naming

- Features: `feature/descriptive-name`
- Bug fixes: `bugfix/issue-description`
- Documentation: `docs/topic-name`
- Refactoring: `refactor/component-name`

### Workflow

1. Create an issue for discussion (for significant changes)
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Update documentation
6. Submit a pull request

## Types of Contributions

### 🐛 Bug Reports

When reporting bugs, please include:
- Clear description of the issue
- Steps to reproduce
- Expected vs actual behavior
- Environment details (Node.js version, OS, etc.)
- Error messages and logs
- Minimal reproduction example

### ✨ Feature Requests

For new features:
- Describe the use case and motivation
- Explain how it fits with existing functionality
- Consider implementation complexity
- Discuss potential breaking changes
- Provide examples of usage

### 📝 Documentation Improvements

Documentation contributions are highly valued:
- Fix typos and grammar
- Improve clarity and examples
- Add missing information
- Update outdated content
- Create tutorials and guides

### 🔧 Code Contributions

Code contributions can include:
- New tools and functionality
- Performance improvements
- Bug fixes
- Refactoring and cleanup
- Type safety improvements
- Test coverage

## Coding Standards

### TypeScript Guidelines

- Use strict TypeScript configuration
- Provide explicit type annotations
- Avoid `any` types when possible
- Use interfaces for object shapes
- Export types for public APIs

### Code Style

- Use 2 spaces for indentation
- Use semicolons consistently
- Use single quotes for strings
- Keep line length reasonable (≤100 characters)
- Use meaningful variable and function names

### Naming Conventions

- **Variables/Functions**: camelCase (`getUserInfo`)
- **Classes**: PascalCase (`TanaClient`)
- **Constants**: UPPER_SNAKE_CASE (`API_ENDPOINT`)
- **Types/Interfaces**: PascalCase (`TanaNode`)
- **Files**: kebab-case (`tana-client.ts`)

### Error Handling

- Always handle errors gracefully
- Provide meaningful error messages
- Use appropriate error types
- Log errors appropriately
- Don't expose sensitive information

### Example Code Style

```typescript
/**
 * Creates a new node in Tana
 * @param targetNodeId Optional parent node ID
 * @param node Node data to create
 * @returns Promise with created node response
 */
async createNode(
  targetNodeId: string | undefined, 
  node: TanaNode
): Promise<TanaNodeResponse> {
  try {
    if (!node.name && node.dataType !== 'reference') {
      throw new Error('Node name is required for non-reference nodes');
    }

    const result = await this.tanaClient.createNode(targetNodeId, node);
    return result;
  } catch (error) {
    this.logger.error('Failed to create node', { error, node });
    throw new Error(`Node creation failed: ${error.message}`);
  }
}
```

## Testing Guidelines

### Testing Strategy

Currently, the project lacks comprehensive tests. Contributing test coverage is highly encouraged:

1. **Unit Tests**: Test individual functions and classes
2. **Integration Tests**: Test API interactions
3. **MCP Protocol Tests**: Validate protocol compliance
4. **End-to-End Tests**: Test complete workflows

### Recommended Testing Framework

```bash
npm install --save-dev jest @types/jest ts-jest
npm install --save-dev @testing-library/node
npm install --save-dev nock  # For API mocking
```

### Test Structure

```typescript
// __tests__/tana-client.test.ts
describe('TanaClient', () => {
  let client: TanaClient;
  
  beforeEach(() => {
    client = new TanaClient({ apiToken: 'test-token' });
  });
  
  describe('createNode', () => {
    it('should create a plain node successfully', async () => {
      // Arrange
      const mockNode: TanaPlainNode = {
        name: 'Test Node',
        description: 'Test description'
      };
      
      // Act & Assert
      await expect(client.createNode(undefined, mockNode))
        .resolves.toBeDefined();
    });
    
    it('should handle API errors gracefully', async () => {
      // Test error scenarios
    });
  });
});
```

### Test Requirements

- Write tests for new functionality
- Maintain existing test coverage
- Test both success and error scenarios
- Use descriptive test names
- Mock external dependencies

## Documentation Standards

### Documentation Types

1. **API Documentation**: Function signatures and usage
2. **User Guides**: How-to instructions
3. **Developer Docs**: Implementation details
4. **Examples**: Practical usage patterns
5. **Changelog**: Version history

### Documentation Guidelines

- Use clear, concise language
- Provide practical examples
- Keep documentation up-to-date with code
- Use proper markdown formatting
- Include code snippets with syntax highlighting

### JSDoc Comments

```typescript
/**
 * Creates a plain text node in Tana
 * 
 * @param targetNodeId - Optional parent node ID to create under
 * @param name - The text content of the node
 * @param description - Optional description for the node
 * @param supertags - Optional array of supertags to apply
 * @returns Promise resolving to the created node response
 * 
 * @example
 * ```typescript
 * const result = await createPlainNode('parent-123', 'Hello World', 'My first node');
 * console.log(`Created node: ${result.nodeId}`);
 * ```
 * 
 * @throws {Error} When API request fails or validation errors occur
 */
```

## Pull Request Process

### Before Submitting

1. **Test your changes** thoroughly
2. **Update documentation** as needed
3. **Check code style** and formatting
4. **Verify no breaking changes** (or document them)
5. **Update changelog** if appropriate

### PR Description Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Documentation update
- [ ] Refactoring
- [ ] Breaking change

## Testing
- [ ] Unit tests added/updated
- [ ] Manual testing completed
- [ ] Documentation tested

## Related Issues
Fixes #123

## Breaking Changes
None / List any breaking changes

## Additional Context
Any additional information or context
```

### Review Process

1. **Automated checks** must pass
2. **Code review** by maintainers
3. **Testing** verification
4. **Documentation** review
5. **Final approval** and merge

### Review Criteria

- Code quality and style
- Test coverage and quality
- Documentation completeness
- Performance impact
- Security considerations
- Backward compatibility

## Community and Support

### Getting Help

- **GitHub Issues**: Bug reports and feature requests
- **GitHub Discussions**: Questions and community discussion
- **Documentation**: Comprehensive guides and API reference

### Communication

- Be respectful and constructive
- Provide context and details
- Use appropriate channels for different types of communication
- Help others when you can

### Recognition

Contributors are recognized through:
- GitHub contributor graphs
- Changelog acknowledgments
- Community recognition
- Maintainer invitations for significant contributors

## Development Tips

### Debugging

- Use `npm run dev` for development with hot reload
- Add logging to understand data flow
- Test with real Tana workspace for integration
- Use TypeScript compiler for type checking

### Performance

- Monitor API rate limits
- Optimize for large payloads
- Consider memory usage
- Profile critical paths

### Security

- Never commit API tokens
- Validate all inputs
- Handle errors without exposing internals
- Follow security best practices

Thank you for contributing to the Tana MCP Server! Your contributions help make this tool better for everyone in the community.