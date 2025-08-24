# 컴포넌트 구조 설계서 - YUANDI 초미니 ERP

## 1. 컴포넌트 설계 원칙

### 1.1 Design Philosophy
- **Atomic Design**: Atoms → Molecules → Organisms → Templates → Pages
- **Composition over Inheritance**: 컴포넌트 합성 우선
- **Single Responsibility**: 각 컴포넌트는 하나의 책임만
- **Reusability**: 재사용 가능한 컴포넌트 설계
- **Accessibility**: WCAG 2.1 AA 준수

### 1.2 Technology Stack
- **UI Library**: React 18+ with TypeScript
- **Component Library**: shadcn/ui (Radix UI + Tailwind)
- **State Management**: Zustand
- **Data Fetching**: TanStack Query
- **Forms**: React Hook Form + Zod
- **Animation**: Framer Motion
- **Icons**: Lucide React

## 2. Project Structure

```
app/                              # Next.js App Router
├── (auth)/                      # Authentication Group
│   ├── login/
│   │   └── page.tsx
│   └── layout.tsx
│
├── (dashboard)/                 # Dashboard Group (Protected)
│   ├── layout.tsx              # Dashboard Layout
│   ├── page.tsx                # Dashboard Home
│   ├── orders/
│   │   ├── page.tsx            # Orders List
│   │   ├── new/
│   │   │   └── page.tsx        # Create Order
│   │   └── [id]/
│   │       ├── page.tsx        # Order Detail
│   │       └── edit/
│   │           └── page.tsx    # Edit Order
│   ├── products/
│   │   ├── page.tsx
│   │   ├── new/
│   │   └── [id]/
│   ├── inventory/
│   │   ├── page.tsx
│   │   └── inbound/
│   ├── shipping/
│   ├── cashbook/
│   ├── activity/
│   └── users/                  # Admin only
│
├── track/                       # Public tracking
│   └── page.tsx
│
└── api/                        # API Routes

components/                      # Component Library
├── ui/                         # Base UI Components (shadcn/ui)
│   ├── button.tsx
│   ├── input.tsx
│   ├── select.tsx
│   ├── table.tsx
│   ├── dialog.tsx
│   ├── toast.tsx
│   └── ...
│
├── forms/                      # Form Components
│   ├── order-form.tsx
│   ├── product-form.tsx
│   ├── shipment-form.tsx
│   └── form-fields/
│       ├── address-field.tsx
│       ├── phone-field.tsx
│       └── pccc-field.tsx
│
├── tables/                     # Table Components
│   ├── orders-table.tsx
│   ├── products-table.tsx
│   ├── inventory-table.tsx
│   └── table-components/
│       ├── data-table.tsx
│       ├── table-toolbar.tsx
│       └── table-pagination.tsx
│
├── charts/                     # Chart Components
│   ├── sales-chart.tsx
│   ├── order-status-chart.tsx
│   └── trend-chart.tsx
│
├── cards/                      # Card Components
│   ├── stat-card.tsx
│   ├── order-card.tsx
│   ├── product-card.tsx
│   └── summary-card.tsx
│
├── layout/                     # Layout Components
│   ├── header.tsx
│   ├── sidebar.tsx
│   ├── nav-menu.tsx
│   ├── user-menu.tsx
│   └── language-toggle.tsx
│
└── shared/                     # Shared Components
    ├── loading.tsx
    ├── error-boundary.tsx
    ├── empty-state.tsx
    └── confirmation-dialog.tsx
```

## 3. Core Components Design

### 3.1 Layout Components

#### DashboardLayout
```typescript
// components/layout/dashboard-layout.tsx
interface DashboardLayoutProps {
  children: React.ReactNode;
  user: User;
}

export function DashboardLayout({ children, user }: DashboardLayoutProps) {
  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar user={user} />
      <div className="flex-1 flex flex-col">
        <Header user={user} />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
```

