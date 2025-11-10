import React, { useState } from 'react';
import { Form, Input, Button, Card, Typography, message, Row, Col, Divider, Space } from 'antd';
import { UserOutlined, LockOutlined, LoginOutlined } from '@ant-design/icons';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import '../styles/LoginPage.css';

const { Title, Text } = Typography;

const LoginPage = () => {
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const onFinish = async (values) => {
    setLoading(true);
    try {
      const result = await login(values.email, values.password);
      
      if (result.success) {
        message.success('Đăng nhập thành công!');
        navigate('/dashboard');
      } else {
        message.error(result.error || 'Đăng nhập thất bại');
      }
    } catch (error) {
      message.error('Có lỗi xảy ra trong quá trình đăng nhập');
    } finally {
      setLoading(false);
    }
  };

  const demoAccounts = [
    { email: 'adminchat@gmail.com', password: 'Admin@123', role: 'Admin', description: 'Quản trị viên hệ thống' },
    { email: 'evstaff3@gmail.com', password: '123456', role: 'EVM Staff', description: 'Nhân viên hãng xe' },
    { email: 'agencymanager2@gmail.com', password: '123456', role: 'Agency Manager', description: 'Quản lý đại lý' },
    { email: 'agencystaff3@gmail.com', password: '123456', role: 'Agency Staff', description: 'Nhân viên bán hàng' }
  ];

  const handleDemoLogin = (account) => {
    onFinish({ email: account.email, password: account.password });
  };

  return (
    <div className="login-container">
      <div className="login-background">
        <div className="login-overlay"></div>
      </div>
      
      <Row justify="center" align="middle" style={{ minHeight: '100vh', position: 'relative', zIndex: 1 }}>
        <Col xs={22} sm={16} md={12} lg={8} xl={6}>
          <Card className="login-card" bordered={false}>
            <div className="login-header">
              <div className="logo-container">
                <div className="logo">
                  <LoginOutlined style={{ fontSize: '48px', color: '#1890ff' }} />
                </div>
                <Title level={2} style={{ margin: '16px 0 8px 0', textAlign: 'center' }}>
                  VinFast EVM
                </Title>
                <Text type="secondary" style={{ display: 'block', textAlign: 'center', marginBottom: '24px' }}>
                  Hệ thống quản lý xe điện
                </Text>
              </div>
            </div>

            <Form
              name="login"
              onFinish={onFinish}
              autoComplete="off"
              layout="vertical"
              size="large"
            >
              <Form.Item
                name="email"
                rules={[
                  { required: true, message: 'Vui lòng nhập email!' },
                  { type: 'email', message: 'Email không hợp lệ!' }
                ]}
              >
                <Input
                  prefix={<UserOutlined />}
                  placeholder="Email"
                  className="login-input"
                />
              </Form.Item>

              <Form.Item
                name="password"
                rules={[
                  { required: true, message: 'Vui lòng nhập mật khẩu!' }
                ]}
              >
                <Input.Password
                  prefix={<LockOutlined />}
                  placeholder="Mật khẩu"
                  className="login-input"
                />
              </Form.Item>

              <Form.Item>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={loading}
                  block
                  size="large"
                  className="login-button"
                >
                  Đăng nhập
                </Button>
              </Form.Item>
            </Form>

            <Divider>Tài khoản demo</Divider>
            
            <div className="demo-accounts">
              <Space direction="vertical" style={{ width: '100%' }} size="small">
                {demoAccounts.map((account, index) => (
                  <Card
                    key={index}
                    size="small"
                    className="demo-account-card"
                    onClick={() => handleDemoLogin(account)}
                    hoverable
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <Text strong>{account.role}</Text>
                        <br />
                        <Text type="secondary" style={{ fontSize: '12px' }}>
                          {account.description}
                        </Text>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <Text code style={{ fontSize: '11px' }}>
                          {account.email}
                        </Text>
                      </div>
                    </div>
                  </Card>
                ))}
              </Space>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default LoginPage;