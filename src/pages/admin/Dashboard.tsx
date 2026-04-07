import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { FileText, FolderOpen, Video, Plus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export default function Dashboard() {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">{t('admin_dashboard')}</h1>
        <p className="text-muted-foreground">{t('site_name')}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('latest_news')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className={cn('flex flex-col sm:flex-row gap-3', isRTL && 'sm:flex-row-reverse')}>
            <Button asChild>
              <Link to="/admin/posts/new">
                <Plus className={cn('w-4 h-4', isRTL ? 'ml-2' : 'mr-2')} />
                {t('add_post')}
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/admin/posts">
                <FileText className={cn('w-4 h-4', isRTL ? 'ml-2' : 'mr-2')} />
                {t('posts')}
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/admin/categories">
                <FolderOpen className={cn('w-4 h-4', isRTL ? 'ml-2' : 'mr-2')} />
                {t('categories')}
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/admin/videos">
                <Video className={cn('w-4 h-4', isRTL ? 'ml-2' : 'mr-2')} />
                {t('videos')}
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
