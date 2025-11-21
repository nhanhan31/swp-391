import React, { useState } from 'react';
import {
  Layout,
  Menu,
  Avatar,
  Dropdown,
  Space,
  Typography,
  Button,
  Badge,
  theme
} from 'antd';
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  DashboardOutlined,
  CarOutlined,
  UserOutlined,
  ShopOutlined,
  FileTextOutlined,
  BarChartOutlined,
  SettingOutlined,
  LogoutOutlined,
  BellOutlined,
  TeamOutlined,
  ShoppingCartOutlined,
  ContactsOutlined,
  CalendarOutlined,
  CreditCardOutlined
} from '@ant-design/icons';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import '../styles/MainLayout.css';

const { Header, Sider, Content } = Layout;
const { Text } = Typography;

const MainLayout = () => {
  const [collapsed, setCollapsed] = useState(false);
  const { currentUser, logout, isAdmin, isEVMStaff, isDealerManager, isDealerStaff, isAgencyManager } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const {
    token: { colorBgContainer },
  } = theme.useToken();

  // Menu items dựa trên role
  const getMenuItems = () => {
    const commonItems = [
      {
        key: '/dashboard',
        icon: <DashboardOutlined />,
        label: 'Tổng quan',
      }
    ];

    // Menu cho Admin
    if (isAdmin()) {
      return [
        //...commonItems,
        {
          key: 'vehicles-management',
          icon: <CarOutlined />,
          label: 'Quản lý sản phẩm',
          children: [
            { key: '/vehicles/catalog', label: 'Danh mục xe điện' },
            { key: '/vehicles/management', label: 'Quản lý model & variant' },
            { key: '/vehicles/inventory', label: 'Tồn kho tổng' },
            

          ]
        },
        {
          key: 'agencies-management',
          icon: <ShopOutlined />,
          label: 'Quản lý đại lý',
          children: [
            { key: '/agencies', label: 'Danh sách đại lý' },
            { key: '/agencies/contracts', label: 'Hợp đồng' },
            { key: '/agencies/order-management', label: 'Quản lý đơn nhập xe' },
            { key: '/agencies/targets', label: 'Chỉ tiêu doanh số' },
            { key: '/agencies/debts', label: 'Công nợ' },
            // { key: '/agencies/accounts', label: 'Tài khoản đại lý' }
          ]
        },
        {
          key: 'users-management',
          icon: <TeamOutlined />,
          label: 'Quản lý người dùng',
          children: [
             { key: '/agencies/accounts', label: 'Tài khoản đại lý' },
             { key: '/users', label: 'Danh sách người dùng' },
          ]
        },
        {
          key: 'reports-admin',
          icon: <BarChartOutlined />,
          label: 'Báo cáo & Phân tích',
          children: [
            { key: '/reports/sales-by-region', label: 'Doanh số theo khu vực' },
            { key: '/reports/sales-by-agency', label: 'Doanh số theo đại lý' },
            
            { key: '/reports/consumption-speed', label: 'Tốc độ tiêu thụ' },
            { key: '/reports/prediction', label: 'Dự báo kế hoạch' }
          ]
        }
      ];
    }

    // Menu cho EVM Staff
    if (isEVMStaff()) {
      return [
        // ...commonItems,
        
        {
          key: 'agencies-management',
          icon: <ShopOutlined />,
          label: 'Quản lý đại lý',
          children: [
            { key: '/vehicles/allocation', label: 'Điều phối xe' },
            { key: '/agencies', label: 'Danh sách đại lý' },
            { key: '/agencies/contracts', label: 'Hợp đồng đại lý' },
            { key: '/agencies/order-management', label: 'Quản lý đơn nhập xe' },
            { key: '/agencies/targets', label: 'Chỉ tiêu doanh số' },
            { key: '/agencies/debts', label: 'Công nợ' },
            // { key: '/agencies/accounts', label: 'Tài khoản đại lý' }
          ]
        },
        {
          key: 'pricing',
          icon: <CreditCardOutlined />,
          label: 'Chính sách giá',
          children: [
            { key: '/pricing/wholesale', label: 'Quản lí giá' },
            // { key: '/pricing/discounts', label: 'Chiết khấu' },
            { key: '/pricing/promotions', label: 'Khuyến mãi theo đại lý' }
          ]
        },
        // {
        //   key: 'reports-evm',
        //   icon: <BarChartOutlined />,
        //   label: 'Báo cáo',
        //   children: [
        //     { key: '/reports/sales-by-region', label: 'Doanh số theo khu vực' },
        //     { key: '/reports/sales-by-agency', label: 'Doanh số theo đại lý' },
        //     { key: '/reports/inventory', label: 'Tồn kho' },
        //     { key: '/reports/consumption-speed', label: 'Tốc độ tiêu thụ' },
        //     { key: '/reports/prediction', label: 'Dự báo kế hoạch' }
        //   ]
        // }
      ];
    }

    // Menu cho Agency Manager (kiểm tra trước Dealer)
    if (isAgencyManager()) {
      return [
        ...commonItems,
        {
          key: 'agency-operations',
          icon: <ShopOutlined />,
          label: 'Vận hành đại lý',
          children: [
            { key: '/agencies/contracts', label: 'Hợp đồng đại lý' },
            { key: '/agencies/orders', label: 'Đơn nhập xe' },
            { key: '/agencies/payments', label: 'Thanh toán đơn hàng' },
            { key: '/agencies/targets', label: 'Chỉ tiêu doanh số' }
          ]
        },
        {
          key: 'vehicles-info',
          icon: <CarOutlined />,
          label: 'Thông tin xe',
          children: [
            { key: '/vehicles/catalog', label: 'Danh mục xe' },
            { key: '/vehicles/compare', label: 'So sánh xe' },
            // { key: '/vehicles/price', label: 'Bảng giá' }
          ]
        },
        {
          key: 'sales-management',
          icon: <ShoppingCartOutlined />,
          label: 'Quản lý bán hàng',
          children: [
            { key: '/sales/quotations', label: 'Báo giá' },
            { key: '/sales/orders', label: 'Đơn hàng' },
            { key: '/sales/contracts', label: 'Hợp đồng bán hàng' },
            { key: '/sales/deliveries', label: 'Giao xe' },
            { key: '/sales/promotions', label: 'Khuyến mãi' },
            { key: '/sales/payments', label: 'Thanh toán' }
          ]
        },
        {
          key: 'customers',
          icon: <ContactsOutlined />,
          label: 'Quản lý khách hàng',
          children: [
            { key: '/customers', label: 'Hồ sơ khách hàng' },
            { key: '/customers/test-drives', label: 'Lịch hẹn lái thử' },
            { key: '/customers/feedback', label: 'Phản hồi & Khiếu nại' }
          ]
        },
        {
          key: 'reports-dealer',
          icon: <BarChartOutlined />,
          label: 'Báo cáo',
          children: [
            { key: '/reports/sales-staff', label: 'Doanh số nhân viên' },
            { key: '/reports/customer-debts', label: 'Công nợ khách hàng' },
            { key: '/reports/agency-debts', label: 'Công nợ hãng xe' }
          ]
        }
      ];
    }

    // Menu cho Dealer Manager & Dealer Staff
    if (isAgencyManager() || isDealerStaff()) {
      const dealerMenuItems = [
        ...commonItems,
        {
          key: 'vehicles-info',
          icon: <CarOutlined />,
          label: 'Thông tin xe',
          children: [
            { key: '/vehicles/catalog', label: 'Danh mục xe' },
            { key: '/vehicles/compare', label: 'So sánh xe' },

          ]
        },
        {
          key: 'sales-management',
          icon: <ShoppingCartOutlined />,
          label: 'Quản lý bán hàng',
          children: [
            { key: '/sales/quotations', label: 'Báo giá' },
            { key: '/sales/orders', label: 'Đơn hàng' },

            { key: '/sales/contracts', label: 'Hợp đồng bán hàng' },
            { key: '/sales/deliveries', label: 'Giao xe' },
            // { key: '/sales/payments', label: 'Thanh toán' }
          ]
        },
        {
          key: 'customers',
          icon: <ContactsOutlined />,
          label: 'Quản lý khách hàng',
          children: [
            { key: '/customers', label: 'Hồ sơ khách hàng' },
            { key: '/customers/test-drives', label: 'Lịch hẹn lái thử' },
            { key: '/customers/feedback', label: 'Phản hồi & Khiếu nại' }
          ]
        },

      ];

      // Dealer Manager có thêm menu báo cáo

      if (isDealerManager()) {
        dealerMenuItems.push({
          key: 'reports-dealer',
          icon: <BarChartOutlined />,
          label: 'Báo cáo',
          children: [
            { key: '/reports/sales-staff', label: 'Doanh số nhân viên' },
            { key: '/reports/customer-debts', label: 'Công nợ khách hàng' },
            { key: '/reports/agency-debts', label: 'Công nợ hãng xe' }
          ]
        });
      }

      return dealerMenuItems;
    }

    return commonItems;
  };

  // Handle menu click
  const handleMenuClick = ({ key }) => {
    navigate(key);
  };

  // User dropdown menu
  const userMenuItems = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: 'Thông tin cá nhân',
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: 'Cài đặt',
    },
    {
      type: 'divider',
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Đăng xuất',
      danger: true,
    },
  ];

  const handleUserMenuClick = ({ key }) => {
    if (key === 'logout') {
      logout();
      navigate('/login');
    } else {
      navigate(`/${key}`);
    }
  };

  return (
    <Layout className="main-layout">
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        className="main-sidebar"
        width={260}
      >
        <div className="logo-container">
          {!collapsed ? (
            <div className="logo-expanded">
              <CarOutlined className="logo-icon" />
              <span className="logo-text">VinFast EVM</span>
            </div>
          ) : (
            <CarOutlined className="logo-collapsed" />
          )}
        </div>

        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={getMenuItems()}
          onClick={handleMenuClick}
          className="main-menu"
        />
      </Sider>

      <Layout>
        <Header className="main-header" style={{ background: colorBgContainer }}>
          <div className="header-left">
            <Button
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed(!collapsed)}
              className="collapse-button"
            />
          </div>

          <div className="header-right">
            <Space size="large">


              <Dropdown
                menu={{
                  items: userMenuItems,
                  onClick: handleUserMenuClick,
                }}
                placement="bottomRight"
                arrow
              >
                <div className="user-info">
                  <Space>
                    <Avatar
                      src={currentUser?.avatar_url}
                      icon={<UserOutlined />}
                      size="default"
                    />
                    <div className="user-details">
                      <Text className="user-name">{currentUser?.full_name}</Text>
                      <Text className="user-role" type="secondary">
                        {currentUser?.role?.role_name}
                      </Text>
                    </div>
                  </Space>
                </div>
              </Dropdown>
            </Space>
          </div>
        </Header>

        <Content className="main-content">
          <div className="content-wrapper">
            <Outlet />
          </div>
        </Content>
      </Layout>
    </Layout>
  );
};

export default MainLayout;