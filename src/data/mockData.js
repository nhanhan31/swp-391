// Mock Data cho hệ thống quản lý xe điện

// Roles
export const roles = [
  { id: 1, role_name: 'Admin' },
  { id: 2, role_name: 'EVM Staff' },
  { id: 3, role_name: 'Dealer Manager' },
  { id: 4, role_name: 'Dealer Staff' }
];

// Agencies
export const agencies = [
  {
    id: 1,
    agency_name: 'VinFast Hà Nội',
    address: '123 Láng Hạ, Ba Đình, Hà Nội',
    phone: '024-1234-5678',
    avatar: '/images/agency-hanoi.jpg',
    email: 'hanoi@vinfast.vn',
    status: 'active',
    location: 'Hà Nội',
    created_at: '2023-01-15T10:00:00Z',
    updated_at: '2023-01-15T10:00:00Z'
  },
  {
    id: 2,
    agency_name: 'VinFast TP.HCM',
    address: '456 Nguyễn Văn Cừ, Quận 5, TP.HCM',
    phone: '028-1234-5678',
    avatar: '/images/agency-hcm.jpg',
    email: 'hcm@vinfast.vn',
    status: 'active',
    location: 'TP.HCM',
    created_at: '2023-01-20T10:00:00Z',
    updated_at: '2023-01-20T10:00:00Z'
  },
  {
    id: 3,
    agency_name: 'VinFast Đà Nẵng',
    address: '789 Trần Phú, Hải Châu, Đà Nẵng',
    phone: '0236-1234-567',
    avatar: '/images/agency-dn.jpg',
    email: 'danang@vinfast.vn',
    status: 'active',
    location: 'Đà Nẵng',
    created_at: '2023-02-01T10:00:00Z',
    updated_at: '2023-02-01T10:00:00Z'
  }
];

// Users
export const users = [
  {
    id: 1,
    username: 'admin',
    password_hash: 'hashedpassword123', // Trong thực tế sẽ được hash
    full_name: 'Nguyễn Văn Admin',
    email: 'admin@vinfast.vn',
    phone: '0901234567',
    avatar_url: '/images/avatar-admin.jpg',
    status: 'active',
    role_id: 1,
    agency_id: null,
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z',
    created_by: null
  },
  {
    id: 2,
    username: 'evmstaff',
    password_hash: 'hashedpassword123',
    full_name: 'Trần Thị EVM',
    email: 'evm@vinfast.vn',
    phone: '0901234568',
    avatar_url: '/images/avatar-evm.jpg',
    status: 'active',
    role_id: 2,
    agency_id: null,
    created_at: '2023-01-05T00:00:00Z',
    updated_at: '2023-01-05T00:00:00Z',
    created_by: 1
  },
  {
    id: 3,
    username: 'manager_hanoi',
    password_hash: 'hashedpassword123',
    full_name: 'Lê Văn Manager',
    email: 'manager.hanoi@vinfast.vn',
    phone: '0901234569',
    avatar_url: '/images/avatar-manager.jpg',
    status: 'active',
    role_id: 3,
    agency_id: 1,
    created_at: '2023-01-10T00:00:00Z',
    updated_at: '2023-01-10T00:00:00Z',
    created_by: 1
  },
  {
    id: 4,
    username: 'staff_hanoi',
    password_hash: 'hashedpassword123',
    full_name: 'Phạm Thị Staff',
    email: 'staff.hanoi@vinfast.vn',
    phone: '0901234570',
    avatar_url: '/images/avatar-staff.jpg',
    status: 'active',
    role_id: 4,
    agency_id: 1,
    created_at: '2023-01-12T00:00:00Z',
    updated_at: '2023-01-12T00:00:00Z',
    created_by: 3
  },
  {
    id: 5,
    username: 'manager_hcm',
    password_hash: 'hashedpassword123',
    full_name: 'Hoàng Văn Manager HCM',
    email: 'manager.hcm@vinfast.vn',
    phone: '0901234571',
    avatar_url: '/images/avatar-manager-hcm.jpg',
    status: 'active',
    role_id: 3,
    agency_id: 2,
    created_at: '2023-01-15T00:00:00Z',
    updated_at: '2023-01-15T00:00:00Z',
    created_by: 1
  }
];

