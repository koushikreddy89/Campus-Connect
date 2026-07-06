import { useEffect, lazy, Suspense, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { BrowserRouter, Route, Routes, Navigate, useLocation } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuthStore } from "@/store/authStore";
import { useProfileStore } from "@/store/profileStore";
import { alumniProfileService } from "@/services/alumniService";
import { userApi } from "@/services/api";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";
import { Loader } from "@/components/Loader";
import { startHealthCheckInterval, checkBackendHealth } from "@/services/connectionService";
import { ConnectionStatusIndicator, ConnectionErrorAlert } from "@/components/ConnectionStatus";
import { getApiConfig } from "@/config/apiConfig";

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
  const [initError, setInitError] = useState<string | null>(null);
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);
  const isProfileComplete = useAuthStore(s => s.isProfileComplete);
  const role = useAuthStore(s => s.role);

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

    // Start periodic health checks for backend connectivity
    const stopHealthChecks = startHealthCheckInterval(30000);

    // Check health immediately on app load
    checkBackendHealth().then((health) => {
      if (health) {
        console.log('✅ Backend health check passed:', health);
      } else {
        console.warn('⚠️ Backend health check failed - server may not be running');
      }
    });

    // Set a timeout to ensure app initializes even if auth check hangs
    const initTimeout = setTimeout(() => {
      console.warn('⚠️ Auth initialization timeout - proceeding without session');
      setIsInitialized(true);
    }, 5000);

    // Check persisted auth session from useAuthStore
    const checkPersistedSession = async () => {
      const state = useAuthStore.getState();
      console.log('🔐 [App Init] Checking persisted session:', {
        isAuthenticated: state.isAuthenticated,
        uid: state.uid,
        email: state.email,
        role: state.role
      });

      if (state.isAuthenticated && state.uid) {
        // Ensure jwt_token and auth_token are in localStorage (fallback synchronization)
        if (state.token) {
          localStorage.setItem('jwt_token', state.token);
          localStorage.setItem('auth_token', state.token);
        }

        try {
          const res = await userApi.getCurrentUser();
          if (res.success && res.data) {
            const dbUser = res.data;
            const dbRole = dbUser.role || 'student';
            // Determine if onboarding is complete
            let onboardingCompleted = true;
            if (dbRole === 'student' || dbRole === 'alumni') {
              // We'll query onboardingCompleted status via profile store or assume true if profile is set
              onboardingCompleted = dbUser.onboardingCompleted !== false;
            }

            console.log('✅ [App Init] Database validated session successfully:', {
              id: dbUser.id,
              role: dbRole,
              onboardingCompleted
            });

            useAuthStore.setState({
              isNewUser: false,
              isProfileComplete: onboardingCompleted,
              role: dbRole,
              email: dbUser.email,
              uid: dbUser.id
            });

            if (dbRole !== 'admin') {
              await useProfileStore.getState().loadProfile(dbUser.id);
            }
          } else {
            console.warn('⚠️ [App Init] Server rejected session. Performing clean logout.');
            await useAuthStore.getState().logout();
          }
        } catch (err) {
          console.error('❌ [App Init] Error checking user session:', err);
          setInitError('Unable to restore session. Please check your connection and refresh.');
        }
      }
      clearTimeout(initTimeout);
      setIsInitialized(true);
    };

    checkPersistedSession();

    return () => {
      clearTimeout(initTimeout);
      stopHealthChecks();
    };
  }, []);

  // Show error screen if session cannot be restored
  if (initError) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <div className="text-destructive mb-4">
          <AlertCircle size={48} />
        </div>
        <h2 className="text-xl font-bold mb-2">Authentication Error</h2>
        <p className="text-muted-foreground text-sm max-w-xs mb-4">{initError}</p>
        <Button onClick={() => window.location.reload()}>Retry Connection</Button>
      </div>
    );
  }

  // Show loading screen during initialization
  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader size="lg" />
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
                      <ProtectedRoute><HomePage /></ProtectedRoute>
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
                      <ProtectedRoute><FeedPage /></ProtectedRoute>
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
                  path="/alumni"
                  element={
                    <Suspense fallback={<PageLoader />}>
                      <ProtectedRoute><PremiumAlumniFeedPage /></ProtectedRoute>
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
                      <ProtectedRoute><ChatListPage /></ProtectedRoute>
                    </Suspense>
                  }
                />
                <Route
                  path="/chat/:matchId"
                  element={
                    <Suspense fallback={<PageLoader />}>
                      <ProtectedRoute><ChatPage /></ProtectedRoute>
                    </Suspense>
                  }
                />
                <Route
                  path="/chat/group/:groupId"
                  element={
                    <Suspense fallback={<PageLoader />}>
                      <ProtectedRoute><GroupChatPage /></ProtectedRoute>
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
                      <ProtectedRoute><ProfilePage /></ProtectedRoute>
                    </Suspense>
                  }
                />
                <Route
                  path="/settings/privacy"
                  element={
                    <Suspense fallback={<PageLoader />}>
                      <AuthOnlyRoute><PrivacySafetyPage /></AuthOnlyRoute>
                    </Suspense>
                  }
                />
                <Route
                  path="/settings/security"
                  element={
                    <Suspense fallback={<PageLoader />}>
                      <AuthOnlyRoute><SecuritySettings /></AuthOnlyRoute>
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
  return (
    <div className="dark min-h-screen bg-background text-foreground w-full">
      <div className="w-full max-w-md sm:max-w-xl md:max-w-3xl lg:max-w-5xl xl:max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-24 relative">
        {children}
      </div>
    </div>
  );
};

export default App;
