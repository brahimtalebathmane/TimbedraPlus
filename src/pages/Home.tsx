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

export default function Home() {
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language;
  const [hero, setHero] = useState<Post | null>(null);
  const [latest, setLatest] = useState<Post[]>([]);
  const [trending, setTrending] = useState<Post[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    fetchHero();
    fetchTrending();
    fetchVideos();
  }, [currentLang]);

  useEffect(() => {
    fetchLatest();
  }, [page, currentLang]);

  const fetchHero = async () => {
    const { data } = await supabase
      .from('posts')
      .select('*, category:categories(*), author:profiles(*)')
      .eq('status', 'published')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (data) setHero(data);
  };

  const fetchLatest = async () => {
    const from = (page - 1) * 6;
    const to = from + 6;

    const { data } = await supabase
      .from('posts')
      .select('*, category:categories(*), author:profiles(*)')
      .eq('status', 'published')
      .order('created_at', { ascending: false })
      .range(from, to);

    if (data) {
      if (page === 1) {
        setLatest(data.slice(1));
      } else {
        setLatest((prev) => [...prev, ...data]);
      }
      setHasMore(data.length === 7);
    }
  };

  const fetchTrending = async () => {
    const { data } = await supabase
      .from('posts')
      .select('*, category:categories(*)')
      .eq('status', 'published')
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

      <div className="container mx-auto px-4 py-12">
        {hero && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-12"
          >
            <Link to={`/${currentLang}/${hero.slug}`}>
              <Card className="overflow-hidden hover:shadow-xl transition-shadow duration-300">
                <div className="grid md:grid-cols-2 gap-0">
                  <div className="relative aspect-video md:aspect-auto">
                    <img
                      src={getImagePath(hero.image_url)}
                      alt={hero[`title_${currentLang}` as keyof Post] as string}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>
                  <CardContent className="p-8 flex flex-col justify-center">
                    {hero.category && (
                      <Badge className="w-fit mb-4">
                        {hero.category[`name_${currentLang}` as keyof typeof hero.category] as string}
                      </Badge>
                    )}
                    <h1 className="text-4xl font-bold mb-4 leading-tight">
                      {hero[`title_${currentLang}` as keyof Post] as string}
                    </h1>
                    <p className="text-muted-foreground text-lg mb-4">
                      {truncateText(hero[`content_${currentLang}` as keyof Post] as string, 200)}
                    </p>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {formatRelativeTime(hero.created_at, currentLang)}
                      </div>
                      {hero.author && (
                        <span>{hero.author.name}</span>
                      )}
                    </div>
                  </CardContent>
                </div>
              </Card>
            </Link>
          </motion.div>
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
