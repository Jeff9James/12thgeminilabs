# Test Spreadsheet Preview Feature

## Quick Testing Guide

### 1. Start the Development Server
```bash
cd video-platform
npm run dev
```
Server will be available at: http://localhost:3000

### 2. Test Upload & Preview

#### Option A: Upload a Spreadsheet File
1. Navigate to http://localhost:3000/analyze
2. Click "Upload File" or drag and drop
3. Select a spreadsheet file:
   - Excel file (.xlsx, .xls)
   - CSV file (.csv)
   - OpenDocument Spreadsheet (.ods)
4. **Expected Result**: 
   - Preview should render immediately showing the spreadsheet as an HTML table
   - You should see all rows and columns
   - If multiple sheets, tabs should appear at the top

#### Option B: Create a Quick Test CSV
Create a file named `test.csv` with this content:
```csv
Name,Age,Department,Salary
John Doe,30,Engineering,75000
Jane Smith,28,Marketing,65000
Bob Johnson,35,Sales,70000
Alice Williams,32,Engineering,80000
Charlie Brown,29,Design,62000
```

Then upload this file.

### 3. Verify All Features

#### ✅ During Upload
- [ ] Preview appears while file is being processed
- [ ] Table renders with proper styling
- [ ] Headers are visible (sticky at top)
- [ ] Data is readable and properly formatted

#### ✅ After Upload (File Detail Page)
- [ ] Navigate to the file detail page
- [ ] Preview still shows correctly
- [ ] Can scroll through large spreadsheets
- [ ] All columns are visible

#### ✅ Multi-Sheet Workbooks
- [ ] Upload an Excel file with multiple sheets
- [ ] Sheet tabs appear at the top
- [ ] Can switch between sheets
- [ ] Each sheet displays correctly

#### ✅ Styling & UX
- [ ] Green gradient header with spreadsheet icon
- [ ] Download button works
- [ ] Table has alternating row colors
- [ ] Rows highlight on hover
- [ ] Headers are sticky when scrolling
- [ ] Borders are clean and visible

#### ✅ Error Handling
- [ ] Upload a corrupted file
- [ ] Error message displays
- [ ] Download button still available as fallback

#### ✅ File Management
- [ ] File appears in "My Files" page
- [ ] Can delete the file
- [ ] File is removed from IndexedDB
- [ ] Preview works after page refresh

### 4. Browser Console Check
Open browser DevTools (F12) and check for:
- No JavaScript errors
- No console warnings (except Next.js warnings)
- Successful IndexedDB operations logged

### 5. Test Different Spreadsheet Types

#### CSV File
Simple comma-separated values - should render cleanly

#### Excel File (.xlsx)
- Supports multiple sheets
- Preserves data types
- Handles formulas (shows calculated values)

#### OpenDocument Spreadsheet (.ods)
LibreOffice/OpenOffice format - should work identically to Excel

### 6. Performance Test

#### Small File (< 100 rows)
- [ ] Renders instantly
- [ ] Smooth scrolling
- [ ] No lag

#### Medium File (100-1000 rows)
- [ ] Renders in < 2 seconds
- [ ] Scrolling is smooth
- [ ] Headers remain visible

#### Large File (> 1000 rows)
- [ ] May take a few seconds to parse
- [ ] Loading indicator shows
- [ ] Final render is smooth

### 7. Mobile/Responsive Test
- [ ] Test on mobile device or narrow browser window
- [ ] Table scrolls horizontally if needed
- [ ] Download button accessible
- [ ] Sheet tabs scroll horizontally

## Expected Visual Appearance

### Header Section
```
┌─────────────────────────────────────────────────────────┐
│ 📊 filename.xlsx                         [Download]     │
│ Spreadsheet • 3 sheets                                  │
│ ┌──────┬──────┬──────┐                                 │
│ │Sheet1│Sheet2│Sheet3│                                 │
│ └──────┴──────┴──────┘                                 │
└─────────────────────────────────────────────────────────┘
```

### Table View
```
┌─────────────┬─────┬────────────┬────────┐
│ Name        │ Age │ Department │ Salary │  <-- Sticky Header
├─────────────┼─────┼────────────┼────────┤
│ John Doe    │ 30  │ Engineering│ 75000  │  <-- White row
├─────────────┼─────┼────────────┼────────┤
│ Jane Smith  │ 28  │ Marketing  │ 65000  │  <-- Gray row
├─────────────┼─────┼────────────┼────────┤
│ Bob Johnson │ 35  │ Sales      │ 70000  │  <-- White row (hover: light gray)
└─────────────┴─────┴────────────┴────────┘
```

## Common Issues & Solutions

### Issue: "Failed to load spreadsheet"
**Solution**: Check that the file is a valid spreadsheet format. Try with a different file.

### Issue: Preview not showing
**Solution**: 
1. Check browser console for errors
2. Verify IndexedDB is enabled in browser
3. Clear IndexedDB storage and try again

### Issue: Slow rendering for large files
**Solution**: This is expected for files with thousands of rows. The XLSX library needs time to parse.

### Issue: Formulas not showing
**Solution**: The library shows calculated values, not formulas. This is expected behavior.

## Success Criteria ✅

The feature is working correctly if:
1. ✅ Spreadsheet files upload without errors
2. ✅ Preview renders as an HTML table
3. ✅ Data is accurate and readable
4. ✅ Multi-sheet navigation works
5. ✅ Download button functions
6. ✅ Preview persists after page refresh
7. ✅ No console errors
8. ✅ Styling looks professional

## Demo Spreadsheet Content
Use this content to create a test spreadsheet with various data types:

### Sheet 1: Employee Data
| Employee ID | Name           | Department  | Hire Date  | Salary  | Active |
|-------------|----------------|-------------|------------|---------|--------|
| 1001        | John Doe       | Engineering | 2020-01-15 | 75000   | Yes    |
| 1002        | Jane Smith     | Marketing   | 2019-06-20 | 65000   | Yes    |
| 1003        | Bob Johnson    | Sales       | 2021-03-10 | 70000   | Yes    |
| 1004        | Alice Williams | Engineering | 2020-08-05 | 80000   | Yes    |
| 1005        | Charlie Brown  | Design      | 2022-02-14 | 62000   | No     |

### Sheet 2: Sales Data
| Month   | Region | Sales   | Target  | Growth |
|---------|--------|---------|---------|--------|
| Jan     | East   | 120000  | 100000  | 20%    |
| Jan     | West   | 95000   | 100000  | -5%    |
| Feb     | East   | 135000  | 110000  | 23%    |
| Feb     | West   | 105000  | 110000  | -5%    |

### Sheet 3: Inventory
| Product     | SKU      | Quantity | Price  | In Stock |
|-------------|----------|----------|--------|----------|
| Widget A    | WA-001   | 150      | 29.99  | Yes      |
| Widget B    | WB-002   | 75       | 49.99  | Yes      |
| Gadget X    | GX-003   | 0        | 79.99  | No       |
| Gadget Y    | GY-004   | 200      | 59.99  | Yes      |

## Next Steps After Testing

Once you verify the feature works:
1. ✅ Mark the issue as resolved
2. ✅ Update project documentation
3. ✅ Deploy to production
4. ✅ Monitor for any user feedback
5. ✅ Consider implementing optional enhancements (cell selection, search, etc.)

## Support
If you encounter any issues during testing:
1. Check the `SPREADSHEET_PREVIEW_FIX.md` documentation
2. Review browser console for errors
3. Verify all dependencies are installed (`npm install`)
4. Clear browser cache and IndexedDB
5. Try with a fresh spreadsheet file
