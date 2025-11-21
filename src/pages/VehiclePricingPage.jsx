import React, { useMemo, useState, useEffect } from 'react';
import {
  Card,
  Table,
  Row,
  Col,
  Typography,
  Tag,
  Statistic,
  Button,
  Dropdown,
  Modal,
  Form,
  Select,
  InputNumber,
  DatePicker,
  message,
  Spin
} from 'antd';
import {
  DollarOutlined,
  TagsOutlined,
  ShopOutlined,
  CarOutlined,
  PlusOutlined,
  EditOutlined,
  EyeOutlined,
  MoreOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';
import { vehiclePriceAPI, agencyAPI } from '../services/quotationService';
import { vehicleAPI } from '../services/vehicleService';

dayjs.extend(isBetween);

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

const VehiclePricingPage = () => {
  const [priceList, setPriceList] = useState([]);
  const [vehicleList, setVehicleList] = useState([]);
  const [agencyList, setAgencyList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create'); // 'create' | 'edit' | 'view'
  const [selectedPrice, setSelectedPrice] = useState(null);
  const [form] = Form.useForm();

  // Fetch data on mount
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch vehicle prices
      const prices = await vehiclePriceAPI.getAll();
      console.log('Vehicle Prices:', prices);
      setPriceList(prices || []);

      // Fetch vehicles
      const vehicles = await vehicleAPI.getAll();
      console.log('Vehicles:', vehicles);
      setVehicleList(vehicles || []);

      // Fetch agencies
      const agencies = await agencyAPI.getAll();
      console.log('Agencies:', agencies);
      setAgencyList(agencies || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      message.error('Không thể tải dữ liệu');
    } finally {
      setLoading(false);
    }
  };

  const priceData = useMemo(() => {
    return priceList.map(price => {
      const vehicle = vehicleList.find(v => v.id === price.vehicleId);
      const agency = agencyList.find(a => a.id === price.agencyId);

      return {
        id: price.id,
        vehicleId: price.vehicleId,
        vehicle_name: vehicle?.variantName || 'Chưa xác định',
        vehicle_color: vehicle?.color || '',
        agencyId: price.agencyId,
        agency_name: agency?.agencyName || 'Tất cả đại lý',
        agency_location: agency?.location || '',
        priceType: price.priceType,
        priceAmount: price.priceAmount,
        startDate: price.startDate,
        endDate: price.endDate
      };
    }).sort((a, b) => dayjs(b.startDate).valueOf() - dayjs(a.startDate).valueOf());
  }, [priceList, vehicleList, agencyList]);

  const totalPriceRecords = priceData.length;
  const activePrices = priceData.filter(p => dayjs().isBetween(dayjs(p.startDate), dayjs(p.endDate), null, '[]')).length;
  const msrpPrices = priceData.filter(p => p.priceType?.toUpperCase() === 'MSRP').length;
  const wholesalePrices = priceData.filter(p => p.priceType?.toUpperCase() === 'WHOLESALE').length;

  const handleCreate = () => {
    setModalMode('create');
    setSelectedPrice(null);
    form.resetFields();
    setIsModalOpen(true);
  };

  const handleEdit = (record) => {
    setModalMode('edit');
    setSelectedPrice(record);
    form.setFieldsValue({
      vehicleId: record.vehicleId,
      priceType: record.priceType,
      priceAmount: record.priceAmount,
      date_range: [dayjs(record.startDate), dayjs(record.endDate)]
    });
    setIsModalOpen(true);
  };

  const handleView = (record) => {
    setModalMode('view');
    setSelectedPrice(record);
    setIsModalOpen(true);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      const priceData = {
        vehicleId: values.vehicleId,
        agencyId: 1,
        priceType: values.priceType,
        priceAmount: values.priceAmount,
        startDate: values.date_range[0].format('YYYY-MM-DDTHH:mm:ss.SSS[Z]'),
        endDate: values.date_range[1].format('YYYY-MM-DDTHH:mm:ss.SSS[Z]')
      };

      if (modalMode === 'create') {
        await vehiclePriceAPI.create(priceData);
        message.success('Tạo bảng giá thành công');
      } else if (modalMode === 'edit') {
        await vehiclePriceAPI.update(selectedPrice.id, priceData);
        message.success('Cập nhật bảng giá thành công');
      }

      await fetchData();
      form.resetFields();
      setIsModalOpen(false);
    } catch (error) {
      console.error('Error submitting price:', error);
      message.error('Lỗi khi lưu bảng giá');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (record) => {
    try {
      setLoading(true);
      await vehiclePriceAPI.delete(record.id);
      message.success('Xóa bảng giá thành công');
      await fetchData();
    } catch (error) {
      console.error('Error deleting price:', error);
      message.error('Lỗi khi xóa bảng giá');
    } finally {
      setLoading(false);
    }
  };

  const priceTypeTag = (type) => {
    const typeStr = type?.toUpperCase();
    return typeStr === 'MSRP' 
      ? <Tag color="blue">Giá niêm yết (MSRP)</Tag>
      : <Tag color="green">Giá sỉ (Wholesale)</Tag>;
  };

  const columns = [
    {
      title: 'Phiên bản xe',
      dataIndex: 'vehicle_name',
      key: 'vehicle_name',
      width: 220,
      render: (text, record) => (
        <div>
          <Text strong>{text}</Text>
          <br />
          <Tag color="cyan" style={{ fontSize: '11px' }}>{record.vehicle_color}</Tag>
        </div>
      )
    },
    {
      title: 'Loại giá',
      dataIndex: 'priceType',
      key: 'priceType',
      width: 130,
      render: (type) => priceTypeTag(type)
    },
    {
      title: 'Giá bán',
      dataIndex: 'priceAmount',
      key: 'priceAmount',
      width: 150,
      render: (amount) => (
        <Text strong style={{ color: '#1890ff' }}>
          {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount)}
        </Text>
      ),
      sorter: (a, b) => a.priceAmount - b.priceAmount
    },
    {
      title: 'Ngày bắt đầu',
      dataIndex: 'startDate',
      key: 'startDate',
      width: 120,
      render: (date) => dayjs(date).format('DD/MM/YYYY')
    },
    {
      title: 'Ngày kết thúc',
      dataIndex: 'endDate',
      key: 'endDate',
      width: 120,
      render: (date) => dayjs(date).format('DD/MM/YYYY')
    },
    {
      title: 'Trạng thái',
      key: 'status',
      width: 120,
      render: (_, record) => {
        const now = dayjs();
        const isActive = now.isBetween(dayjs(record.startDate), dayjs(record.endDate), null, '[]');
        return isActive 
          ? <Tag color="green">Đang áp dụng</Tag>
          : <Tag color="gray">Hết hạn</Tag>;
      }
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
            onClick: () => handleView(record)
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
    <div className="vehicle-pricing-page">
      <Spin spinning={loading}>
        <div className="page-header" style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <Title level={2}>
              <DollarOutlined /> Quản lý giá xe điện
            </Title>
            <Text type="secondary">Quản lý giá niêm yết (MSRP) và giá sỉ (Wholesale) cho các đại lý</Text>
          </div>
          <Button type="primary" icon={<PlusOutlined />} size="large" onClick={handleCreate}>
            Tạo bảng giá mới
          </Button>
        </div>

      <Row gutter={16} style={{ marginBottom: '24px' }}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Tổng bảng giá"
              value={totalPriceRecords}
              prefix={<TagsOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Đang áp dụng"
              value={activePrices}
              prefix={<DollarOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Giá niêm yết (MSRP)"
              value={msrpPrices}
              prefix={<CarOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Giá sỉ (Wholesale)"
              value={wholesalePrices}
              prefix={<ShopOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
      </Row>

      <Card title="Bảng giá niêm yết (MSRP)" style={{ marginBottom: '24px' }}>
        <Table
          columns={columns}
          dataSource={priceData.filter(p => p.priceType?.toUpperCase() === 'MSRP')}
          rowKey="id"
          scroll={{ x: 1200 }}
          pagination={{
            pageSize: 10,
            showTotal: (total) => `Tổng ${total} bảng giá`
          }}
        />
      </Card>

      <Card title="Bảng giá sỉ (Wholesale)">
        <Table
          columns={columns}
          dataSource={priceData.filter(p => p.priceType?.toUpperCase() === 'WHOLESALE')}
          rowKey="id"
          scroll={{ x: 1200 }}
          pagination={{
            pageSize: 10,
            showTotal: (total) => `Tổng ${total} bảng giá`
          }}
        />
      </Card>

      <Modal
        title={modalMode === 'create' ? 'Tạo bảng giá mới' : modalMode === 'edit' ? 'Chỉnh sửa bảng giá' : 'Chi tiết bảng giá'}
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        onOk={modalMode !== 'view' ? handleSubmit : undefined}
        okText={modalMode === 'create' ? 'Tạo bảng giá' : 'Cập nhật'}
        cancelText={modalMode === 'view' ? 'Đóng' : 'Hủy'}
        width={600}
        footer={modalMode === 'view' ? [
          <Button key="close" type="primary" onClick={() => setIsModalOpen(false)}>
            Đóng
          </Button>
        ] : undefined}
      >
        {modalMode === 'view' && selectedPrice ? (
          <div style={{ padding: '16px 0' }}>
            <Row gutter={[16, 16]}>
              <Col span={24}>
                <Text type="secondary">Phiên bản xe</Text>
                <div><Text strong>{selectedPrice.vehicle_name}</Text></div>
                <Tag color="cyan">{selectedPrice.vehicle_color}</Tag>
              </Col>
              <Col span={12}>
                <Text type="secondary">Loại giá</Text>
                <div>{priceTypeTag(selectedPrice.priceType)}</div>
              </Col>
              <Col span={12}>
                <Text type="secondary">Giá bán</Text>
                <div>
                  <Text strong style={{ color: '#1890ff', fontSize: '16px' }}>
                    {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(selectedPrice.priceAmount)}
                  </Text>
                </div>
              </Col>
              <Col span={12}>
                <Text type="secondary">Ngày bắt đầu</Text>
                <div><Text strong>{dayjs(selectedPrice.startDate).format('DD/MM/YYYY')}</Text></div>
              </Col>
              <Col span={12}>
                <Text type="secondary">Ngày kết thúc</Text>
                <div><Text strong>{dayjs(selectedPrice.endDate).format('DD/MM/YYYY')}</Text></div>
              </Col>
            </Row>
          </div>
        ) : (
          <Form form={form} layout="vertical">
            <Form.Item
              name="vehicleId"
              label="Phiên bản xe"
              rules={[{ required: true, message: 'Vui lòng chọn phiên bản' }]}
            >
              <Select placeholder="Chọn phiên bản xe" showSearch filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }>
                {vehicleList.map(vehicle => (
                  <Select.Option 
                    key={vehicle.id} 
                    value={vehicle.id}
                    label={`${vehicle.variantName} - ${vehicle.color}`}
                  >
                    {vehicle.variantName} - {vehicle.color}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item
              name="priceType"
              label="Loại giá"
              rules={[{ required: true, message: 'Vui lòng chọn loại giá' }]}
            >
              <Select placeholder="Chọn loại giá" disabled={modalMode === 'edit'}>
                <Select.Option value="MSRP">Giá niêm yết (MSRP)</Select.Option>
                <Select.Option value="Wholesale">Giá sỉ (Wholesale)</Select.Option>
              </Select>
            </Form.Item>

            <Form.Item
              name="priceAmount"
              label="Giá bán (VNĐ)"
              rules={[{ required: true, message: 'Vui lòng nhập giá bán' }]}
            >
              <InputNumber
                min={0}
                max={10000000000}
                step={1000000}
                style={{ width: '100%' }}
                formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                parser={value => value.replace(/\$\s?|(,*)/g, '')}
              />
            </Form.Item>

            <Form.Item
              name="date_range"
              label="Thời gian áp dụng"
              rules={[{ required: true, message: 'Vui lòng chọn thời gian' }]}
            >
              <RangePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
            </Form.Item>
          </Form>
        )}
      </Modal>
      </Spin>
    </div>
  );
};

export default VehiclePricingPage;
