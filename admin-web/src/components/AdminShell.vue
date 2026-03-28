<script setup>
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { clearToken } from '../utils/auth';

const route = useRoute();
const router = useRouter();

const menus = [
  { path: '/admin/dashboard', label: 'Dashboard' },
  { path: '/admin/scenic', label: 'Scenic' },
  { path: '/admin/article', label: 'Article' },
  { path: '/admin/banner', label: 'Banner' }
];

const activePath = computed(() => route.path);

function logout() {
  clearToken();
  router.push('/admin/login');
}
</script>

<template>
  <el-container style="min-height: 100vh;">
    <el-aside width="220px" style="border-right: 1px solid #e5e7eb; padding: 16px;">
      <div style="font-size: 18px; font-weight: 600; margin-bottom: 16px;">Admin Panel</div>
      <el-menu :default-active="activePath" router>
        <el-menu-item v-for="item in menus" :key="item.path" :index="item.path">
          {{ item.label }}
        </el-menu-item>
      </el-menu>
      <div style="margin-top: 16px;">
        <el-button plain type="danger" style="width: 100%;" @click="logout">Logout</el-button>
      </div>
    </el-aside>
    <el-container>
      <el-header style="border-bottom: 1px solid #e5e7eb; display: flex; align-items: center; font-weight: 600;">
        {{ route.meta.title || 'Admin' }}
      </el-header>
      <el-main style="background: #f8fafc;">
        <slot />
      </el-main>
    </el-container>
  </el-container>
</template>
