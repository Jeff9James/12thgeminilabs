# PHASE 9: Testing, Deployment & Production Optimization

## TASK TITLE: Build Gemini-Powered Video Understanding Web App - Phase 9: Production-Ready Deployment

**PRIORITY: CRITICAL** - App must be stable, performant, and ready for users

---

## FULL PROMPT FOR AI CODING AGENT:

Implement comprehensive testing suite, production build optimization, deployment configuration, monitoring, and performance tuning. Ensure application is production-ready with zero defects.

### ARCHITECTURAL REQUIREMENTS:

- **Testing Strategy**:
  - Unit tests for all service functions (Vitest)
  - Component tests for React components (React Testing Library)
  - Integration tests for full workflows
  - E2E tests for critical user flows (Playwright)
  - Visual regression tests for UI components
  - Performance tests for video processing
  - Accessibility tests (axe-core)

- **Build Optimization**:
  - Vite build configuration for production
  - Code splitting and lazy loading
  - Tree shaking unused code
  - Asset optimization (images, fonts)
  - Service Worker for offline capability
  - Bundle size analysis and budget enforcement
  - Environment-specific builds

- **Deployment**:
  - Static hosting configuration (Vercel/Netlify/GitHub Pages)
  - Domain setup and SSL certificates
  - CDN configuration for assets
  - Environment variables management
  - Zero-downtime deployment strategy
  - Rollback procedure

- **Monitoring & Error Tracking**:
  - Error boundary implementation
  - Console error capturing
  - User analytics (privacy-focused)
  - Performance metrics reporting
  - Crash reporting
  - Feature usage tracking

- **Performance Optimization**:
  - WebCodecs optimization for various video formats
  - Frame extraction performance tuning
  - Memory management and garbage collection
  - IndexedDB query optimization
  - Lazy loading of analysis results
  - Debounced user input handling
  - Efficient re-renders with React.memo

### DELIVERABLES:

**File: vitest.config.ts**
```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    css: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/coverage/**',
        '**/.{idea,git,cache,output,temp}/**'
      ],
      reportOnFailure: true,
      lines: 80,
      functions: 80,
      branches: 75,
      statements: 80
    },
    include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    exclude: ['node_modules', 'dist', '**/*.types.ts'],
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  }
});
```

**File: src/test/setup.ts**
```typescript
import '@testing-library/jest-dom';
import { expect, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';

// Extend expect with jest-dom matchers
expect.extend(matchers);

// Mock canvas and video elements for testing
HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
  fillStyle: '',
  fillRect: vi.fn(),
  drawImage: vi.fn(),
  toBlob: (callback: BlobCallback) => {
    callback(new Blob());
  },
  canvas: {
    toDataURL: () => 'data:image/png;base64,mock',
    width: 0,
    height: 0
  }
}) as unknown as CanvasRenderingContext2D);

// Mock HTMLMediaElement (for video/audio)
Object.defineProperty(HTMLMediaElement.prototype, 'duration', {
  get() {
    return 100;
  }
});

Object.defineProperty(HTMLMediaElement.prototype, 'currentTime', {
  get() {
    return 0;
  },
  set(val: number) {
    // Mock implementation
  }
});

// Mock WebCodecs API
Object.defineProperty(window, 'VideoDecoder', {
  value: {
    prototype: {
      isConfigSupported: vi.fn().mockResolvedValue({ supported: true }),
      decode: vi.fn(),
      flush: vi.fn(),
      configure: vi.fn()
    }
  }
});

// Cleanup after each test
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

// Global test configuration
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

console.error = (...args: any[]) => {
  if (
    typeof args[0] === 'string' &&
    (args[0].includes('Warning: ReactDOM.render') ||
      args[0].includes('Warning: useLayoutEffect'))
  ) {
    return;
  }
  console.error(...args);
};
```

**File: src/components/VideoUpload/UploadZone.test.tsx**
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { UploadZone } from './UploadZone';
import { useVideoUpload } from '../../hooks/useVideoUpload';

// Mock the useVideoUpload hook
vi.mock('../../hooks/useVideoUpload');

