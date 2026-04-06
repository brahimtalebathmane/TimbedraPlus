import { supabase } from '@/lib/supabase';

const STORAGE_VISITOR = 'timbedra_visitor_key';
const DEDUP_PREFIX = 'timbedra_visit_dedup:';

/** Client-side dedup window to limit refresh spam (30 minutes). */
const DEDUP_MS = 30 * 60 * 1000;

export function getVisitorKey(): string {
  try {
    let k = localStorage.getItem(STORAGE_VISITOR);
    if (!k) {
      k = crypto.randomUUID();
      localStorage.setItem(STORAGE_VISITOR, k);
    }
    return k;
  } catch {
    return `anon_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  }
}

function dedupStorageKey(parts: string[]): string {
  return `${DEDUP_PREFIX}${parts.join(':')}`;
}

export function shouldCountVisit(dedupId: string): boolean {
  try {
    const raw = localStorage.getItem(dedupId);
    if (!raw) return true;
    const t = parseInt(raw, 10);
    if (Number.isNaN(t)) return true;
    return Date.now() - t > DEDUP_MS;
  } catch {
    return true;
  }
}

function markVisitCounted(dedupId: string): void {
  try {
    localStorage.setItem(dedupId, String(Date.now()));
  } catch {
    /* ignore quota */
  }
}

export type VisitPayload = {
  page_url: string;
  content_type: 'article' | 'video' | 'page' | 'home' | 'other';
  category_id?: string | null;
  post_id?: string | null;
  video_id?: string | null;
};

/**
 * Records a visit row and relies on DB trigger to bump posts.views / videos.views when ids are set.
 * Fails quietly (no throw) to avoid breaking the public site if analytics is unavailable.
 */
export async function recordVisit(payload: VisitPayload, dedupParts: string[]): Promise<void> {
  const dedupId = dedupStorageKey(dedupParts);
  if (!shouldCountVisit(dedupId)) return;

  const visitor_key = getVisitorKey();
  try {
    const { error } = await supabase.from('visits').insert({
      page_url: payload.page_url,
      category_id: payload.category_id ?? null,
      content_type: payload.content_type,
      post_id: payload.post_id ?? null,
      video_id: payload.video_id ?? null,
      visitor_key,
    });
    if (!error) {
      markVisitCounted(dedupId);
    }
  } catch {
    /* network / schema — keep UI clean */
  }
}

export function currentPageUrl(): string {
  if (typeof window === 'undefined') return '';
  return window.location.href;
}
