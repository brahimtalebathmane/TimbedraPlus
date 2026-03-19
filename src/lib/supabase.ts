import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Profile = {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
  role: 'user' | 'admin';
  created_at: string;
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
  category_id: string | null;
  author_id: string | null;
  status: 'draft' | 'published' | 'archived';
  content_type: 'news' | 'portrait' | 'tourism' | 'video';
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
