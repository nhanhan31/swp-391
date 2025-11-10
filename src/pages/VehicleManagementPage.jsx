import React, { useMemo, useState, useEffect } from 'react';
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
  Dropdown,
  Spin,
  message,
  Form,
  Input,
  InputNumber,
  Upload
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
  MoreOutlined,
  UploadOutlined
} from '@ant-design/icons';
import axios from 'axios';

const ALLOCATION_API = 'https://allocation.agencymanagement.online/api';

const { Title, Text } = Typography;

const VehicleManagementPage = () => {
  const [form] = Form.useForm();
  const [selectedModelId, setSelectedModelId] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [loading, setLoading] = useState(false);
  const [vehicleOptions, setVehicleOptions] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [modalMode, setModalMode] = useState('view'); // 'view', 'create', 'edit'
  const [vehicleImageFile, setVehicleImageFile] = useState(null);

  // Fetch VehicleOptions
  useEffect(() => {
    const fetchVehicleOptions = async () => {
      setLoading(true);
      try {
        const response = await axios.get(`${ALLOCATION_API}/VehicleOption`);
        setVehicleOptions(response.data || []);
      } catch (error) {
        console.error('Error fetching vehicle options:', error);
        message.error('Không thể tải danh sách dòng xe');
      } finally {
        setLoading(false);
      }
    };

    fetchVehicleOptions();
  }, []);

  // Fetch Vehicles
  useEffect(() => {
    const fetchVehicles = async () => {
      setLoading(true);
      try {
        const response = await axios.get(`${ALLOCATION_API}/Vehicle`);
        setVehicles(response.data || []);
      } catch (error) {
        console.error('Error fetching vehicles:', error);
        message.error('Không thể tải danh sách xe');
      } finally {
        setLoading(false);
      }
    };

    fetchVehicles();
  }, []);

  const modelData = useMemo(() => {
    return vehicleOptions.map(model => {
      const variants = vehicles.filter(v => v.vehicleOptionId === model.id);
      const colors = [...new Set(variants.map(v => v.color))];
      const featureHighlights = variants.flatMap(variant => 
        variant.features ? variant.features.split(', ') : []
      );
      const uniqueFeatures = [...new Set(featureHighlights)].slice(0, 5);

      return {
        id: model.id,
        model_name: model.modelName,
        description: model.description,
        variant_count: variants.length,
        colors,
        variants,
        uniqueFeatures,
        created_at: model.createdAt,
        updated_at: model.updatedAt
      };
    });
  }, [vehicleOptions, vehicles]);

  const variantData = useMemo(() => {
    return vehicles.map(variant => {
      const model = vehicleOptions.find(option => option.id === variant.vehicleOptionId);
      return {
        id: variant.id,
        variant_name: variant.variantName,
        model_name: model?.modelName || 'N/A',
        vehicle_option_id: variant.vehicleOptionId,
        color: variant.color,
        battery_capacity: variant.batteryCapacity,
        range_km: variant.rangeKM,
        features: variant.features,
        status: variant.status,
        image_url: variant.vehicleImage,
        created_at: variant.createdAt,
        updated_at: variant.updatedAt
      };
    });
  }, [vehicleOptions, vehicles]);

  const filteredVariants = selectedModelId === 'all'
    ? variantData
    : variantData.filter(variant => variant.vehicle_option_id === selectedModelId);

  const totalModels = modelData.length;
  const totalVariants = vehicles.length;
  const totalColors = new Set(vehicles.map(v => v.color)).size;
  const highRangeModels = vehicles.filter(v => v.rangeKM >= 600).length;

  const handleViewDetails = (record) => {
    setSelectedVariant(record);
    setModalMode('view');
    setIsModalOpen(true);
  };

  const handleCreate = () => {
    setModalMode('create');
    setSelectedVariant(null);
    form.resetFields();
    setVehicleImageFile(null);
    setIsModalOpen(true);
  };

  const handleEdit = (record) => {
    setModalMode('edit');
    setSelectedVariant(record);
    form.setFieldsValue({
      vehicleOptionId: record.vehicle_option_id,
      variantName: record.variant_name,
      color: record.color,
      batteryCapacity: record.battery_capacity,
      rangeKM: record.range_km,
      features: record.features,
      status: record.status
    });
    setVehicleImageFile(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      const formData = new FormData();
      
      if (modalMode === 'create') {
        formData.append('VehicleOptionId', values.vehicleOptionId);
        formData.append('VariantName', values.variantName);
        if (vehicleImageFile) {
          formData.append('VehicleImage', vehicleImageFile);
        }
        formData.append('Color', values.color);
        formData.append('BatteryCapacity', values.batteryCapacity);
        formData.append('RangeKM', values.rangeKM);
        formData.append('Features', values.features);
        formData.append('Status', values.status || 'Active');

        await axios.post(`${ALLOCATION_API}/Vehicle`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
            'Authorization': `Bearer ${sessionStorage.getItem('token')}`
          }
        });

        message.success('Tạo xe thành công');
      } else if (modalMode === 'edit') {
        formData.append('VehicleOptionId', values.vehicleOptionId);
        formData.append('VariantName', values.variantName);
        if (vehicleImageFile) {
          formData.append('VehicleImage', vehicleImageFile);
        }
        formData.append('Color', values.color);
        formData.append('BatteryCapacity', values.batteryCapacity);
        formData.append('RangeKM', values.rangeKM);
        formData.append('Features', values.features);
        formData.append('Status', values.status || 'Active');

        await axios.put(`${ALLOCATION_API}/Vehicle/${selectedVariant.id}`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
            'Authorization': `Bearer ${sessionStorage.getItem('token')}`
          }
        });

        message.success('Cập nhật xe thành công');
      }

      // Refresh data
      const response = await axios.get(`${ALLOCATION_API}/Vehicle`);
      setVehicles(response.data || []);
      
      form.resetFields();
      setIsModalOpen(false);
      setVehicleImageFile(null);
    } catch (error) {
      console.error('Error submitting vehicle:', error);
      message.error('Không thể lưu thông tin xe');
    } finally {
      setLoading(false);
    }
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
        <Badge status={status === 'Active' ? 'success' : 'warning'} text={status === 'Active' ? 'Hoạt động' : 'Không hoạt động'} />
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
            onClick: () => handleEdit(record)
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
    <Spin spinning={loading}>
      <div className="vehicle-management-page">
        <div className="page-header" style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <Title level={2}>
              <CarOutlined /> Quản lý danh mục xe điện
            </Title>
            <Text type="secondary">Theo dõi các dòng xe, phiên bản và cấu hình màu sắc</Text>
          </div>
          <Button type="primary" icon={<PlusOutlined />} size="large" onClick={handleCreate}>
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
            <span>
              {modalMode === 'view' ? 'Thông tin phiên bản' : 
               modalMode === 'create' ? 'Thêm phiên bản mới' : 'Chỉnh sửa phiên bản'}
            </span>
          </Space>
        }
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        footer={
          modalMode === 'view' ? [
            <Button key="close" type="primary" onClick={() => setIsModalOpen(false)}>
              Đóng
            </Button>
          ] : [
            <Button key="cancel" onClick={() => setIsModalOpen(false)}>
              Hủy
            </Button>,
            <Button key="submit" type="primary" onClick={handleSubmit}>
              {modalMode === 'create' ? 'Tạo mới' : 'Cập nhật'}
            </Button>
          ]
        }
        width={720}
      >
        {modalMode === 'view' && selectedVariant && (
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
            <Descriptions.Item label="Trạng thái">
              <Badge status={selectedVariant.status === 'Active' ? 'success' : 'warning'} 
                     text={selectedVariant.status === 'Active' ? 'Hoạt động' : 'Không hoạt động'} />
            </Descriptions.Item>
          </Descriptions>
        )}
        
        {(modalMode === 'create' || modalMode === 'edit') && (
          <Form form={form} layout="vertical">
            <Form.Item
              name="vehicleOptionId"
              label="Dòng xe"
              rules={[{ required: true, message: 'Vui lòng chọn dòng xe' }]}
            >
              <Select placeholder="Chọn dòng xe">
                {vehicleOptions.map(option => (
                  <Select.Option key={option.id} value={option.id}>
                    {option.modelName}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item
              name="variantName"
              label="Tên phiên bản"
              rules={[{ required: true, message: 'Vui lòng nhập tên phiên bản' }]}
            >
              <Input placeholder="VD: VF8 Plus" />
            </Form.Item>

            <Form.Item
              name="vehicleImage"
              label="Hình ảnh xe"
            >
              <Upload
                beforeUpload={(file) => {
                  const isImage = file.type.startsWith('image/');
                  if (!isImage) {
                    message.error('Chỉ được tải lên file hình ảnh!');
                  }
                  const isLt5M = file.size / 1024 / 1024 < 5;
                  if (!isLt5M) {
                    message.error('Hình ảnh phải nhỏ hơn 5MB!');
                  }
                  if (isImage && isLt5M) {
                    setVehicleImageFile(file);
                  }
                  return false;
                }}
                maxCount={1}
                listType="picture"
              >
                <Button icon={<UploadOutlined />}>Chọn hình ảnh</Button>
              </Upload>
            </Form.Item>

            <Form.Item
              name="color"
              label="Màu sắc"
              rules={[{ required: true, message: 'Vui lòng nhập màu sắc' }]}
            >
              <Input placeholder="VD: Đen, Trắng, Xanh" />
            </Form.Item>

            <Form.Item
              name="batteryCapacity"
              label="Dung lượng pin"
              rules={[{ required: true, message: 'Vui lòng nhập dung lượng pin' }]}
            >
              <Input placeholder="VD: 87.7 kWh" />
            </Form.Item>

            <Form.Item
              name="rangeKM"
              label="Quãng đường (km)"
              rules={[{ required: true, message: 'Vui lòng nhập quãng đường' }]}
            >
              <InputNumber min={0} style={{ width: '100%' }} placeholder="VD: 600" />
            </Form.Item>

            <Form.Item
              name="features"
              label="Tính năng"
              rules={[{ required: true, message: 'Vui lòng nhập tính năng' }]}
            >
              <Input.TextArea rows={3} placeholder="VD: Hệ thống lái tự động, Camera 360, Sạc nhanh" />
            </Form.Item>

            <Form.Item
              name="status"
              label="Trạng thái"
            >
              <Select placeholder="Chọn trạng thái" defaultValue="Active">
                <Select.Option value="Active">Hoạt động</Select.Option>
                <Select.Option value="Inactive">Không hoạt động</Select.Option>
              </Select>
            </Form.Item>
          </Form>
        )}
      </Modal>
    </div>
    </Spin>
  );
};

export default VehicleManagementPage;
