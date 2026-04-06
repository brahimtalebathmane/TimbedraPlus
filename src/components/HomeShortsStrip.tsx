import { useCallback, useEffect, useState } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import { useTranslation } from 'react-i18next';
import { Play, X } from 'lucide-react';
import { Video } from '@/lib/supabase';
import { getYouTubeThumbnailUrl } from '@/lib/helpers';
import { canPlayVideoUrl } from '@/lib/videoDisplay';
import { VideoEmbed } from '@/components/VideoEmbed';
import { cn } from '@/lib/utils';

type HomeShortsStripProps = {
  videos: Video[];
  currentLang: string;
  isRTL: boolean;
};

function HomeShortsStripCarousel({ videos, currentLang, isRTL }: HomeShortsStripProps) {
  const { t } = useTranslation();
  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: 'start',
    containScroll: 'trimSnaps',
    direction: isRTL ? 'rtl' : 'ltr',
    dragFree: false,
    duration: 22,
  });
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setCanPrev(emblaApi.canScrollPrev());
    setCanNext(emblaApi.canScrollNext());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on('reInit', onSelect);
    emblaApi.on('select', onSelect);
    return () => {
      emblaApi.off('reInit', onSelect);
      emblaApi.off('select', onSelect);
    };
  }, [emblaApi, onSelect]);

  useEffect(() => {
    emblaApi?.reInit();
  }, [emblaApi, videos]);

  const scrollPrev = useCallback(() => {
    emblaApi?.scrollPrev();
  }, [emblaApi]);

  const scrollNext = useCallback(() => {
    emblaApi?.scrollNext();
  }, [emblaApi]);

  const playable = videos.filter((v) => v.video_url && canPlayVideoUrl(v.video_url));
  if (playable.length === 0) return null;

  return (
    <div className="relative mb-10">
      <div className="overflow-hidden rounded-xl" ref={emblaRef}>
        <div className="flex touch-pan-x gap-3 sm:gap-4">
          {playable.map((video) => {
            const title = video[`title_${currentLang}` as keyof Video] as string;
            const thumb =
              getYouTubeThumbnailUrl(video.video_url) ||
              (video.thumbnail && /^https?:\/\//i.test(video.thumbnail) ? video.thumbnail : null) ||
              'https://images.pexels.com/photos/3944454/pexels-photo-3944454.jpeg';
            const isPlaying = playingId === video.id;

            return (
              <div
                key={video.id}
                className="min-w-0 shrink-0 grow-0"
                style={{
                  flexBasis: 'clamp(8.5rem, 38vw, 12.5rem)',
                }}
              >
                <div className="relative aspect-[9/16] w-full overflow-hidden rounded-xl bg-muted shadow-sm ring-1 ring-border/60">
                  {isPlaying ? (
                    <div className="absolute inset-0 bg-black">
                      <VideoEmbed videoUrl={video.video_url} title={title} className="h-full w-full" />
                      <button
                        type="button"
                        className={cn(
                          'absolute top-2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm transition-colors hover:bg-black/65',
                          isRTL ? 'left-2' : 'right-2'
                        )}
                        onClick={() => setPlayingId(null)}
                        aria-label={t('close')}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <img
                        src={thumb}
                        alt={title}
                        className="h-full w-full object-cover"
                        loading="lazy"
                        decoding="async"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
                      <button
                        type="button"
                        className="absolute inset-0 flex items-center justify-center"
                        onClick={() => setPlayingId(video.id)}
                        aria-label={title}
                      >
                        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-black/45 text-white shadow-lg backdrop-blur-sm transition-transform hover:scale-105">
                          <Play className="h-6 w-6 fill-current" aria-hidden />
                        </span>
                      </button>
                    </>
                  )}
                </div>
                <p className="mt-2 line-clamp-2 text-center text-xs font-semibold leading-snug text-foreground sm:text-sm">
                  {title}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {playable.length > 1 && (
        <>
          <button
            type="button"
            onClick={scrollPrev}
            disabled={!canPrev}
            className={cn(
              'absolute top-[42%] z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-xl text-white shadow-sm backdrop-blur-sm transition-colors',
              'hover:bg-black/55 active:bg-black/65 disabled:pointer-events-none disabled:opacity-30',
              isRTL ? 'right-1 sm:right-0' : 'left-1 sm:left-0'
            )}
            aria-label={t('previous')}
          >
            {isRTL ? '→' : '←'}
          </button>
          <button
            type="button"
            onClick={scrollNext}
            disabled={!canNext}
            className={cn(
              'absolute top-[42%] z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-xl text-white shadow-sm backdrop-blur-sm transition-colors',
              'hover:bg-black/55 active:bg-black/65 disabled:pointer-events-none disabled:opacity-30',
              isRTL ? 'left-1 sm:left-0' : 'right-1 sm:right-0'
            )}
            aria-label={t('next')}
          >
            {isRTL ? '←' : '→'}
          </button>
        </>
      )}
    </div>
  );
}

/** Homepage-only inline reel strip: `is_reel === true` videos only; no section heading. */
export function HomeShortsStrip(props: HomeShortsStripProps) {
  return <HomeShortsStripCarousel key={props.isRTL ? 'rtl' : 'ltr'} {...props} />;
}
