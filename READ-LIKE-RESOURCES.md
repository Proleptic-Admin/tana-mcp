# Read-Like Resources Demo

This demonstrates the new read-like resources functionality in the Tana MCP Server.

## Overview

The implementation provides "read-like" functionality within Tana's current POST-only API constraints through:

1. **Local Mirror Storage**: Automatically stores copies of all nodes created by this server
2. **Tana Publish Scraping**: Monitors public Tana Publish pages for read-only content

## Usage Examples

### 1. Creating and Querying Nodes

```bash
# Create a task (this gets automatically stored in mirror)
create_checkbox_node({
  name: "Review budget proposal",
  checked: false,
  description: "Q4 budget review meeting prep"
})

# Query the mirror for tasks
query_mirror({
  category: "tasks",
  limit: 10
})
# Returns: Local copies of all task nodes you've created

# Get mirror statistics
get_mirror_stats()
# Returns: Total nodes, categories, date ranges, etc.
```

### 2. Monitoring Public Content

```bash
# Add a public Tana page to monitor
add_publish_page({
  slug: "my-knowledge-base",
  url: "https://tana.pub/your-public-page",
  title: "My Knowledge Base",
  scrapeInterval: 60
})

# Get content from the scraped page
get_publish_page({
  slug: "my-knowledge-base"
})
# Returns: Full scraped content as markdown

# List all monitored pages
list_publish_pages()
```

### 3. Accessing via Resources

The MCP client can access data through resources:

- `tana://mirror/tasks` - JSON list of task nodes from mirror
- `tana://mirror/projects` - JSON list of project nodes from mirror  
- `tana://mirror/notes` - JSON list of note nodes from mirror
- `tana://mirror/stats` - Statistics about mirror storage
- `tana://publish/` - Index of all scraped publish pages

## Architecture

### Mirror Storage (`MirrorStorage`)
- Stores node data in local JSON file
- Categorizes nodes automatically (tasks, projects, notes, etc.)
- Provides rich querying by category, supertag, date
- Tracks metadata like creation time and target nodes

### Publish Scraper (`PublishScraper`)
- Monitors configured Tana Publish pages
- Scrapes content at configurable intervals
- Extracts clean text content from HTML
- Caches content locally for fast access

### Integration Points
- **TanaClient**: Modified to auto-store created nodes in mirror
- **TanaMcpServer**: Added 6 new tools and 5 new resources
- **Minimal Changes**: Existing functionality unchanged

## Benefits

1. **Within API Constraints**: Works with POST-only Tana Input API
2. **Rich Context**: LLMs can reference previously created nodes
3. **Public Content**: Access read-only content from Tana Publish pages
4. **Automatic**: Mirror storage happens transparently
5. **Queryable**: Full filtering and search capabilities
6. **Resource-Based**: Standard MCP resource access patterns

## File Structure

```
src/server/
├── mirror-storage.ts     # Local node storage and querying
├── publish-scraper.ts    # Tana Publish page scraping
├── tana-client.ts        # Modified to use mirror storage
└── tana-mcp-server.ts    # Enhanced with new tools/resources
```

This implementation successfully provides read-like functionality while respecting Tana's current API limitations, giving LLMs the context they need to work effectively with Tana data.