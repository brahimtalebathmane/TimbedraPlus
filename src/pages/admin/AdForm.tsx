import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, ArrowRight, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { supabase, AD_PLACEMENTS, type AdPlacement, type AdStatus } from '@/lib/supabase';
import { canPlayVideoUrl } from '@/lib/videoDisplay';
import {
  normalizeYouTubeUrl,
  uploadAdImage,
  removeStorageObjectByPublicUrl,
  AD_IMAGES_BUCKET,
} from '@/lib/helpers';
import { cn, getErrorMessage } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent } from '@/components/ui/card';
import { VideoEmbed } from '@/components/VideoEmbed';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

const placementEnum = z.enum(AD_PLACEMENTS as unknown as [string, ...string[]]);

function looksLikeUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

function createAdSchema(t: (key: string) => string) {
  return z
    .object({
      title: z.string().min(2),
      link: z
        .string()
        .optional()
        .refine((val) => val == null || val === '' || looksLikeUrl(val), {
          message: t('url_invalid'),
        }),
      placement: placementEnum,
      status: z.enum(['active', 'inactive']),
      media_type: z.enum(['image', 'video']),
      video_url: z.string().optional(),
    })
    .superRefine((data, ctx) => {
      if (data.media_type !== 'video') return;
      const raw = data.video_url?.trim() ?? '';
      if (raw.length < 2) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: t('ad_video_url_required'),
          path: ['video_url'],
        });
        return;
      }
      if (!looksLikeUrl(raw)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: t('url_invalid'),
          path: ['video_url'],
        });
      }
    });
}

type AdFormValues = z.infer<ReturnType<typeof createAdSchema>>;

const PLACEMENT_ASPECT: Record<AdPlacement, string> = {
  header_banner: 'aspect-[16/9]',
  sidebar: 'aspect-[4/3]',
  between_articles: 'aspect-[16/9]',
  article: 'aspect-[16/9]',
};

