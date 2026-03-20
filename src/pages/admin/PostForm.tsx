import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { ArrowLeft, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import TipTapEditor from '@/components/TipTapEditor';
import {
  supabase,
  Category,
  CONTENT_TYPES,
  VIDEO_CONTENT_TYPE,
  LEGACY_CONTENT_TYPE_MAP,
} from '@/lib/supabase';
import {
  generateSlug,
  createSearchVector,
  uploadImage,
  validateTipTapContent,
  extractYouTubeVideoId,
  getVideoEmbedUrl,
  getYouTubeThumbnailUrl,
  normalizeYouTubeUrl,
} from '@/lib/helpers';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { getErrorMessage } from '@/lib/utils';
import { CategoryIcon } from '@/components/CategoryIcon';

const contentTypeEnum = z.enum(CONTENT_TYPES as unknown as [string, ...string[]]);

const postSchema = z.object({
  title_ar: z.string().min(2),
  title_fr: z.string().min(2),
  content_ar: z.string().refine(validateTipTapContent, {
    message: 'Content must not be empty',
  }),
  content_fr: z.string().refine(validateTipTapContent, {
    message: 'Content must not be empty',
  }),
  slug: z.string().min(2),
  image_url: z.string().optional().nullable(),
  video_url: z
    .string()
    .optional()
    .nullable()
    .refine((val) => val == null || !!extractYouTubeVideoId(val), {
      message: 'Invalid YouTube URL',
    }),
  video_thumbnail: z.string().optional().nullable(),
  category_id: z.string().uuid(),
  status: z.enum(['draft', 'published', 'archived']),
  content_type: contentTypeEnum,
  is_breaking: z.boolean(),
});

type PostForm = z.infer<typeof postSchema>;

export default function PostForm() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useAuth();
  const isRTL = i18n.language === 'ar';
  const [categories, setCategories] = useState<Category[]>([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const form = useForm<PostForm>({
    resolver: zodResolver(postSchema),
    defaultValues: {
      title_ar: '',
      title_fr: '',
      content_ar: '',
      content_fr: '',
      slug: '',
      image_url: null,
      video_url: null,
      video_thumbnail: null,
      category_id: '',
      status: 'draft',
      content_type: CONTENT_TYPES[0],
      is_breaking: false,
    },
  });

  const contentType = form.watch('content_type');
  const videoUrl = form.watch('video_url');

  useEffect(() => {
    fetchCategories();
    if (id && id !== 'new') {
      fetchPost();
    }
  }, [id]);

  const fetchCategories = async () => {
    const { data } = await supabase
      .from('categories')
      .select('*')
      .order('created_at', { ascending: true });
    if (data) setCategories(data);
  };

  const fetchPost = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .eq('id', id!)
        .maybeSingle();

      if (error) throw error;
      if (data) {
        const row = data as unknown as Record<string, unknown>;
        const videoUrl =
          row.video_url == null || typeof row.video_url === 'string'
            ? (row.video_url as string | null)
            : null;
        const videoThumbnail =
          row.video_thumbnail == null || typeof row.video_thumbnail === 'string'
            ? (row.video_thumbnail as string | null)
            : null;

        const status =
          data.status === 'draft' || data.status === 'published' || data.status === 'archived'
            ? data.status
            : 'draft';
        const rawContentType = (data as Record<string, unknown>).content_type;
        const contentType = (() => {
          if (typeof rawContentType !== 'string') return CONTENT_TYPES[0];
          if ((CONTENT_TYPES as readonly string[]).includes(rawContentType)) return rawContentType;
          return LEGACY_CONTENT_TYPE_MAP[rawContentType] ?? CONTENT_TYPES[0];
        })();

        form.reset({
          title_ar: data.title_ar,
          title_fr: data.title_fr,
          content_ar: data.content_ar,
          content_fr: data.content_fr,
          slug: data.slug,
          image_url: data.image_url,
          video_url: videoUrl,
          video_thumbnail: videoThumbnail,
          category_id: data.category_id || '',
          status,
          content_type: contentType,
          is_breaking: data.is_breaking,
        });
        if (data.image_url) {
          setImagePreview(data.image_url);
        }
      }
    } catch (error: unknown) {
      toast.error(getErrorMessage(error) || t('error'));
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const url = await uploadImage(file);
      form.setValue('image_url', url);
      setImagePreview(url);
      toast.success(t('success'));
    } catch (error: unknown) {
      toast.error(getErrorMessage(error) || t('error'));
    } finally {
      setUploading(false);
    }
  };

  const onSubmit = async (values: PostForm) => {
    setLoading(true);
    try {
      const searchVector = createSearchVector(
        values.title_ar,
        values.content_ar,
        values.title_fr,
        values.content_fr
      );

      const postData: Record<string, unknown> = {
        ...values,
        search_vector: searchVector,
        author_id: user?.id ?? null,
        updated_at: new Date().toISOString(),
      };

      if (postData.content_type === VIDEO_CONTENT_TYPE) {
        const rawVideoUrl = postData.video_url;
        const normalizedVideoUrl = typeof rawVideoUrl === 'string' ? normalizeYouTubeUrl(rawVideoUrl) : null;
        const videoId = typeof rawVideoUrl === 'string' ? extractYouTubeVideoId(rawVideoUrl) : null;

        if (!normalizedVideoUrl || !videoId) {
          throw new Error('Invalid YouTube video URL');
        }

        postData.video_url = normalizedVideoUrl;
        postData.video_thumbnail = getYouTubeThumbnailUrl(normalizedVideoUrl);
      }

      // Avoid referencing columns with the schema cache when they're not relevant.
      // This prevents failures if the DB is temporarily behind migrations.
      if (postData.content_type !== VIDEO_CONTENT_TYPE) {
        delete postData.video_url;
        delete postData.video_thumbnail;
      }

      // If user didn't provide a thumbnail/video, omit it entirely.
      // This also prevents overwriting existing values during edits.
      if (postData.video_url == null) delete postData.video_url;
      if (postData.video_thumbnail == null) delete postData.video_thumbnail;

      if (id && id !== 'new') {
        const { error } = await supabase
          .from('posts')
          .update(postData as Record<string, unknown>)
          .eq('id', id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('posts')
          .insert(postData as Record<string, unknown>);
        if (error) throw error;
      }

      toast.success(t('success'));
      navigate('/admin/posts');
    } catch (error: unknown) {
      toast.error(getErrorMessage(error) || t('error'));
    } finally {
      setLoading(false);
    }
  };

  if (loading && id && id !== 'new') {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl">
      <Button variant="ghost" onClick={() => navigate('/admin/posts')} className="mb-6">
        <ArrowLeft className="w-4 h-4 mr-2" />
        {t('posts')}
      </Button>

      <h1 className="text-3xl font-bold mb-6">
        {id && id !== 'new' ? t('edit_post') : t('add_post')}
      </h1>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('title_ar')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="title_ar"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('title_ar')}</FormLabel>
                    <FormControl>
                      <Input {...field} dir="rtl" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="content_ar"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('content_ar')}</FormLabel>
                    <FormControl>
                      <TipTapEditor
                        content={field.value}
                        onChange={field.onChange}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('title_fr')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="title_fr"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('title_fr')}</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        onChange={(e) => {
                          field.onChange(e);
                          if (!id || id === 'new') {
                            form.setValue('slug', generateSlug(e.target.value));
                          }
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="content_fr"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('content_fr')}</FormLabel>
                    <FormControl>
                      <TipTapEditor
                        content={field.value}
                        onChange={field.onChange}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('categories')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="slug"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('slug')}</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormDescription>URL-friendly identifier</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="category_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('category')}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('category')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categories.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            <span className={`inline-flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
                              <CategoryIcon category={cat} boxSize={18} iconSize={11} />
                              {cat.name_fr} / {cat.name_ar}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('status')}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="draft">{t('draft')}</SelectItem>
                        <SelectItem value="published">{t('published')}</SelectItem>
                        <SelectItem value="archived">{t('archived')}</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="content_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('content_type')}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {CONTENT_TYPES.map((ct) => (
                          <SelectItem key={ct} value={ct}>
                            {ct}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="is_breaking"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel>{t('is_breaking')}</FormLabel>
                      <FormDescription>Show as breaking news</FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />

              {contentType !== VIDEO_CONTENT_TYPE && (
                <div>
                  <FormLabel>{t('image')}</FormLabel>
                  <div className="mt-2 space-y-4">
                    {imagePreview && (
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="w-full max-w-md h-48 object-cover rounded-lg"
                      />
                    )}
                    <div>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                        id="image-upload"
                        disabled={uploading}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => document.getElementById('image-upload')?.click()}
                        disabled={uploading}
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        {uploading ? t('loading') : t('image')}
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {contentType === VIDEO_CONTENT_TYPE && (
                <div className="space-y-6">
                  <FormField
                    control={form.control}
                    name="video_url"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Video URL</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            value={field.value ?? ''}
                            placeholder="https://www.youtube.com/watch?v=VIDEO_ID"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div>
                    <FormLabel>Thumbnail preview</FormLabel>
                    <div className="mt-2 space-y-4">
                      {videoUrl ? (
                        (() => {
                          const thumb = getYouTubeThumbnailUrl(videoUrl);
                          if (!thumb) {
                            return <div className="text-sm text-muted-foreground">Paste a valid YouTube URL.</div>;
                          }
                          return (
                            <img
                              src={thumb}
                              alt="YouTube thumbnail preview"
                              className="w-full max-w-md h-48 object-cover rounded-lg"
                              loading="lazy"
                            />
                          );
                        })()
                      ) : (
                        <div className="text-sm text-muted-foreground">Paste a YouTube URL to see the thumbnail.</div>
                      )}
                    </div>
                  </div>

                  <div>
                    <FormLabel>Preview</FormLabel>
                    <div className="mt-2">
                      {videoUrl ? (
                        (() => {
                          const embedUrl = getVideoEmbedUrl(videoUrl);
                          if (!embedUrl) return <div className="text-sm text-muted-foreground">Invalid YouTube URL.</div>;

                          return (
                            <iframe
                              title="Video preview"
                              src={embedUrl}
                              className="w-full aspect-video rounded-lg"
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                              allowFullScreen
                            />
                          );
                        })()
                      ) : (
                        <div className="text-sm text-muted-foreground">Set a YouTube video URL.</div>
                      )}
                    </div>
                  </div>

                  {videoUrl && (
                    <div className="text-sm text-muted-foreground">
                      Detected: {extractYouTubeVideoId(videoUrl as string) ? 'YouTube' : 'Invalid'}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex gap-4">
            <Button type="submit" disabled={loading}>
              {loading ? t('loading') : t('save')}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/admin/posts')}
            >
              {t('cancel')}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
