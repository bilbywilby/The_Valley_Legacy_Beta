import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { WALListResponse, WALStats } from '@shared/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { PlayCircle, FileKey } from 'lucide-react';
import { Toaster, toast } from 'sonner';
import { Input } from '@/components/ui/input';
export function WALPage() {
  const queryClient = useQueryClient();
  const [prefix, setPrefix] = useState('');
  const [after, setAfter] = useState('');
  const { data, isLoading, error } = useQuery<WALListResponse>({
    queryKey: ['wal', { prefix, after }],
    queryFn: () => {
      const params = new URLSearchParams();
      if (prefix) params.set('prefix', prefix);
      if (after) params.set('after', after);
      const queryString = params.toString();
      return api(`/api/list-wal${queryString ? `?${queryString}` : ''}`);
    },
    refetchInterval: 20000,
  });
  const applyMutation = useMutation({
    mutationFn: () => api<WALStats>('/api/apply-wal', { method: 'POST' }),
    onSuccess: (stats) => {
      toast.success(`Apply complete. Processed ${stats.processed} new events.`);
      setPrefix('');
      setAfter('');
      queryClient.invalidateQueries({ queryKey: ['wal'] });
      queryClient.invalidateQueries({ queryKey: ['coordinatorStats'] });
      queryClient.invalidateQueries({ queryKey: ['feeds'] });
    },
    onError: () => {
      toast.error('Failed to trigger WAL apply.');
    },
  });
  const handleApply = () => {
    toast.info('Triggering WAL apply...');
    applyMutation.mutate();
  };
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <Toaster richColors theme="dark" />
      <div className="py-8 md:py-10 lg:py-12">
        <header className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">WAL Explorer</h1>
          <p className="text-muted-foreground mt-1">
            Monitor and manage the Write-Ahead Log for event durability.
          </p>
        </header>
        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <Card className="bg-slate-950/50 border-slate-800">
              <CardHeader>
                <CardTitle>Unprocessed WAL Keys</CardTitle>
                <CardDescription>
                  List of event keys stored in the WAL pending processing. The list polls every 20 seconds.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Input
                  placeholder="Filter by prefix (e.g., wal/2025-)..."
                  value={prefix}
                  onChange={(e) => {
                    setPrefix(e.target.value);
                    setAfter(''); // Reset pagination on new filter
                  }}
                  className="mb-4 max-w-sm"
                />
                <div className="rounded-md border border-slate-800">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent border-b-slate-800">
                        <TableHead>
                          <div className="flex items-center gap-2">
                            <FileKey className="h-4 w-4" />
                            WAL Storage Key
                          </div>
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoading ? (
                        Array.from({ length: 5 }).map((_, i) => (
                          <TableRow key={i} className="border-slate-800">
                            <TableCell><Skeleton className="h-5 w-full" /></TableCell>
                          </TableRow>
                        ))
                      ) : error ? (
                        <TableRow className="border-slate-800">
                          <TableCell className="text-center text-destructive py-10">
                            Failed to load WAL keys.
                          </TableCell>
                        </TableRow>
                      ) : data?.keys?.length === 0 ? (
                        <TableRow className="border-slate-800">
                          <TableCell className="text-center text-muted-foreground py-10">
                            No unprocessed WAL keys found.
                          </TableCell>
                        </TableRow>
                      ) : (
                        data?.keys.map(key => (
                          <TableRow key={key} className="border-slate-800 hover:bg-slate-900/50 transition-colors">
                            <TableCell className="font-mono text-xs break-all">{key}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
                {data?.next && (
                  <Button onClick={() => setAfter(data.next!)} variant="outline" className="mt-4 w-full">
                    Load More
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
          <div className="lg:col-span-1">
            <Card className="bg-slate-950/50 border-slate-800 sticky top-24">
              <CardHeader>
                <CardTitle>Manual Apply</CardTitle>
                <CardDescription>
                  Force the system to process all unprocessed WAL keys. This is useful for recovery or manual synchronization.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={handleApply}
                  disabled={applyMutation.isPending}
                  className="w-full"
                >
                  <PlayCircle className="h-4 w-4 mr-2" />
                  {applyMutation.isPending ? 'Applying...' : 'Trigger Apply'}
                </Button>
                {applyMutation.data && (
                  <div className="mt-4 text-sm text-muted-foreground space-y-2">
                    <p><strong>Last Apply Stats:</strong></p>
                    <p>Processed: {applyMutation.data.processed}</p>
                    <p>Total Seen: {applyMutation.data.totalSeen}</p>
                    <p className="truncate">Last Key: {applyMutation.data.lastProcessed || 'N/A'}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}