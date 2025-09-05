import { 
  InventoryService,
  InventoryMovementType,
  InsufficientStockError,
  ProductNotFoundError,
  InvalidQuantityError
} from '../inventory.service';

// Mock Supabase client
const mockSupabaseClient = {
  from: jest.fn(),
  rpc: jest.fn()
};

describe('InventoryService', () => {
  let inventoryService: InventoryService;

  beforeEach(() => {
    jest.clearAllMocks();
    inventoryService = new InventoryService(mockSupabaseClient as any);
  });

  describe('checkStock', () => {
    it('should return true when stock is sufficient', async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { id: 'product-1', on_hand: 10 },
              error: null
            })
          })
        })
      });

      const hasStock = await inventoryService.checkStock('product-1', 5);
      expect(hasStock).toBe(true);
    });

    it('should return false when stock is insufficient', async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { id: 'product-1', on_hand: 3 },
              error: null
            })
          })
        })
      });

      const hasStock = await inventoryService.checkStock('product-1', 5);
      expect(hasStock).toBe(false);
    });

    it('should throw error when product not found', async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: null
            })
          })
        })
      });

      await expect(inventoryService.checkStock('invalid-product', 1))
        .rejects.toThrow(ProductNotFoundError);
    });

    it('should handle zero quantity check', async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { id: 'product-1', on_hand: 0 },
              error: null
            })
          })
        })
      });

      const hasStock = await inventoryService.checkStock('product-1', 0);
      expect(hasStock).toBe(true);
    });
  });

  describe('validateAndDeductStock', () => {
    it('should deduct stock when sufficient', async () => {
      const product = { id: 'product-1', on_hand: 10 };
      
      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'products') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: product,
                  error: null
                })
              })
            }),
            update: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({
                data: { ...product, on_hand: 5 },
                error: null
              })
            })
          };
        }
        if (table === 'inventory_movements') {
          return {
            insert: jest.fn().mockResolvedValue({
              data: {},
              error: null
            })
          };
        }
      });

      const result = await inventoryService.validateAndDeductStock(
        'product-1', 
        5,
        'order-1',
        'user-1'
      );

      expect(result.previousStock).toBe(10);
      expect(result.newStock).toBe(5);
      expect(result.deducted).toBe(5);
    });

    it('should throw error when stock insufficient', async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { id: 'product-1', on_hand: 3 },
              error: null
            })
          })
        })
      });

      await expect(
        inventoryService.validateAndDeductStock('product-1', 5, 'order-1', 'user-1')
      ).rejects.toThrow(InsufficientStockError);
    });

    it('should handle concurrent stock updates with transaction', async () => {
      const product = { id: 'product-1', on_hand: 10 };
      
      mockSupabaseClient.rpc.mockResolvedValue({
        data: { 
          success: true, 
          previous_stock: 10,
          new_stock: 5
        },
        error: null
      });

      const result = await inventoryService.validateAndDeductStock(
        'product-1',
        5,
        'order-1', 
        'user-1',
        true // use transaction
      );

      expect(result.previousStock).toBe(10);
      expect(result.newStock).toBe(5);
      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith(
        'deduct_stock_transaction',
        expect.objectContaining({
          p_product_id: 'product-1',
          p_quantity: 5
        })
      );
    });

    it('should throw error for negative quantity', async () => {
      await expect(
        inventoryService.validateAndDeductStock('product-1', -5, 'order-1', 'user-1')
      ).rejects.toThrow(InvalidQuantityError);
    });
  });

  describe('restoreStock', () => {
    it('should restore stock on refund', async () => {
      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'products') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: { id: 'product-1', on_hand: 5 },
                  error: null
                })
              })
            }),
            update: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({
                data: { id: 'product-1', on_hand: 10 },
                error: null
              })
            })
          };
        }
        if (table === 'inventory_movements') {
          return {
            insert: jest.fn().mockResolvedValue({
              data: {},
              error: null
            })
          };
        }
      });

      const result = await inventoryService.restoreStock(
        'product-1',
        5,
        'refund-1',
        'user-1'
      );

      expect(result.previousStock).toBe(5);
      expect(result.newStock).toBe(10);
      expect(result.restored).toBe(5);
    });

    it('should handle zero quantity restore', async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { id: 'product-1', on_hand: 5 },
              error: null
            })
          })
        })
      });

      const result = await inventoryService.restoreStock(
        'product-1',
        0,
        'refund-1',
        'user-1'
      );

      expect(result.previousStock).toBe(5);
      expect(result.newStock).toBe(5);
      expect(result.restored).toBe(0);
    });
  });

  describe('adjustStock', () => {
    it('should handle positive adjustment', async () => {
      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'products') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: { id: 'product-1', on_hand: 10 },
                  error: null
                })
              })
            }),
            update: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({
                data: { id: 'product-1', on_hand: 15 },
                error: null
              })
            })
          };
        }
        if (table === 'inventory_movements') {
          return {
            insert: jest.fn().mockResolvedValue({
              data: {},
              error: null
            })
          };
        }
      });

      const result = await inventoryService.adjustStock(
        'product-1',
        15,
        'Stock count adjustment',
        'user-1'
      );

      expect(result.previousStock).toBe(10);
      expect(result.newStock).toBe(15);
      expect(result.adjustment).toBe(5);
    });

    it('should handle negative adjustment', async () => {
      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'products') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: { id: 'product-1', on_hand: 10 },
                  error: null
                })
              })
            }),
            update: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({
                data: { id: 'product-1', on_hand: 7 },
                error: null
              })
            })
          };
        }
        if (table === 'inventory_movements') {
          return {
            insert: jest.fn().mockResolvedValue({
              data: {},
              error: null
            })
          };
        }
      });

      const result = await inventoryService.adjustStock(
        'product-1',
        7,
        'Damaged items',
        'user-1'
      );

      expect(result.previousStock).toBe(10);
      expect(result.newStock).toBe(7);
      expect(result.adjustment).toBe(-3);
    });

    it('should not allow negative final stock', async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { id: 'product-1', on_hand: 10 },
              error: null
            })
          })
        })
      });

      await expect(
        inventoryService.adjustStock('product-1', -1, 'Invalid adjustment', 'user-1')
      ).rejects.toThrow(InvalidQuantityError);
    });
  });

  describe('getLowStockProducts', () => {
    it('should return products below threshold', async () => {
      const lowStockProducts = [
        { id: 'product-1', name: 'Product 1', on_hand: 3, low_stock_threshold: 5 },
        { id: 'product-2', name: 'Product 2', on_hand: 1, low_stock_threshold: 5 }
      ];

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({
              data: lowStockProducts,
              error: null
            })
          })
        })
      });

      const result = await inventoryService.getLowStockProducts();
      
      expect(result).toHaveLength(2);
      expect(result[0].stockShortage).toBe(2); // 5 - 3
      expect(result[1].stockShortage).toBe(4); // 5 - 1
    });

    it('should use custom threshold if provided', async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          lte: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue({
                data: [],
                error: null
              })
            })
          })
        })
      });

      await inventoryService.getLowStockProducts(10);
      
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('products');
    });

    it('should handle empty result', async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({
              data: [],
              error: null
            })
          })
        })
      });

      const result = await inventoryService.getLowStockProducts();
      expect(result).toEqual([]);
    });
  });

  describe('recordInbound', () => {
    it('should record stock inbound', async () => {
      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'products') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: { id: 'product-1', on_hand: 10 },
                  error: null
                })
              })
            }),
            update: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({
                data: { id: 'product-1', on_hand: 30 },
                error: null
              })
            })
          };
        }
        if (table === 'inventory_movements') {
          return {
            insert: jest.fn().mockResolvedValue({
              data: {},
              error: null
            })
          };
        }
      });

      const result = await inventoryService.recordInbound(
        'product-1',
        20,
        100,
        'Purchase order #123',
        'user-1'
      );

      expect(result.previousStock).toBe(10);
      expect(result.newStock).toBe(30);
      expect(result.addedQuantity).toBe(20);
      expect(result.unitCost).toBe(100);
    });

    it('should validate positive quantity for inbound', async () => {
      await expect(
        inventoryService.recordInbound('product-1', -5, 100, 'Invalid', 'user-1')
      ).rejects.toThrow(InvalidQuantityError);
    });
  });
});