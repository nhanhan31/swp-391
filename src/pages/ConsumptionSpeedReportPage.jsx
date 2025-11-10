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
  Space,
  Tooltip
} from 'antd';
import {
  DashboardOutlined,
  CarOutlined,
  ThunderboltOutlined,
  RiseOutlined,
  FallOutlined,
  LineChartOutlined,
  TrophyOutlined,
  AlertOutlined
} from '@ant-design/icons';
import { Column, Line, Area } from '@ant-design/plots';
import dayjs from 'dayjs';
import { vehicles } from '../data/mockData';

const { Title, Text } = Typography;

// Mock consumption speed data
const mockConsumptionData = [
  // VF e34
  { vehicle_id: 1, month: 'T1', sales: 70, inventory_start: 220, inventory_end: 220, avg_days_to_sell: 35 },
  { vehicle_id: 1, month: 'T2', sales: 78, inventory_start: 220, inventory_end: 220, avg_days_to_sell: 32 },
  { vehicle_id: 1, month: 'T3', sales: 73, inventory_start: 220, inventory_end: 220, avg_days_to_sell: 33 },
  { vehicle_id: 1, month: 'T4', sales: 87, inventory_start: 220, inventory_end: 220, avg_days_to_sell: 28 },
  { vehicle_id: 1, month: 'T5', sales: 95, inventory_start: 220, inventory_end: 220, avg_days_to_sell: 25 },
  { vehicle_id: 1, month: 'T6', sales: 88, inventory_start: 220, inventory_end: 220, avg_days_to_sell: 27 },
  { vehicle_id: 1, month: 'T7', sales: 100, inventory_start: 220, inventory_end: 220, avg_days_to_sell: 23 },
  { vehicle_id: 1, month: 'T8', sales: 105, inventory_start: 220, inventory_end: 220, avg_days_to_sell: 22 },
  { vehicle_id: 1, month: 'T9', sales: 112, inventory_start: 220, inventory_end: 220, avg_days_to_sell: 20 },
  { vehicle_id: 1, month: 'T10', sales: 108, inventory_start: 220, inventory_end: 220, avg_days_to_sell: 21 },

  // VF 8
  { vehicle_id: 2, month: 'T1', sales: 57, inventory_start: 177, inventory_end: 177, avg_days_to_sell: 38 },
  { vehicle_id: 2, month: 'T2', sales: 63, inventory_start: 177, inventory_end: 177, avg_days_to_sell: 35 },
  { vehicle_id: 2, month: 'T3', sales: 60, inventory_start: 177, inventory_end: 177, avg_days_to_sell: 36 },
  { vehicle_id: 2, month: 'T4', sales: 68, inventory_start: 177, inventory_end: 177, avg_days_to_sell: 32 },
  { vehicle_id: 2, month: 'T5', sales: 75, inventory_start: 177, inventory_end: 177, avg_days_to_sell: 29 },
  { vehicle_id: 2, month: 'T6', sales: 70, inventory_start: 177, inventory_end: 177, avg_days_to_sell: 31 },
  { vehicle_id: 2, month: 'T7', sales: 78, inventory_start: 177, inventory_end: 177, avg_days_to_sell: 28 },
  { vehicle_id: 2, month: 'T8', sales: 82, inventory_start: 177, inventory_end: 177, avg_days_to_sell: 26 },
  { vehicle_id: 2, month: 'T9', sales: 87, inventory_start: 177, inventory_end: 177, avg_days_to_sell: 25 },
  { vehicle_id: 2, month: 'T10', sales: 85, inventory_start: 177, inventory_end: 177, avg_days_to_sell: 26 },

  // VF 9
  { vehicle_id: 3, month: 'T1', sales: 41, inventory_start: 121, inventory_end: 121, avg_days_to_sell: 42 },
  { vehicle_id: 3, month: 'T2', sales: 45, inventory_start: 121, inventory_end: 121, avg_days_to_sell: 40 },
  { vehicle_id: 3, month: 'T3', sales: 43, inventory_start: 121, inventory_end: 121, avg_days_to_sell: 41 },
  { vehicle_id: 3, month: 'T4', sales: 50, inventory_start: 121, inventory_end: 121, avg_days_to_sell: 37 },
  { vehicle_id: 3, month: 'T5', sales: 55, inventory_start: 121, inventory_end: 121, avg_days_to_sell: 34 },
  { vehicle_id: 3, month: 'T6', sales: 52, inventory_start: 121, inventory_end: 121, avg_days_to_sell: 35 },
  { vehicle_id: 3, month: 'T7', sales: 58, inventory_start: 121, inventory_end: 121, avg_days_to_sell: 32 },
  { vehicle_id: 3, month: 'T8', sales: 60, inventory_start: 121, inventory_end: 121, avg_days_to_sell: 31 },
  { vehicle_id: 3, month: 'T9', sales: 63, inventory_start: 121, inventory_end: 121, avg_days_to_sell: 30 },
  { vehicle_id: 3, month: 'T10', sales: 62, inventory_start: 121, inventory_end: 121, avg_days_to_sell: 30 },

  // VF 5 Plus
  { vehicle_id: 4, month: 'T1', sales: 95, inventory_start: 295, inventory_end: 295, avg_days_to_sell: 30 },
  { vehicle_id: 4, month: 'T2', sales: 105, inventory_start: 295, inventory_end: 295, avg_days_to_sell: 28 },
  { vehicle_id: 4, month: 'T3', sales: 100, inventory_start: 295, inventory_end: 295, avg_days_to_sell: 29 },
  { vehicle_id: 4, month: 'T4', sales: 112, inventory_start: 295, inventory_end: 295, avg_days_to_sell: 26 },
  { vehicle_id: 4, month: 'T5', sales: 120, inventory_start: 295, inventory_end: 295, avg_days_to_sell: 24 },
  { vehicle_id: 4, month: 'T6', sales: 115, inventory_start: 295, inventory_end: 295, avg_days_to_sell: 25 },
  { vehicle_id: 4, month: 'T7', sales: 125, inventory_start: 295, inventory_end: 295, avg_days_to_sell: 23 },
  { vehicle_id: 4, month: 'T8', sales: 130, inventory_start: 295, inventory_end: 295, avg_days_to_sell: 22 },
  { vehicle_id: 4, month: 'T9', sales: 135, inventory_start: 295, inventory_end: 295, avg_days_to_sell: 21 },
  { vehicle_id: 4, month: 'T10', sales: 133, inventory_start: 295, inventory_end: 295, avg_days_to_sell: 22 },

  // VF 6
  { vehicle_id: 5, month: 'T1', sales: 50, inventory_start: 150, inventory_end: 150, avg_days_to_sell: 36 },
  { vehicle_id: 5, month: 'T2', sales: 55, inventory_start: 150, inventory_end: 150, avg_days_to_sell: 34 },
  { vehicle_id: 5, month: 'T3', sales: 53, inventory_start: 150, inventory_end: 150, avg_days_to_sell: 35 },
  { vehicle_id: 5, month: 'T4', sales: 60, inventory_start: 150, inventory_end: 150, avg_days_to_sell: 31 },
  { vehicle_id: 5, month: 'T5', sales: 65, inventory_start: 150, inventory_end: 150, avg_days_to_sell: 29 },
  { vehicle_id: 5, month: 'T6', sales: 62, inventory_start: 150, inventory_end: 150, avg_days_to_sell: 30 },
  { vehicle_id: 5, month: 'T7', sales: 68, inventory_start: 150, inventory_end: 150, avg_days_to_sell: 27 },
  { vehicle_id: 5, month: 'T8', sales: 72, inventory_start: 150, inventory_end: 150, avg_days_to_sell: 26 },
  { vehicle_id: 5, month: 'T9', sales: 75, inventory_start: 150, inventory_end: 150, avg_days_to_sell: 25 },
  { vehicle_id: 5, month: 'T10', sales: 73, inventory_start: 150, inventory_end: 150, avg_days_to_sell: 25 }
];

