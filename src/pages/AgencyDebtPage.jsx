import React, { useMemo, useState } from 'react';
import {
  Card,
  Table,
  Row,
  Col,
  Typography,
  Tag,
  Statistic,
  Button,
  Dropdown,
  Modal,
  Form,
  Select,
  InputNumber,
  DatePicker,
  Input,
  message,
  Progress,
  Descriptions,
  Timeline
} from 'antd';
import {
  DollarOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  PlusOutlined,
  EditOutlined,
  EyeOutlined,
  MoreOutlined,
  ShopOutlined,
  PayCircleOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { agencyDebts as mockDebts, agencies, agencyContracts } from '../data/mockData';

const { Title, Text } = Typography;
const { TextArea } = Input;

const AgencyDebtPage = () => {
  const [debtList, setDebtList] = useState(mockDebts);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create'); // 'create' | 'edit' | 'view'
  const [selectedDebt, setSelectedDebt] = useState(null);
  const [form] = Form.useForm();

  const debtData = useMemo(() => {
    return debtList.map(debt => {
      const agency = agencies.find(a => a.id === debt.agency_id);
      const contract = agencyContracts.find(c => c.id === debt.AgencyContract_id);
      const paymentRate = debt.debt_amount > 0 
        ? Math.round((debt.paid_amount / debt.debt_amount) * 100) 
        : 0;
      
      const daysUntilDue = dayjs(debt.due_date).diff(dayjs(), 'day');
      
      let status = debt.status;
      if (status === 'partial' && daysUntilDue < 0) {
        status = 'overdue';
      } else if (status === 'partial' && daysUntilDue <= 7) {
        status = 'due_soon';
      }

      return {
        id: debt.id,
        agency_id: debt.agency_id,
        agency_name: agency?.agency_name || 'Chưa xác định',
        agency_location: agency?.location || '',
        contract_number: contract?.contract_number || 'N/A',
        debt_amount: debt.debt_amount,
        paid_amount: debt.paid_amount,
        remaining_amount: debt.remaining_amount,
        due_date: debt.due_date,
        payment_rate: paymentRate,
        days_until_due: daysUntilDue,
        status,
        notes: debt.notes || '',
        created_at: debt.created_at,
        updated_at: debt.updated_at
      };
    }).sort((a, b) => a.days_until_due - b.days_until_due);
  }, [debtList]);

  const totalDebt = debtData.reduce((sum, d) => sum + d.debt_amount, 0);
  const totalPaid = debtData.reduce((sum, d) => sum + d.paid_amount, 0);
  const totalRemaining = debtData.reduce((sum, d) => sum + d.remaining_amount, 0);
  const overdueCount = debtData.filter(d => d.status === 'overdue').length;

  const handleCreate = () => {
    setModalMode('create');
    setSelectedDebt(null);
    form.resetFields();
    setIsModalOpen(true);
  };

  const handleEdit = (record) => {
    setModalMode('edit');
    setSelectedDebt(record);
    form.setFieldsValue({
      agency_id: record.agency_id,
      AgencyContract_id: agencyContracts.find(c => c.contract_number === record.contract_number)?.id,
      debt_amount: record.debt_amount,
      paid_amount: record.paid_amount,
      due_date: dayjs(record.due_date),
      status: record.status === 'due_soon' || record.status === 'overdue' ? 'partial' : record.status,
      notes: record.notes
    });
    setIsModalOpen(true);
  };

  const handleView = (record) => {
    setModalMode('view');
    setSelectedDebt(record);
    setIsModalOpen(true);
  };

  const handleSubmit = () => {
    form.validateFields().then(values => {
      const remaining = values.debt_amount - (values.paid_amount || 0);
      
      if (modalMode === 'create') {
        const newDebt = {
          id: debtList.length + 1,
          agency_id: values.agency_id,
          AgencyContract_id: values.AgencyContract_id,
          debt_amount: values.debt_amount,
          paid_amount: values.paid_amount || 0,
          remaining_amount: remaining,
          due_date: values.due_date.format('YYYY-MM-DD'),
          status: values.status,
          notes: values.notes || '',
          created_at: dayjs().toISOString(),
          updated_at: dayjs().toISOString()
        };
        setDebtList([newDebt, ...debtList]);
        message.success('Tạo công nợ thành công');
      } else if (modalMode === 'edit') {
        const updatedList = debtList.map(debt =>
          debt.id === selectedDebt.id
            ? {
                ...debt,
                agency_id: values.agency_id,
                AgencyContract_id: values.AgencyContract_id,
                debt_amount: values.debt_amount,
                paid_amount: values.paid_amount || 0,
                remaining_amount: remaining,
                due_date: values.due_date.format('YYYY-MM-DD'),
                status: values.status,
                notes: values.notes || '',
                updated_at: dayjs().toISOString()
              }
            : debt
        );
        setDebtList(updatedList);
        message.success('Cập nhật công nợ thành công');
      }
      form.resetFields();
      setIsModalOpen(false);
    }).catch(() => {});
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
          {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount)}
        </Text>
      ),
      sorter: (a, b) => a.debt_amount - b.debt_amount
    },
    {
      title: 'Đã thanh toán',
      dataIndex: 'paid_amount',
      key: 'paid_amount',
      width: 150,
      render: (amount) => (
        <Text style={{ color: '#52c41a' }}>
          {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount)}
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
          {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount)}
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
      render: (date, record) => (
        <div>
          <Text>{dayjs(date).format('DD/MM/YYYY')}</Text>
          <br />
          {record.days_until_due >= 0 ? (
            <Text type="secondary" style={{ fontSize: '12px' }}>
              Còn {record.days_until_due} ngày
            </Text>
          ) : (
            <Text type="danger" style={{ fontSize: '12px' }}>
              Quá hạn {Math.abs(record.days_until_due)} ngày
            </Text>
          )}
        </div>
      )
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
      width: 80,
      align: 'center',
      render: (_, record) => {
        const items = [
          {
            key: 'view',
            icon: <EyeOutlined />,
            label: 'Xem chi tiết',
            onClick: () => handleView(record)
          },
          {
            key: 'edit',
            icon: <EditOutlined />,
            label: 'Cập nhật',
            onClick: () => handleEdit(record)
          }
        ];

        return (
          <Dropdown menu={{ items }} trigger={['click']} placement="bottomRight">
            <Button type="text" icon={<MoreOutlined />} />
          </Dropdown>
        );
      }
    }
  ];

  return (
    <div className="agency-debt-page">
      <div className="page-header" style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Title level={2}>
            <DollarOutlined /> Quản lý công nợ đại lý
          </Title>
          <Text type="secondary">Theo dõi công nợ và thanh toán của các đại lý</Text>
        </div>
        <Button type="primary" icon={<PlusOutlined />} size="large" onClick={handleCreate}>
          Thêm công nợ mới
        </Button>
      </div>

      <Row gutter={16} style={{ marginBottom: '24px' }}>
        <Col xs={24} sm={12} md={6}>
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
        <Col xs={24} sm={12} md={6}>
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
        <Col xs={24} sm={12} md={6}>
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
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Quá hạn"
              value={overdueCount}
              prefix={<WarningOutlined />}
              valueStyle={{ color: '#ff4d4f' }}
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

      <Modal
        title={modalMode === 'create' ? 'Thêm công nợ mới' : modalMode === 'edit' ? 'Cập nhật công nợ' : 'Chi tiết công nợ'}
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        onOk={modalMode !== 'view' ? handleSubmit : undefined}
        okText={modalMode === 'create' ? 'Tạo công nợ' : 'Cập nhật'}
        cancelText={modalMode === 'view' ? 'Đóng' : 'Hủy'}
        width={700}
        footer={modalMode === 'view' ? [
          <Button key="close" type="primary" onClick={() => setIsModalOpen(false)}>
            Đóng
          </Button>
        ] : undefined}
      >
        {modalMode === 'view' && selectedDebt ? (
          <div style={{ padding: '16px 0' }}>
            <Descriptions bordered column={1}>
              <Descriptions.Item label="Đại lý">
                <Text strong>{selectedDebt.agency_name}</Text>
                {' - '}
                <Text type="secondary">{selectedDebt.agency_location}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Số hợp đồng">
                <Text style={{ color: '#1890ff' }}>{selectedDebt.contract_number}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Tổng công nợ">
                <Text strong style={{ color: '#ff4d4f', fontSize: '18px' }}>
                  {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(selectedDebt.debt_amount)}
                </Text>
              </Descriptions.Item>
              <Descriptions.Item label="Đã thanh toán">
                <Text strong style={{ color: '#52c41a', fontSize: '18px' }}>
                  {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(selectedDebt.paid_amount)}
                </Text>
              </Descriptions.Item>
              <Descriptions.Item label="Còn phải thanh toán">
                <Text strong style={{ color: '#fa8c16', fontSize: '18px' }}>
                  {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(selectedDebt.remaining_amount)}
                </Text>
              </Descriptions.Item>
              <Descriptions.Item label="Tiến độ thanh toán">
                <div style={{ marginTop: '8px' }}>
                  <Progress
                    percent={selectedDebt.payment_rate}
                    status={selectedDebt.payment_rate === 100 ? 'success' : selectedDebt.status === 'overdue' ? 'exception' : 'active'}
                  />
                </div>
              </Descriptions.Item>
              <Descriptions.Item label="Hạn thanh toán">
                {dayjs(selectedDebt.due_date).format('DD/MM/YYYY')}
                {selectedDebt.days_until_due >= 0 ? (
                  <Tag color="blue" style={{ marginLeft: '8px' }}>Còn {selectedDebt.days_until_due} ngày</Tag>
                ) : (
                  <Tag color="red" style={{ marginLeft: '8px' }}>Quá hạn {Math.abs(selectedDebt.days_until_due)} ngày</Tag>
                )}
              </Descriptions.Item>
              <Descriptions.Item label="Trạng thái">
                {(() => {
                  const meta = statusMeta(selectedDebt.status);
                  return <Tag color={meta.color} icon={meta.icon} style={{ fontSize: '14px' }}>{meta.text}</Tag>;
                })()}
              </Descriptions.Item>
              {selectedDebt.notes && (
                <Descriptions.Item label="Ghi chú">
                  {selectedDebt.notes}
                </Descriptions.Item>
              )}
              <Descriptions.Item label="Ngày tạo">
                {dayjs(selectedDebt.created_at).format('DD/MM/YYYY HH:mm')}
              </Descriptions.Item>
              <Descriptions.Item label="Cập nhật lần cuối">
                {dayjs(selectedDebt.updated_at).format('DD/MM/YYYY HH:mm')}
              </Descriptions.Item>
            </Descriptions>
          </div>
        ) : (
          <Form form={form} layout="vertical">
            <Form.Item
              name="agency_id"
              label="Đại lý"
              rules={[{ required: true, message: 'Vui lòng chọn đại lý' }]}
            >
              <Select placeholder="Chọn đại lý" suffixIcon={<ShopOutlined />}>
                {agencies.map(agency => (
                  <Select.Option key={agency.id} value={agency.id}>
                    {agency.agency_name} - {agency.location}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item
              name="AgencyContract_id"
              label="Hợp đồng liên quan"
              rules={[{ required: true, message: 'Vui lòng chọn hợp đồng' }]}
            >
              <Select placeholder="Chọn hợp đồng">
                {agencyContracts.map(contract => {
                  const agency = agencies.find(a => a.id === contract.agency_id);
                  return (
                    <Select.Option key={contract.id} value={contract.id}>
                      {contract.contract_number} - {agency?.agency_name}
                    </Select.Option>
                  );
                })}
              </Select>
            </Form.Item>

            <Form.Item
              name="debt_amount"
              label="Tổng công nợ (VNĐ)"
              rules={[{ required: true, message: 'Vui lòng nhập tổng công nợ' }]}
            >
              <InputNumber
                min={0}
                max={100000000000}
                step={1000000}
                style={{ width: '100%' }}
                formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                parser={value => value.replace(/\$\s?|(,*)/g, '')}
              />
            </Form.Item>

            <Form.Item
              name="paid_amount"
              label="Đã thanh toán (VNĐ)"
              initialValue={0}
            >
              <InputNumber
                min={0}
                max={100000000000}
                step={1000000}
                style={{ width: '100%' }}
                formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                parser={value => value.replace(/\$\s?|(,*)/g, '')}
              />
            </Form.Item>

            <Form.Item
              name="due_date"
              label="Hạn thanh toán"
              rules={[{ required: true, message: 'Vui lòng chọn hạn thanh toán' }]}
            >
              <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
            </Form.Item>

            <Form.Item
              name="status"
              label="Trạng thái"
              initialValue="partial"
              rules={[{ required: true, message: 'Vui lòng chọn trạng thái' }]}
            >
              <Select>
                <Select.Option value="unpaid">Chưa thanh toán</Select.Option>
                <Select.Option value="partial">Thanh toán 1 phần</Select.Option>
                <Select.Option value="paid">Đã thanh toán</Select.Option>
              </Select>
            </Form.Item>

            <Form.Item
              name="notes"
              label="Ghi chú"
            >
              <TextArea rows={3} placeholder="Ghi chú về công nợ" />
            </Form.Item>
          </Form>
        )}
      </Modal>
    </div>
  );
};

export default AgencyDebtPage;
