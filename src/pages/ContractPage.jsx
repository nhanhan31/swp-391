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
  message,
  Descriptions,
  Divider,
  Upload,
  Steps,
  Timeline,
  Alert,
  Dropdown,
  DatePicker,
  InputNumber,
  Spin
} from 'antd';
import {
  FileProtectOutlined,
  PlusOutlined,
  EyeOutlined,
  DownloadOutlined,
  UploadOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  EditOutlined,
  PrinterOutlined,
  FilePdfOutlined,
  CloseCircleOutlined,
  MoreOutlined,
  FileImageOutlined,
  MailOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import html2pdf from 'html2pdf.js';
import html2canvas from 'html2canvas';
import { useAuth } from '../context/AuthContext';
import { contractAPI, quotationAPI, customerAPI, paymentAPI, installmentAPI, orderAPI } from '../services/quotationService';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;
const { Step } = Steps;

const ContractPage = () => {
  const { currentUser, isDealerManager, isDealerStaff, getAgencyId } = useAuth();
  
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('view');
  const [selectedContract, setSelectedContract] = useState(null);
  const [form] = Form.useForm();

  // Contract preview ref
  const contractPreviewRef = useRef(null);

  // Payment modal
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentForm] = Form.useForm();
  const [paymentMethod, setPaymentMethod] = useState(null);
  const [paymentStep, setPaymentStep] = useState(1); // 1: chọn phương thức, 2: chọn số năm/kỳ (nếu góp), 3: điền form
  const [installmentItems, setInstallmentItems] = useState([]);
  const [installmentYears, setInstallmentYears] = useState(null);
  const [installmentPeriodsPerYear, setInstallmentPeriodsPerYear] = useState(null);
  const [depositAmount, setDepositAmount] = useState(0);

  // Fetch contracts from API
  useEffect(() => {
    const fetchContracts = async () => {
      setLoading(true);
      try {
        const agencyId = getAgencyId();
        if (!agencyId) return;

        // Fetch contracts by agencyId
        const contractsData = await contractAPI.getByAgencyId(agencyId);

        // Fetch quotation and customer info for each contract
        const contractsWithDetails = await Promise.all(
          contractsData.map(async (contract) => {
            let quotation = null;
            let customer = null;

            // Fetch quotation details
            if (contract.quotationId) {
              try {
                if (isDealerManager()) {
                  // Manager: Lấy quotation theo ID
                  quotation = await quotationAPI.getById(contract.quotationId);
                } else {
                  // Staff: Lấy quotation theo createBy (userId)
                  const quotationData = await quotationAPI.getByUserId(currentUser?.id);
                  quotation = quotationData.find(q => q.id === contract.quotationId);
                }
              } catch (error) {
                console.error(`Error fetching quotation ${contract.quotationId}:`, error);
              }
            }

            // Fetch customer details from quotation
            if (quotation?.customerId) {
              try {
                customer = await customerAPI.getById(quotation.customerId);
              } catch (error) {
                console.error(`Error fetching customer ${quotation.customerId}:`, error);
              }
            }

            return {
              ...contract,
              quotation,
              customer
            };
          })
        );

        // Transform API data to match component structure
        const transformedContracts = contractsWithDetails.map(c => ({
          id: c.id,
          contract_code: c.contractNumber,
          quotation_id: c.quotationId,
          quotation_code: c.quotation ? `QT${c.quotation.id.toString().padStart(6, '0')}` : 'N/A',
          customer_name: c.customer?.fullName || 'N/A',
          customer_phone: c.customer?.phone || 'N/A',
          customer_email: c.customer?.email || 'N/A',
          customer_address: c.customer?.address || 'N/A',
          vehicle_name: c.quotation?.vehicle?.variantName || 'N/A',
          vehicle_model: c.quotation?.vehicle?.modelName || 'N/A',
          total_amount: c.quotation?.quotedPrice || 0,
          contract_date: c.contractDate,
          contract_name: c.contractName,
          terms: c.terms,
          status: c.status?.toLowerCase() || 'pending',
          created_at: c.contractDate
        }));

        setContracts(transformedContracts);
      } catch (error) {
        console.error('Error fetching contracts:', error);
        message.error('Không thể tải dữ liệu hợp đồng');
      } finally {
        setLoading(false);
      }
    };

    fetchContracts();
  }, [currentUser, getAgencyId]);

  const formatPrice = (price) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(price);
  };

  // Get status info
  const getStatusInfo = (status) => {
    const statusMap = {
      draft: { color: 'default', text: 'Bản nháp', icon: <EditOutlined /> },
      pending: { color: 'warning', text: 'Chờ ký', icon: <ClockCircleOutlined /> },
      signed: { color: 'success', text: 'Đã ký', icon: <CheckCircleOutlined /> },
      paying: { color: 'gold', text: 'Chờ thanh toán', icon: <ClockCircleOutlined /> },
      completed: { color: 'cyan', text: 'Hoàn thành', icon: <CheckCircleOutlined /> },
      cancelled: { color: 'error', text: 'Đã hủy', icon: <CloseCircleOutlined /> }
    };
    return statusMap[status] || statusMap.draft;
  };

  // Handle view
  const handleView = (record) => {
    setSelectedContract(record);
    setModalMode('view');
    setIsModalOpen(true);
  };

  // Handle sign contract
  const handleSign = async (id) => {
    Modal.confirm({
      title: 'Xác nhận ký hợp đồng',
      content: 'Bạn xác nhận đã ký hợp đồng với khách hàng?',
      okText: 'Xác nhận',
      cancelText: 'Hủy',
      onOk: async () => {
        try {
          const contract = contracts.find(c => c.id === id);
          if (!contract) {
            message.error('Không tìm thấy hợp đồng');
            return;
          }

          // Call API to update contract status
          await contractAPI.update(id, {
            ContractName: contract.contract_name,
            ContractDate: contract.contract_date,
            Terms: contract.terms,
            Status: 'Signed'
          });

          // Update local state
          setContracts(contracts.map(c => 
            c.id === id 
              ? { 
                  ...c, 
                  status: 'signed',
                  signed_date: new Date().toISOString()
                }
              : c
          ));
          
          message.success('Đã ký hợp đồng thành công');
        } catch (error) {
          console.error('Error signing contract:', error);
          message.error('Không thể ký hợp đồng. Vui lòng thử lại!');
        }
      }
    });
  };

  // Handle payment
  const handlePayment = async (contractId) => {
    const contract = contracts.find(c => c.id === contractId);
    if (!contract) return;

    // Lấy orderId từ quotationId
    let orderId = 0;
    if (contract.quotation_id) {
      try {
        const agencyId = getAgencyId();
        const ordersData = await orderAPI.getByAgencyId(agencyId);
        
        // Tìm order có quotationId tương ứng
        const matchedOrder = ordersData.find(order => 
          order.details && order.details.some(detail => detail.quotationId === contract.quotation_id)
        );
        
        if (matchedOrder) {
          orderId = matchedOrder.id;
          console.log('Found orderId:', orderId, 'for quotationId:', contract.quotation_id);
        } else {
          console.warn('No order found for quotationId:', contract.quotation_id);
        }
      } catch (error) {
        console.error('Error fetching orderId:', error);
      }
    }

    // Reset và mở modal
    setSelectedContract(contract);
    setPaymentMethod(null);
    setPaymentStep(1);
    setInstallmentItems([]);
    setInstallmentYears(null);
    setInstallmentPeriodsPerYear(null);
    setDepositAmount(0);
    paymentForm.resetFields();
    paymentForm.setFieldsValue({
      contractId: contract.id,
      contractCode: contract.contract_code,
      amount: contract.total_amount,
      orderId: orderId, // Thêm orderId vào form
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
    const remainingAmount = totalAmount - depositAmount; // Trừ tiền cọc
    const totalPeriods = installmentYears * installmentPeriodsPerYear;
    const amountPerPeriod = Math.round(remainingAmount / totalPeriods);
    const monthsPerPeriod = 12 / installmentPeriodsPerYear; // Khoảng cách giữa các kỳ (tháng)

    const items = Array.from({ length: totalPeriods }, (_, i) => ({
      key: i + 1,
      installmentNo: i + 1,
      dueDate: dayjs().add((i + 1) * monthsPerPeriod, 'month'),
      amountDue: i === totalPeriods - 1 
        ? remainingAmount - (amountPerPeriod * (totalPeriods - 1)) // Kỳ cuối điều chỉnh để đủ tổng
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
          OrderId: values.orderId || 0, // Sử dụng orderId từ form
          PaymentDate: values.paymentDate.format('YYYY-MM-DDTHH:mm:ss.SSS[Z]'),
          PRepay: values.prepay || 0,
          Amount: values.amount,
          PaymentMethod: 'Trả thẳng',
          Status: values.status
        };

        console.log('Creating payment (Trả thẳng):', paymentPayload);
        await paymentAPI.create(paymentPayload);

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
          contractId: selectedContract.id,
          
          principalAmount: totalAmount,
          depositAmount: depositAmount,
          
          interestRate: 0,
          interestMethod: 'Fixed',
          ruleJson: '',
          note: `Trả góp ${installmentItems.length} kỳ trong ${installmentYears} năm cho hợp đồng ${selectedContract.contract_code}. Tiền cọc: ${depositAmount.toLocaleString('vi-VN')} VND`
        };

        console.log('Creating installment plan:', installmentPlanPayload);
        const installmentPlan = await installmentAPI.createPlan(installmentPlanPayload);

        // 2. Tạo các InstallmentItems từ custom items
        for (const item of installmentItems) {
          const itemPayload = {
            InstallmentPlanId: installmentPlan.id,
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
          await installmentAPI.createItem(itemPayload);
        }

        console.log(`Created ${installmentItems.length} installment items`);
      }

      // Update contract status to 'Paying' after payment is created
      await contractAPI.update(values.contractId, {
        ContractName: selectedContract.contract_name,
        ContractDate: selectedContract.contract_date,
        Terms: selectedContract.terms,
        Status: 'Completed'
      });

      // Update order status to 'Completed' as well
      if (values.orderId && values.orderId !== 0) {
        try {
          await orderAPI.update(values.orderId, 'Paying');
          console.log('Updated order status to Paying for orderId:', values.orderId);
        } catch (error) {
          console.error('Error updating order status:', error);
          // Continue even if order update fails
        }
      }

      // Update local state
      setContracts(contracts.map(c =>
        c.id === selectedContract.id
          ? { ...c, status: 'completed', updated_at: new Date().toISOString() }
          : c
      ));

      message.success('Đã tạo phiếu thanh toán và cập nhật trạng thái hợp đồng thành công');
      setIsPaymentModalOpen(false);
      paymentForm.resetFields();
      setPaymentStep(1);
      setPaymentMethod(null);
      setInstallmentItems([]);
      setInstallmentYears(null);
      setInstallmentPeriodsPerYear(null);
      setDepositAmount(0);
    } catch (error) {
      console.error('Error creating payment:', error);
      if (error.errorFields) {
        // Validation error
        return;
      }
      message.error('Không thể tạo phiếu thanh toán. Vui lòng thử lại!');
    }
  };

  // Handle complete contract
  const handleComplete = (id) => {
    Modal.confirm({
      title: 'Hoàn thành hợp đồng',
      content: 'Xác nhận hợp đồng đã hoàn thành (xe đã giao và thanh toán đầy đủ)?',
      okText: 'Hoàn thành',
      cancelText: 'Hủy',
      onOk: () => {
        setContracts(contracts.map(c => 
          c.id === id ? { ...c, status: 'completed' } : c
        ));
        message.success('Hợp đồng đã hoàn thành');
      }
    });
  };

  // Calculate remaining payment
  const getRemainingAmount = (contract) => {
    return contract.total_amount - contract.deposit_amount;
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
      filename: `HopDong_${selectedContract.contract_code}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    html2pdf().set(opt).from(element).save();
    message.success('Đang xuất file PDF...');
  };

  // Export contract to PNG
  const handleExportPNG = async () => {
    if (!contractPreviewRef.current) {
      message.error('Không có nội dung để xuất PNG');
      return;
    }

    try {
      message.loading('Đang tạo file PNG...', 0);

      // Clone element để không ảnh hưởng UI
      const originalElement = contractPreviewRef.current;
      const clonedElement = originalElement.cloneNode(true);
      
      // Style cho element clone
      clonedElement.style.position = 'absolute';
      clonedElement.style.left = '-9999px';
      clonedElement.style.top = '0';
      clonedElement.style.maxHeight = 'none';
      clonedElement.style.overflow = 'visible';
      clonedElement.style.width = originalElement.offsetWidth + 'px';
      
      // Thêm vào DOM
      document.body.appendChild(clonedElement);

      // Chờ một chút để đảm bảo render xong
      await new Promise(resolve => setTimeout(resolve, 100));

      const canvas = await html2canvas(clonedElement, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: clonedElement.scrollWidth,
        windowHeight: clonedElement.scrollHeight
      });

      // Xóa element clone
      document.body.removeChild(clonedElement);
      message.destroy();

      // Convert canvas to blob và download
      canvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `HopDong_${selectedContract.contract_code}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        message.success('Đã xuất file PNG thành công');
      }, 'image/png');
    } catch (error) {
      message.destroy();
      console.error('Error exporting PNG:', error);
      message.error('Không thể xuất file PNG');
    }
  };

  // Send contract via email
  const handleSendEmail = async () => {
    if (!contractPreviewRef.current || !selectedContract) {
      message.error('Không có hợp đồng để gửi');
      return;
    }

    try {
      message.loading('Đang tạo và gửi email...', 0);

      // Clone element để không ảnh hưởng UI
      const originalElement = contractPreviewRef.current;
      const clonedElement = originalElement.cloneNode(true);
      
      // Style cho element clone
      clonedElement.style.position = 'absolute';
      clonedElement.style.left = '-9999px';
      clonedElement.style.top = '0';
      clonedElement.style.maxHeight = 'none';
      clonedElement.style.overflow = 'visible';
      clonedElement.style.width = originalElement.offsetWidth + 'px';
      
      // Thêm vào DOM
      document.body.appendChild(clonedElement);

      // Chờ một chút để đảm bảo render xong
      await new Promise(resolve => setTimeout(resolve, 100));

      const canvas = await html2canvas(clonedElement, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: clonedElement.scrollWidth,
        windowHeight: clonedElement.scrollHeight
      });

      // Xóa element clone
      document.body.removeChild(clonedElement);

      // Convert canvas to blob
      const blob = await new Promise(resolve => {
        canvas.toBlob(resolve, 'image/png');
      });

      // Create FormData to send file (chỉ cần file, contractId và email đã ở URL)
      const formData = new FormData();
      formData.append('file', blob, `HopDong_${selectedContract.contract_code}.png`);

      // Call API to send email
      const response = await contractAPI.sendEmail(selectedContract.id, selectedContract.customer_email, formData);

      message.destroy();
      message.success('Đã gửi hợp đồng qua email thành công!');
    } catch (error) {
      message.destroy();
      console.error('Error sending email:', error);
      message.error('Không thể gửi email. Vui lòng thử lại!');
    }
  };

  // Handle create contract
  const handleCreate = () => {
    setSelectedContract(null);
    setModalMode('create');
    form.resetFields();
    setIsModalOpen(true);
  };

  // Handle form submit
  const handleSubmit = () => {
    form.validateFields().then((values) => {
      const vehicleInfo = vehicles.find(v => v.id === values.vehicle_id);
      const monthlyPayment = values.payment_method === 'installment'
        ? Math.round((values.total_amount - values.deposit_amount) / values.installment_months)
        : null;

      const newContract = {
        id: contracts.length + 1,
        contract_code: `HD2023${(contracts.length + 1).toString().padStart(3, '0')}`,
        order_code: values.order_code || `ORD2023${(contracts.length + 1).toString().padStart(3, '0')}`,
        customer_name: values.customer_name,
        customer_id_number: values.customer_id_number,
        customer_phone: values.customer_phone,
        customer_address: values.customer_address,
        vehicle_name: vehicleInfo ? `${vehicleInfo.variant_name} - ${vehicleInfo.color}` : 'Chưa chọn',
        vehicle_vin: 'VIN' + Math.random().toString().substring(2, 16),
        total_amount: values.total_amount,
        deposit_amount: values.deposit_amount,
        payment_method: values.payment_method,
        installment_months: values.installment_months || null,
        monthly_payment: monthlyPayment,
        contract_date: values.contract_date.format('YYYY-MM-DD'),
        delivery_date: values.delivery_date.format('YYYY-MM-DD'),
        status: 'draft',
        signed_date: null,
        contract_file: null,
        created_at: new Date().toISOString()
      };

      setContracts([...contracts, newContract]);
      setIsModalOpen(false);
      form.resetFields();
      message.success('Tạo hợp đồng thành công!');
    }).catch((error) => {
      console.error('Validation failed:', error);
    });
  };

  const columns = [
    {
      title: 'Mã HĐ',
      dataIndex: 'contract_code',
      key: 'contract_code',
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
      title: 'Báo giá',
      dataIndex: 'quotation_code',
      key: 'quotation_code',
      width: 120,
      render: (text) => <Text code>{text}</Text>
    },
    {
      title: 'Xe',
      key: 'vehicle',
      width: 180,
      render: (_, record) => (
        <div>
          <Text strong>{record.vehicle_name}</Text>
          <br />
          {record.vehicle_model && (
            <Text type="secondary" style={{ fontSize: '11px' }}>
              {record.vehicle_model}
            </Text>
          )}
        </div>
      )
    },
    {
      title: 'Giá trị HĐ',
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
      title: 'Thanh toán',
      key: 'payment',
      width: 150,
      render: (_, record) => (
        <Text strong style={{ color: '#f5222d' }}>
          {formatPrice(record.total_amount)}
        </Text>
      )
    },
    {
      title: 'Ngày tạo',
      dataIndex: 'contract_date',
      key: 'contract_date',
      width: 120,
      render: (date) => dayjs(date).format('DD/MM/YYYY')
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 130,
      fixed: 'right',
      render: (status) => {
        const info = getStatusInfo(status);
        return (
          <Tag icon={info.icon} color={info.color}>
            {info.text}
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
          items.push({
            key: 'sign',
            icon: <FileProtectOutlined />,
            label: 'Ký hợp đồng',
            onClick: () => handleSign(record.id)
          });
        }

        if (record.status === 'signed') {
          items.push({
            key: 'payment',
            icon: <CheckCircleOutlined />,
            label: 'Tạo thanh toán',
            onClick: () => handlePayment(record.id)
          });
        }

        if (record.status === 'paying') {
          if (record.contract_file) {
            items.push({
              key: 'download',
              icon: <DownloadOutlined />,
              label: 'Tải về',
              onClick: () => {}
            });
          }
          items.push({
            key: 'complete',
            icon: <CheckCircleOutlined />,
            label: 'Hoàn thành',
            onClick: () => handleComplete(record.id)
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

  // Calculate statistics
  const stats = {
    total: contracts.length,
    pending: contracts.filter(c => c.status === 'pending').length,
    draft: contracts.filter(c => c.status === 'draft').length,
    signed: contracts.filter(c => c.status === 'signed').length,
    paying: contracts.filter(c => c.status === 'paying').length,
    completed: contracts.filter(c => c.status === 'completed').length,
    totalValue: contracts.reduce((sum, c) => sum + c.total_amount, 0)
  };

  return (
    <Spin spinning={loading} tip="Đang tải dữ liệu hợp đồng...">
      <div className="contract-page">
      <div className="page-header" style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Title level={2}>
            <FileProtectOutlined /> Quản lý hợp đồng bán hàng
          </Title>
          <Text type="secondary">Quản lý và theo dõi hợp đồng với khách hàng</Text>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate} size="large">
          Tạo hợp đồng
        </Button>
      </div>

      {/* Statistics */}
      <Row gutter={16} style={{ marginBottom: '24px' }}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <div style={{ textAlign: 'center' }}>
              <EditOutlined style={{ fontSize: '32px', color: '#d9d9d9' }} />
              <Title level={2} style={{ margin: '8px 0' }}>
                {stats.draft}
              </Title>
              <Text type="secondary">Bản nháp</Text>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <div style={{ textAlign: 'center' }}>
              <FileProtectOutlined style={{ fontSize: '32px', color: '#52c41a' }} />
              <Title level={2} style={{ margin: '8px 0', color: '#52c41a' }}>
                {stats.signed}
              </Title>
              <Text type="secondary">Đã ký</Text>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <div style={{ textAlign: 'center' }}>
              <CheckCircleOutlined style={{ fontSize: '32px', color: '#1890ff' }} />
              <Title level={2} style={{ margin: '8px 0', color: '#1890ff' }}>
                {stats.completed}
              </Title>
              <Text type="secondary">Hoàn thành</Text>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <div style={{ textAlign: 'center' }}>
              <Text type="secondary">Tổng giá trị</Text>
              <Title level={3} style={{ margin: '8px 0', color: '#f5222d' }}>
                {formatPrice(stats.totalValue)}
              </Title>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Contracts Table */}
      <Card>
        <Table
          columns={columns}
          dataSource={contracts}
          rowKey="id"
          scroll={{ x: 1600 }}
          pagination={{
            pageSize: 10,
            showTotal: (total) => `Tổng ${total} hợp đồng`
          }}
        />
      </Card>

      {/* Create/Edit Modal */}
      <Modal
        title={
          modalMode === 'create' ? (
            <Space>
              <PlusOutlined />
              <span>Tạo hợp đồng bán hàng mới</span>
            </Space>
          ) : (
            <Space>
              <FileProtectOutlined />
              <span>{`Hợp đồng bán hàng - ${selectedContract?.contract_code}`}</span>
            </Space>
          )
        }
        open={isModalOpen}
        onCancel={() => {
          setIsModalOpen(false);
          form.resetFields();
        }}
        footer={
          modalMode === 'create'
            ? [
                <Button key="cancel" onClick={() => {
                  setIsModalOpen(false);
                  form.resetFields();
                }}>
                  Hủy
                </Button>,
                <Button key="submit" type="primary" onClick={handleSubmit}>
                  Tạo hợp đồng
                </Button>
              ]
            : [
                <Button
                  key="exportPDF"
                  icon={<FilePdfOutlined />}
                  onClick={handleExportPDF}
                  disabled={!selectedContract?.terms}
                >
                  Xuất PDF
                </Button>,
                <Button
                  key="exportPNG"
                  icon={<FileImageOutlined />}
                  onClick={handleExportPNG}
                  disabled={!selectedContract?.terms}
                >
                  Xuất PNG
                </Button>,
                <Button
                  key="sendEmail"
                  type="primary"
                  icon={<MailOutlined />}
                  onClick={handleSendEmail}
                  disabled={!selectedContract?.terms || !selectedContract?.customer_email}
                >
                  Gửi email cho khách
                </Button>,
                <Button key="close" onClick={() => setIsModalOpen(false)}>
                  Đóng
                </Button>
              ]
        }
        width={900}
      >
        {modalMode === 'create' ? (
          <Form
            form={form}
            layout="vertical"
            initialValues={{
              payment_method: 'full',
              installment_months: 36,
              contract_date: dayjs(),
              delivery_date: dayjs().add(30, 'day')
            }}
          >
            <Alert
              message="Thông tin hợp đồng"
              description="Vui lòng điền đầy đủ thông tin để tạo hợp đồng bán hàng"
              type="info"
              showIcon
              style={{ marginBottom: '24px' }}
            />

            <Divider orientation="left">Thông tin khách hàng</Divider>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="customer_name"
                  label="Họ tên khách hàng"
                  rules={[{ required: true, message: 'Vui lòng nhập họ tên' }]}
                >
                  <Input placeholder="Nhập họ tên" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="customer_id_number"
                  label="CMND/CCCD"
                  rules={[
                    { required: true, message: 'Vui lòng nhập CMND/CCCD' },
                    { pattern: /^[0-9]{9,12}$/, message: 'CMND/CCCD không hợp lệ' }
                  ]}
                >
                  <Input placeholder="Nhập số CMND/CCCD" />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="customer_phone"
                  label="Số điện thoại"
                  rules={[
                    { required: true, message: 'Vui lòng nhập số điện thoại' },
                    { pattern: /^[0-9]{10}$/, message: 'Số điện thoại không hợp lệ' }
                  ]}
                >
                  <Input placeholder="Nhập số điện thoại" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="order_code"
                  label="Mã đơn hàng (tùy chọn)"
                >
                  <Input placeholder="Nhập mã đơn hàng" />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={24}>
                <Form.Item
                  name="customer_address"
                  label="Địa chỉ"
                  rules={[{ required: true, message: 'Vui lòng nhập địa chỉ' }]}
                >
                  <TextArea rows={2} placeholder="Nhập địa chỉ đầy đủ" />
                </Form.Item>
              </Col>
            </Row>

            <Divider orientation="left">Thông tin xe</Divider>
            <Row gutter={16}>
              <Col span={24}>
                <Form.Item
                  name="vehicle_id"
                  label="Chọn xe"
                  rules={[{ required: true, message: 'Vui lòng chọn xe' }]}
                >
                  <Select
                    placeholder="Chọn xe"
                    showSearch
                    optionFilterProp="children"
                  >
                    {vehicles.map(vehicle => (
                      <Select.Option key={vehicle.id} value={vehicle.id}>
                        {vehicle.variant_name} - {vehicle.color} ({vehicle.battery_capacity})
                      </Select.Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            <Divider orientation="left">Thông tin tài chính</Divider>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="total_amount"
                  label="Tổng giá trị hợp đồng"
                  rules={[{ required: true, message: 'Vui lòng nhập tổng giá trị' }]}
                >
                  <InputNumber
                    style={{ width: '100%' }}
                    placeholder="Nhập tổng giá trị"
                    formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                    parser={value => value.replace(/\$\s?|(,*)/g, '')}
                    min={0}
                    addonAfter="VND"
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="deposit_amount"
                  label="Số tiền đặt cọc"
                  rules={[{ required: true, message: 'Vui lòng nhập số tiền đặt cọc' }]}
                >
                  <InputNumber
                    style={{ width: '100%' }}
                    placeholder="Nhập số tiền đặt cọc"
                    formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                    parser={value => value.replace(/\$\s?|(,*)/g, '')}
                    min={0}
                    addonAfter="VND"
                  />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="payment_method"
                  label="Phương thức thanh toán"
                  rules={[{ required: true, message: 'Vui lòng chọn phương thức' }]}
                >
                  <Select placeholder="Chọn phương thức thanh toán">
                    <Select.Option value="full">Trả thẳng</Select.Option>
                    <Select.Option value="installment">Trả góp</Select.Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  noStyle
                  shouldUpdate={(prevValues, currentValues) => 
                    prevValues.payment_method !== currentValues.payment_method
                  }
                >
                  {({ getFieldValue }) =>
                    getFieldValue('payment_method') === 'installment' ? (
                      <Form.Item
                        name="installment_months"
                        label="Thời hạn trả góp (tháng)"
                        rules={[{ required: true, message: 'Vui lòng nhập thời hạn' }]}
                      >
                        <InputNumber
                          style={{ width: '100%' }}
                          min={6}
                          max={72}
                          placeholder="Nhập số tháng"
                        />
                      </Form.Item>
                    ) : null
                  }
                </Form.Item>
              </Col>
            </Row>

            <Divider orientation="left">Thông tin hợp đồng</Divider>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="contract_date"
                  label="Ngày lập hợp đồng"
                  rules={[{ required: true, message: 'Vui lòng chọn ngày' }]}
                >
                  <DatePicker
                    style={{ width: '100%' }}
                    format="DD/MM/YYYY"
                    placeholder="Chọn ngày"
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="delivery_date"
                  label="Ngày giao xe dự kiến"
                  rules={[{ required: true, message: 'Vui lòng chọn ngày giao xe' }]}
                >
                  <DatePicker
                    style={{ width: '100%' }}
                    format="DD/MM/YYYY"
                    placeholder="Chọn ngày giao xe"
                  />
                </Form.Item>
              </Col>
            </Row>
          </Form>
        ) : selectedContract && (
          <>
            {/* Contract Status */}
            <Alert
              message={getStatusInfo(selectedContract.status).text}
              description={
                selectedContract.status === 'signed' 
                  ? `Đã ký ngày ${dayjs(selectedContract.signed_date).format('DD/MM/YYYY HH:mm')}`
                  : selectedContract.status === 'draft'
                  ? 'Hợp đồng đang ở trạng thái nháp, chưa được ký'
                  : null
              }
              type={
                selectedContract.status === 'signed' ? 'success' :
                selectedContract.status === 'draft' ? 'warning' :
                selectedContract.status === 'completed' ? 'info' : 'error'
              }
              showIcon
              icon={getStatusInfo(selectedContract.status).icon}
              style={{ marginBottom: '24px' }}
            />

            <Divider />

            {/* Contract Terms Preview */}
            {selectedContract?.terms && (
              <Card 
                title="Nội dung hợp đồng" 
                style={{ marginTop: '24px' }}
                extra={
                  <Space>
                    <Button 
                      icon={<FilePdfOutlined />} 
                      onClick={handleExportPDF}
                    >
                      Xuất PDF
                    </Button>
                    <Button 
                      icon={<FileImageOutlined />} 
                      onClick={handleExportPNG}
                    >
                      Xuất PNG
                    </Button>
                    <Button 
                      type="primary"
                      icon={<MailOutlined />} 
                      onClick={handleSendEmail}
                    >
                      Gửi email cho khách
                    </Button>
                  </Space>
                }
              >
                <div 
                  ref={contractPreviewRef}
                  style={{ 
                    background: 'white', 
                    padding: '24px',
                    borderRadius: '4px',
                    fontSize: '14px',
                    lineHeight: '1.8',
                    maxHeight: '600px',
                    overflowY: 'auto'
                  }}
                >
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
                    {selectedContract.terms}
                  </ReactMarkdown>
                </div>
              </Card>
            )}

           
          </>
        )}
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
          setDepositAmount(0);
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
              Cấu hình trả góp
            </Title>
            
            {/* Tiền cọc */}
            <Card style={{ marginBottom: '24px', background: '#fffbe6', border: '1px solid #ffe58f' }}>
              <Row gutter={16} align="middle">
                <Col span={12}>
                  <Title level={5} style={{ marginBottom: '8px' }}>Tiền cọc trước (nếu có)</Title>
                  <Text type="secondary">Số tiền này sẽ được trừ khỏi tổng giá trị trước khi chia kỳ</Text>
                </Col>
                <Col span={12}>
                  <InputNumber
                    size="large"
                    style={{ width: '100%' }}
                    placeholder="Nhập tiền cọc"
                    value={depositAmount}
                    onChange={(value) => setDepositAmount(value || 0)}
                    formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                    parser={value => value.replace(/\$\s?|(,*)/g, '')}
                    min={0}
                    max={paymentForm.getFieldValue('amount')}
                    addonAfter="VND"
                  />
                </Col>
              </Row>
            </Card>

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
                      <br />
                      <Text strong style={{ color: '#1890ff' }}>
                        Số tiền cần trả góp: {new Intl.NumberFormat('vi-VN').format(
                          (paymentForm.getFieldValue('amount') || 0) - depositAmount
                        )} VND
                      </Text>
                      {depositAmount > 0 && (
                        <>
                          <br />
                          <Text type="secondary">
                            (Tổng {new Intl.NumberFormat('vi-VN').format(paymentForm.getFieldValue('amount') || 0)} VND - 
                            Tiền cọc {new Intl.NumberFormat('vi-VN').format(depositAmount)} VND)
                          </Text>
                        </>
                      )}
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
            <Form.Item name="contractId" hidden>
              <Input />
            </Form.Item>

            <Form.Item name="orderId" hidden>
              <Input />
            </Form.Item>

            <Form.Item label="Mã hợp đồng">
              <Form.Item name="contractCode" noStyle>
                <Input disabled />
              </Form.Item>
            </Form.Item>

            <Form.Item
              name="amount"
              label="Tổng giá trị hợp đồng"
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
                      <Col span={6}>
                        <Text type="secondary">Tổng số kỳ:</Text>
                        <div>
                          <Text strong style={{ fontSize: '16px' }}>{installmentItems.length} kỳ</Text>
                        </div>
                      </Col>
                      <Col span={6}>
                        <Text type="secondary">Tiền cọc:</Text>
                        <div>
                          <Text strong style={{ fontSize: '16px', color: '#52c41a' }}>
                            {new Intl.NumberFormat('vi-VN').format(depositAmount)} VND
                          </Text>
                        </div>
                      </Col>
                      <Col span={6}>
                        <Text type="secondary">Tổng trả góp:</Text>
                        <div>
                          <Text strong style={{ fontSize: '16px', color: '#1890ff' }}>
                            {new Intl.NumberFormat('vi-VN').format(
                              installmentItems.reduce((sum, item) => sum + (item.amountDue || 0), 0)
                            )} VND
                          </Text>
                        </div>
                      </Col>
                      <Col span={6}>
                        <Text type="secondary">Tổng hợp đồng:</Text>
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
      </div>
    </Spin>
  );
};

export default ContractPage;
