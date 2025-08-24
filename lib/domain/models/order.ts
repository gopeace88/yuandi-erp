export enum OrderStatus {
  PAID = 'PAID',
  SHIPPED = 'SHIPPED',
  DONE = 'DONE',
  REFUNDED = 'REFUNDED',
}

export interface OrderItem {
  productId: string;
  productName?: string;
  quantity: number;
  price: number;
}

export interface OrderInput {
  customerName: string;
  customerPhone: string;
  pccc: string; // Personal Customs Clearance Code
  shippingAddress: string;
  items: OrderItem[];
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

// 택배사별 추적 URL 패턴
const TRACKING_URL_PATTERNS: Record<string, string> = {
  'CJ대한통운': 'https://www.cjlogistics.com/ko/tool/parcel/tracking?gnbInvcNo=',
  '한진택배': 'https://www.hanjin.com/kor/CMS/DeliveryMgr/WaybillResult.do?mCode=MN038&schLang=KR&wblnumText2=',
  '롯데택배': 'https://www.lotteglogis.com/mobile/reservation/tracking/index?InvNo=',
  '우체국택배': 'https://service.epost.go.kr/trace.RetrieveDomRigiTraceList.comm?sid1=',
  '로젠택배': 'https://www.ilogen.com/web/personal/trace/',
  'DHL': 'https://www.dhl.com/kr-ko/home/tracking/tracking-express.html?submit=1&tracking-id=',
  'FedEx': 'https://www.fedex.com/fedextrack/?tracknumbers=',
  'UPS': 'https://www.ups.com/track?loc=ko_KR&tracknum=',
};

export function generateOrderNumber(sequence: number = 1, date: Date = new Date()): string {
  // Convert to KST (UTC+9)
  const kstDate = new Date(date.getTime() + (9 * 60 * 60 * 1000));
  const year = kstDate.getUTCFullYear().toString().slice(2);
  const month = (kstDate.getUTCMonth() + 1).toString().padStart(2, '0');
  const day = kstDate.getUTCDate().toString().padStart(2, '0');
  const seq = sequence.toString().padStart(3, '0');
  
  return `ORD-${year}${month}${day}-${seq}`;
}

export function validateOrder(order: Partial<OrderInput>): ValidationResult {
  const errors: string[] = [];
  
  if (!order.customerName || order.customerName.trim() === '') {
    errors.push('Customer name is required');
  }
  
  if (!order.customerPhone || order.customerPhone.trim() === '') {
    errors.push('Customer phone is required');
  } else if (!isValidPhoneNumber(order.customerPhone)) {
    errors.push('Invalid phone number format');
  }
  
  if (!order.pccc || order.pccc.trim() === '') {
    errors.push('PCCC is required');
  } else if (!isValidPCCC(order.pccc)) {
    errors.push('Invalid PCCC format');
  }
  
  if (!order.shippingAddress || order.shippingAddress.trim() === '') {
    errors.push('Shipping address is required');
  }
  
  if (!order.items || order.items.length === 0) {
    errors.push('Order must have at least one item');
  } else {
    order.items.forEach((item, index) => {
      if (!item.productId) {
        errors.push(`Item ${index + 1}: Product ID is required`);
      }
      if (item.quantity <= 0) {
        errors.push('Item quantity must be positive');
      }
      if (item.price < 0) {
        errors.push('Item price cannot be negative');
      }
    });
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
}

function isValidPhoneNumber(phone: string): boolean {
  // Korean phone number format: 010-1234-5678 or 01012345678
  const phoneRegex = /^(01[0-9]{1})-?([0-9]{3,4})-?([0-9]{4})$/;
  return phoneRegex.test(phone.replace(/\s/g, ''));
}

function isValidPCCC(pccc: string): boolean {
  // PCCC format: P + 12 digits
  const pcccRegex = /^P\d{12}$/;
  return pcccRegex.test(pccc);
}

export class Order {
  public id?: string;
  public orderNumber: string;
  public status: OrderStatus;
  public customerName: string;
  public customerPhone: string;
  public pccc: string;
  public shippingAddress: string;
  public items: OrderItem[];
  public courierCompany?: string;
  public trackingNumber?: string;
  public trackingPhotoUrl?: string;
  public shippedAt?: Date;
  public completedAt?: Date;
  public refundedAt?: Date;
  public refundReason?: string;
  public createdAt: Date;
  public updatedAt: Date;
  
  private static sequenceCounter: Map<string, number> = new Map();
  
  constructor(input: OrderInput, orderNumber?: string) {
    const validation = validateOrder(input);
    if (!validation.isValid) {
      throw new Error(`Invalid order: ${validation.errors.join(', ')}`);
    }
    
    this.customerName = input.customerName;
    this.customerPhone = input.customerPhone;
    this.pccc = input.pccc;
    this.shippingAddress = input.shippingAddress;
    this.items = input.items;
    this.status = OrderStatus.PAID;
    this.createdAt = new Date();
    this.updatedAt = new Date();
    
    // Generate order number
    if (orderNumber) {
      this.orderNumber = orderNumber;
    } else {
      const today = new Date();
      const dateKey = `${today.getFullYear()}${today.getMonth()}${today.getDate()}`;
      const currentSequence = Order.sequenceCounter.get(dateKey) || 0;
      const nextSequence = currentSequence + 1;
      Order.sequenceCounter.set(dateKey, nextSequence);
      this.orderNumber = generateOrderNumber(nextSequence, today);
    }
  }
  
  getTotalAmount(): number {
    return this.items.reduce((total, item) => total + (item.price * item.quantity), 0);
  }
  
  getTotalItems(): number {
    return this.items.reduce((total, item) => total + item.quantity, 0);
  }
  
  ship(courierCompany: string, trackingNumber: string, trackingPhotoUrl?: string): void {
    if (this.status !== OrderStatus.PAID) {
      throw new Error(`Cannot ship order in ${this.status} status`);
    }
    
    this.courierCompany = courierCompany;
    this.trackingNumber = trackingNumber;
    this.trackingPhotoUrl = trackingPhotoUrl;
    this.status = OrderStatus.SHIPPED;
    this.shippedAt = new Date();
    this.updatedAt = new Date();
  }
  
  complete(): void {
    if (this.status === OrderStatus.DONE) {
      return; // Already completed
    }
    
    if (this.status !== OrderStatus.PAID && this.status !== OrderStatus.SHIPPED) {
      throw new Error(`Cannot complete order in ${this.status} status`);
    }
    
    this.status = OrderStatus.DONE;
    this.completedAt = new Date();
    this.updatedAt = new Date();
  }
  
  refund(reason: string): void {
    if (this.status === OrderStatus.REFUNDED) {
      return; // Already refunded
    }
    
    if (this.status === OrderStatus.DONE) {
      throw new Error('Cannot refund completed order');
    }
    
    this.status = OrderStatus.REFUNDED;
    this.refundReason = reason;
    this.refundedAt = new Date();
    this.updatedAt = new Date();
  }
  
  getTrackingUrl(): string | null {
    if (!this.courierCompany || !this.trackingNumber) {
      return null;
    }
    
    const urlPattern = TRACKING_URL_PATTERNS[this.courierCompany];
    if (!urlPattern) {
      return null;
    }
    
    return `${urlPattern}${this.trackingNumber}`;
  }
  
  canEdit(): boolean {
    return this.status === OrderStatus.PAID;
  }
  
  toJSON() {
    return {
      id: this.id,
      orderNumber: this.orderNumber,
      status: this.status,
      customerName: this.customerName,
      customerPhone: this.customerPhone,
      pccc: this.pccc,
      shippingAddress: this.shippingAddress,
      items: this.items,
      totalAmount: this.getTotalAmount(),
      totalItems: this.getTotalItems(),
      courierCompany: this.courierCompany,
      trackingNumber: this.trackingNumber,
      trackingUrl: this.getTrackingUrl(),
      trackingPhotoUrl: this.trackingPhotoUrl,
      shippedAt: this.shippedAt,
      completedAt: this.completedAt,
      refundedAt: this.refundedAt,
      refundReason: this.refundReason,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}