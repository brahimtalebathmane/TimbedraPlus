import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase, type Ad, type AdPlacement, type AdStatus } from '@/lib/supabase';
import { cn } from '@/lib/utils';
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

export default function AdsAdmin() {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const [ads, setAds] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(true);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const getPlacementLabel = (placement: AdPlacement | string): string => {
    const keyByPlacement: Partial<Record<AdPlacement, string>> = {
      header_banner: 'placement_header_banner',
      sidebar: 'placement_sidebar',
      between_articles: 'placement_between_articles',
      article: 'placement_article',
    };
    const key = keyByPlacement[placement as AdPlacement];
    return key ? t(key) : String(placement);
  };

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
      console.error(err);
      toast.error(t('error'));
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
      console.error(err);
      toast.error(t('error'));
    }
  };

  const handleToggle = async (ad: Ad) => {
    if (togglingId) return;
    const nextStatus: AdStatus = ad.status === 'active' ? 'inactive' : 'active';
    setTogglingId(ad.id);
    try {
      const { data, error } = await supabase
        .from('ads')
        .update({ status: nextStatus })
        .eq('id', ad.id)
        .select('*')
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error('Ad update returned no data');
      toast.success(t('success'));
      fetchAds();
    } catch (err: unknown) {
      console.error(err);
      toast.error(t('error'));
    } finally {
      setTogglingId(null);
    }
  };

  const statusBadgeVariant = (status: AdStatus) => {
    return status === 'active' ? 'default' : 'secondary';
  };

  const mediaPreview = (ad: Ad) => {
    const explicitVideoUrl = ad.video_url?.trim() || null;
    const explicitImageUrl = ad.image_url?.trim() || null;
    const legacyMediaUrl = ad.media_url?.trim() || null;
    const url = explicitVideoUrl ?? explicitImageUrl ?? legacyMediaUrl ?? null;
    if (!url) return '—';

    // Prefer stored columns. Only fall back to URL heuristics for legacy `media_url`.
    const isVideo = explicitVideoUrl ? true : legacyMediaUrl ? canPlayVideoUrl(url) : false;
    if (isVideo) {
      return (
        <div className="w-24 h-14 bg-black rounded object-cover flex items-center justify-center text-white/70 text-xs">
          {t('video')}
        </div>
      );
    }
    return (
      <img
        src={url}
        alt={ad.title ?? t('advertisements')}
        className="w-24 h-14 rounded object-cover border bg-muted/30"
        loading="lazy"
      />
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">{t('advertisements')}</h1>
        <Button asChild>
          <Link to="/admin/ads/new">
            <Plus className={cn('w-4 h-4', isRTL ? 'ml-2' : 'mr-2')} />
            {t('add_advertisement')}
          </Link>
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 text-muted-foreground">{t('loading_ads')}</div>
          ) : ads.length === 0 ? (
            <div className="p-6 text-muted-foreground">{t('no_advertisements_found')}</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[180px]">{t('ad_title')}</TableHead>
                  <TableHead>{t('placement')}</TableHead>
                  <TableHead>{t('ad_status')}</TableHead>
                  <TableHead>{t('media')}</TableHead>
                  <TableHead className="min-w-[220px]">{t('link_url')}</TableHead>
                  <TableHead className="text-right">{t('actions')}</TableHead>
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
                        <Badge variant={statusBadgeVariant(ad.status)}>{t(ad.status)}</Badge>
                        <Switch
                          checked={ad.status === 'active'}
                          onCheckedChange={() => handleToggle(ad)}
                          disabled={togglingId === ad.id}
                          aria-label={t('toggle_ad_status')}
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
                          {t('open_link')}
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
                                {ad.title ?? t('advertisements')}
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

