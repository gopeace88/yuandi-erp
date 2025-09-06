'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
    CreditCard,
    Truck,
    CheckCircle,
    RotateCcw,
    XCircle,
    ArrowRight,
    Clock
} from 'lucide-react'

export type OrderStatus = 'PENDING' | 'PAID' | 'SHIPPED' | 'DONE' | 'REFUNDED' | 'CANCELLED'

interface OrderStatusFlowProps {
    currentStatus: OrderStatus
    onStatusChange?: (newStatus: OrderStatus) => void
    showActions?: boolean
    compact?: boolean
}

const statusConfig = {
    PENDING: {
        label: '결제 대기',
        color: 'bg-gray-100 text-gray-800',
        icon: Clock,
        description: '고객이 결제를 완료하기를 기다리는 상태'
    },
    PAID: {
        label: '결제완료',
        color: 'bg-blue-100 text-blue-800',
        icon: CreditCard,
        description: '입금 확인 후 주문이 생성된 상태'
    },
    SHIPPED: {
        label: '배송중',
        color: 'bg-yellow-100 text-yellow-800',
        icon: Truck,
        description: '물류업체에 수거 완료, 배송 중인 상태'
    },
    DONE: {
        label: '배송완료',
        color: 'bg-green-100 text-green-800',
        icon: CheckCircle,
        description: '고객이 상품을 정상적으로 수령한 상태'
    },
    REFUNDED: {
        label: '환불완료',
        color: 'bg-red-100 text-red-800',
        icon: RotateCcw,
        description: '배송 후 환불이 처리된 상태'
    },
    CANCELLED: {
        label: '주문취소',
        color: 'bg-gray-100 text-gray-800',
        icon: XCircle,
        description: '배송 전 주문이 취소된 상태'
    }
}

const statusFlow = ['PENDING', 'PAID', 'SHIPPED', 'DONE'] as const
const alternativeFlows = {
    CANCELLED: ['PENDING', 'PAID'],
    REFUNDED: ['PENDING', 'PAID', 'SHIPPED', 'DONE']
}

