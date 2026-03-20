import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet-async';
import { Clock, TrendingUp, Music2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  supabase,
  Post,
  Video,
  IMAGE_CONTENT_TYPES,
  Category,
  LEGACY_IMAGE_CONTENT_TYPES,
} from '@/lib/supabase';
import { formatRelativeTime, truncateText, getImagePath, getYouTubeThumbnailUrl } from '@/lib/helpers';

type TopNewsPost = Pick<
  Post,
  | 'id'
  | 'title_ar'
  | 'title_fr'
  | 'content_ar'
  | 'content_fr'
  | 'slug'
  | 'image_url'
  | 'content_type'
  | 'is_breaking'
  | 'created_at'
>;

type HomeSectionKey =
  | 'opinion'
  | 'reports'
  | 'economy'
  | 'sports'
  | 'health'
  | 'culture'
  | 'various'
  | 'infographics';

const HOME_SECTION_RENDER_ORDER: HomeSectionKey[] = [
  'opinion',
  'reports',
  'economy',
  'sports',
  'health',
  'culture',
  'various',
];

const IMAGE_TYPES = [...LEGACY_IMAGE_CONTENT_TYPES, ...IMAGE_CONTENT_TYPES];

type SectionDef = {
  key: HomeSectionKey;
  keywordsAr: string[];
  keywordsFr: string[];
};

const SECTION_DEFS: SectionDef[] = [
  { key: 'opinion', keywordsAr: ['الرأي', 'تحليل / رأي', 'تحليل'], keywordsFr: ['Opinion', 'Analyse', 'Avis'] },
  { key: 'reports', keywordsAr: ['تقارير', 'تقرير'], keywordsFr: ['Rapport', 'Rapports'] },
  { key: 'economy', keywordsAr: ['اقتصاد'], keywordsFr: ['Economie', 'Économie', 'Economy'] },
  { key: 'sports', keywordsAr: ['رياضة'], keywordsFr: ['Sport'] },
  { key: 'health', keywordsAr: ['صحة', 'بيئة', 'بيئية'], keywordsFr: ['Santé', 'Sante', 'Environnement'] },
  { key: 'culture', keywordsAr: ['ثقافة', 'فنون', 'فن'], keywordsFr: ['Culture', 'Arts', 'Art'] },
  { key: 'various', keywordsAr: ['منوعات', 'ترفيه'], keywordsFr: ['Divers', 'Divertissement', 'Loisirs'] },
  { key: 'infographics', keywordsAr: ['انفوج', 'انفو', 'انفوجرافيك', 'انفوغرافيك'], keywordsFr: ['Infographique', 'Infographic', 'Infographies'] },
];

