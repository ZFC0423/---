import { createRouter, createWebHistory } from 'vue-router';

function settleScroll(position) {
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      window.setTimeout(() => resolve(position), 180);
    });
  });
}

const routes = [
  {
    path: '/',
    name: 'home',
    component: () => import('../views/HomeView.vue'),
    meta: {
      shell: 'opening',
      shellTone: 'ink',
      shellLabel: 'Opening Sequence',
      chapterTitle: '片头与世界观'
    }
  },
  {
    path: '/scenic',
    name: 'scenic-list',
    component: () => import('../views/ScenicListView.vue'),
    meta: {
      shell: 'atlas',
      shellTone: 'paper',
      shellLabel: 'Scenic Atlas',
      chapterTitle: '地方图谱'
    }
  },
  {
    path: '/scenic/:id',
    name: 'scenic-detail',
    component: () => import('../views/ScenicDetailView.vue'),
    meta: {
      shell: 'dossier',
      shellTone: 'paper',
      shellLabel: 'Scenic Dossier',
      chapterTitle: '地方档案'
    }
  },
  {
    path: '/food',
    name: 'food-list',
    component: () => import('../views/FoodListView.vue'),
    meta: {
      shell: 'chapter',
      shellTone: 'paper',
      shellLabel: 'Chapter I',
      chapterTitle: '城脉与老城生活'
    }
  },
  {
    path: '/food/:id',
    name: 'food-detail',
    component: () => import('../views/FoodDetailView.vue'),
    meta: {
      shell: 'reading-room',
      shellTone: 'paper',
      shellLabel: 'Chapter I / Exhibit',
      chapterTitle: '城脉与老城生活'
    }
  },
  {
    path: '/heritage',
    name: 'heritage-list',
    component: () => import('../views/HeritageListView.vue'),
    meta: {
      shell: 'chapter',
      shellTone: 'paper',
      shellLabel: 'Chapter II',
      chapterTitle: '客乡与手艺'
    }
  },
  {
    path: '/heritage/:id',
    name: 'heritage-detail',
    component: () => import('../views/HeritageDetailView.vue'),
    meta: {
      shell: 'reading-room',
      shellTone: 'paper',
      shellLabel: 'Chapter II / Exhibit',
      chapterTitle: '客乡与手艺'
    }
  },
  {
    path: '/red-culture',
    name: 'red-culture-list',
    component: () => import('../views/RedCultureListView.vue'),
    meta: {
      shell: 'chapter',
      shellTone: 'paper',
      shellLabel: 'Chapter III',
      chapterTitle: '红土与记忆'
    }
  },
  {
    path: '/red-culture/:id',
    name: 'red-culture-detail',
    component: () => import('../views/RedCultureDetailView.vue'),
    meta: {
      shell: 'reading-room',
      shellTone: 'paper',
      shellLabel: 'Chapter III / Exhibit',
      chapterTitle: '红土与记忆'
    }
  },
  {
    path: '/ai-chat',
    name: 'ai-chat',
    component: () => import('../views/AiChatView.vue'),
    meta: {
      shell: 'guide-room',
      shellTone: 'paper',
      shellLabel: 'Guide Room',
      chapterTitle: 'AI 导览室'
    }
  },
  {
    path: '/ai-trip',
    name: 'ai-trip',
    component: () => import('../views/AiTripView.vue'),
    meta: {
      shell: 'route-studio',
      shellTone: 'paper',
      shellLabel: 'Route Studio',
      chapterTitle: '路线工作室'
    }
  },
  {
    path: '/ai-discovery',
    name: 'ai-discovery',
    component: () => import('../views/AiDiscoveryView.vue'),
    meta: {
      shell: 'decision-room',
      shellTone: 'paper',
      shellLabel: 'Decision Room',
      chapterTitle: '发现决策室'
    }
  },
  {
    path: '/about',
    name: 'about',
    component: () => import('../views/AboutView.vue'),
    meta: {
      shell: 'curatorial',
      shellTone: 'paper',
      shellLabel: 'Curatorial Note',
      chapterTitle: '策展附记'
    }
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return settleScroll(savedPosition);
    }

    if (to.hash) {
      return settleScroll({
        el: to.hash,
        top: 96,
        behavior: 'smooth'
      });
    }

    if (to.path === from.path) {
      return false;
    }

    return settleScroll({
      left: 0,
      top: 0
    });
  }
});

export default router;
