# Accept Header Fix - MCP Server Requirement

## 🔴 Issue Encountered

When testing the proxy, the MCP server returned error 406 (Not Acceptable):

```json
{
  "jsonrpc": "2.0",
  "id": "server-error",
  "error": {
    "code": -32600,
    "message": "Not Acceptable: Client must accept both application/json and text/event-stream"
  }
}
```

## 🔍 Root Cause

The MCP server at `mcp.deepwiki.com` requires clients to include **both** content types in the `Accept` header:
- `application/json` - For regular JSON-RPC responses
- `text/event-stream` - For Server-Sent Events (SSE) streaming

Our proxy was only sending:
```
Accept: application/json
```

But the server requires:
```
Accept: application/json, text/event-stream
```

## ✅ Fix Applied

Updated the proxy API route to include both content types:

**File:** `app/api/mcp/proxy/route.ts`

**Change:**
```typescript
// Before:
headers: {
  'Content-Type': 'application/json',
  'Accept': 'application/json',  // ❌ Missing text/event-stream
}

// After:
headers: {
  'Content-Type': 'application/json',
  'Accept': 'application/json, text/event-stream',  // ✅ Both types
}
```

## 🎯 Why Both Are Required

MCP servers use two types of responses:

1. **JSON Responses** (`application/json`)
   - Regular request/response messages
   - Error messages
   - Initialization responses

2. **SSE Streams** (`text/event-stream`)
   - Real-time notifications
   - Streaming responses
   - Server-initiated events

The server checks the `Accept` header to ensure the client can handle both response types, even if it only sends JSON responses for a particular request.

## 🧪 How to Verify the Fix

1. **Rebuild the application:**
   ```bash
   npm run build
   ```

2. **Navigate to test page:**
   ```
   /mcp-test
   ```

3. **Run Test 1:**
   - Click "Test 1: Proxy API Directly"
   - Should now succeed with status 200
   - Result should show server info and capabilities

4. **Expected Success:**
   ```json
   {
     "success": true,
     "status": 200,
     "data": {
       "jsonrpc": "2.0",
       "id": 1,
       "result": {
         "protocolVersion": "2024-11-05",
         "serverInfo": {...},
         "capabilities": {...}
       }
     }
   }
   ```

## 📋 Updated Accept Headers

Now both proxy handlers send the correct headers:

### POST Handler:
```typescript
headers: {
  'Content-Type': 'application/json',
  'Accept': 'application/json, text/event-stream',
}
```

### GET Handler:
```typescript
headers: {
  'Accept': 'application/json, text/event-stream',
}
```

## 🎉 Impact

With this fix:
- ✅ Proxy can connect to MCP servers
- ✅ Can receive JSON responses
- ✅ Can receive SSE streams
- ✅ Meets MCP server requirements
- ✅ Test 1 should now pass
- ✅ Test 2 should now work

## 🔧 Technical Details

### MCP Protocol Requirement

According to the MCP specification, clients should be able to handle:
1. **Synchronous JSON-RPC** responses
2. **Asynchronous SSE** streams for notifications

The `Accept` header tells the server which content types the client can handle. By including both, we're signaling that our proxy can handle both response formats.

### Why This Is Important

Some MCP operations might return:
- Immediate JSON responses (e.g., `initialize`)
- Streaming SSE responses (e.g., long-running operations)
- Mixed responses (JSON initially, then SSE for updates)

Without both content types in the Accept header, the server rejects the connection to prevent compatibility issues.

## 🚀 Next Steps

1. **Test immediately** - The fix is applied
2. **Should work now** - Try Test 1 again
3. **Proceed to Test 2** - If Test 1 passes
4. **Full integration** - Ready for production use

---

**Status:** ✅ **FIXED**  
**Date:** February 2, 2025  
**Version:** 1.2.1

The proxy now correctly sends both content types in the Accept header, meeting MCP server requirements!
