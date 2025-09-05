'use client'

import { useState, useEffect } from 'react'
import { Search, Download, TrendingUp, TrendingDown, DollarSign, Calendar } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns'
import { ko } from 'date-fns/locale'

interface CashbookEntry {
  id: string
  date: string
  type: 'INCOME' | 'EXPENSE'
  category: string
  description: string
  amount: number
  currency: 'KRW' | 'CNY'
  reference_type?: string
  reference_id?: string
  balance_after: number
  created_at: string
  created_by: string
}

interface CashbookSummary {
  total_income: number
  total_expense: number
  net_profit: number
  current_balance: number
  monthly_income: number
  monthly_expense: number
  previous_month_income: number
  previous_month_expense: number
}

const categoryOptions = {
  INCOME: [
    { value: 'order_payment', label: '주문 결제' },
    { value: 'deposit', label: '입금' },
    { value: 'other_income', label: '기타 수입' },
  ],
  EXPENSE: [
    { value: 'product_purchase', label: '상품 구매' },
    { value: 'shipping_fee', label: '배송비' },
    { value: 'customs_fee', label: '관세/통관비' },
    { value: 'refund', label: '환불' },
    { value: 'commission', label: '수수료' },
    { value: 'other_expense', label: '기타 지출' },
  ],
}

export default function CashbookPage() {
  const [entries, setEntries] = useState<CashbookEntry[]>([])
  const [summary, setSummary] = useState<CashbookSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [dateRange, setDateRange] = useState<string>('this_month')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  useEffect(() => {
    const now = new Date()
    if (dateRange === 'this_month') {
      setStartDate(format(startOfMonth(now), 'yyyy-MM-dd'))
      setEndDate(format(endOfMonth(now), 'yyyy-MM-dd'))
    } else if (dateRange === 'last_month') {
      const lastMonth = subMonths(now, 1)
      setStartDate(format(startOfMonth(lastMonth), 'yyyy-MM-dd'))
      setEndDate(format(endOfMonth(lastMonth), 'yyyy-MM-dd'))
    }
  }, [dateRange])

  useEffect(() => {
    fetchCashbook()
    fetchSummary()
  }, [startDate, endDate])

  const fetchCashbook = async () => {
    try {
      const params = new URLSearchParams({
        start_date: startDate,
        end_date: endDate,
      })
      const response = await fetch(`/api/cashbook?${params}`)
      if (!response.ok) throw new Error('Failed to fetch cashbook')
      const data = await response.json()
      setEntries(data)
    } catch (error) {
      console.error('Error fetching cashbook:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchSummary = async () => {
    try {
      const response = await fetch('/api/cashbook/summary')
      if (!response.ok) throw new Error('Failed to fetch summary')
      const data = await response.json()
      setSummary(data)
    } catch (error) {
      console.error('Error fetching summary:', error)
    }
  }

  const handleExport = async () => {
    try {
      const params = new URLSearchParams({
        start_date: startDate,
        end_date: endDate,
      })
      const response = await fetch(`/api/export/cashbook?${params}`)
      if (!response.ok) throw new Error('Failed to export')
      
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `cashbook_${startDate}_${endDate}.xlsx`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    } catch (error) {
      console.error('Error exporting:', error)
      alert('내보내기에 실패했습니다.')
    }
  }

  const formatCurrency = (amount: number, currency: string) => {
    const symbol = currency === 'KRW' ? '₩' : '¥'
    return `${symbol}${Math.abs(amount).toLocaleString()}`
  }

  const getCategoryLabel = (type: string, category: string) => {
    const categories = type === 'INCOME' ? categoryOptions.INCOME : categoryOptions.EXPENSE
    return categories.find(c => c.value === category)?.label || category
  }

  const getChangePercentage = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0
    return Math.round(((current - previous) / previous) * 100)
  }

  const filteredEntries = entries.filter(entry => {
    const matchesSearch = 
      entry.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      getCategoryLabel(entry.type, entry.category).toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesType = typeFilter === 'all' || entry.type === typeFilter
    const matchesCategory = categoryFilter === 'all' || entry.category === categoryFilter
    
    return matchesSearch && matchesType && matchesCategory
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-900">현금장부</h1>
        <Button onClick={handleExport} className="flex items-center gap-2">
          <Download className="h-4 w-4" />
          Excel 내보내기
        </Button>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">현재 잔액</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ₩{summary.current_balance.toLocaleString()}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">이번달 수입</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                ₩{summary.monthly_income.toLocaleString()}
              </div>
              {summary.previous_month_income > 0 && (
                <p className="text-xs text-muted-foreground">
                  전월 대비 {getChangePercentage(summary.monthly_income, summary.previous_month_income)}%
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">이번달 지출</CardTitle>
              <TrendingDown className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                ₩{summary.monthly_expense.toLocaleString()}
              </div>
              {summary.previous_month_expense > 0 && (
                <p className="text-xs text-muted-foreground">
                  전월 대비 {getChangePercentage(summary.monthly_expense, summary.previous_month_expense)}%
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">순이익</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${summary.net_profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                ₩{summary.net_profit.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                수익률: {summary.total_income > 0 ? Math.round((summary.net_profit / summary.total_income) * 100) : 0}%
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card className="p-6 mb-6">
        <div className="flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="설명, 카테고리로 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="기간 선택" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">오늘</SelectItem>
              <SelectItem value="this_month">이번달</SelectItem>
              <SelectItem value="last_month">지난달</SelectItem>
              <SelectItem value="custom">직접 선택</SelectItem>
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="유형" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체</SelectItem>
              <SelectItem value="INCOME">수입</SelectItem>
              <SelectItem value="EXPENSE">지출</SelectItem>
            </SelectContent>
          </Select>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="카테고리" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체</SelectItem>
              <SelectItem value="order_payment">주문 결제</SelectItem>
              <SelectItem value="product_purchase">상품 구매</SelectItem>
              <SelectItem value="shipping_fee">배송비</SelectItem>
              <SelectItem value="refund">환불</SelectItem>
              <SelectItem value="other">기타</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Transaction Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  날짜
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  유형
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  카테고리
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  설명
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  금액
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  잔액
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredEntries.map((entry) => (
                <tr key={entry.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {format(new Date(entry.date), 'yyyy-MM-dd', { locale: ko })}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Badge className={entry.type === 'INCOME' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                      {entry.type === 'INCOME' ? '수입' : '지출'}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {getCategoryLabel(entry.type, entry.category)}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    <div>{entry.description}</div>
                    {entry.reference_type && (
                      <div className="text-xs text-gray-500">
                        참조: {entry.reference_type} #{entry.reference_id}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                    <span className={entry.type === 'INCOME' ? 'text-green-600' : 'text-red-600'}>
                      {entry.type === 'INCOME' ? '+' : '-'}
                      {formatCurrency(entry.amount, entry.currency)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium">
                    ₩{entry.balance_after.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {filteredEntries.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">거래 내역이 없습니다.</p>
        </div>
      )}
    </div>
  )
}