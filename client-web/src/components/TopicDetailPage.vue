<script setup>
import { onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import SiteLayout from './SiteLayout.vue';
import { getArticleDetailApi } from '../api/front';
import { applyImageFallback, resolveAssetUrl } from '../utils/assets';

const props = defineProps({
  pageTitle: { type: String, required: true },
  backPath: { type: String, required: true }
});

const route = useRoute();
const router = useRouter();
const loading = ref(false);
const errorMessage = ref('');
const detail = ref(null);

async function loadDetail() {
  loading.value = true;
  errorMessage.value = '';

  try {
    const response = await getArticleDetailApi(route.params.id);
    detail.value = response.data;
  } catch (error) {
    detail.value = null;
    errorMessage.value = error.response?.data?.message || 'Failed to load article detail.';
    ElMessage.error(errorMessage.value);
  } finally {
    loading.value = false;
  }
}

function goRelated(id) {
  router.push(`${props.backPath}/${id}`);
}

watch(() => route.params.id, loadDetail);
onMounted(loadDetail);
</script>

<template>
  <SiteLayout>
    <div class="page-shell">
      <el-breadcrumb separator="/">
        <el-breadcrumb-item :to="backPath">{{ pageTitle }}</el-breadcrumb-item>
        <el-breadcrumb-item>Detail</el-breadcrumb-item>
      </el-breadcrumb>

      <el-alert v-if="errorMessage" :title="errorMessage" type="error" show-icon :closable="false" style="margin: 20px 0;" />
      <div v-if="errorMessage" style="margin-bottom: 20px; display: flex; gap: 12px;">
        <el-button @click="loadDetail">Retry</el-button>
        <router-link :to="backPath"><el-button>Back to list</el-button></router-link>
      </div>

      <el-skeleton v-if="loading" :rows="10" animated />

      <template v-else-if="detail">
        <article class="detail-article">
          <div class="detail-article__head">
            <div class="detail-article__text">
              <div class="detail-article__meta">{{ detail.categoryName }} - Views {{ detail.viewCount }}</div>
              <h1 class="page-title">{{ detail.title }}</h1>
              <p class="page-subtitle">{{ detail.summary || 'No summary yet.' }}</p>
              <div class="detail-article__tags">
                <el-tag v-for="tag in detail.tags" :key="tag" type="info">{{ tag }}</el-tag>
              </div>
            </div>
            <img
              class="detail-article__cover"
              :src="resolveAssetUrl(detail.coverImage, detail.title)"
              :alt="detail.title"
              @error="(event) => applyImageFallback(event, detail.title)"
            />
          </div>

          <el-card shadow="never" class="detail-article__content">
            <div class="detail-article__source">
              <span>Source: {{ detail.source || 'Platform' }}</span>
              <span>Author: {{ detail.author || 'Editor' }}</span>
            </div>
            <div class="detail-article__html" v-html="detail.content || detail.summary || 'No content yet.'" />
          </el-card>
        </article>

        <section class="detail-related">
          <div class="detail-related__header">
            <h2>Related Articles</h2>
            <router-link :to="backPath">Back to list</router-link>
          </div>

          <el-empty v-if="!detail.relatedList?.length" description="No related content" />

          <div v-else class="card-grid">
            <el-card v-for="item in detail.relatedList" :key="item.id" class="related-card" shadow="hover" @click="goRelated(item.id)">
              <img
                class="image-cover"
                :src="resolveAssetUrl(item.coverImage, item.title)"
                :alt="item.title"
                @error="(event) => applyImageFallback(event, item.title)"
              />
              <div class="related-card__body">
                <h3>{{ item.title }}</h3>
                <p>{{ item.summary || 'No summary yet.' }}</p>
              </div>
            </el-card>
          </div>
        </section>
      </template>

      <el-empty v-else description="Article detail is not available right now" />
    </div>
  </SiteLayout>
</template>

<style scoped>
.detail-article {
  margin-top: 20px;
}

.detail-article__head {
  display: grid;
  grid-template-columns: 1.15fr 0.85fr;
  gap: 24px;
  align-items: stretch;
}

.detail-article__text {
  background: linear-gradient(135deg, #ffffff, #ecfeff);
  border-radius: 24px;
  padding: 32px;
  box-shadow: 0 16px 36px rgba(15, 23, 42, 0.08);
}

.detail-article__meta {
  color: #0f766e;
  font-weight: 600;
  margin-bottom: 14px;
}

.detail-article__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 16px;
}

.detail-article__cover {
  width: 100%;
  height: 100%;
  min-height: 320px;
  object-fit: cover;
  border-radius: 24px;
  background: #e5e7eb;
}

.detail-article__content {
  margin-top: 24px;
}

.detail-article__source {
  display: flex;
  gap: 20px;
  flex-wrap: wrap;
  color: #6b7280;
  margin-bottom: 20px;
}

.detail-article__html {
  line-height: 1.9;
  color: #1f2937;
  word-break: break-word;
  white-space: pre-line;
}

.detail-related {
  margin-top: 36px;
}

.detail-related__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 18px;
}

.detail-related__header h2 {
  margin: 0;
}

.related-card {
  cursor: pointer;
  height: 100%;
}

.related-card__body h3 {
  margin: 14px 0 8px;
}

.related-card__body p {
  margin: 0;
  color: #6b7280;
  line-height: 1.6;
}

@media (max-width: 900px) {
  .detail-article__head {
    grid-template-columns: 1fr;
  }
}
</style>
