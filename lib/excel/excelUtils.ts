import * as XLSX from 'xlsx'
import { saveAs } from 'file-saver'
import { formatDate, formatCurrency, formatPhoneNumber } from '@/lib/i18n/formatters'
import { Locale } from '@/lib/i18n/config'

export interface ExcelColumn {
  key: string
  header: string
  width?: number
  format?: 'text' | 'number' | 'currency' | 'date' | 'phone'
  align?: 'left' | 'center' | 'right'
}

export interface ExcelExportOptions {
  filename: string
  sheetName?: string
  columns: ExcelColumn[]
  data: any[]
  locale?: Locale
  includeTimestamp?: boolean
  autoFilter?: boolean
  headerStyle?: any
  footerData?: any[]
}

// UTF-8 BOM 추가하여 한글 깨짐 방지
const UTF8_BOM = '\uFEFF'

// 엑셀 내보내기 메인 함수
export function exportToExcel(options: ExcelExportOptions) {
  const {
    filename,
    sheetName = 'Sheet1',
    columns,
    data,
    locale = 'ko',
    includeTimestamp = true,
    autoFilter = true,
    footerData = []
  } = options

  // 워크북 생성
  const wb = XLSX.utils.book_new()

  // 데이터 포맷팅
  const formattedData = formatDataForExcel(data, columns, locale)

  // 헤더 행 생성
  const headers = columns.map(col => col.header)
  
  // 워크시트 데이터 생성
  const wsData = [headers, ...formattedData]

  // Footer 데이터 추가
  if (footerData.length > 0) {
    wsData.push(...footerData)
  }

  // 워크시트 생성
  const ws = XLSX.utils.aoa_to_sheet(wsData)

  // 컬럼 너비 설정
  const colWidths = columns.map(col => ({ wch: col.width || 15 }))
  ws['!cols'] = colWidths

  // 자동 필터 설정
  if (autoFilter && formattedData.length > 0) {
    ws['!autofilter'] = {
      ref: XLSX.utils.encode_range({
        s: { r: 0, c: 0 },
        e: { r: formattedData.length, c: columns.length - 1 }
      })
    }
  }

  // 워크북에 워크시트 추가
  XLSX.utils.book_append_sheet(wb, ws, sheetName)

  // 파일명에 타임스탬프 추가
  const finalFilename = includeTimestamp
    ? `${filename}_${formatDate(new Date(), locale).replace(/[:\s]/g, '-')}.xlsx`
    : `${filename}.xlsx`

  // 엑셀 파일 생성 및 다운로드
  const wbout = XLSX.write(wb, { 
    bookType: 'xlsx', 
    type: 'binary',
    cellStyles: true
  })

  const blob = new Blob([s2ab(wbout)], { type: 'application/octet-stream' })
  saveAs(blob, finalFilename)
}

// 데이터 포맷팅 함수
function formatDataForExcel(data: any[], columns: ExcelColumn[], locale: Locale): any[][] {
  return data.map(row => {
    return columns.map(col => {
      const value = getNestedValue(row, col.key)
      
      if (value === null || value === undefined) return ''
      
      switch (col.format) {
        case 'currency':
          return formatCurrency(value, 'KRW', locale)
        
        case 'date':
          return value ? formatDate(value, locale) : ''
        
        case 'phone':
          return formatPhoneNumber(value, locale)
        
        case 'number':
          return Number(value)
        
        default:
          return String(value)
      }
    })
  })
}

// 중첩된 객체 값 가져오기
function getNestedValue(obj: any, path: string): any {
  const keys = path.split('.')
  let value = obj
  
  for (const key of keys) {
    if (value && typeof value === 'object' && key in value) {
      value = value[key]
    } else {
      return null
    }
  }
  
  return value
}

// Binary string to ArrayBuffer 변환
function s2ab(s: string): ArrayBuffer {
  const buf = new ArrayBuffer(s.length)
  const view = new Uint8Array(buf)
  for (let i = 0; i < s.length; i++) {
    view[i] = s.charCodeAt(i) & 0xFF
  }
  return buf
}

