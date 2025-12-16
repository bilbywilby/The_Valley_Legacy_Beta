import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { FeedDetailResponse, HistoryItem } from '@shared/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, BarChart, Clock, Database, Rss, FileJson, Send } from 'lucide-react';
import { Link } from 'react-router-dom';
import { format, formatDistanceToNow } from 'date-fns';
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid, Pie, PieChart, Cell, Legend } from 'recharts';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from '@/components/ui/scroll-area';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Toaster, toast } from 'sonner';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
const StatCard = ({ title, value, icon, isLoading }: { title: string, value: string | number, icon: React.ReactNode, isLoading?: boolean }) => (
  <Card className="bg-slate-950/50 border-slate-800">
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      <div className="text-muted-foreground">{icon}</div>
    </CardHeader>
    <CardContent>
      {isLoading ? <Skeleton className="h-8 w-20 mt-1" /> : <div className="text-2xl font-bold">{value}</div>}
    </CardContent>
  </Card>
);
const StatusBadge = ({ status }: { status: 'Online' | 'Degraded' | 'Offline' }) => {
  const statusClasses = {
    Online: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    Degraded: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    Offline: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
  };
  return <Badge variant="outline" className={cn('capitalize', statusClasses[status])}>{status}</Badge>;
};
const SEVERITY_COLORS = { critical: '#f43f5e', high: '#f97316', medium: '#f59e0b', low: '#84cc16', info: '#3b82f6' };
export function FeedDetailPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useQuery<FeedDetailResponse>({
    queryKey: ['feed', id],
    queryFn: () => api(`/api/feeds/${id}`),
    refetchInterval: 10000,
    enabled: !!id,
  });
  const ingestMutation = useMutation({
    mutationFn: (payload: Record<string, any>) => api(`/api/feeds/${id}/ingest`, {
      method: 'POST',
      body: JSON.stringify({ payload }),
    }),
    onSuccess: () => {
      toast.success('Event ingested successfully!');
      queryClient.invalidateQueries({ queryKey: ['feed', id] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
    },
    onError: () => {
      toast.error('Failed to ingest event.');
    },
  });
  const handleIngest = () => {
    const mockPayload = {
      event: 'Manual Ingestion',
      source: 'Dashboard UI',
      severity: 'info',
      timestamp: new Date().toISOString(),
    };
    ingestMutation.mutate(mockPayload);
  };
  const feed = data?.feed;
  const severityData = feed?.history.reduce((acc, item) => {
    const severity = item.severity || 'info';
    const existing = acc.find(d => d.name === severity);
    if (existing) {
      existing.value += 1;
    } else {
      acc.push({ name: severity, value: 1 });
    }
    return acc;
  }, [] as { name: string, value: number }[]);
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <Toaster richColors theme="dark" />
      <div className="py-8 md:py-10 lg:py-12">
        <header className="mb-8">
          <Link to="/feeds" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-4">
            <ArrowLeft className="h-4 w-4" />
            Back to Feed Explorer
          </Link>
          {isLoading ? (
            <>
              <Skeleton className="h-9 w-3/4" />
              <Skeleton className="h-5 w-1/2 mt-2" />
            </>
          ) : feed ? (
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-foreground">{feed.name}</h1>
                <p className="text-muted-foreground mt-1">
                  Detailed analytics and event history for {feed.type} feed in {feed.region}.
                </p>
              </div>
              <StatusBadge status={feed.status} />
            </div>
          ) : (
            <h1 className="text-3xl font-bold tracking-tight text-destructive">Feed not found</h1>
          )}
        </header>
        {error && <p className="text-destructive text-center">Failed to load feed details.</p>}
        <motion.main
          className="space-y-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatCard title="Ingestion Rate" value={isLoading ? 0 : `${feed?.ingestionRate.toFixed(2)}/hr`} icon={<Rss className="h-5 w-5" />} isLoading={isLoading} />
            <StatCard title="Total Events" value={isLoading ? 0 : feed?.totalEvents.toLocaleString() ?? 0} icon={<Database className="h-5 w-5" />} isLoading={isLoading} />
            <StatCard title="Last Event" value={isLoading ? '...' : formatDistanceToNow(new Date(feed?.lastUpdate ?? 0), { addSuffix: true })} icon={<Clock className="h-5 w-5" />} isLoading={isLoading} />
            <StatCard title="Health" value={isLoading ? '...' : feed?.status ?? 'Unknown'} icon={<BarChart className="h-5 w-5" />} isLoading={isLoading} />
          </div>
          <Tabs defaultValue="overview">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
              <TabsTrigger value="raw">Raw Events</TabsTrigger>
              <TabsTrigger value="ingest">Ingest</TabsTrigger>
            </TabsList>
            <TabsContent value="overview" className="mt-4">
              <Card className="bg-slate-950/50 border-slate-800">
                <CardHeader><CardTitle>Recent Activity</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={feed?.history.slice(0, 20).reverse()}>
                      <defs><linearGradient id="colorEvents" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.8} /><stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0} /></linearGradient></defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.5)" />
                      <XAxis dataKey="timestamp" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(str) => format(new Date(str), 'HH:mm')} />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} domain={['dataMin - 1', 'dataMax + 1']} hide={true} />
                      <Tooltip contentStyle={{ backgroundColor: "hsl(var(--background))", borderColor: "hsl(var(--border))" }} labelFormatter={(label) => format(new Date(label), 'PPpp')} />
                      <Area type="monotone" dataKey="payload.speed" name="Speed (mph)" stroke="hsl(var(--chart-1))" fill="url(#colorEvents)" />
                      <Area type="monotone" dataKey="payload.temp" name="Temp (°F)" stroke="hsl(var(--chart-2))" fill="url(#colorTemp)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="analytics" className="mt-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Card className="bg-slate-950/50 border-slate-800">
                  <CardHeader><CardTitle>Event Severity Distribution</CardTitle></CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie data={severityData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                          {severityData?.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={SEVERITY_COLORS[entry.name as keyof typeof SEVERITY_COLORS] || '#8884d8'} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ backgroundColor: "hsl(var(--background))", borderColor: "hsl(var(--border))" }} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
                <Card className="bg-slate-950/50 border-slate-800">
                  <CardHeader><CardTitle>Another Chart</CardTitle></CardHeader>
                  <CardContent className="flex items-center justify-center h-[300px]">
                    <p className="text-muted-foreground">Analytics placeholder</p>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
            <TabsContent value="raw" className="mt-4">
              <Card className="bg-slate-950/50 border-slate-800">
                <CardHeader><CardTitle>Raw Event Payloads</CardTitle></CardHeader>
                <CardContent>
                  <ScrollArea className="h-[400px] w-full rounded-md border border-slate-800 p-4 font-mono text-sm">
                    <Accordion type="single" collapsible>
                      {feed?.history.map((item, index) => (
                        <AccordionItem value={`item-${index}`} key={item.timestamp + index}>
                          <AccordionTrigger>
                            <div className="flex items-center gap-4">
                              <FileJson className="h-4 w-4 text-muted-foreground" />
                              <span>{format(new Date(item.timestamp), 'yyyy-MM-dd HH:mm:ss')}</span>
                              <Badge variant={item.severity === 'high' || item.severity === 'critical' ? 'destructive' : 'secondary'}>{item.severity || 'info'}</Badge>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent>
                            <pre className="bg-slate-900 p-4 rounded-md overflow-x-auto">
                              {JSON.stringify(item.payload, null, 2)}
                            </pre>
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="ingest" className="mt-4">
              <Card className="bg-slate-950/50 border-slate-800">
                <CardHeader><CardTitle>Simulate Event Ingestion</CardTitle></CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">
                    Send a test event to this feed. This will update its status, history, and metrics.
                  </p>
                  <Button onClick={handleIngest} disabled={ingestMutation.isPending}>
                    <Send className="h-4 w-4 mr-2" />
                    {ingestMutation.isPending ? 'Ingesting...' : 'Send Test Event'}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </motion.main>
      </div>
    </div>
  );
}