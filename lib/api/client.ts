// API 클라이언트 유틸리티

interface FetchOptions extends RequestInit {
  params?: Record<string, any>
}

class APIClient {
  private baseURL: string

  constructor() {
    this.baseURL = process.env.NEXT_PUBLIC_API_URL || '/api'
  }

  private async request<T = any>(
    endpoint: string,
    options: FetchOptions = {}
  ): Promise<T> {
    const { params, ...fetchOptions } = options
    
    // URL 파라미터 처리
    let url = `${this.baseURL}${endpoint}`
    if (params) {
      const searchParams = new URLSearchParams()
      Object.entries(params).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          searchParams.append(key, String(value))
        }
      })
      const queryString = searchParams.toString()
      if (queryString) {
        url += `?${queryString}`
      }
    }

    // 기본 헤더 설정
    const headers = {
      'Content-Type': 'application/json',
      ...fetchOptions.headers
    }

    try {
      const response = await fetch(url, {
        ...fetchOptions,
        headers
      })

      // 에러 처리
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(error.error || `HTTP ${response.status}`)
      }

      // 응답 파싱
      const data = await response.json()
      return data
    } catch (error) {
      console.error('API request failed:', error)
      throw error
    }
  }

  // GET 요청
  async get<T = any>(endpoint: string, params?: Record<string, any>): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'GET',
      params
    })
  }

  // POST 요청
  async post<T = any>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(data)
    })
  }

  // PATCH 요청
  async patch<T = any>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(data)
    })
  }

  // PUT 요청
  async put<T = any>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data)
    })
  }

  // DELETE 요청
  async delete<T = any>(endpoint: string, params?: Record<string, any>): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'DELETE',
      params
    })
  }
}

// 싱글톤 인스턴스
export const apiClient = new APIClient()

// 개별 API 함수들
export const api = {
  // 인증
  auth: {
    login: (email: string, password: string) =>
      apiClient.post('/auth/login', { email, password }),
    
    logout: () =>
      apiClient.post('/auth/logout'),
    
    getSession: () =>
      apiClient.get('/auth/session')
  },

  // 제품
  products: {
    list: (params?: {
      page?: number
      limit?: number
      category?: string
      search?: string
      active?: boolean
      lowStock?: boolean
    }) => apiClient.get('/products', params),
    
    get: (id: string) =>
      apiClient.get(`/products/${id}`),
    
    create: (data: any) =>
      apiClient.post('/products', data),
    
    update: (id: string, data: any) =>
      apiClient.patch('/products', { id, ...data }),
    
    delete: (id: string) =>
      apiClient.delete('/products', { id })
  },

  // 주문
  orders: {
    list: (params?: {
      page?: number
      limit?: number
      status?: string
      search?: string
      startDate?: string
      endDate?: string
    }) => apiClient.get('/orders', params),
    
    get: (id: string) =>
      apiClient.get(`/orders/${id}`),
    
    create: (data: any) =>
      apiClient.post('/orders', data),
    
    update: (id: string, data: any) =>
      apiClient.patch('/orders', { id, ...data }),
    
    updateStatus: (id: string, status: string) =>
      apiClient.patch('/orders', { id, status })
  },

  // 재고
  inventory: {
    movements: (productId?: string) =>
      apiClient.get('/inventory/movements', { productId }),
    
    inbound: (data: any) =>
      apiClient.post('/inventory/inbound', data),
    
    adjust: (data: any) =>
      apiClient.post('/inventory/adjust', data)
  },

  // 배송
  shipments: {
    list: (orderId?: string) =>
      apiClient.get('/shipments', { orderId }),
    
    create: (data: any) =>
      apiClient.post('/shipments', data),
    
    update: (id: string, data: any) =>
      apiClient.patch('/shipments', { id, ...data })
  },

  // 출납장
  cashbook: {
    list: (params?: {
      page?: number
      limit?: number
      type?: string
      startDate?: string
      endDate?: string
    }) => apiClient.get('/cashbook', params),
    
    create: (data: any) =>
      apiClient.post('/cashbook', data),
    
    summary: (params?: {
      startDate?: string
      endDate?: string
    }) => apiClient.get('/cashbook/summary', params)
  },

  // 대시보드
  dashboard: {
    summary: () =>
      apiClient.get('/dashboard/summary'),
    
    salesTrend: (days?: number) =>
      apiClient.get('/dashboard/sales-trend', { days }),
    
    orderStatus: () =>
      apiClient.get('/dashboard/order-status'),
    
    lowStock: () =>
      apiClient.get('/dashboard/low-stock'),
    
    popularProducts: (limit?: number) =>
      apiClient.get('/dashboard/popular-products', { limit })
  },

  // 고객 포털
  track: {
    lookup: (name: string, phone: string) =>
      apiClient.get('/track', { name, phone })
  },

  // 사용자
  users: {
    list: () =>
      apiClient.get('/users'),
    
    get: (id: string) =>
      apiClient.get(`/users/${id}`),
    
    create: (data: any) =>
      apiClient.post('/users', data),
    
    update: (id: string, data: any) =>
      apiClient.patch('/users', { id, ...data }),
    
    updateProfile: (data: any) =>
      apiClient.patch('/users/profile', data)
  },

  // 이미지 업로드
  upload: {
    image: async (file: File, type: 'product' | 'shipment' = 'product') => {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('type', type)
      
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Upload failed')
      }
      
      return response.json()
    },
    
    delete: (path: string) =>
      apiClient.delete('/upload', { path })
  }
}

export default api