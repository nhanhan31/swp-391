# VinFast EVM - Hệ thống Quản lý Xe Điện

Ứng dụng web quản lý hệ thống bán và phân phối xe điện VinFast với 4 vai trò người dùng khác nhau.

## 🚀 Tính năng chính

### 1. Hệ thống Phân quyền 
- **Admin**: Quản trị viên hệ thống
- **EVM Staff**: Nhân viên hãng xe 
- **Dealer Manager**: Quản lý đại lý
- **Dealer Staff**: Nhân viên bán hàng

### 2. Chức năng đã triển khai
- ✅ Đăng nhập & phân quyền
- ✅ Dashboard theo vai trò
- ✅ Xem danh mục xe điện
- ✅ So sánh các dòng xe
- ✅ Quản lý giá bán & khuyến mãi
- ✅ Layout responsive với Ant Design

## 🛠️ Công nghệ sử dụng

- **Frontend**: React 19 + Vite
- **UI Framework**: Ant Design
- **Routing**: React Router v6
- **State Management**: React Context API
- **Styling**: CSS + Ant Design
- **Icons**: Ant Design Icons

## 📋 Yêu cầu hệ thống

- Node.js >= 20.19.0 hoặc >= 22.12.0
- npm >= 8.0.0

## 🔧 Cài đặt và chạy

1. **Clone dự án**
   ```bash
   git clone <repository-url>
   cd swp-391-1
   ```

2. **Cài đặt dependencies**
   ```bash
   npm install
   ```

3. **Chạy ứng dụng**
   ```bash
   npm run dev
   ```

4. **Truy cập ứng dụng**
   - Mở trình duyệt: `http://localhost:5173`

## 🔐 Tài khoản demo

| Vai trò | Username | Password | Mô tả |
|---------|----------|----------|-------|
| Admin | `admin` | `admin123` | Quản trị viên hệ thống |
| EVM Staff | `evmstaff` | `evm123` | Nhân viên hãng xe |
| Dealer Manager | `manager_hanoi` | `manager123` | Quản lý đại lý Hà Nội |
| Dealer Staff | `staff_hanoi` | `staff123` | Nhân viên bán hàng |

## 📱 Giao diện chính

### Trang đăng nhập
- Thiết kế hiện đại với gradient background
- Hỗ trợ demo accounts để test nhanh
- Responsive design

### Dashboard
- Thống kê theo vai trò người dùng
- Hoạt động gần đây
- Thông tin nhanh

### Danh mục xe điện
- Hiển thị grid các dòng xe VinFast
- Tìm kiếm và lọc theo mẫu xe
- Chi tiết thông số kỹ thuật
- Giá bán và khuyến mãi

### So sánh xe
- So sánh tối đa 4 xe cùng lúc
- Bảng so sánh chi tiết
- Giao diện trực quan

## 🏗️ Cấu trúc dự án

```
src/
├── components/          # Các component tái sử dụng
├── context/            # React Context (Auth)
├── data/               # Mock data
├── layouts/            # Layout components
├── pages/              # Các trang chính
├── routes/             # Định tuyến
├── styles/             # CSS files
└── utils/              # Utilities
```

## 🎯 Chức năng theo vai trò

### Admin
- Quản lý toàn bộ hệ thống
- Quản lý người dùng và đại lý
- Báo cáo tổng quan

### EVM Staff  
- Quản lý sản phẩm xe điện
- Điều phối tồn kho
- Quản lý chính sách giá

### Dealer Manager
- Quản lý bán hàng đại lý
- Quản lý nhân viên
- Báo cáo doanh số

### Dealer Staff
- Xem thông tin xe
- Tạo báo giá
- Quản lý khách hàng

## 🚧 Tính năng đang phát triển

- [ ] Quản lý đơn hàng
- [ ] Hệ thống thanh toán
- [ ] Quản lý khách hàng
- [ ] Báo cáo chi tiết
- [ ] Quản lý lái thử
- [ ] Hệ thống thông báo

## 📦 Scripts

```bash
# Chạy development server
npm run dev

# Build production
npm run build

# Lint code
npm run lint

# Preview build
npm run preview
```

## 🤝 Đóng góp

1. Fork dự án
2. Tạo feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Tạo Pull Request

## 📄 License

Dự án này được phát triển cho mục đích học tập trong khóa học SWP391.

---

**Phát triển bởi**: Nhóm SWP391-1  
**Công nghệ**: React + Vite + Ant Design  
**Năm**: 2024

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
