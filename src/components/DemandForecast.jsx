import React, { useState, useEffect } from "react";
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
    Select, // Thêm Select
} from "antd";
import {
    DeleteOutlined,
    PlusOutlined,
    ReloadOutlined,
    BarChartOutlined,
} from "@ant-design/icons";

const { Title, Text } = Typography;
const { Option } = Select;

// --- API CONFIG ---
const PREDICTION_API_URL = "https://analytic.agencymanagement.online/api/Prediction/demand";
const VEHICLE_API_URL = "https://allocation.agencymanagement.online/api/Vehicle";
const AGENCY_API_URL = "https://agency.agencymanagement.online/api/Agency";

const defaultFormState = {
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 2,
    vehicleId: null, // Để null để bắt buộc chọn
    agencyId: null,
};

export default function DemandForecast() {
    const [form] = Form.useForm();
    const [planRequests, setPlanRequests] = useState([]);
    const [results, setResults] = useState([]);

    // State cho logic xử lý
    const [isLoading, setIsLoading] = useState(false);
    const [isInitLoading, setIsInitLoading] = useState(false); // Loading khi lấy danh sách xe/đại lý

    // State dữ liệu tham chiếu
    const [vehicles, setVehicles] = useState([]);
    const [agencies, setAgencies] = useState([]);

    // === FETCH DATA (Vehicle & Agency) ===
    useEffect(() => {
        const fetchReferenceData = async () => {
            try {
                setIsInitLoading(true);

                // Gọi song song 2 API để tiết kiệm thời gian
                const [vehicleRes, agencyRes] = await Promise.all([
                    fetch(VEHICLE_API_URL),
                    fetch(AGENCY_API_URL)
                ]);

                if (vehicleRes.ok) {
                    const vData = await vehicleRes.json();
                    setVehicles(vData);
                }

                if (agencyRes.ok) {
                    const aData = await agencyRes.json();
                    setAgencies(aData);
                }

            } catch (error) {
                console.error("Error fetching reference data:", error);
                message.warning("Không thể tải danh sách xe hoặc đại lý. ID sẽ được hiển thị thay thế.");
            } finally {
                setIsInitLoading(false);
            }
        };

        fetchReferenceData();
    }, []);

    // === HELPERS ===
    const getVehicleName = (id) => {
        const found = vehicles.find(v => v.id === id);
        // Ưu tiên hiển thị variantName, nếu không có thì modelName, không có nữa thì hiện ID
        return found ? `${found.variantName} - (${found.color}) - (${found.option?.modelName})` : `ID: ${id}`;
    };

    const getAgencyName = (id) => {
        const found = agencies.find(a => a.id === id);
        return found ? found.agencyName : `ID: ${id}`;
    };

    // === HANDLERS ===
    const handleAddPlan = (values) => {
        setPlanRequests((prev) => [...prev, values]);
        message.success("Đã thêm kế hoạch!");
        // Reset form nhưng giữ lại năm/tháng để tiện nhập tiếp
        const currentYear = form.getFieldValue("year");
        const currentMonth = form.getFieldValue("month");
        form.resetFields(["vehicleId", "agencyId"]);
        form.setFieldsValue({ year: currentYear, month: currentMonth });
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
        { title: "Năm", dataIndex: "year", width: 80 },
        { title: "Tháng", dataIndex: "month", width: 80 },
        {
            title: "Xe (Vehicle)",
            dataIndex: "vehicleId",
            render: (id) => <Text strong>{getVehicleName(id)}</Text>
        },
        {
            title: "Đại lý (Agency)",
            dataIndex: "agencyId",
            render: (id) => getAgencyName(id)
        },
        {
            title: "",
            width: 50,
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
            render: (r) => `${r.month}/${r.year}`,
            width: 100
        },
        {
            title: "Xe",
            dataIndex: "vehicleId",
            render: (id) => <Text>{getVehicleName(id)}</Text>
        },
        {
            title: "Đại lý",
            dataIndex: "agencyId",
            render: (id) => getAgencyName(id)
        },
        {
            title: "Dự đoán (xe)",
            dataIndex: "forecastedUnits",
            align: 'right',
            render: (v) => (
                <Text strong type="success" style={{ fontSize: 16 }}>
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
                <Col xs={24} lg={10}>
                    <Card title="1. Lập kế hoạch dự báo" bordered loading={isInitLoading}>
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

                            <Form.Item
                                label="Chọn Xe (Model)"
                                name="vehicleId"
                                rules={[{ required: true, message: "Vui lòng chọn xe" }]}
                            >
                                <Select
                                    placeholder="Chọn mẫu xe..."
                                    showSearch
                                    optionFilterProp="label" // Sửa thành filter theo label để search chính xác hơn
                                    options={vehicles.map(v => ({
                                        value: v.id,
                                        // SỬA LẠI DÒNG NÀY: Thêm .option vào đường dẫn
                                        label: `${v.variantName} - ${v.color} - ${v.option?.modelName}`
                                    }))}
                                />
                            </Form.Item>

                            <Form.Item
                                label="Chọn Đại lý"
                                name="agencyId"
                                rules={[{ required: true, message: "Vui lòng chọn đại lý" }]}
                            >
                                <Select
                                    placeholder="Chọn đại lý..."
                                    showSearch
                                    optionFilterProp="children"
                                    filterOption={(input, option) =>
                                        (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                                    }
                                    options={agencies.map(a => ({
                                        value: a.id,
                                        label: `${a.agencyName} (${a.location})`
                                    }))}
                                />
                            </Form.Item>

                            <Button
                                type="primary"
                                htmlType="submit"
                                block
                                icon={<PlusOutlined />}
                            >
                                Thêm vào danh sách
                            </Button>
                        </Form>

                        {planRequests.length > 0 && (
                            <div style={{ marginTop: 24 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                    <Title level={5} style={{ margin: 0 }}>Danh sách chờ ({planRequests.length})</Title>
                                    <Button type="text" danger size="small" onClick={clearPlans}>Xóa tất cả</Button>
                                </div>

                                <Table
                                    dataSource={planRequests.map((p, i) => ({ ...p, key: i }))}
                                    columns={planColumns}
                                    pagination={{ pageSize: 5 }}
                                    size="small"
                                    scroll={{ x: 400 }}
                                />
                            </div>
                        )}
                    </Card>
                </Col>

                {/* KẾT QUẢ BÊN PHẢI */}
                <Col xs={24} lg={14}>
                    <Card title="2. Kết quả dự báo" bordered>
                        <Space direction="vertical" style={{ width: "100%" }}>
                            <Button
                                type="primary"
                                size="large"
                                block
                                onClick={handleForecast}
                                disabled={planRequests.length === 0}
                                loading={isLoading}
                                icon={<BarChartOutlined />}
                            >
                                {isLoading ? "Đang tính toán AI..." : "Chạy dự báo nhu cầu"}
                            </Button>

                            <Spin spinning={isLoading} tip="AI đang phân tích dữ liệu...">
                                {results.length > 0 ? (
                                    <>
                                        <Table
                                            dataSource={results.map((r, i) => ({ ...r, key: i }))}
                                            columns={resultColumns}
                                            pagination={{ pageSize: 10 }}
                                            bordered
                                        />
                                        <Text type="secondary" style={{ marginTop: 16, display: 'block', textAlign: 'center' }}>
                                            * Dự báo dựa trên dữ liệu lịch sử bán hàng và xu hướng thị trường.
                                        </Text>
                                    </>
                                ) : (
                                    <div style={{ textAlign: 'center', padding: '40px 0', color: '#999' }}>
                                        <BarChartOutlined style={{ fontSize: 48, marginBottom: 16 }} />
                                        <p>Vui lòng thêm kế hoạch và nhấn "Chạy dự báo"</p>
                                    </div>
                                )}
                            </Spin>
                        </Space>
                    </Card>
                </Col>
            </Row>
        </div>
    );
}