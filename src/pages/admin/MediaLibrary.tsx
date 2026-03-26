import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Eye, Copy } from 'lucide-react';

import { supabase } from '@/lib/supabase';
import { extractYouTubeVideoId, formatDate, getVideoEmbedUrl } from '@/lib/helpers';
import { cn } from '@/lib/utils';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

type MediaType = 'image' | 'video';
type MediaSource = 'storage' | 'posts' | 'videos' | 'ads';

type MediaItem = {
  id: string;
  url: string;
  type: MediaType;
  source: MediaSource;
  fileName: string;
  created_at?: string | null;
};

type StorageListEntry = {
  // Full storage object path, relative to bucket root (eg: `posts/2026/03/uuid.jpg`)
  path: string;
  updated_at?: string | null;
  created_at?: string | null;
  metadata?: { mimetype?: string } | null;
};

const STORAGE_IMAGES_BUCKET = 'news-images';

function getFileNameFromUrl(url: string): string {
  try {
    const parsed = new URL(url);

    // If it's a YouTube URL, use the video id as a stable filename.
    const ytId = extractYouTubeVideoId(url);
    if (ytId) return `youtube-${ytId}`;

    const last = parsed.pathname.split('/').filter(Boolean).pop();
    if (last) return decodeURIComponent(last);
  } catch {
    // fallthrough
  }

  // Fallback: last segment of the string.
  const last = url.split('/').filter(Boolean).pop();
  return last ? decodeURIComponent(last) : url;
}

function isImageUrl(url: string): boolean {
  const lower = url.toLowerCase();
  return (
    lower.includes('.jpg') ||
    lower.includes('.jpeg') ||
    lower.includes('.png') ||
    lower.includes('.webp') ||
    lower.includes('.gif') ||
    lower.includes('image/')
  );
}

async function listAllStorageObjects(bucket: string): Promise<StorageListEntry[]> {
  const results: StorageListEntry[] = [];

  async function walk(prefix: string, depth: number) {
    if (depth > 20) return; // safety guard

    // Pagination: storage.list is capped, so keep fetching until empty.
    let offset = 0;
    while (true) {
      const { data, error } = await supabase.storage.from(bucket).list(prefix || '', {
        limit: 200,
        offset,
      });
      if (error) throw error;

      const entries = data ?? [];
      if (entries.length === 0) break;

      for (const entry of entries as Array<{
        name: string;
        updated_at?: string | null;
        created_at?: string | null;
        metadata?: { mimetype?: string } | null;
      }>) {
        const fullPath = prefix ? `${prefix}/${entry.name}` : entry.name;

        const mimetype = entry.metadata?.mimetype;
        const looksLikeFile =
          !!mimetype ||
          /\.[a-z0-9]+$/i.test(entry.name) ||
          ['jpg', 'jpeg', 'png', 'webp', 'gif'].some((ext) =>
            entry.name.toLowerCase().endsWith(`.${ext}`)
          );

        if (looksLikeFile) {
          results.push({
            path: fullPath,
            created_at: entry.created_at ?? null,
            updated_at: entry.updated_at ?? null,
            metadata: entry.metadata ?? null,
          });
          continue;
        }

        // Folder-like entry; recurse.
        await walk(fullPath, depth + 1);
      }

      if (entries.length < 200) break;
      offset += 200;
    }
  }

  await walk('', 0);
  return results;
}

function storageObjectToMediaItem(params: {
  path: string;
  url: string;
  createdAt?: string | null;
}): MediaItem {
  return {
    id: `storage:${params.path}`,
    url: params.url,
    type: 'image',
    source: 'storage',
    fileName: getFileNameFromUrl(params.url),
    created_at: params.createdAt ?? null,
  };
}

