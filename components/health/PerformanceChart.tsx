/**
 * 시스템 성능 차트 컴포넌트
 * 실시간 성능 메트릭 시각화
 */

'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  AreaChart, 
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { 
  TrendingUp, 
  TrendingDown, 
  Activity,
  Clock,
  Zap,
  Database,
  MemoryStick,
  Cpu,
  Network
} from 'lucide-react';

export interface MetricDataPoint {
  timestamp: string;
  cpu: number;
  memory: number;
  networkLatency: number;
  requestRate: number;
  errorRate: number;
  responseTime: number;
  activeConnections: number;
  diskIo: number;
}

export interface PerformanceChartProps {
  data: MetricDataPoint[];
  timeRange?: '1h' | '6h' | '24h' | '7d';
  metric?: 'cpu' | 'memory' | 'network' | 'requests' | 'errors' | 'all';
  height?: number;
  showLegend?: boolean;
  showControls?: boolean;
  realtime?: boolean;
  refreshInterval?: number;
}

const COLORS = {
  primary: '#3b82f6',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#8b5cf6',
  gray: '#6b7280'
};

const METRIC_CONFIGS = {
  cpu: {
    key: 'cpu',
    label: 'CPU 사용률',
    color: COLORS.error,
    unit: '%',
    format: (value: number) => `${value.toFixed(1)}%`,
    icon: <Cpu className="w-4 h-4" />
  },
  memory: {
    key: 'memory',
    label: '메모리 사용률',
    color: COLORS.primary,
    unit: '%',
    format: (value: number) => `${value.toFixed(1)}%`,
    icon: <MemoryStick className="w-4 h-4" />
  },
  networkLatency: {
    key: 'networkLatency',
    label: '네트워크 지연',
    color: COLORS.info,
    unit: 'ms',
    format: (value: number) => `${value.toFixed(0)}ms`,
    icon: <Network className="w-4 h-4" />
  },
  requestRate: {
    key: 'requestRate',
    label: '요청 처리율',
    color: COLORS.success,
    unit: 'req/s',
    format: (value: number) => `${value.toFixed(1)} req/s`,
    icon: <Activity className="w-4 h-4" />
  },
  errorRate: {
    key: 'errorRate',
    label: '에러율',
    color: COLORS.warning,
    unit: '%',
    format: (value: number) => `${value.toFixed(2)}%`,
    icon: <TrendingDown className="w-4 h-4" />
  },
  responseTime: {
    key: 'responseTime',
    label: '응답 시간',
    color: COLORS.gray,
    unit: 'ms',
    format: (value: number) => `${value.toFixed(0)}ms`,
    icon: <Clock className="w-4 h-4" />
  }
};

