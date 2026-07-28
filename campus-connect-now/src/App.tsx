import { useEffect, lazy, Suspense, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { BrowserRouter, Route, Routes, Navigate, useLocation } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuthStore } from "@/store/authStore";
import { useProfileStore } from "@/store/profileStore";
import { useNotificationStore } from "@/store/notificationStore";
import { alumniProfileService } from "@/services/alumniService";
import { userApi } from "@/services/api";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";
import { Loader } from "@/components/Loader";
import { startHealthCheckInterval, checkBackendHealth } from "@/services/connectionService";
import { ConnectionStatusIndicator, ConnectionErrorAlert } from "@/components/ConnectionStatus";
import { getApiConfig } from "@/config/apiConfig";

if (typeof window !== 'undefined') {
  const originalSetItem = window.localStorage.setItem;
  window.localStorage.setItem = function (key, value) {
    try {
      originalSetItem.apply(this, arguments as any);
    } catch (e: any) {
      if (e.name === 'QuotaExceededError' || e.code === 22 || e.number === 0x8007000E) {
        console.warn(`⚠️ [localStorage] Storage quota exceeded for key "${key}". Skipping persistence to prevent crash.`);
      } else {
        throw e;
      }
    }
  };

  try {
    const keys = ['campus-connect-profile', 'campus-connect-auth'];
    keys.forEach(k => {
      const val = localStorage.getItem(k);
      if (val && val.length > 500000) {
        console.log(`🧹 [localStorage] Evicting oversized legacy entry for "${k}" (${val.length} chars)`);
        localStorage.removeItem(k);
      }
    });
  } catch (e) {
    console.error('Failed to run localStorage cleanup:', e);
  }
}

// Lazy load all pages with proper error handling
const WelcomePage = lazy(() => import("./pages/WelcomePage.tsx").catch(err => {
  console.error('[Lazy Load Error] WelcomePage:', err);
  throw err;
}));
const ResetPasswordPage = lazy(() => import("./pages/ResetPasswordPage.tsx").catch(err => {
  console.error('[Lazy Load Error] ResetPasswordPage:', err);
  throw err;
}));
const SecurityDashboardPage = lazy(() => import("./pages/SecurityDashboardPage.tsx").catch(err => {
  console.error('[Lazy Load Error] SecurityDashboardPage:', err);
  throw err;
}));
const ProfileSetupPage = lazy(() => import("./pages/ProfileSetupPage.tsx").catch(err => {
  console.error('[Lazy Load Error] ProfileSetupPage:', err);
  throw err;
}));
const HomePage = lazy(() => import("./pages/HomePage.tsx").catch(err => {
  console.error('[Lazy Load Error] HomePage:', err);
  throw err;
}));
const ChatListPage = lazy(() => import("./pages/ChatListPage.tsx").catch(err => {
  console.error('[Lazy Load Error] ChatListPage:', err);
  throw err;
}));
const ChatPage = lazy(() => import("./pages/ChatPage.tsx").catch(err => {
  console.error('[Lazy Load Error] ChatPage:', err);
  throw err;
}));
const FeedPage = lazy(() => import("./pages/FeedPage.tsx").catch(err => {
  console.error('[Lazy Load Error] FeedPage:', err);
  throw err;
}));
const PremiumAlumniFeedPage = lazy(() => import("./pages/PremiumAlumniFeedPage.tsx").catch(err => {
  console.error('[Lazy Load Error] PremiumAlumniFeedPage:', err);
  throw err;
}));
const RequestsPage = lazy(() => import("./pages/RequestsPage.tsx").catch(err => {
  console.error('[Lazy Load Error] RequestsPage:', err);
  throw err;
}));
const NotificationsPage = lazy(() => import("./pages/NotificationsPage.tsx").catch(err => {
  console.error('[Lazy Load Error] NotificationsPage:', err);
  throw err;
}));
const ProfilePage = lazy(() => import("./pages/ProfilePage.tsx").catch(err => {
  console.error('[Lazy Load Error] ProfilePage:', err);
  throw err;
}));
const AdminDashboardPage = lazy(() => import("./pages/AdminDashboardPage.tsx").catch(err => {
  console.error('[Lazy Load Error] AdminDashboardPage:', err);
  throw err;
}));
const GroupChatPage = lazy(() => import("./pages/GroupChatPage.tsx").catch(err => {
  console.error('[Lazy Load Error] GroupChatPage:', err);
  throw err;
}));
const NotFound = lazy(() => import("./pages/NotFound.tsx").catch(err => {
  console.error('[Lazy Load Error] NotFound:', err);
  throw err;
}));
const StudentDiscoveryPage = lazy(() => import("./pages/StudentDiscoveryPage.tsx").catch(err => {
  console.error('[Lazy Load Error] StudentDiscoveryPage:', err);
  throw err;
}));
const StudentProfileDetailPage = lazy(() => import("./pages/StudentProfileDetailPage.tsx").catch(err => {
  console.error('[Lazy Load Error] StudentProfileDetailPage:', err);
  throw err;
}));
const ProfilePageDispatcher = lazy(() => import("./pages/ProfilePageDispatcher.tsx").catch(err => {
  console.error('[Lazy Load Error] ProfilePageDispatcher:', err);
  throw err;
}));
const PlacementDetailPage = lazy(() => import("./pages/PlacementDetailPage.tsx").catch(err => {
  console.error('[Lazy Load Error] PlacementDetailPage:', err);
  throw err;
}));
const SwipeNavigator = lazy(() => import("./components/SwipeNavigator.tsx").catch(err => {
  console.error('[Lazy Load Error] SwipeNavigator:', err);
  throw err;
}));

