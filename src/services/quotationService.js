import axios from 'axios';

const ORDER_API = 'https://order.agencymanagement.online/api';
const USER_API = 'https://user.agencymanagement.online/api';
const ALLOCATION_API = 'https://allocation.agencymanagement.online/api';
const AGENCY_API = 'https://agency.agencymanagement.online/api';

// Setup axios interceptor to add token from sessionStorage
axios.interceptors.request.use(
  (config) => {
    const token = sessionStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Quotation API
export const quotationAPI = {
  // Get quotations by userId (for AgencyStaff)
  getByUserId: async (userId) => {
    const response = await axios.get(`${ORDER_API}/Quotation/createby/${userId}`);
    return response.data;
  },

  // Get quotations by agencyId (for AgencyManager)
  getByAgencyId: async (agencyId) => {
    const response = await axios.get(`${ORDER_API}/Quotation/agency/${agencyId}`);
    return response.data;
  },

  // Get quotation by id
  getById: async (id) => {
    const response = await axios.get(`${ORDER_API}/Quotation/${id}`);
    return response.data;
  },

  // Create new quotation
  create: async (data) => {
    const response = await axios.post(`${ORDER_API}/Quotation`, data, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  },

  // Update quotation
  update: async (id, data) => {
    const response = await axios.put(`${ORDER_API}/Quotation/${id}`, data, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  },

  // Delete quotation
  delete: async (id) => {
    const response = await axios.delete(`${ORDER_API}/Quotation/${id}`);
    return response.data;
  }
};

// Customer API
export const customerAPI = {
  // Get all customers
  getAll: async () => {
    const response = await axios.get(`${ORDER_API}/Customer`);
    return response.data;
  },

  // Get customer by ID
  getById: async (id) => {
    const response = await axios.get(`${ORDER_API}/Customer/${id}`);
    return response.data;
  },

  // Create customer
  create: async (data) => {
    const response = await axios.post(`${ORDER_API}/Customer`, data, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    return response.data;
  },

  // Update customer
  update: async (id, data) => {
    const response = await axios.put(`${ORDER_API}/Customer/${id}`, data, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  }
};

// Contract API
export const contractAPI = {
  // Get contracts by agencyId
  getByAgencyId: async (agencyId) => {
    const response = await axios.get(`${ORDER_API}/Contract/getall/${agencyId}`);
    return response.data;
  },

  // Get contract by ID
  getById: async (id) => {
    const response = await axios.get(`${ORDER_API}/Contract/${id}`);
    return response.data;
  },

  // Create new contract
  create: async (data) => {
    const response = await axios.post(`${ORDER_API}/Contract`, data);
    return response.data;
  },

  // Update contract
  update: async (id, data) => {
    const formData = new FormData();
    formData.append('ContractName', data.ContractName || '');
    formData.append('ContractDate', data.ContractDate || '');
    formData.append('Terms', data.Terms || '');
    formData.append('Status', data.Status || '');
    if (data.ContractImageUrl) {
      formData.append('ContractImageUrl', data.ContractImageUrl);
    }

    const response = await axios.put(`${ORDER_API}/Contract/${id}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  },

  // Send contract via email
  sendEmail: async (contractId, customerEmail, formData) => {
    const response = await axios.post(
      `https://order.agencymanagement.online/api/Contract/sent-contracr-email/${contractId}?customerEmail=${customerEmail}`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      }
    );
    return response.data;
  }
};

// User API
export const userAPI = {
  // Get user by ID
  getById: async (id) => {
    const response = await axios.get(`${USER_API}/User/${id}`);
    return response.data;
  }
};

// Agency Order Payment API
export const agencyOrderPaymentAPI = {
  // Get all payments
  V: async () => {
    const response = await axios.get(`${AGENCY_API}/AgencyOrderPayment/get-all`);
    return response.data;
  },

  // Get payments by agency
  getByAgency: async (agencyId) => {
    const response = await axios.get(`${AGENCY_API}/AgencyOrderPayment/get-by-agency/${agencyId}`);
    return response.data;
  },

  // Get payment by order ID
  getByOrderId: async (orderId) => {
    const response = await axios.get(`${AGENCY_API}/AgencyOrderPayment/get-by-order/${orderId}`);
    return response.data;
  },

  // Create payment
  create: async (data) => {
    const response = await axios.post(`${AGENCY_API}/AgencyOrderPayment/create`, {
      agencyOrderId: data.agencyOrderId,
      totalAmount: data.totalAmount,
      dueDate: data.dueDate,
      paymentMethod: data.paymentMethod,
      status: data.status
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    return response.data;
  },

  // Update payment status
  updateStatus: async (id, status) => {
    const response = await axios.put(`${AGENCY_API}/AgencyOrderPayment/update-status/${id}`, {
      status: status
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    return response.data;
  }
};

// Payment API
export const paymentAPI = {
  // Get all payments
  getAll: async () => {
    const response = await axios.get(`${ORDER_API}/Payment`);
    return response.data;
  },

  // Get payments by agency ID
  getByAgencyId: async (agencyId) => {
    const response = await axios.get(`${ORDER_API}/Payment/GetPaymentByAgencyId/${agencyId}`);
    return response.data;
  },

  // Create payment
  create: async (data) => {
    const formData = new FormData();
    formData.append('OrderId', data.OrderId);
    formData.append('PaymentDate', data.PaymentDate);
    formData.append('PRepay', data.PRepay);
    formData.append('Amount', data.Amount);
    formData.append('PaymentMethod', data.PaymentMethod);
    formData.append('Status', data.Status);

    const response = await axios.post(`${ORDER_API}/Payment/CreatePayment`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  },

  // Update payment
  update: async (id, data) => {
    const response = await axios.put(`${ORDER_API}/Payment/UpdatePayment/${id}`, data, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    return response.data;
  },

  // Get transaction history for a payment
  getTransactionHistory: async (paymentId) => {
    const response = await axios.get(`${ORDER_API}/Transaction/payment/${paymentId}`);
    return response.data;
  }
};

// Installment API
export const installmentAPI = {
  // Get all installment plans
  getAll: async () => {
    const response = await axios.get(`${ORDER_API}/InstallmentPlan`);
    return response.data;
  },

  // Get installment plan by ID
  getById: async (id) => {
    const response = await axios.get(`${ORDER_API}/InstallmentPlan/${id}`);
    return response.data;
  },

  // Get installment plans by contract ID
  getByContractId: async (contractId) => {
    const response = await axios.get(`${ORDER_API}/InstallmentPlan`);
    // Filter by contractId on client side
    return response.data.filter(plan => plan.contractId === contractId);
  },

  // Create installment plan
  createPlan: async (data) => {
    const response = await axios.post(`${ORDER_API}/InstallmentPlan`, data, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    return response.data;
  },

  // Create installment item
  createItem: async (data) => {
    const formData = new FormData();
    formData.append('InstallmentPlanId', data.InstallmentPlanId);
    formData.append('InstallmentNo', data.InstallmentNo);
    formData.append('DueDate', data.DueDate);
    formData.append('Percentage', data.Percentage);
    formData.append('AmountDue', data.AmountDue);
    formData.append('PrincipalComponent', data.PrincipalComponent);
    formData.append('InterestComponent', data.InterestComponent);
    formData.append('FeeComponent', data.FeeComponent);
    formData.append('Status', data.Status);
    formData.append('Notes', data.Notes || '');

    const response = await axios.post(`${ORDER_API}/InstallmentItem`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  },

  // Process installment payment
  processPayment: async (data) => {
    const response = await axios.post(`${ORDER_API}/InstallmentPayment/process-installment`, data, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    return response.data;
  },

  // Update installment plan status
  updatePlanStatus: async (id, data) => {
    const formData = new FormData();
    formData.append('Status', data.status);

    const response = await axios.put(`${ORDER_API}/InstallmentPlan/${id}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  },

  // Get all installment items
  getAllItems: async () => {
    const response = await axios.get(`${ORDER_API}/InstallmentItem`);
    return response.data;
  },

  // Get installment items by plan ID
  getItemsByPlanId: async (planId) => {
    const allItems = await installmentAPI.getAllItems();
    return allItems.filter(item => item.installmentPlanId === planId);
  }
};

// Order API
export const orderAPI = {
  // Get all orders
  getAll: async () => {
    const response = await axios.get(`${ORDER_API}/Order`);
    return response.data;
  },

  // Get orders by agencyId
  getByAgencyId: async (agencyId) => {
    const response = await axios.get(`${ORDER_API}/Order/agency/${agencyId}`);
    return response.data;
  },

  // Create new order
  create: async (data) => {
    const response = await axios.post(`${ORDER_API}/Order/create`, data);
    return response.data;
  },

  // Update order status
  update: async (orderId, status) => {
    const formData = new FormData();
    formData.append('Status', status);

    const response = await axios.put(`${ORDER_API}/Order/update/${orderId}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  }
};

// Delivery API
export const deliveryAPI = {
  // Get deliveries by agencyId
  getByAgencyId: async (agencyId) => {
    const response = await axios.get(`${ORDER_API}/Deliveries/agency/${agencyId}`);
    return response.data;
  },

  // Get delivery by ID
  getById: async (id) => {
    const response = await axios.get(`${ORDER_API}/Deliveries/${id}`);
    return response.data;
  },

  // Create delivery
  create: async (data) => {
    const formData = new FormData();
    formData.append('OrderId', data.orderId);
    formData.append('DeliveryDate', data.deliveryDate);
    formData.append('DeliveryStatus', data.deliveryStatus);
    formData.append('Notes', data.notes || '');

    // Add image before if provided
    if (data.imgUrlBefore) {
      formData.append('ImgUrlBefore', data.imgUrlBefore);
    }

    const response = await axios.post(`${ORDER_API}/Deliveries`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  },

  // Update delivery (upload after image)
  update: async (id, data) => {
    const formData = new FormData();
    formData.append('DeliveryDate', data.deliveryDate);
    formData.append('DeliveryStatus', data.deliveryStatus);
    formData.append('Notes', data.notes || '');

    // Add image after if provided
    if (data.imgUrlAfter) {
      formData.append('ImgUrlAfter', data.imgUrlAfter);
    }

    // Add image before if provided
    if (data.imgUrlBefore) {
      formData.append('ImgUrlBefore', data.imgUrlBefore);
    }

    const response = await axios.put(`${ORDER_API}/Deliveries/${id}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  }
};

// VehiclePromotion API
export const promotionAPI = {
  // Get all promotions
  getAll: async () => {
    const response = await axios.get(`${ALLOCATION_API}/VehiclePromotion`);
    return response.data;
  },

  // Get promotions by agencyId
  getByAgencyId: async (agencyId) => {
    const response = await axios.get(`${ALLOCATION_API}/VehiclePromotion/agecy/${agencyId}`);
    return response.data;
  },

  // Get promotion by id
  getById: async (id) => {
    const response = await axios.get(`${ALLOCATION_API}/VehiclePromotion/${id}`);
    return response.data;
  },

  // Create new promotion
  create: async (data) => {
    const formData = new FormData();
    formData.append('VehicleId', data.vehicleId);
    if (data.agencyId) {
      formData.append('AgencyId', data.agencyId);
    }
    formData.append('PromoName', data.promoName);
    formData.append('DiscountAmount', data.discountAmount);
    formData.append('StartDate', data.startDate);
    formData.append('EndDate', data.endDate);

    const response = await axios.post(`${ALLOCATION_API}/VehiclePromotion`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  },

  // Update promotion
  update: async (id, data) => {
    const formData = new FormData();
    formData.append('VehicleId', data.vehicleId);
    if (data.agencyId) {
      formData.append('AgencyId', data.agencyId);
    }
    formData.append('PromoName', data.promoName);
    formData.append('DiscountAmount', data.discountAmount);
    formData.append('StartDate', data.startDate);
    formData.append('EndDate', data.endDate);

    const response = await axios.put(`${ALLOCATION_API}/VehiclePromotion/${id}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  },

  // Delete promotion
  delete: async (id) => {
    const response = await axios.delete(`${ALLOCATION_API}/VehiclePromotion/${id}`);
    return response.data;
  }
};

const emailVerificationClient = axios.create({
  baseURL: USER_API
});

export const emailVerificationAPI = {
  sendOTP: async (email) => {
    const response = await emailVerificationClient.post(
      '/EmailVerifcation/send-otp',
      null,
      { params: { email } }
    );
    return response.data;
  },

  verifyOTP: async (email, code) => {
    const response = await emailVerificationClient.post(
      '/EmailVerifcation/verify-otp',
      null,
      { params: { Email: email, Code: code } }
    );
    return response.data;
  },
  getAll: async () => {
    const response = await emailVerificationClient.get('/EmailVerifcation/GetAll');
    return response.data;
  }
};

// TestDrive API
export const testDriveAPI = {
  // Get test drives by agencyId
  getByAgencyId: async (agencyId) => {
    const response = await axios.get(`${AGENCY_API}/TestDrive/agency/${agencyId}`);
    return response.data;
  },

  // Get test drive by ID
  getById: async (id) => {
    const response = await axios.get(`${AGENCY_API}/TestDrive/${id}`);
    return response.data;
  },

  // Create test drive
  create: async (data) => {
    const response = await axios.post(`${AGENCY_API}/TestDrive`, data, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    return response.data;
  },

  // Update test drive
  update: async (id, data) => {
    const formData = new FormData();
    formData.append('AppointmentDate', data.appointmentDate);
    formData.append('Status', data.status);
    if (data.notes) formData.append('Notes', data.notes);
    if (data.feedback) formData.append('Feedback', data.feedback);

    const response = await axios.put(`${AGENCY_API}/TestDrive/${id}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  },

  // Delete test drive
  delete: async (id) => {
    const response = await axios.delete(`${AGENCY_API}/TestDrive/${id}`);
    return response.data;
  }
};

// Agency Inventory API
export const agencyInventoryAPI = {
  // Get vehicle instances (inventory) by agencyId
  getByAgencyId: async (agencyId) => {
    const response = await axios.get(`https://agency.agencymanagement.online/api/AgencyInventory/Agency/${agencyId}/inventories`);
    return response.data;
  },

  // Add to agency inventory
  addToInventory: async (agencyId, data) => {
    const response = await axios.post(
      `${AGENCY_API}/AgencyInventory/Agency/${agencyId}/inventory`,
      {
        vehicleInstanceId: data.vehicleInstanceId
      },
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
    return response.data;
  },

  // Get agency inventory
  getByAgency: async (agencyId) => {
    const response = await axios.get(`${AGENCY_API}/AgencyInventory/Agency/${agencyId}/inventory`);
    return response.data;
  }
};

// Feedback API
export const feedbackAPI = {
  // Get feedbacks by agencyId
  getByAgencyId: async (agencyId) => {
    const response = await axios.get(`${ORDER_API}/Feedback/agency/${agencyId}`);
    return response.data;
  },

  // Get feedback by ID
  getById: async (id) => {
    const response = await axios.get(`${ORDER_API}/Feedback/${id}`);
    return response.data;
  },

  // Create feedback
  create: async (data) => {
    const formData = new FormData();
    formData.append('CustomerId', data.customerId);
    formData.append('Type', data.type);
    formData.append('Content', data.content);
    if (data.reply) formData.append('Reply', data.reply);
    formData.append('Status', data.status);
    formData.append('AgencyId', data.agencyId);

    const response = await axios.post(`${ORDER_API}/Feedback`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  },

  // Update feedback
  update: async (id, data) => {
    const formData = new FormData();
    formData.append('CustomerId', data.customerId);
    formData.append('Type', data.type);
    formData.append('Content', data.content);
    if (data.reply) formData.append('Reply', data.reply);
    formData.append('Status', data.status);
    formData.append('AgencyId', data.agencyId);

    const response = await axios.put(`${ORDER_API}/Feedback/${id}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  },

  // Delete feedback
  delete: async (id) => {
    const response = await axios.delete(`${ORDER_API}/Feedback/${id}`);
    return response.data;
  }
};

// Agency API
export const agencyAPI = {
  // Get all agencies
  getAll: async () => {
    const response = await axios.get(`${AGENCY_API}/Agency`);
    return response.data;
  },

  // Get agency by ID with users
  getById: async (id) => {
    const response = await axios.get(`${AGENCY_API}/Agency/${id}`);
    return response.data;
  },

  // Create agency
  create: async (data) => {
    const formData = new FormData();
    formData.append('AgencyName', data.agencyName);
    formData.append('Address', data.address);
    formData.append('Phone', data.phone);
    if (data.avatar) {
      formData.append('Avartar', data.avatar);
    }
    if (data.location) {
      formData.append('Location', data.location);
    }
    if (data.email) {
      formData.append('Email', data.email);
    }
    formData.append('Status', data.status);

    const response = await axios.post(`${AGENCY_API}/Agency`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  },

  // Update agency
  update: async (id, data) => {
    const formData = new FormData();
    formData.append('AgencyName', data.agencyName);
    formData.append('Address', data.address);
    formData.append('Phone', data.phone);
    if (data.avatar) {
      formData.append('Avatar', data.avatar);
    }
    if (data.location) {
      formData.append('Location', data.location);
    }
    if (data.email) {
      formData.append('Email', data.email);
    }
    formData.append('Status', data.status);

    const response = await axios.put(`${AGENCY_API}/Agency/${id}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  }
};

// Agency Contract API
export const agencyContractAPI = {
  // Get contracts by agencyId
  getByAgencyId: async (agencyId) => {
    const response = await axios.get(`${AGENCY_API}/AgencyContract/${agencyId}`);
    return response.data;
  },

  // Create new agency contract
  create: async (data) => {
    const response = await axios.post(`${AGENCY_API}/AgencyContract?AgencyId=${data.agencyId}`, {
      contractNumber: data.contractNumber,
      contractDate: data.contractDate,
      contractEndDate: data.contractEndDate,
      terms: data.terms,
      status: data.status
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    return response.data;
  },

  // Update agency contract
  update: async (contractId, data) => {
    const formData = new FormData();
    formData.append('ContractNumber', data.contractNumber);
    formData.append('ContractDate', data.contractDate);
    formData.append('ContractEndDate', data.contractEndDate);
    formData.append('Terms', data.terms);
    formData.append('Status', data.status);
    if (data.contractImageUrl) {
      formData.append('ContractImageUrl', data.contractImageUrl);
    }

    const response = await axios.put(`${AGENCY_API}/AgencyContract/${contractId}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  }
};

// Agency Order API
export const agencyOrderAPI = {
  // Get all orders (Admin/EVMStaff)
  getAll: async () => {
    const response = await axios.get(`${AGENCY_API}/AgencyOrder/get-all`);
    return response.data;
  },

  // Get orders by agency
  getByAgency: async (agencyId) => {
    const response = await axios.get(`${AGENCY_API}/AgencyOrder/get-by-agency/${agencyId}`);
    return response.data;
  },

  // Get vehicles of an order (from allocations)
  getOrderVehicles: async (orderId) => {
    const response = await axios.get(`${AGENCY_API}/AgencyOrder/${orderId}`);
    return response.data;
  },

  // Get order by ID
  getById: async (orderId) => {
    const response = await axios.get(`${AGENCY_API}/AgencyOrder/${orderId}`);
    return response.data;
  },

  // Create new order
  create: async (data) => {
    const response = await axios.post(`${AGENCY_API}/AgencyOrder/create`, {
      agencyId: data.agencyId,
      agencyContractId: data.agencyContractId,
      vehicleId: data.vehicleId,
      quantity: data.quantity
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    return response.data;
  },

  // Update order
  update: async (id, data) => {
    const response = await axios.put(`${AGENCY_API}/AgencyOrder/update/${id}`, {
      vehicleId: data.vehicleId,
      quantity: data.quantity,
      status: data.status
    }, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  }
};

// Allocation API
export const allocationAPI = {
  // Create allocation
  create: async (data) => {
    const response = await axios.post(`${ALLOCATION_API}/Allocation`, {
      agencyContractId: data.agencyContractId,
      vehicleInstanceId: data.vehicleInstanceId,
      agencyOrderId: data.agencyOrderId
    }, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  },

  // Get all allocations
  getAll: async () => {
    const response = await axios.get(`${ALLOCATION_API}/Allocation`);
    return response.data;
  },

  // Get allocation by id
  getById: async (id) => {
    const response = await axios.get(`${ALLOCATION_API}/Allocation/${id}`);
    return response.data;
  },

  // Get allocations by agency order ID
  getByOrderId: async (orderId) => {
    const response = await axios.get(`${ALLOCATION_API}/Allocation/agencyOrder/${orderId}`);
    return response.data;
  }
};

// EV Inventory API (Kho hãng)
export const evInventoryAPI = {
  // Get all EV inventory (kho trung tâm)
  getAll: async () => {
    const response = await axios.get(`${ALLOCATION_API}/EVInventory`);
    return response.data;
  },

  // Get EV inventory by vehicle ID
  getByVehicle: async (vehicleId) => {
    const response = await axios.get(`${ALLOCATION_API}/EVInventory/vehicle/${vehicleId}`);
    return response.data;
  },

  // Create EV inventory (nhập kho)
  create: async (vehicleInstanceId) => {
    const response = await axios.post(`${ALLOCATION_API}/EVInventory`, {
      vehicleInstanceId
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    return response.data;
  }
};

// Vehicle Price API
export const vehiclePriceAPI = {
  // Get all vehicle prices
  getAll: async () => {
    const response = await axios.get(`${ALLOCATION_API}/VehiclePrice`);
    return response.data;
  },

  // Get vehicle price by ID
  getById: async (id) => {
    const response = await axios.get(`${ALLOCATION_API}/VehiclePrice/${id}`);
    return response.data;
  },

  // Create vehicle price
  create: async (data) => {
    const formData = new FormData();
    formData.append('VehicleId', data.vehicleId);
    formData.append('AgencyId', data.agencyId || null);
    formData.append('PriceType', data.priceType);
    formData.append('PriceAmount', data.priceAmount);
    formData.append('StartDate', data.startDate);
    formData.append('EndDate', data.endDate);

    const response = await axios.post(`${ALLOCATION_API}/VehiclePrice`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  },

  // Update vehicle price
  update: async (id, data) => {
    const formData = new FormData();
    formData.append('VehicleId', data.vehicleId);
    formData.append('AgencyId', data.agencyId);
    formData.append('PriceType', data.priceType);
    formData.append('PriceAmount', data.priceAmount);
    formData.append('StartDate', data.startDate);
    formData.append('EndDate', data.endDate);

    const response = await axios.put(`${ALLOCATION_API}/VehiclePrice/${id}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  },

  // Delete vehicle price
  delete: async (id) => {
    const response = await axios.delete(`${ALLOCATION_API}/VehiclePrice/${id}`);
    return response.data;
  }
};

// Vehicle Instance API
export const vehicleInstanceAPI = {
  // Get all vehicle instances
  getAll: async () => {
    const response = await axios.get(`https://allocation.agencymanagement.online/VehicleInstance/getAll`);
    return response.data;
  },

  // Get vehicle instance by ID
  getById: async (id) => {
    const response = await axios.get(`${ALLOCATION_API}/VehicleInstance/${id}`);
    return response.data;
  },

  // Get vehicle instances by vehicle ID
  getByVehicleId: async (vehicleId) => {
    const response = await axios.get(`${ALLOCATION_API}/VehicleInstance/vehicle/${vehicleId}`);
    return response.data;
  },

  // Update vehicle instance
  update: async (id, data) => {
    const formData = new FormData();
    Object.keys(data).forEach(key => {
      if (data[key] !== null && data[key] !== undefined) {
        formData.append(key, data[key]);
      }
    });

    const response = await axios.put(`https://allocation.agencymanagement.online/VehicleInstance/update/${id}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  }
};

// Order API