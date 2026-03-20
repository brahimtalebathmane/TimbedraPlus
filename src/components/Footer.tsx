import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Mail,
  Phone,
  Facebook,
  Twitter,
  Instagram,
  Youtube,
  MessageCircle,
  Linkedin,
  Ghost,
  Music2,
} from 'lucide-react';
import { supabase, ContactInfo, Category } from '@/lib/supabase';
import { Link } from 'react-router-dom';
import { CategoryIcon } from '@/components/CategoryIcon';

function toWhatsappUrl(whatsapp: string) {
  const trimmed = whatsapp.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
  // If it's a phone number, normalize it for wa.me.
  const digits = trimmed.replace(/\D/g, '');
  if (!digits) return null;
  return `https://wa.me/${digits}`;
}

export default function Footer() {
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language;
  const isRTL = currentLang === 'ar';

  const [loading, setLoading] = useState(true);
  const [row, setRow] = useState<ContactInfo | null>(null);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    const fetchRow = async () => {
      try {
        const { data, error } = await supabase
          .from('contact_info')
          .select('*')
          .order('updated_at', { ascending: false })
          .limit(1);
        if (error) throw error;

        if (data && data.length > 0) setRow(data[0] as ContactInfo);
      } catch (err) {
        console.error('Failed to load contact_info', err);
      } finally {
        setLoading(false);
      }
    };

    fetchRow();
  }, []);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const { data } = await supabase
          .from('categories')
          .select('*')
          .order('created_at', { ascending: true });
        if (data) setCategories(data as Category[]);
      } catch (err) {
        console.error('Failed to load footer categories', err);
      } finally {
        setCategoriesLoading(false);
      }
    };

    fetchCategories();
  }, []);

  const whatsappUrl = useMemo(() => {
    if (!row?.whatsapp) return null;
    return toWhatsappUrl(row.whatsapp);
  }, [row]);

  const email = row?.email ?? '';
  const phone = row?.phone ?? '';
  const socials = {
    facebook: row?.facebook ?? '',
    twitter: row?.twitter ?? '',
    instagram: row?.instagram ?? '',
    youtube: row?.youtube ?? '',
    linkedin: row?.linkedin ?? '',
    snapchat: row?.snapchat ?? '',
    tiktok: row?.tiktok ?? '',
  };

  return (
    <footer className="border-t bg-card/30 mt-12">
      <div className="container mx-auto px-4 py-10">
        <div className="grid lg:grid-cols-4 md:grid-cols-2 gap-8 items-start">
          <div className="space-y-3">
            <Link to={`/${currentLang}`} className="flex items-center gap-3">
              <img
                src="https://i.postimg.cc/JzzwfmdL/LOGO-TEMDHRA.png"
                alt={t('site_name')}
                className="h-10 w-auto"
              />
            </Link>
            <div className="text-sm text-muted-foreground">{t('site_name')}</div>
          </div>

          <div className="space-y-3">
            <div className="font-bold text-lg">{t('contact')}</div>

            {loading ? (
              <div className="text-sm text-muted-foreground">{t('loading')}</div>
            ) : (
              <div className="space-y-2 text-sm text-muted-foreground">
                {email && (
                  <a
                    href={`mailto:${email}`}
                    className="flex items-center gap-2 hover:text-foreground transition-colors"
                  >
                    <Mail className="w-4 h-4" />
                    <span>{email}</span>
                  </a>
                )}

                {phone && (
                  <a href={`tel:${phone}`} className="flex items-center gap-2 hover:text-foreground transition-colors">
                    <Phone className="w-4 h-4" />
                    <span>{phone}</span>
                  </a>
                )}

                {whatsappUrl && (
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 hover:text-foreground transition-colors"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>WhatsApp</span>
                  </a>
                )}
              </div>
            )}
          </div>

          <div className="space-y-3">
            <div className="font-bold text-lg">Social</div>

            <div className="flex flex-wrap gap-3">
              {socials.facebook && (
                <a
                  href={socials.facebook}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Facebook"
                  className="inline-flex items-center gap-2 rounded-lg border bg-background/50 px-3 py-2 hover:bg-background transition-colors"
                >
                  <Facebook className="w-4 h-4" />
                  <span className="text-sm">Facebook</span>
                </a>
              )}

              {socials.twitter && (
                <a
                  href={socials.twitter}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Twitter"
                  className="inline-flex items-center gap-2 rounded-lg border bg-background/50 px-3 py-2 hover:bg-background transition-colors"
                >
                  <Twitter className="w-4 h-4" />
                  <span className="text-sm">Twitter</span>
                </a>
              )}

              {socials.instagram && (
                <a
                  href={socials.instagram}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Instagram"
                  className="inline-flex items-center gap-2 rounded-lg border bg-background/50 px-3 py-2 hover:bg-background transition-colors"
                >
                  <Instagram className="w-4 h-4" />
                  <span className="text-sm">Instagram</span>
                </a>
              )}

              {socials.youtube && (
                <a
                  href={socials.youtube}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="YouTube"
                  className="inline-flex items-center gap-2 rounded-lg border bg-background/50 px-3 py-2 hover:bg-background transition-colors"
                >
                  <Youtube className="w-4 h-4" />
                  <span className="text-sm">YouTube</span>
                </a>
              )}

              {socials.linkedin && (
                <a
                  href={socials.linkedin}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="LinkedIn"
                  className="inline-flex items-center gap-2 rounded-lg border bg-background/50 px-3 py-2 hover:bg-background transition-colors"
                >
                  <Linkedin className="w-4 h-4" />
                  <span className="text-sm">LinkedIn</span>
                </a>
              )}

              {socials.snapchat && (
                <a
                  href={socials.snapchat}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Snapchat"
                  className="inline-flex items-center gap-2 rounded-lg border bg-background/50 px-3 py-2 hover:bg-background transition-colors"
                >
                  <Ghost className="w-4 h-4" />
                  <span className="text-sm">Snapchat</span>
                </a>
              )}

              {socials.tiktok && (
                <a
                  href={socials.tiktok}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="TikTok"
                  className="inline-flex items-center gap-2 rounded-lg border bg-background/50 px-3 py-2 hover:bg-background transition-colors"
                >
                  <Music2 className="w-4 h-4" />
                  <span className="text-sm">TikTok</span>
                </a>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <div className="font-bold text-lg">{t('categories')}</div>

            {categoriesLoading ? (
              <div className="text-sm text-muted-foreground">{t('loading')}</div>
            ) : (
              <div className="space-y-2 text-sm text-muted-foreground">
                {categories.map((cat) => (
                  <Link
                    key={cat.id}
                    to={`/${currentLang}/category/${cat.slug}`}
                    className="block rounded-lg px-2 py-1.5 hover:text-foreground transition-colors hover:bg-muted/30"
                  >
                    <span
                      className={`inline-flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}
                    >
                      <CategoryIcon category={cat} boxSize={18} iconSize={11} />
                      <span className="truncate">{cat[`name_${currentLang}` as keyof Category] as string}</span>
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="mt-10 pt-6 border-t flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
          <span>© {new Date().getFullYear()} {t('site_name')}</span>
          <div className="flex flex-wrap items-center gap-4">
            <Link to={`/${currentLang}`} className="hover:text-foreground transition-colors">
              {t('home')}
            </Link>
            <Link to={`/${currentLang}/videos`} className="hover:text-foreground transition-colors">
              {t('videos')}
            </Link>
            <Link to={`/${currentLang}/contact`} className="hover:text-foreground transition-colors">
              {t('contact')}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

