# PHASE 6: Temporal & Spatial Reasoning Enhancement Engine

## TASK TITLE: Build Gemini-Powered Video Understanding Web App - Phase 6: Advanced Reasoning & Context Engine

**PRIORITY: HIGH** - Enhances raw Gemini outputs with sophisticated reasoning

---

## FULL PROMPT FOR AI CODING AGENT:

Build an advanced reasoning engine that processes raw Gemini 3 outputs to enhance temporal continuity, spatial consistency, and contextual understanding. This phase creates the intelligence layer that makes analysis feel human-like and coherent across time and space.

### ARCHITECTURAL REQUIREMENTS:

- **Temporal Reasoning Enhancements**:
  - Smooth scene transitions and continuity
  - Action sequence validation and correction  
  - Timeline consistency checking
  - Causal relationship inference between events
  - Temporal aliasing resolution (same event at different times)
  
- **Spatial Reasoning Enhancements**:
  - Object tracking across frames with ID persistence
  - Scene geometry and layout understanding
  - Depth and perspective analysis
  - Multi-object interaction detection
  - Occlusion handling and object re-identification
  
- **Contextual Intelligence**:
  - Cross-frame entity resolution (same person/object across time)
  - Semantic clustering of similar segments
  - Narrative arc construction (beginning, middle, end)
  - Knowledge graph construction from video content
  - Confidence scoring and uncertainty quantification
  
- **Output Refinement**:
  - Duplicate detection and merging
  - Contradiction resolution
  - Gap filling for missing analysis
  - Confidence-based filtering
  - Severity/tone analysis for content

### DELIVERABLES:

