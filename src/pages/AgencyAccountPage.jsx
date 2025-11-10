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
  Input,
  Select,
  Avatar,
  message,
  Descriptions
} from 'antd';
import {
  UserOutlined,
  TeamOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  LockOutlined,
  MailOutlined,
  PhoneOutlined,
  PlusOutlined,
  EditOutlined,
  EyeOutlined,
  MoreOutlined,
  ShopOutlined,
  SafetyOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { users as mockUsers, agencies, roles } from '../data/mockData';

const { Title, Text } = Typography;
const { Password } = Input;

const AgencyAccountPage = () => {
  const [userList, setUserList] = useState(mockUsers.filter(u => u.agency_id !== null));
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create'); // 'create' | 'edit' | 'view'
  const [selectedUser, setSelectedUser] = useState(null);
  const [form] = Form.useForm();

  const userData = useMemo(() => {
    return userList.map(user => {
      const agency = agencies.find(a => a.id === user.agency_id);
      const role = roles.find(r => r.id === user.role_id);

      return {
        id: user.id,
        username: user.username,
        full_name: user.full_name,
        email: user.email,
        phone: user.phone,
        avatar_url: user.avatar_url,
        status: user.status,
        role_id: user.role_id,
        role_name: role?.role_name || 'Chưa xác định',
        agency_id: user.agency_id,
        agency_name: agency?.agency_name || 'Chưa xác định',
        agency_location: agency?.location || '',
        created_at: user.created_at,
        updated_at: user.updated_at,
        created_by: user.created_by
      };
    }).sort((a, b) => dayjs(b.created_at).valueOf() - dayjs(a.created_at).valueOf());
  }, [userList]);

  const totalAccounts = userData.length;
  const activeAccounts = userData.filter(u => u.status === 'active').length;
  const inactiveAccounts = userData.filter(u => u.status === 'inactive').length;
  const managerAccounts = userData.filter(u => u.role_id === 3).length;

  const handleCreate = () => {
    setModalMode('create');
    setSelectedUser(null);
    form.resetFields();
    setIsModalOpen(true);
  };

  const handleEdit = (record) => {
    setModalMode('edit');
    setSelectedUser(record);
    form.setFieldsValue({
      username: record.username,
      full_name: record.full_name,
      email: record.email,
      phone: record.phone,
      role_id: record.role_id,
      agency_id: record.agency_id,
      status: record.status
    });
    setIsModalOpen(true);
  };

  const handleView = (record) => {
    setModalMode('view');
    setSelectedUser(record);
    setIsModalOpen(true);
  };

  const handleSubmit = () => {
    form.validateFields().then(values => {
      if (modalMode === 'create') {
        const newUser = {
          id: mockUsers.length + 1,
          username: values.username,
          password_hash: 'hashedpassword123',
          full_name: values.full_name,
          email: values.email,
          phone: values.phone,
          avatar_url: '/images/avatar-default.jpg',
          status: values.status,
          role_id: values.role_id,
          agency_id: values.agency_id,
          created_at: dayjs().toISOString(),
          updated_at: dayjs().toISOString(),
          created_by: 1
        };
        setUserList([newUser, ...userList]);
        message.success('Tạo tài khoản thành công');
      } else if (modalMode === 'edit') {
        const updatedList = userList.map(user =>
          user.id === selectedUser.id
            ? {
                ...user,
                username: values.username,
                full_name: values.full_name,
                email: values.email,
                phone: values.phone,
                role_id: values.role_id,
                agency_id: values.agency_id,
                status: values.status,
                updated_at: dayjs().toISOString()
              }
            : user
        );
        setUserList(updatedList);
        message.success('Cập nhật tài khoản thành công');
      }
      form.resetFields();
      setIsModalOpen(false);
    }).catch(() => {});
  };

  const statusMeta = (status) => {
    return status === 'active'
      ? { color: 'green', text: 'Hoạt động', icon: <CheckCircleOutlined /> }
      : { color: 'red', text: 'Ngừng hoạt động', icon: <CloseCircleOutlined /> };
  };

  const roleTag = (roleId) => {
    switch (roleId) {
      case 3:
        return <Tag color="blue" icon={<SafetyOutlined />}>Dealer Manager</Tag>;
      case 4:
        return <Tag color="cyan" icon={<UserOutlined />}>Dealer Staff</Tag>;
      default:
        return <Tag color="default">Khác</Tag>;
    }
  };

  const columns = [
    {
      title: 'Người dùng',
      key: 'user',
      width: 250,
      render: (_, record) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Avatar size={48} icon={<UserOutlined />} src={record.avatar_url} />
          <div>
            <Text strong>{record.full_name}</Text>
            <br />
            <Text type="secondary" style={{ fontSize: '12px' }}>
              @{record.username}
            </Text>
          </div>
        </div>
      )
    },
    {
      title: 'Đại lý',
      key: 'agency',
      width: 200,
      render: (_, record) => (
        <div>
          <Text strong>{record.agency_name}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: '12px' }}>{record.agency_location}</Text>
        </div>
      )
    },
    {
      title: 'Liên hệ',
      key: 'contact',
      width: 200,
      render: (_, record) => (
        <div>
          <div style={{ marginBottom: '4px' }}>
            <MailOutlined style={{ marginRight: '8px', color: '#1890ff' }} />
            <Text style={{ fontSize: '13px' }}>{record.email}</Text>
          </div>
          <div>
            <PhoneOutlined style={{ marginRight: '8px', color: '#1890ff' }} />
            <Text style={{ fontSize: '13px' }}>{record.phone}</Text>
          </div>
        </div>
      )
    },
    {
      title: 'Vai trò',
      dataIndex: 'role_id',
      key: 'role_id',
      width: 150,
      render: (roleId) => roleTag(roleId),
      filters: [
        { text: 'Dealer Manager', value: 3 },
        { text: 'Dealer Staff', value: 4 }
      ],
      onFilter: (value, record) => record.role_id === value
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 140,
      render: (status) => {
        const meta = statusMeta(status);
        return <Tag color={meta.color} icon={meta.icon}>{meta.text}</Tag>;
      },
      filters: [
        { text: 'Hoạt động', value: 'active' },
        { text: 'Ngừng hoạt động', value: 'inactive' }
      ],
      onFilter: (value, record) => record.status === value
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
    <div className="agency-account-page">
      <div className="page-header" style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Title level={2}>
            <TeamOutlined /> Quản lý tài khoản đại lý
          </Title>
          <Text type="secondary">Quản lý tài khoản người dùng của các đại lý trên hệ thống</Text>
        </div>
        <Button type="primary" icon={<PlusOutlined />} size="large" onClick={handleCreate}>
          Tạo tài khoản mới
        </Button>
      </div>

      <Row gutter={16} style={{ marginBottom: '24px' }}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Tổng tài khoản"
              value={totalAccounts}
              prefix={<TeamOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Đang hoạt động"
              value={activeAccounts}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Ngừng hoạt động"
              value={inactiveAccounts}
              prefix={<CloseCircleOutlined />}
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Dealer Manager"
              value={managerAccounts}
              prefix={<SafetyOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
      </Row>

      <Card title="Danh sách tài khoản">
        <Table
          columns={columns}
          dataSource={userData}
          rowKey="id"
          scroll={{ x: 1200 }}
          pagination={{
            pageSize: 10,
            showTotal: (total) => `Tổng ${total} tài khoản`
          }}
        />
      </Card>

      <Modal
        title={modalMode === 'create' ? 'Tạo tài khoản mới' : modalMode === 'edit' ? 'Chỉnh sửa tài khoản' : 'Chi tiết tài khoản'}
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        onOk={modalMode !== 'view' ? handleSubmit : undefined}
        okText={modalMode === 'create' ? 'Tạo tài khoản' : 'Cập nhật'}
        cancelText={modalMode === 'view' ? 'Đóng' : 'Hủy'}
        width={700}
        footer={modalMode === 'view' ? [
          <Button key="close" type="primary" onClick={() => setIsModalOpen(false)}>
            Đóng
          </Button>
        ] : undefined}
      >
        {modalMode === 'view' && selectedUser ? (
          <div style={{ padding: '16px 0' }}>
            <Row gutter={[16, 16]}>
              <Col span={24} style={{ textAlign: 'center', marginBottom: '16px' }}>
                <Avatar size={80} icon={<UserOutlined />} src={selectedUser.avatar_url} />
                <div style={{ marginTop: '12px' }}>
                  <Title level={4}>{selectedUser.full_name}</Title>
                  <Text type="secondary">@{selectedUser.username}</Text>
                </div>
              </Col>
              <Col span={24}>
                <Descriptions bordered column={1}>
                  <Descriptions.Item label="Đại lý">
                    <Text strong>{selectedUser.agency_name}</Text>
                    {' - '}
                    <Text type="secondary">{selectedUser.agency_location}</Text>
                  </Descriptions.Item>
                  <Descriptions.Item label="Vai trò">
                    {roleTag(selectedUser.role_id)}
                  </Descriptions.Item>
                  <Descriptions.Item label="Email">
                    <MailOutlined style={{ marginRight: '8px' }} />
                    {selectedUser.email}
                  </Descriptions.Item>
                  <Descriptions.Item label="Số điện thoại">
                    <PhoneOutlined style={{ marginRight: '8px' }} />
                    {selectedUser.phone}
                  </Descriptions.Item>
                  <Descriptions.Item label="Trạng thái">
                    {(() => {
                      const meta = statusMeta(selectedUser.status);
                      return <Tag color={meta.color} icon={meta.icon}>{meta.text}</Tag>;
                    })()}
                  </Descriptions.Item>
                  <Descriptions.Item label="Ngày tạo">
                    {dayjs(selectedUser.created_at).format('DD/MM/YYYY HH:mm')}
                  </Descriptions.Item>
                  <Descriptions.Item label="Cập nhật lần cuối">
                    {dayjs(selectedUser.updated_at).format('DD/MM/YYYY HH:mm')}
                  </Descriptions.Item>
                </Descriptions>
              </Col>
            </Row>
          </div>
        ) : (
          <Form form={form} layout="vertical">
            <Form.Item
              name="agency_id"
              label="Đại lý"
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

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="username"
                  label="Tên đăng nhập"
                  rules={[
                    { required: true, message: 'Vui lòng nhập tên đăng nhập' },
                    { pattern: /^[a-z0-9_]+$/, message: 'Chỉ chấp nhận chữ thường, số và _' }
                  ]}
                >
                  <Input prefix={<UserOutlined />} placeholder="VD: staff_hanoi" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="role_id"
                  label="Vai trò"
                  rules={[{ required: true, message: 'Vui lòng chọn vai trò' }]}
                >
                  <Select placeholder="Chọn vai trò">
                    <Select.Option value={3}>Dealer Manager</Select.Option>
                    <Select.Option value={4}>Dealer Staff</Select.Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            <Form.Item
              name="full_name"
              label="Họ và tên"
              rules={[{ required: true, message: 'Vui lòng nhập họ và tên' }]}
            >
              <Input prefix={<UserOutlined />} placeholder="Nguyễn Văn A" />
            </Form.Item>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="email"
                  label="Email"
                  rules={[
                    { required: true, message: 'Vui lòng nhập email' },
                    { type: 'email', message: 'Email không hợp lệ' }
                  ]}
                >
                  <Input prefix={<MailOutlined />} placeholder="user@vinfast.vn" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="phone"
                  label="Số điện thoại"
                  rules={[
                    { required: true, message: 'Vui lòng nhập số điện thoại' },
                    { pattern: /^[0-9]{10}$/, message: 'Số điện thoại phải có 10 chữ số' }
                  ]}
                >
                  <Input prefix={<PhoneOutlined />} placeholder="0901234567" />
                </Form.Item>
              </Col>
            </Row>

            {modalMode === 'create' && (
              <Form.Item
                name="password"
                label="Mật khẩu"
                rules={[
                  { required: true, message: 'Vui lòng nhập mật khẩu' },
                  { min: 6, message: 'Mật khẩu phải có ít nhất 6 ký tự' }
                ]}
              >
                <Password prefix={<LockOutlined />} placeholder="Nhập mật khẩu" />
              </Form.Item>
            )}

            <Form.Item
              name="status"
              label="Trạng thái"
              initialValue="active"
              rules={[{ required: true, message: 'Vui lòng chọn trạng thái' }]}
            >
              <Select>
                <Select.Option value="active">Hoạt động</Select.Option>
                <Select.Option value="inactive">Ngừng hoạt động</Select.Option>
              </Select>
            </Form.Item>
          </Form>
        )}
      </Modal>
    </div>
  );
};

export default AgencyAccountPage;
