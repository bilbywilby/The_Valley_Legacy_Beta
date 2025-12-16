import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowRight, ChartBar, ImageOff } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
const INFOGRAPHICS = [
  { period: '1d', source: 'news', title: 'Last 24 Hours', subtitle: 'News Summary' },
  { period: '7d', source: 'traffic', title: 'Last 7 Days', subtitle: 'Traffic Report' },
  { period: '30d', source: 'all', title: 'Last 30 Days', subtitle: 'Regional Overview' },
  { period: '7d', source: 'news', title: 'Last 7 Days', subtitle: 'News Summary' },
];
const InfographicCard = ({ period, source, title, subtitle }: typeof INFOGRAPHICS[0]) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const src = `/infographic.svg?period=${period}&source=${source}&t=${new Date().getHours()}`; // Add hourly cache buster
  useEffect(() => {
    const img = new Image();
    img.src = src;
    img.onload = () => setIsLoading(false);
    img.onerror = () => {
      setIsLoading(false);
      setHasError(true);
    };
  }, [src]);
  return (
    <Card className="glass overflow-hidden">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <p className="text-muted-foreground text-sm">{subtitle}</p>
      </CardHeader>
      <CardContent>
        <div className="aspect-[4/3] rounded-md overflow-hidden relative bg-slate-900/50">
          {isLoading && <Skeleton className="w-full h-full shimmer" />}
          {hasError && !isLoading && (
            <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground">
              <ImageOff className="h-12 w-12 mb-2" />
              <p>Could not load infographic.</p>
            </div>
          )}
          {!isLoading && !hasError && (
            <motion.img
              src={src}
              alt={`${title} - ${subtitle}`}
              className="w-full h-full object-cover"
              initial={{ opacity: 0, scale: 1.05 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              whileHover={{ scale: 1.03 }}
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
};
export function PublicInfographicsPage() {
  return (
    <div className="bg-slate-900 text-foreground min-h-screen font-sans">
      <ThemeToggle className="fixed top-4 right-4" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-16 md:py-24">
          <motion.header
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center mb-12"
          >
            <div className="inline-flex items-center gap-3 mb-4">
              <ChartBar className="h-8 w-8 text-blue-400" />
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight">Public Infographics</h1>
            </div>
            <p className="mt-4 text-lg text-muted-foreground max-w-3xl mx-auto">
              A gallery of auto-generated intelligence summaries for the Lehigh Valley region, powered by real-time data feeds.
            </p>
          </motion.header>
          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 gap-8"
            variants={{
              hidden: { opacity: 0 },
              show: {
                opacity: 1,
                transition: {
                  staggerChildren: 0.1,
                },
              },
            }}
            initial="hidden"
            animate="show"
          >
            {INFOGRAPHICS.map((info, i) => (
              <motion.div key={i} variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}>
                <InfographicCard {...info} />
              </motion.div>
            ))}
          </motion.div>
          <div className="text-center mt-16">
            <Button asChild size="lg" className="bg-blue-500 hover:bg-blue-600 text-white">
              <Link to="/app">
                Access Full Dashboard <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}