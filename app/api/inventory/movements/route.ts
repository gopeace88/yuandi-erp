import { NextRequest, NextResponse } from 'next/server';

// Mock data for inventory movements
const mockMovements = [
  {
    id: '1',
    date: '2024-01-04',
    type: 'inbound',
    productName: '프리미엄 가방',
    quantity: 30,
    note: '정기 입고',
    createdAt: new Date().toISOString()
  },
  {
    id: '2',
    date: '2024-01-05',
    type: 'outbound',
    productName: '프리미엄 가방',
    quantity: -5,
    note: '판매',
    createdAt: new Date().toISOString()
  },
  {
    id: '3',
    date: '2024-01-06',
    type: 'adjustment',
    productName: '스마트 워치',
    quantity: 2,
    note: '재고 조정',
    createdAt: new Date().toISOString()
  }
];

export async function GET(request: NextRequest) {
  try {
    // Return mock data
    return NextResponse.json(mockMovements);
  } catch (error) {
    console.error('Error fetching movements:', error);
    return NextResponse.json(
      { error: 'Failed to fetch movements' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Create new movement with mock ID
    const newMovement = {
      id: Date.now().toString(),
      ...body,
      createdAt: new Date().toISOString()
    };
    
    return NextResponse.json(newMovement, { status: 201 });
  } catch (error) {
    console.error('Error creating movement:', error);
    return NextResponse.json(
      { error: 'Failed to create movement' },
      { status: 500 }
    );
  }
}