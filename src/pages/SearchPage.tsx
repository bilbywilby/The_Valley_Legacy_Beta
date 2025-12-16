import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { SemanticQueryResponse, SearchResult } from '@shared/types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, BrainCircuit } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { formatDistanceToNow } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Link } from 'react-router-dom';
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];
export function SearchPage() {
  const [query, setQuery] = useState('');
  const [submittedQuery, setSubmittedQuery] = useState('');
  const { data, isLoading, error, isFetching } = useQuery<SemanticQueryResponse>({
    queryKey: ['semanticSearch', submittedQuery],
    queryFn: () => api(`/api/query-semantic?text=${encodeURIComponent(submittedQuery)}&limit=20`),
    enabled: !!submittedQuery,
    refetchOnWindowFocus: false,
  });
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      setSubmittedQuery(query.trim());
    }
  };
  const pieData = (data?.results ?? []).reduce((acc, result) => {
    const feedId = result.event.feedId;
    const existing = acc.find(item => item.name === feedId);
    if (existing) {
      existing.value += 1;
    } else {
      acc.push({ name: feedId, value: 1 });
    }
    return acc;
  }, [] as { name: string; value: number }[]);
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="py-8 md:py-10 lg:py-12">
        <header className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Semantic Search</h1>
          <p className="text-muted-foreground mt-1">
            Query the intelligence index using natural language to find semantically similar events.
          </p>
        </header>
        <Card className="bg-slate-950/50 border-slate-800 mb-8">
          <CardContent className="pt-6">
            <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-4">
              <Input
                placeholder="e.g., 'major accident on highway' or 'power outage reports'"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="flex-grow"
              />
              <Button type="submit" disabled={isFetching || !query.trim()}>
                <Search className="h-4 w-4 mr-2" />
                {isFetching ? 'Searching...' : 'Search'}
              </Button>
            </form>
          </CardContent>
        </Card>
        <AnimatePresence>
          {submittedQuery && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <div className="grid gap-8 lg:grid-cols-3">
                <div className="lg:col-span-2">
                  <Card className="bg-slate-950/50 border-slate-800">
                    <CardHeader>
                      <CardTitle>Search Results</CardTitle>
                      <CardDescription>Showing top matches for "{submittedQuery}"</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="rounded-md border border-slate-800">
                        <Table>
                          <TableHeader>
                            <TableRow className="hover:bg-transparent border-b-slate-800">
                              <TableHead>Event</TableHead>
                              <TableHead>Relevance</TableHead>
                              <TableHead>Timestamp</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {isLoading ? (
                              Array.from({ length: 5 }).map((_, i) => (
                                <TableRow key={i} className="border-slate-800">
                                  <TableCell><Skeleton className="h-5 w-full" /></TableCell>
                                  <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                                  <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                                </TableRow>
                              ))
                            ) : error ? (
                              <TableRow className="border-slate-800">
                                <TableCell colSpan={3} className="text-center text-destructive py-10">
                                  Failed to perform search.
                                </TableCell>
                              </TableRow>
                            ) : data?.results?.length === 0 ? (
                              <TableRow className="border-slate-800">
                                <TableCell colSpan={3} className="text-center text-muted-foreground py-10">
                                  No relevant events found. Try a different query.
                                </TableCell>
                              </TableRow>
                            ) : (
                              data?.results.map(({ event, score }) => (
                                <TableRow key={event._id} className="border-slate-800 hover:bg-slate-900/50 transition-colors">
                                  <TableCell>
                                    <p className="font-medium truncate">{JSON.stringify(event.payload)}</p>
                                    <Link to={`/feeds/${event.feedId}`} className="text-xs text-muted-foreground hover:text-primary transition">
                                      Feed: {event.feedId}
                                    </Link>
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex items-center gap-2">
                                      <Progress value={score * 100} className="w-20 h-2" />
                                      <span className="text-xs font-mono">{(score * 100).toFixed(1)}%</span>
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-xs text-muted-foreground">
                                    {formatDistanceToNow(new Date(event.timestamp), { addSuffix: true })}
                                  </TableCell>
                                </TableRow>
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
                    <CardHeader>
                      <CardTitle>Result Distribution</CardTitle>
                      <CardDescription>Breakdown of results by source feed.</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {isLoading ? (
                        <div className="flex justify-center items-center h-[250px]">
                          <Skeleton className="h-48 w-48 rounded-full" />
                        </div>
                      ) : pieData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={250}>
                          <PieChart>
                            <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} label>
                              {pieData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip contentStyle={{ backgroundColor: "hsl(var(--background))", borderColor: "hsl(var(--border))" }} />
                            <Legend />
                          </PieChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="flex flex-col items-center justify-center h-[250px] text-center text-muted-foreground">
                          <BrainCircuit className="h-10 w-10 mb-4" />
                          <p>No data to display.</p>
                        </div>
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
            <BrainCircuit className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">Ready to search</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Enter a query above to find events across all feeds.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}