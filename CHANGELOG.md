# Changelog

All notable changes to the Tana MCP Server project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.0] - 2024-12-XX

### Added
- Comprehensive API reference documentation (API.md)
- Developer guide with architecture and contribution guidelines (DEVELOPMENT.md)
- Examples directory documentation (examples/README.md)
- Complete changelog for version tracking
- Enhanced README with detailed tool, prompt, and resource descriptions
- Documentation for all 11 tools with parameters and examples
- Detailed prompt template documentation
- Resource URI and description documentation

### Enhanced
- README.md with improved organization and cross-references
- Better documentation of MCP capabilities and limitations
- Clearer installation and configuration instructions
- More comprehensive troubleshooting guide

### Documentation
- Complete API reference for developers and users
- Architecture overview and design principles
- Type system documentation
- Error handling patterns and best practices
- Contributing guidelines and development workflow
- Testing strategy recommendations

## [1.2.0] - Previous Release

### Fixed
- Fixed "Missing expected parameter key: items" error in Raycast integration
- Improved error handling and validation

### Added
- Support for all major MCP clients (Claude Desktop, Raycast, etc.)
- 11 comprehensive tools for Tana node manipulation
- 4 interactive prompt templates for common use cases
- 4 built-in resources for documentation and examples

### Tools
- `create_plain_node`: Basic text node creation
- `create_reference_node`: Reference existing nodes
- `create_date_node`: ISO 8601 date nodes
- `create_url_node`: Web URL nodes
- `create_checkbox_node`: Boolean/task nodes
- `create_file_node`: Base64 file uploads
- `create_field_node`: Structured field nodes
- `create_node_structure`: Complex nested hierarchies
- `set_node_name`: Update existing node names
- `create_supertag`: Define new supertags
- `create_field`: Define new field types

### Prompts
- `create-task`: Interactive task creation
- `create-project`: Project structure templates
- `create-meeting-notes`: Meeting documentation
- `create-knowledge-entry`: Knowledge base entries

### Resources
- `api-docs`: Tana API documentation
- `node-types`: Node type reference
- `examples`: Usage patterns
- `server-info`: Server status and configuration

## [Earlier Versions]

### Initial Development
- Basic MCP server framework
- Tana API client implementation
- TypeScript type definitions
- Node.js CLI interface
- Environment-based configuration
- Error handling and validation
- Rate limiting compliance

### Core Features
- Model Context Protocol compliance
- Stdio transport for LLM integration
- Comprehensive type safety
- Modular architecture
- Extensible design patterns

## Migration Guide

### Upgrading to 1.2.0+

No breaking changes from previous 1.2.0 release. This update adds comprehensive documentation without changing the API.

### For Developers

If you've been working with the source code:
1. Review the new [DEVELOPMENT.md](./DEVELOPMENT.md) for updated guidelines
2. Use the [API.md](./API.md) reference for implementation details
3. Follow the contribution guidelines for future PRs

### For Users

No changes required to existing configurations. New documentation provides better guidance for:
- Setting up new integrations
- Using advanced features
- Troubleshooting common issues
- Understanding all available capabilities

## Future Roadmap

### Planned Features
- Automated testing infrastructure
- Plugin architecture for extensions
- Enhanced monitoring and logging
- Performance optimizations
- Real-time update capabilities

### Documentation Improvements
- Interactive API explorer
- Video tutorials and guides
- Community-contributed examples
- Integration guides for more clients

### Development Experience
- Improved development tooling
- Better error messages
- Enhanced debugging capabilities
- Code generation tools

---

For detailed information about any release, see the corresponding documentation and GitHub releases page.