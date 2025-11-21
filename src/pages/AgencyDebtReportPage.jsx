import React, { useState } from 'react';
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
  Descriptions
} from 'antd';
import {
  ShopOutlined,
  DollarOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  MoreOutlined,
  PhoneOutlined,
  EnvironmentOutlined,
  FileTextOutlined,
  EyeOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { agencies, agencyDebts, agencyContracts } from '../data/mockData';

const { Title, Text } = Typography;

const AgencyDebtReportPage = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDebt, setSelectedDebt] = useState(null);

  const formatPrice = (price) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(price);
  };

  // Transform data for agency debt report
  const agencyDebtData = agencyDebts.map(debt => {
    const agency = agencies.find(a => a.id === debt.agency_id);
    const contract = agencyContracts.find(c => c.id === debt.AgencyContract_id);
    
    // Calculate payment percentage
    const paymentPercentage = debt.debt_amount > 0 
      ? Math.round((debt.paid_amount / debt.debt_amount) * 100) 
      : 0;

    // Determine if overdue
    const dueDate = dayjs(debt.due_date);
    const today = dayjs();
    const isOverdue = today.isAfter(dueDate) && debt.remaining_amount > 0;
    const daysOverdue = isOverdue ? today.diff(dueDate, 'day') : 0;

    // Determine priority based on remaining amount and due date
    let priority = 'low';
    if (debt.remaining_amount > 1000000000 || daysOverdue > 30) {
      priority = 'high';
    } else if (debt.remaining_amount > 500000000 || daysOverdue > 0) {
      priority = 'medium';
    }

    return {
      ...debt,
      agency_name: agency?.agency_name || 'N/A',
      agency_location: agency?.location || 'N/A',
      agency_phone: agency?.phone || 'N/A',
      agency_address: agency?.address || 'N/A',
      contract_number: contract?.contract_number || 'N/A',
      payment_percentage: paymentPercentage,
      is_overdue: isOverdue,
      days_overdue: daysOverdue,
      priority: priority
    };
  }).sort((a, b) => b.remaining_amount - a.remaining_amount);

  // Calculate statistics
  const totalDebt = agencyDebtData.reduce((sum, debt) => sum + debt.debt_amount, 0);
  const totalPaid = agencyDebtData.reduce((sum, debt) => sum + debt.paid_amount, 0);
  const totalRemaining = agencyDebtData.reduce((sum, debt) => sum + debt.remaining_amount, 0);
  const overdueCount = agencyDebtData.filter(d => d.is_overdue).length;
  const highPriorityCount = agencyDebtData.filter(d => d.priority === 'high').length;

  const getStatusInfo = (status) => {
    const statusMap = {
      paid: { color: 'success', text: 'Đã thanh toán', icon: <CheckCircleOutlined /> },
      partial: { color: 'processing', text: 'Thanh toán một phần', icon: <ClockCircleOutlined /> },
      unpaid: { color: 'error', text: 'Chưa thanh toán', icon: <WarningOutlined /> },
      overdue: { color: 'error', text: 'Quá hạn', icon: <WarningOutlined /> }
    };
    return statusMap[status] || statusMap.partial;
  };

  const getPriorityTag = (priority) => {
    const priorityMap = {
      high: { color: 'error', text: 'Cao' },
      medium: { color: 'warning', text: 'Trung bình' },
      low: { color: 'default', text: 'Thấp' }
    };
    return priorityMap[priority];
  };

  const handleViewDetails = (record) => {
    setSelectedDebt(record);
    setIsModalOpen(true);
  };

  const handleRemind = (agency) => {
    Modal.confirm({
      title: 'Nhắc nợ đại lý',
      content: `Gửi thông báo nhắc nợ đến ${agency.agency_name}?`,
      okText: 'Gửi',
      cancelText: 'Hủy',
      onOk: () => {
        message.success(`Đã gửi thông báo nhắc nợ đến ${agency.agency_name}`);
      }
    });
  };

  const columns = [
    {
      title: 'Đại lý',
      key: 'agency',
      width: 250,
      fixed: 'left',
      render: (_, record) => (
        <div>
          <Text strong>{record.agency_name}</Text>
          <br />
          <Space size="small">
            <EnvironmentOutlined style={{ fontSize: '11px' }} />
            <Text type="secondary" style={{ fontSize: '11px' }}>
              {record.agency_location}
            </Text>
          </Space>
          <br />
          <Space size="small">
            <PhoneOutlined style={{ fontSize: '11px' }} />
            <Text type="secondary" style={{ fontSize: '11px' }}>
              {record.agency_phone}
            </Text>
          </Space>
        </div>
      )
    },
    {
      title: 'Hợp đồng',
      dataIndex: 'contract_number',
      key: 'contract_number',
      width: 120,
      render: (text) => <Text code>{text}</Text>
    },
    {
      title: 'Tổng công nợ',
      dataIndex: 'debt_amount',
      key: 'debt_amount',
      width: 150,
      sorter: (a, b) => a.debt_amount - b.debt_amount,
      render: (amount) => (
        <Text strong>{formatPrice(amount)}</Text>
      )
    },
    {
      title: 'Đã thanh toán',
      dataIndex: 'paid_amount',
      key: 'paid_amount',
      width: 150,
      render: (amount) => (
        <Text style={{ color: '#52c41a' }}>{formatPrice(amount)}</Text>
      )
    },
    {
      title: 'Còn lại',
      dataIndex: 'remaining_amount',
      key: 'remaining_amount',
      width: 150,
      sorter: (a, b) => a.remaining_amount - b.remaining_amount,
      render: (amount) => (
        <Text strong style={{ color: amount > 0 ? '#f5222d' : '#52c41a', fontSize: '16px' }}>
          {formatPrice(amount)}
        </Text>
      )
    },
    {
      title: 'Tiến độ',
      dataIndex: 'payment_percentage',
      key: 'payment_percentage',
      width: 150,
      sorter: (a, b) => a.payment_percentage - b.payment_percentage,
      render: (percentage) => (
        <Progress 
          percent={percentage} 
          size="small"
          status={
            percentage === 100 ? 'success' : 
            percentage >= 50 ? 'active' : 
            'exception'
          }
        />
      )
    },
    {
      title: 'Hạn thanh toán',
      key: 'due_date',
      width: 150,
      render: (_, record) => (
        <div>
          <Text>{dayjs(record.due_date).format('DD/MM/YYYY')}</Text>
          {record.is_overdue && (
            <>
              <br />
              <Tag color="error" style={{ fontSize: '11px' }}>
                Quá hạn {record.days_overdue} ngày
              </Tag>
            </>
          )}
        </div>
      )
    },
    {
      title: 'Mức độ',
      dataIndex: 'priority',
      key: 'priority',
      width: 100,
      filters: [
        { text: 'Cao', value: 'high' },
        { text: 'Trung bình', value: 'medium' },
        { text: 'Thấp', value: 'low' }
      ],
      onFilter: (value, record) => record.priority === value,
      render: (priority) => {
        const tag = getPriorityTag(priority);
        return <Tag color={tag.color}>{tag.text}</Tag>;
      }
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 150,
      fixed: 'right',
      filters: [
        { text: 'Đã thanh toán', value: 'paid' },
        { text: 'Thanh toán một phần', value: 'partial' },
        { text: 'Chưa thanh toán', value: 'unpaid' }
      ],
      onFilter: (value, record) => record.status === value,
      render: (status, record) => {
        const displayStatus = record.is_overdue ? 'overdue' : status;
        const info = getStatusInfo(displayStatus);
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
        const items = [
          {
            key: 'view',
            icon: <EyeOutlined />,
            label: 'Xem chi tiết',
            onClick: () => handleViewDetails(record)
          }
        ];

        if (record.remaining_amount > 0) {
          items.push({
            key: 'remind',
            icon: <WarningOutlined />,
            label: 'Nhắc nợ',
            onClick: () => handleRemind(record)
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
    <div className="agency-debt-report-page">
      <div className="page-header" style={{ marginBottom: '24px' }}>
        <Title level={2}>
          <ShopOutlined /> Báo cáo công nợ hãng xe
        </Title>
        <Text type="secondary">Theo dõi tình hình thanh toán và công nợ của các đại lý</Text>
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
              valueStyle={{ color: '#1890ff' }}
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
              title="Còn phải thu"
              value={totalRemaining}
              formatter={(value) => formatPrice(value)}
              prefix={<WarningOutlined />}
              valueStyle={{ color: '#f5222d' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Quá hạn / Ưu tiên cao"
              value={overdueCount}
              suffix={`/ ${highPriorityCount}`}
              prefix={<WarningOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Agency Debt Table */}
      <Card title="Chi tiết công nợ đại lý">
        <Table
          columns={columns}
          dataSource={agencyDebtData}
          rowKey="id"
          scroll={{ x: 1600 }}
          pagination={{
            pageSize: 10,
            showTotal: (total) => `Tổng ${total} công nợ`
          }}
        />
      </Card>

      {/* Detail Modal */}
      <Modal
        title={
          <Space>
            <FileTextOutlined />
            <span>Chi tiết công nợ</span>
          </Space>
        }
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        footer={[
          selectedDebt?.remaining_amount > 0 && (
            <Button
              key="remind"
              icon={<WarningOutlined />}
              onClick={() => handleRemind(selectedDebt)}
            >
              Nhắc nợ
            </Button>
          ),
          <Button key="close" type="primary" onClick={() => setIsModalOpen(false)}>
            Đóng
          </Button>
        ]}
        width={700}
      >
        {selectedDebt && (
          <>
            <Descriptions bordered column={2}>
              <Descriptions.Item label="Đại lý" span={2}>
                <Text strong>{selectedDebt.agency_name}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Địa chỉ" span={2}>
                {selectedDebt.agency_address}
              </Descriptions.Item>
              <Descriptions.Item label="Điện thoại">
                {selectedDebt.agency_phone}
              </Descriptions.Item>
              <Descriptions.Item label="Khu vực">
                {selectedDebt.agency_location}
              </Descriptions.Item>
              <Descriptions.Item label="Hợp đồng" span={2}>
                <Text code>{selectedDebt.contract_number}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Tổng công nợ">
                <Text strong style={{ fontSize: '16px' }}>
                  {formatPrice(selectedDebt.debt_amount)}
                </Text>
              </Descriptions.Item>
              <Descriptions.Item label="Đã thanh toán">
                <Text strong style={{ color: '#52c41a', fontSize: '16px' }}>
                  {formatPrice(selectedDebt.paid_amount)}
                </Text>
              </Descriptions.Item>
              <Descriptions.Item label="Còn lại" span={2}>
                <Text strong style={{ color: '#f5222d', fontSize: '18px' }}>
                  {formatPrice(selectedDebt.remaining_amount)}
                </Text>
              </Descriptions.Item>
              <Descriptions.Item label="Tiến độ" span={2}>
                <Progress percent={selectedDebt.payment_percentage} />
              </Descriptions.Item>
              <Descriptions.Item label="Hạn thanh toán">
                {dayjs(selectedDebt.due_date).format('DD/MM/YYYY')}
              </Descriptions.Item>
              <Descriptions.Item label="Trạng thái">
                {selectedDebt.is_overdue ? (
                  <Tag color="error">Quá hạn {selectedDebt.days_overdue} ngày</Tag>
                ) : (
                  <Tag color="success">Còn hạn</Tag>
                )}
              </Descriptions.Item>
              <Descriptions.Item label="Ghi chú" span={2}>
                {selectedDebt.notes || 'Không có ghi chú'}
              </Descriptions.Item>
            </Descriptions>
          </>
        )}
      </Modal>
    </div>
  );
};

export default AgencyDebtReportPage;