export default function PerformanceChart({
  data,
  timeRange = '1h',
  metric = 'all',
  height = 300,
  showLegend = true,
  showControls = true,
  realtime = false,
  refreshInterval = 30000
}: PerformanceChartProps) {
  const [selectedMetric, setSelectedMetric] = useState(metric);
  const [selectedTimeRange, setSelectedTimeRange] = useState(timeRange);
  const [isLive, setIsLive] = useState(realtime);

  // 시간 범위에 따른 데이터 필터링
  const filteredData = useMemo(() => {
    if (!data || data.length === 0) return [];
    
    const now = new Date();
    const timeRanges = {
      '1h': 60 * 60 * 1000,
      '6h': 6 * 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000
    };
    
    const cutoff = new Date(now.getTime() - timeRanges[selectedTimeRange]);
    
    return data.filter(point => new Date(point.timestamp) >= cutoff)
               .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }, [data, selectedTimeRange]);

  // 통계 계산
  const statistics = useMemo(() => {
    if (filteredData.length === 0) return null;
    
    const stats: Record<string, { current: number; avg: number; max: number; min: number; trend: number }> = {};
    
    Object.keys(METRIC_CONFIGS).forEach(key => {
      const values = filteredData.map(d => d[key as keyof MetricDataPoint] as number);
      const current = values[values.length - 1] || 0;
      const previous = values[values.length - 2] || current;
      const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
      const max = Math.max(...values);
      const min = Math.min(...values);
      const trend = ((current - previous) / previous) * 100;
      
      stats[key] = { current, avg, max, min, trend };
    });
    
    return stats;
  }, [filteredData]);

  // 시간 축 포맷터
  const formatXAxis = (tickItem: string) => {
    const date = new Date(tickItem);
    if (selectedTimeRange === '7d') {
      return date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
    } else if (selectedTimeRange === '24h') {
      return date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleTimeString('ko-KR', { 
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit' 
      });
    }
  };

  // 툴팁 포맷터
  const formatTooltip = (value: number, name: string, props: any) => {
    const config = METRIC_CONFIGS[name as keyof typeof METRIC_CONFIGS];
    return [config ? config.format(value) : value.toString(), config ? config.label : name];
  };

  // 라벨 포맷터
  const formatLabel = (label: string) => {
    return new Date(label).toLocaleString('ko-KR');
  };

  // 단일 메트릭 차트 렌더링
  const renderSingleMetricChart = () => {
    const config = METRIC_CONFIGS[selectedMetric as keyof typeof METRIC_CONFIGS];
    if (!config) return null;

    return (
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={filteredData}>
          <defs>
            <linearGradient id={`gradient-${config.key}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={config.color} stopOpacity={0.3}/>
              <stop offset="95%" stopColor={config.color} stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="timestamp" 
            tickFormatter={formatXAxis}
            minTickGap={30}
          />
          <YAxis 
            domain={['dataMin - 5', 'dataMax + 5']}
            tickFormatter={(value) => config.format(value)}
          />
          <Tooltip 
            formatter={formatTooltip}
            labelFormatter={formatLabel}
          />
          <Area
            type="monotone"
            dataKey={config.key}
            stroke={config.color}
            strokeWidth={2}
            fill={`url(#gradient-${config.key})`}
            name={config.key}
          />
        </AreaChart>
      </ResponsiveContainer>
    );
  };

  // 다중 메트릭 차트 렌더링
  const renderMultiMetricChart = () => {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={filteredData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="timestamp" 
            tickFormatter={formatXAxis}
            minTickGap={30}
          />
          <YAxis yAxisId="percentage" domain={[0, 100]} />
          <YAxis yAxisId="time" orientation="right" />
          <Tooltip 
            formatter={formatTooltip}
            labelFormatter={formatLabel}
          />
          {showLegend && (
            <Tooltip 
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="bg-white p-3 border rounded-lg shadow-lg">
                      <p className="font-medium">{formatLabel(label)}</p>
                      {payload.map((entry, index) => (
                        <p key={index} style={{ color: entry.color }}>
                          {`${entry.name}: ${formatTooltip(entry.value as number, entry.dataKey as string, entry)}`}
                        </p>
                      ))}
                    </div>
                  );
                }
                return null;
              }}
            />
          )}
          
          <Line
            yAxisId="percentage"
            type="monotone"
            dataKey="cpu"
            stroke={METRIC_CONFIGS.cpu.color}
            strokeWidth={2}
            dot={false}
            name="cpu"
          />
          <Line
            yAxisId="percentage"
            type="monotone"
            dataKey="memory"
            stroke={METRIC_CONFIGS.memory.color}
            strokeWidth={2}
            dot={false}
            name="memory"
          />
          <Line
            yAxisId="time"
            type="monotone"
            dataKey="responseTime"
            stroke={METRIC_CONFIGS.responseTime.color}
            strokeWidth={2}
            dot={false}
            name="responseTime"
          />
          <Line
            yAxisId="percentage"
            type="monotone"
            dataKey="errorRate"
            stroke={METRIC_CONFIGS.errorRate.color}
            strokeWidth={2}
            dot={false}
            name="errorRate"
          />
        </LineChart>
      </ResponsiveContainer>
    );
  };

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>성능 메트릭</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 text-gray-500">
            <div className="text-center">
              <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>성능 데이터를 불러오는 중...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Activity className="w-5 h-5" />
            <CardTitle>성능 메트릭</CardTitle>
            {isLive && (
              <Badge variant="outline" className="text-green-600 border-green-600">
                <div className="w-2 h-2 bg-green-600 rounded-full mr-1 animate-pulse" />
                실시간
              </Badge>
            )}
          </div>
          
          {showControls && (
            <div className="flex items-center space-x-2">
              {/* 메트릭 선택 */}
              <select
                value={selectedMetric}
                onChange={(e) => setSelectedMetric(e.target.value)}
                className="text-sm border rounded px-2 py-1"
              >
                <option value="all">전체 메트릭</option>
                <option value="cpu">CPU</option>
                <option value="memory">메모리</option>
                <option value="networkLatency">네트워크</option>
                <option value="requestRate">요청</option>
                <option value="errorRate">에러</option>
                <option value="responseTime">응답시간</option>
              </select>
              
              {/* 시간 범위 선택 */}
              <select
                value={selectedTimeRange}
                onChange={(e) => setSelectedTimeRange(e.target.value as any)}
                className="text-sm border rounded px-2 py-1"
              >
                <option value="1h">최근 1시간</option>
                <option value="6h">최근 6시간</option>
                <option value="24h">최근 24시간</option>
                <option value="7d">최근 7일</option>
              </select>
              
              {/* 실시간 토글 */}
              <Button
                variant={isLive ? "default" : "outline"}
                size="sm"
                onClick={() => setIsLive(!isLive)}
              >
                <Zap className="w-4 h-4 mr-1" />
                실시간
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      
      <CardContent>
        {/* 통계 요약 */}
        {statistics && selectedMetric !== 'all' && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {Object.entries(METRIC_CONFIGS).map(([key, config]) => {
              if (selectedMetric !== 'all' && key !== selectedMetric) return null;
              
              const stat = statistics[key];
              if (!stat) return null;
              
              return (
                <div key={key} className="text-center">
                  <div className="flex items-center justify-center mb-1">
                    {config.icon}
                    <span className="ml-1 text-sm text-gray-600">{config.label}</span>
                  </div>
                  <div className="text-2xl font-bold">{config.format(stat.current)}</div>
                  <div className="flex items-center justify-center text-sm">
                    {stat.trend > 0 ? (
                      <TrendingUp className="w-3 h-3 text-red-500 mr-1" />
                    ) : (
                      <TrendingDown className="w-3 h-3 text-green-500 mr-1" />
                    )}
                    <span className={stat.trend > 0 ? 'text-red-500' : 'text-green-500'}>
                      {Math.abs(stat.trend).toFixed(1)}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        
        {/* 차트 */}
        <div className="w-full">
          {selectedMetric === 'all' ? renderMultiMetricChart() : renderSingleMetricChart()}
        </div>
        
        {/* 범례 */}
        {showLegend && selectedMetric === 'all' && (
          <div className="flex flex-wrap gap-4 mt-4 justify-center">
            {Object.entries(METRIC_CONFIGS).map(([key, config]) => (
              <div key={key} className="flex items-center space-x-1">
                <div 
                  className="w-3 h-3 rounded"
                  style={{ backgroundColor: config.color }}
                />
                <span className="text-sm text-gray-600">{config.label}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}