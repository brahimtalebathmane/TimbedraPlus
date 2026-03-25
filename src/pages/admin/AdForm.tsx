import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { supabase, AD_PLACEMENTS, type AdPlacement, type AdStatus } from '@/lib/supabase';
import { canPlayVideoUrl } from '@/lib/videoDisplay';
import { normalizeYouTubeUrl } from '@/lib/helpers';
import { getErrorMessage, cn } from '@/lib/utils';
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

const placementEnum = z.enum(AD_PLACEMENTS as unknown as [string, ...string[]]);

function looksLikeUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

const adSchema = z.object({
  title: z.string().min(2),
  media_url: z.string().min(2).refine((val) => looksLikeUrl(val), {
    message: 'Media URL must be a valid URL (https://...)',
  }),
  link: z
    .string()
    .optional()
    .refine((val) => val == null || val === '' || looksLikeUrl(val), {
      message: 'Link must be a valid URL',
    }),
  placement: placementEnum,
  status: z.enum(['active', 'inactive']),
});

type AdFormValues = z.infer<typeof adSchema>;

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

  const form = useForm<AdFormValues>({
    resolver: zodResolver(adSchema),
    defaultValues: {
      title: '',
      media_url: '',
      link: '',
      placement: 'sidebar',
      status: 'inactive',
    },
  });

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
          toast.error(t('error') ?? 'Ad not found');
          navigate('/admin/ads');
          return;
        }

        const derivedMedia = data.media_url ?? data.video_url ?? data.image_url ?? '';
        const derivedPlacement: AdPlacement = (data.placement as AdPlacement) ?? 'sidebar';
        const derivedStatus: AdStatus = (data.status as AdStatus) ?? 'inactive';

        form.reset({
          title: data.title ?? '',
          media_url: derivedMedia,
          link: data.link ?? '',
          placement: derivedPlacement,
          status: derivedStatus,
        });
      } catch (err: unknown) {
        toast.error(getErrorMessage(err) || t('error'));
      } finally {
        setLoading(false);
      }
    };

    fetchAd();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const watchedPlacement = form.watch('placement') as AdPlacement;
  const watchedMediaUrl = form.watch('media_url');
  const watchedTitle = form.watch('title');

  const preview = useMemo(() => {
    const raw = typeof watchedMediaUrl === 'string' ? watchedMediaUrl.trim() : '';
    if (!raw) return null;
    const normalized = normalizeYouTubeUrl(raw) ?? raw;
    const isVideo = canPlayVideoUrl(normalized);

    return {
      url: normalized,
      isVideo,
      title: watchedTitle?.trim() || 'Advertisement',
    };
  }, [watchedMediaUrl, watchedTitle]);

  const onSubmit = async (values: AdFormValues) => {
    setLoading(true);
    try {
      const rawMediaUrl = values.media_url.trim();
      const normalizedMediaUrl = normalizeYouTubeUrl(rawMediaUrl) ?? rawMediaUrl;

      const isVideo = canPlayVideoUrl(normalizedMediaUrl);

      const link = values.link && values.link.trim() !== '' ? values.link.trim() : null;

      const payload = {
        title: values.title.trim(),
        media_url: normalizedMediaUrl,
        image_url: isVideo ? null : normalizedMediaUrl,
        video_url: isVideo ? normalizedMediaUrl : null,
        link,
        placement: values.placement,
        status: values.status,
      };

      if (editing) {
        const { error } = await supabase.from('ads').update(payload).eq('id', id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('ads').insert([payload]);
        if (error) throw error;
      }

      toast.success(t('success'));
      navigate('/admin/ads');
    } catch (err: unknown) {
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
        <ArrowLeft className="w-4 h-4 mr-2" />
        Advertisements
      </Button>

      <h1 className="text-3xl font-bold">
        {editing ? 'Edit advertisement' : 'Add advertisement'}
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
                      <FormLabel>Title</FormLabel>
                      <FormControl>
                        <Input {...field} dir={isRTL ? 'rtl' : undefined} placeholder="Advertisement title" />
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
                      <FormLabel>Placement</FormLabel>
                      <FormControl>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select placement" />
                          </SelectTrigger>
                          <SelectContent>
                            {AD_PLACEMENTS.map((p) => (
                              <SelectItem key={p} value={p}>
                                {p}
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
                        <FormLabel className="m-0">Active</FormLabel>
                        <FormDescription>Show on the website</FormDescription>
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
                  name="media_url"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Media URL (image or video)</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="https://example.com/banner.jpg (or YouTube/direct video URL)"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="link"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Link URL (optional)</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="https://example.com" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {preview && (
                  <div>
                    <div className="text-sm text-muted-foreground mb-2">Preview</div>
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
            <Button type="submit" disabled={loading}>
              {editing ? 'Save changes' : 'Add advertisement'}
            </Button>
            <Button type="button" variant="outline" onClick={() => navigate('/admin/ads')}>
              Cancel
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}

