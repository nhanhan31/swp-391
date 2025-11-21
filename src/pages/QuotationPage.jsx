import React, { useState, useMemo, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Tag,
  Modal,
  Form,
  Input,
  Select,
  InputNumber,
  Row,
  Col,
  Typography,
  Divider,
  Steps,
  DatePicker,
  message,
  Descriptions,
  Badge,
  Tooltip,
  Dropdown,
  Spin
} from 'antd';
import {
  PlusOutlined,
  EyeOutlined,
  EditOutlined,
  DeleteOutlined,
  FileTextOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  PrinterOutlined,
  SearchOutlined,
  MoreOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useAuth } from '../context/AuthContext';
import { quotationAPI, userAPI, customerAPI, contractAPI, orderAPI, agencyInventoryAPI, promotionAPI, vehicleInstanceAPI } from '../services/quotationService';
import { vehicleAPI, vehiclePriceAPI } from '../services/vehicleService';

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;
const { Step } = Steps;

const QuotationPage = () => {
  const { currentUser, isDealerManager, isDealerStaff, getAgencyId } = useAuth();

  const [quotations, setQuotations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [selectedQuotation, setSelectedQuotation] = useState(null);
  const [form] = Form.useForm();
  const [selectedVehicle, setSelectedVehicle] = useState(null);

  // Vehicle data states
  const [vehicles, setVehicles] = useState([]);
  const [vehicleInstances, setVehicleInstances] = useState([]);
  const [vehiclePrices, setVehiclePrices] = useState([]);
  const [agencyInventory, setAgencyInventory] = useState([]);
  const [promotions, setPromotions] = useState([]);

  // Customer data
  const [customers, setCustomers] = useState([]);

  // Fetch quotations from API
  useEffect(() => {
    const fetchQuotations = async () => {
      setLoading(true);
      try {
        let quotationsData = [];

        console.log('Current User:', currentUser);
        console.log('Is Dealer Staff:', isDealerStaff());
        console.log('Is Dealer Manager:', isDealerManager());

        if (isDealerStaff()) {
          // AgencyStaff: Get quotations created by this user
          const userId = currentUser?.id;
          console.log('Fetching quotations for userId:', userId);
          if (userId) {
            quotationsData = await quotationAPI.getByUserId(userId);
            console.log('Staff quotations data:', quotationsData);
          } else {
            console.warn('No userId found for staff');
          }
        } else if (isDealerManager()) {
          // AgencyManager: Get all quotations for this agency
          const agencyId = getAgencyId();
          console.log('Fetching quotations for agencyId:', agencyId);
          if (agencyId) {
            quotationsData = await quotationAPI.getByAgencyId(agencyId);
            console.log('Manager quotations data:', quotationsData);

            // Fetch user info for each quotation if user is null
            const quotationsWithUsers = await Promise.all(
              quotationsData.map(async (quotation) => {
                if (!quotation.user && quotation.createBy) {
                  try {
                    const userInfo = await userAPI.getById(quotation.createBy);
                    return { ...quotation, user: userInfo };
                  } catch (error) {
                    console.error(`Error fetching user ${quotation.createBy}:`, error);
                    return quotation;
                  }
                }
                return quotation;
              })
            );
            quotationsData = quotationsWithUsers;
          } else {
            console.warn('No agencyId found for manager');
          }
        }

        console.log('Raw quotations data:', quotationsData);
        console.log('Is array:', Array.isArray(quotationsData));
        
        // Ensure quotationsData is always an array
        if (!Array.isArray(quotationsData)) {
          console.warn('quotationsData is not an array, converting to empty array');
          quotationsData = [];
        }

        // Fetch customer info for all quotations
        const quotationsWithCustomers = await Promise.all(
          quotationsData.map(async (quotation) => {
            if (quotation.customerId) {
              try {
                const customerInfo = await customerAPI.getById(quotation.customerId);
                return { ...quotation, customer: customerInfo };
              } catch (error) {
                console.error(`Error fetching customer ${quotation.customerId}:`, error);
                return quotation;
              }
            }
            return quotation;
          })
        );
        quotationsData = quotationsWithCustomers;

        // Transform API data to match component structure
        const transformedQuotations = quotationsData.map(q => ({
          id: q.id,
          quotation_code: `QT${q.id.toString().padStart(6, '0')}`,
          quotation_name: q.quotationName,
          customer_id: q.customerId,
          customer_name: q.customer?.fullName || `Khách hàng ${q.customerId}`,
          customer_phone: q.customer?.phone || 'N/A',
          customer_email: q.customer?.email || 'N/A',
          customer_address: q.customer?.address || 'N/A',
          vehicle_id: q.vehicle?.id,
          vehicle_name: q.vehicle?.variantName || 'N/A',
          vehicle_model: q.vehicle?.modelName,
          vehicle_color: q.vehicle?.color,
          quantity: 1,
          unit_price: q.quotedPrice,
          discount_amount: 0,
          total_amount: q.quotedPrice,
          valid_until: q.endDate,
          start_date: q.startDate,
          status: q.status?.toLowerCase() || 'pending',
          created_by: q.createBy,
          created_by_name: q.user?.fullName || 'N/A',
          created_at: q.createdAt,
          agency: q.agency,
          vehicle_details: q.vehicle,
          vehicleInstanceId: q.vehicleInstanceId,
          user: q.user
        }));

        console.log('Transformed quotations:', transformedQuotations);
        console.log('Total quotations count:', transformedQuotations.length);
        setQuotations(transformedQuotations);
      } catch (error) {
        console.error('Error fetching quotations:', error);
        console.error('Error details:', error.response?.data || error.message);
        message.error(`Không thể tải dữ liệu báo giá: ${error.response?.data?.message || error.message}`);
        // Set empty array to avoid undefined errors
        setQuotations([]);
      } finally {
        setLoading(false);
      }
    };

    fetchQuotations();
  }, [currentUser, isDealerStaff, isDealerManager, getAgencyId]);

  // Fetch vehicle data
  useEffect(() => {
    const fetchVehicleData = async () => {
      try {
        const agencyId = getAgencyId();
        let availableInstanceIds = [];

        if (agencyId && (isDealerManager() || isDealerStaff())) {
          const inventoryData = await agencyInventoryAPI.getByAgencyId(agencyId);
          setAgencyInventory(inventoryData || []);
          availableInstanceIds = (inventoryData || []).map(inv => inv.vehicleInstanceId);
        }

        const allInstancesData = await vehicleInstanceAPI.getAll();
        // Filter: chỉ lấy instance thuộc agency và status khác Reserved
        const filteredInstances = (isDealerManager() || isDealerStaff())
          ? (allInstancesData || []).filter(inst => 
              availableInstanceIds.includes(inst.id) && 
              inst.status?.toLowerCase() !== 'reserved'
            )
          : (allInstancesData || []).filter(inst => inst.status?.toLowerCase() !== 'reserved');

        setVehicleInstances(filteredInstances);

        const uniqueVehicleIds = [...new Set(filteredInstances.map(inst => inst.vehicleId))];

        const [vehiclesData, pricesData, allPromotionsData] = await Promise.all([
          vehicleAPI.getAll(),
          vehiclePriceAPI.getAll(),
          promotionAPI.getAll()
        ]);

        const filteredVehicles = (vehiclesData || []).filter(v => uniqueVehicleIds.includes(v.id));

        // Filter promotions: national (agencyId null/0) + current agency promotions
        const filteredPromotions = agencyId 
          ? (allPromotionsData || []).filter(p => 
              !p.agencyId || p.agencyId === 0 || p.agencyId === agencyId
            )
          : (allPromotionsData || []).filter(p => !p.agencyId || p.agencyId === 0);

        setVehicles(filteredVehicles);
        setVehiclePrices(pricesData || []);
        setPromotions(filteredPromotions);
      } catch (error) {
        console.error('Error fetching vehicle data:', error);
      }
    };

    fetchVehicleData();
  }, [getAgencyId, isDealerManager, isDealerStaff]);

  // Fetch customers
  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const agencyId = getAgencyId();
        const customersData = await customerAPI.getAll();
        
        // Filter customers by current agency
        const filteredCustomers = agencyId 
          ? (customersData || []).filter(c => c.agencyId === agencyId)
          : (customersData || []);
        
        setCustomers(filteredCustomers);
      } catch (error) {
        console.error('Error fetching customers:', error);
      }
    };

    fetchCustomers();
  }, [getAgencyId]);

  // Vehicle data với giá từ API
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

      const price = vehiclePrices.find(p => p.vehicleId === vehicle.id && p.priceType === 'MSRP');

      return {
        id: vehicle.id,
        variant_name: vehicle.variantName || 'Unknown',
        model_name: vehicle.option?.modelName || 'Unknown Model',
        color: vehicle.color || 'N/A',
        price: price?.priceAmount || 0,
        battery_capacity: vehicle.batteryCapacity,
        range_km: vehicle.rangeKM,
        image_url: vehicle.vehicleImage,
        availableInstances: group.instances.filter(inst => inst.status?.toLowerCase() !== 'reserved').length
      };
    }).filter(Boolean);
  }, [vehicles, vehicleInstances, vehiclePrices]);

  // Format tiền
  const formatPrice = (price) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(price);
  };

  // Get status info
  const getStatusInfo = (status) => {
    const statusMap = {
      pending: { color: 'warning', text: 'pending', icon: '' },
      
      accepted: { color: 'success', text: 'Accepted', icon: '' },
      rejected: { color: 'error', text: 'rejected', icon: '' },
      expired: { color: 'default', text: 'Hết hạn', icon: '' },
      converted: { color: 'processing', text: 'converted', icon: '' }
    };
    const normalizedStatus = status?.toLowerCase();
    return statusMap[normalizedStatus] || statusMap.pending;
  };

  // Mở modal tạo mới
  const handleCreate = () => {
    setModalMode('create');
    setSelectedQuotation(null);
    setSelectedVehicle(null);
    form.resetFields();
    form.setFieldsValue({
      valid_until: dayjs().add(30, 'day'),
      start_date: dayjs()
    });
    setIsModalOpen(true);
  };

  // Mở modal xem chi tiết - fetch customer info
  const handleView = async (record) => {
    setModalMode('view');
    setSelectedQuotation(record);
    setIsModalOpen(true);

    // Fetch customer details
    if (record.customer_id) {
      try {
        const customerData = await customerAPI.getById(record.customer_id);
        setSelectedQuotation({
          ...record,
          customer_name: customerData.fullName,
          customer_phone: customerData.phone,
          customer_email: customerData.email,
          customer_address: customerData.address
        });
      } catch (error) {
        console.error('Error fetching customer details:', error);
      }
    }
  };

  // Mở modal chỉnh sửa
  const handleEdit = (record) => {
    setModalMode('edit');
    setSelectedQuotation(record);
    const vehicle = vehicleData.find(v => v.id === record.vehicle_id);
    setSelectedVehicle(vehicle);
    form.setFieldsValue({
      customer_id: record.customer_id,
      vehicle_id: record.vehicle_id,
      quotation_name: record.quotation_name,
      start_date: dayjs(record.start_date),
      valid_until: dayjs(record.valid_until),
      quoted_price: record.unit_price
    });
    setIsModalOpen(true);
  };

  // Xóa báo giá
  const handleDelete = async (id) => {
    Modal.confirm({
      title: 'Xác nhận xóa',
      content: 'Bạn có chắc chắn muốn xóa báo giá này?',
      okText: 'Xóa',
      cancelText: 'Hủy',
      okType: 'danger',
      onOk: async () => {
        try {
          await quotationAPI.delete(id);
          setQuotations(quotations.filter(q => q.id !== id));
          message.success('Đã xóa báo giá thành công');
        } catch (error) {
          console.error('Error deleting quotation:', error);
          message.error('Không thể xóa báo giá');
        }
      }
    });
  };

  // Duyệt báo giá (chỉ update status, không tạo contract)
  const handleApprove = async (id) => {
    try {
      const quotation = quotations.find(q => q.id === id);
      if (!quotation) return;

      // Update quotation status to Accepted via PUT /api/Quotation/{id}
      const updatePayload = {
        agencyId: getAgencyId(),
        customerId: quotation.customer_id,
        vehicleInstanceId: quotation.vehicleInstanceId,
        quotationName: quotation.quotation_name,
        quotedPrice: quotation.unit_price,
        startDate: quotation.start_date,
        endDate: quotation.valid_until,
        createBy: quotation.created_by,
        createAt: quotation.created_at,
        status: 'Accepted'
      };

      await quotationAPI.update(id, updatePayload);


      // Update local state
      setQuotations(quotations.map(q =>
        q.id === id ? { ...q, status: 'accepted' } : q
      ));

      message.success('Đã duyệt báo giá thành công');
    } catch (error) {
      console.error('Error approving quotation:', error);
      message.error('Không thể duyệt báo giá. Vui lòng thử lại.');
    }
  };

  // Từ chối báo giá
  const handleReject = async (id) => {
    try {
      const quotation = quotations.find(q => q.id === id);
      if (!quotation) return;

      // Update quotation status to rejected via PUT /api/Quotation/{id}
      const updatePayload = {
        agencyId: getAgencyId(),
        customerId: quotation.customer_id,
        vehicleInstanceId: quotation.vehicleInstanceId,
        quotationName: quotation.quotation_name,
        quotedPrice: quotation.unit_price,
        startDate: quotation.start_date,
        endDate: quotation.valid_until,
        createBy: quotation.created_by,
        createAt: quotation.created_at,
        status: 'Rejected'
      };

      await quotationAPI.update(id, updatePayload);

      setQuotations(quotations.map(q =>
        q.id === id ? { ...q, status: 'rejected' } : q
      ));
      message.warning('Đã từ chối báo giá');
    } catch (error) {
      console.error('Error rejecting quotation:', error);
      message.error('Không thể từ chối báo giá');
    }
  };

  // Chuyển sang đơn hàng - Tạo Order và Contract
  const handleConvertToOrder = async (quotation) => {
    Modal.confirm({
      title: 'Tạo đơn hàng',
      content: 'Bạn muốn tạo đơn hàng từ báo giá này? Hệ thống sẽ tạo đơn hàng và hợp đồng tương ứng.',
      okText: 'Tạo đơn hàng',
      cancelText: 'Hủy',
      onOk: async () => {
        try {
          console.log('🚀 Starting convert to order for quotation:', quotation.id);
          
          // 0. Get fresh quotation data from API to ensure we have vehicle info
          const freshQuotation = await quotationAPI.getById(quotation.id);
          console.log('📄 Fresh quotation data:', freshQuotation);
          
          // 1. Create Order
          const orderPayload = {
            customerId: quotation.customer_id,
            status: 'string',
            createdBy: currentUser?.id,
            details: [
              {
                quotationId: quotation.id,
                unitPrice: quotation.unit_price
              }
            ]
          };

          const newOrder = await orderAPI.create(orderPayload);
          console.log('✅ Created order:', newOrder);

          // 2. Update VehicleInstance status to Reserved
          if (freshQuotation.vehicle?.id) {
            try {
              const vehicleInstanceId = freshQuotation.vehicle.id;
              console.log('🔄 Updating VehicleInstance:', vehicleInstanceId);
              
              await vehicleInstanceAPI.update(vehicleInstanceId, {
                VehicleId: freshQuotation.vehicle.vehicleId,
                Vin: freshQuotation.vehicle.vin,
                EngineNumber: freshQuotation.vehicle.engineNumber,
                Status: 'Reserved'
              });
              console.log(`✅ Updated VehicleInstance ${vehicleInstanceId} to Reserved`);
            } catch (error) {
              console.error('❌ Error updating VehicleInstance status:', error);
              console.error('Error details:', error.response?.data);
            }
          } else {
            console.warn('⚠️ No vehicle info found in quotation');
          }

          // 3. Update quotation status to converted
          const updatePayload = {
            agencyId: getAgencyId(),
            customerId: quotation.customer_id,
            vehicleInstanceId: quotation.vehicleInstanceId,
            quotationName: quotation.quotation_name,
            quotedPrice: quotation.unit_price,
            startDate: quotation.start_date,
            endDate: quotation.valid_until,
            createBy: quotation.created_by,
            createAt: quotation.created_at,
            status: 'Converted'
          };

          await quotationAPI.update(quotation.id, updatePayload);

          // 4. Update local state
          setQuotations(quotations.map(q =>
            q.id === quotation.id ? { ...q, status: 'converted' } : q
          ));

          message.success('Đã tạo đơn hàng và hợp đồng thành công');
        } catch (error) {
          console.error('Error converting to order:', error);
          message.error('Không thể tạo đơn hàng. Vui lòng thử lại.');
        }
      }
    });
  };

  // Khi chọn xe
  const handleVehicleChange = (vehicleId) => {
    const vehicle = vehicleData.find(v => v.id === vehicleId);
    setSelectedVehicle(vehicle);
    if (vehicle) {
      calculateFinalPrice(vehicleId, vehicle, form.getFieldValue('customer_id'));
    }
  };

  // Khi chọn khách hàng
  const handleCustomerChange = (customerId) => {
    const vehicleId = form.getFieldValue('vehicle_id');
    if (vehicleId) {
      const vehicle = vehicleData.find(v => v.id === vehicleId);
      if (vehicle) {
        calculateFinalPrice(vehicleId, vehicle, customerId);
      }
    }
  };

  // Calculate final price with promotions and customer class discount
  const calculateFinalPrice = (vehicleId, vehicle, customerId) => {
    const now = dayjs();
    const agencyId = getAgencyId();
    
    // 1. Tìm TẤT CẢ khuyến mãi đang áp dụng cho xe này
    const activePromotions = promotions.filter(promo => 
      promo.vehicleId === vehicleId &&
      dayjs(promo.startDate).isBefore(now) &&
      dayjs(promo.endDate).isAfter(now)
    );

    let basePrice = vehicle.price;
    let totalPromotionDiscount = 0;
    const promotionDetails = [];

    // 2. Áp dụng TẤT CẢ khuyến mãi (cộng dồn)
    activePromotions.forEach(promo => {
      const discount = promo.discountAmount;
      totalPromotionDiscount += discount;
      
      const scope = (!promo.agencyId || promo.agencyId === 0) 
        ? 'Toàn quốc' 
        : 'Đại lý';
      
      promotionDetails.push({
        name: promo.promoName,
        scope,
        discount
      });
    });

    // Trừ tổng khuyến mãi từ giá gốc
    basePrice = basePrice - totalPromotionDiscount;

    let classDiscount = 0;
    let classDiscountPercent = 0;

    // 3. Áp dụng giảm giá theo class khách hàng (tính trên giá sau khuyến mãi)
    if (customerId) {
      const customer = customers.find(c => c.id === customerId);
      if (customer && customer.class) {
        const customerClass = customer.class.toLowerCase();
        if (customerClass === 'vip') {
          classDiscountPercent = 3;
        } else if (customerClass === 'kim cương' || customerClass === 'kim cuong') {
          classDiscountPercent = 5;
        }
        // Thường: 0%
        
        if (classDiscountPercent > 0) {
          classDiscount = Math.round(basePrice * classDiscountPercent / 100);
        }
      }
    }

    const finalPrice = basePrice - classDiscount;
    const totalDiscount = totalPromotionDiscount + classDiscount;

    // Display messages
    const messages = [];
    
    // Hiển thị từng khuyến mãi
    promotionDetails.forEach(promo => {
      messages.push(`KM ${promo.scope}: ${promo.name} -${new Intl.NumberFormat('vi-VN').format(promo.discount)}đ`);
    });
    
    // Hiển thị giảm giá class
    if (classDiscountPercent > 0) {
      messages.push(`Giảm giá ${classDiscountPercent}% (${customer.class}): -${new Intl.NumberFormat('vi-VN').format(classDiscount)}đ`);
    }
    
    if (messages.length > 0) {
      message.success(messages.join(' | '), 5);
    }

    form.setFieldsValue({
      quoted_price: finalPrice,
      discount_amount: totalDiscount,
      original_price: vehicle.price,
      promotion_discount: totalPromotionDiscount,
      class_discount: classDiscount,
      class_discount_percent: classDiscountPercent
    });
  };

  // Submit form
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();

      const customer = customers.find(c => c.id === values.customer_id);
      const vehicle = vehicleData.find(v => v.id === values.vehicle_id);
      const agencyId = getAgencyId();

      // Find vehicleInstanceId from inventory
      const inventoryItem = agencyInventory.find(inv => {
        const instance = vehicleInstances.find(inst => inst.id === inv.vehicleInstanceId);
        return instance && instance.vehicleId === values.vehicle_id;
      });

      const quotationPayload = {
        AgencyId: agencyId,
        CustomerId: values.customer_id,
        VehicleInstanceId: inventoryItem?.vehicleInstanceId || vehicleInstances.find(inst => inst.vehicleId === values.vehicle_id)?.id,
        QuotationName: values.quotation_name || `Báo giá ${customer?.fullName || 'Khách hàng'}`,
        QuotedPrice: values.quoted_price,
        StartDate: values.start_date.toISOString(),
        EndDate: values.valid_until.toISOString(),
        CreateBy: currentUser?.id,
        CreateAt: dayjs().toISOString(),
        Status: 'Pending'
      };

      if (modalMode === 'create') {
        const newQuotation = await quotationAPI.create(quotationPayload);

        // Transform and add to list
        const transformedQuotation = {
          id: newQuotation.id,
          quotation_code: `QT${newQuotation.id.toString().padStart(6, '0')}`,
          quotation_name: newQuotation.quotationName,
          customer_id: newQuotation.customerId,
          customer_name: customer?.fullName || 'N/A',
          customer_phone: customer?.phone || 'N/A',
          vehicle_id: vehicle?.id,
          vehicle_name: vehicle?.variant_name || 'N/A',
          vehicle_model: vehicle?.model_name,
          quantity: 1,
          unit_price: values.quoted_price,
          discount_amount: 0,
          total_amount: values.quoted_price,
          valid_until: values.valid_until.toISOString(),
          start_date: values.start_date.toISOString(),
          status: 'pending',
          created_by: currentUser?.id,
          created_at: dayjs().toISOString()
        };

        setQuotations([transformedQuotation, ...quotations]);
        message.success('Tạo báo giá thành công');
      } else if (modalMode === 'edit') {
        await quotationAPI.update(selectedQuotation.id, quotationPayload);

        // Update in list
        setQuotations(quotations.map(q =>
          q.id === selectedQuotation.id ? {
            ...q,
            customer_id: values.customer_id,
            customer_name: customer?.fullName || 'N/A',
            customer_phone: customer?.phone || 'N/A',
            vehicle_id: vehicle?.id,
            vehicle_name: vehicle?.variant_name || 'N/A',
            vehicle_model: vehicle?.model_name,
            unit_price: values.quoted_price,
            discount_amount: 0,
            total_amount: values.quoted_price,
            valid_until: values.valid_until.toISOString(),
            start_date: values.start_date.toISOString()
          } : q
        ));
        message.success('Cập nhật báo giá thành công');
      }

      setIsModalOpen(false);
      form.resetFields();
    } catch (error) {
      console.error('Error submitting quotation:', error);
      message.error('Không thể lưu báo giá. Vui lòng thử lại.');
    }
  };

  // Table columns
  const columns = [
    {
      title: 'Mã báo giá',
      dataIndex: 'quotation_code',
      key: 'quotation_code',
      fixed: 'left',
      width: 120,
      render: (_, record) => (
        <div>
          <Text strong>{record.id}</Text>

        </div>
      )
    },
    {
      title: 'Khách hàng',
      key: 'customer',
      width: 200,
      render: (_, record) => (
        <div>
          <Text strong>{record.customer_name}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {record.customer_phone}
          </Text>
        </div>
      )
    },
    {
      title: 'Xe',
      key: 'vehicle',
      width: 200,
      render: (_, record) => (
        <div>
          <Text strong>{record.vehicle_name}</Text>
          <br />
          {record.vehicle_model && (
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {record.vehicle_model}
            </Text>
          )}
        </div>
      )
    },
    {
      title: 'Đơn giá',
      dataIndex: 'unit_price',
      key: 'unit_price',
      width: 150,
      render: (price) => formatPrice(price)
    },
    {
      title: 'Giảm giá',
      dataIndex: 'discount_amount',
      key: 'discount_amount',
      width: 120,
      render: (amount) => amount > 0 ? (
        <Tag color="red">-{formatPrice(amount)}</Tag>
      ) : (
        <Text type="secondary">0</Text>
      )
    },
    {
      title: 'Tổng tiền',
      dataIndex: 'total_amount',
      key: 'total_amount',
      width: 150,
      render: (amount) => (
        <Text strong style={{ color: '#f5222d', fontSize: '14px' }}>
          {formatPrice(amount)}
        </Text>
      )
    },
    {
      title: 'Hạn báo giá',
      dataIndex: 'valid_until',
      key: 'valid_until',
      width: 120,
      render: (date) => dayjs(date).format('DD/MM/YYYY')
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      fixed: 'right',
      render: (status) => {
        const info = getStatusInfo(status);
        return (
          <Tag color={info.color}>
            {info.icon} {info.text}
          </Tag>
        );
      }
    },
    {
      title: 'Thao tác',
      key: 'actions',
      fixed: 'right',
      width: 80,
      align: 'center',
      render: (_, record) => {
        const items = [
          {
            key: 'view',
            icon: <EyeOutlined />,
            label: 'Xem chi tiết',
            onClick: () => handleView(record)
          }
        ];

        if (record.status === 'pending') {
          items.push(
            {
              key: 'edit',
              icon: <EditOutlined />,
              label: 'Chỉnh sửa',
              onClick: () => handleEdit(record)
            }
          );

          // Both AgencyManager and AgencyStaff can approve/reject
          if (isDealerStaff() || isDealerManager()) {
            items.push(
              {
                type: 'divider'
              },
              {
                key: 'approve',
                icon: <CheckCircleOutlined />,
                label: 'Khách hàng đồng ý',
                onClick: () => handleApprove(record.id)
              },
              {
                key: 'reject',
                icon: <CloseCircleOutlined />,
                label: 'Khách hàng từ chối',
                danger: true,
                onClick: () => handleReject(record.id)
              }
            );
          }
        }

        // Only AgencyManager can convert to order
        if (record.status === 'accepted' && isDealerManager()) {
          items.push({
            key: 'convert',
            icon: <FileTextOutlined />,
            label: 'Tạo đơn hàng',
            onClick: () => handleConvertToOrder(record)
          });
        }

        items.push(
          {
            type: 'divider'
          },
          {
            key: 'delete',
            icon: <DeleteOutlined />,
            label: 'Xóa',
            danger: true,
            onClick: () => handleDelete(record.id)
          }
        );

        return (
          <Dropdown
            menu={{ items }}
            trigger={['click']}
            placement="bottomRight"
          >
            <Button type="text" icon={<MoreOutlined />} />
          </Dropdown>
        );
      }
    }
  ];

  return (
    <Spin spinning={loading} tip="Đang tải dữ liệu báo giá...">
      <div className="quotation-page">
        <div className="page-header" style={{ marginBottom: '24px' }}>
          <Row justify="space-between" align="middle">
            <Col>
              <Title level={2}>
                <FileTextOutlined /> Quản lý báo giá
              </Title>
              <Text type="secondary">Tạo và quản lý báo giá cho khách hàng</Text>
            </Col>
            <Col>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                size="large"
                onClick={handleCreate}
              >
                Tạo báo giá mới
              </Button>
            </Col>
          </Row>
        </div>

        {/* Statistics */}
        <Row gutter={16} style={{ marginBottom: '24px' }}>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <div style={{ textAlign: 'center' }}>
                <Text type="secondary">Chờ duyệt</Text>
                <Title level={2} style={{ margin: '8px 0', color: '#faad14' }}>
                  {quotations.filter(q => q.status === 'pending').length}
                </Title>
              </div>
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <div style={{ textAlign: 'center' }}>
                <Text type="secondary">Đã duyệt</Text>
                <Title level={2} style={{ margin: '8px 0', color: '#52c41a' }}>
                  {quotations.filter(q => q.status === 'accepted').length}
                </Title>
              </div>
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <div style={{ textAlign: 'center' }}>
                <Text type="secondary">Đã chuyển đơn</Text>
                <Title level={2} style={{ margin: '8px 0', color: '#1890ff' }}>
                  {quotations.filter(q => q.status === 'converted').length}
                </Title>
              </div>
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <div style={{ textAlign: 'center' }}>
                <Text type="secondary">Tổng giá trị</Text>
                <Title level={2} style={{ margin: '8px 0', color: '#f5222d' }}>
                  {formatPrice(quotations.reduce((sum, q) => sum + q.total_amount, 0))}
                </Title>
              </div>
            </Card>
          </Col>
        </Row>

        {/* Table */}
        <Card>
          <Table
            columns={columns}
            dataSource={quotations}
            rowKey="id"
            scroll={{ x: 1500 }}
            pagination={{
              pageSize: 10,
              showTotal: (total) => `Tổng ${total} báo giá`,
              showSizeChanger: true
            }}
          />
        </Card>

        {/* Create/Edit Modal */}
        <Modal
          title={
            modalMode === 'create' ? 'Tạo báo giá mới' :
              modalMode === 'edit' ? 'Chỉnh sửa báo giá' :
                'Chi tiết báo giá'
          }
          open={isModalOpen && modalMode !== 'view'}
          onCancel={() => setIsModalOpen(false)}
          onOk={handleSubmit}
          okText={modalMode === 'create' ? 'Tạo báo giá' : 'Cập nhật'}
          cancelText="Hủy"
          width={800}
        >
          <Form
            form={form}
            layout="vertical"
            style={{ marginTop: '24px' }}
          >
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="customer_id"
                  label="Khách hàng"
                  rules={[{ required: true, message: 'Vui lòng chọn khách hàng' }]}
                >
                  <Select
                    placeholder="Chọn khách hàng"
                    showSearch
                    optionFilterProp="children"
                    onChange={handleCustomerChange}
                    filterOption={(input, option) =>
                      (option?.children?.toString().toLowerCase() ?? '').includes(input.toLowerCase())
                    }
                  >
                    {customers.map(customer => (
                      <Option key={customer.id} value={customer.id}>
                        {customer.fullName} - {customer.phone}
                        {/* {customer.class && customer.class !== 'Thường' && (
                          <Tag color="gold" style={{ marginLeft: 8 }}>
                            {customer.class}
                          </Tag>
                        )} */}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="vehicle_id"
                  label="Xe"
                  rules={[{ required: true, message: 'Vui lòng chọn xe' }]}
                >
                  <Select
                    placeholder="Chọn xe"
                    showSearch
                    optionFilterProp="children"
                    onChange={handleVehicleChange}
                    filterOption={(input, option) =>
                      (option?.children?.toString().toLowerCase() ?? '').includes(input.toLowerCase())
                    }
                  >
                    {vehicleData.map(vehicle => (
                      <Option 
                        key={vehicle.id} 
                        value={vehicle.id}
                        disabled={vehicle.availableInstances === 0}
                      >
                        {vehicle.variant_name} - {vehicle.color} ({vehicle.model_name}) - {formatPrice(vehicle.price)}
                        {vehicle.availableInstances === 0 && ' - Hết xe'}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            <Form.Item
              name="quotation_name"
              label="Tên báo giá"
            >
              <Input placeholder="Nhập tên báo giá (tùy chọn)" />
            </Form.Item>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="start_date"
                  label="Ngày bắt đầu"
                  rules={[{ required: true, message: 'Chọn ngày bắt đầu' }]}
                >
                  <DatePicker
                    style={{ width: '100%' }}
                    format="DD/MM/YYYY"
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="valid_until"
                  label="Hiệu lực đến"
                  rules={[{ required: true, message: 'Chọn ngày hết hạn' }]}
                >
                  <DatePicker
                    style={{ width: '100%' }}
                    format="DD/MM/YYYY"
                    disabledDate={(current) => current && current < dayjs().startOf('day')}
                  />
                </Form.Item>
              </Col>
            </Row>

            {/* Hidden fields for tracking */}
            <Form.Item name="original_price" hidden>
              <InputNumber />
            </Form.Item>
            <Form.Item name="discount_amount" hidden>
              <InputNumber />
            </Form.Item>
            <Form.Item name="promotion_discount" hidden>
              <InputNumber />
            </Form.Item>
            <Form.Item name="class_discount" hidden>
              <InputNumber />
            </Form.Item>
            <Form.Item name="class_discount_percent" hidden>
              <InputNumber />
            </Form.Item>

            {/* Display promotion and discount info if applicable */}
            {form.getFieldValue('discount_amount') > 0 && (
              <Card 
                size="small" 
                style={{ marginBottom: 16, backgroundColor: '#fff7e6', border: '1px solid #ffa940' }}
              >
                <Row gutter={[16, 8]}>
                  <Col span={24}>
                    <Text strong>Giá gốc:</Text>
                    <Text style={{ fontSize: '16px', marginLeft: 8 }}>
                      {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' })
                        .format(form.getFieldValue('original_price') || 0)}
                    </Text>
                  </Col>
                  
                  {form.getFieldValue('promotion_discount') > 0 && (
                    <Col span={24}>
                      <Text strong style={{ color: '#ff4d4f' }}>Khuyến mãi:</Text>
                      <Text style={{ fontSize: '14px', color: '#ff4d4f', marginLeft: 8 }}>
                        - {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' })
                          .format(form.getFieldValue('promotion_discount') || 0)}
                      </Text>
                    </Col>
                  )}
                  
                  {form.getFieldValue('class_discount') > 0 && (
                    <Col span={24}>
                      <Text strong style={{ color: '#faad14' }}>
                        Giảm giá khách hàng ({form.getFieldValue('class_discount_percent')}%):
                      </Text>
                      <Text style={{ fontSize: '14px', color: '#faad14', marginLeft: 8 }}>
                        - {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' })
                          .format(form.getFieldValue('class_discount') || 0)}
                      </Text>
                    </Col>
                  )}
                  
                  <Col span={24} style={{ borderTop: '1px solid #d9d9d9', paddingTop: 8, marginTop: 8 }}>
                    <Text strong>Tổng giảm giá:</Text>
                    <Text style={{ fontSize: '16px', color: '#ff4d4f', fontWeight: 'bold', marginLeft: 8 }}>
                      - {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' })
                        .format(form.getFieldValue('discount_amount') || 0)}
                    </Text>
                  </Col>
                </Row>
              </Card>
            )}

            <Form.Item
              name="quoted_price"
              label="Giá báo (Sau khuyến mãi)"
              rules={[{ required: true, message: 'Nhập giá báo' }]}
            >
              <InputNumber
                min={0}
                style={{ width: '100%' }}
                formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                parser={(value) => value.replace(/\$\s?|(,*)/g, '')}
                addonAfter="VND"
              />
            </Form.Item>
          </Form>
        </Modal>

        {/* View Modal */}
        <Modal
          title="Chi tiết báo giá"
          open={isModalOpen && modalMode === 'view'}
          onCancel={() => setIsModalOpen(false)}
          footer={[
            
            <Button key="close" onClick={() => setIsModalOpen(false)}>
              Đóng
            </Button>
          ]}
          width={700}
        >
          {selectedQuotation && (
            <Descriptions bordered column={2}>
              <Descriptions.Item label="Mã báo giá" span={2}>
                <Text strong>{selectedQuotation.quotation_code}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Trạng thái" span={2}>
                <Tag color={getStatusInfo(selectedQuotation.status).color}>
                  {getStatusInfo(selectedQuotation.status).text}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Khách hàng">
                {selectedQuotation.customer_name}
              </Descriptions.Item>
              <Descriptions.Item label="Số điện thoại">
                {selectedQuotation.customer_phone}
              </Descriptions.Item>
              <Descriptions.Item label="Email" span={2}>
                {selectedQuotation.customer_email}
              </Descriptions.Item>
              <Descriptions.Item label="Địa chỉ" span={2}>
                {selectedQuotation.customer_address}
              </Descriptions.Item>
              <Descriptions.Item label="Xe" span={2}>
                {selectedQuotation.vehicle_name}
                {selectedQuotation.vehicle_model && (
                  <Text type="secondary"> ({selectedQuotation.vehicle_model})</Text>
                )}
              </Descriptions.Item>
              <Descriptions.Item label="Số lượng">
                {selectedQuotation.quantity}
              </Descriptions.Item>
              <Descriptions.Item label="Đơn giá">
                {formatPrice(selectedQuotation.unit_price)}
              </Descriptions.Item>
              <Descriptions.Item label="Giảm giá" span={2}>
                <Tag color="red">{formatPrice(selectedQuotation.discount_amount)}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Tổng tiền" span={2}>
                <Text strong style={{ fontSize: '16px', color: '#f5222d' }}>
                  {formatPrice(selectedQuotation.total_amount)}
                </Text>
              </Descriptions.Item>
              <Descriptions.Item label="Hiệu lực đến" span={2}>
                {dayjs(selectedQuotation.valid_until).format('DD/MM/YYYY')}
              </Descriptions.Item>
              <Descriptions.Item label="Ghi chú" span={2}>
                {selectedQuotation.notes || <Text type="secondary">Không có</Text>}
              </Descriptions.Item>
              <Descriptions.Item label="Ngày tạo" span={2}>
                {dayjs(selectedQuotation.created_at).format('DD/MM/YYYY HH:mm')}
              </Descriptions.Item>
            </Descriptions>
          )}
        </Modal>
      </div>
    </Spin>
  );
};

export default QuotationPage;