export default function Home() {
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language;
  const [topNews, setTopNews] = useState<TopNewsPost[]>([]);
  const [latest, setLatest] = useState<Post[]>([]);
  const [trending, setTrending] = useState<Post[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [slideIndex, setSlideIndex] = useState(0);
  const [tiktokUrl, setTiktokUrl] = useState<string | null>(null);
  const [sectionCategories, setSectionCategories] = useState<Partial<Record<HomeSectionKey, Category | null>>>({});
  const [sectionPosts, setSectionPosts] = useState<Partial<Record<HomeSectionKey, Post[]>>>({});
  const [sectionsLoading, setSectionsLoading] = useState(false);

  useEffect(() => {
    fetchTopNews();
    fetchTrending();
    fetchVideos();
    fetchTiktokAndSections();
  }, [currentLang]);

  useEffect(() => {
    fetchLatest();
  }, [page, currentLang]);

  useEffect(() => {
    if (topNews.length > 0) setSlideIndex(0);
  }, [topNews.length, currentLang]);

  useEffect(() => {
    if (topNews.length <= 1) return;
    const interval = window.setInterval(() => {
      setSlideIndex((prev) => (prev + 1) % topNews.length);
    }, 5000);
    return () => window.clearInterval(interval);
  }, [topNews.length]);

  const fetchTopNews = async () => {
    const featuredRes = await supabase
      .from('posts')
      .select('id, title_ar, title_fr, slug, image_url, content_type, is_breaking, created_at, content_ar, content_fr')
      .eq('status', 'published')
      .eq('is_breaking', true)
      .in('content_type', IMAGE_TYPES as string[])
      .order('created_at', { ascending: false })
      .limit(5);

    const latestRes = await supabase
      .from('posts')
      .select('id, title_ar, title_fr, slug, image_url, content_type, is_breaking, created_at, content_ar, content_fr')
      .eq('status', 'published')
      .in('content_type', IMAGE_TYPES as string[])
      .order('created_at', { ascending: false })
      .limit(12);

    const featured = featuredRes.data ?? [];
    const latestPosts = latestRes.data ?? [];

    const merged: TopNewsPost[] = [];
    const seen = new Set<string>();

    const pushUnique = (arr: TopNewsPost[]) => {
      for (const p of arr) {
        if (seen.has(p.id)) continue;
        seen.add(p.id);
        merged.push(p);
      }
    };

    pushUnique(featured as TopNewsPost[]);
    pushUnique(latestPosts as TopNewsPost[]);

    setTopNews(merged.slice(0, 5));
  };

  const fetchLatest = async () => {
    const from = (page - 1) * 6;
    const to = from + 6;

    const { data } = await supabase
      .from('posts')
      .select('*, category:categories(*), author:profiles(*)')
      .eq('status', 'published')
      .in('content_type', [...LEGACY_IMAGE_CONTENT_TYPES, ...IMAGE_CONTENT_TYPES] as string[])
      .order('created_at', { ascending: false })
      .range(from, to);

    if (data) {
      const visible = data.slice(0, 6);
      if (page === 1) {
        setLatest(visible);
      } else {
        setLatest((prev) => [...prev, ...visible]);
      }
      setHasMore(data.length > 6);
    }
  };

  const fetchTrending = async () => {
    const { data } = await supabase
      .from('posts')
      .select('*, category:categories(*)')
      .eq('status', 'published')
      .in('content_type', [...LEGACY_IMAGE_CONTENT_TYPES, ...IMAGE_CONTENT_TYPES] as string[])
      .order('created_at', { ascending: false })
      .limit(5);

    if (data) setTrending(data);
  };

  const fetchVideos = async () => {
    const { data } = await supabase
      .from('videos')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(3);

    if (data) setVideos(data);
  };

  const fetchTiktokAndSections = async () => {
    setSectionsLoading(true);
    try {
      const [categoriesRes, contactRes] = await Promise.all([
        supabase.from('categories').select('*').order('created_at', { ascending: true }),
        supabase
          .from('contact_info')
          .select('tiktok')
          .order('updated_at', { ascending: false })
          .limit(1),
      ]);

      const categories = (categoriesRes.data ?? []) as Category[];
      const tiktokRow = contactRes.data?.[0] as { tiktok?: string | null } | undefined;
      setTiktokUrl(tiktokRow?.tiktok ?? null);

      const findBestCategory = (def: SectionDef): Category | null => {
        let best: { cat: Category; score: number } | null = null;
        for (const cat of categories) {
          const arName = (cat.name_ar ?? '').toLowerCase();
          const frName = (cat.name_fr ?? '').toLowerCase();

          let score = 0;
          for (const kw of def.keywordsAr) {
            const k = kw.toLowerCase();
            if (k && arName.includes(k)) score += 5;
          }
          for (const kw of def.keywordsFr) {
            const k = kw.toLowerCase();
            if (k && frName.includes(k)) score += 3;
          }

          if (!best || score > best.score) best = { cat, score };
        }
        if (!best || best.score === 0) return null;
        return best.cat;
      };

      const pickedCats: Partial<Record<HomeSectionKey, Category | null>> = {};
      for (const def of SECTION_DEFS) pickedCats[def.key] = findBestCategory(def);

      const postsPromises: Array<PromiseLike<[HomeSectionKey, Post[]]>> = [];
      for (const def of SECTION_DEFS) {
        const cat = pickedCats[def.key];
        if (!cat) continue;

        postsPromises.push(
          supabase
            .from('posts')
            .select(
              'id, title_ar, title_fr, content_ar, content_fr, slug, image_url, category_id, created_at, content_type, is_breaking',
            )
            .eq('status', 'published')
            .eq('category_id', cat.id)
            .in('content_type', IMAGE_TYPES as string[])
            .order('created_at', { ascending: false })
            .limit(4)
            .then(({ data }) => [def.key, (data as Post[]) ?? []] as [HomeSectionKey, Post[]]),
        );
      }

      const postsEntries = await Promise.all(postsPromises);
      const postsByKey: Partial<Record<HomeSectionKey, Post[]>> = {};
      for (const [key, posts] of postsEntries) postsByKey[key] = posts;

      setSectionCategories(pickedCats);
      setSectionPosts(postsByKey);
    } catch (err) {
      console.error('Failed to load home sections', err);
    } finally {
      setSectionsLoading(false);
    }
  };

  const loadMore = () => {
    setPage((prev) => prev + 1);
  };

  return (() => {
    const isRTL = currentLang === 'ar';

    const reportsCat = sectionCategories.reports;
    const infographicsCat = sectionCategories.infographics;

    const sidebarReportPosts = (sectionPosts.reports ?? trending).slice(0, 6);
    const sidebarInfographics = (sectionPosts.infographics ?? []).slice(0, 4);

    return (
      <>
        <Helmet>
          <title>{t('site_name')} - {t('home')}</title>
          <meta name="description" content={t('site_name')} />
        </Helmet>

        <div className="container mx-auto px-4 py-8">
          {topNews.length > 0 && (
            <section className="mb-10">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-3xl font-bold">{t('breaking_news')}</h2>
              </div>

              <div className="lg:grid lg:grid-cols-3 gap-8 items-start">
                <div className="lg:col-span-2">
                  <Link to={`/${currentLang}/${topNews[slideIndex].slug}`}>
                    <div className="overflow-hidden rounded-xl bg-card shadow-sm hover:shadow-md transition-shadow">
                      <div className="relative">
                        <img
                          src={getImagePath(topNews[slideIndex].image_url)}
                          alt={
                            topNews[slideIndex][`title_${currentLang}` as keyof TopNewsPost] as string
                          }
                          className="w-full h-[260px] md:h-[320px] object-cover"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
                        <div className="absolute left-4 bottom-4 right-4">
                          <Badge className="w-fit mb-3">{t('breaking_news')}</Badge>
                          <h2 className="text-2xl md:text-3xl font-bold leading-tight text-primary-foreground">
                            {topNews[slideIndex][`title_${currentLang}` as keyof TopNewsPost] as string}
                          </h2>
                        </div>
                      </div>

                      <CardContent className="p-6">
                        <p className="text-muted-foreground text-lg line-clamp-2">
                          {truncateText(
                            topNews[slideIndex][`content_${currentLang}` as keyof TopNewsPost] as string,
                            180
                          )}
                        </p>

                        <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
                          <Clock className="w-4 h-4" />
                          {formatRelativeTime(topNews[slideIndex].created_at, currentLang)}
                        </div>
                      </CardContent>
                    </div>
                  </Link>
                </div>

                <div className="lg:col-span-1">
                  <div className="space-y-3">
                    {topNews
                      .map((post, i) => ({ post, i }))
                      .filter(({ i }) => i !== slideIndex)
                      .slice(0, 4)
                      .map(({ post, i }) => (
                        <button
                          key={post.id}
                          type="button"
                          onClick={() => setSlideIndex(i)}
                          className="w-full text-left group hover:bg-muted/30 rounded-lg p-2 transition-colors"
                          aria-label={`Go to slide ${i + 1}`}
                        >
                          <div className={`flex gap-3 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
                            <div className="relative w-20 h-14 rounded-md overflow-hidden flex-shrink-0">
                              <img
                                src={getImagePath(post.image_url)}
                                alt={post[`title_${currentLang}` as keyof TopNewsPost] as string}
                                className="w-full h-full object-cover"
                                loading="lazy"
                              />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="font-bold text-sm line-clamp-2">
                                {post[`title_${currentLang}` as keyof TopNewsPost] as string}
                              </div>
                              <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                                <Clock className="w-3 h-3" />
                                {formatRelativeTime(post.created_at, currentLang)}
                              </div>
                            </div>
                          </div>
                        </button>
                      ))}
                  </div>

                  {topNews.length > 1 && (
                    <div className="mt-4">
                      <div className="flex items-center justify-between">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="bg-background/90"
                          onClick={() =>
                            setSlideIndex((prev) => (prev - 1 + topNews.length) % topNews.length)
                          }
                          aria-label="Previous slide"
                        >
                          {currentLang === 'ar' ? '→' : '←'}
                        </Button>

                        <div className="flex items-center gap-2">
                          {topNews.map((_, i) => (
                            <button
                              key={i}
                              type="button"
                              onClick={() => setSlideIndex(i)}
                              className={`h-2 w-2 rounded-full transition-colors ${
                                i === slideIndex ? 'bg-primary' : 'bg-muted-foreground/30'
                              }`}
                              aria-label={`Go to slide ${i + 1}`}
                            />
                          ))}
                        </div>

                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="bg-background/90"
                          onClick={() => setSlideIndex((prev) => (prev + 1) % topNews.length)}
                          aria-label="Next slide"
                        >
                          {currentLang === 'ar' ? '←' : '→'}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-8">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-2xl font-bold">{t('more_news')}</h3>
                </div>

                <div className="grid sm:grid-cols-2 gap-3">
                  {latest.slice(0, 8).map((post) => (
                    <Link
                      key={post.id}
                      to={`/${currentLang}/${post.slug}`}
                      className={`flex items-start gap-3 hover:text-primary transition-colors ${
                        isRTL ? 'flex-row-reverse' : 'flex-row'
                      }`}
                    >
                      <span className="text-primary font-bold pt-1">{'•'}</span>
                      <div className="min-w-0">
                        <div className="font-bold text-sm line-clamp-2">
                          {post[`title_${currentLang}` as keyof Post] as string}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </section>
          )}

          <div className="lg:grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <h2 className="text-3xl font-bold mb-6 flex items-center gap-2">
                <TrendingUp className="w-6 h-6" />
                {t('latest_news')}
              </h2>

              <div className="grid md:grid-cols-2 gap-6 mb-8">
                {latest.map((post, index) => (
                  <motion.div
                    key={post.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.04 }}
                  >
                    <Link to={`/${currentLang}/${post.slug}`}>
                      <Card className="overflow-hidden hover:shadow-lg hover:scale-105 transition-all duration-300">
                        <div className="relative aspect-video">
                          <img
                            src={getImagePath(post.image_url)}
                            alt={post[`title_${currentLang}` as keyof Post] as string}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        </div>
                        <CardContent className="p-4">
                          <h3 className="text-xl font-bold mb-2 line-clamp-2 text-center">
                            {post[`title_${currentLang}` as keyof Post] as string}
                          </h3>
                          <p className="text-muted-foreground text-sm line-clamp-2">
                            {truncateText(post[`content_${currentLang}` as keyof Post] as string, 110)}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground justify-center mt-3">
                            <Clock className="w-3 h-3" />
                            {formatRelativeTime(post.created_at, currentLang)}
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  </motion.div>
                ))}
              </div>

              {hasMore && (
                <div className="text-center">
                  <Button onClick={loadMore} variant="outline" size="lg">
                    {t('load_more')}
                  </Button>
                </div>
              )}
            </div>

            <aside className="space-y-8">
              {videos.length > 0 && (
                <section>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-2xl font-bold">{t('exclusive_meetings')}</h2>
                    <Link to={`/${currentLang}/videos`} className="text-primary hover:underline text-sm">
                      {t('exclusive_videos_all')}
                    </Link>
                  </div>

                  <div className="space-y-4">
                    {videos.map((video) => (
                      <Link key={video.id} to={`/${currentLang}/videos`} className="block">
                        <div
                          className={`flex gap-3 ${
                            isRTL ? 'flex-row-reverse' : 'flex-row'
                          } items-start hover:bg-muted/30 rounded-lg p-2 transition-colors`}
                        >
                          <div className="relative w-20 h-14 rounded-md overflow-hidden flex-shrink-0">
                                {(() => {
                                  const fallback = 'https://images.pexels.com/photos/3944454/pexels-photo-3944454.jpeg';
                                  const thumb = getYouTubeThumbnailUrl(video.video_url) || video.thumbnail || fallback;
                                  return (
                                    <img
                                      src={thumb}
                                      alt={video[`title_${currentLang}` as keyof Video] as string}
                                      className="w-full h-full object-cover"
                                      loading="lazy"
                                    />
                                  );
                                })()}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="font-bold text-sm line-clamp-2">
                              {video[`title_${currentLang}` as keyof Video] as string}
                            </div>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                              <Clock className="w-3 h-3" />
                              {formatRelativeTime(video.created_at, currentLang)}
                            </div>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </section>
              )}

              <section>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-bold">
                    {reportsCat ? (reportsCat[`name_${currentLang}` as keyof Category] as string) : t('latest_reports')}
                  </h2>
                  {reportsCat ? (
                    <Link to={`/${currentLang}/category/${reportsCat.slug}`} className="text-primary hover:underline text-sm">
                      {t('more')}
                    </Link>
                  ) : null}
                </div>

                <div className="space-y-4">
                  {sidebarReportPosts.length > 0 ? (
                    sidebarReportPosts.slice(0, 5).map((post) => (
                      <Link key={post.id} to={`/${currentLang}/${post.slug}`}>
                        <div
                          className={`flex gap-3 ${
                            isRTL ? 'flex-row-reverse' : 'flex-row'
                          } items-start hover:bg-muted/30 rounded-lg p-2 transition-colors`}
                        >
                          <div className="relative w-20 h-14 rounded-md overflow-hidden flex-shrink-0">
                            <img
                              src={getImagePath(post.image_url)}
                              alt={post[`title_${currentLang}` as keyof Post] as string}
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="font-bold text-sm line-clamp-2">
                              {post[`title_${currentLang}` as keyof Post] as string}
                            </div>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                              <Clock className="w-3 h-3" />
                              {formatRelativeTime(post.created_at, currentLang)}
                            </div>
                          </div>
                        </div>
                      </Link>
                    ))
                  ) : (
                    <div className="text-sm text-muted-foreground">{t('no_results')}</div>
                  )}
                </div>
              </section>

              <section>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-bold">{t('infographics')}</h2>
                  {infographicsCat ? (
                    <Link to={`/${currentLang}/category/${infographicsCat.slug}`} className="text-primary hover:underline text-sm">
                      {t('more')}
                    </Link>
                  ) : null}
                </div>

                {sectionsLoading ? (
                  <div className="h-24 animate-pulse rounded-lg bg-muted" />
                ) : sidebarInfographics.length > 0 ? (
                  <div className="grid sm:grid-cols-2 gap-4">
                    {sidebarInfographics.slice(0, 4).map((post) => (
                      <Link key={post.id} to={`/${currentLang}/${post.slug}`}>
                        <div className="rounded-lg overflow-hidden hover:shadow-md transition-shadow bg-card">
                          <div className="relative aspect-[4/3]">
                            <img
                              src={getImagePath(post.image_url)}
                              alt={post[`title_${currentLang}` as keyof Post] as string}
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                          </div>
                          <div className="p-3">
                            <div className="font-bold text-sm line-clamp-2">
                              {post[`title_${currentLang}` as keyof Post] as string}
                            </div>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">{t('no_results')}</div>
                )}
              </section>

              {tiktokUrl && (
                <section className="rounded-xl border p-4 bg-card/50">
                  <div className="flex items-center gap-3 mb-3">
                    <Music2 className="w-5 h-5 text-primary" />
                    <h2 className="text-2xl font-bold">{t('follow_tiktok')}</h2>
                  </div>

                  <a
                    href={tiktokUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center w-full rounded-lg bg-primary px-4 py-3 text-primary-foreground font-semibold hover:opacity-90 transition-opacity"
                  >
                    {t('follow_now')}
                  </a>
                </section>
              )}

              <section className="pt-6 border-t">
                <div className="text-2xl font-bold mb-4">{t('categories')}</div>
                <div className="space-y-3">
                  {HOME_SECTION_RENDER_ORDER.map((key) => {
                    const cat = sectionCategories[key];
                    if (!cat) return null;
                    const label = cat[`name_${currentLang}` as keyof Category] as string;

                    return (
                      <div key={key} className="flex items-center justify-between gap-3">
                        <Link
                          to={`/${currentLang}/category/${cat.slug}`}
                          className="font-bold hover:text-primary transition-colors"
                        >
                          {label}
                        </Link>
                        <Link
                          to={`/${currentLang}/category/${cat.slug}`}
                          className="text-primary hover:underline text-sm"
                        >
                          {t('more')}
                        </Link>
                      </div>
                    );
                  })}
                </div>
              </section>
            </aside>
          </div>

          <div className="space-y-14 mt-14">
            {HOME_SECTION_RENDER_ORDER.map((key) => {
              const cat = sectionCategories[key];
              const posts = sectionPosts[key] ?? [];
              if (!cat || posts.length === 0) return null;

              const label = cat[`name_${currentLang}` as keyof Category] as string;

              return (
                <section key={key}>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-2xl md:text-3xl font-bold">{label}</h2>
                    <Link
                      to={`/${currentLang}/category/${cat.slug}`}
                      className="text-primary hover:underline"
                    >
                      {t('more')}
                    </Link>
                  </div>

                  <div className="grid md:grid-cols-3 gap-6">
                    {posts.slice(0, 6).map((post) => (
                      <Link key={post.id} to={`/${currentLang}/${post.slug}`}>
                        <div className="rounded-xl overflow-hidden hover:shadow-md transition-shadow bg-card">
                          <div className="relative aspect-video">
                            <img
                              src={getImagePath(post.image_url)}
                              alt={post[`title_${currentLang}` as keyof Post] as string}
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                          </div>
                          <div className="p-4">
                            <div className="font-bold text-base line-clamp-2">
                              {post[`title_${currentLang}` as keyof Post] as string}
                            </div>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        </div>
      </>
    );
  })();
}