const mockUploadLocalFile = vi.fn();
const mockUseVideoUpload = {
  uploadLocalFile: mockUploadLocalFile,
  isProcessing: false,
  progress: null,
  error: null,
  uploadedFile: null,
  metadata: null,
  frames: []
};

describe('UploadZone', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useVideoUpload as any).mockReturnValue(mockUseVideoUpload);
  });

  it('renders upload zone with correct text', () => {
    render(<UploadZone onUploadComplete={vi.fn()} />);
    
    expect(screen.getByText('Upload your video')).toBeInTheDocument();
    expect(screen.getByText('Drag and drop a video file here, or click to browse')).toBeInTheDocument();
    expect(screen.getByText('Supports MP4, MOV, AVI, WebM up to 500MB')).toBeInTheDocument();
  });

  it('shows file selection button', () => {
    render(<UploadZone onUploadComplete={vi.fn()} />);
    
    const selectButton = screen.getByText('Select Video');
    expect(selectButton).toBeInTheDocument();
    expect(selectButton).not.toBeDisabled();
  });

  it('handles file upload', async () => {
    const onUploadComplete = vi.fn();
    render(<UploadZone onUploadComplete={onUploadComplete} />);

    const file = new File(['test video content'], 'test.mp4', { type: 'video/mp4' });
    mockUploadLocalFile.mockResolvedValueOnce({
      id: 'test-id',
      name: 'test.mp4',
      size: file.size,
      type: file.type,
      uploadDate: new Date()
    });

    const input = screen.getByLabelText('Select Video');
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(mockUploadLocalFile).toHaveBeenCalledWith(file);
      expect(onUploadComplete).toHaveBeenCalled();
    });
  });

  it('shows loading state when processing', () => {
    (useVideoUpload as any).mockReturnValue({
      ...mockUseVideoUpload,
      isProcessing: true
    });

    render(<UploadZone onUploadComplete={vi.fn()} />);
    
    expect(screen.getByText('Processing...')).toBeInTheDocument();
    expect(screen.getByText('Select Video')).toBeDisabled();
  });

  it('shows error message when upload fails', () => {
    const errorMessage = 'File too large';
    (useVideoUpload as any).mockReturnValue({
      ...mockUseVideoUpload,
      error: errorMessage
    });

    render(<UploadZone onUploadComplete={vi.fn()} />);
    
    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });

  it('shows progress bar during upload', () => {
    const progressMessage = 'Extracting frames...';
    (useVideoUpload as any).mockReturnValue({
      ...mockUseVideoUpload,
      isProcessing: true,
      progress: {
        stage: 'uploading',
        progress: 50,
        message: progressMessage
      }
    });

    render(<UploadZone onUploadComplete={vi.fn()} />);
    
    expect(screen.getByText(progressMessage)).toBeInTheDocument();
    expect(screen.getByText('50%')).toBeInTheDocument();
  });

  it('calls onGoogleDriveSelect when Drive button clicked', () => {
    const onGoogleDriveSelect = vi.fn();
    render(<UploadZone onUploadComplete={vi.fn()} onGoogleDriveSelect={onGoogleDriveSelect} />);

    const driveButton = screen.getByText('Google Drive');
    fireEvent.click(driveButton);

    expect(onGoogleDriveSelect).toHaveBeenCalledTimes(1);
  });

  it('disables buttons when processing', () => {
    (useVideoUpload as any).mockReturnValue({
      ...mockUseVideoUpload,
      isProcessing: true
    });

    render(<UploadZone onUploadComplete={vi.fn()} onGoogleDriveSelect={vi.fn()} />);

    const selectButton = screen.getByText('Select Video');
    const driveButton = screen.getByText('Google Drive');

    expect(selectButton).toBeDisabled();
    expect(driveButton).toBeDisabled();
  });
});
```

**File: components/CICD/test-workflow.yml** (GitHub Actions)
```yaml
name: Test and Build

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  test:
    runs-on: ubuntu-latest
    
    strategy:
      matrix:
        node-version: [18.x, 20.x]
    
    steps:
    - name: Checkout code
      uses: actions/checkout@v4
    
    - name: Setup Node.js ${{ matrix.node-version }}
      uses: actions/setup-node@v4
      with:
        node-version: ${{ matrix.node-version }}
        cache: 'pnpm'
    
    - name: Install pnpm
      run: npm install -g pnpm
    
    - name: Install dependencies
      run: pnpm install --frozen-lockfile
    
    - name: Type check
      run: pnpm run typecheck
    
    - name: Lint code
      run: pnpm run lint
    
    - name: Run unit tests
      run: pnpm run test:unit --coverage
    
    - name: Run component tests
      run: pnpm run test:components --coverage
    
    - name: Upload coverage to Codecov
      uses: codecov/codecov-action@v3
      with:
        files: ./coverage/coverage-final.json
        flags: unittests
        name: codecov-umbrella
    
    - name: Build application
      run: pnpm run build
      env:
        VITE_GEMINI_API_KEY: ${{ secrets.VITE_GEMINI_API_KEY }}
        VITE_GOOGLE_CLIENT_ID: ${{ secrets.VITE_GOOGLE_CLIENT_ID }}
    
    - name: Upload build artifacts
      uses: actions/upload-artifact@v3
      with:
        name: build-files
        path: dist/
    
    - name: Run E2E tests
      run: pnpm run test:e2e
      env:
        CI: true
    
    - name: Check bundle size
      run: |
        pnpm run build
        npm run bundlesize
      env:
        CI: true
