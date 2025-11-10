import React from 'react';
import { ConfigProvider } from 'antd';
import viVN from 'antd/locale/vi_VN';
import AppRoutes from './routes/AppRoutes';
import ErrorBoundary from './components/ErrorBoundary';


function App() {
  return (
    <ErrorBoundary>
      <ConfigProvider locale={viVN}>
        <AppRoutes />
      </ConfigProvider>
    </ErrorBoundary>
  );
}

export default App;
