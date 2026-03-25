import { Link, Outlet, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FileText, FolderOpen, Video, LayoutDashboard, Phone, Tv, MessageSquareText, Users, Image as ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import Footer from '@/components/Footer';

export default function AdminLayout() {
  const { t } = useTranslation();
  const location = useLocation();

  const navigation = [
    { name: t('admin_dashboard'), href: '/admin', icon: LayoutDashboard },
    { name: t('posts'), href: '/admin/posts', icon: FileText },
    { name: t('categories'), href: '/admin/categories', icon: FolderOpen },
    { name: t('videos'), href: '/admin/videos', icon: Video },
    { name: 'Media Library', href: '/admin/media', icon: ImageIcon },
    { name: t('streams'), href: '/admin/streams', icon: Tv },
    { name: t('contact'), href: '/admin/contact-settings', icon: Phone },
    { name: t('comments'), href: '/admin/comments', icon: MessageSquareText },
    { name: t('users'), href: '/admin/users', icon: Users },
  ];

  return (
    <div className="min-h-screen bg-muted/10 flex flex-col">
      <div className="flex flex-1">
        <aside className="w-64 min-h-screen bg-card border-r">
          <div className="p-6">
            <h1 className="text-2xl font-bold text-primary">{t('admin_dashboard')}</h1>
          </div>
          <nav className="px-3 space-y-1">
            {navigation.map((item) => (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-lg transition-colors',
                  location.pathname === item.href
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-muted'
                )}
              >
                <item.icon className="w-5 h-5" />
                {item.name}
              </Link>
            ))}
          </nav>
        </aside>

        <main className="flex-1 p-8">
          <Outlet />
        </main>
      </div>
      <Footer />
    </div>
  );
}
