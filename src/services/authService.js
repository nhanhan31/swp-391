import axios from 'axios';
import { jwtDecode } from 'jwt-decode';

const API_BASE_URL = 'https://agency.agencymanagement.online/api';
const API_BASE_URL_LOGIN = 'https://user.agencymanagement.online/api';

class AuthService {
  constructor() {
    this.setupAxiosInterceptors();
    this.checkTokenExpiration();
  }

  setupAxiosInterceptors() {
    // Add token to requests
    axios.interceptors.request.use(
      (config) => {
        const token = this.getToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Handle token expiration
    axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          this.logout();
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  checkTokenExpiration() {
    // Check token expiration every minute
    setInterval(() => {
      const expiration = sessionStorage.getItem('token_expiration');
      if (expiration) {
        const expirationTime = new Date(expiration).getTime();
        const currentTime = new Date().getTime();
        
        if (currentTime >= expirationTime) {
          console.log('Token expired, logging out...');
          this.logout();
          window.location.href = '/login';
        }
      }
    }, 60000); // Check every minute
  }

  async login(email, password) {
    try {
      const response = await axios.post(`${API_BASE_URL_LOGIN}/Authentication/login`, {
        email,
        password
      });

      if (response.status === 200 && response.data.token) {
        const { token, expiration } = response.data;
        
        // Decode token to get user info
        const decodedToken = jwtDecode(token);
        
        // Store token and expiration
        sessionStorage.setItem('token', token);
        sessionStorage.setItem('token_expiration', expiration);
        
        // Extract user info from decoded token
        const userInfo = {
          id: decodedToken.id || decodedToken.sub,
          email: decodedToken.email,
          userName: decodedToken.unique_name || decodedToken.name,
          fullName: decodedToken.given_name || decodedToken.name,
          role: decodedToken.role || decodedToken['http://schemas.microsoft.com/ws/2008/06/identity/claims/role']
        };
        
        sessionStorage.setItem('user_info', JSON.stringify(userInfo));

        // If role is AgencyStaff or AgencyManager, fetch agency info
        if (userInfo.role === 'AgencyStaff' || userInfo.role === 'AgencyManager') {
          await this.fetchAndStoreAgencyInfo(userInfo.id, userInfo.email);
        }

        return {
          success: true,
          user: userInfo,
          token
        };
      }

      return {
        success: false,
        error: 'Invalid response from server'
      };
    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Đăng nhập thất bại. Vui lòng kiểm tra lại email và mật khẩu.'
      };
    }
  }

  async fetchAndStoreAgencyInfo(userId, userEmail) {
    try {
      const response = await axios.get(`${API_BASE_URL}/Agency`);
      
      if (response.status === 200 && Array.isArray(response.data)) {
        const agencies = response.data;
        
        // Find which agency this user belongs to
        for (const agency of agencies) {
          const userInAgency = agency.users?.find(
            u => u.id === parseInt(userId) || u.email === userEmail
          );
          
          if (userInAgency) {
            // Store agency info
            sessionStorage.setItem('agency_id', agency.id.toString());
            sessionStorage.setItem('agency_info', JSON.stringify({
              id: agency.id,
              agencyName: agency.agencyName,
              address: agency.address,
              phone: agency.phone,
              email: agency.email,
              status: agency.status,
              avatar: agency.avatar,
              location: agency.location
            }));
            
            console.log(`User belongs to agency: ${agency.agencyName} (ID: ${agency.id})`);
            break;
          }
        }
      }
    } catch (error) {
      console.error('Error fetching agency info:', error);
    }
  }

  logout() {
    // Clear all session data
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('token_expiration');
    sessionStorage.removeItem('user_info');
    sessionStorage.removeItem('agency_id');
    sessionStorage.removeItem('agency_info');
  }

  getToken() {
    return sessionStorage.getItem('token');
  }

  getUserInfo() {
    const userInfoStr = sessionStorage.getItem('user_info');
    return userInfoStr ? JSON.parse(userInfoStr) : null;
  }

  getAgencyId() {
    return sessionStorage.getItem('agency_id');
  }

  getAgencyInfo() {
    const agencyInfoStr = sessionStorage.getItem('agency_info');
    return agencyInfoStr ? JSON.parse(agencyInfoStr) : null;
  }

  isAuthenticated() {
    const token = this.getToken();
    const expiration = sessionStorage.getItem('token_expiration');
    
    if (!token || !expiration) {
      return false;
    }

    // Check if token is expired
    const expirationTime = new Date(expiration).getTime();
    const currentTime = new Date().getTime();
    
    if (currentTime >= expirationTime) {
      this.logout();
      return false;
    }

    return true;
  }

  getTokenExpiration() {
    return sessionStorage.getItem('token_expiration');
  }

  getRemainingTime() {
    const expiration = this.getTokenExpiration();
    if (!expiration) return 0;

    const expirationTime = new Date(expiration).getTime();
    const currentTime = new Date().getTime();
    const remainingMs = expirationTime - currentTime;

    return Math.max(0, Math.floor(remainingMs / 1000)); // Return seconds
  }
}

// Create singleton instance
const authService = new AuthService();

export default authService;
