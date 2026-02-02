# 🚀 File Chat MCP - Quick Start Guide

## 📦 What You Got

Full MCP (Model Context Protocol) support in the File Chat interface. This allows you to:
- **Connect to MCP servers** like DeepWiki to access external data
- **Automatically fetch GitHub repo documentation** when asking questions
- **Manually call MCP tools** with custom parameters
- **See which tools were used** in each response

## 🎯 5-Minute Quick Start

### Step 1: Upload a File
```
1. Go to http://localhost:3000
2. Click "Upload" or go to /files
3. Upload any file (video, PDF, image, etc.)
4. Click on the uploaded file to open it
```

### Step 2: Connect to MCP
```
1. Look for the ⚡ button in the chat header
2. Click it to open the MCP panel
3. The URL field shows: https://mcp.deepwiki.com/mcp
4. Click "Connect MCP Server"
5. Wait for "✓ Connected to DeepWiki"
```

### Step 3: Ask Questions
```
Try these example questions:

📚 "Tell me about moinfra/mcp-client-sdk"
   → Auto-calls: read_wiki_structure + ask_question
   
📖 "How do I use the typescript-sdk?"
   → Auto-calls: read_wiki_structure + ask_question
   
🔍 "Show me docs for modelcontextprotocol/typescript-sdk"
   → Auto-calls: read_wiki_structure + read_wiki_contents
```

### Step 4: Check the Results
```
Look for:
✅ Green "MCP Tools Used" badges below AI responses
✅ Additional section: "Additional information from MCP server"
✅ Repository documentation embedded in answers
```

## 🎨 Visual Guide

### Interface Overview
```
┌─────────────────────────────────────────────────┐
│ 💬 Chat with Video AI          [⚡ MCP] [Clear] │ ← Header
│ Ask questions about filename.mp4               │
├─────────────────────────────────────────────────┤
│                                                 │
│ ┌─────────────────────────────────────────┐   │
│ │ 🔌 MCP Server          [Connected ✓] ▼ │   │ ← MCP Panel
│ │ ┌───────────────────────────────────┐   │   │
│ │ │ ✓ Connected to DeepWiki           │   │   │
│ │ │ 3 tools available • v1.0.0        │   │   │
│ │ │ [Disconnect]                      │   │   │
│ │ └───────────────────────────────────┘   │   │
│ │                                         │   │
│ │ 🔧 Available Tools                      │   │
│ │ ┌─────────────────────────────────┐     │   │
│ │ │ read_wiki_structure             │     │   │ ← Tool List
│ │ │ Get repository documentation... │     │   │
│ │ ├─────────────────────────────────┤     │   │
│ │ │ ask_question [SELECTED]         │     │   │
│ │ │ Ask questions about repos...    │     │   │
│ │ └─────────────────────────────────┘     │   │
│ │                                         │   │
│ │ Call: ask_question                      │   │
│ │ ┌───────────────────────────────────┐   │   │
│ │ │ repoName                          │   │   │ ← Args Form
│ │ │ [moinfra/mcp-client-sdk_______]  │   │   │
│ │ │ question                          │   │   │
│ │ │ [How do I get started?_______]   │   │   │
│ │ └───────────────────────────────────┘   │   │
│ │ [Call Tool]                             │   │
│ └─────────────────────────────────────────┘   │
├─────────────────────────────────────────────────┤
│                                                 │
│              💬 Chat Messages                   │
│                                                 │
│ ┌───────────────────────────────────────────┐ │
│ │ Tell me about moinfra/mcp-client-sdk      │ │ ← User Message
│ │                              2:30 PM      │ │
│ └───────────────────────────────────────────┘ │
│                                                 │
│ ┌───────────────────────────────────────────┐ │
│ │ 🤖 The moinfra/mcp-client-sdk is a...    │ │ ← AI Response
│ │                                           │ │
│ │ ---                                       │ │
│ │ **Additional information from MCP:**      │ │
│ │ Wiki Structure for moinfra/mcp-client-sdk:│ │
│ │ - Getting Started                         │ │
│ │ - API Reference                           │ │
│ │ - Examples                                │ │
│ │                                           │ │
│ │ MCP Tools Used:                           │ │
│ │ [✓ read_wiki_structure(moinfra/...)]     │ │ ← Tool Badges
│ │ [✓ ask_question(moinfra/...)]            │ │
│ └───────────────────────────────────────────┘ │
│                                                 │
├─────────────────────────────────────────────────┤
│ [Ask a question about the video..._______] [→] │ ← Input
└─────────────────────────────────────────────────┘
```

## 🎯 Usage Modes

### Mode 1: Automatic MCP Integration
**Best for:** Quick questions about GitHub repos

```
Just ask naturally:
✅ "What's in the moinfra/mcp-client-sdk?"
✅ "Explain the typescript-sdk architecture"
✅ "Show me modelcontextprotocol/typescript-sdk docs"

The system will:
1. Detect repository names
2. Call appropriate MCP tools
3. Enhance AI response with MCP data
4. Show which tools were used
```

### Mode 2: Manual Tool Calling
**Best for:** Specific tool calls with custom parameters

```
1. Connect to MCP server
2. Click on a tool in the list
3. Fill in parameters
4. Click "Call Tool"
5. View results in chat

Example:
Tool: ask_question
Args: {
  repoName: "moinfra/mcp-client-sdk",
  question: "How do I initialize a client?"
}
```

## 🔍 What Gets Called When

### Query Pattern → Tools Called

