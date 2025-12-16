import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRight, CheckCircle, Cpu, Database, Globe, Zap, ChartBar, ImageOff } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Skeleton } from '@/components/ui/skeleton';
// --- A/B Test Configuration ---
const variants = {
  a: {
    headline: "Real-Time Regional Intelligence, Delivered at the Edge",
    subheadline: "Harness the power of Cloudflare's global network for sub-50ms queries, transactional consistency with Durable Objects, and unparalleled data durability.",
    cta: "Start Free Trial"
  },
  b: {
    headline: "50ms Queries, Worldwide. Guaranteed.",
    subheadline: "Our edge-native architecture leverages Workers, R2, and Durable Objects to provide a unified, high-speed index for all your regional data streams.",
    cta: "Get Instant Access"
  }
};
// --- Helper Components ---
const FeatureCard = ({ icon, title, children }: { icon: React.ReactNode, title: string, children: React.ReactNode }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, amount: 0.3 }}
    transition={{ duration: 0.5 }}
    className="glass p-6 rounded-lg"
  >
    <div className="flex items-center gap-4 mb-3">
      <div className="bg-blue-500/10 p-2 rounded-md border border-blue-500/20 text-blue-400">{icon}</div>
      <h3 className="text-lg font-semibold text-foreground">{title}</h3>
    </div>
    <p className="text-muted-foreground text-sm">{children}</p>
  </motion.div>
);
const PricingTier = ({ tier, price, features, popular = false }: { tier: string, price: string, features: string[], popular?: boolean }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.95 }}
    whileInView={{ opacity: 1, scale: 1 }}
    viewport={{ once: true, amount: 0.5 }}
    transition={{ duration: 0.5 }}
    className={`glass rounded-lg p-8 relative overflow-hidden ${popular ? 'border-blue-500 shadow-glow' : ''}`}
  >
    {popular && <div className="absolute top-0 right-0 bg-blue-500 text-white text-xs font-bold px-4 py-1 rounded-bl-lg">POPULAR</div>}
    <h3 className="text-xl font-bold mb-2">{tier}</h3>
    <p className="text-4xl font-extrabold mb-4">{price}<span className="text-base font-normal text-muted-foreground">/mo</span></p>
    <ul className="space-y-3 mb-8">
      {features.map(feature => (
        <li key={feature} className="flex items-center gap-3 text-sm">
          <CheckCircle className="h-4 w-4 text-emerald-500" />
          <span className="text-muted-foreground">{feature}</span>
        </li>
      ))}
    </ul>
    <Button className="w-full bg-blue-500 hover:bg-blue-600 text-white">
      {tier === 'Enterprise' ? 'Contact Sales' : 'Get Started'}
    </Button>
  </motion.div>
);
const FaqSchema = () => {
  const faqData = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "What is The Valley Legacy Beta?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "It's a high-speed, scalable, real-time regional intelligence indexing service built on Cloudflare's edge network. It provides a unified API to query disparate data streams with extremely low latency and strong consistency guarantees."
        }
      },
      {
        "@type": "Question",
        "name": "How does it achieve low latency?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "By leveraging Cloudflare Workers and geo-distributed caching, queries are routed to the nearest of thousands of edge locations, minimizing round-trip time. This ensures sub-50ms response times for most queries globally."
        }
      },
      {
        "@type": "Question",
        "name": "What are Durable Objects and why are they important?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Durable Objects are a stateful serverless product from Cloudflare. We use them to provide transactional consistency for data ingestion and state management, ensuring data integrity even under high concurrency."
        }
      },
      {
        "@type": "Question",
        "name": "What kind of search capabilities are offered?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "We offer a powerful hybrid search that fuses traditional keyword-based search (BM25) with modern semantic vector search. This allows you to find the most relevant information, whether you're matching exact terms or searching by conceptual meaning."
        }
      },
      {
        "@type": "Question",
        "name": "Can I integrate this with my existing systems?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Absolutely. The service exposes a standard RESTful API, making it easy to integrate with any platform or programming language capable of making HTTPS requests. We also plan to release client SDKs for popular languages."
        }
      }
    ]
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(faqData) }}
    />
  );
};
const LiveInsightImage = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const src = `/infographic.svg?period=7d&source=news&t=${new Date().getHours()}`; // Add hourly cache buster
  useEffect(() => {
    const img = new Image();
    img.src = src;
    img.onload = () => setIsLoading(false);
    img.onerror = () => {
      setIsLoading(false);
      setHasError(true);
    };
  }, [src]);
  if (isLoading) {
    return <Skeleton className="w-full h-96 rounded-xl shimmer" />;
  }
  if (hasError) {
    return (
      <div className="w-full h-96 rounded-xl bg-slate-900/50 flex flex-col items-center justify-center text-muted-foreground">
        <ImageOff className="h-16 w-16 mb-4" />
        <p>Live insight graphic is currently unavailable.</p>
      </div>
    );
  }
  return (
    <motion.img
      src={src}
      alt="Lehigh Valley 7-Day Intelligence Summary"
      className="w-full rounded-xl shadow-2xl mx-auto max-h-[500px] object-contain"
      initial={{ opacity: 0, scale: 1.05 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 1 }}
      whileHover={{ scale: 1.02 }}
    />
  );
};
export function LandingPage() {
  const [variant, setVariant] = useState(variants.a);
  useEffect(() => {
    // A/B Test Logic
    const abVariant = localStorage.getItem('abVariant') || new URLSearchParams(window.location.search).get('variant');
    if (abVariant === 'b') {
      setVariant(variants.b);
    }
    // GA4 Placeholder
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'page_view', { page_title: 'Landing Page' });
    }
  }, []);
  const trackConversion = (eventName: string) => {
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', eventName, { event_category: 'CTA', event_label: 'Landing Page Hero' });
    }
  };
  return (
    <>
      <FaqSchema />
      <div className="bg-slate-900 text-foreground min-h-screen font-sans">
        <ThemeToggle className="fixed top-4 right-4" />
        {/* --- Hero Section --- */}
        <header className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-slate-950 to-slate-900"></div>
          <div className="absolute inset-0 opacity-10 animate-[float_6s_ease-in-out_infinite] bg-[radial-gradient(circle_at_center,_rgba(59,130,246,0.3)_0,_rgba(59,130,246,0)_50%)]"></div>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
            <div className="py-20 md:py-32 lg:py-40 text-center">
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7 }}
                className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-slate-100 to-slate-400"
              >
                {variant.headline}
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.2 }}
                className="mt-6 max-w-3xl mx-auto text-lg text-muted-foreground"
              >
                {variant.subheadline}
              </motion.p>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.4 }}
                className="mt-10 flex justify-center gap-4"
              >
                <Button asChild size="lg" className="bg-blue-500 hover:bg-blue-600 text-white shadow-glow" onClick={() => trackConversion('start_trial')}>
                  <Link to="/app">{variant.cta} <ArrowRight className="ml-2 h-4 w-4" /></Link>
                </Button>
                <Button asChild size="lg" variant="outline" onClick={() => trackConversion('request_demo')}>
                  <Link to="/app">Request Demo</Link>
                </Button>
              </motion.div>
            </div>
          </div>
        </header>
        <main>
          {/* --- Live Insights Section --- */}
          <section className="py-16 md:py-24">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold tracking-tight">Live Insights from the Valley</h2>
                <p className="mt-4 text-muted-foreground max-w-2xl mx-auto">
                  This auto-generated infographic summarizes topics and sentiment from local news feeds over the last 7 days.
                </p>
              </div>
              <div className="glass p-4 md:p-6 rounded-xl">
                <LiveInsightImage />
              </div>
              <div className="text-center mt-8">
                <Button asChild variant="ghost">
                  <Link to="/public/infographics">
                    View Infographic Gallery <ChartBar className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
          </section>
          {/* --- Features Section --- */}
          <section className="py-16 md:py-24 bg-slate-950/50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold tracking-tight">A Unified Platform for Regional Intelligence</h2>
                <p className="mt-4 text-muted-foreground max-w-2xl mx-auto">
                  From real-time traffic flow to critical infrastructure status, get a complete operational picture from a single, unified API.
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                <FeatureCard icon={<Zap className="h-6 w-6" />} title="Unified Query API">
                  A single, RESTful endpoint for querying across all indexed data feeds, simplifying integration and development.
                </FeatureCard>
                <FeatureCard icon={<Database className="h-6 w-6" />} title="WAL Durability">
                  Our Write-Ahead Log ensures every ingested event is durable and processed, even during system upgrades or failures.
                </FeatureCard>
                <FeatureCard icon={<Globe className="h-6 w-6" />} title="Geo-Distributed at the Edge">
                  Automatic caching and routing to the nearest Cloudflare Edge location for the lowest possible latency reads.
                </FeatureCard>
                <FeatureCard icon={<Cpu className="h-6 w-6" />} title="Sharded Vector Indexing">
                  Scalable semantic search capabilities through sharded vector indexes, enabling complex similarity searches at speed.
                </FeatureCard>
                <FeatureCard icon={<CheckCircle className="h-6 w-6" />} title="Hybrid Search Fusion">
                  Combine the best of keyword (BM25) and semantic (vector) search for unparalleled relevance and accuracy.
                </FeatureCard>
                 <FeatureCard icon={<CheckCircle className="h-6 w-6" />} title="Transactional Consistency">
                  Uses Durable Objects for transactional consistency, ensuring state safety during concurrent updates.
                </FeatureCard>
              </div>
            </div>
          </section>
          {/* --- Pricing Section --- */}
          <section className="py-16 md:py-24">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold tracking-tight">Simple, Transparent Pricing</h2>
                <p className="mt-4 text-muted-foreground">Choose the plan that's right for your scale.</p>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-5xl mx-auto">
                <PricingTier tier="Free" price="$0" features={["1,000,000 Queries/mo", "10 Feeds", "Community Support"]} />
                <PricingTier tier="Pro" price="$49" features={["10,000,000 Queries/mo", "100 Feeds", "Hybrid Search API", "Email Support"]} popular />
                <PricingTier tier="Enterprise" price="Custom" features={["Unlimited Queries", "Unlimited Feeds", "Dedicated Infrastructure", "24/7 Premium Support"]} />
              </div>
            </div>
          </section>
          {/* --- FAQ Section --- */}
          <section className="py-16 md:py-24 bg-slate-950/50">
            <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold tracking-tight">Frequently Asked Questions</h2>
              </div>
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="item-1">
                  <AccordionTrigger>What is The Valley Legacy Beta?</AccordionTrigger>
                  <AccordionContent>It's a high-speed, scalable, real-time regional intelligence indexing service built on Cloudflare's edge network. It provides a unified API to query disparate data streams with extremely low latency and strong consistency guarantees.</AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-2">
                  <AccordionTrigger>How does it achieve low latency?</AccordionTrigger>
                  <AccordionContent>By leveraging Cloudflare Workers and geo-distributed caching, queries are routed to the nearest of thousands of edge locations, minimizing round-trip time. This ensures sub-50ms response times for most queries globally.</AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-3">
                  <AccordionTrigger>What are Durable Objects and why are they important?</AccordionTrigger>
                  <AccordionContent>Durable Objects are a stateful serverless product from Cloudflare. We use them to provide transactional consistency for data ingestion and state management, ensuring data integrity even under high concurrency.</AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-4">
                  <AccordionTrigger>What kind of search capabilities are offered?</AccordionTrigger>
                  <AccordionContent>We offer a powerful hybrid search that fuses traditional keyword-based search (BM25) with modern semantic vector search. This allows you to find the most relevant information, whether you're matching exact terms or searching by conceptual meaning.</AccordionContent>
                </AccordionItem>
                 <AccordionItem value="item-5">
                  <AccordionTrigger>Can I integrate this with my existing systems?</AccordionTrigger>
                  <AccordionContent>Absolutely. The service exposes a standard RESTful API, making it easy to integrate with any platform or programming language capable of making HTTPS requests. We also plan to release client SDKs for popular languages.</AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          </section>
        </main>
        {/* --- Footer --- */}
        <footer className="bg-slate-950/50 border-t border-slate-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="text-center">
              <h2 className="text-2xl font-bold">Ready to Get Started?</h2>
              <p className="mt-3 text-muted-foreground">Explore the dashboard and start your free trial today.</p>
              <div className="mt-8">
                <Button asChild size="lg" className="bg-blue-500 hover:bg-blue-600 text-white">
                  <Link to="/app">Go to Dashboard <ArrowRight className="ml-2 h-4 w-4" /></Link>
                </Button>
              </div>
            </div>
            <div className="mt-12 pt-8 border-t border-slate-800 text-center text-sm text-muted-foreground">
              <p>&copy; {new Date().getFullYear()} The Valley Legacy Beta. All rights reserved.</p>
              <p className="mt-1">Built with ❤️ at Cloudflare</p>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}