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
  return url;
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
