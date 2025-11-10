import React, { useMemo, useState } from 'react';
import {
  Card,
  Table,
  Row,
  Col,
  Typography,
  Tag,
  Space,
  Button,
  Select,
  Descriptions,
  Modal,
  Statistic,
  Badge,
  Dropdown
} from 'antd';
import {
  CarOutlined,
  AppstoreOutlined,
  BgColorsOutlined,
  SettingOutlined,
  ThunderboltOutlined,
  EyeOutlined,
  EditOutlined,
  PlusOutlined,
  MoreOutlined
} from '@ant-design/icons';
import { vehicleOptions, vehicles } from '../data/mockData';

const { Title, Text } = Typography;

const VehicleManagementPage = () => {
  const [selectedModelId, setSelectedModelId] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState(null);

  const modelData = useMemo(() => {
    return vehicleOptions.map(model => {
      const variants = vehicles.filter(v => v.vehiclesOptions_id === model.id);
      const colors = [...new Set(variants.map(v => v.color))];
      const featureHighlights = variants.flatMap(variant => variant.features.split(', '));
      const uniqueFeatures = [...new Set(featureHighlights)].slice(0, 5);

      return {
        id: model.id,
        model_name: model.model_name,
        description: model.description,
        variant_count: variants.length,
        colors,
        variants,
        uniqueFeatures,
        created_at: model.created_at
      };
    });
  }, []);

  const variantData = useMemo(() => {
    return vehicles.map(variant => {
      const model = vehicleOptions.find(option => option.id === variant.vehiclesOptions_id);
      return {
        id: variant.id,
        variant_name: variant.variant_name,
        model_name: model?.model_name || 'N/A',
        color: variant.color,
        battery_capacity: variant.battery_capacity,
        range_km: variant.range_km,
        features: variant.features,
        status: variant.status,
        image_url: variant.image_url
      };
    });
  }, []);

  const filteredVariants = selectedModelId === 'all'
    ? variantData
    : variantData.filter(variant => variantData && vehicles.find(v => v.id === variant.id)?.vehiclesOptions_id === selectedModelId);

  const totalModels = modelData.length;
  const totalVariants = vehicles.length;
  const totalColors = new Set(vehicles.map(v => v.color)).size;
  const highRangeModels = vehicles.filter(v => v.range_km >= 600).length;

  const handleViewDetails = (record) => {
    setSelectedVariant(record);
    setIsModalOpen(true);
  };

  const modelColumns = [
    {
      title: 'Mã dòng xe',
      dataIndex: 'model_name',
      key: 'model_name',
      width: 200,
      render: (text) => <Text strong>{text}</Text>
    },
    {
      title: 'Phiên bản',
      dataIndex: 'variant_count',
      key: 'variant_count',
      width: 120,
      render: (count) => (
        <Tag color="blue">{count} phiên bản</Tag>
      )
    },
    {
      title: 'Màu sắc',
      dataIndex: 'colors',
      key: 'colors',
      width: 220,
      render: (colors) => (
        <Space size={[0, 8]} wrap>
          {colors.map(color => (
            <Tag key={color} color="cyan">{color}</Tag>
          ))}
        </Space>
      )
    },
    {
      title: 'Tính năng nổi bật',
      dataIndex: 'uniqueFeatures',
      key: 'uniqueFeatures',
      width: 320,
      render: (features) => (
        <Space size={[0, 8]} wrap>
          {features.map(feature => (
            <Tag key={feature} icon={<ThunderboltOutlined />} color="gold">
              {feature}
            </Tag>
          ))}
        </Space>
      )
    },
    {
      title: 'Thao tác',
      key: 'actions',
      width: 80,
      align: 'center',
      render: (_, record) => {
        const items = [
          {
            key: 'view',
            icon: <EyeOutlined />,
            label: 'Xem chi tiết',
            onClick: () => {
              setSelectedVariant({
                variant_name: record.model_name,
                model_name: record.model_name,
                features: record.uniqueFeatures.join(', '),
                color: record.colors.join(', '),
                battery_capacity: record.variants[0]?.battery_capacity || 'Đang cập nhật',
                range_km: record.variants[0]?.range_km || 0
              });
              setIsModalOpen(true);
            }
          },
          {
            key: 'edit',
            icon: <EditOutlined />,
            label: 'Chỉnh sửa',
            onClick: () => {}
          }
        ];

        return (
          <Dropdown menu={{ items }} trigger={['click']} placement="bottomRight">
            <Button type="text" icon={<MoreOutlined />} />
          </Dropdown>
        );
      }
    }
  ];

  const variantColumns = [
    {
      title: 'Phiên bản',
      dataIndex: 'variant_name',
      key: 'variant_name',
      width: 220,
      fixed: 'left',
      render: (text) => <Text strong>{text}</Text>
    },
    {
      title: 'Dòng xe',
      dataIndex: 'model_name',
      key: 'model_name',
      width: 150,
      render: (text) => <Tag color="geekblue">{text}</Tag>
    },
    {
      title: 'Màu sắc',
      dataIndex: 'color',
      key: 'color',
      width: 140,
      render: (color) => (
        <Tag icon={<BgColorsOutlined />} color="cyan">
          {color}
        </Tag>
      )
    },
    {
      title: 'Dung lượng pin',
      dataIndex: 'battery_capacity',
      key: 'battery_capacity',
      width: 160,
      render: (capacity) => <Tag color="green">{capacity}</Tag>
    },
    {
      title: 'Quãng đường',
      dataIndex: 'range_km',
      key: 'range_km',
      width: 140,
      render: (km) => (
        <Tag color={km >= 600 ? 'gold' : 'blue'}>
          {km} km
        </Tag>
      )
    },
    {
      title: 'Tính năng',
      dataIndex: 'features',
      key: 'features',
      width: 320,
      render: (features) => (
        <Space size={[0, 8]} wrap>
          {features.split(', ').map(feature => (
            <Tag key={feature} icon={<SettingOutlined />}>
              {feature}
            </Tag>
          ))}
        </Space>
      )
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status) => (
        <Badge status={status === 'available' ? 'success' : 'warning'} text={status === 'available' ? 'Sẵn sàng' : 'Đang cập nhật'} />
      )
    },
    {
      title: 'Thao tác',
      key: 'actions',
      width: 80,
      fixed: 'right',
      align: 'center',
      render: (_, record) => {
        const items = [
          {
            key: 'view',
            icon: <EyeOutlined />,
            label: 'Xem chi tiết',
            onClick: () => handleViewDetails(record)
          },
          {
            key: 'edit',
            icon: <EditOutlined />,
            label: 'Chỉnh sửa',
            onClick: () => {}
          }
        ];

        return (
          <Dropdown menu={{ items }} trigger={['click']} placement="bottomRight">
            <Button type="text" icon={<MoreOutlined />} />
          </Dropdown>
        );
      }
    }
  ];

  return (
    <div className="vehicle-management-page">
      <div className="page-header" style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Title level={2}>
            <CarOutlined /> Quản lý danh mục xe điện
          </Title>
          <Text type="secondary">Theo dõi các dòng xe, phiên bản và cấu hình màu sắc</Text>
        </div>
        <Button type="primary" icon={<PlusOutlined />} size="large">
          Thêm phiên bản mới
        </Button>
      </div>

      <Row gutter={16} style={{ marginBottom: '24px' }}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Tổng số dòng xe"
              value={totalModels}
              prefix={<AppstoreOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Tổng số phiên bản"
              value={totalVariants}
              prefix={<CarOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Số màu sắc"
              value={totalColors}
              prefix={<BgColorsOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Phiên bản cao cấp"
              value={highRangeModels}
              suffix="≥600km"
              prefix={<ThunderboltOutlined />}
              valueStyle={{ color: '#f5222d' }}
            />
          </Card>
        </Col>
      </Row>

      <Card title="Danh sách dòng xe" style={{ marginBottom: '24px' }}>
        <Table
          columns={modelColumns}
          dataSource={modelData}
          rowKey="id"
          pagination={false}
        />
      </Card>

      <Card
        title="Danh sách phiên bản"
        extra={
          <Space>
            <Text strong>Lọc theo dòng xe:</Text>
            <Select
              value={selectedModelId}
              onChange={setSelectedModelId}
              style={{ width: 220 }}
            >
              <Select.Option value="all">Tất cả dòng xe</Select.Option>
              {vehicleOptions.map(option => (
                <Select.Option key={option.id} value={option.id}>
                  {option.model_name}
                </Select.Option>
              ))}
            </Select>
          </Space>
        }
      >
        <Table
          columns={variantColumns}
          dataSource={filteredVariants}
          rowKey="id"
          scroll={{ x: 1200 }}
          pagination={{
            pageSize: 8,
            showTotal: (total) => `Tổng ${total} phiên bản`
          }}
        />
      </Card>

      <Modal
        title={
          <Space>
            <CarOutlined />
            <span>Thông tin phiên bản</span>
          </Space>
        }
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        footer={[
          <Button key="edit" icon={<EditOutlined />}>Chỉnh sửa</Button>,
          <Button key="close" type="primary" onClick={() => setIsModalOpen(false)}>
            Đóng
          </Button>
        ]}
        width={720}
      >
        {selectedVariant && (
          <Descriptions bordered column={2}>
            <Descriptions.Item label="Phiên bản" span={2}>
              <Text strong>{selectedVariant.variant_name}</Text>
            </Descriptions.Item>
            <Descriptions.Item label="Dòng xe">
              {selectedVariant.model_name}
            </Descriptions.Item>
            <Descriptions.Item label="Màu sắc">
              {selectedVariant.color}
            </Descriptions.Item>
            <Descriptions.Item label="Dung lượng pin">
              {selectedVariant.battery_capacity}
            </Descriptions.Item>
            <Descriptions.Item label="Tầm hoạt động">
              {selectedVariant.range_km} km
            </Descriptions.Item>
            <Descriptions.Item label="Tính năng" span={2}>
              {selectedVariant.features}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </div>
  );
};

export default VehicleManagementPage;
