import '@/lib/errorReporter';
import { enableMapSet } from "immer";
enableMapSet();
import { createRoot } from 'react-dom/client'
import {
  createBrowserRouter,
  Outlet,
  RouterProvider,
} from "react-router-dom";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { RouteErrorBoundary } from '@/components/RouteErrorBoundary';
import '@/index.css'
import { HomePage } from '@/pages/HomePage'
import { FeedsPage } from '@/pages/FeedsPage';
import { FeedDetailPage } from '@/pages/FeedDetailPage';
import { AppLayout } from '@/components/layout/AppLayout';
const queryClient = new QueryClient();
const RootLayout = () => (
  <AppLayout>
    <Outlet />
  </AppLayout>
);
const router = createBrowserRouter([
  {
    element: <RootLayout />,
    errorElement: <RouteErrorBoundary />,
    children: [
      {
        path: "/",
        element: <HomePage />,
      },
      {
        path: "/feeds",
        element: <FeedsPage />,
      },
      {
        path: "/feeds/:id",
        element: <FeedDetailPage />,
      },
    ]
  }
]);
createRoot(document.getElementById('root')!).render(
  <QueryClientProvider client={queryClient}>
    <ErrorBoundary>
      <RouterProvider router={router} />
    </ErrorBoundary>
  </QueryClientProvider>
)