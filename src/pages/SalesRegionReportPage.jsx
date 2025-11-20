import React, { useMemo, useState } from 'react';
import {
  Card,
  Row,
  Col,
  Typography,
  Select,
  Statistic,
  Table,
  Progress
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
import { agencies, vehicles } from '../data/mockData';

const { Title, Text } = Typography;

// Mock sales data by region
const mockSalesData = [
  // Hà Nội
  { region: 'Hà Nội', month: 'T1', sales: 45, revenue: 51300000000 },
  { region: 'Hà Nội', month: 'T2', sales: 52, revenue: 59280000000 },
  { region: 'Hà Nội', month: 'T3', sales: 48, revenue: 54720000000 },
  { region: 'Hà Nội', month: 'T4', sales: 55, revenue: 62700000000 },
  { region: 'Hà Nội', month: 'T5', sales: 60, revenue: 68400000000 },
  { region: 'Hà Nội', month: 'T6', sales: 58, revenue: 66120000000 },
  { region: 'Hà Nội', month: 'T7', sales: 62, revenue: 70680000000 },
  { region: 'Hà Nội', month: 'T8', sales: 65, revenue: 74100000000 },
  { region: 'Hà Nội', month: 'T9', sales: 70, revenue: 79800000000 },
  { region: 'Hà Nội', month: 'T10', sales: 68, revenue: 77520000000 },
  
  // TP.HCM
  { region: 'TP.HCM', month: 'T1', sales: 52, revenue: 59280000000 },
  { region: 'TP.HCM', month: 'T2', sales: 58, revenue: 66120000000 },
  { region: 'TP.HCM', month: 'T3', sales: 55, revenue: 62700000000 },
  { region: 'TP.HCM', month: 'T4', sales: 60, revenue: 68400000000 },
  { region: 'TP.HCM', month: 'T5', sales: 65, revenue: 74100000000 },
  { region: 'TP.HCM', month: 'T6', sales: 63, revenue: 71820000000 },
  { region: 'TP.HCM', month: 'T7', sales: 68, revenue: 77520000000 },
  { region: 'TP.HCM', month: 'T8', sales: 72, revenue: 82080000000 },
  { region: 'TP.HCM', month: 'T9', sales: 75, revenue: 85500000000 },
  { region: 'TP.HCM', month: 'T10', sales: 78, revenue: 88920000000 },
  
  // Đà Nẵng
  { region: 'Đà Nẵng', month: 'T1', sales: 25, revenue: 28500000000 },
  { region: 'Đà Nẵng', month: 'T2', sales: 28, revenue: 31920000000 },
  { region: 'Đà Nẵng', month: 'T3', sales: 30, revenue: 34200000000 },
  { region: 'Đà Nẵng', month: 'T4', sales: 32, revenue: 36480000000 },
  { region: 'Đà Nẵng', month: 'T5', sales: 35, revenue: 39900000000 },
  { region: 'Đà Nẵng', month: 'T6', sales: 33, revenue: 37620000000 },
  { region: 'Đà Nẵng', month: 'T7', sales: 38, revenue: 43320000000 },
  { region: 'Đà Nẵng', month: 'T8', sales: 40, revenue: 45600000000 },
  { region: 'Đà Nẵng', month: 'T9', sales: 42, revenue: 47880000000 },
  { region: 'Đà Nẵng', month: 'T10', sales: 45, revenue: 51300000000 }
];

const SalesRegionReportPage = () => {
  const [selectedPeriod, setSelectedPeriod] = useState('year');
  const [selectedRegion, setSelectedRegion] = useState('all');

  // Calculate statistics
  const statistics = useMemo(() => {
    const filteredData = selectedRegion === 'all' 
      ? mockSalesData 
      : mockSalesData.filter(item => item.region === selectedRegion);

    const totalSales = filteredData.reduce((sum, item) => sum + item.sales, 0);
    const totalRevenue = filteredData.reduce((sum, item) => sum + item.revenue, 0);

    // Group by region for comparison
    const byRegion = mockSalesData.reduce((acc, item) => {
      if (!acc[item.region]) {
        acc[item.region] = { sales: 0, revenue: 0 };
      }
      acc[item.region].sales += item.sales;
      acc[item.region].revenue += item.revenue;
      return acc;
    }, {});

    const regionStats = Object.entries(byRegion).map(([region, data]) => ({
      region,
      sales: data.sales,
      revenue: data.revenue,
      percentage: ((data.sales / totalSales) * 100).toFixed(1)
    })).sort((a, b) => b.sales - a.sales);

    return {
      totalSales,
      totalRevenue,
      avgSalesPerMonth: Math.round(totalSales / 10),
      regionStats
    };
  }, [selectedRegion]);

  // Data for charts
  const chartData = useMemo(() => {
    return selectedRegion === 'all'
      ? mockSalesData
      : mockSalesData.filter(item => item.region === selectedRegion);
  }, [selectedRegion]);

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
              { value: 'Hà Nội', label: 'Hà Nội' },
              { value: 'TP.HCM', label: 'TP.HCM' },
              { value: 'Đà Nẵng', label: 'Đà Nẵng' }
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
  );
};

export default SalesRegionReportPage;
