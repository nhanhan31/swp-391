import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Row,
  Col,
  Typography,
  Tag,
  Space,
  Statistic,
  Progress,
  Button,
  Dropdown,
  Modal,
  Descriptions,
  Spin,
  message,
  Form,
  Input,
  Select
} from 'antd';
import {
  DatabaseOutlined,
  ApartmentOutlined,
  CarOutlined,
  ExclamationCircleOutlined,
  CheckCircleOutlined,
  EyeOutlined,
  MoreOutlined,
  PlusOutlined
} from '@ant-design/icons';
import { evInventoryAPI, agencyInventoryAPI, agencyAPI } from '../services/quotationService';
import { vehicleAPI, vehicleInstanceAPI } from '../services/vehicleService';

const { Title, Text } = Typography;
const { Option } = Select;

const VehicleInventoryPage = () => {
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [form] = Form.useForm();
  
  // Data states
  const [evInventoryList, setEvInventoryList] = useState([]);
  const [agencyList, setAgencyList] = useState([]);
  const [vehicleList, setVehicleList] = useState([]);
  const [vehicleInstanceList, setVehicleInstanceList] = useState([]);
  const [agencyInventoryData, setAgencyInventoryData] = useState([]);

  // Fetch data on mount
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch EV Inventory (kho trung tâm)
      console.log('Fetching EV Inventory...');
      const evInventory = await evInventoryAPI.getAll();
      console.log('EV Inventory:', evInventory);
      setEvInventoryList(evInventory || []);

      // Fetch vehicles
      console.log('Fetching vehicles...');
      const vehicles = await vehicleAPI.getAll();
      console.log('Vehicles:', vehicles);
      setVehicleList(vehicles || []);

      // Fetch vehicle instances
      console.log('Fetching vehicle instances...');
      const instances = await vehicleInstanceAPI.getAll();
      console.log('Vehicle instances:', instances);
      setVehicleInstanceList(instances || []);

      // Fetch agencies
      console.log('Fetching agencies...');
      const agencies = await agencyAPI.getAll();
      console.log('Agencies:', agencies);
      setAgencyList(agencies || []);

      // Fetch all agency inventories
      const allAgencyInventory = [];
      for (const agency of agencies || []) {
        try {
          console.log(`Fetching inventory for agency ${agency.id}...`);
          const inventory = await agencyInventoryAPI.getByAgencyId(agency.id);
          if (inventory && inventory.length > 0) {
            allAgencyInventory.push(...inventory.map(item => ({
              ...item,
              agencyId: agency.id,
              agencyName: agency.agencyName
            })));
          }
        } catch (error) {
          console.error(`Error fetching inventory for agency ${agency.id}:`, error);
        }
      }
      console.log('All agency inventory:', allAgencyInventory);
      setAgencyInventoryData(allAgencyInventory);

    } catch (error) {
      console.error('Error fetching data:', error);
      message.error('Không thể tải dữ liệu kho');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateVehicle = () => {
    form.resetFields();
    setIsCreateModalOpen(true);
  };

  const handleSubmitCreate = async (values) => {
    try {
      setLoading(true);

      // Step 1: Create vehicle instance
      const instanceData = {
        vehicleId: values.vehicleId,
        vin: values.vin,
        engineNumber: values.engineNumber
      };

      const newInstance = await vehicleInstanceAPI.create(instanceData);
      console.log('Created vehicle instance:', newInstance);

      // Step 2: Add to EV Inventory (nhập kho)
      await evInventoryAPI.create(newInstance.id);
      console.log('Added to EV Inventory');

      message.success('Tạo xe và nhập kho thành công!');
      setIsCreateModalOpen(false);
      form.resetFields();
      
      // Refresh data
      await fetchData();

    } catch (error) {
      console.error('Error creating vehicle:', error);
      message.error('Không thể tạo xe. Vui lòng thử lại!');
    } finally {
      setLoading(false);
    }
  };

  // Calculate inventory by vehicle
  const inventoryByVehicle = vehicleList.map((vehicle, index) => {
    // Count total instances for this vehicle from VehicleInstance API
    const totalInstances = vehicleInstanceList.filter(inst => inst.vehicleId === vehicle.id).length;
    
    // Count allocated instances from both EVInventory and AgencyInventory
    // EVInventory contains allocation records with vehicleInstance inside
    const evAllocated = evInventoryList.filter(item => 
      item.vehicleInstance?.vehicleId === vehicle.id
    ).length;
    
    // AgencyInventory contains direct allocations
    const agencyAllocated = agencyInventoryData.filter(item => {
      const itemVehicleId = item.vehicleDetails?.vehicleId || item.vehicleId;
      const instanceVehicleId = vehicleInstanceList.find(inst => inst.id === item.vehicleInstanceId)?.vehicleId;
      return itemVehicleId === vehicle.id || instanceVehicleId === vehicle.id;
    }).length;
    
    // Total allocated = EVInventory + AgencyInventory (they might overlap, so use the max)
    const totalAllocated = Math.max(evAllocated, agencyAllocated);
    
    const available = totalInstances - totalAllocated;
    const allocationRatio = totalInstances > 0 ? Math.round((totalAllocated / totalInstances) * 100) : 0;
    const status = available <= 5 ? 'low' : available <= 15 ? 'warning' : 'good';

    return {
      id: vehicle.id,
      vehicleId: vehicle.id,
      vehicle_name: vehicle.variantName || 'Đang cập nhật',
      model_name: vehicle.option?.modelName || vehicle.modelName || 'Đang cập nhật',
      color: vehicle.color || 'N/A',
      total_quantity: totalInstances,
      allocated_quantity: totalAllocated,
      available_quantity: available,
      allocation_ratio: allocationRatio,
      status
    };
  }).filter(item => item.total_quantity > 0); // Only show vehicles that have instances

  // Calculate inventory by agency
  const inventoryByAgency = agencyList.map(agency => {
    const stocks = agencyInventoryData.filter(item => item.agencyId === agency.id);
    const totalQuantity = stocks.length;
    
    // Group by vehicle using vehicleDetails
    const vehicleGroups = {};
    stocks.forEach(stock => {
      // Get vehicle name from vehicleDetails if available
      const vehicleName = stock.vehicleDetails?.variantName || 
                         stock.vehicleDetails?.modelName || 
                         'N/A';
      if (!vehicleGroups[vehicleName]) {
        vehicleGroups[vehicleName] = 0;
      }
      vehicleGroups[vehicleName]++;
    });

    return {
      id: agency.id,
      agency_name: agency.agencyName,
      location: agency.location,
      total_quantity: totalQuantity,
      vehicles_count: Object.keys(vehicleGroups).length,
      details: Object.entries(vehicleGroups).map(([name, count]) => ({
        vehicle_name: name,
        quantity: count
      }))
    };
  }).sort((a, b) => b.total_quantity - a.total_quantity);

  // Calculate totals from vehicle instances
  const totalInventory = vehicleInstanceList.length;
  // Use EVInventory or AgencyInventory, whichever is larger (they should be the same ideally)
  const totalAllocated = Math.max(evInventoryList.length, agencyInventoryData.length);
  const totalAvailable = totalInventory - totalAllocated;
  const lowStockVehicles = inventoryByVehicle.filter(item => item.status === 'low').length;

  const handleViewDetails = (record) => {
    setSelectedVehicle(record);
    setIsModalOpen(true);
  };

  const vehicleColumns = [
    {
      title: 'Phiên bản',
      dataIndex: 'vehicle_name',
      key: 'vehicle_name',
      width: 220,
      fixed: 'left',
      render: (text, record) => (
        <div>
          <Text strong>{text}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {record.model_name}
          </Text>
        </div>
      )
    },
    {
      title: 'Màu sắc',
      dataIndex: 'color',
      key: 'color',
      width: 140,
      render: (color) => <Tag color="cyan">{color}</Tag>
    },
    {
      title: 'Tồn kho tổng',
      dataIndex: 'total_quantity',
      key: 'total_quantity',
      width: 140,
      sorter: (a, b) => a.total_quantity - b.total_quantity,
      render: (quantity) => <Tag color="blue">{quantity} xe</Tag>
    },
    {
      title: 'Đã phân bổ',
      dataIndex: 'allocated_quantity',
      key: 'allocated_quantity',
      width: 140,
      render: (quantity) => <Tag color="geekblue">{quantity} xe</Tag>
    },
    {
      title: 'Đang trống',
      dataIndex: 'available_quantity',
      key: 'available_quantity',
      width: 140,
      render: (quantity, record) => (
        <Tag color={record.status === 'low' ? 'red' : record.status === 'warning' ? 'orange' : 'green'}>
          {quantity} xe
        </Tag>
      )
    },
    {
      title: 'Tỷ lệ phân bổ',
      dataIndex: 'allocation_ratio',
      key: 'allocation_ratio',
      width: 200,
      sorter: (a, b) => a.allocation_ratio - b.allocation_ratio,
      render: (ratio) => (
        <Progress
          percent={ratio}
          size="small"
          status={ratio >= 80 ? 'success' : ratio >= 50 ? 'active' : 'exception'}
        />
      )
    },
    {
      title: 'Thao tác',
      key: 'actions',
      width: 80,
      fixed: 'right',
      align: 'center',
      render: (_, record) => {
        const items = [
          {
            key: 'view',
            icon: <EyeOutlined />,
            label: 'Xem chi tiết',
            onClick: () => handleViewDetails(record)
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

  const agencyColumns = [
    {
      title: 'Đại lý',
      dataIndex: 'agency_name',
      key: 'agency_name',
      width: 220,
      render: (text, record) => (
        <div>
          <Text strong>{text}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {record.location}
          </Text>
        </div>
      )
    },
    {
      title: 'Số dòng xe',
      dataIndex: 'vehicles_count',
      key: 'vehicles_count',
      width: 120,
      render: (count) => <Tag color="purple">{count} dòng</Tag>
    },
    {
      title: 'Tổng tồn kho',
      dataIndex: 'total_quantity',
      key: 'total_quantity',
      width: 140,
      sorter: (a, b) => a.total_quantity - b.total_quantity,
      render: (quantity) => <Tag color="blue">{quantity} xe</Tag>
    },
    {
      title: 'Chi tiết',
      key: 'details',
      render: (_, record) => (
        <Space size={[0, 8]} wrap>
          {record.details.map((item, index) => (
            <Tag key={`${record.id}-${item.vehicle_name}-${index}`} color="geekblue">
              {item.vehicle_name}: {item.quantity}
            </Tag>
          ))}
        </Space>
      )
    }
  ];

  return (
    <div className="vehicle-inventory-page">
      <Spin spinning={loading}>
        <div className="page-header" style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <Title level={2}>
              <DatabaseOutlined /> Quản lý tồn kho tổng
            </Title>
            <Text type="secondary">Theo dõi số lượng xe tại kho trung tâm và phân bổ cho đại lý</Text>
          </div>
          <Button 
            type="primary" 
            icon={<PlusOutlined />} 
            size="large"
            onClick={handleCreateVehicle}
          >
            Tạo xe mới & Nhập kho
          </Button>
        </div>

      <Row gutter={16} style={{ marginBottom: '24px' }}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Tổng số xe kho trung tâm"
              value={totalInventory}
              prefix={<DatabaseOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Đã phân bổ cho đại lý"
              value={totalAllocated}
              prefix={<ApartmentOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Xe còn lại"
              value={totalAvailable}
              prefix={<CarOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Dòng xe sắp hết hàng"
              value={lowStockVehicles}
              prefix={<ExclamationCircleOutlined />}
              valueStyle={{ color: '#f5222d' }}
            />
          </Card>
        </Col>
      </Row>

      <Card title="Tồn kho theo phiên bản" style={{ marginBottom: '24px' }}>
        <Table
          columns={vehicleColumns}
          dataSource={inventoryByVehicle}
          rowKey="vehicleId"
          scroll={{ x: 1200 }}
          pagination={{
            pageSize: 6,
            showTotal: (total) => `Tổng ${total} phiên bản`
          }}
        />
      </Card>

      <Card title="Tồn kho theo đại lý">
        <Table
          columns={agencyColumns}
          dataSource={inventoryByAgency}
          rowKey="id"
          pagination={false}
        />
      </Card>

      <Modal
        title={
          <Space>
            <CarOutlined />
            <span>Chi tiết tồn kho</span>
          </Space>
        }
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        footer={[
          <Button key="close" type="primary" onClick={() => setIsModalOpen(false)}>
            Đóng
          </Button>
        ]}
        width={700}
      >
        {selectedVehicle && (
          <Descriptions bordered column={2}>
            <Descriptions.Item label="Phiên bản" span={2}>
              <Text strong>{selectedVehicle.vehicle_name}</Text>
            </Descriptions.Item>
            <Descriptions.Item label="Dòng xe">
              {selectedVehicle.model_name}
            </Descriptions.Item>
            <Descriptions.Item label="Màu sắc">
              {selectedVehicle.color}
            </Descriptions.Item>
            <Descriptions.Item label="Tồn kho tổng">
              {selectedVehicle.total_quantity} xe
            </Descriptions.Item>
            <Descriptions.Item label="Đã phân bổ">
              {selectedVehicle.allocated_quantity} xe
            </Descriptions.Item>
            <Descriptions.Item label="Còn lại">
              {selectedVehicle.available_quantity} xe
            </Descriptions.Item>
            <Descriptions.Item label="Tỷ lệ phân bổ" span={2}>
              <Progress percent={selectedVehicle.allocation_ratio} />
            </Descriptions.Item>
            <Descriptions.Item label="Trạng thái">
              {selectedVehicle.status === 'low' ? (
                <Tag color="red">Sắp hết hàng</Tag>
              ) : selectedVehicle.status === 'warning' ? (
                <Tag color="orange">Cần theo dõi</Tag>
              ) : (
                <Tag color="green">Ổn định</Tag>
              )}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>

      {/* Create Vehicle Modal */}
      <Modal
        title={
          <Space>
            <PlusOutlined />
            <span>Tạo xe mới & Nhập kho</span>
          </Space>
        }
        open={isCreateModalOpen}
        onCancel={() => setIsCreateModalOpen(false)}
        footer={null}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmitCreate}
        >
          <Form.Item
            label="Chọn mẫu xe"
            name="vehicleId"
            rules={[{ required: true, message: 'Vui lòng chọn mẫu xe!' }]}
          >
            <Select
              placeholder="Chọn mẫu xe"
              showSearch
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
              options={vehicleList.map(v => ({
                value: v.id,
                label: `${v.variantName} - ${v.option?.modelName || v.modelName} (${v.color})`
              }))}
            />
          </Form.Item>

          <Form.Item
            label="Số VIN (Vehicle Identification Number)"
            name="vin"
            rules={[
              { required: true, message: 'Vui lòng nhập số VIN!' },
              { min: 17, max: 17, message: 'Số VIN phải có đúng 17 ký tự!' }
            ]}
          >
            <Input 
              placeholder="Nhập số VIN (17 ký tự)" 
              maxLength={17}
            />
          </Form.Item>

          <Form.Item
            label="Số máy"
            name="engineNumber"
            rules={[{ required: true, message: 'Vui lòng nhập số máy!' }]}
          >
            <Input placeholder="Nhập số máy" />
          </Form.Item>

          <Form.Item>
            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button onClick={() => setIsCreateModalOpen(false)}>
                Hủy
              </Button>
              <Button type="primary" htmlType="submit" loading={loading}>
                Tạo xe & Nhập kho
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
      </Spin>
    </div>
  );
};

export default VehicleInventoryPage;
