import React, { useState } from 'react';
import { VideoAnalysisResult } from '@shared/types';
import './SummaryTab.css';

interface SummaryTabProps {
  analysis?: VideoAnalysisResult | null;
  onRegenerate?: () => void;
  isAnalyzing?: boolean;
}

export function SummaryTab({ analysis, onRegenerate, isAnalyzing }: SummaryTabProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (isAnalyzing) {
    return (
      <div className="summary-tab">
        <div className="analyzing-state">
          <div className="analyzing-spinner" />
          <p>Analyzing video...</p>
          <span className="analyzing-hint">This may take a few minutes</span>
        </div>
      </div>
    );
  }

  if (!analysis || (!analysis.summary && analysis.scenes?.length === 0)) {
    return (
      <div className="summary-tab">
        <div className="empty-state">
          <svg className="empty-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
          <h3>No analysis available</h3>
          <p>This video hasn't been analyzed yet.</p>
          <button onClick={onRegenerate} className="btn-primary">
            Analyze Video
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="summary-tab">
      <div className="summary-header">
        <h3>Video Summary</h3>
        <button onClick={onRegenerate} className="btn-icon" title="Regenerate summary">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>

      {analysis.summary && (
        <div className="summary-content">
          <p className={isExpanded ? '' : 'summary-text'}>
            {analysis.summary}
          </p>
          {analysis.summary.length > 300 && (
            <button
              className="expand-button"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? 'Show less' : 'Read more'}
            </button>
          )}
        </div>
      )}

      {analysis.tags && analysis.tags.length > 0 && (
        <div className="tags-section">
          <h4>Tags</h4>
          <div className="tags-list">
            {analysis.tags.map((tag, index) => (
              <span key={index} className="tag">
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}

      {analysis.entities && analysis.entities.length > 0 && (
        <div className="entities-section">
          <h4>Detected Entities</h4>
          <div className="entities-list">
            {analysis.entities.map((entity, index) => (
              <span key={index} className="entity-badge">
                {entity}
              </span>
            ))}
          </div>
        </div>
      )}

      {analysis.actions && analysis.actions.length > 0 && (
        <div className="actions-section">
          <h4>Detected Actions</h4>
          <div className="actions-list">
            {analysis.actions.map((action, index) => (
              <span key={index} className="action-badge">
                {action}
              </span>
            ))}
          </div>
        </div>
      )}

      {analysis.scenes && analysis.scenes.length > 0 && (
        <div className="scenes-preview">
          <h4>Key Scenes ({analysis.scenes.length})</h4>
          <div className="scenes-list">
            {analysis.scenes.slice(0, 3).map((scene) => (
              <div key={scene.id} className="scene-item">
                <span className="scene-time">
                  {new Date(scene.timestamp * 1000).toISOString().substr(14, 5)}
                </span>
                <span className="scene-title">{scene.title}</span>
              </div>
            ))}
            {analysis.scenes.length > 3 && (
              <button className="view-all-scenes">
                View all {analysis.scenes.length} scenes
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
