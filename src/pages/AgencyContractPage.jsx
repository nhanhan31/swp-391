import React, { useState, useEffect, useRef } from 'react';
import {
  Card,
  Table,
  Row,
  Col,
  Typography,
  Tag,
  Statistic,
  Button,
  Modal,
  Form,
  Input,
  DatePicker,
  message,
  Descriptions,
  Spin,
  Space,
  Select,
  InputNumber,
  Upload,
  Alert,
  Dropdown,
  Image
} from 'antd';
import {
  FileTextOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  WarningOutlined,
  PlusOutlined,
  EyeOutlined,
  FilePdfOutlined,
  FileImageOutlined,
  EditOutlined,
  MoreOutlined,
  UploadOutlined
} from '@ant-design/icons';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import html2pdf from 'html2pdf.js';
import html2canvas from 'html2canvas';
import dayjs from 'dayjs';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { agencyContractAPI, agencyAPI } from '../services/quotationService';

const { Title, Text } = Typography;
const { TextArea } = Input;

const AgencyContractPage = () => {
  const { currentUser, isAdmin, isEVMStaff, isEVStaff, isDealerManager, isAgencyManager } = useAuth();
  const [contractList, setContractList] = useState([]);
  const [agencyList, setAgencyList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [selectedContract, setSelectedContract] = useState(null);
  const [selectedAgency, setSelectedAgency] = useState(null);
  const [form] = Form.useForm();
  const contractPreviewRef = useRef(null);
  const [previewMarkdown, setPreviewMarkdown] = useState('');
  const [contractImageFile, setContractImageFile] = useState(null);
  const [isSignModalOpen, setIsSignModalOpen] = useState(false);

  // Default markdown template
  const defaultContractTemplate = `# Cộng hòa xã hội chủ nghĩa Việt Nam
**Độc lập – Tự do - Hạnh phúc**

---

## HỢP ĐỒNG ĐẠI LÝ

**Số:** {contractNumber}

Hôm nay, ngày {date}, tại Hà Nội

**Chúng tôi gồm:**

### Bên A - VinFast
- **Công ty:** VinFast Trading and Production LLC
- **Giấy phép ĐKKD:** 0123456789
- **Trụ sở:** Vinhomes Ocean Park, Hà Nội
- **Đại diện:** Ông Nguyễn Văn A - Giám đốc

### Bên B - Đại lý
- **Công ty:** {agencyName}
- **Trụ sở:** {agencyAddress}
- **Điện thoại:** {agencyPhone}

---

Sau khi bàn bạc hai bên nhất trí cùng ký kết hợp đồng đại lý với nội dung và các điều khoản sau đây:

### Điều 1: Điều khoản chung
Bên B nhận làm đại lý bán xe điện VinFast cho Bên A.

### Điều 2: Phương thức giao nhận
1. Bên A giao xe đến showroom của Bên B
2. Thời gian giao xe: 15-30 ngày

### Điều 3: Phương thức thanh toán
1. Thanh toán trong vòng 30 ngày
2. Giới hạn mức nợ: 10 tỷ VNĐ

### Điều 4: Giá cả
Tỷ lệ hoa hồng: 5% trên doanh số

### Điều 5-10: Các điều khoản khác
Theo quy định của pháp luật Việt Nam

---

**Thời hạn:** Từ {contractDate} đến {contractEndDate}

 ĐẠI DIỆN BÊN A  ĐẠI DIỆN BÊN B 
--------------------------------
 VinFast  {agencyName} 
 Ký & đóng dấu  Ký & đóng dấu 
`;

  // Fetch agencies and contracts
  useEffect(() => {
    const fetchData = async () => {
      console.log('=== Fetching Agency Contracts ===');
      console.log('Current user:', currentUser);
      console.log('Is Admin:', isAdmin());
      console.log('Is EVMStaff:', isEVMStaff());

      try {
        setLoading(true);

        if (isAdmin() || isEVMStaff()) {
          // Admin/EVMStaff: Fetch all agencies
          console.log('Admin/EVMStaff user - Fetching all agencies');
          const agencies = await agencyAPI.getAll();
          console.log('Agencies Response:', agencies);
          setAgencyList(agencies || []);

          // Fetch contracts for all agencies
          const allContracts = [];
          for (const agency of agencies || []) {
            try {
              console.log(`Fetching contracts for agency ID: ${agency.id}`);
              const contracts = await agencyContractAPI.getByAgencyId(agency.id);
              
              // Add agency info to each contract
              const contractsWithAgency = (contracts || []).map(contract => ({
                ...contract,
                agencyInfo: agency
              }));
              
              allContracts.push(...contractsWithAgency);
            } catch (error) {
              console.error(`Error fetching contracts for agency ${agency.id}:`, error);
            }
          }
          
          console.log('All Contracts:', allContracts);
          setContractList(allContracts);
        } else {
          // Agency user: Fetch only their contracts
          const agencyId = currentUser?.agency?.id;
          console.log('Agency user - Agency ID:', agencyId);
          
          if (!agencyId) {
            console.log('No agency ID found');
            setLoading(false);
            return;
          }

          console.log('Calling API: GET /AgencyContract/' + agencyId);
          const data = await agencyContractAPI.getByAgencyId(agencyId);
          console.log('Agency Contracts Response:', data);
          console.log('First contract status:', data?.[0]?.status);
          console.log('First contract full data:', data?.[0]);
          
          // Add agency info
          const contractsWithAgency = (data || []).map(contract => ({
            ...contract,
            agencyInfo: currentUser.agency
          }));
          
          setContractList(contractsWithAgency);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        console.error('Error details:', error.response?.data);
        message.error('Không thể tải danh sách hợp đồng');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [currentUser, isAdmin, isEVMStaff]);

  // Calculate statistics
  const stats = {
    total: contractList.length,
    pending: contractList.filter(c => c.status === 'Pending').length,
    signed: contractList.filter(c => c.status === 'Signed').length,
    active: contractList.filter(c => c.status === 'Active').length,
    inactive: contractList.filter(c => c.status === 'Inactive').length,
    expired: contractList.filter(c => c.status === 'Expired' || (c.status === 'Active' && dayjs(c.contractEndDate).isBefore(dayjs()))).length
  };

  // Generate contract markdown from form values
  const generateContractMarkdown = (values, agencyOverride = null) => {
    const agency = agencyOverride || selectedAgency || currentUser?.agency;
    const contractDate = values.contractDate ? values.contractDate.format('DD/MM/YYYY') : '{contractDate}';
    const contractEndDate = values.contractEndDate ? values.contractEndDate.format('DD/MM/YYYY') : '{contractEndDate}';
    
    return `<div style="text-align: center;">
  
# Cộng hòa xã hội chủ nghĩa Việt Nam
**Độc lập – Tự do - Hạnh phúc**

---

## HỢP ĐỒNG ĐẠI LÝ

</div>

**Số:** ${values.contractNumber || '{contractNumber}'}

Hôm nay, ngày ${contractDate}, tại ${values.location || 'Hà Nội'}

**Chúng tôi gồm:**

### Bên A - VinFast
- **Công ty:** VinFast Trading and Production LLC
- **Giấy phép ĐKKD:** 0123456789
- **Trụ sở:** Vinhomes Ocean Park, Hà Nội
- **Đại diện:** Ông Nguyễn Văn A - Giám đốc

### Bên B - Đại lý
- **Công ty:** ${agency?.agencyName || values.agency_name || '{agencyName}'}
- **Trụ sở:** ${agency?.address || values.agency_address || '{agencyAddress}'}
- **Điện thoại:** ${agency?.phone || values.agency_phone || '{agencyPhone}'}
- **Đại diện:** ${agency?.users?.find(u => u.role === 'AgencyManager')?.fullName || 'N/A'} - Giám đốc

---

Sau khi bàn bạc hai bên nhất trí cùng ký kết hợp đồng đại lý với nội dung và các điều khoản sau đây:

### Điều 1: Điều khoản chung
Bên B nhận làm đại lý bán xe điện VinFast cho Bên A với các dòng xe đã được Bên A cung cấp danh sách và theo đăng ký chất lượng do Bên A sản xuất và kinh doanh.

### Điều 2: Phương thức giao nhận
1. Bên A giao xe đến showroom của Bên B hoặc tại địa điểm thuận tiện do Bên B chỉ định.
2. Bên B đặt hàng với số lượng, model xe cụ thể qua hệ thống quản lý.
3. Thời gian giao xe: 15-30 ngày kể từ ngày đặt hàng.

### Điều 3: Phương thức thanh toán
1. Bên B thanh toán cho Bên A trong vòng 30 ngày kể từ ngày cuối của tháng nhận xe.
2. Giới hạn mức nợ: Bên B được nợ tối đa **${values.debt_limit || '10 tỷ'}** VNĐ.

### Điều 4: Giá cả
1. Các sản phẩm cung cấp cho Bên B được tính theo giá bán sỉ do Bên A công bố.
2. Tỷ lệ hoa hồng: **5%** trên doanh số bán hàng.

### Điều 5: Bảo hành
Bên A bảo hành riêng biệt cho từng xe cung cấp cho Bên B theo chính sách bảo hành của VinFast.

### Điều 6: Hỗ trợ
1. Bên A cung cấp tư liệu thông tin, marketing cho Bên B.
2. Bên A hướng dẫn nhân viên Bên B về sản phẩm và kỹ thuật cơ bản.

### Điều 7: Độc quyền
- Hợp đồng này không mang tính độc quyền trên khu vực.
- Bên A có thể ký thêm hợp đồng với đại lý khác nếu cần thiết.

### Điều 8: Thời hạn hiệu lực
Hợp đồng có giá trị từ ngày **${contractDate}** đến hết ngày **${contractEndDate}**.

Nếu cả hai bên mong muốn tiếp tục, phải thỏa thuận trước 30 ngày.

Bên A có quyền đình chỉ ngay hợp đồng khi Bên B:
- Làm giảm uy tín thương hiệu VinFast
- Bán phá giá so với quy định

### Điều 9: Bồi thường thiệt hại
Bên vi phạm phải bồi thường thiệt hại cho bên kia theo quy định pháp luật.

### Điều 10: Xử lý tranh chấp
Tranh chấp sẽ được giải quyết tại Tòa án có thẩm quyền.

---

**Hợp đồng này được lập thành 2 bản, mỗi bên giữ 1 bản có giá trị như nhau.**

<div style="margin-top: 60px;">
  <table style="width: 100%; border-collapse: collapse;">
    <tr>
      <th style="width: 50%; text-align: center; padding: 12px; border: 1px solid #ffffffff; font-weight: bold;">ĐẠI DIỆN BÊN A</th>
      <th style="width: 50%; text-align: center; padding: 12px; border: 1px solid #ffffffff; font-weight: bold;">ĐẠI DIỆN BÊN B</th>
    </tr>
  </table>
  
  <table style="width: 100%; margin-top: 0;">
    <tr>
      <td style="width: 50%; text-align: center; padding: 20px 12px;"><strong>VinFast</strong></td>
      <td style="width: 50%; text-align: center; padding: 20px 12px;"><strong>${agency?.agencyName || values.agency_name || '{agencyName}'}</strong></td>
    </tr>
    <tr>
      <td style="width: 50%; text-align: center; padding: 10px 12px;">Ông Nguyễn Văn A</td>
      <td style="width: 50%; text-align: center; padding: 10px 12px;">${agency?.users?.find(u => u.role === 'AgencyManager')?.fullName || 'N/A'}</td>
    </tr>
    <tr>
      <td style="width: 50%; text-align: center; padding: 100px 12px 20px;"><em>Ký tên & đóng dấu</em></td>
      <td style="width: 50%; text-align: center; padding: 100px 12px 20px;"><em>Ký tên & đóng dấu</em></td>
    </tr>
  </table>
</div>
`;
  };

  // Update preview when form changes
  const handleFormChange = () => {
    const values = form.getFieldsValue();
    const markdown = generateContractMarkdown(values);
    setPreviewMarkdown(markdown);
  };

  // Handle agency selection change
  const handleAgencyChange = (agencyId) => {
    const agency = agencyList.find(a => a.id === agencyId);
    
    // Auto-fill agency information
    if (agency) {
      const manager = agency.users?.find(u => u.role === 'AgencyManager');
      form.setFieldsValue({
        agency_name: agency.agencyName,
        agency_address: agency.address,
        agency_phone: agency.phone,
        agency_manager: manager?.fullName || 'N/A'
      });
      
      // Update selectedAgency state
      setSelectedAgency(agency);
      
      // Immediately update preview with the selected agency
      const values = form.getFieldsValue();
      const markdown = generateContractMarkdown(values, agency);
      setPreviewMarkdown(markdown);
    }
  };

  // Handle create (Only EVStaff)
  const handleCreate = () => {
    if (!isEVStaff()) {
      message.error('Chỉ EVStaff mới có quyền tạo hợp đồng');
      return;
    }
    
    setModalMode('create');
    setSelectedContract(null);
    setSelectedAgency(null);
    form.resetFields();
    
    // Auto-fill agency info for non-admin users
    if (!isAdmin() && !isEVMStaff() && currentUser?.agency) {
      const agency = currentUser.agency;
      const manager = agency.users?.find(u => u.role === 'AgencyManager');
      form.setFieldsValue({
        agency_name: agency.agencyName,
        agency_address: agency.address,
        agency_phone: agency.phone,
        agency_manager: manager?.fullName || 'N/A'
      });
      setSelectedAgency(agency);
    }
    
    // Set initial preview
    const initialMarkdown = generateContractMarkdown(form.getFieldsValue());
    setPreviewMarkdown(initialMarkdown);
    
    setIsModalOpen(true);
  };

  // Handle view
  const handleView = (record) => {
    setModalMode('view');
    setSelectedContract(record);
    setIsModalOpen(true);
  };

  // Handle sign contract (AgencyManager)
  const handleSignContract = (record) => {
    setSelectedContract(record);
    setContractImageFile(null);
    setIsSignModalOpen(true);
  };

  // Submit signature
  const handleSubmitSignature = async () => {
    if (!contractImageFile) {
      message.error('Vui lòng tải lên ảnh hợp đồng đã ký');
      return;
    }

    try {
      setLoading(true);
      const formData = new FormData();
      formData.append('ContractImageUrl', contractImageFile);
      formData.append('Status', 'Signed');

      await axios.put(
        `https://agency.agencymanagement.online/api/AgencyContract/${selectedContract.id}`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            'Authorization': `Bearer ${sessionStorage.getItem('token')}`
          }
        }
      );

      message.success('Ký hợp đồng thành công!');
      setIsSignModalOpen(false);
      
      // Refresh contracts
      const data = await agencyContractAPI.getByAgencyId(currentUser?.agency?.id);
      const contractsWithAgency = (data || []).map(contract => ({
        ...contract,
        agencyInfo: currentUser.agency
      }));
      setContractList(contractsWithAgency);
    } catch (error) {
      console.error('Error signing contract:', error);
      message.error('Lỗi khi ký hợp đồng');
    } finally {
      setLoading(false);
    }
  };

  // Handle activate contract (EVStaff)
  const handleActivateContract = async (record) => {
    Modal.confirm({
      title: 'Kích hoạt hợp đồng',
      content: `Bạn có chắc muốn kích hoạt hợp đồng ${record.contractNumber}?`,
      onOk: async () => {
        try {
          setLoading(true);
          await axios.put(
            `https://agency.agencymanagement.online/api/AgencyContract/${record.id}`,
            {
              contractNumber: record.contractNumber,
              contractDate: record.contractDate,
              contractEndDate: record.contractEndDate,
              terms: record.terms,
              status: 'Active'
            },
            {
              headers: {
                'Content-Type': 'multipart/form-data',
                'Authorization': `Bearer ${sessionStorage.getItem('token')}`
              }
            }
          );

          message.success('Kích hoạt hợp đồng thành công!');
          
          // Refresh
          const agencies = await agencyAPI.getAll();
          const allContracts = [];
          for (const agency of agencies || []) {
            const data = await agencyContractAPI.getByAgencyId(agency.id);
            const contractsWithAgency = (data || []).map(c => ({
              ...c,
              agencyInfo: agency
            }));
            allContracts.push(...contractsWithAgency);
          }
          setContractList(allContracts);
        } catch (error) {
          console.error('Error activating contract:', error);
          message.error('Lỗi khi kích hoạt hợp đồng');
        } finally {
          setLoading(false);
        }
      }
    });
  };

  // Handle deactivate contract (EVStaff)
  const handleDeactivateContract = async (record) => {
    Modal.confirm({
      title: 'Hủy kích hoạt hợp đồng',
      content: `Bạn có chắc muốn hủy kích hoạt hợp đồng ${record.contractNumber}?`,
      icon: <WarningOutlined style={{ color: 'red' }} />,
      okText: 'Hủy kích hoạt',
      okType: 'danger',
      onOk: async () => {
        try {
          setLoading(true);
          await axios.put(
            `https://agency.agencymanagement.online/api/AgencyContract/${record.id}`,
            {
              contractNumber: record.contractNumber,
              contractDate: record.contractDate,
              contractEndDate: record.contractEndDate,
              terms: record.terms,
              status: 'Inactive'
            },
            {
              headers: {
                'Content-Type': 'multipart/form-data',
                'Authorization': `Bearer ${sessionStorage.getItem('token')}`
              }
            }
          );

          message.success('Đã hủy kích hoạt hợp đồng!');
          
          // Refresh
          const agencies = await agencyAPI.getAll();
          const allContracts = [];
          for (const agency of agencies || []) {
            const data = await agencyContractAPI.getByAgencyId(agency.id);
            const contractsWithAgency = (data || []).map(c => ({
              ...c,
              agencyInfo: agency
            }));
            allContracts.push(...contractsWithAgency);
          }
          setContractList(allContracts);
        } catch (error) {
          console.error('Error deactivating contract:', error);
          message.error('Lỗi khi hủy kích hoạt hợp đồng');
        } finally {
          setLoading(false);
        }
      }
    });
  };

  // Handle submit
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      
      const contractData = {
        agencyId: values.agencyId || currentUser?.agency?.id,
        contractNumber: values.contractNumber,
        contractDate: values.contractDate.format('YYYY-MM-DD'),
        contractEndDate: values.contractEndDate.format('YYYY-MM-DD'),
        terms: previewMarkdown,
        status: 'Pending' // Always create with Pending status
      };

      if (modalMode === 'create') {
        await agencyContractAPI.create(contractData);
        message.success('Tạo hợp đồng thành công! Đang chờ đại lý ký.');
      } else if (modalMode === 'edit') {
        await agencyContractAPI.update(selectedContract.id, contractData);
        message.success('Cập nhật hợp đồng thành công!');
      }

      setIsModalOpen(false);
      
      // Reload contracts
      if (isAdmin() || isEVMStaff()) {
        const agencies = await agencyAPI.getAll();
        const allContracts = [];
        for (const agency of agencies || []) {
          try {
            const contracts = await agencyContractAPI.getByAgencyId(agency.id);
            const contractsWithAgency = (contracts || []).map(contract => ({
              ...contract,
              agencyInfo: agency
            }));
            allContracts.push(...contractsWithAgency);
          } catch (error) {
            console.error(`Error fetching contracts for agency ${agency.id}:`, error);
          }
        }
        setContractList(allContracts);
      } else {
        const data = await agencyContractAPI.getByAgencyId(currentUser?.agency?.id);
        const contractsWithAgency = (data || []).map(contract => ({
          ...contract,
          agencyInfo: currentUser.agency
        }));
        setContractList(contractsWithAgency);
      }
    } catch (error) {
      console.error('Error saving contract:', error);
      message.error('Lỗi khi lưu hợp đồng');
    }
  };

  // Export PDF
  const handleExportPDF = async () => {
    message.loading('Đang tạo file PDF...', 0);
    
    const element = contractPreviewRef.current;
    
    // Clone element to avoid UI disruption
    const clonedElement = element.cloneNode(true);
    clonedElement.style.position = 'absolute';
    clonedElement.style.left = '-9999px';
    clonedElement.style.maxHeight = 'none';
    clonedElement.style.overflow = 'visible';
    clonedElement.style.width = '210mm'; // A4 width
    
    document.body.appendChild(clonedElement);
    
    // Wait for render
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const opt = {
      margin: [10, 10, 10, 10],
      filename: `HopDong_DaiLy_${selectedContract?.contractNumber || form.getFieldValue('contractNumber') || 'New'}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { 
        scale: 2, 
        useCORS: true,
        logging: false,
        windowWidth: clonedElement.scrollWidth,
        windowHeight: clonedElement.scrollHeight
      },
      jsPDF: { 
        unit: 'mm', 
        format: 'a4', 
        orientation: 'portrait',
        compress: true
      },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
    };
    
    try {
      await html2pdf().set(opt).from(clonedElement).save();
      document.body.removeChild(clonedElement);
      message.destroy();
      message.success('Xuất PDF thành công!');
    } catch (error) {
      document.body.removeChild(clonedElement);
      message.destroy();
      message.error('Lỗi khi xuất PDF');
      console.error('PDF export error:', error);
    }
  };

  // Export PNG
  const handleExportPNG = async () => {
    message.loading('Đang tạo file PNG...', 0);
    
    const originalElement = contractPreviewRef.current;
    const clonedElement = originalElement.cloneNode(true);
    
    clonedElement.style.position = 'absolute';
    clonedElement.style.left = '-9999px';
    clonedElement.style.maxHeight = 'none';
    clonedElement.style.overflow = 'visible';
    
    document.body.appendChild(clonedElement);
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const canvas = await html2canvas(clonedElement, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      windowWidth: clonedElement.scrollWidth,
      windowHeight: clonedElement.scrollHeight
    });
    
    document.body.removeChild(clonedElement);
    
    canvas.toBlob((blob) => {
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `HopDong_DaiLy_${selectedContract?.contractNumber || 'New'}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      message.destroy();
      message.success('Xuất PNG thành công!');
    });
  };

  const columns = [
    {
      title: 'Số hợp đồng',
      dataIndex: 'contractNumber',
      key: 'contractNumber',
      width: 150,
      render: (text) => <Text strong style={{ color: '#1890ff' }}>{text}</Text>
    },
    {
      title: 'Đại lý',
      key: 'agency',
      width: 200,
      render: (_, record) => (
        <div>
          <Text strong>{record.agencyInfo?.agencyName || 'N/A'}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {record.agencyInfo?.location || record.agencyInfo?.address || ''}
          </Text>
        </div>
      )
    },
    {
      title: 'Hình ảnh',
      dataIndex: 'contractImageUrl',
      key: 'contractImageUrl',
      width: 120,
      render: (contractImageUrl) => {
        return contractImageUrl 
          ? <Image src={contractImageUrl} alt="Contract" style={{ maxWidth: '100%', maxHeight: '80px' }} /> 
          : <Text type="secondary">Chưa ký</Text>;
      }
    },
    {
      title: 'Ngày bắt đầu',
      dataIndex: 'contractDate',
      key: 'contractDate',
      width: 120,
      render: (date) => dayjs(date).format('DD/MM/YYYY')
    },
    {
      title: 'Ngày kết thúc',
      dataIndex: 'contractEndDate',
      key: 'contractEndDate',
      width: 120,
      render: (date) => dayjs(date).format('DD/MM/YYYY')
    },
    {
      title: 'Còn lại',
      key: 'daysLeft',
      width: 100,
      render: (_, record) => {
        const daysLeft = dayjs(record.contractEndDate).diff(dayjs(), 'day');
        if (daysLeft < 0) {
          return <Tag color="red">Đã hết hạn</Tag>;
        } else if (daysLeft <= 30) {
          return <Tag color="orange">{daysLeft} ngày</Tag>;
        } else {
          return <Tag color="blue">{daysLeft} ngày</Tag>;
        }
      }
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 130,
      render: (status) => {
        const statusMap = {
          Pending: { text: 'Chờ ký', color: 'orange', icon: <ClockCircleOutlined /> },
          Signed: { text: 'Đã ký', color: 'blue', icon: <EditOutlined /> },
          Active: { text: 'Đang hoạt động', color: 'green', icon: <CheckCircleOutlined /> },
          Inactive: { text: 'Đã hủy', color: 'gray', icon: <CloseCircleOutlined /> },
          Expired: { text: 'Hết hạn', color: 'red', icon: <CloseCircleOutlined /> }
        };
        const s = statusMap[status] || statusMap.Pending;
        return <Tag color={s.color} icon={s.icon}>{s.text}</Tag>;
      }
    },
    {
      title: 'Thao tác',
      key: 'actions',
      width: 200,
      align: 'center',
      render: (_, record) => {
        console.log('Current user role:', currentUser?.role);
        console.log('Record status:', record.status);
        console.log('isDealerManager():', isDealerManager());
        console.log('isAgencyManager():', isAgencyManager());
        
        const items = [
          {
            key: 'view',
            label: 'Xem chi tiết',
            icon: <EyeOutlined />,
            onClick: () => handleView(record)
          }
        ];

        // AgencyManager can sign Pending contracts
        if ((isDealerManager() || isAgencyManager()) && record.status === 'Pending') {
          items.push({
            key: 'sign',
            label: 'Ký hợp đồng',
            icon: <EditOutlined />,
            onClick: () => handleSignContract(record)
          });
        }

        // EVStaff can activate Signed contracts
        if (isEVStaff() && record.status === 'Signed') {
          items.push({
            key: 'activate',
            label: 'Kích hoạt',
            icon: <CheckCircleOutlined />,
            onClick: () => handleActivateContract(record)
          });
        }

        // EVStaff can deactivate Active contracts
        if (isEVStaff() && record.status === 'Active') {
          items.push({
            key: 'deactivate',
            label: 'Hủy kích hoạt',
            icon: <CloseCircleOutlined />,
            onClick: () => handleDeactivateContract(record)
          });
        }

        return (
          <Dropdown menu={{ items }} trigger={['click']}>
            <Button icon={<MoreOutlined />}>Thao tác</Button>
          </Dropdown>
        );
      }
    }
  ];

  if (loading) {
    return (
      <div style={{ padding: '100px 24px 24px 24px', textAlign: 'center' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Title level={2}>
            <FileTextOutlined /> Quản lý hợp đồng đại lý
          </Title>
          <Text type="secondary">Quản lý các hợp đồng hợp tác với VinFast</Text>
        </div>
        {isEVStaff() && (
          <Button type="primary" icon={<PlusOutlined />} size="large" onClick={handleCreate}>
            Tạo hợp đồng mới
          </Button>
        )}
      </div>

      <Row gutter={16} style={{ marginBottom: '24px' }}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Tổng hợp đồng"
              value={stats.total}
              prefix={<FileTextOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Chờ ký"
              value={stats.pending}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#fa8c16' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Đã ký"
              value={stats.signed}
              prefix={<EditOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Đang hoạt động"
              value={stats.active}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={16} style={{ marginBottom: '24px' }}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Đã hủy"
              value={stats.inactive}
              prefix={<CloseCircleOutlined />}
              valueStyle={{ color: '#8c8c8c' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Hết hạn"
              value={stats.expired}
              prefix={<CloseCircleOutlined />}
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Card>
        </Col>
      </Row>

      <Card title="Danh sách hợp đồng">
        <Table
          columns={columns}
          dataSource={contractList}
          rowKey="id"
          scroll={{ x: 900 }}
          pagination={{
            pageSize: 10,
            showTotal: (total) => `Tổng ${total} hợp đồng`
          }}
        />
      </Card>

      <Modal
        title={modalMode === 'create' ? 'Tạo hợp đồng mới' : 'Chi tiết hợp đồng'}
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        width={900}
        footer={
          modalMode === 'view' ? [
            <Button key="exportPDF" icon={<FilePdfOutlined />} onClick={handleExportPDF}>
              Xuất PDF
            </Button>,
            <Button key="exportPNG" icon={<FileImageOutlined />} onClick={handleExportPNG}>
              Xuất PNG
            </Button>,
            <Button key="close" type="primary" onClick={() => setIsModalOpen(false)}>
              Đóng
            </Button>
          ] : [
            <Button key="cancel" onClick={() => setIsModalOpen(false)}>
              Hủy
            </Button>,
            <Button key="submit" type="primary" onClick={handleSubmit}>
              {modalMode === 'create' ? 'Tạo hợp đồng' : 'Cập nhật'}
            </Button>
          ]
        }
      >
        {modalMode === 'view' ? (
          <div>
            <Descriptions bordered column={1} style={{ marginBottom: '24px' }}>
              <Descriptions.Item label="Số hợp đồng">
                <Text strong style={{ color: '#1890ff', fontSize: '16px' }}>
                  {selectedContract?.contractNumber}
                </Text>
              </Descriptions.Item>
              <Descriptions.Item label="Ngày bắt đầu">
                {dayjs(selectedContract?.contractDate).format('DD/MM/YYYY')}
              </Descriptions.Item>
              <Descriptions.Item label="Ngày kết thúc">
                {dayjs(selectedContract?.contractEndDate).format('DD/MM/YYYY')}
              </Descriptions.Item>
              <Descriptions.Item label="Trạng thái">
                {selectedContract?.status === 'active' && <Tag color="green" icon={<CheckCircleOutlined />}>Còn hiệu lực</Tag>}
                {selectedContract?.status === 'expired' && <Tag color="red" icon={<CloseCircleOutlined />}>Đã hết hạn</Tag>}
              </Descriptions.Item>
            </Descriptions>

            <Card title="Nội dung hợp đồng">
              <div 
                ref={contractPreviewRef}
                style={{ 
                  background: 'white', 
                  padding: '24px',
                  minHeight: '400px',
                  maxHeight: '600px',
                  overflowY: 'auto'
                }}
              >
                <ReactMarkdown 
                  rehypePlugins={[rehypeRaw]}
                  components={{
                    h1: ({node, ...props}) => <h1 style={{fontSize: '24px', textAlign: 'center', marginBottom: '8px'}} {...props} />,
                    h2: ({node, ...props}) => <h2 style={{fontSize: '20px', borderBottom: '2px solid #1890ff', paddingBottom: '8px', marginTop: '24px'}} {...props} />,
                    h3: ({node, ...props}) => <h3 style={{fontSize: '16px', marginTop: '16px', color: '#1890ff'}} {...props} />,
                    p: ({node, ...props}) => <p style={{lineHeight: '1.8', marginBottom: '12px'}} {...props} />,
                    ul: ({node, ...props}) => <ul style={{marginLeft: '24px', lineHeight: '1.8'}} {...props} />,
                    ol: ({node, ...props}) => <ol style={{marginLeft: '24px', lineHeight: '1.8'}} {...props} />,
                    table: ({node, ...props}) => <table style={{width: '100%', borderCollapse: 'collapse', marginTop: '16px'}} {...props} />,
                    th: ({node, ...props}) => <th style={{border: '1px solid #ddd', padding: '12px', background: '#f5f5f5', textAlign: 'center'}} {...props} />,
                    td: ({node, ...props}) => <td style={{border: '1px solid #ddd', padding: '12px', textAlign: 'center'}} {...props} />,
                    hr: ({node, ...props}) => <hr style={{margin: '24px 0', border: 'none', borderTop: '2px solid #e8e8e8'}} {...props} />
                  }}
                >
                  {selectedContract?.terms || ''}
                </ReactMarkdown>
              </div>
            </Card>
          </div>
        ) : (
          <Row gutter={16}>
            <Col span={12}>
              <Form form={form} layout="vertical" onValuesChange={handleFormChange}>
                <Title level={4}>Thông tin hợp đồng</Title>
                
                {isEVStaff() && (
                  <Form.Item
                    name="agencyId"
                    label="Chọn đại lý"
                    rules={[{ required: true, message: 'Vui lòng chọn đại lý' }]}
                  >
                    <Select 
                      placeholder="Chọn đại lý" 
                      onChange={handleAgencyChange}
                      showSearch
                      filterOption={(input, option) =>
                        (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                      }
                      options={agencyList.map(agency => ({
                        label: `${agency.agencyName} - ${agency.location}`,
                        value: agency.id
                      }))}
                    />
                  </Form.Item>
                )}

                <Form.Item
                  name="contractNumber"
                  label="Số hợp đồng"
                  rules={[{ required: true, message: 'Vui lòng nhập số hợp đồng' }]}
                >
                  <Input placeholder="VD: HĐDL-2025-001" />
                </Form.Item>

                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item
                      name="contractDate"
                      label="Ngày bắt đầu"
                      rules={[{ required: true, message: 'Vui lòng chọn ngày' }]}
                    >
                      <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item
                      name="contractEndDate"
                      label="Ngày kết thúc"
                      rules={[{ required: true, message: 'Vui lòng chọn ngày' }]}
                    >
                      <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
                    </Form.Item>
                  </Col>
                </Row>

                <Form.Item name="location" label="Địa điểm ký">
                  <Input placeholder="VD: Hà Nội" />
                </Form.Item>

                <Title level={5} style={{ marginTop: '16px' }}>Thông tin Bên A - VinFast</Title>
                
                <Descriptions bordered size="small" column={1} style={{ marginBottom: '16px' }}>
                  <Descriptions.Item label="Công ty">VinFast Trading and Production LLC</Descriptions.Item>
                  <Descriptions.Item label="Giấy phép ĐKKD">0123456789</Descriptions.Item>
                  <Descriptions.Item label="Trụ sở">Vinhomes Ocean Park, Hà Nội</Descriptions.Item>
                  <Descriptions.Item label="Người đại diện">Ông Nguyễn Văn A</Descriptions.Item>
                  <Descriptions.Item label="Chức vụ">Giám đốc</Descriptions.Item>
                </Descriptions>

                <Title level={5} style={{ marginTop: '16px' }}>Thông tin Bên B - Đại lý</Title>

                <Form.Item name="agency_name" label="Tên đại lý">
                  <Input disabled />
                </Form.Item>

                <Form.Item name="agency_address" label="Địa chỉ">
                  <Input disabled />
                </Form.Item>

                <Form.Item name="agency_phone" label="Số điện thoại">
                  <Input disabled />
                </Form.Item>

                <Form.Item name="agency_manager" label="Người đại diện">
                  <Input disabled />
                </Form.Item>

                <Title level={5} style={{ marginTop: '16px' }}>Điều khoản hợp đồng</Title>

                <Form.Item 
                  name="debt_limit" 
                  label="Giới hạn mức nợ tối đa"
                  rules={[{ required: true, message: 'Vui lòng chọn giới hạn mức nợ' }]}
                >
                  <Select placeholder="Chọn mức nợ tối đa">
                    <Select.Option value="5 tỷ">5 tỷ VNĐ</Select.Option>
                    <Select.Option value="10 tỷ">10 tỷ VNĐ</Select.Option>
                    <Select.Option value="15 tỷ">15 tỷ VNĐ</Select.Option>
                    <Select.Option value="20 tỷ">20 tỷ VNĐ</Select.Option>
                    <Select.Option value="30 tỷ">30 tỷ VNĐ</Select.Option>
                    <Select.Option value="50 tỷ">50 tỷ VNĐ</Select.Option>
                  </Select>
                </Form.Item>
              </Form>
            </Col>

            <Col span={12}>
              <Title level={4}>Xem trước hợp đồng</Title>
              <Card>
                <Space style={{ marginBottom: '16px' }}>
                  <Button 
                    icon={<FilePdfOutlined />} 
                    onClick={handleExportPDF}
                    disabled={!previewMarkdown}
                  >
                    Xuất PDF
                  </Button>
                  <Button 
                    icon={<FileImageOutlined />} 
                    onClick={handleExportPNG}
                    disabled={!previewMarkdown}
                  >
                    Xuất PNG
                  </Button>
                </Space>
                
                <div 
                  ref={contractPreviewRef}
                  style={{ 
                    background: 'white', 
                    padding: '16px',
                    minHeight: '600px',
                    maxHeight: '600px',
                    overflowY: 'auto',
                    border: '1px solid #d9d9d9',
                    borderRadius: '4px'
                  }}
                >
                  <ReactMarkdown 
                    rehypePlugins={[rehypeRaw]}
                    components={{
                      h1: ({node, ...props}) => <h1 style={{fontSize: '20px', textAlign: 'center', marginBottom: '4px'}} {...props} />,
                      h2: ({node, ...props}) => <h2 style={{fontSize: '16px', borderBottom: '2px solid #1890ff', paddingBottom: '4px', marginTop: '16px'}} {...props} />,
                      h3: ({node, ...props}) => <h3 style={{fontSize: '14px', marginTop: '12px', color: '#1890ff'}} {...props} />,
                      p: ({node, ...props}) => <p style={{lineHeight: '1.6', marginBottom: '8px', fontSize: '13px'}} {...props} />,
                      ul: ({node, ...props}) => <ul style={{marginLeft: '20px', lineHeight: '1.6', fontSize: '13px'}} {...props} />,
                      ol: ({node, ...props}) => <ol style={{marginLeft: '20px', lineHeight: '1.6', fontSize: '13px'}} {...props} />,
                      table: ({node, ...props}) => <table style={{width: '100%', borderCollapse: 'collapse', marginTop: '12px', fontSize: '13px'}} {...props} />,
                      th: ({node, ...props}) => <th style={{border: '1px solid #ddd', padding: '8px', background: '#f5f5f5', textAlign: 'center'}} {...props} />,
                      td: ({node, ...props}) => <td style={{border: '1px solid #ddd', padding: '8px', textAlign: 'center'}} {...props} />,
                      hr: ({node, ...props}) => <hr style={{margin: '16px 0', border: 'none', borderTop: '2px solid #e8e8e8'}} {...props} />
                    }}
                  >
                    {previewMarkdown || 'Điền form để xem trước hợp đồng...'}
                  </ReactMarkdown>
                </div>
              </Card>
            </Col>
          </Row>
        )}
      </Modal>

      {/* Modal ký hợp đồng */}
      <Modal
        title="Ký hợp đồng"
        open={isSignModalOpen}
        onCancel={() => setIsSignModalOpen(false)}
        onOk={handleSubmitSignature}
        okText="Xác nhận ký"
        cancelText="Hủy"
        width={600}
      >
        <div style={{ marginBottom: '16px' }}>
          <Text strong>Số hợp đồng: </Text>
          <Text style={{ color: '#1890ff', fontSize: '16px' }}>
            {selectedContract?.contractNumber}
          </Text>
        </div>

        <Alert
          message="Lưu ý"
          description="Vui lòng tải lên ảnh hợp đồng đã ký (chữ ký + đóng dấu). Hỗ trợ định dạng: JPG, PNG. Kích thước tối đa: 5MB."
          type="info"
          showIcon
          style={{ marginBottom: '16px' }}
        />

        <Form.Item
          label="Ảnh hợp đồng đã ký"
          required
        >
          <Upload
            beforeUpload={(file) => {
              const isImage = file.type.startsWith('image/');
              if (!isImage) {
                message.error('Chỉ được tải lên file hình ảnh!');
                return false;
              }
              const isLt5M = file.size / 1024 / 1024 < 5;
              if (!isLt5M) {
                message.error('Hình ảnh phải nhỏ hơn 5MB!');
                return false;
              }
              setContractImageFile(file);
              return false;
            }}
            maxCount={1}
            listType="picture-card"
            accept="image/*"
          >
            <div>
              <UploadOutlined />
              <div style={{ marginTop: 8 }}>Tải lên</div>
            </div>
          </Upload>
        </Form.Item>

        {contractImageFile && (
          <Alert
            message="Đã chọn file"
            description={contractImageFile.name}
            type="success"
            showIcon
          />
        )}
      </Modal>
    </div>
  );
};

export default AgencyContractPage;
