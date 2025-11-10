import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Row,
  Col,
  Typography,
  Select,
  DatePicker,
  Space,
  Tag,
  Statistic,
  Progress,
  Avatar,
  Modal,
  Descriptions,
  Spin,
  message,
  Button
} from 'antd';
import {
  BarChartOutlined,
  UserOutlined,
  TrophyOutlined,
  DollarOutlined,
  RiseOutlined,
  FallOutlined,
  EyeOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { agencyAPI, quotationAPI, orderAPI } from '../services/quotationService';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

const SalesStaffReportPage = () => {
  const [selectedMonth, setSelectedMonth] = useState(dayjs().month() + 1);
  const [selectedYear, setSelectedYear] = useState(dayjs().year());
  const [staffSalesData, setStaffSalesData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [staffQuotations, setStaffQuotations] = useState([]);
  const [staffOrders, setStaffOrders] = useState([]);

  // Get agencyId from sessionStorage
  const getAgencyId = () => {
    const agencyId = sessionStorage.getItem('agency_id');
    return agencyId ? parseInt(agencyId) : null;
  };

  // Fetch data from API
  useEffect(() => {
    fetchData();
  }, [selectedMonth, selectedYear]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const agencyId = getAgencyId();
      
      const [agencyData, quotationsData, ordersData] = await Promise.all([
        agencyAPI.getById(agencyId),
        quotationAPI.getByAgencyId(agencyId),
        orderAPI.getByAgencyId(agencyId)
      ]);

      // Filter quotations by selected month/year based on createdAt
      const filteredQuotations = quotationsData.filter(q => {
        const createdDate = dayjs(q.createdAt);
        return createdDate.month() + 1 === selectedMonth && createdDate.year() === selectedYear;
      });

      // Filter staff with role AgencyStaff
      const salesStaff = agencyData.users.filter(user => user.role === 'AgencyStaff');

      // Transform data for sales staff report
      const staffData = salesStaff.map(staff => {
        // Get quotations by this staff in selected period
        const staffQuotations = filteredQuotations.filter(q => q.createBy === staff.id);
        const convertedQuotations = staffQuotations.filter(q => q.status === 'Converted');
        
        // Calculate total sales from converted quotations
        const totalSales = convertedQuotations.reduce((sum, quotation) => sum + quotation.quotedPrice, 0);
        
        // Get orders from converted quotations
        const quotationIds = convertedQuotations.map(q => q.id);
        const staffOrders = ordersData.filter(order => 
          order.createBy === staff.id && 
          order.details.some(d => quotationIds.includes(d.quotationId))
        );
        
        // Count order statuses
        const completedOrders = staffOrders.filter(o => o.status === 'Complete');
        const pendingOrders = staffOrders.filter(o => o.status !== 'Complete').length;
        
        // Calculate conversion rate (Converted quotations / Total quotations)
        const conversionRate = staffQuotations.length > 0 
          ? Math.round((convertedQuotations.length / staffQuotations.length) * 100) 
          : 0;
        
        // Calculate average quotation value
        const avgOrderValue = convertedQuotations.length > 0 
          ? totalSales / convertedQuotations.length 
          : 0;

        return {
          id: staff.id,
          staff_name: staff.fullName,
          staff_email: staff.email,
          staff_phone: staff.phone,
          avatar_url: staff.avartarUrl,
          total_orders: staffOrders.length,
          completed_orders: completedOrders.length,
          pending_orders: pendingOrders,
          total_sales: totalSales,
          total_quotations: staffQuotations.length,
          converted_quotations: convertedQuotations.length,
          conversion_rate: conversionRate,
          avg_order_value: avgOrderValue,
          performance: conversionRate >= 70 ? 'excellent' : conversionRate >= 50 ? 'good' : 'average'
        };
      }).sort((a, b) => b.total_sales - a.total_sales);

      setStaffSalesData(staffData);
    } catch (error) {
      console.error('Error fetching data:', error);
      message.error('Không thể tải dữ liệu');
    } finally {
      setLoading(false);
    }
  };

  // Handle view staff detail
  const handleViewDetail = async (staff) => {
    setSelectedStaff(staff);
    setLoading(true);
    try {
      const agencyId = getAgencyId();
      const [quotationsData, ordersData] = await Promise.all([
        quotationAPI.getByAgencyId(agencyId),
        orderAPI.getByAgencyId(agencyId)
      ]);

      const staffQuots = quotationsData.filter(q => q.createBy === staff.id);
      const staffOrds = ordersData.filter(o => o.createBy === staff.id);

      setStaffQuotations(staffQuots);
      setStaffOrders(staffOrds);
      setIsDetailModalOpen(true);
    } catch (error) {
      console.error('Error loading detail:', error);
      message.error('Không thể tải chi tiết');
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

  // Calculate overall statistics
  const totalRevenue = staffSalesData.reduce((sum, staff) => sum + staff.total_sales, 0);
  const totalOrders = staffSalesData.reduce((sum, staff) => sum + staff.total_orders, 0);
  const avgConversionRate = staffSalesData.length > 0
    ? Math.round(staffSalesData.reduce((sum, staff) => sum + staff.conversion_rate, 0) / staffSalesData.length)
    : 0;

  const getPerformanceBadge = (performance) => {
    const badges = {
      excellent: { color: 'success', text: 'Xuất sắc', icon: <TrophyOutlined /> },
      good: { color: 'processing', text: 'Tốt', icon: <RiseOutlined /> },
      average: { color: 'warning', text: 'Trung bình', icon: <FallOutlined /> }
    };
    return badges[performance];
  };

  const columns = [
    {
      title: 'Xếp hạng',
      key: 'rank',
      width: 80,
      align: 'center',
      render: (_, __, index) => (
        <Tag color={index === 0 ? 'gold' : index === 1 ? 'silver' : index === 2 ? 'orange' : 'default'}>
          #{index + 1}
        </Tag>
      )
    },
    {
      title: 'Nhân viên',
      key: 'staff',
      width: 250,
      fixed: 'left',
      render: (_, record) => (
        <Space>
          <Avatar src={record.avatar_url} icon={<UserOutlined />} />
          <div>
            <Text strong>{record.staff_name}</Text>
            <br />
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {record.staff_phone}
            </Text>
          </div>
        </Space>
      )
    },
    {
      title: 'Tổng doanh số',
      dataIndex: 'total_sales',
      key: 'total_sales',
      width: 180,
      sorter: (a, b) => a.total_sales - b.total_sales,
      render: (amount) => (
        <Text strong style={{ fontSize: '16px', color: '#f5222d' }}>
          {formatPrice(amount)}
        </Text>
      )
    },
    {
      title: 'Số đơn hàng',
      key: 'orders',
      width: 150,
      render: (_, record) => (
        <div>
          <Text strong>{record.total_orders}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: '11px' }}>
            Hoàn thành: {record.completed_orders}
          </Text>
          <br />
          <Text type="secondary" style={{ fontSize: '11px' }}>
            Đang xử lý: {record.pending_orders}
          </Text>
        </div>
      )
    },
    {
      title: 'Báo giá',
      dataIndex: 'total_quotations',
      key: 'total_quotations',
      width: 100,
      align: 'center',
      render: (count) => <Tag color="blue">{count}</Tag>
    },
    {
      title: 'Tỷ lệ chuyển đổi',
      dataIndex: 'conversion_rate',
      key: 'conversion_rate',
      width: 180,
      sorter: (a, b) => a.conversion_rate - b.conversion_rate,
      render: (rate) => (
        <div>
          <Progress 
            percent={rate} 
            size="small"
            status={rate >= 70 ? 'success' : rate >= 50 ? 'normal' : 'exception'}
          />
          <Text style={{ fontSize: '12px' }}>
            {rate}% (Báo giá → Đơn hàng)
          </Text>
        </div>
      )
    },
    {
      title: 'Giá trị TB/Đơn',
      dataIndex: 'avg_order_value',
      key: 'avg_order_value',
      width: 150,
      render: (amount) => (
        <Text style={{ color: '#1890ff' }}>
          {formatPrice(amount)}
        </Text>
      )
    },
    {
      title: 'Hiệu suất',
      dataIndex: 'performance',
      key: 'performance',
      width: 120,
      filters: [
        { text: 'Xuất sắc', value: 'excellent' },
        { text: 'Tốt', value: 'good' },
        { text: 'Trung bình', value: 'average' }
      ],
      onFilter: (value, record) => record.performance === value,
      render: (performance) => {
        const badge = getPerformanceBadge(performance);
        return (
          <Tag icon={badge.icon} color={badge.color}>
            {badge.text}
          </Tag>
        );
      }
    },
    {
      title: 'Thao tác',
      key: 'actions',
      width: 100,
      fixed: 'right',
      align: 'center',
      render: (_, record) => (
        <Button 
          type="link" 
          icon={<EyeOutlined />}
          onClick={() => handleViewDetail(record)}
        >
          Chi tiết
        </Button>
      )
    }
  ];

  return (
    <Spin spinning={loading} tip="Đang tải dữ liệu...">
    <div className="sales-staff-report-page">
      <div className="page-header" style={{ marginBottom: '24px' }}>
        <Title level={2}>
          <BarChartOutlined /> Báo cáo doanh số theo nhân viên
        </Title>
        <Text type="secondary">Theo dõi và đánh giá hiệu suất bán hàng của từng nhân viên</Text>
      </div>

      {/* Filters */}
      <Card style={{ marginBottom: '24px' }}>
        <Space size="large">
          <div>
            <Text strong>Tháng:</Text>
            <br />
            <Select
              value={selectedMonth}
              onChange={setSelectedMonth}
              style={{ width: 120 }}
            >
              {[...Array(12)].map((_, i) => (
                <Select.Option key={i + 1} value={i + 1}>
                  Tháng {i + 1}
                </Select.Option>
              ))}
            </Select>
          </div>
          <div>
            <Text strong>Năm:</Text>
            <br />
            <Select
              value={selectedYear}
              onChange={setSelectedYear}
              style={{ width: 120 }}
            >
              <Select.Option value={2023}>2023</Select.Option>
              <Select.Option value={2024}>2024</Select.Option>
              <Select.Option value={2025}>2025</Select.Option>
            </Select>
          </div>
        </Space>
      </Card>

      {/* Overall Statistics */}
      <Row gutter={16} style={{ marginBottom: '24px' }}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Tổng doanh thu"
              value={totalRevenue}
              formatter={(value) => formatPrice(value)}
              prefix={<DollarOutlined />}
              valueStyle={{ color: '#f5222d' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Tổng đơn hàng"
              value={totalOrders}
              prefix={<BarChartOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Số nhân viên"
              value={staffSalesData.length}
              prefix={<UserOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Tỷ lệ chuyển đổi TB"
              value={avgConversionRate}
              suffix="%"
              prefix={<RiseOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Top Performers */}
      <Row gutter={16} style={{ marginBottom: '24px' }}>
        {staffSalesData.slice(0, 3).map((staff, index) => (
          <Col xs={24} sm={8} key={staff.id}>
            <Card>
              <div style={{ textAlign: 'center' }}>
                <Avatar 
                  size={64} 
                  src={staff.avatar_url} 
                  icon={<UserOutlined />}
                  style={{ marginBottom: '12px' }}
                />
                <br />
                <Tag color={index === 0 ? 'gold' : index === 1 ? 'silver' : 'orange'}>
                  Top {index + 1}
                </Tag>
                <Title level={4} style={{ margin: '8px 0' }}>
                  {staff.staff_name}
                </Title>
                <Text type="secondary">{staff.staff_email}</Text>
                <div style={{ marginTop: '16px' }}>
                  <Text strong style={{ fontSize: '20px', color: '#f5222d' }}>
                    {formatPrice(staff.total_sales)}
                  </Text>
                  <br />
                  <Text type="secondary">
                    {staff.total_orders} đơn hàng
                  </Text>
                </div>
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      {/* Sales Staff Table */}
      <Card title="Chi tiết doanh số nhân viên">
        <Table
          columns={columns}
          dataSource={staffSalesData}
          rowKey="id"
          scroll={{ x: 1500 }}
          pagination={{
            pageSize: 10,
            showTotal: (total) => `Tổng ${total} nhân viên`
          }}
        />
      </Card>

      {/* Detail Modal */}
      <Modal
        title={`Chi tiết hiệu suất - ${selectedStaff?.staff_name}`}
        open={isDetailModalOpen}
        onCancel={() => setIsDetailModalOpen(false)}
        footer={[
          <Button key="close" onClick={() => setIsDetailModalOpen(false)}>
            Đóng
          </Button>
        ]}
        width={900}
      >
        {selectedStaff && (
          <>
            <Descriptions bordered column={2} style={{ marginBottom: '24px' }}>
              <Descriptions.Item label="Nhân viên" span={2}>
                <Space>
                  <Avatar src={selectedStaff.avatar_url} icon={<UserOutlined />} />
                  <div>
                    <Text strong>{selectedStaff.staff_name}</Text>
                    <br />
                    <Text type="secondary">{selectedStaff.staff_email}</Text>
                  </div>
                </Space>
              </Descriptions.Item>
              <Descriptions.Item label="Tổng doanh số">
                <Text strong style={{ color: '#f5222d', fontSize: '16px' }}>
                  {formatPrice(selectedStaff.total_sales)}
                </Text>
              </Descriptions.Item>
              <Descriptions.Item label="Tổng đơn hàng">
                <Text strong>{selectedStaff.total_orders}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Hoàn thành">
                <Tag color="green">{selectedStaff.completed_orders}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Đang xử lý">
                <Tag color="orange">{selectedStaff.pending_orders}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Tổng báo giá">
                <Tag color="blue">{selectedStaff.total_quotations}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Đã chuyển đổi">
                <Tag color="cyan">{selectedStaff.converted_quotations}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Tỷ lệ chuyển đổi" span={2}>
                <Progress 
                  percent={selectedStaff.conversion_rate} 
                  status={selectedStaff.conversion_rate >= 70 ? 'success' : selectedStaff.conversion_rate >= 50 ? 'normal' : 'exception'}
                />
              </Descriptions.Item>
            </Descriptions>

            <Card title="Danh sách đơn hàng" size="small" style={{ marginBottom: '16px' }}>
              <Table
                dataSource={staffOrders}
                rowKey="id"
                size="small"
                pagination={{ pageSize: 5 }}
                columns={[
                  { title: 'ID', dataIndex: 'id', width: 80 },
                  { 
                    title: 'Ngày đặt', 
                    dataIndex: 'orderDate', 
                    width: 150,
                    render: (date) => dayjs(date).format('DD/MM/YYYY')
                  },
                  { 
                    title: 'Tổng tiền', 
                    dataIndex: 'totalAmount', 
                    width: 150,
                    render: (amount) => <Text strong>{formatPrice(amount)}</Text>
                  },
                  { 
                    title: 'Trạng thái', 
                    dataIndex: 'status', 
                    width: 120,
                    render: (status) => (
                      <Tag color={status === 'Complete' ? 'green' : 'orange'}>
                        {status === 'Complete' ? 'Hoàn thành' : 'Đang xử lý'}
                      </Tag>
                    )
                  }
                ]}
              />
            </Card>

            <Card title="Danh sách báo giá" size="small">
              <Table
                dataSource={staffQuotations}
                rowKey="id"
                size="small"
                pagination={{ pageSize: 5 }}
                columns={[
                  { title: 'ID', dataIndex: 'id', width: 80 },
                  { title: 'Tên báo giá', dataIndex: 'quotationName', width: 150 },
                  { 
                    title: 'Giá báo', 
                    dataIndex: 'quotedPrice', 
                    width: 150,
                    render: (price) => formatPrice(price)
                  },
                  { 
                    title: 'Trạng thái', 
                    dataIndex: 'status', 
                    width: 120,
                    render: (status) => {
                      const colors = {
                        'Pending': 'default',
                        'Accepted': 'blue',
                        'Converted': 'green',
                        'Rejected': 'red'
                      };
                      const texts = {
                        'Pending': 'Chờ duyệt',
                        'Accepted': 'Đã chấp nhận',
                        'Converted': 'Đã chuyển đổi',
                        'Rejected': 'Đã từ chối'
                      };
                      return <Tag color={colors[status]}>{texts[status]}</Tag>;
                    }
                  }
                ]}
              />
            </Card>
          </>
        )}
      </Modal>
    </div>
    </Spin>
  );
};

export default SalesStaffReportPage;
