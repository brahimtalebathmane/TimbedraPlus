import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Trash2, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { supabase, LiveStream } from '@/lib/supabase';
import { extractYouTubeVideoId, normalizeYouTubeUrl } from '@/lib/helpers';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export default function StreamsAdmin() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === 'ar' ? 'ar' : 'fr';

  const [streams, setStreams] = useState<LiveStream[]>([]);
  const [loading, setLoading] = useState(true);

  const [editingId, setEditingId] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [isActive, setIsActive] = useState(false);

  const fetchStreams = async () => {
    const { data } = await supabase
      .from('live_streams')
      .select('*')
      .order('started_at', { ascending: false })
      .limit(50);
    if (data) setStreams(data as LiveStream[]);
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        await fetchStreams();
      } finally {
        setLoading(false);
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resetForm = () => {
    setEditingId(null);
    setTitle('');
    setVideoUrl('');
    setIsActive(false);
  };

  const handleSubmit = async () => {
    if (!title.trim() || !videoUrl.trim()) {
      toast.error(t('error'));
      return;
    }

    const normalizedVideoUrl = normalizeYouTubeUrl(videoUrl.trim());
    const videoId = extractYouTubeVideoId(videoUrl.trim());
    if (!normalizedVideoUrl || !videoId) {
      toast.error(t('invalid_youtube_url'));
      return;
    }

    try {
      if (isActive) {
        // Ensure only one active stream exists.
        await supabase.from('live_streams').update({ is_active: false });
      }

      if (editingId) {
        const { error } = await supabase.from('live_streams').update({
          title: title.trim(),
          video_url: normalizedVideoUrl,
          is_active: isActive,
          updated_at: new Date().toISOString(),
        }).eq('id', editingId);

        if (error) throw error;
      } else {
        const { error } = await supabase.from('live_streams').insert([
          {
            title: title.trim(),
            video_url: normalizedVideoUrl,
            is_active: isActive,
          },
        ]);
        if (error) throw error;
      }

      toast.success(t('success'));
      resetForm();
      await fetchStreams();
    } catch (err: unknown) {
      console.error(err);
      toast.error(t('error'));
    }
  };

  const handleEdit = (s: LiveStream) => {
    setEditingId(s.id);
    setTitle(s.title);
    setVideoUrl(s.video_url);
    setIsActive(s.is_active);
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from('live_streams').delete().eq('id', id);
      if (error) throw error;
      toast.success(t('success'));
      if (editingId === id) resetForm();
      await fetchStreams();
    } catch (err: unknown) {
      console.error(err);
      toast.error(t('error'));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">{t('live_streams')}</h1>
        {editingId && (
          <Button variant="outline" onClick={resetForm}>
            {t('cancel')}
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{editingId ? t('edit_stream') : t('add_stream')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-muted-foreground mb-2">{t('stream_title')}</div>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t('stream_title_placeholder')}
              />
            </div>
            <div className="flex items-end">
              <div className="w-full flex items-center justify-between rounded-lg border p-4">
                <div>
                  <div className="text-sm font-medium">{t('stream_active')}</div>
                  <div className="text-xs text-muted-foreground">{t('stream_active_hint')}</div>
                </div>
                <Switch checked={isActive} onCheckedChange={setIsActive} />
              </div>
            </div>
          </div>

          <div>
            <div className="text-sm text-muted-foreground mb-2">{t('stream_video_url')}</div>
            <Textarea
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              rows={3}
              placeholder={t('stream_video_url_placeholder')}
            />
          </div>

          <div className="flex gap-4">
            <Button type="button" onClick={handleSubmit}>
              {editingId ? t('save') : t('add_stream')}
            </Button>
            <Button type="button" variant="outline" onClick={resetForm}>
              {t('cancel')}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('streams_list')}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 text-muted-foreground">{t('loading')}</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('stream_title')}</TableHead>
                  <TableHead>{t('video_url')}</TableHead>
                  <TableHead>{t('started')}</TableHead>
                  <TableHead>{t('status')}</TableHead>
                  <TableHead className="text-right">{t('actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {streams.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="max-w-xs truncate">{s.title}</TableCell>
                    <TableCell className="max-w-xs truncate">{s.video_url}</TableCell>
                    <TableCell>{new Date(s.started_at).toLocaleDateString(locale)}</TableCell>
                    <TableCell>
                      {s.is_active ? <Badge>{t('active')}</Badge> : <Badge variant="secondary">{t('past')}</Badge>}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(s)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>{t('confirm_delete')}</AlertDialogTitle>
                              <AlertDialogDescription>{s.title}</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(s.id)}>
                                {t('yes')}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

