<script setup>
import { onMounted, ref } from 'vue';
import { ElMessage } from 'element-plus';
import SiteLayout from '../components/SiteLayout.vue';
import { getHomeApi } from '../api/front';
import { applyImageFallback, resolveAssetUrl } from '../utils/assets';

const loading = ref(false);
const errorMessage = ref('');
const homeData = ref({
  siteName: '',
  siteDescription: '',
  banners: [],
  recommends: {
    scenic: [],
    food: [],
    heritage: [],
    redCulture: []
  }
});

async function loadHomeData() {
  loading.value = true;
  errorMessage.value = '';

  try {
    const response = await getHomeApi();
    homeData.value = response.data;
  } catch (error) {
    errorMessage.value = error.response?.data?.message || 'Failed to load home data.';
    ElMessage.error(errorMessage.value);
  } finally {
    loading.value = false;
  }
}

onMounted(loadHomeData);
</script>

<template>
  <SiteLayout>
    <div class="page-shell">
      <el-alert v-if="errorMessage" :title="errorMessage" type="error" show-icon :closable="false" style="margin-bottom: 18px;" />
      <div v-if="errorMessage" style="margin-bottom: 18px;">
        <el-button @click="loadHomeData">Retry</el-button>
      </div>

      <el-skeleton v-if="loading" :rows="10" animated />

      <template v-else>
        <section class="home-hero">
          <div class="home-hero__text">
            <p class="home-hero__eyebrow">Ganzhou Travel and Culture Platform</p>
            <h1 class="home-hero__title">{{ homeData.siteName || 'Ganzhou Travel Platform' }}</h1>
            <p class="home-hero__desc">
              {{ homeData.siteDescription || 'A public-facing portal for scenic spots, food, heritage, and red culture content in Ganzhou.' }}
            </p>
            <div class="home-hero__actions">
              <router-link to="/scenic">
                <el-button type="primary" size="large">Explore Scenic Spots</el-button>
              </router-link>
              <router-link to="/food">
                <el-button size="large">Browse Topics</el-button>
              </router-link>
            </div>
          </div>
          <el-carousel v-if="homeData.banners.length" height="360px" class="home-hero__carousel">
            <el-carousel-item v-for="item in homeData.banners" :key="item.id">
              <router-link :to="item.linkTarget || '/'" class="banner-link">
                <img
                  class="banner-image"
                  :src="resolveAssetUrl(item.imageUrl, item.title)"
                  :alt="item.title"
                  @error="(event) => applyImageFallback(event, item.title)"
                />
                <div class="banner-mask">
                  <div class="banner-title">{{ item.title }}</div>
                </div>
              </router-link>
            </el-carousel-item>
          </el-carousel>
          <el-empty v-else description="No banner content available" class="home-hero__empty" />
        </section>

        <section class="intro-card">
          <div>
            <div class="intro-card__label">About Ganzhou</div>
            <h2>A destination shaped by landscape, local memory, and culture</h2>
          </div>
          <p>
            Ganzhou combines old city landmarks, grotto heritage, Hakka culture, local food, and red culture resources.
            This version focuses on a simple but real data flow from the admin panel to the public site.
          </p>
        </section>

        <section class="home-section">
          <div class="home-section__header">
            <div>
              <h2>Featured Scenic Spots</h2>
              <p>These items come from the home recommend data managed in the backend.</p>
            </div>
            <router-link to="/scenic">View more</router-link>
          </div>
          <el-empty v-if="!homeData.recommends.scenic.length" description="No scenic recommendations" />
          <div v-else class="card-grid">
            <router-link v-for="item in homeData.recommends.scenic" :key="item.id" :to="`/scenic/${item.id}`">
              <el-card class="home-card" shadow="hover">
                <img
                  class="image-cover"
                  :src="resolveAssetUrl(item.coverImage, item.name)"
                  :alt="item.name"
                  @error="(event) => applyImageFallback(event, item.name)"
                />
                <div class="home-card__body">
                  <h3>{{ item.name }}</h3>
                  <p>{{ item.intro || 'No introduction yet.' }}</p>
                  <div class="home-card__meta">
                    <span>{{ item.region }}</span>
                    <span>Score {{ item.hotScore }}</span>
                  </div>
                </div>
              </el-card>
            </router-link>
          </div>
        </section>

        <section class="home-section">
          <div class="home-section__header">
            <div>
              <h2>Food Picks</h2>
              <p>Food topic articles maintained in the backend are displayed here.</p>
            </div>
            <router-link to="/food">View more</router-link>
          </div>
          <el-empty v-if="!homeData.recommends.food.length" description="No food recommendations" />
          <div v-else class="card-grid">
            <router-link v-for="item in homeData.recommends.food" :key="item.id" :to="`/food/${item.id}`">
              <el-card class="home-card" shadow="hover">
                <img
                  class="image-cover"
                  :src="resolveAssetUrl(item.coverImage, item.title)"
                  :alt="item.title"
                  @error="(event) => applyImageFallback(event, item.title)"
                />
                <div class="home-card__body">
                  <h3>{{ item.title }}</h3>
                  <p>{{ item.summary || 'No summary yet.' }}</p>
                </div>
              </el-card>
            </router-link>
          </div>
        </section>

        <section class="home-section home-section--split">
          <div class="split-column">
            <div class="home-section__header">
              <div>
                <h2>Heritage</h2>
                <p>Heritage topic articles are shown here.</p>
              </div>
              <router-link to="/heritage">View more</router-link>
            </div>
            <el-empty v-if="!homeData.recommends.heritage.length" description="No heritage content" />
            <div v-else class="mini-list">
              <router-link v-for="item in homeData.recommends.heritage" :key="item.id" :to="`/heritage/${item.id}`">
                <el-card class="mini-card" shadow="hover">
                  <img
                    class="mini-card__image"
                    :src="resolveAssetUrl(item.coverImage, item.title)"
                    :alt="item.title"
                    @error="(event) => applyImageFallback(event, item.title)"
                  />
                  <div>
                    <h3>{{ item.title }}</h3>
                    <p>{{ item.summary || 'No summary yet.' }}</p>
                  </div>
                </el-card>
              </router-link>
            </div>
          </div>

          <div class="split-column">
            <div class="home-section__header">
              <div>
                <h2>Red Culture</h2>
                <p>Red culture topic articles are ready for demo display.</p>
              </div>
              <router-link to="/red-culture">View more</router-link>
            </div>
            <el-empty v-if="!homeData.recommends.redCulture.length" description="No red culture content" />
            <div v-else class="mini-list">
              <router-link v-for="item in homeData.recommends.redCulture" :key="item.id" :to="`/red-culture/${item.id}`">
                <el-card class="mini-card" shadow="hover">
                  <img
                    class="mini-card__image"
                    :src="resolveAssetUrl(item.coverImage, item.title)"
                    :alt="item.title"
                    @error="(event) => applyImageFallback(event, item.title)"
                  />
                  <div>
                    <h3>{{ item.title }}</h3>
                    <p>{{ item.summary || 'No summary yet.' }}</p>
                  </div>
                </el-card>
              </router-link>
            </div>
          </div>
        </section>

        <section class="ai-entry">
          <div>
            <div class="intro-card__label">AI Entry</div>
            <h2>AI pages stay as static entries in this round</h2>
            <p>This round only focuses on the real display chain from backend content to frontend pages.</p>
          </div>
          <div class="ai-entry__actions">
            <router-link to="/ai-chat"><el-button type="primary">AI Chat</el-button></router-link>
            <router-link to="/ai-trip"><el-button>AI Trip</el-button></router-link>
          </div>
        </section>
      </template>
    </div>
  </SiteLayout>
