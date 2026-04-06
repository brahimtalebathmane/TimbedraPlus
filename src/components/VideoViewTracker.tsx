import { useEffect, useRef, type ReactNode } from 'react';
import { recordVisit, currentPageUrl } from '@/lib/analytics';

type Props = {
  videoId: string;
  children: ReactNode;
};

/**
 * Fires one analytics visit when the block becomes sufficiently visible (deduped globally per video).
 */
export function VideoViewTracker({ videoId, children }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const fired = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry?.isIntersecting || fired.current) return;
        fired.current = true;
        void recordVisit(
          {
            page_url: currentPageUrl(),
            content_type: 'video',
            video_id: videoId,
          },
          ['video', videoId],
        );
      },
      { root: null, rootMargin: '0px', threshold: 0.45 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [videoId]);

  return (
    <div ref={ref} className="h-full">
      {children}
    </div>
  );
}
