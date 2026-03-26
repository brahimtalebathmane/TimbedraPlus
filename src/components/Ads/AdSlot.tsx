import { useEffect, useMemo, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { supabase, type Ad, type AdPlacement } from '@/lib/supabase';
import { canPlayVideoUrl } from '@/lib/videoDisplay';
import { VideoEmbed } from '@/components/VideoEmbed';
import { useSupabaseRealtime } from '@/hooks/useSupabaseRealtime';

const PLACEMENT_ASPECT: Partial<Record<AdPlacement, string>> = {
  header_banner: 'aspect-[16/9]',
  sidebar: 'aspect-[4/3]',
  between_articles: 'aspect-[16/9]',
  article: 'aspect-[16/9]',
};

export default function AdSlot({
  placement,
  className,
}: {
  placement: AdPlacement;
  className?: string;
}) {
  const [ad, setAd] = useState<Ad | null>(null);
  const [loading, setLoading] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const load = async () => {
    if (!mountedRef.current) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('ads')
        .select('id,title,media_url,link,placement,status,image_url,video_url,created_at')
        .eq('placement', placement)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      if (mountedRef.current) setAd((data ?? null) as Ad | null);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  };

  useEffect(() => {
    load().catch(() => {
      // Fail silently in UI; ads are optional.
    });
  }, [placement]);

  useSupabaseRealtime({
    tables: ['ads'],
    channelKey: `rt:ads:${placement}`,
    onChange: () => {
      load().catch(() => {
        // Fail silently in UI; ads are optional.
      });
    },
  });

  const mediaUrl = useMemo(() => {
    return ad?.media_url ?? ad?.video_url ?? ad?.image_url ?? null;
  }, [ad]);

  const isVideo = mediaUrl ? canPlayVideoUrl(mediaUrl) : false;

  const aspectClass = PLACEMENT_ASPECT[placement] ?? 'aspect-[16/9]';
  const maxHeight =
    placement === 'sidebar'
      ? 'max-h-[210px] md:max-h-[240px]'
      : placement === 'header_banner'
        ? 'max-h-[260px] md:max-h-[320px]'
        : placement === 'between_articles'
          ? 'max-h-[220px] md:max-h-[260px]'
          : 'max-h-[280px] md:max-h-[320px]';

  if (loading || !ad || !mediaUrl) return null;

  const rootClassName = cn(
    'w-full overflow-hidden rounded-lg border bg-card shadow-sm hover:shadow-md transition-shadow',
    aspectClass,
    maxHeight,
    className,
  );

  const title = ad.title ?? 'Advertisement';
  const inner = isVideo ? (
    <div className="w-full h-full bg-black">
      <VideoEmbed videoUrl={mediaUrl} title={title} className="w-full h-full" />
    </div>
  ) : (
    <img src={mediaUrl} alt={title} className="w-full h-full object-cover" loading="lazy" />
  );

  if (ad.link) {
    return (
      <a
        href={ad.link}
        target="_blank"
        rel="noreferrer"
        className={rootClassName}
        aria-label={title}
      >
        {inner}
      </a>
    );
  }

  return <div className={rootClassName}>{inner}</div>;
}