</template>

<style scoped>
.home-hero {
  display: grid;
  grid-template-columns: 0.95fr 1.05fr;
  gap: 24px;
  margin-bottom: 28px;
}

.home-hero__text {
  padding: 40px 32px;
  border-radius: 28px;
  background: radial-gradient(circle at top left, #cffafe, #ecfccb 60%, #ffffff 100%);
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.08);
}

.home-hero__eyebrow {
  margin: 0 0 10px;
  color: #0f766e;
  font-weight: 700;
}

.home-hero__title {
  margin: 0;
  font-size: 42px;
  line-height: 1.2;
}

.home-hero__desc {
  margin: 18px 0 24px;
  color: #4b5563;
  line-height: 1.8;
}

.home-hero__actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.home-hero__carousel,
.home-hero__empty {
  border-radius: 28px;
  overflow: hidden;
  background: #fff;
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.08);
}

.banner-link {
  position: relative;
  display: block;
  width: 100%;
  height: 100%;
}

.banner-image {
  width: 100%;
  height: 360px;
  object-fit: cover;
}

.banner-mask {
  position: absolute;
  inset: auto 0 0 0;
  padding: 22px;
  background: linear-gradient(180deg, transparent, rgba(15, 23, 42, 0.72));
}

.banner-title {
  color: #fff;
  font-size: 26px;
  font-weight: 600;
}

