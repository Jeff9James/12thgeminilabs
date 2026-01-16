import React, { useState } from 'react';
import { Scene } from '@shared/types';
import './ScenesTab.css';

interface ScenesTabProps {
  scenes: Scene[];
  onSceneClick?: (timestamp: number) => void;
}

export function ScenesTab({ scenes, onSceneClick }: ScenesTabProps) {
  const [expandedScene, setExpandedScene] = useState<string | null>(null);

  const formatTimestamp = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSceneClick = (scene: Scene) => {
    onSceneClick?.(scene.timestamp);
  };

  if (scenes.length === 0) {
    return (
      <div className="scenes-tab">
        <div className="empty-state">
          <svg className="empty-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          <h3>No scenes detected</h3>
          <p>Scene detection will be available after video analysis.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="scenes-tab">
      <div className="scenes-header">
        <h3>Detected Scenes</h3>
        <span className="scene-count">{scenes.length} scenes</span>
      </div>

      <div className="scenes-list">
        {scenes.map((scene, index) => (
          <div
            key={scene.id}
            className={`scene-card ${expandedScene === scene.id ? 'expanded' : ''}`}
          >
            <div
              className="scene-header"
              onClick={() => setExpandedScene(
                expandedScene === scene.id ? null : scene.id
              )}
            >
              <div className="scene-number">
                #{index + 1}
              </div>
              <div className="scene-main">
                <div className="scene-time-row">
                  <span className="scene-timestamp">{formatTimestamp(scene.timestamp)}</span>
                  {scene.duration && (
                    <span className="scene-duration">
                      ({scene.duration.toFixed(1)}s)
                    </span>
                  )}
                </div>
                <h4 className="scene-title">{scene.title}</h4>
              </div>
              <button
                className="expand-toggle"
                aria-label={expandedScene === scene.id ? 'Collapse' : 'Expand'}
              >
                <svg
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  style={{
                    transform: expandedScene === scene.id ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.2s ease',
                  }}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>

            {expandedScene === scene.id && (
              <div className="scene-details">
                {scene.description && (
                  <p className="scene-description">{scene.description}</p>
                )}
                <div className="scene-actions">
                  <button
                    className="btn-play"
                    onClick={() => handleSceneClick(scene)}
                  >
                    <svg fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                    Play from here
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
