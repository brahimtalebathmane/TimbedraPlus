import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase, Video } from '@/lib/supabase';
import { formatRelativeTime } from '@/lib/helpers';
import { effectiveIsReel } from '@/lib/videoDisplay';
import { ResponsiveVideoPlayer } from '@/components/VideoEmbed';
import { useSupabaseRealtime } from '@/hooks/useSupabaseRealtime';
import { currentPageUrl, recordVisit } from '@/lib/analytics';
import { VideoViewTracker } from '@/components/VideoViewTracker';

export default function Videos() {
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language;
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  const PAGE_SIZE = 8;

  const titles = useMemo(() => {
    return {
      ar: 'title_ar' as const,
      fr: 'title_fr' as const,
    };
  }, []);

  useEffect(() => {
    void recordVisit({ page_url: currentPageUrl(), content_type: 'page' }, ['page', 'videos', currentLang]);
  }, [currentLang]);

  useEffect(() => {
    const fetchVideos = async (opts?: { replace?: boolean; targetPage?: number }) => {
      const targetPage = opts?.targetPage ?? 1;
      const replacing = opts?.replace ?? targetPage === 1;
      if (replacing) setLoading(true);
      else setLoadingMore(true);
      try {
        const from = (targetPage - 1) * PAGE_SIZE;
        const to = from + PAGE_SIZE; // fetch one extra to detect "has more"
        const { data } = await supabase
          .from('videos')
          .select('*')
          .order('is_reel', { ascending: false })
          .order('created_at', { ascending: false })
          .range(from, to);

        const rows = (data ?? []) as Video[];
        const visible = rows.slice(0, PAGE_SIZE);
        if (replacing) {
          setVideos(visible);
        } else {
          setVideos((prev) => {
            const merged = [...prev, ...visible];
            const seen = new Set<string>();
            return merged.filter((v) => {
              if (seen.has(v.id)) return false;
              seen.add(v.id);
              return true;
            });
          });
        }
        setHasMore(rows.length > PAGE_SIZE);
        setPage(targetPage);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    };

    fetchVideos({ replace: true, targetPage: 1 });
  }, [currentLang, PAGE_SIZE]);

  useSupabaseRealtime({
    tables: ['videos'],
    channelKey: 'rt:videos',
    onChange: () => {
      (async () => {
        // Reset to page 1 on changes to preserve server-side sort/priority.
        setLoading(true);
        setLoadingMore(false);
        setHasMore(true);
        setPage(1);
        try {
          const { data } = await supabase
            .from('videos')
            .select('*')
            .order('is_reel', { ascending: false })
            .order('created_at', { ascending: false })
            .range(0, PAGE_SIZE);

          const rows = (data ?? []) as Video[];
          setVideos(rows.slice(0, PAGE_SIZE));
          setHasMore(rows.length > PAGE_SIZE);
        } finally {
          setLoading(false);
        }
      })();
    },
  });

  useEffect(() => {
    if (!hasMore) return;
    if (loading || loadingMore) return;
    const el = loadMoreRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry?.isIntersecting) return;
        setPage((prev) => prev + 1);
      },
      { root: null, rootMargin: '300px', threshold: 0.01 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, loading, loadingMore]);

  useEffect(() => {
    if (page === 1) return;
    let cancelled = false;

    const fetchNext = async () => {
      if (cancelled) return;
      setLoadingMore(true);
      try {
        const from = (page - 1) * PAGE_SIZE;
        const to = from + PAGE_SIZE;
        const { data } = await supabase
          .from('videos')
          .select('*')
          .order('is_reel', { ascending: false })
          .order('created_at', { ascending: false })
          .range(from, to);

        const rows = (data ?? []) as Video[];
        const visible = rows.slice(0, PAGE_SIZE);
        setVideos((prev) => {
          const merged = [...prev, ...visible];
          const seen = new Set<string>();
          return merged.filter((v) => {
            if (seen.has(v.id)) return false;
            seen.add(v.id);
            return true;
          });
        });
        setHasMore(rows.length > PAGE_SIZE);
      } finally {
        if (!cancelled) setLoadingMore(false);
      }
    };

    fetchNext();
    return () => {
      cancelled = true;
    };
  }, [page, PAGE_SIZE]);

  return (
    <>
      <Helmet>
        <title>{t('videos')} - {t('site_name')}</title>
        <meta name="description" content={t('videos')} />
      </Helmet>

      <div className="container mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold mb-8">{t('video_highlights')}</h1>

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {[...Array(PAGE_SIZE)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-48 bg-muted rounded-lg mb-3" />
                <div className="h-5 bg-muted rounded w-10/12" />
              </div>
            ))}
          </div>
        ) : videos.length === 0 ? (
          <div className="text-center text-muted-foreground py-12">
            {t('no_results')}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {videos.map((video) => {
              const titleKey = titles[currentLang === 'fr' ? 'fr' : 'ar'];
              const title = video[titleKey] as string;
              const reel = effectiveIsReel(video);
              return (
                <VideoViewTracker key={video.id} videoId={video.id}>
                  <Card className="overflow-hidden flex flex-col h-full">
                  <CardContent className="p-0 flex flex-col flex-1">
                    <div className={reel ? 'px-4 pt-4 flex justify-center' : ''}>
                      <ResponsiveVideoPlayer
                        videoUrl={video.video_url}
                        title={title}
                        reel={video}
                        className={reel ? 'rounded-xl' : ''}
                      />
                    </div>
                    <div className="p-4">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <Badge variant="secondary">{t('videos')}</Badge>
                        {reel ? (
                          <Badge variant="outline" className="border-primary/50 text-primary">
                            {t('reel')}
                          </Badge>
                        ) : null}
                      </div>
                      <div className="font-bold text-lg line-clamp-2">{title}</div>
                      <div className="text-sm text-muted-foreground mt-2">
                        {formatRelativeTime(video.created_at, currentLang)}
                      </div>
                    </div>
                  </CardContent>
                </Card>
                </VideoViewTracker>
              );
            })}
            {hasMore ? <div ref={loadMoreRef} className="h-px w-full col-span-full" /> : null}
            {loadingMore ? (
              <div className="col-span-full text-center text-muted-foreground py-4">
                {t('loading') ?? 'Loading...'}
              </div>
            ) : null}
          </div>
        )}
      </div>
    </>
  );
}

