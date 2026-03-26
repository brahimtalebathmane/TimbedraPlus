import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Suspense, lazy, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Header from './components/Header';
import BreakingTicker from './components/BreakingTicker';
import ProtectedRoute from './components/ProtectedRoute';
import Footer from './components/Footer';

const Home = lazy(() => import('./pages/Home'));
const Article = lazy(() => import('./pages/Article'));
const Search = lazy(() => import('./pages/Search'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const Videos = lazy(() => import('./pages/Videos'));
const Contact = lazy(() => import('./pages/Contact'));
const Streams = lazy(() => import('./pages/Streams'));
const Category = lazy(() => import('./pages/Category'));
const AdminLayout = lazy(() => import('./pages/admin/AdminLayout'));
const Dashboard = lazy(() => import('./pages/admin/Dashboard'));
const Posts = lazy(() => import('./pages/admin/Posts'));
const PostForm = lazy(() => import('./pages/admin/PostForm'));
const Categories = lazy(() => import('./pages/admin/Categories'));
const VideosAdmin = lazy(() => import('./pages/admin/Videos'));
const VideoForm = lazy(() => import('./pages/admin/VideoForm'));
const StreamsAdmin = lazy(() => import('./pages/admin/Streams'));
const ContactSettingsAdmin = lazy(() => import('./pages/admin/ContactSettings'));
const CommentsAdmin = lazy(() => import('./pages/admin/Comments'));
const UsersAdmin = lazy(() => import('./pages/admin/Users'));
const MediaLibrary = lazy(() => import('./pages/admin/MediaLibrary'));
const AdsAdmin = lazy(() => import('./pages/admin/Ads'));
const AdForm = lazy(() => import('./pages/admin/AdForm'));
const TickerSettingsAdmin = lazy(() => import('./pages/admin/TickerSettings'));

function LoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
    </div>
  );
}

function PublicLayout({ children }: { children: React.ReactNode }) {
  const [tickerEnabled, setTickerEnabled] = useState(true);
  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ ['--ticker-h' as never]: tickerEnabled ? '36px' : '0px' }}
    >
      <BreakingTicker onEnabledChange={setTickerEnabled} heightPx={36} />
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}

function NotFound() {
  const { i18n } = useTranslation();
  return <Navigate to={`/${i18n.language}`} replace />;
}

function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<LoadingFallback />}>
        <Routes>
          <Route path="/" element={<Navigate to="/ar" replace />} />

          <Route
            path="/:lang"
            element={
              <PublicLayout>
                <Home />
              </PublicLayout>
            }
          />

          <Route
            path="/:lang/videos"
            element={
              <PublicLayout>
                <Videos />
              </PublicLayout>
            }
          />

          <Route
            path="/:lang/contact"
            element={
              <PublicLayout>
                <Contact />
              </PublicLayout>
            }
          />

          <Route
            path="/:lang/streams"
            element={
              <PublicLayout>
                <Streams />
              </PublicLayout>
            }
          />

          <Route
            path="/:lang/category/:slug"
            element={
              <PublicLayout>
                <Category />
              </PublicLayout>
            }
          />

          <Route
            path="/:lang/login"
            element={
              <PublicLayout>
                <Login />
              </PublicLayout>
            }
          />

          <Route
            path="/:lang/register"
            element={
              <PublicLayout>
                <Register />
              </PublicLayout>
            }
          />

          <Route
            path="/:lang/search"
            element={
              <PublicLayout>
                <Search />
              </PublicLayout>
            }
          />

          <Route path="/:lang/admin" element={<Navigate to="/admin" replace />} />
          <Route path="/:lang/admin/*" element={<Navigate to="/admin" replace />} />

          <Route
            path="/:lang/:slug"
            element={
              <PublicLayout>
                <Article />
              </PublicLayout>
            }
          />

          <Route path="*" element={<PublicLayout><NotFound /></PublicLayout>} />

          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="posts" element={<Posts />} />
            <Route path="posts/:id" element={<PostForm />} />
            <Route path="categories" element={<Categories />} />
            <Route path="media" element={<MediaLibrary />} />
            <Route path="ads" element={<AdsAdmin />} />
            <Route path="ads/:id" element={<AdForm />} />
            <Route path="videos" element={<VideosAdmin />} />
            <Route path="videos/:id" element={<VideoForm />} />
            <Route path="streams" element={<StreamsAdmin />} />
            <Route path="contact-settings" element={<ContactSettingsAdmin />} />
            <Route path="ticker" element={<TickerSettingsAdmin />} />
            <Route path="comments" element={<CommentsAdmin />} />
            <Route path="users" element={<UsersAdmin />} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
