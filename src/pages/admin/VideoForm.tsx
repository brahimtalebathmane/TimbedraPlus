import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { ArrowLeft, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { uploadImage, uploadVideoWithProgress, getVideoEmbedUrl, getImagePath } from '@/lib/helpers';
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
import { Progress } from '@/components/ui/progress';
import { getErrorMessage } from '@/lib/utils';

const videoSchema = z.object({
  title_ar: z.string().min(2),
  title_fr: z.string().min(2),
  video_url: z.string().min(2),
  thumbnail: z.string().optional().nullable(),
});

type VideoFormValues = z.infer<typeof videoSchema>;

export default function VideoForm() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams();

  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [videoUploadProgress, setVideoUploadProgress] = useState<number>(0);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);

  const form = useForm<VideoFormValues>({
    resolver: zodResolver(videoSchema),
    defaultValues: {
      title_ar: '',
      title_fr: '',
      video_url: '',
      thumbnail: null,
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
            thumbnail: data.thumbnail,
          });
          setThumbnailPreview(data.thumbnail);
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

  const handleThumbnailUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const url = await uploadImage(file);
      form.setValue('thumbnail', url);
      setThumbnailPreview(url);
      toast.success(t('success'));
    } catch (err: unknown) {
      toast.error(getErrorMessage(err) || t('error'));
    } finally {
      setUploading(false);
    }
  };

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadingVideo(true);
    setVideoUploadProgress(0);
    try {
      const url = await uploadVideoWithProgress(file, {
        onProgress: (p) => setVideoUploadProgress(p.percent),
      });
      form.setValue('video_url', url);
      toast.success(t('success'));
    } catch (err: unknown) {
      toast.error(getErrorMessage(err) || t('error'));
    } finally {
      setUploading(false);
      setUploadingVideo(false);
    }
  };

  const onSubmit = async (values: VideoFormValues) => {
    setLoading(true);
    try {
      if (id && id !== 'new') {
        const { error } = await supabase.from('videos').update(values).eq('id', id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('videos').insert([values]);
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
                      <Textarea {...field} rows={3} placeholder="https://youtube.com/... or uploaded mp4 URL" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div>
                <FormLabel>Or upload video</FormLabel>
                <div className="mt-2 space-y-3">
                  <input
                    type="file"
                    accept="video/mp4,video/webm,video/quicktime,video/x-m4v,video/x-matroska"
                    onChange={handleVideoUpload}
                    className="hidden"
                    id="video-upload-admin"
                    disabled={uploading}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => document.getElementById('video-upload-admin')?.click()}
                    disabled={uploading}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    {uploading ? t('loading') : 'Upload video'}
                  </Button>

                  {uploadingVideo && (
                    <div className="space-y-2">
                      <div className="text-xs text-muted-foreground">
                        Uploading… {Math.round(videoUploadProgress)}%
                      </div>
                      <Progress value={videoUploadProgress} />
                    </div>
                  )}
                </div>
              </div>

              <div>
                <FormLabel>Thumbnail</FormLabel>
                <div className="mt-2 space-y-4">
                  {thumbnailPreview && (
                    <img
                      src={getImagePath(thumbnailPreview)}
                      alt="Thumbnail preview"
                      className="w-full max-w-md h-48 object-cover rounded-lg"
                    />
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleThumbnailUpload}
                    className="hidden"
                    id="video-thumbnail-upload-admin"
                    disabled={uploading}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => document.getElementById('video-thumbnail-upload-admin')?.click()}
                    disabled={uploading}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    {uploading ? t('loading') : 'Upload thumbnail'}
                  </Button>
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
                      <video
                        src={videoUrl}
                        controls
                        poster={thumbnailPreview ? getImagePath(thumbnailPreview) : undefined}
                        className="w-full h-full object-cover bg-black"
                      />
                    )
                  ) : (
                    <div className="p-4 text-sm text-muted-foreground">Set a video URL or upload MP4.</div>
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

