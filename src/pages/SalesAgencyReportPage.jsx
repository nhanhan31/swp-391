import React, { useMemo, useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Typography,
  Select,
  Statistic,
  Table,
  Tag,
  Progress,
  Avatar,
  Spin,
  message
} from 'antd';
import {
  ShopOutlined,
  TrophyOutlined,
  RiseOutlined,
  CarOutlined,
  DollarOutlined,
  EnvironmentOutlined
} from '@ant-design/icons';
import { Column, Line } from '@ant-design/plots';
import dayjs from 'dayjs';
import axios from 'axios';
import { orderAPI } from '../services/quotationService';

const { Title, Text } = Typography;

const AGENCY_API_URL = 'https://agency.agencymanagement.online/api';

const SalesAgencyReportPage = () => {
  const [selectedAgency, setSelectedAgency] = useState('all');
  const [selectedPeriod, setSelectedPeriod] = useState('year');
  const [loading, setLoading] = useState(false);
  const [agencies, setAgencies] = useState([]);
  const [orders, setOrders] = useState([]);

  // Fetch data from API
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [agenciesResponse, ordersData] = await Promise.all([
          axios.get(`${AGENCY_API_URL}/Agency`, {
            headers: {
              'Authorization': `Bearer ${sessionStorage.getItem('token')}`
            }
          }),
          orderAPI.getAll()
        ]);

        setAgencies(agenciesResponse.data || []);
        setOrders(ordersData || []);
      } catch (error) {
        console.error('Error fetching data:', error);
        message.error('Không thể tải dữ liệu báo cáo');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Calculate statistics from real data
  const statistics = useMemo(() => {
    if (!agencies.length || !orders.length) {
      return {
        totalSales: 0,
        totalRevenue: 0,
        totalTarget: 0,
        overallAchievementRate: 0,
        agencyStats: []
      };
    }

    // Filter orders by selected agency
    const filteredOrders = selectedAgency === 'all'
      ? orders
      : orders.filter(order => order.agencyId === parseInt(selectedAgency));

    // Group orders by agency
    const byAgency = agencies.reduce((acc, agency) => {
      const agencyOrders = orders.filter(order => order.agencyId === agency.id);
      
      // Count completed/delivered orders as sales
      const sales = agencyOrders.filter(order => 
        order.status?.toLowerCase() === 'completed' || 
        order.status?.toLowerCase() === 'delivered'
      ).length;

      // Sum revenue from all orders
      const revenue = agencyOrders.reduce((sum, order) => {
        return sum + (order.totalAmount || 0);
      }, 0);

      // Get target from agency data or calculate based on history
      const target = agency.salesTarget || Math.ceil(sales / 0.85); // Assume 85% achievement

      acc[agency.id] = {
        agency_id: agency.id,
        agency_name: agency.agencyName || 'N/A',
        location: agency.address || 'N/A',
        sales,
        revenue,
        target,
        achievementRate: target > 0 ? Math.round((sales / target) * 100) : 0,
        avgSalesPerMonth: Math.round(sales / 12) // Assuming year data
      };

      return acc;
    }, {});

    const agencyStats = Object.values(byAgency).sort((a, b) => b.sales - a.sales);

    const totalSales = agencyStats.reduce((sum, item) => sum + item.sales, 0);
    const totalRevenue = agencyStats.reduce((sum, item) => sum + item.revenue, 0);
    const totalTarget = agencyStats.reduce((sum, item) => sum + item.target, 0);

    return {
      totalSales,
      totalRevenue,
      totalTarget,
      overallAchievementRate: totalTarget > 0 ? Math.round((totalSales / totalTarget) * 100) : 0,
      agencyStats
    };
  }, [selectedAgency, agencies, orders]);

  // Data for charts - Group orders by month
  const chartData = useMemo(() => {
    if (!agencies.length || !orders.length) {
      return [];
    }

    const filteredOrders = selectedAgency === 'all'
      ? orders
      : orders.filter(order => order.agencyId === parseInt(selectedAgency));

    // Group by agency and month
    const monthlyData = {};
    
    filteredOrders.forEach(order => {
      if (!order.orderDate) return;
      
      const month = dayjs(order.orderDate).format('T-M');
      const monthNum = dayjs(order.orderDate).month() + 1;
      const agencyId = order.agencyId;
      const agency = agencies.find(a => a.id === agencyId);
      
      if (!agency) return;

      const key = `${agencyId}-${monthNum}`;
      
      if (!monthlyData[key]) {
        monthlyData[key] = {
          agency_id: agencyId,
          agency_name: agency.agencyName || 'N/A',
          month: `T${monthNum}`,
          monthNum,
          sales: 0,
          revenue: 0,
          target: Math.ceil((agency.salesTarget || 60) / 12) // Monthly target
        };
      }

      // Count completed orders as sales
      if (order.status?.toLowerCase() === 'completed' || order.status?.toLowerCase() === 'delivered') {
        monthlyData[key].sales += 1;
      }
      monthlyData[key].revenue += (order.totalAmount || 0);
    });

    return Object.values(monthlyData).sort((a, b) => a.monthNum - b.monthNum);
  }, [selectedAgency, agencies, orders]);

  // Column chart config
  const columnConfig = {
    data: chartData,
    xField: 'month',
    yField: 'sales',
    seriesField: 'agency_name',
    isGroup: true,
    columnStyle: {
      radius: [8, 8, 0, 0]
    },
    legend: { position: 'top' },
    label: {
      position: 'top'
    },
    color: ['#1890ff', '#52c41a', '#faad14']
  };

  // Line chart config - Achievement vs Target
  const lineData = chartData.map(item => [
    { month: item.month, type: 'Doanh số', value: item.sales, agency: item.agency_name },
    { month: item.month, type: 'Chỉ tiêu', value: item.target, agency: item.agency_name }
  ]).flat();

  const lineConfig = {
    data: lineData,
    xField: 'month',
    yField: 'value',
    seriesField: 'type',
    smooth: true,
    animation: {
      appear: {
        animation: 'path-in',
        duration: 1000
      }
    }
  };

  const columns = [
    {
      title: 'Xếp hạng',
      key: 'rank',
      width: 80,
      align: 'center',
      render: (_, __, index) => {
        const colors = ['#faad14', '#d9d9d9', '#cd7f32'];
        return index < 3 ? (
          <Avatar
            size={32}
            style={{ backgroundColor: colors[index], fontWeight: 'bold' }}
          >
            {index + 1}
          </Avatar>
        ) : (
          <Text strong>{index + 1}</Text>
        );
      }
    },
    {
      title: 'Đại lý',
      key: 'agency',
      width: 220,
      render: (_, record) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Avatar size={40} icon={<ShopOutlined />} />
          <div>
            <Text strong>{record.agency_name}</Text>
            <br />
            <Text type="secondary" style={{ fontSize: '12px' }}>
              <EnvironmentOutlined /> {record.location}
            </Text>
          </div>
        </div>
      )
    },
    {
      title: 'Doanh số',
      dataIndex: 'sales',
      key: 'sales',
      width: 120,
      render: (value) => (
        <Text strong style={{ color: '#1890ff' }}>{value} xe</Text>
      ),
      sorter: (a, b) => a.sales - b.sales
    },
    {
      title: 'Chỉ tiêu',
      dataIndex: 'target',
      key: 'target',
      width: 120,
      render: (value) => (
        <Text type="secondary">{value} xe</Text>
      )
    },
    {
      title: 'Hoàn thành',
      key: 'achievement',
      width: 200,
      render: (_, record) => (
        <div>
          <Progress
            percent={record.achievementRate}
            size="small"
            status={record.achievementRate >= 100 ? 'success' : record.achievementRate >= 80 ? 'active' : 'exception'}
          />
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {record.achievementRate}%
          </Text>
        </div>
      )
    },
    {
      title: 'Doanh thu',
      dataIndex: 'revenue',
      key: 'revenue',
      width: 180,
      render: (value) => (
        <Text strong style={{ color: '#52c41a' }}>
          {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value)}
        </Text>
      ),
      sorter: (a, b) => a.revenue - b.revenue
    },
    {
      title: 'TB/tháng',
      dataIndex: 'avgSalesPerMonth',
      key: 'avgSalesPerMonth',
      width: 100,
      render: (value) => <Text>{value} xe</Text>
    },
    {
      title: 'Đánh giá',
      key: 'performance',
      width: 120,
      render: (_, record) => {
        if (record.achievementRate >= 100) {
          return <Tag color="success" icon={<TrophyOutlined />}>Xuất sắc</Tag>;
        } else if (record.achievementRate >= 80) {
          return <Tag color="processing" icon={<RiseOutlined />}>Tốt</Tag>;
        } else {
          return <Tag color="warning">Cần cải thiện</Tag>;
        }
      }
    }
  ];

  return (
    <Spin spinning={loading}>
      <div className="sales-agency-report-page">
        <div className="page-header" style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <Title level={2}>
              <ShopOutlined /> Báo cáo doanh số theo đại lý
            </Title>
            <Text type="secondary">Phân tích hiệu suất và xếp hạng các đại lý</Text>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <Select
              value={selectedAgency}
              onChange={setSelectedAgency}
              style={{ width: 200 }}
              options={[
                { value: 'all', label: 'Tất cả đại lý' },
                ...agencies.map(agency => ({
                  value: agency.id.toString(),
                  label: agency.agencyName
                }))
              ]}
            />
            <Select
              value={selectedPeriod}
              onChange={setSelectedPeriod}
              style={{ width: 150 }}
              options={[
                { value: 'month', label: 'Theo tháng' },
                { value: 'quarter', label: 'Theo quý' },
                { value: 'year', label: 'Theo năm' }
              ]}
            />
          </div>
        </div>

      <Row gutter={16} style={{ marginBottom: '24px' }}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Tổng doanh số"
              value={statistics.totalSales}
              suffix="xe"
              prefix={<CarOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Tổng doanh thu"
              value={statistics.totalRevenue}
              prefix={<DollarOutlined />}
              valueStyle={{ color: '#52c41a' }}
              formatter={(value) => new Intl.NumberFormat('vi-VN').format(value) + ' ₫'}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Chỉ tiêu tổng"
              value={statistics.totalTarget}
              suffix="xe"
              prefix={<TrophyOutlined />}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Tỷ lệ hoàn thành"
              value={statistics.overallAchievementRate}
              suffix="%"
              prefix={<RiseOutlined />}
              valueStyle={{ color: statistics.overallAchievementRate >= 100 ? '#52c41a' : '#fa8c16' }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={16} style={{ marginBottom: '24px' }}>
        <Col xs={24} lg={12}>
          <Card title="Doanh số theo tháng" bordered>
            <Column {...columnConfig} />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="So sánh doanh số & chỉ tiêu" bordered>
            <Line {...lineConfig} />
          </Card>
        </Col>
      </Row>

        <Card title="Bảng xếp hạng đại lý">
          <Table
            columns={columns}
            dataSource={statistics.agencyStats}
            rowKey="agency_id"
            pagination={false}
          />
        </Card>
      </div>
    </Spin>
  );
};

export default SalesAgencyReportPage;
