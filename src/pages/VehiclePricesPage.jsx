import React, { useState, useMemo } from 'react';
import {
  Card,
  Table,
  Button,
  Tag,
  Space,
  Typography,
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  DatePicker,
  Descriptions,
  Statistic,
  Row,
  Col,
  message
} from 'antd';
import {
  DollarOutlined,
  PlusOutlined,
  EditOutlined,
  EyeOutlined,
  SearchOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { vehicles } from '../data/mockData';
import { useAuth } from '../context/AuthContext';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

// Mock retail prices data
const mockRetailPrices = [
  { 
    id: 1, 
    vehicle_id: 1, 
    price: 458000000, 
    effective_date: '2024-01-01', 
    end_date: null,
    status: 'active',
    notes: 'Giá niêm yết chính thức'
  },
  { 
    id: 2, 
    vehicle_id: 2, 
    price: 1291000000, 
    effective_date: '2024-01-01', 
    end_date: null,
    status: 'active',
    notes: 'Giá niêm yết chính thức'
  },
  { 
    id: 3, 
    vehicle_id: 3, 
    price: 1531000000, 
    effective_date: '2024-01-01', 
    end_date: null,
    status: 'active',
    notes: 'Giá niêm yết chính thức'
  },
  { 
    id: 4, 
    vehicle_id: 4, 
    price: 468000000, 
    effective_date: '2024-01-01', 
    end_date: null,
    status: 'active',
    notes: 'Giá niêm yết chính thức'
  },
  { 
    id: 5, 
    vehicle_id: 5, 
    price: 675000000, 
    effective_date: '2024-01-01', 
    end_date: null,
    status: 'active',
    notes: 'Giá niêm yết chính thức'
  },
  // Historical prices
  { 
    id: 6, 
    vehicle_id: 1, 
    price: 450000000, 
    effective_date: '2023-01-01', 
    end_date: '2023-12-31',
    status: 'expired',
    notes: 'Giá năm 2023'
  }
];

const VehiclePricesPage = () => {
  const { isAdmin } = useAuth();
  const [priceList, setPriceList] = useState(mockRetailPrices);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [modalMode, setModalMode] = useState('create'); // 'create', 'edit', 'view'
  const [selectedPrice, setSelectedPrice] = useState(null);
  const [form] = Form.useForm();
  const [searchText, setSearchText] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  // Filter prices
  const filteredPrices = useMemo(() => {
    return priceList.filter(price => {
      const vehicle = vehicles.find(v => v.id === price.vehicle_id);
      const matchSearch = vehicle?.model?.toLowerCase().includes(searchText.toLowerCase()) ?? true;
      const matchStatus = filterStatus === 'all' || price.status === filterStatus;
      return matchSearch && matchStatus;
    });
  }, [priceList, searchText, filterStatus]);

  // Statistics
  const statistics = useMemo(() => {
    const activePrices = priceList.filter(p => p.status === 'active');
    const avgPrice = activePrices.reduce((sum, p) => sum + p.price, 0) / activePrices.length;
    const maxPrice = Math.max(...activePrices.map(p => p.price));
    const minPrice = Math.min(...activePrices.map(p => p.price));

    return {
      totalActive: activePrices.length,
      avgPrice: Math.round(avgPrice),
      maxPrice,
      minPrice
    };
  }, [priceList]);

  const statusMeta = (status) => {
    const meta = {
      active: { color: 'success', text: 'Đang áp dụng' },
      scheduled: { color: 'processing', text: 'Chưa áp dụng' },
      expired: { color: 'default', text: 'Hết hiệu lực' }
    };
    return meta[status] || meta.active;
  };

  const handleOpenModal = (mode, record = null) => {
    setModalMode(mode);
    setSelectedPrice(record);
    setIsModalVisible(true);

    if (mode === 'edit' && record) {
      form.setFieldsValue({
        vehicle_id: record.vehicle_id,
        price: record.price,
        date_range: record.end_date 
          ? [dayjs(record.effective_date), dayjs(record.end_date)]
          : [dayjs(record.effective_date), null],
        notes: record.notes
      });
    } else if (mode === 'create') {
      form.resetFields();
    }
  };

  const handleCloseModal = () => {
    setIsModalVisible(false);
    setSelectedPrice(null);
    form.resetFields();
  };

  const handleSubmit = () => {
    form.validateFields().then(values => {
      const [startDate, endDate] = values.date_range || [];
      
      if (modalMode === 'create') {
        const newPrice = {
          id: priceList.length + 1,
          vehicle_id: values.vehicle_id,
          price: values.price,
          effective_date: startDate.format('YYYY-MM-DD'),
          end_date: endDate ? endDate.format('YYYY-MM-DD') : null,
          status: dayjs().isBefore(startDate) ? 'scheduled' : 'active',
          notes: values.notes
        };
        setPriceList([...priceList, newPrice]);
        message.success('Thêm giá bán mới thành công');
      } else if (modalMode === 'edit') {
        const updatedList = priceList.map(price => 
          price.id === selectedPrice.id 
            ? {
                ...price,
                vehicle_id: values.vehicle_id,
                price: values.price,
                effective_date: startDate.format('YYYY-MM-DD'),
                end_date: endDate ? endDate.format('YYYY-MM-DD') : null,
                notes: values.notes
              }
            : price
        );
        setPriceList(updatedList);
        message.success('Cập nhật giá bán thành công');
      }
      
      handleCloseModal();
    });
  };

  const columns = [
    {
      title: 'Mẫu xe',
      key: 'vehicle',
      width: 200,
      render: (_, record) => {
        const vehicle = vehicles.find(v => v.id === record.vehicle_id);
        return (
          <Space direction="vertical" size="small">
            <Text strong>{vehicle?.model}</Text>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {vehicle?.variants?.[0]?.variant_name}
            </Text>
          </Space>
        );
      }
    },
    {
      title: 'Giá bán lẻ',
      dataIndex: 'price',
      key: 'price',
      width: 180,
      render: (value) => (
        <Text strong style={{ color: '#52c41a', fontSize: '16px' }}>
          {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value)}
        </Text>
      ),
      sorter: (a, b) => a.price - b.price
    },
    {
      title: 'Ngày hiệu lực',
      dataIndex: 'effective_date',
      key: 'effective_date',
      width: 120,
      render: (value) => dayjs(value).format('DD/MM/YYYY')
    },
    {
      title: 'Ngày kết thúc',
      dataIndex: 'end_date',
      key: 'end_date',
      width: 120,
      render: (value) => value ? dayjs(value).format('DD/MM/YYYY') : <Text type="secondary">Không giới hạn</Text>
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 130,
      render: (status) => {
        const meta = statusMeta(status);
        return <Tag color={meta.color}>{meta.text}</Tag>;
      },
      filters: [
        { text: 'Đang áp dụng', value: 'active' },
        { text: 'Chưa áp dụng', value: 'scheduled' },
        { text: 'Hết hiệu lực', value: 'expired' }
      ],
      onFilter: (value, record) => record.status === value
    },
    {
      title: 'Ghi chú',
      dataIndex: 'notes',
      key: 'notes',
      ellipsis: true
    },
    {
      title: 'Thao tác',
      key: 'actions',
      width: 120,
      fixed: 'right',
      render: (_, record) => (
        <Space>
          <Button
            type="link"
            icon={<EyeOutlined />}
            onClick={() => handleOpenModal('view', record)}
          >
            Xem
          </Button>
          {isAdmin() && (
            <Button
              type="link"
              icon={<EditOutlined />}
              onClick={() => handleOpenModal('edit', record)}
            >
              Sửa
            </Button>
          )}
        </Space>
      )
    }
  ];

  return (
    <div className="vehicle-prices-page">
      <div className="page-header" style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Title level={2}>
            <DollarOutlined /> {isAdmin() ? 'Quản lý giá bán lẻ' : 'Bảng giá bán lẻ'}
          </Title>
          <Text type="secondary">
            {isAdmin() ? 'Quản lý giá niêm yết chính thức' : 'Danh sách giá bán lẻ chính thức'}
          </Text>
        </div>
        {isAdmin() && (
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => handleOpenModal('create')}
            size="large"
          >
            Thêm giá mới
          </Button>
        )}
      </div>

      <Row gutter={16} style={{ marginBottom: '24px' }}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Số mẫu xe"
              value={statistics.totalActive}
              suffix="xe"
              prefix={<DollarOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Giá trung bình"
              value={statistics.avgPrice}
              valueStyle={{ color: '#52c41a' }}
              formatter={(value) => new Intl.NumberFormat('vi-VN').format(value) + ' ₫'}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Giá cao nhất"
              value={statistics.maxPrice}
              valueStyle={{ color: '#722ed1' }}
              formatter={(value) => new Intl.NumberFormat('vi-VN').format(value) + ' ₫'}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Giá thấp nhất"
              value={statistics.minPrice}
              valueStyle={{ color: '#faad14' }}
              formatter={(value) => new Intl.NumberFormat('vi-VN').format(value) + ' ₫'}
            />
          </Card>
        </Col>
      </Row>

      <Card>
        <Space style={{ marginBottom: '16px', width: '100%', justifyContent: 'space-between' }}>
          <Space>
            <Input
              placeholder="Tìm kiếm mẫu xe..."
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              style={{ width: 250 }}
              allowClear
            />
            <Select
              value={filterStatus}
              onChange={setFilterStatus}
              style={{ width: 150 }}
              options={[
                { value: 'all', label: 'Tất cả' },
                { value: 'active', label: 'Đang áp dụng' },
                { value: 'scheduled', label: 'Chưa áp dụng' },
                { value: 'expired', label: 'Hết hiệu lực' }
              ]}
            />
          </Space>
        </Space>

        <Table
          columns={columns}
          dataSource={filteredPrices}
          rowKey="id"
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `Tổng ${total} mục`
          }}
          scroll={{ x: 1200 }}
        />
      </Card>

      <Modal
        title={
          modalMode === 'create' ? 'Thêm giá mới' :
          modalMode === 'edit' ? 'Chỉnh sửa giá' :
          'Chi tiết giá'
        }
        open={isModalVisible}
        onCancel={handleCloseModal}
        footer={
          modalMode === 'view' ? (
            <Button onClick={handleCloseModal}>Đóng</Button>
          ) : (
            <>
              <Button onClick={handleCloseModal}>Hủy</Button>
              <Button type="primary" onClick={handleSubmit}>
                {modalMode === 'create' ? 'Thêm' : 'Cập nhật'}
              </Button>
            </>
          )
        }
        width={700}
      >
        {modalMode === 'view' && selectedPrice ? (
          <Descriptions bordered column={1}>
            <Descriptions.Item label="Mẫu xe">
              {vehicles.find(v => v.id === selectedPrice.vehicle_id)?.model}
            </Descriptions.Item>
            <Descriptions.Item label="Giá bán lẻ">
              <Text strong style={{ color: '#52c41a', fontSize: '18px' }}>
                {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(selectedPrice.price)}
              </Text>
            </Descriptions.Item>
            <Descriptions.Item label="Ngày hiệu lực">
              {dayjs(selectedPrice.effective_date).format('DD/MM/YYYY')}
            </Descriptions.Item>
            <Descriptions.Item label="Ngày kết thúc">
              {selectedPrice.end_date ? dayjs(selectedPrice.end_date).format('DD/MM/YYYY') : 'Không giới hạn'}
            </Descriptions.Item>
            <Descriptions.Item label="Trạng thái">
              <Tag color={statusMeta(selectedPrice.status).color}>
                {statusMeta(selectedPrice.status).text}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Ghi chú">
              {selectedPrice.notes || 'Không có'}
            </Descriptions.Item>
          </Descriptions>
        ) : (
          <Form form={form} layout="vertical">
            <Form.Item
              name="vehicle_id"
              label="Mẫu xe"
              rules={[{ required: true, message: 'Vui lòng chọn mẫu xe' }]}
            >
              <Select
                placeholder="Chọn mẫu xe"
                showSearch
                optionFilterProp="children"
              >
                {vehicles.map(vehicle => (
                  <Select.Option key={vehicle.id} value={vehicle.id}>
                    {vehicle.model}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item
              name="price"
              label="Giá bán lẻ (VNĐ)"
              rules={[
                { required: true, message: 'Vui lòng nhập giá' },
                { type: 'number', min: 0, message: 'Giá phải lớn hơn 0' }
              ]}
            >
              <InputNumber
                style={{ width: '100%' }}
                formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                parser={value => value.replace(/\$\s?|(,*)/g, '')}
                placeholder="Nhập giá bán lẻ"
              />
            </Form.Item>

            <Form.Item
              name="date_range"
              label="Thời gian áp dụng"
              rules={[{ required: true, message: 'Vui lòng chọn thời gian' }]}
            >
              <RangePicker
                style={{ width: '100%' }}
                format="DD/MM/YYYY"
                placeholder={['Từ ngày', 'Đến ngày']}
              />
            </Form.Item>

            <Form.Item
              name="notes"
              label="Ghi chú"
            >
              <Input.TextArea
                rows={3}
                placeholder="Nhập ghi chú (tùy chọn)"
              />
            </Form.Item>
          </Form>
        )}
      </Modal>
    </div>
  );
};

export default VehiclePricesPage;
