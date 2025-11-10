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
  Row,
  Col,
  Typography,
  message,
  Descriptions,
  Timeline,
  Statistic,
  Dropdown,
  Spin
} from 'antd';
import {
  UserOutlined,
  PlusOutlined,
  EyeOutlined,
  EditOutlined,
  DeleteOutlined,
  PhoneOutlined,
  MailOutlined,
  EnvironmentOutlined,
  HistoryOutlined,
  MoreOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { customerAPI, emailVerificationAPI } from '../services/quotationService';

const { Title, Text } = Typography;
const { TextArea } = Input;

const CustomerPage = () => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [form] = Form.useForm();
  
  // Email verification states
  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [emailToVerify, setEmailToVerify] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [pendingFormData, setPendingFormData] = useState(null);

  // Fetch customers from API
  useEffect(() => {
    const fetchCustomers = async () => {
      setLoading(true);
      try {
        const customersData = await customerAPI.getAll();
        console.log('CustomerPage - Customers data:', customersData);

        // Transform API data
        const transformedCustomers = customersData.map(customer => ({
          id: customer.id,
          customer_code: `KH${customer.id.toString().padStart(4, '0')}`,
          full_name: customer.fullName,
          phone: customer.phone,
          email: customer.email,
          address: customer.address,
          created_at: customer.createAt,
          total_quotations: 0, // Can be calculated if needed
          total_orders: 0,
          total_test_drives: 0,
          total_feedback: 0,
          status: 'active' // Default status
        }));

        setCustomers(transformedCustomers);
      } catch (error) {
        console.error('Error fetching customers:', error);
        message.error('Không thể tải danh sách khách hàng');
      } finally {
        setLoading(false);
      }
    };

    fetchCustomers();
  }, []);

  // Get customer status info
  const getStatusInfo = (status) => {
    const statusMap = {
      potential: { color: 'default', text: 'Tiềm năng' },
      active: { color: 'blue', text: 'Đang hoạt động' },
      vip: { color: 'gold', text: 'VIP' },
      inactive: { color: 'gray', text: 'Không hoạt động' }
    };
    return statusMap[status] || statusMap.potential;
  };

  // Handle create
  const handleCreate = () => {
    setModalMode('create');
    setSelectedCustomer(null);
    form.resetFields();
    setIsModalOpen(true);
  };

  // Handle view
  const handleView = (record) => {
    setSelectedCustomer(record);
    setModalMode('view');
    setIsModalOpen(true);
  };

  // Handle edit
  const handleEdit = (record) => {
    setSelectedCustomer(record);
    setModalMode('edit');
    form.setFieldsValue(record);
    setIsModalOpen(true);
  };

  // Handle delete
  const handleDelete = (id) => {
    Modal.confirm({
      title: 'Xác nhận xóa',
      content: 'Bạn có chắc muốn xóa khách hàng này?',
      okText: 'Xóa',
      okType: 'danger',
      cancelText: 'Hủy',
      onOk: () => {
        setCustomers(customers.filter(c => c.id !== id));
        message.success('Đã xóa khách hàng');
      }
    });
  };

  // Send OTP to email
  const handleSendOTP = async () => {
    if (!emailToVerify) {
      message.error('Vui lòng nhập email');
      return;
    }

    setVerifyLoading(true);
    try {
      await emailVerificationAPI.sendOTP(emailToVerify);
      setOtpSent(true);
      message.success('Mã OTP đã được gửi đến email');
    } catch (error) {
      console.error('Error sending OTP:', error);
      message.error('Không thể gửi mã OTP. Vui lòng thử lại!');
    } finally {
      setVerifyLoading(false);
    }
  };

  // Verify OTP
  const handleVerifyOTP = async () => {
    if (!otpCode) {
      message.error('Vui lòng nhập mã OTP');
      return;
    }

    setVerifyLoading(true);
    try {
      await emailVerificationAPI.verifyOTP(emailToVerify, otpCode);
      message.success('Xác thực email thành công!');
      setIsVerifyModalOpen(false);
      
      // Continue with customer creation/update
      if (pendingFormData) {
        await processPendingSubmit();
      }
    } catch (error) {
      console.error('Error verifying OTP:', error);
      message.error('Mã OTP không hợp lệ hoặc đã hết hạn');
    } finally {
      setVerifyLoading(false);
    }
  };

  // Process pending submit after email verification
  const processPendingSubmit = async () => {
    try {
      if (modalMode === 'create') {
        const newCustomer = await customerAPI.create(pendingFormData);

        const transformedCustomer = {
          id: newCustomer.id,
          customer_code: `KH${newCustomer.id.toString().padStart(4, '0')}`,
          full_name: newCustomer.fullName,
          phone: newCustomer.phone,
          email: newCustomer.email,
          address: newCustomer.address,
          created_at: newCustomer.createAt || new Date().toISOString(),
          total_quotations: 0,
          total_orders: 0,
          total_test_drives: 0,
          total_feedback: 0,
          status: 'active'
        };
        
        setCustomers([...customers, transformedCustomer]);
        message.success('Đã tạo hồ sơ khách hàng mới');
      } else if (modalMode === 'edit') {
        await customerAPI.update(selectedCustomer.id, pendingFormData);

        setCustomers(customers.map(c => 
          c.id === selectedCustomer.id 
            ? { 
                ...c, 
                full_name: pendingFormData.fullName,
                email: pendingFormData.email,
                phone: pendingFormData.phone,
                address: pendingFormData.address
              } 
            : c
        ));
        message.success('Đã cập nhật thông tin khách hàng');
      }
      
      setIsModalOpen(false);
      form.resetFields();
      setPendingFormData(null);
      setOtpSent(false);
      setOtpCode('');
      setEmailToVerify('');
    } catch (error) {
      console.error('Error processing customer:', error);
      message.error('Không thể lưu thông tin khách hàng');
    }
  };

  // Submit form - now requires email verification
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      
      // Prepare customer payload
      const customerPayload = {
        fullName: values.full_name,
        email: values.email,
        phone: values.phone,
        address: values.address
      };

      // Store pending data and show verification modal
      setPendingFormData(customerPayload);
      setEmailToVerify(values.email);
      setIsVerifyModalOpen(true);
      
    } catch (error) {
      console.error('Validation failed:', error);
    }
  };

  const columns = [
    {
      title: 'Mã KH',
      dataIndex: 'customer_code',
      key: 'customer_code',
      fixed: 'left',
      width: 100,
      render: (text) => <Text strong code>{text}</Text>
    },
    {
      title: 'Họ tên',
      dataIndex: 'full_name',
      key: 'full_name',
      width: 180,
      render: (text) => <Text strong>{text}</Text>
    },
    {
      title: 'Liên hệ',
      key: 'contact',
      width: 220,
      render: (_, record) => (
        <div>
          <div style={{ marginBottom: '4px' }}>
            <PhoneOutlined style={{ marginRight: '8px', color: '#1890ff' }} />
            <Text>{record.phone}</Text>
          </div>
          <div>
            <MailOutlined style={{ marginRight: '8px', color: '#52c41a' }} />
            <Text type="secondary" style={{ fontSize: '12px' }}>{record.email}</Text>
          </div>
        </div>
      )
    },
    {
      title: 'Địa chỉ',
      dataIndex: 'address',
      key: 'address',
      width: 250,
      ellipsis: true,
      render: (text) => (
        <>
          <EnvironmentOutlined style={{ marginRight: '8px' }} />
          {text}
        </>
      )
    },
    {
      title: 'Hoạt động',
      key: 'activities',
      width: 180,
      render: (_, record) => (
        <div>
          <div><Text type="secondary">Báo giá: </Text><Text strong>{record.total_quotations}</Text></div>
          <div><Text type="secondary">Đơn hàng: </Text><Text strong>{record.total_orders}</Text></div>
          <div><Text type="secondary">Lái thử: </Text><Text strong>{record.total_test_drives}</Text></div>
        </div>
      )
    },
    
    {
      title: 'Ngày tạo',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 120,
      render: (date) => dayjs(date).format('DD/MM/YYYY')
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
  const stats = {
    total: customers.length,
    active: customers.filter(c => c.status === 'active').length,
    vip: customers.filter(c => c.status === 'vip').length,
    potential: customers.filter(c => c.status === 'potential').length
  };

  return (
    <Spin spinning={loading} tip="Đang tải danh sách khách hàng...">
      <div className="customer-page">
        <div className="page-header" style={{ marginBottom: '24px' }}>
          <Row justify="space-between" align="middle">
            <Col>
              <Title level={2}>
                <UserOutlined /> Hồ sơ khách hàng
              </Title>
              <Text type="secondary">Quản lý thông tin và lịch sử của khách hàng</Text>
            </Col>
            <Col>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                size="large"
                onClick={handleCreate}
              >
              Thêm khách hàng
            </Button>
          </Col>
        </Row>
      </div>

      {/* Statistics */}
      <Row gutter={16} style={{ marginBottom: '24px' }}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Tổng khách hàng"
              value={stats.total}
              prefix={<UserOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="VIP"
              value={stats.vip}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Đang hoạt động"
              value={stats.active}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Tiềm năng"
              value={stats.potential}
              valueStyle={{ color: '#8c8c8c' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Customers Table */}
      <Card>
        <Table
          columns={columns}
          dataSource={customers}
          rowKey="id"
          scroll={{ x: 1400 }}
          pagination={{
            pageSize: 10,
            showTotal: (total) => `Tổng ${total} khách hàng`
          }}
        />
      </Card>

      {/* Form Modal */}
      <Modal
        title={
          modalMode === 'create' ? 'Thêm khách hàng mới' :
          modalMode === 'edit' ? 'Chỉnh sửa thông tin khách hàng' :
          `Thông tin khách hàng - ${selectedCustomer?.customer_code}`
        }
        open={isModalOpen}
        onCancel={() => {
          setIsModalOpen(false);
          form.resetFields();
        }}
        footer={
          modalMode === 'view' ? [
            <Button key="close" onClick={() => setIsModalOpen(false)}>
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
        width={700}
      >
        {modalMode === 'view' && selectedCustomer ? (
          <>
            <Descriptions bordered column={2} style={{ marginBottom: '24px' }}>
              <Descriptions.Item label="Mã khách hàng" span={2}>
                <Text strong code>{selectedCustomer.customer_code}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Họ tên" span={2}>
                <Text strong>{selectedCustomer.full_name}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Số điện thoại">
                <PhoneOutlined /> {selectedCustomer.phone}
              </Descriptions.Item>
              <Descriptions.Item label="Email">
                <MailOutlined /> {selectedCustomer.email}
              </Descriptions.Item>
              <Descriptions.Item label="Địa chỉ" span={2}>
                <EnvironmentOutlined /> {selectedCustomer.address}
              </Descriptions.Item>
              <Descriptions.Item label="Trạng thái">
                <Tag color={getStatusInfo(selectedCustomer.status).color}>
                  {getStatusInfo(selectedCustomer.status).text}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Ngày tạo">
                {dayjs(selectedCustomer.created_at).format('DD/MM/YYYY HH:mm')}
              </Descriptions.Item>
            </Descriptions>

            <Card title={<><HistoryOutlined /> Thống kê hoạt động</>} size="small">
              <Row gutter={16}>
                <Col span={6}>
                  <Statistic title="Báo giá" value={selectedCustomer.total_quotations} />
                </Col>
                <Col span={6}>
                  <Statistic title="Đơn hàng" value={selectedCustomer.total_orders} />
                </Col>
                <Col span={6}>
                  <Statistic title="Lái thử" value={selectedCustomer.total_test_drives} />
                </Col>
                <Col span={6}>
                  <Statistic title="Phản hồi" value={selectedCustomer.total_feedback} />
                </Col>
              </Row>
            </Card>
          </>
        ) : (
          <Form
            form={form}
            layout="vertical"
            style={{ marginTop: '24px' }}
          >
            <Row gutter={16}>
              <Col span={24}>
                <Form.Item
                  name="full_name"
                  label="Họ và tên"
                  rules={[{ required: true, message: 'Nhập họ tên khách hàng' }]}
                >
                  <Input prefix={<UserOutlined />} placeholder="Nguyễn Văn A" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="phone"
                  label="Số điện thoại"
                  rules={[
                    { required: true, message: 'Nhập số điện thoại' },
                    { pattern: /^[0-9]{10}$/, message: 'Số điện thoại không hợp lệ' }
                  ]}
                >
                  <Input prefix={<PhoneOutlined />} placeholder="0912345678" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="email"
                  label="Email"
                  rules={[
                    { required: true, message: 'Nhập email' },
                    { type: 'email', message: 'Email không hợp lệ' }
                  ]}
                >
                  <Input prefix={<MailOutlined />} placeholder="email@example.com" />
                </Form.Item>
              </Col>
              <Col span={24}>
                <Form.Item
                  name="address"
                  label="Địa chỉ"
                  rules={[{ required: true, message: 'Nhập địa chỉ' }]}
                >
                  <TextArea
                    rows={2}
                    placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành phố"
                  />
                </Form.Item>
              </Col>
            </Row>
          </Form>
        )}
      </Modal>

      {/* Email Verification Modal */}
      <Modal
        title="Xác thực Email"
        open={isVerifyModalOpen}
        onCancel={() => {
          setIsVerifyModalOpen(false);
          setOtpSent(false);
          setOtpCode('');
        }}
        footer={null}
        width={500}
      >
        <div style={{ padding: '20px 0' }}>
          <Space direction="vertical" style={{ width: '100%' }} size="large">
            <div>
              <Text strong>Email: </Text>
              <Text code>{emailToVerify}</Text>
            </div>

            {!otpSent ? (
              <div>
                <Text type="secondary" style={{ display: 'block', marginBottom: '16px' }}>
                  Nhấn nút bên dưới để gửi mã OTP đến email của bạn.
                </Text>
                <Button
                  type="primary"
                  icon={<MailOutlined />}
                  onClick={handleSendOTP}
                  loading={verifyLoading}
                  block
                  size="large"
                >
                  Gửi mã OTP
                </Button>
              </div>
            ) : (
              <div>
                <Text type="secondary" style={{ display: 'block', marginBottom: '16px' }}>
                  Mã OTP đã được gửi đến email. Vui lòng kiểm tra hộp thư và nhập mã bên dưới.
                </Text>
                <Input
                  placeholder="Nhập mã OTP (6 số)"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  maxLength={6}
                  size="large"
                  style={{ marginBottom: '16px' }}
                />
                <Space style={{ width: '100%' }}>
                  <Button
                    onClick={handleSendOTP}
                    loading={verifyLoading}
                    disabled={verifyLoading}
                  >
                    Gửi lại mã
                  </Button>
                  <Button
                    type="primary"
                    onClick={handleVerifyOTP}
                    loading={verifyLoading}
                    disabled={!otpCode || otpCode.length < 6}
                    style={{ flex: 1 }}
                    size="large"
                  >
                    Xác thực
                  </Button>
                </Space>
              </div>
            )}
          </Space>
        </div>
      </Modal>
      </div>
    </Spin>
  );
};

export default CustomerPage;