export function OrderStatusFlow({
    currentStatus,
    onStatusChange,
    showActions = false,
    compact = false
}: OrderStatusFlowProps) {
    const [isExpanded, setIsExpanded] = useState(false)

    const getFlowSteps = () => {
        if (currentStatus === 'CANCELLED') {
            return alternativeFlows.CANCELLED
        }
        if (currentStatus === 'REFUNDED') {
            return alternativeFlows.REFUNDED
        }
        return statusFlow
    }

    const getNextStatus = (current: OrderStatus): OrderStatus | null => {
        const flow = getFlowSteps()
        const currentIndex = flow.indexOf(current as any)
        if (currentIndex === -1 || currentIndex === flow.length - 1) {
            return null
        }
        return flow[currentIndex + 1] as OrderStatus
    }

    const getPreviousStatus = (current: OrderStatus): OrderStatus | null => {
        const flow = getFlowSteps()
        const currentIndex = flow.indexOf(current as any)
        if (currentIndex <= 0) {
            return null
        }
        return flow[currentIndex - 1] as OrderStatus
    }

    const canChangeTo = (targetStatus: OrderStatus): boolean => {
        if (targetStatus === currentStatus) return false

        // 특별한 경우들
        if (targetStatus === 'CANCELLED') {
            return currentStatus === 'PENDING' || currentStatus === 'PAID'
        }
        if (targetStatus === 'REFUNDED') {
            return currentStatus === 'SHIPPED' || currentStatus === 'DONE'
        }

        // 일반적인 플로우
        const nextStatus = getNextStatus(currentStatus)
        return nextStatus === targetStatus
    }

    const flowSteps = getFlowSteps()
    const currentIndex = flowSteps.indexOf(currentStatus as any)

    if (compact) {
        const currentConfig = statusConfig[currentStatus]
        const Icon = currentConfig.icon

        return (
            <div className="flex items-center space-x-2">
                <Badge className={`${currentConfig.color} flex items-center space-x-1`}>
                    <Icon className="h-3 w-3" />
                    <span className="text-xs">{currentConfig.label}</span>
                </Badge>
                {showActions && (
                    <div className="flex space-x-1">
                        {Object.entries(statusConfig).map(([status, config]) => {
                            if (!canChangeTo(status as OrderStatus)) return null
                            const StatusIcon = config.icon
                            return (
                                <Button
                                    key={status}
                                    size="sm"
                                    variant="outline"
                                    onClick={() => onStatusChange?.(status as OrderStatus)}
                                    className="h-6 px-2 text-xs"
                                >
                                    <StatusIcon className="h-3 w-3" />
                                </Button>
                            )
                        })}
                    </div>
                )}
            </div>
        )
    }

    return (
        <Card className="w-full">
            <CardHeader className="pb-3">
                <CardTitle className="text-lg">주문 상태 관리</CardTitle>
                <CardDescription>
                    현재 상태: <span className="font-medium">{statusConfig[currentStatus].label}</span>
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* 상태 플로우 시각화 */}
                <div className="relative">
                    <div className="flex items-center justify-between">
                        {flowSteps.map((status, index) => {
                            const config = statusConfig[status as OrderStatus]
                            const Icon = config.icon
                            const isActive = status === currentStatus
                            const isCompleted = index < currentIndex
                            const isUpcoming = index > currentIndex

                            return (
                                <div key={status} className="flex flex-col items-center space-y-2">
                                    <div className={`
                    w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all
                    ${isActive
                                            ? 'border-blue-500 bg-blue-50 text-blue-600'
                                            : isCompleted
                                                ? 'border-green-500 bg-green-50 text-green-600'
                                                : 'border-gray-300 bg-gray-50 text-gray-400'
                                        }
                  `}>
                                        <Icon className="h-5 w-5" />
                                    </div>
                                    <div className="text-center">
                                        <p className={`text-xs font-medium ${isActive ? 'text-blue-600' : isCompleted ? 'text-green-600' : 'text-gray-500'
                                            }`}>
                                            {config.label}
                                        </p>
                                        {isActive && (
                                            <p className="text-xs text-gray-500 mt-1">
                                                {config.description}
                                            </p>
                                        )}
                                    </div>

                                    {/* 연결선 */}
                                    {index < flowSteps.length - 1 && (
                                        <div className="absolute top-6 left-1/2 transform translate-x-6 w-16 h-0.5 bg-gray-300">
                                            <div className={`h-full transition-all ${index < currentIndex ? 'bg-green-500' : 'bg-gray-300'
                                                }`} />
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                </div>

                {/* 상태 변경 액션 */}
                {showActions && (
                    <div className="pt-4 border-t">
                        <h4 className="text-sm font-medium text-gray-900 mb-3">상태 변경</h4>
                        <div className="grid grid-cols-2 gap-2">
                            {Object.entries(statusConfig).map(([status, config]) => {
                                if (!canChangeTo(status as OrderStatus)) return null
                                const StatusIcon = config.icon

                                return (
                                    <Button
                                        key={status}
                                        variant="outline"
                                        onClick={() => onStatusChange?.(status as OrderStatus)}
                                        className="flex items-center space-x-2 h-10"
                                    >
                                        <StatusIcon className="h-4 w-4" />
                                        <span className="text-sm">{config.label}</span>
                                    </Button>
                                )
                            })}
                        </div>
                    </div>
                )}

                {/* 상세 정보 */}
                <div className="pt-4 border-t">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="w-full"
                    >
                        {isExpanded ? '상세 정보 숨기기' : '상세 정보 보기'}
                    </Button>

                    {isExpanded && (
                        <div className="mt-3 space-y-2 text-sm text-gray-600">
                            <div className="bg-blue-50 p-3 rounded-lg">
                                <h5 className="font-medium text-blue-900 mb-2">주문 상태 설명</h5>
                                <ul className="space-y-1 text-xs">
                                    <li><strong>결제 대기:</strong> 고객이 결제를 완료하기를 기다리는 상태</li>
                                    <li><strong>결제완료:</strong> 입금 확인 후 주문이 생성된 상태 (재고 차감)</li>
                                    <li><strong>배송중:</strong> 물류업체에 수거 완료, 송장번호 등록된 상태</li>
                                    <li><strong>배송완료:</strong> 고객이 상품을 정상적으로 수령한 상태</li>
                                    <li><strong>주문취소:</strong> 배송 전 취소 (재고 복구됨)</li>
                                    <li><strong>환불완료:</strong> 배송 후 환불 (재고 복구 안됨)</li>
                                </ul>
                            </div>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}

// 사용 예시 컴포넌트
export function OrderStatusExample() {
    const [currentStatus, setCurrentStatus] = useState<OrderStatus>('PAID')

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">주문 상태 관리 예시</h2>

            <OrderStatusFlow
                currentStatus={currentStatus}
                onStatusChange={setCurrentStatus}
                showActions={true}
            />

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <h3 className="text-lg font-medium mb-2">컴팩트 뷰</h3>
                    <OrderStatusFlow
                        currentStatus={currentStatus}
                        onStatusChange={setCurrentStatus}
                        showActions={true}
                        compact={true}
                    />
                </div>

                <div>
                    <h3 className="text-lg font-medium mb-2">현재 상태</h3>
                    <div className="p-4 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-600">선택된 상태:</p>
                        <p className="text-lg font-medium">{statusConfig[currentStatus].label}</p>
                    </div>
                </div>
            </div>
        </div>
    )
}
