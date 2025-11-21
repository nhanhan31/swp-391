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
  Alert,
  Space
} from 'antd';
import {
  InboxOutlined,
  CarOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  ShopOutlined,
  DashboardOutlined,
  AlertOutlined
} from '@ant-design/icons';
import { Column, Pie } from '@ant-design/plots';
import dayjs from 'dayjs';
import { vehicles, agencies } from '../data/mockData';

const { Title, Text } = Typography;

// Mock inventory data
const mockInventory = [
  // VF e34 - EV battery capacity 42 kWh
  { vehicle_id: 1, agency_id: null, quantity: 150, warning_level: 50, type: 'central' },
  { vehicle_id: 1, agency_id: 1, quantity: 25, warning_level: 10, type: 'agency' },
  { vehicle_id: 1, agency_id: 2, quantity: 30, warning_level: 10, type: 'agency' },
  { vehicle_id: 1, agency_id: 3, quantity: 15, warning_level: 10, type: 'agency' },

  // VF 8 - EV battery capacity 87.7 kWh
  { vehicle_id: 2, agency_id: null, quantity: 120, warning_level: 40, type: 'central' },
  { vehicle_id: 2, agency_id: 1, quantity: 20, warning_level: 10, type: 'agency' },
  { vehicle_id: 2, agency_id: 2, quantity: 25, warning_level: 10, type: 'agency' },
  { vehicle_id: 2, agency_id: 3, quantity: 12, warning_level: 10, type: 'agency' },

  // VF 9 - EV battery capacity 123 kWh
  { vehicle_id: 3, agency_id: null, quantity: 80, warning_level: 30, type: 'central' },
  { vehicle_id: 3, agency_id: 1, quantity: 15, warning_level: 8, type: 'agency' },
  { vehicle_id: 3, agency_id: 2, quantity: 18, warning_level: 8, type: 'agency' },
  { vehicle_id: 3, agency_id: 3, quantity: 8, warning_level: 8, type: 'agency' },

  // VF 5 Plus - EV battery capacity 46 kWh
  { vehicle_id: 4, agency_id: null, quantity: 200, warning_level: 60, type: 'central' },
  { vehicle_id: 4, agency_id: 1, quantity: 35, warning_level: 12, type: 'agency' },
  { vehicle_id: 4, agency_id: 2, quantity: 40, warning_level: 12, type: 'agency' },
  { vehicle_id: 4, agency_id: 3, quantity: 20, warning_level: 12, type: 'agency' },

  // VF 6 - EV battery capacity 59.6 kWh
  { vehicle_id: 5, agency_id: null, quantity: 100, warning_level: 35, type: 'central' },
  { vehicle_id: 5, agency_id: 1, quantity: 18, warning_level: 10, type: 'agency' },
  { vehicle_id: 5, agency_id: 2, quantity: 22, warning_level: 10, type: 'agency' },
  { vehicle_id: 5, agency_id: 3, quantity: 10, warning_level: 10, type: 'agency' }
];

// Monthly inventory history
const mockInventoryHistory = [
  { month: 'T1', totalStock: 650, inbound: 120, outbound: 95 },
  { month: 'T2', totalStock: 675, inbound: 140, outbound: 115 },
  { month: 'T3', totalStock: 700, inbound: 150, outbound: 125 },
  { month: 'T4', totalStock: 725, inbound: 160, outbound: 135 },
  { month: 'T5', totalStock: 750, inbound: 170, outbound: 145 },
  { month: 'T6', totalStock: 720, inbound: 155, outbound: 185 },
  { month: 'T7', totalStock: 680, inbound: 140, outbound: 180 },
  { month: 'T8', totalStock: 640, inbound: 130, outbound: 170 },
  { month: 'T9', totalStock: 670, inbound: 150, outbound: 120 },
  { month: 'T10', totalStock: 650, inbound: 140, outbound: 160 }
];