const PrivacySafetyPage = lazy(() => import("./pages/PrivacySafetyPage.tsx").catch(err => {
  console.error('[Lazy Load Error] PrivacySafetyPage:', err);
  throw err;
}));
const SecuritySettings = lazy(() => import("./pages/SecuritySettings.tsx").catch(err => {
  console.error('[Lazy Load Error] SecuritySettings:', err);
  throw err;
}));
const HelpSupportPage = lazy(() => import("./pages/HelpSupportPage.tsx").catch(err => {
  console.error('[Lazy Load Error] HelpSupportPage:', err);
  throw err;
}));
const SettingsPage = lazy(() => import("./pages/SettingsPage.tsx").catch(err => {
  console.error('[Lazy Load Error] SettingsPage:', err);
  throw err;
}));

// Lazy load Alumni pages
const AlumniExplorerPage = lazy(() => import("./pages/AlumniExplorerPage.tsx").catch(err => {
  console.error('[Lazy Load Error] AlumniExplorerPage:', err);
  throw err;
}));
const AlumniDetailPage = lazy(() => import("./pages/AlumniDetailPage.tsx").catch(err => {
  console.error('[Lazy Load Error] AlumniDetailPage:', err);
  throw err;
}));
const MyAlumniProfilePage = lazy(() => import("./pages/MyAlumniProfilePage.tsx").catch(err => {
  console.error('[Lazy Load Error] MyAlumniProfilePage:', err);
  throw err;
}));
const AdminAlumniPanelPage = lazy(() => import("./pages/AdminAlumniPanelPage.tsx").catch(err => {
  console.error('[Lazy Load Error] AdminAlumniPanelPage:', err);
  throw err;
}));
const AlumniHomePage = lazy(() => import("./pages/alumni/AlumniHomePage.tsx").catch(err => {
  console.error('[Lazy Load Error] AlumniHomePage:', err);
  throw err;
}));
const AlumniPostCreatePage = lazy(() => import("./pages/alumni/AlumniPostCreatePage.tsx").catch(err => {
  console.error('[Lazy Load Error] AlumniPostCreatePage:', err);
  throw err;
}));
const AlumniMyPostsPage = lazy(() => import("./pages/alumni/AlumniMyPostsPage.tsx").catch(err => {
  console.error('[Lazy Load Error] AlumniMyPostsPage:', err);
  throw err;
}));
const AlumniNetworkPage = lazy(() => import("./pages/alumni/AlumniNetworkPage.tsx").catch(err => {
  console.error('[Lazy Load Error] AlumniNetworkPage:', err);
  throw err;
}));

