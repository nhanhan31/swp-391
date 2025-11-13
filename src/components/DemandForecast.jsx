import React, { useState } from "react";
import {
    Button,
    Card,
    Form,
    InputNumber,
    Table,
    Row,
    Col,
    Space,
    message,
    Spin,
    Typography,
} from "antd";
import {
    DeleteOutlined,
    PlusOutlined,
    ReloadOutlined,
    BarChartOutlined,
} from "@ant-design/icons";

const { Title, Text } = Typography;

const PREDICTION_API_URL = "https://analytic.agencymanagement.online/api/Prediction/demand";
// const PREDICTION_API_URL = "https://localhost:7127/api/Prediction/demand";

const defaultFormState = {
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 2,
    vehicleId: 1,
    agencyId: 1,
};

export default function DemandForecast() {
    const [form] = Form.useForm();
    const [planRequests, setPlanRequests] = useState([]);
    const [results, setResults] = useState([]);
    const [isLoading, setIsLoading] = useState(false);

    // === HANDLERS ===
    const handleAddPlan = (values) => {
        setPlanRequests((prev) => [...prev, values]);
        message.success("Đã thêm kế hoạch!");
        form.resetFields();
        form.setFieldsValue(defaultFormState);
    };

    const handleRemovePlan = (index) => {
        setPlanRequests((prev) => prev.filter((_, i) => i !== index));
    };

    const clearPlans = () => {
        setPlanRequests([]);
        setResults([]);
        message.info("Đã xóa toàn bộ kế hoạch.");
    };

    const handleForecast = async () => {
        if (planRequests.length === 0) {
            message.warning("Bạn cần thêm ít nhất một kế hoạch dự báo!");
            return;
        }

        setIsLoading(true);
        setResults([]);

        try {
            const response = await fetch(PREDICTION_API_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(planRequests),
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.message || `HTTP ${response.status}`);
            }

            const data = await response.json();
            setResults(data);
            message.success("Dự báo thành công!");
        } catch (err) {
            console.error("Forecast error:", err);
            message.error(`Lỗi khi dự báo: ${err.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    // === TABLE COLUMNS ===
    const planColumns = [
        { title: "Năm", dataIndex: "year" },
        { title: "Tháng", dataIndex: "month" },
        { title: "Vehicle ID", dataIndex: "vehicleId" },
        { title: "Agency ID", dataIndex: "agencyId" },
        {
            title: "",
            render: (_, __, index) => (
                <Button
                    danger
                    size="small"
                    icon={<DeleteOutlined />}
                    onClick={() => handleRemovePlan(index)}
                />
            ),
        },
    ];

    const resultColumns = [
        {
            title: "Thời gian",
            render: (r) => `${r.year}/${r.month}`,
        },
        { title: "Vehicle ID", dataIndex: "vehicleId" },
        { title: "Agency ID", dataIndex: "agencyId" },
        {
            title: "Dự đoán (xe)",
            dataIndex: "forecastedUnits",
            render: (v) => (
                <Text strong type="success">
                    {v?.toLocaleString("vi-VN")}
                </Text>
            ),
        },
    ];

    // === UI ===
    return (
        <div style={{ padding: 24, maxWidth: 1400, margin: "0 auto" }}>
            <Title level={2}>
                <BarChartOutlined style={{ marginRight: 8 }} />
                Trang Dự báo Nhu cầu (AI)
            </Title>

            <Row gutter={24}>
                {/* FORM BÊN TRÁI */}
                <Col xs={24} lg={12}>
                    <Card title="1. Lập kế hoạch dự báo" bordered>
                        <Form
                            layout="vertical"
                            form={form}
                            initialValues={defaultFormState}
                            onFinish={handleAddPlan}
                        >
                            <Row gutter={16}>
                                <Col span={12}>
                                    <Form.Item label="Năm" name="year" rules={[{ required: true }]}>
                                        <InputNumber min={2000} max={2100} style={{ width: "100%" }} />
                                    </Form.Item>
                                </Col>
                                <Col span={12}>
                                    <Form.Item label="Tháng" name="month" rules={[{ required: true }]}>
                                        <InputNumber min={1} max={12} style={{ width: "100%" }} />
                                    </Form.Item>
                                </Col>
                            </Row>

                            <Row gutter={16}>
                                <Col span={12}>
                                    <Form.Item
                                        label="Vehicle ID"
                                        name="vehicleId"
                                        rules={[{ required: true }]}
                                    >
                                        <InputNumber min={1} style={{ width: "100%" }} />
                                    </Form.Item>
                                </Col>
                                <Col span={12}>
                                    <Form.Item
                                        label="Agency ID"
                                        name="agencyId"
                                        rules={[{ required: true }]}
                                    >
                                        <InputNumber min={1} style={{ width: "100%" }} />
                                    </Form.Item>
                                </Col>
                            </Row>

                            <Button
                                type="primary"
                                htmlType="submit"
                                block
                                icon={<PlusOutlined />}
                            >
                                Thêm vào kế hoạch
                            </Button>
                        </Form>

                        {planRequests.length > 0 && (
                            <div style={{ marginTop: 24 }}>
                                <Title level={5}>Danh sách kế hoạch</Title>
                                <Table
                                    dataSource={planRequests.map((p, i) => ({ ...p, key: i }))}
                                    columns={planColumns}
                                    pagination={false}
                                    size="small"
                                />
                            </div>
                        )}
                    </Card>
                </Col>

                {/* KẾT QUẢ BÊN PHẢI */}
                <Col xs={24} lg={12}>
                    <Card title="2. Kết quả dự báo" bordered>
                        <Space direction="vertical" style={{ width: "100%" }}>
                            <Button
                                type="primary"
                                block
                                onClick={handleForecast}
                                disabled={planRequests.length === 0}
                                icon={<BarChartOutlined />}
                            >
                                Chạy dự báo ({planRequests.length})
                            </Button>

                            <Button
                                danger
                                block
                                icon={<ReloadOutlined />}
                                onClick={clearPlans}
                                disabled={planRequests.length === 0}
                            >
                                Xóa kế hoạch
                            </Button>

                            <Spin spinning={isLoading} tip="Đang xử lý..." />

                            {results.length > 0 && (
                                <>
                                    <Title level={5}>Kết quả dự báo</Title>
                                    <Table
                                        dataSource={results.map((r, i) => ({ ...r, key: i }))}
                                        columns={resultColumns}
                                        pagination={false}
                                        bordered
                                        size="small"
                                    />
                                </>
                            )}
                        </Space>
                    </Card>
                </Col>
            </Row>
        </div>
    );
}
