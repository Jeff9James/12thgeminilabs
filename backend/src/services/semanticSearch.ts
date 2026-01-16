import { getDatabase } from '../db/connection';
import { geminiService } from './gemini';
import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/logger';
import { SearchRequest, SearchResponse, SearchMatchResult, TemporalSegment } from '@gemini-video-platform/shared';

export class SemanticSearchService {
  async searchVideo(
    videoId: string, 
    userId: string, 
    searchRequest: SearchRequest
  ): Promise<SearchResponse> {
    const startTime = Date.now();
    
    try {
      const db = getDatabase();
      
      // Get all segments for the video
      let query = 'SELECT * FROM temporal_index WHERE video_id = ? AND user_id = ?';
      const params: any[] = [videoId, userId];

      // Apply time range filter
      if (searchRequest.timeRange) {
        query += ' AND start_time >= ? AND end_time <= ?';
        params.push(searchRequest.timeRange.start, searchRequest.timeRange.end);
      }

      // Apply scene type filters
      if (searchRequest.sceneTypeFilters && searchRequest.sceneTypeFilters.length > 0) {
        const placeholders = searchRequest.sceneTypeFilters.map(() => '?').join(',');
        query += ` AND scene_type IN (${placeholders})`;
        params.push(...searchRequest.sceneTypeFilters);
      }

      // Apply entity filters
      if (searchRequest.entityFilters && searchRequest.entityFilters.length > 0) {
        for (const entity of searchRequest.entityFilters) {
          query += ' AND entities LIKE ?';
          params.push(`%${entity}%`);
        }
      }

      query += ' ORDER BY segment_number';

      const segments = await db.all(query, params);
      
      if (segments.length === 0) {
        return {
          matches: [],
          totalResults: 0,
          searchTime: Date.now() - startTime,
          query: searchRequest.query,
        };
      }

      // Use Gemini to understand the search query and match against segments
      const matches = await this.performSemanticSearch(searchRequest, segments);
      
      // Apply threshold filter
      const filteredMatches = matches.filter(match => 
        match.relevanceScore >= (searchRequest.threshold || 0.5)
      );

      // Sort by relevance score (descending)
      filteredMatches.sort((a, b) => b.relevanceScore - a.relevanceScore);

      const searchTime = Date.now() - startTime;

      return {
        matches: filteredMatches,
        totalResults: filteredMatches.length,
        searchTime,
        query: searchRequest.query,
      };
    } catch (error) {
      logger.error('Error searching video:', error);
      throw error;
    }
  }

  private async performSemanticSearch(
    searchRequest: SearchRequest,
    segments: any[]
  ): Promise<SearchMatchResult[]> {
    const matches: SearchMatchResult[] = [];

    try {
      // Use Gemini to understand the search query and analyze each segment
      for (const segment of segments) {
        const relevanceScore = await this.calculateRelevanceScore(searchRequest, segment);
        
        if (relevanceScore > 0.3) { // Minimum threshold for inclusion
          matches.push({
            segmentId: segment.id,
            startTime: segment.start_time,
            endTime: segment.end_time,
            relevanceScore,
            description: segment.description,
            entities: segment.entities ? JSON.parse(segment.entities) : [],
            sceneType: segment.scene_type,
            confidence: segment.confidence,
          });
        }
      }

      return matches;
    } catch (error) {
      logger.error('Error performing semantic search:', error);
      // Fallback to text-based search
      return this.performTextSearch(searchRequest, segments);
    }
  }

