export type BuildStatusEntry = {
  module: string;
  location: string;
  status: 'done' | 'in-progress' | 'todo' | 'broken';
  commit: string;
  description: string;
  remaining: string;
};

export const BUILD_STATUS: BuildStatusEntry[] = [
  {
    module: '算命先 Login',
    location: 'mini-me-pwa /dna',
    status: 'done',
    commit: '69cf05e',
    description: '問卷完成後才觸發 LINE 登入',
    remaining: '',
  },
  {
    module: 'Members 接真實 API',
    location: 'admin /members',
    status: 'todo',
    commit: '',
    description: '接 GET /users/admin/users + /events/:slug/members',
    remaining: '移除 mock，接真實 finally.click API',
  },
  {
    module: 'Knowledge 接真實 API',
    location: 'admin /knowledge',
    status: 'todo',
    commit: '',
    description: 'Ghost 多選 + 寫 KBDB 三元組',
    remaining: 'Ghost 列表來自 /events/:slug/members，上傳後寫 KBDB',
  },
  {
    module: 'Entity 頁面',
    location: 'admin /entities',
    status: 'broken',
    commit: '',
    description: 'formatDate crash + 接真實 KBDB API',
    remaining: 'null check + 接真實資料',
  },
];
