import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Tag,
  Modal,
  Row,
  Col,
  Typography,
  message,
  Descriptions,
  Progress,
  Tabs,
  Spin,
  Collapse,
  Timeline,
  Statistic,
  Form,
  InputNumber,
  Select,
  DatePicker,
  Input,
  Alert
} from 'antd';
import {
  DollarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  EyeOutlined,
  CreditCardOutlined,
  CalendarOutlined,
  FileTextOutlined,
  WalletOutlined,
  CloseCircleOutlined,
  DollarCircleOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { paymentAPI, installmentAPI, orderAPI, contractAPI } from '../services/quotationService';
import { useAuth } from '../context/AuthContext';

const { Title, Text } = Typography;
const { TabPane } = Tabs;
const { Panel } = Collapse;
const { TextArea } = Input;

const PaymentPage = () => {
  const { currentUser, isDealerManager, getAgencyId } = useAuth();
  const [payments, setPayments] = useState([]);
  const [installmentPlans, setInstallmentPlans] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isStraightPaymentModalOpen, setIsStraightPaymentModalOpen] = useState(false);
  const [form] = Form.useForm();
  const [straightPaymentForm] = Form.useForm();
  const [paymentPreview, setPaymentPreview] = useState(null);

  // Fetch data function to reload after payment
  const fetchData = async () => {
    const agencyId = getAgencyId();
    if (!agencyId) {
      console.log('PaymentPage - No agencyId found');
      return;
    }

    if (!isDealerManager()) {
      message.warning('Chỉ Manager mới có quyền xem trang này');
      return;
    }

    setLoading(true);
    try {
      // Fetch installment plans
      const installmentData = await installmentAPI.getAll();
      console.log('Installment plans:', installmentData);
      
      // Filter only plans with contractId (not agencyContractId)
      const filteredPlans = installmentData.filter(plan => plan.contractId && !plan.agencyContractId);
      console.log('Filtered plans (contractId only):', filteredPlans);
      setInstallmentPlans(filteredPlans || []);

      // Fetch straight payments
      const paymentsData = await paymentAPI.getByAgencyId(agencyId);
      console.log('Payments:', paymentsData);
      setPayments(paymentsData || []);

    } catch (error) {
      console.error('Error fetching data:', error);
      message.error('Không thể tải danh sách thanh toán');
    } finally {
      setLoading(false);
    }
  };

  // Fetch payments and installment plans from API
  useEffect(() => {
    fetchData();
  }, [currentUser, isDealerManager, getAgencyId]);

  // Handle straight payment
  const handleStraightPayment = (record) => {
    setSelectedPayment(record);
    straightPaymentForm.resetFields();
    straightPaymentForm.setFieldsValue({
      prepay: record.prepay || 0,
      amount: record.amount,
      paymentMethod: record.paymentMethod || 'Trả thẳng',
      status: 'Completed'
    });
    setIsStraightPaymentModalOpen(true);
  };

  // Submit straight payment
  const handleStraightPaymentSubmit = async () => {
    try {
      const values = await straightPaymentForm.validateFields();
      
      await paymentAPI.update(selectedPayment.id, {
        prepay: values.prepay,
        amount: values.amount,
        paymentMethod: values.paymentMethod,
        status: 'Completed'
      });

      // Update order status to Paid after straight payment
      if (selectedPayment.orderId) {
        await orderAPI.update(selectedPayment.orderId, 'Paid');
      }

      message.success('Đã xác nhận thanh toán thành công');
      setIsStraightPaymentModalOpen(false);
      straightPaymentForm.resetFields();
      
      // Reload data
      await fetchData();
    } catch (error) {
      console.error('Error updating payment:', error);
      message.error('Không thể cập nhật thanh toán');
    }
  };

  // Handle installment payment
  const handleInstallmentPayment = (plan) => {
    setSelectedPlan(plan);
    form.resetFields();
    setPaymentPreview(null);
    
    // Calculate total remaining amount (exclude deposit)
    const totalAmountToPay = plan.principalAmount - plan.depositAmount;
    const totalRemaining = totalAmountToPay - plan.totalPaid;
    
    // Find first unpaid or partial item
    const unpaidItem = plan.items?.find(item => item.status === 'Pending' || item.status === 'Partial');
    if (unpaidItem) {
      // Set max amount to total remaining
      const maxAmount = Math.min(unpaidItem.amountRemaining, totalRemaining);
      
      form.setFieldsValue({
        installmentPlanId: plan.id,
        installmentItemId: unpaidItem.id,
        amountPaid: maxAmount,
        paidDate: dayjs(),
        paymentMethod: 'Cash',
        status: 'Completed'
      });
      calculatePaymentPreview(unpaidItem.id, maxAmount, plan.items, totalRemaining);
    }
    
    setIsPaymentModalOpen(true);
  };

  // Calculate payment preview
  const calculatePaymentPreview = (selectedItemId, amount, items, totalRemaining) => {
    if (!amount || amount <= 0 || !items) {
      setPaymentPreview(null);
      return;
    }

    // Check if amount exceeds total remaining
    if (totalRemaining && amount > totalRemaining) {
      message.warning(`Số tiền vượt quá số còn phải trả (${formatPrice(totalRemaining)})`);
      return;
    }

    const selectedItemIndex = items.findIndex(item => item.id === selectedItemId);
    if (selectedItemIndex === -1) {
      setPaymentPreview(null);
      return;
    }

    let remainingAmount = amount;
    const affectedPeriods = [];

    // Get unpaid/partial items from selected item onwards
    const itemsToProcess = items
      .slice(selectedItemIndex)
      .filter(item => item.status === 'Pending' || item.status === 'Partial')
      .sort((a, b) => a.installmentNo - b.installmentNo);

    for (const item of itemsToProcess) {
      if (remainingAmount <= 0) break;

      const amountToApply = Math.min(remainingAmount, item.amountRemaining);
      const newRemaining = item.amountRemaining - amountToApply;
      
      affectedPeriods.push({
        installmentNo: item.installmentNo,
        dueDate: item.dueDate,
        currentRemaining: item.amountRemaining,
        amountApplied: amountToApply,
        newRemaining: newRemaining,
        willBePaid: newRemaining === 0
      });

      remainingAmount -= amountToApply;
    }

    setPaymentPreview({
      totalAmount: amount,
      affectedPeriods,
      excessAmount: remainingAmount
    });
  };

  // Handle amount change
  const handleAmountChange = (value) => {
    const selectedItemId = form.getFieldValue('installmentItemId');
    if (selectedItemId && selectedPlan?.items) {
      // Calculate total remaining
      const totalAmountToPay = selectedPlan.principalAmount - selectedPlan.depositAmount;
      const totalRemaining = totalAmountToPay - selectedPlan.totalPaid;
      
      calculatePaymentPreview(selectedItemId, value, selectedPlan.items, totalRemaining);
    }
  };

  // Handle item selection change
  const handleItemSelectionChange = (itemId) => {
    const amount = form.getFieldValue('amountPaid');
    if (amount && selectedPlan?.items) {
      // Calculate total remaining
      const totalAmountToPay = selectedPlan.principalAmount - selectedPlan.depositAmount;
      const totalRemaining = totalAmountToPay - selectedPlan.totalPaid;
      
      calculatePaymentPreview(itemId, amount, selectedPlan.items, totalRemaining);
      
      // Update amount to selected item's remaining amount (capped by total remaining)
      const selectedItem = selectedPlan.items.find(item => item.id === itemId);
      if (selectedItem) {
        const maxAmount = Math.min(selectedItem.amountRemaining, totalRemaining);
        form.setFieldValue('amountPaid', maxAmount);
      }
    }
  };

  // Submit installment payment
  const handleInstallmentPaymentSubmit = async () => {
    try {
      const values = await form.validateFields();
      
      if (!paymentPreview || paymentPreview.affectedPeriods.length === 0) {
        message.error('Vui lòng nhập số tiền thanh toán hợp lệ');
        return;
      }

      // Calculate total remaining to validate payment amount
      const totalAmountToPay = selectedPlan.principalAmount - selectedPlan.depositAmount;
      const totalRemaining = totalAmountToPay - selectedPlan.totalPaid;
      
      if (values.amountPaid > totalRemaining) {
        message.error(`Số tiền vượt quá số còn phải trả (${formatPrice(totalRemaining)}). Vui lòng nhập lại!`);
        return;
      }

      setLoading(true);

      // Process payment for each affected period
      for (const period of paymentPreview.affectedPeriods) {
        const paymentData = {
          installmentPlanId: values.installmentPlanId,
          installmentItemId: selectedPlan.items.find(item => item.installmentNo === period.installmentNo)?.id,
          amountPaid: period.amountApplied,
          paidDate: values.paidDate.format('YYYY-MM-DDTHH:mm:ss.SSS[Z]'),
          paymentMethod: values.paymentMethod,
          note: values.note || `Thanh toán kỳ ${period.installmentNo}${paymentPreview.affectedPeriods.length > 1 ? ` (Phân bổ từ tổng ${formatPrice(values.amountPaid)})` : ''}`,
          status: 'Completed'
        };

        console.log(`Processing payment for period ${period.installmentNo}:`, paymentData);
        await installmentAPI.processPayment(paymentData);
      }

      // Check if all periods are now paid and update plan status to Completed
      const allPeriodsPaid = selectedPlan.items.every(item => {
        const affectedPeriod = paymentPreview.affectedPeriods.find(p => p.installmentNo === item.installmentNo);
        if (affectedPeriod) {
          return affectedPeriod.willBePaid;
        }
        return item.status === 'Paid';
      });

      if (allPeriodsPaid) {
        // Update plan status to Completed
        await installmentAPI.updatePlanStatus(values.installmentPlanId, {
          contractId: selectedPlan.contractId,
          agencyContractId: selectedPlan.agencyContractId,
          principalAmount: selectedPlan.principalAmount,
          depositAmount: selectedPlan.depositAmount,
          interestRate: selectedPlan.interestRate,
          interestMethod: selectedPlan.interestMethod,
          ruleJson: selectedPlan.ruleJson,
          note: selectedPlan.note,
          status: 'Completed'
        });
        message.success(`Đã ghi nhận thanh toán cho ${paymentPreview.affectedPeriods.length} kỳ trả góp. Kế hoạch đã hoàn thành!`);
      } else {
        message.success(`Đã ghi nhận thanh toán cho ${paymentPreview.affectedPeriods.length} kỳ trả góp`);
      }

      // Update order status based on payment progress
      if (selectedPlan.contractId) {
        try {
          console.log('Starting order status update for contractId:', selectedPlan.contractId);
          
          // Get contract to find quotation ID
          const contract = await contractAPI.getById(selectedPlan.contractId);
          console.log('Contract data:', contract);
          
          if (contract && contract.quotationId) {
            console.log('Found quotationId:', contract.quotationId);
            
            // Get agency ID to fetch orders
            const agencyId = getAgencyId();
            if (!agencyId) {
              console.log('No agencyId found');
              return;
            }
            
            // Fetch all orders for this agency
            const orders = await orderAPI.getByAgencyId(agencyId);
            console.log('All orders:', orders);
            
            // Find order that matches this quotation
            const matchingOrder = orders.find(order => {
              // Check if any order detail has the matching quotationId
              return order.details?.some(detail => detail.quotationId === contract.quotationId);
            });
            
            console.log('Matching order:', matchingOrder);
            
            if (matchingOrder) {
              console.log('Found orderId:', matchingOrder.id);
              
              // Calculate total amount to pay (excluding deposit)
              const totalAmountToPay = selectedPlan.principalAmount - selectedPlan.depositAmount;
              
              // Calculate total paid after this payment
              let totalPaidAfterPayment = selectedPlan.totalPaid || 0;
              for (const period of paymentPreview.affectedPeriods) {
                totalPaidAfterPayment += period.amountApplied;
              }

              // Calculate payment percentage
              const paymentPercentage = (totalPaidAfterPayment / totalAmountToPay) * 100;

              console.log('Payment calculation:', {
                totalAmountToPay,
                totalPaidBefore: selectedPlan.totalPaid,
                paymentAmount: paymentPreview.affectedPeriods.reduce((sum, p) => sum + p.amountApplied, 0),
                totalPaidAfterPayment,
                paymentPercentage: paymentPercentage.toFixed(2) + '%'
              });

              let orderStatus;
              if (allPeriodsPaid || paymentPercentage >= 100) {
                // Trả góp đủ 100% → Completed (nếu đã giao xe) hoặc Paid (chưa giao xe)
                if (matchingOrder.status === 'Pending-Payment') {
                  orderStatus = 'Completed';
                } else {
                  orderStatus = 'Paid';
                }
              } else if (paymentPercentage >= 10) {
                // Trả đủ 10% principalAmount (không trừ deposit) → Partial-Ready
                orderStatus = 'Partial-Ready';
              } else if (paymentPercentage > 0) {
                orderStatus = 'Partial';
              }

              if (orderStatus) {
                console.log('Updating order', matchingOrder.id, 'to status:', orderStatus);
                const updateResult = await orderAPI.update(matchingOrder.id, orderStatus);
                console.log('Order update result:', updateResult);
                message.success(`Đã cập nhật trạng thái đơn hàng: ${orderStatus}`);
              } else {
                console.log('No order status to update (percentage is 0 or invalid)');
              }
            } else {
              console.log('No matching order found for quotationId:', contract.quotationId);
            }
          } else {
            console.log('No quotationId found in contract');
          }
        } catch (error) {
          console.error('Error updating order status:', error);
          message.warning('Đã thanh toán nhưng không thể cập nhật trạng thái đơn hàng');
          // Don't throw error, just log it
        }
      } else {
        console.log('No contractId in selectedPlan');
      }

      setIsPaymentModalOpen(false);
      form.resetFields();
      setPaymentPreview(null);
      
      // Reload data
      await fetchData();
    } catch (error) {
      console.error('Error processing installment payment:', error);
      message.error('Không thể ghi nhận thanh toán');
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(price);
  };

  // Get installment status info
  const getInstallmentStatusInfo = (status) => {
    const statusMap = {
      Active: { color: 'processing', text: 'Hoạt động', icon: <CheckCircleOutlined /> },
      Completed: { color: 'success', text: 'Hoàn thành', icon: <CheckCircleOutlined /> },
      Cancelled: { color: 'error', text: 'Đã hủy', icon: <ClockCircleOutlined /> },
      Pending: { color: 'warning', text: 'Chờ xử lý', icon: <ClockCircleOutlined /> }
    };
    return statusMap[status] || statusMap.Pending;
  };

  // Get item status info
  const getItemStatusInfo = (status) => {
    const statusMap = {
      Paid: { color: 'success', text: 'Đã thanh toán', icon: <CheckCircleOutlined /> },
      Pending: { color: 'warning', text: 'Chờ thanh toán', icon: <ClockCircleOutlined /> },
      Overdue: { color: 'error', text: 'Quá hạn', icon: <ClockCircleOutlined /> },
      Partial: { color: 'processing', text: 'Thanh toán 1 phần', icon: <ClockCircleOutlined /> }
    };
    return statusMap[status] || statusMap.Pending;
  };

  // Get payment status info
  const getPaymentStatusInfo = (status) => {
    const statusMap = {
      Pending: { color: 'warning', text: 'Chờ xử lý', icon: <ClockCircleOutlined /> },
      Completed: { color: 'success', text: 'Hoàn thành', icon: <CheckCircleOutlined /> },
      Failed: { color: 'error', text: 'Thất bại', icon: <CloseCircleOutlined /> }
    };
    return statusMap[status] || statusMap.Pending;
  };

  // Handle view installment plan detail
  const handleViewPlan = (record) => {
    setSelectedPlan(record);
    setIsModalOpen(true);
  };

  // Installment Plans Columns
  const installmentColumns = [
    {
      title: 'Mã kế hoạch',
      dataIndex: 'id',
      key: 'id',
      width: 120,
      render: (id) => <Text strong code>IP{id.toString().padStart(4, '0')}</Text>
    },
    {
      title: 'Mã HĐ',
      dataIndex: 'contractId',
      key: 'contractId',
      width: 100,
      render: (id) => <Text code>{id}</Text>
    },
    {
      title: 'Tổng giá trị',
      dataIndex: 'principalAmount',
      key: 'principalAmount',
      width: 150,
      render: (amount) => <Text strong>{formatPrice(amount)}</Text>
    },
    {
      title: 'Tiền cọc',
      dataIndex: 'depositAmount',
      key: 'depositAmount',
      width: 150,
      render: (amount) => (
        <Text style={{ color: amount > 0 ? '#52c41a' : undefined }}>
          {formatPrice(amount)}
        </Text>
      )
    },
    {
      title: 'Đã thanh toán',
      dataIndex: 'totalPaid',
      key: 'totalPaid',
      width: 150,
      render: (amount) => <Text style={{ color: '#1890ff' }}>{formatPrice(amount)}</Text>
    },
    {
      title: 'Tiến độ',
      key: 'progress',
      width: 180,
      render: (_, record) => {
        const remainingAmount = record.principalAmount - record.depositAmount;
        const progress = remainingAmount > 0 
          ? Math.round((record.totalPaid / remainingAmount) * 100)
          : 100;
        return (
          <div>
            <Progress 
              percent={progress} 
              size="small"
              status={progress === 100 ? 'success' : 'active'}
            />
            <Text type="secondary" style={{ fontSize: '11px' }}>
              {record.items?.filter(i => i.status === 'Paid').length || 0}/{record.items?.length || 0} kỳ
            </Text>
          </div>
        );
      }
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 130,
      render: (status) => {
        const info = getInstallmentStatusInfo(status);
        return (
          <Tag icon={info.icon} color={info.color}>
            {info.text}
          </Tag>
        );
      }
    },
    {
      title: 'Ngày tạo',
      dataIndex: 'createAt',
      key: 'createAt',
      width: 120,
      render: (date) => dayjs(date).format('DD/MM/YYYY')
    },
    {
      title: 'Thao tác',
      key: 'actions',
      fixed: 'right',
      width: 150,
      align: 'center',
      render: (_, record) => {
        // Check if there are any unpaid items
        const hasUnpaidItems = record.items?.some(item => 
          item.status === 'Pending' || item.amountRemaining > 0
        );
        
        return (
          <Space>
            <Button
              type="link"
              icon={<EyeOutlined />}
              onClick={() => handleViewPlan(record)}
            >
              Chi tiết
            </Button>
            {hasUnpaidItems && (
              <Button
                type="primary"
                size="small"
                icon={<DollarCircleOutlined />}
                onClick={() => handleInstallmentPayment(record)}
              >
                Thanh toán
              </Button>
            )}
          </Space>
        );
      }
    }
  ];

  // Straight Payments Columns
  const paymentColumns = [
    {
      title: 'Mã thanh toán',
      dataIndex: 'id',
      key: 'id',
      width: 130,
      render: (id) => <Text strong code>PAY{id.toString().padStart(6, '0')}</Text>
    },
    {
      title: 'Mã đơn hàng',
      dataIndex: 'orderId',
      key: 'orderId',
      width: 120,
      render: (id) => <Text code>ORD{id.toString().padStart(4, '0')}</Text>
    },
    {
      title: 'Tổng giá trị',
      dataIndex: 'amount',
      key: 'amount',
      width: 150,
      render: (amount) => <Text strong>{formatPrice(amount)}</Text>
    },
    {
      title: 'Tiền trả trước',
      dataIndex: 'prepay',
      key: 'prepay',
      width: 150,
      render: (amount) => (
        <Text style={{ color: amount > 0 ? '#52c41a' : undefined }}>
          {formatPrice(amount)}
        </Text>
      )
    },
    {
      title: 'Phương thức',
      dataIndex: 'paymentMethod',
      key: 'paymentMethod',
      width: 120,
      render: (method) => (
        <Tag color="green">
          {method}
        </Tag>
      )
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 130,
      render: (status) => {
        const info = getPaymentStatusInfo(status);
        return (
          <Tag icon={info.icon} color={info.color}>
            {info.text}
          </Tag>
        );
      }
    },
    {
      title: 'Ngày thanh toán',
      dataIndex: 'paymentDate',
      key: 'paymentDate',
      width: 140,
      render: (date) => dayjs(date).format('DD/MM/YYYY HH:mm')
    },
    {
      title: 'Thao tác',
      key: 'actions',
      fixed: 'right',
      width: 120,
      align: 'center',
      render: (_, record) => (
        record.status === 'Pending' && (
          <Button
            type="primary"
            size="small"
            icon={<DollarCircleOutlined />}
            onClick={() => handleStraightPayment(record)}
          >
            Thanh toán
          </Button>
        )
      )
    }
  ];

  // Calculate statistics for installment plans
  const installmentStats = {
    total: installmentPlans.length,
    active: installmentPlans.filter(p => p.status === 'Active').length,
    completed: installmentPlans.filter(p => p.status === 'Completed').length,
    totalValue: installmentPlans.reduce((sum, p) => sum + p.principalAmount, 0),
    totalPaid: installmentPlans.reduce((sum, p) => sum + p.totalPaid, 0),
    totalDeposit: installmentPlans.reduce((sum, p) => sum + p.depositAmount, 0)
  };

  // Calculate statistics for payments
  const paymentStats = {
    total: payments.length,
    completed: payments.filter(p => p.status === 'Completed').length,
    pending: payments.filter(p => p.status === 'Pending').length,
    totalValue: payments.reduce((sum, p) => sum + p.amount, 0),
    totalPrepay: payments.reduce((sum, p) => sum + p.prepay, 0)
  };

  return (
    <Spin spinning={loading} tip="Đang tải dữ liệu thanh toán...">
      <div className="payment-page">
        <div className="page-header" style={{ marginBottom: '24px' }}>
          <Title level={2}>
            <DollarOutlined /> Quản lý thanh toán
          </Title>
          <Text type="secondary">Theo dõi thanh toán trả góp và trả thẳng</Text>
        </div>

        <Tabs defaultActiveKey="installment">
          {/* Tab Trả góp */}
          <TabPane
            tab={
              <span>
                <CalendarOutlined />
                Trả góp ({installmentStats.total})
              </span>
            }
            key="installment"
          >
            {/* Statistics */}
            <Row gutter={16} style={{ marginBottom: '24px' }}>
              <Col xs={24} sm={12} md={6}>
                <Card>
                  <Statistic
                    title="Kế hoạch hoạt động"
                    value={installmentStats.active}
                    prefix={<CheckCircleOutlined />}
                    valueStyle={{ color: '#52c41a' }}
                  />
                </Card>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Card>
                  <Statistic
                    title="Tổng giá trị"
                    value={installmentStats.totalValue}
                    formatter={(value) => formatPrice(value)}
                    valueStyle={{ fontSize: '18px' }}
                  />
                </Card>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Card>
                  <Statistic
                    title="Tiền cọc"
                    value={installmentStats.totalDeposit}
                    formatter={(value) => formatPrice(value)}
                    valueStyle={{ color: '#52c41a', fontSize: '18px' }}
                    prefix={<WalletOutlined />}
                  />
                </Card>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Card>
                  <Statistic
                    title="Đã thu"
                    value={installmentStats.totalPaid}
                    formatter={(value) => formatPrice(value)}
                    valueStyle={{ color: '#1890ff', fontSize: '18px' }}
                    prefix={<CreditCardOutlined />}
                  />
                </Card>
              </Col>
            </Row>

            {/* Installment Plans Table */}
            <Card>
              <Table
                columns={installmentColumns}
                dataSource={installmentPlans}
                rowKey="id"
                scroll={{ x: 1400 }}
                pagination={{
                  pageSize: 10,
                  showTotal: (total) => `Tổng ${total} kế hoạch trả góp`
                }}
              />
            </Card>
          </TabPane>

          {/* Tab Trả thẳng */}
          <TabPane
            tab={
              <span>
                <FileTextOutlined />
                Trả thẳng ({paymentStats.total})
              </span>
            }
            key="straight"
          >
            {/* Statistics */}
            <Row gutter={16} style={{ marginBottom: '24px' }}>
              <Col xs={24} sm={12} md={6}>
                <Card>
                  <Statistic
                    title="Hoàn thành"
                    value={paymentStats.completed}
                    prefix={<CheckCircleOutlined />}
                    valueStyle={{ color: '#52c41a' }}
                  />
                </Card>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Card>
                  <Statistic
                    title="Chờ xử lý"
                    value={paymentStats.pending}
                    prefix={<ClockCircleOutlined />}
                    valueStyle={{ color: '#faad14' }}
                  />
                </Card>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Card>
                  <Statistic
                    title="Tổng giá trị"
                    value={paymentStats.totalValue}
                    formatter={(value) => formatPrice(value)}
                    valueStyle={{ fontSize: '18px' }}
                  />
                </Card>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Card>
                  <Statistic
                    title="Tiền trả trước"
                    value={paymentStats.totalPrepay}
                    formatter={(value) => formatPrice(value)}
                    valueStyle={{ color: '#52c41a', fontSize: '18px' }}
                    prefix={<WalletOutlined />}
                  />
                </Card>
              </Col>
            </Row>

            {/* Payments Table */}
            <Card>
              <Table
                columns={paymentColumns}
                dataSource={payments}
                rowKey="id"
                scroll={{ x: 1200 }}
                pagination={{
                  pageSize: 10,
                  showTotal: (total) => `Tổng ${total} thanh toán`
                }}
              />
            </Card>
          </TabPane>
        </Tabs>

        {/* Installment Plan Detail Modal */}
        <Modal
          title={`Chi tiết kế hoạch trả góp - IP${selectedPlan?.id?.toString().padStart(4, '0')}`}
          open={isModalOpen}
          onCancel={() => setIsModalOpen(false)}
          footer={[
            <Button key="close" type="primary" onClick={() => setIsModalOpen(false)}>
              Đóng
            </Button>
          ]}
          width={1000}
        >
          {selectedPlan && (
            <>
              {/* Plan Overview */}
              <Card style={{ marginBottom: '24px', background: '#f0f5ff' }}>
                <Row gutter={16}>
                  <Col span={6}>
                    <Statistic
                      title="Tổng giá trị"
                      value={selectedPlan.principalAmount}
                      formatter={(value) => formatPrice(value)}
                      valueStyle={{ fontSize: '18px' }}
                    />
                  </Col>
                  <Col span={6}>
                    <Statistic
                      title="Tiền cọc"
                      value={selectedPlan.depositAmount}
                      formatter={(value) => formatPrice(value)}
                      valueStyle={{ color: '#52c41a', fontSize: '18px' }}
                    />
                  </Col>
                  <Col span={6}>
                    <Statistic
                      title="Đã thanh toán"
                      value={selectedPlan.totalPaid}
                      formatter={(value) => formatPrice(value)}
                      valueStyle={{ color: '#1890ff', fontSize: '18px' }}
                    />
                  </Col>
                  <Col span={6}>
                    <Statistic
                      title="Còn lại"
                      value={(selectedPlan.principalAmount - selectedPlan.depositAmount) - selectedPlan.totalPaid}
                      formatter={(value) => formatPrice(value)}
                      valueStyle={{ color: '#f5222d', fontSize: '18px' }}
                    />
                  </Col>
                </Row>
                <div style={{ marginTop: '16px' }}>
                  <Text type="secondary">Tiến độ thanh toán: </Text>
                  <Progress
                    percent={Math.round((selectedPlan.totalPaid / (selectedPlan.principalAmount - selectedPlan.depositAmount)) * 100)}
                    status={selectedPlan.status === 'Completed' ? 'success' : 'active'}
                  />
                </div>
              </Card>

              {/* Plan Info */}
              <Descriptions bordered column={2} style={{ marginBottom: '24px' }}>
                <Descriptions.Item label="Mã kế hoạch">
                  IP{selectedPlan.id?.toString().padStart(4, '0')}
                </Descriptions.Item>
                <Descriptions.Item label="Mã hợp đồng">
                  {selectedPlan.contractId}
                </Descriptions.Item>
                <Descriptions.Item label="Lãi suất">
                  {selectedPlan.interestRate}%
                </Descriptions.Item>
                <Descriptions.Item label="Phương thức tính lãi">
                  {selectedPlan.interestMethod}
                </Descriptions.Item>
                <Descriptions.Item label="Trạng thái" span={2}>
                  <Tag
                    icon={getInstallmentStatusInfo(selectedPlan.status).icon}
                    color={getInstallmentStatusInfo(selectedPlan.status).color}
                  >
                    {getInstallmentStatusInfo(selectedPlan.status).text}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Ngày tạo">
                  {dayjs(selectedPlan.createAt).format('DD/MM/YYYY HH:mm')}
                </Descriptions.Item>
                <Descriptions.Item label="Cập nhật">
                  {dayjs(selectedPlan.updateAt).format('DD/MM/YYYY HH:mm')}
                </Descriptions.Item>
                {selectedPlan.note && (
                  <Descriptions.Item label="Ghi chú" span={2}>
                    {selectedPlan.note}
                  </Descriptions.Item>
                )}
              </Descriptions>

              {/* Installment Items */}
              <Card title={`Các kỳ thanh toán (${selectedPlan.items?.length || 0} kỳ)`} style={{ marginBottom: '24px' }}>
                <Collapse>
                  {selectedPlan.items?.map((item) => (
                    <Panel
                      header={
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Space>
                            <Text strong>Kỳ {item.installmentNo}</Text>
                            <Tag
                              icon={getItemStatusInfo(item.status).icon}
                              color={getItemStatusInfo(item.status).color}
                            >
                              {getItemStatusInfo(item.status).text}
                            </Tag>
                          </Space>
                          <Space>
                            <Text>Hạn: {dayjs(item.dueDate).format('DD/MM/YYYY')}</Text>
                            <Text strong style={{ color: item.status === 'Paid' ? '#52c41a' : '#f5222d' }}>
                              {formatPrice(item.amountDue)}
                            </Text>
                          </Space>
                        </div>
                      }
                      key={item.id}
                    >
                      <Descriptions bordered column={2} size="small">
                        <Descriptions.Item label="Kỳ số">
                          {item.installmentNo}
                        </Descriptions.Item>
                        <Descriptions.Item label="Ngày đáo hạn">
                          {dayjs(item.dueDate).format('DD/MM/YYYY')}
                        </Descriptions.Item>
                        <Descriptions.Item label="Số tiền phải trả">
                          <Text strong>{formatPrice(item.amountDue)}</Text>
                        </Descriptions.Item>
                        <Descriptions.Item label="Đã thanh toán">
                          <Text style={{ color: '#52c41a' }}>{formatPrice(item.amountPaid)}</Text>
                        </Descriptions.Item>
                        <Descriptions.Item label="Còn lại">
                          <Text style={{ color: '#f5222d' }}>{formatPrice(item.amountRemaining)}</Text>
                        </Descriptions.Item>
                        <Descriptions.Item label="Trạng thái">
                          <Tag
                            icon={getItemStatusInfo(item.status).icon}
                            color={getItemStatusInfo(item.status).color}
                          >
                            {getItemStatusInfo(item.status).text}
                          </Tag>
                        </Descriptions.Item>
                        {item.paidDate && (
                          <Descriptions.Item label="Ngày thanh toán" span={2}>
                            {dayjs(item.paidDate).format('DD/MM/YYYY HH:mm')}
                          </Descriptions.Item>
                        )}
                        {item.note && (
                          <Descriptions.Item label="Ghi chú" span={2}>
                            {item.note}
                          </Descriptions.Item>
                        )}
                      </Descriptions>
                    </Panel>
                  ))}
                </Collapse>
              </Card>

              {/* Payment History */}
              {selectedPlan.payments && selectedPlan.payments.length > 0 && (
                <Card title={`Lịch sử thanh toán (${selectedPlan.payments.length})`}>
                  <Timeline>
                    {selectedPlan.payments.map((payment) => (
                      <Timeline.Item
                        key={payment.id}
                        color={payment.status === 'Completed' ? 'green' : 'blue'}
                      >
                        <div style={{ marginBottom: '8px' }}>
                          <Text strong>{dayjs(payment.paidDate).format('DD/MM/YYYY HH:mm')}</Text>
                          <Tag color="green" style={{ marginLeft: '8px' }}>
                            {formatPrice(payment.amountPaid)}
                          </Tag>
                        </div>
                        <div>
                          <Tag>{payment.paymentMethod}</Tag>
                          <Tag
                            color={payment.status === 'Completed' ? 'success' : 'warning'}
                            style={{ marginLeft: '8px' }}
                          >
                            {payment.status}
                          </Tag>
                        </div>
                        {payment.note && (
                          <Text type="secondary" style={{ fontSize: '12px', display: 'block', marginTop: '4px' }}>
                            {payment.note}
                          </Text>
                        )}
                      </Timeline.Item>
                    ))}
                  </Timeline>
                </Card>
              )}
            </>
          )}
        </Modal>

        {/* Installment Payment Modal */}
        <Modal
          title="Thanh toán kỳ trả góp"
          open={isPaymentModalOpen}
          onCancel={() => {
            setIsPaymentModalOpen(false);
            form.resetFields();
            setPaymentPreview(null);
          }}
          onOk={handleInstallmentPaymentSubmit}
          okText="Xác nhận thanh toán"
          cancelText="Hủy"
          width={800}
        >
          <Form
            form={form}
            layout="vertical"
            style={{ marginTop: '24px' }}
          >
            <Form.Item name="installmentPlanId" hidden>
              <InputNumber />
            </Form.Item>

            <Form.Item
              name="installmentItemId"
              label="Chọn kỳ thanh toán"
              rules={[{ required: true, message: 'Vui lòng chọn kỳ thanh toán' }]}
            >
              <Select 
                placeholder="Chọn kỳ thanh toán"
                onChange={handleItemSelectionChange}
              >
                {selectedPlan?.items
                  ?.filter(item => item.status === 'Pending' || item.status === 'Partial')
                  ?.map(item => (
                    <Select.Option key={item.id} value={item.id}>
                      Kỳ {item.installmentNo} - Hạn: {dayjs(item.dueDate).format('DD/MM/YYYY')} - 
                      Còn lại: {formatPrice(item.amountRemaining)}
                    </Select.Option>
                  ))}
              </Select>
            </Form.Item>

            <Form.Item
              name="amountPaid"
              label="Số tiền thanh toán"
              rules={[{ required: true, message: 'Vui lòng nhập số tiền' }]}
            >
              <InputNumber
                style={{ width: '100%' }}
                formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                parser={value => value.replace(/\$\s?|(,*)/g, '')}
                min={0}
                addonAfter="VND"
                placeholder="Nhập số tiền thanh toán"
                onChange={handleAmountChange}
              />
            </Form.Item>

            {/* Payment Preview */}
            {paymentPreview && paymentPreview.affectedPeriods.length > 0 && (
              <Alert
                message="Phân bổ thanh toán"
                description={
                  <div style={{ marginTop: '8px' }}>
                    <Text strong>Tổng số tiền: {formatPrice(paymentPreview.totalAmount)}</Text>
                    <div style={{ marginTop: '12px' }}>
                      {paymentPreview.affectedPeriods.map((period, index) => (
                        <div 
                          key={index}
                          style={{ 
                            padding: '8px 12px',
                            marginBottom: '8px',
                            background: period.willBePaid ? '#f6ffed' : '#fff7e6',
                            border: `1px solid ${period.willBePaid ? '#b7eb8f' : '#ffe58f'}`,
                            borderRadius: '4px'
                          }}
                        >
                          <Space direction="vertical" size={4} style={{ width: '100%' }}>
                            <Text strong>
                              Kỳ {period.installmentNo} ({dayjs(period.dueDate).format('DD/MM/YYYY')})
                            </Text>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <Text type="secondary">Còn lại hiện tại:</Text>
                              <Text>{formatPrice(period.currentRemaining)}</Text>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <Text type="secondary">Số tiền áp dụng:</Text>
                              <Text strong style={{ color: '#1890ff' }}>
                                -{formatPrice(period.amountApplied)}
                              </Text>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <Text type="secondary">Còn lại sau thanh toán:</Text>
                              <Text strong style={{ color: period.willBePaid ? '#52c41a' : '#faad14' }}>
                                {formatPrice(period.newRemaining)}
                              </Text>
                            </div>
                            {period.willBePaid && (
                              <Tag color="success" style={{ marginTop: '4px' }}>
                                ✓ Sẽ hoàn thành
                              </Tag>
                            )}
                          </Space>
                        </div>
                      ))}
                    </div>
                    {paymentPreview.excessAmount > 0 && (
                      <Alert
                        type="warning"
                        message={`Số tiền dư: ${formatPrice(paymentPreview.excessAmount)}`}
                        description="Số tiền này vượt quá tổng số tiền cần thanh toán cho tất cả các kỳ còn lại"
                        style={{ marginTop: '12px' }}
                        showIcon
                      />
                    )}
                  </div>
                }
                type="info"
                style={{ marginBottom: '16px' }}
              />
            )}

            <Form.Item
              name="paidDate"
              label="Ngày thanh toán"
              rules={[{ required: true, message: 'Vui lòng chọn ngày thanh toán' }]}
            >
              <DatePicker
                style={{ width: '100%' }}
                showTime
                format="DD/MM/YYYY HH:mm"
                placeholder="Chọn ngày thanh toán"
              />
            </Form.Item>

            <Form.Item
              name="paymentMethod"
              label="Phương thức thanh toán"
              rules={[{ required: true, message: 'Vui lòng chọn phương thức' }]}
            >
              <Select placeholder="Chọn phương thức thanh toán">
                <Select.Option value="Cash">Tiền mặt</Select.Option>
                <Select.Option value="BankTransfer">Chuyển khoản</Select.Option>
                <Select.Option value="CreditCard">Thẻ tín dụng</Select.Option>
                <Select.Option value="Momo">Momo</Select.Option>
                <Select.Option value="ZaloPay">ZaloPay</Select.Option>
              </Select>
            </Form.Item>

            <Form.Item name="status" hidden initialValue="Completed">
              <Input />
            </Form.Item>

            <Form.Item
              name="note"
              label="Ghi chú"
            >
              <TextArea
                rows={3}
                placeholder="Nhập ghi chú (nếu có)"
              />
            </Form.Item>
          </Form>
        </Modal>

        {/* Straight Payment Modal */}
        <Modal
          title="Xác nhận thanh toán trả thẳng"
          open={isStraightPaymentModalOpen}
          onCancel={() => {
            setIsStraightPaymentModalOpen(false);
            straightPaymentForm.resetFields();
          }}
          onOk={handleStraightPaymentSubmit}
          okText="Xác nhận thanh toán"
          cancelText="Hủy"
          width={600}
        >
          <Form
            form={straightPaymentForm}
            layout="vertical"
            style={{ marginTop: '24px' }}
          >
            <Alert
              message="Xác nhận thanh toán"
              description="Sau khi xác nhận, trạng thái thanh toán sẽ được cập nhật thành 'Hoàn thành'"
              type="info"
              showIcon
              style={{ marginBottom: '24px' }}
            />

            <Form.Item
              name="prepay"
              label="Tiền trả trước"
            >
              <InputNumber
                style={{ width: '100%' }}
                formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                parser={value => value.replace(/\$\s?|(,*)/g, '')}
                min={0}
                addonAfter="VND"
                disabled
              />
            </Form.Item>

            <Form.Item
              name="amount"
              label="Tổng số tiền"
              rules={[{ required: true, message: 'Vui lòng nhập số tiền' }]}
            >
              <InputNumber
                style={{ width: '100%' }}
                formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                parser={value => value.replace(/\$\s?|(,*)/g, '')}
                min={0}
                addonAfter="VND"
                disabled
              />
            </Form.Item>

            <Form.Item
              name="paymentMethod"
              label="Phương thức thanh toán"
            >
              <Input disabled />
            </Form.Item>

            <Form.Item name="status" hidden>
              <Input />
            </Form.Item>
          </Form>
        </Modal>
      </div>
    </Spin>
  );
};

export default PaymentPage;
