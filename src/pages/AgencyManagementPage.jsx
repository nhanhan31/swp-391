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
  Upload,
  message,
  Descriptions,
  Spin
} from 'antd';
import {
  ShopOutlined,
  EnvironmentOutlined,
  PhoneOutlined,
  MailOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  PlusOutlined,
  EditOutlined,
  EyeOutlined,
  MoreOutlined,
  UserOutlined,
  UploadOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { agencyAPI } from '../services/quotationService';

const { Title, Text } = Typography;

const AgencyManagementPage = () => {
  const [agencyList, setAgencyList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create'); // 'create' | 'edit' | 'view'
  const [selectedAgency, setSelectedAgency] = useState(null);
  const [avatarFile, setAvatarFile] = useState(null);
  const [form] = Form.useForm();

  // Fetch data on mount
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const agencies = await agencyAPI.getAll();
      console.log('Agencies:', agencies);
      setAgencyList(agencies || []);
    } catch (error) {
      console.error('Error fetching agencies:', error);
      message.error('Không thể tải danh sách đại lý');
    } finally {
      setLoading(false);
    }
  };

  const agencyData = useMemo(() => {
    return agencyList.map(agency => ({
      ...agency,
      key: agency.id,
      agency_name: agency.agencyName,
      created_at: agency.created_At,
      updated_at: agency.updated_At
    })).sort((a, b) => dayjs(b.created_at).valueOf() - dayjs(a.created_at).valueOf());
  }, [agencyList]);

  const totalAgencies = agencyData.length;
  const activeAgencies = agencyData.filter(a => a.status === 'active').length;
  const inactiveAgencies = agencyData.filter(a => a.status === 'inactive').length;

  const handleCreate = () => {
    setModalMode('create');
    setSelectedAgency(null);
    setAvatarFile(null);
    form.resetFields();
    setIsModalOpen(true);
  };

  const handleEdit = (record) => {
    setModalMode('edit');
    setSelectedAgency(record);
    setAvatarFile(null);
    form.setFieldsValue({
      agency_name: record.agency_name,
      location: record.location,
      address: record.address,
      phone: record.phone,
      email: record.email,
      status: record.status
    });
    setIsModalOpen(true);
  };

  const handleView = (record) => {
    setModalMode('view');
    setSelectedAgency(record);
    setIsModalOpen(true);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      
      // Check if avatar is required
      if (modalMode === 'create' && !avatarFile) {
        message.error('Vui lòng tải lên ảnh đại diện đại lý');
        return;
      }

      setLoading(true);

      if (modalMode === 'create') {
        // Create agency via API
        const createData = {
          agencyName: values.agency_name,
          address: values.address,
          phone: values.phone,
          email: values.email,
          location: values.location || '',
          status: values.status,
          avatar: avatarFile
        };

        await agencyAPI.create(createData);
        message.success('Tạo đại lý mới thành công');
        
        // Refresh data
        await fetchData();
      } else if (modalMode === 'edit') {
        // Update agency via API
        const updateData = {
          agencyName: values.agency_name,
          address: values.address,
          phone: values.phone,
          email: values.email,
          location: values.location,
          status: values.status
        };

        // Add avatar if new file uploaded
        if (avatarFile) {
          updateData.avatar = avatarFile;
        }

        await agencyAPI.update(selectedAgency.id, updateData);
        message.success('Cập nhật đại lý thành công');
        
        // Refresh data
        await fetchData();
      }

      form.resetFields();
      setAvatarFile(null);
      setIsModalOpen(false);
    } catch (error) {
      console.error('Error submitting agency:', error);
      message.error('Lỗi khi lưu thông tin đại lý');
    } finally {
      setLoading(false);
    }
  };

  const statusMeta = (status) => {
    const statusStr = status?.toLowerCase();
    return statusStr === 'active'
      ? { color: 'green', text: 'Hoạt động', icon: <CheckCircleOutlined /> }
      : { color: 'red', text: 'Ngừng hoạt động', icon: <CloseCircleOutlined /> };
  };

  const columns = [
    {
      title: 'Đại lý',
      dataIndex: 'agency_name',
      key: 'agency_name',
      width: 250,
      render: (text, record) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Avatar size={48} icon={<ShopOutlined />} src={record.avatar} />
          <div>
            <Text strong>{text}</Text>
            <br />
            <Text type="secondary" style={{ fontSize: '12px' }}>
              <EnvironmentOutlined /> {record.location}
            </Text>
          </div>
        </div>
      )
    },
    {
      title: 'Địa chỉ',
      dataIndex: 'address',
      key: 'address',
      width: 250,
      ellipsis: true
    },
    {
      title: 'Liên hệ',
      key: 'contact',
      width: 200,
      render: (_, record) => (
        <div>
          <div style={{ marginBottom: '4px' }}>
            <PhoneOutlined style={{ marginRight: '8px', color: '#1890ff' }} />
            <Text>{record.phone}</Text>
          </div>
          <div>
            <MailOutlined style={{ marginRight: '8px', color: '#1890ff' }} />
            <Text>{record.email}</Text>
          </div>
        </div>
      )
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 150,
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
    <div className="agency-management-page">
      <Spin spinning={loading}>
        <div className="page-header" style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <Title level={2}>
              <ShopOutlined /> Quản lý đại lý
            </Title>
            <Text type="secondary">Quản lý thông tin các đại lý VinFast trên toàn quốc</Text>
          </div>
          <Button type="primary" icon={<PlusOutlined />} size="large" onClick={handleCreate}>
            Thêm đại lý mới
          </Button>
        </div>

      <Row gutter={16} style={{ marginBottom: '24px' }}>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="Tổng đại lý"
              value={totalAgencies}
              prefix={<ShopOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="Đang hoạt động"
              value={activeAgencies}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="Ngừng hoạt động"
              value={inactiveAgencies}
              prefix={<CloseCircleOutlined />}
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Card>
        </Col>
      </Row>

      <Card title="Danh sách đại lý">
        <Table
          columns={columns}
          dataSource={agencyData}
          rowKey="id"
          scroll={{ x: 1100 }}
          pagination={{
            pageSize: 10,
            showTotal: (total) => `Tổng ${total} đại lý`
          }}
        />
      </Card>

      <Modal
        title={modalMode === 'create' ? 'Thêm đại lý mới' : modalMode === 'edit' ? 'Chỉnh sửa thông tin đại lý' : 'Chi tiết đại lý'}
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        onOk={modalMode !== 'view' ? handleSubmit : undefined}
        okText={modalMode === 'create' ? 'Tạo đại lý' : 'Cập nhật'}
        cancelText={modalMode === 'view' ? 'Đóng' : 'Hủy'}
        width={700}
        footer={modalMode === 'view' ? [
          <Button key="close" type="primary" onClick={() => setIsModalOpen(false)}>
            Đóng
          </Button>
        ] : undefined}
      >
        {modalMode === 'view' && selectedAgency ? (
          <div style={{ padding: '16px 0' }}>
            <Row gutter={[16, 16]}>
              <Col span={24} style={{ textAlign: 'center', marginBottom: '16px' }}>
                <Avatar size={80} icon={<ShopOutlined />} src={selectedAgency.avatar} />
              </Col>
              <Col span={24}>
                <Descriptions bordered column={1}>
                  <Descriptions.Item label="Tên đại lý">
                    <Text strong>{selectedAgency.agency_name}</Text>
                  </Descriptions.Item>
                  <Descriptions.Item label="Khu vực">
                    <Tag color="blue" icon={<EnvironmentOutlined />}>{selectedAgency.location}</Tag>
                  </Descriptions.Item>
                  <Descriptions.Item label="Địa chỉ">
                    {selectedAgency.address}
                  </Descriptions.Item>
                  <Descriptions.Item label="Số điện thoại">
                    <PhoneOutlined style={{ marginRight: '8px' }} />
                    {selectedAgency.phone}
                  </Descriptions.Item>
                  <Descriptions.Item label="Email">
                    <MailOutlined style={{ marginRight: '8px' }} />
                    {selectedAgency.email}
                  </Descriptions.Item>
                  <Descriptions.Item label="Trạng thái">
                    {(() => {
                      const meta = statusMeta(selectedAgency.status);
                      return <Tag color={meta.color} icon={meta.icon}>{meta.text}</Tag>;
                    })()}
                  </Descriptions.Item>
                  <Descriptions.Item label="Ngày tạo">
                    {dayjs(selectedAgency.created_at).format('DD/MM/YYYY HH:mm')}
                  </Descriptions.Item>
                  <Descriptions.Item label="Cập nhật lần cuối">
                    {dayjs(selectedAgency.updated_at).format('DD/MM/YYYY HH:mm')}
                  </Descriptions.Item>
                </Descriptions>
              </Col>
            </Row>
          </div>
        ) : (
          <Form form={form} layout="vertical">
            <Form.Item
              name="agency_name"
              label="Tên đại lý"
              rules={[{ required: true, message: 'Vui lòng nhập tên đại lý' }]}
            >
              <Input prefix={<ShopOutlined />} placeholder="VD: VinFast Hà Nội" />
            </Form.Item>

            <Form.Item
              label="Ảnh đại diện đại lý"
              required={modalMode === 'create'}
            >
              <Upload
                beforeUpload={(file) => {
                  const isImage = file.type.startsWith('image/');
                  if (!isImage) {
                    message.error('Chỉ được tải lên file ảnh!');
                    return false;
                  }
                  const isLt5M = file.size / 1024 / 1024 < 5;
                  if (!isLt5M) {
                    message.error('Kích thước ảnh phải nhỏ hơn 5MB!');
                    return false;
                  }
                  setAvatarFile(file);
                  return false;
                }}
                onRemove={() => {
                  setAvatarFile(null);
                }}
                maxCount={1}
                listType="picture"
              >
                <Button icon={<UploadOutlined />}>
                  {modalMode === 'create' ? 'Tải lên ảnh (Bắt buộc)' : 'Tải lên ảnh mới'}
                </Button>
              </Upload>
              {modalMode === 'edit' && selectedAgency?.avatar && !avatarFile && (
                <div style={{ marginTop: '8px' }}>
                  <Text type="secondary">Ảnh hiện tại:</Text>
                  <br />
                  <Avatar size={64} src={selectedAgency.avatar} icon={<ShopOutlined />} />
                </div>
              )}
            </Form.Item>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="location"
                  label="Khu vực"
                  rules={[{ required: true, message: 'Vui lòng nhập khu vực' }]}
                >
                  <Input prefix={<EnvironmentOutlined />} placeholder="VD: Hà Nội" />
                </Form.Item>
              </Col>
              <Col span={12}>
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
              </Col>
            </Row>

            <Form.Item
              name="address"
              label="Địa chỉ"
              rules={[{ required: true, message: 'Vui lòng nhập địa chỉ' }]}
            >
              <Input.TextArea rows={2} placeholder="Nhập địa chỉ đầy đủ" />
            </Form.Item>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="phone"
                  label="Số điện thoại"
                  rules={[
                    { required: true, message: 'Vui lòng nhập số điện thoại' },
                    { pattern: /^[0-9\-\s]+$/, message: 'Số điện thoại không hợp lệ' }
                  ]}
                >
                  <Input prefix={<PhoneOutlined />} placeholder="024-1234-5678" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="email"
                  label="Email"
                  rules={[
                    { required: true, message: 'Vui lòng nhập email' },
                    { type: 'email', message: 'Email không hợp lệ' }
                  ]}
                >
                  <Input prefix={<MailOutlined />} placeholder="agency@vinfast.vn" />
                </Form.Item>
              </Col>
            </Row>
          </Form>
        )}
      </Modal>
      </Spin>
    </div>
  );
};

export default AgencyManagementPage;
