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
  UserOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { agencies as mockAgencies } from '../data/mockData';

const { Title, Text } = Typography;

const AgencyManagementPage = () => {
  const [agencyList, setAgencyList] = useState(mockAgencies);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create'); // 'create' | 'edit' | 'view'
  const [selectedAgency, setSelectedAgency] = useState(null);
  const [form] = Form.useForm();

  const agencyData = useMemo(() => {
    return agencyList.map(agency => ({
      ...agency,
      key: agency.id
    })).sort((a, b) => dayjs(b.created_at).valueOf() - dayjs(a.created_at).valueOf());
  }, [agencyList]);

  const totalAgencies = agencyData.length;
  const activeAgencies = agencyData.filter(a => a.status === 'active').length;
  const inactiveAgencies = agencyData.filter(a => a.status === 'inactive').length;

  const handleCreate = () => {
    setModalMode('create');
    setSelectedAgency(null);
    form.resetFields();
    setIsModalOpen(true);
  };

  const handleEdit = (record) => {
    setModalMode('edit');
    setSelectedAgency(record);
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

  const handleSubmit = () => {
    form.validateFields().then(values => {
      if (modalMode === 'create') {
        const newAgency = {
          id: agencyList.length + 1,
          agency_name: values.agency_name,
          location: values.location,
          address: values.address,
          phone: values.phone,
          email: values.email,
          status: values.status,
          avatar: '/images/agency-default.jpg',
          created_at: dayjs().toISOString(),
          updated_at: dayjs().toISOString()
        };
        setAgencyList([newAgency, ...agencyList]);
        message.success('Tạo đại lý thành công');
      } else if (modalMode === 'edit') {
        const updatedList = agencyList.map(agency =>
          agency.id === selectedAgency.id
            ? {
                ...agency,
                agency_name: values.agency_name,
                location: values.location,
                address: values.address,
                phone: values.phone,
                email: values.email,
                status: values.status,
                updated_at: dayjs().toISOString()
              }
            : agency
        );
        setAgencyList(updatedList);
        message.success('Cập nhật đại lý thành công');
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
    </div>
  );
};

export default AgencyManagementPage;
