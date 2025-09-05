/**
 * 시스템 알림 패널 컴포넌트
 * 실시간 알림 및 경고 메시지 표시
 */

'use client';

import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Info,
  Bell,
  X,
  Clock
} from 'lucide-react';

export interface SystemAlert {
  id: string;
  type: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  timestamp: string;
  component?: string;
  details?: Record<string, any>;
  dismissible?: boolean;
  actionLabel?: string;
  onAction?: () => void;
}

interface AlertPanelProps {
  alerts: SystemAlert[];
  onDismiss?: (alertId: string) => void;
  maxAlerts?: number;
  showTimestamp?: boolean;
}

export default function AlertPanel({ 
  alerts, 
  onDismiss, 
  maxAlerts = 10,
  showTimestamp = true 
}: AlertPanelProps) {
  const displayAlerts = alerts.slice(0, maxAlerts);

  const getAlertIcon = (type: SystemAlert['type']) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Info className="w-4 h-4 text-blue-500" />;
    }
  };

  const getAlertColor = (type: SystemAlert['type']) => {
    switch (type) {
      case 'success':
        return 'border-green-200 bg-green-50';
      case 'warning':
        return 'border-yellow-200 bg-yellow-50';
      case 'error':
        return 'border-red-200 bg-red-50';
      default:
        return 'border-blue-200 bg-blue-50';
    }
  };

  const getAlertTextColor = (type: SystemAlert['type']) => {
    switch (type) {
      case 'success':
        return 'text-green-800';
      case 'warning':
        return 'text-yellow-800';
      case 'error':
        return 'text-red-800';
      default:
        return 'text-blue-800';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(minutes / 60);

    if (minutes < 1) {
      return '방금 전';
    } else if (minutes < 60) {
      return `${minutes}분 전`;
    } else if (hours < 24) {
      return `${hours}시간 전`;
    } else {
      return date.toLocaleDateString('ko-KR', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  };

  if (displayAlerts.length === 0) {
    return (
      <div className="p-6 text-center text-gray-500">
        <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p>현재 알림이 없습니다</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {displayAlerts.map((alert) => (
        <Alert 
          key={alert.id} 
          className={`${getAlertColor(alert.type)} border transition-all duration-200 hover:shadow-sm`}
        >
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 mt-0.5">
              {getAlertIcon(alert.type)}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <h4 className={`font-medium ${getAlertTextColor(alert.type)}`}>
                      {alert.title}
                    </h4>
                    {alert.component && (
                      <Badge variant="outline" className="text-xs">
                        {alert.component}
                      </Badge>
                    )}
                  </div>
                  
                  <AlertDescription className={getAlertTextColor(alert.type)}>
                    {alert.message}
                  </AlertDescription>
                  
                  {alert.details && (
                    <div className="mt-2 text-xs opacity-75">
                      <details className="cursor-pointer">
                        <summary className="hover:underline">자세한 정보</summary>
                        <div className="mt-1 p-2 bg-white/50 rounded text-xs font-mono">
                          <pre>{JSON.stringify(alert.details, null, 2)}</pre>
                        </div>
                      </details>
                    </div>
                  )}
                </div>
                
                <div className="flex items-center space-x-2 ml-4">
                  {showTimestamp && (
                    <div className="flex items-center text-xs opacity-75">
                      <Clock className="w-3 h-3 mr-1" />
                      {formatTimestamp(alert.timestamp)}
                    </div>
                  )}
                  
                  {alert.dismissible && onDismiss && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDismiss(alert.id)}
                      className="h-6 w-6 p-0 hover:bg-white/50"
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              </div>
              
              {alert.onAction && alert.actionLabel && (
                <div className="mt-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={alert.onAction}
                    className="text-xs"
                  >
                    {alert.actionLabel}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </Alert>
      ))}
      
      {alerts.length > maxAlerts && (
        <div className="text-center py-2">
          <span className="text-sm text-gray-500">
            {alerts.length - maxAlerts}개의 추가 알림이 있습니다
          </span>
        </div>
      )}
    </div>
  );
}