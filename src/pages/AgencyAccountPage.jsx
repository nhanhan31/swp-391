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
  Input,
  Select,
  Avatar,
  message,
  Descriptions,
  Spin,
  Upload
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
  SafetyOutlined,
  UploadOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const USER_API = 'https://user.agencymanagement.online/api';
const AGENCY_API = 'https://agency.agencymanagement.online/api';

const { Title, Text } = Typography;
const { Password } = Input;

const AgencyAccountPage = () => {
  const { currentUser } = useAuth();
  const [userList, setUserList] = useState([]);
  const [agencies, setAgencies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create'); // 'create' | 'edit' | 'view'
  const [selectedUser, setSelectedUser] = useState(null);
  const [avatarFile, setAvatarFile] = useState(null);
  const [form] = Form.useForm();

  // Fetch agencies
  useEffect(() => {
    const fetchAgencies = async () => {
      try {
        const response = await axios.get(`${AGENCY_API}/Agency`, {
          headers: {
            'Authorization': `Bearer ${sessionStorage.getItem('token')}`
          }
        });
        setAgencies(response.data || []);
      } catch (error) {
        console.error('Error fetching agencies:', error);
        message.error('Không thể tải danh sách đại lý');
      }
    };

    fetchAgencies();
  }, []);

  // Fetch users
  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      try {
        const response = await axios.get(`${USER_API}/User`, {
          headers: {
            'Authorization': `Bearer ${sessionStorage.getItem('token')}`
          }
        });
        
        console.log('All users:', response.data);
        console.log('Sample user:', response.data[0]);
        
        // Filter only agency users (AgencyManager and AgencyStaff)
        const agencyUsers = (response.data || []).filter(user => 
          user.role?.roleName === 'AgencyManager' || user.role?.roleName === 'AgencyStaff'
        );
        
        console.log('Filtered agency users:', agencyUsers);
        
        setUserList(agencyUsers);
      } catch (error) {
        console.error('Error fetching users:', error);
        message.error('Không thể tải danh sách người dùng');
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  const userData = useMemo(() => {
    return userList.map(user => {
      const agency = agencies.find(a => a.id === user.agencyId);

      return {
        id: user.id,
        username: user.userName,
        full_name: user.fullName,
        email: user.email,
        phone: user.phone,
        avatar_url: user.avartarUrl,
        status: user.status,
        role_name: user.role?.roleName,
        role_id: user.role?.id,
        agency_id: user.agencyId,
        agency_name: agency?.agencyName || 'Chưa xác định',
        agency_location: agency?.location || '',
        created_at: user.created_At,
        updated_at: user.updated_At
      };
    }).sort((a, b) => dayjs(b.created_at).valueOf() - dayjs(a.created_at).valueOf());
  }, [userList, agencies]);

  const totalAccounts = userData.length;
  const activeAccounts = userData.filter(u => u.status === 'Active').length;
  const inactiveAccounts = userData.filter(u => u.status === 'Inactive').length;
  const managerAccounts = userData.filter(u => u.role_name === 'AgencyManager').length;

  const handleCreate = () => {
    setModalMode('create');
    setSelectedUser(null);
    form.resetFields();
    setAvatarFile(null);
    setIsModalOpen(true);
  };

  const handleEdit = (record) => {
    setModalMode('edit');
    setSelectedUser(record);
    form.setFieldsValue({
      full_name: record.full_name,
      email: record.email,
      phone: record.phone,
      status: record.status,
      agency_id: record.agency_id
    });
    setAvatarFile(null);
    setIsModalOpen(true);
  };

  const handleView = (record) => {
    setModalMode('view');
    setSelectedUser(record);
    setIsModalOpen(true);
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

        const userResponse = await axios.post(
          `${USER_API}/User`,
          formData,
          {
            headers: {
              'Content-Type': 'multipart/form-data',
              'Authorization': `Bearer ${sessionStorage.getItem('token')}`
            }
          }
        );

        // Assign user to agency
        const newUserId = userResponse.data.id;
        await axios.post(
          `${AGENCY_API}/Agency/${values.agency_id}/assign-user`,
          { userId: newUserId },
          {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${sessionStorage.getItem('token')}`
            }
          }
        );

        message.success('Tạo tài khoản và phân bổ đại lý thành công');
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

        // Check if agency changed, then reassign
        if (values.agency_id && values.agency_id !== selectedUser.agency_id) {
          // Remove from old agency
          if (selectedUser.agency_id) {
            await axios.post(
              `${AGENCY_API}/Agency/${selectedUser.agency_id}/remove-user`,
              { userId: selectedUser.id },
              {
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${sessionStorage.getItem('token')}`
                }
              }
            );
          }

          // Assign to new agency
          await axios.post(
            `${AGENCY_API}/Agency/${values.agency_id}/assign-user`,
            { userId: selectedUser.id },
            {
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${sessionStorage.getItem('token')}`
              }
            }
          );
        }

        message.success('Cập nhật tài khoản thành công');
      }
        
      // Refresh user list
      const response = await axios.get(`${USER_API}/User`, {
        headers: {
          'Authorization': `Bearer ${sessionStorage.getItem('token')}`
        }
      });
      const agencyUsers = (response.data || []).filter(user => 
        user.role?.roleName === 'AgencyManager' || user.role?.roleName === 'AgencyStaff'
      );
      setUserList(agencyUsers);

      form.resetFields();
      setAvatarFile(null);
      setIsModalOpen(false);
    } catch (error) {
      console.error('Error submitting user:', error);
      message.error('Không thể lưu thông tin tài khoản');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (record) => {
    Modal.confirm({
      title: 'Xác nhận xóa tài khoản',
      content: `Bạn có chắc chắn muốn xóa tài khoản "${record.full_name}" (@${record.username})?`,
      okText: 'Xóa',
      cancelText: 'Hủy',
      okType: 'danger',
      onOk: async () => {
        try {
          setLoading(true);
          
          // Remove user from agency first
          if (record.agency_id) {
            await axios.post(
              `${AGENCY_API}/Agency/${record.agency_id}/remove-user`,
              { userId: record.id },
              {
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${sessionStorage.getItem('token')}`
                }
              }
            );
          }

          // Then delete the user
          await axios.delete(
            `${USER_API}/User/${record.id}`,
            {
              headers: {
                'Authorization': `Bearer ${sessionStorage.getItem('token')}`
              }
            }
          );

          message.success('Đã xóa tài khoản thành công');
          
          // Refresh user list
          const response = await axios.get(`${USER_API}/User`, {
            headers: {
              'Authorization': `Bearer ${sessionStorage.getItem('token')}`
            }
          });
          const agencyUsers = (response.data || []).filter(user => 
            user.role?.roleName === 'AgencyManager' || user.role?.roleName === 'AgencyStaff'
          );
          setUserList(agencyUsers);
        } catch (error) {
          console.error('Error deleting user:', error);
          message.error('Không thể xóa tài khoản');
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

  const statusMeta = (status) => {
    return status === 'Active'
      ? { color: 'green', text: 'Hoạt động', icon: <CheckCircleOutlined /> }
      : { color: 'red', text: 'Ngừng hoạt động', icon: <CloseCircleOutlined /> };
  };

  const roleTag = (roleName) => {
    switch (roleName) {
      case 'AgencyManager':
        return <Tag color="blue" icon={<SafetyOutlined />}>Agency Manager</Tag>;
      case 'AgencyStaff':
        return <Tag color="cyan" icon={<UserOutlined />}>Agency Staff</Tag>;
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
      dataIndex: 'role_name',
      key: 'role_name',
      width: 150,
      render: (roleName) => roleTag(roleName),
      filters: [
        { text: 'Agency Manager', value: 'AgencyManager' },
        { text: 'Agency Staff', value: 'AgencyStaff' }
      ],
      onFilter: (value, record) => record.role_name === value
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
            label: 'Xóa tài khoản',
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
              title="Agency Manager"
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
                  <Input prefix={<UserOutlined />} placeholder="VD: staff_hanoi" />
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
                    <Select.Option value={4}>Agency Manager</Select.Option>
                    <Select.Option value={5}>Agency Staff</Select.Option>
                  </Select>
                </Form.Item>

                <Form.Item
                  name="agency_id"
                  label="Đại lý"
                  rules={[{ required: true, message: 'Vui lòng chọn đại lý' }]}
                >
                  <Select
                    placeholder="Chọn đại lý"
                    showSearch
                    optionFilterProp="children"
                  >
                    {agencies.map(agency => (
                      <Select.Option key={agency.id} value={agency.id}>
                        {agency.agencyName} - {agency.location}
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

            {modalMode === 'edit' && (
              <Form.Item
                name="agency_id"
                label="Đại lý"
                rules={[{ required: true, message: 'Vui lòng chọn đại lý' }]}
              >
                <Select
                  placeholder="Chọn đại lý"
                  showSearch
                  optionFilterProp="children"
                >
                  {agencies.map(agency => (
                    <Select.Option key={agency.id} value={agency.id}>
                      {agency.agencyName} - {agency.location}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            )}

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

export default AgencyAccountPage;
