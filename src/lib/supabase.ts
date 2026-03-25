import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Content types are stored in `posts.content_type` and must match exactly.
export const CONTENT_TYPES = [
  'خبر',
  'بورتريه',
  'سياحة',
  'فيديو',
  'صورة',
  'تحليل / رأي',
  'ثقافة وفنون',
  'رياضة منوعة',
  'تكنولوجيا / علوم',
  'أسلوب حياة / Lifestyle',
  'منوعات / ترفيه',
  'ترند / سوشيال',
] as const;

export type ContentType = (typeof CONTENT_TYPES)[number];

export const VIDEO_CONTENT_TYPE: ContentType = 'فيديو';
export const IMAGE_CONTENT_TYPES: ContentType[] = CONTENT_TYPES.filter(
  (t) => t !== VIDEO_CONTENT_TYPE
);

// Legacy values supported for a smooth rollout during migration.
export const LEGACY_VIDEO_CONTENT_TYPE = 'video';
export const LEGACY_IMAGE_CONTENT_TYPES = ['news', 'portrait', 'tourism'] as const;
export const LEGACY_CONTENT_TYPE_MAP: Record<string, ContentType> = {
  news: 'خبر',
  portrait: 'بورتريه',
  tourism: 'سياحة',
  video: 'فيديو',
};

export type Profile = {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
  role: 'user' | 'admin';
  created_at: string;
};

export type Comment = {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
  // Supabase relationship joins can come back as either a single object or an array
  // depending on how PostgREST infers the relationship shape.
  user?:
    | {
        id: string;
        name: string;
        avatar: string | null;
      }
    | Array<{
        id: string;
        name: string;
        avatar: string | null;
      }>;
};

export type Category = {
  id: string;
  name_ar: string;
  name_fr: string;
  slug: string;
  created_at: string;
};

export type Post = {
  id: string;
  title_ar: string;
  title_fr: string;
  content_ar: string;
  content_fr: string;
  slug: string;
  image_url: string | null;
  video_url?: string | null;
  video_thumbnail?: string | null;
  is_reel?: boolean | null;
  video_width?: number | null;
  video_height?: number | null;
  category_id: string | null;
  author_id: string | null;
  status: 'draft' | 'published' | 'archived';
  content_type: ContentType;
  is_breaking: boolean;
  search_vector: string | null;
  created_at: string;
  updated_at: string;
  category?: Category;
  author?: Profile;
};

export type Video = {
  id: string;
  title_ar: string;
  title_fr: string;
  video_url: string;
  thumbnail: string | null;
  created_at: string;
  is_reel?: boolean | null;
  video_width?: number | null;
  video_height?: number | null;
};

export type Message = {
  id: string;
  name: string;
  email: string;
  message: string;
  created_at: string;
};

export type ContactInfo = {
  id: string;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  facebook: string | null;
  twitter: string | null;
  instagram: string | null;
  youtube: string | null;
  linkedin: string | null;
  snapchat: string | null;
  tiktok: string | null;
  created_at: string;
  updated_at: string;
};

export type LiveStream = {
  id: string;
  title: string;
  video_url: string;
  started_at: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};