const AlumniPostFeedPage = lazy(() => import("./pages/AlumniPostFeedPage.tsx").catch(err => {
  console.error('[Lazy Load Error] AlumniPostFeedPage:', err);
  throw err;
}));
const AlumniDiscoveryPage = lazy(() => import("./pages/AlumniDiscoveryPage.tsx").catch(err => {
  console.error('[Lazy Load Error] AlumniDiscoveryPage:', err);
  throw err;
}));
const AlumniSocialFeedPage = lazy(() => import("./pages/AlumniSocialFeedPage.tsx").catch(err => {
  console.error('[Lazy Load Error] AlumniSocialFeedPage:', err);
  throw err;
}));
const AlumniProfileDetailPage = lazy(() => import("./pages/AlumniProfileDetailPage.tsx").catch(err => {
  console.error('[Lazy Load Error] AlumniProfileDetailPage:', err);
  throw err;
}));
const PremiumAlumniNetworkingPage = lazy(() => import("./pages/PremiumAlumniNetworkingPage.tsx").catch(err => {
  console.error('[Lazy Load Error] PremiumAlumniNetworkingPage:', err);
  throw err;
}));

const queryClient = new QueryClient();

const PageLoader = () => (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <Loader size="lg" />
  </div>
);

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);
  const isProfileComplete = useAuthStore(s => s.isProfileComplete);
  const role = useAuthStore(s => s.role);
  if (!isAuthenticated) return <Navigate to="/" replace />;
  
  // If onboarding is not complete, redirect to /setup
  if (!isProfileComplete) return <Navigate to="/setup" replace />;
  
  // If user is alumni or admin, they shouldn't access standard student routes (/home, /feed, etc.)
  if (role === 'alumni') return <Navigate to="/alumni/dashboard" replace />;
  if (role === 'admin') return <Navigate to="/admin" replace />;
  
  return <>{children}</>;
};

const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);
  const role = useAuthStore(s => s.role);
  if (!isAuthenticated) return <Navigate to="/" replace />;
  if (role !== 'admin') {
    if (role === 'alumni') return <Navigate to="/alumni/dashboard" replace />;
    return <Navigate to="/student/dashboard" replace />;
  }
  return <>{children}</>;
};

const AlumniRoute = ({ children }: { children: React.ReactNode }) => {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);
  const isProfileComplete = useAuthStore(s => s.isProfileComplete);
  const role = useAuthStore(s => s.role);
  if (!isAuthenticated) return <Navigate to="/" replace />;
  
  // If onboarding is not complete, redirect to /setup
  if (!isProfileComplete) return <Navigate to="/setup" replace />;
  
  if (role !== 'alumni') {
    if (role === 'admin') return <Navigate to="/admin" replace />;
    return <Navigate to="/student/dashboard" replace />;
  }
  return <>{children}</>;
};

const AuthOnlyRoute = ({ children }: { children: React.ReactNode }) => {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);
  const isProfileComplete = useAuthStore(s => s.isProfileComplete);
  if (!isAuthenticated) return <Navigate to="/" replace />;
  if (!isProfileComplete) return <Navigate to="/setup" replace />;
  return <>{children}</>;
};

const SetupRoute = ({ children }: { children: React.ReactNode }) => {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);
  if (!isAuthenticated) return <Navigate to="/" replace />;
  return <>{children}</>;
};

