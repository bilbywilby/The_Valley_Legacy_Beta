import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { SearchResponse } from '@shared/types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, BrainCircuit, SlidersHorizontal } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Link } from 'react-router-dom';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];
const RelevanceBadge = ({ score }: { score: number }) => {
  const percentage = score * 100;
  let colorClass = 'bg-amber-500/20 text-amber-400 border-amber-500/30';
  if (percentage > 85) {
    colorClass = 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
  } else if (percentage > 75) {
    colorClass = 'bg-sky-500/20 text-sky-400 border-sky-500/30';
  }
  return (
    <Badge variant="outline" className={colorClass}>
      {percentage.toFixed(1)}%
    </Badge>
  );
};
const RADIAN = Math.PI / 180;
const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  if (percent < 0.05) return null;
  return (
    <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" className="text-xs">
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};
export function SearchPage() {
  const [query, setQuery] = useState('');
  const [submittedQuery, setSubmittedQuery] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [alpha, setAlpha] = useState(0.5);
  const [beta, setBeta] = useState(0.5);
  useEffect(() => {
    try {
      const storedHistory = localStorage.getItem('searchHistory');
      if (storedHistory) setHistory(JSON.parse(storedHistory));
    } catch (e) {
      console.error("Failed to parse search history", e);
      localStorage.removeItem('searchHistory');
    }
  }, []);
  const { data, isLoading, error, isFetching } = useQuery<SearchResponse>({
    queryKey: ['hybridSearch', { submittedQuery, alpha, beta }],
    queryFn: () => api(`/api/search?q=${encodeURIComponent(submittedQuery)}&alpha=${alpha}&beta=${beta}&limit=20`),
    enabled: !!submittedQuery,
    refetchOnWindowFocus: false,
  });
  const handleSearch = (e: React.FormEvent, queryString?: string) => {
    e.preventDefault();
    const finalQuery = (queryString || query).trim();
    if (finalQuery) {
      setSubmittedQuery(finalQuery);
      setQuery(finalQuery);
      const newHistory = [finalQuery, ...history.filter(h => h !== finalQuery)].slice(0, 5);
      setHistory(newHistory);
      localStorage.setItem('searchHistory', JSON.stringify(newHistory));
    }
  };
  const pieData = useMemo(() => (data?.results ?? []).reduce((acc, result) => {
    const feedId = result.event.feedId || 'unknown';
    const existing = acc.find(item => item.name === feedId);
    if (existing) {
      existing.value += 1;
    } else {
      acc.push({ name: feedId, value: 1 });
    }
    return acc;
  }, [] as { name: string; value: number }[]), [data]);
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="py-8 md:py-10 lg:py-12">
        <header className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Hybrid Search</h1>
          <p className="text-muted-foreground mt-1">
            Fuse keyword and semantic search to find the most relevant events.
          </p>
        </header>
        <Card className="bg-slate-950/50 border-slate-800 mb-4">
          <CardContent className="pt-6">
            <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-4">
              <Input
                placeholder="e.g., 'major accident on highway' or 'power outage reports'"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="flex-grow"
              />
              <Sheet>
                <SheetTrigger asChild>
                  <Button type="button" variant="outline">
                    <SlidersHorizontal className="h-4 w-4 mr-2" />
                    Tune
                  </Button>
                </SheetTrigger>
                <SheetContent>
                  <SheetHeader>
                    <SheetTitle>Tune Search Weights</SheetTitle>
                    <SheetDescription>
                      Balance between keyword (BM25) and semantic (Vector) search.
                    </SheetDescription>
                  </SheetHeader>
                  <div className="grid gap-6 py-6">
                    <div>
                      <Label htmlFor="alpha" className="flex justify-between mb-2">
                        <span>Keyword (BM25)</span>
                        <span className="text-primary">{alpha.toFixed(2)}</span>
                      </Label>
                      <Slider id="alpha" defaultValue={[alpha * 100]} max={100} step={5} onValueChange={v => { setAlpha(v[0] / 100); setBeta(1 - v[0] / 100); }} />
                    </div>
                    <div>
                      <Label htmlFor="beta" className="flex justify-between mb-2">
                        <span>Semantic (Vector)</span>
                        <span className="text-primary">{beta.toFixed(2)}</span>
                      </Label>
                      <Slider id="beta" value={[beta * 100]} max={100} step={5} onValueChange={v => { setBeta(v[0] / 100); setAlpha(1 - v[0] / 100); }} />
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
              <Button type="submit" disabled={isFetching || !query.trim()}>
                <Search className="h-4 w-4 mr-2" />
                {isFetching ? 'Searching...' : 'Search'}
              </Button>
            </form>
          </CardContent>
        </Card>
        {history.length > 0 && (
          <div className="flex items-center gap-2 mb-8 flex-wrap">
            <span className="text-sm text-muted-foreground">Recent:</span>
            {history.map(h => (
              <Button key={h} variant="ghost" size="sm" className="h-7" onClick={(e) => handleSearch(e, h)}>
                {h}
              </Button>
            ))}
          </div>
        )}
        <AnimatePresence>
          {submittedQuery && (
            <motion.div key="results" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.3 }}>
              <div className="grid gap-8 lg:grid-cols-3">
                <div className="lg:col-span-2">
                  <Card className="bg-slate-950/50 border-slate-800">
                    <CardHeader>
                      <div className="flex justify-between items-center">
                        <div>
                          <CardTitle>Search Results</CardTitle>
                          <CardDescription>Showing top matches for "{submittedQuery}"</CardDescription>
                        </div>
                        {data && <Badge variant="secondary">BM25 Hits: {data.bm25Hits} | Fusion: {data.fusionLat}ms</Badge>}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="rounded-md border border-slate-800">
                        <Table>
                          <TableHeader><TableRow className="hover:bg-transparent border-b-slate-800"><TableHead>Event</TableHead><TableHead>Relevance</TableHead><TableHead>Timestamp</TableHead></TableRow></TableHeader>
                          <TableBody>
                            {isLoading ? (
                              Array.from({ length: 5 }).map((_, i) => (
                                <TableRow key={i} className="border-slate-800"><TableCell><Skeleton className="h-5 w-full animate-pulse" /></TableCell><TableCell><Skeleton className="h-6 w-20 rounded-full animate-pulse" /></TableCell><TableCell><Skeleton className="h-5 w-32 animate-pulse" /></TableCell></TableRow>
                              ))
                            ) : error ? (
                              <TableRow className="border-slate-800"><TableCell colSpan={3} className="text-center text-destructive py-10">Failed to perform search.</TableCell></TableRow>
                            ) : data?.results?.length === 0 ? (
                              <TableRow className="border-slate-800"><TableCell colSpan={3} className="text-center text-muted-foreground py-10">No relevant events found. Try a different query or tune weights.</TableCell></TableRow>
                            ) : (
                              data?.results.map(({ event, score }, index) => (
                                <motion.tr key={event._id} className="border-b border-slate-800 hover:bg-slate-900/50 transition-colors" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: index * 0.03 * (2 - score) }}>
                                  <TableCell>
                                    <p className="font-medium truncate max-w-xs sm:max-w-sm md:max-w-md">{JSON.stringify(event.payload)}</p>
                                    {event.feedId && <Link to={`/feeds/${event.feedId}`} className="text-xs text-muted-foreground hover:text-primary transition">Feed: {event.feedId}</Link>}
                                  </TableCell>
                                  <TableCell><RelevanceBadge score={score} /></TableCell>
                                  <TableCell className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(event.timestamp), { addSuffix: true })}</TableCell>
                                </motion.tr>
                              ))
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  </Card>
                </div>
                <div className="lg:col-span-1">
                  <Card className="bg-slate-950/50 border-slate-800 sticky top-24">
                    <CardHeader><CardTitle>Result Distribution</CardTitle><CardDescription>Breakdown of results by source feed.</CardDescription></CardHeader>
                    <CardContent>
                      {isLoading ? (
                        <div className="flex justify-center items-center h-[250px]"><Skeleton className="h-48 w-48 rounded-full animate-pulse" /></div>
                      ) : pieData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={250}>
                          <PieChart>
                            <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={85} paddingAngle={5} labelLine={false} label={renderCustomizedLabel}>
                              {pieData.map((entry, index) => (<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />))}
                            </Pie>
                            <Tooltip contentStyle={{ backgroundColor: "hsl(var(--background))", borderColor: "hsl(var(--border))" }} />
                            <Legend />
                          </PieChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="flex flex-col items-center justify-center h-[250px] text-center text-muted-foreground"><BrainCircuit className="h-10 w-10 mb-4" /><p>No data to display.</p></div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        {!submittedQuery && (
          <div className="text-center py-20">
            <Card className="glass max-w-md mx-auto p-8">
              <motion.div animate={{ y: [0, -10, 0] }} transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}>
                <BrainCircuit className="mx-auto h-12 w-12 text-blue-400" />
              </motion.div>
              <h3 className="mt-4 text-lg font-semibold">Ready to search</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Enter a query and tune alpha/beta weights for hybrid search.
              </p>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}