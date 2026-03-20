import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { extractYouTubeVideoId, getYouTubeThumbnailUrl, getVideoEmbedUrl, normalizeYouTubeUrl } from '@/lib/helpers';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { getErrorMessage } from '@/lib/utils';

const videoSchema = z.object({
  title_ar: z.string().min(2),
  title_fr: z.string().min(2),
  video_url: z
    .string()
    .min(2)
    .refine((val) => !!extractYouTubeVideoId(val), {
      message: 'Please provide a valid YouTube URL',
    }),
});

type VideoFormValues = z.infer<typeof videoSchema>;

export default function VideoForm() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams();

  const [loading, setLoading] = useState(false);

  const form = useForm<VideoFormValues>({
    resolver: zodResolver(videoSchema),
    defaultValues: {
      title_ar: '',
      title_fr: '',
      video_url: '',
    },
  });

  useEffect(() => {
    if (!id || id === 'new') return;

    const fetchVideo = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('videos')
          .select('*')
          .eq('id', id)
          .maybeSingle();
        if (error) throw error;
        if (data) {
          form.reset({
            title_ar: data.title_ar,
            title_fr: data.title_fr,
            video_url: data.video_url,
          });
        }
      } catch (err: unknown) {
        toast.error(getErrorMessage(err) || t('error'));
      } finally {
        setLoading(false);
      }
    };

    fetchVideo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const onSubmit = async (values: VideoFormValues) => {
    setLoading(true);
    try {
      const normalizedVideoUrl = normalizeYouTubeUrl(values.video_url);
      const videoId = normalizedVideoUrl ? extractYouTubeVideoId(normalizedVideoUrl) : null;
      if (!normalizedVideoUrl || !videoId) {
        throw new Error('Invalid YouTube URL');
      }

      const thumbnail = getYouTubeThumbnailUrl(normalizedVideoUrl);
      if (!thumbnail) throw new Error('Unable to generate YouTube thumbnail');

      const payload = {
        title_ar: values.title_ar,
        title_fr: values.title_fr,
        video_url: normalizedVideoUrl,
        thumbnail,
      };

      if (id && id !== 'new') {
        const { error } = await supabase.from('videos').update(payload).eq('id', id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('videos').insert([payload]);
        if (error) throw error;
      }

      toast.success(t('success'));
      navigate('/admin/videos');
    } catch (err: unknown) {
      toast.error(getErrorMessage(err) || t('error'));
    } finally {
      setLoading(false);
    }
  };

  const embedUrl = form.watch('video_url') ? getVideoEmbedUrl(form.watch('video_url')) : null;
  const videoUrl = form.watch('video_url');
  const thumbnailPreview = videoUrl ? getYouTubeThumbnailUrl(videoUrl) : null;

  return (
    <div className="max-w-3xl">
      <Button variant="ghost" onClick={() => navigate('/admin/videos')} className="mb-6">
        <ArrowLeft className="w-4 h-4 mr-2" />
        {t('videos')}
      </Button>

      <h1 className="text-3xl font-bold mb-6">
        {id && id !== 'new' ? t('edit_post') : 'Add Video'}
      </h1>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('title_ar')}</CardTitle>
            </CardHeader>
            <CardContent>
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
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('title_fr')}</CardTitle>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="title_fr"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('title_fr')}</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Video</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <FormField
                control={form.control}
                name="video_url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Video URL</FormLabel>
                    <FormControl>
                      <Textarea {...field} rows={3} placeholder="https://www.youtube.com/watch?v=VIDEO_ID" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div>
                <FormLabel>Thumbnail preview</FormLabel>
                <div className="mt-2 space-y-4">
                  {thumbnailPreview ? (
                    <img
                      src={thumbnailPreview}
                      alt="YouTube thumbnail preview"
                      className="w-full max-w-md h-48 object-cover rounded-lg"
                    />
                  ) : (
                    <div className="text-sm text-muted-foreground">
                      Paste a valid YouTube URL to see the thumbnail preview.
                    </div>
                  )}
                </div>
              </div>

              <div>
                <FormLabel>Preview</FormLabel>
                <div className="mt-2 aspect-video bg-black rounded-lg overflow-hidden">
                  {videoUrl ? (
                    embedUrl ? (
                      <iframe
                        title="Video preview"
                        src={embedUrl}
                        className="w-full h-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    ) : (
                      <div className="p-4 text-sm text-muted-foreground">Invalid YouTube URL.</div>
                    )
                  ) : (
                    <div className="p-4 text-sm text-muted-foreground">Set a YouTube video URL.</div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-4">
            <Button type="submit" disabled={loading}>
              {loading ? t('loading') : t('save')}
            </Button>
            <Button type="button" variant="outline" onClick={() => navigate('/admin/videos')}>
              {t('cancel')}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}

