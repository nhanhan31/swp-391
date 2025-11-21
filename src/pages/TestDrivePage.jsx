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
  DatePicker,
  Row,
  Col,
  Typography,
  message,
  Descriptions,
  Timeline,
  Statistic,
  Badge,
  Dropdown,
  Spin
} from 'antd';
import {
  CarOutlined,
  PlusOutlined,
  EyeOutlined,
  EditOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  PhoneOutlined,
  CalendarOutlined,
  UserOutlined,
  MoreOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { testDriveAPI, customerAPI, agencyInventoryAPI, vehicleInstanceAPI } from '../services/quotationService';

const { Title, Text } = Typography;
const { TextArea } = Input;
const { Option } = Select;

const TestDrivePage = () => {
  const [testDrives, setTestDrives] = useState([]);
  const [vehicleInstances, setVehicleInstances] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [selectedTestDrive, setSelectedTestDrive] = useState(null);
  const [form] = Form.useForm();

  // Get agencyId from sessionStorage
  const getAgencyId = () => {
    const userInfo = JSON.parse(sessionStorage.getItem('agency_id') || '{}');
    return userInfo;
  };

  // Fetch data from API
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const agencyId = getAgencyId();
      
      const [testDrivesData, allVehicleInstances, inventoryData, customersData] = await Promise.all([
        testDriveAPI.getByAgencyId(agencyId),
        vehicleInstanceAPI.getAll(),
        agencyInventoryAPI.getByAgencyId(agencyId),
        customerAPI.getAll()
      ]);

      // Create a map of vehicle instance ID to status from getAll API
      const instanceStatusMap = new Map(
        allVehicleInstances.map(instance => [instance.id, instance.status])
      );
      
      // Merge inventory data with status from vehicleInstanceAPI
      const vehiclesWithDetails = inventoryData.map(inv => {
        const status = instanceStatusMap.get(inv.vehicleInstanceId);
        return {
          vehicleInstanceId: inv.vehicleInstanceId,
          status: status,
          vehicleDetails: inv.vehicleDetails || {}
        };
      });

      setTestDrives(testDrivesData);
      setVehicleInstances(vehiclesWithDetails);
      setCustomers(customersData);
    } catch (error) {
      console.error('Error fetching data:', error);
      message.error('Không thể tải dữ liệu');
    } finally {
      setLoading(false);
    }
  };

  // Get status info
  const getStatusInfo = (status) => {
    const statusMap = {
      Pending: { color: 'blue', text: 'Đã đặt lịch', icon: <CalendarOutlined /> },
      Scheduled: { color: 'cyan', text: 'Đã xác nhận', icon: <CheckCircleOutlined /> },
      Completed: { color: 'green', text: 'Hoàn thành', icon: <CheckCircleOutlined /> },
      Cancelled: { color: 'red', text: 'Đã hủy', icon: <CloseCircleOutlined /> },
      NoShow: { color: 'default', text: 'Không đến', icon: <CloseCircleOutlined /> }
    };
    return statusMap[status] || statusMap.Pending;
  };

  // Handle create
  const handleCreate = () => {
    setModalMode('create');
    setSelectedTestDrive(null);
    form.resetFields();
    form.setFieldsValue({
      appointment_date: dayjs().add(1, 'day')
    });
    setIsModalOpen(true);
  };

  // Handle view
  const handleView = (record) => {
    setSelectedTestDrive(record);
    setModalMode('view');
    setIsModalOpen(true);
  };

  // Handle edit
  const handleEdit = (record) => {
    setSelectedTestDrive(record);
    setModalMode('edit');
    form.setFieldsValue({
      appointmentDate: dayjs(record.appointmentDate),
      notes: record.notes,
      status: record.status,
      feedback: record.feedback
    });
    setIsModalOpen(true);
  };

  // Handle confirm
  const handleConfirm = async (id) => {
    try {
      setLoading(true);
      const testDrive = testDrives.find(td => td.id === id);
      const updateData = {
        appointmentDate: testDrive.appointmentDate,
        status: 'Scheduled',
        notes: testDrive.notes || ''
      };
      
      await testDriveAPI.update(id, updateData);

      // Update VehicleInstance status to Booked
      if (testDrive.vehicleInstanceId) {
        try {
          const inventory = vehicleInstances.find(inv => inv.vehicleInstanceId === testDrive.vehicleInstanceId);
          if (inventory && inventory.vehicleDetails) {
            await vehicleInstanceAPI.update(testDrive.vehicleInstanceId, {
              VehicleId: inventory.vehicleDetails.vehicleId,
              Vin: inventory.vehicleDetails.vin,
              EngineNumber: inventory.vehicleDetails.engineNumber,
              Status: 'Booked'
            });
            console.log('Updated vehicle instance status to Booked');
          }
        } catch (error) {
          console.error('Error updating vehicle instance status:', error);
        }
      }

      message.success('Đã xác nhận lịch hẹn');
      await fetchData();
    } catch (error) {
      console.error('Error confirming:', error);
      message.error('Không thể xác nhận lịch hẹn');
    } finally {
      setLoading(false);
    }
  };

  // Handle complete
  const handleComplete = (record) => {
    setSelectedTestDrive(record);
    setModalMode('complete');
    form.resetFields();
    setIsModalOpen(true);
  };

  // Handle cancel
  const handleCancel = (id) => {
    Modal.confirm({
      title: 'Hủy lịch hẹn',
      content: 'Bạn có chắc muốn hủy lịch hẹn này?',
      okText: 'Hủy lịch',
      okType: 'danger',
      cancelText: 'Đóng',
      onOk: async () => {
        try {
          setLoading(true);
          const testDrive = testDrives.find(td => td.id === id);
          const updateData = {
            appointmentDate: testDrive.appointmentDate,
            status: 'Cancelled',
            notes: testDrive.notes || ''
          };
          
          await testDriveAPI.update(id, updateData);

          // Update VehicleInstance status to Available
          if (testDrive.vehicleInstanceId) {
            try {
              const inventory = vehicleInstances.find(inv => inv.vehicleInstanceId === testDrive.vehicleInstanceId);
              if (inventory && inventory.vehicleDetails) {
                await vehicleInstanceAPI.update(testDrive.vehicleInstanceId, {
                  VehicleId: inventory.vehicleDetails.vehicleId,
                  Vin: inventory.vehicleDetails.vin,
                  EngineNumber: inventory.vehicleDetails.engineNumber,
                  Status: 'Available'
                });
                console.log('Updated vehicle instance status to Available');
              }
            } catch (error) {
              console.error('Error updating vehicle instance status:', error);
            }
          }

          message.success('Đã hủy lịch hẹn');
          await fetchData();
        } catch (error) {
          console.error('Error cancelling:', error);
          message.error('Không thể hủy lịch hẹn');
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
      content: 'Bạn có chắc muốn xóa lịch hẹn này?',
      okText: 'Xóa',
      okType: 'danger',
      cancelText: 'Hủy',
      onOk: async () => {
        try {
          setLoading(true);
          await testDriveAPI.delete(id);
          message.success('Đã xóa lịch hẹn');
          await fetchData();
        } catch (error) {
          console.error('Error deleting:', error);
          message.error('Không thể xóa lịch hẹn');
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
        // TODO: Implement create with real API
        const testDriveData = {
          agencyId: getAgencyId(),
          vehicleInstanceId: values.vehicleInstanceId,
          customerId: values.customerId,
          appointmentDate: values.appointmentDate.format('YYYY-MM-DDTHH:mm:ss.SSS[Z]'),
          status: 'Pending',
          notes: values.notes || ''
        };
        
        await testDriveAPI.create(testDriveData);
        message.success('Đã tạo lịch hẹn lái thử');
        await fetchData();
      } else if (modalMode === 'edit') {
        const updateData = {
          appointmentDate: values.appointmentDate.format('YYYY-MM-DDTHH:mm:ss.SSS[Z]'),
          status: values.status,
          notes: values.notes || '',
          feedback: values.feedback || ''
        };
        
        await testDriveAPI.update(selectedTestDrive.id, updateData);

        // Update VehicleInstance status based on new status
        if (selectedTestDrive.vehicleInstanceId) {
          try {
            const inventory = vehicleInstances.find(inv => inv.vehicleInstanceId === selectedTestDrive.vehicleInstanceId);
            if (inventory && inventory.vehicleDetails) {
              let newStatus = null;
              
              if (values.status === 'Scheduled') {
                newStatus = 'Booked';
              } else if (['Completed', 'NoShow', 'Cancelled'].includes(values.status)) {
                newStatus = 'Available';
              }

              if (newStatus) {
                await vehicleInstanceAPI.update(selectedTestDrive.vehicleInstanceId, {
                  VehicleId: inventory.vehicleDetails.vehicleId,
                  Vin: inventory.vehicleDetails.vin,
                  EngineNumber: inventory.vehicleDetails.engineNumber,
                  Status: newStatus
                });
                console.log(`Updated vehicle instance status to ${newStatus}`);
              }
            }
          } catch (error) {
            console.error('Error updating vehicle instance status:', error);
          }
        }

        message.success('Đã cập nhật lịch hẹn');
        await fetchData();
      } else if (modalMode === 'complete') {
        const completeData = {
          appointmentDate: selectedTestDrive.appointmentDate,
          status: 'Completed',
          notes: selectedTestDrive.notes || '',
          feedback: values.feedback
        };
        
        await testDriveAPI.update(selectedTestDrive.id, completeData);

        // Update VehicleInstance status to Available
        if (selectedTestDrive.vehicleInstanceId) {
          try {
            const inventory = vehicleInstances.find(inv => inv.vehicleInstanceId === selectedTestDrive.vehicleInstanceId);
            if (inventory && inventory.vehicleDetails) {
              await vehicleInstanceAPI.update(selectedTestDrive.vehicleInstanceId, {
                VehicleId: inventory.vehicleDetails.vehicleId,
                Vin: inventory.vehicleDetails.vin,
                EngineNumber: inventory.vehicleDetails.engineNumber,
                Status: 'Available'
              });
              console.log('Updated vehicle instance status to Available');
            }
          } catch (error) {
            console.error('Error updating vehicle instance status:', error);
          }
        }

        message.success('Đã hoàn thành lịch hẹn lái thử');
        await fetchData();
      }
      
      setIsModalOpen(false);
      form.resetFields();
    } catch (error) {
      console.error('Error submitting form:', error);
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
      title: 'Khách hàng',
      key: 'customer',
      width: 220,
      render: (_, record) => (
        <div>
          <div><Text strong>{record.customer?.fullName || 'N/A'}</Text></div>
          <div>
            <PhoneOutlined style={{ marginRight: '4px' }} />
            <Text type="secondary" style={{ fontSize: '12px' }}>{record.customer?.phone || 'N/A'}</Text>
          </div>
        </div>
      )
    },
    {
      title: 'Xe lái thử',
      key: 'vehicle',
      width: 200,
      render: (_, record) => (
        <div>
          <div>
            <CarOutlined style={{ marginRight: '8px' }} />
            <Text strong>{record.vehicle?.modelName || 'N/A'}</Text>
          </div>
          <div>
            <Text type="secondary" style={{ fontSize: '12px' }}>{record.vehicle?.variantName || 'N/A'}</Text>
          </div>
        </div>
      )
    },
    {
      title: 'Showroom',
      dataIndex: 'agencyName',
      key: 'agencyName',
      width: 180
    },
    {
      title: 'Ngày hẹn',
      dataIndex: 'appointmentDate',
      key: 'appointmentDate',
      width: 160,
      render: (date) => (
        <div>
          <CalendarOutlined style={{ marginRight: '8px', color: '#1890ff' }} />
          {dayjs(date).format('DD/MM/YYYY HH:mm')}
        </div>
      )
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 140,
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

        if (record.status === 'Pending') {
          items.push(
            {
              key: 'confirm',
              icon: <CheckCircleOutlined />,
              label: 'Xác nhận',
              onClick: () => handleConfirm(record.id)
            }
          );
        }

        if (['Pending', 'Scheduled'].includes(record.status)) {
          items.push(
            {
              key: 'edit',
              icon: <EditOutlined />,
              label: 'Chỉnh sửa',
              onClick: () => handleEdit(record)
            }
          );
        }

        if (record.status === 'Scheduled') {
          items.push({
            key: 'complete',
            icon: <CheckCircleOutlined />,
            label: 'Hoàn thành',
            onClick: () => handleComplete(record)
          });
        }

        if (['Pending', 'Scheduled'].includes(record.status)) {
          items.push({
            type: 'divider'
          }, {
            key: 'cancel',
            icon: <CloseCircleOutlined />,
            label: 'Hủy lịch',
            danger: true,
            onClick: () => handleCancel(record.id)
          });
        }        items.push({
          type: 'divider'
        }, {
          key: 'delete',
          icon: <DeleteOutlined />,
          label: 'Xóa',
          danger: true,
          onClick: () => handleDelete(record.id)
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

  // Calculate statistics
  const stats = {
    total: testDrives.length,
    scheduled: testDrives.filter(td => td.status === 'Pending').length,
    confirmed: testDrives.filter(td => td.status === 'Scheduled').length,
    completed: testDrives.filter(td => td.status === 'Completed').length,
    cancelled: testDrives.filter(td => td.status === 'Cancelled').length
  };

  return (
    <Spin spinning={loading} tip="Đang tải dữ liệu...">
      <div className="test-drive-page">
      <div className="page-header" style={{ marginBottom: '24px' }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Title level={2}>
              <CarOutlined /> Lịch hẹn lái thử
            </Title>
            <Text type="secondary">Quản lý lịch hẹn lái thử của khách hàng</Text>
          </Col>
          <Col>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              size="large"
              onClick={handleCreate}
            >
              Tạo lịch hẹn mới
            </Button>
          </Col>
        </Row>
      </div>

      {/* Statistics */}
      <Row gutter={16} style={{ marginBottom: '24px' }}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Đã đặt lịch"
              value={stats.scheduled}
              prefix={<CalendarOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Đã xác nhận"
              value={stats.confirmed}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Hoàn thành"
              value={stats.completed}
              valueStyle={{ color: '#389e0d' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Đã hủy"
              value={stats.cancelled}
              valueStyle={{ color: '#f5222d' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Test Drives Table */}
      <Card>
        <Table
          columns={columns}
          dataSource={testDrives}
          rowKey="id"
          scroll={{ x: 1300 }}
          pagination={{
            pageSize: 10,
            showTotal: (total) => `Tổng ${total} lịch hẹn`
          }}
        />
      </Card>

      {/* Form Modal */}
      <Modal
        title={
          modalMode === 'create' ? 'Tạo lịch hẹn lái thử' :
          modalMode === 'edit' ? 'Chỉnh sửa lịch hẹn' :
          modalMode === 'complete' ? 'Hoàn thành lái thử' :
          `Chi tiết lịch hẹn - ${selectedTestDrive?.id}`
        }
        open={isModalOpen}
        onCancel={() => {
          setIsModalOpen(false);
          form.resetFields();
        }}
        footer={
          modalMode === 'view' ? [
            <Button key="close" onClick={() => setIsModalOpen(false)}>
              Đóng
            </Button>
          ] : [
            <Button key="cancel" onClick={() => setIsModalOpen(false)}>
              Hủy
            </Button>,
            <Button key="submit" type="primary" onClick={handleSubmit}>
              {modalMode === 'create' ? 'Tạo lịch hẹn' : 
               modalMode === 'complete' ? 'Hoàn thành' : 'Cập nhật'}
            </Button>
          ]
        }
        width={700}
      >
        {modalMode === 'view' && selectedTestDrive ? (
          <>
            <Descriptions bordered column={2} style={{ marginBottom: '24px' }}>
              <Descriptions.Item label="ID" span={2}>
                <Text strong code>#{selectedTestDrive.id}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Khách hàng">
                <UserOutlined /> {selectedTestDrive.customer?.fullName || 'N/A'}
              </Descriptions.Item>
              <Descriptions.Item label="Số điện thoại">
                <PhoneOutlined /> {selectedTestDrive.customer?.phone || 'N/A'}
              </Descriptions.Item>
              <Descriptions.Item label="Email">
                {selectedTestDrive.customer?.email || 'N/A'}
              </Descriptions.Item>
              <Descriptions.Item label="Địa chỉ">
                {selectedTestDrive.customer?.address || 'N/A'}
              </Descriptions.Item>
              <Descriptions.Item label="Xe lái thử" span={2}>
                <CarOutlined /> {selectedTestDrive.vehicle?.modelName || 'N/A'} - {selectedTestDrive.vehicle?.variantName || 'N/A'}
              </Descriptions.Item>
              <Descriptions.Item label="Màu sắc">
                {selectedTestDrive.vehicle?.color || 'N/A'}
              </Descriptions.Item>
              <Descriptions.Item label="Số khung (VIN)">
                {selectedTestDrive.vehicle?.vin || 'N/A'}
              </Descriptions.Item>
              <Descriptions.Item label="Dung lượng pin">
                {selectedTestDrive.vehicle?.batteryCapacity || 'N/A'}
              </Descriptions.Item>
              <Descriptions.Item label="Phạm vi hoạt động">
                {selectedTestDrive.vehicle?.rangeKM ? `${selectedTestDrive.vehicle.rangeKM} km` : 'N/A'}
              </Descriptions.Item>
              <Descriptions.Item label="Showroom" span={2}>
                {selectedTestDrive.agencyName || 'N/A'}
              </Descriptions.Item>
              <Descriptions.Item label="Ngày hẹn" span={2}>
                <CalendarOutlined /> {dayjs(selectedTestDrive.appointmentDate).format('DD/MM/YYYY HH:mm')}
              </Descriptions.Item>
              <Descriptions.Item label="Trạng thái" span={2}>
                <Tag icon={getStatusInfo(selectedTestDrive.status).icon} 
                     color={getStatusInfo(selectedTestDrive.status).color}>
                  {getStatusInfo(selectedTestDrive.status).text}
                </Tag>
              </Descriptions.Item>
              {selectedTestDrive.notes && (
                <Descriptions.Item label="Ghi chú" span={2}>
                  {selectedTestDrive.notes}
                </Descriptions.Item>
              )}
              {selectedTestDrive.feedback && (
                <Descriptions.Item label="Phản hồi" span={2}>
                  <Card size="small" style={{ background: '#f0f2f5' }}>
                    {selectedTestDrive.feedback}
                  </Card>
                </Descriptions.Item>
              )}
            </Descriptions>

            {/* <Timeline style={{ marginTop: '24px' }}>
              <Timeline.Item color="green">
                <Text>Tạo lịch hẹn</Text>
                <br />
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  {dayjs(selectedTestDrive.createAt).format('DD/MM/YYYY HH:mm')}
                </Text>
              </Timeline.Item>
              {selectedTestDrive.status !== 'Pending' && (
                <Timeline.Item color={getStatusInfo(selectedTestDrive.status).color}>
                  <Text>{getStatusInfo(selectedTestDrive.status).text}</Text>
                  <br />
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    {dayjs(selectedTestDrive.updateAt).format('DD/MM/YYYY HH:mm')}
                  </Text>
                </Timeline.Item>
              )}
            </Timeline> */}
          </>
        ) : modalMode === 'complete' ? (
          <Form form={form} layout="vertical" style={{ marginTop: '24px' }}>
            <Form.Item
              name="feedback"
              label="Phản hồi của khách hàng"
              rules={[{ required: true, message: 'Nhập phản hồi của khách hàng' }]}
            >
              <TextArea
                rows={4}
                placeholder="Ghi nhận phản hồi và đánh giá của khách hàng sau khi lái thử..."
              />
            </Form.Item>
          </Form>
        ) : (
          <Form form={form} layout="vertical" style={{ marginTop: '24px' }}>
            {modalMode === 'create' && (
              <>
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
                <Form.Item
                  name="vehicleInstanceId"
                  label="Xe lái thử"
                  rules={[{ required: true, message: 'Chọn xe' }]}
                >
                  <Select placeholder="Chọn xe" showSearch
                    optionFilterProp="children">
                    {vehicleInstances
                      .filter(inventory => {
                        const status = inventory.status?.toLowerCase();
                        // Show vehicles that are: null, available, or in agency (IN_AGENCY_X)
                        // Exclude: booked, reserved, sold
                        return !status || 
                               status === 'available' || 
                               status.startsWith('in_agency');
                      })
                      .map(inventory => (
                        <Option key={inventory.vehicleInstanceId} value={inventory.vehicleInstanceId}>
                          {inventory.vehicleDetails.modelName} {inventory.vehicleDetails.variantName} - {inventory.vehicleDetails.color} - {inventory.vehicleDetails.engineNumber}
                        </Option>
                      ))}
                  </Select>
                </Form.Item>
              </>
            )}
            <Form.Item
              name="appointmentDate"
              label="Ngày và giờ hẹn"
              rules={[{ required: true, message: 'Chọn ngày giờ hẹn' }]}
            >
              <DatePicker
                showTime
                format="DD/MM/YYYY HH:mm"
                style={{ width: '100%' }}
                placeholder="Chọn ngày và giờ"
              />
            </Form.Item>
            {modalMode === 'edit' && (
              <Form.Item
                name="status"
                label="Trạng thái"
                rules={[{ required: true, message: 'Chọn trạng thái' }]}
              >
                <Select placeholder="Chọn trạng thái">
                  <Option value="Pending">Đã đặt lịch</Option>
                  <Option value="Scheduled">Đã xác nhận</Option>
                  <Option value="Completed">Hoàn thành</Option>
                  <Option value="Cancelled">Đã hủy</Option>
                  <Option value="NoShow">Không đến</Option>
                </Select>
              </Form.Item>
            )}
            <Form.Item name="notes" label="Ghi chú">
              <TextArea
                rows={3}
                placeholder="Ghi chú về yêu cầu đặc biệt của khách hàng..."
              />
            </Form.Item>
            {modalMode === 'edit' && (
              <Form.Item name="feedback" label="Phản hồi của khách hàng">
                <TextArea
                  rows={3}
                  placeholder="Ghi nhận phản hồi và đánh giá của khách hàng..."
                />
              </Form.Item>
            )}
          </Form>
        )}
      </Modal>
      </div>
    </Spin>
  );
};

export default TestDrivePage;
