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
import { supabase, Category } from '@/lib/supabase';
import {
  generateSlug,
  createSearchVector,
  uploadImage,
  uploadVideo,
  validateTipTapContent,
  extractVideoId,
  getVideoEmbedUrl,
} from '@/lib/helpers';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

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
  video_url: z.string().optional().nullable(),
  video_thumbnail: z.string().optional().nullable(),
  category_id: z.string().uuid(),
  status: z.enum(['draft', 'published', 'archived']),
  content_type: z.enum(['news', 'portrait', 'tourism', 'video']),
  is_breaking: z.boolean(),
});

type PostForm = z.infer<typeof postSchema>;

export default function PostForm() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useAuth();
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
      content_type: 'news',
      is_breaking: false,
    },
  });

  const contentType = form.watch('content_type');

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
        form.reset({
          title_ar: data.title_ar,
          title_fr: data.title_fr,
          content_ar: data.content_ar,
          content_fr: data.content_fr,
          slug: data.slug,
          image_url: data.image_url,
          video_url: (data as any).video_url ?? null,
          video_thumbnail: (data as any).video_thumbnail ?? null,
          category_id: data.category_id || '',
          status: data.status as any,
          content_type: data.content_type as any,
          is_breaking: data.is_breaking,
        });
        if (data.image_url) {
          setImagePreview(data.image_url);
        }
      }
    } catch (error: any) {
      toast.error(error.message || t('error'));
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
    } catch (error: any) {
      toast.error(error.message || t('error'));
    } finally {
      setUploading(false);
    }
  };

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const url = await uploadVideo(file);
      form.setValue('video_url', url);
      toast.success(t('success'));
    } catch (error: any) {
      toast.error(error.message || t('error'));
    } finally {
      setUploading(false);
    }
  };

  const handleVideoThumbnailUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const url = await uploadImage(file);
      form.setValue('video_thumbnail', url);
      toast.success(t('success'));
    } catch (error: any) {
      toast.error(error.message || t('error'));
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

      const postData = {
        ...values,
        search_vector: searchVector,
        author_id: user?.id,
        updated_at: new Date().toISOString(),
      };

      if (id && id !== 'new') {
        const { error } = await supabase.from('posts').update(postData).eq('id', id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('posts').insert([postData]);
        if (error) throw error;
      }

      toast.success(t('success'));
      navigate('/admin/posts');
    } catch (error: any) {
      toast.error(error.message || t('error'));
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
                            {cat.name_fr} / {cat.name_ar}
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
                        <SelectItem value="news">{t('news')}</SelectItem>
                        <SelectItem value="portrait">{t('portrait')}</SelectItem>
                        <SelectItem value="tourism">{t('tourism')}</SelectItem>
                        <SelectItem value="video">{t('video')}</SelectItem>
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

              {contentType !== 'video' && (
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

              {contentType === 'video' && (
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
                            placeholder="https://youtube.com/... or https://vimeo.com/... or uploaded mp4 URL"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div>
                    <FormLabel>Upload MP4</FormLabel>
                    <div className="mt-2 space-y-4">
                      <input
                        type="file"
                        accept="video/mp4"
                        onChange={handleVideoUpload}
                        className="hidden"
                        id="video-upload"
                        disabled={uploading}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => document.getElementById('video-upload')?.click()}
                        disabled={uploading}
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        {uploading ? t('loading') : 'Upload video'}
                      </Button>
                    </div>
                  </div>

                  <div>
                    <FormLabel>Video Thumbnail</FormLabel>
                    <div className="mt-2 space-y-4">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleVideoThumbnailUpload}
                        className="hidden"
                        id="video-thumbnail-upload"
                        disabled={uploading}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() =>
                          document.getElementById('video-thumbnail-upload')?.click()
                        }
                        disabled={uploading}
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        {uploading ? t('loading') : 'Upload thumbnail'}
                      </Button>

                      {form.getValues('video_thumbnail') && (
                        <img
                          src={form.getValues('video_thumbnail') as string}
                          alt="Video thumbnail preview"
                          className="w-full max-w-md h-48 object-cover rounded-lg"
                          loading="lazy"
                        />
                      )}
                    </div>
                  </div>

                  <div>
                    <FormLabel>Preview</FormLabel>
                    <div className="mt-2">
                      {form.getValues('video_url') ? (
                        (() => {
                          const url = form.getValues('video_url') as string;
                          const embedUrl = getVideoEmbedUrl(url);
                          const thumb = form.getValues('video_thumbnail') as string | null;

                          if (embedUrl) {
                            return (
                              <iframe
                                title="Video preview"
                                src={embedUrl}
                                className="w-full aspect-video rounded-lg"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                              />
                            );
                          }

                          return (
                            <video
                              src={url}
                              controls
                              poster={thumb || undefined}
                              className="w-full aspect-video rounded-lg bg-black"
                            />
                          );
                        })()
                      ) : (
                        <div className="text-sm text-muted-foreground">
                          Set a video URL or upload an MP4.
                        </div>
                      )}
                    </div>
                  </div>

                  {form.getValues('video_url') && (
                    <div className="text-sm text-muted-foreground">
                      Detected: {extractVideoId(form.getValues('video_url') as string) ? 'YouTube/Vimeo' : 'MP4 / URL'}
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
