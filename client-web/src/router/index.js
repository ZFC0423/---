import { createRouter, createWebHistory } from 'vue-router';

const routes = [
  {
    path: '/',
    name: 'home',
    component: () => import('../views/HomeView.vue')
  },
  {
    path: '/scenic',
    name: 'scenic-list',
    component: () => import('../views/ScenicListView.vue')
  },
  {
    path: '/scenic/:id',
    name: 'scenic-detail',
    component: () => import('../views/ScenicDetailView.vue')
  },
  {
    path: '/food',
    name: 'food-list',
    component: () => import('../views/FoodListView.vue')
  },
  {
    path: '/food/:id',
    name: 'food-detail',
    component: () => import('../views/FoodDetailView.vue')
  },
  {
    path: '/heritage',
    name: 'heritage-list',
    component: () => import('../views/HeritageListView.vue')
  },
  {
    path: '/heritage/:id',
    name: 'heritage-detail',
    component: () => import('../views/HeritageDetailView.vue')
  },
  {
    path: '/red-culture',
    name: 'red-culture-list',
    component: () => import('../views/RedCultureListView.vue')
  },
  {
    path: '/red-culture/:id',
    name: 'red-culture-detail',
    component: () => import('../views/RedCultureDetailView.vue')
  },
  {
    path: '/ai-chat',
    name: 'ai-chat',
    component: () => import('../views/AiChatView.vue')
  },
  {
    path: '/ai-trip',
    name: 'ai-trip',
    component: () => import('../views/AiTripView.vue')
  },
  {
    path: '/about',
    name: 'about',
    component: () => import('../views/AboutView.vue')
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

export default router;
