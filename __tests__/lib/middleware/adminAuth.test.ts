import { NextRequest, NextResponse } from 'next/server';
import {
  requireadminAuth,
  withExcelExportAuth,
  withDataAccessAuth,
  adminAuthOptions,
} from '@/lib/middleware/adminAuth';
import { getServerSession } from '@/lib/auth/session';

// Mock getServerSession
jest.mock('@/lib/auth/session');

describe('admin Authentication Middleware', () => {
  let mockRequest: NextRequest;

  beforeEach(() => {
    mockRequest = new NextRequest('http://localhost:3000/api/test');
    jest.clearAllMocks();
  });

  describe('requireadminAuth', () => {
    it('should return unauthorized when no session exists', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(null);

      const result = await requireadminAuth(mockRequest);

      expect(result.authorized).toBe(false);
      expect(result.error).toBe('Unauthorized: No session found');
      expect(result.session).toBeUndefined();
    });

    it('should return forbidden when user is inactive', async () => {
      (getServerSession as jest.Mock).mockResolvedValue({
        user: {
          id: 'user-1',
          role: 'admin',
          is_active: false,
        },
      });

      const result = await requireadminAuth(mockRequest);

      expect(result.authorized).toBe(false);
      expect(result.error).toBe('Forbidden: Account is inactive');
    });

    it('should return forbidden when requireadmin is true and user is not admin', async () => {
      (getServerSession as jest.Mock).mockResolvedValue({
        user: {
          id: 'user-1',
          role: 'order_manager',
          is_active: true,
        },
      });

      const result = await requireadminAuth(mockRequest, { requireadmin: true });

      expect(result.authorized).toBe(false);
      expect(result.error).toBe('Forbidden: admin access required');
    });

    it('should return authorized when user is admin', async () => {
      const mockSession = {
        user: {
          id: 'admin-1',
          role: 'admin',
          is_active: true,
        },
      };
      (getServerSession as jest.Mock).mockResolvedValue(mockSession);

      const result = await requireadminAuth(mockRequest, { requireadmin: true });

      expect(result.authorized).toBe(true);
      expect(result.session).toEqual(mockSession);
      expect(result.error).toBeUndefined();
    });

    it('should check allowed roles when specified', async () => {
      (getServerSession as jest.Mock).mockResolvedValue({
        user: {
          id: 'user-1',
          role: 'ship_manager',
          is_active: true,
        },
      });

      const options: adminAuthOptions = {
        allowedRoles: ['admin', 'order_manager'],
      };

      const result = await requireadminAuth(mockRequest, options);

      expect(result.authorized).toBe(false);
      expect(result.error).toBe('Forbidden: Required roles: admin, order_manager');
    });

    it('should authorize when user role is in allowed roles', async () => {
      const mockSession = {
        user: {
          id: 'user-1',
          role: 'order_manager',
          is_active: true,
        },
      };
      (getServerSession as jest.Mock).mockResolvedValue(mockSession);

      const options: adminAuthOptions = {
        allowedRoles: ['admin', 'order_manager', 'ship_manager'],
      };

      const result = await requireadminAuth(mockRequest, options);

      expect(result.authorized).toBe(true);
      expect(result.session).toEqual(mockSession);
    });

    it('should handle authentication errors gracefully', async () => {
      (getServerSession as jest.Mock).mockRejectedValue(new Error('Database error'));

      const result = await requireadminAuth(mockRequest);

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

    it('should return 403 when user is not admin', async () => {
      (getServerSession as jest.Mock).mockResolvedValue({
        user: {
          id: 'user-1',
          role: 'order_manager',
          is_active: true,
        },
      });

      const handler = jest.fn();
      const wrappedHandler = await withExcelExportAuth(handler);
      const response = await wrappedHandler(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Forbidden: admin access required');
      expect(handler).not.toHaveBeenCalled();
    });

    it('should call handler when user is admin', async () => {
      (getServerSession as jest.Mock).mockResolvedValue({
        user: {
          id: 'admin-1',
          role: 'admin',
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

    it('should allow admin access by default', async () => {
      const mockSession = {
        user: {
          id: 'admin-1',
          role: 'admin',
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

    it('should allow order_manager access by default', async () => {
      const mockSession = {
        user: {
          id: 'user-1',
          role: 'order_manager',
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

    it('should allow ship_manager access by default', async () => {
      const mockSession = {
        user: {
          id: 'user-1',
          role: 'ship_manager',
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
          role: 'ship_manager',
          is_active: true,
        },
      });

      const handler = jest.fn();
      const options: adminAuthOptions = {
        allowedRoles: ['admin'],
      };
      const wrappedHandler = await withDataAccessAuth(handler, options);
      const response = await wrappedHandler(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Forbidden: Required roles: admin');
      expect(handler).not.toHaveBeenCalled();
    });

    it('should pass session to handler', async () => {
      const mockSession = {
        user: {
          id: 'user-1',
          role: 'order_manager',
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
          role: 'admin',
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
    it('should enforce admin-only access for sensitive operations', async () => {
      const scenarios = [
        { role: 'admin', shouldAllow: true },
        { role: 'order_manager', shouldAllow: false },
        { role: 'ship_manager', shouldAllow: false },
      ];

      for (const scenario of scenarios) {
        (getServerSession as jest.Mock).mockResolvedValue({
          user: {
            id: 'user-1',
            role: scenario.role,
            is_active: true,
          },
        });

        const result = await requireadminAuth(mockRequest, { requireadmin: true });
        
        expect(result.authorized).toBe(scenario.shouldAllow);
        if (!scenario.shouldAllow) {
          expect(result.error).toContain('Forbidden');
        }
      }
    });

    it('should allow multiple roles for data access', async () => {
      const scenarios = [
        { role: 'admin', shouldAllow: true },
        { role: 'order_manager', shouldAllow: true },
        { role: 'ship_manager', shouldAllow: false },
      ];

      const options: adminAuthOptions = {
        allowedRoles: ['admin', 'order_manager'],
      };

      for (const scenario of scenarios) {
        (getServerSession as jest.Mock).mockResolvedValue({
          user: {
            id: 'user-1',
            role: scenario.role,
            is_active: true,
          },
        });

        const result = await requireadminAuth(mockRequest, options);
        
        expect(result.authorized).toBe(scenario.shouldAllow);
      }
    });
  });
});