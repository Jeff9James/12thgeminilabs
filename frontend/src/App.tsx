import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import VideosPage from './pages/VideosPage';
import VideoDetailPage from './pages/VideoDetailPage';
import SearchPage from './pages/SearchPage';
import { SettingsPage } from './pages/SettingsPage';

// SIMPLIFIED: No authentication required
// Direct access to all pages

function App() {
  return (
    <Routes>
      {/* Redirect old login route to home */}
      <Route path="/login" element={<Navigate to="/" replace />} />
      
      {/* Main app routes - no authentication required */}
      <Route path="/" element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="videos" element={<VideosPage />} />
        <Route path="videos/:id" element={<VideoDetailPage />} />
        <Route path="search" element={<SearchPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
    </Routes>
  );
}

export default App;
