import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Plus, Pencil, Trash2, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { supabase, Post } from '@/lib/supabase';
import { formatDate } from '@/lib/helpers';
import { toast } from 'sonner';
import { getErrorMessage } from '@/lib/utils';
import { CategoryIcon } from '@/components/CategoryIcon';

export default function Posts() {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const [posts, setPosts] = useState<Post[]>([]);

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    const { data } = await supabase
      .from('posts')
      .select('*, category:categories(*), author:profiles(*)')
      .order('created_at', { ascending: false });
    if (data) setPosts(data);
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from('posts').delete().eq('id', id);
      if (error) throw error;
      toast.success(t('success'));
      fetchPosts();
    } catch (error: unknown) {
      toast.error(getErrorMessage(error) || t('error'));
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive'> = {
      draft: 'secondary',
      published: 'default',
      archived: 'destructive',
    };
    return <Badge variant={variants[status] || 'default'}>{t(status)}</Badge>;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">{t('posts')}</h1>
        <Button asChild>
          <Link to="/admin/posts/new">
            <Plus className="w-4 h-4 mr-2" />
            {t('add_post')}
          </Link>
        </Button>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('title_fr')}</TableHead>
              <TableHead>{t('category')}</TableHead>
              <TableHead>{t('status')}</TableHead>
              <TableHead>{t('content_type')}</TableHead>
              <TableHead>{t('published_at')}</TableHead>
              <TableHead className="text-right">{t('categories')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {posts.map((post) => (
              <TableRow key={post.id}>
                <TableCell className="font-medium max-w-xs truncate">
                  {post.title_fr}
                </TableCell>
                <TableCell>
                  {post.category && (
                    <Badge
                      variant="outline"
                      className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}
                    >
                      <CategoryIcon category={post.category} boxSize={18} iconSize={11} />
                      <span>
                        {post.category[`name_${i18n.language}` as keyof typeof post.category] as string}
                      </span>
                    </Badge>
                  )}
                </TableCell>
                <TableCell>{getStatusBadge(post.status)}</TableCell>
                <TableCell>{post.content_type}</TableCell>
                <TableCell>{formatDate(post.created_at, i18n.language)}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="icon" asChild>
                      <Link to={`/${i18n.language}/${post.slug}`} target="_blank">
                        <Eye className="w-4 h-4" />
                      </Link>
                    </Button>
                    <Button variant="ghost" size="icon" asChild>
                      <Link to={`/admin/posts/${post.id}`}>
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
                            {post.title_ar} / {post.title_fr}
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(post.id)}>
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
      </div>
    </div>
  );
}
