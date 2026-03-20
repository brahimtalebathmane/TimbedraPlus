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

export async function uploadImage(file: File, bucket: string = 'news-images'): Promise<string> {
  const { supabase } = await import('./supabase');

  const compressedFile = await compressImage(file);

  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const uuid = crypto.randomUUID();
  const fileExt = file.name.split('.').pop();
  const fileName = `${uuid}.${fileExt}`;
  const filePath = `posts/${year}/${month}/${fileName}`;

  const { error } = await supabase.storage
    .from(bucket)
    .upload(filePath, compressedFile);

  if (error) throw error;

  const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
  return data.publicUrl;
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
  const expiresIn = 3600; // seconds (matches typical Supabase defaults)
  if (!Number.isFinite(expiresIn) || expiresIn <= 0) {
    throw new Error(`Invalid expiresIn: ${String(expiresIn)}`);
  }

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

  // Prefer signed upload URL so we can track upload progress.
  // If the client version doesn't support it (or it fails), fall back to supabase-js upload.
  try {
    type SignedUploadData = { signedUrl: string; token: string; path: string } | null;
    type SignedUploadResponse = { data: SignedUploadData; error: unknown | null };
    type SignedUploadOptions = { upsert?: boolean; expiresIn?: number };
    type StorageBucket = ReturnType<typeof supabase.storage.from>;
    type StorageWithSignedUpload = StorageBucket & {
      createSignedUploadUrl?: (path: string, options?: SignedUploadOptions) => Promise<SignedUploadResponse>;
    };

    const storage = supabase.storage.from(bucket) as unknown as StorageWithSignedUpload;
    if (typeof storage.createSignedUploadUrl !== 'function') {
      return await uploadVideo(file, bucket);
    }

    // IMPORTANT:
    // - filePath is the internal object path ONLY (no bucket name).
    // - expiresIn is always provided and validated above.
    const { data, error } = await storage.createSignedUploadUrl(filePath, {
      upsert: false,
      expiresIn,
    });
    if (error) {
      // Log full signed-upload generation failure to help diagnose 400s.
      console.warn('Supabase createSignedUploadUrl() failed', { bucket, filePath, expiresIn, error });
      throw error;
    }

    const signedUrl: string | undefined = data?.signedUrl;
    const token: string | undefined = data?.token;
    if (!signedUrl) {
      return await uploadVideo(file, bucket);
    }

    await new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('PUT', signedUrl, true);
      xhr.timeout = timeoutMs;
      xhr.setRequestHeader('Content-Type', mimeType);
      // Keep upsert header to match storage-js behavior.
      xhr.setRequestHeader('x-upsert', 'false');
      xhr.setRequestHeader('cache-control', 'max-age=3600');

      xhr.upload.onprogress = (evt) => {
        if (!evt.lengthComputable) return;
        const percent = evt.total > 0 ? (evt.loaded / evt.total) * 100 : 0;
        opts?.onProgress?.({
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
          bucket,
          filePath,
          xhrStatus: xhr.status,
          tokenPresent: Boolean(token),
          responseText: xhr.responseText,
        });
        reject(new Error(`Video upload failed (${xhr.status}): ${xhr.responseText || xhr.statusText}`));
      };

      // IMPORTANT: user-requested constraint: do NOT use multipart/form-data.
      // Send raw binary bytes to the signed upload URL.
      xhr.send(fileBytes);
    });

    // Ensure UI reaches 100%.
    opts?.onProgress?.({ loaded: file.size, total: file.size, percent: 100 });

    const { data: publicData } = supabase.storage.from(bucket).getPublicUrl(filePath);
    return publicData.publicUrl;
  } catch (err) {
    console.warn('Signed upload flow failed; falling back to normal upload.', err);
    // Fall back to the standard upload path (no progress).
    const url = await uploadVideo(file, bucket);
    opts?.onProgress?.({ loaded: file.size, total: file.size, percent: 100 });
    return url;
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
  const youtubeMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/);
  if (youtubeMatch) return youtubeMatch[1];

  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) return vimeoMatch[1];

  return null;
}

export function getVideoEmbedUrl(url: string): string | null {
  const videoId = extractVideoId(url);
  if (!videoId) return null;

  if (url.includes('youtube') || url.includes('youtu.be')) {
    return `https://www.youtube.com/embed/${videoId}`;
  }

  if (url.includes('vimeo')) {
    return `https://player.vimeo.com/video/${videoId}`;
  }

  return null;
}
