import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase, Comment } from '@/lib/supabase';
import { getErrorMessage } from '@/lib/utils';
import { formatDate } from '@/lib/helpers';

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
import { Button } from '@/components/ui/button';

export default function CommentsAdmin() {
  const { t, i18n } = useTranslation();

  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchComments = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('comments')
        .select('id, post_id, user_id, content, created_at, user:profiles(id, name, avatar_url, avatar)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setComments((data ?? []) as Comment[]);
    } catch (error: unknown) {
      toast.error(getErrorMessage(error) || t('error'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from('comments').delete().eq('id', id);
      if (error) throw error;
      toast.success(t('success'));
      await fetchComments();
    } catch (error: unknown) {
      toast.error(getErrorMessage(error) || t('error'));
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">{t('comments')}</h1>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('user')}</TableHead>
              <TableHead>{t('comment_content')}</TableHead>
              <TableHead>{t('commented_at')}</TableHead>
              <TableHead className="text-right">{t('delete')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={4} className="py-10">
                  <div className="animate-pulse text-muted-foreground">{t('loading')}</div>
                </TableCell>
              </TableRow>
            ) : comments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="py-10 text-muted-foreground">
                  {t('no_comments')}
                </TableCell>
              </TableRow>
            ) : (
              comments.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>
                    {(() => {
                      const author = Array.isArray(c.user) ? c.user[0] : c.user;
                      return author?.name ?? 'User';
                    })()}
                  </TableCell>
                  <TableCell className="max-w-lg">
                    <div className="truncate">{c.content}</div>
                  </TableCell>
                  <TableCell>{formatDate(c.created_at, i18n.language)}</TableCell>
                  <TableCell className="text-right">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>{t('confirm_delete')}</AlertDialogTitle>
                          <AlertDialogDescription>{c.content}</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(c.id)}>
                            {t('yes')}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