.intro-card {
  display: grid;
  grid-template-columns: 0.8fr 1.2fr;
  gap: 24px;
  padding: 28px 30px;
  background: #fff;
  border-radius: 24px;
  margin-bottom: 32px;
  box-shadow: 0 12px 28px rgba(15, 23, 42, 0.06);
}

.intro-card__label {
  color: #0f766e;
  font-weight: 700;
  margin-bottom: 10px;
}

.intro-card h2 {
  margin: 0;
  font-size: 28px;
}

.intro-card p {
  margin: 0;
  color: #4b5563;
  line-height: 1.85;
}

.home-section {
  margin-bottom: 34px;
}

.home-section__header {
  display: flex;
  justify-content: space-between;
  align-items: end;
  gap: 16px;
  margin-bottom: 18px;
}

.home-section__header h2 {
  margin: 0 0 8px;
}

.home-section__header p {
  margin: 0;
  color: #6b7280;
}

.home-card {
  overflow: hidden;
  height: 100%;
}

.home-card__body h3 {
  margin: 16px 0 10px;
}

.home-card__body p {
  margin: 0 0 14px;
  color: #4b5563;
  line-height: 1.7;
  min-height: 72px;
}

.home-card__meta {
  display: flex;
  justify-content: space-between;
  color: #6b7280;
  font-size: 13px;
}

.home-section--split {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
}

.mini-list {
  display: grid;
  gap: 16px;
}

.mini-card {
  display: grid;
  grid-template-columns: 140px 1fr;
  gap: 16px;
  align-items: center;
  min-height: 128px;
}

.mini-card__image {
  width: 140px;
  height: 96px;
  object-fit: cover;
  border-radius: 14px;
}

.mini-card h3 {
  margin: 0 0 8px;
}

.mini-card p {
  margin: 0;
  color: #6b7280;
  line-height: 1.7;
}

.ai-entry {
  display: flex;
  justify-content: space-between;
  gap: 24px;
  align-items: center;
  border-radius: 24px;
  padding: 30px;
  background: linear-gradient(135deg, #111827, #1d4ed8);
  color: #fff;
}

.ai-entry h2 {
  margin: 10px 0 12px;
}

.ai-entry p {
  margin: 0;
  line-height: 1.8;
  color: #dbeafe;
}

.ai-entry__actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

@media (max-width: 900px) {
  .home-hero,
  .intro-card,
  .home-section--split,
  .ai-entry {
    grid-template-columns: 1fr;
    display: grid;
  }

  .home-section__header {
    align-items: flex-start;
    flex-direction: column;
  }

  .mini-card {
    grid-template-columns: 1fr;
  }

  .mini-card__image {
    width: 100%;
    height: 180px;
  }
}
</style>
