export default function LoginPage() {
  const handleLineLogin = () => {
    window.location.href = '/api/auth/line-login';
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-10 flex flex-col items-center gap-6 w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center gap-2">
          <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center text-2xl font-bold text-white select-none">
            IS
          </div>
          <h1 className="text-xl font-bold text-zinc-100">InkStone Admin</h1>
          <p className="text-zinc-500 text-sm text-center">後台管理系統</p>
        </div>

        {/* 登入按鈕 */}
        <button
          onClick={handleLineLogin}
          className="w-full flex items-center justify-center gap-3 bg-[#06C755] hover:bg-[#05a847] text-white font-semibold rounded-xl px-6 py-3.5 transition-colors text-base"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19.952 10.516c0-4.66-4.67-8.453-10.409-8.453S-.866 5.856-.866 10.516c0 4.179 3.705 7.679 8.712 8.344.339.073.801.224.918.514.105.264.069.679.034.946l-.148.891c-.046.264-.21 1.031.904.562 1.114-.47 6.009-3.54 8.198-6.062 1.512-1.659 2.2-3.345 2.2-5.195z"/>
          </svg>
          使用 LINE 登入
        </button>

        <p className="text-zinc-600 text-xs text-center">
          僅限授權人員使用
        </p>
      </div>
    </div>
  );
}
