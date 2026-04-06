import imageCompression from 'browser-image-compression';
import { format, formatDistanceToNow } from 'date-fns';
import { ar, fr } from 'date-fns/locale';

export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function safeStripHtml(html: string): string {
  if (typeof window === 'undefined') return html;

  const doc = new DOMParser().parseFromString(html, 'text/html');
  return doc.body.textContent || '';
}

export function createSearchVector(
  titleAr: string,
  contentAr: string,
  titleFr: string,
  contentFr: string
): string {
  const strippedContentAr = safeStripHtml(contentAr);
  const strippedContentFr = safeStripHtml(contentFr);
  return `${titleAr} ${strippedContentAr} ${titleFr} ${strippedContentFr}`;
}

export async function compressImage(file: File): Promise<File> {
  const options = {
    maxSizeMB: 0.5,
    maxWidthOrHeight: 1200,
    useWebWorker: true,
  };

  try {
    const compressedFile = await imageCompression(file, options);
    return compressedFile;
  } catch (error) {
    console.error('Error compressing image:', error);
    return file;
  }
}

export async function uploadImage(
  file: File,
  bucket: string = 'news-images',
  pathPrefix: string = 'posts'
): Promise<string> {
  const { supabase } = await import('./supabase');

  const compressedFile = await compressImage(file);

  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const uuid = crypto.randomUUID();
  const fileExt = file.name.split('.').pop();
  const fileName = `${uuid}.${fileExt}`;
  const filePath = `${pathPrefix}/${year}/${month}/${fileName}`;

  const { error } = await supabase.storage
    .from(bucket)
    .upload(filePath, compressedFile);

  if (error) throw error;

  const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
  return data.publicUrl;
}

export const AD_IMAGES_BUCKET = 'ads-images';

export async function uploadAdImage(file: File): Promise<string> {
  return uploadImage(file, AD_IMAGES_BUCKET, 'ads');
}

/** Best-effort removal when replacing an asset; ignores non-project URLs. */
export async function removeStorageObjectByPublicUrl(
  publicUrl: string,
  bucket: string
): Promise<void> {
  const { supabase } = await import('./supabase');
  const marker = `/storage/v1/object/public/${bucket}/`;
  const idx = publicUrl.indexOf(marker);
  if (idx === -1) return;
  let path = publicUrl.slice(idx + marker.length);
  const q = path.indexOf('?');
  if (q !== -1) path = path.slice(0, q);
  if (!path) return;
  try {
    path = decodeURIComponent(path);
  } catch {
    /* keep raw path */
  }
  const { error } = await supabase.storage.from(bucket).remove([path]);
  if (error) console.warn('removeStorageObjectByPublicUrl:', error.message);
}

function getVideoMimeType(file: File): string {
  // Some browsers can append parameters (eg `video/mp4; codecs="..."`).
  // Supabase Storage bucket `allowed_mime_types` expects exact values, so strip everything after `;`.
  const providedType = file.type?.trim();
  if (providedType && providedType.startsWith('video/')) {
    return providedType.split(';')[0].trim();
  }

  const ext = (file.name.split('.').pop() || '').toLowerCase();
  switch (ext) {
    case 'mp4':
      return 'video/mp4';
    case 'webm':
      return 'video/webm';
    case 'mov':
      return 'video/quicktime';
    case 'm4v':
      return 'video/x-m4v';
    case 'mkv':
      return 'video/x-matroska';
    case 'ogg':
      return 'video/ogg';
    case '3gp':
      return 'video/3gpp';
    default:
      return 'video/mp4';
  }
}

function getExtensionFromMimeType(mimeType: string): string {
  switch (mimeType) {
    case 'video/mp4':
      return 'mp4';
    case 'video/webm':
      return 'webm';
    case 'video/quicktime':
      return 'mov';
    case 'video/x-m4v':
      return 'm4v';
    case 'video/x-matroska':
      return 'mkv';
    case 'video/ogg':
      return 'ogg';
    case 'video/3gpp':
      return '3gp';
    default:
      return 'mp4';
  }
}

