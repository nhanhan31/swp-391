import React, { useState, useMemo, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Typography,
  Button,
  Space,
  Table,
  Tag,
  Image,
  Divider,
  Alert,
  Empty,
  Tooltip,
  Modal,
  Input,
  Spin,
  message
} from 'antd';
import {
  CarOutlined,
  SwapOutlined,
  DeleteOutlined,
  PlusOutlined,
  SearchOutlined
} from '@ant-design/icons';
import { useAuth } from '../context/AuthContext';
import { vehicleAPI, vehicleInstanceAPI, vehiclePriceAPI } from '../services/vehicleService';
import { agencyInventoryAPI } from '../services/quotationService';
import '../styles/VehicleComparePage.css';

const { Title, Text } = Typography;
const { Search } = Input;

const VehicleComparePage = () => {
  const { isAdmin, isEVMStaff, isDealerManager, isDealerStaff, getAgencyId } = useAuth();
  const [selectedVehicles, setSelectedVehicles] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchText, setSearchText] = useState('');
  const maxCompare = 4;

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
        const agencyId = getAgencyId();
        let availableInstanceIds = [];
        
        if (agencyId && (isDealerManager() || isDealerStaff())) {
          const inventoryData = await agencyInventoryAPI.getByAgencyId(agencyId);
          setAgencyInventory(inventoryData || []);
          availableInstanceIds = (inventoryData || []).map(inv => inv.vehicleInstanceId);
        }

        const allInstancesData = await vehicleInstanceAPI.getAll();
        const filteredInstances = (isDealerManager() || isDealerStaff())
          ? (allInstancesData || []).filter(inst => availableInstanceIds.includes(inst.id))
          : (allInstancesData || []);
        
        setVehicleInstances(filteredInstances);

        const uniqueVehicleIds = [...new Set(filteredInstances.map(inst => inst.vehicleId))];

        const [vehiclesData, pricesData] = await Promise.all([
          vehicleAPI.getAll(),
          vehiclePriceAPI.getAll()
        ]);

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

  // Combine vehicle data - group by vehicleId
  const vehicleData = useMemo(() => {
    if (!vehicles.length) return [];

    const vehicleGroups = {};
    vehicleInstances.forEach(instance => {
      if (!vehicleGroups[instance.vehicleId]) {
        vehicleGroups[instance.vehicleId] = {
          instances: [],
          totalQuantity: 0
        };
      }
      vehicleGroups[instance.vehicleId].instances.push(instance);
      vehicleGroups[instance.vehicleId].totalQuantity += 1;
    });

    return vehicles.map(vehicle => {
      const group = vehicleGroups[vehicle.id];
      if (!group) return null;

      const price = vehiclePrices.find(p => p.vehicleId === vehicle.id);

      let availableColors = [vehicle.color].filter(Boolean);
      
      if (agencyInventory.length > 0) {
        const inventoryColors = agencyInventory
          .filter(inv => group.instances.some(inst => inst.id === inv.vehicleInstanceId))
          .map(inv => inv.vehicleDetails?.color)
          .filter(Boolean);
        if (inventoryColors.length > 0) {
          availableColors = [...new Set(inventoryColors)];
        }
      }

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
  }, [vehicles, vehicleInstances, vehiclePrices, agencyInventory]);

  // Format price
  const formatPrice = (price) => {
    if (!price) return 'Liên hệ';
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(price);
  };

  // Add vehicle to comparison
  const addVehicle = (vehicleId) => {
    if (selectedVehicles.length >= maxCompare) {
      return;
    }
    
    const vehicle = vehicleData.find(v => v.id === vehicleId);
    if (vehicle && !selectedVehicles.find(v => v.id === vehicleId)) {
      setSelectedVehicles([...selectedVehicles, vehicle]);
      setIsModalOpen(false);
      setSearchText('');
    }
  };

  // Remove vehicle from comparison
  const removeVehicle = (vehicleId) => {
    setSelectedVehicles(prev => prev.filter(v => v.id !== vehicleId));
  };

  // Clear all vehicles
  const clearAll = () => {
    setSelectedVehicles([]);
  };

  // Open modal
  const openModal = () => {
    setIsModalOpen(true);
  };

  // Close modal
  const closeModal = () => {
    setIsModalOpen(false);
    setSearchText('');
  };

  // Get available vehicles for selection
  const availableVehicles = vehicleData.filter(
    v => !selectedVehicles.find(selected => selected.id === v.id)
  );

  // Filter vehicles by search text
  const filteredVehicles = availableVehicles.filter(vehicle => 
    vehicle.variant_name.toLowerCase().includes(searchText.toLowerCase()) ||
    vehicle.model?.model_name.toLowerCase().includes(searchText.toLowerCase())
  );

  // Generate comparison data
  const getComparisonData = () => {
    if (selectedVehicles.length === 0) return [];

    const comparisonRows = [
      {
        key: 'image',
        label: 'Hình ảnh',
        type: 'image'
      },
      {
        key: 'variant_name',
        label: 'Tên xe',
        type: 'text'
      },
      {
        key: 'model_name',
        label: 'Dòng xe',
        type: 'text'
      },
      {
        key: 'color',
        label: 'Màu sắc',
        type: 'tag'
      },
      {
        key: 'battery_capacity',
        label: 'Dung lượng pin',
        type: 'text'
      },
      {
        key: 'range_km',
        label: 'Quãng đường (km)',
        type: 'number'
      },
      {
        key: 'price',
        label: 'Giá bán',
        type: 'price'
      },
      {
        key: 'promotion',
        label: 'Khuyến mãi',
        type: 'promotion'
      },
      {
        key: 'final_price',
        label: 'Giá sau khuyến mãi',
        type: 'price_final'
      },
      {
        key: 'features',
        label: 'Tính năng',
        type: 'features'
      },
      
    ];

    return comparisonRows.map(row => {
      const rowData = { 
        key: row.key, 
        label: row.label, 
        type: row.type 
      };
      
      selectedVehicles.forEach((vehicle, index) => {
        switch (row.key) {
          case 'image':
            rowData[`vehicle_${index}`] = vehicle.image_url || '/images/default-car.jpg';
            break;
          case 'variant_name':
            rowData[`vehicle_${index}`] = vehicle.variant_name;
            break;
          case 'model_name':
            rowData[`vehicle_${index}`] = vehicle.model?.model_name;
            break;
          case 'color':
            rowData[`vehicle_${index}`] = vehicle.color;
            break;
          case 'battery_capacity':
            rowData[`vehicle_${index}`] = vehicle.battery_capacity;
            break;
          case 'range_km':
            rowData[`vehicle_${index}`] = vehicle.range_km;
            break;
          case 'price':
            rowData[`vehicle_${index}`] = vehicle.price?.priceAmount;
            break;
          case 'promotion':
            rowData[`vehicle_${index}`] = vehicle.promotion;
            break;
          case 'final_price':
            rowData[`vehicle_${index}`] = vehicle.finalPrice;
            break;
          case 'features':
            rowData[`vehicle_${index}`] = vehicle.features;
            break;
          case 'status':
            rowData[`vehicle_${index}`] = vehicle.status;
            break;
          default:
            rowData[`vehicle_${index}`] = '';
        }
      });
      
      return rowData;
    });
  };

  // Render cell content based on type
  const renderCellContent = (value, type) => {
    switch (type) {
      case 'image':
        return (
          <div className="compare-image">
            <Image
              src={value}
              alt="Vehicle"
              width={120}
              height={80}
              style={{ objectFit: 'cover', borderRadius: '4px' }}
              preview={false}
            />
          </div>
        );
      case 'tag':
        return <Tag color="blue">{value}</Tag>;
      case 'number':
        return <Text strong>{value?.toLocaleString()}</Text>;
      case 'price':
        return <Text>{formatPrice(value)}</Text>;
      case 'promotion':
        return value ? (
          <Tag color="red">
            {value.promo_name}<br/>
            Giảm {formatPrice(value.discount_amount)}
          </Tag>
        ) : (
          <Text type="secondary">Không có</Text>
        );
      case 'price_final':
        return (
          <Text strong style={{ color: '#f5222d', fontSize: '16px' }}>
            {formatPrice(value)}
          </Text>
        );
      case 'features':
        return (
          <Text ellipsis={{ tooltip: value }} style={{ maxWidth: '200px' }}>
            {value}
          </Text>
        );
      case 'status':
        const statusColor = value === 'available' ? 'success' : 'error';
        const statusText = value === 'available' ? 'Có sẵn' : 'Hết hàng';
        return <Tag color={statusColor}>{statusText}</Tag>;
      default:
        return <Text>{value}</Text>;
    }
  };

  // Generate table columns
  const generateColumns = () => {
    const columns = [
      {
        title: 'Thông số',
        dataIndex: 'label',
        key: 'label',
        width: 200,
        fixed: 'left',
        render: (text) => <Text strong>{text}</Text>
      }
    ];

    selectedVehicles.forEach((vehicle, index) => {
      columns.push({
        title: (
          <div className="vehicle-column-header">
            <div className="vehicle-name">{vehicle.variant_name}</div>
            <Button
              type="text"
              danger
              size="small"
              icon={<DeleteOutlined />}
              onClick={() => removeVehicle(vehicle.id)}
              className="remove-button"
            />
          </div>
        ),
        dataIndex: `vehicle_${index}`,
        key: `vehicle_${index}`,
        width: 250,
        render: (value, record) => renderCellContent(value, record.type)
      });
    });

    return columns;
  };

  const comparisonData = getComparisonData();

  return (
    <Spin spinning={loading} tip="Đang tải dữ liệu xe...">
      <div className="vehicle-compare-page">
        <div className="page-header">
          <Title level={2}>
            <SwapOutlined /> So sánh xe điện
          </Title>
          <Text type="secondary">
            So sánh chi tiết các dòng xe để đưa ra lựa chọn tốt nhất
          </Text>
        </div>

      {/* Vehicle Selection */}
      <Card className="selection-card" style={{ marginBottom: '24px' }}>
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} md={12}>
            <Space>
              <Text strong>Thêm xe để so sánh:</Text>
              <Button 
                type="primary"
                icon={<PlusOutlined />}
                onClick={openModal}
                disabled={selectedVehicles.length >= maxCompare}
              >
                Chọn xe
              </Button>
            </Space>
          </Col>
          <Col xs={24} md={12} style={{ textAlign: 'right' }}>
            <Space>
              <Text type="secondary">
                {selectedVehicles.length}/{maxCompare} xe được chọn
              </Text>
              {selectedVehicles.length > 0 && (
                <Button onClick={clearAll} icon={<DeleteOutlined />}>
                  Xóa tất cả
                </Button>
              )}
            </Space>
          </Col>
        </Row>

        {selectedVehicles.length >= maxCompare && (
          <Alert
            message={`Bạn có thể so sánh tối đa ${maxCompare} xe cùng lúc`}
            type="warning"
            showIcon
            style={{ marginTop: '16px' }}
          />
        )}
      </Card>

      {/* Selected Vehicles Preview */}
      {selectedVehicles.length > 0 && (
        <Card className="preview-card" style={{ marginBottom: '24px' }}>
          <Title level={4} style={{ marginBottom: '16px' }}>
            Xe đã chọn ({selectedVehicles.length})
          </Title>
          <Row gutter={[16, 16]}>
            {selectedVehicles.map((vehicle, index) => (
              <Col key={vehicle.id} xs={24} sm={12} md={6}>
                <Card 
                  size="small" 
                  className="selected-vehicle-card"
                  cover={
                    <Image
                      src={vehicle.image_url || '/images/default-car.jpg'}
                      alt={vehicle.variant_name}
                      height={120}
                      preview={false}
                      style={{ objectFit: 'cover' }}
                    />
                  }
                  actions={[
                    <Tooltip title="Xóa khỏi so sánh">
                      <Button
                        type="text"
                        danger
                        icon={<DeleteOutlined />}
                        onClick={() => removeVehicle(vehicle.id)}
                      />
                    </Tooltip>
                  ]}
                >
                  <Card.Meta
                    title={vehicle.variant_name}
                    description={
                      <Space direction="vertical" size="small">
                        <Text type="secondary">{vehicle.model?.model_name}</Text>
                        <Text strong style={{ color: '#f5222d' }}>
                          {formatPrice(vehicle.finalPrice)}
                        </Text>
                      </Space>
                    }
                  />
                </Card>
              </Col>
            ))}
            
            {/* Add more placeholder */}
            {selectedVehicles.length < maxCompare && (
              <Col xs={24} sm={12} md={6}>
                <Card 
                  className="add-vehicle-card"
                  style={{ 
                    height: '280px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    border: '2px dashed #d9d9d9'
                  }}
                  onClick={openModal}
                >
                  <Space direction="vertical" align="center">
                    <PlusOutlined style={{ fontSize: '24px', color: '#d9d9d9' }} />
                    <Text type="secondary">Thêm xe</Text>
                  </Space>
                </Card>
              </Col>
            )}
          </Row>
        </Card>
      )}

      {/* Comparison Table */}
      {selectedVehicles.length >= 2 ? (
        <Card className="comparison-table-card">
          <Title level={4} style={{ marginBottom: '16px' }}>
            <SwapOutlined /> Bảng so sánh chi tiết
          </Title>
          <Table
            columns={generateColumns()}
            dataSource={comparisonData}
            pagination={false}
            scroll={{ x: 'max-content' }}
            className="comparison-table"
            size="middle"
          />
        </Card>
      ) : (
        <Card>
          <Empty 
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <Space direction="vertical" align="center">
                <Text type="secondary">
                  Vui lòng chọn ít nhất 2 xe để bắt đầu so sánh
                </Text>
                <Button 
                  type="primary" 
                  icon={<CarOutlined />}
                  onClick={openModal}
                >
                  Chọn xe ngay
                </Button>
              </Space>
            }
          />
        </Card>
      )}

      {/* Vehicle Selection Modal */}
      <Modal
        title={
          <Space>
            <CarOutlined />
            <span>Chọn xe để so sánh</span>
          </Space>
        }
        open={isModalOpen}
        onCancel={closeModal}
        footer={null}
        width={800}
        bodyStyle={{ maxHeight: '70vh', overflowY: 'auto' }}
      >
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          <Search
            placeholder="Tìm kiếm xe theo tên hoặc dòng xe..."
            allowClear
            size="large"
            prefix={<SearchOutlined />}
            onChange={(e) => setSearchText(e.target.value)}
            value={searchText}
          />

          {filteredVehicles.length === 0 ? (
            <Empty description="Không tìm thấy xe phù hợp" />
          ) : (
            <Row gutter={[16, 16]}>
              {filteredVehicles.map(vehicle => (
                <Col key={vehicle.id} xs={24} sm={12}>
                  <Card
                    hoverable
                    onClick={() => addVehicle(vehicle.id)}
                    style={{ cursor: 'pointer' }}
                  >
                    <Row gutter={16}>
                      <Col span={8}>
                        <Image
                          src={vehicle.image_url || '/images/default-car.jpg'}
                          alt={vehicle.variant_name}
                          width="100%"
                          height={80}
                          preview={false}
                          style={{ objectFit: 'cover', borderRadius: '4px' }}
                        />
                      </Col>
                      <Col span={16}>
                        <Space direction="vertical" size="small" style={{ width: '100%' }}>
                          <Text strong>{vehicle.variant_name}</Text>
                          <Text type="secondary" style={{ fontSize: '12px' }}>
                            {vehicle.model?.model_name}
                          </Text>
                          <Tag color="blue">{vehicle.color}</Tag>
                          <Text strong style={{ color: '#f5222d' }}>
                            {formatPrice(vehicle.finalPrice)}
                          </Text>
                        </Space>
                      </Col>
                    </Row>
                  </Card>
                </Col>
              ))}
            </Row>
          )}
        </Space>
      </Modal>
      </div>
    </Spin>
  );
};

export default VehicleComparePage;