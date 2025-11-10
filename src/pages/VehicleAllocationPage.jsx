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
  Spin,
  Input
} from 'antd';
import {
  SwapOutlined,
  ApartmentOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  ShoppingCartOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useAuth } from '../context/AuthContext';
import { 
  agencyOrderAPI, 
  agencyAPI, 
  allocationAPI, 
  agencyInventoryAPI,
  evInventoryAPI
} from '../services/quotationService';
import { vehicleAPI, vehicleInstanceAPI } from '../services/vehicleService';

const { Title, Text } = Typography;

const VehicleAllocationPage = () => {
  const { currentUser } = useAuth();
  const [orderList, setOrderList] = useState([]);
  const [agencyList, setAgencyList] = useState([]);
  const [vehicleList, setVehicleList] = useState([]);
  const [evInventoryList, setEvInventoryList] = useState([]); // Kho hãng
  const [vehicleInstanceList, setVehicleInstanceList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [selectedAllocation, setSelectedAllocation] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [form] = Form.useForm();

  // Fetch data
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    
    try {
      // Fetch confirmed orders (ready for allocation)
      console.log('Fetching orders...');
      const orders = await agencyOrderAPI.getAll();
      console.log('Orders:', orders);
      console.log('Order statuses:', orders?.map(o => ({ id: o.id, status: o.status })));
      
      // Show all confirmed orders (ready for allocation)
      // Note: Accept both 'Confirmed' and 'confirmed' status
      const confirmedOrders = (orders || []).filter(order => 
        order.status?.toLowerCase() === 'confirmed'
      );
      console.log('Confirmed orders:', confirmedOrders);
      
      // If no confirmed orders, show all orders for testing
      if (confirmedOrders.length === 0 && orders?.length > 0) {
        console.log('No confirmed orders found, showing all orders');
        setOrderList(orders);
      } else {
        setOrderList(confirmedOrders);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
      message.error('Không thể tải danh sách đơn hàng');
    }

    try {
      // Fetch agencies
      console.log('Fetching agencies...');
      const agencies = await agencyAPI.getAll();
      console.log('Agencies:', agencies);
      setAgencyList(agencies || []);
    } catch (error) {
      console.error('Error fetching agencies:', error);
    }

    try {
      // Fetch vehicles
      console.log('Fetching vehicles...');
      const vehicles = await vehicleAPI.getAll();
      console.log('Vehicles:', vehicles);
      setVehicleList(vehicles || []);
    } catch (error) {
      console.error('Error fetching vehicles:', error);
    }

    try {
      // Fetch EV Inventory (Kho hãng - kho trung tâm)
      console.log('Fetching EV Inventory (Kho hãng)...');
      const evInventory = await evInventoryAPI.getAll();
      console.log('EV Inventory:', evInventory);
      setEvInventoryList(evInventory || []);
    } catch (error) {
      console.error('Error fetching EV inventory:', error);
      message.warning('Không thể tải thông tin kho hãng');
    }

    try {
      // Fetch vehicle instances (for VIN details)
      console.log('Fetching vehicle instances...');
      const instances = await vehicleInstanceAPI.getAll();
      console.log('Vehicle instances:', instances);
      setVehicleInstanceList(instances || []);
    } catch (error) {
      console.error('Error fetching vehicle instances:', error);
      // This is acceptable - we can still show the page
    }

    setLoading(false);
  };

  // Calculate statistics
  const stats = {
    totalOrders: orderList.length,
    totalAllocated: orderList.filter(o => o.status === 'Completed').length,
    pendingOrders: orderList.filter(o => o.status === 'Confirmed').length,
    completed: orderList.filter(o => o.status === 'Completed').length
  };

  const handleCreate = (order) => {
    // Lấy danh sách xe có trong EVInventory (kho hãng) cho loại xe này
    const availableInEVInventory = evInventoryList.filter(evItem => {
      // Kiểm tra vehicleInstance có khớp với vehicleId của đơn hàng không
      return evItem.vehicleInstance?.vehicleId === order.vehicleId;
    });
    
    console.log('=== Kiểm tra kho hãng (EVInventory) ===');
    console.log('Vehicle ID:', order.vehicleId);
    console.log('Đơn hàng cần:', order.quantity, 'xe');
    console.log('Kho hãng có:', availableInEVInventory.length, 'xe');
    console.log('Chi tiết xe trong kho:', availableInEVInventory.map(ev => ({
      evInventoryId: ev.id,
      instanceId: ev.vehicleInstanceId,
      vin: ev.vehicleInstance?.vin,
      vehicleId: ev.vehicleInstance?.vehicleId
    })));
    
    // Kiểm tra kho hãng có đủ xe không
    if (availableInEVInventory.length < order.quantity) {
      message.error({
        content: (
          <div>
            <div><strong>Không đủ xe trong kho hãng!</strong></div>
            <div>Đơn hàng cần: <strong>{order.quantity}</strong> xe</div>
            <div>Kho hãng có: <strong>{availableInEVInventory.length}</strong> xe sẵn sàng</div>
            <div style={{ marginTop: 8, color: '#ff4d4f' }}>
              ⚠️ Không thể phân bổ nếu không đủ số lượng!
            </div>
          </div>
        ),
        duration: 6
      });
      return;
    }
    
    setModalMode('create');
    setSelectedOrder(order);
    setIsModalOpen(true);
    form.resetFields();
    
    // Pre-fill order info
    if (order) {
      form.setFieldsValue({
        orderId: order.id,
        agencyContractId: order.agencyContractId,
        requiredQuantity: order.quantity
      });
    }
  };

  const handleViewDetails = (allocation) => {
    setModalMode('view');
    setSelectedAllocation(allocation);
  };

  const handleAllocate = async () => {
    try {
      const values = await form.validateFields();
      
      // Validate: Must select exactly the required quantity
      const selectedInstances = values.vehicleInstanceIds || [];
      const requiredQty = selectedOrder.quantity;
      
      console.log('=== Bắt đầu phân bổ ===');
      console.log('Số lượng yêu cầu:', requiredQty);
      console.log('Số lượng đã chọn:', selectedInstances.length);
      console.log('Danh sách xe đã chọn:', selectedInstances);
      
      if (selectedInstances.length !== requiredQty) {
        message.error({
          content: `Phải chọn đúng ${requiredQty} xe! Bạn đang chọn ${selectedInstances.length} xe.`,
          duration: 5
        });
        return;
      }
      
      setLoading(true);

      // Process each vehicle instance - TẠO ALLOCATION VÀ NHẬP KHO
      for (let i = 0; i < selectedInstances.length; i++) {
        const instanceId = selectedInstances[i];
        
        console.log(`\n--- Đang xử lý xe ${i + 1}/${selectedInstances.length} ---`);
        
        // Step 1: Tạo allocation với agencyOrderId
        const allocationData = {
          agencyContractId: values.agencyContractId,
          vehicleInstanceId: instanceId,
          agencyOrderId: selectedOrder.id
        };

        console.log('Tạo phân bổ:', allocationData);
        await allocationAPI.create(allocationData);
        console.log('✓ Đã tạo phân bổ');

        // Step 2: Nhập kho đại lý ngay sau khi phân bổ
        const order = orderList.find(o => o.id === selectedOrder.id);
        if (order && order.agencyId) {
          const inventoryData = {
            vehicleInstanceId: instanceId
          };

          console.log('Nhập kho đại lý:', { agencyId: order.agencyId, data: inventoryData });
          await agencyInventoryAPI.addToInventory(order.agencyId, inventoryData);
          console.log('✓ Đã nhập kho');
        }
      }

      console.log('\n=== Hoàn thành phân bổ và nhập kho ===');
      message.success({
        content: `Đã phân bổ và nhập kho thành công ${selectedInstances.length} xe. Đơn hàng chuyển sang trạng thái Processing.`,
        duration: 5
      });

      // Update order status to 'Processing'
      await agencyOrderAPI.update(selectedOrder.id, {
        vehicleId: selectedOrder.vehicleId,
        quantity: selectedOrder.quantity,
        status: 'Completed'
      });

      // Reload data
      await fetchData();
      
      form.resetFields();
      setIsModalOpen(false);
      setSelectedOrder(null);

    } catch (error) {
      console.error('Error creating allocation:', error);
      message.error(error.response?.data?.message || 'Lỗi khi tạo phân bổ');
    } finally {
      setLoading(false);
    }
  };

  const statusMeta = (status) => {
    switch (status) {
      case 'completed':
        return { color: 'green', text: 'Đã hoàn thành', badge: 'success', icon: <CheckCircleOutlined />, timeline: 'green' };
      case 'cancelled':
        return { color: 'red', text: 'Đã hủy', badge: 'error', icon: <CloseCircleOutlined />, timeline: 'red' };
      default:
        return { color: 'gold', text: 'Đang chờ', badge: 'processing', icon: <ClockCircleOutlined />, timeline: 'blue' };
    }
  };

  const columns = [
    {
      title: 'Mã đơn',
      dataIndex: 'id',
      key: 'id',
      width: 100,
      render: (text) => <Text strong>#{text}</Text>
    },
    {
      title: 'Đại lý',
      dataIndex: 'agencyId',
      key: 'agencyId',
      width: 200,
      render: (agencyId) => {
        const agency = agencyList.find(a => a.id === agencyId);
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
      title: 'Xe',
      dataIndex: 'vehicleId',
      key: 'vehicleId',
      width: 200,
      render: (vehicleId) => {
        const vehicle = vehicleList.find(v => v.id === vehicleId);
        return (
          <div>
            <Text strong>{vehicle?.variantName || 'N/A'}</Text>
            <br />
            <Tag color="cyan">{vehicle?.color || ''}</Tag>
          </div>
        );
      }
    },
    {
      title: 'Số lượng',
      dataIndex: 'quantity',
      key: 'quantity',
      width: 100,
      render: (quantity) => <Tag color="blue">{quantity} xe</Tag>
    },
    {
      title: 'Ngày tạo',
      dataIndex: 'createdDate',
      key: 'createdDate',
      width: 120,
      render: (date) => dayjs(date).format('DD/MM/YYYY')
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 130,
      render: (status) => {
        const statusConfig = {
          'Confirmed': { color: 'green', text: 'Đã xác nhận', icon: <CheckCircleOutlined /> },
          'Pending': { color: 'gold', text: 'Chờ xác nhận', icon: <ClockCircleOutlined /> },
          'Processing': { color: 'blue', text: 'Đang xử lý', icon: <ClockCircleOutlined /> },
          'Completed': { color: 'cyan', text: 'Đã hoàn thành', icon: <CheckCircleOutlined /> },
          'Cancelled': { color: 'red', text: 'Đã hủy', icon: <CloseCircleOutlined /> }
        };
        const config = statusConfig[status] || statusConfig['Pending'];
        return <Tag color={config.color} icon={config.icon}>{config.text}</Tag>;
      }
    },
    {
      title: 'Thao tác',
      key: 'actions',
      width: 150,
      align: 'center',
      render: (_, record) => {
        const isAllocated = record.status === 'Processing' || record.status === 'Completed';
        
        if (isAllocated) {
          return <Tag color="blue">{record.status === 'Processing' ? 'Đã phân bổ' : 'Hoàn thành'}</Tag>;
        }

        return (
          <Button 
            type="primary" 
            size="small"
            icon={<SwapOutlined />}
            onClick={() => handleCreate(record)}
          >
            Phân bổ xe
          </Button>
        );
      }
    }
  ];

  return (
    <div className="vehicle-allocation-page">
      <Spin spinning={loading}>
        <div className="page-header" style={{ marginBottom: '24px' }}>
          <Title level={2}>
            <SwapOutlined /> Điều phối xe về đại lý
          </Title>
          <Text type="secondary">Phân bổ xe từ kho trung tâm cho các đơn nhập hàng đã được xác nhận</Text>
        </div>

        <Row gutter={16} style={{ marginBottom: '24px' }}>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="Tổng đơn xác nhận"
                value={stats.totalOrders}
                prefix={<ShoppingCartOutlined />}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="Chờ phân bổ"
                value={stats.pendingOrders}
                prefix={<ClockCircleOutlined />}
                valueStyle={{ color: '#faad14' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="Đã phân bổ"
                value={stats.totalAllocated}
                prefix={<CheckCircleOutlined />}
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="Hoàn thành"
                value={stats.completed}
                prefix={<ApartmentOutlined />}
                valueStyle={{ color: '#f5222d' }}
              />
            </Card>
          </Col>
        </Row>

        <Card title="Danh sách đơn nhập hàng đã xác nhận">
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
      </Spin>

      {/* Allocation Modal */}
      <Modal
        title="Phân bổ xe cho đơn hàng"
        open={isModalOpen && modalMode === 'create'}
        onCancel={() => {
          setIsModalOpen(false);
          setSelectedOrder(null);
          form.resetFields();
        }}
        onOk={handleAllocate}
        okText="Phân bổ & Nhập kho"
        cancelText="Hủy"
        width={600}
        confirmLoading={loading}
      >
        {selectedOrder && (
          <div>
            <Descriptions bordered column={1} size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="Mã đơn">#{selectedOrder.id}</Descriptions.Item>
              <Descriptions.Item label="Đại lý">
                {agencyList.find(a => a.id === selectedOrder.agencyId)?.agencyName || 'N/A'}
              </Descriptions.Item>
              <Descriptions.Item label="Xe yêu cầu">
                {vehicleList.find(v => v.id === selectedOrder.vehicleId)?.variantName || 'N/A'} - {vehicleList.find(v => v.id === selectedOrder.vehicleId)?.color || ''}
              </Descriptions.Item>
              <Descriptions.Item label="Số lượng yêu cầu">
                <Tag color="blue">{selectedOrder.quantity} xe</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Kho hãng hiện có">
                <Tag color="green">
                  {evInventoryList.filter(evItem => 
                    evItem.vehicleInstance?.vehicleId === selectedOrder.vehicleId
                  ).length} xe sẵn sàng
                </Tag>
              </Descriptions.Item>
            </Descriptions>

            <Form form={form} layout="vertical">
              <Form.Item name="orderId" hidden>
                <Input />
              </Form.Item>

              <Form.Item name="agencyContractId" hidden>
                <Input />
              </Form.Item>

              <Form.Item name="requiredQuantity" hidden>
                <Input />
              </Form.Item>

              <Form.Item
                name="vehicleInstanceIds"
                label={`Chọn đúng ${selectedOrder.quantity} xe từ kho hãng (Có ${
                  evInventoryList.filter(evItem => 
                    evItem.vehicleInstance?.vehicleId === selectedOrder.vehicleId
                  ).length
                } xe sẵn sàng)`}
                rules={[
                  { required: true, message: 'Vui lòng chọn xe' },
                  {
                    validator: (_, value) => {
                      if (value && value.length === selectedOrder.quantity) {
                        return Promise.resolve();
                      }
                      return Promise.reject(new Error(`Phải chọn đúng ${selectedOrder.quantity} xe - không được thiếu hoặc thừa!`));
                    }
                  }
                ]}
                extra={
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    ⚠️ Phải chọn đúng {selectedOrder.quantity} xe. Nếu không đủ số lượng sẽ KHÔNG được phân bổ!
                  </Text>
                }
              >
                <Select 
                  mode="multiple"
                  placeholder={`Chọn đúng ${selectedOrder.quantity} xe từ kho hãng`}
                  showSearch
                  maxTagCount={3}
                  filterOption={(input, option) =>
                    (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                  }
                  optionFilterProp="label"
                >
                  {evInventoryList
                    .filter(evItem => 
                      evItem.vehicleInstance?.vehicleId === selectedOrder.vehicleId
                    )
                    .map(evItem => {
                      const instance = evItem.vehicleInstance;
                      return (
                        <Select.Option 
                          key={instance.id} 
                          value={instance.id}
                          label={`VIN: ${instance.vin || instance.id}`}
                        >
                          <div>
                            <Text strong>VIN: {instance.vin || instance.id}</Text>
                            <br />
                            <Text type="secondary" style={{ fontSize: '12px' }}>
                              Engine: {instance.engineNumber || 'N/A'} | Kho hãng (EVInventory #{evItem.id})
                            </Text>
                          </div>
                        </Select.Option>
                      );
                    })}
                </Select>
              </Form.Item>

              <div style={{ 
                background: '#fff7e6', 
                border: '1px solid #ffd591', 
                borderRadius: 4, 
                padding: 12,
                marginTop: 16
              }}>
                <Text type="warning" style={{ fontSize: '13px', display: 'block', fontWeight: 500 }}>
                  ⚠️ LƯU Ý QUAN TRỌNG:
                </Text>
                <ul style={{ margin: '8px 0 0 0', paddingLeft: 20 }}>
                  <li>
                    <Text style={{ fontSize: '12px' }}>
                      Phải chọn đúng <strong>{selectedOrder.quantity} xe</strong> từ kho hãng
                    </Text>
                  </li>
                  <li>
                    <Text style={{ fontSize: '12px' }}>
                      Nếu không đủ số lượng sẽ KHÔNG được phân bổ
                    </Text>
                  </li>
                  <li>
                    <Text style={{ fontSize: '12px' }}>
                      Sau khi phân bổ, đơn hàng sẽ chuyển sang trạng thái <strong>Processing</strong>
                    </Text>
                  </li>
                  <li>
                    <Text style={{ fontSize: '12px' }}>
                      Xe sẽ tự động nhập vào kho đại lý ngay sau khi phân bổ
                    </Text>
                  </li>
                </ul>
              </div>
            </Form>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default VehicleAllocationPage;
