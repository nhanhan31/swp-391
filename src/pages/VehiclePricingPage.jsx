import React, { useMemo, useState } from 'react';
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
  message
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
import { vehiclePrices as mockPrices, vehicles, agencies } from '../data/mockData';

dayjs.extend(isBetween);

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

const VehiclePricingPage = () => {
  const [priceList, setPriceList] = useState(mockPrices);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create'); // 'create' | 'edit' | 'view'
  const [selectedPrice, setSelectedPrice] = useState(null);
  const [form] = Form.useForm();

  const priceData = useMemo(() => {
    return priceList.map(price => {
      const vehicle = vehicles.find(v => v.id === price.vehicle_id);
      const agency = agencies.find(a => a.id === price.agency_id);

      return {
        id: price.id,
        vehicle_id: price.vehicle_id,
        vehicle_name: vehicle?.variant_name || 'Chưa xác định',
        vehicle_color: vehicle?.color || '',
        agency_id: price.agency_id,
        agency_name: agency?.agency_name || 'Tất cả đại lý',
        agency_location: agency?.location || '',
        price_type: price.price_type,
        price_amount: price.price_amount,
        start_date: price.start_date,
        end_date: price.end_date
      };
    }).sort((a, b) => dayjs(b.start_date).valueOf() - dayjs(a.start_date).valueOf());
  }, [priceList]);

  const totalPriceRecords = priceData.length;
  const activePrices = priceData.filter(p => dayjs().isBetween(dayjs(p.start_date), dayjs(p.end_date), null, '[]')).length;
  const retailPrices = priceData.filter(p => p.price_type === 'retail').length;
  const wholesalePrices = priceData.filter(p => p.price_type === 'wholesale').length;

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
      vehicle_id: record.vehicle_id,
      agency_id: record.agency_id,
      price_type: record.price_type,
      price_amount: record.price_amount,
      date_range: [dayjs(record.start_date), dayjs(record.end_date)]
    });
    setIsModalOpen(true);
  };

  const handleView = (record) => {
    setModalMode('view');
    setSelectedPrice(record);
    setIsModalOpen(true);
  };

  const handleSubmit = () => {
    form.validateFields().then(values => {
      if (modalMode === 'create') {
        const newPrice = {
          id: priceList.length + 1,
          vehicle_id: values.vehicle_id,
          agency_id: values.agency_id,
          price_type: values.price_type,
          price_amount: values.price_amount,
          start_date: values.date_range[0].format('YYYY-MM-DD'),
          end_date: values.date_range[1].format('YYYY-MM-DD')
        };
        setPriceList([newPrice, ...priceList]);
        message.success('Tạo bảng giá thành công');
      } else if (modalMode === 'edit') {
        const updatedList = priceList.map(price =>
          price.id === selectedPrice.id
            ? {
                ...price,
                vehicle_id: values.vehicle_id,
                agency_id: values.agency_id,
                price_type: values.price_type,
                price_amount: values.price_amount,
                start_date: values.date_range[0].format('YYYY-MM-DD'),
                end_date: values.date_range[1].format('YYYY-MM-DD')
              }
            : price
        );
        setPriceList(updatedList);
        message.success('Cập nhật giá thành công');
      }
      form.resetFields();
      setIsModalOpen(false);
    }).catch(() => {});
  };

  const priceTypeTag = (type) => {
    return type === 'retail' 
      ? <Tag color="blue">Giá lẻ</Tag>
      : <Tag color="green">Giá sỉ</Tag>;
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
      title: 'Đại lý áp dụng',
      dataIndex: 'agency_name',
      key: 'agency_name',
      width: 200,
      render: (text, record) => (
        <div>
          <Text strong>{text}</Text>
          {record.agency_location && (
            <>
              <br />
              <Text type="secondary" style={{ fontSize: '12px' }}>{record.agency_location}</Text>
            </>
          )}
        </div>
      )
    },
    {
      title: 'Loại giá',
      dataIndex: 'price_type',
      key: 'price_type',
      width: 100,
      render: (type) => priceTypeTag(type)
    },
    {
      title: 'Giá bán',
      dataIndex: 'price_amount',
      key: 'price_amount',
      width: 150,
      render: (amount) => (
        <Text strong style={{ color: '#1890ff' }}>
          {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount)}
        </Text>
      ),
      sorter: (a, b) => a.price_amount - b.price_amount
    },
    {
      title: 'Ngày bắt đầu',
      dataIndex: 'start_date',
      key: 'start_date',
      width: 120,
      render: (date) => dayjs(date).format('DD/MM/YYYY')
    },
    {
      title: 'Ngày kết thúc',
      dataIndex: 'end_date',
      key: 'end_date',
      width: 120,
      render: (date) => dayjs(date).format('DD/MM/YYYY')
    },
    {
      title: 'Trạng thái',
      key: 'status',
      width: 120,
      render: (_, record) => {
        const now = dayjs();
        const isActive = now.isBetween(dayjs(record.start_date), dayjs(record.end_date), null, '[]');
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
      <div className="page-header" style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Title level={2}>
            <DollarOutlined /> Quản lý giá bán sỉ
          </Title>
          <Text type="secondary">Quản lý bảng giá xe điện cho các đại lý</Text>
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
              title="Giá lẻ"
              value={retailPrices}
              prefix={<CarOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Giá sỉ"
              value={wholesalePrices}
              prefix={<ShopOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
      </Row>

      <Card title="Danh sách bảng giá">
        <Table
          columns={columns}
          dataSource={priceData}
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
              <Col span={12}>
                <Text type="secondary">Phiên bản xe</Text>
                <div><Text strong>{selectedPrice.vehicle_name}</Text></div>
                <Tag color="cyan">{selectedPrice.vehicle_color}</Tag>
              </Col>
              <Col span={12}>
                <Text type="secondary">Đại lý áp dụng</Text>
                <div><Text strong>{selectedPrice.agency_name}</Text></div>
                {selectedPrice.agency_location && <Text type="secondary">{selectedPrice.agency_location}</Text>}
              </Col>
              <Col span={12}>
                <Text type="secondary">Loại giá</Text>
                <div>{priceTypeTag(selectedPrice.price_type)}</div>
              </Col>
              <Col span={12}>
                <Text type="secondary">Giá bán</Text>
                <div>
                  <Text strong style={{ color: '#1890ff', fontSize: '16px' }}>
                    {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(selectedPrice.price_amount)}
                  </Text>
                </div>
              </Col>
              <Col span={12}>
                <Text type="secondary">Ngày bắt đầu</Text>
                <div><Text strong>{dayjs(selectedPrice.start_date).format('DD/MM/YYYY')}</Text></div>
              </Col>
              <Col span={12}>
                <Text type="secondary">Ngày kết thúc</Text>
                <div><Text strong>{dayjs(selectedPrice.end_date).format('DD/MM/YYYY')}</Text></div>
              </Col>
            </Row>
          </div>
        ) : (
          <Form form={form} layout="vertical">
            <Form.Item
              name="vehicle_id"
              label="Phiên bản xe"
              rules={[{ required: true, message: 'Vui lòng chọn phiên bản' }]}
            >
              <Select placeholder="Chọn phiên bản xe">
                {vehicles.map(vehicle => (
                  <Select.Option key={vehicle.id} value={vehicle.id}>
                    {vehicle.variant_name} - {vehicle.color}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item
              name="agency_id"
              label="Đại lý áp dụng"
              rules={[{ required: true, message: 'Vui lòng chọn đại lý' }]}
            >
              <Select placeholder="Chọn đại lý">
                {agencies.map(agency => (
                  <Select.Option key={agency.id} value={agency.id}>
                    {agency.agency_name} - {agency.location}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item
              name="price_type"
              label="Loại giá"
              rules={[{ required: true, message: 'Vui lòng chọn loại giá' }]}
            >
              <Select placeholder="Chọn loại giá">
                <Select.Option value="retail">Giá lẻ</Select.Option>
                <Select.Option value="wholesale">Giá sỉ</Select.Option>
              </Select>
            </Form.Item>

            <Form.Item
              name="price_amount"
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
    </div>
  );
};

export default VehiclePricingPage;
