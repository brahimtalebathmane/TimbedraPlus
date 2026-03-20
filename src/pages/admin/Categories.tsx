import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CategoryIcon } from '@/components/CategoryIcon';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { supabase, Category } from '@/lib/supabase';

export default function Categories() {
  const { t } = useTranslation();
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    const { data } = await supabase
      .from('categories')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setCategories(data);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">{t('categories')}</h1>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('title_ar')}</TableHead>
              <TableHead>{t('title_fr')}</TableHead>
              <TableHead>{t('slug')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {categories.map((category) => (
              <TableRow key={category.id}>
                <TableCell className="font-medium">
                  <span className="inline-flex items-center gap-2">
                    <CategoryIcon category={category} boxSize={18} iconSize={11} />
                    <span>{category.name_ar}</span>
                  </span>
                </TableCell>
                <TableCell>{category.name_fr}</TableCell>
                <TableCell>{category.slug}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
