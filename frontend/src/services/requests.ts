/**
 * Request/suggestion-specific service helpers.
 */
import { fetchData, postData } from '@/services/apiHelper';

export type RequestStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';
export type RequestMediaType = 'movie' | 'tv' | 'other';

export interface MovieRequest {
  id: number;
  user_id: string;
  username: string;
  title: string;
  media_type: RequestMediaType;
  note?: string | null;
  poster_url?: string | null;
  trailer_url?: string | null;
  synopsis?: string | null;
  admin_note?: string | null;
  status: RequestStatus;
  created_at: string;
  updated_at?: string;
  completed_at?: string | null;
}

export interface RequestsStats {
  all: number;
  pending: number;
  in_progress: number;
  completed: number;
  cancelled: number;
}

export interface RequestsResponse {
  ok: boolean;
  requests: MovieRequest[];
  stats: RequestsStats;
}

export const requestStatusLabels: Record<RequestStatus, string> = {
  pending: 'Por aprovar',
  in_progress: 'Em revisão',
  completed: 'Aprovado',
  cancelled: 'Não aprovado',
};

export const requestMediaLabels: Record<RequestMediaType, string> = {
  movie: 'Filme',
  tv: 'Série',
  other: 'Outro',
};

export async function listMovieRequests(status: RequestStatus | 'all' = 'all', all = false) {
  const data = await fetchData<RequestsResponse>('requests.php', {
    action: 'list',
    status,
    all: all ? 1 : 0,
  });

  return {
    requests: Array.isArray(data?.requests) ? data.requests : [],
    stats: data?.stats || { all: 0, pending: 0, in_progress: 0, completed: 0, cancelled: 0 },
  };
}

export async function createMovieRequest(payload: {
  title: string;
  media_type: RequestMediaType;
  note?: string;
  poster_url?: string;
  trailer_url?: string;
  synopsis?: string;
}) {
  return postData<{ ok: boolean; request?: MovieRequest; error?: string; message?: string }>('requests.php', {
    action: 'create',
    ...payload,
  });
}

export async function updateMovieRequestStatus(
  requestId: number,
  status: RequestStatus,
  adminNote?: string
) {
  return postData<{ ok: boolean; request?: MovieRequest; error?: string; message?: string }>('requests.php', {
    action: 'update_status',
    request_id: requestId,
    status,
    admin_note: adminNote || '',
  });
}


export async function updateMovieRequestDetails(
  requestId: number,
  payload: {
    title: string;
    media_type: RequestMediaType;
    note?: string;
    poster_url?: string;
    trailer_url?: string;
    synopsis?: string;
    admin_note?: string;
  }
) {
  return postData<{ ok: boolean; request?: MovieRequest; error?: string; message?: string }>('requests.php', {
    action: 'update_details',
    request_id: requestId,
    ...payload,
  });
}

export async function deleteMovieRequest(requestId: number) {
  return postData<{ ok: boolean; error?: string; message?: string }>('requests.php', {
    action: 'delete',
    request_id: requestId,
  });
}
