import axios from 'axios';

const ORDER_API = 'https://order.agencymanagement.online/api';
const ALLOCATION_API = 'https://allocation.agencymanagement.online/api';

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

// Vehicle API
export const vehicleAPI = {
  // Get all vehicles
  getAll: async () => {
    const response = await axios.get(`${ALLOCATION_API}/Vehicle`);
    return response.data;
  },

  // Get vehicle by ID
  getById: async (id) => {
    const response = await axios.get(`${ALLOCATION_API}/Vehicle/${id}`);
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

  // Create new vehicle instance
  create: async (data) => {
    const response = await axios.post(`https://allocation.agencymanagement.online/VehicleInstance/create`, {
      vehicleId: data.vehicleId,
      vin: data.vin,
      engineNumber: data.engineNumber
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
  }
};

// Default export for backward compatibility
export default {
  vehicleAPI,
  vehicleInstanceAPI,
  vehiclePriceAPI
};
