import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Row,
  Col,
  Typography,
  Tag,
  Statistic,
  Progress,
  Button,
  Space,
  Badge,
  Dropdown,
  Modal,
  message,
  Spin,
  Descriptions,
  Tabs
} from 'antd';
import {
  FileTextOutlined,
  UserOutlined,
  DollarOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  MoreOutlined,
  PhoneOutlined,
  MailOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useAuth } from '../context/AuthContext';
import { paymentAPI, installmentAPI, orderAPI, customerAPI, contractAPI, quotationAPI } from '../services/quotationService';

const { Title, Text } = Typography;
const { TabPane } = Tabs;

const CustomerDebtReportPage = () => {
  const { currentUser, isDealerManager, getAgencyId } = useAuth();
  const [customerDebts, setCustomerDebts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Fetch data from API
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const agencyId = getAgencyId();
    if (!agencyId) {
      message.error('Không tìm thấy thông tin đại lý');
      return;
    }

    if (!isDealerManager()) {
      message.error('Bạn không có quyền truy cập');
      return;
    }

    setLoading(true);
    try {
      // Fetch all data from APIs
      const [paymentsData, installmentPlansData, ordersData, customersData, contractsData, quotationsData] = await Promise.all([
        paymentAPI.getByAgencyId(agencyId),
        installmentAPI.getAll(),
        orderAPI.getByAgencyId(agencyId),
        customerAPI.getAll(),
        contractAPI.getByAgencyId(agencyId),
        quotationAPI.getByAgencyId(agencyId)
      ]);

      // Calculate debt for each customer
      const debtsMap = new Map();

      // Process straight payments
      paymentsData.forEach(payment => {
        const order = ordersData.find(o => o.id === payment.orderId);
        if (!order) return;

        const customerId = order.customerId;
        if (!debtsMap.has(customerId)) {
          debtsMap.set(customerId, {
            customerId,
            totalOrderValue: 0,
            totalPaid: 0,
            paymentCount: 0,
            lastPaymentDate: null,
            orderIds: [],
            straightPayments: [],
            installmentPlans: []
          });
        }

        const debt = debtsMap.get(customerId);
        debt.totalOrderValue += payment.amount || 0;
        
        if (payment.status === 'Completed') {
          debt.totalPaid += payment.amount || 0;
          debt.paymentCount++;
          
          if (!debt.lastPaymentDate || dayjs(payment.paymentDate).isAfter(dayjs(debt.lastPaymentDate))) {
            debt.lastPaymentDate = payment.paymentDate;
          }
        }
        
        if (!debt.orderIds.includes(order.id)) {
          debt.orderIds.push(order.id);
        }

        // Store payment details for modal
        debt.straightPayments.push({
          ...payment,
          orderInfo: order
        });
      });

      // Process installment plans
      installmentPlansData.forEach(plan => {
        // Find contract for this plan
        const contract = contractsData.find(c => c.id === plan.contractId);
        if (!contract) return;

        // Find quotation for this contract
        const quotation = quotationsData.find(q => q.id === contract.quotationId);
        if (!quotation) return;

        // Get customer from quotation
        const customerId = quotation.customerId;
        if (!customerId) return;

        if (!debtsMap.has(customerId)) {
          debtsMap.set(customerId, {
            customerId,
            totalOrderValue: 0,
            totalPaid: 0,
            paymentCount: 0,
            lastPaymentDate: null,
            orderIds: [],
            straightPayments: [],
            installmentPlans: []
          });
        }

        const debt = debtsMap.get(customerId);
        
        // Add principal amount minus deposit to total value
        const remainingPrincipal = (plan.principalAmount || 0) - (plan.depositAmount || 0);
        debt.totalOrderValue += remainingPrincipal;
        debt.totalPaid += plan.totalPaid || 0;

        // Count payments from installment items
        if (plan.items) {
          const paidItems = plan.items.filter(item => item.status === 'Paid' || item.paidDate);
          debt.paymentCount += paidItems.length;

          // Find latest payment date
          paidItems.forEach(item => {
            if (item.paidDate && (!debt.lastPaymentDate || dayjs(item.paidDate).isAfter(dayjs(debt.lastPaymentDate)))) {
              debt.lastPaymentDate = item.paidDate;
            }
          });
        }

        // Find order for this quotation (if exists)
        const order = ordersData.find(o => o.quotationId === quotation.id);
        if (order && !debt.orderIds.includes(order.id)) {
          debt.orderIds.push(order.id);
        }

        // Store installment plan details for modal
        debt.installmentPlans.push({
          ...plan,
          contractInfo: contract,
          quotationInfo: quotation,
          orderInfo: order
        });
      });

      // Combine with customer information
      const customerDebtsList = Array.from(debtsMap.values())
        .map(debt => {
          const customer = customersData.find(c => c.id === debt.customerId);
          if (!customer) return null;

          const remainingDebt = debt.totalOrderValue - debt.totalPaid;
          const paymentPercentage = debt.totalOrderValue > 0 
            ? Math.round((debt.totalPaid / debt.totalOrderValue) * 100) 
            : 0;

          // Determine debt status
          let debtStatus = 'paid';
          if (remainingDebt > 0) {
            if (paymentPercentage === 0) {
              debtStatus = 'unpaid';
            } else if (paymentPercentage < 50) {
              debtStatus = 'high_debt';
            } else {
              debtStatus = 'partial';
            }
          }

          return {
            id: customer.id,
            customer_name: customer.fullName,
            customer_phone: customer.phoneNumber,
            customer_email: customer.email,
            customer_address: customer.address,
            total_orders: debt.orderIds.length,
            total_order_value: debt.totalOrderValue,
            total_paid: debt.totalPaid,
            remaining_debt: remainingDebt,
            payment_percentage: paymentPercentage,
            debt_status: debtStatus,
            last_payment_date: debt.lastPaymentDate,
            payment_count: debt.paymentCount,
            straight_payments: debt.straightPayments,
            installment_plans: debt.installmentPlans
          };
        })
        .filter(debt => debt !== null && debt.total_order_value > 0)
        .sort((a, b) => b.remaining_debt - a.remaining_debt);

      setCustomerDebts(customerDebtsList);
    } catch (error) {
      console.error('Error fetching debt data:', error);
      message.error('Không thể tải dữ liệu công nợ');
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

  // Calculate statistics
  const totalDebt = customerDebts.reduce((sum, debt) => sum + debt.remaining_debt, 0);
  const totalPaid = customerDebts.reduce((sum, debt) => sum + debt.total_paid, 0);
  const customersWithDebt = customerDebts.filter(d => d.remaining_debt > 0).length;
  const highDebtCustomers = customerDebts.filter(d => d.debt_status === 'high_debt' || d.debt_status === 'unpaid').length;

  const getDebtStatusInfo = (status) => {
    const statusMap = {
      paid: { color: 'success', text: 'Đã thanh toán', icon: <CheckCircleOutlined /> },
      partial: { color: 'processing', text: 'Thanh toán một phần', icon: <ClockCircleOutlined /> },
      high_debt: { color: 'warning', text: 'Nợ cao', icon: <WarningOutlined /> },
      unpaid: { color: 'error', text: 'Chưa thanh toán', icon: <WarningOutlined /> }
    };
    return statusMap[status];
  };

  const getPaymentStatusInfo = (status) => {
    const statusMap = {
      Pending: { color: 'warning', text: 'Chờ xử lý', icon: <ClockCircleOutlined /> },
      Completed: { color: 'success', text: 'Hoàn thành', icon: <CheckCircleOutlined /> }
    };
    return statusMap[status] || { color: 'default', text: status, icon: <ClockCircleOutlined /> };
  };

  const getInstallmentStatusInfo = (status) => {
    const statusMap = {
      Active: { color: 'processing', text: 'Đang hoạt động', icon: <ClockCircleOutlined /> },
      Completed: { color: 'success', text: 'Hoàn thành', icon: <CheckCircleOutlined /> },
      Cancelled: { color: 'error', text: 'Đã hủy', icon: <WarningOutlined /> }
    };
    return statusMap[status] || { color: 'default', text: status, icon: <ClockCircleOutlined /> };
  };

  const getItemStatusInfo = (status) => {
    const statusMap = {
      Pending: { color: 'warning', text: 'Chưa thanh toán', icon: <ClockCircleOutlined /> },
      Partial: { color: 'processing', text: 'Thanh toán một phần', icon: <ClockCircleOutlined /> },
      Paid: { color: 'success', text: 'Đã thanh toán', icon: <CheckCircleOutlined /> }
    };
    return statusMap[status] || { color: 'default', text: status, icon: <ClockCircleOutlined /> };
  };

  const handleRemind = (customer) => {
    Modal.confirm({
      title: 'Nhắc nợ khách hàng',
      content: `Gửi thông báo nhắc nợ đến ${customer.customer_name}?`,
      okText: 'Gửi',
      cancelText: 'Hủy',
      onOk: () => {
        message.success(`Đã gửi thông báo nhắc nợ đến ${customer.customer_name}`);
      }
    });
  };

  const handleViewDetail = (customer) => {
    setSelectedCustomer(customer);
    setIsDetailModalOpen(true);
  };

  const columns = [
    {
      title: 'Khách hàng',
      key: 'customer',
      width: 250,
      fixed: 'left',
      render: (_, record) => (
        <div>
          <Text strong>{record.customer_name}</Text>
          <br />
          <Space size="small">
            <PhoneOutlined style={{ fontSize: '11px' }} />
            <Text type="secondary" style={{ fontSize: '11px' }}>
              {record.customer_phone}
            </Text>
          </Space>
          <br />
          <Space size="small">
            <MailOutlined style={{ fontSize: '11px' }} />
            <Text type="secondary" style={{ fontSize: '11px' }}>
              {record.customer_email}
            </Text>
          </Space>
        </div>
      )
    },
    {
      title: 'Số đơn hàng',
      dataIndex: 'total_orders',
      key: 'total_orders',
      width: 100,
      align: 'center',
      render: (count) => <Badge count={count} showZero color="#1890ff" />
    },
    {
      title: 'Tổng giá trị',
      dataIndex: 'total_order_value',
      key: 'total_order_value',
      width: 150,
      sorter: (a, b) => a.total_order_value - b.total_order_value,
      render: (amount) => (
        <Text strong>{formatPrice(amount)}</Text>
      )
    },
    {
      title: 'Đã thanh toán',
      dataIndex: 'total_paid',
      key: 'total_paid',
      width: 150,
      render: (amount) => (
        <Text style={{ color: '#52c41a' }}>{formatPrice(amount)}</Text>
      )
    },
    {
      title: 'Còn nợ',
      dataIndex: 'remaining_debt',
      key: 'remaining_debt',
      width: 150,
      sorter: (a, b) => a.remaining_debt - b.remaining_debt,
      render: (amount) => (
        <Text strong style={{ color: amount > 0 ? '#f5222d' : '#52c41a' }}>
          {formatPrice(amount)}
        </Text>
      )
    },
    {
      title: 'Tiến độ thanh toán',
      dataIndex: 'payment_percentage',
      key: 'payment_percentage',
      width: 200,
      sorter: (a, b) => a.payment_percentage - b.payment_percentage,
      render: (percentage, record) => (
        <div>
          <Progress 
            percent={percentage} 
            size="small"
            status={
              percentage === 100 ? 'success' : 
              percentage >= 50 ? 'active' : 
              'exception'
            }
          />
          <Text style={{ fontSize: '11px' }}>
            {record.payment_count} lần thanh toán
          </Text>
        </div>
      )
    },
    {
      title: 'Thanh toán gần nhất',
      dataIndex: 'last_payment_date',
      key: 'last_payment_date',
      width: 120,
      render: (date) => date ? dayjs(date).format('DD/MM/YYYY') : <Text type="secondary">-</Text>
    },
    {
      title: 'Trạng thái',
      dataIndex: 'debt_status',
      key: 'debt_status',
      width: 150,
      fixed: 'right',
      filters: [
        { text: 'Đã thanh toán', value: 'paid' },
        { text: 'Thanh toán một phần', value: 'partial' },
        { text: 'Nợ cao', value: 'high_debt' },
        { text: 'Chưa thanh toán', value: 'unpaid' }
      ],
      onFilter: (value, record) => record.debt_status === value,
      render: (status) => {
        const info = getDebtStatusInfo(status);
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
      width: 80,
      fixed: 'right',
      align: 'center',
      render: (_, record) => {
        const items = [];

        if (record.remaining_debt > 0) {
          items.push({
            key: 'remind',
            icon: <WarningOutlined />,
            label: 'Nhắc nợ',
            onClick: () => handleRemind(record)
          });
        }

        items.push({
          key: 'view',
          icon: <FileTextOutlined />,
          label: 'Chi tiết',
          onClick: () => handleViewDetail(record)
        });

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
    <Spin spinning={loading} tip="Đang tải dữ liệu công nợ...">
      <div className="customer-debt-report-page">
      <div className="page-header" style={{ marginBottom: '24px' }}>
        <Title level={2}>
          <FileTextOutlined /> Báo cáo công nợ khách hàng
        </Title>
        <Text type="secondary">Theo dõi tình hình thanh toán và công nợ của khách hàng</Text>
      </div>

      {/* Statistics */}
      <Row gutter={16} style={{ marginBottom: '24px' }}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Tổng công nợ"
              value={totalDebt}
              formatter={(value) => formatPrice(value)}
              prefix={<DollarOutlined />}
              valueStyle={{ color: '#f5222d' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Đã thu"
              value={totalPaid}
              formatter={(value) => formatPrice(value)}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="KH còn nợ"
              value={customersWithDebt}
              prefix={<UserOutlined />}
              suffix={`/ ${customerDebts.length}`}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Nợ cao/Chưa TT"
              value={highDebtCustomers}
              prefix={<WarningOutlined />}
              valueStyle={{ color: '#f5222d' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Customer Debt Table */}
      <Card title="Chi tiết công nợ khách hàng">
        <Table
          columns={columns}
          dataSource={customerDebts}
          rowKey="id"
          scroll={{ x: 1500 }}
          pagination={{
            pageSize: 10,
            showTotal: (total) => `Tổng ${total} khách hàng`
          }}
        />
      </Card>

      {/* Detail Modal */}
      <Modal
        title={`Chi tiết công nợ - ${selectedCustomer?.customer_name}`}
        open={isDetailModalOpen}
        onCancel={() => setIsDetailModalOpen(false)}
        footer={[
          <Button key="close" onClick={() => setIsDetailModalOpen(false)}>
            Đóng
          </Button>
        ]}
        width={800}
      >
        {selectedCustomer && (
          <>
            <Card style={{ marginBottom: '24px', background: '#f0f5ff' }}>
              <Row gutter={16}>
                <Col span={6}>
                  <Statistic
                    title="Tổng giá trị"
                    value={selectedCustomer.total_order_value}
                    formatter={(value) => formatPrice(value)}
                    valueStyle={{ fontSize: '18px' }}
                  />
                </Col>
                <Col span={6}>
                  <Statistic
                    title="Đã thanh toán"
                    value={selectedCustomer.total_paid}
                    formatter={(value) => formatPrice(value)}
                    valueStyle={{ color: '#52c41a', fontSize: '18px' }}
                  />
                </Col>
                <Col span={6}>
                  <Statistic
                    title="Còn nợ"
                    value={selectedCustomer.remaining_debt}
                    formatter={(value) => formatPrice(value)}
                    valueStyle={{ color: '#f5222d', fontSize: '18px' }}
                  />
                </Col>
                <Col span={6}>
                  <Statistic
                    title="Số đơn hàng"
                    value={selectedCustomer.total_orders}
                    prefix={<FileTextOutlined />}
                  />
                </Col>
              </Row>
              <div style={{ marginTop: '16px' }}>
                <Text type="secondary">Tiến độ thanh toán: </Text>
                <Progress
                  percent={selectedCustomer.payment_percentage}
                  status={
                    selectedCustomer.payment_percentage === 100 ? 'success' : 
                    selectedCustomer.payment_percentage >= 50 ? 'active' : 
                    'exception'
                  }
                />
              </div>
            </Card>

            <Descriptions bordered column={2}>
              <Descriptions.Item label="Họ tên" span={2}>
                {selectedCustomer.customer_name}
              </Descriptions.Item>
              <Descriptions.Item label="Số điện thoại">
                {selectedCustomer.customer_phone}
              </Descriptions.Item>
              <Descriptions.Item label="Email">
                {selectedCustomer.customer_email}
              </Descriptions.Item>
              <Descriptions.Item label="Địa chỉ" span={2}>
                {selectedCustomer.customer_address}
              </Descriptions.Item>
              <Descriptions.Item label="Số lần thanh toán">
                {selectedCustomer.payment_count}
              </Descriptions.Item>
              <Descriptions.Item label="Thanh toán gần nhất">
                {selectedCustomer.last_payment_date 
                  ? dayjs(selectedCustomer.last_payment_date).format('DD/MM/YYYY HH:mm')
                  : '-'
                }
              </Descriptions.Item>
              <Descriptions.Item label="Trạng thái" span={2}>
                <Tag
                  icon={getDebtStatusInfo(selectedCustomer.debt_status).icon}
                  color={getDebtStatusInfo(selectedCustomer.debt_status).color}
                >
                  {getDebtStatusInfo(selectedCustomer.debt_status).text}
                </Tag>
              </Descriptions.Item>
            </Descriptions>

            {/* Payment Details Tabs */}
            {(selectedCustomer.straight_payments?.length > 0 || selectedCustomer.installment_plans?.length > 0) && (
              <Tabs defaultActiveKey={selectedCustomer.straight_payments?.length > 0 ? "straight" : "installment"} style={{ marginTop: '24px' }}>
                {selectedCustomer.straight_payments?.length > 0 && (
                  <TabPane tab={`Trả thẳng (${selectedCustomer.straight_payments.length})`} key="straight">
                    <Table
                      dataSource={selectedCustomer.straight_payments || []}
                      rowKey="id"
                      pagination={false}
                      size="small"
                      columns={[
                        {
                          title: 'Mã thanh toán',
                          dataIndex: 'id',
                          key: 'id',
                          render: (id) => <Text code>PAY{id.toString().padStart(6, '0')}</Text>
                        },
                        {
                          title: 'Mã đơn hàng',
                          dataIndex: 'orderId',
                          key: 'orderId',
                          render: (id) => <Text code>ORD{id.toString().padStart(4, '0')}</Text>
                        },
                        {
                          title: 'Số tiền',
                          dataIndex: 'amount',
                          key: 'amount',
                          render: (amount) => <Text strong>{formatPrice(amount)}</Text>
                        },
                        {
                          title: 'Tiền trả trước',
                          dataIndex: 'prepay',
                          key: 'prepay',
                          render: (amount) => formatPrice(amount || 0)
                        },
                        {
                          title: 'Phương thức',
                          dataIndex: 'paymentMethod',
                          key: 'paymentMethod',
                          render: (method) => <Tag color="green">{method}</Tag>
                        },
                        {
                          title: 'Trạng thái',
                          dataIndex: 'status',
                          key: 'status',
                          render: (status) => {
                            const info = getPaymentStatusInfo(status);
                            return <Tag icon={info.icon} color={info.color}>{info.text}</Tag>;
                          }
                        },
                        {
                          title: 'Ngày thanh toán',
                          dataIndex: 'paymentDate',
                          key: 'paymentDate',
                          render: (date) => dayjs(date).format('DD/MM/YYYY HH:mm')
                        }
                      ]}
                    />
                  </TabPane>
                )}

                {selectedCustomer.installment_plans?.length > 0 && (
                  <TabPane tab={`Trả góp (${selectedCustomer.installment_plans.length})`} key="installment">
                {selectedCustomer.installment_plans?.map((plan) => (
                  <Card 
                    key={plan.id}
                    size="small"
                    title={`Kế hoạch IP${plan.id.toString().padStart(4, '0')} - HĐ: ${plan.contractInfo?.id || 'N/A'}`}
                    style={{ marginBottom: '16px' }}
                  >
                    <Row gutter={16} style={{ marginBottom: '16px' }}>
                      <Col span={6}>
                        <Statistic
                          title="Tổng giá trị"
                          value={plan.principalAmount}
                          formatter={(value) => formatPrice(value)}
                          valueStyle={{ fontSize: '14px' }}
                        />
                      </Col>
                      <Col span={6}>
                        <Statistic
                          title="Tiền cọc"
                          value={plan.depositAmount}
                          formatter={(value) => formatPrice(value)}
                          valueStyle={{ color: '#52c41a', fontSize: '14px' }}
                        />
                      </Col>
                      <Col span={6}>
                        <Statistic
                          title="Đã thanh toán"
                          value={plan.totalPaid}
                          formatter={(value) => formatPrice(value)}
                          valueStyle={{ color: '#1890ff', fontSize: '14px' }}
                        />
                      </Col>
                      <Col span={6}>
                        <Statistic
                          title="Còn lại"
                          value={(plan.principalAmount - plan.depositAmount) - plan.totalPaid}
                          formatter={(value) => formatPrice(value)}
                          valueStyle={{ color: '#f5222d', fontSize: '14px' }}
                        />
                      </Col>
                    </Row>
                    
                    <div style={{ marginBottom: '16px' }}>
                      <Text type="secondary">Tiến độ: </Text>
                      <Progress
                        percent={Math.round((plan.totalPaid / (plan.principalAmount - plan.depositAmount)) * 100)}
                        status={plan.status === 'Completed' ? 'success' : 'active'}
                        size="small"
                      />
                    </div>

                    <Descriptions bordered column={2} size="small">
                      <Descriptions.Item label="Lãi suất">
                        {plan.interestRate}%
                      </Descriptions.Item>
                      <Descriptions.Item label="Phương thức">
                        {plan.interestMethod}
                      </Descriptions.Item>
                      <Descriptions.Item label="Trạng thái">
                        <Tag
                          icon={getInstallmentStatusInfo(plan.status).icon}
                          color={getInstallmentStatusInfo(plan.status).color}
                        >
                          {getInstallmentStatusInfo(plan.status).text}
                        </Tag>
                      </Descriptions.Item>
                      <Descriptions.Item label="Ngày tạo">
                        {dayjs(plan.createAt).format('DD/MM/YYYY')}
                      </Descriptions.Item>
                    </Descriptions>

                    {plan.items && plan.items.length > 0 && (
                      <>
                        <Text strong style={{ display: 'block', marginTop: '16px', marginBottom: '8px' }}>
                          Các kỳ thanh toán ({plan.items.length} kỳ):
                        </Text>
                        <Table
                          dataSource={plan.items}
                          rowKey="id"
                          pagination={false}
                          size="small"
                          columns={[
                            {
                              title: 'Kỳ',
                              dataIndex: 'installmentNo',
                              key: 'installmentNo',
                              width: 60,
                              render: (no) => <Text strong>Kỳ {no}</Text>
                            },
                            {
                              title: 'Hạn thanh toán',
                              dataIndex: 'dueDate',
                              key: 'dueDate',
                              render: (date) => dayjs(date).format('DD/MM/YYYY')
                            },
                            {
                              title: 'Số tiền',
                              dataIndex: 'amountDue',
                              key: 'amountDue',
                              render: (amount) => <Text strong>{formatPrice(amount)}</Text>
                            },
                            {
                              title: 'Đã trả',
                              dataIndex: 'amountPaid',
                              key: 'amountPaid',
                              render: (amount) => <Text style={{ color: '#52c41a' }}>{formatPrice(amount)}</Text>
                            },
                            {
                              title: 'Còn lại',
                              dataIndex: 'amountRemaining',
                              key: 'amountRemaining',
                              render: (amount) => <Text style={{ color: '#f5222d' }}>{formatPrice(amount)}</Text>
                            },
                            {
                              title: 'Trạng thái',
                              dataIndex: 'status',
                              key: 'status',
                              render: (status) => {
                                const info = getItemStatusInfo(status);
                                return <Tag icon={info.icon} color={info.color}>{info.text}</Tag>;
                              }
                            },
                            {
                              title: 'Ngày thanh toán',
                              dataIndex: 'paidDate',
                              key: 'paidDate',
                              render: (date) => date ? dayjs(date).format('DD/MM/YYYY') : '-'
                            }
                          ]}
                        />
                      </>
                    )}

                    {plan.payments && plan.payments.length > 0 && (
                      <>
                        <Text strong style={{ display: 'block', marginTop: '16px', marginBottom: '8px' }}>
                          Lịch sử thanh toán ({plan.payments.length} lần):
                        </Text>
                        <Table
                          dataSource={plan.payments}
                          rowKey="id"
                          pagination={false}
                          size="small"
                          columns={[
                            {
                              title: 'Mã thanh toán',
                              dataIndex: 'id',
                              key: 'id',
                              width: 120,
                              render: (id) => <Text code>PMT{id.toString().padStart(6, '0')}</Text>
                            },
                            {
                              title: 'Kỳ',
                              dataIndex: 'installmentItemId',
                              key: 'installmentItemId',
                              width: 80,
                              render: (itemId) => {
                                const item = plan.items?.find(i => i.id === itemId);
                                return item ? <Text>Kỳ {item.installmentNo}</Text> : '-';
                              }
                            },
                            {
                              title: 'Số tiền',
                              dataIndex: 'amountPaid',
                              key: 'amountPaid',
                              render: (amount) => <Text strong style={{ color: '#52c41a' }}>{formatPrice(amount)}</Text>
                            },
                            {
                              title: 'Phương thức',
                              dataIndex: 'paymentMethod',
                              key: 'paymentMethod',
                              render: (method) => <Tag color="green">{method}</Tag>
                            },
                            {
                              title: 'Trạng thái',
                              dataIndex: 'status',
                              key: 'status',
                              render: (status) => {
                                const info = getPaymentStatusInfo(status);
                                return <Tag icon={info.icon} color={info.color}>{info.text}</Tag>;
                              }
                            },
                            {
                              title: 'Ngày thanh toán',
                              dataIndex: 'paidDate',
                              key: 'paidDate',
                              render: (date) => dayjs(date).format('DD/MM/YYYY HH:mm')
                            },
                            {
                              title: 'Ghi chú',
                              dataIndex: 'note',
                              key: 'note',
                              ellipsis: true,
                              render: (note) => <Text type="secondary" style={{ fontSize: '12px' }}>{note || '-'}</Text>
                            }
                          ]}
                        />
                      </>
                    )}
                  </Card>
                ))}
                {(!selectedCustomer.installment_plans || selectedCustomer.installment_plans.length === 0) && (
                  <Text type="secondary">Không có kế hoạch trả góp</Text>
                )}
              </TabPane>
                )}
              </Tabs>
            )}
          </>
        )}
      </Modal>
    </div>
    </Spin>
  );
};

export default CustomerDebtReportPage;
