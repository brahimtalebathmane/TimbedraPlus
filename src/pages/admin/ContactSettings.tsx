import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { supabase, ContactInfo } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

function toNull(v: string) {
  const s = v.trim();
  return s.length ? s : null;
}

export default function ContactSettings() {
  const { t } = useTranslation();

  const [loading, setLoading] = useState(true);
  const [row, setRow] = useState<ContactInfo | null>(null);

  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [facebook, setFacebook] = useState('');
  const [twitter, setTwitter] = useState('');
  const [instagram, setInstagram] = useState('');
  const [youtube, setYoutube] = useState('');
  const [linkedin, setLinkedin] = useState('');
  const [snapchat, setSnapchat] = useState('');
  const [tiktok, setTiktok] = useState('');

  const fetchRow = async () => {
    const { data, error } = await supabase
      .from('contact_info')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(1);
    if (error) throw error;
    if (data && data.length > 0) setRow(data[0] as ContactInfo);
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        await fetchRow();
      } catch (err: unknown) {
        console.error(err);
        toast.error(t('error'));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    if (!row) return;
    setEmail(row.email ?? '');
    setPhone(row.phone ?? '');
    setWhatsapp(row.whatsapp ?? '');
    setFacebook(row.facebook ?? '');
    setTwitter(row.twitter ?? '');
    setInstagram(row.instagram ?? '');
    setYoutube(row.youtube ?? '');
    setLinkedin(row.linkedin ?? '');
    setSnapchat(row.snapchat ?? '');
    setTiktok(row.tiktok ?? '');
  }, [row]);

  const handleSubmit = async () => {
    try {
      const payload = {
        email: toNull(email),
        phone: toNull(phone),
        whatsapp: toNull(whatsapp),
        facebook: toNull(facebook),
        twitter: toNull(twitter),
        instagram: toNull(instagram),
        youtube: toNull(youtube),
        linkedin: toNull(linkedin),
        snapchat: toNull(snapchat),
        tiktok: toNull(tiktok),
        updated_at: new Date().toISOString(),
      };

      if (row) {
        const { error } = await supabase.from('contact_info').update(payload).eq('id', row.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('contact_info')
          .insert(payload as Record<string, unknown>);
        if (error) throw error;
      }

      toast.success(t('success'));
      await fetchRow();
    } catch (err: unknown) {
      console.error(err);
      toast.error(t('error'));
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">{t('contact_settings')}</h1>
      <Card>
        <CardHeader>
          <CardTitle>{t('edit_contact_social_links')}</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="p-6 text-muted-foreground">{t('loading')}</div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-muted-foreground mb-2">{t('email')}</div>
                <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t('email')} />
              </div>
              <div>
                <div className="text-sm text-muted-foreground mb-2">{t('phone')}</div>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder={t('phone_placeholder')} />
              </div>
              <div>
                <div className="text-sm text-muted-foreground mb-2">{t('whatsapp')}</div>
                <Input value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder={t('whatsapp_placeholder')} />
              </div>
              <div>
                <div className="text-sm text-muted-foreground mb-2">{t('facebook')}</div>
                <Input value={facebook} onChange={(e) => setFacebook(e.target.value)} placeholder={t('facebook_placeholder')} />
              </div>
              <div>
                <div className="text-sm text-muted-foreground mb-2">{t('twitter')}</div>
                <Input value={twitter} onChange={(e) => setTwitter(e.target.value)} placeholder={t('twitter_placeholder')} />
              </div>
              <div>
                <div className="text-sm text-muted-foreground mb-2">{t('instagram')}</div>
                <Input value={instagram} onChange={(e) => setInstagram(e.target.value)} placeholder={t('instagram_placeholder')} />
              </div>
              <div className="md:col-span-2">
                <div className="text-sm text-muted-foreground mb-2">{t('youtube')}</div>
                <Textarea value={youtube} onChange={(e) => setYoutube(e.target.value)} rows={2} placeholder={t('youtube_placeholder')} />
              </div>
              <div>
                <div className="text-sm text-muted-foreground mb-2">{t('linkedin')}</div>
                <Input value={linkedin} onChange={(e) => setLinkedin(e.target.value)} placeholder={t('linkedin_placeholder')} />
              </div>
              <div>
                <div className="text-sm text-muted-foreground mb-2">{t('snapchat')}</div>
                <Input value={snapchat} onChange={(e) => setSnapchat(e.target.value)} placeholder={t('snapchat_placeholder')} />
              </div>
              <div className="md:col-span-2">
                <div className="text-sm text-muted-foreground mb-2">{t('tiktok')}</div>
                <Input value={tiktok} onChange={(e) => setTiktok(e.target.value)} placeholder={t('tiktok_placeholder')} />
              </div>

              <div className="md:col-span-2 flex gap-4">
                <Button type="button" onClick={handleSubmit}>
                  {t('save')}
                </Button>
                <Button type="button" variant="outline" onClick={() => {
                  if (!row) return;
                  setEmail(row.email ?? '');
                  setPhone(row.phone ?? '');
                  setWhatsapp(row.whatsapp ?? '');
                  setFacebook(row.facebook ?? '');
                  setTwitter(row.twitter ?? '');
                  setInstagram(row.instagram ?? '');
                  setYoutube(row.youtube ?? '');
                  setLinkedin(row.linkedin ?? '');
                  setSnapchat(row.snapchat ?? '');
                  setTiktok(row.tiktok ?? '');
                }}>
                  {t('cancel')}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

