/**
 * Upload File Tool Usage Examples
 * 
 * This example demonstrates how to use the upload_file tool
 * for various file upload scenarios in Tana MCP.
 */

// Example 1: Upload a local file
const uploadLocalFile = {
  tool: "upload_file",
  arguments: {
    path: "/home/user/documents/project-proposal.pdf",
    target: "project-documents-node-id",
    description: "Initial project proposal document"
  }
};

// Example 2: Download and upload from URL
const uploadFromUrl = {
  tool: "upload_file", 
  arguments: {
    url: "https://example.com/api/reports/monthly.csv",
    target: "data-reports-node-id",
    filename: "monthly-report-january.csv",
    description: "Monthly sales report for January"
  }
};

// Example 3: Upload base64 encoded data
const uploadBase64 = {
  tool: "upload_file",
  arguments: {
    bytes: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==",
    filename: "transparent-pixel.png",
    contentType: "image/png",
    target: "graphics-assets-node-id",
    description: "1x1 transparent pixel for UI spacing"
  }
};

// Example 4: Upload image with supertags
const uploadWithSupertags = {
  tool: "upload_file",
  arguments: {
    path: "/home/user/screenshots/bug-report.png",
    target: "bug-reports-node-id",
    description: "Screenshot showing the login bug",
    supertags: [
      {
        id: "bug-report-supertag-id",
        fields: {
          "priority-field-id": "high",
          "status-field-id": "open"
        }
      }
    ]
  }
};

// Example 5: Download with custom headers (for authentication)
const uploadProtectedResource = {
  tool: "upload_file",
  arguments: {
    url: "https://secure.example.com/files/confidential.pdf",
    target: "private-documents-node-id",
    filename: "confidential-report.pdf",
    description: "Confidential quarterly report"
    // Note: For authenticated downloads, you might need to handle
    // authentication at the application level
  }
};

// Real-world conversation examples:

/*
Human: "I have a PDF at /home/user/contracts/client-agreement.pdf that I need to upload to my contracts folder in Tana"

MCP Response: I'll upload that contract PDF to your Tana workspace.
{
  "tool": "upload_file",
  "arguments": {
    "path": "/home/user/contracts/client-agreement.pdf",
    "target": "contracts-folder-node-id",
    "description": "Client agreement contract"
  }
}
*/

/*
Human: "Download this image from https://example.com/diagrams/architecture.png and add it to my project documentation"

MCP Response: I'll download that architecture diagram and upload it to your project documentation.
{
  "tool": "upload_file", 
  "arguments": {
    "url": "https://example.com/diagrams/architecture.png",
    "target": "project-docs-node-id",
    "description": "System architecture diagram"
  }
}
*/

/*
Human: "I have some base64 encoded audio data I need to upload as a voice note"

MCP Response: I'll upload that audio data as a voice note.
{
  "tool": "upload_file",
  "arguments": {
    "bytes": "[base64-audio-data]",
    "filename": "voice-note.mp3",
    "contentType": "audio/mpeg",
    "target": "voice-notes-node-id",
    "description": "Voice note recording"
  }
}
*/

// File type examples that are automatically detected:

const fileTypeExamples = [
  // Images
  { path: "photo.jpg", detectedType: "image/jpeg" },
  { path: "screenshot.png", detectedType: "image/png" },
  { path: "icon.svg", detectedType: "image/svg+xml" },
  
  // Documents  
  { path: "report.pdf", detectedType: "application/pdf" },
  { path: "document.docx", detectedType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" },
  { path: "spreadsheet.xlsx", detectedType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" },
  
  // Audio/Video
  { path: "recording.mp3", detectedType: "audio/mpeg" },
  { path: "video.mp4", detectedType: "video/mp4" },
  { path: "presentation.mov", detectedType: "video/quicktime" },
  
  // Archives
  { path: "backup.zip", detectedType: "application/zip" },
  { path: "source.tar.gz", detectedType: "application/gzip" },
  
  // Code/Text
  { path: "data.json", detectedType: "application/json" },
  { path: "style.css", detectedType: "text/css" },
  { path: "readme.md", detectedType: "text/markdown" }
];

// Error handling examples:

/*
// This will fail - multiple sources provided
{
  "tool": "upload_file",
  "arguments": {
    "path": "/some/file.pdf",
    "bytes": "base64data...",  // Can't provide both
    "target": "node-id"
  }
}

// This will fail - no source provided  
{
  "tool": "upload_file",
  "arguments": {
    "target": "node-id"
    // Missing path, bytes, or url
  }
}

// This will fail - file doesn't exist
{
  "tool": "upload_file", 
  "arguments": {
    "path": "/nonexistent/file.pdf",
    "target": "node-id"
  }
}
*/

module.exports = {
  uploadLocalFile,
  uploadFromUrl,
  uploadBase64,
  uploadWithSupertags,
  uploadProtectedResource,
  fileTypeExamples
};