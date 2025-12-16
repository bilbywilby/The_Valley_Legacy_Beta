import { useQuery } from '@tanstack/react-query';
import { ShieldCheck, Activity, AlertTriangle, Database } from 'lucide-react';
import { api } from '@/lib/api-client';
import { FeedStats, VelocityDataPoint } from '@shared/types';
import { StatCard } from '@/components/dashboard/StatCard';
import { VelocityChart } from '@/components/dashboard/VelocityChart';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
type CoordinatorStatsResponse = FeedStats & { velocity: VelocityDataPoint[] };
export function HomePage() {
  const { data: stats, isLoading: isLoadingStats } = useQuery<CoordinatorStatsResponse>({
    queryKey: ['coordinatorStats'],
    queryFn: () => api('/api/coordinator/stats'),
    refetchInterval: 15000, // Poll for fresh stats every 15 seconds
  });
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="py-8 md:py-10 lg:py-12">
        <header className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Command Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            A high-level overview of the Lehigh Valley intelligence feed.
          </p>
        </header>
        <main className="space-y-8">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="Total Feeds"
              value={stats?.totalFeeds ?? 0}
              icon={<Database className="h-5 w-5" />}
              isLoading={isLoadingStats}
            />
            <StatCard
              title="Active Feeds"
              value={stats?.activeFeeds ?? 0}
              icon={<Activity className="h-5 w-5" />}
              trend={stats?.activeFeedsTrend}
              isLoading={isLoadingStats}
            />
            <StatCard
              title="Active Alerts"
              value={stats?.alerts ?? 0}
              icon={<AlertTriangle className="h-5 w-5 text-amber-400" />}
              trend={stats?.alertsTrend}
              isLoading={isLoadingStats}
            />
            <StatCard
              title="System Status"
              value="Operational"
              icon={<ShieldCheck className="h-5 w-5 text-emerald-400" />}
              isLoading={isLoadingStats}
            />
          </div>
          <VelocityChart data={stats?.velocity ?? []} isLoading={isLoadingStats} />
          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="bg-slate-950/50 border-slate-800 lg:col-span-2">
              <CardHeader>
                <CardTitle>Recent Critical Alerts</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-4">
                  {isLoadingStats ? (
                    <li className="text-center text-muted-foreground">Loading alerts...</li>
                  ) : (
                    <>
                      <li className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">[P1] Major Accident</p>
                          <p className="text-sm text-muted-foreground">Route 22 West, near Airport Rd</p>
                        </div>
                        <Badge variant="destructive">Critical</Badge>
                      </li>
                      <li className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">[P2] Severe Thunderstorm Warning</p>
                          <p className="text-sm text-muted-foreground">Northampton County</p>
                        </div>
                        <Badge variant="outline" className="border-amber-500/50 text-amber-400">High</Badge>
                      </li>
                      <li className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">[P3] Road Closure</p>
                          <p className="text-sm text-muted-foreground">Main St, Bethlehem</p>
                        </div>
                        <Badge variant="secondary">Medium</Badge>
                      </li>
                    </>
                  )}
                </ul>
              </CardContent>
            </Card>
            <Card className="bg-slate-950/50 border-slate-800">
              <CardHeader>
                <CardTitle>Feed Health</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Traffic</span>
                    <span className="text-emerald-400">100% Online</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Weather</span>
                    <span className="text-emerald-400">100% Online</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Public Safety</span>
                    <span className="text-amber-400">92% Online</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Infrastructure</span>
                    <span className="text-emerald-400">100% Online</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
        <footer className="text-center text-muted-foreground/80 mt-12">
            <p>Built with ❤️ at Cloudflare</p>
        </footer>
      </div>
    </div>
  );
}