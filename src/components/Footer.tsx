import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Mail, Phone, Facebook, Twitter, Instagram, Youtube, MessageCircle } from 'lucide-react';
import { supabase, ContactInfo } from '@/lib/supabase';
import { Link } from 'react-router-dom';

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

  const [loading, setLoading] = useState(true);
  const [row, setRow] = useState<ContactInfo | null>(null);

  useEffect(() => {
    const fetchRow = async () => {
      try {
        const { data } = await supabase
          .from('contact_info')
          .select('*')
          .order('updated_at', { ascending: false })
          .limit(1);

        if (data && data.length > 0) setRow(data[0] as ContactInfo);
      } finally {
        setLoading(false);
      }
    };

    fetchRow();
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
  };

  return (
    <footer className="border-t bg-card/30 mt-12">
      <div className="container mx-auto px-4 py-10">
        <div className="grid md:grid-cols-3 gap-8 items-start">
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
                  <a
                    href={`tel:${phone}`}
                    className="flex items-center gap-2 hover:text-foreground transition-colors"
                  >
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

          <div className="space-y-3 md:col-span-2">
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
            </div>

            <div className="pt-4 text-xs text-muted-foreground flex flex-wrap items-center gap-3">
              <span>© {new Date().getFullYear()} {t('site_name')}</span>
              <Link to={`/${currentLang}`} className="hover:text-foreground transition-colors">
                {t('home')}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