**File: src/services/reasoningEngine.ts**
```typescript
import { AnalysisResult, TemporalSegment, SpatialAnalysis, ExtractedFrame } from '../types';

export interface EnhancedAnalysis extends AnalysisResult {
  reasoning: {
    temporal: {
      continuityScore: number; // 0-1
      validatedTransitions: Array<{
        fromSegment: number;
        toSegment: number;
        confidence: number;
        type: 'smooth' | 'abrupt' | 'causal';
      }>;
      causalGraph: Array<{
        cause: string;
        effect: string;
        confidence: number;
        timeLag: number; // seconds
      }>;
    };
    spatial: {
      objectTracks: Map<string, Array<{
        frameIndex: number;
        bbox?: { x: number; y: number; width: number; height: number };
        confidence: number;
        attributes: string[];
      }>>;
      sceneHierarchy: Array<{
        parent: string;
        children: string[];
        confidence: number;
      }>;
    };
    context: {
      mainCharacters: Array<{
        name: string;
        appearances: Array<{ start: number; end: number }>;
        confidence: number;
        description: string;
      }>;
      locations: Array<{
        name: string;
        timestamps: number[];
        confidence: number;
        description: string;
      }>;
      narrativeArc: {
        exposition: { start: number; end: number; description: string };
        risingAction: { start: number; end: number; description: string };
        climax: { timestamp: number; description: string };
        resolution: { start: number; end: number; description: string };
      };
      themes: Array<{
        name: string;
        description: string;
        segments: number[];
        confidence: number;
      }>;
    };
    quality: {
      completeness: number; // 0-1
      contradictions: Array<{
        location: string;
        conflictingInfo: string[];
        resolution?: string;
      }>;
      confidence: number; // weighted overall confidence
    };
  };
}

export class ReasoningEngine {
  
  // Main enhancement pipeline
  async enhanceAnalysis(
    rawAnalysis: AnalysisResult,
    frames: ExtractedFrame[],
    metadata: VideoMetadata
  ): Promise<EnhancedAnalysis> {
    
    // Run all enhancement modules
    const temporalReasoning = this.enhanceTemporalReasoning(rawAnalysis, frames, metadata);
    const spatialReasoning = this.enhanceSpatialReasoning(rawAnalysis, frames, metadata);
    const contextualReasoning = this.enhanceContextualReasoning(rawAnalysis, frames, metadata);
    const qualityValidation = this.validateAndScoreAnalysis(rawAnalysis);

    const enhanced: EnhancedAnalysis = {
      ...rawAnalysis,
      reasoning: {
        temporal: await temporalReasoning,
        spatial: await spatialReasoning,
        context: await contextualReasoning,
        quality: await qualityValidation
      }
    };

    return enhanced;
  }

  // Temporal continuity and causality
  private async enhanceTemporalReasoning(
    analysis: AnalysisResult,
    frames: ExtractedFrame[],
    metadata: VideoMetadata
  ): Promise<EnhancedAnalysis['reasoning']['temporal']> {
    if (!analysis.temporalSegments || analysis.temporalSegments.length < 2) {
      return {
        continuityScore: 1.0,
        validatedTransitions: [],
        causalGraph: []
      };
    }

    const segments = analysis.temporalSegments;
    const transitions = [];

    // Analyze transitions between segments
    for (let i = 0; i < segments.length - 1; i++) {
      const current = segments[i];
      const next = segments[i + 1];
      
      // Calculate continuity
      const timeGap = next.startTime - current.endTime;
      const hasOverlap = current.endTime > next.startTime;
      
      let continuityConfidence = 0;
      let transitionType: 'smooth' | 'abrupt' | 'causal' = 'abrupt';

      // Check for smooth transitions
      if (hasOverlap || timeGap < 2) {
        continuityConfidence = 0.8;
        transitionType = 'smooth';
      } 
      // Check for causal relationships
      else if (this.detectCausalRelationship(current.description, next.description)) {
        continuityConfidence = 0.7;
        transitionType = 'causal';
      }
      // Abrupt cut
      else {
        continuityConfidence = 0.3;
        transitionType = 'abrupt';
      }

      transitions.push({
        fromSegment: i,
        toSegment: i + 1,
        confidence: continuityConfidence,
        type: transitionType
      });
    }

    // Calculate overall continuity score
    const continuityScore = transitions.length > 0 
      ? transitions.reduce((sum, t) => sum + t.confidence, 0) / transitions.length
      : 1.0;

    // Build causal graph
    const causalGraph = this.buildCausalGraph(segments);

    return {
      continuityScore,
      validatedTransitions: transitions,
      causalGraph
    };
  }

  // Detect if two segment descriptions have causal relationship
  private detectCausalRelationship(desc1: string, desc2: string): boolean {
    const causalKeywords = [
      'then', 'after', 'because', 'so', 'therefore', 'as a result',
      'leads to', 'causes', 'makes', 'forces', 'triggers', 'results in'
    ];
    
    const mergedText = `${desc1.toLowerCase()} ${desc2.toLowerCase()}`;
    return causalKeywords.some(keyword => mergedText.includes(keyword));
  }

  // Build causal relationships graph
  private buildCausalGraph(segments: TemporalSegment[]): Array<{
    cause: string;
    effect: string;
    confidence: number;
    timeLag: number;
  }> {
    const graph = [];

    for (let i = 0; i < segments.length - 1; i++) {
      for (let j = i + 1; j < segments.length; j++) {
        if (this.isCausal(segments[i], segments[j])) {
          graph.push({
            cause: segments[i].description,
            effect: segments[j].description,
            confidence: 0.6, // Base confidence, could be enhanced with NLP
            timeLag: segments[j].startTime - segments[i].endTime
          });
        }
      }
    }

    return graph;
  }

  private isCausal(seg1: TemporalSegment, seg2: TemporalSegment): boolean {
    // Simple heuristic: check for action verbs leading to outcomes
    const actionVerbs = ['opens', 'starts', 'begins', 'triggers', 'presses', 'says'];
    const outcomeWords = ['result', 'effect', 'outcome', 'consequence', 'happens', 'appears'];
    
    const hasAction = actionVerbs.some(verb => seg1.description.toLowerCase().includes(verb));
    const hasOutcome = outcomeWords.some(word => seg2.description.toLowerCase().includes(word));
    
    return hasAction && hasOutcome;
  }

  // Spatial reasoning enhancements
  private async enhanceSpatialReasoning(
    analysis: AnalysisResult,
    frames: ExtractedFrame[],
    metadata: VideoMetadata
  ): Promise<EnhancedAnalysis['reasoning']['spatial']> {
    if (!analysis.spatialAnalysis) {
      return {
        objectTracks: new Map(),
        sceneHierarchy: []
      };
    }

    const objectTracks = this.trackObjectsAcrossFrames(
      analysis.spatialAnalysis.objectsDetected,
      frames
    );

    const sceneHierarchy = this.buildSceneHierarchy(
      analysis.spatialAnalysis.sceneChanges,
      frames
    );

    return {
      objectTracks,
      sceneHierarchy
    };
  }

  // Track same objects across multiple frames
  private trackObjectsAcrossFrames(
    detectedObjects: Array<any>,
    frames: ExtractedFrame[]
  ): Map<string, Array<{
    frameIndex: number;
    bbox?: { x: number; y: number; width: number; height: number };
    confidence: number;
    attributes: string[];
  }>> {
    const tracks = new Map<string, Array<any>>();

    // Group by object name and track temporal consistency
    const objectGroups = new Map<string, Array<any>>();
    
    detectedObjects.forEach(obj => {
      if (!objectGroups.has(obj.label)) {
        objectGroups.set(obj.label, []);
      }
      objectGroups.get(obj.label)!.push(obj);
    });

    // Build tracks for each object
    objectGroups.forEach((detections, objectName) => {
      const track = detections
        .map((detection, index) => ({
          frameIndex: Math.floor((index / detections.length) * frames.length),
          confidence: detection.confidence,
          attributes: detection.attributes || [],
          bbox: detection.boundingBox
        }))
        .sort((a, b) => a.frameIndex - b.frameIndex);

      tracks.set(objectName, track);
    });

    return tracks;
  }

  // Build hierarchical scene understanding
  private buildSceneHierarchy(
    sceneChanges: Array<any>,
    frames: ExtractedFrame[]
  ): Array<{
    parent: string;
    children: string[];
    confidence: number;
  }> {
    const hierarchy = [];
    const sceneLocations = new Map<string, number[]>();

    // Group scenes by location/setting
    sceneChanges.forEach(scene => {
      // Extract location from description using simple heuristics
      const location = this.extractLocation(scene.description);
      if (location) {
        if (!sceneLocations.has(location)) {
          sceneLocations.set(location, []);
        }
        sceneLocations.get(location)!.push(scene.timestamp);
      }
    });

    // Build location hierarchy
    sceneLocations.forEach((timestamps, location) => {
      const childScenes = sceneChanges
        .filter(scene => scene.description.toLowerCase().includes(location.toLowerCase()))
        .map(scene => scene.description);

      hierarchy.push({
        parent: location,
        children: [...new Set(childScenes)], // Remove duplicates
        confidence: timestamps.length / sceneChanges.length
      });
    });

    return hierarchy;
  }

  // Extract location from scene description
  private extractLocation(description: string): string | null {
    const locationIndicators = ['in the', 'at the', 'inside', 'outside', 'room', 'office', 'street', 'park', 'building'];
    const words = description.toLowerCase().split(' ');
    
    for (let i = 0; i < words.length - 2; i++) {
      const phrase = words[i] + ' ' + words[i + 1] + ' ' + words[i + 2];
      if (locationIndicators.some(ind => phrase.includes(ind))) {
        return words[i + 2]; // Return the location noun
      }
    }
    
    return null;
  }

  // Contextual understanding and narrative
  private async enhanceContextualReasoning(
    analysis: AnalysisResult,
    frames: ExtractedFrame[],
    metadata: VideoMetadata
  ): Promise<EnhancedAnalysis['reasoning']['context']> {
    const mainCharacters = this.identifyMainCharacters(analysis, frames);
    const locations = this.identifyKeyLocations(analysis, frames);
    const narrativeArc = this.constructNarrativeArc(analysis, frames, metadata);
    const themes = this.identifyThemes(analysis, frames);

    return {
      mainCharacters,
      locations,
      narrativeArc,
      themes
    };
  }

  // Identify main characters/entities
  private identifyMainCharacters(
    analysis: AnalysisResult,
    frames: ExtractedFrame[]
  ): Array<{
    name: string;
    appearances: Array<{ start: number; end: number }>;
    confidence: number;
    description: string;
  }> {
    const characters = new Map<string, typeof frames>();

    // Extract entities from summary if available
    if (analysis.summary) {
      const entities = analysis.summary.keyTopics.filter(topic => 
        this.isPersonName(topic) || topic.toLowerCase().includes('character')
      );

      entities.forEach(entity => {
        characters.set(entity, []);
      });
    }

    // Analyze temporal segments for character appearances
    if (analysis.temporalSegments) {
      analysis.temporalSegments.forEach(segment => {
        const mentionedCharacters = Array.from(characters.keys())
          .filter(name => segment.description.toLowerCase().includes(name.toLowerCase()));

        mentionedCharacters.forEach(name => {
          if (!characters.has(name)) {
            characters.set(name, []);
          }
        });
      });
    }

    // Convert to character objects
    return Array.from(characters.entries()).map(([name, appearances]) => ({
      name,
      appearances: this.clusterAppearances(appearances, analysis.temporalSegments || []),
      confidence: 0.7, // Would be enhanced with better entity recognition
      description: `Main character identified in video content`
    }));
  }

  private isPersonName(topic: string): boolean {
    // Simple heuristic: capitalize first letter, doesn't contain spaces might be name
    return topic.charAt(0) === topic.charAt(0).toUpperCase() && topic.length < 20;
  }

  private clusterAppearances(
    appearances: any[],
    segments: TemporalSegment[]
  ): Array<{ start: number; end: number }> {
    if (segments.length === 0) return [];

    // Group consecutive segments
    const clusters = [];
    let currentCluster = null;

    segments.forEach((segment, index) => {
      if (appearances.some(app => Math.abs(app.startTime - segment.startTime) < 1)) {
        if (!currentCluster) {
          currentCluster = { start: segment.startTime, end: segment.endTime };
        } else {
          currentCluster.end = segment.endTime;
        }
      } else if (currentCluster) {
        clusters.push(currentCluster);
        currentCluster = null;
      }
    });

    if (currentCluster) {
      clusters.push(currentCluster);
    }

    return clusters;
  }

  // Identify key locations
  private identifyKeyLocations(
    analysis: AnalysisResult,
    frames: ExtractedFrame[]
  ): Array<{
    name: string;
    timestamps: number[];
    confidence: number;
    description: string;
  }> {
    const locations = new Map<string, number[]>();

    // Extract from spatial analysis
    if (analysis.spatialAnalysis?.sceneChanges) {
      analysis.spatialAnalysis.sceneChanges.forEach(scene => {
        const location = this.extractLocation(scene.description);
        if (location) {
          if (!locations.has(location)) {
            locations.set(location, []);
          }
          locations.get(location)!.push(scene.timestamp);
        }
      });
    }

    return Array.from(locations.entries()).map(([name, timestamps]) => ({
      name,
      timestamps,
      confidence: timestamps.length / frames.length,
      description: `Location appearing at ${timestamps.length} timestamps`
    }));
  }

  // Construct narrative arc (story structure)
  private constructNarrativeArc(
    analysis: AnalysisResult,
    frames: ExtractedFrame[],
    metadata: VideoMetadata
  ): EnhancedAnalysis['reasoning']['context']['narrativeArc'] {
    const duration = metadata.duration;
    const segments = analysis.temporalSegments || [];

    // Simple heuristic-based narrative structure
    return {
      exposition: {
        start: 0,
        end: Math.min(duration * 0.2, segments[1]?.startTime || duration * 0.2),
        description: 'Introduction of characters, setting, and initial situation'
      },
      risingAction: {
        start: Math.min(duration * 0.2, segments[1]?.startTime || duration * 0.2),
        end: Math.min(duration * 0.7, segments[Math.floor(segments.length * 0.7)]?.startTime || duration * 0.7),
        description: 'Development of plot, increasing tension, and complications'
      },
      climax: {
        timestamp: duration * 0.75,
        description: 'Peak moment of tension and conflict'
      },
      resolution: {
        start: Math.max(duration * 0.8, segments[Math.floor(segments.length * 0.8)]?.startTime || duration * 0.8),
        end: duration,
        description: 'Conclusion and wrapping up of the narrative'
      }
    };
  }

  // Identify recurring themes
  private identifyThemes(
    analysis: AnalysisResult,
    frames: ExtractedFrame[]
  ): Array<{
    name: string;
    description: string;
    segments: number[];
    confidence: number;
  }> {
    const themes = [];
    
    // Analyze topics and descriptions for recurring patterns
    if (analysis.summary?.keyTopics) {
      const topicFrequencies = new Map<string, number>();
      
      analysis.summary.keyTopics.forEach(topic => {
        topicFrequencies.set(topic, 1);
      });

      // Check temporal segments for recurring topics
      if (analysis.temporalSegments) {
        analysis.temporalSegments.forEach((segment, index) => {
          analysis.summary!.keyTopics.forEach(topic => {
            if (segment.description.toLowerCase().includes(topic.toLowerCase())) {
              topicFrequencies.set(topic, (topicFrequencies.get(topic) || 0) + 1);
            }
          });
        });
      }

      // Convert to theme objects
      topicFrequencies.forEach((frequency, topic) => {
        if (frequency > 1) {
          themes.push({
            name: topic,
            description: `Recurring theme appearing in ${frequency} segments`,
            segments: [], // Would be populated with actual segment indices
            confidence: Math.min(frequency / 3, 1.0)
          });
        }
      });
    }

    return themes;
  }

  // Quality validation and scoring
  private async validateAndScoreAnalysis(
    analysis: AnalysisResult
  ): Promise<EnhancedAnalysis['reasoning']['quality']> {
    const completeness = this.calculateCompleteness(analysis);
    const contradictions = this.detectContradictions(analysis);
    const confidence = this.calculateOverallConfidence(analysis);

    return {
      completeness,
      contradictions,
      confidence
    };
  }

  private calculateCompleteness(analysis: AnalysisResult): number {
    let score = 0;
    let total = 6;

    // Check for all expected components
    if (analysis.summary) score++;
    if (analysis.summary?.title) score++;
    if (analysis.summary?.description) score++;
    if (analysis.temporalSegments && analysis.temporalSegments.length > 0) score++;
    if (analysis.spatialAnalysis) score++;
    if (analysis.createdAt) score++;

    return score / total;
  }

  private detectContradictions(analysis: AnalysisResult): Array<{
    location: string;
    conflictingInfo: string[];
    resolution?: string;
  }> {
    const contradictions = [];

    // Check temporal segments for overlapping time ranges
    if (analysis.temporalSegments) {
      for (let i = 0; i < analysis.temporalSegments.length - 1; i++) {
        for (let j = i + 1; j < analysis.temporalSegments.length; j++) {
          const seg1 = analysis.temporalSegments[i];
          const seg2 = analysis.temporalSegments[j];
          
          if (seg1.startTime < seg2.endTime && seg2.startTime < seg1.endTime) {
            contradictions.push({
              location: `Segments ${i} and ${j}`,
              conflictingInfo: [
                `Segment ${i}: ${seg1.startTime}s - ${seg1.endTime}s`,
                `Segment ${j}: ${seg2.startTime}s - ${seg2.endTime}s`
              ],
              resolution: 'Overlapping segments may indicate complex scene transitions'
            });
          }
        }
      }
    }

    return contradictions;
  }

  private calculateOverallConfidence(analysis: AnalysisResult): number {
    const confidences = [];

    // Aggregate confidences from different analysis components
    if (analysis.spatialAnalysis?.objectsDetected) {
      const objConfidence = analysis.spatialAnalysis.objectsDetected.reduce(
        (sum, obj) => sum + (obj.confidence || 0.5), 0
      ) / analysis.spatialAnalysis.objectsDetected.length;
      confidences.push(objConfidence);
    }

    // Default confidence if no specific confidences available
    if (confidences.length === 0) {
      return 0.7;
    }

    return confidences.reduce((sum, c) => sum + c, 0) / confidences.length;
  }
}

// Export singleton
export const reasoningEngine = new ReasoningEngine();
```

