import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/lib/supabase';
 

type ContactInfo = {
  email?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  facebook?: string | null;
  twitter?: string | null;
  instagram?: string | null;
  youtube?: string | null;
};

function normalizeWhatsappLink(whatsapp: string) {
  const value = whatsapp.trim();
  if (!value) return null;
  if (value.startsWith('http://') || value.startsWith('https://')) return value;
  // If a number is provided like +216123..., convert to wa.me format.
  const digits = value.replace(/[^\d]/g, '');
  if (!digits) return null;
  return `https://wa.me/${digits}`;
}

export default function Contact() {
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language;

  const [contact, setContact] = useState<ContactInfo | null>(null);
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const fetchContact = async () => {
      setLoading(true);
      try {
        const { data } = await supabase
          .from('contact_info')
          .select('*')
          .order('updated_at', { ascending: false })
          .limit(1);

        if (data && data.length > 0) setContact(data[0] as ContactInfo);
      } finally {
        setLoading(false);
      }
    };

    fetchContact();
  }, [currentLang]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !message.trim()) {
      toast.error(t('error'));
      return;
    }

    setSending(true);
    try {
      const { error } = await supabase.from('messages').insert({
        name: name.trim(),
        email: email.trim(),
        message: message.trim(),
      });
      if (error) throw error;

      toast.success(t('success'));
      setName('');
      setEmail('');
      setMessage('');
    } catch (err: any) {
      toast.error(err?.message || t('error'));
    } finally {
      setSending(false);
    }
  };

  const whatsappLink = contact?.whatsapp ? normalizeWhatsappLink(contact.whatsapp) : null;

  return (
    <>
      <Helmet>
        <title>{t('contact')} - {t('site_name')}</title>
        <meta name="description" content={t('contact')} />
      </Helmet>

      <div className="container mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold mb-8">{t('contact')}</h1>

        {loading ? (
          <div className="grid md:grid-cols-2 gap-6">
            <div className="animate-pulse">
              <div className="h-56 bg-muted rounded-lg mb-4" />
              <div className="h-6 bg-muted rounded w-10/12" />
            </div>
            <div className="animate-pulse">
              <div className="h-56 bg-muted rounded-lg mb-4" />
              <div className="h-6 bg-muted rounded w-10/12" />
            </div>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">Contact</Badge>
                </div>

                <div className="space-y-2">
                  {contact?.email && (
                    <div>
                      <div className="text-sm text-muted-foreground">{t('email')}</div>
                      <a className="text-primary hover:underline" href={`mailto:${contact.email}`}>
                        {contact.email}
                      </a>
                    </div>
                  )}

                  {contact?.phone && (
                    <div>
                      <div className="text-sm text-muted-foreground">Phone</div>
                      <a className="text-primary hover:underline" href={`tel:${contact.phone}`}>
                        {contact.phone}
                      </a>
                    </div>
                  )}

                  {whatsappLink && (
                    <div>
                      <div className="text-sm text-muted-foreground">WhatsApp</div>
                      <a className="text-primary hover:underline" href={whatsappLink} target="_blank" rel="noreferrer">
                        {contact?.whatsapp}
                      </a>
                    </div>
                  )}

                  {contact?.facebook && (
                    <div>
                      <div className="text-sm text-muted-foreground">Facebook</div>
                      <a className="text-primary hover:underline" href={contact.facebook} target="_blank" rel="noreferrer">
                        Facebook
                      </a>
                    </div>
                  )}

                  {contact?.twitter && (
                    <div>
                      <div className="text-sm text-muted-foreground">Twitter</div>
                      <a className="text-primary hover:underline" href={contact.twitter} target="_blank" rel="noreferrer">
                        Twitter
                      </a>
                    </div>
                  )}

                  {contact?.instagram && (
                    <div>
                      <div className="text-sm text-muted-foreground">Instagram</div>
                      <a className="text-primary hover:underline" href={contact.instagram} target="_blank" rel="noreferrer">
                        Instagram
                      </a>
                    </div>
                  )}

                  {contact?.youtube && (
                    <div>
                      <div className="text-sm text-muted-foreground">YouTube</div>
                      <a className="text-primary hover:underline" href={contact.youtube} target="_blank" rel="noreferrer">
                        YouTube
                      </a>
                    </div>
                  )}
                </div>

                {contact ? (
                  <div className="text-sm text-muted-foreground">
                    {/* Keeping it simple: actual “last updated” would require storing it in UI. */}
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">No contact information set.</div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <form onSubmit={onSubmit} className="space-y-4">
                  <div>
                    <div className="text-sm text-muted-foreground">{t('name')}</div>
                    <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t('name')} />
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">{t('email')}</div>
                    <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t('email')} />
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">{t('message')}</div>
                    <Textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder={t('message')} />
                  </div>
                  <Button type="submit" disabled={sending} className="w-full">
                    {sending ? t('loading') : t('send')}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </>
  );
}

