#!/bin/bash

echo "═══════════════════════════════════════════════════════════════"
echo "     시나리오 1 - 5회 반복 테스트"
echo "═══════════════════════════════════════════════════════════════"
echo "시작 시간: $(date)"
echo ""

success=0
fail=0

for i in {1..5}; do
  echo "실행 $i/5: "
  echo "────────────────────────────────────────────────────────────"

  # 테스트 실행
  if npx playwright test tests/e2e/scenario-1-working.spec.ts --reporter=list --timeout=90000 2>&1 | tee /tmp/test-$i.log | grep -q "1 passed"; then
    echo "✅ 성공"
    success=$((success + 1))
  else
    echo "❌ 실패"
    fail=$((fail + 1))
    # 실패 원인 표시
    grep -E "Error:|timeout|failed" /tmp/test-$i.log | head -3
  fi

  echo ""
  sleep 3
done

echo "═══════════════════════════════════════════════════════════════"
echo "테스트 결과"
echo "═══════════════════════════════════════════════════════════════"
echo "성공: $success/5"
echo "실패: $fail/5"
echo "성공률: $((success * 20))%"

if [ $success -eq 5 ]; then
  echo "🟢 완벽한 성공!"
elif [ $success -ge 4 ]; then
  echo "🟡 대체로 안정적"
elif [ $success -ge 3 ]; then
  echo "🟠 개선 필요"
else
  echo "🔴 불안정"
fi

echo ""
echo "완료 시간: $(date)"
echo "═══════════════════════════════════════════════════════════════"