import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase, type Ad, type AdPlacement, type AdStatus } from '@/lib/supabase';
import { getErrorMessage } from '@/lib/utils';
import { canPlayVideoUrl } from '@/lib/videoDisplay';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
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
import { Card, CardContent } from '@/components/ui/card';

const placementLabels: Partial<Record<AdPlacement, string>> = {
  header_banner: 'Header banner',
  sidebar: 'Sidebar',
  between_articles: 'Between articles',
  article: 'In article',
};

function getPlacementLabel(placement: string): string {
  return (placementLabels as Record<string, string>)[placement] ?? placement;
}

export default function AdsAdmin() {
  const { t } = useTranslation();
  const [ads, setAds] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(true);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  useEffect(() => {
    fetchAds();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchAds = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('ads')
        .select('id,title,media_url,link,placement,status,image_url,video_url,created_at')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAds((data ?? []) as Ad[]);
    } catch (err: unknown) {
      toast.error(getErrorMessage(err) || t('error'));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from('ads').delete().eq('id', id);
      if (error) throw error;
      toast.success(t('success'));
      fetchAds();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err) || t('error'));
    }
  };

  const handleToggle = async (ad: Ad) => {
    if (togglingId) return;
    const nextStatus: AdStatus = ad.status === 'active' ? 'inactive' : 'active';
    setTogglingId(ad.id);
    try {
      const { error } = await supabase.from('ads').update({ status: nextStatus }).eq('id', ad.id);
      if (error) throw error;
      toast.success(t('success'));
      fetchAds();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err) || t('error'));
    } finally {
      setTogglingId(null);
    }
  };

  const statusBadgeVariant = (status: AdStatus) => {
    return status === 'active' ? 'default' : 'secondary';
  };

  const mediaPreview = (ad: Ad) => {
    const url = ad.media_url ?? ad.video_url ?? ad.image_url ?? null;
    if (!url) return '—';
    if (canPlayVideoUrl(url)) {
      return (
        <div className="w-24 h-14 bg-black rounded object-cover flex items-center justify-center text-white/70 text-xs">
          Video
        </div>
      );
    }
    return (
      <img
        src={url}
        alt={ad.title ?? 'Advertisement'}
        className="w-24 h-14 rounded object-cover border bg-muted/30"
        loading="lazy"
      />
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Advertisements</h1>
        <Button asChild>
          <Link to="/admin/ads/new">
            <Plus className="w-4 h-4 mr-2" />
            Add advertisement
          </Link>
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 text-muted-foreground">Loading…</div>
          ) : ads.length === 0 ? (
            <div className="p-6 text-muted-foreground">No advertisements found.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[180px]">Title</TableHead>
                  <TableHead>Placement</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Media</TableHead>
                  <TableHead className="min-w-[220px]">Link</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ads.map((ad) => (
                  <TableRow key={ad.id}>
                    <TableCell className="font-medium max-w-xs truncate">
                      {ad.title ?? '—'}
                    </TableCell>
                    <TableCell>{getPlacementLabel(ad.placement)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Badge variant={statusBadgeVariant(ad.status)}>{ad.status}</Badge>
                        <Switch
                          checked={ad.status === 'active'}
                          onCheckedChange={() => handleToggle(ad)}
                          disabled={togglingId === ad.id}
                          aria-label="Toggle ad status"
                        />
                      </div>
                    </TableCell>
                    <TableCell>{mediaPreview(ad)}</TableCell>
                    <TableCell className="max-w-xs truncate">
                      {ad.link ? (
                        <a
                          href={ad.link}
                          target="_blank"
                          rel="noreferrer"
                          className="text-primary hover:underline"
                        >
                          Open link
                        </a>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" asChild>
                          <Link to={`/admin/ads/${ad.id}`}>
                            <Pencil className="w-4 h-4" />
                          </Link>
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
                              <AlertDialogDescription>
                                {ad.title ?? 'Advertisement'}
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(ad.id)}>
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

