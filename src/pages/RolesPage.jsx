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
  Checkbox,
  Descriptions,
  Statistic,
  Row,
  Col,
  message,
  Divider,
  Alert
} from 'antd';
import {
  SafetyOutlined,
  PlusOutlined,
  EditOutlined,
  EyeOutlined,
  TeamOutlined,
  CheckCircleOutlined
} from '@ant-design/icons';
import { roles as mockRoles, users } from '../data/mockData';

const { Title, Text } = Typography;

// Mock permissions data
const permissions = [
  {
    category: 'Quản lý xe',
    permissions: [
      { key: 'vehicles.view', name: 'Xem danh sách xe' },
      { key: 'vehicles.create', name: 'Thêm xe mới' },
      { key: 'vehicles.edit', name: 'Chỉnh sửa xe' },
      { key: 'vehicles.delete', name: 'Xóa xe' }
    ]
  },
  {
    category: 'Quản lý đại lý',
    permissions: [
      { key: 'agencies.view', name: 'Xem danh sách đại lý' },
      { key: 'agencies.create', name: 'Thêm đại lý' },
      { key: 'agencies.edit', name: 'Chỉnh sửa đại lý' },
      { key: 'agencies.delete', name: 'Xóa đại lý' }
    ]
  },
  {
    category: 'Quản lý người dùng',
    permissions: [
      { key: 'users.view', name: 'Xem danh sách người dùng' },
      { key: 'users.create', name: 'Thêm người dùng' },
      { key: 'users.edit', name: 'Chỉnh sửa người dùng' },
      { key: 'users.delete', name: 'Xóa người dùng' }
    ]
  },
  {
    category: 'Quản lý bán hàng',
    permissions: [
      { key: 'sales.view', name: 'Xem đơn hàng' },
      { key: 'sales.create', name: 'Tạo đơn hàng' },
      { key: 'sales.edit', name: 'Chỉnh sửa đơn hàng' },
      { key: 'sales.approve', name: 'Duyệt đơn hàng' }
    ]
  },
  {
    category: 'Báo cáo',
    permissions: [
      { key: 'reports.sales', name: 'Xem báo cáo doanh số' },
      { key: 'reports.inventory', name: 'Xem báo cáo tồn kho' },
      { key: 'reports.financial', name: 'Xem báo cáo tài chính' },
      { key: 'reports.export', name: 'Xuất báo cáo' }
    ]
  },
  {
    category: 'Cài đặt hệ thống',
    permissions: [
      { key: 'settings.view', name: 'Xem cài đặt' },
      { key: 'settings.edit', name: 'Chỉnh sửa cài đặt' },
      { key: 'settings.backup', name: 'Sao lưu dữ liệu' },
      { key: 'settings.restore', name: 'Khôi phục dữ liệu' }
    ]
  }
];

// Mock role permissions
const rolePermissions = {
  1: permissions.flatMap(cat => cat.permissions.map(p => p.key)), // Admin - all permissions
  2: [
    'vehicles.view', 'vehicles.create', 'vehicles.edit',
    'agencies.view', 'agencies.create', 'agencies.edit',
    'reports.sales', 'reports.inventory', 'reports.export'
  ], // EVM Staff
  3: [
    'vehicles.view',
    'sales.view', 'sales.create', 'sales.edit', 'sales.approve',
    'reports.sales', 'reports.inventory'
  ], // Dealer Manager
  4: [
    'vehicles.view',
    'sales.view', 'sales.create', 'sales.edit'
  ] // Dealer Staff
};

