import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { endOfDay, format, startOfDay, subDays } from 'date-fns';
import { ar } from 'date-fns/locale';
import { BarChart3, Eye, FileText, MessageSquare, Users, Video } from 'lucide-react';
import { supabase, Category } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type DatePreset = 'today' | '7d' | '30d';

type VisitRow = {
  id: string;
  visitor_key: string | null;
  created_at: string;
  category_id: string | null;
  content_type: string;
  post_id: string | null;
  video_id: string | null;
};

const PAGE_SIZE = 1000;

async function fetchVisitsInRange(startIso: string, endIso: string): Promise<VisitRow[]> {
  const rows: VisitRow[] = [];
  let from = 0;
  for (;;) {
    const { data, error } = await supabase
      .from('visits')
      .select('id, visitor_key, created_at, category_id, content_type, post_id, video_id')
      .gte('created_at', startIso)
      .lte('created_at', endIso)
      .order('created_at', { ascending: true })
      .range(from, from + PAGE_SIZE - 1);

    if (error) {
      break;
    }
    const chunk = (data ?? []) as VisitRow[];
    rows.push(...chunk);
    if (chunk.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  return rows;
}

export function DashboardAnalyticsSection() {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const [preset, setPreset] = useState<DatePreset>('7d');
  const [loading, setLoading] = useState(true);
  const [visits, setVisits] = useState<VisitRow[]>([]);
  const [totals, setTotals] = useState({
    articles: 0,
    videos: 0,
    users: 0,
    comments: 0,
  });
  const [topArticles, setTopArticles] = useState<{ id: string; title_ar: string; views: number | null }[]>([]);
  const [topVideos, setTopVideos] = useState<{ id: string; title_ar: string; views: number | null }[]>([]);
  const [categoriesById, setCategoriesById] = useState<Record<string, Category>>({});

  const range = useMemo(() => {
    const now = new Date();
    if (preset === 'today') {
      return {
        start: startOfDay(now),
        end: endOfDay(now),
      };
    }
    const days = preset === '7d' ? 6 : 29;
    return {
      start: startOfDay(subDays(now, days)),
      end: endOfDay(now),
    };
  }, [preset]);

  const startIso = range.start.toISOString();
  const endIso = range.end.toISOString();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [
        visitsData,
        postsCount,
        videosCount,
        profilesCount,
        commentsCount,
        topPostsRes,
        topVideosRes,
        categoriesRes,
      ] = await Promise.all([
        fetchVisitsInRange(startIso, endIso),
        supabase.from('posts').select('id', { count: 'exact', head: true }),
        supabase.from('videos').select('id', { count: 'exact', head: true }),
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('comments').select('id', { count: 'exact', head: true }),
        supabase
          .from('posts')
          .select('id, title_ar, views')
          .order('views', { ascending: false, nullsFirst: false })
          .limit(10),
        supabase
          .from('videos')
          .select('id, title_ar, views')
          .order('views', { ascending: false, nullsFirst: false })
          .limit(10),
        supabase.from('categories').select('*'),
      ]);

      setVisits(visitsData);
      setTotals({
        articles: postsCount.count ?? 0,
        videos: videosCount.count ?? 0,
        users: profilesCount.count ?? 0,
        comments: commentsCount.count ?? 0,
      });
      setTopArticles((topPostsRes.data ?? []) as { id: string; title_ar: string; views: number | null }[]);
      setTopVideos((topVideosRes.data ?? []) as { id: string; title_ar: string; views: number | null }[]);

      const catMap: Record<string, Category> = {};
      for (const c of categoriesRes.data ?? []) {
        catMap[c.id] = c as Category;
      }
      setCategoriesById(catMap);
    } finally {
      setLoading(false);
    }
  }, [startIso, endIso]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const channel = supabase
      .channel('dashboard-analytics')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'visits' }, () => {
        void load();
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'posts' }, () => {
        void load();
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'videos' }, () => {
        void load();
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [load]);

  const periodStats = useMemo(() => {
    const unique = new Set<string>();
    for (const v of visits) {
      unique.add(v.visitor_key || v.id);
    }
    const withPost = visits.filter((v) => v.post_id != null).length;
    const withVideo = visits.filter((v) => v.video_id != null).length;
    const rest = Math.max(0, visits.length - withPost - withVideo);

    const byCategory = new Map<string, number>();
    for (const v of visits) {
      if (!v.category_id) continue;
      byCategory.set(v.category_id, (byCategory.get(v.category_id) ?? 0) + 1);
    }
    const categoryRows = [...byCategory.entries()]
      .map(([id, count]) => ({
        id,
        count,
        name: categoriesById[id]?.name_ar ?? id.slice(0, 8),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 12);

    const dayKey = (d: Date) => format(d, 'yyyy-MM-dd');
    const dayCounts = new Map<string, number>();
    const startD = startOfDay(range.start);
    const endD = startOfDay(range.end);
    for (let d = new Date(startD); d <= endD; d.setDate(d.getDate() + 1)) {
      dayCounts.set(dayKey(new Date(d)), 0);
    }
    for (const v of visits) {
      const k = dayKey(new Date(v.created_at));
      dayCounts.set(k, (dayCounts.get(k) ?? 0) + 1);
    }
    const visitsByDay = [...dayCounts.entries()].map(([date, count]) => ({
      date,
      label:
        i18n.language === 'ar'
          ? format(new Date(date + 'T12:00:00'), 'd MMM', { locale: ar })
          : format(new Date(date + 'T12:00:00'), 'd MMM'),
      count,
    }));

    return {
      uniqueVisitors: unique.size,
      pageViews: visits.length,
      pie: [
        { name: t('analytics_slice_article_pages'), value: withPost, fill: 'hsl(var(--primary))' },
        { name: t('analytics_slice_video_plays'), value: withVideo, fill: 'hsl(262 83% 58%)' },
        { name: t('analytics_slice_other_visits'), value: rest, fill: 'hsl(215 16% 47%)' },
      ],
      categoryRows,
      visitsByDay,
    };
  }, [visits, categoriesById, range.start, range.end, i18n.language, t]);

  const presetButtons: { id: DatePreset; label: string }[] = [
    { id: 'today', label: t('analytics_filter_today') },
    { id: '7d', label: t('analytics_filter_7d') },
    { id: '30d', label: t('analytics_filter_30d') },
  ];

  const overviewCards = [
    {
      title: t('analytics_unique_visitors'),
      value: periodStats.uniqueVisitors,
      icon: Users,
      hint: t('analytics_period_hint'),
    },
    {
      title: t('analytics_total_page_views'),
      value: periodStats.pageViews,
      icon: Eye,
      hint: t('analytics_period_hint'),
    },
    {
      title: t('posts'),
      value: totals.articles,
      icon: FileText,
      hint: t('analytics_totals_hint'),
    },
    {
      title: t('videos'),
      value: totals.videos,
      icon: Video,
      hint: t('analytics_totals_hint'),
    },
    {
      title: t('users'),
      value: totals.users,
      icon: Users,
      hint: t('analytics_totals_hint'),
    },
    {
      title: t('comments'),
      value: totals.comments,
      icon: MessageSquare,
      hint: t('analytics_totals_hint'),
    },
  ];

  return (
    <section className="space-y-8 mt-10" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-7 h-7 text-primary" />
          <h2 className="text-2xl font-bold">{t('analytics_section_title')}</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          {presetButtons.map((b) => (
            <Button
              key={b.id}
              type="button"
              variant={preset === b.id ? 'default' : 'outline'}
              size="sm"
              onClick={() => setPreset(b.id)}
            >
              {b.label}
            </Button>
          ))}
        </div>
      </div>

      {loading ? (
        <p className="text-muted-foreground">{t('loading')}</p>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
            {overviewCards.map((c) => (
              <Card key={c.title}>
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                  <CardTitle className="text-sm font-medium leading-tight">{c.title}</CardTitle>
                  <c.icon className="h-4 w-4 text-muted-foreground shrink-0" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold tabular-nums">{c.value}</div>
                  <p className="text-xs text-muted-foreground mt-1">{c.hint}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>{t('analytics_chart_visits_by_day')}</CardTitle>
              </CardHeader>
              <CardContent className="h-[280px] w-full min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={periodStats.visitsByDay} margin={{ top: 8, right: 8, left: isRTL ? 8 : 4, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
                    <YAxis allowDecimals={false} width={40} />
                    <Tooltip
                      contentStyle={{ direction: isRTL ? 'rtl' : 'ltr' }}
                      labelStyle={{ direction: isRTL ? 'rtl' : 'ltr' }}
                    />
                    <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name={t('analytics_visits')} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t('analytics_chart_views_mix')}</CardTitle>
              </CardHeader>
              <CardContent className="h-[280px] w-full min-w-0">
                {periodStats.pie.some((p) => p.value > 0) ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={periodStats.pie.filter((p) => p.value > 0)}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={48}
                        outerRadius={88}
                        paddingAngle={2}
                      >
                        {periodStats.pie
                          .filter((p) => p.value > 0)
                          .map((entry, index) => (
                            <Cell key={`cell-${entry.name}-${index}`} fill={entry.fill} />
                          ))}
                      </Pie>
                      <Legend wrapperStyle={{ direction: isRTL ? 'rtl' : 'ltr' }} />
                      <Tooltip contentStyle={{ direction: isRTL ? 'rtl' : 'ltr' }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
                    {t('analytics_no_visit_mix')}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>{t('analytics_top_categories')}</CardTitle>
            </CardHeader>
            <CardContent>
              {periodStats.categoryRows.length === 0 ? (
                <p className="text-muted-foreground text-sm">{t('analytics_no_category_visits')}</p>
              ) : (
                <ul className="space-y-2">
                  {periodStats.categoryRows.map((row, i) => (
                    <li
                      key={row.id}
                      className={cn(
                        'flex justify-between items-center gap-2 py-2 border-b border-border last:border-0',
                        isRTL && 'flex-row-reverse',
                      )}
                    >
                      <span className="text-sm truncate">
                        <span className="text-muted-foreground tabular-nums ms-2">{i + 1}.</span>
                        {row.name}
                      </span>
                      <span className="tabular-nums font-medium shrink-0">{row.count}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>{t('analytics_top_articles')}</CardTitle>
              </CardHeader>
              <CardContent>
                {topArticles.length === 0 ? (
                  <p className="text-muted-foreground text-sm">{t('no_results')}</p>
                ) : (
                  <ul className="space-y-2">
                    {topArticles.map((p, i) => (
                      <li
                        key={p.id}
                        className={cn(
                          'flex justify-between gap-2 py-2 border-b border-border last:border-0',
                          isRTL && 'flex-row-reverse text-right',
                        )}
                      >
                        <span className="text-sm line-clamp-2">
                          <span className="text-muted-foreground">{i + 1}. </span>
                          {p.title_ar}
                        </span>
                        <span className="tabular-nums text-sm shrink-0">{p.views ?? 0}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t('analytics_top_videos')}</CardTitle>
              </CardHeader>
              <CardContent>
                {topVideos.length === 0 ? (
                  <p className="text-muted-foreground text-sm">{t('no_results')}</p>
                ) : (
                  <ul className="space-y-2">
                    {topVideos.map((v, i) => (
                      <li
                        key={v.id}
                        className={cn(
                          'flex justify-between gap-2 py-2 border-b border-border last:border-0',
                          isRTL && 'flex-row-reverse text-right',
                        )}
                      >
                        <span className="text-sm line-clamp-2">
                          <span className="text-muted-foreground">{i + 1}. </span>
                          {v.title_ar}
                        </span>
                        <span className="tabular-nums text-sm shrink-0">{v.views ?? 0}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </section>
  );
}
