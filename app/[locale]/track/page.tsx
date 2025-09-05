/**
 * 주문 조회 페이지 - 다국어 지원
 * 고객이 이름과 전화번호로 주문을 조회할 수 있는 공개 페이지
 */

'use client';

import { useState, useTransition } from 'react';
import { type Locale } from '@/lib/i18n';
import { useTranslationContext } from '@/components/i18n/TranslationProvider';
import LanguageSelector from '@/components/i18n/LanguageSelector';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Search, 
  Package, 
  Calendar, 
  Phone, 
  MapPin, 
  CreditCard,
  Truck,
  CheckCircle,
  Clock,
  XCircle,
  ArrowLeft,
  Globe
} from 'lucide-react';
import Link from 'next/link';

interface Order {
  id: string;
  orderNumber: string;
  status: 'paid' | 'shipped' | 'done' | 'refunded' | 'cancelled';
  orderDate: string;
  totalAmount: number;
  items: Array<{
    productName: string;
    quantity: number;
    price: number;
  }>;
  shippingAddress?: string;
  trackingNumber?: string;
  deliveryDate?: string;
}

interface TrackPageProps {
  params: { locale: Locale };
}

const statusIcons = {
  paid: <CreditCard className="w-4 h-4" />,
  shipped: <Truck className="w-4 h-4" />,
  done: <CheckCircle className="w-4 h-4" />,
  refunded: <XCircle className="w-4 h-4" />,
  cancelled: <XCircle className="w-4 h-4" />
};

const statusColors = {
  paid: 'bg-blue-100 text-blue-800',
  shipped: 'bg-yellow-100 text-yellow-800',
  done: 'bg-green-100 text-green-800',
  refunded: 'bg-gray-100 text-gray-800',
  cancelled: 'bg-red-100 text-red-800'
};

