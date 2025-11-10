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
  message,
  Progress,
  Descriptions
} from 'antd';
import {
  TrophyOutlined,
  RiseOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  CloseCircleOutlined,
  PlusOutlined,
  EditOutlined,
  EyeOutlined,
  MoreOutlined,
  ShopOutlined,
  CalendarOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { agencyTargets as mockTargets, agencies } from '../data/mockData';

const { Title, Text } = Typography;

const AgencyTargetPage = () => {
  const [targetList, setTargetList] = useState(mockTargets);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create'); // 'create' | 'edit' | 'view'
  const [selectedTarget, setSelectedTarget] = useState(null);
  const [form] = Form.useForm();

  const targetData = useMemo(() => {
    return targetList.map(target => {
      const agency = agencies.find(a => a.id === target.agency_id);
      const achievementRate = target.target_sales > 0 
        ? Math.round((target.achieved_sales / target.target_sales) * 100) 
        : 0;
      
      let status = 'in_progress';
      if (achievementRate >= 100) {
        status = 'completed';
      } else if (achievementRate >= 80) {
        status = 'on_track';
      } else if (achievementRate >= 50) {
        status = 'at_risk';
      } else {
        status = 'critical';
      }

      return {
        id: target.id,
        agency_id: target.agency_id,
        agency_name: agency?.agency_name || 'Chưa xác định',
        agency_location: agency?.location || '',
        target_year: target.target_year,
        target_month: target.target_month,
        target_sales: target.target_sales,
        achieved_sales: target.achieved_sales,
        remaining_sales: target.target_sales - target.achieved_sales,
        achievement_rate: achievementRate,
        status
      };
    }).sort((a, b) => {
      if (a.target_year !== b.target_year) return b.target_year - a.target_year;
      return b.target_month - a.target_month;
    });
  }, [targetList]);

  const totalTargets = targetData.length;
  const completedTargets = targetData.filter(t => t.status === 'completed').length;
  const atRiskTargets = targetData.filter(t => t.status === 'at_risk' || t.status === 'critical').length;
  const avgAchievementRate = targetData.length > 0
    ? Math.round(targetData.reduce((sum, t) => sum + t.achievement_rate, 0) / targetData.length)
    : 0;

  const handleCreate = () => {
    setModalMode('create');
    setSelectedTarget(null);
    form.resetFields();
    setIsModalOpen(true);
  };

  const handleEdit = (record) => {
    setModalMode('edit');
    setSelectedTarget(record);
    form.setFieldsValue({
      agency_id: record.agency_id,
      target_year: record.target_year,
      target_month: record.target_month,
      target_sales: record.target_sales,
      achieved_sales: record.achieved_sales
    });
    setIsModalOpen(true);
  };

  const handleView = (record) => {
    setModalMode('view');
    setSelectedTarget(record);
    setIsModalOpen(true);
  };

  const handleSubmit = () => {
    form.validateFields().then(values => {
      if (modalMode === 'create') {
        const newTarget = {
          id: targetList.length + 1,
          agency_id: values.agency_id,
          target_year: values.target_year,
          target_month: values.target_month,
          target_sales: values.target_sales,
          achieved_sales: values.achieved_sales || 0
        };
        setTargetList([newTarget, ...targetList]);
        message.success('Tạo chỉ tiêu thành công');
      } else if (modalMode === 'edit') {
        const updatedList = targetList.map(target =>
          target.id === selectedTarget.id
            ? {
                ...target,
                agency_id: values.agency_id,
                target_year: values.target_year,
                target_month: values.target_month,
                target_sales: values.target_sales,
                achieved_sales: values.achieved_sales || 0
              }
            : target
        );
        setTargetList(updatedList);
        message.success('Cập nhật chỉ tiêu thành công');
      }
      form.resetFields();
      setIsModalOpen(false);
    }).catch(() => {});
  };

  const statusMeta = (status) => {
    switch (status) {
      case 'completed':
        return { color: 'green', text: 'Đã hoàn thành', icon: <CheckCircleOutlined /> };
      case 'on_track':
        return { color: 'blue', text: 'Đúng tiến độ', icon: <RiseOutlined /> };
      case 'at_risk':
        return { color: 'orange', text: 'Có rủi ro', icon: <WarningOutlined /> };
      case 'critical':
        return { color: 'red', text: 'Nguy hiểm', icon: <CloseCircleOutlined /> };
      default:
        return { color: 'default', text: 'Đang thực hiện', icon: <CalendarOutlined /> };
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
      title: 'Kỳ',
      key: 'period',
      width: 120,
      render: (_, record) => (
        <div>
          <Text strong>Tháng {record.target_month}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: '12px' }}>Năm {record.target_year}</Text>
        </div>
      )
    },
    {
      title: 'Chỉ tiêu',
      dataIndex: 'target_sales',
      key: 'target_sales',
      width: 100,
      render: (value) => <Tag color="blue">{value} xe</Tag>,
      sorter: (a, b) => a.target_sales - b.target_sales
    },
    {
      title: 'Đã đạt',
      dataIndex: 'achieved_sales',
      key: 'achieved_sales',
      width: 100,
      render: (value) => <Tag color="green">{value} xe</Tag>,
      sorter: (a, b) => a.achieved_sales - b.achieved_sales
    },
    {
      title: 'Còn lại',
      dataIndex: 'remaining_sales',
      key: 'remaining_sales',
      width: 100,
      render: (value) => (
        <Tag color={value > 0 ? 'orange' : 'success'}>
          {value > 0 ? `${value} xe` : 'Hoàn thành'}
        </Tag>
      )
    },
    {
      title: 'Tỷ lệ hoàn thành',
      key: 'progress',
      width: 200,
      render: (_, record) => (
        <div>
          <Progress
            percent={record.achievement_rate}
            size="small"
            status={record.achievement_rate >= 100 ? 'success' : record.achievement_rate >= 80 ? 'active' : 'exception'}
          />
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {record.achievement_rate}%
          </Text>
        </div>
      )
    },
    {
      title: 'Trạng thái',
      key: 'status',
      width: 140,
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
            label: 'Chỉnh sửa',
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
    <div className="agency-target-page">
      <div className="page-header" style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Title level={2}>
            <TrophyOutlined /> Quản lý chỉ tiêu doanh số
          </Title>
          <Text type="secondary">Theo dõi và quản lý chỉ tiêu doanh số của các đại lý</Text>
        </div>
        <Button type="primary" icon={<PlusOutlined />} size="large" onClick={handleCreate}>
          Tạo chỉ tiêu mới
        </Button>
      </div>

      <Row gutter={16} style={{ marginBottom: '24px' }}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Tổng chỉ tiêu"
              value={totalTargets}
              prefix={<TrophyOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Đã hoàn thành"
              value={completedTargets}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Có rủi ro"
              value={atRiskTargets}
              prefix={<WarningOutlined />}
              valueStyle={{ color: '#fa8c16' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Tỷ lệ trung bình"
              value={avgAchievementRate}
              suffix="%"
              prefix={<RiseOutlined />}
              valueStyle={{ color: avgAchievementRate >= 80 ? '#52c41a' : '#fa8c16' }}
            />
          </Card>
        </Col>
      </Row>

      <Card title="Danh sách chỉ tiêu">
        <Table
          columns={columns}
          dataSource={targetData}
          rowKey="id"
          scroll={{ x: 1200 }}
          pagination={{
            pageSize: 10,
            showTotal: (total) => `Tổng ${total} chỉ tiêu`
          }}
        />
      </Card>

      <Modal
        title={modalMode === 'create' ? 'Tạo chỉ tiêu mới' : modalMode === 'edit' ? 'Chỉnh sửa chỉ tiêu' : 'Chi tiết chỉ tiêu'}
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        onOk={modalMode !== 'view' ? handleSubmit : undefined}
        okText={modalMode === 'create' ? 'Tạo chỉ tiêu' : 'Cập nhật'}
        cancelText={modalMode === 'view' ? 'Đóng' : 'Hủy'}
        width={600}
        footer={modalMode === 'view' ? [
          <Button key="close" type="primary" onClick={() => setIsModalOpen(false)}>
            Đóng
          </Button>
        ] : undefined}
      >
        {modalMode === 'view' && selectedTarget ? (
          <div style={{ padding: '16px 0' }}>
            <Descriptions bordered column={1}>
              <Descriptions.Item label="Đại lý">
                <Text strong>{selectedTarget.agency_name}</Text>
                {' - '}
                <Text type="secondary">{selectedTarget.agency_location}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Kỳ">
                Tháng {selectedTarget.target_month}/{selectedTarget.target_year}
              </Descriptions.Item>
              <Descriptions.Item label="Chỉ tiêu doanh số">
                <Text strong style={{ fontSize: '16px', color: '#1890ff' }}>
                  {selectedTarget.target_sales} xe
                </Text>
              </Descriptions.Item>
              <Descriptions.Item label="Đã đạt được">
                <Text strong style={{ fontSize: '16px', color: '#52c41a' }}>
                  {selectedTarget.achieved_sales} xe
                </Text>
              </Descriptions.Item>
              <Descriptions.Item label="Còn lại">
                <Text strong style={{ fontSize: '16px', color: selectedTarget.remaining_sales > 0 ? '#fa8c16' : '#52c41a' }}>
                  {selectedTarget.remaining_sales > 0 ? `${selectedTarget.remaining_sales} xe` : 'Đã hoàn thành'}
                </Text>
              </Descriptions.Item>
              <Descriptions.Item label="Tỷ lệ hoàn thành">
                <div style={{ marginTop: '8px' }}>
                  <Progress
                    percent={selectedTarget.achievement_rate}
                    status={selectedTarget.achievement_rate >= 100 ? 'success' : selectedTarget.achievement_rate >= 80 ? 'active' : 'exception'}
                  />
                </div>
              </Descriptions.Item>
              <Descriptions.Item label="Trạng thái">
                {(() => {
                  const meta = statusMeta(selectedTarget.status);
                  return <Tag color={meta.color} icon={meta.icon} style={{ fontSize: '14px' }}>{meta.text}</Tag>;
                })()}
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

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="target_year"
                  label="Năm"
                  rules={[{ required: true, message: 'Vui lòng chọn năm' }]}
                >
                  <Select placeholder="Chọn năm">
                    {[2023, 2024, 2025, 2026].map(year => (
                      <Select.Option key={year} value={year}>{year}</Select.Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="target_month"
                  label="Tháng"
                  rules={[{ required: true, message: 'Vui lòng chọn tháng' }]}
                >
                  <Select placeholder="Chọn tháng">
                    {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                      <Select.Option key={month} value={month}>Tháng {month}</Select.Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            <Form.Item
              name="target_sales"
              label="Chỉ tiêu doanh số (số xe)"
              rules={[{ required: true, message: 'Vui lòng nhập chỉ tiêu' }]}
            >
              <InputNumber
                min={1}
                max={1000}
                style={{ width: '100%' }}
                placeholder="VD: 50"
              />
            </Form.Item>

            <Form.Item
              name="achieved_sales"
              label="Đã đạt được (số xe)"
              initialValue={0}
            >
              <InputNumber
                min={0}
                max={1000}
                style={{ width: '100%' }}
                placeholder="VD: 32"
              />
            </Form.Item>
          </Form>
        )}
      </Modal>
    </div>
  );
};

export default AgencyTargetPage;
