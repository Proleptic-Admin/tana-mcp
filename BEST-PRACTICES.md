# Schema Best Practices & Real-World Examples

This document provides proven patterns, best practices, and real-world examples for using the schema-aware functionality effectively.

## Table of Contents

- [Schema Design Principles](#schema-design-principles)
- [Real-World Examples](#real-world-examples)
- [Common Patterns](#common-patterns)
- [Performance Tips](#performance-tips)
- [Maintenance Guidelines](#maintenance-guidelines)
- [Team Collaboration](#team-collaboration)

## Schema Design Principles

### 1. Start Simple, Evolve Gradually

**✅ Good**: Begin with core fields
```json
{
  "name": "Task",
  "fields": [
    {"name": "title", "type": "text", "required": true},
    {"name": "priority", "type": "text", "validation": {"options": ["low", "medium", "high"]}}
  ]
}
```

**❌ Avoid**: Over-engineering from the start
```json
{
  "name": "Task", 
  "fields": [
    {"name": "title", "type": "text", "required": true},
    {"name": "priority", "type": "text", "validation": {"options": ["low", "medium", "high", "critical", "urgent", "blocker"]}},
    {"name": "estimated_hours", "type": "number"},
    {"name": "actual_hours", "type": "number"},
    {"name": "complexity_score", "type": "number"},
    {"name": "technical_debt_factor", "type": "number"}
    // ... 20+ more fields
  ]
}
```

### 2. Use Consistent Naming Conventions

**✅ Recommended patterns**:
- Use `snake_case` for field names: `due_date`, `contact_email`
- Use `PascalCase` for schema names: `Task`, `PersonContact`
- Use descriptive IDs: `task-schema`, `person-contact-schema`

**❌ Avoid inconsistency**:
```json
{
  "schemas": [
    {"name": "task", "id": "TaskSchema"},           // ❌ Mixed case
    {"name": "Person-Contact", "id": "pc"},         // ❌ Unclear ID
    {"name": "meetingNotes", "id": "meeting_schema"} // ❌ Inconsistent naming
  ]
}
```

### 3. Design for Your Actual Workflow

**✅ Model real usage patterns**:
```json
{
  "name": "Task",
  "fields": [
    {"name": "title", "required": true},
    {"name": "priority", "defaultValue": "medium"},  // Most tasks are medium
    {"name": "due_date", "required": false}          // Not all tasks have deadlines
  ]
}
```

**❌ Don't over-constrain**:
```json
{
  "name": "Task",
  "fields": [
    {"name": "title", "required": true},
    {"name": "priority", "required": true},    // ❌ Forces choice always
    {"name": "due_date", "required": true},    // ❌ Forces deadline on everything
    {"name": "assignee", "required": true}     // ❌ Can't create personal tasks
  ]
}
```

## Real-World Examples

### Example 1: Software Development Team

**Configuration for a development team using Tana for project management:**

```json
{
  "version": "1.0.0",
  "workspace": {"name": "DevTeam Workspace"},
  "mappings": {
    "supertags": {
      "Task": "dev-task-supertag-123",
      "Bug": "bug-supertag-456", 
      "Feature": "feature-supertag-789",
      "Person": "person-supertag-abc"
    },
    "fields": {
      "priority": "priority-field-def",
      "status": "status-field-ghi",
      "assignee": "assignee-field-jkl",
      "sprint": "sprint-field-mno",
      "story_points": "points-field-pqr"
    }
  },
  "schemas": [
    {
      "id": "task-schema",
      "name": "Task",
      "description": "Development task or story",
      "fields": [
        {
          "name": "title",
          "type": "text",
          "required": true,
          "validation": {"min": 5, "max": 100}
        },
        {
          "name": "description", 
          "type": "text",
          "required": false
        },
        {
          "name": "priority",
          "type": "text",
          "defaultValue": "medium",
          "validation": {"options": ["low", "medium", "high", "urgent"]}
        },
        {
          "name": "status",
          "type": "text", 
          "defaultValue": "backlog",
          "validation": {"options": ["backlog", "todo", "in_progress", "review", "done"]}
        },
        {
          "name": "assignee",
          "type": "reference",
          "required": false,
          "description": "Team member assigned to this task"
        },
        {
          "name": "story_points",
          "type": "number",
          "required": false,
          "validation": {"min": 1, "max": 13}
        },
        {
          "name": "sprint", 
          "type": "text",
          "required": false
        }
      ]
    },
    {
      "id": "bug-schema",
      "name": "Bug", 
      "description": "Bug report",
      "fields": [
        {
          "name": "title",
          "type": "text",
          "required": true
        },
        {
          "name": "severity",
          "type": "text",
          "required": true,
          "validation": {"options": ["low", "medium", "high", "critical"]}
        },
        {
          "name": "steps_to_reproduce",
          "type": "text",
          "required": true
        },
        {
          "name": "assignee",
          "type": "reference",
          "required": false
        }
      ]
    }
  ]
}
```

**Usage examples:**
```javascript
// Create a new feature task
create_task({
  title: "Add user authentication",
  description: "Implement OAuth2 login flow",
  priority: "high",
  story_points: 8,
  sprint: "Sprint 24"
})

// Report a bug
create_bug({
  title: "Login button not working on mobile",
  severity: "high",
  steps_to_reproduce: "1. Open app on mobile\n2. Tap login\n3. Nothing happens"
})
```

### Example 2: Content Creator

**Configuration for a content creator managing articles, videos, and social posts:**

```json
{
  "schemas": [
    {
      "id": "article-schema",
      "name": "Article",
      "fields": [
        {
          "name": "title",
          "type": "text",
          "required": true,
          "validation": {"min": 10, "max": 60}
        },
        {
          "name": "status",
          "type": "text",
          "defaultValue": "idea",
          "validation": {"options": ["idea", "outline", "draft", "review", "published"]}
        },
        {
          "name": "target_audience",
          "type": "text",
          "validation": {"options": ["beginner", "intermediate", "advanced", "all"]}
        },
        {
          "name": "publish_date",
          "type": "date",
          "required": false
        },
        {
          "name": "word_count_target",
          "type": "number",
          "validation": {"min": 500, "max": 5000}
        },
        {
          "name": "primary_keyword",
          "type": "text"
        }
      ]
    },
    {
      "id": "video-schema", 
      "name": "Video",
      "fields": [
        {
          "name": "title",
          "type": "text",
          "required": true
        },
        {
          "name": "platform",
          "type": "text",
          "validation": {"options": ["youtube", "tiktok", "instagram", "linkedin"]}
        },
        {
          "name": "duration_target",
          "type": "number",
          "description": "Target duration in seconds"
        },
        {
          "name": "script_status",
          "type": "text",
          "defaultValue": "not_started",
          "validation": {"options": ["not_started", "outline", "draft", "final"]}
        }
      ]
    }
  ]
}
```

### Example 3: Research Team

**Configuration for academic or business research team:**

```json
{
  "schemas": [
    {
      "id": "research-paper-schema",
      "name": "ResearchPaper",
      "fields": [
        {
          "name": "title",
          "type": "text",
          "required": true
        },
        {
          "name": "authors",
          "type": "text",
          "required": true
        },
        {
          "name": "publication_date",
          "type": "date"
        },
        {
          "name": "journal",
          "type": "text"
        },
        {
          "name": "doi",
          "type": "url",
          "validation": {"pattern": "^10\\.\\d{4,}/.*"}
        },
        {
          "name": "research_area",
          "type": "text",
          "validation": {"options": ["ml", "ai", "nlp", "cv", "robotics", "theory"]}
        },
        {
          "name": "relevance_score",
          "type": "number",
          "validation": {"min": 1, "max": 5}
        }
      ]
    },
    {
      "id": "experiment-schema",
      "name": "Experiment", 
      "fields": [
        {
          "name": "hypothesis",
          "type": "text",
          "required": true
        },
        {
          "name": "methodology",
          "type": "text",
          "required": true
        },
        {
          "name": "status",
          "type": "text",
          "defaultValue": "planned",
          "validation": {"options": ["planned", "running", "completed", "failed"]}
        },
        {
          "name": "start_date",
          "type": "date"
        },
        {
          "name": "expected_duration_days",
          "type": "number"
        }
      ]
    }
  ]
}
```

## Common Patterns

### Pattern 1: Status Tracking

Most entities benefit from status tracking:

```json
{
  "name": "status",
  "type": "text",
  "defaultValue": "draft",
  "validation": {
    "options": ["draft", "in_progress", "review", "completed"]
  }
}
```

### Pattern 2: Priority Systems

Consistent priority across all schemas:

```json
{
  "name": "priority", 
  "type": "text",
  "defaultValue": "medium",
  "validation": {
    "options": ["low", "medium", "high", "urgent"]
  }
}
```

### Pattern 3: People References

Link to team members or contacts:

```json
{
  "name": "assignee",
  "type": "reference",
  "required": false,
  "description": "Person responsible for this item"
}
```

### Pattern 4: Date Fields

Flexible date handling:

```json
{
  "name": "due_date",
  "type": "date",
  "required": false,
  "description": "When this should be completed"
}
```

### Pattern 5: Categorization

Use consistent categories:

```json
{
  "name": "category",
  "type": "text",
  "validation": {
    "options": ["work", "personal", "urgent", "someday"]
  }
}
```

## Performance Tips

### 1. Optimize Schema Count

**✅ Good**: Focus on your top 3-5 entity types
```json
{
  "schemas": [
    {"name": "Task"},
    {"name": "Person"}, 
    {"name": "Meeting"}
  ]
}
```

**❌ Avoid**: Creating schemas for everything
```json
{
  "schemas": [
    {"name": "Task"}, {"name": "Person"}, {"name": "Meeting"},
    {"name": "Email"}, {"name": "PhoneCall"}, {"name": "Idea"},
    {"name": "Note"}, {"name": "Bookmark"}, {"name": "Quote"},
    {"name": "Recipe"}, {"name": "Movie"}, {"name": "Book"}
    // ... 20+ schemas
  ]
}
```

### 2. Simplify Validation

**✅ Good**: Essential validation only
```json
{
  "validation": {
    "options": ["low", "medium", "high"],
    "required": true
  }
}
```

**❌ Avoid**: Over-complex patterns
```json
{
  "validation": {
    "pattern": "^(?=.*[A-Z])(?=.*[a-z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]{12,50}$",
    "custom": ["checkDatabaseUnique", "validateBusinessRules", "crossReferenceAPIs"]
  }
}
```

### 3. Use Default Values

Reduce input requirements:

```json
{
  "name": "priority",
  "defaultValue": "medium",  // ← Reduces user input
  "validation": {"options": ["low", "medium", "high"]}
}
```

## Maintenance Guidelines

### 1. Version Your Schemas

Keep track of schema changes:

```json
{
  "version": "1.2.0",
  "schemas": [
    {
      "id": "task-schema-v1", 
      "name": "Task"
    }
  ]
}
```

### 2. Backup Configurations

```bash
# Before making changes
cp tana-schema-config.json tana-schema-config.backup.json

# Version control
git add tana-schema-config.json
git commit -m "Update task schema with new priority options"
```

### 3. Test Changes Incrementally

1. **Backup current config**
2. **Add one field at a time**
3. **Test with `get_schemas` tool**
4. **Verify generated tools work**
5. **Update documentation**

### 4. Monitor Usage

Track which schemas and fields are actually used:

```javascript
// Check available tools
const schemas = await get_schemas();
console.log('Available tools:', schemas.generated_tools);

// Test new tools
const result = await create_task({title: "Test new schema"});
```

## Team Collaboration

### 1. Shared Configuration Strategy

**Option A: Single shared config**
- Store `tana-schema-config.json` in shared repository
- Each team member maps their own workspace IDs
- Use `update_mappings` tool for personal customization

**Option B: Template + individual configs**
- Create template with placeholder IDs
- Each team member creates their own config file
- Share schema definitions, customize mappings

### 2. ID Mapping Management

Create a team "ID discovery" process:

```bash
# 1. Team lead creates schema definitions
# 2. Each member discovers their workspace IDs
# 3. Update individual mappings

# Example team process:
echo "Team member: John"
echo "Task supertag ID: task-supertag-john-123"
echo "Priority field ID: priority-field-john-456"
```

### 3. Documentation Standards

For team schemas, document:
- **Purpose**: What this schema is for
- **Usage examples**: How to use generated tools
- **Field meanings**: What each field represents
- **Validation rules**: Why certain constraints exist

Example schema documentation:

```json
{
  "id": "task-schema",
  "name": "Task",
  "description": "Team task tracking - use for all work items",
  "documentation": {
    "purpose": "Standardize task creation across team",
    "examples": [
      {
        "scenario": "Sprint planning",
        "usage": "create_task({title: 'Feature X', story_points: 5})"
      }
    ],
    "fields": {
      "story_points": "Fibonacci scale estimation (1,2,3,5,8,13)",
      "priority": "Business priority, not technical urgency"
    }
  }
}
```

### 4. Change Management

For team schema changes:

1. **Propose changes** in team meeting
2. **Document rationale** for changes  
3. **Test changes** in development first
4. **Coordinate rollout** to avoid conflicts
5. **Update team documentation**

---

**💡 Remember**: The best schema is one that matches your actual workflow. Start simple, observe usage patterns, and evolve based on real needs rather than theoretical requirements.