const RolesPage = () => {
  const [roleList, setRoleList] = useState(mockRoles);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [selectedRole, setSelectedRole] = useState(null);
  const [form] = Form.useForm();
  const [selectedPermissions, setSelectedPermissions] = useState([]);

  // Statistics
  const statistics = useMemo(() => {
    const stats = {};
    roleList.forEach(role => {
      stats[role.role_name] = users.filter(u => u.role_id === role.id).length;
    });
    return {
      totalRoles: roleList.length,
      totalUsers: users.length,
      ...stats
    };
  }, [roleList]);

  const handleOpenModal = (mode, record = null) => {
    setModalMode(mode);
    setSelectedRole(record);
    setIsModalVisible(true);

    if (mode === 'edit' && record) {
      form.setFieldsValue({
        role_name: record.role_name,
        description: record.description
      });
      setSelectedPermissions(rolePermissions[record.id] || []);
    } else if (mode === 'create') {
      form.resetFields();
      setSelectedPermissions([]);
    } else if (mode === 'view' && record) {
      setSelectedPermissions(rolePermissions[record.id] || []);
    }
  };

  const handleCloseModal = () => {
    setIsModalVisible(false);
    setSelectedRole(null);
    form.resetFields();
    setSelectedPermissions([]);
  };

  const handleSubmit = () => {
    form.validateFields().then(values => {
      if (modalMode === 'create') {
        const newRole = {
          id: roleList.length + 1,
          role_name: values.role_name,
          description: values.description
        };
        setRoleList([...roleList, newRole]);
        rolePermissions[newRole.id] = selectedPermissions;
        message.success('Thêm vai trò mới thành công');
      } else if (modalMode === 'edit') {
        const updatedList = roleList.map(role => 
          role.id === selectedRole.id 
            ? { ...role, role_name: values.role_name, description: values.description }
            : role
        );
        setRoleList(updatedList);
        rolePermissions[selectedRole.id] = selectedPermissions;
        message.success('Cập nhật vai trò thành công');
      }
      
      handleCloseModal();
    });
  };

  const handlePermissionChange = (permissionKey, checked) => {
    if (checked) {
      setSelectedPermissions([...selectedPermissions, permissionKey]);
    } else {
      setSelectedPermissions(selectedPermissions.filter(p => p !== permissionKey));
    }
  };

  const handleCategoryChange = (category, checked) => {
    const categoryPermissions = category.permissions.map(p => p.key);
    if (checked) {
      const newPermissions = [...new Set([...selectedPermissions, ...categoryPermissions])];
      setSelectedPermissions(newPermissions);
    } else {
      setSelectedPermissions(selectedPermissions.filter(p => !categoryPermissions.includes(p)));
    }
  };

  const columns = [
    {
      title: 'Vai trò',
      dataIndex: 'role_name',
      key: 'role_name',
      width: 200,
      render: (text, record) => (
        <Space>
          <SafetyOutlined style={{ fontSize: '20px', color: '#1890ff' }} />
          <Text strong>{text}</Text>
        </Space>
      )
    },
    {
      title: 'Mô tả',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true
    },
    {
      title: 'Số người dùng',
      key: 'userCount',
      width: 130,
      align: 'center',
      render: (_, record) => {
        const count = users.filter(u => u.role_id === record.id).length;
        return (
          <Tag color="blue" icon={<TeamOutlined />}>
            {count} người
          </Tag>
        );
      }
    },
    {
      title: 'Quyền',
      key: 'permissions',
      width: 120,
      align: 'center',
      render: (_, record) => {
        const perms = rolePermissions[record.id] || [];
        return (
          <Tag color="green">
            {perms.length} quyền
          </Tag>
        );
      }
    },
    {
      title: 'Thao tác',
      key: 'actions',
      width: 180,
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
            disabled={record.id === 1}
          >
            Sửa
          </Button>
        </Space>
      )
    }
  ];

  return (
    <div className="roles-page">
      <div className="page-header" style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Title level={2}>
            <SafetyOutlined /> Quản lý vai trò & Phân quyền
          </Title>
          <Text type="secondary">Quản lý vai trò và cấp quyền truy cập hệ thống</Text>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => handleOpenModal('create')}
          size="large"
        >
          Thêm vai trò
        </Button>
      </div>

      <Alert
        message="Lưu ý"
        description="Vai trò Admin không thể chỉnh sửa hoặc xóa. Hãy cẩn thận khi phân quyền để đảm bảo an toàn hệ thống."
        type="info"
        showIcon
        closable
        style={{ marginBottom: '24px' }}
      />

      <Row gutter={16} style={{ marginBottom: '24px' }}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Tổng vai trò"
              value={statistics.totalRoles}
              prefix={<SafetyOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Admin"
              value={statistics['Admin'] || 0}
              prefix={<TeamOutlined />}
              valueStyle={{ color: '#f5222d' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="EVM Staff"
              value={statistics['EVM Staff'] || 0}
              prefix={<TeamOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Dealer"
              value={(statistics['Dealer Manager'] || 0) + (statistics['Dealer Staff'] || 0)}
              prefix={<TeamOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
      </Row>

      <Card>
        <Table
          columns={columns}
          dataSource={roleList}
          rowKey="id"
          pagination={false}
        />
      </Card>

      <Modal
        title={
          modalMode === 'create' ? 'Thêm vai trò mới' :
          modalMode === 'edit' ? 'Chỉnh sửa vai trò' :
          'Chi tiết vai trò'
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
        width={800}
      >
        {modalMode === 'view' && selectedRole ? (
          <>
            <Descriptions bordered column={1}>
              <Descriptions.Item label="Tên vai trò">
                {selectedRole.role_name}
              </Descriptions.Item>
              <Descriptions.Item label="Mô tả">
                {selectedRole.description || 'Không có'}
              </Descriptions.Item>
              <Descriptions.Item label="Số người dùng">
                {users.filter(u => u.role_id === selectedRole.id).length} người
              </Descriptions.Item>
            </Descriptions>

            <Divider>Quyền truy cập</Divider>
            {permissions.map(category => {
              const categoryPerms = category.permissions.filter(p => 
                selectedPermissions.includes(p.key)
              );
              
              if (categoryPerms.length === 0) return null;

              return (
                <div key={category.category} style={{ marginBottom: '16px' }}>
                  <Text strong>{category.category}:</Text>
                  <div style={{ marginTop: '8px', marginLeft: '16px' }}>
                    {categoryPerms.map(perm => (
                      <Tag 
                        key={perm.key} 
                        color="success" 
                        icon={<CheckCircleOutlined />}
                        style={{ marginBottom: '8px' }}
                      >
                        {perm.name}
                      </Tag>
                    ))}
                  </div>
                </div>
              );
            })}
          </>
        ) : (
          <>
            <Form form={form} layout="vertical">
              <Form.Item
                name="role_name"
                label="Tên vai trò"
                rules={[{ required: true, message: 'Vui lòng nhập tên vai trò' }]}
              >
                <Input placeholder="Nhập tên vai trò" />
              </Form.Item>

              <Form.Item
                name="description"
                label="Mô tả"
              >
                <Input.TextArea
                  rows={2}
                  placeholder="Nhập mô tả vai trò (tùy chọn)"
                />
              </Form.Item>
            </Form>

            <Divider>Phân quyền</Divider>
            <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
              {permissions.map(category => {
                const allChecked = category.permissions.every(p => 
                  selectedPermissions.includes(p.key)
                );
                const someChecked = category.permissions.some(p => 
                  selectedPermissions.includes(p.key)
                );

                return (
                  <div key={category.category} style={{ marginBottom: '24px' }}>
                    <Checkbox
                      checked={allChecked}
                      indeterminate={someChecked && !allChecked}
                      onChange={(e) => handleCategoryChange(category, e.target.checked)}
                    >
                      <Text strong>{category.category}</Text>
                    </Checkbox>
                    <div style={{ marginLeft: '24px', marginTop: '8px' }}>
                      {category.permissions.map(perm => (
                        <div key={perm.key} style={{ marginBottom: '8px' }}>
                          <Checkbox
                            checked={selectedPermissions.includes(perm.key)}
                            onChange={(e) => handlePermissionChange(perm.key, e.target.checked)}
                          >
                            {perm.name}
                          </Checkbox>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </Modal>
    </div>
  );
};

export default RolesPage;