export async function uploadVideo(file: File, bucket: string = 'news-videos'): Promise<string> {
  const { supabase } = await import('./supabase');

  // Note: we intentionally do not compress videos in-browser (too slow / heavy).
  // Storage policies + bucket limits protect the system.
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const uuid = crypto.randomUUID();
  const mimeType = getVideoMimeType(file);
  const rawExt = (file.name.split('.').pop() || '').toLowerCase();
  const safeExt = /^[a-z0-9]+$/.test(rawExt) ? rawExt : getExtensionFromMimeType(mimeType);
  const fileName = `${uuid}.${safeExt}`;
  const filePath = `videos/${year}/${month}/${fileName}`;
  const fileBytes = await file.arrayBuffer();

  // Fallback/no-progress upload.
  // IMPORTANT: pass raw binary (ArrayBuffer) so storage-js does not use multipart/form-data.
  const { error } = await supabase.storage.from(bucket).upload(filePath, fileBytes, {
    contentType: mimeType,
  });
  if (error) throw error;

  const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
  return data.publicUrl;
}

type UploadProgress = {
  loaded: number;
  total: number;
  percent: number;
};

/**
 * Uploads a video with real client-side progress.
 * Uses a signed upload URL (when available) + XHR to report progress.
 */
async function authHeadersForStorageUpload(): Promise<Record<string, string>> {
  const { supabase } = await import('./supabase');
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData?.session?.access_token;

  const headers: Record<string, string> = {};
  if (anonKey) headers.apikey = anonKey;
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  return headers;
}

/**
 * PUT binary to a signed upload URL using the same headers @supabase/storage-js would send.
 * Raw ArrayBuffer body avoids multipart/form-data (File/Blob would be sent as FormData by the SDK).
 */
function putSignedVideoWithProgress(
  signedUrl: string,
  fileBytes: ArrayBuffer,
  mimeType: string,
  timeoutMs: number,
  extraHeaders: Record<string, string>,
  onProgress?: (progress: UploadProgress) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', signedUrl, true);
    xhr.timeout = timeoutMs;

    for (const [k, v] of Object.entries(extraHeaders)) {
      xhr.setRequestHeader(k, v);
    }
    xhr.setRequestHeader('Content-Type', mimeType);
    xhr.setRequestHeader('x-upsert', 'false');
    xhr.setRequestHeader('cache-control', 'max-age=3600');

    xhr.upload.onprogress = (evt) => {
      if (!evt.lengthComputable) return;
      const percent = evt.total > 0 ? (evt.loaded / evt.total) * 100 : 0;
      onProgress?.({
        loaded: evt.loaded,
        total: evt.total,
        percent: Math.max(0, Math.min(100, percent)),
      });
    };

    xhr.onerror = () => reject(new Error('Video upload failed (network error).'));
    xhr.ontimeout = () => reject(new Error('Video upload timed out.'));
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) return resolve();
      console.warn('Signed upload PUT failed', {
        xhrStatus: xhr.status,
        responseText: xhr.responseText,
      });
      reject(new Error(`Video upload failed (${xhr.status}): ${xhr.responseText || xhr.statusText}`));
    };

    xhr.send(fileBytes);
  });
}

export async function uploadVideoWithProgress(
  file: File,
  opts?: {
    bucket?: string;
    onProgress?: (progress: UploadProgress) => void;
    timeoutMs?: number;
  }
): Promise<string> {
  const { supabase } = await import('./supabase');

  const bucket = opts?.bucket ?? 'news-videos';
  const timeoutMs = opts?.timeoutMs ?? 5 * 60 * 1000; // 5 minutes

  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const uuid = crypto.randomUUID();
  const mimeType = getVideoMimeType(file);
  const rawExt = (file.name.split('.').pop() || '').toLowerCase();
  const safeExt = /^[a-z0-9]+$/.test(rawExt) ? rawExt : getExtensionFromMimeType(mimeType);
  const fileName = `${uuid}.${safeExt}`;
  const filePath = `videos/${year}/${month}/${fileName}`;
  const fileBytes = await file.arrayBuffer();
  const storage = supabase.storage.from(bucket);

  const finish = async (url: string) => {
    opts?.onProgress?.({ loaded: file.size, total: file.size, percent: 100 });
    return url;
  };

  try {
    const { data: signed, error: signError } = await storage.createSignedUploadUrl(filePath, {
      upsert: false,
    });

    if (signError || !signed?.signedUrl || !signed?.token) {
      console.warn('createSignedUploadUrl failed; using standard upload.', signError);
      return finish(await uploadVideo(file, bucket));
    }

    const { signedUrl, token } = signed;

    try {
      if (opts?.onProgress) {
        const extra = await authHeadersForStorageUpload();
        await putSignedVideoWithProgress(
          signedUrl,
          fileBytes,
          mimeType,
          timeoutMs,
          extra,
          opts.onProgress
        );
      } else {
        const { error: upErr } = await storage.uploadToSignedUrl(filePath, token, fileBytes, {
          contentType: mimeType,
          cacheControl: '3600',
          upsert: false,
        });
        if (upErr) throw upErr;
      }

      const { data: publicData } = supabase.storage.from(bucket).getPublicUrl(filePath);
      return finish(publicData.publicUrl);
    } catch (putErr) {
      console.warn('Signed upload PUT/uploadToSignedUrl failed; falling back to standard upload.', putErr);
      return finish(await uploadVideo(file, bucket));
    }
  } catch (err) {
    console.warn('Signed upload flow failed; falling back to normal upload.', err);
    return finish(await uploadVideo(file, bucket));
  }
}

