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
  Modal,
  Form,
  Select,
  InputNumber,
  message,
  Descriptions,
  Spin
} from 'antd';
import {
  ShoppingCartOutlined,
  EyeOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  EditOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useAuth } from '../context/AuthContext';
import { agencyOrderAPI, agencyContractAPI, agencyAPI } from '../services/quotationService';
import { vehicleAPI } from '../services/vehicleService';

const { Title, Text } = Typography;

const AgencyOrderManagementPage = () => {
  const { currentUser } = useAuth();
  const [orderList, setOrderList] = useState([]);
  const [agencyList, setAgencyList] = useState([]);
  const [contractList, setContractList] = useState([]);
  const [vehicleList, setVehicleList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('view');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [form] = Form.useForm();

  // Fetch data
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch all orders
      const orders = await agencyOrderAPI.getAll();
      setOrderList(orders || []);

      // Fetch agencies
      const agencies = await agencyAPI.getAll();
      setAgencyList(agencies || []);

      // Fetch vehicles
      const vehicles = await vehicleAPI.getAll();
      setVehicleList(vehicles || []);

    } catch (error) {
      console.error('Error fetching data:', error);
      message.error('Không thể tải dữ liệu');
    } finally {
      setLoading(false);
    }
  };

  // Calculate statistics
  const stats = {
    total: orderList.length,
    pending: orderList.filter(o => o.status === 'Pending').length,
    confirmed: orderList.filter(o => o.status === 'Confirmed').length,
    completed: orderList.filter(o => o.status === 'Completed').length
  };

  // Handle view
  const handleView = (record) => {
    setModalMode('view');
    setSelectedOrder(record);
    setIsModalOpen(true);
  };

  // Handle edit status
  const handleEdit = (record) => {
    setModalMode('edit');
    setSelectedOrder(record);
    form.setFieldsValue({
      status: record.status
    });
    setIsModalOpen(true);
  };

  // Handle submit
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      
      await agencyOrderAPI.update(selectedOrder.id, {
        vehicleId: selectedOrder.vehicleId,
        quantity: selectedOrder.quantity,
        status: values.status
      });

      message.success('Cập nhật trạng thái thành công!');
      setIsModalOpen(false);
      
      // Reload orders
      await fetchData();
    } catch (error) {
      console.error('Error updating order:', error);
      message.error('Lỗi khi cập nhật đơn nhập xe');
    }
  };

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 80
    },
    {
      title: 'Đại lý',
      key: 'agency',
      width: 200,
      render: (_, record) => {
        const agency = agencyList.find(a => a.id === record.agencyId);
        return (
          <div>
            <Text strong>{agency?.agencyName || 'N/A'}</Text>
            <br />
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {agency?.location || ''}
            </Text>
          </div>
        );
      }
    },
    {
      title: 'Hợp đồng',
      dataIndex: 'agencyContractId',
      key: 'agencyContractId',
      width: 120,
      render: (id) => <Text>{id}</Text>
    },
    {
      title: 'Xe',
      key: 'vehicle',
      width: 200,
      render: (_, record) => {
        const vehicle = vehicleList.find(v => v.id === record.vehicleId);
        return (
          <div>
            <Text strong>{vehicle?.variantName || 'N/A'}</Text>
            <br />
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {vehicle?.color || ''}
            </Text>
          </div>
        );
      }
    },
    {
      title: 'Số lượng',
      dataIndex: 'quantity',
      key: 'quantity',
      width: 100,
      render: (qty) => <Tag color="blue">{qty} xe</Tag>
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status) => {
        const statusMap = {
          Pending: { text: 'Chờ xử lý', color: 'orange', icon: <ClockCircleOutlined /> },
          Confirmed: { text: 'Đã xác nhận', color: 'blue', icon: <CheckCircleOutlined /> },
          Completed: { text: 'Hoàn thành', color: 'green', icon: <CheckCircleOutlined /> },
          Cancelled: { text: 'Đã hủy', color: 'red', icon: <CloseCircleOutlined /> }
        };
        const s = statusMap[status] || statusMap.Pending;
        return <Tag color={s.color} icon={s.icon}>{s.text}</Tag>;
      }
    },
    {
      title: 'Ngày tạo',
      dataIndex: 'created_At',
      key: 'created_At',
      width: 120,
      render: (date) => dayjs(date).format('DD/MM/YYYY')
    },
    {
      title: 'Thao tác',
      key: 'actions',
      width: 120,
      align: 'center',
      render: (_, record) => (
        <div>
          <Button
            type="link"
            icon={<EyeOutlined />}
            onClick={() => handleView(record)}
          >
            Xem
          </Button>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            Sửa
          </Button>
        </div>
      )
    }
  ];

  if (loading) {
    return (
      <div style={{ padding: '100px 24px 24px 24px', textAlign: 'center' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Title level={2}>
            <ShoppingCartOutlined /> Quản lý đơn nhập xe đại lý
          </Title>
          <Text type="secondary">Quản lý tất cả đơn nhập xe từ các đại lý</Text>
        </div>
      </div>

      <Row gutter={16} style={{ marginBottom: '24px' }}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Tổng đơn"
              value={stats.total}
              prefix={<ShoppingCartOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Chờ xử lý"
              value={stats.pending}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#fa8c16' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Đã xác nhận"
              value={stats.confirmed}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Hoàn thành"
              value={stats.completed}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
      </Row>

      <Card title="Danh sách đơn nhập xe">
        <Table
          columns={columns}
          dataSource={orderList}
          rowKey="id"
          scroll={{ x: 1100 }}
          pagination={{
            pageSize: 10,
            showTotal: (total) => `Tổng ${total} đơn`
          }}
        />
      </Card>

      <Modal
        title={modalMode === 'view' ? 'Chi tiết đơn nhập xe' : 'Cập nhật trạng thái'}
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        width={600}
        footer={
          modalMode === 'view' ? [
            <Button key="close" type="primary" onClick={() => setIsModalOpen(false)}>
              Đóng
            </Button>
          ] : [
            <Button key="cancel" onClick={() => setIsModalOpen(false)}>
              Hủy
            </Button>,
            <Button key="submit" type="primary" onClick={handleSubmit}>
              Cập nhật
            </Button>
          ]
        }
      >
        {modalMode === 'view' ? (
          <Descriptions bordered column={1}>
            <Descriptions.Item label="ID">
              <Text strong style={{ color: '#1890ff' }}>{selectedOrder?.id}</Text>
            </Descriptions.Item>
            <Descriptions.Item label="Đại lý">
              {agencyList.find(a => a.id === selectedOrder?.agencyId)?.agencyName || 'N/A'}
            </Descriptions.Item>
            <Descriptions.Item label="Hợp đồng">
              {selectedOrder?.agencyContractId}
            </Descriptions.Item>
            <Descriptions.Item label="Xe">
              {vehicleList.find(v => v.id === selectedOrder?.vehicleId)?.variantName || 'N/A'}
            </Descriptions.Item>
            <Descriptions.Item label="Số lượng">
              <Tag color="blue">{selectedOrder?.quantity} xe</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Trạng thái">
              {selectedOrder?.status === 'Pending' && <Tag color="orange" icon={<ClockCircleOutlined />}>Chờ xử lý</Tag>}
              {selectedOrder?.status === 'Confirmed' && <Tag color="blue" icon={<CheckCircleOutlined />}>Đã xác nhận</Tag>}
              {selectedOrder?.status === 'Completed' && <Tag color="green" icon={<CheckCircleOutlined />}>Hoàn thành</Tag>}
              {selectedOrder?.status === 'Cancelled' && <Tag color="red" icon={<CloseCircleOutlined />}>Đã hủy</Tag>}
            </Descriptions.Item>
            <Descriptions.Item label="Ngày tạo">
              {dayjs(selectedOrder?.created_At).format('DD/MM/YYYY HH:mm')}
            </Descriptions.Item>
            <Descriptions.Item label="Ngày cập nhật">
              {dayjs(selectedOrder?.updated_At).format('DD/MM/YYYY HH:mm')}
            </Descriptions.Item>
          </Descriptions>
        ) : (
          <Form form={form} layout="vertical">
            <Descriptions bordered column={1} style={{ marginBottom: '16px' }}>
              <Descriptions.Item label="Đại lý">
                {agencyList.find(a => a.id === selectedOrder?.agencyId)?.agencyName || 'N/A'}
              </Descriptions.Item>
              <Descriptions.Item label="Xe">
                {vehicleList.find(v => v.id === selectedOrder?.vehicleId)?.variantName || 'N/A'}
              </Descriptions.Item>
              <Descriptions.Item label="Số lượng">
                {selectedOrder?.quantity} xe
              </Descriptions.Item>
            </Descriptions>

            <Form.Item
              name="status"
              label="Trạng thái"
              rules={[{ required: true, message: 'Vui lòng chọn trạng thái' }]}
            >
              <Select placeholder="Chọn trạng thái">
                <Select.Option value="Pending">Chờ xử lý</Select.Option>
                <Select.Option value="Confirmed">Đã xác nhận</Select.Option>
                <Select.Option value="Completed">Hoàn thành</Select.Option>
                <Select.Option value="Cancelled">Đã hủy</Select.Option>
              </Select>
            </Form.Item>
          </Form>
        )}
      </Modal>
    </div>
  );
};

export default AgencyOrderManagementPage;
