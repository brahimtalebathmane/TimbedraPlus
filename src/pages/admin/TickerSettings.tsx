import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { supabase, Category, TickerSettings, TickerSource } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

const SOURCE_OPTIONS: Array<{ value: TickerSource; labelKey: string }> = [
  { value: 'breaking', labelKey: 'ticker_source_breaking' },
  { value: 'latest', labelKey: 'ticker_source_latest' },
  { value: 'category', labelKey: 'ticker_source_category' },
];

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export default function TickerSettingsPage() {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const currentLang = i18n.language;

  const [loading, setLoading] = useState(true);
  const [row, setRow] = useState<TickerSettings | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);

  const [enabled, setEnabled] = useState(true);
  const [source, setSource] = useState<TickerSource>('breaking');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [itemLimit, setItemLimit] = useState(10);
  const [autoplay, setAutoplay] = useState(true);
  const [showArrows, setShowArrows] = useState(false);
  const [speedSeconds, setSpeedSeconds] = useState(28);

  const fetchRow = async () => {
    const [{ data: rows, error }, { data: cats }] = await Promise.all([
      supabase.from('ticker_settings').select('*').order('updated_at', { ascending: false }).limit(1),
      supabase.from('categories').select('*').order('created_at', { ascending: true }),
    ]);
    if (error) throw error;
    setRow((rows?.[0] as TickerSettings | undefined) ?? null);
    setCategories((cats as Category[]) ?? []);
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        await fetchRow();
      } catch (err) {
        console.error(err);
        toast.error(t('error'));
      } finally {
        setLoading(false);
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!row) return;
    setEnabled(Boolean(row.enabled));
    setSource((row.source as TickerSource) ?? 'breaking');
    setCategoryId(row.category_id ?? null);
    setItemLimit(clamp(Number(row.item_limit ?? 10), 1, 20));
    setAutoplay(Boolean(row.autoplay));
    setShowArrows(Boolean(row.show_arrows));
    setSpeedSeconds(clamp(Number(row.speed_seconds ?? 28), 10, 120));
  }, [row]);

  const selectedCategoryLabel = useMemo(() => {
    if (!categoryId) return null;
    const cat = categories.find((c) => c.id === categoryId);
    if (!cat) return null;
    return (cat[`name_${currentLang}` as keyof Category] as string) ?? null;
  }, [categories, categoryId, currentLang]);

  const handleSave = async () => {
    try {
      const payload = {
        enabled,
        source,
        category_id: source === 'category' ? categoryId : null,
        item_limit: clamp(itemLimit, 1, 20),
        autoplay,
        show_arrows: showArrows,
        speed_seconds: clamp(speedSeconds, 10, 120),
        updated_at: new Date().toISOString(),
      };

      if (row) {
        const { error } = await supabase.from('ticker_settings').update(payload).eq('id', row.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('ticker_settings').insert(payload as Record<string, unknown>);
        if (error) throw error;
      }

      toast.success(t('success'));
      await fetchRow();
    } catch (err) {
      console.error(err);
      toast.error(t('error'));
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">{t('ticker_settings')}</h1>

      <Card>
        <CardHeader>
          <CardTitle>{t('ticker_settings_subtitle')}</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="p-6 text-muted-foreground">{t('loading')}</div>
          ) : (
            <div className="space-y-6">
              <div className={cn('flex items-center justify-between gap-4', isRTL ? 'flex-row-reverse' : 'flex-row')}>
                <div>
                  <div className="font-semibold">{t('ticker_enabled')}</div>
                  <div className="text-sm text-muted-foreground">{t('ticker_enabled_hint')}</div>
                </div>
                <Switch checked={enabled} onCheckedChange={setEnabled} />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">{t('ticker_source')}</div>
                  <Select value={source} onValueChange={(v) => setSource(v as TickerSource)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SOURCE_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {t(opt.labelKey)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">{t('ticker_item_limit')}</div>
                  <Input
                    type="number"
                    min={1}
                    max={20}
                    value={itemLimit}
                    onChange={(e) => setItemLimit(clamp(Number(e.target.value || 0), 1, 20))}
                  />
                </div>
              </div>

              {source === 'category' && (
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">{t('ticker_category')}</div>
                  <Select value={categoryId ?? ''} onValueChange={(v) => setCategoryId(v || null)}>
                    <SelectTrigger>
                      <SelectValue placeholder={selectedCategoryLabel ?? t('ticker_choose_category')} />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {(c[`name_${currentLang}` as keyof Category] as string) ?? c.slug}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="grid md:grid-cols-2 gap-4">
                <div className={cn('flex items-center justify-between gap-4', isRTL ? 'flex-row-reverse' : 'flex-row')}>
                  <div>
                    <div className="font-semibold">{t('ticker_autoplay')}</div>
                    <div className="text-sm text-muted-foreground">{t('ticker_autoplay_hint')}</div>
                  </div>
                  <Switch checked={autoplay} onCheckedChange={setAutoplay} />
                </div>

                <div className={cn('flex items-center justify-between gap-4', isRTL ? 'flex-row-reverse' : 'flex-row')}>
                  <div>
                    <div className="font-semibold">{t('ticker_show_arrows')}</div>
                    <div className="text-sm text-muted-foreground">{t('ticker_show_arrows_hint')}</div>
                  </div>
                  <Switch checked={showArrows} onCheckedChange={setShowArrows} />
                </div>
              </div>

              <div className="space-y-2">
                <div className={cn('flex items-center justify-between gap-4', isRTL ? 'flex-row-reverse' : 'flex-row')}>
                  <div>
                    <div className="font-semibold">{t('ticker_speed')}</div>
                    <div className="text-sm text-muted-foreground">{t('ticker_speed_hint')}</div>
                  </div>
                  <div className="text-sm font-semibold">{speedSeconds}s</div>
                </div>
                <Slider
                  value={[speedSeconds]}
                  min={10}
                  max={120}
                  step={1}
                  onValueChange={(v) => setSpeedSeconds(v[0] ?? 28)}
                />
              </div>

              <div className={cn('flex gap-3', isRTL ? 'flex-row-reverse' : 'flex-row')}>
                <Button type="button" onClick={handleSave}>
                  {t('save')}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    if (!row) return;
                    setEnabled(Boolean(row.enabled));
                    setSource((row.source as TickerSource) ?? 'breaking');
                    setCategoryId(row.category_id ?? null);
                    setItemLimit(clamp(Number(row.item_limit ?? 10), 1, 20));
                    setAutoplay(Boolean(row.autoplay));
                    setShowArrows(Boolean(row.show_arrows));
                    setSpeedSeconds(clamp(Number(row.speed_seconds ?? 28), 10, 120));
                  }}
                >
                  {t('cancel')}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