export default function TrackPage({ params: { locale } }: TrackPageProps) {
  const { t, formatCurrency, formatDate } = useTranslationContext();
  const [isPending, startTransition] = useTransition();
  const [customerName, setCustomerName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [orders, setOrders] = useState<Order[]>([]);
  const [searchPerformed, setSearchPerformed] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = () => {
    if (!customerName.trim() || !phoneNumber.trim()) {
      setError(t('errors.required'));
      return;
    }

    startTransition(async () => {
      try {
        setError('');
        
        // 실제로는 API 호출
        // const response = await fetch(`/api/track?name=${encodeURIComponent(customerName)}&phone=${encodeURIComponent(phoneNumber)}`);
        
        // 모의 데이터
        const mockOrders: Order[] = [
          {
            id: '1',
            orderNumber: 'ORD-240101-001',
            status: 'done',
            orderDate: new Date('2024-01-01').toISOString(),
            totalAmount: 125000,
            items: [
              { productName: '아이폰 15 Pro', quantity: 1, price: 125000 }
            ],
            shippingAddress: '서울특별시 강남구 테헤란로 123',
            trackingNumber: '1234567890',
            deliveryDate: new Date('2024-01-05').toISOString()
          },
          {
            id: '2',
            orderNumber: 'ORD-240115-002',
            status: 'shipped',
            orderDate: new Date('2024-01-15').toISOString(),
            totalAmount: 89000,
            items: [
              { productName: 'AirPods Pro', quantity: 1, price: 89000 }
            ],
            shippingAddress: '서울특별시 강남구 테헤란로 123',
            trackingNumber: '0987654321'
          },
          {
            id: '3',
            orderNumber: 'ORD-240120-003',
            status: 'paid',
            orderDate: new Date('2024-01-20').toISOString(),
            totalAmount: 45000,
            items: [
              { productName: 'iPhone 케이스', quantity: 2, price: 22500 }
            ],
            shippingAddress: '서울특별시 강남구 테헤란로 123'
          }
        ];

        setOrders(mockOrders);
        setSearchPerformed(true);
      } catch (error) {
        console.error('Search failed:', error);
        setError(t('errors.networkError'));
      }
    });
  };

  const getStatusText = (status: string) => {
    return t(`orders.statuses.${status}`, {}, status);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link href={`/${locale}`}>
                <Button variant="ghost" className="mr-4">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  {t('common.back')}
                </Button>
              </Link>
              <div className="flex items-center">
                <Globe className="w-6 h-6 text-blue-600" />
                <span className="ml-2 text-xl font-bold text-gray-900">YUANDI</span>
              </div>
            </div>
            
            <LanguageSelector currentLocale={locale} variant="compact" />
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            {t('track.title')}
          </h1>
          <p className="text-gray-600">
            {t('track.enterDetails')}
          </p>
        </div>

        {/* Search Form */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Search className="w-5 h-5 mr-2" />
              {t('track.searchOrders')}
            </CardTitle>
            <CardDescription>
              {t('track.enterDetails')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="customerName">
                  {t('track.customerName')}
                </Label>
                <Input
                  id="customerName"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder={t('track.customerName')}
                  disabled={isPending}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phoneNumber">
                  {t('track.phoneNumber')}
                </Label>
                <Input
                  id="phoneNumber"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="010-1234-5678"
                  disabled={isPending}
                />
              </div>
            </div>
            
            {error && (
              <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">
                {error}
              </div>
            )}
            
            <Button 
              onClick={handleSearch}
              disabled={isPending}
              className="w-full"
            >
              {isPending ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  {t('common.loading')}
                </div>
              ) : (
                <>
                  <Search className="w-4 h-4 mr-2" />
                  {t('track.searchOrders')}
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Search Results */}
        {searchPerformed && (
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              {t('track.recentOrders')}
            </h2>
            
            {orders.length === 0 ? (
              <Card>
                <CardContent className="text-center py-8">
                  <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">
                    {t('track.orderNotFound')}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {orders.map((order) => (
                  <Card key={order.id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-lg">
                            {order.orderNumber}
                          </CardTitle>
                          <CardDescription className="flex items-center mt-1">
                            <Calendar className="w-4 h-4 mr-1" />
                            {formatDate(new Date(order.orderDate))}
                          </CardDescription>
                        </div>
                        <Badge 
                          variant="secondary"
                          className={statusColors[order.status]}
                        >
                          <div className="flex items-center">
                            {statusIcons[order.status]}
                            <span className="ml-1">
                              {getStatusText(order.status)}
                            </span>
                          </div>
                        </Badge>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="space-y-4">
                      {/* Order Items */}
                      <div>
                        <h4 className="font-medium text-sm text-gray-700 mb-2">
                          {t('orders.orderItems', {}, 'Order Items')}
                        </h4>
                        <div className="space-y-2">
                          {order.items.map((item, index) => (
                            <div key={index} className="flex justify-between text-sm">
                              <span>
                                {item.productName} × {item.quantity}
                              </span>
                              <span className="font-medium">
                                {formatCurrency(item.price * item.quantity)}
                              </span>
                            </div>
                          ))}
                        </div>
                        <Separator className="my-2" />
                        <div className="flex justify-between text-sm font-medium">
                          <span>{t('orders.totalAmount')}</span>
                          <span>{formatCurrency(order.totalAmount)}</span>
                        </div>
                      </div>

                      {/* Shipping Info */}
                      {order.shippingAddress && (
                        <div>
                          <h4 className="font-medium text-sm text-gray-700 mb-2">
                            {t('shipping.address')}
                          </h4>
                          <p className="text-sm text-gray-600 flex items-start">
                            <MapPin className="w-4 h-4 mr-1 mt-0.5 flex-shrink-0" />
                            {order.shippingAddress}
                          </p>
                        </div>
                      )}

                      {/* Tracking Info */}
                      {order.trackingNumber && (
                        <div>
                          <h4 className="font-medium text-sm text-gray-700 mb-2">
                            {t('shipping.trackingNumber')}
                          </h4>
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">
                              {order.trackingNumber}
                            </span>
                            {order.status === 'shipped' && (
                              <Button variant="outline" size="sm">
                                {t('shipping.trackingUrl')}
                              </Button>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Delivery Date */}
                      {order.deliveryDate && (
                        <div>
                          <h4 className="font-medium text-sm text-gray-700 mb-2">
                            {t('shipping.deliveryDate')}
                          </h4>
                          <p className="text-sm text-gray-600 flex items-center">
                            <CheckCircle className="w-4 h-4 mr-1 text-green-600" />
                            {formatDate(new Date(order.deliveryDate))}
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}