```

**File: scripts/deployment/deploy.sh**
```bash
#!/bin/bash

# Production deployment script for Gemini Video Analysis App

set -e

echo "🚀 Starting production deployment..."

# Configuration
NODE_ENV=production
BUILD_DIR="dist"
DEPLOY_TARGET="${1:-vercel}" # vercel, netlify, github

echo "📋 Checking prerequisites..."

# Check Node.js version
REQUIRED_NODE_VERSION="18.0.0"
CURRENT_NODE_VERSION=$(node --version | cut -d'v' -f2)

if [ "$(printf '%s\n' "$REQUIRED_NODE_VERSION" "$CURRENT_NODE_VERSION" | sort -V | head -n1)" != "$REQUIRED_NODE_VERSION" ]; then
    echo "❌ Node.js version $REQUIRED_NODE_VERSION or higher is required. Current: $CURRENT_NODE_VERSION"
    exit 1
fi

# Check pnpm
if ! command -v pnpm &> /dev/null; then
    echo "❌ pnpm is required but not installed"
    exit 1
fi

# Check environment variables
if [ -z "$VITE_GEMINI_API_KEY" ]; then
    echo "❌ VITE_GEMINI_API_KEY environment variable is not set"
    exit 1
fi

if [ -z "$VITE_GOOGLE_CLIENT_ID" ]; then
    echo "❌ VITE_GOOGLE_CLIENT_ID environment variable is not set"
    exit 1
fi

echo "✅ Prerequisites check passed"

echo "📦 Installing dependencies..."
pnpm install --frozen-lockfile --prod=false

echo "🔍 Running tests..."
pnpm run test:ci

echo "📊 Checking code quality..."
pnpm run lint
pnpm run typecheck

echo "🔨 Building application..."
pnpm run build

echo "📦 Optimizing build..."
# Run bundle analyzer
pnpm run analyze

echo "📏 Checking bundle size..."
# Check if bundle is within size limits
MAX_BUNDLE_SIZE_KB=500
ACTUAL_SIZE_KB=$(du -k "$BUILD_DIR" | tail -1 | cut -f1)

if [ "$ACTUAL_SIZE_KB" -gt "$MAX_BUNDLE_SIZE_KB" ]; then
    echo "⚠️  Warning: Bundle size ($ACTUAL_SIZE_KB KB) exceeds limit ($MAX_BUNDLE_SIZE_KB KB)"
else
    echo "✅ Bundle size check passed ($ACTUAL_SIZE_KB KB)"
fi

