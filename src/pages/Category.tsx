import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import { Card, CardContent } from '@/components/ui/card';
import { Clock } from 'lucide-react';
import { CategoryIcon } from '@/components/CategoryIcon';
import {
  supabase,
  Category as CategoryType,
  Post,
  IMAGE_CONTENT_TYPES,
  LEGACY_IMAGE_CONTENT_TYPES,
  VIDEO_CONTENT_TYPE,
  LEGACY_VIDEO_CONTENT_TYPE,
} from '@/lib/supabase';
import { getPostThumbnailPath, formatRelativeTime, truncateText } from '@/lib/helpers';
import { effectiveIsReel, sortPostsReelsFirst } from '@/lib/videoDisplay';
import { cn } from '@/lib/utils';

export default function Category() {
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language;
  const isRTL = currentLang === 'ar';
  const { slug } = useParams<{ slug: string }>();

  const [category, setCategory] = useState<CategoryType | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCategory = async () => {
      if (!slug) return;
      setLoading(true);

      try {
        const { data: cat } = await supabase
          .from('categories')
          .select('*')
          .eq('slug', slug)
          .maybeSingle();

        if (cat) setCategory(cat);

        const { data } = await supabase
          .from('posts')
          .select('*, category:categories(*), author:profiles(*)')
          .eq('status', 'published')
          .eq('category_id', cat?.id || '')
          .in('content_type', [...LEGACY_IMAGE_CONTENT_TYPES, ...IMAGE_CONTENT_TYPES, VIDEO_CONTENT_TYPE, LEGACY_VIDEO_CONTENT_TYPE] as string[])
          .order('is_reel', { ascending: false })
          .order('created_at', { ascending: false })
          .limit(24);

        if (data) setPosts(sortPostsReelsFirst(data));
      } finally {
        setLoading(false);
      }
    };

    fetchCategory();
  }, [slug, currentLang]);

  const categoryTitle = category ? (category[`name_${currentLang}` as keyof CategoryType] as string) : null;

  const featuredPost = posts[0] ?? null;
  const remainingPosts = posts.slice(1);

  return (
    <>
      <Helmet>
        <title>{categoryTitle ? `${categoryTitle} - ${t('site_name')}` : t('categories')}</title>
        <meta name="description" content={categoryTitle || t('categories')} />
      </Helmet>

      <div className="container mx-auto px-4 py-12">
        <h1
          className={`text-3xl font-bold mb-8 text-center flex items-center justify-center gap-2 ${
            isRTL ? 'flex-row-reverse' : 'flex-row'
          }`}
        >
          {category ? <CategoryIcon category={category} boxSize={22} iconSize={12} /> : null}
          {categoryTitle || t('categories')}
        </h1>

        {loading ? (
          <div className="grid md:grid-cols-2 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-48 bg-muted rounded-lg mb-3" />
                <div className="h-5 bg-muted rounded w-10/12" />
              </div>
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center text-muted-foreground py-12">
            {t('no_results')}
          </div>
        ) : (
          <>
            {featuredPost && (
              <div className="mb-10">
                <div className="relative overflow-hidden rounded-xl">
                  <div
                    className={cn(
                      'relative w-full overflow-hidden',
                      effectiveIsReel(featuredPost)
                        ? 'aspect-[9/16] max-h-[min(85vh,720px)] max-w-lg mx-auto'
                        : 'h-72 md:h-96'
                    )}
                  >
                    <img
                      src={getPostThumbnailPath({
                        content_type: featuredPost.content_type,
                        image_url: featuredPost.image_url,
                        video_url: featuredPost.video_url,
                        video_thumbnail: featuredPost.video_thumbnail,
                      })}
                      alt={featuredPost[`title_${currentLang}` as keyof Post] as string}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>

                  {categoryTitle && (
                    <div className="absolute top-4 right-4 md:top-6 md:right-6">
                      <span className="bg-primary text-primary-foreground px-4 py-1.5 rounded-full text-sm font-bold shadow inline-flex items-center gap-2">
                        {category ? (
                          <CategoryIcon
                            category={category}
                            boxSize={18}
                            iconSize={11}
                            className="bg-transparent border-transparent text-primary-foreground"
                          />
                        ) : null}
                        {categoryTitle}
                      </span>
                    </div>
                  )}
                </div>

                <div className="mt-6 text-center">
                  <h2 className="text-3xl md:text-4xl font-bold leading-tight">
                    {featuredPost[`title_${currentLang}` as keyof Post] as string}
                  </h2>
                  <p className="text-muted-foreground text-base md:text-lg mt-3 max-w-3xl mx-auto line-clamp-2">
                    {truncateText(featuredPost[`content_${currentLang}` as keyof Post] as string, 170)}
                  </p>
                  <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground mt-4">
                    <Clock className="w-4 h-4" />
                    {formatRelativeTime(featuredPost.created_at, currentLang)}
                  </div>

                  <div className="mt-6">
                    <Link
                      to={`/${currentLang}/${featuredPost.slug}`}
                      className="inline-flex items-center justify-center rounded-lg bg-primary px-6 py-3 text-primary-foreground font-semibold hover:opacity-90 transition-opacity"
                    >
                      {t('read_more')}
                    </Link>
                  </div>
                </div>
              </div>
            )}

            <div className="grid md:grid-cols-2 gap-6">
              {remainingPosts.map((post) => (
                <Link key={post.id} to={`/${currentLang}/${post.slug}`}>
                  <Card className="overflow-hidden hover:shadow-lg transition-shadow">
                    <div
                      className={cn(
                        'relative overflow-hidden',
                        effectiveIsReel(post) ? 'aspect-[9/16] max-h-[min(480px,70vh)]' : 'aspect-video'
                      )}
                    >
                      <img
                    src={getPostThumbnailPath({
                      content_type: post.content_type,
                      image_url: post.image_url,
                      video_url: post.video_url,
                      video_thumbnail: post.video_thumbnail,
                    })}
                        alt={post[`title_${currentLang}` as keyof Post] as string}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </div>
                    <CardContent className="p-4">
                      <h3 className="text-xl font-bold mb-2 line-clamp-2 text-center">
                        {post[`title_${currentLang}` as keyof Post] as string}
                      </h3>
                      <p className="text-muted-foreground text-sm mb-3 line-clamp-2">
                        {truncateText(post[`content_${currentLang}` as keyof Post] as string, 110)}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground justify-center">
                        <Clock className="w-3 h-3" />
                        {formatRelativeTime(post.created_at, currentLang)}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </>
  );
}

