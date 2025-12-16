import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { PulseMetrics, CredResponse } from '@shared/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, MapPin, Shield, Calendar, TrafficCone, CheckCircle, ImageOff } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { cn } from '@/lib/utils';
const ZScoreBadge = ({ score }: { score: number }) => {
  const isHigh = score > 1.5;
  const isLow = score < -1.5;
  const isNormal = !isHigh && !isLow;
  const colorClass = isHigh ? 'bg-rose-500/20 text-rose-400 border-rose-500/30' : isLow ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-sky-500/20 text-sky-400 border-sky-500/30';
  const text = isHigh ? 'High Activity' : isLow ? 'Low Activity' : 'Normal';
  return <Badge variant="outline" className={cn('w-28 text-center justify-center', colorClass)}>{text} ({score.toFixed(1)})</Badge>;
};
const PulseCard = ({ title, icon, zScore, isLoading }: { title: string, icon: React.ReactNode, zScore?: number, isLoading: boolean }) => (
  <Card className="glass">
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-base font-medium">{title}</CardTitle>
      <div className="text-muted-foreground">{icon}</div>
    </CardHeader>
    <CardContent>
      {isLoading ? <Skeleton className="h-7 w-28" /> : <ZScoreBadge score={zScore ?? 0} />}
      <p className="text-xs text-muted-foreground mt-2">Compared to regional baseline</p>
    </CardContent>
  </Card>
);
const LiveTile = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const src = `/tile.svg?query=topics&window=7d&t=${new Date().getHours()}`;
  useEffect(() => {
    const img = new Image();
    img.src = src;
    img.onload = () => setIsLoading(false);
    img.onerror = () => { setIsLoading(false); setHasError(true); };
  }, [src]);
  return (
    <div className="aspect-[4/3] rounded-md overflow-hidden relative bg-slate-900/50">
      {isLoading && <Skeleton className="w-full h-full shimmer" />}
      {hasError && !isLoading && (
        <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground">
          <ImageOff className="h-12 w-12 mb-2" />
          <p>Could not load data tile.</p>
        </div>
      )}
      {!isLoading && !hasError && (
        <motion.img src={src} alt="Live Data Tile" className="w-full h-full object-cover" initial={{ opacity: 0 }} animate={{ opacity: 1 }} />
      )}
    </div>
  );
};
export function PublicPulsePage() {
  const [hexInput, setHexInput] = useState('demo-h3-lehigh-001');
  const [credInput, setCredInput] = useState('mock-traffic-1');
  const { data: pulseData, isLoading: isPulseLoading } = useQuery<PulseMetrics>({
    queryKey: ['pulse', hexInput],
    queryFn: () => api(`/api/pulse?hex=${hexInput}`),
    enabled: !!hexInput,
  });
  const { data: credData, isLoading: isCredLoading } = useQuery<CredResponse>({
    queryKey: ['cred', credInput],
    queryFn: () => api(`/api/cred?item_id=${credInput}`),
    enabled: !!credInput,
  });
  return (
    <div className="bg-slate-900 text-foreground min-h-screen font-sans">
      <ThemeToggle className="fixed top-4 right-4" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-16 md:py-24">
          <motion.header initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12">
            <div className="inline-flex items-center gap-3 mb-4"><MapPin className="h-8 w-8 text-blue-400" /><h1 className="text-4xl md:text-5xl font-bold tracking-tight">Neighborhood Pulse</h1></div>
            <p className="mt-4 text-lg text-muted-foreground max-w-3xl mx-auto">Explore hyperlocal civic data APIs for real-time neighborhood insights, credibility scoring, and dynamic data visualizations.</p>
          </motion.header>
          <motion.div variants={{ hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1 } } }} initial="hidden" animate="show" className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column */}
            <motion.div variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }} className="lg:col-span-2 space-y-8">
              <Card className="glass">
                <CardHeader>
                  <CardTitle>Pulse Metrics (Z-Score)</CardTitle>
                  <CardDescription>Enter a mock H3 Hex ID to see its activity levels compared to the regional average. Try 'demo-h3-northampton-002'.</CardDescription>
                </CardHeader>
                <CardContent>
                  <Input value={hexInput} onChange={(e) => setHexInput(e.target.value)} placeholder="Enter H3 Hex ID..." className="mb-4" />
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <PulseCard title="Public Safety" icon={<Shield size={20} />} zScore={pulseData?.safetyZ} isLoading={isPulseLoading} />
                    <PulseCard title="Community Events" icon={<Calendar size={20} />} zScore={pulseData?.eventsZ} isLoading={isPulseLoading} />
                    <PulseCard title="Traffic" icon={<TrafficCone size={20} />} zScore={pulseData?.trafficZ} isLoading={isPulseLoading} />
                  </div>
                </CardContent>
              </Card>
              <Card className="glass">
                <CardHeader>
                  <CardTitle>Source Credibility API</CardTitle>
                  <CardDescription>Test the credibility score for a given event ID. Try 'test-safety-1'.</CardDescription>
                </CardHeader>
                <CardContent>
                  <Input value={credInput} onChange={(e) => setCredInput(e.target.value)} placeholder="Enter Event ID..." className="mb-4" />
                  {isCredLoading ? <Skeleton className="h-24 w-full" /> : credData && (
                    <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-800 flex items-center justify-between">
                      <div>
                        <h4 className="font-semibold">Credibility Score: <span className="text-blue-400">{credData.score}/100</span></h4>
                        <p className="text-xs text-muted-foreground">Factors: {credData.factors.corroborations} corroborations, {credData.factors.sources} sources, {credData.factors.ageHours}h old</p>
                      </div>
                      <CheckCircle className="h-8 w-8 text-emerald-500" />
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
            {/* Right Column */}
            <motion.div variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }} className="space-y-8">
              <Card className="glass">
                <CardHeader>
                  <CardTitle>Live Data Tile</CardTitle>
                  <CardDescription>An auto-updating SVG tile summarizing regional topics over the last 7 days.</CardDescription>
                </CardHeader>
                <CardContent>
                  <LiveTile />
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
          <div className="text-center mt-16">
            <Button asChild size="lg" className="bg-blue-500 hover:bg-blue-600 text-white">
              <Link to="/app">Access Full Dashboard <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}