const ConsumptionSpeedReportPage = () => {
  const [selectedVehicle, setSelectedVehicle] = useState('all');
  const [selectedPeriod, setSelectedPeriod] = useState('10months');

  // Calculate statistics
  const statistics = useMemo(() => {
    const filteredData = selectedVehicle === 'all'
      ? mockConsumptionData
      : mockConsumptionData.filter(item => item.vehicle_id === parseInt(selectedVehicle));

    // Group by vehicle
    const byVehicle = filteredData.reduce((acc, item) => {
      const vehicle = vehicles.find(v => v.id === item.vehicle_id);
      const key = vehicle?.model || 'Unknown';
      
      if (!acc[key]) {
        acc[key] = {
          vehicle_id: item.vehicle_id,
          model: key,
          totalSales: 0,
          avgDaysToSell: 0,
          count: 0,
          monthlyData: []
        };
      }
      acc[key].totalSales += item.sales;
      acc[key].avgDaysToSell += item.avg_days_to_sell;
      acc[key].count += 1;
      acc[key].monthlyData.push(item);
      return acc;
    }, {});

    const vehicleStats = Object.values(byVehicle).map(item => {
      const avgDays = Math.round(item.avgDaysToSell / item.count);
      const avgMonthlySales = Math.round(item.totalSales / item.count);
      
      // Calculate turnover rate (times per year)
      const turnoverRate = Math.round((365 / avgDays) * 10) / 10;
      
      // Calculate trend (last 3 months vs previous 3 months)
      const recentMonths = item.monthlyData.slice(-3);
      const previousMonths = item.monthlyData.slice(-6, -3);
      const recentAvg = recentMonths.reduce((sum, m) => sum + m.sales, 0) / 3;
      const previousAvg = previousMonths.reduce((sum, m) => sum + m.sales, 0) / 3;
      const trend = recentAvg > previousAvg ? 'up' : recentAvg < previousAvg ? 'down' : 'stable';
      const trendPercent = Math.round(((recentAvg - previousAvg) / previousAvg) * 100);

      return {
        ...item,
        avgDaysToSell: avgDays,
        avgMonthlySales,
        turnoverRate,
        trend,
        trendPercent
      };
    }).sort((a, b) => a.avgDaysToSell - b.avgDaysToSell);

    const totalSales = vehicleStats.reduce((sum, item) => sum + item.totalSales, 0);
    const avgTurnoverRate = Math.round((vehicleStats.reduce((sum, item) => sum + item.turnoverRate, 0) / vehicleStats.length) * 10) / 10;
    const fastestMoving = vehicleStats[0];
    const slowestMoving = vehicleStats[vehicleStats.length - 1];

    return {
      totalSales,
      avgTurnoverRate,
      fastestMoving,
      slowestMoving,
      vehicleStats
    };
  }, [selectedVehicle]);

  // Data for charts
  const chartData = useMemo(() => {
    const data = selectedVehicle === 'all'
      ? mockConsumptionData
      : mockConsumptionData.filter(item => item.vehicle_id === parseInt(selectedVehicle));

    return data.map(item => {
      const vehicle = vehicles.find(v => v.id === item.vehicle_id);
      const turnoverRate = Math.round((30 / item.avg_days_to_sell) * 10) / 10;
      return {
        ...item,
        model: vehicle?.model || 'Unknown',
        turnoverRate
      };
    });
  }, [selectedVehicle]);

  // Line chart - Sales trend
  const lineConfig = {
    data: chartData,
    xField: 'month',
    yField: 'sales',
    seriesField: 'model',
    smooth: true,
    animation: {
      appear: {
        animation: 'path-in',
        duration: 1000
      }
    },
    point: {
      size: 4,
      shape: 'circle'
    }
  };

  // Area chart - Days to sell
  const areaConfig = {
    data: chartData,
    xField: 'month',
    yField: 'avg_days_to_sell',
    seriesField: 'model',
    smooth: true,
    areaStyle: {
      fillOpacity: 0.3
    },
    legend: {
      position: 'top'
    }
  };

  // Column chart - Turnover rate
  const columnConfig = {
    data: chartData,
    xField: 'month',
    yField: 'turnoverRate',
    seriesField: 'model',
    isGroup: true,
    columnStyle: {
      radius: [8, 8, 0, 0]
    },
    legend: { position: 'top' },
    label: {
      position: 'top'
    }
  };

  const columns = [
    {
      title: 'Xếp hạng',
      key: 'rank',
      width: 80,
      align: 'center',
      render: (_, __, index) => (
        index === 0 ? (
          <Tag color="gold" icon={<TrophyOutlined />}>#{index + 1}</Tag>
        ) : (
          <Text strong>#{index + 1}</Text>
        )
      )
    },
    {
      title: 'Mẫu xe',
      dataIndex: 'model',
      key: 'model',
      width: 150,
      render: (text) => (
        <Space>
          <CarOutlined style={{ color: '#1890ff' }} />
          <Text strong>{text}</Text>
        </Space>
      )
    },
    {
      title: 'Tổng doanh số',
      dataIndex: 'totalSales',
      key: 'totalSales',
      width: 120,
      render: (value) => <Text strong style={{ color: '#1890ff' }}>{value} xe</Text>,
      sorter: (a, b) => a.totalSales - b.totalSales
    },
    {
      title: 'TB/tháng',
      dataIndex: 'avgMonthlySales',
      key: 'avgMonthlySales',
      width: 100,
      render: (value) => <Text>{value} xe</Text>
    },
    {
      title: 'Thời gian bán',
      dataIndex: 'avgDaysToSell',
      key: 'avgDaysToSell',
      width: 120,
      render: (value) => (
        <Tooltip title="Số ngày trung bình để bán 1 xe">
          <Text strong style={{ color: value <= 25 ? '#52c41a' : value <= 35 ? '#faad14' : '#ff4d4f' }}>
            {value} ngày
          </Text>
        </Tooltip>
      ),
      sorter: (a, b) => a.avgDaysToSell - b.avgDaysToSell
    },
    {
      title: 'Vòng quay',
      dataIndex: 'turnoverRate',
      key: 'turnoverRate',
      width: 150,
      render: (value) => (
        <Tooltip title="Số lần bán hết tồn kho trong 1 năm">
          <Space>
            <ThunderboltOutlined style={{ color: value >= 12 ? '#52c41a' : value >= 10 ? '#faad14' : '#ff4d4f' }} />
            <Text strong>{value} lần/năm</Text>
          </Space>
        </Tooltip>
      ),
      sorter: (a, b) => a.turnoverRate - b.turnoverRate
    },
    {
      title: 'Xu hướng',
      key: 'trend',
      width: 150,
      render: (_, record) => {
        const trendConfig = {
          up: { color: 'success', icon: <RiseOutlined />, text: 'Tăng' },
          down: { color: 'error', icon: <FallOutlined />, text: 'Giảm' },
          stable: { color: 'default', icon: <LineChartOutlined />, text: 'Ổn định' }
        };
        const config = trendConfig[record.trend];
        return (
          <Space>
            <Tag color={config.color} icon={config.icon}>
              {config.text}
            </Tag>
            {record.trend !== 'stable' && (
              <Text type={record.trend === 'up' ? 'success' : 'danger'}>
                {Math.abs(record.trendPercent)}%
              </Text>
            )}
          </Space>
        );
      },
      filters: [
        { text: 'Tăng', value: 'up' },
        { text: 'Giảm', value: 'down' },
        { text: 'Ổn định', value: 'stable' }
      ],
      onFilter: (value, record) => record.trend === value
    },
    {
      title: 'Tốc độ tiêu thụ',
      key: 'speed',
      width: 200,
      render: (_, record) => {
        let status = 'exception';
        let text = 'Chậm';
        if (record.avgDaysToSell <= 25) {
          status = 'success';
          text = 'Rất nhanh';
        } else if (record.avgDaysToSell <= 30) {
          status = 'success';
          text = 'Nhanh';
        } else if (record.avgDaysToSell <= 35) {
          status = 'active';
          text = 'Trung bình';
        }
        
        const percent = Math.round((1 - (record.avgDaysToSell / 45)) * 100);
        return (
          <div>
            <Progress
              percent={percent}
              size="small"
              status={status}
            />
            <Text type="secondary" style={{ fontSize: '12px' }}>{text}</Text>
          </div>
        );
      }
    }
  ];

  return (
    <div className="consumption-speed-report-page">
      <div className="page-header" style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Title level={2}>
            <DashboardOutlined /> Báo cáo tốc độ tiêu thụ
          </Title>
          <Text type="secondary">Phân tích xu hướng và tốc độ bán hàng theo mẫu xe</Text>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <Select
            value={selectedVehicle}
            onChange={setSelectedVehicle}
            style={{ width: 200 }}
            options={[
              { value: 'all', label: 'Tất cả mẫu xe' },
              ...vehicles.map(vehicle => ({
                value: vehicle.id.toString(),
                label: vehicle.model
              }))
            ]}
          />
          <Select
            value={selectedPeriod}
            onChange={setSelectedPeriod}
            style={{ width: 150 }}
            options={[
              { value: '3months', label: '3 tháng gần nhất' },
              { value: '6months', label: '6 tháng gần nhất' },
              { value: '10months', label: '10 tháng' }
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
              title="Vòng quay TB"
              value={statistics.avgTurnoverRate}
              suffix="lần/năm"
              prefix={<ThunderboltOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card bordered>
            <Statistic
              title={
                <Space>
                  <TrophyOutlined style={{ color: '#52c41a' }} />
                  <Text>Bán nhanh nhất</Text>
                </Space>
              }
              value={statistics.fastestMoving?.avgDaysToSell}
              suffix="ngày"
              valueStyle={{ color: '#52c41a', fontSize: '20px' }}
            />
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {statistics.fastestMoving?.model}
            </Text>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card bordered>
            <Statistic
              title={
                <Space>
                  <AlertOutlined style={{ color: '#ff4d4f' }} />
                  <Text>Bán chậm nhất</Text>
                </Space>
              }
              value={statistics.slowestMoving?.avgDaysToSell}
              suffix="ngày"
              valueStyle={{ color: '#ff4d4f', fontSize: '20px' }}
            />
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {statistics.slowestMoving?.model}
            </Text>
          </Card>
        </Col>
      </Row>

      <Row gutter={16} style={{ marginBottom: '24px' }}>
        <Col xs={24} lg={12}>
          <Card title="Xu hướng doanh số theo tháng" bordered>
            <Line {...lineConfig} />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="Thời gian bán trung bình" bordered>
            <Area {...areaConfig} />
          </Card>
        </Col>
      </Row>

      <Row gutter={16} style={{ marginBottom: '24px' }}>
        <Col span={24}>
          <Card title="Tốc độ vòng quay hàng tháng" bordered>
            <Column {...columnConfig} />
          </Card>
        </Col>
      </Row>

      <Card title="Phân tích tốc độ tiêu thụ theo mẫu xe">
        <Table
          columns={columns}
          dataSource={statistics.vehicleStats}
          rowKey="vehicle_id"
          pagination={false}
        />
      </Card>
    </div>
  );
};

export default ConsumptionSpeedReportPage;
