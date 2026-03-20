import type { Category } from '@/lib/supabase';
import type { LucideIcon } from 'lucide-react';
import {
  BarChart3,
  FileText,
  Folder,
  HeartPulse,
  Landmark,
  PenSquare,
  Presentation,
  Sparkles,
  Trophy,
} from 'lucide-react';

function norm(value: string | null | undefined) {
  return (value ?? '').toString().toLowerCase();
}

type IconMatch = {
  Icon: LucideIcon;
  score: number;
};

function pickBest(matches: IconMatch[]): LucideIcon {
  const best = matches.sort((a, b) => b.score - a.score)[0];
  return best?.Icon ?? Folder;
}

/**
 * Heuristic icon mapping based on category slug/name (AR/FR).
 * This guarantees every category renders an icon even if the slug differs.
 */
export function getCategoryIcon(category: Pick<Category, 'id' | 'slug' | 'name_ar' | 'name_fr'>): {
  Icon: LucideIcon;
} {
  const slug = norm(category.slug);
  const ar = norm(category.name_ar);
  const fr = norm(category.name_fr);

  const matches: IconMatch[] = [
    // Opinion / Analysis
    {
      Icon: PenSquare,
      score:
        (slug.includes('opinion') ? 20 : 0) +
        (ar.includes('الرأي') || ar.includes('رأي') || ar.includes('تحليل') ? 20 : 0) +
        (fr.includes('opinion') || fr.includes('analyse') || fr.includes('analysis') ? 20 : 0),
    },
    // Reports
    {
      Icon: FileText,
      score:
        (slug.includes('report') ? 20 : 0) +
        (ar.includes('تقرير') || ar.includes('تقارير') ? 20 : 0) +
        (fr.includes('rapport') ? 20 : 0),
    },
    // Economy
    {
      Icon: BarChart3,
      score:
        (slug.includes('economy') ? 20 : 0) +
        (ar.includes('اقتصاد') ? 20 : 0) +
        (fr.includes('economie') || fr.includes('economy') ? 20 : 0),
    },
    // Sports
    {
      Icon: Trophy,
      score:
        (slug.includes('sport') || slug.includes('sports') ? 20 : 0) +
        (ar.includes('رياضة') || ar.includes('منوعة رياضية') ? 20 : 0) +
        (fr.includes('sport') ? 20 : 0),
    },
    // Health / Environment
    {
      Icon: HeartPulse,
      score:
        (slug.includes('health') ? 20 : 0) +
        (ar.includes('صحة') || ar.includes('بيئة') ? 20 : 0) +
        (fr.includes('sante') || fr.includes('environnement') || fr.includes('environment') ? 20 : 0),
    },
    // Culture / Arts
    {
      Icon: Landmark,
      score:
        (slug.includes('culture') ? 20 : 0) +
        (ar.includes('ثقافة') || ar.includes('فنون') || ar.includes('فن') ? 20 : 0) +
        (fr.includes('culture') || fr.includes('arts') || fr.includes('art') ? 20 : 0),
    },
    // Infographics
    {
      Icon: Presentation,
      score:
        (slug.includes('infographic') || slug.includes('infographics') ? 25 : 0) +
        (ar.includes('انفوج') || ar.includes('انفو') || ar.includes('انفوجرافيك') ? 25 : 0) +
        (fr.includes('infographique') || fr.includes('infographic') ? 25 : 0),
    },
    // Misc / Entertainment
    {
      Icon: Sparkles,
      score:
        (slug.includes('various') || slug.includes('misc') ? 20 : 0) +
        (ar.includes('منوعات') || ar.includes('ترفيه') || ar.includes('منوع') ? 20 : 0) +
        (fr.includes('divers') || fr.includes('loisirs') || fr.includes('divertissement') ? 20 : 0),
    },
  ];

  return { Icon: pickBest(matches) };
}

