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
  Alert,
  Empty,
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
  SearchOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined
} from '@ant-design/icons';
import { useAuth } from '../context/AuthContext'; // 1. Import Auth
import { vehicleAPI, vehicleInstanceAPI, vehiclePriceAPI } from '../services/vehicleService';
import { agencyInventoryAPI } from '../services/quotationService'; // Import API kho đại lý
import '../styles/VehicleComparePage.css';

const { Title, Text } = Typography;
const { Search } = Input;

const VehicleComparePage = () => {
  // 2. Lấy thông tin User
  const { isDealerManager, isDealerStaff, getAgencyId } = useAuth();

  // UI States
  const [selectedVehicles, setSelectedVehicles] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchText, setSearchText] = useState('');
  const maxCompare = 3;

  // Data States
  const [loading, setLoading] = useState(true);
  const [vehicles, setVehicles] = useState([]);             // Danh sách Model xe
  const [vehiclePrices, setVehiclePrices] = useState([]);   // Bảng giá

  // State để tính tồn kho (Dùng 1 trong 2 tùy role)
  const [globalInstances, setGlobalInstances] = useState([]); // Dành cho Guest/Admin
  const [agencyInventory, setAgencyInventory] = useState([]); // Dành cho Dealer

  // --- FETCH DATA LOGIC ---
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Xác định quyền: Là Dealer hay là Guest/Admin
        const isDealer = isDealerManager() || isDealerStaff();
        const agencyId = getAgencyId();

        // Luôn lấy Catalog xe và Giá (dữ liệu chung)
        const [allVehicles, allPrices] = await Promise.all([
          vehicleAPI.getAll(),
          vehiclePriceAPI.getAll()
        ]);

        setVehiclePrices(allPrices || []);

        if (isDealer && agencyId) {
          // === TRƯỜNG HỢP 1: LÀ ĐẠI LÝ (Lấy theo kho) ===
          // Chỉ lấy xe trong kho của Agency này
          const inventoryData = await agencyInventoryAPI.getByAgencyId(agencyId);
          setAgencyInventory(inventoryData || []);

          // Lọc ra danh sách ID các xe có trong kho
          const availableVehicleIds = (inventoryData || []).map(
            inv => inv.vehicleDetails?.vehicleId || inv.vehicleId
          );
          const uniqueIds = [...new Set(availableVehicleIds)];

          // Chỉ hiển thị các Model xe có trong kho
          const filteredVehicles = (allVehicles || []).filter(v => uniqueIds.includes(v.id));
          setVehicles(filteredVehicles);

        } else {
          // === TRƯỜNG HỢP 2: KHÁCH/ADMIN (Lấy tất cả) ===
          setVehicles(allVehicles || []);

          // Lấy toàn bộ instance hệ thống để đếm số lượng (cho view Guest)
          const allInstances = await vehicleInstanceAPI.getAll();
          setGlobalInstances(allInstances || []);
        }

      } catch (error) {
        console.error('Error fetching compare data:', error);
        message.error('Không thể tải dữ liệu xe.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [isDealerManager, isDealerStaff, getAgencyId]); // Dependency array quan trọng

  // --- DATA PROCESSING (useMemo) ---
  const vehicleData = useMemo(() => {
    if (!vehicles.length) return [];

    const isDealer = isDealerManager() || isDealerStaff();

    // Bước 1: Tính tồn kho
    const stockMap = {}; // { vehicleId: count }

    if (isDealer) {
      // Logic đếm cho Dealer (Dựa trên agencyInventory)
      agencyInventory.forEach(inv => {
        const vId = inv.vehicleDetails?.vehicleId || inv.vehicleId;
        if (vId) stockMap[vId] = (stockMap[vId] || 0) + 1;
      });
    } else {
      // Logic đếm cho Guest/Admin (Dựa trên globalInstances)
      globalInstances.forEach(inst => {
        const vId = inst.vehicleDetails?.vehicleId || inst.vehicleId;
        if (vId) stockMap[vId] = (stockMap[vId] || 0) + 1;
      });
    }

    // Bước 2: Map dữ liệu hiển thị
    return vehicles.map(vehicle => {
      const priceObj = vehiclePrices.find(p => p.vehicleId === vehicle.id);
      const stockCount = stockMap[vehicle.id] || 0;

      // Logic trạng thái
      // - Dealer: Chỉ thấy xe có trong kho nên luôn > 0 (do logic lọc ở useEffect)
      // - Guest: Có thể thấy xe count = 0 (Catalog)
      let status = 'out_of_stock';
      if (stockCount > 5) status = 'available';
      else if (stockCount > 0) status = 'limited';

      return {
        id: vehicle.id,
        variant_name: vehicle.variantName || 'Unknown',
        model_name: vehicle.option?.modelName || vehicle.modelName || 'Unknown Model',
        color: vehicle.color || 'Tiêu chuẩn',

        // Specs
        battery_capacity: vehicle.batteryCapacity || 'N/A',
        range_km: parseInt(vehicle.rangeKM) || 0,
        features: vehicle.features || '',
        image_url: vehicle.vehicleImage,

        // Computed
        price: priceObj?.priceAmount || 0,
        status: status,
        stockCount: stockCount // Số lượng thực tế (tại kho hoặc toàn hệ thống tùy view)
      };
    });
  }, [vehicles, vehiclePrices, globalInstances, agencyInventory, isDealerManager, isDealerStaff]);

  // --- ACTIONS ---
  const addVehicle = (vehicleId) => {
    if (selectedVehicles.length >= maxCompare) return;
    const vehicle = vehicleData.find(v => v.id === vehicleId);
    if (vehicle && !selectedVehicles.some(v => v.id === vehicleId)) {
      setSelectedVehicles([...selectedVehicles, vehicle]);
      setIsModalOpen(false);
      setSearchText('');
      message.success('Đã thêm xe vào so sánh');
    }
  };

  const removeVehicle = (id) => setSelectedVehicles(prev => prev.filter(v => v.id !== id));
  const clearAll = () => setSelectedVehicles([]);
  const formatPrice = (val) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val || 0);

  // Filter logic cho Modal
  const filteredVehicles = vehicleData.filter(v => {
    const isSelected = selectedVehicles.some(sel => sel.id === v.id);
    const matchSearch =
      v.variant_name.toLowerCase().includes(searchText.toLowerCase()) ||
      v.model_name.toLowerCase().includes(searchText.toLowerCase());
    return !isSelected && matchSearch;
  });

  // Table Columns
  const generateColumns = () => {
    const cols = [{
      title: 'Thông số',
      dataIndex: 'label',
      key: 'label',
      width: 150,
      fixed: 'left',
      render: (t) => <Text type="secondary">{t}</Text>
    }];

    selectedVehicles.forEach((v, i) => {
      cols.push({
        title: (
          <div className="compare-header-cell">
            <div className="car-name">{v.variant_name}</div>
            <Button type="text" danger size="small" icon={<DeleteOutlined />} onClick={() => removeVehicle(v.id)} />
          </div>
        ),
        dataIndex: `v_${i}`,
        key: `v_${i}`,
        width: 220,
        align: 'center',
        render: (val, record) => renderCellContent(val, record.type)
      });
    });
    return cols;
  };

  const renderCellContent = (val, type) => {
    switch (type) {
      case 'image': return <Image src={val} height={100} style={{ borderRadius: 8, objectFit: 'cover' }} fallback="error" />;
      case 'price': return <Text strong style={{ color: '#f5222d', fontSize: 16 }}>{formatPrice(val)}</Text>;
      case 'status':
        if (val === 'available') return <Tag color="success" icon={<CheckCircleOutlined />}>Sẵn hàng</Tag>;
        if (val === 'limited') return <Tag color="warning">Sắp hết</Tag>;
        return <Tag color="default">Hết hàng</Tag>;
      default: return <Text>{val}</Text>;
    }
  };

  // Table Data
  const dataSource = [
    { key: 'img', label: 'Hình ảnh', type: 'image' },
    { key: 'model', label: 'Dòng xe', type: 'text' },
    { key: 'price', label: 'Giá niêm yết', type: 'price' },
    { key: 'status', label: 'Tình trạng', type: 'status' },
    { key: 'battery', label: 'Pin', type: 'text' },
    { key: 'range', label: 'Quãng đường', type: 'text' },
    { key: 'color', label: 'Màu sắc', type: 'text' },
    { key: 'feat', label: 'Tính năng', type: 'text' },
  ].map(row => {
    const r = { key: row.key, label: row.label, type: row.type };
    selectedVehicles.forEach((v, i) => {
      switch (row.key) {
        case 'img': r[`v_${i}`] = v.image_url; break;
        case 'model': r[`v_${i}`] = v.model_name; break;
        case 'price': r[`v_${i}`] = v.price; break;
        case 'status': r[`v_${i}`] = v.status; break;
        case 'battery': r[`v_${i}`] = v.battery_capacity; break;
        case 'range': r[`v_${i}`] = `${v.range_km} km`; break;
        case 'color': r[`v_${i}`] = v.color; break;
        case 'feat': r[`v_${i}`] = v.features; break;
        default: break;
      }
    });
    return r;
  });

  return (
    <Spin spinning={loading}>
      <div className="vehicle-compare-container">
        <Card className="compare-controls" bordered={false} style={{ marginBottom: 16 }}>
          <Row justify="space-between" align="middle">
            <Col>
              <Title level={4} style={{ margin: 0 }}><SwapOutlined /> So Sánh Xe</Title>
              <Text type="secondary">
                {isDealerManager() || isDealerStaff() ? '(Kho đại lý)' : '(Toàn hệ thống)'}
              </Text>
            </Col>
            <Col>
              <Space>
                <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsModalOpen(true)} disabled={selectedVehicles.length >= maxCompare}>
                  Thêm xe
                </Button>
                {selectedVehicles.length > 0 && <Button onClick={clearAll}>Xóa tất cả</Button>}
              </Space>
            </Col>
          </Row>
        </Card>

        {selectedVehicles.length > 0 ? (
          <Table
            columns={generateColumns()}
            dataSource={dataSource}
            pagination={false}
            bordered
            size="middle"
            scroll={{ x: 'max-content' }}
          />
        ) : (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa chọn xe nào">
            <Button type="dashed" onClick={() => setIsModalOpen(true)}>Chọn xe ngay</Button>
          </Empty>
        )}

        <Modal title="Chọn xe so sánh" open={isModalOpen} onCancel={() => setIsModalOpen(false)} footer={null} width={800}>
          <Search placeholder="Tìm kiếm..." allowClear onChange={e => setSearchText(e.target.value)} style={{ marginBottom: 16 }} />
          <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
            <Row gutter={[12, 12]}>
              {filteredVehicles.map(v => (
                <Col span={12} key={v.id}>
                  <Card hoverable size="small" onClick={() => addVehicle(v.id)} style={{ cursor: 'pointer' }}>
                    <Row gutter={12} align="middle">
                      <Col span={8}><img src={v.image_url} alt="xe" style={{ width: '100%', borderRadius: 4 }} /></Col>
                      <Col span={16}>
                        <div style={{ fontWeight: 'bold' }}>{v.variant_name}</div>
                        <div style={{ fontSize: 12, color: '#666' }}>{v.model_name}</div>
                        <div style={{ color: '#f5222d' }}>{formatPrice(v.price)}</div>
                        {/* Nếu là Dealer, hiển thị số lượng tồn kho cụ thể */}
                        {(isDealerManager() || isDealerStaff()) && (
                          <Tag color="blue" style={{ marginTop: 4 }}>Kho: {v.stockCount}</Tag>
                        )}
                      </Col>
                    </Row>
                  </Card>
                </Col>
              ))}
            </Row>
            {filteredVehicles.length === 0 && <Empty description="Không tìm thấy xe" />}
          </div>
        </Modal>
      </div>
    </Spin>
  );
};

export default VehicleComparePage;