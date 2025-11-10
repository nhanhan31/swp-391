import React, { useState, useMemo, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Typography,
  Tag,
  Button,
  Space,
  Input,
  Select,
  Modal,
  Descriptions,
  Badge,
  Divider,
  Image,
  Tooltip,
  Empty,
  Slider,
  Checkbox,
  Collapse,
  Spin,
  message
} from 'antd';
import {
  SearchOutlined,
  FilterOutlined,
  EyeOutlined,
  CarOutlined,
  ThunderboltOutlined,
  DashboardOutlined,
  SettingOutlined,
  CloseOutlined
} from '@ant-design/icons';
import { useAuth } from '../context/AuthContext';
import { vehicleAPI, vehicleInstanceAPI, vehiclePriceAPI } from '../services/vehicleService';
import { agencyInventoryAPI } from '../services/quotationService';
import '../styles/VehicleCatalogPage.css';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { Search } = Input;
const { Panel } = Collapse;

const VehicleCatalogPage = () => {
  const { isAdmin, isEVMStaff, isDealerManager, isDealerStaff, getAgencyId } = useAuth();
  const [searchText, setSearchText] = useState('');
  const [selectedModel, setSelectedModel] = useState('all');
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [filterVisible, setFilterVisible] = useState(false);
  
  // Advanced filters
  const [priceRange, setPriceRange] = useState([0, 4000000000]);
  const [rangeKm, setRangeKm] = useState([0, 1000]);
  const [selectedColors, setSelectedColors] = useState([]);
  const [selectedStatus, setSelectedStatus] = useState([]);
  const [hasPromotion, setHasPromotion] = useState(false);

  // API data states
  const [loading, setLoading] = useState(true);
  const [vehicles, setVehicles] = useState([]);
  const [vehicleInstances, setVehicleInstances] = useState([]);
  const [vehiclePrices, setVehiclePrices] = useState([]);
  const [agencyInventory, setAgencyInventory] = useState([]);

  // Fetch data from API
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Get agency ID from session
        const agencyId = getAgencyId();
        
        let availableInstanceIds = [];
        
        // If user is from agency, fetch agency inventory first
        if (agencyId && (isDealerManager() || isDealerStaff())) {
          const inventoryData = await agencyInventoryAPI.getByAgencyId(agencyId);
          setAgencyInventory(inventoryData || []);
          // Extract instanceIds from inventory (inventory has no quantity field, just existence means available)
          availableInstanceIds = (inventoryData || []).map(inv => inv.vehicleInstanceId);
        }

        // Fetch all instances
        const allInstancesData = await vehicleInstanceAPI.getAll();
        
        // Filter instances: if dealer, only show instances in inventory; if admin/evstaff, show all
        const filteredInstances = (isDealerManager() || isDealerStaff())
          ? (allInstancesData || []).filter(inst => availableInstanceIds.includes(inst.id))
          : (allInstancesData || []);
        
        setVehicleInstances(filteredInstances);

        // Get unique vehicleIds from filtered instances
        const uniqueVehicleIds = [...new Set(filteredInstances.map(inst => inst.vehicleId))];

        // Fetch vehicle details and prices for these vehicleIds
        const [vehiclesData, pricesData] = await Promise.all([
          vehicleAPI.getAll(),
          vehiclePriceAPI.getAll()
        ]);

        // Filter vehicles to only those in our instance list
        const filteredVehicles = (vehiclesData || []).filter(v => uniqueVehicleIds.includes(v.id));
        
        setVehicles(filteredVehicles);
        setVehiclePrices(pricesData || []);

      } catch (error) {
        console.error('Error fetching vehicle data:', error);
        message.error('Không thể tải dữ liệu xe. Vui lòng thử lại sau.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [getAgencyId, isDealerManager, isDealerStaff]);

  // Combine vehicle data - group by vehicleId (show each vehicle once)
  const vehicleData = useMemo(() => {
    if (!vehicles.length) {
      console.log('No vehicles data');
      return [];
    }

    console.log('Vehicles:', vehicles);
    console.log('Vehicle Instances:', vehicleInstances);
    console.log('Vehicle Prices:', vehiclePrices);
    console.log('Agency Inventory:', agencyInventory);

    // Group instances by vehicleId and count quantity
    const vehicleGroups = {};
    vehicleInstances.forEach(instance => {
      if (!vehicleGroups[instance.vehicleId]) {
        vehicleGroups[instance.vehicleId] = {
          instances: [],
          totalQuantity: 0
        };
      }
      vehicleGroups[instance.vehicleId].instances.push(instance);
      // Each instance in inventory = 1 unit available
      vehicleGroups[instance.vehicleId].totalQuantity += 1;
    });

    console.log('Vehicle Groups:', vehicleGroups);

    // Map each unique vehicle (by vehicleId) to display data
    const result = vehicles.map(vehicle => {
      const group = vehicleGroups[vehicle.id];
      if (!group) return null;

      // Find price for this vehicle
      const price = vehiclePrices.find(p => p.vehicleId === vehicle.id);

      // Get available colors from vehicle data (since instance doesn't have color)
      // We need to get colors from inventory's vehicleDetails if available
      let availableColors = [vehicle.color].filter(Boolean);
      
      // If we have inventory data, get colors from vehicleDetails
      if (agencyInventory.length > 0) {
        const inventoryColors = agencyInventory
          .filter(inv => group.instances.some(inst => inst.id === inv.vehicleInstanceId))
          .map(inv => inv.vehicleDetails?.color)
          .filter(Boolean);
        if (inventoryColors.length > 0) {
          availableColors = [...new Set(inventoryColors)];
        }
      }

      // Determine status based on total quantity
      const isAvailable = group.totalQuantity > 0;
      const status = isAvailable 
        ? (group.totalQuantity < 5 ? 'limited' : 'available')
        : 'out_of_stock';

      return {
        id: vehicle.id,
        vehicleId: vehicle.id,
        variant_name: vehicle.variantName || 'Unknown',
        model: {
          model_name: vehicle.option?.modelName || 'Unknown Model'
        },
        color: availableColors.length > 0 ? availableColors.join(', ') : vehicle.color || 'N/A',
        availableColors: availableColors,
        battery_capacity: vehicle.batteryCapacity || 'N/A',
        range_km: parseInt(vehicle.rangeKM) || 0,
        features: vehicle.features || 'Đang cập nhật',
        image_url: vehicle.vehicleImage,
        status: status,
        price: price,
        finalPrice: price?.priceAmount || 0,
        promotion: null,
        quantity: group.totalQuantity,
        instanceCount: group.instances.length
      };
    }).filter(Boolean);

    console.log('Final vehicle data:', result);
    return result;
  }, [vehicles, vehicleInstances, vehiclePrices, agencyInventory]);

  // Get unique models
  const uniqueModels = useMemo(() => {
    const models = new Set(vehicleData.map(v => v.model?.model_name).filter(Boolean));
    return Array.from(models);
  }, [vehicleData]);

  // Filter vehicles
  const filteredVehicles = useMemo(() => {
    return vehicleData.filter(vehicle => {
      const matchesSearch = !searchText || 
        vehicle.variant_name?.toLowerCase().includes(searchText.toLowerCase()) ||
        vehicle.model?.model_name?.toLowerCase().includes(searchText.toLowerCase()) ||
        vehicle.availableColors?.some(color => color?.toLowerCase().includes(searchText.toLowerCase()));
      
      const matchesModel = selectedModel === 'all' || vehicle.model?.model_name === selectedModel;
      
      const matchesPrice = vehicle.finalPrice >= priceRange[0] && vehicle.finalPrice <= priceRange[1];
      
      const matchesRange = vehicle.range_km >= rangeKm[0] && vehicle.range_km <= rangeKm[1];
      
      const matchesColor = selectedColors.length === 0 || 
        vehicle.availableColors?.some(color => selectedColors.includes(color));
      
      const matchesStatus = selectedStatus.length === 0 || selectedStatus.includes(vehicle.status);
      
      const matchesPromotion = !hasPromotion || (vehicle.promotion !== null && vehicle.promotion !== undefined);
      
      return matchesSearch && matchesModel && matchesPrice && matchesRange && 
             matchesColor && matchesStatus && matchesPromotion;
    });
  }, [vehicleData, searchText, selectedModel, priceRange, rangeKm, selectedColors, selectedStatus, hasPromotion]);

  // Format price
  const formatPrice = (price) => {
    if (!price) return 'Liên hệ';
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(price);
  };

  // Handle view details
  const handleViewDetails = (vehicle) => {
    setSelectedVehicle(vehicle);
    setModalVisible(true);
  };

  // Get status color
  const getStatusColor = (status) => {
    switch (status) {
      case 'available': return 'success';
      case 'out_of_stock': return 'error';
      case 'limited': return 'warning';
      default: return 'default';
    }
  };

  // Get status text
  const getStatusText = (status) => {
    switch (status) {
      case 'available': return 'Có sẵn';
      case 'out_of_stock': return 'Hết hàng';
      case 'limited': return 'Số lượng có hạn';
      default: return status;
    }
  };

  // Get unique colors from availableColors array
  const uniqueColors = useMemo(() => {
    const allColors = vehicleData.flatMap(v => v.availableColors || []);
    return [...new Set(allColors)].filter(Boolean);
  }, [vehicleData]);

  // Reset all filters
  const resetFilters = () => {
    setSearchText('');
    setSelectedModel('all');
    setPriceRange([0, 4000000000]);
    setRangeKm([0, 1000]);
    setSelectedColors([]);
    setSelectedStatus([]);
    setHasPromotion(false);
  };

  // Count active filters
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (selectedModel !== 'all') count++;
    if (priceRange[0] > 0 || priceRange[1] < 4000000000) count++;
    if (rangeKm[0] > 0 || rangeKm[1] < 1000) count++;
    if (selectedColors.length > 0) count++;
    if (selectedStatus.length > 0) count++;
    if (hasPromotion) count++;
    return count;
  }, [selectedModel, priceRange, rangeKm, selectedColors, selectedStatus, hasPromotion]);

  const VehicleCard = ({ vehicle }) => (
    <Card
      className="vehicle-card"
      hoverable
      cover={
        <div className="vehicle-image-container">
          <Image
            alt={vehicle.variant_name}
            src={vehicle.image_url || '/images/default-car.jpg'}
            preview={false}
            placeholder={
              <div className="image-placeholder">
                <CarOutlined style={{ fontSize: '48px', color: '#ccc' }} />
              </div>
            }
          />
          {vehicle.promotion && (
            <div className="promotion-badge">
              <Tag color="red">Khuyến mãi</Tag>
            </div>
          )}
        </div>
      }
      actions={[
        <Tooltip title="Xem chi tiết">
          <Button 
            type="text" 
            icon={<EyeOutlined />} 
            onClick={() => handleViewDetails(vehicle)}
          >
            Chi tiết
          </Button>
        </Tooltip>
      ]}
    >
      <div className="vehicle-card-content">
        <div className="vehicle-header">
          <Title level={4} className="vehicle-title">
            {vehicle.variant_name}
          </Title>
          <Text type="secondary" className="vehicle-model">
            {vehicle.model?.model_name}
          </Text>
        </div>

        <div className="vehicle-info">
          <Space direction="vertical" size="small" style={{ width: '100%' }}>
            <div className="info-row">
              <Text strong>Màu sắc:</Text>
              {vehicle.availableColors && vehicle.availableColors.length > 0 ? (
                vehicle.availableColors.map(color => (
                  <Tag key={color} color="blue">{color}</Tag>
                ))
              ) : (
                <Tag color="default">N/A</Tag>
              )}
            </div>
            
            {vehicle.battery_capacity && vehicle.battery_capacity !== 'N/A' && (
              <div className="info-row">
                <ThunderboltOutlined style={{ color: '#52c41a' }} />
                <Text>{vehicle.battery_capacity}</Text>
              </div>
            )}
            
            {vehicle.range_km > 0 && (
              <div className="info-row">
                <DashboardOutlined style={{ color: '#1890ff' }} />
                <Text>{vehicle.range_km} km</Text>
              </div>
            )}

            {vehicle.quantity !== undefined && (
              <div className="info-row">
                <Text strong>Số lượng:</Text>
                <Text>{vehicle.quantity} xe</Text>
              </div>
            )}
          </Space>
        </div>

        <Divider style={{ margin: '12px 0' }} />

        <div className="vehicle-pricing">
          {vehicle.promotion && (
            <div className="original-price">
              <Text delete type="secondary">
                {formatPrice(vehicle.price?.price_amount)}
              </Text>
            </div>
          )}
          <div className="current-price">
            <Text strong style={{ fontSize: '18px', color: '#f5222d' }}>
              {formatPrice(vehicle.finalPrice)}
            </Text>
          </div>
          {vehicle.promotion && (
            <Tag color="volcano" size="small">
              Giảm {formatPrice(vehicle.promotion.discount_amount)}
            </Tag>
          )}
        </div>

        <div className="vehicle-status">
          {/* <Badge 
            status={vehicle.status === 'available' ? 'success' : 'error'} 
            // text={getStatusText(vehicle.status)}
          /> */}
        </div>
      </div>
    </Card>
  );

  return (
    <Spin spinning={loading} tip="Đang tải dữ liệu xe...">
      <div className="vehicle-catalog-page">
        <div className="page-header">
          <Title level={2}>
            <CarOutlined /> Danh mục xe điện
          </Title>
          <Text type="secondary">
            Khám phá các dòng xe điện VinFast với công nghệ tiên tiến
          </Text>
        </div>

        {/* Filters */}
        <Card className="filter-card" style={{ marginBottom: '24px' }}>
          <Row gutter={[16, 16]} align="middle">
            <Col xs={24} md={8}>
              <Search
                placeholder="Tìm kiếm theo tên xe, mẫu xe, màu sắc..."
                allowClear
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                prefix={<SearchOutlined />}
              />
            </Col>
            <Col xs={24} md={6}>
              <Select
                placeholder="Chọn mẫu xe"
                style={{ width: '100%' }}
                value={selectedModel}
                onChange={setSelectedModel}
              >
                <Option value="all">Tất cả mẫu xe</Option>
                {uniqueModels.map(modelName => (
                  <Option key={modelName} value={modelName}>
                    {modelName}
                  </Option>
                ))}
              </Select>
            </Col>
            <Col xs={24} md={10}>
              
            </Col>
          </Row>
        </Card>

        {/* Advanced Filters - Disabled */}
        {false && filterVisible && (
          <div style={{ marginTop: '24px', paddingTop: '24px', borderTop: '1px solid #f0f0f0' }}>
            <Collapse defaultActiveKey={['1']} ghost>
              <Panel header={<Text strong>Giá xe</Text>} key="1">
                <div style={{ padding: '0 16px' }}>
                  <Slider
                    range
                    min={0}
                    max={4000000000}
                    step={100000000}
                    value={priceRange}
                    onChange={setPriceRange}
                    tooltip={{
                      formatter: (value) => formatPrice(value)
                    }}
                  />
                  <Row justify="space-between" style={{ marginTop: '8px' }}>
                    <Text type="secondary">{formatPrice(priceRange[0])}</Text>
                    <Text type="secondary">{formatPrice(priceRange[1])}</Text>
                  </Row>
                </div>
              </Panel>

              <Panel header={<Text strong>Quãng đường di chuyển (km)</Text>} key="2">
                <div style={{ padding: '0 16px' }}>
                  <Slider
                    range
                    min={0}
                    max={1000}
                    step={50}
                    value={rangeKm}
                    onChange={setRangeKm}
                    marks={{
                      0: '0 km',
                      200: '200 km',
                      400: '400 km',
                      600: '600 km',
                        800: '800 km',
                    }}
                  />
                </div>
              </Panel>

              <Panel header={<Text strong>Màu sắc</Text>} key="3">
                <Checkbox.Group
                  value={selectedColors}
                  onChange={setSelectedColors}
                  style={{ width: '100%' }}
                >
                  <Row gutter={[8, 8]}>
                    {uniqueColors.map(color => (
                      <Col span={8} key={color}>
                        <Checkbox value={color}>
                          <Tag color="blue">{color}</Tag>
                        </Checkbox>
                      </Col>
                    ))}
                  </Row>
                </Checkbox.Group>
              </Panel>

              <Panel header={<Text strong>Trạng thái</Text>} key="4">
                <Checkbox.Group
                  value={selectedStatus}
                  onChange={setSelectedStatus}
                >
                  {/* <Space direction="vertical">
                    <Checkbox value="available">
                      <Badge status="success" text="Có sẵn" />
                    </Checkbox>
                    <Checkbox value="limited">
                      <Badge status="warning" text="Số lượng có hạn" />
                    </Checkbox>
                    <Checkbox value="out_of_stock">
                      <Badge status="error" text="Hết hàng" />
                    </Checkbox>
                  </Space> */}
                </Checkbox.Group>
              </Panel>

              <Panel header={<Text strong>Khuyến mãi</Text>} key="5">
                <Space direction="vertical">
                  <Checkbox
                    checked={hasPromotion}
                    onChange={(e) => setHasPromotion(e.target.checked)}
                  >
                    <Tag color="red">Chỉ hiện xe có khuyến mãi</Tag>
                  </Checkbox>
                  <Text type="secondary" style={{ fontSize: '12px', marginLeft: '24px' }}>
                    {vehicleData.filter(v => v.promotion).length} xe đang có khuyến mãi
                  </Text>
                </Space>
              </Panel>
            </Collapse>
          </div>
        )}

        {/* Vehicle Grid */}
        {filteredVehicles.length > 0 ? (
        <Row gutter={[16, 16]}>
          {filteredVehicles.map(vehicle => (
            <Col xs={24} sm={12} lg={8} xl={6} key={vehicle.id}>
              <VehicleCard vehicle={vehicle} />
            </Col>
          ))}
        </Row>
      ) : (
        <Empty 
          description="Không tìm thấy xe nào phù hợp"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      )}

      {/* Vehicle Detail Modal */}
      <Modal
        title={`Chi tiết ${selectedVehicle?.variant_name}`}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        width={800}
        className="vehicle-detail-modal"
      >
        {selectedVehicle && (
          <div>
            <Row gutter={[24, 24]}>
              <Col xs={24} md={10}>
                <Image
                  src={selectedVehicle.image_url || '/images/default-car.jpg'}
                  alt={selectedVehicle.variant_name}
                  style={{ width: '100%', borderRadius: '8px' }}
                />
              </Col>
              <Col xs={24} md={14}>
                <Space direction="vertical" size="large" style={{ width: '100%' }}>
                  <div>
                    <Title level={3}>{selectedVehicle.variant_name}</Title>
                    <Text type="secondary" style={{ fontSize: '16px' }}>
                      {selectedVehicle.model?.model_name}
                    </Text>
                  </div>

                  <div className="pricing-section">
                    {selectedVehicle.promotion && (
                      <div>
                        <Text delete type="secondary">
                          Giá gốc: {formatPrice(selectedVehicle.price?.price)}
                        </Text>
                      </div>
                    )}
                    <div>
                      <Text strong style={{ fontSize: '24px', color: '#f5222d' }}>
                        {formatPrice(selectedVehicle.finalPrice)}
                      </Text>
                    </div>
                    {selectedVehicle.promotion && (
                      <Tag color="red" style={{ marginTop: '8px' }}>
                        Khuyến mãi
                      </Tag>
                    )}
                  </div>

                  <Badge 
                    status={selectedVehicle.status === 'available' ? 'success' : 'error'} 
                    text={getStatusText(selectedVehicle.status)}
                    style={{ fontSize: '14px' }}
                  />
                </Space>
              </Col>
            </Row>

            <Divider />

            <Descriptions title="Thông số kỹ thuật" bordered column={2}>
              <Descriptions.Item label="Màu sắc có sẵn">
                {selectedVehicle.availableColors && selectedVehicle.availableColors.length > 0 ? (
                  selectedVehicle.availableColors.map(color => (
                    <Tag key={color} color="blue">{color}</Tag>
                  ))
                ) : (
                  <Text>N/A</Text>
                )}
              </Descriptions.Item>
              
              {selectedVehicle.battery_capacity && selectedVehicle.battery_capacity !== 'N/A' && (
                <Descriptions.Item label="Dung lượng pin">
                  {selectedVehicle.battery_capacity}
                </Descriptions.Item>
              )}
              
              {selectedVehicle.range_km > 0 && (
                <Descriptions.Item label="Quãng đường">
                  {selectedVehicle.range_km} km
                </Descriptions.Item>
              )}
              
              {/* <Descriptions.Item label="Trạng thái">
                <Tag color={getStatusColor(selectedVehicle.status)}>
                  {getStatusText(selectedVehicle.status)}
                </Tag>
              </Descriptions.Item> */}
              
              {selectedVehicle.quantity !== undefined && (
                <Descriptions.Item label="Số lượng có sẵn">
                  <Text strong>{selectedVehicle.quantity} xe</Text>
                </Descriptions.Item>
              )}
              
              {/* {selectedVehicle.instanceCount && (
                <Descriptions.Item label="Số lượng ">
                  {selectedVehicle.instanceCount}
                </Descriptions.Item>
              )} */}
            </Descriptions>

            {selectedVehicle.features && selectedVehicle.features !== 'Đang cập nhật' && (
              <>
                <Divider />
                <div>
                  <Title level={5}>Tính năng nổi bật</Title>
                  <Text>{selectedVehicle.features}</Text>
                </div>
              </>
            )}

            <Divider />

            {/* <div style={{ textAlign: 'center', paddingTop: '16px' }}>
              <Space size="middle">
                {(isDealerManager() || isDealerStaff()) && (
                  <>
                    <Button type="primary" size="large">
                      Tạo báo giá
                    </Button>
                    <Button size="large">
                      Đặt lịch lái thử
                    </Button>
                  </>
                )}
                <Button size="large">
                  Liên hệ tư vấn
                </Button>
              </Space>
            </div> */}
          </div>
        )}
      </Modal>
      </div>
    </Spin>
  );
};

export default VehicleCatalogPage;