export function formatDate(
  date: string,
  locale: string = 'ar',
  formatStr: string = 'PPP'
): string {
  const localeObj = locale === 'ar' ? ar : fr;
  return format(new Date(date), formatStr, { locale: localeObj });
}

export function formatRelativeTime(date: string, locale: string = 'ar'): string {
  const localeObj = locale === 'ar' ? ar : fr;
  return formatDistanceToNow(new Date(date), { addSuffix: true, locale: localeObj });
}

export function truncateText(text: string, maxLength: number = 150): string {
  const stripped = safeStripHtml(text);
  if (stripped.length <= maxLength) return stripped;
  return stripped.slice(0, maxLength).trim() + '...';
}

export function validateTipTapContent(content: string): boolean {
  const stripped = safeStripHtml(content).trim();
  return stripped.length > 0;
}

export function getImagePath(url: string | null): string {
  if (!url) return 'https://images.pexels.com/photos/3944454/pexels-photo-3944454.jpeg';
  // Prefer stored public URLs, but also support older records that might store paths.
  if (url.startsWith('http://') || url.startsWith('https://')) return url;

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  if (!supabaseUrl) return url;

  return `${supabaseUrl}/storage/v1/object/public/news-images/${url}`;
}

export function extractVideoId(url: string): string | null {
  return extractYouTubeVideoId(url);
}

export function getVideoEmbedUrl(url: string): string | null {
  const videoId = extractYouTubeVideoId(url);
  if (!videoId) return null;
  return `https://www.youtube.com/embed/${videoId}`;
}

export function extractYouTubeVideoId(url: string): string | null {
  // Supports:
  // - https://www.youtube.com/watch?v=VIDEO_ID
  // - https://youtu.be/VIDEO_ID
  // - https://www.youtube.com/embed/VIDEO_ID
  // - https://www.youtube.com/shorts/VIDEO_ID
  // - https://www.youtube.com/live/VIDEO_ID
  const patterns: RegExp[] = [
    /youtube\.com\/watch\?v=([^&\s?#]+)/i,
    /youtu\.be\/([^&\s?#]+)/i,
    /youtube\.com\/embed\/([^&\s?#]+)/i,
    /youtube\.com\/shorts\/([^&\s?#]+)/i,
    /youtube\.com\/live\/([^&\s?#]+)/i,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    const candidate = match?.[1];
    if (candidate && /^[0-9A-Za-z_-]{11}$/.test(candidate)) return candidate;
  }

  return null;
}

export function normalizeYouTubeUrl(url: string): string | null {
  const videoId = extractYouTubeVideoId(url);
  if (!videoId) return null;
  return `https://www.youtube.com/watch?v=${videoId}`;
}

export function getYouTubeThumbnailUrlFromVideoId(videoId: string): string {
  // `hqdefault.jpg` is reliable and avoids some failures with `maxresdefault.jpg`.
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
}

export function getYouTubeThumbnailUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const videoId = extractYouTubeVideoId(url);
  if (!videoId) return null;
  return getYouTubeThumbnailUrlFromVideoId(videoId);
}

export function getPostThumbnailUrl(input: {
  content_type?: string | null;
  image_url?: string | null;
  video_url?: string | null;
  video_thumbnail?: string | null;
}): string | null {
  const contentType = input.content_type ?? '';
  const isVideoPost = contentType === 'فيديو' || contentType === 'video';

  if (isVideoPost) {
    return input.video_thumbnail ?? getYouTubeThumbnailUrl(input.video_url) ?? null;
  }

  return input.image_url ?? null;
}

export function getPostThumbnailPath(input: {
  content_type?: string | null;
  image_url?: string | null;
  video_url?: string | null;
  video_thumbnail?: string | null;
}): string {
  return getImagePath(getPostThumbnailUrl(input));
}
