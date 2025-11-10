import React, { useState, useEffect } from 'react';
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
  Rate,
  Timeline,
  Statistic,
  Badge,
  Dropdown,
  Spin
} from 'antd';
import {
  CommentOutlined,
  PlusOutlined,
  EyeOutlined,
  EditOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  WarningOutlined,
  UserOutlined,
  StarOutlined,
  MessageOutlined,
  MoreOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { feedbackAPI, customerAPI } from '../services/quotationService';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;
const { Option } = Select;

const FeedbackPage = () => {
  const [feedbacks, setFeedbacks] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const [form] = Form.useForm();

  // Get agencyId from sessionStorage
  const getAgencyId = () => {
    const agencyId = sessionStorage.getItem('agency_id');
    return agencyId ? parseInt(agencyId) : null;
  };

  // Fetch data from API
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const agencyId = getAgencyId();
      
      const [feedbacksData, customersData] = await Promise.all([
        feedbackAPI.getByAgencyId(agencyId),
        customerAPI.getAll()
      ]);

      setFeedbacks(feedbacksData);
      setCustomers(customersData);
    } catch (error) {
      console.error('Error fetching data:', error);
      message.error('Không thể tải dữ liệu');
    } finally {
      setLoading(false);
    }
  };

  // Get type info
  const getTypeInfo = (type) => {
    const typeMap = {
      feedback: { color: 'blue', text: 'Phản hồi' },
      complaint: { color: 'red', text: 'Khiếu nại' },
      suggestion: { color: 'green', text: 'Góp ý' }
    };
    return typeMap[type] || typeMap.feedback;
  };

  // Get status info
  const getStatusInfo = (status) => {
    const statusMap = {
      pending: { color: 'warning', text: 'Chờ xử lý', icon: <ClockCircleOutlined /> },
      processing: { color: 'processing', text: 'Đang xử lý', icon: <WarningOutlined /> },
      resolved: { color: 'success', text: 'Đã xử lý', icon: <CheckCircleOutlined /> },
      closed: { color: 'default', text: 'Đã đóng', icon: <CheckCircleOutlined /> }
    };
    return statusMap[status] || statusMap.pending;
  };

  // Get priority info
  const getPriorityInfo = (priority) => {
    const priorityMap = {
      low: { color: 'default', text: 'Thấp' },
      medium: { color: 'warning', text: 'Trung bình' },
      high: { color: 'error', text: 'Cao' },
      urgent: { color: 'purple', text: 'Khẩn cấp' }
    };
    return priorityMap[priority] || priorityMap.medium;
  };

  // Handle create
  const handleCreate = () => {
    setModalMode('create');
    setSelectedFeedback(null);
    form.resetFields();
    setIsModalOpen(true);
  };

  // Handle view
  const handleView = (record) => {
    setSelectedFeedback(record);
    setModalMode('view');
    setIsModalOpen(true);
  };

  // Handle respond
  const handleRespond = (record) => {
    setSelectedFeedback(record);
    setModalMode('respond');
    form.resetFields();
    setIsModalOpen(true);
  };

  // Handle resolve
  const handleResolve = async (id) => {
    Modal.confirm({
      title: 'Đánh dấu đã xử lý',
      content: 'Xác nhận đã xử lý xong phản hồi/khiếu nại này?',
      okText: 'Xác nhận',
      cancelText: 'Hủy',
      onOk: async () => {
        try {
          setLoading(true);
          const feedback = feedbacks.find(fb => fb.id === id);
          
          const updateData = {
            customerId: feedback.customerId,
            type: feedback.type,
            content: feedback.content,
            reply: feedback.reply || '',
            status: 'resolved',
            agencyId: getAgencyId()
          };
          
          await feedbackAPI.update(id, updateData);
          message.success('Đã đánh dấu đã xử lý');
          await fetchData();
        } catch (error) {
          console.error('Error resolving:', error);
          message.error('Không thể cập nhật trạng thái');
        } finally {
          setLoading(false);
        }
      }
    });
  };

  // Handle delete
  const handleDelete = (id) => {
    Modal.confirm({
      title: 'Xác nhận xóa',
      content: 'Bạn có chắc muốn xóa phản hồi này?',
      okText: 'Xóa',
      okType: 'danger',
      cancelText: 'Hủy',
      onOk: async () => {
        try {
          setLoading(true);
          await feedbackAPI.delete(id);
          message.success('Đã xóa phản hồi');
          await fetchData();
        } catch (error) {
          console.error('Error deleting:', error);
          message.error('Không thể xóa phản hồi');
        } finally {
          setLoading(false);
        }
      }
    });
  };

  // Submit form
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);
      
      if (modalMode === 'create') {
        const feedbackData = {
          customerId: values.customerId,
          type: values.type,
          content: values.content,
          reply: '',
          status: 'pending',
          agencyId: getAgencyId()
        };
        
        await feedbackAPI.create(feedbackData);
        message.success('Đã tạo phản hồi mới');
        await fetchData();
      } else if (modalMode === 'respond') {
        const updateData = {
          customerId: selectedFeedback.customerId,
          type: selectedFeedback.type,
          content: selectedFeedback.content,
          reply: values.response,
          status: 'resolved',
          agencyId: getAgencyId()
        };
        
        await feedbackAPI.update(selectedFeedback.id, updateData);
        message.success('Đã gửi phản hồi cho khách hàng');
        await fetchData();
      }
      
      setIsModalOpen(false);
      form.resetFields();
    } catch (error) {
      console.error('Error submitting:', error);
      message.error('Không thể lưu thông tin');
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      fixed: 'left',
      width: 80
    },
    {
      title: 'Loại',
      dataIndex: 'type',
      key: 'type',
      width: 100,
      render: (type) => {
        const info = getTypeInfo(type);
        return <Tag color={info.color}>{info.text}</Tag>;
      }
    },
    {
      title: 'Khách hàng',
      key: 'customer',
      width: 200,
      render: (_, record) => {
        const customer = customers.find(c => c.id === record.customerId);
        return (
          <div>
            <div><Text strong>{customer?.fullName || 'N/A'}</Text></div>
            <div>
              <Text type="secondary" style={{ fontSize: '12px' }}>{customer?.phone || 'N/A'}</Text>
            </div>
          </div>
        );
      }
    },
    {
      title: 'Nội dung',
      dataIndex: 'content',
      key: 'content',
      width: 400,
      ellipsis: true,
      render: (text) => <Text type="secondary">{text}</Text>
    },
    
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      fixed: 'right',
      render: (status) => {
        const info = getStatusInfo(status);
        return <Tag icon={info.icon} color={info.color}>{info.text}</Tag>;
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

        if (record.status === 'pending' || record.status === 'processing') {
          items.push(
            {
              key: 'respond',
              icon: <MessageOutlined />,
              label: 'Phản hồi',
              onClick: () => handleRespond(record)
            },
            {
              key: 'resolve',
              icon: <CheckCircleOutlined />,
              label: 'Đánh dấu đã xử lý',
              onClick: () => handleResolve(record.id)
            }
          );
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

  // Calculate statistics
  const stats = {
    total: feedbacks.length,
    pending: feedbacks.filter(fb => fb.status === 'pending').length,
    processing: feedbacks.filter(fb => fb.status === 'processing').length,
    resolved: feedbacks.filter(fb => fb.status === 'resolved').length,
    complaints: feedbacks.filter(fb => fb.type === 'complaint').length,
    avgRating: feedbacks.filter(fb => fb.rating).length > 0
      ? (feedbacks.reduce((sum, fb) => sum + (fb.rating || 0), 0) / 
         feedbacks.filter(fb => fb.rating).length).toFixed(1)
      : 0
  };

  return (
    <Spin spinning={loading} tip="Đang tải dữ liệu...">
    <div className="feedback-page">
      <div className="page-header" style={{ marginBottom: '24px' }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Title level={2}>
              <CommentOutlined /> Phản hồi & Khiếu nại
            </Title>
            <Text type="secondary">Quản lý phản hồi và xử lý khiếu nại từ khách hàng</Text>
          </Col>
          <Col>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              size="large"
              onClick={handleCreate}
            >
              Thêm phản hồi
            </Button>
          </Col>
        </Row>
      </div>

      {/* Statistics */}
      <Row gutter={16} style={{ marginBottom: '24px' }}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Chờ xử lý"
              value={stats.pending}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Đang xử lý"
              value={stats.processing}
              prefix={<WarningOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Đã xử lý"
              value={stats.resolved}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Đánh giá TB"
              value={stats.avgRating}
              prefix={<StarOutlined />}
              suffix="/ 5"
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Feedback Table */}
      <Card>
        <Table
          columns={columns}
          dataSource={feedbacks}
          rowKey="id"
          scroll={{ x: 1600 }}
          pagination={{
            pageSize: 10,
            showTotal: (total) => `Tổng ${total} phản hồi`
          }}
        />
      </Card>

      {/* Form Modal */}
      <Modal
        title={
          modalMode === 'create' ? 'Thêm phản hồi mới' :
          modalMode === 'respond' ? 'Phản hồi khách hàng' :
          `Chi tiết - ${selectedFeedback?.feedback_code}`
        }
        open={isModalOpen}
        onCancel={() => {
          setIsModalOpen(false);
          form.resetFields();
        }}
        footer={
          modalMode === 'view' ? [
            selectedFeedback?.status !== 'resolved' && (
              <Button key="respond" type="primary" onClick={() => {
                setModalMode('respond');
                form.resetFields();
              }}>
                Phản hồi
              </Button>
            ),
            <Button key="close" onClick={() => setIsModalOpen(false)}>
              Đóng
            </Button>
          ] : [
            <Button key="cancel" onClick={() => setIsModalOpen(false)}>
              Hủy
            </Button>,
            <Button key="submit" type="primary" onClick={handleSubmit}>
              {modalMode === 'create' ? 'Tạo mới' : 'Gửi phản hồi'}
            </Button>
          ]
        }
        width={800}
      >
        {modalMode === 'view' && selectedFeedback ? (
          <>
            <Descriptions bordered column={2} style={{ marginBottom: '24px' }}>
              <Descriptions.Item label="ID" span={2}>
                <Text strong code>#{selectedFeedback.id}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Loại">
                <Tag color={getTypeInfo(selectedFeedback.type).color}>
                  {getTypeInfo(selectedFeedback.type).text}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Khách hàng">
                <UserOutlined /> {customers.find(c => c.id === selectedFeedback.customerId)?.fullName || 'N/A'}
              </Descriptions.Item>
              <Descriptions.Item label="SĐT" span={2}>
                {customers.find(c => c.id === selectedFeedback.customerId)?.phone || 'N/A'}
              </Descriptions.Item>
              <Descriptions.Item label="Nội dung" span={2}>
                <Paragraph>{selectedFeedback.content}</Paragraph>
              </Descriptions.Item>
              {selectedFeedback.reply && (
                <Descriptions.Item label="Phản hồi" span={2}>
                  <Card size="small" style={{ background: '#f0f2f5' }}>
                    <Paragraph>{selectedFeedback.reply}</Paragraph>
                  </Card>
                </Descriptions.Item>
              )}
              <Descriptions.Item label="Trạng thái" span={2}>
                <Tag icon={getStatusInfo(selectedFeedback.status).icon}
                     color={getStatusInfo(selectedFeedback.status).color}>
                  {getStatusInfo(selectedFeedback.status).text}
                </Tag>
              </Descriptions.Item>
            </Descriptions>

            <Timeline>
              <Timeline.Item color="green">
                <Text>Tạo phản hồi</Text>
                <br />
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  {dayjs(selectedFeedback.createdAt).format('DD/MM/YYYY HH:mm')}
                </Text>
              </Timeline.Item>
              {selectedFeedback.status !== 'pending' && (
                <Timeline.Item color={getStatusInfo(selectedFeedback.status).color}>
                  <Text>{getStatusInfo(selectedFeedback.status).text}</Text>
                  <br />
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    {dayjs(selectedFeedback.updatedAt).format('DD/MM/YYYY HH:mm')}
                  </Text>
                </Timeline.Item>
              )}
            </Timeline>
          </>
        ) : modalMode === 'respond' ? (
          <Form form={form} layout="vertical" style={{ marginTop: '24px' }}>
            <Card size="small" style={{ marginBottom: '16px', background: '#f0f2f5' }}>
              <Text strong>Nội dung phản hồi từ khách hàng:</Text>
              <Paragraph style={{ marginTop: '8px', marginBottom: 0 }}>
                {selectedFeedback?.content}
              </Paragraph>
            </Card>
            <Form.Item
              name="response"
              label="Phản hồi của bạn"
              rules={[{ required: true, message: 'Nhập nội dung phản hồi' }]}
            >
              <TextArea
                rows={6}
                placeholder="Nhập nội dung phản hồi cho khách hàng..."
              />
            </Form.Item>
          </Form>
        ) : (
          <Form form={form} layout="vertical" style={{ marginTop: '24px' }}>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="customerId"
                  label="Khách hàng"
                  rules={[{ required: true, message: 'Chọn khách hàng' }]}
                >
                  <Select placeholder="Chọn khách hàng" showSearch
                    filterOption={(input, option) =>
                      option.children.toLowerCase().includes(input.toLowerCase())
                    }>
                    {customers.map(c => (
                      <Option key={c.id} value={c.id}>
                        {c.fullName} - {c.phone}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="type"
                  label="Loại"
                  rules={[{ required: true, message: 'Chọn loại' }]}
                >
                  <Select placeholder="Chọn loại">
                    <Option value="feedback">Phản hồi</Option>
                    <Option value="complaint">Khiếu nại</Option>
                    <Option value="suggestion">Góp ý</Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={24}>
                <Form.Item
                  name="content"
                  label="Nội dung"
                  rules={[{ required: true, message: 'Nhập nội dung' }]}
                >
                  <TextArea
                    rows={4}
                    placeholder="Nhập chi tiết nội dung phản hồi/khiếu nại..."
                  />
                </Form.Item>
              </Col>
            </Row>
          </Form>
        )}
      </Modal>
    </div>
    </Spin>
  );
};

export default FeedbackPage;