const App = () => {
  const [isInitialized, setIsInitialized] = useState(false);
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);
  const isProfileComplete = useAuthStore(s => s.isProfileComplete);
  const role = useAuthStore(s => s.role);

  const currentUserId = useAuthStore(s => s._id);
  const setupSocketListeners = useNotificationStore(s => s.setupSocketListeners);
  const fetchUnreadCount = useNotificationStore(s => s.fetchUnreadCount);
  const appearance = useProfileStore(s => s.profile.appearance) || 'dark';

  useEffect(() => {
    const root = window.document.documentElement;
    const applyTheme = (theme: 'dark' | 'light') => {
      root.classList.remove('light', 'dark');
      root.classList.add(theme);
    };

    if (appearance === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleSystemThemeChange = (e: MediaQueryListEvent | MediaQueryList) => {
        applyTheme(e.matches ? 'dark' : 'light');
      };
      handleSystemThemeChange(mediaQuery);
      mediaQuery.addEventListener('change', handleSystemThemeChange);
      return () => mediaQuery.removeEventListener('change', handleSystemThemeChange);
    } else {
      applyTheme(appearance);
    }
  }, [appearance]);

  useEffect(() => {
    if (currentUserId) {
      fetchUnreadCount();
      const cleanup = setupSocketListeners(currentUserId);
      return () => cleanup();
    }
  }, [currentUserId, setupSocketListeners, fetchUnreadCount]);

  useEffect(() => {
    // Auto-migrate legacy 'MIT' college from local storage state to 'SR University'
    const currentAuthState = useAuthStore.getState();
    if (currentAuthState.college === 'MIT') {
      console.log('🔄 [App] Auto-migrating persisted college state MIT -> SR University');
      useAuthStore.setState({ college: 'SR University' });
    }

    // Initialize API configuration (handles env-based setup)
    const apiConfig = getApiConfig();
    console.log('🔧 API Configuration initialized:', apiConfig);

    // Start periodic health checks for backend connectivity (we do not block app load)
    const stopHealthChecks = startHealthCheckInterval(30000);

    // Check persisted auth session from useAuthStore in background
    const checkPersistedSession = async () => {
      const state = useAuthStore.getState();
      console.log('🔐 [App Init] Hydration completed. Restoring session in background if authenticated:', {
        isAuthenticated: state.isAuthenticated,
        uid: state.uid
      });

      // Always initialize rendering instantly upon store hydration
      setIsInitialized(true);

      if (state.isAuthenticated && state.uid) {
        if (state.token) {
          localStorage.setItem('jwt_token', state.token);
          localStorage.setItem('auth_token', state.token);
        }

        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Auth check timeout')), 2500)
        );

        try {
          const fetchPromise = userApi.getCurrentUser();
          const res = (await Promise.race([fetchPromise, timeoutPromise])) as any;

          if (res && res.success && res.data) {
            const dbUser = res.data;
            const dbRole = dbUser.role || 'student';
            let onboardingCompleted = dbUser.onboardingCompleted !== false;

            console.log('✅ [App Init] Background auth check completed:', {
              id: dbUser.id,
              role: dbRole,
              onboardingCompleted
            });

            const resolvedDbName = dbUser.fullName || dbUser.name || state.name || state.fullName || '';
            useAuthStore.setState({
              isNewUser: false,
              isProfileComplete: onboardingCompleted,
              role: dbRole,
              email: dbUser.email,
              uid: dbUser.id || dbUser.userId,
              _id: dbUser._id || dbUser.id,
              name: resolvedDbName,
              fullName: resolvedDbName,
              user: dbUser
            });

            if (dbRole !== 'admin') {
              await useProfileStore.getState().loadProfile(dbUser.id);
            }
          } else {
            console.warn('⚠️ [App Init] Invalid session. Performing clean background logout.');
            await useAuthStore.getState().logout();
          }
        } catch (err) {
          console.warn('⚠️ [App Init] Background session restoration bypassed (backend offline or timeout):', err);
          // Silently proceed so that the user is not blocked
        }
      }
    };

    // Hydration check loop to prevent race condition before state is rehydrated
    const checkHydration = () => {
      if (useAuthStore.persist?.hasHydrated && useAuthStore.persist.hasHydrated()) {
        checkPersistedSession();
      } else {
        setTimeout(checkHydration, 25);
      }
    };
    checkHydration();

    return () => {
      stopHealthChecks();
    };
  }, []);

  // Show loading screen during initialization (if stores are still hydratings)
  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-[#0B0F19] flex flex-col items-center justify-center gap-4 text-slate-300">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#6D5EF5]" />
        <span className="text-xs font-bold text-slate-400 animate-pulse">Initializing application...</span>
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        {role === 'admin' && (
          <>
            <ConnectionStatusIndicator position="top-right" showDetails={false} />
            <div className="px-4 pt-2">
              <ConnectionErrorAlert
                onRetry={() => checkBackendHealth()}
                dismissible={true}
              />
            </div>
          </>
        )}
        <BrowserRouter>
          <AppLayoutWrapper>
            <ErrorBoundary>
              <Routes>
                <Route
                  path="/"
                  element={
                    isInitialized ? (
                      <Suspense fallback={<PageLoader />}>
                        {isAuthenticated
                          ? role === 'admin'
                            ? <Navigate to="/admin" replace />
                            : role === 'alumni'
                              ? <Navigate to="/alumni/dashboard" replace />
                              : isProfileComplete
                                ? <Navigate to="/student/dashboard" replace />
                                : <Navigate to="/setup" replace />
                          : <WelcomePage />
                        }
                      </Suspense>
                    ) : (
                      <PageLoader />
                    )
                  }
                />
                <Route
                  path="/setup"
                  element={
                    <Suspense fallback={<PageLoader />}>
                      <SetupRoute>
                        {isProfileComplete 
                          ? role === 'alumni' 
                            ? <Navigate to="/alumni/dashboard" replace /> 
                            : <Navigate to="/student/dashboard" replace />
                          : <ProfileSetupPage />
                        }
                      </SetupRoute>
                    </Suspense>
                  }
                />
                <Route
                  path="/student/dashboard"
                  element={
                    <Suspense fallback={<PageLoader />}>
                      <ProtectedRoute><SwipeNavigator /></ProtectedRoute>
                    </Suspense>
                  }
                />
                <Route
                  path="/home"
                  element={
                    <Navigate to="/student/dashboard" replace />
                  }
                />
                <Route
                  path="/feed"
                  element={
                    <Suspense fallback={<PageLoader />}>
                      <ProtectedRoute><SwipeNavigator /></ProtectedRoute>
                    </Suspense>
                  }
                />
                <Route
                  path="/discover"
                  element={
                    <Suspense fallback={<PageLoader />}>
                      <ProtectedRoute><StudentDiscoveryPage /></ProtectedRoute>
                    </Suspense>
                  }
                />
                <Route
                  path="/student/:id"
                  element={
                    <Suspense fallback={<PageLoader />}>
                      <ProtectedRoute><StudentProfileDetailPage /></ProtectedRoute>
                    </Suspense>
                  }
                />
                <Route
                  path="/placement/:id"
                  element={
                    <Suspense fallback={<PageLoader />}>
                      <ProtectedRoute><PlacementDetailPage /></ProtectedRoute>
                    </Suspense>
                  }
                />
                <Route
                  path="/alumni"
                  element={
                    <Suspense fallback={<PageLoader />}>
                      <ProtectedRoute><SwipeNavigator /></ProtectedRoute>
                    </Suspense>
                  }
                />
                <Route
                  path="/requests"
                  element={
                    <Suspense fallback={<PageLoader />}>
                      <ProtectedRoute><RequestsPage /></ProtectedRoute>
                    </Suspense>
                  }
                />
                <Route
                  path="/chat"
                  element={
                    <Suspense fallback={<PageLoader />}>
                      <ProtectedRoute><SwipeNavigator /></ProtectedRoute>
                    </Suspense>
                  }
                />
                <Route
                  path="/chat/:matchId"
                  element={
                    <Suspense fallback={<PageLoader />}>
                      <ProtectedRoute><SwipeNavigator /></ProtectedRoute>
                    </Suspense>
                  }
                />
                <Route
                  path="/chat/group/:groupId"
                  element={
                    <Suspense fallback={<PageLoader />}>
                      <ProtectedRoute><SwipeNavigator /></ProtectedRoute>
                    </Suspense>
                  }
                />
                <Route
                  path="/notifications"
                  element={
                    <Suspense fallback={<PageLoader />}>
                      <ProtectedRoute><NotificationsPage /></ProtectedRoute>
                    </Suspense>
                  }
                />
                <Route
                  path="/profile"
                  element={
                    <Suspense fallback={<PageLoader />}>
                      <ProtectedRoute><SwipeNavigator /></ProtectedRoute>
                    </Suspense>
                  }
                />
                <Route
                  path="/profile/:userId"
                  element={
                    <Suspense fallback={<PageLoader />}>
                      <ProtectedRoute><ProfilePageDispatcher /></ProtectedRoute>
                    </Suspense>
                  }
                />
                <Route
                  path="/settings"
                  element={
                    <Suspense fallback={<PageLoader />}>
                      <ProtectedRoute><SwipeNavigator /></ProtectedRoute>
                    </Suspense>
                  }
                />
                <Route
                  path="/settings/privacy"
                  element={
                    <Suspense fallback={<PageLoader />}>
                      <ProtectedRoute><SwipeNavigator /></ProtectedRoute>
                    </Suspense>
                  }
                />
                <Route
                  path="/settings/security"
                  element={
                    <Suspense fallback={<PageLoader />}>
                      <ProtectedRoute><SwipeNavigator /></ProtectedRoute>
                    </Suspense>
                  }
                />
                <Route
                  path="/support"
                  element={
                    <Suspense fallback={<PageLoader />}>
                      <AuthOnlyRoute><HelpSupportPage /></AuthOnlyRoute>
                    </Suspense>
                  }
                />
                <Route
                  path="/admin"
                  element={
                    <Suspense fallback={<PageLoader />}>
                      <AdminRoute><AdminDashboardPage /></AdminRoute>
                    </Suspense>
                  }
                />
                <Route
                  path="/alumni/dashboard"
                  element={
                    <Suspense fallback={<PageLoader />}>
                      <AlumniRoute><MyAlumniProfilePage /></AlumniRoute>
                    </Suspense>
                  }
                />
                <Route
                  path="/alumni/home"
                  element={
                    <Suspense fallback={<PageLoader />}>
                      <AlumniRoute><AlumniHomePage /></AlumniRoute>
                    </Suspense>
                  }
                />
                <Route
                  path="/alumni/post/create"
                  element={
                    <Suspense fallback={<PageLoader />}>
                      <AlumniRoute><AlumniPostCreatePage /></AlumniRoute>
                    </Suspense>
                  }
                />
                <Route
                  path="/alumni/posts"
                  element={
                    <Suspense fallback={<PageLoader />}>
                      <AlumniRoute><AlumniMyPostsPage /></AlumniRoute>
                    </Suspense>
                  }
                />
                <Route
                  path="/alumni/network"
                  element={
                    <Suspense fallback={<PageLoader />}>
                      <AlumniRoute><AlumniNetworkPage /></AlumniRoute>
                    </Suspense>
                  }
                />
                <Route
                  path="/alumni/profile"
                  element={<Navigate to="/alumni/dashboard" replace />}
                />
                <Route
                  path="/alumni/feed"
                  element={
                    <Suspense fallback={<PageLoader />}>
                      <AlumniRoute><AlumniPostFeedPage /></AlumniRoute>
                    </Suspense>
                  }
                />
                <Route
                  path="/alumni/discover"
                  element={
                    <Suspense fallback={<PageLoader />}>
                      <ProtectedRoute><AlumniDiscoveryPage /></ProtectedRoute>
                    </Suspense>
                  }
                />
                <Route
                  path="/alumni/social-feed"
                  element={
                    <Suspense fallback={<PageLoader />}>
                      <ProtectedRoute><AlumniSocialFeedPage /></ProtectedRoute>
                    </Suspense>
                  }
                />
                <Route
                  path="/alumni/networking"
                  element={
                    <Suspense fallback={<PageLoader />}>
                      <ProtectedRoute><PremiumAlumniNetworkingPage /></ProtectedRoute>
                    </Suspense>
                  }
                />
                <Route
                  path="/alumni/:alumniId"
                  element={
                    <Suspense fallback={<PageLoader />}>
                      <ProtectedRoute><AlumniProfileDetailPage /></ProtectedRoute>
                    </Suspense>
                  }
                />
                <Route
                  path="/alumni/explorer"
                  element={
                    <Suspense fallback={<PageLoader />}>
                      <ProtectedRoute><AlumniExplorerPage /></ProtectedRoute>
                    </Suspense>
                  }
                />
                <Route
                  path="/alumni/:id"
                  element={
                    <Suspense fallback={<PageLoader />}>
                      <ProtectedRoute><AlumniDetailPage /></ProtectedRoute>
                    </Suspense>
                  }
                />
                <Route
                  path="/admin/alumni"
                  element={
                    <Suspense fallback={<PageLoader />}>
                      <AdminRoute><AdminAlumniPanelPage /></AdminRoute>
                    </Suspense>
                  }
                />
                <Route
                  path="/admin/security"
                  element={
                    <Suspense fallback={<PageLoader />}>
                      <AdminRoute><SecurityDashboardPage /></AdminRoute>
                    </Suspense>
                  }
                />
                <Route
                  path="/reset-password"
                  element={
                    <Suspense fallback={<PageLoader />}>
                      <ResetPasswordPage />
                    </Suspense>
                  }
                />
                <Route
                  path="*"
                  element={
                    <Suspense fallback={<PageLoader />}>
                      <NotFound />
                    </Suspense>
                  }
                />
              </Routes>
            </ErrorBoundary>
          </AppLayoutWrapper>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

const AppLayoutWrapper = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const isChatRoute = location.pathname.startsWith('/chat');

  if (isChatRoute) {
    return (
      <div className="dark h-screen bg-[#070709] text-foreground w-full overflow-hidden relative">
        {children}
      </div>
    );
  }

  return (
    <div className="dark min-h-screen bg-background text-foreground w-full">
      <div className="w-full max-w-md sm:max-w-xl md:max-w-3xl lg:max-w-5xl xl:max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-24 relative">
        {children}
      </div>
    </div>
  );
};

export default App;
