# Testing Spreadsheet Preview Fix 🧪

## Quick Test Steps

### Test 1: Immediate Preview on Upload Page
1. Navigate to `/analyze` page
2. Click "Select File"
3. Choose a spreadsheet file (.xlsx, .xls, or .csv)
4. **Expected**: Preview appears **immediately** with spreadsheet data
5. **Verify**: Can see actual data in table format
6. **Verify**: Sheet tabs appear if multiple sheets exist
7. **Status**: ✅ PASS / ❌ FAIL

### Test 2: Browse Multiple Sheets During Upload
1. Select a multi-sheet Excel file
2. **Expected**: All sheet tabs appear
3. Click different sheet tabs
4. **Expected**: Sheet content switches instantly
5. **Status**: ✅ PASS / ❌ FAIL

### Test 3: Preview Persists During Upload
1. Select spreadsheet file → preview shows
2. Click "Upload & Analyze Spreadsheet"
3. **Expected**: Preview remains visible during upload
4. **Expected**: Upload progress shows below preview
5. **Status**: ✅ PASS / ❌ FAIL

### Test 4: Preview Works After Upload Complete
1. Complete upload from Test 3
2. Redirected to `/files/[id]` page
3. **Expected**: Preview still works perfectly
4. **Expected**: Can still browse sheets
5. **Expected**: No console errors
6. **Status**: ✅ PASS / ❌ FAIL

### Test 5: Different Spreadsheet Formats
Test each format:

**Excel 2007+ (.xlsx)**
- File: `test_data.xlsx`
- Expected: Full preview with formatting
- Status: ✅ PASS / ❌ FAIL

**Excel 97-2003 (.xls)**
- File: `legacy_data.xls`
- Expected: Full preview
- Status: ✅ PASS / ❌ FAIL

**CSV (.csv)**
- File: `data.csv`
- Expected: Single sheet preview
- Status: ✅ PASS / ❌ FAIL

### Test 6: Large Spreadsheet
1. Select a large file (5MB+, 10,000+ rows)
2. **Expected**: Loading spinner appears
3. **Expected**: Preview loads within 1-2 seconds
4. **Expected**: Can scroll through data smoothly
5. **Status**: ✅ PASS / ❌ FAIL

### Test 7: Empty Spreadsheet
1. Select an empty .xlsx file
2. **Expected**: Shows "No data available" message gracefully
3. **Expected**: No errors in console
4. **Status**: ✅ PASS / ❌ FAIL

### Test 8: Corrupted File
1. Select a corrupted/invalid spreadsheet file
2. **Expected**: Error message appears
3. **Expected**: Download button still available
4. **Expected**: No app crash
5. **Status**: ✅ PASS / ❌ FAIL

## Sample Test Files

### Create Test Files
You can use these sample data structures:

**test_small.xlsx**
```
Sheet1: Sales Data
| Name  | Sales   | Region | Quarter |
|-------|---------|--------|---------|
| John  | $50,000 | North  | Q1      |
| Sarah | $65,000 | South  | Q1      |
| Mike  | $48,000 | East   | Q1      |

Sheet2: Expenses
| Category | Amount  | Month |
|----------|---------|-------|
| Rent     | $5,000  | Jan   |
| Salaries | $25,000 | Jan   |
```

**test_large.xlsx**
- 10,000 rows of data
- Multiple sheets (5+)
- Various data types (text, numbers, dates, formulas)

**test_empty.xlsx**
- Empty file with just headers

## Console Checks

### No Errors Expected
Open browser console (F12) and verify:
- ❌ No "Failed to fetch" errors
- ❌ No "Cannot read property" errors
- ❌ No XLSX parsing errors
- ✅ Optional info logs are OK

### Expected Console Logs
```
Saving spreadsheet file to IndexedDB...
✓ File saved successfully
```

## Performance Benchmarks

### Target Performance
| File Size | Preview Load Time | Target |
|-----------|------------------|--------|
| < 1MB     | < 200ms         | ✅ PASS |
| 1-5MB     | < 500ms         | ✅ PASS |
| 5-10MB    | < 1s            | ✅ PASS |
| > 10MB    | < 2s            | ⚠️ ACCEPTABLE |