// CSV 내보내기 함수 (간단한 데이터용)
export function exportToCSV(
  data: any[],
  columns: ExcelColumn[],
  filename: string,
  locale: Locale = 'ko'
) {
  // 헤더 행
  const headers = columns.map(col => col.header).join(',')
  
  // 데이터 행
  const rows = data.map(row => {
    return columns.map(col => {
      const value = getNestedValue(row, col.key)
      
      if (value === null || value === undefined) return ''
      
      // CSV 이스케이프 처리
      let formatted = String(value)
      
      // 특수문자 처리
      if (formatted.includes(',') || formatted.includes('"') || formatted.includes('\n')) {
        formatted = `"${formatted.replace(/"/g, '""')}"`
      }
      
      return formatted
    }).join(',')
  })
  
  // UTF-8 BOM 추가하여 한글 깨짐 방지
  const csvContent = UTF8_BOM + [headers, ...rows].join('\n')
  
  // 다운로드
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' })
  const finalFilename = `${filename}_${formatDate(new Date(), locale).replace(/[:\s]/g, '-')}.csv`
  saveAs(blob, finalFilename)
}

// 주문 데이터 엑셀 컬럼 정의
export function getOrderExcelColumns(locale: Locale): ExcelColumn[] {
  const messages = locale === 'ko' ? {
    orderNo: '주문번호',
    orderDate: '주문일',
    status: '상태',
    customerName: '고객명',
    customerPhone: '연락처',
    customerEmail: '이메일',
    pcccCode: '개인통관고유부호',
    shippingAddress: '배송주소',
    zipCode: '우편번호',
    totalAmount: '총금액',
    productCount: '상품수',
    productList: '상품목록',
    courier: '택배사',
    trackingNo: '운송장번호',
    shippedAt: '발송일',
    deliveredAt: '배송완료일',
    customerMemo: '고객메모',
    internalMemo: '내부메모'
  } : {
    orderNo: '订单号',
    orderDate: '订单日期',
    status: '状态',
    customerName: '客户姓名',
    customerPhone: '联系电话',
    customerEmail: '邮箱',
    pcccCode: '个人通关识别码',
    shippingAddress: '收货地址',
    zipCode: '邮编',
    totalAmount: '总金额',
    productCount: '商品数量',
    productList: '商品列表',
    courier: '快递公司',
    trackingNo: '运单号',
    shippedAt: '发货日期',
    deliveredAt: '送达日期',
    customerMemo: '客户备注',
    internalMemo: '内部备注'
  }

  return [
    { key: 'order_no', header: messages.orderNo, width: 15 },
    { key: 'created_at', header: messages.orderDate, width: 20, format: 'date' },
    { key: 'status', header: messages.status, width: 10 },
    { key: 'customer_name', header: messages.customerName, width: 15 },
    { key: 'customer_phone', header: messages.customerPhone, width: 15, format: 'phone' },
    { key: 'customer_email', header: messages.customerEmail, width: 25 },
    { key: 'pccc_code', header: messages.pcccCode, width: 15 },
    { key: 'shipping_address', header: messages.shippingAddress, width: 40 },
    { key: 'zip_code', header: messages.zipCode, width: 10 },
    { key: 'total_amount', header: messages.totalAmount, width: 15, format: 'currency' },
    { key: 'product_count', header: messages.productCount, width: 10, format: 'number' },
    { key: 'product_list', header: messages.productList, width: 50 },
    { key: 'courier', header: messages.courier, width: 15 },
    { key: 'tracking_no', header: messages.trackingNo, width: 20 },
    { key: 'shipped_at', header: messages.shippedAt, width: 20, format: 'date' },
    { key: 'delivered_at', header: messages.deliveredAt, width: 20, format: 'date' },
    { key: 'customer_memo', header: messages.customerMemo, width: 30 },
    { key: 'internal_memo', header: messages.internalMemo, width: 30 }
  ]
}

