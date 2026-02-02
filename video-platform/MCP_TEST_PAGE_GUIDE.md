# MCP Test Page Guide

## 🎯 Purpose

A dedicated test page to verify the MCP proxy integration works correctly before using it in the main Chat page.

## 📍 Location

Navigate to: **`/mcp-test`**

Full URL: `https://your-app.vercel.app/mcp-test` or `http://localhost:3000/mcp-test`

## 🧪 How to Use

### Step 1: Open the Test Page
```
http://localhost:3000/mcp-test
```

### Step 2: Configure
1. MCP Server URL is pre-filled: `https://mcp.deepwiki.com/mcp`
2. ✅ Make sure **"Use Proxy to Bypass CORS"** is checked

### Step 3: Run Test 1 (Proxy API)
1. Click **"Test 1: Proxy API Directly"**
2. This tests if the proxy endpoint works
3. Watch the browser console for logs
4. Check the result JSON below

**Expected Result:**
```json
{
  "success": true,
  "status": 200,
  "data": {
    "jsonrpc": "2.0",
    "id": 1,
    "result": {
      "protocolVersion": "2024-11-05",
      "capabilities": {...},
      "serverInfo": {
        "name": "...",
        "version": "..."
      }
    }
  }
}
```

### Step 4: Run Test 2 (MCP Client)
1. Only runs if proxy is enabled
2. Click **"Test 2: With MCP Client"**
3. This tests the full integration
4. Watch console for detailed logs
5. Check the result

**Expected Result:**
```json
{
  "serverInfo": {
    "name": "MCP Server",
    "version": "1.0.0",
    "capabilities": {...}
  },
  "tools": [...],
  "resources": [...],
  "connected": true
}
```

## 🔍 Console Logs to Watch For

### Test 1 Logs:
```
MCPProxyTransport: Created with targetUrl: https://mcp.deepwiki.com/mcp
MCPProxyTransport: Sending message via proxy
MCPProxyTransport: Target URL: https://mcp.deepwiki.com/mcp
MCPProxyTransport: Request body: {targetUrl: "...", method: "POST", payload: {...}}
MCP Proxy POST request: {targetUrl: "...", method: "POST", hasPayload: true}
MCP Server response: {status: 200, ok: true, ...}
```

### Test 2 Logs:
```
Creating MCP Client with: {serverUrl: "...", useProxy: true, ...}
Using proxy transport for https://mcp.deepwiki.com/mcp
MCPProxyTransport: Starting connection via proxy to ...
Connecting...
Connected! Getting capabilities...
✅ Connected successfully! Tools: 5, Resources: 12
```

## ❌ Troubleshooting

### Error: "targetUrl is required"

**Problem**: The request body isn't being sent correctly

**Check:**
1. Look at console log: `MCPProxyTransport: Request body:`
2. Verify it shows: `{targetUrl: "...", method: "POST", payload: {...}}`
3. If targetUrl is missing, the transport isn't being used correctly

**Solution**: Make sure proxy checkbox is checked

### Error: "Failed to fetch"

**Problem**: Network issue or proxy endpoint not found

**Check:**
1. Is the app running?
2. Is `/api/mcp/proxy` accessible?
3. Check Network tab in browser DevTools

**Solution**: Restart the dev server

### Error: "CORS"

**Problem**: Direct connection attempted instead of proxy

**Check:**
1. Is the proxy checkbox checked?
2. Look for log: `Using proxy transport for...`

**Solution**: Enable proxy checkbox

### Error: "Proxy returned unsuccessful result"

**Problem**: Proxy received the request but MCP server returned error

**Check:**
1. Look at the full error in result JSON
2. Check if MCP server URL is correct
3. Verify MCP server is accessible

**Solution**: Try a different MCP server URL

## 📊 What Each Test Does

### Test 1: Proxy API Directly
- Sends a raw HTTP POST to `/api/mcp/proxy`
- Bypasses the MCP Client SDK
- Tests if the proxy endpoint works
- **Purpose**: Verify proxy is functional

### Test 2: With MCP Client
- Uses the full MCP Client SDK
- Uses MCPProxyTransport
- Tests complete integration
- **Purpose**: Verify end-to-end flow

## ✅ Success Criteria

**Test 1 Success:**
- Status shows: ✅ Proxy test successful!
- Result has `success: true`
- Result has `data` with server response

**Test 2 Success:**
- Status shows: ✅ Connected successfully! Tools: X, Resources: Y
- Result has `serverInfo`
- Result has `tools` array
- Result has `resources` array
- Result has `connected: true`

## 🎯 Next Steps After Success

Once both tests pass:
1. The proxy integration is working
2. You can use it in the Chat page
3. Any MCP server can be connected via proxy

## 📝 Notes

- **Proxy is required** for external MCP servers due to CORS
- **Test 2 only works** with proxy enabled
- **Console logs** are your friend for debugging
- **Result JSON** shows exactly what was returned

## 🚀 Quick Test Checklist

- [ ] Navigate to `/mcp-test`
- [ ] Proxy checkbox is checked
- [ ] Click "Test 1: Proxy API Directly"
- [ ] Verify success message
- [ ] Check result JSON
- [ ] Click "Test 2: With MCP Client"
- [ ] Verify success message
- [ ] Check tools and resources count
- [ ] Check browser console for logs
- [ ] All tests pass ✅

---

**If all tests pass**, the MCP integration is working perfectly and you can connect to any MCP server using the proxy! 🎉