| Your Query | Auto-Detected Tools |
|------------|---------------------|
| "What's in [repo]?" | `read_wiki_structure` |
| "Show docs for [repo]" | `read_wiki_structure` + `read_wiki_contents` |
| "How does [repo] work?" | `read_wiki_structure` + `ask_question` |
| "Explain [repo]" | `read_wiki_structure` + `ask_question` |

### Trigger Keywords

**Repo Detection:**
- Repository name format: `owner/repo`
- Known repos: `moinfra/*`, `modelcontextprotocol/*`

**Question Detection:**
- how, what, why, when, where
- explain, describe, tell me
- guide, tutorial, help

## 💡 Pro Tips

### Tip 1: Be Specific with Repo Names
```
❌ "Tell me about the MCP client"
✅ "Tell me about moinfra/mcp-client-sdk"
```

### Tip 2: Combine File and MCP Questions
```
✅ "Summarize this video and compare it to the docs in moinfra/mcp-client-sdk"
→ AI will analyze your file AND fetch MCP data
```

### Tip 3: Use Follow-up Questions
```
Question 1: "What is moinfra/mcp-client-sdk?"
Question 2: "How do I use the connect method?"
→ Context is maintained, MCP tools called again
```

### Tip 4: Manual Tools for Complex Queries
```
When auto-detection isn't enough:
1. Open MCP panel
2. Select specific tool
3. Craft precise parameters
4. Get exact results
```

## 🐛 Troubleshooting

### MCP Not Connecting
```
Problem: "Failed to connect" error
Solution:
1. Check internet connection
2. Verify URL: https://mcp.deepwiki.com/mcp
3. Try disconnecting and reconnecting
4. Check browser console for errors
```

### Tools Not Being Called
```
Problem: No green badges showing
Solution:
1. Verify MCP is connected (look for green badge)
2. Include repository name in query: "owner/repo"
3. Use question words: how, what, explain
4. Try manual tool call instead
```

### No MCP Data in Response
```
Problem: Response has no "Additional information" section
Solution:
1. Check if repository exists on GitHub
2. Verify repository has wiki/documentation
3. Try different tool (use manual mode)
4. Check console for tool call errors
```

### Tool Call Fails
```
Problem: "MCP tool call failed" error
Solution:
1. Verify all required parameters are filled
2. Check parameter format (e.g., "owner/repo")
3. Try different repository
4. Disconnect and reconnect to MCP
```

## 📊 Feature Comparison

| Feature | Chat Page | FileChat |
|---------|-----------|----------|
| MCP Connection | ✅ | ✅ |
| Auto Tool Detection | ✅ | ✅ |
| Manual Tool Calling | ✅ | ✅ |
| Tool Usage Badges | ✅ | ✅ |
| Multi-repo Support | ✅ | ✅ |
| Error Handling | ✅ | ✅ |
| Tool Arguments UI | ✅ | ✅ |
| Server Info Display | ✅ | ✅ |

**Status: 100% Feature Parity** 🎉

## 🎓 Learning Path

### Beginner: Try Auto-Detection
```
1. Upload a file
2. Connect to DeepWiki
3. Ask: "Tell me about moinfra/mcp-client-sdk"
4. See the magic happen!
```

### Intermediate: Manual Tool Calls
```
1. Open MCP panel
2. Browse available tools
3. Select a tool
4. Fill parameters
5. Call tool manually
```

### Advanced: Multiple Repos
```
1. Ask: "Compare moinfra/mcp-client-sdk and modelcontextprotocol/typescript-sdk"
2. System calls tools for both repos
3. AI synthesizes information
```

## 🎯 Example Workflows

### Workflow 1: Learning a New Library
```
Step 1: "What is moinfra/mcp-client-sdk?"
        → Get overview + structure

Step 2: "How do I install it?"
        → Get installation instructions

Step 3: "Show me an example"
        → Get code examples

Step 4: "What are the main classes?"
        → Get API reference
```

### Workflow 2: Debugging
```
Step 1: Upload error log file

Step 2: Connect to MCP

Step 3: "Compare this error with moinfra/mcp-client-sdk docs"
        → AI analyzes file + fetches docs

Step 4: "What could cause this error based on the docs?"
        → Get troubleshooting help
```

### Workflow 3: Code Review
```
Step 1: Upload code file

Step 2: "Is this code following best practices from modelcontextprotocol/typescript-sdk?"
        → AI reviews code against official docs

Step 3: "What improvements are suggested in the docs?"
        → Get recommendations
```

## ✅ Success Checklist

Test your setup:

- [ ] MCP button (⚡) visible in header
- [ ] Can click and expand MCP panel
- [ ] Can connect to DeepWiki
- [ ] See "✓ Connected" message
- [ ] See list of 3 tools
- [ ] Can ask about a GitHub repo
- [ ] See green tool badges in response
- [ ] See "Additional information from MCP server" section
- [ ] Can select a tool manually
- [ ] Can fill tool parameters
- [ ] Can call tool and see results
- [ ] Can disconnect from MCP

**All checked? You're ready to use FileChat with MCP! 🚀**

## 📚 Additional Resources

- **MCP Protocol**: https://modelcontextprotocol.io
- **DeepWiki**: https://deepwiki.com
- **MCP Client SDK**: https://github.com/moinfra/mcp-client-sdk
- **TypeScript SDK**: https://github.com/modelcontextprotocol/typescript-sdk

---

**Need Help?** Check the main documentation: `FILE_CHAT_MCP_COMPLETE.md`

**Found a Bug?** Check the troubleshooting section above first.

**Want More?** The implementation is complete and feature-complete with the Chat page!