export default function AdForm() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isRTL = i18n.language === 'ar';
  const editing = !!id && id !== 'new';
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  /** Public URL for image ads (from Storage or loaded when editing). */
  const [imagePublicUrl, setImagePublicUrl] = useState<string | null>(null);
  /** Supabase Storage URLs to remove after a successful save (replaced uploads in this session). */
  const [storageUrlsToDeleteAfterSave, setStorageUrlsToDeleteAfterSave] = useState<string[]>([]);
  /** Media URL as loaded from DB (used to drop stored image when switching to video). */
  const [initialMediaUrl, setInitialMediaUrl] = useState<string | null>(null);

  const adSchema = useMemo(() => createAdSchema(t), [t]);

  const form = useForm<AdFormValues>({
    resolver: zodResolver(adSchema),
    defaultValues: {
      title: '',
      link: '',
      placement: 'sidebar',
      status: 'inactive',
      media_type: 'image',
      video_url: '',
    },
  });

  useEffect(() => {
    if (id !== 'new' && id) return;
    setInitialMediaUrl(null);
    setImagePublicUrl(null);
    setStorageUrlsToDeleteAfterSave([]);
    form.reset({
      title: '',
      link: '',
      placement: 'sidebar',
      status: 'inactive',
      media_type: 'image',
      video_url: '',
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (!id || id === 'new') return;
    const fetchAd = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('ads')
          .select('id,title,media_url,link,placement,status,image_url,video_url,created_at')
          .eq('id', id)
          .maybeSingle();

        if (error) throw error;
        if (!data) {
          toast.error(t('ad_not_found'));
          navigate('/admin/ads');
          return;
        }

        const derivedMedia = data.media_url ?? data.video_url ?? data.image_url ?? '';
        const derivedPlacement: AdPlacement = (data.placement as AdPlacement) ?? 'sidebar';
        const derivedStatus: AdStatus = (data.status as AdStatus) ?? 'inactive';

        const trimmed = derivedMedia.trim();
        const isVideo = trimmed ? canPlayVideoUrl(normalizeYouTubeUrl(trimmed) ?? trimmed) : false;

        form.reset({
          title: data.title ?? '',
          link: data.link ?? '',
          placement: derivedPlacement,
          status: derivedStatus,
          media_type: isVideo ? 'video' : 'image',
          video_url: isVideo ? trimmed : '',
        });
        setImagePublicUrl(!isVideo && trimmed ? trimmed : null);
        setStorageUrlsToDeleteAfterSave([]);
        setInitialMediaUrl(trimmed || null);
      } catch (err: unknown) {
        console.error(err);
        toast.error(t('error'));
      } finally {
        setLoading(false);
      }
    };

    fetchAd();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const watchedPlacement = form.watch('placement') as AdPlacement;
  const watchedMediaType = form.watch('media_type');
  const watchedVideoUrl = form.watch('video_url');
  const watchedTitle = form.watch('title');

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error(t('ad_image_invalid_type'));
      e.target.value = '';
      return;
    }

    const previousUrl = imagePublicUrl;
    setUploadingImage(true);
    try {
      const url = await uploadAdImage(file);
      if (previousUrl && previousUrl.includes(`/storage/v1/object/public/${AD_IMAGES_BUCKET}/`)) {
        setStorageUrlsToDeleteAfterSave((prev) =>
          prev.includes(previousUrl) ? prev : [...prev, previousUrl]
        );
      }
      setImagePublicUrl(url);
      toast.success(t('success'));
    } catch (err: unknown) {
      console.error(err);
      toast.error(getErrorMessage(err) || t('error'));
    } finally {
      setUploadingImage(false);
      e.target.value = '';
    }
  };

  const preview = useMemo(() => {
    const title = watchedTitle?.trim() || t('advertisements');
    if (watchedMediaType === 'image') {
      const raw = typeof imagePublicUrl === 'string' ? imagePublicUrl.trim() : '';
      if (!raw) return null;
      return {
        url: raw,
        isVideo: false as const,
        title,
      };
    }
    const raw = typeof watchedVideoUrl === 'string' ? watchedVideoUrl.trim() : '';
    if (!raw) return null;
    const normalized = normalizeYouTubeUrl(raw) ?? raw;
    const isVideo = canPlayVideoUrl(normalized);
    return {
      url: normalized,
      isVideo,
      title,
    };
  }, [t, watchedMediaType, watchedVideoUrl, imagePublicUrl, watchedTitle]);

  const onSubmit = async (values: AdFormValues) => {
    if (values.media_type === 'image') {
      const img = imagePublicUrl?.trim();
      if (!img) {
        toast.error(t('ad_image_required'));
        return;
      }
    }

    setLoading(true);
    try {
      let payload: Record<string, unknown>;

      if (values.media_type === 'image') {
        const imgUrl = imagePublicUrl!.trim();
        payload = {
          title: values.title.trim(),
          media_url: imgUrl,
          image_url: imgUrl,
          video_url: null,
          link: values.link && values.link.trim() !== '' ? values.link.trim() : null,
          placement: values.placement,
          status: values.status,
        };
      } else {
        const rawMediaUrl = values.video_url!.trim();
        const normalizedMediaUrl = normalizeYouTubeUrl(rawMediaUrl) ?? rawMediaUrl;
        const isVideo = canPlayVideoUrl(normalizedMediaUrl);
        if (!isVideo) {
          toast.error(t('ad_video_url_invalid'));
          setLoading(false);
          return;
        }
        payload = {
          title: values.title.trim(),
          media_url: normalizedMediaUrl,
          image_url: null,
          video_url: normalizedMediaUrl,
          link: values.link && values.link.trim() !== '' ? values.link.trim() : null,
          placement: values.placement,
          status: values.status,
        };
      }

      if (editing) {
        const { data, error } = await supabase
          .from('ads')
          .update(payload)
          .eq('id', id)
          .select('*')
          .maybeSingle();
        if (error) throw error;
        if (!data) throw new Error('Ad update returned no data');
      } else {
        const { data, error } = await supabase
          .from('ads')
          .insert([payload])
          .select('*')
          .maybeSingle();
        if (error) throw error;
        if (!data) throw new Error('Ad insert returned no data');
      }

      for (const u of new Set(storageUrlsToDeleteAfterSave)) {
        void removeStorageObjectByPublicUrl(u, AD_IMAGES_BUCKET);
      }
      setStorageUrlsToDeleteAfterSave([]);

      if (values.media_type === 'video' && editing && initialMediaUrl) {
        const init = initialMediaUrl.trim();
        const initNorm = normalizeYouTubeUrl(init) ?? init;
        if (!canPlayVideoUrl(initNorm) && init.includes(`/storage/v1/object/public/${AD_IMAGES_BUCKET}/`)) {
          void removeStorageObjectByPublicUrl(init, AD_IMAGES_BUCKET);
        }
      }

      toast.success(t('success'));
      navigate('/admin/ads');
    } catch (err: unknown) {
      console.error(err);
      toast.error(getErrorMessage(err) || t('error'));
    } finally {
      setLoading(false);
    }
  };

  const aspectClass = PLACEMENT_ASPECT[watchedPlacement] ?? 'aspect-[16/9]';
  const maxHeight =
    watchedPlacement === 'sidebar'
      ? 'max-h-[210px] md:max-h-[240px]'
      : watchedPlacement === 'header_banner'
        ? 'max-h-[260px] md:max-h-[320px]'
        : watchedPlacement === 'between_articles'
          ? 'max-h-[220px] md:max-h-[260px]'
          : 'max-h-[280px] md:max-h-[320px]';

  return (
    <div className="max-w-4xl space-y-6">
      <Button variant="ghost" onClick={() => navigate('/admin/ads')} className="mb-6">
        {isRTL ? (
          <ArrowRight className={cn('w-4 h-4', isRTL ? 'ml-2' : 'mr-2')} />
        ) : (
          <ArrowLeft className={cn('w-4 h-4', isRTL ? 'ml-2' : 'mr-2')} />
        )}
        {t('advertisements')}
      </Button>

      <h1 className="text-3xl font-bold">
        {editing ? t('edit_advertisement') : t('add_advertisement')}
      </h1>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardContent className="space-y-5 pt-6">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('ad_title')}</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          dir={isRTL ? 'rtl' : undefined}
                          placeholder={t('ad_title_placeholder')}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="placement"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('placement')}</FormLabel>
                      <FormControl>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger>
                            <SelectValue placeholder={t('select_placement')} />
                          </SelectTrigger>
                          <SelectContent>
                            {AD_PLACEMENTS.map((p) => (
                              <SelectItem key={p} value={p}>
                                {t(
                                  p === 'header_banner'
                                    ? 'placement_header_banner'
                                    : p === 'sidebar'
                                      ? 'placement_sidebar'
                                      : p === 'between_articles'
                                        ? 'placement_between_articles'
                                        : 'placement_article'
                                )}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="m-0">{t('active')}</FormLabel>
                        <FormDescription>{t('show_on_website')}</FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value === 'active'}
                          onCheckedChange={(checked) => field.onChange(checked ? 'active' : 'inactive')}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <Card>
              <CardContent className="space-y-5 pt-6">
                <FormField
                  control={form.control}
                  name="media_type"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel>{t('ad_media_type')}</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={(v) => {
                            field.onChange(v);
                            if (v === 'video') {
                              setImagePublicUrl(null);
                            } else {
                              form.setValue('video_url', '');
                            }
                          }}
                          value={field.value}
                          className="flex flex-col gap-2"
                        >
                          <FormItem className="flex items-center space-x-3 space-y-0 rtl:space-x-reverse">
                            <FormControl>
                              <RadioGroupItem value="image" id="ad-media-image" />
                            </FormControl>
                            <FormLabel htmlFor="ad-media-image" className="font-normal cursor-pointer">
                              {t('ad_media_image')}
                            </FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-3 space-y-0 rtl:space-x-reverse">
                            <FormControl>
                              <RadioGroupItem value="video" id="ad-media-video" />
                            </FormControl>
                            <FormLabel htmlFor="ad-media-video" className="font-normal cursor-pointer">
                              {t('ad_media_video')}
                            </FormLabel>
                          </FormItem>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {watchedMediaType === 'image' ? (
                  <div className="space-y-3">
                    <FormLabel>{t('ad_image')}</FormLabel>
                    <FormDescription>{t('ad_image_upload_hint')}</FormDescription>
                    {imagePublicUrl && (
                      <div className={cn('w-full overflow-hidden rounded-lg border bg-card', aspectClass, maxHeight)}>
                        <img
                          src={imagePublicUrl}
                          alt={watchedTitle?.trim() || t('advertisements')}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <div>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        onChange={handleImageUpload}
                        className="hidden"
                        id="ad-image-upload"
                        disabled={uploadingImage || loading}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => document.getElementById('ad-image-upload')?.click()}
                        disabled={uploadingImage || loading}
                      >
                        <Upload className={cn('w-4 h-4', isRTL ? 'ml-2' : 'mr-2')} />
                        {uploadingImage ? t('ad_uploading_image') : t('ad_upload_image')}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <FormField
                    control={form.control}
                    name="video_url"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('ad_video_url')}</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder={t('ad_video_url_placeholder')}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <FormField
                  control={form.control}
                  name="link"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('link_url')}</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder={t('link_url_placeholder')} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {preview && watchedMediaType === 'video' && (
                  <div>
                    <div className="text-sm text-muted-foreground mb-2">{t('preview')}</div>
                    <div className={cn('w-full overflow-hidden rounded-lg border bg-card', aspectClass, maxHeight)}>
                      {preview.isVideo ? (
                        <div className="w-full h-full bg-black">
                          <VideoEmbed
                            videoUrl={preview.url}
                            title={preview.title}
                            className="w-full h-full"
                          />
                        </div>
                      ) : (
                        <img
                          src={preview.url}
                          alt={preview.title}
                          className="w-full h-full object-cover"
                        />
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="flex gap-4">
            <Button type="submit" disabled={loading || uploadingImage}>
              {editing ? t('save') : t('add_advertisement')}
            </Button>
            <Button type="button" variant="outline" onClick={() => navigate('/admin/ads')}>
              {t('cancel')}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
