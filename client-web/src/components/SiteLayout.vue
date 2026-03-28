<script setup>
import { computed } from 'vue';
import { useRoute } from 'vue-router';

const route = useRoute();

const activeMenu = computed(() => {
  if (route.path.startsWith('/scenic')) return '/scenic';
  if (route.path.startsWith('/food')) return '/food';
  if (route.path.startsWith('/heritage')) return '/heritage';
  if (route.path.startsWith('/red-culture')) return '/red-culture';
  if (route.path.startsWith('/about')) return '/about';
  return route.path;
});
</script>

<template>
  <div>
    <header class="site-header">
      <div class="site-header__inner">
        <router-link class="site-logo" to="/">Ganzhou Travel</router-link>
        <el-menu :default-active="activeMenu" mode="horizontal" router class="site-menu">
          <el-menu-item index="/">Home</el-menu-item>
          <el-menu-item index="/scenic">Scenic</el-menu-item>
          <el-menu-item index="/food">Food</el-menu-item>
          <el-menu-item index="/heritage">Heritage</el-menu-item>
          <el-menu-item index="/red-culture">Red Culture</el-menu-item>
          <el-menu-item index="/about">About</el-menu-item>
        </el-menu>
      </div>
    </header>

    <main>
      <slot />
    </main>

    <footer class="site-footer">
      <div class="page-shell site-footer__inner">
        <div>
          <div class="site-footer__title">Ganzhou Travel and Culture Platform</div>
          <p class="site-footer__desc">
            A lightweight tourism and culture portal for demo use. This version focuses on a real content flow from the admin panel to the public site.
          </p>
        </div>
        <div class="site-footer__links">
          <router-link to="/scenic">Scenic Guide</router-link>
          <router-link to="/food">Food Topics</router-link>
          <router-link to="/heritage">Heritage Topics</router-link>
          <router-link to="/red-culture">Red Culture</router-link>
        </div>
      </div>
    </footer>
  </div>
</template>

<style scoped>
.site-header {
  position: sticky;
  top: 0;
  z-index: 20;
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid #e5e7eb;
}

.site-header__inner {
  max-width: 1180px;
  margin: 0 auto;
  padding: 0 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
}

.site-logo {
  font-size: 22px;
  font-weight: 700;
  color: #0f766e;
  white-space: nowrap;
}

.site-menu {
  border-bottom: none;
  flex: 1;
  justify-content: flex-end;
  min-width: 0;
}

.site-footer {
  margin-top: 60px;
  background: #0f172a;
  color: #e5e7eb;
}

.site-footer__inner {
  display: flex;
  justify-content: space-between;
  gap: 24px;
  align-items: flex-start;
}

.site-footer__title {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 8px;
}

.site-footer__desc {
  margin: 0;
  color: #cbd5e1;
  line-height: 1.7;
  max-width: 560px;
}

.site-footer__links {
  display: grid;
  gap: 10px;
  min-width: 160px;
}

.site-footer__links a {
  color: #e2e8f0;
}

@media (max-width: 900px) {
  .site-header__inner {
    flex-direction: column;
    align-items: stretch;
    padding-top: 12px;
  }

  .site-menu {
    justify-content: flex-start;
  }

  .site-footer__inner {
    flex-direction: column;
  }
}
</style>
