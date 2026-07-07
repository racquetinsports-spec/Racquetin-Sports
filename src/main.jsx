import React, { lazy, Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import App from './App';
import { AuthProvider } from './hooks/useAuth';

// Admin is a completely separate layout — lazy-load the whole chunk
const AdminLayout = lazy(() => import('./pages/admin/AdminDashboard').then(m => ({ default: m.AdminLayout })));
const AdminHome   = lazy(() => import('./pages/admin/AdminDashboard').then(m => ({ default: m.AdminHome })));
const AdminProductsPage     = lazy(() => import('./pages/admin/AdminPages').then(m => ({ default: m.AdminProductsPage })));
const AdminCategoriesPage   = lazy(() => import('./pages/admin/AdminPages').then(m => ({ default: m.AdminCategoriesPage })));
const AdminOrdersPage       = lazy(() => import('./pages/admin/AdminPages').then(m => ({ default: m.AdminOrdersPage })));
const AdminOrderDetailPage  = lazy(() => import('./pages/admin/AdminPages').then(m => ({ default: m.AdminOrderDetailPage })));
const AdminCustomersPage    = lazy(() => import('./pages/admin/AdminPages').then(m => ({ default: m.AdminCustomersPage })));
const AdminNewsletterPage   = lazy(() => import('./pages/admin/AdminPages').then(m => ({ default: m.AdminNewsletterPage })));
const AdminSettingsPage     = lazy(() => import('./pages/admin/AdminPages').then(m => ({ default: m.AdminSettingsPage })));
const AdminContentPage      = lazy(() => import('./pages/admin/AdminPages').then(m => ({ default: m.AdminContentPage })));

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Admin routes — standalone layout, separate chunk */}
          <Route path="/admin" element={
            <Suspense fallback={<div style={{ padding: 32, color: '#999', fontSize: 13 }}>Loading admin...</div>}>
              <AdminLayout />
            </Suspense>
          }>
            <Route index element={<Suspense fallback={null}><AdminHome /></Suspense>} />
            <Route path="products" element={<Suspense fallback={null}><AdminProductsPage /></Suspense>} />
            <Route path="categories" element={<Suspense fallback={null}><AdminCategoriesPage /></Suspense>} />
            <Route path="orders" element={<Suspense fallback={null}><AdminOrdersPage /></Suspense>} />
            <Route path="orders/:id" element={<Suspense fallback={null}><AdminOrderDetailPage /></Suspense>} />
            <Route path="customers" element={<Suspense fallback={null}><AdminCustomersPage /></Suspense>} />
            <Route path="newsletter" element={<Suspense fallback={null}><AdminNewsletterPage /></Suspense>} />
            <Route path="settings" element={<Suspense fallback={null}><AdminSettingsPage /></Suspense>} />
            <Route path="content" element={<Suspense fallback={null}><AdminContentPage /></Suspense>} />
            <Route path="*" element={<div style={{ padding: 32, color: '#777' }}>Page not found</div>} />
          </Route>

          {/* All storefront routes */}
          <Route path="/*" element={<App />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