### How to Measure
```javascript
// In browser console
console.time('spreadsheet-load');
// Select file
// Wait for preview
console.timeEnd('spreadsheet-load');
```

## Visual Checklist

### Upload Page Preview
- [ ] Header shows file icon and category
- [ ] File name displayed correctly
- [ ] File size shown
- [ ] Download button present
- [ ] Sheet tabs visible (if multiple sheets)
- [ ] Active sheet highlighted
- [ ] Table headers have gray background
- [ ] Table cells have borders
- [ ] Row hover effect works
- [ ] Table scrolls if content is large

### Detail Page Preview
- [ ] Same visual quality as upload page
- [ ] All sheets still accessible
- [ ] Download button works
- [ ] No layout shifts or flicker

## Browser Compatibility Testing

Test in multiple browsers:

**Chrome/Edge**
- [ ] Preview loads
- [ ] No console errors
- [ ] Smooth performance

**Firefox**
- [ ] Preview loads
- [ ] No console errors
- [ ] Smooth performance

**Safari**
- [ ] Preview loads
- [ ] No console errors
- [ ] Smooth performance

## Edge Cases

### Test Edge Case 1: Rapid File Selection
1. Select file A → preview starts loading
2. Immediately select file B
3. **Expected**: File A preview cancelled
4. **Expected**: File B preview shows
5. **Expected**: No memory leaks

### Test Edge Case 2: Navigation During Load
1. Select large file → preview loading
2. Click back/navigate away before load completes
3. **Expected**: No errors
4. **Expected**: Preview cancels cleanly

### Test Edge Case 3: Multiple Tabs
1. Open same file in two browser tabs
2. **Expected**: Both previews work independently
3. **Expected**: No conflicts

## Regression Testing

Ensure other file types still work:

- [ ] Video preview works
- [ ] Audio preview works
- [ ] Image preview works
- [ ] PDF preview works
- [ ] Document icon preview works

## API Validation

### Verify Gemini Upload Still Works
1. Upload spreadsheet with preview
2. Check localStorage for metadata
3. **Expected**: `geminiFileUri` present
4. **Expected**: `geminiFileName` present
5. **Expected**: Upload completes successfully

### Verify IndexedDB Storage
1. Open DevTools → Application → IndexedDB
2. Navigate to `gemini-video-storage` database
3. Check `files` object store
4. **Expected**: Uploaded file present with correct ID
5. **Expected**: File blob stored correctly

## Test Report Template

```
## Spreadsheet Preview Test Report
Date: [DATE]
Tester: [NAME]
Browser: [BROWSER VERSION]

### Summary
- Tests Passed: __ / 8
- Tests Failed: __ / 8
- Performance: ✅ Excellent / ⚠️ Acceptable / ❌ Poor

### Detailed Results
[Copy test results here]

### Issues Found
[List any issues]

### Recommendations
[Any suggestions]
```

## Automated Testing (Future)

Consider adding E2E tests:

```typescript
// Example Playwright test
test('spreadsheet preview shows immediately', async ({ page }) => {
  await page.goto('/analyze');
  
  const fileInput = await page.locator('input[type="file"]');
  await fileInput.setInputFiles('test_data.xlsx');
  
  // Preview should appear within 500ms
  await expect(page.locator('.spreadsheet-preview')).toBeVisible({ timeout: 500 });
  
  // Should have sheet tabs
  await expect(page.locator('button:has-text("Sheet1")')).toBeVisible();
  
  // Should have table data
  await expect(page.locator('table')).toBeVisible();
});
```

## Success Criteria

All tests must pass for release:
- ✅ All 8 manual tests pass
- ✅ No console errors
- ✅ Performance within targets
- ✅ Works in Chrome, Firefox, Safari
- ✅ No regression in other file types
- ✅ Upload to Gemini still works
- ✅ IndexedDB storage works

## Known Limitations

Current limitations (acceptable):
- Very large files (50MB+) may take 2-3 seconds to preview
- Complex Excel formulas are converted to values (XLSX library limitation)
- Charts and images in Excel not displayed (data only)
- Macros not executed (security feature)

These limitations are **by design** and don't affect core functionality.
