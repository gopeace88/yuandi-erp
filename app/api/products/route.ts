import { NextRequest, NextResponse } from 'next/server';

// Mock data for products
const mockProducts = [
  {
    id: '1',
    sku: 'BAG-LX2024-BLACK-YUANDI-A1B2C',
    name: '프리미엄 가방',
    category: 'BAG',
    model: 'LX2024',
    color: 'BLACK',
    manufacturer: 'YUANDI',
    cost: 450,
    onHand: 15,
    imageUrl: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: '2',
    sku: 'WATCH-SM100-SILVER-TechBrand-D3E4F',
    name: '스마트 워치',
    category: 'WATCH',
    model: 'SM100',
    color: 'SILVER',
    manufacturer: 'TechBrand',
    cost: 300,
    onHand: 3,
    imageUrl: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: '3',
    sku: 'COSMETICS-BeautyA-NONE-BeautyPlus-G5H6I',
    name: '화장품 세트',
    category: 'COSMETICS',
    model: 'BeautyA',
    color: null,
    manufacturer: 'BeautyPlus',
    cost: 150,
    onHand: 25,
    imageUrl: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

export async function GET(request: NextRequest) {
  try {
    // Return mock data
    return NextResponse.json(mockProducts);
  } catch (error) {
    console.error('Error fetching products:', error);
    return NextResponse.json(
      { error: 'Failed to fetch products' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Create new product with mock ID
    const newProduct = {
      id: Date.now().toString(),
      ...body,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    return NextResponse.json(newProduct, { status: 201 });
  } catch (error) {
    console.error('Error creating product:', error);
    return NextResponse.json(
      { error: 'Failed to create product' },
      { status: 500 }
    );
  }
}