  private async calculateRelevanceScore(
    searchRequest: SearchRequest,
    segment: any
  ): Promise<number> {
    const { query, searchType = 'text' } = searchRequest;

    try {
      // Build context for Gemini
      const segmentData = {
        description: segment.description,
        entities: segment.entities ? JSON.parse(segment.entities) : [],
        sceneType: segment.scene_type,
        startTime: segment.start_time,
        endTime: segment.end_time,
      };

      let relevancePrompt = '';
      
      switch (searchType) {
        case 'semantic':
          relevancePrompt = `
            Analyze how well this video segment matches the search query.
            
            Search Query: "${query}"
            
            Segment Data:
            - Description: ${segmentData.description}
            - Entities: ${segmentData.entities.join(', ')}
            - Scene Type: ${segmentData.sceneType}
            - Time: ${segmentData.startTime}s - ${segmentData.endTime}s
            
            Provide a relevance score from 0 to 1 where:
            - 1.0 = Perfect match, highly relevant
            - 0.8-0.9 = Very relevant
            - 0.6-0.7 = Moderately relevant  
            - 0.4-0.5 = Somewhat relevant
            - 0.1-0.3 = Low relevance
            - 0.0 = Not relevant
            
            Respond with just the number (0.0-1.0).
          `;
          break;
          
        case 'entity':
          relevancePrompt = `
            Check if this video segment contains the entities mentioned in the search query.
            
            Search Query: "${query}"
            
            Segment Entities: ${segmentData.entities.join(', ')}
            
            Score 1.0 if the segment contains any entities mentioned in the query, 0.0 otherwise.
            Respond with just the number.
          `;
          break;
          
        case 'scene_type':
          relevancePrompt = `
            Check if this video segment matches the scene type mentioned in the search query.
            
            Search Query: "${query}"
            
            Segment Scene Type: ${segmentData.sceneType}
            
            Score 1.0 if the segment matches the scene type, 0.0 otherwise.
            Respond with just the number.
          `;
          break;
          
        case 'action':
          relevancePrompt = `
            Check if this video segment shows actions mentioned in the search query.
            
            Search Query: "${query}"
            
            Segment Description: ${segmentData.description}
            
            Score based on how well the segment shows the requested actions.
            Respond with just the number (0.0-1.0).
          `;
          break;
          
        default: // 'text'
          relevancePrompt = `
            Analyze text similarity between search query and video segment.
            
            Search Query: "${query}"
            
            Segment Description: ${segmentData.description}
            
            Score based on keyword and semantic similarity (0.0-1.0).
            Respond with just the number.
          `;
      }

      const response = await geminiService.analyzeQueryContext(relevancePrompt);
      const score = parseFloat(response.trim());
      
      // Validate score
      if (isNaN(score) || score < 0 || score > 1) {
        return 0.5; // Default score for invalid responses
      }
      
      return score;
    } catch (error) {
      logger.error('Error calculating relevance score:', error);
      return 0.0;
    }
  }

  private performTextSearch(
    searchRequest: SearchRequest,
    segments: any[]
  ): SearchMatchResult[] {
    const matches: SearchMatchResult[] = [];
    const query = searchRequest.query.toLowerCase();
    
    for (const segment of segments) {
      let score = 0;
      
      // Text-based scoring
      const description = segment.description.toLowerCase();
      const entities = segment.entities ? JSON.parse(segment.entities) : [];
      
      // Direct keyword matches
      if (description.includes(query)) {
        score += 0.7;
      }
      
      // Entity matches
      for (const entity of entities) {
        if (entity.toLowerCase().includes(query)) {
          score += 0.5;
        }
      }
      
      // Scene type match
      if (segment.scene_type && segment.scene_type.toLowerCase().includes(query)) {
        score += 0.3;
      }
      
      // Time range boost
      if (searchRequest.timeRange) {
        if (segment.start_time >= searchRequest.timeRange.start && 
            segment.end_time <= searchRequest.timeRange.end) {
          score += 0.1;
        }
      }
      
      if (score > 0.1) {
        matches.push({
          segmentId: segment.id,
          startTime: segment.start_time,
          endTime: segment.end_time,
          relevanceScore: Math.min(score, 1.0),
          description: segment.description,
          entities,
          sceneType: segment.scene_type,
          confidence: segment.confidence,
        });
      }
    }
    
    return matches;
  }

  async getSearchSuggestions(
    videoId: string, 
    userId: string, 
    partialQuery: string
  ): Promise<string[]> {
    try {
      const db = getDatabase();
      
      // Get all entities and scene types from segments
      const segments = await db.all(
        'SELECT entities, scene_type FROM temporal_index WHERE video_id = ? AND user_id = ?',
        [videoId, userId]
      );

      const suggestions = new Set<string>();
      const query = partialQuery.toLowerCase();

      for (const segment of segments as any[]) {
        // Add entities
        if (segment.entities) {
          const entities = JSON.parse(segment.entities);
          for (const entity of entities) {
            if (entity.toLowerCase().includes(query)) {
              suggestions.add(entity);
            }
          }
        }
        
        // Add scene types
        if (segment.scene_type && segment.scene_type.toLowerCase().includes(query)) {
          suggestions.add(segment.scene_type);
        }
      }

      return Array.from(suggestions).slice(0, 10); // Return top 10 suggestions
    } catch (error) {
      logger.error('Error getting search suggestions:', error);
      return [];
    }
  }

  async getPopularSearchTerms(videoId: string, userId: string): Promise<string[]> {
    try {
      const db = getDatabase();
      
      // Get all unique entities and scene types
      const segments = await db.all<{ entities: string | null }>(
        'SELECT entities FROM temporal_index WHERE video_id = ? AND user_id = ?',
        [videoId, userId]
      );

      const termCounts = new Map<string, number>();

      for (const segment of segments) {
        if (segment.entities) {
          try {
            const entities = JSON.parse(segment.entities);
            for (const entity of entities) {
              const count = termCounts.get(entity) || 0;
              termCounts.set(entity, count + 1);
            }
          } catch (e) {
            logger.warn('Failed to parse entities:', e);
          }
        }
      }

      // Sort by frequency and return top terms
      return Array.from(termCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([term]) => term);
    } catch (error) {
      logger.error('Error getting popular search terms:', error);
      return [];
    }
  }
}

export const semanticSearchService = new SemanticSearchService();