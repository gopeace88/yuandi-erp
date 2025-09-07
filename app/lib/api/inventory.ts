import { createServerSupabase } from '@/lib/supabase/server'
import { getServerSession } from '@/lib/auth/session'

export async function getInventory() {
  const session = await getServerSession()
  if (!session) {
    throw new Error('Unauthorized')
  }

  // admin과 order_manager만 접근 가능
  if (session.user.role !== 'admin' && session.user.role !== 'order_manager') {
    throw new Error('Forbidden')
  }

  const supabase = await createServerSupabase()
  
  // 상품 목록 조회
  const { data: products } = await supabase
    .from('products')
    .select('*')
    .eq('active', true)
    .order('created_at', { ascending: false })
    .limit(20)
  
  // 통계 데이터 조회
  const { data: allProducts } = await supabase
    .from('products')
    .select('id, on_hand, low_stock_threshold, cost_cny')
    .eq('active', true)
  
  const totalProducts = allProducts?.length || 0
  const totalStock = allProducts?.reduce((sum, p) => sum + p.on_hand, 0) || 0
  const lowStock = allProducts?.filter(p => p.on_hand <= p.low_stock_threshold).length || 0
  const totalValue = allProducts?.reduce((sum, p) => sum + (p.on_hand * p.cost_cny), 0) || 0
  
  return {
    products: products || [],
    stats: {
      totalProducts,
      totalStock,
      lowStock,
      totalValue
    }
  }
}