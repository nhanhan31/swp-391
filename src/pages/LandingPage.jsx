import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Tag,
  Divider,
  Space,
  Empty,
  Spin,
  Tabs,
  Statistic,
  Avatar,
  Alert
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
  FilterOutlined,
  ShopOutlined,
  InfoCircleOutlined
} from '@ant-design/icons';
import { vehicleAPI, vehicleInstanceAPI } from '../services/vehicleService';
import { agencyAPI, testDriveAPI, agencyInventoryAPI, emailVerificationAPI } from '../services/quotationService';
import { customerAPI } from '../services/quotationService';
import dayjs from 'dayjs';
import '../styles/LandingPage.css';
import VehicleComparePage from './VehicleComparePage';

const { Header, Content, Footer } = Layout;
const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { TextArea } = Input;

const LandingPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  // Data States
  const [vehicleList, setVehicleList] = useState([]); // Dữ liệu gốc tất cả xe
  const [agencyList, setAgencyList] = useState([]); // Dữ liệu gốc tất cả đại lý
  const [vehicleInstanceList, setVehicleInstanceList] = useState([]);
  const [agencyInventoryData, setAgencyInventoryData] = useState([]); // Kho tổng hợp

  // UI/Filter States
  const [processedVehicles, setProcessedVehicles] = useState([]); // Xe đã xử lý số lượng tồn kho
  const [filteredVehicles, setFilteredVehicles] = useState([]); // Xe hiển thị sau khi search/filter
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [selectedAgency, setSelectedAgency] = useState(null); // Đại lý đang xem chi tiết

  // Modal States
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isAgencyModalOpen, setIsAgencyModalOpen] = useState(false); // Modal xem kho đại lý

  // Customer Check & OTP States
  const [isExistingCustomer, setIsExistingCustomer] = useState(null); // null = chưa check, true = existing, false = new
  const [existingCustomerData, setExistingCustomerData] = useState(null);
  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [emailToVerify, setEmailToVerify] = useState('');
  const [pendingBookingData, setPendingBookingData] = useState(null);
  const [checkingEmail, setCheckingEmail] = useState(false);

  // Filter Inputs
  const [searchText, setSearchText] = useState('');
  const [filterModel, setFilterModel] = useState('');
  const [filterColor, setFilterColor] = useState('');
  const [activeTab, setActiveTab] = useState('1');

  const [form] = Form.useForm();

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [searchText, filterModel, filterColor, processedVehicles, activeTab]);

  const fetchData = async () => {
    try {
      setLoading(true);

      // 1. Fetch Vehicles (Catalog)
      const vehicles = await vehicleAPI.getAll();
      setVehicleList(vehicles || []);

      // 2. Fetch Agencies
      const agencies = await agencyAPI.getAll();
      setAgencyList(agencies || []);

      // 3. Fetch Instances & Inventory to calculate availability
      const instances = await vehicleInstanceAPI.getAll();
      setVehicleInstanceList(instances || []);

      // 4. Fetch Inventory from all agencies
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
          console.warn(`Warning: Could not fetch inventory for agency ${agency.id}`);
        }
      }
      setAgencyInventoryData(allInventories);

      // 5. Process Vehicles: Attach total available count to each vehicle model
      const processed = vehicles.map(vehicle => {
        // Tính tổng số lượng xe này đang có trong kho của TẤT CẢ đại lý
        const count = allInventories.filter(inv => {
          const invVehicleId = inv.vehicleDetails?.vehicleId || inv.vehicleId;
          return invVehicleId === vehicle.id;
        }).length;

        // Tìm danh sách đại lý có xe này
        const availableAtAgencies = agencies.filter(agency =>
          allInventories.some(inv =>
            inv.agencyId === agency.id &&
            (inv.vehicleDetails?.vehicleId || inv.vehicleId) === vehicle.id
          )
        );

        return {
          ...vehicle,
          availableCount: count,
          agencies: availableAtAgencies.map(a => ({
            id: a.id,
            name: a.agencyName,
            location: a.location,
            count: allInventories.filter(inv => inv.agencyId === a.id && (inv.vehicleDetails?.vehicleId || inv.vehicleId) === vehicle.id).length
          }))
        };
      });

      setProcessedVehicles(processed);
      setFilteredVehicles(processed);

    } catch (error) {
      console.error('Error fetching data:', error);
      message.error('Không thể tải dữ liệu hệ thống');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...processedVehicles];

    // Search
    if (searchText) {
      filtered = filtered.filter(v =>
        v.variantName?.toLowerCase().includes(searchText.toLowerCase()) ||
        v.modelName?.toLowerCase().includes(searchText.toLowerCase())
      );
    }

    // Model
    if (filterModel) {
      filtered = filtered.filter(v => v.modelName === filterModel);
    }

    // Color
    if (filterColor) {
      filtered = filtered.filter(v => v.color === filterColor);
    }

    setFilteredVehicles(filtered);
  };

  // --- ACTION HANDLERS ---

  const handleViewVehicleDetails = (vehicle) => {
    setSelectedVehicle(vehicle);
    setIsDetailModalOpen(true);
  };

  const handleViewAgencyInventory = (agency) => {
    setSelectedAgency(agency);
    setIsAgencyModalOpen(true);
  };

  const handleBookTestDrive = (vehicle, preSelectedAgencyId = null) => {
    setSelectedVehicle(vehicle);
    setIsBookingModalOpen(true);
    form.resetFields();
    // Reset customer check state
    setIsExistingCustomer(null);
    setExistingCustomerData(null);
    setEmailToVerify('');
    if (preSelectedAgencyId) {
      form.setFieldsValue({ agencyId: preSelectedAgencyId });
    }
  };

  const handleEmailBlur = async (e) => {
    const email = e.target.value?.trim();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return; // Invalid email, don't check
    }

    try {
      setCheckingEmail(true);
      const customers = await customerAPI.getAll();
      const existingCustomer = customers.find(
        c => c.email?.toLowerCase() === email.toLowerCase()
      );

      if (existingCustomer) {
        setIsExistingCustomer(true);
        setExistingCustomerData(existingCustomer);
        // Auto-fill customer info for existing customer
        form.setFieldsValue({
          fullName: existingCustomer.fullName,
          phone: existingCustomer.phone,
          address: existingCustomer.address
        });
        message.success('Chào mừng khách hàng quay lại! Thông tin của bạn đã được điền sẵn.');
      } else {
        setIsExistingCustomer(false);
        setExistingCustomerData(null);
        message.info('Email mới - vui lòng điền thông tin để tạo tài khoản.');
      }
    } catch (error) {
      console.error('Error checking customer:', error);
      // If check fails, treat as new customer
      setIsExistingCustomer(false);
    } finally {
      setCheckingEmail(false);
    }
  };

  const handleSubmitBooking = async (values) => {
    try {
      // If existing customer, proceed directly with booking
      if (isExistingCustomer && existingCustomerData) {
        await processTestDriveBooking(existingCustomerData.id, values);
        return;
      }

      // If new customer, trigger OTP verification first
      if (isExistingCustomer === false) {
        setEmailToVerify(values.email);
        setPendingBookingData(values);
        
        // Send OTP
        setLoading(true);
        try {
          await emailVerificationAPI.sendOTP(values.email);
          message.success('Mã OTP đã được gửi đến email của bạn!');
          setIsVerifyModalOpen(true);
        } catch (error) {
          console.error('Error sending OTP:', error);
          message.error('Không thể gửi mã OTP. Vui lòng kiểm tra lại email!');
        } finally {
          setLoading(false);
        }
        return;
      }

      // If email not checked yet, show warning
      message.warning('Vui lòng nhập email để kiểm tra tài khoản!');
      
    } catch (error) {
      console.error('Error in booking flow:', error);
      message.error('Có lỗi xảy ra. Vui lòng thử lại!');
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!otpCode || otpCode.length !== 6) {
      message.error('Vui lòng nhập mã OTP 6 chữ số!');
      return;
    }

    try {
      setLoading(true);
      await emailVerificationAPI.verifyOTP(emailToVerify, otpCode);
      message.success('Xác thực email thành công!');
      
      // Create customer and proceed with booking
      await processPendingBooking();
      
      setIsVerifyModalOpen(false);
      setOtpCode('');
    } catch (error) {
      console.error('Error verifying OTP:', error);
      message.error('Mã OTP không đúng hoặc đã hết hạn!');
    } finally {
      setLoading(false);
    }
  };

  const processPendingBooking = async () => {
    if (!pendingBookingData) return;

    try {
      setLoading(true);
      
      // Create new customer
      const customerData = {
        fullName: pendingBookingData.fullName,
        phone: pendingBookingData.phone,
        email: pendingBookingData.email,
        address: pendingBookingData.address || '',
        agencyId: pendingBookingData.agencyId,
        class: "string"
      };

      const customer = await customerAPI.create(customerData);
      
      // Process test drive booking
      await processTestDriveBooking(customer.id, pendingBookingData);
      
      setPendingBookingData(null);
      
    } catch (error) {
      console.error('Error creating customer and booking:', error);
      message.error('Có lỗi xảy ra khi tạo tài khoản. Vui lòng thử lại!');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const processTestDriveBooking = async (customerId, values) => {
    try {
      setLoading(true);
      
      // Find vehicle instance at selected agency
      const instanceId = getAvailableInstance(selectedVehicle.id, values.agencyId);

      if (!instanceId) {
        message.warning('Đại lý hiện chưa có sẵn mẫu xe này trong kho, nhưng chúng tôi vẫn ghi nhận yêu cầu.');
      }

      const testDriveData = {
        customerId: customerId,
        agencyId: values.agencyId,
        vehicleInstanceId: instanceId || 0,
        appointmentDate: values.appointmentDate.format('YYYY-MM-DDTHH:mm:ss'),
        status: 'Pending',
        notes: values.notes || ''
      };

      await testDriveAPI.create(testDriveData);
      message.success('Đặt lịch lái thử thành công! Chúng tôi sẽ liên hệ với bạn sớm.');
      setIsBookingModalOpen(false);
      form.resetFields();
      setIsExistingCustomer(null);
      setExistingCustomerData(null);
      
    } catch (error) {
      console.error('Error booking test drive:', error);
      message.error('Có lỗi xảy ra khi đặt lịch. Vui lòng kiểm tra lại thông tin!');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Helper to get an instance ID
  const getAvailableInstance = (vehicleId, agencyId) => {
    const item = agencyInventoryData.find(
      inv => (inv.vehicleDetails?.vehicleId === vehicleId || inv.vehicleId === vehicleId)
        && inv.agencyId === agencyId
    );
    return item ? item.vehicleInstanceId : null;
  };

  // Helper to group inventory by vehicle model for Agency Modal
  const getAgencyGroupedInventory = (agencyId) => {
    if (!agencyId) return [];

    // Lọc tất cả instance thuộc agency này
    const agencyItems = agencyInventoryData.filter(inv => inv.agencyId === agencyId);

    // Group theo Vehicle ID
    const grouped = new Map();

    agencyItems.forEach(item => {
      const vId = item.vehicleDetails?.vehicleId || item.vehicleId;
      if (!vId) return;

      if (!grouped.has(vId)) {
        // Tìm thông tin gốc của xe để hiển thị hình ảnh/tên
        const vehicleInfo = vehicleList.find(v => v.id === vId);
        grouped.set(vId, {
          vehicle: vehicleInfo || item.vehicleDetails,
          count: 0,
          instances: []
        });
      }
      const group = grouped.get(vId);
      group.count += 1;
      group.instances.push(item);
    });

    return Array.from(grouped.values());
  };

  // --- RENDERERS ---

  const uniqueModels = [...new Set(processedVehicles.map(v => v.modelName).filter(Boolean))];
  const uniqueColors = [...new Set(processedVehicles.map(v => v.color).filter(Boolean))];

  // Component: Render danh sách xe (dùng chung cho Tab 1 và Modal Đại lý)
  const renderVehicleGrid = (dataList, isAgencyView = false) => {
    if (dataList.length === 0) return <Empty description="Không tìm thấy xe phù hợp" />;

    return (
      <Row gutter={[24, 24]}>
        {dataList.map((item) => {
          // Nếu là view Agency, item structure là { vehicle, count, instances }
          // Nếu là view All Vehicles, item structure là vehicle object trực tiếp
          const vehicle = isAgencyView ? item.vehicle : item;
          const count = isAgencyView ? item.count : item.availableCount;

          return (
            <Col xs={24} sm={12} lg={8} key={vehicle?.id || Math.random()}>
              <Card
                hoverable
                className="vehicle-card"
                cover={
                  <div className="vehicle-image-wrapper">
                    <img
                      alt={vehicle?.variantName}
                      src={vehicle?.vehicleImage || 'https://via.placeholder.com/400x300?text=EV+Vehicle'}
                      className="vehicle-image"
                    />
                    <div className="vehicle-badge">
                      {/* <Tag color={count > 0 ? 'green' : 'red'}>
                        {count > 0 ? `Sẵn có: ${count}` : 'Hết hàng / Đặt trước'}
                      </Tag> */}
                    </div>
                  </div>
                }
              >
                <div className="vehicle-info">
                  <Title level={4}>{vehicle?.variantName}</Title>
                  <Text type="secondary">{vehicle?.modelName}</Text>

                  <Divider style={{ margin: '12px 0' }} />

                  <Space direction="vertical" size="small" style={{ width: '100%' }}>
                    <div className="vehicle-spec">
                      <ThunderboltOutlined /> {vehicle?.batteryCapacity || 'Unknown Battery'}
                    </div>
                    <div className="vehicle-spec">
                      <DashboardOutlined /> {vehicle?.rangeKM ? `${vehicle.rangeKM} km` : 'N/A'}
                    </div>
                    <div className="vehicle-spec">
                      <Tag color="blue">{vehicle?.color}</Tag>
                    </div>
                  </Space>

                  <Divider style={{ margin: '12px 0' }} />

                  <Row gutter={8}>
                    <Col span={12}>
                      <Button block onClick={() => handleViewVehicleDetails(vehicle)}>
                        Chi Tiết
                      </Button>
                    </Col>
                    <Col span={12}>
                      <Button
                        type="primary"
                        block
                        icon={<CalendarOutlined />}
                        onClick={() => handleBookTestDrive(vehicle, isAgencyView ? selectedAgency?.id : null)}
                      >
                        Đặt Lịch
                      </Button>
                    </Col>
                  </Row>
                </div>
              </Card>
            </Col>
          );
        })}
      </Row>
    );
  };

  // Component: Render danh sách đại lý (Tab 2)
  const renderAgencyGrid = () => {
    if (agencyList.length === 0) return <Empty description="Chưa có dữ liệu đại lý" />;

    return (
      <Row gutter={[24, 24]}>
        {agencyList.map(agency => (
          <Col xs={24} sm={12} lg={8} key={agency.id}>
            <Card
              hoverable
              onClick={() => handleViewAgencyInventory(agency)}
              actions={[
                <div key="view" onClick={() => handleViewAgencyInventory(agency)}>
                  <CarOutlined /> Xem Xe Trong Kho
                </div>
              ]}
            >
              <Card.Meta
                avatar={<Avatar size={64} icon={<ShopOutlined />} src={agency.avatar} />}
                title={agency.agencyName}
                description={
                  <Space direction="vertical" size={4}>
                    <Text type="secondary"><EnvironmentOutlined /> {agency.address}</Text>
                    <Text type="secondary"><PhoneOutlined /> {agency.phone}</Text>
                    <Text type="secondary"><MailOutlined /> {agency.email || 'Chưa cập nhật email'}</Text>
                    <Tag color="blue">{agency.location}</Tag>
                  </Space>
                }
              />
            </Card>
          </Col>
        ))}
      </Row>
    );
  };

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
            <Button type="primary" size="large" onClick={() => navigate('/login')}>
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
            {/* <Button type="primary" size="large" icon={<CarOutlined />} onClick={() => {
              document.getElementById('main-tabs').scrollIntoView({ behavior: 'smooth' });
            }}>
              Xem Các Mẫu Xe
            </Button> */}
          </div>
        </div>

        {/* Main Content Tabs */}
        <div className="section-container" id="main-tabs" style={{ padding: '40px 20px', maxWidth: 1200, margin: '0 auto' }}>
          <Tabs
            defaultActiveKey="1"
            activeKey={activeTab}
            onChange={setActiveTab}
            type="card"
            size="large"
            centered
            items={[
              {
                key: '1',
                label: (
                  <span style={{ fontSize: 16 }}>
                    <CarOutlined /> Tất Cả Mẫu Xe
                  </span>
                ),
                children: (
                  <div className="tab-content-wrapper">
                    {/* Search & Filter for Vehicles
                    <div className="search-section" style={{ marginBottom: 24, padding: 24, background: '#fff', borderRadius: 8 }}>
                      <Row gutter={[16, 16]} align="middle">
                        <Col xs={24} md={10}>
                          <Input
                            size="large"
                            placeholder="Tìm kiếm tên xe..."
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
                    </div> */}

                    {/* Vehicle Grid */}
                    <Spin spinning={loading}>
                      {renderVehicleGrid(filteredVehicles)}
                    </Spin>
                  </div>
                )
              },
              {
                key: '2',
                label: (
                  <span style={{ fontSize: 16 }}>
                    <ShopOutlined /> Hệ Thống Đại Lý
                  </span>
                ),
                children: (
                  <div className="tab-content-wrapper">
                    <div style={{ marginBottom: 24, textAlign: 'center' }}>
                      <Title level={3}>Danh Sách Các Đại Lý Ủy Quyền</Title>
                      <Text type="secondary">Chọn đại lý để xem các xe đang có sẵn tại kho</Text>
                    </div>
                    <Spin spinning={loading}>
                      {renderAgencyGrid()}
                    </Spin>
                  </div>
                )
              },
              {
                key: '3',
                label: (
                  <span style={{ fontSize: 16 }}>
                    <CarOutlined /> So Sánh Xe
                  </span>
                ),
                children: (
                  <div className="tab-content-wrapper">
                    {/* <div style={{ marginBottom: 24, textAlign: 'center' }}>
                      <Title level={3}>Danh Sách Các Đại Lý Ủy Quyền</Title>
                      <Text type="secondary">Chọn đại lý để xem các xe đang có sẵn tại kho</Text>
                    </div> */}
                    <VehicleComparePage />

                    {/* <Spin spinning={loading}>
                      {renderAgencyGrid()}
                    </Spin> */}
                  </div>
                )
              }

            ]}
          />
        </div>

        {/* Why Choose Us Section */}
        <div className="features-section" style={{ background: '#f0f2f5', padding: '40px 20px' }}>
          <div style={{ maxWidth: 1200, margin: '0 auto' }}>
            <Title level={2} style={{ textAlign: 'center', marginBottom: 40 }}>
              Tại Sao Chọn Chúng Tôi?
            </Title>
            <Row gutter={[32, 32]}>
              <Col xs={24} md={8}>
                <Card className="feature-card" bordered={false}>
                  <ThunderboltOutlined style={{ fontSize: 48, color: '#1890ff' }} />
                  <Title level={4}>Công Nghệ Tiên Tiến</Title>
                  <Paragraph>
                    Trang bị công nghệ pin thế hệ mới, sạc nhanh và hệ thống hỗ trợ lái thông minh
                  </Paragraph>
                </Card>
              </Col>
              <Col xs={24} md={8}>
                <Card className="feature-card" bordered={false}>
                  <EnvironmentOutlined style={{ fontSize: 48, color: '#52c41a' }} />
                  <Title level={4}>Thân Thiện Môi Trường</Title>
                  <Paragraph>
                    Không khí thải, giảm ô nhiễm, góp phần bảo vệ môi trường cho thế hệ tương lai
                  </Paragraph>
                </Card>
              </Col>
              <Col xs={24} md={8}>
                <Card className="feature-card" bordered={false}>
                  <CarOutlined style={{ fontSize: 48, color: '#722ed1' }} />
                  <Title level={4}>Trải Nghiệm Lái Thử</Title>
                  <Paragraph>
                    Đặt lịch lái thử miễn phí, cảm nhận sự khác biệt của xe điện thế hệ mới
                  </Paragraph>
                </Card>
              </Col>
            </Row>
          </div>
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

      {/* --- MODALS --- */}

      {/* 1. Agency Detail Modal (Xem kho đại lý) */}
      <Modal
        title={
          <Space>
            <ShopOutlined />
            <span style={{ fontSize: 18 }}>Kho xe: {selectedAgency?.agencyName}</span>
          </Space>
        }
        open={isAgencyModalOpen}
        onCancel={() => setIsAgencyModalOpen(false)}
        footer={[
          <Button key="close" onClick={() => setIsAgencyModalOpen(false)}>Đóng</Button>
        ]}
        width={1000}
      >
        {selectedAgency && (
          <>
            <Card style={{ marginBottom: 24, background: '#f6f9ff' }} size="small">
              <Space split={<Divider type="vertical" />}>
                <Text><EnvironmentOutlined /> {selectedAgency.address}</Text>
                <Text><PhoneOutlined /> {selectedAgency.phone}</Text>
              </Space>
            </Card>

            <Title level={5} style={{ marginBottom: 16 }}>Danh sách xe đang có tại đại lý:</Title>

            {getAgencyGroupedInventory(selectedAgency.id).length > 0 ? (
              renderVehicleGrid(getAgencyGroupedInventory(selectedAgency.id), true)
            ) : (
              <Empty description="Đại lý này hiện chưa có xe trong kho" />
            )}
          </>
        )}
      </Modal>

      {/* 2. Vehicle Detail Modal */}
      <Modal
        title={<Space><InfoCircleOutlined /> Chi Tiết Xe</Space>}
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
              // Nếu đang ở trong modal đại lý thì truyền luôn agencyId vào form đặt lịch
              handleBookTestDrive(selectedVehicle, isAgencyModalOpen ? selectedAgency?.id : null);
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
              style={{ width: '100%', borderRadius: 8, marginBottom: 16, objectFit: 'cover', height: 300 }}
            />

            <Title level={3}>{selectedVehicle.variantName}</Title>
            <Text type="secondary" style={{ fontSize: 16 }}>{selectedVehicle.modelName}</Text>

            <Divider />

            <Row gutter={[16, 16]}>
              <Col span={12}>
                <Statistic title="Dung lượng pin" value={selectedVehicle.batteryCapacity || 'N/A'} prefix={<ThunderboltOutlined />} />
              </Col>
              <Col span={12}>
                <Statistic title="Phạm vi hoạt động" value={selectedVehicle.rangeKM} suffix="km" prefix={<DashboardOutlined />} />
              </Col>
              <Col span={12}>
                <Text strong>Màu sắc: </Text>
                <Tag color="blue">{selectedVehicle.color}</Tag>
              </Col>
              <Col span={12}>
                {/* <Text strong>Tổng kho hệ thống: </Text> */}
                {/* <Tag color="green">{selectedVehicle.availableCount || 0} xe</Tag> */}
              </Col>
            </Row>

            <Divider />

            <Title level={5}>Tính năng & Mô tả:</Title>
            <Paragraph>
              {selectedVehicle.option?.description || selectedVehicle.features || 'Đang cập nhật thông tin chi tiết cho mẫu xe này.'}
            </Paragraph>

            <Divider />

            {/* <Title level={5}>Các đại lý có sẵn xe này:</Title>
            {selectedVehicle.agencies && selectedVehicle.agencies.length > 0 ? (
              <Space direction="vertical" style={{ width: '100%' }}>
                {selectedVehicle.agencies.map((agency, index) => (
                  <Card key={index} size="small" hoverable onClick={() => handleViewAgencyInventory({ ...agency, agencyName: agency.name })}>
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
                        <Tag color="green">{agency.count} xe sẵn có</Tag>
                      </Col>
                    </Row>
                  </Card>
                ))}
              </Space>
            ) : (
              <Text type="secondary">Hiện chưa có xe sẵn tại đại lý, vui lòng liên hệ để đặt trước.</Text>
            )} */}
          </div>
        )}
      </Modal>

      {/* 3. Booking Modal */}
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
                label="Email"
                name="email"
                rules={[
                  { required: true, message: 'Vui lòng nhập email!' },
                  { type: 'email', message: 'Email không hợp lệ!' }
                ]}
                help={checkingEmail ? 'Đang kiểm tra email...' : (
                  isExistingCustomer === true ? '✓ Khách hàng đã tồn tại - thông tin đã được điền sẵn' :
                  isExistingCustomer === false ? 'Email mới - vui lòng điền đầy đủ thông tin' :
                  'Nhập email để kiểm tra tài khoản'
                )}
              >
                <Input 
                  prefix={<MailOutlined />} 
                  placeholder="email@example.com"
                  onBlur={handleEmailBlur}
                  disabled={checkingEmail}
                />
              </Form.Item>

              {isExistingCustomer !== null && (
                <>
                  {isExistingCustomer && (
                    <Alert
                      message="Khách hàng cũ"
                      description="Thông tin của bạn đã được điền sẵn. Vui lòng chọn đại lý và thời gian để đặt lịch."
                      type="success"
                      showIcon
                      style={{ marginBottom: 16 }}
                    />
                  )}

                  {!isExistingCustomer && (
                    <Alert
                      message="Khách hàng mới"
                      description="Vui lòng điền đầy đủ thông tin. Sau khi xác nhận, chúng tôi sẽ gửi mã OTP để xác thực email của bạn."
                      type="info"
                      showIcon
                      style={{ marginBottom: 16 }}
                    />
                  )}

                  <Row gutter={16}>
                    <Col span={12}>
                      <Form.Item
                        label="Họ và tên"
                        name="fullName"
                        rules={[{ required: true, message: 'Vui lòng nhập họ tên!' }]}
                      >
                        <Input 
                          prefix={<UserOutlined />} 
                          placeholder="Nguyễn Văn A"
                          disabled={isExistingCustomer}
                        />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item
                        label="Số điện thoại"
                        name="phone"
                        rules={[
                          { required: true, message: 'Vui lòng nhập số điện thoại!' },
                          { pattern: /^[0-9]{10}$/, message: 'Số điện thoại không hợp lệ!' }
                        ]}
                      >
                        <Input 
                          prefix={<PhoneOutlined />} 
                          placeholder="0901234567"
                          disabled={isExistingCustomer}
                        />
                      </Form.Item>
                    </Col>
                  </Row>

                  <Form.Item
                    label="Địa chỉ"
                    name="address"
                  >
                    <Input 
                      prefix={<EnvironmentOutlined />} 
                      placeholder="Địa chỉ của bạn"
                      disabled={isExistingCustomer}
                    />
                  </Form.Item>
                </>
              )}

              <Form.Item
                label="Chọn đại lý"
                name="agencyId"
                rules={[{ required: true, message: 'Vui lòng chọn đại lý!' }]}
                help="Chọn đại lý gần bạn nhất để thuận tiện lái thử"
              >
                <Select
                  placeholder="Chọn đại lý gần bạn"
                  optionLabelProp="label"  // <--- THÊM DÒNG NÀY: Để sửa lỗi hiển thị html bị vỡ trong ô input
                  optionFilterProp="label" // (Tùy chọn) Giúp search được theo tên đại lý
                >
                  {/* Ưu tiên hiển thị các đại lý có xe trước */}
                  {agencyList.sort((a, b) => {
                    const aHasCar = selectedVehicle.agencies?.find(x => x.id === a.id);
                    const bHasCar = selectedVehicle.agencies?.find(x => x.id === b.id);
                    return (bHasCar ? 1 : 0) - (aHasCar ? 1 : 0);
                  }).map(agency => {
                    const stockInfo = selectedVehicle.agencies?.find(a => a.id === agency.id);

                    return (
                      <Option
                        key={agency.id}
                        value={agency.id}
                        label={agency.agencyName} // <--- QUAN TRỌNG: Đây là text sẽ hiện trong ô input khi chọn
                      >
                        {/* Phần này chỉ hiện khi xổ danh sách xuống (giữ nguyên style đẹp) */}
                        <div className="agency-option-item" style={{ padding: '4px 0' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Text strong>{agency.agencyName}</Text>
                            {stockInfo && <Tag color="green">Có {stockInfo.count} xe</Tag>}
                          </div>
                          <div style={{
                            fontSize: '12px',
                            color: '#666',
                            marginTop: '4px',
                            whiteSpace: 'normal', // Cho phép xuống dòng trong dropdown nếu địa chỉ dài
                            lineHeight: '1.4'
                          }}>
                            <EnvironmentOutlined style={{ marginRight: 4 }} />
                            {agency.location} - {agency.address}
                          </div>
                        </div>
                      </Option>
                    );
                  })}
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

      {/* OTP Verification Modal */}
      <Modal
        title="Xác Thực Email"
        open={isVerifyModalOpen}
        onCancel={() => {
          setIsVerifyModalOpen(false);
          setOtpCode('');
        }}
        footer={null}
        width={400}
      >
        <div style={{ padding: '16px 0' }}>
          <Text>
            Mã OTP đã được gửi đến email: <Text strong>{emailToVerify}</Text>
          </Text>
          <Input
            placeholder="Nhập mã OTP (6 chữ số)"
            value={otpCode}
            onChange={(e) => setOtpCode(e.target.value)}
            maxLength={6}
            style={{ marginTop: 16, marginBottom: 16 }}
            size="large"
          />
          <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
            <Button
              onClick={() => {
                setIsVerifyModalOpen(false);
                setOtpCode('');
              }}
            >
              Hủy
            </Button>
            <Button
              type="primary"
              onClick={handleVerifyOTP}
              loading={loading}
              disabled={!otpCode || otpCode.length !== 6}
            >
              Xác Nhận
            </Button>
          </Space>
        </div>
      </Modal>
    </Layout>
  );
};

export default LandingPage;