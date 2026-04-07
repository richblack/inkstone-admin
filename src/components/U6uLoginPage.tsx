// LINE 登入頁（u6u 專用）
export default function U6uLoginPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#09090b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#18181b', border: '1px solid #27272a', borderRadius: 16, padding: 40, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24, width: '100%', maxWidth: 360 }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 56, height: 56, background: '#6d28d9', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 700, color: '#fff' }}>
            u6
          </div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#e4e4e7', margin: 0 }}>u6u Flow</h1>
          <p style={{ color: '#71717a', fontSize: 14, textAlign: 'center', margin: 0 }}>InkStone 視覺化流程引擎</p>
        </div>
        <a
          href="/api/auth/line-login?return_to=u6u"
          style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
            background: '#06C755', color: '#fff', fontWeight: 600, borderRadius: 12, padding: '12px 24px',
            fontSize: 16, textDecoration: 'none', boxSizing: 'border-box',
          }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19.952 10.516c0-4.66-4.67-8.453-10.409-8.453S-.866 5.856-.866 10.516c0 4.179 3.705 7.679 8.712 8.344.339.073.801.224.918.514.105.264.069.679.034.946l-.148.891c-.046.264-.21 1.031.904.562 1.114-.47 6.009-3.54 8.198-6.062 1.512-1.659 2.2-3.345 2.2-5.195z"/>
          </svg>
          使用 LINE 登入
        </a>
        <p style={{ color: '#3f3f46', fontSize: 12, textAlign: 'center', margin: 0 }}>
          工程師與合作夥伴專用
        </p>
      </div>
    </div>
  );
}
