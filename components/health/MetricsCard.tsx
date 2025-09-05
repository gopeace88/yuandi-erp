/**
 * 시스템 메트릭 카드 컴포넌트
 * 개별 시스템 구성 요소의 상태와 메트릭을 표시
 */

'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  TrendingUp, 
  TrendingDown, 
  Minus,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Activity,
  Clock,
  Zap
} from 'lucide-react';

export interface MetricValue {
  current: number;
  previous?: number;
  unit: string;
  threshold?: {
    warning: number;
    critical: number;
  };
  format?: 'number' | 'percentage' | 'bytes' | 'duration';
}

export interface ComponentMetric {
  id: string;
  name: string;
  status: 'healthy' | 'warning' | 'critical';
  icon?: React.ReactNode;
  description?: string;
  metrics: {
    primary: MetricValue;
    secondary?: MetricValue[];
  };
  responseTime?: number;
  lastCheck: string;
  details?: Record<string, any>;
}

interface MetricsCardProps {
  component: ComponentMetric;
  showTrend?: boolean;
  showDetails?: boolean;
  className?: string;
}

export default function MetricsCard({ 
  component, 
  showTrend = true, 
  showDetails = false,
  className = '' 
}: MetricsCardProps) {
  
  // 상태별 색상 및 아이콘 반환
  const getStatusConfig = (status: ComponentMetric['status']) => {
    switch (status) {
      case 'healthy':
        return {
          icon: <CheckCircle className="w-4 h-4 text-green-500" />,
          badgeClass: 'bg-green-100 text-green-800 border-green-200',
          label: '정상'
        };
      case 'warning':
        return {
          icon: <AlertTriangle className="w-4 h-4 text-yellow-500" />,
          badgeClass: 'bg-yellow-100 text-yellow-800 border-yellow-200',
          label: '경고'
        };
      case 'critical':
        return {
          icon: <XCircle className="w-4 h-4 text-red-500" />,
          badgeClass: 'bg-red-100 text-red-800 border-red-200',
          label: '위험'
        };
      default:
        return {
          icon: <Minus className="w-4 h-4 text-gray-500" />,
          badgeClass: 'bg-gray-100 text-gray-800 border-gray-200',
          label: '알 수 없음'
        };
    }
  };

  // 값 포맷팅
  const formatValue = (value: number, format: MetricValue['format'] = 'number', unit?: string): string => {
    switch (format) {
      case 'percentage':
        return `${value.toFixed(1)}%`;
      case 'bytes':
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(value) / Math.log(1024));
        return `${(value / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
      case 'duration':
        if (value < 1000) return `${value.toFixed(0)}ms`;
        if (value < 60000) return `${(value / 1000).toFixed(1)}s`;
        return `${(value / 60000).toFixed(1)}m`;
      default:
        return `${value.toLocaleString()}${unit ? ` ${unit}` : ''}`;
    }
  };

  // 트렌드 계산 및 아이콘
  const getTrendConfig = (current: number, previous?: number) => {
    if (previous === undefined) {
      return {
        icon: <Minus className="w-3 h-3 text-gray-400" />,
        color: 'text-gray-400',
        change: ''
      };
    }

    const change = ((current - previous) / previous) * 100;
    const absChange = Math.abs(change);

    if (absChange < 0.1) {
      return {
        icon: <Minus className="w-3 h-3 text-gray-400" />,
        color: 'text-gray-400',
        change: '변화없음'
      };
    }

    if (change > 0) {
      return {
        icon: <TrendingUp className="w-3 h-3 text-red-500" />,
        color: 'text-red-500',
        change: `+${change.toFixed(1)}%`
      };
    } else {
      return {
        icon: <TrendingDown className="w-3 h-3 text-green-500" />,
        color: 'text-green-500',
        change: `${change.toFixed(1)}%`
      };
    }
  };

  // 진행률 바 색상
  const getProgressColor = (value: number, threshold?: MetricValue['threshold']) => {
    if (!threshold) return 'bg-blue-500';
    
    if (value >= threshold.critical) return 'bg-red-500';
    if (value >= threshold.warning) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const statusConfig = getStatusConfig(component.status);
  const trendConfig = getTrendConfig(component.metrics.primary.current, component.metrics.primary.previous);

  return (
    <Card className={`transition-all duration-200 hover:shadow-md ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {component.icon}
            <CardTitle className="text-lg">{component.name}</CardTitle>
          </div>
          
          <div className="flex items-center space-x-2">
            {component.responseTime !== undefined && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <div className="flex items-center space-x-1 text-xs text-gray-500">
                      <Clock className="w-3 h-3" />
                      <span>{component.responseTime}ms</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>응답 시간</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            
            <Badge className={statusConfig.badgeClass}>
              {statusConfig.label}
            </Badge>
          </div>
        </div>
        
        {component.description && (
          <p className="text-sm text-gray-600">{component.description}</p>
        )}
      </CardHeader>

      <CardContent>
        <div className="space-y-4">
          {/* 주 메트릭 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-2xl font-bold">
                  {formatValue(
                    component.metrics.primary.current, 
                    component.metrics.primary.format, 
                    component.metrics.primary.unit
                  )}
                </span>
                
                {showTrend && component.metrics.primary.previous !== undefined && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <div className={`flex items-center space-x-1 ${trendConfig.color}`}>
                          {trendConfig.icon}
                          <span className="text-xs">{trendConfig.change}</span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>이전 값: {formatValue(component.metrics.primary.previous, component.metrics.primary.format)}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
              
              {statusConfig.icon}
            </div>

            {/* 진행률 바 (percentage 형식일 때) */}
            {component.metrics.primary.format === 'percentage' && (
              <div className="space-y-1">
                <Progress 
                  value={component.metrics.primary.current} 
                  className="h-2"
                />
                {component.metrics.primary.threshold && (
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>0%</span>
                    <div className="flex space-x-2">
                      <span className="text-yellow-600">
                        경고: {component.metrics.primary.threshold.warning}%
                      </span>
                      <span className="text-red-600">
                        위험: {component.metrics.primary.threshold.critical}%
                      </span>
                    </div>
                    <span>100%</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 보조 메트릭 */}
          {component.metrics.secondary && component.metrics.secondary.length > 0 && (
            <div className="grid grid-cols-2 gap-4 pt-3 border-t">
              {component.metrics.secondary.map((metric, index) => (
                <div key={index} className="space-y-1">
                  <p className="text-xs text-gray-600 uppercase tracking-wide">
                    {metric.unit}
                  </p>
                  <p className="text-sm font-semibold">
                    {formatValue(metric.current, metric.format, metric.unit)}
                  </p>
                  {showTrend && metric.previous !== undefined && (
                    <div className={`flex items-center space-x-1 text-xs ${getTrendConfig(metric.current, metric.previous).color}`}>
                      {getTrendConfig(metric.current, metric.previous).icon}
                      <span>{getTrendConfig(metric.current, metric.previous).change}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* 상세 정보 */}
          {showDetails && component.details && (
            <div className="pt-3 border-t">
              <details className="cursor-pointer">
                <summary className="text-sm text-gray-600 hover:text-gray-800 transition-colors">
                  상세 정보
                </summary>
                <div className="mt-2 p-3 bg-gray-50 rounded-md">
                  <pre className="text-xs font-mono text-gray-700 whitespace-pre-wrap">
                    {JSON.stringify(component.details, null, 2)}
                  </pre>
                </div>
              </details>
            </div>
          )}

          {/* 마지막 확인 시간 */}
          <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t">
            <span>마지막 확인</span>
            <span>{new Date(component.lastCheck).toLocaleString('ko-KR')}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}