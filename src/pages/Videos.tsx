import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase, Video } from '@/lib/supabase';
import { formatRelativeTime } from '@/lib/helpers';
import { effectiveIsReel } from '@/lib/videoDisplay';
import { ResponsiveVideoPlayer } from '@/components/VideoEmbed';
import { useSupabaseRealtime } from '@/hooks/useSupabaseRealtime';

export default function Videos() {
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language;
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);

  const titles = useMemo(() => {
    return {
      ar: 'title_ar' as const,
      fr: 'title_fr' as const,
    };
  }, []);

  useEffect(() => {
    const fetchVideos = async () => {
      setLoading(true);
      try {
        const { data } = await supabase
          .from('videos')
          .select('*')
          .order('is_reel', { ascending: false })
          .order('created_at', { ascending: false })
          .limit(30);

        if (data) setVideos(data);
      } finally {
        setLoading(false);
      }
    };

    fetchVideos();
  }, [currentLang]);

  useSupabaseRealtime({
    tables: ['videos'],
    channelKey: 'rt:videos',
    onChange: () => {
      (async () => {
        setLoading(true);
        try {
          const { data } = await supabase
            .from('videos')
            .select('*')
            .order('is_reel', { ascending: false })
            .order('created_at', { ascending: false })
            .limit(30);
          if (data) setVideos(data);
        } finally {
          setLoading(false);
        }
      })();
    },
  });

  return (
    <>
      <Helmet>
        <title>{t('videos')} - {t('site_name')}</title>
        <meta name="description" content={t('videos')} />
      </Helmet>

      <div className="container mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold mb-8">{t('video_highlights')}</h1>

        {loading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
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
          <div className="grid md:grid-cols-2 gap-8">
            {videos.map((video) => {
              const titleKey = titles[currentLang === 'fr' ? 'fr' : 'ar'];
              const title = video[titleKey] as string;
              const reel = effectiveIsReel(video);
              return (
                <Card key={video.id} className="overflow-hidden flex flex-col">
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
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}

