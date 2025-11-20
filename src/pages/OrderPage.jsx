import React, { useState, useEffect, useRef } from 'react';
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
  Row,
  Col,
  Typography,
  Steps,
  Timeline,
  message,
  Descriptions,
  Badge,
  Tooltip,
  Progress,
  Dropdown,
  DatePicker,
  InputNumber,
  Spin,
  Upload
} from 'antd';
import {
  ShoppingCartOutlined,
  EyeOutlined,
  EditOutlined,
  CarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  TruckOutlined,
  FileProtectOutlined,
  MoreOutlined,
  PlusOutlined,
  UploadOutlined,
  DollarOutlined,
  FilePdfOutlined,
  DownloadOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import html2pdf from 'html2pdf.js';
import { orderAPI, customerAPI, quotationAPI, contractAPI, paymentAPI, deliveryAPI, installmentAPI } from '../services/quotationService';
import vehicleService from '../services/vehicleService';
import { useAuth } from '../context/AuthContext';

const { Title, Text } = Typography;
const { Step } = Steps;

const OrderPage = () => {
  const { currentUser } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [modalMode, setModalMode] = useState('view');
  const [form] = Form.useForm();

  // Contract modal
  const [isContractModalOpen, setIsContractModalOpen] = useState(false);
  const [contractForm] = Form.useForm();
  const [contractPreview, setContractPreview] = useState('');
  const [contractPaymentMethod, setContractPaymentMethod] = useState('Trả thẳng');
  const contractPreviewRef = useRef(null);

  // Payment modal
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentForm] = Form.useForm();
  const [paymentMethod, setPaymentMethod] = useState(null);
  const [paymentStep, setPaymentStep] = useState(1); // 1: chọn phương thức, 2: chọn số năm/kỳ (nếu góp), 3: điền form
  const [installmentItems, setInstallmentItems] = useState([]);
  const [installmentYears, setInstallmentYears] = useState(null);
  const [installmentPeriodsPerYear, setInstallmentPeriodsPerYear] = useState(null);

  // Delivery modal
  const [isDeliveryModalOpen, setIsDeliveryModalOpen] = useState(false);
  const [deliveryForm] = Form.useForm();
  const [imageBeforeFile, setImageBeforeFile] = useState(null);
  const [imageBeforePreview, setImageBeforePreview] = useState(null);

  // Fetch orders from API
  useEffect(() => {
    const fetchOrders = async () => {
      console.log('OrderPage - currentUser:', currentUser);
      const agencyId = currentUser?.agency?.id || currentUser?.agencyId;
      if (!agencyId) {
        console.log('OrderPage - No agencyId found');
        return;
      }

      console.log('OrderPage - Fetching orders for agencyId:', agencyId);
      setLoading(true);
      try {
        const ordersData = await orderAPI.getByAgencyId(agencyId);
        console.log('OrderPage - Orders data received:', ordersData);

        // Transform API data to match component structure
        const transformedOrders = await Promise.all(
          ordersData.map(async (order) => {
            try {
              // Fetch customer details
              const customer = await customerAPI.getById(order.customerId);

              // Fetch quotation details if available
              let quotation = null;
              let quotationCode = 'N/A';
              let vehicleName = 'N/A';
              let vehicleDetails = null;
              let agencyInfo = null;

              if (order.details && order.details.length > 0) {
                const quotationId = order.details[0].quotationId;
                try {
                  const quotations = await quotationAPI.getByAgencyId(agencyId);
                  quotation = quotations.find(q => q.id === quotationId);
                  if (quotation) {
                    quotationCode = quotation.quotationName || `QT${quotation.id}`;

                    // Use vehicle info from quotation API response
                    if (quotation.vehicle) {
                      vehicleDetails = quotation.vehicle;
                      vehicleName = `${quotation.vehicle.variantName || 'Unknown'} - ${quotation.vehicle.color || 'N/A'}`;
                    }

                    // Get agency info
                    if (quotation.agency) {
                      agencyInfo = quotation.agency;
                    }
                  }
                } catch (error) {
                  console.error('Error fetching quotation:', error);
                }
              }

              return {
                id: order.id,
                order_code: `ORD${order.id.toString().padStart(4, '0')}`,
                quotation_code: quotationCode,
                quotation_id: quotation?.id,
                customer_name: customer.fullName || 'N/A',
                customer_phone: customer.phone || 'N/A',
                customer_email: customer.email || 'N/A',
                customer_address: customer.address || 'N/A',
                vehicle_name: vehicleName,
                vehicle_details: vehicleDetails,
                agency_info: order.agencyReply || agencyInfo,
                total_amount: order.totalAmount,
                delivery_status: order.status?.toLowerCase() || 'pending',
                created_at: order.orderDate,
                created_by: order.createBy,
                customerId: order.customerId,
                details: order.details
              };
            } catch (error) {
              console.error('Error transforming order:', error);
              return null;
            }
          })
        );

        setOrders(transformedOrders.filter(order => order !== null));
        console.log('OrderPage - Transformed orders:', transformedOrders.filter(order => order !== null));
      } catch (error) {
        console.error('Error fetching orders:', error);
        message.error('Không thể tải danh sách đơn hàng');
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [currentUser]);

  const formatPrice = (price) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(price);
  };

  // Get delivery status info
  const getDeliveryStatus = (status) => {
    const normalizedStatus = status?.toLowerCase() || 'pending';
    const statusMap = {
      pending: {
        color: 'warning',
        text: 'Chờ ký hợp đồng',
        icon: <ClockCircleOutlined />,
        step: 0
      },
      ordered: {
        color: 'warning',
        text: 'Chờ ký hợp đồng',
        icon: <FileProtectOutlined />,
        step: 0
      },
      processing: {
        color: 'processing',
        text: 'Đang chuẩn bị',
        icon: <CheckCircleOutlined />,
        step: 1
      },
      paying: {
        color: 'gold',
        text: 'Chờ thanh toán',
        icon: <ShoppingCartOutlined />,
        step: 2
      },
      partial: {
        color: 'orange',
        text: 'Thanh toán 1 phần',
        icon: <DollarOutlined />,
        step: 2
      },
      'partial-ready': {
        color: 'lime',
        text: <>Thanh toán 1 phần <br/> Sẵn sàng giao xe</>,
        icon: <CheckCircleOutlined />,
        step: 2
      },
      paid: {
        color: 'green',
        text: 'Đã thanh toán',
        icon: <CheckCircleOutlined />,
        step: 3
      },
      in_transit: {
        color: 'cyan',
        text: 'Đang vận chuyển',
        icon: <TruckOutlined />,
        step: 4
      },
      completed: {
        color: 'success',
        text: 'Đã hoàn thành',
        icon: <CheckCircleOutlined />,
        step: 5
      },
      'pending-payment': {
        color: 'lime',
        text: <>chờ thanh toán <br/> phần còn lại</>,
        icon: <CheckCircleOutlined />,
        step: 2
      },
      cancelled: {
        color: 'error',
        text: 'Đã hủy',
        icon: <ClockCircleOutlined />,
        step: -1
      }
    };
    return statusMap[normalizedStatus] || statusMap.pending;
  };

  // Handle view order
  const handleView = (record) => {
    setSelectedOrder(record);
    setModalMode('view');
    setIsModalOpen(true);
  };

  // Sign contract
  const handleSignContract = async (orderId) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;

    // Check if order has quotation details
    if (!order.details || order.details.length === 0) {
      message.error('Đơn hàng không có thông tin báo giá');
      return;
    }

    const quotationId = order.details[0].quotationId;

    // Fetch customer and quotation details for contract template
    try {
      const customer = await customerAPI.getById(order.customerId);
      const quotations = await quotationAPI.getByAgencyId(currentUser?.agency?.id || currentUser?.agencyId);
      const quotation = quotations.find(q => q.id === quotationId);

      const agency = quotation?.agency || order.agency_info || {};

      // Open modal with form - auto-fill available data
      setSelectedOrder(order);
      setContractPaymentMethod('Trả thẳng'); // Reset to default
      contractForm.setFieldsValue({
        orderId: order.id,
        orderCode: order.order_code,
        quotationId: quotationId,
        contractName: `Hợp đồng ${order.order_code}`,
        contractNumber: `HĐMBX-2025/${Date.now().toString().slice(-6)}`,
        contractDate: dayjs(),
        contractLocation: agency.address || '',
        
        // Payment method
        contractPaymentMethod: 'Trả thẳng',
        
        // Auto-filled fields
        totalAmount: order.total_amount,
        depositPercent: 30,
        deliveryDays: 30,
        deliveryLocation: agency.address || '',
        deliveryCondition: 'Mới / Đã kiểm tra đầy đủ / Không trầy xước',
        warrantyMonths: 36,
        warrantyKm: 100000,
        vehicleCondition: 'Mới 100%',
        
        // Optional fields (empty by default)
        registrationFee: '',
        licensePlateFee: '',
        insuranceFee: '',
        paymentMethod: 'Chuyển khoản',
        penaltyPercent: 5,
        
        // Installment fields (default values)
        installmentYears: null,
        installmentPeriodsPerYear: null
      });
      
      // Store customer and quotation data for preview
      setSelectedOrder({ ...order, customer, quotation });
      setIsContractModalOpen(true);
    } catch (error) {
      console.error('Error preparing contract:', error);
      message.error('Không thể tải thông tin hợp đồng');
    }
  };

  // Generate contract terms markdown template from form values
  const generateContractTerms = (formValues, order, customer, quotation) => {
    const agency = quotation?.agency || order.agency_info || {};
    const vehicle = quotation?.vehicle || order.vehicle_details || {};
    
    // Generate payment schedule text based on method
    let paymentScheduleText = '';
    if (formValues.contractPaymentMethod === 'Trả góp' && formValues.installmentYears && formValues.installmentPeriodsPerYear) {
      const totalPeriods = formValues.installmentYears * formValues.installmentPeriodsPerYear;
      const monthsPerPeriod = 12 / formValues.installmentPeriodsPerYear;
      paymentScheduleText = `   - Đợt 1: Ký hợp đồng – Thanh toán **${formValues.depositPercent}%** (đặt cọc)
   - Các kỳ tiếp theo: Trả góp trong **${formValues.installmentYears} năm**, **${formValues.installmentPeriodsPerYear} kỳ/năm** (${totalPeriods} kỳ)
   - Mỗi kỳ cách nhau **${monthsPerPeriod} tháng**
   - Số tiền mỗi kỳ: **${formatPrice((formValues.totalAmount * (100 - formValues.depositPercent) / 100) / totalPeriods)}** (ước tính)`;
    } else {
      paymentScheduleText = `   - Đợt 1: Ký hợp đồng – Thanh toán **${formValues.depositPercent}%**  
   - Đợt 2: Khi giao xe – Thanh toán **${100 - formValues.depositPercent}% còn lại**`;
    }
    
    return`
<div style="text-align: center; margin-bottom: 24px;">
  <strong>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</strong><br/>
  <strong>Độc lập - Tự do - Hạnh phúc</strong><br/>
  <span style="font-size: 24px;">━━━━━━ ✺ ━━━━━━</span>
</div>

<div style="text-align: center; margin-bottom: 24px;">
  <strong>HỢP ĐỒNG MUA BÁN XE Ô TÔ</strong>
</div>

**Số hợp đồng:** ${formValues.contractNumber}  
**Ngày ký:** ${formValues.contractDate.format('DD/MM/YYYY')}  
**Địa điểm:** ${formValues.contractLocation || agency.address || '………………………………'}

---

## I. THÔNG TIN CÁC BÊN

### Bên bán (Bên A)
- **Tên doanh nghiệp:** ${agency.agencyName || 'Đại lý'}  
- **Địa chỉ:** ${agency.address || '………………………………'}  
- **Điện thoại:** ${agency.phone || '………………………………'}  
- **Email:** ${agency.email || '………………………………'}  

---

### Bên mua (Bên B)
- **Họ và tên:** ${customer.fullName || '………………………………'}  
- **Email:** ${customer.email || '………………………………'}  
- **Số điện thoại:** ${customer.phoneNumber || customer.phone || '………………………………'}  
- **Địa chỉ:** ${customer.address || '………………………………'}  

---

## II. THÔNG TIN XE MUA BÁN

<table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
  <thead>
    <tr>
      <th style="border: 1px solid #000; padding: 8px; background: #f0f0f0; text-align: left;">STT</th>
      <th style="border: 1px solid #000; padding: 8px; background: #f0f0f0; text-align: left;">Hạng mục</th>
      <th style="border: 1px solid #000; padding: 8px; background: #f0f0f0; text-align: left;">Thông tin chi tiết</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td style="border: 1px solid #000; padding: 8px;">1</td>
      <td style="border: 1px solid #000; padding: 8px;"><strong>Tên mẫu xe</strong></td>
      <td style="border: 1px solid #000; padding: 8px;">${vehicle.modelName || 'N/A'}</td>
    </tr>
    <tr>
      <td style="border: 1px solid #000; padding: 8px;">2</td>
      <td style="border: 1px solid #000; padding: 8px;"><strong>Phiên bản / Biến thể</strong></td>
      <td style="border: 1px solid #000; padding: 8px;">${vehicle.variantName || 'N/A'}</td>
    </tr>
    <tr>
      <td style="border: 1px solid #000; padding: 8px;">3</td>
      <td style="border: 1px solid #000; padding: 8px;"><strong>Màu sắc</strong></td>
      <td style="border: 1px solid #000; padding: 8px;">${vehicle.color || 'N/A'}</td>
    </tr>
    <tr>
      <td style="border: 1px solid #000; padding: 8px;">4</td>
      <td style="border: 1px solid #000; padding: 8px;"><strong>Dung lượng pin</strong></td>
      <td style="border: 1px solid #000; padding: 8px;">${vehicle.batteryCapacity || 'N/A'}</td>
    </tr>
    <tr>
      <td style="border: 1px solid #000; padding: 8px;">5</td>
      <td style="border: 1px solid #000; padding: 8px;"><strong>Quãng đường di chuyển (KM)</strong></td>
      <td style="border: 1px solid #000; padding: 8px;">${vehicle.rangeKM || 'N/A'} km</td>
    </tr>
    <tr>
      <td style="border: 1px solid #000; padding: 8px;">6</td>
      <td style="border: 1px solid #000; padding: 8px;"><strong>Tình trạng xe</strong></td>
      <td style="border: 1px solid #000; padding: 8px;">${formValues.vehicleCondition || 'Mới 100%'}</td>
    </tr>
  </tbody>
</table>

---

## III. GIÁ TRỊ HỢP ĐỒNG VÀ THANH TOÁN

1. **Giá bán xe (đã bao gồm VAT):**  
    **${formatPrice(formValues.totalAmount)}** 

2. **Phương thức thanh toán:**  
   - ${formValues.contractPaymentMethod || formValues.paymentMethod || 'Chuyển khoản / Tiền mặt'}  

3. **Tiến độ thanh toán:**
${paymentScheduleText}

---

## IV. GIAO NHẬN XE

1. **Thời gian giao xe:** Trong vòng **${formValues.deliveryDays} ngày** kể từ ngày ký hợp đồng  
2. **Địa điểm giao xe:** ${formValues.deliveryLocation || agency.address || 'Tại showroom của Bên A'}  
3. **Trạng thái xe khi bàn giao:** ${formValues.deliveryCondition || 'Mới / Đã kiểm tra đầy đủ / Không trầy xước'}  
4. **Biên bản bàn giao xe** sẽ được ký kết riêng, là một phần không tách rời của hợp đồng này

---

## V. BẢO HÀNH, BẢO DƯỠNG

1. Xe được bảo hành theo **chính sách của hãng sản xuất**  
2. Thời hạn bảo hành: **${formValues.warrantyMonths} tháng** hoặc **${new Intl.NumberFormat('vi-VN').format(formValues.warrantyKm)} km** (tùy điều kiện nào đến trước)  
3. Bên A có trách nhiệm hướng dẫn Bên B thực hiện quy trình bảo hành, bảo dưỡng định kỳ

---

## VI. QUYỀN VÀ NGHĨA VỤ CÁC BÊN

### 1. Bên A (Bên bán)
- Cung cấp xe đúng loại, đúng chất lượng, đúng thời gian  
- Hỗ trợ thủ tục đăng ký, sang tên xe (nếu có thỏa thuận)  
- Cung cấp đầy đủ chứng từ hợp pháp: Hóa đơn, phiếu kiểm tra chất lượng, giấy chứng nhận xuất xưởng

### 2. Bên B (Bên mua)
- Thanh toán đúng hạn, đúng số tiền theo quy định  
- Tiếp nhận xe đúng thời gian, kiểm tra kỹ trước khi ký biên bản bàn giao  
- Tự chịu trách nhiệm chi phí sử dụng, bảo hiểm, bảo dưỡng sau khi nhận xe

---

## VII. CHÍNH SÁCH HỦY HỢP ĐỒNG VÀ PHẠT VI PHẠM

- Nếu Bên B **từ chối mua xe** sau khi đã ký hợp đồng, Bên A được giữ lại tiền đặt cọc  
- Nếu Bên A **không giao xe đúng hạn**, phải bồi thường **${formValues.penaltyPercent || 5}% giá trị hợp đồng**  
- Hai bên có thể thương lượng bằng văn bản khi có thay đổi hoặc phát sinh sự kiện bất khả kháng

---

## VIII. ĐIỀU KHOẢN CHUNG

- Hợp đồng có hiệu lực kể từ ngày ký  
- Mọi sửa đổi, bổsung phải được lập thành **phụ lục hợp đồng**  
- Hợp đồng được lập thành **02 bản**, mỗi bên giữ **01 bản**, có giá trị pháp lý như nhau

---

## IX. CHỮ KÝ CÁC BÊN

<div style="display: flex; justify-content: space-between; margin-top: 40px;">
  <div style="text-align: center; width: 45%;">
    <strong>Đại diện Bên A</strong><br/>
    <em>(Ký, ghi rõ họ tên, đóng dấu)</em>
  </div>
  <div style="text-align: center; width: 45%;">
    <strong>Đại diện Bên B</strong><br/>
    <em>(Ký, ghi rõ họ tên)</em>
  </div>
</div>
`;
  };

  // Submit contract form
  const handleContractSubmit = async () => {
    try {
      const values = await contractForm.validateFields();

      // Generate contract markdown from form values
      const contractTerms = generateContractTerms(
        values,
        selectedOrder,
        selectedOrder.customer,
        selectedOrder.quotation
      );

      const contractPayload = {
        quotationId: values.quotationId,
        contractName: values.contractName,
        contractNumber: values.contractNumber,
        contractDate: values.contractDate.format('YYYY-MM-DDTHH:mm:ss.SSS[Z]'),
        terms: contractTerms
      };

      console.log('Creating contract:', contractPayload);
      await contractAPI.create(contractPayload);

      // Update order status to 'Processing' after contract is signed
      await orderAPI.update(selectedOrder.id, 'Processing');

      // Update local state
      setOrders(orders.map(o =>
        o.id === selectedOrder.id
          ? { ...o, delivery_status: 'processing', updated_at: new Date().toISOString() }
          : o
      ));

      message.success('Đã ký hợp đồng và cập nhật trạng thái đơn hàng thành công');
      setIsContractModalOpen(false);
      contractForm.resetFields();
    } catch (error) {
      console.error('Error creating contract:', error);
      if (error.errorFields) {
        // Validation error
        return;
      }
      message.error('Không thể tạo hợp đồng. Vui lòng thử lại!');
    }
  };

  // Preview contract when form values change
  const handleContractFormChange = () => {
    try {
      const values = contractForm.getFieldsValue();
      if (selectedOrder && values.contractDate) {
        const preview = generateContractTerms(
          values,
          selectedOrder,
          selectedOrder.customer,
          selectedOrder.quotation
        );
        setContractPreview(preview);
      }
    } catch (error) {
      // Ignore errors during preview
    }
  };

  // Export contract to PDF
  const handleExportPDF = () => {
    if (!contractPreviewRef.current) {
      message.error('Không có nội dung để xuất PDF');
      return;
    }

    const element = contractPreviewRef.current;
    const opt = {
      margin: 10,
      filename: `HopDong_${contractForm.getFieldValue('contractNumber')}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    html2pdf().set(opt).from(element).save();
    message.success('Đang xuất file PDF...');
  };

  // Handle payment
  const handlePayment = (orderId) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;

    // Reset và mở modal
    setSelectedOrder(order);
    setPaymentMethod(null);
    setPaymentStep(1);
    setInstallmentItems([]);
    setInstallmentYears(null);
    setInstallmentPeriodsPerYear(null);
    paymentForm.resetFields();
    paymentForm.setFieldsValue({
      orderId: order.id,
      orderCode: order.order_code,
      amount: order.total_amount,
    });
    setIsPaymentModalOpen(true);
  };

  // Chọn phương thức thanh toán
  const handleSelectPaymentMethod = (method) => {
    setPaymentMethod(method);
    
    if (method === 'Trả thẳng') {
      // Trả thẳng: Chuyển thẳng sang step 3 (form)
      setPaymentStep(3);
      paymentForm.setFieldsValue({
        paymentDate: dayjs(),
        prepay: 0,
        status: 'Pending'
      });
    } else if (method === 'Trả góp') {
      // Trả góp: Chuyển sang step 2 (chọn số năm/kỳ)
      setPaymentStep(2);
    }
  };

  // Xác nhận số năm và số kỳ, sinh ra các kỳ thanh toán
  const handleGenerateInstallments = () => {
    if (!installmentYears || !installmentPeriodsPerYear) {
      message.error('Vui lòng chọn số năm và số kỳ thanh toán');
      return;
    }

    const totalAmount = paymentForm.getFieldValue('amount');
    const totalPeriods = installmentYears * installmentPeriodsPerYear;
    const amountPerPeriod = Math.round(totalAmount / totalPeriods);
    const monthsPerPeriod = 12 / installmentPeriodsPerYear; // Khoảng cách giữa các kỳ (tháng)

    const items = Array.from({ length: totalPeriods }, (_, i) => ({
      key: i + 1,
      installmentNo: i + 1,
      dueDate: dayjs().add((i + 1) * monthsPerPeriod, 'month'),
      amountDue: i === totalPeriods - 1 
        ? totalAmount - (amountPerPeriod * (totalPeriods - 1)) // Kỳ cuối điều chỉnh để đủ tổng
        : amountPerPeriod,
      status: 'Pending'
    }));

    setInstallmentItems(items);
    setPaymentStep(3); // Chuyển sang form chi tiết
  };

  // Thêm kỳ trả góp
  const handleAddInstallment = () => {
    const newKey = installmentItems.length > 0 ? Math.max(...installmentItems.map(i => i.key)) + 1 : 1;
    const newItem = {
      key: newKey,
      installmentNo: installmentItems.length + 1,
      dueDate: dayjs().add(installmentItems.length + 1, 'month'),
      amountDue: 0,
      status: 'Pending'
    };
    setInstallmentItems([...installmentItems, newItem]);
  };

  // Xóa kỳ trả góp
  const handleRemoveInstallment = (key) => {
    const filtered = installmentItems.filter(item => item.key !== key);
    // Cập nhật lại installmentNo
    const updated = filtered.map((item, index) => ({
      ...item,
      installmentNo: index + 1
    }));
    setInstallmentItems(updated);
  };

  // Cập nhật kỳ trả góp
  const handleUpdateInstallment = (key, field, value) => {
    setInstallmentItems(installmentItems.map(item =>
      item.key === key ? { ...item, [field]: value } : item
    ));
  };

  // Submit payment form
  const handlePaymentSubmit = async () => {
    try {
      const values = await paymentForm.validateFields();

      if (paymentMethod === 'Trả thẳng') {
        // Trả thẳng: Gọi API Payment/CreatePayment
        const paymentPayload = {
          OrderId: values.orderId,
          PaymentDate: values.paymentDate.format('YYYY-MM-DDTHH:mm:ss.SSS[Z]'),
          PRepay: values.prepay || 0,
          Amount: values.amount,
          PaymentMethod: 'Trả thẳng',
          Status: values.status
        };

        console.log('Creating payment (Trả thẳng):', paymentPayload);
        // await paymentAPI.create(paymentPayload);

      } else if (paymentMethod === 'Trả góp') {
        // Validate installment items
        if (installmentItems.length === 0) {
          message.error('Vui lòng thêm ít nhất 1 kỳ trả góp');
          return;
        }

        // Tính tổng số tiền các kỳ
        const totalInstallmentAmount = installmentItems.reduce((sum, item) => sum + (item.amountDue || 0), 0);
        const totalAmount = values.amount;

        // Trả góp: Tạo InstallmentPlan và InstallmentItems
        // 1. Tạo InstallmentPlan
        const installmentPlanPayload = {
          contractId: 0,
          agencyContractId: 0,
          principalAmount: totalAmount,
          totalAmount: totalInstallmentAmount,
          interestRate: 0,
          interestMethod: 'Fixed',
          ruleJson: '',
          note: `Trả góp ${installmentItems.length} kỳ cho đơn hàng ${selectedOrder.order_code}`
        };

        console.log('Creating installment plan:', installmentPlanPayload);
        // const installmentPlan = await installmentAPI.createPlan(installmentPlanPayload);

        // 2. Tạo các InstallmentItems từ custom items
        for (const item of installmentItems) {
          const itemPayload = {
            // InstallmentPlanId: installmentPlan.id,
            InstallmentNo: item.installmentNo,
            DueDate: item.dueDate.format('YYYY-MM-DDTHH:mm:ss.SSS[Z]'),
            Percentage: (item.amountDue / totalInstallmentAmount) * 100,
            AmountDue: item.amountDue,
            PrincipalComponent: item.amountDue,
            InterestComponent: 0,
            FeeComponent: 0,
            Status: item.status || 'Pending',
            Notes: `Kỳ ${item.installmentNo}/${installmentItems.length}`
          };

          console.log(`Creating installment item ${item.installmentNo}:`, itemPayload);
          // await installmentAPI.createItem(itemPayload);
        }

        console.log(`Created ${installmentItems.length} installment items`);
      }

      // Update order status to 'Paying' after payment is created
      // await orderAPI.update(values.orderId, 'Paying');

      // Update local state
      setOrders(orders.map(o =>
        o.id === selectedOrder.id
          ? { ...o, delivery_status: 'paying', updated_at: new Date().toISOString() }
          : o
      ));

      message.success('Đã tạo phiếu thanh toán và cập nhật trạng thái đơn hàng thành công');
      setIsPaymentModalOpen(false);
      paymentForm.resetFields();
    } catch (error) {
      console.error('Error creating payment:', error);
      if (error.errorFields) {
        // Validation error
        return;
      }
      message.error('Không thể tạo phiếu thanh toán. Vui lòng thử lại!');
    }
  };

  // Handle delivery
  const handleDelivery = (orderId) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;

    setSelectedOrder(order);
    deliveryForm.setFieldsValue({
      orderId: order.id,
      orderCode: order.order_code,
      deliveryDate: dayjs(),
      deliveryStatus: 'Pending',
      notes: ''
    });
    setImageBeforeFile(null);
    setImageBeforePreview(null);
    setIsDeliveryModalOpen(true);
  };

  // Handle image before upload
  const handleImageBeforeChange = (info) => {
    if (info.file.status === 'removed') {
      setImageBeforeFile(null);
      setImageBeforePreview(null);
      return;
    }

    const file = info.file.originFileObj || info.file;
    setImageBeforeFile(file);

    // Preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setImageBeforePreview(e.target.result);
    };
    reader.readAsDataURL(file);
  };

  // Submit delivery form
  const handleDeliverySubmit = async () => {
    try {
      const values = await deliveryForm.validateFields();

      if (!imageBeforeFile) {
        message.error('Vui lòng tải lên hình ảnh trước giao xe');
        return;
      }

      const deliveryPayload = {
        orderId: values.orderId,
        deliveryDate: values.deliveryDate.format('YYYY-MM-DDTHH:mm:ss.SSS[Z]'),
        deliveryStatus: values.deliveryStatus,
        notes: values.notes || '',
        imgUrlBefore: imageBeforeFile
      };

      console.log('Creating delivery:', deliveryPayload);
      await deliveryAPI.create(deliveryPayload);

      // Update order status to 'In Transit'
      await orderAPI.update(values.orderId, 'in_transit');

      // Update local state
      setOrders(orders.map(o =>
        o.id === selectedOrder.id
          ? { ...o, delivery_status: 'in_transit', updated_at: new Date().toISOString() }
          : o
      ));

      message.success('Đã tạo phiếu giao xe thành công');
      setIsDeliveryModalOpen(false);
      deliveryForm.resetFields();
      setImageBeforeFile(null);
      setImageBeforePreview(null);
    } catch (error) {
      console.error('Error creating delivery:', error);
      if (error.errorFields) {
        // Validation error
        return;
      }
      message.error('Không thể tạo phiếu giao xe. Vui lòng thử lại!');
    }
  };

  const columns = [
    {
      title: 'Mã đơn',
      dataIndex: 'order_code',
      key: 'order_code',
      fixed: 'left',
      width: 120,
      render: (_, record) => (
        <div>
          <Text strong>{record.id}</Text>

        </div>
      )
    },
    {
      title: 'Mã báo giá',
      dataIndex: 'quotation_code',
      key: 'quotation_code',
      width: 120,
      render: (text) => <Text type="secondary">{text}</Text>
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
      width: 250,
      render: (_, record) => (
        <div>
          <Text strong>{record.vehicle_name}</Text>
          {record.vehicle_details && (
            <>
              <br />
              <Text type="secondary" style={{ fontSize: '12px' }}>
                {record.vehicle_details.modelName}
              </Text>
              <br />
              <Tag color="blue" style={{ fontSize: '11px', marginTop: '4px' }}>
                {record.vehicle_details.batteryCapacity} • {record.vehicle_details.rangeKM}km
              </Tag>
            </>
          )}
        </div>
      )
    },
    {
      title: 'Tổng tiền',
      dataIndex: 'total_amount',
      key: 'total_amount',
      width: 150,
      render: (amount) => (
        <Text strong style={{ color: '#f5222d' }}>
          {formatPrice(amount)}
        </Text>
      )
    },
    {
      title: 'Trạng thái ',
      dataIndex: 'delivery_status',
      key: 'delivery_status',
      width: 150,
      render: (status) => {
        const info = getDeliveryStatus(status);
        return (
          <Tag icon={info.icon} color={info.color}>
            {info.text}
          </Tag>
        );
      }
    },
    {
      title: 'Ngày tạo',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 120,
      render: (date) => dayjs(date).format('DD/MM/YYYY')
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

        const status = record.delivery_status?.toLowerCase();

        // Pending: Chỉ hiện Ký hợp đồng
        if (status === 'pending' || status === 'ordered') {
          items.push({
            key: 'sign',
            icon: <FileProtectOutlined />,
            label: 'Tạo hợp đồng',
            onClick: () => handleSignContract(record.id)
          });
        }
        // Paid or Partial-Ready: Cho phép giao xe
        else if (status === 'paid' || status === 'partial-ready') {
          items.push({
            key: 'delivery',
            icon: <TruckOutlined />,
            label: 'Tạo giao xe',
            onClick: () => handleDelivery(record.id)
          });
        }

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
    <Spin spinning={loading} tip="Đang tải danh sách đơn hàng...">
      <div className="order-page">
        <div className="page-header" style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <Title level={2}>
              <ShoppingCartOutlined /> Quản lý đơn hàng
            </Title>
            <Text type="secondary">Theo dõi và quản lý đơn hàng của khách hàng</Text>
          </div>
        </div>

        {/* Statistics */}
        <Row gutter={16} style={{ marginBottom: '24px' }}>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <div style={{ textAlign: 'center' }}>
                <ClockCircleOutlined style={{ fontSize: '24px', color: '#faad14' }} />
                <Title level={4} style={{ margin: '8px 0' }}>
                  {orders.filter(o => ['pending', 'ordered'].includes(o.delivery_status)).length}
                </Title>
                <Text type="secondary">Đang chờ xử lý</Text>
              </div>
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <div style={{ textAlign: 'center' }}>
                <CarOutlined style={{ fontSize: '24px', color: '#1890ff' }} />
                <Title level={4} style={{ margin: '8px 0' }}>
                  {orders.filter(o => o.delivery_status === 'in_production').length}
                </Title>
                <Text type="secondary">Đang sản xuất</Text>
              </div>
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <div style={{ textAlign: 'center' }}>
                <TruckOutlined style={{ fontSize: '24px', color: '#13c2c2' }} />
                <Title level={4} style={{ margin: '8px 0' }}>
                  {orders.filter(o => o.delivery_status === 'in_transit').length}
                </Title>
                <Text type="secondary">Đang giao xe</Text>
              </div>
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <div style={{ textAlign: 'center' }}>
                <CheckCircleOutlined style={{ fontSize: '24px', color: '#52c41a' }} />
                <Title level={4} style={{ margin: '8px 0' }}>
                  {orders.filter(o => o.delivery_status === 'delivered').length}
                </Title>
                <Text type="secondary">Đã giao xe</Text>
              </div>
            </Card>
          </Col>
        </Row>

        {/* Orders Table */}
        <Card>
          <Table
            columns={columns}
            dataSource={orders}
            rowKey="id"
            scroll={{ x: 1400 }}
            pagination={{
              pageSize: 10,
              showTotal: (total) => `Tổng ${total} đơn hàng`
            }}
          />
        </Card>

        {/* View Order Modal */}
        <Modal
          title={`Chi tiết đơn hàng ${selectedOrder?.order_code}`}
          open={isModalOpen}
          onCancel={() => {
            setIsModalOpen(false);
          }}
          footer={[
            <Button key="close" onClick={() => setIsModalOpen(false)}>
              Đóng
            </Button>
          ]}
          width={900}
        >
          {selectedOrder && (
            <>
              {/* Order Info */}
              <Descriptions bordered column={2} style={{ marginBottom: '24px' }}>
                <Descriptions.Item label="Mã đơn hàng" span={2}>
                  <Text strong>{selectedOrder.order_code}</Text>
                </Descriptions.Item>
                <Descriptions.Item label="Mã báo giá">
                  {selectedOrder.quotation_code}
                </Descriptions.Item>
                <Descriptions.Item label="Ngày tạo">
                  {dayjs(selectedOrder.created_at).format('DD/MM/YYYY HH:mm')}
                </Descriptions.Item>

                {/* Customer Info */}
                <Descriptions.Item label="Khách hàng" span={2}>
                  <Text strong>{selectedOrder.customer_name}</Text>
                </Descriptions.Item>
                <Descriptions.Item label="Số điện thoại">
                  {selectedOrder.customer_phone}
                </Descriptions.Item>
                <Descriptions.Item label="Email">
                  {selectedOrder.customer_email}
                </Descriptions.Item>
                <Descriptions.Item label="Địa chỉ" span={2}>
                  {selectedOrder.customer_address}
                </Descriptions.Item>

                {/* Vehicle Info */}
                <Descriptions.Item label="Xe" span={2}>
                  <Text strong>{selectedOrder.vehicle_name}</Text>
                </Descriptions.Item>
                {selectedOrder.vehicle_details && (
                  <>
                    <Descriptions.Item label="Model">
                      {selectedOrder.vehicle_details.modelName}
                    </Descriptions.Item>
                    <Descriptions.Item label="VIN">
                      {selectedOrder.vehicle_details.vin}
                    </Descriptions.Item>
                    <Descriptions.Item label="Dung lượng pin">
                      {selectedOrder.vehicle_details.batteryCapacity}
                    </Descriptions.Item>
                    <Descriptions.Item label="Phạm vi">
                      {selectedOrder.vehicle_details.rangeKM} km
                    </Descriptions.Item>
                    <Descriptions.Item label="Mô tả" span={2}>
                      {selectedOrder.vehicle_details.description}
                    </Descriptions.Item>
                  </>
                )}

                {/* Order Details */}
                <Descriptions.Item label="Tổng giá trị" span={2}>
                  <Text strong style={{ fontSize: '16px', color: '#f5222d' }}>
                    {formatPrice(selectedOrder.total_amount)}
                  </Text>
                </Descriptions.Item>
                <Descriptions.Item label="Trạng thái" span={2}>
                  <Tag icon={getDeliveryStatus(selectedOrder.delivery_status).icon}
                    color={getDeliveryStatus(selectedOrder.delivery_status).color}>
                    {getDeliveryStatus(selectedOrder.delivery_status).text}
                  </Tag>
                </Descriptions.Item>

                {/* Agency Info */}
                {selectedOrder.agency_info && (
                  <>
                    <Descriptions.Item label="Đại lý" span={2}>
                      <Text strong>{selectedOrder.agency_info.agencyName}</Text>
                    </Descriptions.Item>
                    <Descriptions.Item label="Địa chỉ đại lý" span={2}>
                      {selectedOrder.agency_info.address}
                    </Descriptions.Item>
                    <Descriptions.Item label="Hotline">
                      {selectedOrder.agency_info.phone}
                    </Descriptions.Item>
                    <Descriptions.Item label="Email đại lý">
                      {selectedOrder.agency_info.email}
                    </Descriptions.Item>
                  </>
                )}
              </Descriptions>
            </>
          )}
        </Modal>

        {/* Contract Modal */}
        <Modal
          title="Tạo hợp đồng bán hàng"
          open={isContractModalOpen}
          onCancel={() => {
            setIsContractModalOpen(false);
            contractForm.resetFields();
            setContractPreview('');
          }}
          onOk={handleContractSubmit}
          okText="Tạo hợp đồng"
          cancelText="Hủy"
          width={1200}
        >
          <Row gutter={24}>
            {/* Left: Form */}
            <Col span={12}>
              <Form
                form={contractForm}
                layout="vertical"
                onValuesChange={handleContractFormChange}
              >
                <Form.Item name="orderId" hidden>
                  <Input />
                </Form.Item>
                <Form.Item name="quotationId" hidden>
                  <Input />
                </Form.Item>

                <Title level={5}>Thông tin hợp đồng</Title>
                
                <Form.Item label="Mã đơn hàng">
                  <Form.Item name="orderCode" noStyle>
                    <Input disabled />
                  </Form.Item>
                </Form.Item>

                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item
                      name="contractName"
                      label="Tên hợp đồng"
                      rules={[{ required: true, message: 'Vui lòng nhập tên hợp đồng' }]}
                    >
                      <Input placeholder="Nhập tên hợp đồng" />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item
                      name="contractNumber"
                      label="Số hợp đồng"
                      rules={[{ required: true, message: 'Vui lòng nhập số hợp đồng' }]}
                    >
                      <Input placeholder="Nhập số hợp đồng" />
                    </Form.Item>
                  </Col>
                </Row>

                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item
                      name="contractDate"
                      label="Ngày ký hợp đồng"
                      rules={[{ required: true, message: 'Vui lòng chọn ngày ký' }]}
                    >
                      <DatePicker
                        style={{ width: '100%' }}
                        format="DD/MM/YYYY"
                        placeholder="Chọn ngày ký hợp đồng"
                      />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item
                      name="contractLocation"
                      label="Địa điểm ký"
                    >
                      <Input placeholder="Địa điểm ký hợp đồng" />
                    </Form.Item>
                  </Col>
                </Row>

                <Form.Item
                  name="vehicleCondition"
                  label="Tình trạng xe"
                >
                  <Input placeholder="Mới 100%" />
                </Form.Item>

                <Title level={5} style={{ marginTop: '16px' }}>Thanh toán</Title>

                <Form.Item
                  name="totalAmount"
                  label="Tổng giá trị"
                  rules={[{ required: true }]}
                >
                  <InputNumber
                    style={{ width: '100%' }}
                    formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                    parser={value => value.replace(/\$\s?|(,*)/g, '')}
                    addonAfter="VND"
                    disabled
                  />
                </Form.Item>

                <Row gutter={16}>
                  <Col span={8}>
                    <Form.Item
                      name="depositPercent"
                      label="% Đặt cọc"
                      rules={[{ required: true }]}
                    >
                      <InputNumber
                        style={{ width: '100%' }}
                        min={0}
                        max={100}
                        addonAfter="%"
                      />
                    </Form.Item>
                  </Col>
                  <Col span={16}>
                    <Form.Item
                      name="paymentMethod"
                      label="Phương thức thanh toán"
                    >
                      <Select>
                        <Select.Option value="Chuyển khoản">Chuyển khoản</Select.Option>
                        <Select.Option value="Tiền mặt">Tiền mặt</Select.Option>
                        <Select.Option value="Chuyển khoản / Tiền mặt">Chuyển khoản / Tiền mặt</Select.Option>
                      </Select>
                    </Form.Item>
                  </Col>
                </Row>

                <Form.Item
                  name="contractPaymentMethod"
                  label="Hình thức thanh toán"
                  rules={[{ required: true }]}
                >
                  <Select 
                    onChange={(value) => setContractPaymentMethod(value)}
                    style={{ width: '100%' }}
                  >
                    <Select.Option value="Trả thẳng">Trả thẳng (Thanh toán đủ)</Select.Option>
                    <Select.Option value="Trả góp">Trả góp (Chia kỳ thanh toán)</Select.Option>
                  </Select>
                </Form.Item>

                {/* Installment fields - only show when "Trả góp" is selected */}
                {contractPaymentMethod === 'Trả góp' && (
                  <Card size="small" style={{ marginBottom: '16px', background: '#f0f5ff' }}>
                    <Title level={5} style={{ marginTop: 0 }}>Thông tin trả góp</Title>
                    <Row gutter={16}>
                      <Col span={12}>
                        <Form.Item
                          name="installmentYears"
                          label="Số năm trả góp"
                          rules={[{ required: contractPaymentMethod === 'Trả góp', message: 'Vui lòng chọn số năm' }]}
                        >
                          <Select placeholder="Chọn số năm">
                            <Select.Option value={1}>1 năm</Select.Option>
                            <Select.Option value={2}>2 năm</Select.Option>
                            <Select.Option value={3}>3 năm</Select.Option>
                            <Select.Option value={4}>4 năm</Select.Option>
                            <Select.Option value={5}>5 năm</Select.Option>
                          </Select>
                        </Form.Item>
                      </Col>
                      <Col span={12}>
                        <Form.Item
                          name="installmentPeriodsPerYear"
                          label="Số kỳ mỗi năm"
                          rules={[{ required: contractPaymentMethod === 'Trả góp', message: 'Vui lòng chọn số kỳ' }]}
                        >
                          <Select placeholder="Chọn số kỳ/năm">
                            <Select.Option value={1}>1 kỳ/năm (12 tháng/kỳ)</Select.Option>
                            <Select.Option value={2}>2 kỳ/năm (6 tháng/kỳ)</Select.Option>
                            <Select.Option value={3}>3 kỳ/năm (4 tháng/kỳ)</Select.Option>
                            <Select.Option value={4}>4 kỳ/năm (3 tháng/kỳ)</Select.Option>
                            <Select.Option value={6}>6 kỳ/năm (2 tháng/kỳ)</Select.Option>
                            <Select.Option value={12}>12 kỳ/năm (1 tháng/kỳ)</Select.Option>
                          </Select>
                        </Form.Item>
                      </Col>
                    </Row>
                    
                    {contractForm.getFieldValue('installmentYears') && contractForm.getFieldValue('installmentPeriodsPerYear') && (
                      <div style={{ 
                        padding: '12px', 
                        background: 'white', 
                        borderRadius: '4px',
                        border: '1px solid #d9d9d9'
                      }}>
                        <Row gutter={16}>
                          <Col span={12}>
                            <Text type="secondary" style={{ fontSize: '12px' }}>Tổng số kỳ:</Text>
                            <div>
                              <Text strong style={{ fontSize: '16px', color: '#1890ff' }}>
                                {contractForm.getFieldValue('installmentYears') * contractForm.getFieldValue('installmentPeriodsPerYear')} kỳ
                              </Text>
                            </div>
                          </Col>
                          <Col span={12}>
                            <Text type="secondary" style={{ fontSize: '12px' }}>Khoảng cách giữa các kỳ:</Text>
                            <div>
                              <Text strong style={{ fontSize: '16px' }}>
                                {12 / contractForm.getFieldValue('installmentPeriodsPerYear')} tháng
                              </Text>
                            </div>
                          </Col>
                        </Row>
                      </div>
                    )}
                  </Card>
                )}

                <Title level={5} style={{ marginTop: '16px' }}>Giao xe & Bảo hành</Title>

                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item
                      name="deliveryDays"
                      label="Số ngày giao xe"
                      rules={[{ required: true }]}
                    >
                      <InputNumber
                        style={{ width: '100%' }}
                        min={1}
                        addonAfter="ngày"
                      />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item
                      name="penaltyPercent"
                      label="% Phạt chậm giao"
                    >
                      <InputNumber
                        style={{ width: '100%' }}
                        min={0}
                        max={100}
                        addonAfter="%"
                      />
                    </Form.Item>
                  </Col>
                </Row>

                <Form.Item
                  name="deliveryLocation"
                  label="Địa điểm giao xe"
                >
                  <Input placeholder="Địa điểm giao xe" />
                </Form.Item>

                <Form.Item
                  name="deliveryCondition"
                  label="Điều kiện bàn giao"
                >
                  <Input placeholder="Mới / Đã kiểm tra / Không trầy xước" />
                </Form.Item>

                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item
                      name="warrantyMonths"
                      label="Bảo hành (tháng)"
                      rules={[{ required: true }]}
                    >
                      <InputNumber
                        style={{ width: '100%' }}
                        min={1}
                        addonAfter="tháng"
                      />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item
                      name="warrantyKm"
                      label="Bảo hành (km)"
                      rules={[{ required: true }]}
                    >
                      <InputNumber
                        style={{ width: '100%' }}
                        min={1}
                        formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                        parser={value => value.replace(/\$\s?|(,*)/g, '')}
                        addonAfter="km"
                      />
                    </Form.Item>
                  </Col>
                </Row>
              </Form>
            </Col>

            {/* Right: Preview */}
            <Col span={12}>
              <div style={{ 
                border: '1px solid #d9d9d9', 
                borderRadius: '4px', 
                padding: '16px',
                height: '600px',
                overflowY: 'auto',
                background: '#fafafa'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <Title level={5} style={{ margin: 0 }}>
                    Xem trước hợp đồng
                  </Title>
                  <Button 
                    type="primary" 
                    icon={<FilePdfOutlined />}
                    onClick={handleExportPDF}
                    disabled={!contractPreview}
                  >
                    Xuất PDF
                  </Button>
                </div>
                <div 
                  ref={contractPreviewRef}
                  style={{ 
                    background: 'white', 
                    padding: '24px',
                    borderRadius: '4px',
                    fontSize: '14px',
                    lineHeight: '1.8'
                  }}
                >
                  {contractPreview ? (
                    <ReactMarkdown
                      rehypePlugins={[rehypeRaw]}
                      components={{
                        h1: ({node, ...props}) => <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '16px', textAlign: 'center' }} {...props} />,
                        h2: ({node, ...props}) => <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginTop: '24px', marginBottom: '12px', borderBottom: '2px solid #1890ff', paddingBottom: '8px' }} {...props} />,
                        h3: ({node, ...props}) => <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginTop: '16px', marginBottom: '8px' }} {...props} />,
                        p: ({node, ...props}) => <p style={{ marginBottom: '8px' }} {...props} />,
                        ul: ({node, ...props}) => <ul style={{ marginLeft: '20px', marginBottom: '12px' }} {...props} />,
                        ol: ({node, ...props}) => <ol style={{ marginLeft: '20px', marginBottom: '12px' }} {...props} />,
                        li: ({node, ...props}) => <li style={{ marginBottom: '4px' }} {...props} />,
                        strong: ({node, ...props}) => <strong style={{ fontWeight: 'bold', color: '#000' }} {...props} />,
                        em: ({node, ...props}) => <em style={{ fontStyle: 'italic', color: '#666' }} {...props} />,
                        hr: ({node, ...props}) => <hr style={{ margin: '16px 0', border: 'none', borderTop: '1px solid #d9d9d9' }} {...props} />
                      }}
                    >
                      {contractPreview}
                    </ReactMarkdown>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
                      Điền thông tin để xem trước hợp đồng...
                    </div>
                  )}
                </div>
              </div>
            </Col>
          </Row>
        </Modal>

        {/* Payment Modal */}
        <Modal
          title="Tạo phiếu thanh toán"
          open={isPaymentModalOpen}
          onCancel={() => {
            setIsPaymentModalOpen(false);
            setPaymentStep(1);
            setPaymentMethod(null);
            setInstallmentItems([]);
            setInstallmentYears(null);
            setInstallmentPeriodsPerYear(null);
            paymentForm.resetFields();
          }}
          footer={
            paymentStep === 1 || paymentStep === 2 ? null : [
              <Button key="back" onClick={() => {
                if (paymentMethod === 'Trả góp') {
                  setPaymentStep(2);
                  setInstallmentItems([]);
                } else {
                  setPaymentStep(1);
                  setPaymentMethod(null);
                }
              }}>
                Quay lại
              </Button>,
              <Button key="submit" type="primary" onClick={handlePaymentSubmit}>
                Tạo thanh toán
              </Button>
            ]
          }
          width={900}
        >
          {/* Bước 1: Chọn phương thức */}
          {paymentStep === 1 && (
            <div style={{ padding: '40px 0', textAlign: 'center' }}>
              <Title level={4} style={{ marginBottom: '32px' }}>
                Chọn phương thức thanh toán
              </Title>
              <Row gutter={24} justify="center">
                <Col span={10}>
                  <Card
                    hoverable
                    onClick={() => handleSelectPaymentMethod('Trả thẳng')}
                    style={{
                      height: '200px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                      alignItems: 'center',
                      cursor: 'pointer',
                      border: '2px solid #d9d9d9'
                    }}
                  >
                    <CheckCircleOutlined style={{ fontSize: '48px', color: '#52c41a', marginBottom: '16px' }} />
                    <Title level={3}>Trả thẳng</Title>
                    <Text type="secondary">Thanh toán một lần</Text>
                  </Card>
                </Col>
                <Col span={10}>
                  <Card
                    hoverable
                    onClick={() => handleSelectPaymentMethod('Trả góp')}
                    style={{
                      height: '200px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                      alignItems: 'center',
                      cursor: 'pointer',
                      border: '2px solid #d9d9d9'
                    }}
                  >
                    <ClockCircleOutlined style={{ fontSize: '48px', color: '#1890ff', marginBottom: '16px' }} />
                    <Title level={3}>Trả góp</Title>
                    <Text type="secondary">Chia nhiều kỳ thanh toán</Text>
                  </Card>
                </Col>
              </Row>
            </div>
          )}

          {/* Bước 2: Chọn số năm và số kỳ (chỉ cho Trả góp) */}
          {paymentStep === 2 && paymentMethod === 'Trả góp' && (
            <div style={{ padding: '40px 20px' }}>
              <Title level={4} style={{ marginBottom: '32px', textAlign: 'center' }}>
                Chọn thời gian trả góp
              </Title>
              
              <Row gutter={24}>
                <Col span={12}>
                  <Card 
                    style={{ 
                      padding: '16px',
                      border: installmentYears ? '2px solid #1890ff' : '1px solid #d9d9d9'
                    }}
                  >
                    <Title level={5}>Số năm trả góp</Title>
                    <Select
                      size="large"
                      style={{ width: '100%', marginTop: '16px' }}
                      placeholder="Chọn số năm"
                      value={installmentYears}
                      onChange={(value) => setInstallmentYears(value)}
                    >
                      <Select.Option value={1}>1 năm</Select.Option>
                      <Select.Option value={2}>2 năm</Select.Option>
                      <Select.Option value={3}>3 năm</Select.Option>
                      <Select.Option value={4}>4 năm</Select.Option>
                      <Select.Option value={5}>5 năm</Select.Option>
                    </Select>
                  </Card>
                </Col>
                
                <Col span={12}>
                  <Card 
                    style={{ 
                      padding: '16px',
                      border: installmentPeriodsPerYear ? '2px solid #1890ff' : '1px solid #d9d9d9'
                    }}
                  >
                    <Title level={5}>Số kỳ mỗi năm</Title>
                    <Select
                      size="large"
                      style={{ width: '100%', marginTop: '16px' }}
                      placeholder="Chọn số kỳ"
                      value={installmentPeriodsPerYear}
                      onChange={(value) => setInstallmentPeriodsPerYear(value)}
                    >
                      <Select.Option value={1}>1 kỳ/năm (12 tháng/kỳ)</Select.Option>
                      <Select.Option value={2}>2 kỳ/năm (6 tháng/kỳ)</Select.Option>
                      <Select.Option value={3}>3 kỳ/năm (4 tháng/kỳ)</Select.Option>
                      <Select.Option value={4}>4 kỳ/năm (3 tháng/kỳ)</Select.Option>
                      <Select.Option value={6}>6 kỳ/năm (2 tháng/kỳ)</Select.Option>
                      <Select.Option value={12}>12 kỳ/năm (1 tháng/kỳ)</Select.Option>
                    </Select>
                  </Card>
                </Col>
              </Row>

              {installmentYears && installmentPeriodsPerYear && (
                <Card 
                  style={{ 
                    marginTop: '24px', 
                    background: '#f0f5ff', 
                    border: '1px solid #adc6ff' 
                  }}
                >
                  <Row gutter={16} align="middle">
                    <Col span={18}>
                      <div>
                        <Text strong style={{ fontSize: '16px' }}>
                          Tổng số kỳ thanh toán: {installmentYears * installmentPeriodsPerYear} kỳ
                        </Text>
                        <br />
                        <Text type="secondary">
                          Khoảng cách giữa các kỳ: {12 / installmentPeriodsPerYear} tháng
                        </Text>
                      </div>
                    </Col>
                    <Col span={6} style={{ textAlign: 'right' }}>
                      <Button 
                        type="primary" 
                        size="large"
                        onClick={handleGenerateInstallments}
                      >
                        Tiếp tục
                      </Button>
                    </Col>
                  </Row>
                </Card>
              )}
            </div>
          )}

          {/* Bước 3: Form chi tiết */}
          {paymentStep === 3 && (
            <Form form={paymentForm} layout="vertical">
              <Form.Item name="orderId" hidden>
                <Input />
              </Form.Item>

              <Form.Item label="Mã đơn hàng">
                <Form.Item name="orderCode" noStyle>
                  <Input disabled />
                </Form.Item>
              </Form.Item>

              <Form.Item
                name="amount"
                label="Tổng giá trị đơn hàng"
              >
                <InputNumber
                  style={{ width: '100%' }}
                  disabled
                  formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={value => value.replace(/\$\s?|(,*)/g, '')}
                  addonAfter="VND"
                />
              </Form.Item>

              {/* Form Trả thẳng */}
              {paymentMethod === 'Trả thẳng' && (
                <>
                  <Row gutter={16}>
                    <Col span={12}>
                      <Form.Item
                        name="paymentDate"
                        label="Ngày thanh toán"
                        rules={[{ required: true, message: 'Vui lòng chọn ngày' }]}
                      >
                        <DatePicker
                          style={{ width: '100%' }}
                          format="DD/MM/YYYY HH:mm"
                          showTime
                          placeholder="Chọn ngày thanh toán"
                        />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item
                        name="prepay"
                        label="Tiền trả trước"
                        rules={[{ required: true, message: 'Vui lòng nhập tiền trả trước' }]}
                      >
                        <InputNumber
                          style={{ width: '100%' }}
                          placeholder="Nhập tiền trả trước"
                          formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                          parser={value => value.replace(/\$\s?|(,*)/g, '')}
                          min={0}
                          addonAfter="VND"
                        />
                      </Form.Item>
                    </Col>
                  </Row>

                  <Form.Item
                    name="status"
                    label="Trạng thái"
                    rules={[{ required: true, message: 'Vui lòng chọn trạng thái' }]}
                  >
                    <Select placeholder="Chọn trạng thái">
                      <Select.Option value="Pending">Đang chờ</Select.Option>
                      <Select.Option value="Completed">Hoàn thành</Select.Option>
                      <Select.Option value="Failed">Thất bại</Select.Option>
                    </Select>
                  </Form.Item>
                </>
              )}

              {/* Form Trả góp */}
              {paymentMethod === 'Trả góp' && (
                <>
                  <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Title level={5}>Danh sách các kỳ thanh toán</Title>
                    <Button type="primary" icon={<PlusOutlined />} onClick={handleAddInstallment}>
                      Thêm kỳ
                    </Button>
                  </div>

                  {installmentItems.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px', background: '#fafafa', borderRadius: '8px' }}>
                      <Text type="secondary">Chưa có kỳ thanh toán nào. Nhấn "Thêm kỳ" để bắt đầu.</Text>
                    </div>
                  ) : (
                    <div style={{ maxHeight: '400px', overflowY: 'auto', marginBottom: '16px' }}>
                      {installmentItems.map((item, index) => (
                        <Card
                          key={item.key}
                          size="small"
                          style={{ marginBottom: '12px' }}
                          extra={
                            <Button
                              type="text"
                              danger
                              size="small"
                              onClick={() => handleRemoveInstallment(item.key)}
                            >
                              Xóa
                            </Button>
                          }
                        >
                          <Row gutter={16}>
                            <Col span={6}>
                              <div style={{ marginBottom: '8px' }}>
                                <Text type="secondary" style={{ fontSize: '12px' }}>Kỳ số</Text>
                                <div>
                                  <Text strong>{item.installmentNo}</Text>
                                </div>
                              </div>
                            </Col>
                            <Col span={9}>
                              <div style={{ marginBottom: '8px' }}>
                                <Text type="secondary" style={{ fontSize: '12px' }}>Ngày đáo hạn</Text>
                                <div>
                                  <DatePicker
                                    size="small"
                                    style={{ width: '100%' }}
                                    value={item.dueDate}
                                    format="DD/MM/YYYY"
                                    onChange={(date) => handleUpdateInstallment(item.key, 'dueDate', date)}
                                  />
                                </div>
                              </div>
                            </Col>
                            <Col span={9}>
                              <div style={{ marginBottom: '8px' }}>
                                <Text type="secondary" style={{ fontSize: '12px' }}>Số tiền</Text>
                                <div>
                                  <InputNumber
                                    size="small"
                                    style={{ width: '100%' }}
                                    value={item.amountDue}
                                    formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                                    parser={value => value.replace(/\$\s?|(,*)/g, '')}
                                    min={0}
                                    onChange={(value) => handleUpdateInstallment(item.key, 'amountDue', value)}
                                  />
                                </div>
                              </div>
                            </Col>
                          </Row>
                        </Card>
                      ))}
                    </div>
                  )}

                  {/* Tổng kết */}
                  {installmentItems.length > 0 && (
                    <Card style={{ background: '#f0f5ff', border: '1px solid #adc6ff' }}>
                      <Row gutter={16}>
                        <Col span={8}>
                          <Text type="secondary">Tổng số kỳ:</Text>
                          <div>
                            <Text strong style={{ fontSize: '16px' }}>{installmentItems.length} kỳ</Text>
                          </div>
                        </Col>
                        <Col span={8}>
                          <Text type="secondary">Tổng số tiền:</Text>
                          <div>
                            <Text strong style={{ fontSize: '16px', color: '#1890ff' }}>
                              {new Intl.NumberFormat('vi-VN').format(
                                installmentItems.reduce((sum, item) => sum + (item.amountDue || 0), 0)
                              )} VND
                            </Text>
                          </div>
                        </Col>
                        <Col span={8}>
                          <Text type="secondary">Giá trị đơn hàng:</Text>
                          <div>
                            <Text strong style={{ fontSize: '16px' }}>
                              {new Intl.NumberFormat('vi-VN').format(paymentForm.getFieldValue('amount') || 0)} VND
                            </Text>
                          </div>
                        </Col>
                      </Row>
                    </Card>
                  )}
                </>
              )}
            </Form>
          )}
        </Modal>

        {/* Delivery Modal */}
        <Modal
          title="Tạo phiếu giao xe"
          open={isDeliveryModalOpen}
          onCancel={() => {
            setIsDeliveryModalOpen(false);
            deliveryForm.resetFields();
            setImageBeforeFile(null);
            setImageBeforePreview(null);
          }}
          onOk={handleDeliverySubmit}
          okText="Tạo phiếu giao xe"
          cancelText="Hủy"
          width={700}
        >
          <Form
            form={deliveryForm}
            layout="vertical"
          >
            <Form.Item name="orderId" hidden>
              <Input />
            </Form.Item>

            <Form.Item label="Mã đơn hàng">
              <Form.Item name="orderCode" noStyle>
                <Input disabled />
              </Form.Item>
            </Form.Item>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="deliveryDate"
                  label="Ngày giao xe"
                  rules={[{ required: true, message: 'Vui lòng chọn ngày' }]}
                >
                  <DatePicker
                    style={{ width: '100%' }}
                    format="DD/MM/YYYY HH:mm"
                    showTime
                    placeholder="Chọn ngày giao xe"
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="deliveryStatus"
                  label="Trạng thái"
                  rules={[{ required: true, message: 'Vui lòng chọn trạng thái' }]}
                >
                  <Select placeholder="Chọn trạng thái">
                    <Select.Option value="Pending">Đang chờ</Select.Option>
                    <Select.Option value="In Progress">Đang giao</Select.Option>
                    <Select.Option value="Delivered">Đã giao</Select.Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            <Form.Item
              label="Hình ảnh trước giao xe"
              rules={[{ required: true, message: 'Vui lòng tải lên hình ảnh' }]}
            >
              <Upload
                listType="picture-card"
                maxCount={1}
                beforeUpload={() => false}
                onChange={handleImageBeforeChange}
                accept="image/*"
              >
                {!imageBeforeFile && (
                  <div>
                    <UploadOutlined />
                    <div style={{ marginTop: 8 }}>Tải lên</div>
                  </div>
                )}
              </Upload>
              {imageBeforePreview && (
                <img
                  src={imageBeforePreview}
                  alt="Preview"
                  style={{ width: '100%', marginTop: '8px', maxHeight: '200px', objectFit: 'contain' }}
                />
              )}
            </Form.Item>

            <Form.Item
              name="notes"
              label="Ghi chú"
            >
              <Input.TextArea
                rows={3}
                placeholder="Nhập ghi chú về giao xe..."
              />
            </Form.Item>
          </Form>
        </Modal>
      </div>
    </Spin>
  );
};

export default OrderPage;
