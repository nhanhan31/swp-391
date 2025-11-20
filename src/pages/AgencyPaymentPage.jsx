import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Row,
  Col,
  Typography,
  Tag,
  Statistic,
  Button,
  Modal,
  Form,
  Input,
  message,
  Descriptions,
  Spin,
  Upload,
  Select,
  InputNumber,
  Collapse,
  Progress,
  Space
} from 'antd';
import {
  DollarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  EyeOutlined,
  UploadOutlined,
  FileImageOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useAuth } from '../context/AuthContext';
import { installmentAPI, agencyContractAPI } from '../services/quotationService';

const { Title, Text } = Typography;
const { Panel } = Collapse;

const AgencyPaymentPage = () => {
  const { currentUser } = useAuth();
  const [installmentPlans, setInstallmentPlans] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('view');
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [selectedItemId, setSelectedItemId] = useState(null); // Store selected item ID
  const [form] = Form.useForm();
  const [paymentForm] = Form.useForm();
  const [paymentPreview, setPaymentPreview] = useState(null);

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      if (!currentUser?.agency?.id) {
        message.error('Không tìm thấy thông tin đại lý');
        return;
      }

      try {
        setLoading(true);

        // Fetch all contracts of this agency
        const contracts = await agencyContractAPI.getByAgencyId(currentUser.agency.id);
        console.log('📋 Contracts:', contracts);
        
        // Fetch all installment plans
        const allPlans = await installmentAPI.getAll();
        console.log('💳 All installment plans:', allPlans);
        
        // Filter plans that belong to agency's contracts
        const contractIds = contracts.map(c => c.id);
        console.log('🔑 Contract IDs:', contractIds);
        
        const agencyPlans = allPlans.filter(plan => contractIds.includes(plan.agencyContractId));
        console.log('✅ Filtered agency plans:', agencyPlans);
        
        // Fetch installment items for each plan
        const plansWithItems = await Promise.all(
          agencyPlans.map(async (plan) => {
            try {
              const items = await installmentAPI.getItemsByPlanId(plan.id);
              return { 
                ...plan, 
                items: items || [],
                totalPaid: plan.totalPaid || 0  // Ensure totalPaid is not null
              };
            } catch (error) {
              console.error(`Error fetching items for plan ${plan.id}:`, error);
              return { 
                ...plan, 
                items: [],
                totalPaid: plan.totalPaid || 0
              };
            }
          })
        );

        console.log('📦 Plans with items:', plansWithItems);
        setInstallmentPlans(plansWithItems);

      } catch (error) {
        console.error('Error fetching data:', error);
        message.error('Không thể tải dữ liệu');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [currentUser]);

  // Calculate statistics
  const stats = {
    total: installmentPlans.length,
    active: installmentPlans.filter(p => p.status === 'Active').length,
    completed: installmentPlans.filter(p => p.status === 'Completed').length,
    pending: installmentPlans.filter(p => p.status === 'Pending').length,
    totalValue: installmentPlans.reduce((sum, p) => sum + (p.principalAmount || 0), 0),
    totalPaid: installmentPlans.reduce((sum, p) => sum + (p.totalPaid || 0), 0),
    totalRemaining: installmentPlans.reduce((sum, p) => sum + ((p.principalAmount || 0) - (p.totalPaid || 0)), 0)
  };

  // Get installment status info
  const getInstallmentStatusInfo = (status) => {
    const statusMap = {
      Pending: { text: 'Chờ kích hoạt', color: 'orange', icon: <ClockCircleOutlined /> },
      Active: { text: 'Đang trả góp', color: 'blue', icon: <ClockCircleOutlined /> },
      Completed: { text: 'Hoàn thành', color: 'green', icon: <CheckCircleOutlined /> },
      Cancelled: { text: 'Đã hủy', color: 'red', icon: <CloseCircleOutlined /> }
    };
    return statusMap[status] || statusMap.Pending;
  };

  // Get item status info
  const getItemStatusInfo = (status) => {
    const statusMap = {
      Pending: { text: 'Chưa thanh toán', color: 'orange', icon: <ClockCircleOutlined /> },
      Partial: { text: 'Thanh toán một phần', color: 'blue', icon: <ClockCircleOutlined /> },
      Paid: { text: 'Đã thanh toán', color: 'green', icon: <CheckCircleOutlined /> },
      Overdue: { text: 'Quá hạn', color: 'red', icon: <CloseCircleOutlined /> }
    };
    return statusMap[status] || statusMap.Pending;
  };

  // Handle view
  const handleView = (record) => {
    setModalMode('view');
    setSelectedPlan(record);
    setIsModalOpen(true);
  };

  // Handle pay installment
  const handlePayInstallment = (plan) => {
    console.log('🎯 Opening payment modal for plan:', plan);
    setSelectedPlan(plan);
    setPaymentPreview(null);

    // Auto-select the first (and only) pending item
    const pendingItems = plan.items?.filter(item => 
      item.status === 'Pending' || item.status === 'Partial'
    ) || [];
    console.log('📋 Pending items:', pendingItems);
    
    // Reset form first
    paymentForm.resetFields();
    
    // Open modal
    setIsPaymentModalOpen(true);
    
    // Then set values after a short delay to ensure form is ready
    if (pendingItems.length > 0) {
      const firstPendingItem = pendingItems[0];
      const totalRemaining = (plan.principalAmount || 0) - (plan.totalPaid || 0);
      
      // Store selected item ID in state
      setSelectedItemId(firstPendingItem.id);
      console.log('💾 Stored selected item ID in state:', firstPendingItem.id);
      
      setTimeout(() => {
        // Use amountRemaining if available (for Partial status), otherwise use amountDue
        const amountToSet = firstPendingItem.amountRemaining || firstPendingItem.amountDue;
        
        paymentForm.setFieldsValue({
          amount: amountToSet,
          paymentMethod: 'BankTransfer'
        });
        
        console.log('✅ Selected item ID:', firstPendingItem.id);
        console.log('✅ Set form amount:', amountToSet);
        
        // Calculate initial preview
        calculatePaymentPreview(firstPendingItem.id, amountToSet, plan.items, totalRemaining);
      }, 100);
    } else {
      console.warn('⚠️ No pending items found!');
    }
  };

  // Calculate payment preview
  const calculatePaymentPreview = (selectedItemId, amount, items, totalRemaining) => {
    const selectedItem = items?.find(i => i.id === selectedItemId);
    if (!selectedItem) {
      setPaymentPreview(null);
      return;
    }

    const amountNum = parseFloat(amount) || 0;
    const preview = {
      selectedItem,
      paymentAmount: amountNum,
      itemDue: selectedItem.amountDue,
      totalRemaining,
      remainingAfterPayment: totalRemaining - amountNum,
      isFullPayment: amountNum >= selectedItem.amountDue,
      isPartialPayment: amountNum > 0 && amountNum < selectedItem.amountDue,
      isOverPayment: amountNum > selectedItem.amountDue
    };

    setPaymentPreview(preview);
  };

  // Handle amount change
  const handleAmountChange = (value) => {
    if (selectedItemId && selectedPlan) {
      const totalRemaining = (selectedPlan.principalAmount || 0) - (selectedPlan.totalPaid || 0);
      calculatePaymentPreview(selectedItemId, value, selectedPlan.items, totalRemaining);
    }
  };

  // Handle item selection change
  const handleItemSelectionChange = (itemId) => {
    const amount = paymentForm.getFieldValue('amount');
    if (selectedPlan) {
      const totalRemaining = selectedPlan.principalAmount - selectedPlan.totalPaid;
      calculatePaymentPreview(itemId, amount, selectedPlan.items, totalRemaining);

      // Auto-fill amount with item's amountDue
      const selectedItem = selectedPlan.items?.find(i => i.id === itemId);
      if (selectedItem) {
        paymentForm.setFieldsValue({ amount: selectedItem.amountDue });
      }
    }
  };

  // Submit installment payment
  const handleSubmitPayment = async () => {
    try {
      const values = await paymentForm.validateFields();
      console.log('💰 Payment form values:', values);
      console.log('🔑 Selected item ID from state:', selectedItemId);

      if (!selectedItemId) {
        message.warning('Không tìm thấy kỳ thanh toán');
        return;
      }

      if (!values.amount || values.amount <= 0) {
        message.warning('Vui lòng nhập số tiền thanh toán hợp lệ');
        return;
      }

      if (!paymentPreview) {
        message.warning('Vui lòng chọn kỳ thanh toán và nhập số tiền');
        return;
      }

      if (paymentPreview.isOverPayment) {
        message.warning('Số tiền thanh toán vượt quá số tiền cần thanh toán của kỳ này');
        return;
      }

      setLoading(true);

      // Process installment payment using selectedItemId from state
      const paymentData = {
        installmentPlanId: selectedPlan.id,
        installmentItemId: selectedItemId,
        amountPaid: values.amount,
        paymentMethod: values.paymentMethod || 'BankTransfer',
        note: values.note || ''
      };
      console.log('📤 Sending payment data:', paymentData);
      
      await installmentAPI.processPayment(paymentData);

      message.success('Thanh toán thành công!');
      setIsPaymentModalOpen(false);

      // Reload data
      const contracts = await agencyContractAPI.getByAgencyId(currentUser.agency.id);
      const allPlans = await installmentAPI.getAll();
      const contractIds = contracts.map(c => c.id);
      const agencyPlans = allPlans.filter(plan => contractIds.includes(plan.agencyContractId));
      
      const plansWithItems = await Promise.all(
        agencyPlans.map(async (plan) => {
          try {
            const items = await installmentAPI.getItemsByPlanId(plan.id);
            return { ...plan, items: items || [] };
          } catch (error) {
            return { ...plan, items: [] };
          }
        })
      );

      setInstallmentPlans(plansWithItems);
    } catch (error) {
      console.error('Error processing payment:', error);
      message.error('Lỗi khi thanh toán');
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(price || 0);
  };

  const columns = [
    {
      title: 'Mã kế hoạch',
      dataIndex: 'id',
      key: 'id',
      width: 120,
      render: (id) => <Text strong code>IP{id.toString().padStart(4, '0')}</Text>
    },
    {
      title: 'Mã HĐ',
      dataIndex: 'agencyContractId',
      key: 'agencyContractId',
      width: 100,
      render: (id) => <Text code>AC{id?.toString().padStart(4, '0')}</Text>
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
      width: 130,
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
      title: 'Còn lại',
      key: 'remaining',
      width: 150,
      render: (_, record) => {
        const remaining = (record.principalAmount || 0) - (record.totalPaid || 0);
        return (
          <Text strong style={{ color: remaining > 0 ? '#fa8c16' : '#52c41a' }}>
            {formatPrice(remaining)}
          </Text>
        );
      }
    },
    {
      title: 'Tiến độ',
      key: 'progress',
      width: 180,
      render: (_, record) => {
        const principalAmount = record.principalAmount || 0;
        const totalPaid = record.totalPaid || 0;
        const percent = principalAmount > 0 
          ? Math.round((totalPaid / principalAmount) * 100) 
          : 0;
        return (
          <Progress
            percent={percent}
            size="small"
            status={percent === 100 ? 'success' : 'active'}
            strokeColor={percent === 100 ? '#52c41a' : '#1890ff'}
          />
        );
      }
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 130,
      render: (status) => {
        const statusInfo = getInstallmentStatusInfo(status);
        return <Tag color={statusInfo.color} icon={statusInfo.icon}>{statusInfo.text}</Tag>;
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
      title: 'Hạn thanh toán',
      key: 'dueDate',
      width: 120,
      render: (_, record) => {
        const firstItem = record.items?.[0];
        if (!firstItem?.dueDate) return '-';
        return dayjs(firstItem.dueDate).format('DD/MM/YYYY');
      }
    },
    {
      title: 'Thao tác',
      key: 'actions',
      fixed: 'right',
      width: 150,
      align: 'center',
      render: (_, record) => (
        <Space>
          <Button
            type="link"
            icon={<EyeOutlined />}
            onClick={() => handleView(record)}
          >
            Xem
          </Button>
          {(record.status === 'Active' || record.status === 'Pending') && 
           (record.principalAmount || 0) > (record.totalPaid || 0) && (
            <Button
              type="primary"
              size="small"
              icon={<DollarOutlined />}
              onClick={() => handlePayInstallment(record)}
            >
              Thanh toán
            </Button>
          )}
        </Space>
      )
    }
  ];

  if (loading) {
    return (
      <div style={{ padding: '100px 24px 24px 24px', textAlign: 'center' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px' }}>
        <Title level={2}>
          <DollarOutlined /> Quản lý thanh toán đơn hàng
        </Title>
        <Text type="secondary">Theo dõi và thanh toán các đơn nhập xe từ VinFast</Text>
      </div>

      <Row gutter={16} style={{ marginBottom: '24px' }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Tổng kế hoạch"
              value={stats.total}
              prefix={<DollarOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Đang trả góp"
              value={stats.active}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Hoàn thành"
              value={stats.completed}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Chờ kích hoạt"
              value={stats.pending}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#fa8c16' }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={16} style={{ marginBottom: '24px' }}>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="Tổng giá trị"
              value={stats.totalValue}
              formatter={(value) => formatPrice(value)}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="Đã thanh toán"
              value={stats.totalPaid}
              formatter={(value) => formatPrice(value)}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="Còn phải trả"
              value={stats.totalRemaining}
              formatter={(value) => formatPrice(value)}
              valueStyle={{ color: '#fa8c16' }}
            />
          </Card>
        </Col>
      </Row>

      <Card title="Danh sách kế hoạch trả góp">
        <Table
          columns={columns}
          dataSource={installmentPlans}
          rowKey="id"
          scroll={{ x: 1300 }}
          pagination={{
            pageSize: 10,
            showTotal: (total) => `Tổng ${total} kế hoạch`
          }}
        />
      </Card>

      <Modal
        title="Chi tiết kế hoạch trả góp"
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        width={800}
        footer={[
          <Button key="close" type="primary" onClick={() => setIsModalOpen(false)}>
            Đóng
          </Button>
        ]}
      >
        <Descriptions bordered column={2} style={{ marginBottom: 16 }}>
          <Descriptions.Item label="Mã kế hoạch" span={1}>
            <Text strong code>IP{selectedPlan?.id.toString().padStart(4, '0')}</Text>
          </Descriptions.Item>
          <Descriptions.Item label="Mã hợp đồng" span={1}>
            <Text code>AC{selectedPlan?.agencyContractId?.toString().padStart(4, '0')}</Text>
          </Descriptions.Item>
          <Descriptions.Item label="Tổng giá trị" span={1}>
            <Text strong style={{ fontSize: '16px' }}>
              {formatPrice(selectedPlan?.principalAmount)}
            </Text>
          </Descriptions.Item>
          <Descriptions.Item label="Tiền cọc" span={1}>
            <Text style={{ color: '#52c41a' }}>
              {formatPrice(selectedPlan?.depositAmount)}
            </Text>
          </Descriptions.Item>
          <Descriptions.Item label="Đã thanh toán" span={1}>
            <Text style={{ color: '#1890ff', fontSize: '16px' }}>
              {formatPrice(selectedPlan?.totalPaid)}
            </Text>
          </Descriptions.Item>
          <Descriptions.Item label="Còn lại" span={1}>
            <Text strong style={{ color: '#fa8c16', fontSize: '16px' }}>
              {formatPrice((selectedPlan?.principalAmount || 0) - (selectedPlan?.totalPaid || 0))}
            </Text>
          </Descriptions.Item>
          <Descriptions.Item label="Lãi suất" span={1}>
            {selectedPlan?.interestRate}% / {selectedPlan?.interestMethod}
          </Descriptions.Item>
          <Descriptions.Item label="Trạng thái" span={1}>
            {selectedPlan && (() => {
              const statusInfo = getInstallmentStatusInfo(selectedPlan.status);
              return <Tag color={statusInfo.color} icon={statusInfo.icon}>{statusInfo.text}</Tag>;
            })()}
          </Descriptions.Item>
          <Descriptions.Item label="Ngày tạo" span={2}>
            {dayjs(selectedPlan?.createAt).format('DD/MM/YYYY HH:mm')}
          </Descriptions.Item>
          {selectedPlan?.note && (
            <Descriptions.Item label="Ghi chú" span={2}>
              {selectedPlan.note}
            </Descriptions.Item>
          )}
        </Descriptions>

        <Title level={5}>Danh sách kỳ thanh toán</Title>
        <Collapse accordion>
          {selectedPlan?.items?.map((item) => {
            const statusInfo = getItemStatusInfo(item.status);
            return (
              <Panel
                key={item.id}
                header={
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text strong>Kỳ {item.installmentNo}</Text>
                    <Space>
                      <Text>{formatPrice(item.amountDue)}</Text>
                      <Tag color={statusInfo.color} icon={statusInfo.icon}>
                        {statusInfo.text}
                      </Tag>
                    </Space>
                  </div>
                }
              >
                <Descriptions bordered column={2} size="small">
                  <Descriptions.Item label="Số tiền" span={2}>
                    <Text strong style={{ fontSize: '16px', color: '#1890ff' }}>
                      {formatPrice(item.amountDue)}
                    </Text>
                  </Descriptions.Item>
                  <Descriptions.Item label="Đã thanh toán" span={1}>
                    <Text style={{ color: '#52c41a' }}>
                      {formatPrice(selectedPlan?.totalPaid)}
                    </Text>
                  </Descriptions.Item>
                  <Descriptions.Item label="Còn lại" span={1}>
                    <Text strong style={{ color: '#fa8c16' }}>
                      {formatPrice((selectedPlan?.principalAmount || 0) - (selectedPlan?.totalPaid || 0))}
                    </Text>
                  </Descriptions.Item>
                  <Descriptions.Item label="Tỷ lệ" span={1}>
                    {item.percentage}%
                  </Descriptions.Item>
                  <Descriptions.Item label="Hạn thanh toán" span={1}>
                    <Text type={dayjs(item.dueDate).isBefore(dayjs()) && item.status === 'Pending' ? 'danger' : undefined}>
                      {dayjs(item.dueDate).format('DD/MM/YYYY')}
                    </Text>
                  </Descriptions.Item>
                  <Descriptions.Item label="Gốc" span={1}>
                    {formatPrice(item.principalComponent)}
                  </Descriptions.Item>
                  <Descriptions.Item label="Lãi" span={1}>
                    {formatPrice(item.interestComponent)}
                  </Descriptions.Item>
                  {item.feeComponent > 0 && (
                    <Descriptions.Item label="Phí" span={2}>
                      {formatPrice(item.feeComponent)}
                    </Descriptions.Item>
                  )}
                  {item.note && (
                    <Descriptions.Item label="Ghi chú" span={2}>
                      {item.note}
                    </Descriptions.Item>
                  )}
                </Descriptions>
              </Panel>
            );
          })}
        </Collapse>
      </Modal>

      <Modal
        title="Thanh toán trả góp"
        open={isPaymentModalOpen}
        onCancel={() => setIsPaymentModalOpen(false)}
        width={700}
        footer={[
          <Button key="cancel" onClick={() => setIsPaymentModalOpen(false)}>
            Hủy
          </Button>,
          <Button key="submit" type="primary" onClick={handleSubmitPayment} loading={loading}>
            Xác nhận thanh toán
          </Button>
        ]}
      >
        <Descriptions bordered column={1} style={{ marginBottom: 16 }}>
          <Descriptions.Item label="Mã kế hoạch">
            <Text strong code>IP{selectedPlan?.id.toString().padStart(4, '0')}</Text>
          </Descriptions.Item>
          <Descriptions.Item label="Tổng giá trị">
            <Text strong>{formatPrice(selectedPlan?.principalAmount)}</Text>
          </Descriptions.Item>
          <Descriptions.Item label="Đã thanh toán">
            <Text style={{ color: '#52c41a' }}>{formatPrice(selectedPlan?.totalPaid)}</Text>
          </Descriptions.Item>
          <Descriptions.Item label="Còn lại">
            <Text strong style={{ color: '#fa8c16', fontSize: '16px' }}>
              {formatPrice((selectedPlan?.principalAmount || 0) - (selectedPlan?.totalPaid || 0))}
            </Text>
          </Descriptions.Item>
        </Descriptions>

        <Form form={paymentForm} layout="vertical">
          <Form.Item
            name="amount"
            label="Số tiền thanh toán"
            rules={[
              { required: true, message: 'Vui lòng nhập số tiền' },
              { type: 'number', min: 1, message: 'Số tiền phải lớn hơn 0' }
            ]}
          >
            <InputNumber
              style={{ width: '100%' }}
              formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={value => value.replace(/\$\s?|(,*)/g, '')}
              placeholder="Nhập số tiền thanh toán"
              onChange={handleAmountChange}
            />
          </Form.Item>

          <Form.Item
            name="paymentMethod"
            label="Phương thức thanh toán"
            initialValue="BankTransfer"
          >
            <Select>
              <Select.Option value="BankTransfer">Chuyển khoản</Select.Option>
              <Select.Option value="Cash">Tiền mặt</Select.Option>
              <Select.Option value="Card">Thẻ</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="note"
            label="Ghi chú"
          >
            <Input.TextArea rows={3} placeholder="Nhập ghi chú (nếu có)" />
          </Form.Item>

          {paymentPreview && (
            <Card
              title="Xem trước thanh toán"
              size="small"
              style={{
                backgroundColor: paymentPreview.isOverPayment ? '#fff2e8' : '#f6ffed',
                borderColor: paymentPreview.isOverPayment ? '#ffbb96' : '#b7eb8f'
              }}
            >
              <Space direction="vertical" style={{ width: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Text>Kỳ thanh toán:</Text>
                  <Text strong>Kỳ {paymentPreview.selectedItem.installmentNo}</Text>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Text>Số tiền kỳ này:</Text>
                  <Text strong>{formatPrice(paymentPreview.itemDue)}</Text>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Text>Số tiền thanh toán:</Text>
                  <Text strong style={{ color: '#1890ff', fontSize: '16px' }}>
                    {formatPrice(paymentPreview.paymentAmount)}
                  </Text>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Text>Còn lại sau thanh toán:</Text>
                  <Text strong style={{ color: '#fa8c16' }}>
                    {formatPrice(paymentPreview.remainingAfterPayment)}
                  </Text>
                </div>
                {paymentPreview.isFullPayment && (
                  <Tag color="success" icon={<CheckCircleOutlined />}>
                    Thanh toán đủ kỳ này
                  </Tag>
                )}
                {paymentPreview.isPartialPayment && (
                  <Tag color="warning" icon={<ClockCircleOutlined />}>
                    Thanh toán một phần
                  </Tag>
                )}
                {paymentPreview.isOverPayment && (
                  <Tag color="error" icon={<CloseCircleOutlined />}>
                    Số tiền vượt quá kỳ này
                  </Tag>
                )}
              </Space>
            </Card>
          )}
        </Form>
      </Modal>
    </div>
  );
};

export default AgencyPaymentPage;
