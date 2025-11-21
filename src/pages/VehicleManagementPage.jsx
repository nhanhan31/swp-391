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
  UploadOutlined,
  DeleteOutlined
} from '@ant-design/icons';
import axios from 'axios';
import dayjs from 'dayjs';
import { vehiclePriceAPI } from '../services/quotationService';

const ALLOCATION_API = 'https://allocation.agencymanagement.online/api';

const { Title, Text } = Typography;

const VehicleManagementPage = () => {
  const [form] = Form.useForm();
  const [optionForm] = Form.useForm();
  const [selectedModelId, setSelectedModelId] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isOptionModalOpen, setIsOptionModalOpen] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [selectedOption, setSelectedOption] = useState(null);
  const [loading, setLoading] = useState(false);
  const [vehicleOptions, setVehicleOptions] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [modalMode, setModalMode] = useState('view'); // 'view', 'create', 'edit'
  const [optionModalMode, setOptionModalMode] = useState('view');
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

      return {
        id: model.id,
        model_name: model.modelName,
        description: model.description,
        variant_count: variants.length,
        colors,
        variants,
        created_at: model.createAt,
        updated_at: model.updateAt
      };
    });
  }, [vehicleOptions, vehicles]);

  const variantData = useMemo(() => {
    return vehicles.map(variant => {
      return {
        id: variant.id,
        variant_name: variant.variantName,
        model_name: variant.option?.modelName || 'N/A',
        description: variant.option?.description || 'N/A',
        vehicle_option_id: variant.vehicleOptionId,
        color: variant.color,
        battery_capacity: variant.batteryCapacity,
        range_km: variant.rangeKM,
        features: variant.features,
        status: variant.status,
        image_url: variant.vehicleImage
      };
    });
  }, [vehicles]);

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

  const handleCreateOption = () => {
    setOptionModalMode('create');
    setSelectedOption(null);
    optionForm.resetFields();
    setIsOptionModalOpen(true);
  };

  const handleEditOption = (record) => {
    setOptionModalMode('edit');
    setSelectedOption(record);
    optionForm.setFieldsValue({
      modelName: record.model_name,
      description: record.description
    });
    setIsOptionModalOpen(true);
  };

  const handleDeleteOption = async (id) => {
    Modal.confirm({
      title: 'Xác nhận xóa',
      content: 'Bạn có chắc chắn muốn xóa dòng xe này? Tất cả phiên bản liên quan sẽ không thể truy cập.',
      okText: 'Xóa',
      okType: 'danger',
      cancelText: 'Hủy',
      onOk: async () => {
        try {
          setLoading(true);
          await axios.delete(`${ALLOCATION_API}/VehicleOption/${id}`, {
            headers: {
              'Authorization': `Bearer ${sessionStorage.getItem('token')}`
            }
          });
          message.success('Xóa dòng xe thành công');
          const response = await axios.get(`${ALLOCATION_API}/VehicleOption`);
          setVehicleOptions(response.data || []);
        } catch (error) {
          console.error('Error deleting option:', error);
          message.error('Không thể xóa dòng xe');
        } finally {
          setLoading(false);
        }
      }
    });
  };

  const handleDeleteVehicle = async (id) => {
    Modal.confirm({
      title: 'Xác nhận xóa',
      content: 'Bạn có chắc chắn muốn xóa phiên bản xe này?',
      okText: 'Xóa',
      okType: 'danger',
      cancelText: 'Hủy',
      onOk: async () => {
        try {
          setLoading(true);
          await axios.delete(`${ALLOCATION_API}/Vehicle/${id}`, {
            headers: {
              'Authorization': `Bearer ${sessionStorage.getItem('token')}`
            }
          });
          message.success('Xóa phiên bản thành công');
          const response = await axios.get(`${ALLOCATION_API}/Vehicle`);
          setVehicles(response.data || []);
        } catch (error) {
          console.error('Error deleting vehicle:', error);
          message.error('Không thể xóa phiên bản');
        } finally {
          setLoading(false);
        }
      }
    });
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
      status: record.status,
      currentImageUrl: record.image_url
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

        const vehicleResponse = await axios.post(`${ALLOCATION_API}/Vehicle`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
            'Authorization': `Bearer ${sessionStorage.getItem('token')}`
          }
        });

        const newVehicleId = vehicleResponse.data.id;
        const startDate = dayjs().format('YYYY-MM-DDTHH:mm:ss.SSS[Z]');
        const endDate = dayjs().add(1, 'year').format('YYYY-MM-DDTHH:mm:ss.SSS[Z]');

        // Tạo giá MSRP
        await vehiclePriceAPI.create({
          vehicleId: newVehicleId,
          agencyId: 1,
          priceType: 'MSRP',
          priceAmount: values.msrpPrice,
          startDate: startDate,
          endDate: endDate
        });

        // Tạo giá Wholesale
        await vehiclePriceAPI.create({
          vehicleId: newVehicleId,
          agencyId: 1,
          priceType: 'Wholesale',
          priceAmount: values.wholesalePrice,
          startDate: startDate,
          endDate: endDate
        });

        message.success('Tạo xe và bảng giá thành công');
      } else if (modalMode === 'edit') {
        formData.append('VehicleOptionId', values.vehicleOptionId);
        formData.append('VariantName', values.variantName);
        // Chỉ gửi ảnh mới nếu đã chọn file
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

  const handleSubmitOption = async () => {
    try {
      const values = await optionForm.validateFields();
      setLoading(true);

      if (optionModalMode === 'create') {
        await axios.post(`${ALLOCATION_API}/VehicleOption`, values, {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${sessionStorage.getItem('token')}`
          }
        });
        message.success('Tạo dòng xe thành công');
      } else if (optionModalMode === 'edit') {
        await axios.put(`${ALLOCATION_API}/VehicleOption/${selectedOption.id}`, values, {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${sessionStorage.getItem('token')}`
          }
        });
        message.success('Cập nhật dòng xe thành công');
      }

      const response = await axios.get(`${ALLOCATION_API}/VehicleOption`);
      setVehicleOptions(response.data || []);
      
      optionForm.resetFields();
      setIsOptionModalOpen(false);
    } catch (error) {
      console.error('Error submitting option:', error);
      message.error('Không thể lưu thông tin dòng xe');
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
      title: 'Mô tả',
      dataIndex: 'description',
      key: 'description',
      width: 320,
      render: (text) => (
        <Text>{text}</Text>
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
                description: record.description,
                color: record.colors.join(', '),
                battery_capacity: record.variants[0]?.battery_capacity || 'Đang cập nhật',
                range_km: record.variants[0]?.range_km || 0
              });
              setModalMode('view');
              setIsModalOpen(true);
            }
          },
          {
            key: 'edit',
            icon: <EditOutlined />,
            label: 'Chỉnh sửa',
            onClick: () => handleEditOption(record)
          },
          {
            key: 'delete',
            icon: <DeleteOutlined />,
            label: 'Xóa',
            danger: true,
            onClick: () => handleDeleteOption(record.id)
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
      title: 'Hình ảnh',
      dataIndex: 'image_url',
      key: 'image_url',
      width: 100,
      fixed: 'left',
      render: (imageUrl) => (
        <img 
          src={imageUrl || 'https://via.placeholder.com/80x60?text=No+Image'} 
          alt="Vehicle" 
          style={{ width: 80, height: 60, objectFit: 'cover', borderRadius: 4 }}
        />
      )
    },
    {
      title: 'Phiên bản',
      dataIndex: 'variant_name',
      key: 'variant_name',
      width: 220,
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
      title: 'Mô tả',
      dataIndex: 'description',
      key: 'description',
      width: 320,
      render: (text) => <Text>{text}</Text>
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
          },
          {
            key: 'delete',
            icon: <DeleteOutlined />,
            label: 'Xóa',
            danger: true,
            onClick: () => handleDeleteVehicle(record.id)
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

      <Card title="Danh sách dòng xe" style={{ marginBottom: '24px' }} extra={
        <Button type="primary" icon={<PlusOutlined />} onClick={handleCreateOption}>
          Thêm dòng xe mới
        </Button>
      }>
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
                  {option.modelName}
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
            {selectedVariant.image_url && (
              <Descriptions.Item label="Hình ảnh" span={2}>
                <img 
                  src={selectedVariant.image_url} 
                  alt="Vehicle" 
                  style={{ width: '100%', maxWidth: 400, height: 'auto', borderRadius: 8 }}
                />
              </Descriptions.Item>
            )}
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
            <Descriptions.Item label="Mô tả" span={2}>
              {selectedVariant.description || selectedVariant.features}
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

            <Form.Item name="currentImageUrl" hidden>
              <Input />
            </Form.Item>

            {modalMode === 'edit' && form.getFieldValue('currentImageUrl') && (
              <Form.Item label="Hình ảnh hiện tại">
                <img 
                  src={form.getFieldValue('currentImageUrl')} 
                  alt="Current Vehicle" 
                  style={{ width: '100%', maxWidth: 300, height: 'auto', borderRadius: 8, marginBottom: 8 }}
                />
                <div>
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    Tải ảnh mới ở dưới để thay thế (nếu không chọn ảnh mới, ảnh cũ sẽ được giữ nguyên)
                  </Text>
                </div>
              </Form.Item>
            )}

            <Form.Item
              name="vehicleImage"
              label={modalMode === 'edit' ? 'Thay đổi hình ảnh (không bắt buộc)' : 'Hình ảnh xe'}
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

            {modalMode === 'create' && (
              <>
                <Form.Item
                  name="msrpPrice"
                  label="Giá niêm yết (MSRP) - VNĐ"
                  rules={[{ required: true, message: 'Vui lòng nhập giá niêm yết' }]}
                >
                  <InputNumber
                    min={0}
                    max={10000000000}
                    step={1000000}
                    style={{ width: '100%' }}
                    formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                    parser={value => value.replace(/\$\s?|(,*)/g, '')}
                    placeholder="VD: 1,250,000,000"
                  />
                </Form.Item>

                <Form.Item
                  name="wholesalePrice"
                  label="Giá sỉ (Wholesale) - VNĐ"
                  rules={[{ required: true, message: 'Vui lòng nhập giá sỉ' }]}
                >
                  <InputNumber
                    min={0}
                    max={10000000000}
                    step={1000000}
                    style={{ width: '100%' }}
                    formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                    parser={value => value.replace(/\$\s?|(,*)/g, '')}
                    placeholder="VD: 1,150,000,000"
                  />
                </Form.Item>
              </>
            )}

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

      <Modal
        title={
          <Space>
            <AppstoreOutlined />
            <span>
              {optionModalMode === 'create' ? 'Thêm dòng xe mới' : 'Chỉnh sửa dòng xe'}
            </span>
          </Space>
        }
        open={isOptionModalOpen}
        onCancel={() => setIsOptionModalOpen(false)}
        footer={[
          <Button key="cancel" onClick={() => setIsOptionModalOpen(false)}>
            Hủy
          </Button>,
          <Button key="submit" type="primary" onClick={handleSubmitOption}>
            {optionModalMode === 'create' ? 'Tạo mới' : 'Cập nhật'}
          </Button>
        ]}
        width={600}
      >
        <Form form={optionForm} layout="vertical">
          <Form.Item
            name="modelName"
            label="Tên dòng xe"
            rules={[{ required: true, message: 'Vui lòng nhập tên dòng xe' }]}
          >
            <Input placeholder="VD: Aura Sedan 2025" />
          </Form.Item>

          <Form.Item
            name="description"
            label="Mô tả"
            rules={[{ required: true, message: 'Vui lòng nhập mô tả' }]}
          >
            <Input.TextArea rows={3} placeholder="VD: Sedan điện 5 chỗ, sang trọng, tập trung vào phạm vi hoạt động xa." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
    </Spin>
  );
};

export default VehicleManagementPage;
