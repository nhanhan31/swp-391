import React from 'react';
import { Result, Button } from 'antd';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <Result
          status="500"
          title="500"
          subTitle="Xin lỗi, đã có lỗi xảy ra trong ứng dụng."
          extra={
            <div>
              <Button type="primary" onClick={() => window.location.reload()}>
                Tải lại trang
              </Button>
              <div style={{ marginTop: '20px', textAlign: 'left' }}>
                <details style={{ whiteSpace: 'pre-wrap' }}>
                  <summary>Chi tiết lỗi (for developers)</summary>
                  {this.state.error && this.state.error.toString()}
                  <br />
                  {this.state.errorInfo && this.state.errorInfo.componentStack}
                </details>
              </div>
            </div>
          }
        />
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;