// Vehicle Options
export const vehicleOptions = [
  {
    id: 1,
    model_name: 'VF 5',
    description: 'Xe điện đô thị nhỏ gọn, phù hợp cho di chuyển trong thành phố',
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z'
  },
  {
    id: 2,
    model_name: 'VF 6',
    description: 'SUV điện cỡ nhỏ, thiết kế hiện đại và tiết kiệm năng lượng',
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z'
  },
  {
    id: 3,
    model_name: 'VF 7',
    description: 'SUV điện cỡ trung, phù hợp cho gia đình và du lịch',
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00Z'
  },
  {
    id: 4,
    model_name: 'VF 8',
    description: 'SUV điện cao cấp với nhiều tính năng thông minh và an toàn',
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z'
  },
  {
    id: 5,
    model_name: 'VF 9',
    description: 'SUV điện hạng sang với không gian rộng rãi và trang bị đầy đủ',
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z'
  }
];

// Vehicles
export const vehicles = [
  {
    id: 1,
    vehiclesOptions_id: 1,
    variant_name: 'VF 5 Base',
    color: 'Trắng Ngọc Trai',
    battery_capacity: '37.23 kWh',
    range_km: 326,
    features: 'Hệ thống giải trí 10 inch, Camera 360°, Cảm biến áp suất lốp',
    status: 'available',
    image_url: '/assets/181Y.jpg'
  },
  {
    id: 2,
    vehiclesOptions_id: 1,
    variant_name: 'VF 5 Plus',
    color: 'Đỏ Passion',
    battery_capacity: '37.23 kWh',
    range_km: 326,
    features: 'Hệ thống giải trí 10 inch, Camera 360°, Cảm biến áp suất lốp, Sạc không dây',
    status: 'available',
    image_url: '/assets/181Y.jpg'
  },
  {
    id: 3,
    vehiclesOptions_id: 2,
    variant_name: 'VF 6 Eco',
    color: 'Xanh Đại Dương',
    battery_capacity: '59.6 kWh',
    range_km: 445,
    features: 'Màn hình 12.9 inch, Hệ thống âm thanh 11 loa, Phanh tái sinh',
    status: 'available',
    image_url: '/assets/181Y.jpg'
  },
  {
    id: 4,
    vehiclesOptions_id: 2,
    variant_name: 'VF 6 Plus',
    color: 'Đen Huyền Bí',
    battery_capacity: '59.6 kWh',
    range_km: 445,
    features: 'Màn hình 12.9 inch, Hệ thống âm thanh 11 loa, Phanh tái sinh, Ghế da cao cấp',
    status: 'available',
    image_url: '/assets/181Y.jpg'
  },
  {
    id: 5,
    vehiclesOptions_id: 3,
    variant_name: 'VF 7 Base',
    color: 'Bạc Lunar',
    battery_capacity: '75.3 kWh',
    range_km: 515,
    features: 'Màn hình 15.4 inch, Hệ thống âm thanh 13 loa, Tự động đỗ xe',
    status: 'available',
    image_url: '/assets/181Y.jpg'
  },
  {
    id: 6,
    vehiclesOptions_id: 3,
    variant_name: 'VF 7 Plus',
    color: 'Đỏ Cherry',
    battery_capacity: '75.3 kWh',
    range_km: 515,
    features: 'Màn hình 15.4 inch, Hệ thống âm thanh 13 loa, Tự động đỗ xe, Ghế massage',
    status: 'available',
    image_url: '/assets/181Y.jpg'
  },
  {
    id: 7,
    vehiclesOptions_id: 4,
    variant_name: 'VF 8 Eco',
    color: 'Xanh Metallic',
    battery_capacity: '87.7 kWh',
    range_km: 594,
    features: 'Màn hình 15.4 inch, Hệ thống âm thanh premium, Lái tự động cấp 2',
    status: 'available',
    image_url: '/assets/181Y.jpg'
  },
  {
    id: 8,
    vehiclesOptions_id: 4,
    variant_name: 'VF 8 Plus',
    color: 'Đen Piano',
    battery_capacity: '87.7 kWh',
    range_km: 594,
    features: 'Màn hình 15.4 inch, Hệ thống âm thanh premium, Lái tự động cấp 2, Nội thất da Nappa',
    status: 'available',
    image_url: '/assets/181Y.jpg'
  },
  {
    id: 9,
    vehiclesOptions_id: 5,
    variant_name: 'VF 9 Eco',
    color: 'Trắng Alpina',
    battery_capacity: '123 kWh',
    range_km: 680,
    features: 'Màn hình 15.4 inch, Hệ thống âm thanh Harman Kardon, 7 chỗ ngồi',
    status: 'available',
    image_url: '/assets/181Y.jpg'
  },
  {
    id: 10,
    vehiclesOptions_id: 5,
    variant_name: 'VF 9 Plus',
    color: 'Đen Obsidian',
    battery_capacity: '123 kWh',
    range_km: 680,
    features: 'Màn hình 15.4 inch, Hệ thống âm thanh Harman Kardon, 7 chỗ ngồi, Nội thất siêu cao cấp',
    status: 'available',
    image_url: '/assets/181Y.jpg'
  }
];

