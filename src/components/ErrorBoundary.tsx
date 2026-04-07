import { Component, type ReactNode } from 'react';

interface Props { children: ReactNode; fallback?: ReactNode }
interface State { hasError: boolean; error?: Error }

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error('[ErrorBoundary] caught:', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div style={{ padding: 24, color: '#f87171', background: '#09090b', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
          <div style={{ fontSize: 24 }}>⚠️</div>
          <div style={{ fontWeight: 600 }}>元件渲染失敗</div>
          <div style={{ fontSize: 12, color: '#71717a', maxWidth: 400, textAlign: 'center', wordBreak: 'break-all' }}>
            {this.state.error?.message ?? '未知錯誤，請開啟 DevTools Console 查看詳情'}
          </div>
          <button
            onClick={() => this.setState({ hasError: false, error: undefined })}
            style={{ marginTop: 8, padding: '5px 14px', background: '#3f3f46', color: '#e4e4e7', border: 'none', borderRadius: 5, cursor: 'pointer', fontSize: 12 }}
          >
            重試
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
