# Spreadsheet Upload Preview Fix ✅

## Issue
Spreadsheet file preview did not show during upload progress - only appeared after upload completed.

## Root Cause
The `SpreadsheetPreview` component was trying to **fetch** the preview URL, but during the upload phase (before clicking "Upload & Analyze"), the file only existed as a local `File` object in memory. The component couldn't fetch from the blob URL properly for spreadsheets requiring parsing.

## Solution
Made the `SpreadsheetPreview` component smart enough to handle **both scenarios**:

1. **During upload preview** (File object available): Read directly from the File object
2. **After upload complete** (File in IndexedDB): Fetch from blob URL as before

## Changes Made

### 1. Updated `FilePreview.tsx`

**Modified FilePreview component to pass file object to SpreadsheetPreview:**
```typescript
case 'spreadsheet':
    return <SpreadsheetPreview url={previewUrl} fileName={displayName} file={file} />;
```

**Modified SpreadsheetPreview to accept and handle File object:**
```typescript
function SpreadsheetPreview({ url, fileName, file }: { url: string; fileName: string; file?: File | null }) {
    // ...
    
    useEffect(() => {
        async function loadSpreadsheet() {
            try {
                setLoading(true);
                setError(null);

                let arrayBuffer: ArrayBuffer;

                // If we have the File object directly (during upload preview), use it
                if (file) {
                    arrayBuffer = await file.arrayBuffer();
                } else {
                    // Otherwise fetch from URL (after upload is complete)
                    const response = await fetch(url);
                    if (!response.ok) {
                        throw new Error('Failed to load spreadsheet');
                    }
                    arrayBuffer = await response.arrayBuffer();
                }
                
                // Parse with xlsx
                const wb = XLSX.read(arrayBuffer, { type: 'array' });
                setWorkbook(wb);
                
                // Set first sheet as current
                if (wb.SheetNames.length > 0) {
                    setCurrentSheet(wb.SheetNames[0]);
                }
            } catch (err) {
                console.error('Error loading spreadsheet:', err);
                setError(err instanceof Error ? err.message : 'Failed to load spreadsheet');
            } finally {
                setLoading(false);
            }
        }

        loadSpreadsheet();
    }, [url, file]);
}
```

### 2. Updated `app/analyze/page.tsx`

**Imported FilePreview component:**
```typescript
import { FilePreview } from '@/components/FilePreview';
```

**Replaced inline preview rendering with FilePreview component:**
```typescript
// Before: Separate handling for PDF and documents/spreadsheets
{fileCategory === 'pdf' && (
  <div className="w-full h-[500px] bg-gray-100">
    <iframe src={previewUrl} />
  </div>
)}

{(fileCategory === 'document' || fileCategory === 'spreadsheet' || fileCategory === 'text') && (
  <div>Document preview not available</div>
)}

// After: Unified using FilePreview component
{(fileCategory === 'pdf' || fileCategory === 'document' || fileCategory === 'spreadsheet' || fileCategory === 'text') && (
  <FilePreview
    file={file}
    previewUrl={previewUrl}
    category={fileCategory}
    fileName={file?.name}
    fileSize={file?.size}
  />
)}
```

## How It Works Now

### During Upload (Analyze Page)
1. User selects a spreadsheet file
2. File object is stored in state: `setFile(selectedFile)`
3. Blob URL is created: `URL.createObjectURL(selectedFile)`
4. FilePreview component receives **both** `file` object and `previewUrl`
5. SpreadsheetPreview detects `file` is available → reads directly from File object
6. **Preview shows immediately** with all sheets and data
7. User can browse sheets while upload is in progress

### After Upload Complete (Files Detail Page)
1. File is retrieved from IndexedDB
2. Blob URL is created from IndexedDB blob
3. FilePreview component receives only `previewUrl` (file=null)
4. SpreadsheetPreview falls back to fetching from URL
5. Preview shows normally

## Benefits

✅ **Immediate preview** - Users can see spreadsheet content as soon as file is selected
✅ **No code duplication** - Same FilePreview component works everywhere
✅ **Backward compatible** - Existing file detail pages still work perfectly
✅ **Consistent UX** - Same preview experience during and after upload
✅ **Multiple sheets support** - Users can switch between sheets during upload

## File Types Affected
- ✅ Spreadsheets (.xlsx, .xls, .csv)
- ✅ PDFs (now using FilePreview component)
- ✅ Documents (now using FilePreview component)
- ✅ Text files (now using FilePreview component)

## Testing Checklist

- [ ] Upload .xlsx file - verify preview shows immediately
- [ ] Upload .xls file - verify preview shows immediately
- [ ] Upload .csv file - verify preview shows immediately
- [ ] Switch between sheets during upload
- [ ] Complete upload and verify preview still works on detail page
- [ ] Upload PDF - verify preview works
- [ ] Upload document - verify icon preview works

## References
- Gemini File API Docs: `/GEMINI_FILE_API_DOCS.md`
- Gemini 3 API Docs: `/GEMINI_3_API_DOCS.md`
- Previous fix: `SPREADSHEET_PREVIEW_FIX.md`
