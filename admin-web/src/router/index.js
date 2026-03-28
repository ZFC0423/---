import { createRouter, createWebHistory } from 'vue-router';
import { getToken } from '../utils/auth';

const routes = [
  {
    path: '/',
    redirect: '/admin/login'
  },
  {
    path: '/admin/login',
    name: 'admin-login',
    component: () => import('../views/admin/LoginView.vue'),
    meta: {
      public: true,
      title: 'Login'
    }
  },
  {
    path: '/admin/dashboard',
    name: 'admin-dashboard',
    component: () => import('../views/admin/DashboardView.vue'),
    meta: {
      title: 'Dashboard'
    }
  },
  {
    path: '/admin/scenic',
    name: 'admin-scenic-list',
    component: () => import('../views/admin/ScenicManageView.vue'),
    meta: {
      title: 'Scenic Management'
    }
  },
  {
    path: '/admin/article',
    name: 'admin-article-list',
    component: () => import('../views/admin/ArticleManageView.vue'),
    meta: {
      title: 'Article Management'
    }
  },
  {
    path: '/admin/banner',
    name: 'admin-banner',
    component: () => import('../views/admin/BannerManageView.vue'),
    meta: {
      title: 'Banner Management'
    }
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

router.beforeEach((to, from, next) => {
  const token = getToken();

  if (!to.meta.public && !token) {
    next('/admin/login');
    return;
  }

  if (to.path === '/admin/login' && token) {
    next('/admin/dashboard');
    return;
  }

  next();
});

export default router;
