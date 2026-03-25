import { extractYouTubeVideoId } from '@/lib/helpers';
import {
  VIDEO_CONTENT_TYPE,
  LEGACY_VIDEO_CONTENT_TYPE,
} from '@/lib/supabase';

/** Public HTTPS URL pointing to a video file (e.g. Supabase Storage). */
export function isDirectVideoUrl(url: string | null | undefined): boolean {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) return false;
  try {
    const u = new URL(trimmed);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return false;
    const path = u.pathname.toLowerCase();
    if (/\.(mp4|webm|ogg|mov|m4v|mkv|3gp)(\?|$)/i.test(path)) return true;
    if (u.pathname.includes('/storage/v1/object/public/') && path.includes('/news-videos/')) return true;
    return false;
  } catch {
    return false;
  }
}

/** YouTube Shorts and similar URL patterns (no dimensions needed). */
export function inferIsReelFromVideoUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  return /youtube\.com\/shorts\//i.test(url);
}

export type ReelFields = {
  is_reel?: boolean | null;
  video_url?: string | null;
  video_width?: number | null;
  video_height?: number | null;
};

export function effectiveIsReel(input: ReelFields): boolean {
  if (input.is_reel === true) return true;
  const w = input.video_width;
  const h = input.video_height;
  if (typeof w === 'number' && typeof h === 'number' && w > 0 && h > 0 && h > w) return true;
  if (input.video_url && inferIsReelFromVideoUrl(input.video_url)) return true;
  return false;
}

export function isVideoPostContentType(contentType: string | undefined | null): boolean {
  return contentType === VIDEO_CONTENT_TYPE || contentType === LEGACY_VIDEO_CONTENT_TYPE;
}

type PostLike = ReelFields & {
  content_type?: string | null;
  created_at: string;
};

/**
 * Reel video posts first (newest within group), then other video posts, then non-video posts — all by date inside each group.
 */
export function sortPostsReelsFirst<T extends PostLike>(posts: T[]): T[] {
  const isVid = (p: T) => isVideoPostContentType(p.content_type ?? undefined);
  const byDate = (a: T, b: T) =>
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime();

  const reelVideos = posts.filter((p) => isVid(p) && effectiveIsReel(p)).sort(byDate);
  const otherVideos = posts.filter((p) => isVid(p) && !effectiveIsReel(p)).sort(byDate);
  const nonVideos = posts.filter((p) => !isVid(p)).sort(byDate);
  return [...reelVideos, ...otherVideos, ...nonVideos];
}

export type VideoRow = ReelFields & {
  video_url: string;
  created_at: string;
};

export function sortVideosReelsFirst<T extends VideoRow>(videos: T[]): T[] {
  const byDate = (a: T, b: T) =>
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  const reels = videos.filter((v) => effectiveIsReel(v)).sort(byDate);
  const rest = videos.filter((v) => !effectiveIsReel(v)).sort(byDate);
  return [...reels, ...rest];
}

/** True if the URL can be rendered (YouTube embed or direct file). */
export function canPlayVideoUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  if (extractYouTubeVideoId(url)) return true;
  if (isDirectVideoUrl(url)) return true;
  return false;
}
