# 🚀 Local File Access - Quick Reference

## One-Page Cheat Sheet

---

## 🎯 Quick Start

```typescript
import { pickFile, pickDirectory, readDirectory } from '@/lib/localFileAccess';
import LocalFilePicker from '@/components/LocalFilePicker';
```

---

## 📁 Core Functions

### **Pick Single/Multiple Files**
```typescript
const files = await pickFile({ multiple: true });
// Returns: File[]
```

### **Pick Directory**
```typescript
const dirHandle = await pickDirectory();
// Returns: FileSystemDirectoryHandle | null
```

### **Read Directory (Recursive)**
```typescript
const directory = await readDirectory(dirHandle, '', 5);
// Returns: LocalDirectory
```

### **Get All Files (Flat)**
```typescript
const allFiles = flattenDirectory(directory);
// Returns: LocalFile[]
```

---

## 🔍 Filtering & Search

### **Filter by Extension**
```typescript
const videos = filterFilesByExtension(files, ['.mp4', '.webm']);
```

### **Filter by MIME Type**
```typescript
const videos = filterFilesByType(files, ['video/*']);
```

### **Search by Name**
```typescript
const results = searchFilesByName(files, 'report');
```

---

## 💾 Persistence

### **Save Directory Handle**
```typescript
await saveDirectoryHandle('my-folder', dirHandle);
```

### **Load Saved Handle**
```typescript
const handle = await getDirectoryHandle('my-folder');
```

### **Get All Saved**
```typescript
const dirs = await getAllDirectoryHandles();
```

### **Remove Saved**
```typescript
await removeDirectoryHandle('my-folder');
```

---

## 🔒 Permissions

### **Verify Permission**
```typescript
const hasPermission = await verifyPermission(dirHandle);
if (!hasPermission) {
  // Permission denied or revoked
}
```

---

## 🎨 React Component

### **Basic Usage**
```tsx
<LocalFilePicker
  onFileSelect={(file, localFile) => {
    console.log('Selected:', localFile.name);
  }}
/>
```

### **Multiple Files**
```tsx
<LocalFilePicker
  allowMultiple={true}
  onFilesSelect={(files) => {
    console.log('Selected:', files.length, 'files');
  }}
/>
```

### **With File Type Filter**
```tsx
<LocalFilePicker
  acceptedTypes={['.mp4', '.pdf', '.jpg']}
  onFileSelect={(file, localFile) => {
    // Only mp4, pdf, jpg allowed
  }}
/>
```

---

## 📊 Type Definitions

```typescript
interface LocalFile {
  name: string;           // 'video.mp4'
  path: string;           // 'folder/video.mp4'
  size: number;           // bytes
  type: string;           // 'video/mp4'
  lastModified: number;   // timestamp
  handle?: FileSystemFileHandle;
}

interface LocalDirectory {
  name: string;
  path: string;
  handle: FileSystemDirectoryHandle;
  files: LocalFile[];
  subdirectories: LocalDirectory[];
}
```

---

## 🧪 Test Checklist

**Browser Support:**
```typescript
if (isFileSystemAccessSupported()) {
  // File System Access available
} else {
  // Show fallback UI
}
```

**Test Flow:**
1. ✅ Open `/analyze`
2. ✅ Click "Access Local Files"
3. ✅ Try "Pick Files"
4. ✅ Try "Browse Folder"
5. ✅ Search & filter
6. ✅ Select files
7. ✅ Check persistence

---

## 🔧 Utilities

### **Format File Size**
```typescript
formatFileSize(1234567); // "1.18 MB"
```

### **Get Extension**
```typescript
getFileExtension('video.mp4'); // ".mp4"
```

### **Get MIME Type**
```typescript
getMimeTypeFromExtension('.mp4'); // "video/mp4"
```

### **Read File Content**
```typescript
const text = await readFileAsText(file);
const dataUrl = await readFileAsDataURL(file);
const buffer = await readFileAsArrayBuffer(file);
```

