import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet-async';
import { Clock, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase, Post, Video } from '@/lib/supabase';
import { formatRelativeTime, truncateText, getImagePath } from '@/lib/helpers';

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

  useEffect(() => {
    fetchTopNews();
    fetchTrending();
    fetchVideos();
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
      .order('created_at', { ascending: false })
      .limit(3);

    const latestRes = await supabase
      .from('posts')
      .select('id, title_ar, title_fr, slug, image_url, content_type, is_breaking, created_at, content_ar, content_fr')
      .eq('status', 'published')
      .order('created_at', { ascending: false })
      .limit(7);

    const featured = featuredRes.data ?? [];
    const latestPosts = latestRes.data ?? [];

    const merged: TopNewsPost[] = [];
    const seen = new Set<string>();

    const pushUnique = (arr: TopNewsPost[]) => {
      for (const p of arr) {
        if (p.content_type === 'video') continue; // slider expects images
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
      .in('content_type', ['news', 'portrait', 'tourism'])
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
      .in('content_type', ['news', 'portrait', 'tourism'])
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

  const loadMore = () => {
    setPage((prev) => prev + 1);
  };

  return (
    <>
      <Helmet>
        <title>{t('site_name')} - {t('home')}</title>
        <meta name="description" content={t('site_name')} />
      </Helmet>

      <div className="container mx-auto px-4 py-8">
        {topNews.length > 0 && (
          <div className="relative mb-10">
            <div className="relative overflow-hidden rounded-xl">
              <Link to={`/${currentLang}/${topNews[slideIndex].slug}`}>
                <motion.div
                  key={topNews[slideIndex].id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.45, ease: 'easeOut' }}
                  className="grid md:grid-cols-2 gap-0 bg-card"
                >
                  <div className="relative aspect-[16/9] md:aspect-auto">
                    <img
                      src={getImagePath(topNews[slideIndex].image_url)}
                      alt={topNews[slideIndex][`title_${currentLang}` as keyof TopNewsPost] as string}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>

                  <CardContent className="p-8 flex flex-col justify-center">
                    <Badge className="w-fit mb-4">
                      {topNews[slideIndex][`title_${currentLang}` as keyof TopNewsPost] as string}
                    </Badge>
                    <h2 className="text-3xl md:text-4xl font-bold mb-4 leading-tight">
                      {topNews[slideIndex][`title_${currentLang}` as keyof TopNewsPost] as string}
                    </h2>
                    <p className="text-muted-foreground text-lg mb-4 line-clamp-2">
                      {truncateText(
                        topNews[slideIndex][`content_${currentLang}` as keyof TopNewsPost] as string,
                        180
                      )}
                    </p>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {formatRelativeTime(topNews[slideIndex].created_at, currentLang)}
                      </div>
                    </div>
                  </CardContent>
                </motion.div>
              </Link>
            </div>

            {topNews.length > 1 && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="absolute top-1/2 -translate-y-1/2 left-3 bg-background/90"
                  onClick={() =>
                    setSlideIndex((prev) => (prev - 1 + topNews.length) % topNews.length)
                  }
                  aria-label="Previous slide"
                >
                  {currentLang === 'ar' ? '→' : '←'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="absolute top-1/2 -translate-y-1/2 right-3 bg-background/90"
                  onClick={() => setSlideIndex((prev) => (prev + 1) % topNews.length)}
                  aria-label="Next slide"
                >
                  {currentLang === 'ar' ? '←' : '→'}
                </Button>

                <div className="flex justify-center gap-2 mt-4">
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
              </>
            )}
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <h2 className="text-3xl font-bold mb-6 flex items-center gap-2">
              {t('latest_news')}
            </h2>

            <div className="grid md:grid-cols-2 gap-6 mb-8">
              {latest.map((post, index) => (
                <motion.div
                  key={post.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
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
                        {post.category && (
                          <Badge variant="secondary" className="mb-2">
                            {post.category[`name_${currentLang}` as keyof typeof post.category] as string}
                          </Badge>
                        )}
                        <h3 className="text-xl font-bold mb-2 line-clamp-2">
                          {post[`title_${currentLang}` as keyof Post] as string}
                        </h3>
                        <p className="text-muted-foreground text-sm mb-3 line-clamp-2">
                          {truncateText(post[`content_${currentLang}` as keyof Post] as string, 100)}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
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

          <div className="space-y-8">
            <div>
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                <TrendingUp className="w-6 h-6" />
                {t('trending')}
              </h2>
              <div className="space-y-4">
                {trending.map((post, index) => (
                  <motion.div
                    key={post.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Link to={`/${currentLang}/${post.slug}`}>
                      <Card className="overflow-hidden hover:shadow-md transition-shadow duration-300">
                        <div className="flex gap-3 p-3">
                          <div className="relative w-24 h-24 flex-shrink-0">
                            <img
                              src={getImagePath(post.image_url)}
                              alt={post[`title_${currentLang}` as keyof Post] as string}
                              className="w-full h-full object-cover rounded"
                              loading="lazy"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-sm mb-1 line-clamp-2">
                              {post[`title_${currentLang}` as keyof Post] as string}
                            </h4>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Clock className="w-3 h-3" />
                              {formatRelativeTime(post.created_at, currentLang)}
                            </div>
                          </div>
                        </div>
                      </Card>
                    </Link>
                  </motion.div>
                ))}
              </div>
            </div>

            {videos.length > 0 && (
              <div>
                <h2 className="text-2xl font-bold mb-6">{t('video_highlights')}</h2>
                <div className="space-y-4">
                  {videos.map((video) => (
                    <motion.div
                      key={video.id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                    >
                      <Link to={`/${currentLang}/videos`}>
                        <Card className="overflow-hidden hover:shadow-md transition-shadow duration-300">
                          <div className="relative aspect-video">
                            <img
                              src={video.thumbnail || 'https://images.pexels.com/photos/3944454/pexels-photo-3944454.jpeg'}
                              alt={video[`title_${currentLang}` as keyof Video] as string}
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                          </div>
                          <CardContent className="p-3">
                            <h4 className="font-bold text-sm line-clamp-2">
                              {video[`title_${currentLang}` as keyof Video] as string}
                            </h4>
                          </CardContent>
                        </Card>
                      </Link>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
