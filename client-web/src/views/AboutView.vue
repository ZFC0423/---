<script setup>
import SiteLayout from '../components/SiteLayout.vue';
</script>

<template>
  <SiteLayout>
    <div class="page-shell">
      <section class="about-hero">
        <div>
          <div class="about-hero__eyebrow">About Platform</div>
          <h1 class="page-title">Ganzhou Travel and Culture Smart Service Platform</h1>
          <p class="page-subtitle">
            This version focuses on a real content flow: content is maintained in the backend and displayed on the public site.
          </p>
        </div>
      </section>

      <section class="about-grid">
        <el-card shadow="hover">
          <template #header>Positioning</template>
          <p>A tourism and culture portal for Ganzhou with a clear demo-ready structure.</p>
        </el-card>
        <el-card shadow="hover">
          <template #header>Current Progress</template>
          <p>Admin login, content management, banners, and public content display have already been connected.</p>
        </el-card>
        <el-card shadow="hover">
          <template #header>Why It Works for Demo</template>
          <p>You can show the full path from backend content editing to frontend visitor display.</p>
        </el-card>
      </section>
    </div>
  </SiteLayout>
</template>

<style scoped>
.about-hero {
  padding: 38px 32px;
  border-radius: 24px;
  background: linear-gradient(135deg, #e0f2fe, #ecfccb);
  margin-bottom: 24px;
}

.about-hero__eyebrow {
  color: #0f766e;
  font-weight: 700;
  margin-bottom: 12px;
}

.about-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
}

.about-grid p {
  margin: 0;
  line-height: 1.8;
  color: #4b5563;
}

@media (max-width: 900px) {
  .about-grid {
    grid-template-columns: 1fr;
  }
}
</style>
