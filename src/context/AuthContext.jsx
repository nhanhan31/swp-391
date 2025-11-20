import React, { createContext, useContext, useState, useEffect } from 'react';
import authService from '../services/authService';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  // Kiểm tra session storage khi component mount
  useEffect(() => {
    try {
      if (authService.isAuthenticated()) {
        const userInfo = authService.getUserInfo();
        const agencyInfo = authService.getAgencyInfo();
        
        if (userInfo) {
          setCurrentUser({
            ...userInfo,
            agency: agencyInfo
          });
          setIsAuthenticated(true);
        }
      }
    } catch (error) {
      console.error('Error loading user session:', error);
      authService.logout();
    } finally {
      setLoading(false);
    }
  }, []);

  // Hàm đăng nhập
  const login = async (email, password) => {
    try {
      const result = await authService.login(email, password);

      if (result.success) {
        const agencyInfo = authService.getAgencyInfo();
        
        const userData = {
          ...result.user,
          agency: agencyInfo
        };

        setCurrentUser(userData);
        setIsAuthenticated(true);
        
        return { success: true, user: userData };
      }

      return result;
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  // Hàm đăng xuất
  const logout = () => {
    authService.logout();
    setCurrentUser(null);
    setIsAuthenticated(false);
  };

  // Kiểm tra quyền truy cập
  const hasPermission = (requiredRoles) => {
    if (!currentUser || !currentUser.role) return false;
    
    if (Array.isArray(requiredRoles)) {
      return requiredRoles.includes(currentUser.role);
    }
    
    return currentUser.role === requiredRoles;
  };

  // Kiểm tra có phải admin không
  const isAdmin = () => {
    return currentUser?.role === 'Admin';
  };

  // Kiểm tra có phải EVM Staff không
  const isEVMStaff = () => {
    return currentUser?.role === 'EVStaff';
  };

  // Kiểm tra có phải EV Staff không
  const isEVStaff = () => {
    return currentUser?.role === 'EVStaff';
  };

  // Kiểm tra có phải Dealer Manager không
  const isDealerManager = () => {
    return currentUser?.role === 'AgencyManager';
  };

  // Kiểm tra có phải Agency Manager không
  const isAgencyManager = () => {
    return currentUser?.role === 'AgencyManager';
  };

  // Kiểm tra có phải Dealer Staff không
  const isDealerStaff = () => {
    return currentUser?.role === 'AgencyStaff';
  };

  // Kiểm tra có thuộc về đại lý không
  const isFromAgency = (agencyId = null) => {
    const userAgencyId = authService.getAgencyId();
    if (!userAgencyId) return false;
    return agencyId ? userAgencyId === agencyId.toString() : true;
  };

  const value = {
    currentUser,
    isAuthenticated,
    loading,
    login,
    logout,
    hasPermission,
    isAdmin,
    isEVMStaff,
    isEVStaff,
    isDealerManager,
    isAgencyManager,
    isDealerStaff,
    isFromAgency,
    getAgencyInfo: authService.getAgencyInfo.bind(authService),
    getAgencyId: authService.getAgencyId.bind(authService),
    getTokenExpiration: authService.getTokenExpiration.bind(authService),
    getRemainingTime: authService.getRemainingTime.bind(authService)
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};