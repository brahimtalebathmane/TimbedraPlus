import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Menu,
  X,
  Moon,
  Sun,
  Globe,
  ChevronDown,
  User,
  LogOut,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useTheme } from '@/components/theme-provider';
import { useAuth } from '@/contexts/AuthContext';
import { supabase, Category } from '@/lib/supabase';
import { CategoryIcon } from '@/components/CategoryIcon';
import { useSupabaseRealtime } from '@/hooks/useSupabaseRealtime';

export default function Header() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, setTheme } = useTheme();
  const { user, isAdmin, signOut } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);

  const currentLang = i18n.language;
  const isRTL = currentLang === 'ar';

  useEffect(() => {
    document.dir = isRTL ? 'rtl' : 'ltr';
    document.documentElement.lang = currentLang;
  }, [currentLang, isRTL]);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    const { data } = await supabase
      .from('categories')
      .select('*')
      .order('created_at', { ascending: true });
    if (data) setCategories(data);
  };

  useSupabaseRealtime({
    tables: ['categories'],
    channelKey: 'rt:categories',
    onChange: () => {
      fetchCategories();
    },
  });

  const changeLanguage = (lang: string) => {
    const currentPath = location.pathname;
    const pathWithoutLang = currentPath.replace(/^\/(ar|fr)/, '');
    i18n.changeLanguage(lang);
    navigate(`/${lang}${pathWithoutLang || ''}`);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/${currentLang}/search?q=${encodeURIComponent(searchQuery)}`);
      setSearchOpen(false);
      setSearchQuery('');
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate(`/${currentLang}`);
  };

  return (
    <>
      <header
        className="sticky z-50 bg-background/90 backdrop-blur border-b border-border shadow-sm"
        style={{ top: 'var(--ticker-h, 0px)' }}
      >
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <Link to={`/${currentLang}`} className="flex items-center gap-3">
              <img
                src="https://i.postimg.cc/Wp0Wgnrs/jugiukj.png"
                alt={t('site_name')}
                className="h-10 w-auto"
              />
            </Link>

            <nav className="hidden md:flex items-center gap-6">
              <Link
                to={`/${currentLang}`}
                className="hover:text-primary transition-colors font-medium text-foreground/90"
              >
                {t('home')}
              </Link>

              <DropdownMenu>
                <DropdownMenuTrigger className="flex items-center gap-1 hover:text-primary transition-colors font-medium text-foreground/90">
                  {t('categories')}
                  <ChevronDown className="w-4 h-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align={isRTL ? 'end' : 'start'}>
                  {categories.map((category) => {
                    const label = category[`name_${currentLang}` as keyof Category] as string;
                    return (
                      <DropdownMenuItem key={category.id} asChild>
                        <Link
                          to={`/${currentLang}/category/${category.slug}`}
                          className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}
                        >
                          <CategoryIcon category={category} boxSize={20} iconSize={12} />
                          <span className="truncate">{label}</span>
                        </Link>
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>

              <Link
                to={`/${currentLang}/videos`}
                className="hover:text-primary transition-colors font-medium text-foreground/90"
              >
                {t('videos')}
              </Link>

              <Link
                to={`/${currentLang}/contact`}
                className="hover:text-primary transition-colors font-medium text-foreground/90"
              >
                {t('contact')}
              </Link>

              <Link
                to={`/${currentLang}/streams`}
                className="hover:text-primary transition-colors font-medium text-foreground/90"
              >
                {t('streams')}
              </Link>
            </nav>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSearchOpen(!searchOpen)}
                className="text-foreground/80 hover:bg-muted"
              >
                <Search className="w-5 h-5" />
              </Button>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="text-foreground/80 hover:bg-muted"
              >
                {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-foreground/80 hover:bg-muted"
                  >
                    <Globe className="w-5 h-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align={isRTL ? 'end' : 'start'}>
                  <DropdownMenuItem onClick={() => changeLanguage('ar')}>
                    {t('arabic')}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => changeLanguage('fr')}>
                    {t('french')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-foreground/80 hover:bg-muted"
                    >
                      <User className="w-5 h-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align={isRTL ? 'end' : 'start'}>
                    {isAdmin && (
                      <DropdownMenuItem asChild>
                        <Link to="/admin">{t('admin_dashboard')}</Link>
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={handleSignOut}>
                      <LogOut className="w-4 h-4 mr-2" />
                      {t('logout')}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate(`/${currentLang}/login`)}
                  className="text-foreground/80 hover:bg-muted hidden md:inline-flex"
                >
                  {t('login')}
                </Button>
              )}

              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden text-foreground/80 hover:bg-muted"
                aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
                aria-expanded={mobileMenuOpen}
                aria-controls="mobile-menu"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </Button>
            </div>
          </div>
        </div>

        <AnimatePresence>
          {searchOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="border-t border-border/60 overflow-hidden"
            >
              <div className="container mx-auto px-4 py-4">
                <form onSubmit={handleSearch} className="max-w-2xl mx-auto">
                  <Input
                    type="search"
                    placeholder={t('search')}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-muted/40 text-foreground placeholder:text-muted-foreground border-border/60"
                  />
                </form>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              id="mobile-menu"
              className="md:hidden border-t border-border/60 overflow-y-auto max-h-[calc(100vh-4rem)]"
              style={{ WebkitOverflowScrolling: 'touch' }}
            >
              <nav className="container mx-auto px-4 py-4 flex flex-col gap-3 pb-8">
                <Link
                  to={`/${currentLang}`}
                  onClick={() => setMobileMenuOpen(false)}
                  className="py-2 hover:text-primary transition-colors font-medium"
                >
                  {t('home')}
                </Link>
                {categories.map((category) => (
                  <Link
                    key={category.id}
                    to={`/${currentLang}/category/${category.slug}`}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`py-2 hover:text-primary transition-colors flex items-center gap-2 ${
                      isRTL ? 'flex-row-reverse' : 'flex-row'
                    }`}
                  >
                    <CategoryIcon category={category} boxSize={20} iconSize={12} />
                    {category[`name_${currentLang}` as keyof Category] as string}
                  </Link>
                ))}
                <Link
                  to={`/${currentLang}/videos`}
                  onClick={() => setMobileMenuOpen(false)}
                  className="py-2 hover:text-primary transition-colors font-medium"
                >
                  {t('videos')}
                </Link>
                <Link
                  to={`/${currentLang}/contact`}
                  onClick={() => setMobileMenuOpen(false)}
                  className="py-2 hover:text-primary transition-colors font-medium"
                >
                  {t('contact')}
                </Link>
                <Link
                  to={`/${currentLang}/streams`}
                  onClick={() => setMobileMenuOpen(false)}
                  className="py-2 hover:text-primary transition-colors font-medium"
                >
                  {t('streams')}
                </Link>
                {!user && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      navigate(`/${currentLang}/login`);
                    }}
                    className="mt-2"
                  >
                    {t('login')}
                  </Button>
                )}
              </nav>
            </motion.div>
          )}
        </AnimatePresence>
      </header>
    </>
  );
}
