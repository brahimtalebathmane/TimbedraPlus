import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { Clock, User, Share2, Facebook, Twitter, Linkedin } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase, Post } from '@/lib/supabase';
import { formatDate, formatRelativeTime, getImagePath, getVideoEmbedUrl, truncateText } from '@/lib/helpers';

export default function Article() {
  const { slug } = useParams<{ slug: string }>();
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language;
  const [post, setPost] = useState<Post | null>(null);
  const [related, setRelated] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (slug) {
      fetchPost();
    }
  }, [slug, currentLang]);

  const fetchPost = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('posts')
        .select('*, category:categories(*), author:profiles(*)')
        .eq('slug', slug!)
        .eq('status', 'published')
        .maybeSingle();

      if (data) {
        setPost(data);
        if (data.category_id) {
          fetchRelated(data.category_id, data.id);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchRelated = async (categoryId: string, postId: string) => {
    const { data } = await supabase
      .from('posts')
      .select('*, category:categories(*)')
      .eq('category_id', categoryId)
      .eq('status', 'published')
      .neq('id', postId)
      .order('created_at', { ascending: false })
      .limit(3);

    if (data) setRelated(data);
  };

  const shareUrl = typeof window !== 'undefined' ? window.location.href : '';
  const shareTitle = post ? post[`title_${currentLang}` as keyof Post] as string : '';

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="animate-pulse space-y-4">
          <div className="h-96 bg-muted rounded-lg"></div>
          <div className="h-8 bg-muted rounded w-3/4"></div>
          <div className="h-4 bg-muted rounded w-full"></div>
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <h1 className="text-3xl font-bold">{t('no_results')}</h1>
      </div>
    );
  }

  const title = post[`title_${currentLang}` as keyof Post] as string;
  const content = post[`content_${currentLang}` as keyof Post] as string;
  const isVideoPost = post.content_type === 'video';
  const videoUrl = (post as any).video_url as string | null | undefined;
  const videoThumbnail = (post as any).video_thumbnail as string | null | undefined;
  const videoEmbedUrl = videoUrl ? getVideoEmbedUrl(videoUrl) : null;

  return (
    <>
      <Helmet>
        <title>{title} - {t('site_name')}</title>
        <meta name="description" content={truncateText(content, 160)} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={truncateText(content, 160)} />
        <meta
          property="og:image"
          content={isVideoPost ? (videoThumbnail ? getImagePath(videoThumbnail) : getImagePath(post.image_url)) : getImagePath(post.image_url)}
        />
        <meta property="og:url" content={shareUrl} />
        <meta property="og:type" content="article" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={title} />
        <meta name="twitter:description" content={truncateText(content, 160)} />
        <meta name="twitter:image" content={getImagePath(post.image_url)} />
        <link rel="canonical" href={shareUrl} />
      </Helmet>

      <article className="container mx-auto px-4 py-12 max-w-4xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          {post.category && (
            <Badge className="mb-4">
              {post.category[`name_${currentLang}` as keyof typeof post.category] as string}
            </Badge>
          )}

          <h1 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">{title}</h1>

          <div className="flex flex-wrap items-center gap-4 text-muted-foreground mb-8">
            {post.author && (
              <div className="flex items-center gap-2">
                <User className="w-4 h-4" />
                <span>{post.author.name}</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <span>{formatRelativeTime(post.created_at, currentLang)}</span>
            </div>
            <div className="flex items-center gap-2">
              <span>{formatDate(post.created_at, currentLang)}</span>
            </div>
          </div>

          <div className="relative aspect-video mb-8 rounded-lg overflow-hidden">
            {isVideoPost && videoUrl ? (
              videoEmbedUrl ? (
                <iframe
                  title={title}
                  src={videoEmbedUrl}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <video
                  src={videoUrl}
                  controls
                  poster={videoThumbnail ? getImagePath(videoThumbnail) : undefined}
                  className="w-full h-full object-cover bg-black"
                />
              )
            ) : (
              <img
                src={getImagePath(post.image_url)}
                alt={title}
                className="w-full h-full object-cover"
              />
            )}
          </div>

          <div
            className="prose prose-lg dark:prose-invert max-w-none mb-8"
            dangerouslySetInnerHTML={{ __html: content }}
          />

          <div className="border-t border-b py-6 mb-8">
            <div className="flex items-center gap-4">
              <Share2 className="w-5 h-5" />
              <span className="font-semibold">{t('share')}</span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() =>
                    window.open(
                      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
                      '_blank'
                    )
                  }
                >
                  <Facebook className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() =>
                    window.open(
                      `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareTitle)}`,
                      '_blank'
                    )
                  }
                >
                  <Twitter className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() =>
                    window.open(
                      `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`,
                      '_blank'
                    )
                  }
                >
                  <Linkedin className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          {related.length > 0 && (
            <div>
              <h2 className="text-3xl font-bold mb-6">{t('related_articles')}</h2>
              <div className="grid md:grid-cols-3 gap-6">
                {related.map((relatedPost) => (
                  <Link key={relatedPost.id} to={`/${currentLang}/${relatedPost.slug}`}>
                    <Card className="overflow-hidden hover:shadow-lg transition-shadow duration-300">
                      <div className="relative aspect-video">
                        <img
                          src={getImagePath(relatedPost.image_url)}
                          alt={relatedPost[`title_${currentLang}` as keyof Post] as string}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      </div>
                      <CardContent className="p-4">
                        <h3 className="font-bold mb-2 line-clamp-2">
                          {relatedPost[`title_${currentLang}` as keyof Post] as string}
                        </h3>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          {formatRelativeTime(relatedPost.created_at, currentLang)}
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      </article>
    </>
  );
}