#### Sidebar Component
```typescript
// components/layout/sidebar.tsx
interface SidebarProps {
  user: User;
}

const menuItems = {
  Admin: [
    { icon: Dashboard, label: '대시보드', href: '/' },
    { icon: ShoppingCart, label: '주문 관리', href: '/orders' },
    { icon: Package, label: '재고 관리', href: '/inventory' },
    { icon: Truck, label: '배송 관리', href: '/shipping' },
    { icon: DollarSign, label: '출납장부', href: '/cashbook' },
    { icon: Activity, label: '작업 로그', href: '/activity' },
    { icon: Users, label: '사용자 관리', href: '/users' },
  ],
  OrderManager: [
    { icon: Dashboard, label: '대시보드', href: '/' },
    { icon: ShoppingCart, label: '주문 관리', href: '/orders' },
    { icon: Package, label: '재고 관리', href: '/inventory' },
    { icon: DollarSign, label: '출납장부', href: '/cashbook' },
    { icon: Activity, label: '작업 로그', href: '/activity' },
  ],
  ShipManager: [
    { icon: Dashboard, label: '대시보드', href: '/' },
    { icon: Truck, label: '배송 관리', href: '/shipping' },
    { icon: DollarSign, label: '출납장부', href: '/cashbook' },
    { icon: Activity, label: '작업 로그', href: '/activity' },
  ],
};
```

### 3.2 Form Components

#### OrderForm Component
```typescript
// components/forms/order-form.tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

const orderSchema = z.object({
  customerName: z.string().min(2, '이름은 2자 이상').max(50),
  customerPhone: z.string().regex(/^01[0-9]{8,9}$/, '올바른 전화번호 형식이 아닙니다'),
  pcccCode: z.string().regex(/^P[0-9]{12}$/, 'P로 시작하는 13자리 코드'),
  shippingAddress: z.string().min(5, '주소를 입력해주세요'),
  zipCode: z.string().length(5, '우편번호는 5자리'),
  items: z.array(z.object({
    productId: z.string().uuid(),
    quantity: z.number().positive()
  })).min(1, '최소 1개 이상의 상품을 선택해주세요')
});

type OrderFormData = z.infer<typeof orderSchema>;

interface OrderFormProps {
  onSubmit: (data: OrderFormData) => Promise<void>;
  initialData?: Partial<OrderFormData>;
  products: Product[];
}

export function OrderForm({ onSubmit, initialData, products }: OrderFormProps) {
  const form = useForm<OrderFormData>({
    resolver: zodResolver(orderSchema),
    defaultValues: initialData || {
      items: []
    }
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'items'
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Customer Information */}
        <Card>
          <CardHeader>
            <CardTitle>고객 정보</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="customerName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>고객명 *</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="customerPhone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>전화번호 *</FormLabel>
                  <FormControl>
                    <PhoneInput {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="pcccCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>해외통관부호 (PCCC) *</FormLabel>
                  <FormControl>
                    <PCCCInput {...field} />
                  </FormControl>
                  <FormDescription>
                    P로 시작하는 13자리 개인통관고유부호
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Shipping Address */}
        <Card>
          <CardHeader>
            <CardTitle>배송 정보</CardTitle>
          </CardHeader>
          <CardContent>
            <AddressField
              control={form.control}
              namePrefix=""
            />
          </CardContent>
        </Card>

        {/* Order Items */}
        <Card>
          <CardHeader>
            <CardTitle>주문 상품</CardTitle>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => append({ productId: '', quantity: 1 })}
            >
              <Plus className="w-4 h-4 mr-2" />
              상품 추가
            </Button>
          </CardHeader>
          <CardContent>
            <OrderItemsField
              fields={fields}
              products={products}
              control={form.control}
              remove={remove}
            />
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex justify-end space-x-4">
          <Button type="button" variant="outline">
            취소
          </Button>
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : null}
            주문 생성
          </Button>
        </div>
      </form>
    </Form>
  );
}
```

#### Custom Field Components
```typescript
// components/forms/form-fields/address-field.tsx
interface AddressFieldProps {
  control: Control<any>;
  namePrefix?: string;
}

export function AddressField({ control, namePrefix = '' }: AddressFieldProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleComplete = (data: any) => {
    // Daum Postcode API result handling
    form.setValue(`${namePrefix}zipCode`, data.zonecode);
    form.setValue(`${namePrefix}address`, data.address);
    setIsOpen(false);
  };

  return (
    <>
      <FormField
        control={control}
        name={`${namePrefix}zipCode`}
        render={({ field }) => (
          <FormItem>
            <FormLabel>우편번호 *</FormLabel>
            <div className="flex space-x-2">
              <FormControl>
                <Input {...field} readOnly />
              </FormControl>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsOpen(true)}
              >
                주소 검색
              </Button>
            </div>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name={`${namePrefix}address`}
        render={({ field }) => (
          <FormItem>
            <FormLabel>주소 *</FormLabel>
            <FormControl>
              <Input {...field} readOnly />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name={`${namePrefix}addressDetail`}
        render={({ field }) => (
          <FormItem>
            <FormLabel>상세주소</FormLabel>
            <FormControl>
              <Input {...field} placeholder="동/호수 등 상세주소" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <DaumPostcodeDialog
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onComplete={handleComplete}
      />
    </>
  );
}
```

