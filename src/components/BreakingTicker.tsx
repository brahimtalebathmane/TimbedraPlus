import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase, Category, Post, TickerSettings, TickerSource } from '@/lib/supabase';
import { truncateText } from '@/lib/helpers';
import { cn } from '@/lib/utils';
import { useSupabaseRealtime } from '@/hooks/useSupabaseRealtime';

type TickerPost = Pick<Post, 'id' | 'slug' | 'title_ar' | 'title_fr' | 'created_at'>;

const DEFAULT_SETTINGS: Omit<TickerSettings, 'id' | 'created_at' | 'updated_at'> = {
  enabled: true,
  source: 'breaking',
  category_id: null,
  item_limit: 10,
  speed_seconds: 28,
  autoplay: true,
  show_arrows: false,
};

function safeNum(input: unknown, fallback: number): number {
  const n = typeof input === 'number' ? input : Number(input);
  return Number.isFinite(n) ? n : fallback;
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export default function BreakingTicker({
  onEnabledChange,
  heightPx = 36,
  className,
}: {
  onEnabledChange?: (enabled: boolean) => void;
  heightPx?: number;
  className?: string;
}) {
  const { i18n, t } = useTranslation();
  const currentLang = i18n.language;
  const isRTL = currentLang === 'ar';

  const [settings, setSettings] = useState<TickerSettings | null>(null);
  const [posts, setPosts] = useState<TickerPost[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const loadSettings = async () => {
    if (!mountedRef.current) return;
    setLoading(true);
    try {
      const [{ data: settingsRows }, { data: cats }] = await Promise.all([
        supabase
          .from('ticker_settings')
          .select('*')
          .order('updated_at', { ascending: false })
          .limit(1),
        supabase.from('categories').select('*').order('created_at', { ascending: true }),
      ]);

      const row = (settingsRows?.[0] as TickerSettings | undefined) ?? null;
      if (!mountedRef.current) return;
      setSettings(row);
      setCategories((cats as Category[]) ?? []);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings().catch(() => {
      // Ticker should fail closed (render nothing) if it can't load.
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const effective = useMemo(() => {
    const s = settings;
    if (!s) return { ...DEFAULT_SETTINGS, enabled: true };

    const src: TickerSource =
      s.source === 'latest' || s.source === 'breaking' || s.source === 'category' ? s.source : 'breaking';

    return {
      enabled: Boolean(s.enabled),
      source: src,
      category_id: s.category_id ?? null,
      item_limit: clamp(safeNum(s.item_limit, DEFAULT_SETTINGS.item_limit), 1, 20),
      speed_seconds: clamp(safeNum(s.speed_seconds, DEFAULT_SETTINGS.speed_seconds), 10, 120),
      autoplay: Boolean(s.autoplay),
      show_arrows: Boolean(s.show_arrows),
    };
  }, [settings]);

  useEffect(() => {
    onEnabledChange?.(effective.enabled);
  }, [effective.enabled, onEnabledChange]);

  const loadPosts = async () => {
    if (!mountedRef.current) return;
    if (!effective.enabled) {
      setPosts([]);
      return;
    }

    const q = supabase
      .from('posts')
      .select('id, slug, title_ar, title_fr, created_at')
      .eq('status', 'published')
      .order('created_at', { ascending: false })
      .limit(effective.item_limit);

    if (effective.source === 'breaking') q.eq('is_breaking', true);
    if (effective.source === 'category' && effective.category_id) q.eq('category_id', effective.category_id);

    const { data } = await q;
    if (!mountedRef.current) return;
    setPosts(((data ?? []) as TickerPost[]).filter((p) => Boolean(p.slug)));
  };

  useEffect(() => {
    loadPosts().catch(() => {
      // Fail silently; ticker will just show no items.
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effective.enabled, effective.source, effective.category_id, effective.item_limit]);

  useSupabaseRealtime({
    tables: ['ticker_settings', 'categories'],
    channelKey: 'rt:ticker_settings',
    onChange: () => {
      loadSettings();
    },
  });

  useSupabaseRealtime({
    tables: ['posts'],
    channelKey: 'rt:ticker_posts',
    onChange: () => {
      loadPosts();
    },
  });

  const categoryLabel = useMemo(() => {
    if (effective.source !== 'category' || !effective.category_id) return null;
    const cat = categories.find((c) => c.id === effective.category_id);
    if (!cat) return null;
    return (cat[`name_${currentLang}` as keyof Category] as string) || null;
  }, [categories, currentLang, effective.category_id, effective.source]);

  const items = useMemo(() => {
    const maxLen = 95;
    return posts
      .map((p) => {
        const raw = (p[`title_${currentLang}` as keyof TickerPost] as string) ?? '';
        const title = truncateText(raw, maxLen).replace(/\s+/g, ' ').trim();
        return { id: p.id, slug: p.slug, title };
      })
      .filter((x) => x.title.length > 0);
  }, [posts, currentLang]);

  const canAnimate = effective.autoplay && items.length > 0;

  const scrollBy = (dir: -1 | 1) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * 220 * (isRTL ? -1 : 1), behavior: 'smooth' });
  };

  if (!effective.enabled) return null;

  return (
    <div
      className={cn('sticky top-0 z-[60] w-full bg-primary text-primary-foreground', className)}
      style={{
        height: `${heightPx}px`,
      }}
      role="region"
      aria-label={t('breaking_news')}
    >
      <style>
        {`
          @keyframes ticker-marquee {
            0% { transform: translateX(0); }
            100% { transform: translateX(-50%); }
          }
        `}
      </style>

      <div className="h-full mx-auto px-3 sm:px-4 flex items-center gap-2">
        <div
          className={cn(
            'shrink-0 font-extrabold text-[12px] sm:text-[13px] tracking-wide whitespace-nowrap select-none',
            isRTL ? 'pl-2' : 'pr-2'
          )}
        >
          {t('breaking_news')}
          {categoryLabel ? `: ${categoryLabel}` : ''}
        </div>

        <div className="relative flex-1 min-w-0 h-full overflow-hidden">
          <div
            ref={scrollRef}
            className={cn(
              'h-full w-full overflow-x-auto overflow-y-hidden scrollbar-none',
              canAnimate ? 'overflow-x-hidden' : ''
            )}
            style={{ WebkitOverflowScrolling: 'touch' }}
          >
            <div
              className={cn(
                'h-full flex items-center gap-10 whitespace-nowrap will-change-transform',
                canAnimate ? 'ticker-animate' : ''
              )}
              style={
                canAnimate
                  ? ({
                      width: 'max-content',
                      animation: `ticker-marquee ${effective.speed_seconds}s linear infinite`,
                      animationPlayState: 'running',
                    } as React.CSSProperties)
                  : undefined
              }
              onMouseEnter={(e) => {
                if (!canAnimate) return;
                (e.currentTarget as HTMLElement).style.animationPlayState = 'paused';
              }}
              onMouseLeave={(e) => {
                if (!canAnimate) return;
                (e.currentTarget as HTMLElement).style.animationPlayState = 'running';
              }}
            >
              {/* Duplicate the list to make a seamless loop */}
              {[...items, ...items].map((it, idx) => (
                <Link
                  key={`${it.id}-${idx}`}
                  to={`/${currentLang}/${it.slug}`}
                  className="text-white/95 hover:text-white transition-colors text-[12px] sm:text-[13px] font-semibold"
                  title={it.title}
                >
                  <span className="inline-flex items-center gap-3">
                    <span className="opacity-90">{'•'}</span>
                    <span className="max-w-[75vw] sm:max-w-[60vw] md:max-w-[55vw] inline-block truncate align-middle">
                      {it.title}
                    </span>
                  </span>
                </Link>
              ))}

              {loading && items.length === 0 ? (
                <div className="text-white/80 text-[12px] sm:text-[13px] font-semibold">
                  {t('loading')}
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {(effective.show_arrows || !effective.autoplay) && (
          <div className={cn('shrink-0 flex items-center gap-1', isRTL ? 'flex-row-reverse' : 'flex-row')}>
            <button
              type="button"
              onClick={() => scrollBy(-1)}
              className="h-7 w-7 rounded-md hover:bg-white/15 active:bg-white/20 transition-colors inline-flex items-center justify-center"
              aria-label="Previous"
            >
              {isRTL ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </button>
            <button
              type="button"
              onClick={() => scrollBy(1)}
              className="h-7 w-7 rounded-md hover:bg-white/15 active:bg-white/20 transition-colors inline-flex items-center justify-center"
              aria-label="Next"
            >
              {isRTL ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