// 재고 데이터 엑셀 컬럼 정의
export function getInventoryExcelColumns(locale: Locale): ExcelColumn[] {
  const messages = locale === 'ko' ? {
    sku: 'SKU',
    name: '제품명',
    category: '카테고리',
    model: '모델',
    color: '색상',
    brand: '브랜드',
    costPrice: '원가(CNY)',
    salePrice: '판매가(KRW)',
    onHand: '재고수량',
    reserved: '예약수량',
    available: '가용수량',
    lowStockThreshold: '재고부족임계치',
    stockStatus: '재고상태',
    inventoryValueCNY: '재고가치(CNY)',
    inventoryValueKRW: '재고가치(KRW)',
    marginRate: '마진율(%)',
    createdAt: '등록일',
    updatedAt: '수정일'
  } : {
    sku: 'SKU',
    name: '产品名称',
    category: '类别',
    model: '型号',
    color: '颜色',
    brand: '品牌',
    costPrice: '成本价(CNY)',
    salePrice: '销售价(KRW)',
    onHand: '库存数量',
    reserved: '预订数量',
    available: '可用数量',
    lowStockThreshold: '库存警戒值',
    stockStatus: '库存状态',
    inventoryValueCNY: '库存价值(CNY)',
    inventoryValueKRW: '库存价值(KRW)',
    marginRate: '利润率(%)',
    createdAt: '创建日期',
    updatedAt: '更新日期'
  }

  return [
    { key: 'sku', header: messages.sku, width: 15 },
    { key: 'name', header: messages.name, width: 30 },
    { key: 'category', header: messages.category, width: 15 },
    { key: 'model', header: messages.model, width: 15 },
    { key: 'color', header: messages.color, width: 10 },
    { key: 'brand', header: messages.brand, width: 15 },
    { key: 'cost_cny', header: messages.costPrice, width: 12, format: 'number' },
    { key: 'sale_price_krw', header: messages.salePrice, width: 15, format: 'currency' },
    { key: 'on_hand', header: messages.onHand, width: 12, format: 'number' },
    { key: 'reserved', header: messages.reserved, width: 12, format: 'number' },
    { key: 'available', header: messages.available, width: 12, format: 'number' },
    { key: 'low_stock_threshold', header: messages.lowStockThreshold, width: 15, format: 'number' },
    { key: 'stock_status', header: messages.stockStatus, width: 12 },
    { key: 'inventory_value_cny', header: messages.inventoryValueCNY, width: 18, format: 'number' },
    { key: 'inventory_value_krw', header: messages.inventoryValueKRW, width: 18, format: 'currency' },
    { key: 'margin_rate', header: messages.marginRate, width: 12, format: 'number' },
    { key: 'created_at', header: messages.createdAt, width: 20, format: 'date' },
    { key: 'updated_at', header: messages.updatedAt, width: 20, format: 'date' }
  ]
}

// 출납장부 데이터 엑셀 컬럼 정의
export function getCashbookExcelColumns(locale: Locale): ExcelColumn[] {
  const messages = locale === 'ko' ? {
    transactionDate: '거래일',
    transactionType: '거래유형',
    category: '분류',
    description: '설명',
    income: '수입',
    expense: '지출',
    balance: '잔액',
    orderNo: '주문번호',
    customerName: '고객명',
    paymentMethod: '결제방법',
    note: '비고'
  } : {
    transactionDate: '交易日期',
    transactionType: '交易类型',
    category: '分类',
    description: '说明',
    income: '收入',
    expense: '支出',
    balance: '余额',
    orderNo: '订单号',
    customerName: '客户姓名',
    paymentMethod: '支付方式',
    note: '备注'
  }

  return [
    { key: 'transaction_date', header: messages.transactionDate, width: 20, format: 'date' },
    { key: 'transaction_type', header: messages.transactionType, width: 12 },
    { key: 'category', header: messages.category, width: 15 },
    { key: 'description', header: messages.description, width: 40 },
    { key: 'income', header: messages.income, width: 15, format: 'currency' },
    { key: 'expense', header: messages.expense, width: 15, format: 'currency' },
    { key: 'balance', header: messages.balance, width: 15, format: 'currency' },
    { key: 'order_no', header: messages.orderNo, width: 15 },
    { key: 'customer_name', header: messages.customerName, width: 15 },
    { key: 'payment_method', header: messages.paymentMethod, width: 15 },
    { key: 'note', header: messages.note, width: 30 }
  ]
}