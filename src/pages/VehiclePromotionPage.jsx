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
  Input,
  InputNumber,
  DatePicker,
  message,
  Progress
} from 'antd';
import {
  GiftOutlined,
  PercentageOutlined,
  CarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  PlusOutlined,
  EditOutlined,
  EyeOutlined,
  MoreOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { vehiclePromotions as mockPromotions, vehicles } from '../data/mockData';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;
const { TextArea } = Input;

const VehiclePromotionPage = () => {
  const [promotionList, setPromotionList] = useState(mockPromotions);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create'); // 'create' | 'edit' | 'view'
  const [selectedPromotion, setSelectedPromotion] = useState(null);
  const [form] = Form.useForm();

  const promotionData = useMemo(() => {
    return promotionList.map(promo => {
      const vehicle = vehicles.find(v => v.id === promo.vehicle_id);
      const now = dayjs();
      const start = dayjs(promo.start_date);
      const end = dayjs(promo.end_date);
      
      let status = 'scheduled';
      if (now.isBefore(start)) {
        status = 'scheduled';
      } else if (now.isAfter(end)) {
        status = 'expired';
      } else {
        status = 'active';
      }

      const totalDays = end.diff(start, 'day');
      const passedDays = now.diff(start, 'day');
      const progress = status === 'active' ? Math.min(100, Math.max(0, (passedDays / totalDays) * 100)) : 0;

      return {
        id: promo.id,
        vehicle_id: promo.vehicle_id,
        vehicle_name: vehicle?.variant_name || 'Chưa xác định',
        vehicle_color: vehicle?.color || '',
        promo_name: promo.promo_name,
        discount_amount: promo.discount_amount,
        start_date: promo.start_date,
        end_date: promo.end_date,
        status,
        progress,
        description: promo.description || ''
      };
    }).sort((a, b) => dayjs(b.start_date).valueOf() - dayjs(a.start_date).valueOf());
  }, [promotionList]);

  const totalPromotions = promotionData.length;
  const activePromotions = promotionData.filter(p => p.status === 'active').length;
  const scheduledPromotions = promotionData.filter(p => p.status === 'scheduled').length;
  const expiredPromotions = promotionData.filter(p => p.status === 'expired').length;

  const handleCreate = () => {
    setModalMode('create');
    setSelectedPromotion(null);
    form.resetFields();
    setIsModalOpen(true);
  };

  const handleEdit = (record) => {
    setModalMode('edit');
    setSelectedPromotion(record);
    form.setFieldsValue({
      vehicle_id: record.vehicle_id,
      promo_name: record.promo_name,
      discount_amount: record.discount_amount,
      date_range: [dayjs(record.start_date), dayjs(record.end_date)],
      description: record.description
    });
    setIsModalOpen(true);
  };

  const handleView = (record) => {
    setModalMode('view');
    setSelectedPromotion(record);
    setIsModalOpen(true);
  };

  const handleSubmit = () => {
    form.validateFields().then(values => {
      if (modalMode === 'create') {
        const newPromotion = {
          id: promotionList.length + 1,
          vehicle_id: values.vehicle_id,
          promo_name: values.promo_name,
          discount_amount: values.discount_amount,
          start_date: values.date_range[0].format('YYYY-MM-DD'),
          end_date: values.date_range[1].format('YYYY-MM-DD'),
          description: values.description || ''
        };
        setPromotionList([newPromotion, ...promotionList]);
        message.success('Tạo chương trình khuyến mãi thành công');
      } else if (modalMode === 'edit') {
        const updatedList = promotionList.map(promo =>
          promo.id === selectedPromotion.id
            ? {
                ...promo,
                vehicle_id: values.vehicle_id,
                promo_name: values.promo_name,
                discount_amount: values.discount_amount,
                start_date: values.date_range[0].format('YYYY-MM-DD'),
                end_date: values.date_range[1].format('YYYY-MM-DD'),
                description: values.description || ''
              }
            : promo
        );
        setPromotionList(updatedList);
        message.success('Cập nhật khuyến mãi thành công');
      }
      form.resetFields();
      setIsModalOpen(false);
    }).catch(() => {});
  };

  const statusMeta = (status) => {
    switch (status) {
      case 'active':
        return { color: 'green', text: 'Đang diễn ra', icon: <CheckCircleOutlined /> };
      case 'expired':
        return { color: 'red', text: 'Đã kết thúc', icon: <CloseCircleOutlined /> };
      default:
        return { color: 'blue', text: 'Sắp diễn ra', icon: <ClockCircleOutlined /> };
    }
  };

  const columns = [
    {
      title: 'Tên chương trình',
      dataIndex: 'promo_name',
      key: 'promo_name',
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
      title: 'Giảm giá',
      dataIndex: 'discount_amount',
      key: 'discount_amount',
      width: 140,
      render: (amount) => (
        <Text strong style={{ color: '#f5222d' }}>
          {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount)}
        </Text>
      ),
      sorter: (a, b) => a.discount_amount - b.discount_amount
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
      title: 'Tiến độ',
      key: 'progress',
      width: 140,
      render: (_, record) => {
        if (record.status === 'active') {
          return (
            <Progress
              percent={Math.round(record.progress)}
              size="small"
              status="active"
            />
          );
        }
        return <Text type="secondary">—</Text>;
      }
    },
    {
      title: 'Trạng thái',
      key: 'status',
      width: 140,
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
    <div className="vehicle-promotion-page">
      <div className="page-header" style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Title level={2}>
            <GiftOutlined /> Chính sách khuyến mãi
          </Title>
          <Text type="secondary">Quản lý các chương trình khuyến mãi xe điện</Text>
        </div>
        <Button type="primary" icon={<PlusOutlined />} size="large" onClick={handleCreate}>
          Tạo khuyến mãi mới
        </Button>
      </div>

      <Row gutter={16} style={{ marginBottom: '24px' }}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Tổng chương trình"
              value={totalPromotions}
              prefix={<GiftOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Đang diễn ra"
              value={activePromotions}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Sắp diễn ra"
              value={scheduledPromotions}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Đã kết thúc"
              value={expiredPromotions}
              prefix={<CloseCircleOutlined />}
              valueStyle={{ color: '#8c8c8c' }}
            />
          </Card>
        </Col>
      </Row>

      <Card title="Danh sách chương trình khuyến mãi">
        <Table
          columns={columns}
          dataSource={promotionData}
          rowKey="id"
          scroll={{ x: 1200 }}
          pagination={{
            pageSize: 10,
            showTotal: (total) => `Tổng ${total} chương trình`
          }}
        />
      </Card>

      <Modal
        title={modalMode === 'create' ? 'Tạo khuyến mãi mới' : modalMode === 'edit' ? 'Chỉnh sửa khuyến mãi' : 'Chi tiết khuyến mãi'}
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        onOk={modalMode !== 'view' ? handleSubmit : undefined}
        okText={modalMode === 'create' ? 'Tạo khuyến mãi' : 'Cập nhật'}
        cancelText={modalMode === 'view' ? 'Đóng' : 'Hủy'}
        width={600}
        footer={modalMode === 'view' ? [
          <Button key="close" type="primary" onClick={() => setIsModalOpen(false)}>
            Đóng
          </Button>
        ] : undefined}
      >
        {modalMode === 'view' && selectedPromotion ? (
          <div style={{ padding: '16px 0' }}>
            <Row gutter={[16, 16]}>
              <Col span={24}>
                <Text type="secondary">Tên chương trình</Text>
                <div><Title level={4}>{selectedPromotion.promo_name}</Title></div>
              </Col>
              <Col span={24}>
                <Text type="secondary">Phiên bản xe</Text>
                <div>
                  <Text strong>{selectedPromotion.vehicle_name}</Text>
                  {' '}
                  <Tag color="cyan">{selectedPromotion.vehicle_color}</Tag>
                </div>
              </Col>
              <Col span={12}>
                <Text type="secondary">Giảm giá</Text>
                <div>
                  <Text strong style={{ color: '#f5222d', fontSize: '18px' }}>
                    {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(selectedPromotion.discount_amount)}
                  </Text>
                </div>
              </Col>
              <Col span={12}>
                <Text type="secondary">Trạng thái</Text>
                <div>
                  {(() => {
                    const meta = statusMeta(selectedPromotion.status);
                    return <Tag color={meta.color} icon={meta.icon}>{meta.text}</Tag>;
                  })()}
                </div>
              </Col>
              <Col span={12}>
                <Text type="secondary">Ngày bắt đầu</Text>
                <div><Text strong>{dayjs(selectedPromotion.start_date).format('DD/MM/YYYY')}</Text></div>
              </Col>
              <Col span={12}>
                <Text type="secondary">Ngày kết thúc</Text>
                <div><Text strong>{dayjs(selectedPromotion.end_date).format('DD/MM/YYYY')}</Text></div>
              </Col>
              {selectedPromotion.status === 'active' && (
                <Col span={24}>
                  <Text type="secondary">Tiến độ chương trình</Text>
                  <div style={{ marginTop: '8px' }}>
                    <Progress percent={Math.round(selectedPromotion.progress)} status="active" />
                  </div>
                </Col>
              )}
              {selectedPromotion.description && (
                <Col span={24}>
                  <Text type="secondary">Mô tả</Text>
                  <div><Text>{selectedPromotion.description}</Text></div>
                </Col>
              )}
            </Row>
          </div>
        ) : (
          <Form form={form} layout="vertical">
            <Form.Item
              name="promo_name"
              label="Tên chương trình"
              rules={[{ required: true, message: 'Vui lòng nhập tên chương trình' }]}
            >
              <Input placeholder="VD: Ưu đãi xe điện xanh" />
            </Form.Item>

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
              name="discount_amount"
              label="Mức giảm giá (VNĐ)"
              rules={[{ required: true, message: 'Vui lòng nhập mức giảm giá' }]}
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

            <Form.Item
              name="date_range"
              label="Thời gian khuyến mãi"
              rules={[{ required: true, message: 'Vui lòng chọn thời gian' }]}
            >
              <RangePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
            </Form.Item>

            <Form.Item
              name="description"
              label="Mô tả (tùy chọn)"
            >
              <TextArea rows={4} placeholder="Mô tả chi tiết về chương trình khuyến mãi" />
            </Form.Item>
          </Form>
        )}
      </Modal>
    </div>
  );
};

export default VehiclePromotionPage;