const InventoryReportPage = () => {
  const [selectedType, setSelectedType] = useState('all');
  const [selectedAgency, setSelectedAgency] = useState('all');

  // Calculate statistics
  const statistics = useMemo(() => {
    const centralInventory = mockInventory.filter(item => item.type === 'central');
    const agencyInventory = mockInventory.filter(item => item.type === 'agency');

    const centralTotal = centralInventory.reduce((sum, item) => sum + item.quantity, 0);
    const agencyTotal = agencyInventory.reduce((sum, item) => sum + item.quantity, 0);
    const totalStock = centralTotal + agencyTotal;

    // Calculate warnings
    const lowStockItems = mockInventory.filter(item => item.quantity < item.warning_level);
    const criticalStockItems = mockInventory.filter(item => item.quantity < item.warning_level * 0.5);

    // By vehicle
    const byVehicle = mockInventory.reduce((acc, item) => {
      const vehicle = vehicles.find(v => v.id === item.vehicle_id);
      const key = vehicle?.model || 'Unknown';
      
      if (!acc[key]) {
        acc[key] = { vehicle_id: item.vehicle_id, model: key, quantity: 0 };
      }
      acc[key].quantity += item.quantity;
      return acc;
    }, {});

    return {
      centralTotal,
      agencyTotal,
      totalStock,
      lowStockCount: lowStockItems.length,
      criticalStockCount: criticalStockItems.length,
      vehicleStats: Object.values(byVehicle)
    };
  }, []);

  // Inventory by vehicle
  const inventoryByVehicle = useMemo(() => {
    const groupedData = mockInventory.reduce((acc, item) => {
      if (selectedType !== 'all' && item.type !== selectedType) return acc;
      if (selectedAgency !== 'all' && item.agency_id !== parseInt(selectedAgency) && item.agency_id !== null) return acc;

      const vehicle = vehicles.find(v => v.id === item.vehicle_id);
      const key = vehicle?.model || 'Unknown';
      
      if (!acc[key]) {
        acc[key] = {
          vehicle_id: item.vehicle_id,
          model: key,
          central_stock: 0,
          agency_stock: 0,
          total_stock: 0,
          warning_level: 0,
          low_stock_agencies: []
        };
      }

      if (item.type === 'central') {
        acc[key].central_stock += item.quantity;
        acc[key].warning_level += item.warning_level;
      } else {
        acc[key].agency_stock += item.quantity;
        if (item.quantity < item.warning_level) {
          const agency = agencies.find(a => a.id === item.agency_id);
          acc[key].low_stock_agencies.push(agency?.agency_name || 'Unknown');
        }
      }
      acc[key].total_stock += item.quantity;
      return acc;
    }, {});

    return Object.values(groupedData).map(item => ({
      ...item,
      stockRatio: Math.round((item.total_stock / item.warning_level) * 100) || 0,
      status: item.total_stock >= item.warning_level ? 'normal' : item.total_stock >= item.warning_level * 0.5 ? 'warning' : 'critical'
    }));
  }, [selectedType, selectedAgency]);

  // Column chart config - Inventory by vehicle
  const columnConfig = {
    data: inventoryByVehicle.map(item => [
      { model: item.model, type: 'Kho trung tâm', value: item.central_stock },
      { model: item.model, type: 'Kho đại lý', value: item.agency_stock }
    ]).flat(),
    xField: 'model',
    yField: 'value',
    seriesField: 'type',
    isGroup: true,
    columnStyle: {
      radius: [8, 8, 0, 0]
    },
    legend: { position: 'top' },
    label: {
      position: 'top'
    },
    color: ['#1890ff', '#52c41a']
  };

  // Pie chart config - Stock distribution
  const pieData = statistics.vehicleStats.map(item => ({
    type: item.model,
    value: item.quantity
  }));

  const pieConfig = {
    data: pieData,
    angleField: 'value',
    colorField: 'type',
    radius: 1,
    innerRadius: 0.6,
    label: {
      type: 'inner',
      offset: '-30%',
      content: '{value}',
      style: {
        fontSize: 14,
        textAlign: 'center'
      }
    },
    statistic: {
      title: false,
      content: {
        style: {
          fontSize: '24px',
          fontWeight: 'bold'
        },
        content: statistics.totalStock
      }
    },
    legend: {
      position: 'bottom'
    }
  };

  // Line chart config - Inventory history
  const lineData = mockInventoryHistory.map(item => [
    { month: item.month, type: 'Tồn kho', value: item.totalStock },
    { month: item.month, type: 'Nhập kho', value: item.inbound },
    { month: item.month, type: 'Xuất kho', value: item.outbound }
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
    },
    color: ['#1890ff', '#52c41a', '#fa8c16']
  };

  const columns = [
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
      title: 'Kho trung tâm',
      dataIndex: 'central_stock',
      key: 'central_stock',
      width: 120,
      render: (value) => <Text style={{ color: '#1890ff' }}>{value} xe</Text>,
      sorter: (a, b) => a.central_stock - b.central_stock
    },
    {
      title: 'Kho đại lý',
      dataIndex: 'agency_stock',
      key: 'agency_stock',
      width: 120,
      render: (value) => <Text style={{ color: '#52c41a' }}>{value} xe</Text>,
      sorter: (a, b) => a.agency_stock - b.agency_stock
    },
    {
      title: 'Tổng tồn',
      dataIndex: 'total_stock',
      key: 'total_stock',
      width: 120,
      render: (value) => <Text strong>{value} xe</Text>,
      sorter: (a, b) => a.total_stock - b.total_stock
    },
    {
      title: 'Mức cảnh báo',
      dataIndex: 'warning_level',
      key: 'warning_level',
      width: 120,
      render: (value) => <Text type="secondary">{value} xe</Text>
    },
    {
      title: 'Tỷ lệ tồn kho',
      key: 'stockRatio',
      width: 200,
      render: (_, record) => (
        <div>
          <Progress
            percent={record.stockRatio}
            size="small"
            status={record.status === 'normal' ? 'success' : record.status === 'warning' ? 'active' : 'exception'}
            strokeColor={record.status === 'normal' ? '#52c41a' : record.status === 'warning' ? '#faad14' : '#ff4d4f'}
          />
        </div>
      )
    },
    {
      title: 'Trạng thái',
      key: 'status',
      width: 120,
      render: (_, record) => {
        const statusConfig = {
          normal: { color: 'success', icon: <CheckCircleOutlined />, text: 'Bình thường' },
          warning: { color: 'warning', icon: <WarningOutlined />, text: 'Cảnh báo' },
          critical: { color: 'error', icon: <AlertOutlined />, text: 'Nghiêm trọng' }
        };
        const config = statusConfig[record.status];
        return <Tag color={config.color} icon={config.icon}>{config.text}</Tag>;
      },
      filters: [
        { text: 'Bình thường', value: 'normal' },
        { text: 'Cảnh báo', value: 'warning' },
        { text: 'Nghiêm trọng', value: 'critical' }
      ],
      onFilter: (value, record) => record.status === value
    },
    {
      title: 'Đại lý thiếu hàng',
      dataIndex: 'low_stock_agencies',
      key: 'low_stock_agencies',
      width: 200,
      render: (agencies) => {
        if (agencies.length === 0) return <Text type="secondary">Không có</Text>;
        return (
          <Space direction="vertical" size="small">
            {agencies.map((agency, index) => (
              <Tag key={index} color="orange" icon={<WarningOutlined />}>
                {agency}
              </Tag>
            ))}
          </Space>
        );
      }
    }
  ];

  return (
    <div className="inventory-report-page">
      <div className="page-header" style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Title level={2}>
            <InboxOutlined /> Báo cáo tồn kho
          </Title>
          <Text type="secondary">Theo dõi tồn kho trung tâm và đại lý</Text>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <Select
            value={selectedType}
            onChange={setSelectedType}
            style={{ width: 150 }}
            options={[
              { value: 'all', label: 'Tất cả kho' },
              { value: 'central', label: 'Kho trung tâm' },
              { value: 'agency', label: 'Kho đại lý' }
            ]}
          />
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
        </div>
      </div>

      {(statistics.lowStockCount > 0 || statistics.criticalStockCount > 0) && (
        <Alert
          message="Cảnh báo tồn kho"
          description={
            <Space direction="vertical">
              {statistics.criticalStockCount > 0 && (
                <Text>
                  <AlertOutlined style={{ color: '#ff4d4f' }} /> {statistics.criticalStockCount} mặt hàng có tồn kho <strong>nghiêm trọng</strong>
                </Text>
              )}
              {statistics.lowStockCount > 0 && (
                <Text>
                  <WarningOutlined style={{ color: '#faad14' }} /> {statistics.lowStockCount} mặt hàng có tồn kho <strong>thấp hơn mức cảnh báo</strong>
                </Text>
              )}
            </Space>
          }
          type="warning"
          showIcon
          closable
          style={{ marginBottom: '24px' }}
        />
      )}

      <Row gutter={16} style={{ marginBottom: '24px' }}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Tổng tồn kho"
              value={statistics.totalStock}
              suffix="xe"
              prefix={<DashboardOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Kho trung tâm"
              value={statistics.centralTotal}
              suffix="xe"
              prefix={<InboxOutlined />}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Kho đại lý"
              value={statistics.agencyTotal}
              suffix="xe"
              prefix={<ShopOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Cảnh báo"
              value={statistics.lowStockCount}
              suffix="mặt hàng"
              prefix={<WarningOutlined />}
              valueStyle={{ color: statistics.lowStockCount > 0 ? '#faad14' : '#52c41a' }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={16} style={{ marginBottom: '24px' }}>
        <Col xs={24} lg={12}>
          <Card title="Tồn kho theo mẫu xe" bordered>
            <Column {...columnConfig} />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="Phân bổ tồn kho" bordered>
            <Pie {...pieConfig} />
          </Card>
        </Col>
      </Row>

      <Row gutter={16} style={{ marginBottom: '24px' }}>
        <Col span={24}>
          <Card title="Biến động tồn kho theo tháng" bordered>
            <Column {...lineConfig} />
          </Card>
        </Col>
      </Row>

      <Card title="Chi tiết tồn kho theo mẫu xe">
        <Table
          columns={columns}
          dataSource={inventoryByVehicle}
          rowKey="vehicle_id"
          pagination={{ pageSize: 10 }}
        />
      </Card>
    </div>
  );
};

export default InventoryReportPage;
