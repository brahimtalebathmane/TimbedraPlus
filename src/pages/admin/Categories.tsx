import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
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
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { supabase, Category } from '@/lib/supabase';
import { generateSlug } from '@/lib/helpers';
import { toast } from 'sonner';

const categorySchema = z.object({
  name_ar: z.string().min(2),
  name_fr: z.string().min(2),
  slug: z.string().min(2),
});

type CategoryForm = z.infer<typeof categorySchema>;

export default function Categories() {
  const { t } = useTranslation();
  const [categories, setCategories] = useState<Category[]>([]);
  const [open, setOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  const form = useForm<CategoryForm>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name_ar: '',
      name_fr: '',
      slug: '',
    },
  });

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    if (editingCategory) {
      form.reset({
        name_ar: editingCategory.name_ar,
        name_fr: editingCategory.name_fr,
        slug: editingCategory.slug,
      });
      setOpen(true);
    }
  }, [editingCategory, form]);

  const fetchCategories = async () => {
    const { data } = await supabase
      .from('categories')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setCategories(data);
  };

  const onSubmit = async (values: CategoryForm) => {
    try {
      if (editingCategory) {
        const { error } = await supabase
          .from('categories')
          .update(values)
          .eq('id', editingCategory.id);
        if (error) throw error;
        toast.success(t('success'));
      } else {
        const { error } = await supabase.from('categories').insert([values]);
        if (error) throw error;
        toast.success(t('success'));
      }
      setOpen(false);
      setEditingCategory(null);
      form.reset();
      fetchCategories();
    } catch (error: any) {
      toast.error(error.message || t('error'));
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from('categories').delete().eq('id', id);
      if (error) throw error;
      toast.success(t('success'));
      fetchCategories();
    } catch (error: any) {
      toast.error(error.message || t('error'));
    }
  };

  const handleNew = () => {
    setEditingCategory(null);
    form.reset({
      name_ar: '',
      name_fr: '',
      slug: '',
    });
    setOpen(true);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">{t('categories')}</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleNew}>
              <Plus className="w-4 h-4 mr-2" />
              {t('add_category')}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingCategory ? t('edit_category') : t('add_category')}
              </DialogTitle>
              <DialogDescription>
                {t('name')} {t('slug')}
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name_ar"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('title_ar')}</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="name_fr"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('title_fr')}</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          onChange={(e) => {
                            field.onChange(e);
                            if (!editingCategory) {
                              form.setValue('slug', generateSlug(e.target.value));
                            }
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="slug"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('slug')}</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex gap-2 justify-end">
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                    {t('cancel')}
                  </Button>
                  <Button type="submit">{t('save')}</Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('title_ar')}</TableHead>
              <TableHead>{t('title_fr')}</TableHead>
              <TableHead>{t('slug')}</TableHead>
              <TableHead className="text-right">{t('categories')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {categories.map((category) => (
              <TableRow key={category.id}>
                <TableCell className="font-medium">{category.name_ar}</TableCell>
                <TableCell>{category.name_fr}</TableCell>
                <TableCell>{category.slug}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setEditingCategory(category)}
                    >
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
                          <AlertDialogDescription>
                            {category.name_ar} / {category.name_fr}
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(category.id)}>
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