case $DEPLOY_TARGET in
    vercel)
        echo "🌐 Deploying to Vercel..."
        vercel --prod
        ;;
    netlify)
        echo "🌐 Deploying to Netlify..."
        netlify deploy --prod --dir=$BUILD_DIR
        ;;
    github)
        echo "🌐 Deploying to GitHub Pages..."
        # GitHub Pages deployment logic
        echo "GitHub Pages deployment requires manual setup"
        ;;
    *)
        echo "❌ Unknown deployment target: $DEPLOY_TARGET"
        exit 1
        ;;
esac

echo "✅ Deployment completed successfully!"

# Health check
echo "🏥 Running health check..."
curl -f https://your-app-url.com/api/health || echo "⚠️  Health check failed"

echo "🎉 Production deployment completed!"
```

**File: vite.config.ts** (Production optimizations)
```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { visualizer } from 'rollup-plugin-visualizer';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const isProduction = mode === 'production';
  
  return {
    plugins: [
      react({
        // Use React 18's automatic JSX runtime
        jsxRuntime: 'automatic'
      }),
      
      // Bundle analyzer (only in production build)
      isProduction && visualizer({
        filename: './dist/bundle-analysis.html',
        open: true,
        gzipSize: true,
        brotliSize: true
      })
    ].filter(Boolean),
    
    resolve: {
      alias: {
        '@': resolve(__dirname, './src')
      }
    },
    
    build: {
      // Production build optimizations
      target: 'es2018',
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console: true,
          drop_debugger: true
        }
      },
      
      // Code splitting
      rollupOptions: {
        output: {
          manualChunks: {
            // Vendor libraries
            'react-vendor': ['react', 'react-dom', 'react-router-dom'],
            'ui-libs': ['@radix-ui/react-tabs'], // shadcn/ui
            'google-libs': ['@google-cloud/local-auth', '@google/generative-ai'],
            'db-libs': ['dexie', 'idb'],
            'state-libs': ['zustand'],
            'test-libs': ['vitest', '@testing-library/react']
          }
        },
        
        // Externalize large dependencies (optional)
        external: []
      },
      
      // Chunk size warnings
      chunkSizeWarningLimit: 500,
      
      // Base public path
      assetsInlineLimit: 4096, // 4kb
      
      // Output
      outDir: 'dist',
      assetsDir: 'assets',
      
      // Source maps
      sourcemap: !isProduction,
      
      // Copy static assets
      copyPublicDir: true
    },
    
    // Development server
    server: {
      port: 5173,
      strictPort: true,
      open: true,
      cors: true
    },
    
    envPrefix: ['VITE_'],
    
    css: {
      // CSS optimizations
      modules: {
        localsConvention: 'camelCaseOnly'
      }
    },
    
    define: {
      __APP_VERSION__: JSON.stringify(process.env.npm_package_version || '1.0.0'),
      __BUILD_TIME__: JSON.stringify(new Date().toISOString())
    },
    
    // Performance
    performance: {
      maxAssetSize: 250000, // 250kb
      maxEntrypointSize: 500000 // 500kb
    }
  };
});
```

### ACCEPTANCE CRITERIA FOR PHASE 9:

1. ✅ Unit test coverage >80% for all services
2. ✅ Component test coverage >75% for all React components
3. ✅ E2E tests cover critical user flows (upload → analyze → view results)
4. ✅ Build passes with zero TypeScript errors
5. ✅ Linting passes with zero warnings
6. ✅ Bundle size < 500KB (gzipped)
7. ✅ Production build completes successfully
8. ✅ Deploys to static hosting without errors
9. ✅ Health check endpoint returns 200
10. ✅ Error boundaries catch and display errors gracefully
11. ✅ Performance metrics meet targets (Lighthouse score >90)
12. ✅ Memory usage stable over 1 hour of usage
13. ✅ No console errors in production build
14. ✅ Service Worker registers successfully
15. ✅ Offline mode works for cached analyses
16. ✅ Analytics track key features without PII
17. ✅ Error reporting includes stack traces
18. ✅ Rollback procedure documented and tested
19. ✅ Database migrations handled automatically
20. ✅ Application loads in < 2 seconds on 3G

### TESTING CHECKLIST:

```bash
# Test execution:
pnpm run test              # All tests
pnpm run test:unit         # Unit tests only
pnpm run test:components   # Component tests only
pnpm run test:e2e          # E2E tests (Playwright)
pnpm run test:ci           # CI mode (no watch)

