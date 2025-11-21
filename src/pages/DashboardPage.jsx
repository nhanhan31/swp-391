import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Statistic, Typography, Space, Tag, Timeline, Spin } from 'antd';
import {
  CarOutlined,
  UserOutlined,
  ShopOutlined,
  DollarOutlined,
  TrophyOutlined,
  RiseOutlined,
  ClockCircleOutlined,
  FileTextOutlined,
  CheckCircleOutlined,
  TeamOutlined
} from '@ant-design/icons';
import { useAuth } from '../context/AuthContext';
import { 
  quotationAPI, 
  contractAPI, 
  customerAPI, 
  orderAPI, 
  agencyInventoryAPI,
  testDriveAPI,
  feedbackAPI 
} from '../services/quotationService';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/vi';

dayjs.extend(relativeTime);
dayjs.locale('vi');

const { Title, Text } = Typography;

const DashboardPage = () => {
  const { currentUser, isAdmin, isEVMStaff, isDealerManager, isDealerStaff } = useAuth();
  const [loading, setLoading] = useState(true);
  const [statistics, setStatistics] = useState({
    totalVehicles: 0,
    totalQuotations: 0,
    totalContracts: 0,
    totalOrders: 0,
    totalCustomers: 0,
    totalRevenue: 0,
    recentActivities: []
  });

  // Fetch dashboard data for agency
  useEffect(() => {
    const fetchDashboardData = async () => {
      console.log('Current user:', currentUser);
      const agencyId = currentUser?.agency?.id;
      console.log('Agency ID:', agencyId);
      
      if (!agencyId) {
        console.log('No agency ID found, skipping API calls');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        console.log('Fetching dashboard data for agency:', agencyId);

        // Fetch data in parallel
        const [
          vehiclesData,
          quotationsData,
          contractsData,
          ordersData,
          customersData,
          testDrivesData,
          feedbacksData
        ] = await Promise.all([
          agencyInventoryAPI.getByAgencyId(agencyId).catch((err) => { console.error('Vehicles error:', err); return []; }),
          quotationAPI.getByAgencyId(agencyId).catch((err) => { console.error('Quotations error:', err); return []; }),
          contractAPI.getByAgencyId(agencyId).catch((err) => { console.error('Contracts error:', err); return []; }),
          orderAPI.getByAgencyId(agencyId).catch((err) => { console.error('Orders error:', err); return []; }),
          customerAPI.getAll().catch((err) => { console.error('Customers error:', err); return []; }),
          testDriveAPI.getByAgencyId(agencyId).catch((err) => { console.error('TestDrives error:', err); return []; }),
          feedbackAPI.getByAgencyId(agencyId).catch((err) => { console.error('Feedbacks error:', err); return []; })
        ]);

        console.log('API Results:', {
          vehicles: vehiclesData?.length,
          quotations: quotationsData?.length,
          contracts: contractsData?.length,
          orders: ordersData?.length,
          customers: customersData?.length,
          testDrives: testDrivesData?.length,
          feedbacks: feedbacksData?.length
        });

        // Calculate statistics
        const totalVehicles = vehiclesData?.length || 0;
        const totalQuotations = quotationsData?.length || 0;
        const totalContracts = contractsData?.length || 0;
        const totalOrders = ordersData?.length || 0;
        const totalCustomers = customersData?.length || 0;

        // Calculate total revenue from converted quotations
        const totalRevenue = quotationsData?.reduce((sum, quotation) => {
          if (quotation.status === 'Converted') {
            return sum + (parseFloat(quotation.quotedPrice) || 0);
          }
          return sum;
        }, 0) || 0;

        console.log('Total Revenue from Converted Quotations:', totalRevenue);

        // Build recent activities
        const activities = [];

        // Add recent quotations (sort by createdAt)
        const sortedQuotations = [...(quotationsData || [])].sort((a, b) => 
          new Date(b.createdAt) - new Date(a.createdAt)
        );
        sortedQuotations.slice(0, 3).forEach(quotation => {
          activities.push({
            title: `Tạo báo giá "${quotation.quotationName}" - ${quotation.quotedPrice?.toLocaleString('vi-VN')} VNĐ`,
            time: dayjs(quotation.createdAt).fromNow(),
            type: 'info',
            timestamp: new Date(quotation.createdAt).getTime()
          });
        });

        // Add recent contracts (sort by contractDate)
        const sortedContracts = [...(contractsData || [])].sort((a, b) => 
          new Date(b.contractDate) - new Date(a.contractDate)
        );
        sortedContracts.slice(0, 2).forEach(contract => {
          activities.push({
            title: `Hợp đồng ${contract.contractNumber || contract.contractName}`,
            time: dayjs(contract.contractDate).fromNow(),
            type: 'success',
            timestamp: new Date(contract.contractDate).getTime()
          });
        });

        // Add recent orders (sort by orderDate)
        const sortedOrders = [...(ordersData || [])].sort((a, b) => 
          new Date(b.orderDate) - new Date(a.orderDate)
        );
        sortedOrders.slice(0, 2).forEach(order => {
          activities.push({
            title: `Đơn hàng #${order.id} - ${order.totalAmount?.toLocaleString('vi-VN')} VNĐ`,
            time: dayjs(order.orderDate).fromNow(),
            type: 'warning',
            timestamp: new Date(order.orderDate).getTime()
          });
        });

        // Add recent test drives (sort by appointmentDate)
        const sortedTestDrives = [...(testDrivesData || [])].sort((a, b) => 
          new Date(b.appointmentDate) - new Date(a.appointmentDate)
        );
        sortedTestDrives.slice(0, 2).forEach(testDrive => {
          const customerName = testDrive.customer?.fullName || 'Khách hàng';
          const vehicleName = testDrive.vehicle?.vehicleName || 'xe';
          activities.push({
            title: `Lịch lái thử ${vehicleName} - ${customerName}`,
            time: dayjs(testDrive.appointmentDate).fromNow(),
            type: testDrive.status === 'Completed' ? 'success' : 'warning',
            timestamp: new Date(testDrive.appointmentDate).getTime()
          });
        });

        // Sort activities by timestamp (newest first)
        activities.sort((a, b) => b.timestamp - a.timestamp);

        setStatistics({
          totalVehicles,
          totalQuotations,
          totalContracts,
          totalOrders,
          totalCustomers,
          totalRevenue,
          recentActivities: activities.slice(0, 5)
        });

      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [currentUser]);

  // Get statistics cards based on real data
  const getStatisticsCards = () => {
    if (isAdmin() || isEVMStaff()) {
      // Keep mock data for admin and EVM staff for now
      if (isAdmin()) {
        return [
          { title: 'Tổng số xe', value: 1250, icon: <CarOutlined />, color: '#1890ff' },
          { title: 'Đại lý hoạt động', value: 45, icon: <ShopOutlined />, color: '#52c41a' },
          { title: 'Người dùng', value: 186, icon: <UserOutlined />, color: '#722ed1' },
          { title: 'Doanh thu (tỷ VND)', value: 125.6, precision: 1, icon: <DollarOutlined />, color: '#fa8c16' }
        ];
      } else {
        return [
          { title: 'Xe trong kho', value: 850, icon: <CarOutlined />, color: '#1890ff' },
          { title: 'Đại lý quản lý', value: 25, icon: <ShopOutlined />, color: '#52c41a' },
          { title: 'Đơn hàng chờ', value: 32, icon: <ClockCircleOutlined />, color: '#fa541c' },
          { title: 'Doanh số tháng (tỷ VND)', value: 45.2, precision: 1, icon: <DollarOutlined />, color: '#fa8c16' }
        ];
      }
    } else {
      // Use real data for agency staff and manager
      return [
        { 
          title: 'Xe có sẵn', 
          value: statistics.totalVehicles, 
          icon: <CarOutlined />, 
          color: '#1890ff' 
        },
        { 
          title: 'Báo giá', 
          value: statistics.totalQuotations, 
          icon: <FileTextOutlined />, 
          color: '#722ed1' 
        },
        { 
          title: 'Hợp đồng', 
          value: statistics.totalContracts, 
          icon: <CheckCircleOutlined />, 
          color: '#52c41a' 
        },
        { 
          title: 'Doanh thu (tỷ VND)', 
          value: statistics.totalRevenue / 1000000000, 
          precision: 2, 
          icon: <DollarOutlined />, 
          color: '#fa8c16' 
        }
      ];
    }
  };

  const getRecentActivities = () => {
    // Use real activities for agency users
    if ((isDealerManager() || isDealerStaff()) && statistics.recentActivities.length > 0) {
      return statistics.recentActivities;
    }

    // Mock data for admin and EVM staff
    if (isAdmin()) {
      return [
        { title: 'Thêm đại lý mới VinFast Cần Thơ', time: '10 phút trước', type: 'success' },
        { title: 'Cập nhật giá VF 8 Plus', time: '2 giờ trước', type: 'info' },
        { title: 'Phê duyệt khuyến mãi tháng 11', time: '1 ngày trước', type: 'warning' },
        { title: 'Xuất báo cáo doanh số Q3', time: '2 ngày trước', type: 'default' }
      ];
    } else if (isEVMStaff()) {
      return [
        { title: 'Điều phối 50 xe VF 5 cho đại lý HCM', time: '30 phút trước', type: 'success' },
        { title: 'Cập nhật chính sách giá sỉ', time: '3 giờ trước', type: 'info' },
        { title: 'Duyệt hợp đồng đại lý Đà Nẵng', time: '5 giờ trước', type: 'warning' },
        { title: 'Báo cáo tồn kho tuần', time: '1 ngày trước', type: 'default' }
      ];
    } else {
      return [
        { title: 'Tạo báo giá cho khách hàng Nguyễn Văn A', time: '15 phút trước', type: 'success' },
        { title: 'Lịch hẹn lái thử VF 7 - 14:00', time: '1 giờ trước', type: 'info' },
        { title: 'Hoàn thành đơn hàng #VF-2023-1001', time: '3 giờ trước', type: 'warning' },
        { title: 'Cập nhật thông tin khách hàng', time: '1 ngày trước', type: 'default' }
      ];
    }
  };

  const statisticsCards = getStatisticsCards();
  const activities = getRecentActivities();

  if (loading) {
    return (
      <div style={{ padding: '100px 24px 24px 24px', textAlign: 'center' }}>
        <Spin size="large" />
        <div style={{ marginTop: '16px' }}>
          <Text type="secondary">Đang tải dữ liệu dashboard...</Text>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <Title level={2}>
          Tổng quan đại lý
        </Title>
        
      </div>

      {/* Statistics Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        {statisticsCards.map((stat, index) => (
          <Col xs={24} sm={12} lg={6} key={index}>
            <Card>
              <Statistic
                title={stat.title}
                value={stat.value}
                precision={stat.precision || 0}
                valueStyle={{ color: stat.color }}
                prefix={stat.icon}
              />
            </Card>
          </Col>
        ))}
      </Row>

      {/* Main Content */}
      <Row gutter={[16, 16]}>
        {/* Recent Activities */}
        <Col xs={24} lg={12}>
          <Card 
            title={
              <Space>
                <ClockCircleOutlined />
                Hoạt động gần đây
              </Space>
            }
          >
            <Timeline
              items={activities.map((activity, index) => ({
                children: (
                  <div key={index}>
                    <Text>{activity.title}</Text>
                    <br />
                    <Text type="secondary" style={{ fontSize: '12px' }}>
                      {activity.time}
                    </Text>
                  </div>
                ),
                color: activity.type === 'success' ? 'green' : 
                       activity.type === 'warning' ? 'orange' :
                       activity.type === 'info' ? 'blue' : 'gray'
              }))}
            />
          </Card>
        </Col>

        {/* Quick Actions / Charts */}
        <Col xs={24} lg={12}>
          <Card 
            title={
              <Space>
                <RiseOutlined />
                Thống kê nhanh
              </Space>
            }
          >
            <Space direction="vertical" style={{ width: '100%' }} size="large">
              {isAdmin() && (
                <>
                  <div>
                    <Text strong>Hiệu suất hệ thống</Text>
                    <br />
                    <Text>Đại lý hoạt động: <Text type="success">95%</Text></Text>
                    <br />
                    <Text>Tăng trưởng doanh thu: <Text type="success">+12.5%</Text></Text>
                  </div>
                </>
              )}
              
              {isEVMStaff() && (
                <>
                  <div>
                    <Text strong>Tồn kho & Phân phối</Text>
                    <br />
                    <Text>Tỷ lệ tồn kho: <Text type="warning">78%</Text></Text>
                    <br />
                    <Text>Đại lý cần bổ sung: <Text type="error">5 đại lý</Text></Text>
                  </div>
                </>
              )}
              
              {(isDealerManager() || isDealerStaff()) && (
                <>
                  <div>
                    <Text strong>Hiệu suất bán hàng</Text>
                    <br />
                    <Text>Tổng đơn hàng: <Text strong>{statistics.totalOrders}</Text></Text>
                    <br />
                    <Text>Tổng khách hàng: <Text strong>{statistics.totalCustomers}</Text></Text>
                    <br />
                    <Text>Xe trong kho: <Text type="info">{statistics.totalVehicles} xe</Text></Text>
                  </div>
                  <div>
                    <Text strong>Thống kê báo giá & hợp đồng</Text>
                    <br />
                    <Text>Báo giá: <Text type="info">{statistics.totalQuotations}</Text></Text>
                    <br />
                    <Text>Hợp đồng: <Text type="success">{statistics.totalContracts}</Text></Text>
                    <br />
                    {statistics.totalQuotations > 0 && (
                      <Text>Tỷ lệ chuyển đổi: <Text type="success">
                        {((statistics.totalContracts / statistics.totalQuotations) * 100).toFixed(1)}%
                      </Text></Text>
                    )}
                  </div>
                </>
              )}

              <div>
                <Text strong>Doanh thu</Text>
                <br />
                <Text>Tổng doanh thu: <Text type="success" strong>
                  {(statistics.totalRevenue / 1000000000).toFixed(2)} tỷ VND
                </Text></Text>
              </div>
            </Space>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default DashboardPage;