### ACCEPTANCE CRITERIA FOR PHASE 6:

1. ✅ Temporal continuity scoring (0-1 range)
2. ✅ Scene transition detection (smooth/abrupt/causal)
3. ✅ Causal relationship graph built across segments
4. ✅ Object tracking across frames with persistence
5. ✅ Scene hierarchy constructed (location relationships)
6. ✅ Main character identification and tracking
7. ✅ Key location extraction and timeline
8. ✅ Narrative arc constructed (exposition/climax/resolution)
9. ✅ Theme identification from recurring topics
10. ✅ Completeness scoring (0-1) for analysis quality
11. ✅ Contradiction detection in temporal segments
12. ✅ Overall confidence scoring across all outputs
13. ✅ No contradictions remain in enhanced analysis
14. ✅ All entities have confidence scores
15. ✅ Enhanced analysis preserves original data + reasoning layer
16. ✅ TypeScript compiles with zero errors
17. ✅ Memory efficient (no memory leaks)
18. ✅ Processing time <5 seconds for 30-frame analysis
19. ✅ Works with partial analysis (missing segments)
20. ✅ Handles edge cases (single segment, no objects)

### TESTING CHECKLIST:

```bash
# Manual tests:
# 1. Single segment video - verify continuity score = 1.0
# 2. Video with clear scene changes - detect smooth vs abrupt
# 3. Video with cause-effect - verify causal graph edges
# 4. Object appearing in multiple frames - track consistently
# 5. Video with recurring location - cluster correctly
# 6. Video with named characters - identify as main characters
# 7. Analyze story structure - detect narrative arc correctly
# 8. Recurring topics - identified as themes with confidence
# 9. Overlapping segments - contradiction detected
# 10. Verify confidence scores between 0 and 1
# 11. Test with missing analysis components (null safety)
# 12. Verify enhanced analysis has all original data intact
```

### PERFORMANCE REQUIREMENTS:

- Temporal reasoning: < 1 second
- Spatial reasoning: < 1 second  
- Contextual reasoning: < 2 seconds
- Quality validation: < 0.5 seconds
- Total enhancement: < 5 seconds
- Memory overhead: < 50MB
- Object tracking: O(n*m) where n=frames, m=objects
- Graph algorithms: Efficient for 30-50 nodes

### QUALITY METRICS:

- Continuity score accuracy: >85% correlation with human judgment
- Object track persistence: >90% for visible objects
- Character ID consistency: >80% for same character across scenes
- Narrative arc detection: 75% match to ground truth story beats
- Contradiction detection: 95% recall (catch most issues)
- False positive rate: <10% for contradictions

### INTEGRATION NOTES:

- Phase 6 runs immediately after Phase 5 (Gemini analysis)
- Requires raw AnalysisResult + original frames as input
- Enhances the analysis with reasoning layer
- Output: EnhancedAnalysis with reasoning metadata
- Used by Phase 8 UI to show confidence and relationships