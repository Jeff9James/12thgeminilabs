import { useQuery } from '@tanstack/react-query';
import { videoApi } from '../services/videoApi';
import { Video, VideoStatus } from '@shared/types';

export interface UseVideosOptions {
  page?: number;
  pageSize?: number;
  sortBy?: 'createdAt' | 'title' | 'duration' | 'status';
  sortOrder?: 'asc' | 'desc';
  status?: VideoStatus;
  search?: string;
}

export interface UseVideosReturn {
  videos: Video[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  hasMore: boolean;
  total: number;
}

export function useVideos(options: UseVideosOptions = {}): UseVideosReturn {
  const {
    page = 1,
    pageSize = 20,
    sortBy = 'createdAt',
    sortOrder = 'desc',
    status,
    search,
  } = options;

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['videos', { page, pageSize, sortBy, sortOrder, status, search }],
    queryFn: async () => {
      const response = await videoApi.listVideos();
      if (response.success && response.data) {
        // Apply filtering
        let filteredVideos = [...response.data];

        if (status) {
          filteredVideos = filteredVideos.filter((v) => v.status === status);
        }

        if (search) {
          const searchLower = search.toLowerCase();
          filteredVideos = filteredVideos.filter(
            (v) =>
              v.title.toLowerCase().includes(searchLower) ||
              v.originalFilename.toLowerCase().includes(searchLower)
          );
        }

        // Apply sorting
        filteredVideos.sort((a, b) => {
          let comparison = 0;
          switch (sortBy) {
            case 'title':
              comparison = a.title.localeCompare(b.title);
              break;
            case 'duration':
              comparison = (a.duration || 0) - (b.duration || 0);
              break;
            case 'status':
              comparison = a.status.localeCompare(b.status);
              break;
            case 'createdAt':
            default:
              comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          }
          return sortOrder === 'desc' ? -comparison : comparison;
        });

        return {
          videos: filteredVideos,
          total: filteredVideos.length,
          hasMore: filteredVideos.length > page * pageSize,
        };
      }
      return { videos: [], total: 0, hasMore: false };
    },
  });

  return {
    videos: data?.videos || [],
    isLoading,
    error: error ? (error as Error).message : null,
    refetch: async () => {
      await refetch();
    },
    hasMore: data?.hasMore || false,
    total: data?.total || 0,
  };
}
