import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { AppShell } from './components/layout/AppShell';

// Auth Pages
import { Login } from './pages/Auth/Login';
import { SignUp } from './pages/Auth/SignUp';
import { ForgotPassword } from './pages/Auth/ForgotPassword';

// App Pages
import { Overview } from './pages/Overview/Overview';
import { SubscriptionsList } from './pages/Subscriptions/SubscriptionsList';
import { AddSubscriptionPage } from './pages/Subscriptions/AddSubscriptionPage';
import { Reminders } from './pages/Reminders/Reminders';
import { CancellationGuidance } from './pages/Cancellation/CancellationGuidance';
import { Settings } from './pages/Settings/Settings';
import { HelpSupport } from './pages/Help/HelpSupport';

// Route Protection Component: only authenticated users can access children
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="w-8 h-8 border-3 border-[#0030B2]/30 border-t-[#0030B2] rounded-full animate-spin" />
      </div>
    );
  }

  // Allow unauthenticated visitors from the login screen to access Help & IT Support publicly
  if (!user && location.pathname === '/help') {
    return <HelpSupport isPublic />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

// Public-only Route: redirects authenticated users away from auth pages to /overview
const PublicOnlyRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="w-8 h-8 border-3 border-[#0030B2]/30 border-t-[#0030B2] rounded-full animate-spin" />
      </div>
    );
  }

  if (user) {
    return <Navigate to="/overview" replace />;
  }

  return <>{children}</>;
};

// Root Route: sends authenticated users to /overview, unauthenticated users to /login
const RootRedirect: React.FC = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="w-8 h-8 border-3 border-[#0030B2]/30 border-t-[#0030B2] rounded-full animate-spin" />
      </div>
    );
  }

  return user ? <Navigate to="/overview" replace /> : <Navigate to="/login" replace />;
};

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Root Route: strictly directs to /overview if authenticated, or /login if unauthenticated */}
            <Route path="/" element={<RootRedirect />} />

            {/* Public Auth Routes */}
            <Route
              path="/login"
              element={
                <PublicOnlyRoute>
                  <Login />
                </PublicOnlyRoute>
              }
            />
            <Route
              path="/login/email"
              element={
                <PublicOnlyRoute>
                  <Login />
                </PublicOnlyRoute>
              }
            />
            <Route path="/login/mobile" element={<Navigate to="/login" replace />} />
            <Route
              path="/signup"
              element={
                <PublicOnlyRoute>
                  <SignUp />
                </PublicOnlyRoute>
              }
            />
            <Route path="/forgot-password" element={<ForgotPassword />} />

            {/* Authenticated Application Shell */}
            <Route
              element={
                <ProtectedRoute>
                  <AppShell />
                </ProtectedRoute>
              }
            >
              <Route path="/overview" element={<Overview />} />
              <Route path="/subscriptions" element={<SubscriptionsList />} />
              <Route path="/subscriptions/new" element={<AddSubscriptionPage />} />
              <Route path="/subscriptions/upload" element={<AddSubscriptionPage />} />
              <Route path="/reminders" element={<Reminders />} />
              <Route path="/cancellation-guidance" element={<CancellationGuidance />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/help" element={<HelpSupport />} />
            </Route>

            {/* Fallback: any unknown route routes via RootRedirect */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
};
