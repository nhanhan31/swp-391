import React, { useState, useMemo } from 'react';
import {
  Card,
  Table,
  Button,
  Tag,
  Space,
  Typography,
  Modal,
  Form,
  Input,
  Select,
  Avatar,
  Descriptions,
  Statistic,
  Row,
  Col,
  message,
  Popconfirm
} from 'antd';
import {
  TeamOutlined,
  PlusOutlined,
  EditOutlined,
  EyeOutlined,
  DeleteOutlined,
  SearchOutlined,
  UserOutlined,
  LockOutlined,
  MailOutlined,
  PhoneOutlined
} from '@ant-design/icons';
import { users as mockUsers, roles, agencies } from '../data/mockData';

const { Title, Text } = Typography;

const UsersPage = () => {
  const [userList, setUserList] = useState(mockUsers);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [modalMode, setModalMode] = useState('create'); // 'create', 'edit', 'view'
  const [selectedUser, setSelectedUser] = useState(null);
  const [form] = Form.useForm();
  const [searchText, setSearchText] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  // Filter users
  const filteredUsers = useMemo(() => {
    return userList.filter(user => {
      const matchSearch = 
        user.full_name.toLowerCase().includes(searchText.toLowerCase()) ||
        user.username.toLowerCase().includes(searchText.toLowerCase()) ||
        user.email.toLowerCase().includes(searchText.toLowerCase());
      const matchRole = filterRole === 'all' || user.role_id === parseInt(filterRole);
      const matchStatus = filterStatus === 'all' || user.status === filterStatus;
      return matchSearch && matchRole && matchStatus;
    });
  }, [userList, searchText, filterRole, filterStatus]);

  // Statistics
  const statistics = useMemo(() => {
    const activeUsers = userList.filter(u => u.status === 'active').length;
    const inactiveUsers = userList.filter(u => u.status === 'inactive').length;
    const byRole = {};
    roles.forEach(role => {
      byRole[role.role_name] = userList.filter(u => u.role_id === role.id).length;
    });

    return {
      total: userList.length,
      activeUsers,
      inactiveUsers,
      byRole
    };
  }, [userList]);

  const getRoleName = (roleId) => {
    return roles.find(r => r.id === roleId)?.role_name || 'Unknown';
  };

  const getAgencyName = (agencyId) => {
    if (!agencyId) return 'Không thuộc đại lý';
    return agencies.find(a => a.id === agencyId)?.agency_name || 'Unknown';
  };

  const roleTag = (roleId) => {
    const colors = {
      1: 'red',
      2: 'blue',
      3: 'green',
      4: 'orange'
    };
    return <Tag color={colors[roleId]}>{getRoleName(roleId)}</Tag>;
  };

  const statusMeta = (status) => {
    const meta = {
      active: { color: 'success', text: 'Hoạt động' },
      inactive: { color: 'default', text: 'Không hoạt động' }
    };
    return meta[status] || meta.active;
  };

  const handleOpenModal = (mode, record = null) => {
    setModalMode(mode);
    setSelectedUser(record);
    setIsModalVisible(true);

    if (mode === 'edit' && record) {
      form.setFieldsValue({
        username: record.username,
        full_name: record.full_name,
        email: record.email,
        phone: record.phone,
        role_id: record.role_id,
        agency_id: record.agency_id,
        status: record.status
      });
    } else if (mode === 'create') {
      form.resetFields();
      form.setFieldsValue({ status: 'active' });
    }
  };

  const handleCloseModal = () => {
    setIsModalVisible(false);
    setSelectedUser(null);
    form.resetFields();
  };

  const handleSubmit = () => {
    form.validateFields().then(values => {
      if (modalMode === 'create') {
        const newUser = {
          id: userList.length + 1,
          ...values,
          password_hash: 'hashedpassword123',
          avatar_url: '/images/default-avatar.jpg',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          created_by: 1
        };
        setUserList([...userList, newUser]);
        message.success('Thêm người dùng mới thành công');
      } else if (modalMode === 'edit') {
        const updatedList = userList.map(user => 
          user.id === selectedUser.id 
            ? {
                ...user,
                ...values,
                updated_at: new Date().toISOString()
              }
            : user
        );
        setUserList(updatedList);
        message.success('Cập nhật người dùng thành công');
      }
      
      handleCloseModal();
    });
  };

  const handleDelete = (userId) => {
    setUserList(userList.filter(user => user.id !== userId));
    message.success('Xóa người dùng thành công');
  };

  const handleResetPassword = (user) => {
    Modal.confirm({
      title: 'Xác nhận đặt lại mật khẩu',
      content: `Bạn có chắc chắn muốn đặt lại mật khẩu cho tài khoản "${user.username}"?`,
      okText: 'Đặt lại',
      cancelText: 'Hủy',
      onOk: () => {
        message.success('Đã đặt lại mật khẩu. Mật khẩu mới đã được gửi qua email.');
      }
    });
  };

  const columns = [
    {
      title: 'Người dùng',
      key: 'user',
      width: 250,
      fixed: 'left',
      render: (_, record) => (
        <Space>
          <Avatar 
            src={record.avatar_url} 
            icon={<UserOutlined />}
            size={40}
          />
          <div>
            <Text strong>{record.full_name}</Text>
            <br />
            <Text type="secondary" style={{ fontSize: '12px' }}>@{record.username}</Text>
          </div>
        </Space>
      )
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
      width: 200,
      render: (value) => (
        <Space>
          <MailOutlined style={{ color: '#1890ff' }} />
          <Text>{value}</Text>
        </Space>
      )
    },
    {
      title: 'Số điện thoại',
      dataIndex: 'phone',
      key: 'phone',
      width: 130,
      render: (value) => (
        <Space>
          <PhoneOutlined style={{ color: '#52c41a' }} />
          <Text>{value}</Text>
        </Space>
      )
    },
    {
      title: 'Vai trò',
      key: 'role',
      width: 120,
      render: (_, record) => roleTag(record.role_id),
      filters: roles.map(role => ({ text: role.role_name, value: role.id })),
      onFilter: (value, record) => record.role_id === value
    },
    {
      title: 'Đại lý',
      key: 'agency',
      width: 180,
      render: (_, record) => {
        if (!record.agency_id) {
          return <Text type="secondary">-</Text>;
        }
        const agency = agencies.find(a => a.id === record.agency_id);
        return <Text>{agency?.agency_name}</Text>;
      }
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status) => {
        const meta = statusMeta(status);
        return <Tag color={meta.color}>{meta.text}</Tag>;
      },
      filters: [
        { text: 'Hoạt động', value: 'active' },
        { text: 'Không hoạt động', value: 'inactive' }
      ],
      onFilter: (value, record) => record.status === value
    },
    {
      title: 'Thao tác',
      key: 'actions',
      width: 250,
      fixed: 'right',
      render: (_, record) => (
        <Space>
          <Button
            type="link"
            icon={<EyeOutlined />}
            onClick={() => handleOpenModal('view', record)}
          >
            Xem
          </Button>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleOpenModal('edit', record)}
          >
            Sửa
          </Button>
          <Button
            type="link"
            icon={<LockOutlined />}
            onClick={() => handleResetPassword(record)}
          >
            Đặt lại MK
          </Button>
          <Popconfirm
            title="Xác nhận xóa người dùng?"
            description="Bạn có chắc chắn muốn xóa người dùng này?"
            onConfirm={() => handleDelete(record.id)}
            okText="Xóa"
            cancelText="Hủy"
          >
            <Button
              type="link"
              danger
              icon={<DeleteOutlined />}
              disabled={record.id === 1}
            >
              Xóa
            </Button>
          </Popconfirm>
        </Space>
      )
    }
  ];

  return (
    <div className="users-page">
      <div className="page-header" style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Title level={2}>
            <TeamOutlined /> Quản lý người dùng
          </Title>
          <Text type="secondary">Quản lý tài khoản và phân quyền người dùng</Text>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => handleOpenModal('create')}
          size="large"
        >
          Thêm người dùng
        </Button>
      </div>

      <Row gutter={16} style={{ marginBottom: '24px' }}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Tổng người dùng"
              value={statistics.total}
              prefix={<TeamOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Đang hoạt động"
              value={statistics.activeUsers}
              prefix={<UserOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Admin"
              value={statistics.byRole['Admin'] || 0}
              valueStyle={{ color: '#f5222d' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="EVM Staff"
              value={statistics.byRole['EVM Staff'] || 0}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
      </Row>

      <Card>
        <Space style={{ marginBottom: '16px', width: '100%', justifyContent: 'space-between' }}>
          <Space>
            <Input
              placeholder="Tìm kiếm theo tên, email..."
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              style={{ width: 300 }}
              allowClear
            />
            <Select
              value={filterRole}
              onChange={setFilterRole}
              style={{ width: 150 }}
              placeholder="Vai trò"
            >
              <Select.Option value="all">Tất cả vai trò</Select.Option>
              {roles.map(role => (
                <Select.Option key={role.id} value={role.id.toString()}>
                  {role.role_name}
                </Select.Option>
              ))}
            </Select>
            <Select
              value={filterStatus}
              onChange={setFilterStatus}
              style={{ width: 150 }}
            >
              <Select.Option value="all">Tất cả trạng thái</Select.Option>
              <Select.Option value="active">Hoạt động</Select.Option>
              <Select.Option value="inactive">Không hoạt động</Select.Option>
            </Select>
          </Space>
        </Space>

        <Table
          columns={columns}
          dataSource={filteredUsers}
          rowKey="id"
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `Tổng ${total} người dùng`
          }}
          scroll={{ x: 1400 }}
        />
      </Card>

      <Modal
        title={
          modalMode === 'create' ? 'Thêm người dùng mới' :
          modalMode === 'edit' ? 'Chỉnh sửa người dùng' :
          'Chi tiết người dùng'
        }
        open={isModalVisible}
        onCancel={handleCloseModal}
        footer={
          modalMode === 'view' ? (
            <Button onClick={handleCloseModal}>Đóng</Button>
          ) : (
            <>
              <Button onClick={handleCloseModal}>Hủy</Button>
              <Button type="primary" onClick={handleSubmit}>
                {modalMode === 'create' ? 'Thêm' : 'Cập nhật'}
              </Button>
            </>
          )
        }
        width={700}
      >
        {modalMode === 'view' && selectedUser ? (
          <Descriptions bordered column={1}>
            <Descriptions.Item label="Tên đăng nhập">
              {selectedUser.username}
            </Descriptions.Item>
            <Descriptions.Item label="Họ và tên">
              {selectedUser.full_name}
            </Descriptions.Item>
            <Descriptions.Item label="Email">
              {selectedUser.email}
            </Descriptions.Item>
            <Descriptions.Item label="Số điện thoại">
              {selectedUser.phone}
            </Descriptions.Item>
            <Descriptions.Item label="Vai trò">
              {roleTag(selectedUser.role_id)}
            </Descriptions.Item>
            <Descriptions.Item label="Đại lý">
              {getAgencyName(selectedUser.agency_id)}
            </Descriptions.Item>
            <Descriptions.Item label="Trạng thái">
              <Tag color={statusMeta(selectedUser.status).color}>
                {statusMeta(selectedUser.status).text}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Ngày tạo">
              {new Date(selectedUser.created_at).toLocaleString('vi-VN')}
            </Descriptions.Item>
          </Descriptions>
        ) : (
          <Form form={form} layout="vertical">
            <Form.Item
              name="username"
              label="Tên đăng nhập"
              rules={[
                { required: true, message: 'Vui lòng nhập tên đăng nhập' },
                { pattern: /^[a-zA-Z0-9_]+$/, message: 'Chỉ chứa chữ, số và dấu gạch dưới' }
              ]}
            >
              <Input 
                prefix={<UserOutlined />} 
                placeholder="Nhập tên đăng nhập"
                disabled={modalMode === 'edit'}
              />
            </Form.Item>

            {modalMode === 'create' && (
              <Form.Item
                name="password"
                label="Mật khẩu"
                rules={[
                  { required: true, message: 'Vui lòng nhập mật khẩu' },
                  { min: 6, message: 'Mật khẩu tối thiểu 6 ký tự' }
                ]}
              >
                <Input.Password 
                  prefix={<LockOutlined />} 
                  placeholder="Nhập mật khẩu"
                />
              </Form.Item>
            )}

            <Form.Item
              name="full_name"
              label="Họ và tên"
              rules={[{ required: true, message: 'Vui lòng nhập họ và tên' }]}
            >
              <Input placeholder="Nhập họ và tên" />
            </Form.Item>

            <Form.Item
              name="email"
              label="Email"
              rules={[
                { required: true, message: 'Vui lòng nhập email' },
                { type: 'email', message: 'Email không hợp lệ' }
              ]}
            >
              <Input prefix={<MailOutlined />} placeholder="Nhập email" />
            </Form.Item>

            <Form.Item
              name="phone"
              label="Số điện thoại"
              rules={[
                { required: true, message: 'Vui lòng nhập số điện thoại' },
                { pattern: /^[0-9]{10}$/, message: 'Số điện thoại không hợp lệ' }
              ]}
            >
              <Input prefix={<PhoneOutlined />} placeholder="Nhập số điện thoại" />
            </Form.Item>

            <Form.Item
              name="role_id"
              label="Vai trò"
              rules={[{ required: true, message: 'Vui lòng chọn vai trò' }]}
            >
              <Select placeholder="Chọn vai trò">
                {roles.map(role => (
                  <Select.Option key={role.id} value={role.id}>
                    {role.role_name}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item
              noStyle
              shouldUpdate={(prevValues, currentValues) => prevValues.role_id !== currentValues.role_id}
            >
              {({ getFieldValue }) =>
                [3, 4].includes(getFieldValue('role_id')) ? (
                  <Form.Item
                    name="agency_id"
                    label="Đại lý"
                    rules={[{ required: true, message: 'Vui lòng chọn đại lý' }]}
                  >
                    <Select placeholder="Chọn đại lý">
                      {agencies.map(agency => (
                        <Select.Option key={agency.id} value={agency.id}>
                          {agency.agency_name}
                        </Select.Option>
                      ))}
                    </Select>
                  </Form.Item>
                ) : null
              }
            </Form.Item>

            <Form.Item
              name="status"
              label="Trạng thái"
              rules={[{ required: true, message: 'Vui lòng chọn trạng thái' }]}
            >
              <Select>
                <Select.Option value="active">Hoạt động</Select.Option>
                <Select.Option value="inactive">Không hoạt động</Select.Option>
              </Select>
            </Form.Item>
          </Form>
        )}
      </Modal>
    </div>
  );
};

export default UsersPage;
