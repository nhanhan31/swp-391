import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Tag,
  Modal,
  Form,
  Input,
  InputNumber,
  DatePicker,
  Select,
  Row,
  Col,
  Typography,
  message,
  Tooltip,
  Badge,
  Switch,
  Dropdown,
  Spin
} from 'antd';
import {
  GiftOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  MoreOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { promotionAPI } from '../services/quotationService';
import { vehicleAPI } from '../services/vehicleService';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;
const { Option } = Select;
const { TextArea } = Input;

const PromotionPage = () => {
  const [promotions, setPromotions] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [selectedPromotion, setSelectedPromotion] = useState(null);
  const [form] = Form.useForm();

  // Get agencyId from sessionStorage
  const getAgencyId = () => {
    const userInfo = JSON.parse(sessionStorage.getItem('agency_id') || '{}');
    return userInfo;
  };

  // Fetch data from API
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const agencyId = getAgencyId();
      
      // Fetch all promotions (national + agency) and vehicles
      const [allPromotionsData, vehiclesData] = await Promise.all([
        promotionAPI.getAll(),
        vehicleAPI.getAll()
      ]);
      
      // Filter promotions: national (agencyId null/0) + current agency
      const filteredPromotions = allPromotionsData.filter(p => 
        !p.agencyId || p.agencyId === 0 || p.agencyId === agencyId
      );
      
      // Enrich promotions with vehicle info and scope
      const enrichedPromotions = filteredPromotions.map(promo => {
        const vehicle = vehiclesData.find(v => v.id === promo.vehicleId);
        const isNational = !promo.agencyId || promo.agencyId === 0;
        return {
          ...promo,
          vehicleName: vehicle 
            ? `${vehicle.option?.modelName || vehicle.modelName || ''} ${vehicle.variantName || ''}`.trim() 
            : 'N/A',
          vehicleColor: vehicle?.color || '',
          isNational: isNational,
          scope: isNational ? 'Toàn quốc' : 'Đại lý'
        };
      });

      setPromotions(enrichedPromotions);
      setVehicles(vehiclesData);
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
      return { color: 'warning', text: 'Chưa bắt đầu', icon: '⏰' };
    }
    if (now.isAfter(end)) {
      return { color: 'error', text: 'Hết hạn', icon: '⌛' };
    }
    return { color: 'success', text: 'Đang áp dụng', icon: '✓' };
  };

  // Handle create
  const handleCreate = () => {
    setModalMode('create');
    setSelectedPromotion(null);
    form.resetFields();
    setIsModalOpen(true);
  };

  // Handle edit
  const handleEdit = (record) => {
    setModalMode('edit');
    setSelectedPromotion(record);
    form.setFieldsValue({
      vehicleId: record.vehicleId,
      promoName: record.promoName,
      discountAmount: record.discountAmount,
      date_range: [dayjs(record.startDate), dayjs(record.endDate)]
    });
    setIsModalOpen(true);
  };

  // Handle delete
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

  // Toggle status
  const handleToggleStatus = async (id) => {
    // API không hỗ trợ toggle status, có thể implement nếu cần
    message.info('Chức năng này chưa được hỗ trợ');
  };

  // Submit form
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      const agencyId = getAgencyId();
      const promotionData = {
        vehicleId: values.vehicleId,
        agencyId: agencyId,
        promoName: values.promoName,
        discountAmount: values.discountAmount,
        startDate: values.date_range[0].format('YYYY-MM-DDTHH:mm:ss.SSS[Z]'),
        endDate: values.date_range[1].format('YYYY-MM-DDTHH:mm:ss.SSS[Z]')
      };

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
      width: 250,
      render: (text) => <Text strong>{text}</Text>
    },
    {
      title: 'Phạm vi',
      dataIndex: 'scope',
      key: 'scope',
      width: 120,
      render: (text, record) => (
        <Tag color={record.isNational ? 'blue' : 'green'} icon={record.isNational ? '🌍' : '🏢'}>
          {text}
        </Tag>
      )
    },
    {
      title: 'Xe áp dụng',
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
      width: 150,
      align: 'right',
      render: (_, record) => (
        <Tag color="red" style={{ fontSize: '14px', fontWeight: 'bold' }}>
          {formatPrice(record.discountAmount)}
        </Tag>
      )
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
      width: 150,
      render: (_, record) => {
        const info = getStatusInfo(record);
        return (
          <Tag color={info.color}>
            {info.icon} {info.text}
          </Tag>
        );
      }
    },
    {
      title: 'Thao tác',
      key: 'actions',
      fixed: 'right',
      width: 80,
      align: 'center',
      render: (_, record) => {
        // Only allow edit/delete for agency promotions (not national)
        if (record.isNational) {
          return (
            <Tooltip title="Chỉ xem (Khuyến mãi toàn quốc)">
              <Button type="text" icon={<EyeOutlined />} disabled />
            </Tooltip>
          );
        }

        const items = [
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
          <Dropdown
            menu={{ items }}
            trigger={['click']}
            placement="bottomRight"
          >
            <Button type="text" icon={<MoreOutlined />} />
          </Dropdown>
        );
      }
    }
  ];

  // Calculate statistics
  const nationalPromotions = promotions.filter(p => p.isNational);
  const agencyPromotions = promotions.filter(p => !p.isNational);
  
  const stats = {
    total: promotions.length,
    active: promotions.filter(p => getStatusInfo(p).text === 'Đang áp dụng').length,
    expired: promotions.filter(p => getStatusInfo(p).text === 'Hết hạn').length,
    national: nationalPromotions.length,
    agency: agencyPromotions.length
  };

  return (
    <Spin spinning={loading}>
      <div className="promotion-page">
      <div className="page-header" style={{ marginBottom: '24px' }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Title level={2}>
              <GiftOutlined /> Quản lý khuyến mãi
            </Title>
            <Text type="secondary">Tạo và quản lý các chương trình khuyến mãi</Text>
          </Col>
          <Col>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              size="large"
              onClick={handleCreate}
            >
              Tạo khuyến mãi mới
            </Button>
          </Col>
        </Row>
      </div>

      {/* Statistics */}
      <Row gutter={16} style={{ marginBottom: '24px' }}>
        <Col xs={24} sm={12} lg={6}>
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
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <div style={{ textAlign: 'center' }}>
              <CheckCircleOutlined style={{ fontSize: '32px', color: '#52c41a' }} />
              <Title level={2} style={{ margin: '8px 0', color: '#52c41a' }}>
                {stats.active}
              </Title>
              <Text type="secondary">Đang áp dụng</Text>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <div style={{ textAlign: 'center' }}>
              <span style={{ fontSize: '32px' }}></span>
              <Title level={2} style={{ margin: '8px 0', color: '#1890ff' }}>
                {stats.national}
              </Title>
              <Text type="secondary">Toàn quốc</Text>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <div style={{ textAlign: 'center' }}>
              <span style={{ fontSize: '32px' }}></span>
              <Title level={2} style={{ margin: '8px 0', color: '#52c41a' }}>
                {stats.agency}
              </Title>
              <Text type="secondary">Đại lý</Text>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Promotions Tables */}
      {/* National Promotions Table */}
      <Card 
        title={
          <span>
            <span style={{ fontSize: '20px', marginRight: '8px' }}></span>
            Khuyến mãi toàn quốc
          </span>
        }
        style={{ marginBottom: '24px' }}
      >
        <Table
          columns={columns.filter(col => col.key !== 'scope')}
          dataSource={nationalPromotions}
          rowKey="id"
          scroll={{ x: 1200 }}
          pagination={{
            pageSize: 10,
            showTotal: (total) => `Tổng ${total} chương trình`
          }}
          locale={{ emptyText: 'Chưa có khuyến mãi toàn quốc' }}
        />
      </Card>

      {/* Agency Promotions Table */}
      <Card 
        title={
          <span>
            <span style={{ fontSize: '20px', marginRight: '8px' }}></span>
            Khuyến mãi đại lý
          </span>
        }
      >
        <Table
          columns={columns.filter(col => col.key !== 'scope')}
          dataSource={agencyPromotions}
          rowKey="id"
          scroll={{ x: 1200 }}
          pagination={{
            pageSize: 10,
            showTotal: (total) => `Tổng ${total} chương trình`
          }}
          locale={{ emptyText: 'Chưa có khuyến mãi đại lý' }}
        />
      </Card>

      {/* Create/Edit Modal */}
      <Modal
        title={modalMode === 'create' ? 'Tạo khuyến mãi mới' : 'Chỉnh sửa khuyến mãi'}
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        onOk={handleSubmit}
        okText={modalMode === 'create' ? 'Tạo mới' : 'Cập nhật'}
        cancelText="Hủy"
        width={800}
      >
        <Form
          form={form}
          layout="vertical"
          style={{ marginTop: '24px' }}
        >
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
            <Input placeholder="VD: Ưu đãi mùa hè 2024" />
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
      </Modal>
      </div>
    </Spin>
  );
};

export default PromotionPage;
