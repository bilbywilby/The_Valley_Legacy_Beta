import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import { Search, ChevronDown, ChevronUp } from 'lucide-react';
import { api } from '@/lib/api-client';
import { FeedItem } from '@shared/types';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';
type SortKey = keyof FeedItem;
const StatusBadge = ({ status }: { status: 'Online' | 'Degraded' | 'Offline' }) => {
  const statusClasses = {
    Online: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    Degraded: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    Offline: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
  };
  return <Badge variant="outline" className={cn('capitalize', statusClasses[status])}>{status}</Badge>;
};
export function FeedsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const { data, isLoading, error } = useQuery<{ items: FeedItem[] }>({
    queryKey: ['feeds'],
    queryFn: () => api('/api/feeds'),
  });
  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };
  const filteredAndSortedFeeds = data?.items
    .filter(feed => feed.name.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => {
      if (a[sortKey] < b[sortKey]) return sortDirection === 'asc' ? -1 : 1;
      if (a[sortKey] > b[sortKey]) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  const SortableHeader = ({ columnKey, title }: { columnKey: SortKey; title: string }) => (
    <TableHead onClick={() => handleSort(columnKey)} className="cursor-pointer hover:bg-muted/50 transition-colors">
      <div className="flex items-center gap-2">
        {title}
        {sortKey === columnKey && (sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />)}
      </div>
    </TableHead>
  );
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="py-8 md:py-10 lg:py-12">
        <header className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Feed Explorer</h1>
          <p className="text-muted-foreground mt-1">
            Manage and monitor all active intelligence feeds.
          </p>
        </header>
        <Card className="bg-slate-950/50 border-slate-800">
          <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <CardTitle>Intelligence Feeds</CardTitle>
              <div className="relative w-full sm:max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search feeds..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border border-slate-800">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-b-slate-800">
                    <SortableHeader columnKey="name" title="Feed Name" />
                    <SortableHeader columnKey="type" title="Type" />
                    <SortableHeader columnKey="status" title="Status" />
                    <SortableHeader columnKey="region" title="Region" />
                    <SortableHeader columnKey="lastUpdate" title="Last Update" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i} className="border-slate-800">
                        <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-28" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-36" /></TableCell>
                      </TableRow>
                    ))
                  ) : error ? (
                    <TableRow className="border-slate-800">
                      <TableCell colSpan={5} className="text-center text-destructive py-10">
                        Failed to load feeds.
                      </TableCell>
                    </TableRow>
                  ) : filteredAndSortedFeeds?.length === 0 ? (
                    <TableRow className="border-slate-800">
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-10">
                        No feeds found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredAndSortedFeeds?.map(feed => (
                      <TableRow key={feed.id} className="border-slate-800 hover:bg-slate-900/50 transition-colors">
                        <TableCell>
                          <Link to={`/feeds/${feed.id}`} className="font-medium text-primary hover:underline transition">
                            {feed.name}
                          </Link>
                        </TableCell>
                        <TableCell>{feed.type}</TableCell>
                        <TableCell><StatusBadge status={feed.status} /></TableCell>
                        <TableCell>{feed.region}</TableCell>
                        <TableCell>{formatDistanceToNow(new Date(feed.lastUpdate), { addSuffix: true })}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}