### 3.3 Table Components

#### DataTable Component
```typescript
// components/tables/table-components/data-table.tsx
interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  searchKey?: string;
  filters?: DataTableFilter[];
  actions?: DataTableAction[];
  onRowClick?: (row: TData) => void;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  searchKey,
  filters,
  actions,
  onRowClick,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [rowSelection, setRowSelection] = useState({});

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnFilters,
      rowSelection,
    },
  });

  return (
    <div className="space-y-4">
      <DataTableToolbar
        table={table}
        searchKey={searchKey}
        filters={filters}
        actions={actions}
      />
      
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  onClick={() => onRowClick?.(row.original)}
                  className={onRowClick ? "cursor-pointer" : ""}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  데이터가 없습니다
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      
      <DataTablePagination table={table} />
    </div>
  );
}
```

#### OrdersTable Component
```typescript
// components/tables/orders-table.tsx
interface OrdersTableProps {
  orders: Order[];
  onOrderClick: (order: Order) => void;
  userRole: UserRole;
}

export function OrdersTable({ orders, onOrderClick, userRole }: OrdersTableProps) {
  const columns: ColumnDef<Order>[] = [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected()}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "orderNo",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="주문번호" />
      ),
      cell: ({ row }) => (
        <div className="font-medium">{row.getValue("orderNo")}</div>
      ),
    },
    {
      accessorKey: "customerName",
      header: "고객명",
      cell: ({ row }) => (
        <div className="flex items-center">
          <User className="w-4 h-4 mr-2 text-gray-400" />
          {row.getValue("customerName")}
        </div>
      ),
    },
    {
      accessorKey: "status",
      header: "상태",
      cell: ({ row }) => {
        const status = row.getValue("status") as OrderStatus;
        return <OrderStatusBadge status={status} />;
      },
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id));
      },
    },
    {
      accessorKey: "totalAmount",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="주문금액" />
      ),
      cell: ({ row }) => {
        const amount = parseFloat(row.getValue("totalAmount"));
        return (
          <div className="text-right font-medium">
            {formatCurrency(amount, "KRW")}
          </div>
        );
      },
    },
    {
      accessorKey: "createdAt",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="주문일시" />
      ),
      cell: ({ row }) => formatDate(row.getValue("createdAt")),
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const order = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>작업</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => onOrderClick(order)}>
                상세보기
              </DropdownMenuItem>
              {userRole === "Admin" && order.status === "PAID" && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>주문 수정</DropdownMenuItem>
                  <DropdownMenuItem>송장 등록</DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  const filters: DataTableFilter[] = [
    {
      column: "status",
      title: "상태",
      options: [
        { label: "입금완료", value: "PAID" },
        { label: "배송중", value: "SHIPPED" },
        { label: "완료", value: "DONE" },
        { label: "환불", value: "REFUNDED" },
      ],
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={orders}
      searchKey="customerName"
      filters={filters}
      onRowClick={onOrderClick}
    />
  );
}
```

### 3.4 Dashboard Components

#### StatCard Component
```typescript
// components/cards/stat-card.tsx
interface StatCardProps {
  title: string;
  value: string | number;
  change?: number;
  icon?: React.ComponentType<{ className?: string }>;
  trend?: 'up' | 'down' | 'neutral';
  loading?: boolean;
}

export function StatCard({
  title,
  value,
  change,
  icon: Icon,
  trend = 'neutral',
  loading = false,
}: StatCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-8 w-24" />
        ) : (
          <>
            <div className="text-2xl font-bold">{value}</div>
            {change !== undefined && (
              <p className={cn(
                "text-xs mt-1",
                trend === 'up' && "text-green-600",
                trend === 'down' && "text-red-600",
                trend === 'neutral' && "text-gray-600"
              )}>
                {trend === 'up' && <TrendingUp className="inline w-3 h-3 mr-1" />}
                {trend === 'down' && <TrendingDown className="inline w-3 h-3 mr-1" />}
                {change > 0 ? '+' : ''}{change}% from last period
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
```

