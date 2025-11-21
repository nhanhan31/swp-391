import React, { useMemo, useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Typography,
  Select,
  Statistic,
  Table,
  Tag,
  Progress,
  Space,
  Tooltip,
  Spin,
  message,
  DatePicker
} from 'antd';
import {
  DashboardOutlined,
  CarOutlined,
  ThunderboltOutlined,
  RiseOutlined,
  FallOutlined,
  LineChartOutlined,
  TrophyOutlined,
  AlertOutlined
} from '@ant-design/icons';
import { Column, Line, Area } from '@ant-design/plots';
import dayjs from 'dayjs';
import axios from 'axios';

const ANALYTIC_API = 'https://analytic.agencymanagement.online/api';
const VEHICLE_API = 'https://vehicle.agencymanagement.online/api';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

const ConsumptionSpeedReportPage = () => {
  const [selectedVehicle, setSelectedVehicle] = useState('all');
  const [dateRange, setDateRange] = useState([
    dayjs().subtract(6, 'month').startOf('month'),
    dayjs().endOf('month')
  ]);
  const [analyticData, setAnalyticData] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(false);

  // Fetch vehicles
  useEffect(() => {
    const fetchVehicles = async () => {
      try {
        const response = await axios.get(`${VEHICLE_API}/Vehicle`, {
          headers: {
            'Authorization': `Bearer ${sessionStorage.getItem('token')}`
          }
        });
        setVehicles(response.data || []);
      } catch (error) {
        console.error('Error fetching vehicles:', error);
        message.error('Không thể tải danh sách xe');
      }
    };

    fetchVehicles();
  }, []);

  // Fetch analytic data
  useEffect(() => {
    const fetchAnalyticData = async () => {
      if (!dateRange || dateRange.length !== 2) return;

      setLoading(true);
      try {
        const [startDate, endDate] = dateRange;
        const params = {
          startYear: startDate.year(),
          startMonth: startDate.month() + 1,
          endYear: endDate.year(),
          endMonth: endDate.month() + 1
        };

        if (selectedVehicle !== 'all') {
          params.vehicleId = parseInt(selectedVehicle);
        }

        const response = await axios.get(`${ANALYTIC_API}/Analytic/data`, {
          params,
          headers: {
            'Authorization': `Bearer ${sessionStorage.getItem('token')}`
          }
        });

        setAnalyticData(response.data || []);
      } catch (error) {
        console.error('Error fetching analytic data:', error);
        message.error('Không thể tải dữ liệu phân tích');
      } finally {
        setLoading(false);
      }
    };

    fetchAnalyticData();
  }, [selectedVehicle, dateRange]);

  // Calculate statistics
  const statistics = useMemo(() => {
    if (!analyticData || analyticData.length === 0) {
      return {
        totalSales: 0,
        avgTurnoverRate: 0,
        fastestMoving: null,
        slowestMoving: null,
        vehicleStats: []
      };
    }

    // Group by vehicle and month
    const byVehicle = analyticData.reduce((acc, item) => {
      const vehicle = vehicles.find(v => v.id === item.vehicleId);
      const key = item.vehicleId;
      
      if (!acc[key]) {
        acc[key] = {
          vehicle_id: item.vehicleId,
          model: vehicle?.model || `Vehicle ${item.vehicleId}`,
          totalSales: 0,
          monthlyData: [],
          rollingAvg3: 0,
          rollingAvg6: 0,
          testDrivesTotal: 0,
          quotationsTotal: 0
        };
      }

      acc[key].totalSales += item.unitsSold;
      acc[key].monthlyData.push({
        year: item.year,
        month: item.month,
        sales: item.unitsSold,
        rollingAvg3: item.rollingAvgSales3Months,
        rollingAvg6: item.rollingAvgSales6Months,
        testDrives: item.testDrivesCount,
        quotations: item.quotationsAcceptedCount
      });
      acc[key].testDrivesTotal += item.testDrivesCount || 0;
      acc[key].quotationsTotal += item.quotationsAcceptedCount || 0;

      return acc;
    }, {});

    const vehicleStats = Object.values(byVehicle).map(item => {
      const monthCount = item.monthlyData.length;
      const avgMonthlySales = monthCount > 0 ? Math.round(item.totalSales / monthCount) : 0;
      
      // Calculate avg days to sell based on rolling average
      const lastMonthData = item.monthlyData[item.monthlyData.length - 1];
      const avgSales = lastMonthData?.rollingAvg3 || avgMonthlySales || 1;
      const avgDaysToSell = avgSales > 0 ? Math.round(30 / avgSales) : 30;
      
      // Calculate turnover rate (times per year)
      const turnoverRate = avgDaysToSell > 0 ? Math.round((365 / avgDaysToSell) * 10) / 10 : 0;
      
      // Calculate trend (last 3 months vs previous 3 months)
      let trend = 'stable';
      let trendPercent = 0;
      
      if (item.monthlyData.length >= 6) {
        const recentMonths = item.monthlyData.slice(-3);
        const previousMonths = item.monthlyData.slice(-6, -3);
        const recentAvg = recentMonths.reduce((sum, m) => sum + m.sales, 0) / 3;
        const previousAvg = previousMonths.reduce((sum, m) => sum + m.sales, 0) / 3;
        
        if (previousAvg > 0) {
          trendPercent = Math.round(((recentAvg - previousAvg) / previousAvg) * 100);
          trend = recentAvg > previousAvg ? 'up' : recentAvg < previousAvg ? 'down' : 'stable';
        }
      }

      // Calculate conversion rate (quotations to sales)
      const conversionRate = item.quotationsTotal > 0 
        ? Math.round((item.totalSales / item.quotationsTotal) * 100) 
        : 0;

      return {
        ...item,
        avgDaysToSell,
        avgMonthlySales,
        turnoverRate,
        trend,
        trendPercent,
        conversionRate
      };
    }).sort((a, b) => a.avgDaysToSell - b.avgDaysToSell);

    const totalSales = vehicleStats.reduce((sum, item) => sum + item.totalSales, 0);
    const avgTurnoverRate = vehicleStats.length > 0
      ? Math.round((vehicleStats.reduce((sum, item) => sum + item.turnoverRate, 0) / vehicleStats.length) * 10) / 10
      : 0;
    const fastestMoving = vehicleStats[0] || null;
    const slowestMoving = vehicleStats[vehicleStats.length - 1] || null;

    return {
      totalSales,
      avgTurnoverRate,
      fastestMoving,
      slowestMoving,
      vehicleStats
    };
  }, [analyticData, vehicles]);

  // Data for charts
  const chartData = useMemo(() => {
    if (!analyticData || analyticData.length === 0) return [];

    // Group by vehicle and month
    const grouped = analyticData.reduce((acc, item) => {
      const vehicle = vehicles.find(v => v.id === item.vehicleId);
      const monthKey = `T${item.month}/${item.year}`;
      
      acc.push({
        vehicle_id: item.vehicleId,
        model: vehicle?.model || `Vehicle ${item.vehicleId}`,
        month: monthKey,
        sales: item.unitsSold,
        rollingAvg3: item.rollingAvgSales3Months,
        rollingAvg6: item.rollingAvgSales6Months,
        avg_days_to_sell: item.rollingAvgSales3Months > 0 
          ? Math.round(30 / item.rollingAvgSales3Months)
          : 30,
        turnoverRate: item.rollingAvgSales3Months > 0
          ? Math.round((365 / (30 / item.rollingAvgSales3Months)) * 10) / 10
          : 0
      });

      return acc;
    }, []);

    return grouped.sort((a, b) => {
      const [monthA, yearA] = a.month.replace('T', '').split('/').map(Number);
      const [monthB, yearB] = b.month.replace('T', '').split('/').map(Number);
      return yearA - yearB || monthA - monthB;
    });
  }, [analyticData, vehicles]);

  // Line chart - Sales trend
  const lineConfig = {
    data: chartData,
    xField: 'month',
    yField: 'sales',
    seriesField: 'model',
    smooth: true,
    animation: {
      appear: {
        animation: 'path-in',
        duration: 1000
      }
    },
    point: {
      size: 4,
      shape: 'circle'
    }
  };

  // Area chart - Days to sell
  const areaConfig = {
    data: chartData,
    xField: 'month',
    yField: 'avg_days_to_sell',
    seriesField: 'model',
    smooth: true,
    areaStyle: {
      fillOpacity: 0.3
    },
    legend: {
      position: 'top'
    }
  };

  // Column chart - Turnover rate
  const columnConfig = {
    data: chartData,
    xField: 'month',
    yField: 'turnoverRate',
    seriesField: 'model',
    isGroup: true,
    columnStyle: {
      radius: [8, 8, 0, 0]
    },
    legend: { position: 'top' },
    label: {
      position: 'top'
    }
  };

  const columns = [
    {
      title: 'Xếp hạng',
      key: 'rank',
      width: 80,
      align: 'center',
      render: (_, __, index) => (
        index === 0 ? (
          <Tag color="gold" icon={<TrophyOutlined />}>#{index + 1}</Tag>
        ) : (
          <Text strong>#{index + 1}</Text>
        )
      )
    },
    {
      title: 'Mẫu xe',
      dataIndex: 'model',
      key: 'model',
      width: 150,
      render: (text) => (
        <Space>
          <CarOutlined style={{ color: '#1890ff' }} />
          <Text strong>{text}</Text>
        </Space>
      )
    },
    {
      title: 'Tổng doanh số',
      dataIndex: 'totalSales',
      key: 'totalSales',
      width: 120,
      render: (value) => <Text strong style={{ color: '#1890ff' }}>{value} xe</Text>,
      sorter: (a, b) => a.totalSales - b.totalSales
    },
    {
      title: 'TB/tháng',
      dataIndex: 'avgMonthlySales',
      key: 'avgMonthlySales',
      width: 100,
      render: (value) => <Text>{value} xe</Text>
    },
    {
      title: 'Tỷ lệ chuyển đổi',
      dataIndex: 'conversionRate',
      key: 'conversionRate',
      width: 120,
      render: (value) => (
        <Tooltip title="Tỷ lệ báo giá được chấp nhận thành đơn hàng">
          <Text strong style={{ color: value >= 50 ? '#52c41a' : value >= 30 ? '#faad14' : '#ff4d4f' }}>
            {value}%
          </Text>
        </Tooltip>
      ),
      sorter: (a, b) => a.conversionRate - b.conversionRate
    },
    {
      title: 'Thời gian bán',
      dataIndex: 'avgDaysToSell',
      key: 'avgDaysToSell',
      width: 120,
      render: (value) => (
        <Tooltip title="Số ngày trung bình để bán 1 xe">
          <Text strong style={{ color: value <= 25 ? '#52c41a' : value <= 35 ? '#faad14' : '#ff4d4f' }}>
            {value} ngày
          </Text>
        </Tooltip>
      ),
      sorter: (a, b) => a.avgDaysToSell - b.avgDaysToSell
    },
    {
      title: 'Vòng quay',
      dataIndex: 'turnoverRate',
      key: 'turnoverRate',
      width: 150,
      render: (value) => (
        <Tooltip title="Số lần bán hết tồn kho trong 1 năm">
          <Space>
            <ThunderboltOutlined style={{ color: value >= 12 ? '#52c41a' : value >= 10 ? '#faad14' : '#ff4d4f' }} />
            <Text strong>{value} lần/năm</Text>
          </Space>
        </Tooltip>
      ),
      sorter: (a, b) => a.turnoverRate - b.turnoverRate
    },
    {
      title: 'Xu hướng',
      key: 'trend',
      width: 150,
      render: (_, record) => {
        const trendConfig = {
          up: { color: 'success', icon: <RiseOutlined />, text: 'Tăng' },
          down: { color: 'error', icon: <FallOutlined />, text: 'Giảm' },
          stable: { color: 'default', icon: <LineChartOutlined />, text: 'Ổn định' }
        };
        const config = trendConfig[record.trend];
        return (
          <Space>
            <Tag color={config.color} icon={config.icon}>
              {config.text}
            </Tag>
            {record.trend !== 'stable' && (
              <Text type={record.trend === 'up' ? 'success' : 'danger'}>
                {Math.abs(record.trendPercent)}%
              </Text>
            )}
          </Space>
        );
      },
      filters: [
        { text: 'Tăng', value: 'up' },
        { text: 'Giảm', value: 'down' },
        { text: 'Ổn định', value: 'stable' }
      ],
      onFilter: (value, record) => record.trend === value
    },
    {
      title: 'Tốc độ tiêu thụ',
      key: 'speed',
      width: 200,
      render: (_, record) => {
        let status = 'exception';
        let text = 'Chậm';
        if (record.avgDaysToSell <= 25) {
          status = 'success';
          text = 'Rất nhanh';
        } else if (record.avgDaysToSell <= 30) {
          status = 'success';
          text = 'Nhanh';
        } else if (record.avgDaysToSell <= 35) {
          status = 'active';
          text = 'Trung bình';
        }
        
        const percent = Math.round((1 - (record.avgDaysToSell / 45)) * 100);
        return (
          <div>
            <Progress
              percent={percent}
              size="small"
              status={status}
            />
            <Text type="secondary" style={{ fontSize: '12px' }}>{text}</Text>
          </div>
        );
      }
    }
  ];

  return (
    <Spin spinning={loading}>
      <div className="consumption-speed-report-page">
        <div className="page-header" style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <Title level={2}>
              <DashboardOutlined /> Báo cáo tốc độ tiêu thụ
            </Title>
            <Text type="secondary">Phân tích xu hướng và tốc độ bán hàng theo mẫu xe</Text>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <Select
              value={selectedVehicle}
              onChange={setSelectedVehicle}
              style={{ width: 200 }}
              placeholder="Chọn mẫu xe"
            >
              <Select.Option value="all">Tất cả mẫu xe</Select.Option>
              {vehicles.map(vehicle => (
                <Select.Option key={vehicle.id} value={vehicle.id.toString()}>
                  {vehicle.model}
                </Select.Option>
              ))}
            </Select>
            <RangePicker
              value={dateRange}
              onChange={setDateRange}
              picker="month"
              format="MM/YYYY"
              style={{ width: 250 }}
            />
          </div>
        </div>

      <Row gutter={16} style={{ marginBottom: '24px' }}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Tổng doanh số"
              value={statistics.totalSales}
              suffix="xe"
              prefix={<CarOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Vòng quay TB"
              value={statistics.avgTurnoverRate}
              suffix="lần/năm"
              prefix={<ThunderboltOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card bordered>
            <Statistic
              title={
                <Space>
                  <TrophyOutlined style={{ color: '#52c41a' }} />
                  <Text>Bán nhanh nhất</Text>
                </Space>
              }
              value={statistics.fastestMoving?.avgDaysToSell || 0}
              suffix="ngày"
              valueStyle={{ color: '#52c41a', fontSize: '20px' }}
            />
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {statistics.fastestMoving?.model || '-'}
            </Text>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card bordered>
            <Statistic
              title={
                <Space>
                  <AlertOutlined style={{ color: '#ff4d4f' }} />
                  <Text>Bán chậm nhất</Text>
                </Space>
              }
              value={statistics.slowestMoving?.avgDaysToSell || 0}
              suffix="ngày"
              valueStyle={{ color: '#ff4d4f', fontSize: '20px' }}
            />
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {statistics.slowestMoving?.model || '-'}
            </Text>
          </Card>
        </Col>
      </Row>

      <Row gutter={16} style={{ marginBottom: '24px' }}>
        <Col xs={24} lg={12}>
          <Card title="Xu hướng doanh số theo tháng" bordered>
            <Line {...lineConfig} />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="Thời gian bán trung bình" bordered>
            <Area {...areaConfig} />
          </Card>
        </Col>
      </Row>

      <Row gutter={16} style={{ marginBottom: '24px' }}>
        <Col span={24}>
          <Card title="Tốc độ vòng quay hàng tháng" bordered>
            <Column {...columnConfig} />
          </Card>
        </Col>
      </Row>

      <Card title="Phân tích tốc độ tiêu thụ theo mẫu xe">
        <Table
          columns={columns}
          dataSource={statistics.vehicleStats}
          rowKey="vehicle_id"
          pagination={false}
        />
      </Card>
      </div>
    </Spin>
  );
};

export default ConsumptionSpeedReportPage;
