'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { X } from 'lucide-react';

interface ProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  product?: any;
  mode?: 'create' | 'edit' | 'view';
}

export function ProductModal({ isOpen, onClose, onSubmit, product, mode = 'create' }: ProductModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    model: '',
    color: '',
    manufacturer: '',
    brand: '',
    costCny: 0,
    description: '',
    onHand: 0,
    minStock: 5,
    ...product,
  });

  useEffect(() => {
    if (product) {
      setFormData({ ...product });
    }
  }, [product]);

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
            {mode === 'create' ? '새 상품 등록' : mode === 'edit' ? '상품 수정' : '상품 상세'}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">상품명</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              disabled={isViewMode}
              required
            />
          </div>

          <div>
            <Label htmlFor="category">카테고리</Label>
            <Select
              id="category"
              value={formData.category}
              onChange={(e) => handleChange('category', e.target.value)}
              disabled={isViewMode}
              required
            >
              <option value="">선택하세요</option>
              <option value="의류">의류</option>
              <option value="가방">가방</option>
              <option value="신발">신발</option>
              <option value="액세서리">액세서리</option>
              <option value="화장품">화장품</option>
              <option value="전자제품">전자제품</option>
              <option value="기타">기타</option>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="model">모델</Label>
              <Input
                id="model"
                value={formData.model}
                onChange={(e) => handleChange('model', e.target.value)}
                disabled={isViewMode}
              />
            </div>

            <div>
              <Label htmlFor="color">색상</Label>
              <Input
                id="color"
                value={formData.color}
                onChange={(e) => handleChange('color', e.target.value)}
                disabled={isViewMode}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="manufacturer">제조사</Label>
              <Input
                id="manufacturer"
                value={formData.manufacturer}
                onChange={(e) => handleChange('manufacturer', e.target.value)}
                disabled={isViewMode}
              />
            </div>

            <div>
              <Label htmlFor="brand">브랜드</Label>
              <Input
                id="brand"
                value={formData.brand}
                onChange={(e) => handleChange('brand', e.target.value)}
                disabled={isViewMode}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="costCny">원가(CNY)</Label>
              <Input
                id="costCny"
                type="number"
                value={formData.costCny}
                onChange={(e) => handleChange('costCny', parseFloat(e.target.value) || 0)}
                disabled={isViewMode}
                required
              />
            </div>

            <div>
              <Label htmlFor="onHand">재고 수량</Label>
              <Input
                id="onHand"
                type="number"
                value={formData.onHand}
                onChange={(e) => handleChange('onHand', parseInt(e.target.value) || 0)}
                disabled={isViewMode || mode === 'create'}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="minStock">최소 재고</Label>
            <Input
              id="minStock"
              type="number"
              value={formData.minStock}
              onChange={(e) => handleChange('minStock', parseInt(e.target.value) || 0)}
              disabled={isViewMode}
            />
          </div>

          <div>
            <Label htmlFor="description">설명</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              disabled={isViewMode}
            />
          </div>

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={onClose}>
              취소
            </Button>
            {!isViewMode && (
              <Button type="submit">
                {mode === 'create' ? '등록' : '수정'}
              </Button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}