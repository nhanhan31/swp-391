import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import ProtectedRoute from '../components/ProtectedRoute';
import MainLayout from '../layouts/MainLayout';

// Pages
import LoginPage from '../pages/LoginPage';
import DashboardPage from '../pages/DashboardPage';
import VehicleCatalogPage from '../pages/VehicleCatalogPage';
import VehicleComparePage from '../pages/VehicleComparePage';
import QuotationPage from '../pages/QuotationPage';
import OrderPage from '../pages/OrderPage';
import PromotionPage from '../pages/PromotionPage';
import ContractPage from '../pages/ContractPage';
import DeliveryPage from '../pages/DeliveryPage';
import PaymentPage from '../pages/PaymentPage';
import CustomerPage from '../pages/CustomerPage';
import TestDrivePage from '../pages/TestDrivePage';
import FeedbackPage from '../pages/FeedbackPage';
import SalesStaffReportPage from '../pages/SalesStaffReportPage';
import CustomerDebtReportPage from '../pages/CustomerDebtReportPage';
import AgencyDebtReportPage from '../pages/AgencyDebtReportPage';
import VehicleManagementPage from '../pages/VehicleManagementPage';
import VehicleInventoryPage from '../pages/VehicleInventoryPage';
import VehicleAllocationPage from '../pages/VehicleAllocationPage';
import VehiclePricingPage from '../pages/VehiclePricingPage';
import VehiclePromotionPage from '../pages/VehiclePromotionPage';
import VehicleDiscountPage from '../pages/VehicleDiscountPage';
import AgencyManagementPage from '../pages/AgencyManagementPage';
import AgencyContractPage from '../pages/AgencyContractPage';
import AgencyOrderPage from '../pages/AgencyOrderPage';
import AgencyPaymentPage from '../pages/AgencyPaymentPage';
import AgencyOrderManagementPage from '../pages/AgencyOrderManagementPage';
import AgencyTargetPage from '../pages/AgencyTargetPage';
import AgencyDebtPage from '../pages/AgencyDebtPage';
import AgencyAccountPage from '../pages/AgencyAccountPage';
import SalesRegionReportPage from '../pages/SalesRegionReportPage';
import SalesAgencyReportPage from '../pages/SalesAgencyReportPage';
import InventoryReportPage from '../pages/InventoryReportPage';
import ConsumptionSpeedReportPage from '../pages/ConsumptionSpeedReportPage';
import VehiclePricesPage from '../pages/VehiclePricesPage';
import UsersPage from '../pages/UsersPage';
import RolesPage from '../pages/RolesPage';
import UnauthorizedPage from '../pages/UnauthorizedPage';
import LandingPage from '../pages/LandingPage';
import DemandForecast from '../components/DemandForecast';

const AppRoutes = () => {
    return (
        <AuthProvider>
            <Router>
                <Routes>
                    {/* Public Routes */}
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/unauthorized" element={<UnauthorizedPage />} />
                    <Route path="/landing" element={<LandingPage />} />

                    {/* Root redirect to landing page */}
                    <Route index element={<Navigate to="/landing" replace />} />

                    {/* Protected Routes with nested structure */}
                    <Route
                        path="/"
                        element={
                            <ProtectedRoute>
                                <MainLayout />
                            </ProtectedRoute>
                        }
                    >
                        <Route path="dashboard" element={<DashboardPage />} />

                        <Route
                            path="vehicles"
                            element={<VehicleCatalogPage />}
                        />

                        <Route
                            path="vehicles/catalog"
                            element={<VehicleCatalogPage />}
                        />

                        <Route
                            path="vehicles/compare"
                            element={<VehicleComparePage />}
                        />

                        <Route
                            path="vehicles/management"
                            element={<VehicleManagementPage />}
                        />

                        <Route
                            path="vehicles/inventory"
                            element={<VehicleInventoryPage />}
                        />

                        <Route
                            path="vehicles/allocation"
                            element={<VehicleAllocationPage />}
                        />

                        <Route
                            path="vehicles/prices"
                            element={<VehiclePricesPage />}
                        />

                        <Route
                            path="vehicles/promotions"
                            element={<VehiclePromotionPage />}
                        />

                        <Route
                            path="pricing/wholesale"
                            element={<VehiclePricingPage />}
                        />

                        <Route
                            path="pricing/discounts"
                            element={<VehicleDiscountPage />}
                        />

                        <Route
                            path="pricing/promotions"
                            element={<VehiclePromotionPage />}
                        />

                        <Route
                            path="agencies"
                            element={<AgencyManagementPage />}
                        />

                        <Route
                            path="agencies/contracts"
                            element={<AgencyContractPage />}
                        />

                        <Route
                            path="agencies/orders"
                            element={<AgencyOrderPage />}
                        />

                        <Route
                            path="agencies/payments"
                            element={<AgencyPaymentPage />}
                        />

                        <Route
                            path="agencies/order-management"
                            element={<AgencyOrderManagementPage />}
                        />

                        <Route
                            path="agencies/targets"
                            element={<AgencyTargetPage />}
                        />

                        <Route
                            path="agencies/debts"
                            element={<AgencyDebtPage />}
                        />

                        <Route
                            path="agencies/accounts"
                            element={<AgencyAccountPage />}
                        />

                        <Route
                            path="users"
                            element={<UsersPage />}
                        />

                        <Route
                            path="roles"
                            element={<RolesPage />}
                        />

                        <Route
                            path="sales/quotations"
                            element={<QuotationPage />}
                        />

                        <Route
                            path="sales/orders"
                            element={<OrderPage />}
                        />

                        <Route
                            path="sales/promotions"
                            element={<PromotionPage />}
                        />

                        <Route
                            path="sales/contracts"
                            element={<ContractPage />}
                        />

                        <Route
                            path="sales/deliveries"
                            element={<DeliveryPage />}
                        />

                        <Route
                            path="sales/payments"
                            element={<PaymentPage />}
                        />

                        <Route
                            path="customers"
                            element={<CustomerPage />}
                        />

                        <Route
                            path="customers/profiles"
                            element={<CustomerPage />}
                        />

                        <Route
                            path="customers/test-drives"
                            element={<TestDrivePage />}
                        />

                        <Route
                            path="customers/feedback"
                            element={<FeedbackPage />}
                        />

                        <Route
                            path="reports/sales-staff"
                            element={<SalesStaffReportPage />}
                        />

                        <Route
                            path="reports/sales-by-region"
                            element={<SalesRegionReportPage />}
                        />

                        <Route
                            path="reports/sales-by-agency"
                            element={<SalesAgencyReportPage />}
                        />

                        <Route
                            path="reports/inventory"
                            element={<InventoryReportPage />}
                        />

                        <Route
                            path="reports/consumption-speed"
                            element={<ConsumptionSpeedReportPage />}
                        />

                        <Route
                            path="reports/customer-debts"
                            element={<CustomerDebtReportPage />}
                        />

                        <Route
                            path="reports/agency-debts"
                            element={<AgencyDebtPage />}
                        />
                        <Route
                            path="reports/prediction"
                            element={<DemandForecast />}
                        />
                    </Route>

                    {/* Catch all route */}
                    <Route path="*" element={<Navigate to="/login" replace />} />
                </Routes>
            </Router>
        </AuthProvider>
    );
};

export default AppRoutes;