# Manual verification:
# 1. Run pnpm run build - verify production build succeeds
# 2. Check dist/ folder size < 500KB
# 3. Run pnpm run preview - test on localhost
# 4. Deploy to Vercel - verify deployment succeeds
# 5. Test on mobile device - verify responsive
# 6. Load app with throttled 3G - <2s load time
# 7. Use app for 1 hour - memory usage stable
# 8. Generate errors - verify error boundaries catch them
# 9. Go offline - verify cached analyses load
# 10. Inspect Lighthouse score - >90 target
# 11. Check console - zero errors
# 12. Test all keyboard shortcuts - work correctly
# 13. Test accessibility with screen reader
# 14. Verify analytics events fire (check network)
# 15. Test rollback procedure on staging
```

### PERFORMANCE BUDGET:

- **Bundle Size**: < 500KB gzipped
- **JavaScript**: < 250KB (main bundle)
- **Images**: < 100KB (optimized)
- **CSS**: < 50KB
- **Fonts**: < 50KB
- **First Load**: < 2 seconds (3G)
- **Lighthouse Score**: > 90 (all categories)
- **Time to Interactive**: < 3 seconds
- **Speed Index**: < 2 seconds

### MONITORING METRICS:

- Bundle size tracked on each PR
- Test coverage tracked on each PR
- Lighthouse CI on each PR
- Error rate in production < 1%
- Page load time p95 < 2 seconds
- API response time p95 < 30 seconds (Gemini)
- IndexedDB operations p95 < 100ms
- User satisfaction NPS > 50

### DEPLOYMENT CHECKLIST:

```bash
## Pre-deployment:
- [ ] All tests passing
- [ ] TypeScript errors: 0
- [ ] Lint warnings: 0
- [ ] Bundle size < 500KB
- [ ] Environment variables configured
- [ ] API keys valid (tested)
- [ ] Database schema compatibility
- [ ] Backup procedures tested
- [ ] Rollback plan documented
- [ ] Monitoring configured
- [ ] Error tracking enabled
- [ ] Analytics configured
- [ ] Performance budget verified

## Post-deployment:
- [ ] Smoke test: upload video works
- [ ] Smoke test: analysis completes
- [ ] Smoke test: view results loads
- [ ] Error boundaries working
- [ ] 404 pages return correctly
- [ ] Console errors: 0
- [ ] Service Worker registered
- [ ] PWA install prompt appears
- [ ] Analytics data flowing
- [ ] Health check returns 200
- [ ] Performance metrics within budget
```

### ERROR TRACKING:

- React Error Boundaries at page level
- Global error event listener
- Unhandled promise rejection tracking
- Window error event capture
- Error context (video ID, analysis type, timestamp)
- Source map integration for stack traces
- Rate limiting of duplicate errors
- User feedback integration

### PERFORMANCE OPTIMIZATIONS:

- **Code Splitting**: Route-based and component-based
- **Lazy Loading**: Images, heavy components, non-critical JS
- **Tree Shaking**: Remove unused code from dependencies
- **Compression**: Brotli compression in build
- **Caching**: Proper Cache-Control headers
- **CDN**: Assets served from CDN
- **Preload**: Critical resources preloaded
- **Prefetch**: Next route resources prefetched
- **Bundle Analysis**: Regular monitoring
- **Performance Budget**: Enforced in CI

### SECURITY HARDENING:

- **Content Security Policy**: Restrict scripts, styles, images
- **CORS**: Properly configured for Google APIs
- **HTTPS**: Enforced in production
- **API Keys**: Never exposed in client code (use environment variables)
- **OAuth**: Secure token storage (memory only)
- **Input Validation**: File types, sizes, content
- **XSS Prevention**: React automatic escaping
- **Dependency Scanning**: Regular security audits