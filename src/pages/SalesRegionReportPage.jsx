import React, { useMemo, useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Typography,
  Select,
  Statistic,
  Table,
  Progress,
  Spin,
  message
} from 'antd';
import {
  BarChartOutlined,
  RiseOutlined,
  FallOutlined,
  EnvironmentOutlined,
  DollarOutlined,
  CarOutlined
} from '@ant-design/icons';
import { Column, Pie } from '@ant-design/plots';
import dayjs from 'dayjs';
import axios from 'axios';
import { orderAPI } from '../services/quotationService';

const { Title, Text } = Typography;

const AGENCY_API_URL = 'https://agency.agencymanagement.online/api';

const SalesRegionReportPage = () => {
  const [selectedPeriod, setSelectedPeriod] = useState('year');
  const [selectedRegion, setSelectedRegion] = useState('all');
  const [loading, setLoading] = useState(false);
  const [agencies, setAgencies] = useState([]);
  const [orders, setOrders] = useState([]);
  const [regions, setRegions] = useState([]);

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

        const agenciesData = agenciesResponse.data || [];
        setAgencies(agenciesData);
        setOrders(ordersData || []);

        // Extract unique regions from agency addresses
        const uniqueRegions = [...new Set(agenciesData.map(a => {
          // Extract city/province from address
          const address = a.address || '';
          // Common patterns: "Hà Nội", "TP.HCM", "Đà Nẵng", etc.
          if (address.includes('Hà Nội')) return 'Hà Nội';
          if (address.includes('TP.HCM') || address.includes('Hồ Chí Minh')) return 'TP.HCM';
          if (address.includes('Đà Nẵng')) return 'Đà Nẵng';
          if (address.includes('Cần Thơ')) return 'Cần Thơ';
          if (address.includes('Hải Phòng')) return 'Hải Phòng';
          // Try to extract last part of address as region
          const parts = address.split(',').map(p => p.trim());
          return parts[parts.length - 1] || 'Khác';
        }))].filter(Boolean);

        setRegions(uniqueRegions);
      } catch (error) {
        console.error('Error fetching data:', error);
        message.error('Không thể tải dữ liệu báo cáo');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Helper function to extract region from agency address
  const getRegionFromAddress = (address) => {
    if (!address) return 'Khác';
    if (address.includes('Hà Nội')) return 'Hà Nội';
    if (address.includes('TP.HCM') || address.includes('Hồ Chí Minh')) return 'TP.HCM';
    if (address.includes('Đà Nẵng')) return 'Đà Nẵng';
    if (address.includes('Cần Thơ')) return 'Cần Thơ';
    if (address.includes('Hải Phòng')) return 'Hải Phòng';
    const parts = address.split(',').map(p => p.trim());
    return parts[parts.length - 1] || 'Khác';
  };

  // Calculate statistics from real data
  const statistics = useMemo(() => {
    if (!agencies.length || !orders.length) {
      return {
        totalSales: 0,
        totalRevenue: 0,
        avgSalesPerMonth: 0,
        regionStats: []
      };
    }

    // Create agency-region mapping
    const agencyRegionMap = {};
    agencies.forEach(agency => {
      agencyRegionMap[agency.id] = getRegionFromAddress(agency.address);
    });

    // Filter orders
    const filteredOrders = orders.filter(order => 
      order.status?.toLowerCase() === 'completed' || 
      order.status?.toLowerCase() === 'delivered'
    );

    // Group by region
    const byRegion = {};
    
    filteredOrders.forEach(order => {
      const region = agencyRegionMap[order.agencyId] || 'Khác';
      
      // Skip if filtering by specific region
      if (selectedRegion !== 'all' && region !== selectedRegion) {
        return;
      }

      if (!byRegion[region]) {
        byRegion[region] = { sales: 0, revenue: 0 };
      }
      
      byRegion[region].sales += 1;
      byRegion[region].revenue += (order.totalAmount || 0);
    });

    const totalSales = Object.values(byRegion).reduce((sum, r) => sum + r.sales, 0);
    const totalRevenue = Object.values(byRegion).reduce((sum, r) => sum + r.revenue, 0);

    const regionStats = Object.entries(byRegion).map(([region, data]) => ({
      region,
      sales: data.sales,
      revenue: data.revenue,
      percentage: totalSales > 0 ? ((data.sales / totalSales) * 100).toFixed(1) : 0
    })).sort((a, b) => b.sales - a.sales);

    return {
      totalSales,
      totalRevenue,
      avgSalesPerMonth: Math.round(totalSales / 12),
      regionStats
    };
  }, [selectedRegion, agencies, orders]);

  // Data for charts - Group by month and region
  const chartData = useMemo(() => {
    if (!agencies.length || !orders.length) {
      return [];
    }

    const agencyRegionMap = {};
    agencies.forEach(agency => {
      agencyRegionMap[agency.id] = getRegionFromAddress(agency.address);
    });

    const filteredOrders = orders.filter(order => 
      order.status?.toLowerCase() === 'completed' || 
      order.status?.toLowerCase() === 'delivered'
    );

    // Group by region and month
    const monthlyData = {};

    filteredOrders.forEach(order => {
      if (!order.orderDate) return;

      const region = agencyRegionMap[order.agencyId] || 'Khác';
      
      if (selectedRegion !== 'all' && region !== selectedRegion) {
        return;
      }

      const monthNum = dayjs(order.orderDate).month() + 1;
      const key = `${region}-${monthNum}`;

      if (!monthlyData[key]) {
        monthlyData[key] = {
          region,
          month: `T${monthNum}`,
          monthNum,
          sales: 0,
          revenue: 0
        };
      }

      monthlyData[key].sales += 1;
      monthlyData[key].revenue += (order.totalAmount || 0);
    });

    return Object.values(monthlyData).sort((a, b) => a.monthNum - b.monthNum);
  }, [selectedRegion, agencies, orders]);

  const pieData = useMemo(() => {
    return statistics.regionStats.map(item => ({
      type: item.region,
      value: item.sales
    }));
  }, [statistics]);

  // Column chart config
  const columnConfig = {
    data: chartData,
    xField: 'month',
    yField: 'sales',
    seriesField: 'region',
    legend: { position: 'top' },
    columnStyle: {
      radius: [8, 8, 0, 0]
    },
    label: {
      position: 'top',
      style: {
        fill: '#000',
        opacity: 0.6
      }
    },
    xAxis: {
      label: {
        autoRotate: false
      }
    },
    yAxis: {
      title: {
        text: 'Số lượng xe bán'
      }
    },
    color: ['#1890ff', '#52c41a', '#faad14']
  };

  // Pie chart config
  const pieConfig = {
    data: pieData,
    angleField: 'value',
    colorField: 'type',
    radius: 0.8,
    innerRadius: 0.6,
    label: {
      type: 'outer',
      content: '{name} {percentage}'
    },
    legend: {
      position: 'bottom'
    },
    statistic: {
      title: {
        content: 'Tổng'
      },
      content: {
        content: statistics.totalSales.toString()
      }
    },
    color: ['#1890ff', '#52c41a', '#faad14']
  };

  const columns = [
    {
      title: 'Khu vực',
      dataIndex: 'region',
      key: 'region',
      width: 150,
      render: (text) => (
        <div>
          <EnvironmentOutlined style={{ marginRight: '8px', color: '#1890ff' }} />
          <Text strong>{text}</Text>
        </div>
      )
    },
    {
      title: 'Số xe bán',
      dataIndex: 'sales',
      key: 'sales',
      width: 120,
      render: (value) => (
        <Text strong style={{ color: '#1890ff' }}>{value} xe</Text>
      ),
      sorter: (a, b) => a.sales - b.sales
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
      title: 'Tỷ lệ',
      dataIndex: 'percentage',
      key: 'percentage',
      width: 180,
      render: (value) => (
        <div>
          <Progress 
            percent={parseFloat(value)} 
            size="small" 
            status="active"
          />
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {value}% tổng doanh số
          </Text>
        </div>
      )
    },
    {
      title: 'Xu hướng',
      key: 'trend',
      width: 100,
      render: (_, record) => {
        const trend = record.sales > statistics.avgSalesPerMonth ? 'up' : 'down';
        return trend === 'up' ? (
          <Text type="success">
            <RiseOutlined /> Tăng
          </Text>
        ) : (
          <Text type="danger">
            <FallOutlined /> Giảm
          </Text>
        );
      }
    }
  ];

  return (
    <Spin spinning={loading}>
      <div className="sales-region-report-page">
        <div className="page-header" style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <Title level={2}>
              <BarChartOutlined /> Báo cáo doanh số theo khu vực
            </Title>
            <Text type="secondary">Phân tích doanh số bán hàng theo khu vực địa lý</Text>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <Select
              value={selectedRegion}
              onChange={setSelectedRegion}
              style={{ width: 180 }}
              options={[
                { value: 'all', label: 'Tất cả khu vực' },
                ...regions.map(region => ({
                  value: region,
                  label: region
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
              title="TB xe/tháng"
              value={statistics.avgSalesPerMonth}
              suffix="xe"
              prefix={<BarChartOutlined />}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Số khu vực"
              value={statistics.regionStats.length}
              prefix={<EnvironmentOutlined />}
              valueStyle={{ color: '#fa8c16' }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={16} style={{ marginBottom: '24px' }}>
        <Col xs={24} lg={16}>
          <Card title="Biểu đồ doanh số theo tháng" bordered>
            <Column {...columnConfig} />
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card title="Tỷ lệ doanh số theo khu vực" bordered>
            <Pie {...pieConfig} />
          </Card>
        </Col>
      </Row>

        <Card title="Chi tiết doanh số theo khu vực">
          <Table
            columns={columns}
            dataSource={statistics.regionStats}
            rowKey="region"
            pagination={false}
          />
        </Card>
      </div>
    </Spin>
  );
};

export default SalesRegionReportPage;
