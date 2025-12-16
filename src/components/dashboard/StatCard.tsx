import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";
type StatCardProps = {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: number;
  isLoading?: boolean;
};
export function StatCard({ title, value, icon, trend, isLoading = false }: StatCardProps) {
  if (isLoading) {
    return (
      <Card className="bg-slate-950/50 border-slate-800">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            <Skeleton className="h-4 w-24" />
          </CardTitle>
          <Skeleton className="h-6 w-6" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-20 mt-1" />
          <Skeleton className="h-4 w-32 mt-2" />
        </CardContent>
      </Card>
    );
  }
  const hasTrend = typeof trend === 'number';
  const isPositive = hasTrend && trend >= 0;
  return (
    <Card className="bg-slate-950/50 border-slate-800">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className="text-muted-foreground">{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {hasTrend && (
          <p className="text-xs text-muted-foreground flex items-center">
            {isPositive ? (
              <ArrowUpRight className="h-4 w-4 mr-1 text-emerald-500" />
            ) : (
              <ArrowDownRight className="h-4 w-4 mr-1 text-rose-500" />
            )}
            <span className={isPositive ? "text-emerald-500" : "text-rose-500"}>
              {isPositive ? '+' : ''}{trend.toFixed(1)}%
            </span>
            &nbsp;from last hour
          </p>
        )}
      </CardContent>
    </Card>
  );
}