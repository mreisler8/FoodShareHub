import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Clock, Zap, TrendingUp, AlertTriangle } from 'lucide-react';

interface PerformanceData {
  summary: {
    totalRequests: number;
    avgResponseTime: number;
    slowRequestRate: number;
    errorRate: number;
  };
  topSlowEndpoints: Array<{
    endpoint: string;
    avgTime: number;
    count: number;
    errorRate: number;
  }>;
}

export function PerformanceMetrics() {
  const { data: performance, isLoading } = useQuery<PerformanceData>({
    queryKey: ['/api/analytics/performance'],
    refetchInterval: 30000, // Refresh every 30 seconds
    enabled: process.env.NODE_ENV === 'development' // Only show in dev mode
  });

  if (!performance || isLoading) {
    return (
      <Card className="mb-4">
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 animate-spin" />
            <span className="text-sm">Loading performance data...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getPerformanceStatus = (avgTime: number) => {
    if (avgTime < 200) return { status: 'excellent', color: 'bg-green-500', icon: Zap };
    if (avgTime < 500) return { status: 'good', color: 'bg-blue-500', icon: TrendingUp };
    if (avgTime < 1000) return { status: 'slow', color: 'bg-yellow-500', icon: Clock };
    return { status: 'critical', color: 'bg-red-500', icon: AlertTriangle };
  };

  const performanceStatus = getPerformanceStatus(performance.summary.avgResponseTime);
  const StatusIcon = performanceStatus.icon;

  return (
    <Card className="mb-4 border-l-4" style={{ borderLeftColor: performanceStatus.color.replace('bg-', '') }}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <StatusIcon className="h-4 w-4" />
            <CardTitle className="text-sm">Performance</CardTitle>
          </div>
          <Badge 
            variant={performanceStatus.status === 'excellent' ? 'default' : 'destructive'}
            className="text-xs"
          >
            {performance.summary.avgResponseTime}ms avg
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div>
            <p className="text-muted-foreground">Requests</p>
            <p className="font-medium">{performance.summary.totalRequests}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Slow (&gt;500ms)</p>
            <p className="font-medium">{performance.summary.slowRequestRate.toFixed(1)}%</p>
          </div>
          <div>
            <p className="text-muted-foreground">Errors</p>
            <p className="font-medium">{performance.summary.errorRate.toFixed(1)}%</p>
          </div>
        </div>
        
        {performance.topSlowEndpoints.length > 0 && (
          <div className="mt-3 pt-3 border-t">
            <p className="text-xs text-muted-foreground mb-2">Slowest Endpoints:</p>
            <div className="space-y-1">
              {performance.topSlowEndpoints.slice(0, 2).map((endpoint, index) => (
                <div key={index} className="flex items-center justify-between text-xs">
                  <span className="font-mono truncate flex-1">{endpoint.endpoint}</span>
                  <span className="ml-2 font-medium">{Math.round(endpoint.avgTime)}ms</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}