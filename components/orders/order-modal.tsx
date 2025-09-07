'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { X } from 'lucide-react';

interface OrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  order?: any;
  mode?: 'create' | 'edit' | 'view';
}

export function OrderModal({ isOpen, onClose, onSubmit, order, mode = 'create' }: OrderModalProps) {
  const [formData, setFormData] = useState({
    customerName: '',
    customerPhone: '',
    customerPccc: '',
    shippingAddress: '',
    items: [],
    totalAmount: 0,
    status: 'paid',
    notes: '',
    ...order,
  });

  useEffect(() => {
    if (order) {
      setFormData({ ...order });
    }
  }, [order]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (!isOpen) return null;

  const isViewMode = mode === 'view';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">
            {mode === 'create' ? '새 주문 생성' : mode === 'edit' ? '주문 수정' : '주문 상세'}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="customerName">고객명</Label>
            <Input
              id="customerName"
              value={formData.customerName}
              onChange={(e) => handleChange('customerName', e.target.value)}
              disabled={isViewMode}
              required
            />
          </div>

          <div>
            <Label htmlFor="customerPhone">전화번호</Label>
            <Input
              id="customerPhone"
              value={formData.customerPhone}
              onChange={(e) => handleChange('customerPhone', e.target.value)}
              disabled={isViewMode}
              required
            />
          </div>

          <div>
            <Label htmlFor="customerPccc">개인통관고유부호</Label>
            <Input
              id="customerPccc"
              value={formData.customerPccc}
              onChange={(e) => handleChange('customerPccc', e.target.value)}
              disabled={isViewMode}
              required
            />
          </div>

          <div>
            <Label htmlFor="shippingAddress">배송 주소</Label>
            <Textarea
              id="shippingAddress"
              value={formData.shippingAddress}
              onChange={(e) => handleChange('shippingAddress', e.target.value)}
              disabled={isViewMode}
              required
            />
          </div>

          <div>
            <Label htmlFor="status">상태</Label>
            <Select
              id="status"
              value={formData.status}
              onChange={(e) => handleChange('status', e.target.value)}
              disabled={isViewMode || mode === 'create'}
            >
              <option value="paid">결제완료</option>
              <option value="shipped">배송중</option>
              <option value="delivered">완료</option>
              <option value="refunded">환불</option>
            </Select>
          </div>

          <div>
            <Label htmlFor="notes">메모</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              disabled={isViewMode}
            />
          </div>

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={onClose}>
              취소
            </Button>
            {!isViewMode && (
              <Button type="submit">
                {mode === 'create' ? '생성' : '수정'}
              </Button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}