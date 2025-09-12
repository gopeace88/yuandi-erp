-- 015_create_system_settings.sql
-- 시스템 설정 테이블 생성 및 기본 데이터 입력

-- 1. 시스템 설정 테이블 생성
CREATE TABLE IF NOT EXISTS system_settings (
  id SERIAL PRIMARY KEY,
  key VARCHAR(100) NOT NULL UNIQUE,
  value TEXT NOT NULL,
  value_type VARCHAR(20) NOT NULL CHECK (value_type IN ('string', 'number', 'boolean', 'json')),
  category VARCHAR(50) NOT NULL,
  name_ko VARCHAR(200) NOT NULL,
  name_zh VARCHAR(200) NOT NULL,
  description_ko TEXT,
  description_zh TEXT,
  default_value TEXT,
  min_value NUMERIC,
  max_value NUMERIC,
  is_editable BOOLEAN DEFAULT true,
  is_required BOOLEAN DEFAULT false,
  display_order INTEGER DEFAULT 999,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. 인덱스 생성
CREATE INDEX idx_system_settings_key ON system_settings(key);
CREATE INDEX idx_system_settings_category ON system_settings(category);

-- 3. 기본 시스템 설정 데이터 입력
INSERT INTO system_settings (key, value, value_type, category, name_ko, name_zh, description_ko, description_zh, default_value, min_value, max_value, is_editable, is_required, display_order) VALUES
-- 재고 관련 설정
('low_stock_threshold', '10', 'number', 'inventory', '재고 부족 임계값', '库存不足阈值', '재고 부족 경고를 표시할 최소 수량입니다.', '显示库存不足警告的最小数量。', '10', 1, 1000, true, true, 1),
('auto_stock_alert', 'true', 'boolean', 'inventory', '자동 재고 알림', '自动库存提醒', '재고가 임계값 이하로 떨어질 때 자동으로 알림을 보냅니다.', '当库存低于阈值时自动发送通知。', 'true', null, null, true, false, 2),
('stock_buffer_percentage', '20', 'number', 'inventory', '안전 재고 비율', '安全库存比例', '평균 판매량 대비 추가로 보유할 재고 비율(%)입니다.', '相对于平均销售量额外持有的库存比例(%)。', '20', 0, 100, true, false, 3),

-- 주문 관련 설정
('order_number_prefix', 'YD', 'string', 'order', '주문번호 접두사', '订单号前缀', '주문번호 앞에 붙는 고정 문자입니다.', '订单号前面的固定字符。', 'YD', null, null, true, false, 10),
('order_auto_confirm_hours', '24', 'number', 'order', '자동 확정 시간', '自动确认时间', '주문 후 자동으로 확정 처리되는 시간(시간 단위)입니다.', '下单后自动确认的时间（小时）。', '24', 1, 168, true, false, 11),
('order_cancellation_allowed', 'true', 'boolean', 'order', '주문 취소 허용', '允许取消订单', '고객이 주문을 취소할 수 있는지 여부입니다.', '是否允许客户取消订单。', 'true', null, null, true, false, 12),

-- 배송 관련 설정
('default_shipping_method', 'standard', 'string', 'shipping', '기본 배송 방법', '默认配送方式', '새 주문의 기본 배송 방법입니다.', '新订单的默认配送方式。', 'standard', null, null, true, false, 20),
('express_shipping_fee', '5000', 'number', 'shipping', '특급 배송비', '特快配送费', '특급 배송 선택 시 추가 요금(원)입니다.', '选择特快配送时的额外费用（韩元）。', '5000', 0, 50000, true, false, 21),
('free_shipping_threshold', '50000', 'number', 'shipping', '무료 배송 기준', '免费配送标准', '무료 배송이 적용되는 최소 주문 금액(원)입니다.', '享受免费配送的最低订单金额（韩元）。', '50000', 0, 1000000, true, false, 22),

-- 환율 관련 설정
('default_exchange_rate', '195', 'number', 'currency', '기본 환율', '默认汇率', 'CNY to KRW 기본 환율입니다.', 'CNY兑换KRW的默认汇率。', '195', 100, 300, true, true, 30),
('auto_update_exchange_rate', 'false', 'boolean', 'currency', '환율 자동 업데이트', '自动更新汇率', '매일 환율을 자동으로 업데이트합니다.', '每天自动更新汇率。', 'false', null, null, true, false, 31),
('exchange_rate_margin', '2', 'number', 'currency', '환율 마진', '汇率利润', '실제 환율에 추가할 마진(%)입니다.', '在实际汇率上添加的利润(%)。', '2', 0, 10, true, false, 32),

-- 알림 관련 설정
('email_notifications', 'true', 'boolean', 'notification', '이메일 알림', '邮件通知', '이메일로 알림을 받습니다.', '通过邮件接收通知。', 'true', null, null, true, false, 40),
('sms_notifications', 'false', 'boolean', 'notification', 'SMS 알림', '短信通知', 'SMS로 알림을 받습니다.', '通过短信接收通知。', 'false', null, null, true, false, 41),
('notification_email', 'admin@yuandi.com', 'string', 'notification', '알림 이메일 주소', '通知邮箱地址', '알림을 받을 이메일 주소입니다.', '接收通知的邮箱地址。', 'admin@yuandi.com', null, null, true, false, 42),

-- 회계 관련 설정
('tax_rate', '10', 'number', 'accounting', '세율', '税率', '적용할 세율(%)입니다.', '适用的税率(%)。', '10', 0, 30, true, false, 50),
('fiscal_year_start', '01-01', 'string', 'accounting', '회계연도 시작', '会计年度开始', '회계연도 시작일(MM-DD)입니다.', '会计年度开始日期（MM-DD）。', '01-01', null, null, true, false, 51),
('enable_cost_tracking', 'true', 'boolean', 'accounting', '원가 추적', '成本跟踪', '상품별 원가를 추적합니다.', '跟踪每个产品的成本。', 'true', null, null, true, false, 52),

-- 시스템 관련 설정
('system_timezone', 'Asia/Seoul', 'string', 'system', '시스템 시간대', '系统时区', '시스템 전체에서 사용할 시간대입니다.', '系统全局使用的时区。', 'Asia/Seoul', null, null, false, true, 60),
('backup_enabled', 'true', 'boolean', 'system', '자동 백업', '自动备份', '데이터를 자동으로 백업합니다.', '自动备份数据。', 'true', null, null, true, false, 61),
('backup_retention_days', '30', 'number', 'system', '백업 보관 기간', '备份保留期', '백업 파일을 보관할 기간(일)입니다.', '备份文件保留的天数。', '30', 7, 365, true, false, 62),
('maintenance_mode', 'false', 'boolean', 'system', '유지보수 모드', '维护模式', '시스템 유지보수 모드를 활성화합니다.', '启用系统维护模式。', 'false', null, null, true, false, 63);

-- 4. 업데이트 트리거 생성
CREATE OR REPLACE FUNCTION update_system_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_system_settings_updated_at 
BEFORE UPDATE ON system_settings 
FOR EACH ROW 
EXECUTE FUNCTION update_system_settings_updated_at();

-- 5. 권한 설정
GRANT SELECT ON system_settings TO authenticated;
GRANT ALL ON system_settings TO service_role;

-- 6. 코멘트 추가
COMMENT ON TABLE system_settings IS '시스템 전역 설정 관리 테이블';
COMMENT ON COLUMN system_settings.key IS '설정 키 (unique)';
COMMENT ON COLUMN system_settings.value IS '설정 값';
COMMENT ON COLUMN system_settings.value_type IS '값 타입: string, number, boolean, json';
COMMENT ON COLUMN system_settings.category IS '설정 카테고리: inventory, order, shipping, currency, notification, accounting, system';
COMMENT ON COLUMN system_settings.is_editable IS '사용자가 수정 가능한지 여부';
COMMENT ON COLUMN system_settings.is_required IS '필수 설정인지 여부';