// Vehicle Prices
export const vehiclePrices = [
  // VF 5
  { id: 1, vehicle_id: 1, agency_id: 1, price_type: 'retail', price_amount: 458000000, start_date: '2023-01-01', end_date: '2023-12-31' },
  { id: 2, vehicle_id: 2, agency_id: 1, price_type: 'retail', price_amount: 550000000, start_date: '2023-01-01', end_date: '2023-12-31' },
  
  // VF 6
  { id: 3, vehicle_id: 3, agency_id: 1, price_type: 'retail', price_amount: 765000000, start_date: '2023-01-01', end_date: '2023-12-31' },
  { id: 4, vehicle_id: 4, agency_id: 1, price_type: 'retail', price_amount: 850000000, start_date: '2023-01-01', end_date: '2023-12-31' },
  
  // VF 7
  { id: 5, vehicle_id: 5, agency_id: 1, price_type: 'retail', price_amount: 999000000, start_date: '2023-01-01', end_date: '2023-12-31' },
  { id: 6, vehicle_id: 6, agency_id: 1, price_type: 'retail', price_amount: 1150000000, start_date: '2023-01-01', end_date: '2023-12-31' },
  
  // VF 8
  { id: 7, vehicle_id: 7, agency_id: 1, price_type: 'retail', price_amount: 1200000000, start_date: '2023-01-01', end_date: '2023-12-31' },
  { id: 8, vehicle_id: 8, agency_id: 1, price_type: 'retail', price_amount: 1350000000, start_date: '2023-01-01', end_date: '2023-12-31' },
  
  // VF 9
  { id: 9, vehicle_id: 9, agency_id: 1, price_type: 'retail', price_amount: 1500000000, start_date: '2023-01-01', end_date: '2023-12-31' },
  { id: 10, vehicle_id: 10, agency_id: 1, price_type: 'retail', price_amount: 1700000000, start_date: '2023-01-01', end_date: '2023-12-31' }
];

// Vehicle Promotions
export const vehiclePromotions = [
  {
    id: 1,
    vehicle_id: 1,
    promo_name: 'Ưu đãi xe điện xanh',
    discount_amount: 50000000,
    start_date: '2025-10-01',
    end_date: '2025-12-31'
  },
  {
    id: 2,
    vehicle_id: 3,
    promo_name: 'Khuyến mãi mùa thu',
    discount_amount: 75000000,
    start_date: '2025-09-01',
    end_date: '2025-11-30'
  },
  {
    id: 3,
    vehicle_id: 7,
    promo_name: 'Ưu đãi VF8 Premium',
    discount_amount: 100000000,
    start_date: '2025-10-10',
    end_date: '2025-12-10'
  }
];

// Customers
export const customers = [
  {
    id: 1,
    full_name: 'Nguyễn Văn Khách',
    phone: '0912345678',
    email: 'khach.nguyen@gmail.com',
    address: '123 Phố Huế, Hai Bà Trưng, Hà Nội',
    created_at: '2023-05-15T10:30:00Z'
  },
  {
    id: 2,
    full_name: 'Trần Thị Hoa',
    phone: '0923456789',
    email: 'hoa.tran@gmail.com',
    address: '456 Lê Lợi, Quận 1, TP.HCM',
    created_at: '2023-06-20T14:15:00Z'
  },
  {
    id: 3,
    full_name: 'Lê Minh Tuấn',
    phone: '0934567890',
    email: 'tuan.le@gmail.com',
    address: '789 Nguyễn Văn Linh, Hải Châu, Đà Nẵng',
    created_at: '2023-07-10T09:45:00Z'
  }
];

