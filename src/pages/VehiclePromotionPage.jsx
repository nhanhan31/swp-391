import React, { useState, useEffect } from 'react';
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
  Spin
} from 'antd';
import {
  GiftOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  MoreOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import axios from 'axios';
import { promotionAPI } from '../services/quotationService';
import { vehicleAPI } from '../services/vehicleService';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;
const { Option } = Select;

const AGENCY_API_URL = 'https://agency.agencymanagement.online/api';

const VehiclePromotionPage = () => {
  const [promotions, setPromotions] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [agencies, setAgencies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create'); // 'create' | 'edit' | 'view'
  const [selectedPromotion, setSelectedPromotion] = useState(null);
  const [form] = Form.useForm();

  // Fetch data from API
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch ALL promotions (no agencyId filter), all vehicles, and all agencies
      const [promotionsData, vehiclesData, agenciesResponse] = await Promise.all([
        promotionAPI.getAll(),
        vehicleAPI.getAll(),
        axios.get(`${AGENCY_API_URL}/Agency`, {
          headers: {
            'Authorization': `Bearer ${sessionStorage.getItem('token')}`
          }
        })
      ]);
      
      // Enrich promotions with vehicle and agency info
      const enrichedPromotions = promotionsData.map(promo => {
        const vehicle = vehiclesData.find(v => v.id === promo.vehicleId);
        const agency = (!promo.agencyId || promo.agencyId === 0) ? null : agenciesResponse.data.find(a => a.id === promo.agencyId);
        return {
          ...promo,
          vehicleName: vehicle 
            ? `${vehicle.option?.modelName || vehicle.modelName || ''} ${vehicle.variantName || ''}`.trim() 
            : 'N/A',
          vehicleColor: vehicle?.color || '',
          agencyName: (!promo.agencyId || promo.agencyId === 0) ? 'Toàn quốc' : (agency?.agencyName || 'N/A')
        };
      });

      setPromotions(enrichedPromotions);
      setVehicles(vehiclesData);
      setAgencies(agenciesResponse.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      message.error('Không thể tải dữ liệu');
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(price);
  };

  // Get status info
  const getStatusInfo = (promotion) => {
    const now = dayjs();
    const start = dayjs(promotion.startDate);
    const end = dayjs(promotion.endDate);
    
    if (now.isBefore(start)) {
      return { status: 'scheduled', color: 'blue', text: 'Sắp diễn ra', icon: <ClockCircleOutlined /> };
    }
    if (now.isAfter(end)) {
      return { status: 'expired', color: 'red', text: 'Đã kết thúc', icon: <CloseCircleOutlined /> };
    }
    return { status: 'active', color: 'green', text: 'Đang diễn ra', icon: <CheckCircleOutlined /> };
  };

  // Calculate statistics
  const nationalPromotions = promotions.filter(p => !p.agencyId || p.agencyId === 0);
  const agencyPromotions = promotions.filter(p => p.agencyId && p.agencyId !== 0);
  
  const stats = {
    total: promotions.length,
    national: nationalPromotions.length,
    agency: agencyPromotions.length,
    active: promotions.filter(p => getStatusInfo(p).status === 'active').length,
    scheduled: promotions.filter(p => getStatusInfo(p).status === 'scheduled').length,
    expired: promotions.filter(p => getStatusInfo(p).status === 'expired').length
  };

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
      agencyId: record.agencyId || 0,
      vehicleId: record.vehicleId,
      promoName: record.promoName,
      discountAmount: record.discountAmount,
      date_range: [dayjs(record.startDate), dayjs(record.endDate)]
    });
    setIsModalOpen(true);
  };

  const handleView = (record) => {
    setModalMode('view');
    setSelectedPromotion(record);
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    Modal.confirm({
      title: 'Xác nhận xóa',
      content: 'Bạn có chắc chắn muốn xóa chương trình khuyến mãi này?',
      okText: 'Xóa',
      cancelText: 'Hủy',
      okType: 'danger',
      onOk: async () => {
        try {
          await promotionAPI.delete(id);
          message.success('Đã xóa khuyến mãi thành công');
          await fetchData();
        } catch (error) {
          console.error('Error deleting promotion:', error);
          message.error('Không thể xóa khuyến mãi');
        }
      }
    });
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      const promotionData = {
        vehicleId: values.vehicleId,
        promoName: values.promoName,
        discountAmount: values.discountAmount,
        startDate: values.date_range[0].format('YYYY-MM-DDTHH:mm:ss.SSS[Z]'),
        endDate: values.date_range[1].format('YYYY-MM-DDTHH:mm:ss.SSS[Z]')
      };

      // Only add agencyId if it's not 0 (not national promotion)
      if (values.agencyId !== 0) {
        promotionData.agencyId = values.agencyId;
      }

      if (modalMode === 'create') {
        await promotionAPI.create(promotionData);
        message.success('Tạo khuyến mãi thành công');
      } else if (modalMode === 'edit') {
        await promotionAPI.update(selectedPromotion.id, promotionData);
        message.success('Cập nhật khuyến mãi thành công');
      }

      setIsModalOpen(false);
      form.resetFields();
      await fetchData();
    } catch (error) {
      console.error('Error submitting promotion:', error);
      message.error('Không thể lưu khuyến mãi');
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      fixed: 'left',
      width: 80
    },
    {
      title: 'Tên chương trình',
      dataIndex: 'promoName',
      key: 'promoName',
      width: 220,
      render: (text) => <Text strong>{text}</Text>
    },
    {
      title: 'Phạm vi',
      key: 'agencyName',
      width: 180,
      render: (_, record) => 
        (!record.agencyId || record.agencyId === 0) ? (
          <Tag color="green"> Toàn quốc</Tag>
        ) : (
          <Tag color="purple">{record.agencyName}</Tag>
        )
    },
    {
      title: 'Phiên bản xe',
      dataIndex: 'vehicleName',
      key: 'vehicleName',
      width: 200,
      render: (text, record) => (
        <div>
          <Text strong>{text}</Text>
          {record.vehicleColor && (
            <>
              <br />
              <Tag color="cyan" style={{ fontSize: '11px' }}>{record.vehicleColor}</Tag>
            </>
          )}
        </div>
      )
    },
    {
      title: 'Giảm giá',
      key: 'discount',
      width: 140,
      align: 'right',
      render: (_, record) => (
        <Tag color="red" style={{ fontSize: '14px', fontWeight: 'bold' }}>
          {formatPrice(record.discountAmount)}
        </Tag>
      ),
      sorter: (a, b) => a.discountAmount - b.discountAmount
    },
    {
      title: 'Thời gian',
      key: 'period',
      width: 220,
      render: (_, record) => (
        <div>
          <Text style={{ fontSize: '12px' }}>
            {dayjs(record.startDate).format('DD/MM/YYYY')}
            {' → '}
            {dayjs(record.endDate).format('DD/MM/YYYY')}
          </Text>
        </div>
      )
    },
    {
      title: 'Trạng thái',
      key: 'status',
      width: 140,
      render: (_, record) => {
        const info = getStatusInfo(record);
        return <Tag color={info.color} icon={info.icon}>{info.text}</Tag>;
      }
    },
    {
      title: 'Thao tác',
      key: 'actions',
      fixed: 'right',
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
          },
          {
            type: 'divider'
          },
          {
            key: 'delete',
            icon: <DeleteOutlined />,
            label: 'Xóa',
            danger: true,
            onClick: () => handleDelete(record.id)
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
      <div className="vehicle-promotion-page">
        <div className="page-header" style={{ marginBottom: '24px' }}>
          <Row justify="space-between" align="middle">
            <Col>
              <Title level={2}>
                <GiftOutlined /> Quản lý khuyến mãi (Tất cả đại lý)
              </Title>
              <Text type="secondary">Quản lý các chương trình khuyến mãi của tất cả đại lý</Text>
            </Col>
            <Col>
              <Button type="primary" icon={<PlusOutlined />} size="large" onClick={handleCreate}>
                Tạo khuyến mãi mới
              </Button>
            </Col>
          </Row>
        </div>

        {/* Statistics */}
        <Row gutter={16} style={{ marginBottom: '24px' }}>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <div style={{ textAlign: 'center' }}>
                <GiftOutlined style={{ fontSize: '32px', color: '#1890ff' }} />
                <Title level={2} style={{ margin: '8px 0' }}>
                  {stats.total}
                </Title>
                <Text type="secondary">Tổng chương trình</Text>
              </div>
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <div style={{ textAlign: 'center' }}>
                <GiftOutlined style={{ fontSize: '32px', color: '#52c41a' }} />
                <Title level={2} style={{ margin: '8px 0', color: '#52c41a' }}>
                  {stats.national}
                </Title>
                <Text type="secondary">Toàn quốc</Text>
              </div>
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <div style={{ textAlign: 'center' }}>
                <GiftOutlined style={{ fontSize: '32px', color: '#722ed1' }} />
                <Title level={2} style={{ margin: '8px 0', color: '#722ed1' }}>
                  {stats.agency}
                </Title>
                <Text type="secondary">Theo đại lý</Text>
              </div>
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <div style={{ textAlign: 'center' }}>
                <CheckCircleOutlined style={{ fontSize: '32px', color: '#1890ff' }} />
                <Title level={2} style={{ margin: '8px 0', color: '#1890ff' }}>
                  {stats.active}
                </Title>
                <Text type="secondary">Đang diễn ra</Text>
              </div>
            </Card>
          </Col>
        </Row>

        {/* National Promotions Table */}
        <Card 
          title={
            <span>
              <GiftOutlined style={{ marginRight: '8px', color: '#52c41a' }} />
              Khuyến mãi toàn quốc (Áp dụng cho tất cả đại lý)
            </span>
          }
          style={{ marginBottom: '24px' }}
        >
          <Table
            columns={columns.filter(col => col.key !== 'agencyName')}
            dataSource={nationalPromotions}
            rowKey="id"
            scroll={{ x: 1200 }}
            pagination={{
              pageSize: 10,
              showTotal: (total) => `Tổng ${total} chương trình`
            }}
          />
        </Card>

        {/* Agency Specific Promotions Table */}
        <Card 
          title={
            <span>
              <GiftOutlined style={{ marginRight: '8px', color: '#722ed1' }} />
              Khuyến mãi theo đại lý
            </span>
          }
        >
          <Table
            columns={columns}
            dataSource={agencyPromotions}
            rowKey="id"
            scroll={{ x: 1400 }}
            pagination={{
              pageSize: 10,
              showTotal: (total) => `Tổng ${total} chương trình`
            }}
          />
        </Card>

        {/* Create/Edit Modal */}
        <Modal
          title={modalMode === 'create' ? 'Tạo khuyến mãi mới' : modalMode === 'edit' ? 'Chỉnh sửa khuyến mãi' : 'Chi tiết khuyến mãi'}
          open={isModalOpen}
          onCancel={() => setIsModalOpen(false)}
          onOk={modalMode !== 'view' ? handleSubmit : undefined}
          okText={modalMode === 'create' ? 'Tạo mới' : 'Cập nhật'}
          cancelText={modalMode === 'view' ? 'Đóng' : 'Hủy'}
          width={800}
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
                  <div><Title level={4}>{selectedPromotion.promoName}</Title></div>
                </Col>
                <Col span={12}>
                  <Text type="secondary">Phạm vi áp dụng</Text>
                  <div>
                    {(!selectedPromotion.agencyId || selectedPromotion.agencyId === 0) ? (
                      <Tag color="green" style={{ fontSize: '14px' }}> Toàn quốc</Tag>
                    ) : (
                      <Tag color="purple">{selectedPromotion.agencyName}</Tag>
                    )}
                  </div>
                </Col>
                <Col span={12}>
                  <Text type="secondary">Phiên bản xe</Text>
                  <div>
                    <Text strong>{selectedPromotion.vehicleName}</Text>
                    {selectedPromotion.vehicleColor && (
                      <>
                        {' '}
                        <Tag color="cyan">{selectedPromotion.vehicleColor}</Tag>
                      </>
                    )}
                  </div>
                </Col>
                <Col span={12}>
                  <Text type="secondary">Giảm giá</Text>
                  <div>
                    <Text strong style={{ color: '#f5222d', fontSize: '18px' }}>
                      {formatPrice(selectedPromotion.discountAmount)}
                    </Text>
                  </div>
                </Col>
                <Col span={12}>
                  <Text type="secondary">Trạng thái</Text>
                  <div>
                    {(() => {
                      const info = getStatusInfo(selectedPromotion);
                      return <Tag color={info.color} icon={info.icon}>{info.text}</Tag>;
                    })()}
                  </div>
                </Col>
                <Col span={12}>
                  <Text type="secondary">Ngày bắt đầu</Text>
                  <div><Text strong>{dayjs(selectedPromotion.startDate).format('DD/MM/YYYY')}</Text></div>
                </Col>
                <Col span={12}>
                  <Text type="secondary">Ngày kết thúc</Text>
                  <div><Text strong>{dayjs(selectedPromotion.endDate).format('DD/MM/YYYY')}</Text></div>
                </Col>
              </Row>
            </div>
          ) : (
            <Form form={form} layout="vertical" style={{ marginTop: '24px' }}>
              <Form.Item
                name="agencyId"
                label="Phạm vi áp dụng"
                rules={[{ required: true, message: 'Vui lòng chọn phạm vi áp dụng' }]}
              >
                <Select
                  placeholder="Chọn phạm vi áp dụng khuyến mãi"
                  showSearch
                  optionFilterProp="children"
                >
                  <Option key={0} value={0}>
                    <Text strong style={{ color: '#52c41a' }}> Toàn quốc (Tất cả đại lý)</Text>
                  </Option>
                  {agencies.map(agency => (
                    <Option key={agency.id} value={agency.id}>
                      {agency.agencyName}
                    </Option>
                  ))}
                </Select>
              </Form.Item>

              <Form.Item
                name="vehicleId"
                label="Chọn xe"
                rules={[{ required: true, message: 'Vui lòng chọn xe' }]}
              >
                <Select
                  placeholder="Chọn xe áp dụng khuyến mãi"
                  showSearch
                  optionFilterProp="children"
                >
                  {vehicles.map(vehicle => (
                    <Option key={vehicle.id} value={vehicle.id}>
                      {vehicle.option?.modelName || vehicle.modelName || 'N/A'} - {vehicle.variantName} ({vehicle.color})
                    </Option>
                  ))}
                </Select>
              </Form.Item>

              <Form.Item
                name="promoName"
                label="Tên chương trình khuyến mãi"
                rules={[{ required: true, message: 'Nhập tên chương trình' }]}
              >
                <Input placeholder="VD: Ưu đãi mùa hè 2025" />
              </Form.Item>

              <Form.Item
                name="discountAmount"
                label="Số tiền giảm giá (VNĐ)"
                rules={[{ required: true, message: 'Nhập số tiền giảm giá' }]}
              >
                <InputNumber
                  min={0}
                  style={{ width: '100%' }}
                  formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={(value) => value.replace(/\$\s?|(,*)/g, '')}
                  placeholder="VD: 50000000"
                />
              </Form.Item>

              <Form.Item
                name="date_range"
                label="Thời gian áp dụng"
                rules={[{ required: true, message: 'Chọn thời gian' }]}
              >
                <RangePicker
                  style={{ width: '100%' }}
                  format="DD/MM/YYYY"
                  showTime
                  disabledDate={(current) => current && current < dayjs().startOf('day')}
                />
              </Form.Item>
            </Form>
          )}
        </Modal>
      </div>
    </Spin>
  );
};

export default VehiclePromotionPage;
