import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Modal,
  Form,
  Input,
  Row,
  Col,
  Typography,
  message,
  Descriptions,
  Upload,
  DatePicker,
  Image,
  Badge,
  Dropdown,
  Spin,
  Tag
} from 'antd';
import {
  TruckOutlined,
  EyeOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  EnvironmentOutlined,
  PhoneOutlined,
  MoreOutlined,
  UploadOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { deliveryAPI, orderAPI, customerAPI, quotationAPI, installmentAPI, contractAPI } from '../services/quotationService';
import { useAuth } from '../context/AuthContext';

const { Title, Text } = Typography;
const { TextArea } = Input;

const DeliveryPage = () => {
  const { currentUser, getAgencyId } = useAuth();
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('view');
  const [selectedDelivery, setSelectedDelivery] = useState(null);
  const [form] = Form.useForm();
  const [imageAfterFile, setImageAfterFile] = useState(null);
  const [imageAfterPreview, setImageAfterPreview] = useState(null);

  // Fetch deliveries from API
  useEffect(() => {
    const fetchDeliveries = async () => {
      const agencyId = getAgencyId();
      if (!agencyId) {
        console.log('DeliveryPage - No agencyId found');
        return;
      }

      setLoading(true);
      try {
        const deliveriesData = await deliveryAPI.getByAgencyId(agencyId);
        console.log('Deliveries data:', deliveriesData);

        // 1. Get all orders for this agency at once
        const orders = await orderAPI.getByAgencyId(agencyId);
        console.log('Orders data:', orders);

        // Transform and enrich data
        const enrichedDeliveries = await Promise.all(
          deliveriesData.map(async (delivery) => {
            try {
              // 2. Find order from the orders array
              const order = orders.find(o => o.id === delivery.orderId);
              console.log('Found order:', order);
              
              // 3. Get customer from order.customerId
              let customer = null;
              if (order && order.customerId) {
                customer = await customerAPI.getById(order.customerId);
                console.log('Customer data:', customer);
              }

              // 4. Get quotation from order.details[].quotationId
              let quotation = null;
              let vehicleInfo = {
                name: 'N/A',
                vin: 'N/A',
                color: 'N/A',
                modelName: 'N/A',
                variantName: 'N/A'
              };

              if (order && order.details && order.details.length > 0) {
                const quotationId = order.details[0].quotationId;
                try {
                  quotation = await quotationAPI.getById(quotationId);
                  console.log('Quotation data:', quotation);
                  
                  // 5. Get vehicle info from quotation
                  if (quotation && quotation.vehicle) {
                    vehicleInfo = {
                      name: `${quotation.vehicle.modelName || ''} ${quotation.vehicle.variantName || ''}`.trim(),
                      vin: quotation.vehicle.vin || 'N/A',
                      color: quotation.vehicle.color || 'N/A',
                      modelName: quotation.vehicle.modelName || 'N/A',
                      variantName: quotation.vehicle.variantName || 'N/A',
                      batteryCapacity: quotation.vehicle.batteryCapacity || 'N/A',
                      rangeKM: quotation.vehicle.rangeKM || 'N/A'
                    };
                  }
                } catch (error) {
                  console.error('Error fetching quotation:', error);
                }
              }

              return {
                ...delivery,
                order: order,
                customer: customer,
                quotation: quotation,
                vehicle: vehicleInfo,
                // For backward compatibility
                customer_name: customer?.fullName || 'N/A',
                customer_phone: customer?.phone || 'N/A',
                customer_address: customer?.address || 'N/A',
                vehicle_name: vehicleInfo.name,
                delivery_status: delivery.deliveryStatus?.toLowerCase() || 'pending'
              };
            } catch (error) {
              console.error('Error enriching delivery:', error);
              return {
                ...delivery,
                customer_name: 'N/A',
                customer_phone: 'N/A',
                customer_address: 'N/A',
                vehicle_name: 'N/A',
                delivery_status: delivery.deliveryStatus?.toLowerCase() || 'pending'
              };
            }
          })
        );

        setDeliveries(enrichedDeliveries);
      } catch (error) {
        console.error('Error fetching deliveries:', error);
        message.error('Không thể tải danh sách giao xe');
      } finally {
        setLoading(false);
      }
    };

    fetchDeliveries();
  }, [currentUser, getAgencyId]);

  // Get delivery status info
  const getDeliveryStatusInfo = (status) => {
    const statusMap = {
      pending: { 
        color: 'warning', 
        text: 'Đang giao', 
        icon: <ClockCircleOutlined />
      },
      delivered: { 
        color: 'success', 
        text: 'Đã giao xe', 
        icon: <CheckCircleOutlined />
      }
    };
    return statusMap[status] || statusMap.pending;
  };

  // Handle view
  const handleView = (record) => {
    setSelectedDelivery(record);
    setModalMode('view');
    setIsModalOpen(true);
  };

  // Handle complete delivery
  const handleCompleteDelivery = (delivery) => {
    setSelectedDelivery(delivery);
    setModalMode('complete');
    setImageAfterFile(null);
    setImageAfterPreview(null);
    form.setFieldsValue({
      actual_delivery_date: dayjs(),
      notes: delivery.notes || ''
    });
    setIsModalOpen(true);
  };

  // Handle image file change
  const handleImageChange = (info) => {
    if (info.file) {
      const file = info.file.originFileObj || info.file;
      setImageAfterFile(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setImageAfterPreview(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Submit complete delivery
  const handleSubmitComplete = async () => {
    try {
      const values = await form.validateFields();
      
      if (!imageAfterFile) {
        message.warning('Vui lòng tải lên ảnh xe sau khi giao');
        return;
      }

      setLoading(true);

      // Update delivery with image
      await deliveryAPI.update(selectedDelivery.id, {
        deliveryDate: values.actual_delivery_date.toISOString(),
        deliveryStatus: 'Delivered',
        notes: values.notes || '',
        imgUrlAfter: imageAfterFile
      });

      // Update order status based on payment completion
      if (selectedDelivery.order && selectedDelivery.order.id) {
        try {
          const currentOrderStatus = selectedDelivery.order.status?.toLowerCase();
          let newOrderStatus = 'Completed';
          
          // Check if customer has finished installment payment
          // 1. Find contract by quotationId
          if (selectedDelivery.order.details && selectedDelivery.order.details.length > 0) {
            const quotationId = selectedDelivery.order.details[0].quotationId;
            
            try {
              // Get all contracts and find the one with matching quotationId
              const agencyId = getAgencyId();
              const contracts = await contractAPI.getByAgencyId(agencyId);
              const matchingContract = contracts.find(c => c.quotationId === quotationId);
              
              if (matchingContract) {
                console.log('Found contract for order:', matchingContract);
                
                // 2. Get installment plans for this contract
                const installmentPlans = await installmentAPI.getByContractId(matchingContract.id);
                console.log('Installment plans:', installmentPlans);
                
                // 3. Check if any installment plan is not completed
                const hasUncompletedInstallment = installmentPlans.some(plan => {
                  const status = plan.status?.toLowerCase();
                  return status !== 'completed';
                });
                
                if (hasUncompletedInstallment) {
                  // Has installment plan and not completed yet
                  newOrderStatus = 'Pending-Payment';
                  console.log('Customer has uncompleted installment payment, setting status to Pending-Payment');
                } else if (installmentPlans.length > 0) {
                  // Has installment plan and all completed
                  newOrderStatus = 'Completed';
                  console.log('All installment payments completed, setting status to Completed');
                } else {
                  // No installment plan, check order status
                  if (currentOrderStatus === 'partial-ready') {
                    newOrderStatus = 'Pending-Payment';
                  } else if (currentOrderStatus === 'paid') {
                    newOrderStatus = 'Completed';
                  }
                }
              } else {
                // No contract found, fallback to order status
                if (currentOrderStatus === 'partial-ready') {
                  newOrderStatus = 'Pending-Payment';
                } else if (currentOrderStatus === 'paid') {
                  newOrderStatus = 'Completed';
                }
              }
            } catch (error) {
              console.error('Error checking installment status:', error);
              // Fallback to order status
              if (currentOrderStatus === 'partial-ready') {
                newOrderStatus = 'Pending-Payment';
              } else if (currentOrderStatus === 'paid') {
                newOrderStatus = 'Completed';
              }
            }
          }
          
          await orderAPI.update(selectedDelivery.order.id, newOrderStatus);
          console.log(`Order status updated from ${currentOrderStatus} to ${newOrderStatus}`);
        } catch (error) {
          console.error('Error updating order status:', error);
          message.warning('Giao xe thành công nhưng không thể cập nhật trạng thái đơn hàng');
        }
      }

      message.success('Hoàn thành giao xe thành công');
      setIsModalOpen(false);
      form.resetFields();
      setImageAfterFile(null);
      setImageAfterPreview(null);

      // Refresh deliveries
      const agencyId = getAgencyId();
      const deliveriesData = await deliveryAPI.getByAgencyId(agencyId);
      
      // Get all orders for this agency at once
      const orders = await orderAPI.getByAgencyId(agencyId);
      
      const enrichedDeliveries = await Promise.all(
        deliveriesData.map(async (delivery) => {
          try {
            // Find order from the orders array
            const order = orders.find(o => o.id === delivery.orderId);
            
            // Get customer from order.customerId
            let customer = null;
            if (order && order.customerId) {
              customer = await customerAPI.getById(order.customerId);
            }

            // Get quotation from order.details[].quotationId
            let quotation = null;
            let vehicleInfo = {
              name: 'N/A',
              vin: 'N/A',
              color: 'N/A',
              modelName: 'N/A',
              variantName: 'N/A'
            };

            if (order && order.details && order.details.length > 0) {
              const quotationId = order.details[0].quotationId;
              try {
                quotation = await quotationAPI.getById(quotationId);
                
                // Get vehicle info from quotation
                if (quotation && quotation.vehicle) {
                  vehicleInfo = {
                    name: `${quotation.vehicle.modelName || ''} ${quotation.vehicle.variantName || ''}`.trim(),
                    vin: quotation.vehicle.vin || 'N/A',
                    color: quotation.vehicle.color || 'N/A',
                    modelName: quotation.vehicle.modelName || 'N/A',
                    variantName: quotation.vehicle.variantName || 'N/A',
                    batteryCapacity: quotation.vehicle.batteryCapacity || 'N/A',
                    rangeKM: quotation.vehicle.rangeKM || 'N/A'
                  };
                }
              } catch (error) {
                console.error('Error fetching quotation:', error);
              }
            }

            return {
              ...delivery,
              order: order,
              customer: customer,
              quotation: quotation,
              vehicle: vehicleInfo,
              // For backward compatibility
              customer_name: customer?.fullName || 'N/A',
              customer_phone: customer?.phone || 'N/A',
              customer_address: customer?.address || 'N/A',
              vehicle_name: vehicleInfo.name,
              delivery_status: delivery.deliveryStatus?.toLowerCase() || 'pending'
            };
          } catch (error) {
            console.error('Error enriching delivery:', error);
            return {
              ...delivery,
              customer_name: 'N/A',
              customer_phone: 'N/A',
              customer_address: 'N/A',
              vehicle_name: 'N/A',
              delivery_status: delivery.deliveryStatus?.toLowerCase() || 'pending'
            };
          }
        })
      );
      setDeliveries(enrichedDeliveries);

    } catch (error) {
      console.error('Error completing delivery:', error);
      message.error('Không thể hoàn thành giao xe');
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 80,
      render: (text) => <Text strong code>{text}</Text>
    },
    {
      title: 'Mã đơn hàng',
      dataIndex: 'orderId',
      key: 'orderId',
      width: 120,
      render: (text) => <Text code>ORD{text}</Text>
    },
    {
      title: 'Khách hàng',
      key: 'customer',
      width: 200,
      render: (_, record) => (
        <div>
          <Text strong>{record.customer_name}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: '12px' }}>
            <PhoneOutlined /> {record.customer_phone}
          </Text>
        </div>
      )
    },
    {
      title: 'Xe giao',
      dataIndex: 'vehicle_name',
      key: 'vehicle_name',
      width: 200
    },
    {
      title: 'Ngày giao',
      dataIndex: 'deliveryDate',
      key: 'deliveryDate',
      width: 150,
      render: (date) => dayjs(date).format('DD/MM/YYYY HH:mm')
    },
    {
      title: 'Trạng thái',
      dataIndex: 'delivery_status',
      key: 'delivery_status',
      width: 130,
      render: (status) => {
        const statusInfo = getDeliveryStatusInfo(status);
        return (
          <Badge
            status={statusInfo.color}
            text={statusInfo.text}
          />
        );
      }
    },
    {
      title: 'Thao tác',
      key: 'actions',
      width: 100,
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

        // Only show complete button if not delivered yet
        if (record.delivery_status !== 'delivered') {
          items.push({
            key: 'complete',
            icon: <CheckCircleOutlined />,
            label: 'Hoàn thành giao xe',
            onClick: () => handleCompleteDelivery(record)
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

  // Calculate statistics
  const stats = {
    total: deliveries.length,
    pending: deliveries.filter(d => d.delivery_status === 'pending').length,
    delivered: deliveries.filter(d => d.delivery_status === 'delivered').length
  };

  return (
    <div className="delivery-page">
      <div className="page-header" style={{ marginBottom: '24px' }}>
        <Title level={2}>
          <TruckOutlined /> Quản lý giao xe
        </Title>
        <Text type="secondary">Theo dõi và quản lý tiến trình giao xe cho khách hàng</Text>
      </div>

      {/* Statistics */}
      <Row gutter={16} style={{ marginBottom: '24px' }}>
        <Col xs={24} sm={12} md={8}>
          <Card>
            <div style={{ textAlign: 'center' }}>
              <TruckOutlined style={{ fontSize: '32px', color: '#1890ff' }} />
              <Title level={2} style={{ margin: '8px 0', color: '#1890ff' }}>
                {stats.total}
              </Title>
              <Text type="secondary">Tổng giao xe</Text>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Card>
            <div style={{ textAlign: 'center' }}>
              <ClockCircleOutlined style={{ fontSize: '32px', color: '#faad14' }} />
              <Title level={2} style={{ margin: '8px 0', color: '#faad14' }}>
                {stats.pending}
              </Title>
              <Text type="secondary">Đang giao</Text>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Card>
            <div style={{ textAlign: 'center' }}>
              <CheckCircleOutlined style={{ fontSize: '32px', color: '#52c41a' }} />
              <Title level={2} style={{ margin: '8px 0', color: '#52c41a' }}>
                {stats.delivered}
              </Title>
              <Text type="secondary">Đã giao</Text>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Deliveries Table */}
      <Card>
        <Spin spinning={loading}>
          <Table
            columns={columns}
            dataSource={deliveries}
            rowKey="id"
            scroll={{ x: 1200 }}
            pagination={{
              pageSize: 10,
              showTotal: (total) => `Tổng ${total} lượt giao xe`
            }}
          />
        </Spin>
      </Card>

      {/* View Modal */}
      <Modal
        title={`Chi tiết giao xe #${selectedDelivery?.id}`}
        open={isModalOpen && modalMode === 'view'}
        onCancel={() => setIsModalOpen(false)}
        footer={[
          <Button key="close" type="primary" onClick={() => setIsModalOpen(false)}>
            Đóng
          </Button>
        ]}
        width={800}
      >
        {selectedDelivery && (
          <>
            {/* Delivery Info */}
            <Descriptions bordered column={2} title="Thông tin giao xe" style={{ marginBottom: '24px' }}>
              <Descriptions.Item label="ID giao xe">
                <Text strong>{selectedDelivery.id}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Ngày giao">
                {dayjs(selectedDelivery.deliveryDate).format('DD/MM/YYYY HH:mm')}
              </Descriptions.Item>
              <Descriptions.Item label="Trạng thái" span={2}>
                <Badge
                  status={getDeliveryStatusInfo(selectedDelivery.delivery_status).color}
                  text={getDeliveryStatusInfo(selectedDelivery.delivery_status).text}
                />
              </Descriptions.Item>
            </Descriptions>

            {/* Order Info */}
            {selectedDelivery.order && (
              <Descriptions bordered column={2} title="Thông tin đơn hàng" style={{ marginBottom: '24px' }}>
                <Descriptions.Item label="Mã đơn hàng">
                  <Text code>ORD{selectedDelivery.order.id}</Text>
                </Descriptions.Item>
                <Descriptions.Item label="Ngày đặt">
                  {dayjs(selectedDelivery.order.orderDate).format('DD/MM/YYYY')}
                </Descriptions.Item>
                <Descriptions.Item label="Tổng tiền">
                  {selectedDelivery.order.totalAmount?.toLocaleString('vi-VN')} VNĐ
                </Descriptions.Item>
                <Descriptions.Item label="Trạng thái đơn">
                  {selectedDelivery.order.status}
                </Descriptions.Item>
              </Descriptions>
            )}

            {/* Customer Info */}
            {selectedDelivery.customer && (
              <Descriptions bordered column={2} title="Thông tin khách hàng" style={{ marginBottom: '24px' }}>
                <Descriptions.Item label="Tên khách hàng">
                  <Text strong>{selectedDelivery.customer.fullName}</Text>
                </Descriptions.Item>
                <Descriptions.Item label="Số điện thoại">
                  <PhoneOutlined /> {selectedDelivery.customer.phone}
                </Descriptions.Item>
                <Descriptions.Item label="Email">
                  {selectedDelivery.customer.email || 'N/A'}
                </Descriptions.Item>
                <Descriptions.Item label="Địa chỉ">
                  <EnvironmentOutlined /> {selectedDelivery.customer.address || 'N/A'}
                </Descriptions.Item>
              </Descriptions>
            )}

            {/* Vehicle Info */}
            {selectedDelivery.vehicle && (
              <Descriptions bordered column={2} title="Thông tin xe" style={{ marginBottom: '24px' }}>
                <Descriptions.Item label="Mẫu xe" span={2}>
                  <Text strong>{selectedDelivery.vehicle.modelName}</Text>
                </Descriptions.Item>
                <Descriptions.Item label="Phiên bản">
                  {selectedDelivery.vehicle.variantName}
                </Descriptions.Item>
                <Descriptions.Item label="Màu sắc">
                  {selectedDelivery.vehicle.color}
                </Descriptions.Item>
                <Descriptions.Item label="Số VIN">
                  <Text code>{selectedDelivery.vehicle.vin}</Text>
                </Descriptions.Item>
                <Descriptions.Item label="Dung lượng pin">
                  {selectedDelivery.vehicle.batteryCapacity}
                </Descriptions.Item>
                {selectedDelivery.vehicle.rangeKM !== 'N/A' && (
                  <Descriptions.Item label="Phạm vi hoạt động" span={2}>
                    {selectedDelivery.vehicle.rangeKM} km
                  </Descriptions.Item>
                )}
              </Descriptions>
            )}

            {/* Images */}
            {(selectedDelivery.imgUrlBefore || selectedDelivery.imgUrlAfter) && (
              <Card title="Hình ảnh giao xe" style={{ marginBottom: '24px' }}>
                <Row gutter={16}>
                  {selectedDelivery.imgUrlBefore && (
                    <Col span={selectedDelivery.imgUrlAfter ? 12 : 24}>
                      <div>
                        <Text strong>Trước khi giao:</Text>
                        <div style={{ marginTop: 8 }}>
                          <Image
                            src={selectedDelivery.imgUrlBefore}
                            alt="Before delivery"
                            style={{ width: '100%', borderRadius: '4px' }}
                          />
                        </div>
                      </div>
                    </Col>
                  )}
                  {selectedDelivery.imgUrlAfter && (
                    <Col span={selectedDelivery.imgUrlBefore ? 12 : 24}>
                      <div>
                        <Text strong>Sau khi giao:</Text>
                        <div style={{ marginTop: 8 }}>
                          <Image
                            src={selectedDelivery.imgUrlAfter}
                            alt="After delivery"
                            style={{ width: '100%', borderRadius: '4px' }}
                          />
                        </div>
                      </div>
                    </Col>
                  )}
                </Row>
              </Card>
            )}

            {/* Notes */}
            {selectedDelivery.notes && (
              <Card title="Ghi chú">
                <Text>{selectedDelivery.notes}</Text>
              </Card>
            )}
          </>
        )}
      </Modal>

      {/* Complete Delivery Modal */}
      <Modal
        title="Hoàn thành giao xe"
        open={isModalOpen && modalMode === 'complete'}
        onCancel={() => setIsModalOpen(false)}
        onOk={handleSubmitComplete}
        okText="Hoàn thành"
        cancelText="Hủy"
        width={700}
      >
        <Form
          form={form}
          layout="vertical"
          style={{ marginTop: '24px' }}
        >
          <Form.Item
            name="actual_delivery_date"
            label="Thời gian giao xe"
            rules={[{ required: true, message: 'Chọn thời gian giao xe' }]}
          >
            <DatePicker
              showTime
              format="DD/MM/YYYY HH:mm"
              style={{ width: '100%' }}
            />
          </Form.Item>

          <Form.Item
            label="Ảnh xe sau khi giao"
            required
          >
            <Upload
              listType="picture-card"
              maxCount={1}
              beforeUpload={() => false}
              onChange={handleImageChange}
            >
              {!imageAfterPreview && (
                <div>
                  <UploadOutlined />
                  <div style={{ marginTop: 8 }}>Tải ảnh</div>
                </div>
              )}
            </Upload>
            {imageAfterPreview && (
              <div style={{ marginTop: 8 }}>
                <img src={imageAfterPreview} alt="Preview" style={{ maxWidth: '200px', borderRadius: '4px' }} />
              </div>
            )}
          </Form.Item>

          <Form.Item
            name="notes"
            label="Ghi chú"
          >
            <TextArea
              rows={3}
              placeholder="Ghi chú về quá trình giao xe..."
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default DeliveryPage;