// Quotations
export const quotations = [
  {
    id: 1,
    agency_id: 1,
    customer_id: 1,
    vehicle_id: 1,
    quotation_name: 'Báo giá VF8 Eco',
    quoted_price: 1050000000,
    start_date: '2023-10-15',
    end_date: '2023-12-31',
    created_at: '2023-10-15T10:00:00Z',
    status: 'pending'
  },
  {
    id: 2,
    agency_id: 1,
    customer_id: 2,
    vehicle_id: 8,
    quotation_name: 'Báo giá VF8 Plus',
    quoted_price: 1350000000,
    start_date: '2023-10-10',
    end_date: '2023-11-30',
    created_at: '2023-10-10T14:20:00Z',
    status: 'approved'
  }
];

// Orders
export const orders = [
  {
    id: 1,
    user_id: 4,
    order_date: '2023-10-20',
    order_number: 'ORD2023001',
    status: 'ordered',
    total_amount: 1275000000
  },
  {
    id: 2,
    user_id: 4,
    order_date: '2023-10-18',
    order_number: 'ORD2023002',
    status: 'in_transit',
    total_amount: 1000000000
  }
];

// Order Details
export const orderDetails = [
  {
    id: 1,
    order_id: 1,
    quotation_id: 2,
    quantity: 1,
    unit_price: 1350000000,
    subtotal: 1275000000
  },
  {
    id: 2,
    order_id: 2,
    quotation_id: 1,
    quantity: 1,
    unit_price: 1050000000,
    subtotal: 1000000000
  }
];

// Contracts
export const contracts = [
  {
    id: 1,
    quotation_id: 2,
    contract_name: 'Hợp đồng mua xe VF8 Plus',
    contract_number: 'HD2023001',
    contract_date: '2023-10-25',
    expiration_date: '2024-10-25',
    signed_by: 'Trần Thị Hoa',
    terms: 'Các điều khoản và điều kiện mua xe VF8 Plus, thanh toán trả góp 36 tháng'
  },
  {
    id: 2,
    quotation_id: 1,
    contract_name: 'Hợp đồng mua xe VF8 Eco',
    contract_number: 'HD2023002',
    contract_date: '2023-10-22',
    expiration_date: '2024-10-22',
    signed_by: 'Nguyễn Văn Khách',
    terms: 'Các điều khoản và điều kiện mua xe VF8 Eco, thanh toán trả thẳng'
  }
];

// Payments
export const payments = [
  {
    id: 1,
    order_id: 1,
    payment_date: '2023-10-25',
    prepay: 127500000,
    amount: 127500000,
    payment_method: 'bank_transfer',
    status: 'completed'
  },
  {
    id: 2,
    order_id: 2,
    payment_date: '2023-10-22',
    prepay: 100000000,
    amount: 100000000,
    payment_method: 'bank_transfer',
    status: 'completed'
  },
  {
    id: 3,
    order_id: 2,
    payment_date: '2023-11-01',
    prepay: 100000000,
    amount: 900000000,
    payment_method: 'bank_transfer',
    status: 'completed'
  }
];

// Transactions
export const transactions = [
  {
    id: 1,
    payment_id: 1,
    transaction_code: 'TXN2023001',
    transaction_date: '2023-10-25T14:30:00Z',
    amount: 127500000,
    status: 'completed'
  },
  {
    id: 2,
    payment_id: 2,
    transaction_code: 'TXN2023002',
    transaction_date: '2023-10-22T10:15:00Z',
    amount: 100000000,
    status: 'completed'
  },
  {
    id: 3,
    payment_id: 3,
    transaction_code: 'TXN2023003',
    transaction_date: '2023-11-01T16:45:00Z',
    amount: 900000000,
    status: 'completed'
  }
];

// Deliveries
export const deliveries = [
  {
    id: 1,
    order_id: 1,
    delivery_date: '2023-11-15',
    delivery_status: 'scheduled',
    notes: 'Giao xe tại showroom Hà Nội'
  },
  {
    id: 2,
    order_id: 2,
    delivery_date: '2023-11-10',
    delivery_status: 'delivered',
    notes: 'Đã giao xe thành công, khách hàng hài lòng'
  }
];

// Feedback
export const feedback = [
  {
    id: 1,
    customer_id: 2,
    comment: 'Rất hài lòng với dịch vụ giao xe và chất lượng xe VF8 Plus',
    created_at: '2023-11-10T15:30:00Z',
    updated_at: '2023-11-10T15:30:00Z',
    status: 'published'
  },
  {
    id: 2,
    customer_id: 1,
    comment: 'Nhân viên tư vấn chưa nhiệt tình, chuyên nghiệp',
    created_at: '2023-10-25T11:20:00Z',
    updated_at: '2023-10-25T11:20:00Z',
    status: 'published'
  }
];

