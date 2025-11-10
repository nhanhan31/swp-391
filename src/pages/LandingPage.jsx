import React, { useState, useEffect } from 'react';
import {
  Layout,
  Row,
  Col,
  Card,
  Typography,
  Button,
  Input,
  Select,
  Modal,
  Form,
  DatePicker,
  message,
  Carousel,
  Tag,
  Divider,
  Space,
  Empty,
  Spin
} from 'antd';
import {
  CarOutlined,
  ThunderboltOutlined,
  DashboardOutlined,
  EnvironmentOutlined,
  PhoneOutlined,
  MailOutlined,
  CalendarOutlined,
  UserOutlined,
  SearchOutlined,
  FilterOutlined
} from '@ant-design/icons';
import { vehicleAPI, vehicleInstanceAPI } from '../services/vehicleService';
import { agencyAPI, testDriveAPI, agencyInventoryAPI } from '../services/quotationService';
import { customerAPI } from '../services/quotationService';
import dayjs from 'dayjs';
import '../styles/LandingPage.css';

const { Header, Content, Footer } = Layout;
const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { TextArea } = Input;

const LandingPage = () => {
  const [loading, setLoading] = useState(false);
  const [vehicleList, setVehicleList] = useState([]);
  const [agencyList, setAgencyList] = useState([]);
  const [vehicleInstanceList, setVehicleInstanceList] = useState([]);
  const [agencyInventoryData, setAgencyInventoryData] = useState([]);
  const [availableVehicles, setAvailableVehicles] = useState([]);
  const [filteredVehicles, setFilteredVehicles] = useState([]);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [filterModel, setFilterModel] = useState('');
  const [filterColor, setFilterColor] = useState('');
  const [form] = Form.useForm();

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [searchText, filterModel, filterColor, availableVehicles]);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch vehicles
      const vehicles = await vehicleAPI.getAll();
      console.log('Vehicles:', vehicles);
      setVehicleList(vehicles || []);

      // Fetch agencies
      const agencies = await agencyAPI.getAll();
      setAgencyList(agencies || []);

      // Fetch vehicle instances for availability
      const instances = await vehicleInstanceAPI.getAll();
      setVehicleInstanceList(instances || []);

      // Fetch all agency inventories
      const allInventories = [];
      for (const agency of agencies) {
        try {
          const inventories = await agencyInventoryAPI.getByAgencyId(agency.id);
          if (inventories && inventories.length > 0) {
            allInventories.push(...inventories.map(inv => ({
              ...inv,
              agencyId: agency.id,
              agencyName: agency.agencyName,
              location: agency.location
            })));
          }
        } catch (error) {
          console.error(`Error fetching inventory for agency ${agency.id}:`, error);
        }
      }
      
      console.log('All Agency Inventories:', allInventories);
      setAgencyInventoryData(allInventories);

      // Create unique vehicle list from inventory
      const vehicleMap = new Map();
      
      allInventories.forEach(inv => {
        const vehicleId = inv.vehicleDetails?.vehicleId || inv.vehicleId;
        const vehicleInstanceId = inv.vehicleInstanceId;
        
        if (!vehicleId) return;
        
        // Find vehicle details
        const vehicle = vehicles.find(v => v.id === vehicleId);
        const instance = instances.find(i => i.id === vehicleInstanceId);
        
        if (!vehicle) return;
        
        const key = vehicleId;
        
        if (!vehicleMap.has(key)) {
          vehicleMap.set(key, {
            ...vehicle,
            id: vehicleId,
            variantName: vehicle.variantName || inv.vehicleDetails?.variantName || 'N/A',
            modelName: vehicle.option?.modelName || vehicle.modelName || inv.vehicleDetails?.modelName || 'N/A',
            color: vehicle.color || instance?.color || 'N/A',
            availableCount: 0,
            agencies: []
          });
        }
        
        const vehicleData = vehicleMap.get(key);
        vehicleData.availableCount += 1;
        
        if (!vehicleData.agencies.find(a => a.id === inv.agencyId)) {
          vehicleData.agencies.push({
            id: inv.agencyId,
            name: inv.agencyName,
            location: inv.location,
            count: 1
          });
        } else {
          const agencyData = vehicleData.agencies.find(a => a.id === inv.agencyId);
          agencyData.count += 1;
        }
      });

      const availableVehiclesList = Array.from(vehicleMap.values());
      console.log('Available Vehicles:', availableVehiclesList);
      
      setAvailableVehicles(availableVehiclesList);
      setFilteredVehicles(availableVehiclesList);

    } catch (error) {
      console.error('Error fetching data:', error);
      message.error('Không thể tải dữ liệu xe');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...availableVehicles];

    // Search by name
    if (searchText) {
      filtered = filtered.filter(v =>
        v.variantName?.toLowerCase().includes(searchText.toLowerCase()) ||
        v.modelName?.toLowerCase().includes(searchText.toLowerCase())
      );
    }

    // Filter by model
    if (filterModel) {
      filtered = filtered.filter(v => v.modelName === filterModel);
    }

    // Filter by color
    if (filterColor) {
      filtered = filtered.filter(v => v.color === filterColor);
    }

    setFilteredVehicles(filtered);
  };

  const handleViewDetails = (vehicle) => {
    setSelectedVehicle(vehicle);
    setIsDetailModalOpen(true);
  };

  const handleBookTestDrive = (vehicle) => {
    setSelectedVehicle(vehicle);
    setIsBookingModalOpen(true);
    form.resetFields();
  };

  const handleSubmitBooking = async (values) => {
    try {
      setLoading(true);

      // Step 1: Create customer
      const customerData = {
        fullName: values.fullName,
        phone: values.phone,
        email: values.email,
        address: values.address || '',
        identityCard: ''
      };

      const customer = await customerAPI.create(customerData);
      console.log('Customer created:', customer);

      // Step 2: Create test drive appointment
      const testDriveData = {
        customerId: customer.id,
        agencyId: values.agencyId,
        vehicleInstanceId: getAvailableInstance(selectedVehicle.id, values.agencyId),
        appointmentDate: values.appointmentDate.format('YYYY-MM-DDTHH:mm:ss'),
        status: 'Pending',
        notes: values.notes || ''
      };

      await testDriveAPI.create(testDriveData);

      message.success('Đặt lịch lái thử thành công! Chúng tôi sẽ liên hệ với bạn sớm.');
      setIsBookingModalOpen(false);
      form.resetFields();

    } catch (error) {
      console.error('Error booking test drive:', error);
      message.error('Không thể đặt lịch. Vui lòng thử lại sau!');
    } finally {
      setLoading(false);
    }
  };

  const getAvailableInstance = (vehicleId, agencyId) => {
    // Find inventory item for this vehicle at this agency
    const inventoryItem = agencyInventoryData.find(
      inv => (inv.vehicleDetails?.vehicleId === vehicleId || inv.vehicleId === vehicleId) 
        && inv.agencyId === agencyId
    );
    return inventoryItem ? inventoryItem.vehicleInstanceId : null;
  };

  const getInstanceCount = (vehicleId) => {
    return agencyInventoryData.filter(
      inv => inv.vehicleDetails?.vehicleId === vehicleId || inv.vehicleId === vehicleId
    ).length;
  };

  const uniqueModels = [...new Set(availableVehicles.map(v => v.modelName).filter(Boolean))];
  const uniqueColors = [...new Set(availableVehicles.map(v => v.color).filter(Boolean))];

  return (
    <Layout className="landing-page">
      {/* Header */}
      <Header className="landing-header">
        <div className="header-content">
          <div className="logo">
            <ThunderboltOutlined style={{ fontSize: 32, color: '#1890ff' }} />
            <Title level={3} style={{ margin: 0, color: '#fff' }}>EV Agency</Title>
          </div>
          <div className="header-actions">
            <Button type="primary" size="large" onClick={() => window.location.href = '/login'}>
              Đăng nhập
            </Button>
          </div>
        </div>
      </Header>

      <Content className="landing-content">
        {/* Hero Section */}
        <div className="hero-section">
          <div className="hero-overlay">
            <Title level={1} style={{ color: '#fff', marginBottom: 16 }}>
              Khám Phá Tương Lai Xanh
            </Title>
            <Paragraph style={{ fontSize: 18, color: '#fff', marginBottom: 32 }}>
              Trải nghiệm dòng xe điện thế hệ mới - Thân thiện môi trường, Công nghệ hiện đại
            </Paragraph>
            <Button type="primary" size="large" icon={<CarOutlined />} onClick={() => {
              document.getElementById('vehicles-section').scrollIntoView({ behavior: 'smooth' });
            }}>
              Xem Các Mẫu Xe
            </Button>
          </div>
        </div>

        {/* Search & Filter Section */}
        <div className="search-section" id="vehicles-section">
          <Row gutter={[16, 16]} align="middle">
            <Col xs={24} md={10}>
              <Input
                size="large"
                placeholder="Tìm kiếm mẫu xe..."
                prefix={<SearchOutlined />}
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                allowClear
              />
            </Col>
            <Col xs={24} md={7}>
              <Select
                size="large"
                placeholder="Lọc theo dòng xe"
                style={{ width: '100%' }}
                value={filterModel}
                onChange={setFilterModel}
                allowClear
                suffixIcon={<FilterOutlined />}
              >
                {uniqueModels.map(model => (
                  <Option key={model} value={model}>{model}</Option>
                ))}
              </Select>
            </Col>
            <Col xs={24} md={7}>
              <Select
                size="large"
                placeholder="Lọc theo màu sắc"
                style={{ width: '100%' }}
                value={filterColor}
                onChange={setFilterColor}
                allowClear
                suffixIcon={<FilterOutlined />}
              >
                {uniqueColors.map(color => (
                  <Option key={color} value={color}>{color}</Option>
                ))}
              </Select>
            </Col>
          </Row>
        </div>

        {/* Vehicles Grid */}
        <div className="vehicles-section">
          <Title level={2} style={{ textAlign: 'center', marginBottom: 40 }}>
            <CarOutlined /> Các Mẫu Xe Hiện Có
          </Title>

          <Spin spinning={loading}>
            {filteredVehicles.length === 0 ? (
              <Empty description="Không tìm thấy mẫu xe nào" />
            ) : (
              <Row gutter={[24, 24]}>
                {filteredVehicles.map((vehicle) => (
                  <Col xs={24} sm={12} lg={8} key={vehicle.id}>
                    <Card
                      hoverable
                      className="vehicle-card"
                      cover={
                        <div className="vehicle-image-wrapper">
                          <img
                            alt={vehicle.variantName}
                            src={vehicle.vehicleImage || 'https://via.placeholder.com/400x300?text=EV+Vehicle'}
                            className="vehicle-image"
                          />
                          <div className="vehicle-badge">
                            <Tag color={vehicle.availableCount > 5 ? 'green' : vehicle.availableCount > 0 ? 'orange' : 'red'}>
                              {vehicle.availableCount} xe có sẵn
                            </Tag>
                          </div>
                        </div>
                      }
                    >
                      <div className="vehicle-info">
                        <Title level={4}>{vehicle.variantName}</Title>
                        <Text type="secondary">{vehicle.modelName}</Text>
                        
                        <Divider style={{ margin: '12px 0' }} />
                        
                        <Space direction="vertical" size="small" style={{ width: '100%' }}>
                          <div className="vehicle-spec">
                            <ThunderboltOutlined /> {vehicle.batteryCapacity || 'N/A'}
                          </div>
                          <div className="vehicle-spec">
                            <DashboardOutlined /> {vehicle.rangeKM || 'N/A'} km
                          </div>
                          <div className="vehicle-spec">
                            <Tag color="blue">{vehicle.color}</Tag>
                          </div>
                          <div className="vehicle-spec">
                            <EnvironmentOutlined /> Có tại {vehicle.agencies?.length || 0} đại lý
                          </div>
                        </Space>

                        <Divider style={{ margin: '12px 0' }} />

                        <Row gutter={8}>
                          <Col span={12}>
                            <Button 
                              block 
                              onClick={() => handleViewDetails(vehicle)}
                            >
                              Chi Tiết
                            </Button>
                          </Col>
                          <Col span={12}>
                            <Button 
                              type="primary" 
                              block
                              icon={<CalendarOutlined />}
                              onClick={() => handleBookTestDrive(vehicle)}
                              disabled={vehicle.availableCount === 0}
                            >
                              Đặt Lịch
                            </Button>
                          </Col>
                        </Row>
                      </div>
                    </Card>
                  </Col>
                ))}
              </Row>
            )}
          </Spin>
        </div>

        {/* Why Choose Us Section */}
        <div className="features-section">
          <Title level={2} style={{ textAlign: 'center', marginBottom: 40 }}>
            Tại Sao Chọn Chúng Tôi?
          </Title>
          <Row gutter={[32, 32]}>
            <Col xs={24} md={8}>
              <Card className="feature-card">
                <ThunderboltOutlined style={{ fontSize: 48, color: '#1890ff' }} />
                <Title level={4}>Công Nghệ Tiên Tiến</Title>
                <Paragraph>
                  Trang bị công nghệ pin thế hệ mới, sạc nhanh và hệ thống hỗ trợ lái thông minh
                </Paragraph>
              </Card>
            </Col>
            <Col xs={24} md={8}>
              <Card className="feature-card">
                <EnvironmentOutlined style={{ fontSize: 48, color: '#52c41a' }} />
                <Title level={4}>Thân Thiện Môi Trường</Title>
                <Paragraph>
                  Không khí thải, giảm ô nhiễm, góp phần bảo vệ môi trường cho thế hệ tương lai
                </Paragraph>
              </Card>
            </Col>
            <Col xs={24} md={8}>
              <Card className="feature-card">
                <CarOutlined style={{ fontSize: 48, color: '#722ed1' }} />
                <Title level={4}>Trải Nghiệm Lái Thử</Title>
                <Paragraph>
                  Đặt lịch lái thử miễn phí, cảm nhận sự khác biệt của xe điện thế hệ mới
                </Paragraph>
              </Card>
            </Col>
          </Row>
        </div>
      </Content>

      {/* Footer */}
      <Footer className="landing-footer">
        <Row gutter={[32, 32]}>
          <Col xs={24} md={8}>
            <Title level={4} style={{ color: '#fff' }}>EV Agency</Title>
            <Paragraph style={{ color: '#fff' }}>
              Hệ thống phân phối xe điện hàng đầu Việt Nam
            </Paragraph>
          </Col>
          <Col xs={24} md={8}>
            <Title level={5} style={{ color: '#fff' }}>Liên Hệ</Title>
            <Space direction="vertical">
              <Text style={{ color: '#fff' }}>
                <PhoneOutlined /> 1900 xxxx
              </Text>
              <Text style={{ color: '#fff' }}>
                <MailOutlined /> contact@evagency.vn
              </Text>
            </Space>
          </Col>
          <Col xs={24} md={8}>
            <Title level={5} style={{ color: '#fff' }}>Giờ Làm Việc</Title>
            <Text style={{ color: '#fff' }}>
              Thứ 2 - Thứ 7: 8:00 - 18:00<br />
              Chủ Nhật: 9:00 - 17:00
            </Text>
          </Col>
        </Row>
        <Divider style={{ borderColor: '#fff' }} />
        <Text style={{ color: '#fff', textAlign: 'center', display: 'block' }}>
          © 2025 EV Agency. All rights reserved.
        </Text>
      </Footer>

      {/* Vehicle Detail Modal */}
      <Modal
        title={<Space><CarOutlined /> Chi Tiết Xe</Space>}
        open={isDetailModalOpen}
        onCancel={() => setIsDetailModalOpen(false)}
        footer={[
          <Button key="close" onClick={() => setIsDetailModalOpen(false)}>
            Đóng
          </Button>,
          <Button
            key="book"
            type="primary"
            icon={<CalendarOutlined />}
            onClick={() => {
              setIsDetailModalOpen(false);
              handleBookTestDrive(selectedVehicle);
            }}
          >
            Đặt Lịch Lái Thử
          </Button>
        ]}
        width={700}
      >
        {selectedVehicle && (
          <div>
            <img
              src={selectedVehicle.vehicleImage || 'https://via.placeholder.com/600x400?text=EV+Vehicle'}
              alt={selectedVehicle.variantName}
              style={{ width: '100%', borderRadius: 8, marginBottom: 16 }}
            />
            
            <Title level={3}>{selectedVehicle.variantName}</Title>
            <Text type="secondary" style={{ fontSize: 16 }}>{selectedVehicle.modelName}</Text>
            
            <Divider />
            
            <Row gutter={[16, 16]}>
              <Col span={12}>
                <Text strong>Dung lượng pin:</Text>
                <br />
                <Text>{selectedVehicle.batteryCapacity || 'N/A'}</Text>
              </Col>
              <Col span={12}>
                <Text strong>Phạm vi hoạt động:</Text>
                <br />
                <Text>{selectedVehicle.rangeKM || 'N/A'} km</Text>
              </Col>
              <Col span={12}>
                <Text strong>Màu sắc:</Text>
                <br />
                <Tag color="blue">{selectedVehicle.color}</Tag>
              </Col>
              <Col span={12}>
                <Text strong>Trạng thái:</Text>
                <br />
                <Tag color={selectedVehicle.availableCount > 5 ? 'green' : selectedVehicle.availableCount > 0 ? 'orange' : 'red'}>
                  Có sẵn ({selectedVehicle.availableCount} xe)
                </Tag>
              </Col>
            </Row>

            <Divider />

            <Title level={5}>Các đại lý có xe:</Title>
            {selectedVehicle.agencies && selectedVehicle.agencies.length > 0 ? (
              <Space direction="vertical" style={{ width: '100%' }}>
                {selectedVehicle.agencies.map((agency, index) => (
                  <Card key={index} size="small" style={{ background: '#f6f9ff' }}>
                    <Row justify="space-between" align="middle">
                      <Col>
                        <Space direction="vertical" size={0}>
                          <Text strong>{agency.name}</Text>
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            <EnvironmentOutlined /> {agency.location}
                          </Text>
                        </Space>
                      </Col>
                      <Col>
                        <Tag color="green">{agency.count} xe</Tag>
                      </Col>
                    </Row>
                  </Card>
                ))}
              </Space>
            ) : (
              <Text type="secondary">Chưa có xe tại đại lý</Text>
            )}

            <Divider />

            <Title level={5}>Tính năng nổi bật:</Title>
            <Paragraph>{selectedVehicle.features || 'Đang cập nhật'}</Paragraph>

            <Title level={5}>Mô tả:</Title>
            <Paragraph>{selectedVehicle.option?.description || 'Đang cập nhật'}</Paragraph>
          </div>
        )}
      </Modal>

      {/* Booking Modal */}
      <Modal
        title={<Space><CalendarOutlined /> Đặt Lịch Lái Thử</Space>}
        open={isBookingModalOpen}
        onCancel={() => setIsBookingModalOpen(false)}
        footer={null}
        width={600}
      >
        {selectedVehicle && (
          <div>
            <Card size="small" style={{ marginBottom: 16, background: '#f0f5ff' }}>
              <Space>
                <CarOutlined style={{ fontSize: 24, color: '#1890ff' }} />
                <div>
                  <Text strong>{selectedVehicle.variantName}</Text>
                  <br />
                  <Text type="secondary">{selectedVehicle.modelName}</Text>
                </div>
              </Space>
            </Card>

            <Form
              form={form}
              layout="vertical"
              onFinish={handleSubmitBooking}
            >
              <Form.Item
                label="Họ và tên"
                name="fullName"
                rules={[{ required: true, message: 'Vui lòng nhập họ tên!' }]}
              >
                <Input prefix={<UserOutlined />} placeholder="Nguyễn Văn A" />
              </Form.Item>

              <Form.Item
                label="Số điện thoại"
                name="phone"
                rules={[
                  { required: true, message: 'Vui lòng nhập số điện thoại!' },
                  { pattern: /^[0-9]{10}$/, message: 'Số điện thoại không hợp lệ!' }
                ]}
              >
                <Input prefix={<PhoneOutlined />} placeholder="0901234567" />
              </Form.Item>

              <Form.Item
                label="Email"
                name="email"
                rules={[
                  { required: true, message: 'Vui lòng nhập email!' },
                  { type: 'email', message: 'Email không hợp lệ!' }
                ]}
              >
                <Input 
                  prefix={<MailOutlined />} 
                  placeholder="email@example.com"
                />
              </Form.Item>

              <Form.Item
                label="Địa chỉ"
                name="address"
              >
                <Input prefix={<EnvironmentOutlined />} placeholder="Địa chỉ của bạn" />
              </Form.Item>

              <Form.Item
                label="Chọn đại lý"
                name="agencyId"
                rules={[{ required: true, message: 'Vui lòng chọn đại lý!' }]}
              >
                <Select placeholder="Chọn đại lý gần bạn">
                  {selectedVehicle && selectedVehicle.agencies && selectedVehicle.agencies.map(agency => (
                    <Option key={agency.id} value={agency.id}>
                      <Space direction="vertical" size={0}>
                        <Space>
                          <EnvironmentOutlined />
                          <Text strong>{agency.name}</Text>
                        </Space>
                        <Text type="secondary" style={{ fontSize: 12, marginLeft: 20 }}>
                          {agency.location} - Có {agency.count} xe
                        </Text>
                      </Space>
                    </Option>
                  ))}
                </Select>
              </Form.Item>

              <Form.Item
                label="Ngày và giờ hẹn"
                name="appointmentDate"
                rules={[{ required: true, message: 'Vui lòng chọn ngày giờ!' }]}
              >
                <DatePicker
                  showTime
                  format="DD/MM/YYYY HH:mm"
                  placeholder="Chọn ngày giờ"
                  style={{ width: '100%' }}
                  disabledDate={(current) => current && current < dayjs().startOf('day')}
                />
              </Form.Item>

              <Form.Item
                label="Ghi chú"
                name="notes"
              >
                <TextArea rows={3} placeholder="Ghi chú thêm (nếu có)" />
              </Form.Item>

              <Form.Item>
                <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
                  <Button onClick={() => setIsBookingModalOpen(false)}>
                    Hủy
                  </Button>
                  <Button 
                    type="primary" 
                    htmlType="submit" 
                    loading={loading}
                  >
                    Xác Nhận Đặt Lịch
                  </Button>
                </Space>
              </Form.Item>
            </Form>
          </div>
        )}
      </Modal>
    </Layout>
  );
};

export default LandingPage;
