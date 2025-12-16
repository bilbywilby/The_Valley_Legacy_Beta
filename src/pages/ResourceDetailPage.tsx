import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { Resource } from '@shared/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, MapPin, Clock, Users, Languages, CheckCircle, Flag, Phone, Globe } from 'lucide-react';
import { motion } from 'framer-motion';
import { Toaster, toast } from 'sonner';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';
import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
const StatItem = ({ icon, title, children }: { icon: React.ReactNode, title: string, children: React.ReactNode }) => (
  <div className="flex items-start gap-4">
    <div className="text-muted-foreground mt-1">{icon}</div>
    <div>
      <h4 className="font-semibold text-muted-foreground">{title}</h4>
      <div className="text-foreground">{children}</div>
    </div>
  </div>
);
const MOCK_TREND_DATA = [
  { date: 'Jan', rating: 4.2 },
  { date: 'Feb', rating: 4.3 },
  { date: 'Mar', rating: 4.5 },
  { date: 'Apr', rating: 4.4 },
  { date: 'May', rating: 4.8 },
];
export function ResourceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [reportReason, setReportReason] = useState('');
  const { data: resource, isLoading, error } = useQuery<Resource>({
    queryKey: ['resource', id],
    queryFn: () => api(`/api/resources/${id}`),
    enabled: !!id,
  });
  const verifyMutation = useMutation({
    mutationFn: (approved: boolean) => api(`/api/resources/${id}/verify`, { method: 'POST', body: JSON.stringify({ approved }) }),
    onSuccess: (_, approved) => {
      toast.success(`Resource ${approved ? 'verified' : 'un-verified'} successfully.`);
      queryClient.invalidateQueries({ queryKey: ['resource', id] });
    },
    onError: () => toast.error('Failed to update verification status.'),
  });
  const reportMutation = useMutation({
    mutationFn: (reason: string) => api(`/api/resources/${id}/report`, { method: 'POST', body: JSON.stringify({ reason }) }),
    onSuccess: () => {
      toast.success('Report submitted. Thank you for your feedback.');
      setReportReason('');
    },
    onError: () => toast.error('Failed to submit report.'),
  });
  const availabilityData = [
    { name: 'Available', value: resource?.available_spots ?? 0 },
    { name: 'Occupied', value: Math.max(0, 50 - (resource?.available_spots ?? 0)) }, // Assuming a max capacity of 50 for demo
  ];
  const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--muted))'];
  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Skeleton className="h-8 w-1/4 mb-4" />
        <Skeleton className="h-10 w-3/4 mb-2" />
        <Skeleton className="h-6 w-1/2 mb-8" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }
  if (error || !resource) {
    return <div className="text-center py-20 text-destructive">Failed to load resource details.</div>;
  }
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
      <Toaster richColors theme="dark" />
      <div className="py-8 md:py-10 lg:py-12">
        <Link to="/app/resources" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-4">
          <ArrowLeft className="h-4 w-4" /> Back to Resources
        </Link>
        <motion.header initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-foreground">{resource.name}</h1>
              <p className="text-muted-foreground mt-1 capitalize">{resource.type} Resource</p>
            </div>
            {resource.verified && <Badge variant="outline" className="border-emerald-500/30 text-emerald-400"><CheckCircle className="h-3 w-3 mr-1.5" />Verified</Badge>}
          </div>
        </motion.header>
        <motion.div variants={{ hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1 } } }} initial="hidden" animate="show" className="space-y-8">
          <Tabs defaultValue="overview">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="trends">Trends</TabsTrigger>
            </TabsList>
            <TabsContent value="overview" className="mt-4 space-y-8">
              <Card className="glass">
                <CardHeader><CardTitle>Details</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                  <StatItem icon={<MapPin />} title="Address">{resource.address}</StatItem>
                  <StatItem icon={<Clock />} title="Hours">{resource.hours.map(h => <div key={h}>{h}</div>)}</StatItem>
                  <StatItem icon={<Users />} title="Eligibility">{resource.eligibility.map(e => <Badge key={e} variant="secondary" className="mr-1 capitalize">{e}</Badge>)}</StatItem>
                  <StatItem icon={<Languages />} title="Languages">{resource.langs.map(l => <Badge key={l} variant="secondary" className="mr-1">{l === 'en' ? 'English' : 'Spanish'}</Badge>)}</StatItem>
                  {resource.phone && <StatItem icon={<Phone />} title="Phone"><a href={`tel:${resource.phone}`} className="text-blue-400 hover:underline">{resource.phone}</a></StatItem>}
                  {resource.website && <StatItem icon={<Globe />} title="Website"><a href={resource.website} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">Visit Website</a></StatItem>}
                </CardContent>
              </Card>
              <Card className="glass">
                <CardHeader><CardTitle>Moderation</CardTitle><CardDescription>Help us keep this information accurate and up-to-date.</CardDescription></CardHeader>
                <CardContent className="flex gap-4">
                  <Button variant="outline" onClick={() => verifyMutation.mutate(!resource.verified)} disabled={verifyMutation.isPending}>
                    <CheckCircle className="h-4 w-4 mr-2" /> {resource.verified ? 'Mark as Unverified' : 'Mark as Verified'}
                  </Button>
                  <Sheet>
                    <SheetTrigger asChild><Button variant="destructive"><Flag className="h-4 w-4 mr-2" /> Report Issue</Button></SheetTrigger>
                    <SheetContent>
                      <SheetHeader><SheetTitle>Report an Issue</SheetTitle><SheetDescription>Let us know what's wrong with this listing.</SheetDescription></SheetHeader>
                      <div className="grid gap-4 py-4">
                        <Textarea placeholder="e.g., The phone number is incorrect." value={reportReason} onChange={e => setReportReason(e.target.value)} />
                        <Button onClick={() => reportMutation.mutate(reportReason)} disabled={!reportReason.trim() || reportMutation.isPending}>Submit Report</Button>
                      </div>
                    </SheetContent>
                  </Sheet>
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="trends" className="mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <Card className="glass">
                  <CardHeader><CardTitle>Rating Over Time</CardTitle></CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={MOCK_TREND_DATA}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.5)" />
                        <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                        <YAxis domain={[0, 5]} stroke="hsl(var(--muted-foreground))" fontSize={12} />
                        <Tooltip contentStyle={{ backgroundColor: "hsl(var(--background))", borderColor: "hsl(var(--border))" }} />
                        <Legend />
                        <Line type="monotone" dataKey="rating" stroke="hsl(var(--chart-1))" strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
                <Card className="glass">
                  <CardHeader><CardTitle>Availability</CardTitle></CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie data={availabilityData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={80} fill="#8884d8" paddingAngle={5}>
                          {availabilityData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ backgroundColor: "hsl(var(--background))", borderColor: "hsl(var(--border))" }} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>
    </div>
  );
}