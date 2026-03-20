import type { Category } from '@/lib/supabase';
import { getCategoryIcon } from '@/lib/categoryIcons';
import { cn } from '@/lib/utils';

export function CategoryIcon({
  category,
  className,
  boxSize = 22,
  iconSize = 14,
}: {
  category: Pick<Category, 'id' | 'slug' | 'name_ar' | 'name_fr'>;
  className?: string;
  boxSize?: number;
  iconSize?: number;
}) {
  const { Icon } = getCategoryIcon(category);

  return (
    <span
      aria-hidden="true"
      className={cn(
        'inline-flex items-center justify-center rounded-full',
        'bg-primary/10 text-primary border border-primary/15',
        'flex-shrink-0'
      )}
      style={{ width: boxSize, height: boxSize }}
    >
      <Icon size={iconSize} strokeWidth={2} />
    </span>
  );
}

