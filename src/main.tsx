import '@/lib/errorReporter';
import { enableMapSet } from "immer";
enableMapSet();
import { createRoot } from 'react-dom/client'
import {
  createBrowserRouter,
  RouterProvider,
  Navigate,
} from "react-router-dom";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { RouteErrorBoundary } from '@/components/RouteErrorBoundary';
import '@/index.css'
import { HomePage } from '@/pages/HomePage'
import { FeedsPage } from '@/pages/FeedsPage';
import { FeedDetailPage } from '@/pages/FeedDetailPage';
import { RootLayout } from '@/components/layout/RootLayout';
import { WALPage } from '@/pages/WALPage';
import { SearchPage } from '@/pages/SearchPage';
import { LandingPage } from '@/pages/LandingPage';
import { PublicInfographicsPage } from '@/pages/PublicInfographicsPage';
const queryClient = new QueryClient();
const router = createBrowserRouter([
  {
    path: "/",
    element: <LandingPage />,
    errorElement: <RouteErrorBoundary />,
  },
  {
    path: "/public/infographics",
    element: <PublicInfographicsPage />,
    errorElement: <RouteErrorBoundary />,
  },
  {
    path: "/app",
    element: <RootLayout />,
    errorElement: <RouteErrorBoundary />,
    children: [
      {
        index: true, // This makes it the default child route for /app
        element: <HomePage />,
      },
      {
        path: "feeds",
        element: <FeedsPage />,
      },
      {
        path: "feeds/:id",
        element: <FeedDetailPage />,
      },
      {
        path: "wal",
        element: <WALPage />,
      },
      {
        path: "search",
        element: <SearchPage />,
      },
    ]
  },
  {
    path: "*",
    element: <Navigate to="/" replace />,
  }
]);
createRoot(document.getElementById('root')!).render(
  <QueryClientProvider client={queryClient}>
    <ErrorBoundary>
      <RouterProvider router={router} />
    </ErrorBoundary>
  </QueryClientProvider>
)