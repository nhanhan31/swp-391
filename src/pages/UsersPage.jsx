import React, { useState, useMemo, useEffect } from 'react';
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
  Popconfirm,
  Spin,
  Upload,
  Dropdown
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
  PhoneOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  UploadOutlined,
  MoreOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const USER_API = 'https://user.agencymanagement.online/api';

const { Title, Text } = Typography;
const { Password } = Input;

const UsersPage = () => {
  const { currentUser } = useAuth();
  const [userList, setUserList] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [modalMode, setModalMode] = useState('create'); // 'create', 'edit', 'view'
  const [selectedUser, setSelectedUser] = useState(null);
  const [avatarFile, setAvatarFile] = useState(null);
  const [form] = Form.useForm();
  const [searchText, setSearchText] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  // Fetch roles
  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const response = await axios.get(`${USER_API}/Role`, {
          headers: {
            'Authorization': `Bearer ${sessionStorage.getItem('token')}`
          }
        });
        setRoles(response.data || []);
      } catch (error) {
        console.error('Error fetching roles:', error);
        message.error('Không thể tải danh sách vai trò');
      }
    };

    fetchRoles();
  }, []);

  // Fetch all users
  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${USER_API}/User`, {
        headers: {
          'Authorization': `Bearer ${sessionStorage.getItem('token')}`
        }
      });
      
      setUserList(response.data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      message.error('Không thể tải danh sách người dùng');
    } finally {
      setLoading(false);
    }
  };

  // Transform and filter users
  const userData = useMemo(() => {
    return userList.map(user => ({
      id: user.id,
      username: user.userName,
      full_name: user.fullName,
      email: user.email,
      phone: user.phone,
      avatar_url: user.avartarUrl,
      status: user.status,
      role_name: user.role?.roleName,
      role_id: user.role?.id,
      created_at: user.created_At,
      updated_at: user.updated_At
    })).sort((a, b) => dayjs(b.created_at).valueOf() - dayjs(a.created_at).valueOf());
  }, [userList]);

  const filteredUsers = useMemo(() => {
    return userData.filter(user => {
      const matchSearch = 
        user.full_name?.toLowerCase().includes(searchText.toLowerCase()) ||
        user.username?.toLowerCase().includes(searchText.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchText.toLowerCase());
      const matchRole = filterRole === 'all' || user.role_id === parseInt(filterRole);
      const matchStatus = filterStatus === 'all' || user.status === filterStatus;
      return matchSearch && matchRole && matchStatus;
    });
  }, [userData, searchText, filterRole, filterStatus]);

  // Statistics
  const statistics = useMemo(() => {
    const activeUsers = userData.filter(u => u.status === 'Active').length;
    const inactiveUsers = userData.filter(u => u.status === 'Inactive').length;
    const adminUsers = userData.filter(u => u.role_name === 'Admin').length;
    const evmStaffUsers = userData.filter(u => u.role_name === 'EVMStaff').length;

    return {
      total: userData.length,
      activeUsers,
      inactiveUsers,
      adminUsers,
      evmStaffUsers
    };
  }, [userData]);

  const roleTag = (roleName) => {
    const roleColors = {
      'Admin': 'red',
      'EVMStaff': 'blue',
      'AgencyManager': 'green',
      'AgencyStaff': 'cyan'
    };
    return <Tag color={roleColors[roleName] || 'default'}>{roleName}</Tag>;
  };

  const statusMeta = (status) => {
    return status === 'Active'
      ? { color: 'green', text: 'Hoạt động', icon: <CheckCircleOutlined /> }
      : { color: 'red', text: 'Ngừng hoạt động', icon: <CloseCircleOutlined /> };
  };

  const handleOpenModal = (mode, record = null) => {
    setModalMode(mode);
    setSelectedUser(record);
    setIsModalVisible(true);
    setAvatarFile(null);

    if (mode === 'edit' && record) {
      form.setFieldsValue({
        full_name: record.full_name,
        email: record.email,
        phone: record.phone,
        status: record.status
      });
    } else if (mode === 'create') {
      form.resetFields();
    }
  };

  const handleCloseModal = () => {
    setIsModalVisible(false);
    setSelectedUser(null);
    setAvatarFile(null);
    form.resetFields();
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      if (modalMode === 'create') {
        const formData = new FormData();
        formData.append('UserName', values.username);
        formData.append('Password', values.password);
        formData.append('FullName', values.full_name);
        formData.append('Email', values.email);
        formData.append('RoleId', values.role_id);
        formData.append('Phone', values.phone);
        formData.append('CreateBy', currentUser?.id || 1);
        
        if (avatarFile) {
          formData.append('AvatarFile', avatarFile);
        }

        await axios.post(
          `${USER_API}/User`,
          formData,
          {
            headers: {
              'Content-Type': 'multipart/form-data',
              'Authorization': `Bearer ${sessionStorage.getItem('token')}`
            }
          }
        );

        message.success('Tạo người dùng mới thành công');
      } else if (modalMode === 'edit') {
        const formData = new FormData();
        formData.append('FullName', values.full_name);
        formData.append('Email', values.email);
        formData.append('Phone', values.phone);
        formData.append('Status', values.status);
        formData.append('RoleId', selectedUser.role_id);
        
        if (avatarFile) {
          formData.append('AvatarFile', avatarFile);
        }

        await axios.put(
          `${USER_API}/User/${selectedUser.id}`,
          formData,
          {
            headers: {
              'Content-Type': 'multipart/form-data',
              'Authorization': `Bearer ${sessionStorage.getItem('token')}`
            }
          }
        );

        message.success('Cập nhật người dùng thành công');
      }
        
      await fetchUsers();
      handleCloseModal();
    } catch (error) {
      console.error('Error submitting user:', error);
      message.error('Không thể lưu thông tin người dùng');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (record) => {
    Modal.confirm({
      title: 'Xác nhận xóa người dùng',
      content: `Bạn có chắc chắn muốn xóa người dùng "${record.full_name}" (@${record.username})?`,
      okText: 'Xóa',
      cancelText: 'Hủy',
      okType: 'danger',
      onOk: async () => {
        try {
          setLoading(true);
          
          await axios.delete(
            `${USER_API}/User/${record.id}`,
            {
              headers: {
                'Authorization': `Bearer ${sessionStorage.getItem('token')}`
              }
            }
          );

          message.success('Đã xóa người dùng thành công');
          await fetchUsers();
        } catch (error) {
          console.error('Error deleting user:', error);
          message.error('Không thể xóa người dùng');
        } finally {
          setLoading(false);
        }
      }
    });
  };

  const handleChangePassword = async (userId) => {
    Modal.confirm({
      title: 'Đổi mật khẩu',
      content: (
        <Form
          id="change-password-form"
          layout="vertical"
          onFinish={async (values) => {
            try {
              await axios.post(
                `${USER_API}/User/change-password/${userId}`,
                {
                  currentPassword: values.currentPassword,
                  newPassword: values.newPassword
                },
                {
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${sessionStorage.getItem('token')}`
                  }
                }
              );
              message.success('Đổi mật khẩu thành công');
              Modal.destroyAll();
            } catch (error) {
              console.error('Error changing password:', error);
              message.error('Không thể đổi mật khẩu');
            }
          }}
        >
          <Form.Item
            name="currentPassword"
            label="Mật khẩu hiện tại"
            rules={[{ required: true, message: 'Vui lòng nhập mật khẩu hiện tại' }]}
          >
            <Password />
          </Form.Item>
          <Form.Item
            name="newPassword"
            label="Mật khẩu mới"
            rules={[
              { required: true, message: 'Vui lòng nhập mật khẩu mới' },
              { min: 6, message: 'Mật khẩu phải có ít nhất 6 ký tự' }
            ]}
          >
            <Password />
          </Form.Item>
        </Form>
      ),
      okText: 'Đổi mật khẩu',
      cancelText: 'Hủy',
      onOk: () => {
        document.getElementById('change-password-form').dispatchEvent(
          new Event('submit', { cancelable: true, bubbles: true })
        );
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
      width: 150,
      render: (_, record) => roleTag(record.role_name),
      filters: roles.map(role => ({ text: role.roleName, value: role.id })),
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
        { text: 'Hoạt động', value: 'Active' },
        { text: 'Ngừng hoạt động', value: 'Inactive' }
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
      fixed: 'right',
      render: (_, record) => {
        const items = [
          {
            key: 'view',
            icon: <EyeOutlined />,
            label: 'Xem chi tiết',
            onClick: () => handleOpenModal('view', record)
          },
          {
            key: 'edit',
            icon: <EditOutlined />,
            label: 'Chỉnh sửa',
            onClick: () => handleOpenModal('edit', record)
          },
          {
            key: 'password',
            icon: <LockOutlined />,
            label: 'Đổi mật khẩu',
            onClick: () => handleChangePassword(record.id)
          },
          {
            type: 'divider'
          },
          {
            key: 'delete',
            icon: <CloseCircleOutlined />,
            label: 'Xóa người dùng',
            danger: true,
            onClick: () => handleDelete(record)
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
      <div className="users-page">
        <div className="page-header" style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <Title level={2}>
              <TeamOutlined /> Quản lý người dùng
            </Title>
            <Text type="secondary">Quản lý tất cả tài khoản người dùng trên hệ thống</Text>
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
                prefix={<CheckCircleOutlined />}
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="Admin"
                value={statistics.adminUsers}
                valueStyle={{ color: '#f5222d' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="EVM Staff"
                value={statistics.evmStaffUsers}
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
                  {role.roleName}
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
          scroll={{ x: 1200 }}
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
                  <Descriptions.Item label="Vai trò">
                    {roleTag(selectedUser.role_name)}
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
            {modalMode === 'create' && (
              <>
                <Form.Item
                  name="username"
                  label="Tên đăng nhập"
                  rules={[
                    { required: true, message: 'Vui lòng nhập tên đăng nhập' },
                    { pattern: /^[a-z0-9_]+$/, message: 'Chỉ chấp nhận chữ thường, số và _' }
                  ]}
                >
                  <Input prefix={<UserOutlined />} placeholder="VD: admin_system" />
                </Form.Item>

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

                <Form.Item
                  name="role_id"
                  label="Vai trò"
                  rules={[{ required: true, message: 'Vui lòng chọn vai trò' }]}
                >
                  <Select placeholder="Chọn vai trò">
                    {roles.map(role => (
                      <Select.Option key={role.id} value={role.id}>
                        {role.roleName}
                      </Select.Option>
                    ))}
                  </Select>
                </Form.Item>
              </>
            )}

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

            <Form.Item
              name="avatarFile"
              label="Ảnh đại diện"
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
                    setAvatarFile(file);
                  }
                  return false;
                }}
                maxCount={1}
                listType="picture"
              >
                <Button icon={<UploadOutlined />}>Chọn ảnh đại diện</Button>
              </Upload>
            </Form.Item>

            {modalMode === 'edit' && (
              <Form.Item
                name="status"
                label="Trạng thái"
                initialValue="Active"
                rules={[{ required: true, message: 'Vui lòng chọn trạng thái' }]}
              >
                <Select>
                  <Select.Option value="Active">Hoạt động</Select.Option>
                  <Select.Option value="Inactive">Ngừng hoạt động</Select.Option>
                </Select>
              </Form.Item>
            )}
          </Form>
        )}
      </Modal>
      </div>
    </Spin>
  );
};

export default UsersPage;