#### SalesChart Component
```typescript
// components/charts/sales-chart.tsx
interface SalesChartProps {
  data: {
    date: string;
    sales: number;
    orders: number;
  }[];
  loading?: boolean;
}

export function SalesChart({ data, loading }: SalesChartProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>매출 트렌드</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>매출 트렌드</CardTitle>
        <CardDescription>최근 7일간 매출 현황</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="date"
              tickFormatter={(value) => format(new Date(value), 'MM/dd')}
            />
            <YAxis yAxisId="left" />
            <YAxis yAxisId="right" orientation="right" />
            <Tooltip
              labelFormatter={(value) => format(new Date(value), 'yyyy-MM-dd')}
              formatter={(value: number, name: string) => [
                name === 'sales' ? formatCurrency(value, 'KRW') : value,
                name === 'sales' ? '매출' : '주문수'
              ]}
            />
            <Legend />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="sales"
              stroke="#8884d8"
              name="매출"
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="orders"
              stroke="#82ca9d"
              name="주문수"
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
```

### 3.5 Shared Components

#### LoadingSpinner Component
```typescript
// components/shared/loading.tsx
interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  message?: string;
}

export function LoadingSpinner({ size = 'md', message }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  };

  return (
    <div className="flex flex-col items-center justify-center space-y-4">
      <Loader2 className={cn('animate-spin', sizeClasses[size])} />
      {message && <p className="text-sm text-muted-foreground">{message}</p>}
    </div>
  );
}
```

#### EmptyState Component
```typescript
// components/shared/empty-state.tsx
interface EmptyStateProps {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function EmptyState({
  icon: Icon = Package,
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <Icon className="w-12 h-12 text-muted-foreground mb-4" />
      <h3 className="text-lg font-semibold">{title}</h3>
      {description && (
        <p className="text-sm text-muted-foreground mt-2 text-center max-w-sm">
          {description}
        </p>
      )}
      {action && (
        <Button onClick={action.onClick} className="mt-4">
          {action.label}
        </Button>
      )}
    </div>
  );
}
```

## 4. State Management

### 4.1 Zustand Stores

#### AuthStore
```typescript
// stores/auth.store.ts
interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshToken: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,

  login: async (email, password) => {
    const response = await api.auth.login(email, password);
    set({
      user: response.user,
      token: response.token,
      isAuthenticated: true,
    });
    localStorage.setItem('token', response.token);
  },

  logout: () => {
    set({
      user: null,
      token: null,
      isAuthenticated: false,
    });
    localStorage.removeItem('token');
  },

  refreshToken: async () => {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) throw new Error('No refresh token');
    
    const response = await api.auth.refresh(refreshToken);
    set({
      token: response.token,
    });
    localStorage.setItem('token', response.token);
  },
}));
```

#### UIStore
```typescript
// stores/ui.store.ts
interface UIState {
  sidebarOpen: boolean;
  locale: 'ko' | 'zh-CN';
  theme: 'light' | 'dark';
  toggleSidebar: () => void;
  setLocale: (locale: 'ko' | 'zh-CN') => void;
  setTheme: (theme: 'light' | 'dark') => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,
  locale: 'ko',
  theme: 'light',

  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setLocale: (locale) => set({ locale }),
  setTheme: (theme) => set({ theme }),
}));
```

## 5. Custom Hooks

### 5.1 Data Fetching Hooks

```typescript
// hooks/use-orders.ts
export function useOrders(params?: OrderQueryParams) {
  return useQuery({
    queryKey: ['orders', params],
    queryFn: () => api.orders.getOrders(params),
    staleTime: 30000, // 30 seconds
  });
}

export function useOrder(id: string) {
  return useQuery({
    queryKey: ['orders', id],
    queryFn: () => api.orders.getOrder(id),
    enabled: !!id,
  });
}

export function useCreateOrder() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: api.orders.createOrder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast.success('주문이 생성되었습니다');
    },
    onError: (error) => {
      toast.error(error.message || '주문 생성에 실패했습니다');
    },
  });
}
```

### 5.2 Utility Hooks

```typescript
// hooks/use-debounce.ts
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// hooks/use-permission.ts
export function usePermission(permission: string): boolean {
  const user = useAuthStore((state) => state.user);
  
  if (!user) return false;
  
  // Admin has all permissions
  if (user.role === 'Admin') return true;
  
  // Check specific permissions based on role
  const rolePermissions: Record<UserRole, string[]> = {
    Admin: ['*'],
    OrderManager: ['orders.*', 'products.*', 'inventory.*'],
    ShipManager: ['shipping.*', 'orders.view'],
  };
  
  return rolePermissions[user.role]?.some(p => 
    p === '*' || p === permission || permission.startsWith(p.replace('*', ''))
  ) || false;
}
```

