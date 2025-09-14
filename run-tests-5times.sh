#!/bin/bash

echo "═══════════════════════════════════════════════════════════════"
echo "     YUANDI ERP 전체 시나리오 5회 반복 테스트"
echo "═══════════════════════════════════════════════════════════════"
echo "시작 시간: $(date)"
echo "═══════════════════════════════════════════════════════════════"

# 결과 카운터 초기화
declare -A results
scenarios=("scenario-1-working" "scenario-2-order" "scenario-3-shipping" "scenario-4-shipping-complete-refund" "scenario-5-delivered-refund")
scenario_names=("시나리오1:상품등록" "시나리오2:주문접수" "시나리오3:배송처리" "시나리오4:배송중환불" "시나리오5:배송완료환불")

# 각 시나리오별 카운터 초기화
for scenario in "${scenarios[@]}"; do
  results[$scenario"_pass"]=0
  results[$scenario"_fail"]=0
done

# 각 시나리오를 5번씩 실행
for i in {0..4}; do
  scenario="${scenarios[$i]}"
  name="${scenario_names[$i]}"

  echo ""
  echo "📌 $name"
  echo "────────────────────────────────────────────────────────────"

  for run in {1..5}; do
    echo -n "  실행 $run/5: "

    # 테스트 실행
    if npx playwright test tests/e2e/${scenario}.spec.ts --reporter=list --timeout=60000 > /tmp/test-output.log 2>&1; then
      echo "✅ 성공"
      results[$scenario"_pass"]=$((results[$scenario"_pass"] + 1))
    else
      echo "❌ 실패"
      results[$scenario"_fail"]=$((results[$scenario"_fail"] + 1))
    fi

    # 짧은 대기
    sleep 2
  done

  pass_count=${results[$scenario"_pass"]}
  success_rate=$((pass_count * 20))
  echo "  └─ 성공률: ${success_rate}% ($pass_count/5)"
done

# 최종 결과 출력
echo ""
echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "                     테스트 결과 요약"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "📊 시나리오별 결과:"
echo ""
echo "시나리오                     | 성공 | 실패 | 성공률"
echo "─────────────────────────────┼──────┼──────┼────────"

total_pass=0
total_fail=0

for i in {0..4}; do
  scenario="${scenarios[$i]}"
  name="${scenario_names[$i]}"
  pass=${results[$scenario"_pass"]}
  fail=${results[$scenario"_fail"]}
  rate=$((pass * 20))

  printf "%-28s | %4d | %4d | %5d%%\n" "$name" "$pass" "$fail" "$rate"

  total_pass=$((total_pass + pass))
  total_fail=$((total_fail + fail))
done

echo "─────────────────────────────┴──────┴──────┴────────"

# 전체 통계
total_runs=$((total_pass + total_fail))
overall_rate=$((total_pass * 100 / total_runs))

echo ""
echo "📈 전체 통계:"
echo "  총 실행: ${total_runs}회"
echo "  성공: ${total_pass}회 (${overall_rate}%)"
echo "  실패: ${total_fail}회"

# 안정성 평가
echo ""
echo "🎯 안정성 평가:"
if [ $overall_rate -ge 90 ]; then
  echo "  🟢 매우 안정적 (${overall_rate}%)"
elif [ $overall_rate -ge 70 ]; then
  echo "  🟡 안정적 (${overall_rate}%)"
elif [ $overall_rate -ge 50 ]; then
  echo "  🟠 불안정 (${overall_rate}%)"
else
  echo "  🔴 매우 불안정 (${overall_rate}%)"
fi

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "완료 시간: $(date)"
echo "═══════════════════════════════════════════════════════════════"