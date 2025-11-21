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
  message,
  Progress,
  Descriptions,
  Spin,
  Collapse,
  Space,
  Empty
} from 'antd';
import {
  DollarOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  EyeOutlined,
  PayCircleOutlined,
  CalendarOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { installmentAPI, agencyContractAPI, agencyAPI } from '../services/quotationService';
import { useAuth } from '../context/AuthContext';

const { Title, Text } = Typography;
const { Panel } = Collapse;

const AgencyDebtPage = () => {
  const { currentUser, isDealerManager, getAgencyId } = useAuth();
  const [installmentPlans, setInstallmentPlans] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [agenciesMap, setAgenciesMap] = useState({});

  // Fetch data from API
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        const isManager = isDealerManager();
        const userAgencyId = getAgencyId();

        // Fetch agencies based on role
        let agencies = [];
        if (isManager && userAgencyId) {
          // Agency Manager: only their agency
          const agency = await agencyAPI.getById(userAgencyId);
          agencies = [agency];
        } else {
          // Admin or other roles: all agencies
          agencies = await agencyAPI.getAll();
        }
        const agencyMap = {};
        agencies.forEach(agency => {
          agencyMap[agency.id] = agency;
        });
        setAgenciesMap(agencyMap);

        // Fetch all contracts from all agencies
        const allContracts = [];
        for (const agency of agencies) {
          try {
            const response = await agencyContractAPI.getByAgencyId(agency.id);
            console.log(`📋 Contracts for agency ${agency.id}:`, response);
            
            // Handle both array and single object response
            let contracts = [];
            if (Array.isArray(response)) {
              contracts = response;
            } else if (response && typeof response === 'object') {
              // Single contract object
              contracts = [response];
            }
            
            if (contracts.length > 0) {
              allContracts.push(...contracts.map(c => ({ ...c, agencyId: agency.id })));
            }
          } catch (error) {
            console.warn(`Warning: Could not fetch contracts for agency ${agency.id}`, error);
          }
        }
        console.log('📋 All contracts collected:', allContracts);
        
        // Fetch all installment plans
        const allPlans = await installmentAPI.getAll();
        
        // Filter plans that have agencyContractId (not contractId - which is for customers)
        const agencyPlans = allPlans.filter(plan => plan.agencyContractId);
        
        // Fetch installment items for each plan
        const plansWithItems = await Promise.all(
          agencyPlans.map(async (plan) => {
            try {
              const items = await installmentAPI.getItemsByPlanId(plan.id);
              // Match contract by ID (agencyContractId refers to contract.id)
              const contract = allContracts.find(c => c.id === plan.agencyContractId);
              
              return { 
                ...plan, 
                items: items || [],
                totalPaid: plan.totalPaid || 0,
                contract: contract,
                agencyId: contract?.agencyId,
                contractNumber: contract?.contractNumber
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

        console.log('📦 Agency installment plans:', plansWithItems);
        
        // Filter plans for Agency Manager - only show their agency's data
        let filteredPlans = plansWithItems;
        if (isManager && userAgencyId) {
          console.log('👤 User agency ID:', userAgencyId, 'Type:', typeof userAgencyId);
          console.log('📋 All contracts:', allContracts);
          
          // Find all contract IDs belonging to this agency
          const agencyContractIds = allContracts
            .filter(c => {
              console.log(`Comparing contract ${c.id}: c.agencyId=${c.agencyId} (${typeof c.agencyId}) vs userAgencyId=${userAgencyId} (${typeof userAgencyId})`);
              return c.agencyId == userAgencyId; // Use == for type coercion
            })
            .map(c => c.id);
          console.log('🔍 Agency contract IDs:', agencyContractIds);
          
          // Filter plans by agencyContractId
          filteredPlans = plansWithItems.filter(plan => 
            agencyContractIds.includes(plan.agencyContractId)
          );
          console.log(`🔒 Filtered plans for agency ${userAgencyId}:`, filteredPlans);
        }
        
        setInstallmentPlans(filteredPlans);

      } catch (error) {
        console.error('Error fetching data:', error);
        message.error('Không thể tải dữ liệu công nợ');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [currentUser, isDealerManager, getAgencyId]);

  // Process debt data from installment plans
  const debtData = installmentPlans.map(plan => {
    const agency = agenciesMap[plan.agencyId];
    const principalAmount = plan.principalAmount || 0;
    const depositAmount = plan.depositAmount || 0;
    const totalPaid = plan.totalPaid || 0;
    const totalDebt = principalAmount - depositAmount; // Total debt after deposit
    const remaining = totalDebt - totalPaid;
    const paymentRate = totalDebt > 0 ? Math.round((totalPaid / totalDebt) * 100) : 0;
    
    // Find nearest due date from items
    const pendingItems = plan.items?.filter(item => 
      item.status === 'Pending' || item.status === 'Partial'
    ) || [];
    
    const nearestDueDate = pendingItems.length > 0 
      ? pendingItems.sort((a, b) => dayjs(a.dueDate).diff(dayjs(b.dueDate)))[0].dueDate
      : null;
    
    const daysUntilDue = nearestDueDate ? dayjs(nearestDueDate).diff(dayjs(), 'day') : null;
    
    // Determine status
    let status = plan.status;
    if (status === 'Completed') {
      status = 'paid';
    } else if (remaining === 0) {
      status = 'paid';
    } else if (totalPaid > 0 && remaining > 0) {
      if (daysUntilDue !== null && daysUntilDue < 0) {
        status = 'overdue';
      } else if (daysUntilDue !== null && daysUntilDue <= 7) {
        status = 'due_soon';
      } else {
        status = 'partial';
      }
    } else {
      if (daysUntilDue !== null && daysUntilDue < 0) {
        status = 'overdue';
      } else if (daysUntilDue !== null && daysUntilDue <= 7) {
        status = 'due_soon';
      } else {
        status = 'pending';
      }
    }

    return {
      id: plan.id,
      agency_id: plan.agencyId,
      agency_name: agency?.agencyName || 'Chưa xác định',
      agency_location: agency?.location || '',
      contract_number: plan.contractNumber || `AC${plan.agencyContractId?.toString().padStart(4, '0')}`,
      debt_amount: totalDebt,
      paid_amount: totalPaid,
      remaining_amount: remaining,
      deposit_amount: depositAmount,
      due_date: nearestDueDate,
      payment_rate: paymentRate,
      days_until_due: daysUntilDue,
      status,
      plan: plan,
      created_at: plan.createAt,
      updated_at: plan.updateAt
    };
  }).sort((a, b) => {
    // Sort by status priority (overdue first) then by days until due
    const statusPriority = { overdue: 0, due_soon: 1, partial: 2, pending: 3, paid: 4 };
    const aPriority = statusPriority[a.status] || 5;
    const bPriority = statusPriority[b.status] || 5;
    
    if (aPriority !== bPriority) {
      return aPriority - bPriority;
    }
    
    if (a.days_until_due === null) return 1;
    if (b.days_until_due === null) return -1;
    return a.days_until_due - b.days_until_due;
  });

  const totalDebt = debtData.reduce((sum, d) => sum + d.debt_amount, 0);
  const totalPaid = debtData.reduce((sum, d) => sum + d.paid_amount, 0);
  const totalRemaining = debtData.reduce((sum, d) => sum + d.remaining_amount, 0);
  const overdueCount = debtData.filter(d => d.status === 'overdue').length;
  const dueSoonCount = debtData.filter(d => d.status === 'due_soon').length;
  const paidCount = debtData.filter(d => d.status === 'paid').length;

  // Handle view detail
  const handleView = (record) => {
    setSelectedPlan(record.plan);
    setIsModalOpen(true);
  };

  // Get installment status info
  const getInstallmentStatusInfo = (status) => {
    const statusMap = {
      Pending: { text: 'Chờ kích hoạt', color: 'orange', icon: <ClockCircleOutlined /> },
      Active: { text: 'Đang trả góp', color: 'blue', icon: <ClockCircleOutlined /> },
      Completed: { text: 'Hoàn thành', color: 'green', icon: <CheckCircleOutlined /> },
      Cancelled: { text: 'Đã hủy', color: 'red', icon: <ExclamationCircleOutlined /> }
    };
    return statusMap[status] || statusMap.Pending;
  };

  // Get item status info
  const getItemStatusInfo = (status) => {
    const statusMap = {
      Pending: { text: 'Chưa thanh toán', color: 'orange', icon: <ClockCircleOutlined /> },
      Partial: { text: 'Thanh toán một phần', color: 'blue', icon: <ClockCircleOutlined /> },
      Paid: { text: 'Đã thanh toán', color: 'green', icon: <CheckCircleOutlined /> },
      Overdue: { text: 'Quá hạn', color: 'red', icon: <ExclamationCircleOutlined /> }
    };
    return statusMap[status] || statusMap.Pending;
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(price || 0);
  };

  const statusMeta = (status) => {
    switch (status) {
      case 'paid':
        return { color: 'green', text: 'Đã thanh toán', icon: <CheckCircleOutlined /> };
      case 'partial':
        return { color: 'blue', text: 'Thanh toán 1 phần', icon: <ClockCircleOutlined /> };
      case 'due_soon':
        return { color: 'orange', text: 'Sắp đến hạn', icon: <WarningOutlined /> };
      case 'overdue':
        return { color: 'red', text: 'Quá hạn', icon: <ExclamationCircleOutlined /> };
      default:
        return { color: 'default', text: 'Chưa thanh toán', icon: <ClockCircleOutlined /> };
    }
  };

  const columns = [
    {
      title: 'Đại lý',
      dataIndex: 'agency_name',
      key: 'agency_name',
      width: 200,
      render: (text, record) => (
        <div>
          <Text strong>{text}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: '12px' }}>{record.agency_location}</Text>
        </div>
      )
    },
    {
      title: 'Số HĐ',
      dataIndex: 'contract_number',
      key: 'contract_number',
      width: 120,
      render: (text) => <Text style={{ color: '#1890ff' }}>{text}</Text>
    },
    {
      title: 'Tổng công nợ',
      dataIndex: 'debt_amount',
      key: 'debt_amount',
      width: 150,
      render: (amount) => (
        <Text strong style={{ color: '#ff4d4f' }}>
          {formatPrice(amount)}
        </Text>
      ),
      sorter: (a, b) => a.debt_amount - b.debt_amount
    },
    {
      title: 'Tiền cọc',
      dataIndex: 'deposit_amount',
      key: 'deposit_amount',
      width: 130,
      render: (amount) => (
        <Text style={{ color: '#52c41a' }}>
          {formatPrice(amount)}
        </Text>
      )
    },
    {
      title: 'Đã thanh toán',
      dataIndex: 'paid_amount',
      key: 'paid_amount',
      width: 150,
      render: (amount) => (
        <Text style={{ color: '#52c41a' }}>
          {formatPrice(amount)}
        </Text>
      )
    },
    {
      title: 'Còn lại',
      dataIndex: 'remaining_amount',
      key: 'remaining_amount',
      width: 150,
      render: (amount) => (
        <Text strong style={{ color: '#fa8c16' }}>
          {formatPrice(amount)}
        </Text>
      ),
      sorter: (a, b) => a.remaining_amount - b.remaining_amount
    },
    {
      title: 'Tiến độ',
      key: 'progress',
      width: 150,
      render: (_, record) => (
        <Progress
          percent={record.payment_rate}
          size="small"
          status={record.payment_rate === 100 ? 'success' : record.status === 'overdue' ? 'exception' : 'active'}
        />
      )
    },
    {
      title: 'Hạn thanh toán',
      dataIndex: 'due_date',
      key: 'due_date',
      width: 130,
      render: (date, record) => {
        if (!date) return <Text type="secondary">-</Text>;
        return (
          <div>
            <Text>{dayjs(date).format('DD/MM/YYYY')}</Text>
            <br />
            {record.days_until_due !== null && (
              record.days_until_due >= 0 ? (
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  Còn {record.days_until_due} ngày
                </Text>
              ) : (
                <Text type="danger" style={{ fontSize: '12px' }}>
                  Quá hạn {Math.abs(record.days_until_due)} ngày
                </Text>
              )
            )}
          </div>
        );
      }
    },
    {
      title: 'Trạng thái',
      key: 'status',
      width: 150,
      render: (_, record) => {
        const meta = statusMeta(record.status);
        return <Tag color={meta.color} icon={meta.icon}>{meta.text}</Tag>;
      }
    },
    {
      title: 'Thao tác',
      key: 'actions',
      width: 100,
      align: 'center',
      render: (_, record) => (
        <Button
          type="link"
          icon={<EyeOutlined />}
          onClick={() => handleView(record)}
        >
          Chi tiết
        </Button>
      )
    }
  ];

  return (
    <Spin spinning={loading} tip="Đang tải dữ liệu công nợ...">
      <div className="agency-debt-page">
        <div className="page-header" style={{ marginBottom: '24px' }}>
          <div>
            <Title level={2}>
              <DollarOutlined /> Quản lý công nợ đại lý
            </Title>
            <Text type="secondary">Theo dõi công nợ và thanh toán của các đại lý</Text>
          </div>
        </div>

      <Row gutter={16} style={{ marginBottom: '24px' }}>
        <Col xs={24} sm={12} md={8} lg={4}>
          <Card>
            <Statistic
              title="Tổng công nợ"
              value={totalDebt}
              prefix={<DollarOutlined />}
              valueStyle={{ color: '#ff4d4f' }}
              formatter={(value) => new Intl.NumberFormat('vi-VN').format(value)}
              suffix="₫"
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={4}>
          <Card>
            <Statistic
              title="Đã thu"
              value={totalPaid}
              prefix={<PayCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
              formatter={(value) => new Intl.NumberFormat('vi-VN').format(value)}
              suffix="₫"
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={4}>
          <Card>
            <Statistic
              title="Còn phải thu"
              value={totalRemaining}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#fa8c16' }}
              formatter={(value) => new Intl.NumberFormat('vi-VN').format(value)}
              suffix="₫"
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={4}>
          <Card>
            <Statistic
              title="Quá hạn"
              value={overdueCount}
              prefix={<ExclamationCircleOutlined />}
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={4}>
          <Card>
            <Statistic
              title="Sắp đến hạn"
              value={dueSoonCount}
              prefix={<WarningOutlined />}
              valueStyle={{ color: '#fa8c16' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={4}>
          <Card>
            <Statistic
              title="Đã hoàn thành"
              value={paidCount}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
      </Row>

      <Card title="Danh sách công nợ">
        <Table
          columns={columns}
          dataSource={debtData}
          rowKey="id"
          scroll={{ x: 1400 }}
          pagination={{
            pageSize: 10,
            showTotal: (total) => `Tổng ${total} khoản công nợ`
          }}
        />
      </Card>

      {/* Detail Modal */}
      <Modal
        title="Chi tiết công nợ"
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        width={900}
        footer={[
          <Button key="close" type="primary" onClick={() => setIsModalOpen(false)}>
            Đóng
          </Button>
        ]}
      >
        {selectedPlan ? (
          <>
            <Descriptions bordered column={2} style={{ marginBottom: 16 }}>
              <Descriptions.Item label="Mã kế hoạch" span={1}>
                <Text strong code>IP{selectedPlan.id?.toString().padStart(4, '0')}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Mã hợp đồng" span={1}>
                <Text code>AC{selectedPlan.agencyContractId?.toString().padStart(4, '0')}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Đại lý" span={2}>
                <Text strong>{agenciesMap[selectedPlan.agencyId]?.agencyName}</Text>
                {' - '}
                <Text type="secondary">{agenciesMap[selectedPlan.agencyId]?.location}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Tổng giá trị" span={1}>
                <Text strong style={{ fontSize: '16px' }}>
                  {formatPrice(selectedPlan.principalAmount)}
                </Text>
              </Descriptions.Item>
              <Descriptions.Item label="Tiền cọc" span={1}>
                <Text style={{ color: '#52c41a' }}>
                  {formatPrice(selectedPlan.depositAmount)}
                </Text>
              </Descriptions.Item>
              <Descriptions.Item label="Tổng công nợ" span={1}>
                <Text strong style={{ color: '#ff4d4f', fontSize: '16px' }}>
                  {formatPrice((selectedPlan.principalAmount || 0) - (selectedPlan.depositAmount || 0))}
                </Text>
              </Descriptions.Item>
              <Descriptions.Item label="Đã thanh toán" span={1}>
                <Text style={{ color: '#1890ff', fontSize: '16px' }}>
                  {formatPrice(selectedPlan.totalPaid)}
                </Text>
              </Descriptions.Item>
              <Descriptions.Item label="Còn lại" span={1}>
                <Text strong style={{ color: '#fa8c16', fontSize: '16px' }}>
                  {formatPrice((selectedPlan.principalAmount || 0) - (selectedPlan.depositAmount || 0) - (selectedPlan.totalPaid || 0))}
                </Text>
              </Descriptions.Item>
              <Descriptions.Item label="Tiến độ" span={1}>
                <Progress
                  percent={Math.round(((selectedPlan.totalPaid || 0) / ((selectedPlan.principalAmount || 1) - (selectedPlan.depositAmount || 0))) * 100)}
                  size="small"
                  status={selectedPlan.status === 'Completed' ? 'success' : 'active'}
                />
              </Descriptions.Item>
              <Descriptions.Item label="Lãi suất" span={1}>
                {selectedPlan.interestRate}% / {selectedPlan.interestMethod}
              </Descriptions.Item>
              <Descriptions.Item label="Trạng thái" span={1}>
                {(() => {
                  const statusInfo = getInstallmentStatusInfo(selectedPlan.status);
                  return <Tag color={statusInfo.color} icon={statusInfo.icon}>{statusInfo.text}</Tag>;
                })()}
              </Descriptions.Item>
              <Descriptions.Item label="Ngày tạo" span={2}>
                {dayjs(selectedPlan.createAt).format('DD/MM/YYYY HH:mm')}
              </Descriptions.Item>
              {selectedPlan.note && (
                <Descriptions.Item label="Ghi chú" span={2}>
                  {selectedPlan.note}
                </Descriptions.Item>
              )}
            </Descriptions>

            <Title level={5} style={{ marginTop: 24, marginBottom: 16 }}>
              <CalendarOutlined /> Danh sách kỳ thanh toán
            </Title>
            {selectedPlan.items && selectedPlan.items.length > 0 ? (
              <Collapse accordion>
                {selectedPlan.items.map((item) => {
                  const statusInfo = getItemStatusInfo(item.status);
                  return (
                    <Panel
                      key={item.id}
                      header={
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Space>
                            <Text strong>Kỳ {item.installmentNo}</Text>
                            <Tag color={statusInfo.color} icon={statusInfo.icon}>
                              {statusInfo.text}
                            </Tag>
                          </Space>
                          <Space>
                            <Text>Hạn: {dayjs(item.dueDate).format('DD/MM/YYYY')}</Text>
                            <Text strong style={{ color: item.status === 'Paid' ? '#52c41a' : '#ff4d4f' }}>
                              {formatPrice(item.amountDue)}
                            </Text>
                          </Space>
                        </div>
                      }
                    >
                      <Descriptions bordered column={2} size="small">
                        <Descriptions.Item label="Số tiền" span={1}>
                          <Text strong style={{ fontSize: '16px', color: '#1890ff' }}>
                            {formatPrice(item.amountDue)}
                          </Text>
                        </Descriptions.Item>
                        <Descriptions.Item label="Tỷ lệ" span={1}>
                          {item.percentage}%
                        </Descriptions.Item>
                        <Descriptions.Item label="Đã thanh toán" span={1}>
                          <Text style={{ color: '#52c41a' }}>
                            {formatPrice(item.amountPaid || 0)}
                          </Text>
                        </Descriptions.Item>
                        <Descriptions.Item label="Còn lại" span={1}>
                          <Text strong style={{ color: '#fa8c16' }}>
                            {formatPrice(item.amountRemaining || item.amountDue)}
                          </Text>
                        </Descriptions.Item>
                        <Descriptions.Item label="Hạn thanh toán" span={1}>
                          <Text type={dayjs(item.dueDate).isBefore(dayjs()) && item.status === 'Pending' ? 'danger' : undefined}>
                            {dayjs(item.dueDate).format('DD/MM/YYYY')}
                          </Text>
                        </Descriptions.Item>
                        <Descriptions.Item label="Trạng thái" span={1}>
                          <Tag color={statusInfo.color} icon={statusInfo.icon}>
                            {statusInfo.text}
                          </Tag>
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
                  );
                })}
              </Collapse>
            ) : (
              <Empty description="Chưa có kỳ thanh toán nào" />
            )}
          </>
        ) : (
          <Empty description="Không có dữ liệu" />
        )}
      </Modal>
      </div>
    </Spin>
  );
};

export default AgencyDebtPage;