## 6. Internationalization (i18n)

### 6.1 Message Structure

```typescript
// messages/ko/common.ts
export const common = {
  app: {
    name: 'YUANDI ERP',
    tagline: '해외구매대행 관리 시스템',
  },
  navigation: {
    dashboard: '대시보드',
    orders: '주문 관리',
    products: '상품 관리',
    inventory: '재고 관리',
    shipping: '배송 관리',
    cashbook: '출납장부',
    activity: '작업 로그',
    users: '사용자 관리',
  },
  actions: {
    create: '생성',
    edit: '수정',
    delete: '삭제',
    save: '저장',
    cancel: '취소',
    search: '검색',
    filter: '필터',
    export: '내보내기',
    import: '가져오기',
  },
  status: {
    loading: '로딩 중...',
    saving: '저장 중...',
    success: '성공',
    error: '오류',
    noData: '데이터가 없습니다',
  },
};

// messages/zh-CN/common.ts
export const common = {
  app: {
    name: 'YUANDI ERP',
    tagline: '海外代购管理系统',
  },
  navigation: {
    dashboard: '仪表板',
    orders: '订单管理',
    products: '商品管理',
    inventory: '库存管理',
    shipping: '配送管理',
    cashbook: '账簿',
    activity: '操作日志',
    users: '用户管理',
  },
  // ...
};
```

### 6.2 i18n Provider

```typescript
// providers/i18n-provider.tsx
import { IntlProvider } from 'react-intl';
import { useUIStore } from '@/stores/ui.store';
import koMessages from '@/messages/ko';
import zhMessages from '@/messages/zh-CN';

const messages = {
  ko: koMessages,
  'zh-CN': zhMessages,
};

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const locale = useUIStore((state) => state.locale);
  
  return (
    <IntlProvider locale={locale} messages={messages[locale]}>
      {children}
    </IntlProvider>
  );
}
```

## 7. Mobile Responsive Design

### 7.1 Responsive Layout
```typescript
// components/layout/responsive-layout.tsx
export function ResponsiveLayout({ children }: { children: React.ReactNode }) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkDevice = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkDevice();
    window.addEventListener('resize', checkDevice);
    return () => window.removeEventListener('resize', checkDevice);
  }, []);

  return (
    <div className={cn(
      'min-h-screen',
      isMobile ? 'mobile-layout' : 'desktop-layout'
    )}>
      {isMobile ? (
        <MobileLayout>{children}</MobileLayout>
      ) : (
        <DesktopLayout>{children}</DesktopLayout>
      )}
    </div>
  );
}
```

### 7.2 Mobile Navigation
```typescript
// components/layout/mobile-nav.tsx
export function MobileNav() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="md:hidden">
            <Menu className="h-6 w-6" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-[240px] sm:w-[300px]">
          <nav className="flex flex-col space-y-4">
            {/* Navigation items */}
          </nav>
        </SheetContent>
      </Sheet>
    </>
  );
}
```

## 8. Performance Optimization

### 8.1 Code Splitting
```typescript
// Lazy loading for routes
const OrdersPage = lazy(() => import('./pages/orders'));
const ProductsPage = lazy(() => import('./pages/products'));

// Suspense wrapper
<Suspense fallback={<LoadingSpinner />}>
  <OrdersPage />
</Suspense>
```

### 8.2 Memo and Optimization
```typescript
// Memoized components
export const OrderCard = memo(({ order }: { order: Order }) => {
  // Component implementation
});

// useMemo for expensive calculations
const totalAmount = useMemo(() => {
  return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
}, [items]);

// useCallback for event handlers
const handleSubmit = useCallback((data: FormData) => {
  // Handle submission
}, [dependencies]);
```

## 9. Testing Strategy

### 9.1 Component Tests
```typescript
// __tests__/components/order-form.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OrderForm } from '@/components/forms/order-form';

describe('OrderForm', () => {
  it('should validate required fields', async () => {
    render(<OrderForm onSubmit={jest.fn()} products={[]} />);
    
    const submitButton = screen.getByRole('button', { name: /주문 생성/i });
    await userEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText(/이름은 2자 이상/i)).toBeInTheDocument();
      expect(screen.getByText(/올바른 전화번호/i)).toBeInTheDocument();
    });
  });
});
```

---

**문서 버전**: 1.0.0
**작성일**: 2024-12-28
**작성자**: YUANDI Frontend Architect