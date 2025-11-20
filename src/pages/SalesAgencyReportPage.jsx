import React, { useMemo, useState } from 'react';
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
  Avatar
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
import { agencies } from '../data/mockData';

const { Title, Text } = Typography;

// Mock sales data by agency
const mockAgencySales = [
  // VinFast Hà Nội
  { agency_id: 1, month: 'T1', sales: 45, revenue: 51300000000, target: 50 },
  { agency_id: 1, month: 'T2', sales: 52, revenue: 59280000000, target: 50 },
  { agency_id: 1, month: 'T3', sales: 48, revenue: 54720000000, target: 50 },
  { agency_id: 1, month: 'T4', sales: 55, revenue: 62700000000, target: 55 },
  { agency_id: 1, month: 'T5', sales: 60, revenue: 68400000000, target: 55 },
  { agency_id: 1, month: 'T6', sales: 58, revenue: 66120000000, target: 55 },
  { agency_id: 1, month: 'T7', sales: 62, revenue: 70680000000, target: 60 },
  { agency_id: 1, month: 'T8', sales: 65, revenue: 74100000000, target: 60 },
  { agency_id: 1, month: 'T9', sales: 70, revenue: 79800000000, target: 65 },
  { agency_id: 1, month: 'T10', sales: 68, revenue: 77520000000, target: 65 },

  // VinFast TP.HCM
  { agency_id: 2, month: 'T1', sales: 52, revenue: 59280000000, target: 55 },
  { agency_id: 2, month: 'T2', sales: 58, revenue: 66120000000, target: 55 },
  { agency_id: 2, month: 'T3', sales: 55, revenue: 62700000000, target: 55 },
  { agency_id: 2, month: 'T4', sales: 60, revenue: 68400000000, target: 60 },
  { agency_id: 2, month: 'T5', sales: 65, revenue: 74100000000, target: 60 },
  { agency_id: 2, month: 'T6', sales: 63, revenue: 71820000000, target: 60 },
  { agency_id: 2, month: 'T7', sales: 68, revenue: 77520000000, target: 65 },
  { agency_id: 2, month: 'T8', sales: 72, revenue: 82080000000, target: 65 },
  { agency_id: 2, month: 'T9', sales: 75, revenue: 85500000000, target: 70 },
  { agency_id: 2, month: 'T10', sales: 78, revenue: 88920000000, target: 70 },

  // VinFast Đà Nẵng
  { agency_id: 3, month: 'T1', sales: 25, revenue: 28500000000, target: 30 },
  { agency_id: 3, month: 'T2', sales: 28, revenue: 31920000000, target: 30 },
  { agency_id: 3, month: 'T3', sales: 30, revenue: 34200000000, target: 30 },
  { agency_id: 3, month: 'T4', sales: 32, revenue: 36480000000, target: 35 },
  { agency_id: 3, month: 'T5', sales: 35, revenue: 39900000000, target: 35 },
  { agency_id: 3, month: 'T6', sales: 33, revenue: 37620000000, target: 35 },
  { agency_id: 3, month: 'T7', sales: 38, revenue: 43320000000, target: 40 },
  { agency_id: 3, month: 'T8', sales: 40, revenue: 45600000000, target: 40 },
  { agency_id: 3, month: 'T9', sales: 42, revenue: 47880000000, target: 45 },
  { agency_id: 3, month: 'T10', sales: 45, revenue: 51300000000, target: 45 }
];

const SalesAgencyReportPage = () => {
  const [selectedAgency, setSelectedAgency] = useState('all');
  const [selectedPeriod, setSelectedPeriod] = useState('year');

  // Calculate statistics
  const statistics = useMemo(() => {
    const filteredData = selectedAgency === 'all'
      ? mockAgencySales
      : mockAgencySales.filter(item => item.agency_id === parseInt(selectedAgency));

    // Group by agency
    const byAgency = mockAgencySales.reduce((acc, item) => {
      const agency = agencies.find(a => a.id === item.agency_id);
      const key = agency?.agency_name || 'Unknown';
      
      if (!acc[key]) {
        acc[key] = {
          agency_id: item.agency_id,
          agency_name: key,
          location: agency?.location || '',
          sales: 0,
          revenue: 0,
          target: 0
        };
      }
      acc[key].sales += item.sales;
      acc[key].revenue += item.revenue;
      acc[key].target += item.target;
      return acc;
    }, {});

    const agencyStats = Object.values(byAgency).map(item => ({
      ...item,
      achievementRate: Math.round((item.sales / item.target) * 100),
      avgSalesPerMonth: Math.round(item.sales / 10)
    })).sort((a, b) => b.sales - a.sales);

    const totalSales = agencyStats.reduce((sum, item) => sum + item.sales, 0);
    const totalRevenue = agencyStats.reduce((sum, item) => sum + item.revenue, 0);
    const totalTarget = agencyStats.reduce((sum, item) => sum + item.target, 0);

    return {
      totalSales,
      totalRevenue,
      totalTarget,
      overallAchievementRate: Math.round((totalSales / totalTarget) * 100),
      agencyStats
    };
  }, [selectedAgency]);

  // Data for charts
  const chartData = useMemo(() => {
    const data = selectedAgency === 'all'
      ? mockAgencySales
      : mockAgencySales.filter(item => item.agency_id === parseInt(selectedAgency));

    return data.map(item => {
      const agency = agencies.find(a => a.id === item.agency_id);
      return {
        ...item,
        agency_name: agency?.agency_name || 'Unknown'
      };
    });
  }, [selectedAgency]);

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
                label: agency.agency_name
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
  );
};

export default SalesAgencyReportPage;