// Agency Inventory
export const agencyInventory = [
  {
    id: 1,
    agency_id: 1,
    vehicle_id: 1,
    quantity: 5
  },
  {
    id: 2,
    agency_id: 1,
    vehicle_id: 8,
    quantity: 3
  },
  {
    id: 3,
    agency_id: 2,
    vehicle_id: 3,
    quantity: 7
  }
];

// EV Inventory
export const evInventory = [
  {
    id: 1,
    vehicle_id: 1,
    quantity: 50
  },
  {
    id: 2,
    vehicle_id: 8,
    quantity: 30
  },
  {
    id: 3,
    vehicle_id: 3,
    quantity: 45
  }
];

// Allocations
export const allocations = [
  {
    id: 1,
    evinventory_id: 1,
    agency_id: 1,
    vehicle_id: 1,
    allocated_quantity: 5,
    allocation_date: '2023-10-01'
  },
  {
    id: 2,
    evinventory_id: 2,
    agency_id: 1,
    vehicle_id: 8,
    allocated_quantity: 3,
    allocation_date: '2023-10-05'
  }
];

// Agency Contracts
export const agencyContracts = [
  {
    id: 1,
    agency_id: 1,
    contract_number: 'AC2023001',
    contract_start_date: '2023-01-01',
    contract_end_date: '2025-12-31',
    terms: 'Hợp đồng đại lý VinFast năm 2023',
    status: 'active'
  },
  {
    id: 2,
    agency_id: 2,
    contract_number: 'AC2023002',
    contract_start_date: '2023-01-01',
    contract_end_date: '2025-12-31',
    terms: 'Hợp đồng đại lý VinFast năm 2023',
    status: 'active'
  }
];

// Agency Debts
export const agencyDebts = [
  {
    id: 1,
    agency_id: 1,
    AgencyContract_id: 1,
    debt_amount: 5000000000,
    paid_amount: 3000000000,
    remaining_amount: 2000000000,
    due_date: '2025-12-31',
    status: 'partial',
    notes: 'Thanh toán theo kế hoạch',
    created_at: '2023-01-15T10:00:00Z',
    updated_at: '2023-10-01T10:00:00Z'
  }
];

// Agency Targets
export const agencyTargets = [
  {
    id: 1,
    agency_id: 1,
    target_year: 2023,
    target_month: 10,
    target_sales: 50,
    achieved_sales: 32
  },
  {
    id: 2,
    agency_id: 1,
    target_year: 2023,
    target_month: 11,
    target_sales: 60,
    achieved_sales: 0
  }
];

// Test Drive
export const testDrive = [
  {
    id: 1,
    agency_id: 1,
    vehicle_id: 1,
    customer_id: 1,
    appointment_date: '2023-10-10T10:00:00Z',
    status: 'completed',
    notes: 'Khách hàng quan tâm đến VF8 Eco',
    feedback: 'Xe chạy êm, thoải mái',
    created_at: '2023-10-08T14:30:00Z',
    updated_at: '2023-10-10T11:30:00Z'
  },
  {
    id: 2,
    agency_id: 1,
    vehicle_id: 8,
    customer_id: 2,
    appointment_date: '2023-10-15T14:00:00Z',
    status: 'completed',
    notes: 'Khách hàng muốn trải nghiệm VF8 Plus',
    feedback: 'Rất ấn tượng với công nghệ và thiết kế',
    created_at: '2023-10-12T09:15:00Z',
    updated_at: '2023-10-15T15:30:00Z'
  },
  {
    id: 3,
    agency_id: 1,
    vehicle_id: 9,
    customer_id: 3,
    appointment_date: '2023-10-20T10:00:00Z',
    status: 'scheduled',
    notes: 'Khách hàng quan tâm VF9 cho gia đình',
    feedback: null,
    created_at: '2023-10-14T16:00:00Z',
    updated_at: '2023-10-14T16:00:00Z'
  }
];

// Default credentials cho demo
export const defaultCredentials = [
  { username: 'admin', password: 'admin123', role: 'Admin' },
  { username: 'evmstaff', password: 'evm123', role: 'EVM Staff' },
  { username: 'manager_hanoi', password: 'manager123', role: 'Dealer Manager' },
  { username: 'staff_hanoi', password: 'staff123', role: 'Dealer Staff' }
];