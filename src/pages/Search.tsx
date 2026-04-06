import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { Clock, Search as SearchIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { CategoryIcon } from '@/components/CategoryIcon';
import { supabase, Post } from '@/lib/supabase';
import { formatRelativeTime, truncateText, getPostThumbnailUrl } from '@/lib/helpers';
import { effectiveIsReel, sortPostsReelsFirst } from '@/lib/videoDisplay';
import { cn } from '@/lib/utils';
import { currentPageUrl, recordVisit } from '@/lib/analytics';

export default function Search() {
  const [searchParams] = useSearchParams();
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language;
  const isRTL = currentLang === 'ar';
  const query = searchParams.get('q') || '';
  const [results, setResults] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (query) {
      performSearch();
    }
  }, [query, currentLang]);

  useEffect(() => {
    void recordVisit({ page_url: currentPageUrl(), content_type: 'page' }, ['page', 'search', currentLang, query]);
  }, [currentLang, query]);

  const performSearch = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('posts')
        .select('*, category:categories(*), author:profiles(*)')
        .eq('status', 'published')
        .ilike('search_vector', `%${query}%`)
        .order('is_reel', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(20);

      if (data) setResults(sortPostsReelsFirst(data));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>{t('search_results')}: {query} - {t('site_name')}</title>
        <meta name="description" content={`${t('search_results')} ${query}`} />
      </Helmet>

      <div className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto mb-12">
          <h1 className="text-3xl font-bold mb-6 flex items-center gap-3">
            <SearchIcon className="w-8 h-8" />
            {t('search_results')}
          </h1>
          <div className="relative">
            <Input
              type="search"
              placeholder={t('search')}
              defaultValue={query}
              className="text-lg"
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  const newQuery = (e.target as HTMLInputElement).value;
                  window.location.href = `/${currentLang}/search?q=${encodeURIComponent(newQuery)}`;
                }
              }}
            />
          </div>
          {query && (
            <p className="mt-4 text-muted-foreground">
              {results.length} {t('search_results')} "{query}"
            </p>
          )}
        </div>

        {loading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-48 bg-muted rounded-lg mb-3"></div>
                <div className="h-6 bg-muted rounded mb-2"></div>
                <div className="h-4 bg-muted rounded"></div>
              </div>
            ))}
          </div>
        ) : results.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {results.map((post, index) => (
              <motion.div
                key={post.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Link to={`/${currentLang}/${post.slug}`}>
                  <Card className="overflow-hidden hover:shadow-lg hover:scale-105 transition-all duration-300">
                    {(() => {
                      const url = getPostThumbnailUrl({
                        content_type: post.content_type,
                        image_url: post.image_url,
                        video_url: post.video_url,
                        video_thumbnail: post.video_thumbnail,
                      });
                      if (!url) return null;

                      return (
                        <div
                          className={cn(
                            'relative overflow-hidden',
                            effectiveIsReel(post)
                              ? 'aspect-[9/16] max-h-[min(420px,55vh)]'
                              : 'aspect-video'
                          )}
                        >
                          <img
                            src={url}
                            alt={post[`title_${currentLang}` as keyof Post] as string}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        </div>
                      );
                    })()}
                    <CardContent className="p-4">
                      {post.category && (
                        <Badge
                          variant="secondary"
                          className={`mb-2 flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}
                        >
                          <CategoryIcon category={post.category} boxSize={18} iconSize={11} />
                          <span>{post.category[`name_${currentLang}` as keyof typeof post.category] as string}</span>
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
        ) : query ? (
          <div className="text-center py-12">
            <p className="text-xl text-muted-foreground">{t('no_results')}</p>
          </div>
        ) : null}
      </div>
    </>
  );
}
