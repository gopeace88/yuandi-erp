'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
    Package,
    ShoppingCart,
    Truck,
    DollarSign,
    TrendingUp,
    AlertTriangle,
    Users,
    BarChart3,
    Plus,
    Eye,
    MoreHorizontal
} from 'lucide-react'
import { BottomNavigation } from '@/components/layout/mobile-navigation'

interface DashboardStats {
    todaySales: number
    todayOrders: number
    totalProducts: number
    lowStockCount: number
    pendingOrders: number
    shippedOrders: number
    completedOrders: number
}

export function MobileDashboard() {
    const [stats, setStats] = useState<DashboardStats>({
        todaySales: 0,
        todayOrders: 0,
        totalProducts: 0,
        lowStockCount: 0,
        pendingOrders: 0,
        shippedOrders: 0,
        completedOrders: 0
    })
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        // Simulate API call
        const fetchStats = async () => {
            try {
                // Mock data for now
                setStats({
                    todaySales: 1250000,
                    todayOrders: 23,
                    totalProducts: 156,
                    lowStockCount: 8,
                    pendingOrders: 12,
                    shippedOrders: 15,
                    completedOrders: 8
                })
            } catch (error) {
                console.error('Failed to fetch dashboard stats:', error)
            } finally {
                setLoading(false)
            }
        }

        fetchStats()
    }, [])

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('ko-KR', {
            style: 'currency',
            currency: 'KRW'
        }).format(amount)
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 p-4">
                <div className="animate-pulse space-y-4">
                    <div className="h-8 bg-gray-200 rounded w-1/3"></div>
                    <div className="grid grid-cols-2 gap-4">
                        {[...Array(4)].map((_, i) => (
                            <div key={i} className="h-24 bg-gray-200 rounded"></div>
                        ))}
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50 pb-16">

            {/* Mobile Header */}
            <div className="bg-white shadow-sm border-b px-4 py-3 sticky top-0 z-10">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-bold text-gray-900">대시보드</h1>
                        <p className="text-sm text-gray-500">오늘의 현황을 확인하세요</p>
                    </div>
                    <div className="flex items-center space-x-2">
                        <Button size="sm" variant="outline" className="h-8">
                            <Eye className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="outline" className="h-8">
                            <MoreHorizontal className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </div>

            <div className="p-4 space-y-6">
                {/* Quick Stats - Mobile Grid - 최적화된 글자 크기 */}
                <div className="grid grid-cols-2 gap-3">
                    <Card className="border-0 shadow-sm">
                        <CardContent className="p-3">
                            <div className="flex items-center justify-between">
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs text-gray-500 mb-1 truncate">오늘 매출</p>
                                    <p className="text-sm font-bold text-gray-900 truncate">
                                        {formatCurrency(stats.todaySales)}
                                    </p>
                                </div>
                                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                    <DollarSign className="h-4 w-4 text-green-600" />
                                </div>
                            </div>
                            <div className="flex items-center mt-1">
                                <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
                                <span className="text-xs text-green-600">+12.5%</span>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-0 shadow-sm">
                        <CardContent className="p-3">
                            <div className="flex items-center justify-between">
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs text-gray-500 mb-1 truncate">오늘 주문</p>
                                    <p className="text-sm font-bold text-gray-900">{stats.todayOrders}</p>
                                </div>
                                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                    <ShoppingCart className="h-4 w-4 text-blue-600" />
                                </div>
                            </div>
                            <div className="flex items-center mt-1">
                                <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
                                <span className="text-xs text-green-600">+8.2%</span>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-0 shadow-sm">
                        <CardContent className="p-3">
                            <div className="flex items-center justify-between">
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs text-gray-500 mb-1 truncate">총 상품</p>
                                    <p className="text-sm font-bold text-gray-900">{stats.totalProducts}</p>
                                </div>
                                <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                    <Package className="h-4 w-4 text-purple-600" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-0 shadow-sm">
                        <CardContent className="p-3">
                            <div className="flex items-center justify-between">
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs text-gray-500 mb-1 truncate">재고 부족</p>
                                    <p className="text-sm font-bold text-gray-900">{stats.lowStockCount}</p>
                                </div>
                                <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                    <AlertTriangle className="h-4 w-4 text-orange-600" />
                                </div>
                            </div>
                            {stats.lowStockCount > 0 && (
                                <Badge variant="destructive" className="mt-1 text-xs px-1 py-0">
                                    주의
                                </Badge>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Order Status Overview - 모바일 최적화 */}
                <Card className="border-0 shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base">주문 현황</CardTitle>
                        <CardDescription className="text-xs">실시간 주문 상태 분포</CardDescription>
                    </CardHeader>
                    <CardContent className="p-3 pt-0">
                        <div className="space-y-2">
                            <div className="flex items-center justify-between py-1">
                                <div className="flex items-center space-x-2">
                                    <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                                    <span className="text-xs text-gray-600">결제완료</span>
                                </div>
                                <span className="text-xs font-medium">{stats.pendingOrders}</span>
                            </div>
                            <div className="flex items-center justify-between py-1">
                                <div className="flex items-center space-x-2">
                                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                    <span className="text-xs text-gray-600">배송중</span>
                                </div>
                                <span className="text-xs font-medium">{stats.shippedOrders}</span>
                            </div>
                            <div className="flex items-center justify-between py-1">
                                <div className="flex items-center space-x-2">
                                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                    <span className="text-xs text-gray-600">배송완료</span>
                                </div>
                                <span className="text-xs font-medium">{stats.completedOrders}</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Quick Actions - 모바일 최적화 */}
                <Card className="border-0 shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base">빠른 작업</CardTitle>
                        <CardDescription className="text-xs">자주 사용하는 기능에 빠르게 접근</CardDescription>
                    </CardHeader>
                    <CardContent className="p-3 pt-0">
                        <div className="grid grid-cols-2 gap-2">
                            <Button className="h-10 flex flex-col items-center justify-center space-y-1 bg-blue-600 hover:bg-blue-700">
                                <Plus className="h-4 w-4" />
                                <span className="text-xs">새 주문</span>
                            </Button>
                            <Button variant="outline" className="h-10 flex flex-col items-center justify-center space-y-1">
                                <Package className="h-4 w-4" />
                                <span className="text-xs">재고 관리</span>
                            </Button>
                            <Button variant="outline" className="h-10 flex flex-col items-center justify-center space-y-1">
                                <Truck className="h-4 w-4" />
                                <span className="text-xs">배송 관리</span>
                            </Button>
                            <Button variant="outline" className="h-10 flex flex-col items-center justify-center space-y-1">
                                <BarChart3 className="h-4 w-4" />
                                <span className="text-xs">보고서</span>
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Recent Activity - 모바일 최적화 */}
                <Card className="border-0 shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base">최근 활동</CardTitle>
                        <CardDescription className="text-xs">최근 처리된 주문 및 업데이트</CardDescription>
                    </CardHeader>
                    <CardContent className="p-3 pt-0">
                        <div className="space-y-2">
                            {[
                                { id: 1, order: 'ORD-241225-001', customer: '홍길동', status: '배송완료', time: '2분 전' },
                                { id: 2, order: 'ORD-241225-002', customer: '김철수', status: '배송중', time: '15분 전' },
                                { id: 3, order: 'ORD-241225-003', customer: '이영희', status: '결제완료', time: '1시간 전' },
                            ].map((activity) => (
                                <div key={activity.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-medium text-gray-900 truncate">{activity.order}</p>
                                        <p className="text-xs text-gray-500 truncate">{activity.customer}</p>
                                    </div>
                                    <div className="text-right flex-shrink-0 ml-2">
                                        <Badge variant={activity.status === '배송완료' ? 'default' : 'secondary'} className="text-xs px-1 py-0">
                                            {activity.status}
                                        </Badge>
                                        <p className="text-xs text-gray-400 mt-1">{activity.time}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
            
            {/* Bottom Navigation */}
            <BottomNavigation />
        </div>
    )
}
