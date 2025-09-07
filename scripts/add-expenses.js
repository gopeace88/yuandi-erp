const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_API_KEY
);

async function addExpenses() {
    console.log('💰 출납장부 지출 기록 추가...');
    
    const adminId = '78502b6d-13e7-4acc-94a7-23a797de3519';
    const expenses = [];
    
    // 50개의 샘플 지출 기록 생성
    for (let i = 0; i < 50; i++) {
        const date = new Date();
        date.setDate(date.getDate() - Math.floor(Math.random() * 30));
        
        expenses.push({
            transaction_date: date.toISOString().split('T')[0],
            type: 'expense',
            amount_krw: -(10000 + Math.floor(Math.random() * 90000)), // -10,000 ~ -100,000원
            balance_krw: Math.floor(Math.random() * 500000), // 0~50만원 잔액
            description: `상품 구매 지출 #${i+1}`,
            category: '상품구매',
            created_by: adminId
        });
    }
    
    const { data, error } = await supabase
        .from('cashbook_transactions')
        .insert(expenses);
    
    if (error) {
        console.error('❌ 실패:', error);
    } else {
        console.log(`✅ ${expenses.length}개 지출 기록 추가 완료`);
    }
    
    // 통계 확인
    const { data: stats } = await supabase
        .from('cashbook_transactions')
        .select('type')
        .eq('type', 'expense');
    
    console.log(`📊 총 지출 기록: ${stats?.length || 0}개`);
}

addExpenses().catch(console.error);