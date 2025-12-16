import { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { Resource, ResourceFilters, ResourceListResponse, ResourceType } from '@shared/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Star, MapPin, CheckCircle, XCircle, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useDebounce, useGeolocation } from 'react-use';
const RESOURCE_TYPES: ResourceType[] = ['food', 'clinic', 'shelter', 'community', 'legal', 'other'];
const LANGUAGES = ['en', 'es'];
const ELIGIBILITY_TAGS = ['all', 'low-income', 'families', 'seniors', 'youth', 'homeless', 'hispanic-community'];
const StarRating = ({ rating }: { rating: number }) => (
  <div className="flex items-center">
    {[...Array(5)].map((_, i) => (
      <Star key={i} className={`h-4 w-4 ${i < Math.round(rating) ? 'text-amber-400 fill-amber-400' : 'text-muted-foreground'}`} />
    ))}
    <span className="ml-2 text-sm text-muted-foreground">{rating.toFixed(1)}</span>
  </div>
);
export function ResourcesPage() {
  const [filters, setFilters] = useState<ResourceFilters>({ min_rating: 0 });
  const [debouncedFilters, setDebouncedFilters] = useState<ResourceFilters>({});
  const geoState = useGeolocation();
  useEffect(() => {
    if (!filters.lat && !filters.lon && geoState.latitude && geoState.longitude) {
      setFilters(prev => ({ ...prev, lat: geoState.latitude, lon: geoState.longitude, radius: 20 }));
    }
  }, [geoState, filters.lat, filters.lon]);
  useDebounce(() => setDebouncedFilters(filters), 500, [filters]);
  const queryParams = useMemo(() => {
    const params = new URLSearchParams();
    Object.entries(debouncedFilters).forEach(([key, value]) => {
      if (value !== undefined && value !== '' && value !== 0) {
        params.append(key, String(value));
      }
    });
    return params.toString();
  }, [debouncedFilters]);
  const { data, isLoading, error } = useQuery<ResourceListResponse>({
    queryKey: ['resources', queryParams],
    queryFn: () => api(`/api/resources?${queryParams}`),
  });
  const handleFilterChange = (key: keyof ResourceFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="py-8 md:py-10 lg:py-12">
        <header className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Community Resources</h1>
          <p className="text-muted-foreground mt-1">Discover local services and support in the Lehigh Valley.</p>
        </header>
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <aside className="lg:col-span-1">
            <Card className="glass sticky top-24">
              <CardHeader><CardTitle>Filters</CardTitle></CardHeader>
              <CardContent className="space-y-6">
                <Input placeholder="Search by name..." value={filters.query || ''} onChange={e => handleFilterChange('query', e.target.value)} />
                <div>
                  <Label>Type</Label>
                  <Select onValueChange={v => handleFilterChange('type', v as ResourceType)}><SelectTrigger><SelectValue placeholder="Any Type" /></SelectTrigger><SelectContent>{RESOURCE_TYPES.map(t => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}</SelectContent></Select>
                </div>
                <div>
                  <Label>Language</Label>
                  <Select onValueChange={v => handleFilterChange('lang', v)}><SelectTrigger><SelectValue placeholder="Any Language" /></SelectTrigger><SelectContent>{LANGUAGES.map(l => <SelectItem key={l} value={l}>{l === 'en' ? 'English' : 'Spanish'}</SelectItem>)}</SelectContent></Select>
                </div>
                <div>
                  <Label>Eligibility</Label>
                  <Select onValueChange={v => handleFilterChange('eligibility', v)}><SelectTrigger><SelectValue placeholder="Any Eligibility" /></SelectTrigger><SelectContent>{ELIGIBILITY_TAGS.map(e => <SelectItem key={e} value={e} className="capitalize">{e}</SelectItem>)}</SelectContent></Select>
                </div>
                <div>
                  <Label>Minimum Rating: {filters.min_rating?.toFixed(1)}</Label>
                  <Slider defaultValue={[0]} max={5} step={0.5} onValueChange={v => handleFilterChange('min_rating', v[0])} />
                </div>
                <div className="flex items-center space-x-2"><Checkbox id="open_now" onCheckedChange={c => handleFilterChange('open_now', c)} /><Label htmlFor="open_now">Open Now</Label></div>
              </CardContent>
            </Card>
          </aside>
          <main className="lg:col-span-3">
            <Card className="glass">
              <CardContent className="pt-6">
                {filters.lat && filters.lon && (
                  <Badge variant="secondary" className="mb-4">
                    <MapPin className="h-3 w-3 mr-1.5" />
                    Sorting by distance from your location
                  </Badge>
                )}
                <div className="rounded-md border border-slate-800">
                  <Table>
                    <TableHeader><TableRow className="hover:bg-transparent border-b-slate-800"><TableHead>Name</TableHead><TableHead>Type</TableHead><TableHead>Rating</TableHead><TableHead>Spots</TableHead><TableHead className="hidden md:table-cell">Dist.</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {isLoading ? (
                        Array.from({ length: 5 }).map((_, i) => (
                          <TableRow key={i} className="border-slate-800"><TableCell colSpan={6}><Skeleton className="h-8 w-full" /></TableCell></TableRow>
                        ))
                      ) : error ? (
                        <TableRow><TableCell colSpan={6} className="text-center text-destructive py-10">Failed to load resources.</TableCell></TableRow>
                      ) : data?.items?.length === 0 ? (
                        <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-10">No resources match your filters.</TableCell></TableRow>
                      ) : (
                        data?.items.map((resource, i) => (
                          <motion.tr key={resource.id} className="border-b border-slate-800 hover:bg-slate-900/50 transition-colors" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                            <TableCell>
                              <Link to={`/app/resources/${resource.id}`} className="font-medium text-primary hover:underline">{resource.name}</Link>
                              <div className="flex items-center text-xs text-muted-foreground mt-1"><MapPin className="h-3 w-3 mr-1.5" />{resource.address}</div>
                            </TableCell>
                            <TableCell><Badge variant="secondary" className="capitalize">{resource.type}</Badge></TableCell>
                            <TableCell><StarRating rating={resource.access_rating} /></TableCell>
                            <TableCell>
                              <Badge variant={resource.available_spots && resource.available_spots > 0 ? "default" : "outline"} className="flex items-center gap-1.5">
                                <Users className="h-3 w-3" />
                                {resource.available_spots ?? 0}
                              </Badge>
                            </TableCell>
                            <TableCell className="hidden md:table-cell">
                              {resource.dist_km !== undefined ? `${resource.dist_km.toFixed(1)} km` : '-'}
                            </TableCell>
                            <TableCell>
                              {resource.verified ? <Badge variant="outline" className="border-emerald-500/30 text-emerald-400"><CheckCircle className="h-3 w-3 mr-1.5" />Verified</Badge> : <Badge variant="outline" className="border-amber-500/30 text-amber-400"><XCircle className="h-3 w-3 mr-1.5" />Unverified</Badge>}
                            </TableCell>
                          </motion.tr>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </main>
        </div>
      </div>
    </div>
  );
}