const { createClient } = require('@supabase/supabase-js');

// 환경 변수 로드
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_API_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Supabase 환경 변수가 설정되지 않았습니다.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function addCashbookData() {
    console.log('💰 출납장부 데이터만 추가합니다...');

    try {
        // 기존 출납장부 데이터만 삭제
        console.log('📝 기존 출납장부 데이터 삭제 중...');
        const { error: deleteError } = await supabase
            .from('cashbook_transactions')
            .delete()
            .neq('id', '00000000-0000-0000-0000-000000000000');
        
        if (deleteError) {
            console.log('출납장부 삭제 오류 (무시):', deleteError.message);
        }

        // Admin 사용자 ID 가져오기
        const { data: adminUser } = await supabase
            .from('user_profiles')
            .select('id')
            .eq('email', 'admin@yuandi.com')
            .single();
        
        if (!adminUser) {
            console.log('❌ Admin 사용자를 찾을 수 없습니다.');
            return;
        }
        
        const adminId = adminUser.id;
        const cashbookEntries = [];
        
        // 수입 데이터 (주문 결제) - 50개
        let balance = 0;
        for (let i = 1; i <= 50; i++) {
            const amount = 50000 + (i * 10000);
            balance += amount;
            cashbookEntries.push({
                type: 'income',
                category: 'sales',
                amount_krw: amount,
                balance_krw: balance,
                amount_cny: null,
                exchange_rate: 180,
                description: `주문 #${i} 결제 - 판매 수입`,
                transaction_date: new Date(Date.now() - (50 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                reference_type: 'order',
                reference_id: null,
                tags: ['판매', '수입'],
                created_by: adminId
            });
        }
        
        // 지출 데이터 (상품 구매) - 30개
        for (let i = 1; i <= 30; i++) {
            const cnyAmount = 200 + (i * 50);
            const krwAmount = cnyAmount * 180;
            balance -= krwAmount;
            cashbookEntries.push({
                type: 'expense',
                category: 'purchase',
                amount_krw: krwAmount,
                balance_krw: balance,
                amount_cny: cnyAmount,
                exchange_rate: 180,
                description: `상품 구매 #${i} - 구매 지출`,
                transaction_date: new Date(Date.now() - (60 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                reference_type: 'purchase',
                reference_id: null,
                tags: ['구매', '지출'],
                created_by: adminId
            });
        }
        
        // 기타 지출 (운영비) - 10개
        const operationalExpenses = [
            { amount: 150000, category: 'shipping', desc: '배송비 정산' },
            { amount: 200000, category: 'operational', desc: '사무실 임대료' },
            { amount: 50000, category: 'operational', desc: '인터넷/전화요금' },
            { amount: 80000, category: 'operational', desc: '사무용품 구매' },
            { amount: 120000, category: 'shipping', desc: '국제 배송비' },
            { amount: 30000, category: 'operational', desc: '세무 서비스' },
            { amount: 45000, category: 'operational', desc: '광고비' },
            { amount: 60000, category: 'shipping', desc: '포장 자재' },
            { amount: 100000, category: 'operational', desc: '직원 회식비' },
            { amount: 75000, category: 'operational', desc: '소프트웨어 라이선스' }
        ];
        
        operationalExpenses.forEach((expense, i) => {
            balance -= expense.amount;
            cashbookEntries.push({
                type: 'expense',
                category: expense.category,
                amount_krw: expense.amount,
                balance_krw: balance,
                amount_cny: null,
                exchange_rate: 180,
                description: expense.desc,
                transaction_date: new Date(Date.now() - (i + 5) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                reference_type: null,
                reference_id: null,
                tags: [expense.category, '운영비'],
                created_by: adminId
            });
        });
        
        // 출납장부 데이터 삽입
        console.log(`💾 출납장부 ${cashbookEntries.length}개 항목 삽입 중...`);
        for (const entry of cashbookEntries) {
            const { error } = await supabase
                .from('cashbook_transactions')
                .insert(entry);
            
            if (error) {
                console.log(`출납장부 항목 생성 오류:`, error.message);
            }
        }
        
        console.log('✅ 출납장부 데이터 추가 완료!');
        console.log(`📊 생성된 출납장부 항목: ${cashbookEntries.length}개`);
        
    } catch (error) {
        console.error('❌ 출납장부 데이터 생성 중 오류:', error);
    }
}

// 스크립트 실행
addCashbookData().then(() => {
    console.log('🎉 스크립트 실행 완료');
    process.exit(0);
}).catch((error) => {
    console.error('❌ 스크립트 실행 실패:', error);
    process.exit(1);
});