import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { userService } from '../services/userService';
import { GoogleOAuthStatus, UserSettings } from '../types/video';
import './SettingsPage.css';

interface StorageInfo {
  used: number;
  total: number;
  type: string;
}

export function SettingsPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [oauthStatus, setOauthStatus] = useState<GoogleOAuthStatus | null>(null);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [storageInfo, setStorageInfo] = useState<StorageInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRevoking, setIsRevoking] = useState(false);
  const [activeSection, setActiveSection] = useState<'account' | 'storage' | 'preferences'>('account');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [oauthResult, settingsResult, storageResult] = await Promise.all([
        userService.getGoogleOAuthStatus(),
        userService.getSettings(),
        userService.getStorageInfo(),
      ]);

      if (oauthResult.success && oauthResult.data) {
        setOauthStatus(oauthResult.data);
      }
      if (settingsResult) {
        setSettings(settingsResult);
      }
      if (storageResult) {
        setStorageInfo(storageResult);
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRevokeAccess = async () => {
    if (!confirm('Are you sure you want to revoke Google access? This will sign you out.')) {
      return;
    }

    setIsRevoking(true);
    try {
      await userService.revokeGoogleAccess();
      logout();
      navigate('/login');
    } catch (error) {
      console.error('Failed to revoke access:', error);
      setIsRevoking(false);
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  const getStoragePercentage = (): number => {
    if (!storageInfo) return 0;
    return Math.round((storageInfo.used / storageInfo.total) * 100);
  };

  if (isLoading) {
    return (
      <div className="settings-page">
        <div className="loading-state">
          <div className="loading-spinner" />
          <p>Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="settings-page">
      <div className="settings-header">
        <h1>Settings</h1>
        <p>Manage your account and preferences</p>
      </div>

      <div className="settings-layout">
        <nav className="settings-nav">
          {[
            { id: 'account', label: 'Account', icon: '👤' },
            { id: 'storage', label: 'Storage', icon: '💾' },
            { id: 'preferences', label: 'Preferences', icon: '⚙️' },
          ].map((section) => (
            <button
              key={section.id}
              className={`nav-item ${activeSection === section.id ? 'active' : ''}`}
              onClick={() => setActiveSection(section.id as typeof activeSection)}
            >
              <span className="nav-icon">{section.icon}</span>
              {section.label}
            </button>
          ))}
        </nav>

        <div className="settings-content">
          {activeSection === 'account' && (
            <div className="settings-section">
              <h2>Account Settings</h2>

              <div className="user-info-card">
                <div className="user-avatar">
                  {user?.picture ? (
                    <img src={user.picture} alt={user.name} />
                  ) : (
                    <svg fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                    </svg>
                  )}
                </div>
                <div className="user-details">
                  <h3>{user?.name}</h3>
                  <p>{user?.email}</p>
                </div>
              </div>

              <div className="oauth-section">
                <h3>Google OAuth</h3>
                <div className="oauth-status">
                  <div className="oauth-info">
                    <div className="oauth-badge connected">
                      <svg fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                      </svg>
                      Connected
                    </div>
                    {oauthStatus?.email && (
                      <p className="oauth-email">{oauthStatus.email}</p>
                    )}
                  </div>
                  <button
                    className="revoke-button"
                    onClick={handleRevokeAccess}
                    disabled={isRevoking}
                  >
                    {isRevoking ? 'Revoking...' : 'Revoke Access'}
                  </button>
                </div>
              </div>

              <div className="logout-section">
                <button className="logout-button" onClick={logout}>
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Sign Out
                </button>
              </div>
            </div>
          )}

          {activeSection === 'storage' && (
            <div className="settings-section">
              <h2>Storage Settings</h2>

              <div className="storage-overview">
                <div className="storage-header">
                  <h3>Storage Used</h3>
                  <span className="storage-type">{storageInfo?.type || 'Local'}</span>
                </div>
                <div className="storage-bar">
                  <div
                    className="storage-fill"
                    style={{ width: `${getStoragePercentage()}%` }}
                  />
                </div>
                <div className="storage-info">
                  <span>{formatBytes(storageInfo?.used || 0)} used</span>
                  <span>of {formatBytes(storageInfo?.total || 0)}</span>
                </div>
              </div>

              <div className="storage-info-card">
                <h3>Storage Type</h3>
                <div className="storage-type-selector">
                  <div className="storage-type-option">
                    <div className="type-icon local">
                      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                      </svg>
                    </div>
                    <div className="type-info">
                      <h4>Local Storage</h4>
                      <p>Files stored on server</p>
                    </div>
                    <span className="type-badge active">Active</span>
                  </div>
                  <div className="storage-type-option disabled">
                    <div className="type-icon firebase">
                      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                      </svg>
                    </div>
                    <div className="type-info">
                      <h4>Firebase Storage</h4>
                      <p>Cloud storage (Coming soon)</p>
                    </div>
                    <span className="type-badge">Soon</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'preferences' && (
            <div className="settings-section">
              <h2>Preferences</h2>

              <div className="preference-item">
                <div className="preference-info">
                  <h4>Dark Mode</h4>
                  <p>Use dark theme for the interface</p>
                </div>
                <button className="toggle-button disabled" disabled>
                  <span className="toggle-slider" />
                </button>
              </div>

              <div className="preference-item">
                <div className="preference-info">
                  <h4>Notifications</h4>
                  <p>Get notified when analysis is complete</p>
                </div>
                <button className="toggle-button disabled" disabled>
                  <span className="toggle-slider active" />
                </button>
              </div>

              <div className="preference-item">
                <div className="preference-info">
                  <h4>Auto-index Videos</h4>
                  <p>Automatically index new videos for search</p>
                </div>
                <button className="toggle-button disabled" disabled>
                  <span className="toggle-slider active" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
