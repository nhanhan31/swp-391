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
  Input,
  message
} from 'antd';
import {
  PercentageOutlined,
  TagsOutlined,
  ShopOutlined,
  CarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  PlusOutlined,
  EditOutlined,
  EyeOutlined,
  MoreOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { vehicles, agencies } from '../data/mockData';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;
const { TextArea } = Input;

// Mock data for discounts
const mockDiscounts = [
  {
    id: 1,
    vehicle_id: 1,
    agency_id: 1,
    discount_name: 'Chiết khấu cuối năm VF5',
    discount_percentage: 5,
    discount_amount: 22900000,
    start_date: '2025-10-01',
    end_date: '2025-12-31',
    description: 'Chiết khấu cho đại lý đạt doanh số tốt'
  },
  {
    id: 2,
    vehicle_id: 7,
    agency_id: 2,
    discount_name: 'Chiết khấu VF8 Eco Q4',
    discount_percentage: 3,
    discount_amount: 36000000,
    start_date: '2025-10-01',
    end_date: '2025-12-31',
    description: 'Ưu đãi cho đại lý khu vực phía Nam'
  }
];

const VehicleDiscountPage = () => {
  const [discountList, setDiscountList] = useState(mockDiscounts);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create'); // 'create' | 'edit' | 'view'
  const [selectedDiscount, setSelectedDiscount] = useState(null);
  const [form] = Form.useForm();

  const discountData = useMemo(() => {
    return discountList.map(discount => {
      const vehicle = vehicles.find(v => v.id === discount.vehicle_id);
      const agency = agencies.find(a => a.id === discount.agency_id);
      
      const now = dayjs();
      const startDate = dayjs(discount.start_date);
      const endDate = dayjs(discount.end_date);
      
      let status = 'scheduled';
      if (now.isBefore(startDate)) {
        status = 'scheduled';
      } else if (now.isAfter(endDate)) {
        status = 'expired';
      } else {
        status = 'active';
      }

      return {
        id: discount.id,
        vehicle_id: discount.vehicle_id,
        vehicle_name: vehicle?.variant_name || 'Chưa xác định',
        vehicle_color: vehicle?.color || '',
        agency_id: discount.agency_id,
        agency_name: agency?.agency_name || 'Tất cả đại lý',
        agency_location: agency?.location || '',
        discount_name: discount.discount_name,
        discount_percentage: discount.discount_percentage,
        discount_amount: discount.discount_amount,
        start_date: discount.start_date,
        end_date: discount.end_date,
        description: discount.description || '',
        status
      };
    }).sort((a, b) => dayjs(b.start_date).valueOf() - dayjs(a.start_date).valueOf());
  }, [discountList]);

  const totalDiscounts = discountData.length;
  const activeDiscounts = discountData.filter(d => d.status === 'active').length;
  const scheduledDiscounts = discountData.filter(d => d.status === 'scheduled').length;
  const avgDiscountRate = discountData.length > 0
    ? Math.round(discountData.reduce((sum, d) => sum + d.discount_percentage, 0) / discountData.length)
    : 0;

  const handleCreate = () => {
    setModalMode('create');
    setSelectedDiscount(null);
    form.resetFields();
    setIsModalOpen(true);
  };

  const handleEdit = (record) => {
    setModalMode('edit');
    setSelectedDiscount(record);
    form.setFieldsValue({
      vehicle_id: record.vehicle_id,
      agency_id: record.agency_id,
      discount_name: record.discount_name,
      discount_percentage: record.discount_percentage,
      discount_amount: record.discount_amount,
      date_range: [dayjs(record.start_date), dayjs(record.end_date)],
      description: record.description
    });
    setIsModalOpen(true);
  };

  const handleView = (record) => {
    setModalMode('view');
    setSelectedDiscount(record);
    setIsModalOpen(true);
  };

  const handleSubmit = () => {
    form.validateFields().then(values => {
      if (modalMode === 'create') {
        const newDiscount = {
          id: discountList.length + 1,
          vehicle_id: values.vehicle_id,
          agency_id: values.agency_id,
          discount_name: values.discount_name,
          discount_percentage: values.discount_percentage,
          discount_amount: values.discount_amount,
          start_date: values.date_range[0].format('YYYY-MM-DD'),
          end_date: values.date_range[1].format('YYYY-MM-DD'),
          description: values.description || ''
        };
        setDiscountList([newDiscount, ...discountList]);
        message.success('Tạo chiết khấu thành công');
      } else if (modalMode === 'edit') {
        const updatedList = discountList.map(discount =>
          discount.id === selectedDiscount.id
            ? {
                ...discount,
                vehicle_id: values.vehicle_id,
                agency_id: values.agency_id,
                discount_name: values.discount_name,
                discount_percentage: values.discount_percentage,
                discount_amount: values.discount_amount,
                start_date: values.date_range[0].format('YYYY-MM-DD'),
                end_date: values.date_range[1].format('YYYY-MM-DD'),
                description: values.description || ''
              }
            : discount
        );
        setDiscountList(updatedList);
        message.success('Cập nhật chiết khấu thành công');
      }
      form.resetFields();
      setIsModalOpen(false);
    }).catch(() => {});
  };

  const statusMeta = (status) => {
    switch (status) {
      case 'active':
        return { color: 'green', text: 'Đang áp dụng', icon: <CheckCircleOutlined /> };
      case 'expired':
        return { color: 'red', text: 'Đã hết hạn', icon: <ClockCircleOutlined /> };
      default:
        return { color: 'blue', text: 'Sắp diễn ra', icon: <ClockCircleOutlined /> };
    }
  };

  const columns = [
    {
      title: 'Tên chiết khấu',
      dataIndex: 'discount_name',
      key: 'discount_name',
      width: 220,
      render: (text) => <Text strong>{text}</Text>
    },
    {
      title: 'Phiên bản xe',
      dataIndex: 'vehicle_name',
      key: 'vehicle_name',
      width: 200,
      render: (text, record) => (
        <div>
          <Text strong>{text}</Text>
          <br />
          <Tag color="cyan" style={{ fontSize: '11px' }}>{record.vehicle_color}</Tag>
        </div>
      )
    },
    {
      title: 'Đại lý',
      dataIndex: 'agency_name',
      key: 'agency_name',
      width: 180,
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
      title: 'Tỷ lệ',
      dataIndex: 'discount_percentage',
      key: 'discount_percentage',
      width: 100,
      render: (percentage) => (
        <Tag color="purple" icon={<PercentageOutlined />}>
          {percentage}%
        </Tag>
      ),
      sorter: (a, b) => a.discount_percentage - b.discount_percentage
    },
    {
      title: 'Giá trị',
      dataIndex: 'discount_amount',
      key: 'discount_amount',
      width: 140,
      render: (amount) => (
        <Text strong style={{ color: '#f5222d' }}>
          {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount)}
        </Text>
      )
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
      width: 130,
      render: (_, record) => {
        const meta = statusMeta(record.status);
        return <Tag color={meta.color} icon={meta.icon}>{meta.text}</Tag>;
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
    <div className="vehicle-discount-page">
      <div className="page-header" style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Title level={2}>
            <PercentageOutlined /> Quản lý chiết khấu
          </Title>
          <Text type="secondary">Quản lý chính sách chiết khấu cho đại lý</Text>
        </div>
        <Button type="primary" icon={<PlusOutlined />} size="large" onClick={handleCreate}>
          Tạo chiết khấu mới
        </Button>
      </div>

      <Row gutter={16} style={{ marginBottom: '24px' }}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Tổng chiết khấu"
              value={totalDiscounts}
              prefix={<TagsOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Đang áp dụng"
              value={activeDiscounts}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Sắp diễn ra"
              value={scheduledDiscounts}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Tỷ lệ trung bình"
              value={avgDiscountRate}
              suffix="%"
              prefix={<PercentageOutlined />}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
      </Row>

      <Card title="Danh sách chiết khấu">
        <Table
          columns={columns}
          dataSource={discountData}
          rowKey="id"
          scroll={{ x: 1300 }}
          pagination={{
            pageSize: 10,
            showTotal: (total) => `Tổng ${total} chiết khấu`
          }}
        />
      </Card>

      <Modal
        title={modalMode === 'create' ? 'Tạo chiết khấu mới' : modalMode === 'edit' ? 'Chỉnh sửa chiết khấu' : 'Chi tiết chiết khấu'}
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        onOk={modalMode !== 'view' ? handleSubmit : undefined}
        okText={modalMode === 'create' ? 'Tạo chiết khấu' : 'Cập nhật'}
        cancelText={modalMode === 'view' ? 'Đóng' : 'Hủy'}
        width={650}
        footer={modalMode === 'view' ? [
          <Button key="close" type="primary" onClick={() => setIsModalOpen(false)}>
            Đóng
          </Button>
        ] : undefined}
      >
        {modalMode === 'view' && selectedDiscount ? (
          <div style={{ padding: '16px 0' }}>
            <Row gutter={[16, 16]}>
              <Col span={24}>
                <Text type="secondary">Tên chiết khấu</Text>
                <div><Title level={4}>{selectedDiscount.discount_name}</Title></div>
              </Col>
              <Col span={12}>
                <Text type="secondary">Phiên bản xe</Text>
                <div>
                  <Text strong>{selectedDiscount.vehicle_name}</Text>
                  {' '}
                  <Tag color="cyan">{selectedDiscount.vehicle_color}</Tag>
                </div>
              </Col>
              <Col span={12}>
                <Text type="secondary">Đại lý</Text>
                <div>
                  <Text strong>{selectedDiscount.agency_name}</Text>
                  {selectedDiscount.agency_location && (
                    <>
                      <br />
                      <Text type="secondary">{selectedDiscount.agency_location}</Text>
                    </>
                  )}
                </div>
              </Col>
              <Col span={12}>
                <Text type="secondary">Tỷ lệ chiết khấu</Text>
                <div>
                  <Tag color="purple" icon={<PercentageOutlined />} style={{ fontSize: '16px', padding: '4px 12px' }}>
                    {selectedDiscount.discount_percentage}%
                  </Tag>
                </div>
              </Col>
              <Col span={12}>
                <Text type="secondary">Giá trị chiết khấu</Text>
                <div>
                  <Text strong style={{ color: '#f5222d', fontSize: '18px' }}>
                    {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(selectedDiscount.discount_amount)}
                  </Text>
                </div>
              </Col>
              <Col span={12}>
                <Text type="secondary">Ngày bắt đầu</Text>
                <div><Text strong>{dayjs(selectedDiscount.start_date).format('DD/MM/YYYY')}</Text></div>
              </Col>
              <Col span={12}>
                <Text type="secondary">Ngày kết thúc</Text>
                <div><Text strong>{dayjs(selectedDiscount.end_date).format('DD/MM/YYYY')}</Text></div>
              </Col>
              <Col span={24}>
                <Text type="secondary">Trạng thái</Text>
                <div>
                  {(() => {
                    const meta = statusMeta(selectedDiscount.status);
                    return <Tag color={meta.color} icon={meta.icon} style={{ fontSize: '14px' }}>{meta.text}</Tag>;
                  })()}
                </div>
              </Col>
              {selectedDiscount.description && (
                <Col span={24}>
                  <Text type="secondary">Mô tả</Text>
                  <div><Text>{selectedDiscount.description}</Text></div>
                </Col>
              )}
            </Row>
          </div>
        ) : (
          <Form form={form} layout="vertical">
            <Form.Item
              name="discount_name"
              label="Tên chiết khấu"
              rules={[{ required: true, message: 'Vui lòng nhập tên chiết khấu' }]}
            >
              <Input placeholder="VD: Chiết khấu cuối năm VF5" />
            </Form.Item>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="vehicle_id"
                  label="Phiên bản xe"
                  rules={[{ required: true, message: 'Vui lòng chọn phiên bản' }]}
                >
                  <Select placeholder="Chọn phiên bản xe" suffixIcon={<CarOutlined />}>
                    {vehicles.map(vehicle => (
                      <Select.Option key={vehicle.id} value={vehicle.id}>
                        {vehicle.variant_name} - {vehicle.color}
                      </Select.Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="agency_id"
                  label="Đại lý áp dụng"
                  rules={[{ required: true, message: 'Vui lòng chọn đại lý' }]}
                >
                  <Select placeholder="Chọn đại lý" suffixIcon={<ShopOutlined />}>
                    {agencies.map(agency => (
                      <Select.Option key={agency.id} value={agency.id}>
                        {agency.agency_name} - {agency.location}
                      </Select.Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="discount_percentage"
                  label="Tỷ lệ chiết khấu (%)"
                  rules={[{ required: true, message: 'Vui lòng nhập tỷ lệ' }]}
                >
                  <InputNumber
                    min={0}
                    max={100}
                    step={0.5}
                    style={{ width: '100%' }}
                    suffix="%"
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="discount_amount"
                  label="Giá trị chiết khấu (VNĐ)"
                  rules={[{ required: true, message: 'Vui lòng nhập giá trị' }]}
                >
                  <InputNumber
                    min={0}
                    max={1000000000}
                    step={1000000}
                    style={{ width: '100%' }}
                    formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                    parser={value => value.replace(/\$\s?|(,*)/g, '')}
                  />
                </Form.Item>
              </Col>
            </Row>

            <Form.Item
              name="date_range"
              label="Thời gian áp dụng"
              rules={[{ required: true, message: 'Vui lòng chọn thời gian' }]}
            >
              <RangePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
            </Form.Item>

            <Form.Item
              name="description"
              label="Mô tả (tùy chọn)"
            >
              <TextArea rows={3} placeholder="Mô tả chi tiết về chính sách chiết khấu" />
            </Form.Item>
          </Form>
        )}
      </Modal>
    </div>
  );
};

export default VehicleDiscountPage;
