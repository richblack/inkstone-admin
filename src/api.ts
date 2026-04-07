// API client — 所有請求走 /api/kbdb proxy，token 由 Pages Function 注入

const BASE = '/api/kbdb';

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem('admin_token');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { headers: authHeaders() });
  if (!res.ok) throw new Error(`API error ${res.status}: ${await res.text()}`);
  return res.json() as Promise<T>;
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`API error ${res.status}: ${await res.text()}`);
  return res.json() as Promise<T>;
}

// --- 型別 ---

export interface TripletStats {
  total: number;
  by_user_id: Record<string, number>;
  recent: { today: number; this_week: number };
  top_subjects: { subject: string; count: number }[];
  top_predicates: { predicate: string; count: number }[];
}

export interface EntityStat {
  name: string;
  as_subject: number;
  as_object: number;
  total: number;
}

export interface EntityListResult {
  entities: EntityStat[];
  total: number;
  limit: number;
  offset: number;
}

export interface Triplet {
  id: string;
  subject: string;
  predicate: string;
  object: string;
  confidence?: number;
  user_id?: string;
  created_at?: number;
}

export interface TripletListResult {
  triplets: Triplet[];
  total?: number;
}

export interface SearchMatch {
  id: string;
  score: number;
  subject?: string;
  predicate?: string;
  object?: string;
  type?: string;
  content?: string;
}

export interface SearchResult {
  matches: SearchMatch[];
  count: number;
}

// --- 端點 ---

export const fetchStats = () => get<TripletStats>('/triplets/stats');

export const fetchEntities = (limit = 200, offset = 0, q?: string) => {
  const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
  if (q) params.set('q', q);
  return get<EntityListResult>(`/entities?${params}`);
};

export const fetchTripletsBySubject = (subject: string, limit = 50) =>
  get<TripletListResult>(`/triplets?subject=${encodeURIComponent(subject)}&limit=${limit}`);

export const fetchTriplets = (params: { subject?: string; predicate?: string; limit?: number; offset?: number }) => {
  const p = new URLSearchParams();
  if (params.subject) p.set('subject', params.subject);
  if (params.predicate) p.set('predicate', params.predicate);
  p.set('limit', String(params.limit ?? 50));
  if (params.offset) p.set('offset', String(params.offset));
  return get<TripletListResult>(`/triplets?${p}`);
};

export const fetchSearch = (q: string) =>
  post<SearchResult>('/search', { query: q, type: 'semantic' });
