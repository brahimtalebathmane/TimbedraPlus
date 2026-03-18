import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import Header from './components/Header';
import ProtectedRoute from './components/ProtectedRoute';

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

function LoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
    </div>
  );
}

function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      {children}
    </>
  );
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

          <Route
            path="/:lang/:slug"
            element={
              <PublicLayout>
                <Article />
              </PublicLayout>
            }
          />

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
            <Route path="videos" element={<VideosAdmin />} />
            <Route path="videos/:id" element={<VideoForm />} />
            <Route path="streams" element={<StreamsAdmin />} />
            <Route path="contact-settings" element={<ContactSettingsAdmin />} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
