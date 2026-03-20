import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { FileText, FolderOpen, Video, Eye } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';

export default function Dashboard() {
  const { t } = useTranslation();
  const [stats, setStats] = useState({
    posts: 0,
    categories: 0,
    videos: 0,
  });

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    const [postsCount, categoriesCount, videosCount] = await Promise.all([
      supabase.from('posts').select('id', { count: 'exact', head: true }),
      supabase.from('categories').select('id', { count: 'exact', head: true }),
      supabase.from('videos').select('id', { count: 'exact', head: true }),
    ]);

    setStats({
      posts: postsCount.count || 0,
      categories: categoriesCount.count || 0,
      videos: videosCount.count || 0,
    });
  };

  const cards = [
    {
      title: t('posts'),
      value: stats.posts,
      icon: FileText,
      href: '/admin/posts',
      color: 'text-blue-600',
    },
    {
      title: t('categories'),
      value: stats.categories,
      icon: FolderOpen,
      href: '/admin/categories',
      color: 'text-green-600',
    },
    {
      title: t('videos'),
      value: stats.videos,
      icon: Video,
      href: '/admin/videos',
      color: 'text-purple-600',
    },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">{t('admin_dashboard')}</h1>
        <p className="text-muted-foreground">{t('site_name')}</p>
      </div>

      <div className="grid md:grid-cols-3 gap-6 mb-8">
        {cards.map((card) => (
          <Card key={card.href}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
              <card.icon className={`w-5 h-5 ${card.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold mb-2">{card.value}</div>
              <Button variant="link" className="px-0" asChild>
                <Link to={card.href}>
                  <Eye className="w-4 h-4 mr-1" />
                  {t('all_categories')}
                </Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('latest_news')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Button asChild>
              <Link to="/admin/posts/new">{t('add_post')}</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
