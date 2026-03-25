import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { Clock, User, Share2, Facebook, Twitter, Linkedin, MessageSquareText } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CategoryIcon } from '@/components/CategoryIcon';
import { Button } from '@/components/ui/button';
import { supabase, Post, VIDEO_CONTENT_TYPE, LEGACY_VIDEO_CONTENT_TYPE, Comment } from '@/lib/supabase';
import { formatDate, formatRelativeTime, getPostThumbnailPath, truncateText } from '@/lib/helpers';
import { effectiveIsReel, sortPostsReelsFirst } from '@/lib/videoDisplay';
import { ResponsiveVideoPlayer } from '@/components/VideoEmbed';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { getErrorMessage } from '@/lib/utils';

export default function Article() {
  const { slug } = useParams<{ slug: string }>();
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language;
  const isRTL = currentLang === 'ar';
  const { user } = useAuth();
  const [post, setPost] = useState<Post | null>(null);
  const [related, setRelated] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentContent, setCommentContent] = useState('');

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

  const fetchComments = async (postId: string) => {
    setCommentsLoading(true);
    try {
      const { data, error } = await supabase
        .from('comments')
        .select('id, post_id, user_id, content, created_at, user:profiles(id, name)')
        .eq('post_id', postId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setComments((data ?? []) as Comment[]);
    } catch (error: unknown) {
      console.error('Error fetching comments:', error);
    } finally {
      setCommentsLoading(false);
    }
  };

  const fetchRelated = async (categoryId: string, postId: string) => {
    const { data } = await supabase
      .from('posts')
      .select('*, category:categories(*)')
      .eq('category_id', categoryId)
      .eq('status', 'published')
      .neq('id', postId)
      .order('is_reel', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(8);

    if (data) setRelated(sortPostsReelsFirst(data).slice(0, 3));
  };

  useEffect(() => {
    if (post?.id) fetchComments(post.id);
  }, [post?.id]);

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
  const isVideoPost = (post.content_type as unknown as string) === VIDEO_CONTENT_TYPE
    || (post.content_type as unknown as string) === LEGACY_VIDEO_CONTENT_TYPE;
  const extra = post as unknown as {
    video_url?: string | null;
    video_thumbnail?: string | null;
    is_reel?: boolean | null;
    video_width?: number | null;
    video_height?: number | null;
  };
  const videoUrl = extra.video_url;
  const videoThumbnail = extra.video_thumbnail;
  const reelMeta = {
    video_url: videoUrl,
    is_reel: extra.is_reel,
    video_width: extra.video_width,
    video_height: extra.video_height,
  };

  const showHeroVideo = isVideoPost && !!videoUrl;
  const showHeroImage = !isVideoPost && !!post.image_url;
  const showHeroMedia = showHeroVideo || showHeroImage;

  return (
    <>
      <Helmet>
        <title>{title} - {t('site_name')}</title>
        <meta name="description" content={truncateText(content, 160)} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={truncateText(content, 160)} />
        {showHeroMedia && (
          <meta
            property="og:image"
            content={getPostThumbnailPath({
              content_type: post.content_type,
              image_url: post.image_url,
              video_url: videoUrl,
              video_thumbnail: videoThumbnail,
            })}
          />
        )}
        <meta property="og:url" content={shareUrl} />
        <meta property="og:type" content="article" />
        <meta name="twitter:card" content={showHeroMedia ? 'summary_large_image' : 'summary'} />
        <meta name="twitter:title" content={title} />
        <meta name="twitter:description" content={truncateText(content, 160)} />
        {showHeroMedia && (
          <meta
            name="twitter:image"
            content={getPostThumbnailPath({
              content_type: post.content_type,
              image_url: post.image_url,
              video_url: videoUrl,
              video_thumbnail: videoThumbnail,
            })}
          />
        )}
        <link rel="canonical" href={shareUrl} />
      </Helmet>

      <article className="container mx-auto px-4 py-12 max-w-4xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          {post.category && (
            <Badge className={`mb-4 flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
              <CategoryIcon category={post.category} boxSize={18} iconSize={11} />
              <span>{post.category[`name_${currentLang}` as keyof typeof post.category] as string}</span>
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

          {showHeroMedia && (
            <div className="mb-8">
              {showHeroVideo ? (
                <ResponsiveVideoPlayer
                  videoUrl={videoUrl}
                  title={title}
                  reel={reelMeta}
                  className="rounded-lg"
                />
              ) : (
                <div className="relative aspect-video rounded-lg overflow-hidden">
                  <img
                    src={getPostThumbnailPath({
                      content_type: post.content_type,
                      image_url: post.image_url,
                      video_url: videoUrl,
                      video_thumbnail: videoThumbnail,
                    })}
                    alt={title}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
            </div>
          )}

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
                      <div
                        className={cn(
                          'relative overflow-hidden',
                          effectiveIsReel(relatedPost) ? 'aspect-[9/16] max-h-[280px]' : 'aspect-video'
                        )}
                      >
                        <img
                          src={getPostThumbnailPath({
                            content_type: relatedPost.content_type,
                            image_url: relatedPost.image_url,
                            video_url: relatedPost.video_url,
                            video_thumbnail: relatedPost.video_thumbnail,
                          })}
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

          <div className="mt-12">
            <div className="flex items-center gap-2 mb-4">
              <MessageSquareText className="w-5 h-5" />
              <h2 className="text-2xl font-bold">{t('comments')}</h2>
            </div>

            {user && (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!post) return;
                  const content = commentContent.trim();
                  if (!content) return;

                  try {
                    const { error } = await supabase.from('comments').insert({
                      post_id: post.id,
                      user_id: user.id,
                      content,
                    });
                    if (error) throw error;

                    setCommentContent('');
                    await fetchComments(post.id);
                    toast.success(t('success'));
                  } catch (error: unknown) {
                    toast.error(getErrorMessage(error) || t('error'));
                  }
                }}
                className="mb-6"
              >
                <div className="space-y-3">
                  <Textarea
                    value={commentContent}
                    onChange={(e) => setCommentContent(e.target.value)}
                    placeholder={t('add_comment')}
                  />
                  <div className="flex justify-end">
                    <Button type="submit" disabled={commentsLoading}>
                      {t('add_comment')}
                    </Button>
                  </div>
                </div>
              </form>
            )}

            {commentsLoading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-muted animate-pulse" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-muted rounded w-40 animate-pulse" />
                      <div className="h-4 bg-muted rounded w-full animate-pulse" />
                      <div className="h-4 bg-muted rounded w-3/4 animate-pulse" />
                    </div>
                  </div>
                ))}
              </div>
            ) : comments.length === 0 ? (
              <p className="text-muted-foreground">{t('no_comments')}</p>
            ) : (
              <div className="space-y-4">
                {comments.map((c) => {
                  const author = Array.isArray(c.user) ? c.user[0] : c.user;
                  const initials = (author?.name ?? '?').trim().slice(0, 1);
                  return (
                    <div key={c.id} className="flex items-start gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback>{initials}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center justify-between gap-3 mb-1">
                          <div className="font-medium text-sm">{author?.name ?? 'User'}</div>
                          <div className="text-muted-foreground text-xs">{formatDate(c.created_at, currentLang)}</div>
                        </div>
                        <div className="text-sm whitespace-pre-wrap">{c.content}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </motion.div>
      </article>
    </>
  );
}
