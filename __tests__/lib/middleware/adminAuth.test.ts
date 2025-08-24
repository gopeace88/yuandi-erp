import { NextRequest, NextResponse } from 'next/server';
import {
  requireAdminAuth,
  withExcelExportAuth,
  withDataAccessAuth,
  AdminAuthOptions,
} from '@/lib/middleware/adminAuth';
import { getServerSession } from '@/lib/auth/session';

// Mock getServerSession
jest.mock('@/lib/auth/session');

describe('Admin Authentication Middleware', () => {
  let mockRequest: NextRequest;

  beforeEach(() => {
    mockRequest = new NextRequest('http://localhost:3000/api/test');
    jest.clearAllMocks();
  });

  describe('requireAdminAuth', () => {
    it('should return unauthorized when no session exists', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(null);

      const result = await requireAdminAuth(mockRequest);

      expect(result.authorized).toBe(false);
      expect(result.error).toBe('Unauthorized: No session found');
      expect(result.session).toBeUndefined();
    });

    it('should return forbidden when user is inactive', async () => {
      (getServerSession as jest.Mock).mockResolvedValue({
        user: {
          id: 'user-1',
          role: 'Admin',
          is_active: false,
        },
      });

      const result = await requireAdminAuth(mockRequest);

      expect(result.authorized).toBe(false);
      expect(result.error).toBe('Forbidden: Account is inactive');
    });

    it('should return forbidden when requireAdmin is true and user is not Admin', async () => {
      (getServerSession as jest.Mock).mockResolvedValue({
        user: {
          id: 'user-1',
          role: 'OrderManager',
          is_active: true,
        },
      });

      const result = await requireAdminAuth(mockRequest, { requireAdmin: true });

      expect(result.authorized).toBe(false);
      expect(result.error).toBe('Forbidden: Admin access required');
    });

    it('should return authorized when user is Admin', async () => {
      const mockSession = {
        user: {
          id: 'admin-1',
          role: 'Admin',
          is_active: true,
        },
      };
      (getServerSession as jest.Mock).mockResolvedValue(mockSession);

      const result = await requireAdminAuth(mockRequest, { requireAdmin: true });

      expect(result.authorized).toBe(true);
      expect(result.session).toEqual(mockSession);
      expect(result.error).toBeUndefined();
    });

    it('should check allowed roles when specified', async () => {
      (getServerSession as jest.Mock).mockResolvedValue({
        user: {
          id: 'user-1',
          role: 'ShipManager',
          is_active: true,
        },
      });

      const options: AdminAuthOptions = {
        allowedRoles: ['Admin', 'OrderManager'],
      };

      const result = await requireAdminAuth(mockRequest, options);

      expect(result.authorized).toBe(false);
      expect(result.error).toBe('Forbidden: Required roles: Admin, OrderManager');
    });

    it('should authorize when user role is in allowed roles', async () => {
      const mockSession = {
        user: {
          id: 'user-1',
          role: 'OrderManager',
          is_active: true,
        },
      };
      (getServerSession as jest.Mock).mockResolvedValue(mockSession);

      const options: AdminAuthOptions = {
        allowedRoles: ['Admin', 'OrderManager', 'ShipManager'],
      };

      const result = await requireAdminAuth(mockRequest, options);

      expect(result.authorized).toBe(true);
      expect(result.session).toEqual(mockSession);
    });

    it('should handle authentication errors gracefully', async () => {
      (getServerSession as jest.Mock).mockRejectedValue(new Error('Database error'));

      const result = await requireAdminAuth(mockRequest);

      expect(result.authorized).toBe(false);
      expect(result.error).toBe('Internal server error during authentication');
    });
  });

  describe('withExcelExportAuth', () => {
    it('should return 401 when not authenticated', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(null);

      const handler = jest.fn();
      const wrappedHandler = await withExcelExportAuth(handler);
      const response = await wrappedHandler(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized: No session found');
      expect(handler).not.toHaveBeenCalled();
    });

    it('should return 403 when user is not Admin', async () => {
      (getServerSession as jest.Mock).mockResolvedValue({
        user: {
          id: 'user-1',
          role: 'OrderManager',
          is_active: true,
        },
      });

      const handler = jest.fn();
      const wrappedHandler = await withExcelExportAuth(handler);
      const response = await wrappedHandler(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Forbidden: Admin access required');
      expect(handler).not.toHaveBeenCalled();
    });

    it('should call handler when user is Admin', async () => {
      (getServerSession as jest.Mock).mockResolvedValue({
        user: {
          id: 'admin-1',
          role: 'Admin',
          is_active: true,
        },
      });

      const mockResponse = NextResponse.json({ success: true });
      const handler = jest.fn().mockResolvedValue(mockResponse);
      const wrappedHandler = await withExcelExportAuth(handler);
      const response = await wrappedHandler(mockRequest);

      expect(handler).toHaveBeenCalledWith(mockRequest);
      expect(response).toBe(mockResponse);
    });
  });

  describe('withDataAccessAuth', () => {
    it('should return 401 when not authenticated', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(null);

      const handler = jest.fn();
      const wrappedHandler = await withDataAccessAuth(handler);
      const response = await wrappedHandler(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized: No session found');
      expect(handler).not.toHaveBeenCalled();
    });

    it('should allow Admin access by default', async () => {
      const mockSession = {
        user: {
          id: 'admin-1',
          role: 'Admin',
          is_active: true,
        },
      };
      (getServerSession as jest.Mock).mockResolvedValue(mockSession);

      const mockResponse = NextResponse.json({ success: true });
      const handler = jest.fn().mockResolvedValue(mockResponse);
      const wrappedHandler = await withDataAccessAuth(handler);
      const response = await wrappedHandler(mockRequest);

      expect(handler).toHaveBeenCalledWith(mockRequest, mockSession);
      expect(response).toBe(mockResponse);
    });

    it('should allow OrderManager access by default', async () => {
      const mockSession = {
        user: {
          id: 'user-1',
          role: 'OrderManager',
          is_active: true,
        },
      };
      (getServerSession as jest.Mock).mockResolvedValue(mockSession);

      const mockResponse = NextResponse.json({ success: true });
      const handler = jest.fn().mockResolvedValue(mockResponse);
      const wrappedHandler = await withDataAccessAuth(handler);
      const response = await wrappedHandler(mockRequest);

      expect(handler).toHaveBeenCalledWith(mockRequest, mockSession);
      expect(response).toBe(mockResponse);
    });

    it('should allow ShipManager access by default', async () => {
      const mockSession = {
        user: {
          id: 'user-1',
          role: 'ShipManager',
          is_active: true,
        },
      };
      (getServerSession as jest.Mock).mockResolvedValue(mockSession);

      const mockResponse = NextResponse.json({ success: true });
      const handler = jest.fn().mockResolvedValue(mockResponse);
      const wrappedHandler = await withDataAccessAuth(handler);
      const response = await wrappedHandler(mockRequest);

      expect(handler).toHaveBeenCalledWith(mockRequest, mockSession);
      expect(response).toBe(mockResponse);
    });

    it('should respect custom allowed roles', async () => {
      (getServerSession as jest.Mock).mockResolvedValue({
        user: {
          id: 'user-1',
          role: 'ShipManager',
          is_active: true,
        },
      });

      const handler = jest.fn();
      const options: AdminAuthOptions = {
        allowedRoles: ['Admin'],
      };
      const wrappedHandler = await withDataAccessAuth(handler, options);
      const response = await wrappedHandler(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Forbidden: Required roles: Admin');
      expect(handler).not.toHaveBeenCalled();
    });

    it('should pass session to handler', async () => {
      const mockSession = {
        user: {
          id: 'user-1',
          role: 'OrderManager',
          is_active: true,
          email: 'test@example.com',
        },
      };
      (getServerSession as jest.Mock).mockResolvedValue(mockSession);

      const handler = jest.fn().mockResolvedValue(NextResponse.json({ success: true }));
      const wrappedHandler = await withDataAccessAuth(handler);
      await wrappedHandler(mockRequest);

      expect(handler).toHaveBeenCalledWith(mockRequest, mockSession);
    });

    it('should return 403 for inactive users', async () => {
      (getServerSession as jest.Mock).mockResolvedValue({
        user: {
          id: 'user-1',
          role: 'Admin',
          is_active: false,
        },
      });

      const handler = jest.fn();
      const wrappedHandler = await withDataAccessAuth(handler);
      const response = await wrappedHandler(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Forbidden: Account is inactive');
      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('Role-based access scenarios', () => {
    it('should enforce Admin-only access for sensitive operations', async () => {
      const scenarios = [
        { role: 'Admin', shouldAllow: true },
        { role: 'OrderManager', shouldAllow: false },
        { role: 'ShipManager', shouldAllow: false },
      ];

      for (const scenario of scenarios) {
        (getServerSession as jest.Mock).mockResolvedValue({
          user: {
            id: 'user-1',
            role: scenario.role,
            is_active: true,
          },
        });

        const result = await requireAdminAuth(mockRequest, { requireAdmin: true });
        
        expect(result.authorized).toBe(scenario.shouldAllow);
        if (!scenario.shouldAllow) {
          expect(result.error).toContain('Forbidden');
        }
      }
    });

    it('should allow multiple roles for data access', async () => {
      const scenarios = [
        { role: 'Admin', shouldAllow: true },
        { role: 'OrderManager', shouldAllow: true },
        { role: 'ShipManager', shouldAllow: false },
      ];

      const options: AdminAuthOptions = {
        allowedRoles: ['Admin', 'OrderManager'],
      };

      for (const scenario of scenarios) {
        (getServerSession as jest.Mock).mockResolvedValue({
          user: {
            id: 'user-1',
            role: scenario.role,
            is_active: true,
          },
        });

        const result = await requireAdminAuth(mockRequest, options);
        
        expect(result.authorized).toBe(scenario.shouldAllow);
      }
    });
  });
});