export default function MediaLibrary() {
  const { t, i18n } = useTranslation();

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<MediaItem[]>([]);
  const [filter, setFilter] = useState<'all' | 'images' | 'videos'>('all');

  const labelType = (type: MediaType) => (type === 'image' ? t('images') : t('videos'));
  const labelSource = (source: MediaSource) =>
    source === 'storage'
      ? t('media_source_storage')
      : source === 'posts'
        ? t('media_source_posts')
        : source === 'videos'
          ? t('media_source_videos')
          : t('media_source_ads');

  const isRTL = i18n.language === 'ar';

  const filteredItems = useMemo(() => {
    if (filter === 'images') return items.filter((i) => i.type === 'image');
    if (filter === 'videos') return items.filter((i) => i.type === 'video');
    return items;
  }, [filter, items]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const media: MediaItem[] = [];

        // Storage: list all uploaded images in `news-images`.
        const storageObjects = await listAllStorageObjects(STORAGE_IMAGES_BUCKET);
        for (const obj of storageObjects) {
          const { data } = supabase.storage.from(STORAGE_IMAGES_BUCKET).getPublicUrl(obj.path);
          const url = data.publicUrl;
          if (!url) continue;
          if (!isImageUrl(url)) continue;

          media.push(
            storageObjectToMediaItem({
              path: obj.path,
              url,
              createdAt: obj.created_at ?? obj.updated_at ?? null,
            })
          );
        }

        // Posts table: extract any linked `image_url` and `video_url`.
        const { data: postsData, error: postsError } = await supabase
          .from('posts')
          .select('id,image_url,video_url,created_at,status')
          .eq('status', 'published');
        if (postsError) throw postsError;

        for (const row of (postsData ?? []) as Array<{
          id: string;
          image_url: string | null;
          video_url: string | null;
          created_at?: string;
        }>) {
          if (row.image_url) {
            media.push({
              id: `posts:${row.id}:image`,
              url: row.image_url,
              type: 'image',
              source: 'posts',
              fileName: getFileNameFromUrl(row.image_url),
              created_at: row.created_at ?? null,
            });
          }
          if (row.video_url) {
            media.push({
              id: `posts:${row.id}:video`,
              url: row.video_url,
              type: 'video',
              source: 'posts',
              fileName: getFileNameFromUrl(row.video_url),
              created_at: row.created_at ?? null,
            });
          }
        }

        // Videos table: extract YouTube links.
        const { data: videosData, error: videosError } = await supabase
          .from('videos')
          .select('id,video_url,created_at')
          .order('created_at', { ascending: false });
        if (videosError) throw videosError;

        for (const row of (videosData ?? []) as Array<{
          id: string;
          video_url: string;
          created_at?: string;
        }>) {
          if (!row.video_url) continue;
          media.push({
            id: `videos:${row.id}`,
            url: row.video_url,
            type: 'video',
            source: 'videos',
            fileName: getFileNameFromUrl(row.video_url),
            created_at: row.created_at ?? null,
          });
        }

        // Ads table: extract `image_url` and/or `video_url`.
        const { data: adsData, error: adsError } = await supabase
          .from('ads')
          .select('id,image_url,video_url,created_at')
          .order('created_at', { ascending: false });
        if (adsError) throw adsError;

        for (const row of (adsData ?? []) as Array<{
          id: string;
          image_url?: string | null;
          video_url?: string | null;
          created_at?: string;
        }>) {
          if (row.image_url) {
            media.push({
              id: `ads:${row.id}:image`,
              url: row.image_url,
              type: 'image',
              source: 'ads',
              fileName: getFileNameFromUrl(row.image_url),
              created_at: row.created_at ?? null,
            });
          }
          if (row.video_url) {
            media.push({
              id: `ads:${row.id}:video`,
              url: row.video_url,
              type: 'video',
              source: 'ads',
              fileName: getFileNameFromUrl(row.video_url),
              created_at: row.created_at ?? null,
            });
          }
        }

        // Sort: newest first when available.
        media.sort((a, b) => {
          const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
          const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
          return tb - ta;
        });

        setItems(media);
      } catch (error: unknown) {
        console.error(error);
        toast.error(t('error'));
      } finally {
        setLoading(false);
      }
    };

    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleView = (item: MediaItem) => {
    window.open(item.url, '_blank', 'noopener,noreferrer');
  };

  const handleCopyUrl = async (item: MediaItem) => {
    try {
      await navigator.clipboard.writeText(item.url);
      toast.success(t('success'));
    } catch (error: unknown) {
      console.error(error);
      toast.error(t('error'));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">{t('media_library')}</h1>
          <p className="text-muted-foreground mt-1">{t('media_library_subtitle')}</p>
        </div>
      </div>

      <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
        <TabsList className="w-full justify-start">
          <TabsTrigger value="all">{t('all')}</TabsTrigger>
          <TabsTrigger value="images">{t('images')}</TabsTrigger>
          <TabsTrigger value="videos">{t('videos_tab')}</TabsTrigger>
        </TabsList>
      </Tabs>

      {loading ? (
        <div className="p-6 text-muted-foreground">{t('loading_media')}</div>
      ) : filteredItems.length === 0 ? (
        <div className="p-6 text-muted-foreground">{t('no_results')}</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredItems.map((item) => {
            const embedUrl = item.type === 'video' ? getVideoEmbedUrl(item.url) : null;
            return (
              <Card key={item.id} className="overflow-hidden">
                <CardContent className="p-0">
                  <div className="bg-muted/20">
                    {item.type === 'image' ? (
                      <img
                        src={item.url}
                        alt={item.fileName}
                        className="w-full h-56 object-cover"
                        loading="lazy"
                      />
                    ) : embedUrl ? (
                      <div className="w-full h-56 bg-black">
                        <iframe
                          title={item.fileName}
                          src={embedUrl}
                          className="w-full h-full border-0"
                          loading="lazy"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                      </div>
                    ) : (
                      <div className="w-full h-56 flex items-center justify-center bg-black text-white/80 text-sm p-4 text-center">
                        {t('video_preview_unavailable')}
                      </div>
                    )}
                  </div>

                  <div className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">{item.fileName}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {labelType(item.type)} · {labelSource(item.source)}
                        </div>
                        {item.created_at ? (
                          <div className="text-xs text-muted-foreground mt-1">
                            {formatDate(item.created_at, i18n.language)}
                          </div>
                        ) : null}
                      </div>
                      <Badge variant="outline">{labelType(item.type)}</Badge>
                    </div>

                    <div className="flex gap-2">
                      <Button variant="secondary" size="sm" className="flex-1" onClick={() => handleView(item)}>
                        <Eye className={cn('w-4 h-4', isRTL ? 'ml-2' : 'mr-2')} />
                        {t('view')}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCopyUrl(item)}
                        aria-label={t('copy_url_aria')}
                      >
                        <Copy className={cn('w-4 h-4', isRTL ? 'ml-2' : 'mr-2')} />
                        {t('copy_url')}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

