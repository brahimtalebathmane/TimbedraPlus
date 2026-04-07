import { useTranslation } from 'react-i18next';
import { BarChart3 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DashboardAnalyticsSection } from '@/pages/admin/DashboardAnalyticsSection';

export default function AnalyticsAdmin() {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" />
            {t('analytics_menu')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{t('analytics_section_title')}</p>
        </CardContent>
      </Card>

      <div className="mt-0">
        <DashboardAnalyticsSection />
      </div>
    </div>
  );
}

