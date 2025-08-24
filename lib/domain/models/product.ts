import crypto from 'crypto';

export interface ProductInput {
  category: string;
  name: string;
  model: string;
  color: string;
  brand: string;
  costCNY: number;
  onHand: number;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export function generateSKU(input: {
  category: string;
  model: string;
  color: string;
  brand: string;
}): string {
  const hash = crypto
    .createHash('sha256')
    .update(`${Date.now()}-${Math.random()}`)
    .digest('hex')
    .substring(0, 5)
    .toUpperCase();
  
  return `${input.category}-${input.model}-${input.color}-${input.brand}-${hash}`;
}

export function validateProduct(product: Partial<ProductInput>): ValidationResult {
  const errors: string[] = [];
  
  if (!product.category || product.category.trim() === '') {
    errors.push('Category is required');
  }
  
  if (!product.name || product.name.trim() === '') {
    errors.push('Name is required');
  }
  
  if (!product.model || product.model.trim() === '') {
    errors.push('Model is required');
  }
  
  if (!product.color || product.color.trim() === '') {
    errors.push('Color is required');
  }
  
  if (!product.brand || product.brand.trim() === '') {
    errors.push('Brand is required');
  }
  
  if (product.costCNY !== undefined && product.costCNY <= 0) {
    errors.push('Cost must be positive');
  }
  
  if (product.onHand !== undefined && product.onHand < 0) {
    errors.push('Stock cannot be negative');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
}

export class Product {
  public id?: string;
  public sku: string;
  public category: string;
  public name: string;
  public model: string;
  public color: string;
  public brand: string;
  public costCNY: number;
  public onHand: number;
  public createdAt?: Date;
  public updatedAt?: Date;
  
  constructor(input: ProductInput) {
    const validation = validateProduct(input);
    if (!validation.isValid) {
      throw new Error(`Invalid product: ${validation.errors.join(', ')}`);
    }
    
    this.category = input.category;
    this.name = input.name;
    this.model = input.model;
    this.color = input.color;
    this.brand = input.brand;
    this.costCNY = input.costCNY;
    this.onHand = input.onHand;
    
    this.sku = generateSKU({
      category: input.category,
      model: input.model,
      color: input.color,
      brand: input.brand,
    });
  }
  
  getTotalValue(): number {
    return this.costCNY * this.onHand;
  }
  
  isLowStock(threshold: number = 5): boolean {
    return this.onHand <= threshold;
  }
  
  adjustStock(quantity: number): void {
    const newQuantity = this.onHand + quantity;
    if (newQuantity < 0) {
      throw new Error('Insufficient stock');
    }
    this.onHand = newQuantity;
  }
  
  canFulfillOrder(quantity: number): boolean {
    return this.onHand >= quantity;
  }
  
  toJSON() {
    return {
      id: this.id,
      sku: this.sku,
      category: this.category,
      name: this.name,
      model: this.model,
      color: this.color,
      brand: this.brand,
      costCNY: this.costCNY,
      onHand: this.onHand,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}