---

## 🚨 Error Handling

```typescript
try {
  const files = await pickFile();
} catch (error) {
  if (error.name === 'AbortError') {
    // User cancelled
  } else if (error.name === 'NotAllowedError') {
    // Permission denied
  } else {
    // Other error
  }
}
```

---

## 🎯 Common Patterns

### **Pattern 1: Quick File Pick**
```typescript
const files = await pickFile({ multiple: false });
if (files.length > 0) {
  analyzeFile(files[0]);
}
```

### **Pattern 2: Browse & Filter**
```typescript
const dirHandle = await pickDirectory();
const directory = await readDirectory(dirHandle);
const allFiles = flattenDirectory(directory);
const videos = filterFilesByExtension(allFiles, ['.mp4']);
```

### **Pattern 3: Save & Reload**
```typescript
// First visit
const dirHandle = await pickDirectory();
await saveDirectoryHandle('my-videos', dirHandle);

// Later visits
const handle = await getDirectoryHandle('my-videos');
if (handle && await verifyPermission(handle)) {
  const directory = await readDirectory(handle);
}
```

---

## 📱 Browser Support Quick Check

| Browser | Version | Status |
|---------|---------|--------|
| Chrome | 86+ | ✅ |
| Edge | 86+ | ✅ |
| Safari | All | ❌ |
| Firefox | All | ⚠️ Flag |
| Mobile | All | ❌ |

---

## 🎨 Component Props

```typescript
interface LocalFilePickerProps {
  onFileSelect?: (file: File, localFile: LocalFile) => void;
  onFilesSelect?: (files: Array<{file: File; localFile: LocalFile}>) => void;
  allowMultiple?: boolean;      // default: true
  acceptedTypes?: string[];     // e.g. ['.mp4', '.pdf']
}
```

---

## 💡 Pro Tips

1. **Always check support first**
   ```typescript
   if (!isFileSystemAccessSupported()) return;
   ```

2. **Handle permissions gracefully**
   ```typescript
   const hasPermission = await verifyPermission(handle);
   ```

3. **Limit recursion depth**
   ```typescript
   readDirectory(handle, '', 3); // Max 3 levels
   ```

4. **Cache directory structures**
   ```typescript
   const [dir, setDir] = useState<LocalDirectory | null>(null);
   ```

5. **Show loading states**
   ```typescript
   const [loading, setLoading] = useState(false);
   ```

---

## 🔗 Related Files

- `/lib/localFileAccess.ts` - Core API
- `/components/LocalFilePicker.tsx` - React component
- `/app/analyze/page.tsx` - Integration example

---

## 🎓 Learning Resources

**MDN Docs:**
- [File System Access API](https://developer.mozilla.org/en-US/docs/Web/API/File_System_Access_API)
- [showOpenFilePicker()](https://developer.mozilla.org/en-US/docs/Web/API/Window/showOpenFilePicker)
- [showDirectoryPicker()](https://developer.mozilla.org/en-US/docs/Web/API/Window/showDirectoryPicker)

**Guides:**
- `LOCAL_FILE_ACCESS_COMPLETE.md` - Full documentation
- `QUICK_LOCAL_FILE_TEST.md` - Testing guide
- `PHASE_2_SUMMARY.md` - Implementation summary

---

## ⚡ One-Liners

```typescript
// Check support
isFileSystemAccessSupported()

// Pick file
const [file] = await pickFile()

// Pick directory
const dir = await pickDirectory()

// Get all files
const files = flattenDirectory(await readDirectory(dir))

// Filter videos
const videos = filterFilesByExtension(files, ['.mp4'])

// Search
const results = searchFilesByName(files, 'keyword')

// Save
await saveDirectoryHandle('name', dirHandle)

// Load
const handle = await getDirectoryHandle('name')
```

---

**Need help? Check the full docs!** 📚
