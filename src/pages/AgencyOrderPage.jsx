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
  Input,
  Select,
  InputNumber,
  message,
  Descriptions,
  Spin,
  Checkbox
} from 'antd';
import {
  ShoppingCartOutlined,
  PlusOutlined,
  EyeOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  CarOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useAuth } from '../context/AuthContext';
import { agencyOrderAPI, agencyContractAPI, agencyInventoryAPI, agencyOrderPaymentAPI, allocationAPI } from '../services/quotationService';
import { vehicleAPI } from '../services/vehicleService';

const { Title, Text } = Typography;

const AgencyOrderPage = () => {
  const { currentUser } = useAuth();
  const [orderList, setOrderList] = useState([]);
  const [contractList, setContractList] = useState([]);
  const [vehicleList, setVehicleList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [form] = Form.useForm();
  const [isReceiveModalOpen, setIsReceiveModalOpen] = useState(false);
  const [orderVehicles, setOrderVehicles] = useState([]);
  const [selectedVehicles, setSelectedVehicles] = useState([]);

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      if (!currentUser?.agency?.id) {
        message.error('Không tìm thấy thông tin đại lý');
        return;
      }

      try {
        setLoading(true);

        // Fetch orders
        const orders = await agencyOrderAPI.getByAgency(currentUser.agency.id);
        setOrderList(orders || []);

        // Fetch contracts
        const contracts = await agencyContractAPI.getByAgencyId(currentUser.agency.id);
        setContractList(contracts || []);

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

    fetchData();
  }, [currentUser]);

  // Calculate statistics
  const stats = {
    total: orderList.length,
    pending: orderList.filter(o => o.status === 'Pending').length,
    confirmed: orderList.filter(o => o.status === 'Confirmed').length,
    processing: orderList.filter(o => o.status === 'Processing').length,
    completed: orderList.filter(o => o.status === 'Completed').length
  };

  // Handle create
  const handleCreate = () => {
    setModalMode('create');
    setSelectedOrder(null);
    form.resetFields();
    setIsModalOpen(true);
  };

  // Handle view
  const handleView = (record) => {
    setModalMode('view');
    setSelectedOrder(record);
    setIsModalOpen(true);
  };

  // Handle receive vehicles (nhập kho)
  const handleReceiveVehicles = async (record) => {
    try {
      setLoading(true);
      setSelectedOrder(record);
      
      // Fetch allocations for this order
      const allocations = await allocationAPI.getByOrderId(record.id);
      console.log('Order allocations:', allocations);
      
      setOrderVehicles(allocations || []);
      setSelectedVehicles([]);
      setIsReceiveModalOpen(true);
    } catch (error) {
      console.error('Error fetching order vehicles:', error);
      message.error('Không thể tải danh sách xe');
    } finally {
      setLoading(false);
    }
  };

  // Handle confirm receive vehicles
  const handleConfirmReceive = async () => {
    try {
      if (selectedVehicles.length === 0) {
        message.warning('Vui lòng chọn ít nhất 1 xe để nhập kho');
        return;
      }

      setLoading(true);

      // Import selected vehicles to agency inventory
      for (const allocationId of selectedVehicles) {
        const allocation = orderVehicles.find(a => a.id === allocationId);
        if (allocation) {
          await agencyInventoryAPI.addToInventory(currentUser.agency.id, {
            vehicleInstanceId: allocation.vehicleInstanceId
          });
        }
      }

      // Check if all vehicles are received
      if (selectedVehicles.length === orderVehicles.length) {
        // Update order status to Completed
        await agencyOrderAPI.update(selectedOrder.id, {
          status: 'Completed'
        });
        message.success('Đã nhập kho toàn bộ xe và hoàn thành đơn hàng!');
      } else {
        message.success(`Đã nhập kho ${selectedVehicles.length} xe`);
      }

      setIsReceiveModalOpen(false);
      
      // Reload orders
      const orders = await agencyOrderAPI.getByAgency(currentUser.agency.id);
      setOrderList(orders || []);
    } catch (error) {
      console.error('Error receiving vehicles:', error);
      message.error('Lỗi khi nhập kho');
    } finally {
      setLoading(false);
    }
  };

  // Handle submit
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      
      const orderData = {
        agencyId: currentUser.agency.id,
        agencyContractId: values.agencyContractId,
        vehicleId: values.vehicleId,
        quantity: values.quantity
      };

      if (modalMode === 'create') {
        await agencyOrderAPI.create(orderData);
        message.success('Tạo đơn nhập xe thành công!');
      } else if (modalMode === 'edit') {
        await agencyOrderAPI.update(selectedOrder.id, values);
        message.success('Cập nhật đơn nhập xe thành công!');
      }

      setIsModalOpen(false);
      
      // Reload orders
      const orders = await agencyOrderAPI.getByAgency(currentUser.agency.id);
      setOrderList(orders || []);
    } catch (error) {
      console.error('Error saving order:', error);
      message.error('Lỗi khi lưu đơn nhập xe');
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
      title: 'Hợp đồng',
      dataIndex: 'agencyContractId',
      key: 'agencyContractId',
      width: 150,
      render: (contractId) => {
        const contract = contractList.find(c => c.id === contractId);
        return contract ? contract.contractNumber : 'N/A';
      }
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
          Processing: { text: 'Chờ nhập kho', color: 'purple', icon: <CarOutlined /> },
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
      width: 150,
      align: 'center',
      render: (_, record) => (
        <>
          <Button
            type="link"
            icon={<EyeOutlined />}
            onClick={() => handleView(record)}
          >
            Xem
          </Button>
          {record.status === 'Processing' && (
            <Button
              type="primary"
              size="small"
              icon={<CarOutlined />}
              onClick={() => handleReceiveVehicles(record)}
            >
              Nhập kho
            </Button>
          )}
        </>
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
            <ShoppingCartOutlined /> Quản lý đơn nhập xe
          </Title>
          <Text type="secondary">Quản lý các đơn nhập xe từ VinFast</Text>
        </div>
        <Button type="primary" icon={<PlusOutlined />} size="large" onClick={handleCreate}>
          Tạo đơn nhập xe
        </Button>
      </div>

      <Row gutter={16} style={{ marginBottom: '24px' }}>
        <Col xs={24} sm={12} lg={6} xl={4}>
          <Card>
            <Statistic
              title="Tổng đơn"
              value={stats.total}
              prefix={<ShoppingCartOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6} xl={4}>
          <Card>
            <Statistic
              title="Chờ xử lý"
              value={stats.pending}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#fa8c16' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6} xl={4}>
          <Card>
            <Statistic
              title="Đã xác nhận"
              value={stats.confirmed}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6} xl={4}>
          <Card>
            <Statistic
              title="Chờ nhập kho"
              value={stats.processing}
              prefix={<CarOutlined />}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6} xl={4}>
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
          scroll={{ x: 900 }}
          pagination={{
            pageSize: 10,
            showTotal: (total) => `Tổng ${total} đơn`
          }}
        />
      </Card>

      <Modal
        title={modalMode === 'create' ? 'Tạo đơn nhập xe mới' : 'Chi tiết đơn nhập xe'}
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
              {modalMode === 'create' ? 'Tạo đơn' : 'Cập nhật'}
            </Button>
          ]
        }
      >
        {modalMode === 'view' ? (
          <Descriptions bordered column={1}>
            <Descriptions.Item label="ID">
              <Text strong style={{ color: '#1890ff' }}>{selectedOrder?.id}</Text>
            </Descriptions.Item>
            <Descriptions.Item label="Hợp đồng">
              {contractList.find(c => c.id === selectedOrder?.agencyContractId)?.contractNumber || 'N/A'}
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
            </Descriptions.Item>
            <Descriptions.Item label="Ngày tạo">
              {dayjs(selectedOrder?.created_At).format('DD/MM/YYYY HH:mm')}
            </Descriptions.Item>
          </Descriptions>
        ) : (
          <Form form={form} layout="vertical">
            <Form.Item
              name="agencyContractId"
              label="Chọn hợp đồng"
              rules={[{ required: true, message: 'Vui lòng chọn hợp đồng' }]}
            >
              <Select
                placeholder="Chọn hợp đồng"
                showSearch
                filterOption={(input, option) =>
                  (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                }
                options={contractList
                  .filter(c => c.status === 'Active')
                  .map(contract => ({
                    label: `${contract.contractNumber} (${dayjs(contract.contractDate).format('DD/MM/YYYY')})`,
                    value: contract.id
                  }))}
              />
            </Form.Item>

            <Form.Item
              name="vehicleId"
              label="Chọn xe"
              rules={[{ required: true, message: 'Vui lòng chọn xe' }]}
            >
              <Select
                placeholder="Chọn xe"
                showSearch
                filterOption={(input, option) =>
                  (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                }
                options={vehicleList.map(vehicle => ({
                  label: `${vehicle.variantName} - ${vehicle.color}`,
                  value: vehicle.id
                }))}
              />
            </Form.Item>

            <Form.Item
              name="quantity"
              label="Số lượng"
              rules={[{ required: true, message: 'Vui lòng nhập số lượng' }]}
            >
              <InputNumber
                style={{ width: '100%' }}
                min={1}
                placeholder="Nhập số lượng xe"
              />
            </Form.Item>
          </Form>
        )}
      </Modal>

      {/* Modal nhập kho */}
      <Modal
        title={`Nhập kho - Đơn hàng #${selectedOrder?.id}`}
        open={isReceiveModalOpen}
        onCancel={() => setIsReceiveModalOpen(false)}
        width={800}
        footer={[
          <Button key="cancel" onClick={() => setIsReceiveModalOpen(false)}>
            Hủy
          </Button>,
          <Button 
            key="submit" 
            type="primary" 
            onClick={handleConfirmReceive}
            disabled={selectedVehicles.length === 0}
          >
            Nhập kho ({selectedVehicles.length} xe)
          </Button>
        ]}
      >
        <div style={{ marginBottom: 16 }}>
          <Text strong>Số lượng xe: </Text>
          <Tag color="blue">{orderVehicles.length} xe</Tag>
        </div>
        
        <Table
          size="small"
          rowSelection={{
            selectedRowKeys: selectedVehicles,
            onChange: (keys) => setSelectedVehicles(keys)
          }}
          columns={[
            {
              title: 'STT',
              width: 60,
              render: (_, __, index) => index + 1
            },
            {
              title: 'VIN',
              dataIndex: ['vehicleInstance', 'vin'],
              key: 'vin',
              render: (vin) => <Text code>{vin || 'N/A'}</Text>
            },
            {
              title: 'Xe',
              render: (_, record) => {
                const vehicle = vehicleList.find(v => v.id === record.vehicleInstance?.vehicleId);
                return vehicle?.variantName || 'N/A';
              }
            },
            {
              title: 'Màu',
              dataIndex: ['vehicleInstance', 'color'],
              key: 'color'
            },
            {
              title: 'Trạng thái',
              render: () => <Tag color="green">Sẵn sàng</Tag>
            }
          ]}
          dataSource={orderVehicles}
          rowKey="id"
          pagination={false}
        />
      </Modal>
    </div>
  );
};

export default AgencyOrderPage;
