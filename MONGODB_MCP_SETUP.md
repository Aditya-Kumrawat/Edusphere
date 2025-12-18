# MongoDB MCP Server Setup Guide

This guide helps you set up the MongoDB Model Context Protocol (MCP) server for your AI assistant (Claude Desktop, Cursor, VS Code, etc.).

## 1. Prerequisites

Ensure you have **Node.js** installed (version 18 or higher recommended).
You can check by running:
```powershell
node -v
```

## 2. Configuration

Copy the configuration object below that matches your MCP client.

### **Important**:
The `mongodb-mcp-server` package needs to be installed. The configuration below uses `npx` to run it directly, which is the recommended approach.

### **A. Claude Desktop**

1. Open your config file:
   - **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
   - **Mac**: `~/Library/Application Support/Claude/claude_desktop_config.json`
   - *If the file doesn't exist, create it.*

2. Add or merge this JSON into the file:

```json
{
  "mcpServers": {
    "mongodb": {
      "command": "npx",
      "args": [
        "-y",
        "mongodb-mcp-server",
        "mongodb+srv://adityakumrawat32_db_user:Aditya%4027@cluster0.5kmg17j.mongodb.net/datacraft?retryWrites=true&w=majority&appName=Cluster0"
      ]
    }
  }
}
```

### **B. Cursor**

1. Go to **Settings** (Gear icon) > **Features** > **MCP Servers**.
2. Click **+ Add New MCP Server**.
3. Fill in the details:
   - **Name**: `mongodb`
   - **Type**: `command`
   - **Command**: `npx -y mongodb-mcp-server mongodb+srv://adityakumrawat32_db_user:Aditya%4027@cluster0.5kmg17j.mongodb.net/datacraft?retryWrites=true&w=majority&appName=Cluster0`

### **C. VS Code (with MCP Extension)**

1. Open your user settings (`settings.json`).
2. Add this to your `mcp.servers` configuration:

```json
"mongodb": {
  "command": "npx",
  "args": [
    "-y",
    "mongodb-mcp-server",
    "mongodb+srv://adityakumrawat32_db_user:Aditya%4027@cluster0.5kmg17j.mongodb.net/datacraft?retryWrites=true&w=majority&appName=Cluster0"
  ]
}
```

## 3. Verification

1. **Restart** your AI client (Claude, Cursor, etc.).
2. Ask your AI: *"List the collections in my database"* or *"Show me the schema for users"*.
3. If successful, it should query your live MongoDB Atlas database!
