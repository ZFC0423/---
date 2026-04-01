<script setup>
import { onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import SiteLayout from './SiteLayout.vue';
import { getArticleDetailApi } from '../api/front';
import { applyImageFallback, resolveAssetUrl } from '../utils/assets';
import { View } from '@element-plus/icons-vue';

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
      <div class="topic-detail-nav">
        <el-breadcrumb separator="/">
          <el-breadcrumb-item :to="backPath">{{ pageTitle }}</el-breadcrumb-item>
          <el-breadcrumb-item>内容概览</el-breadcrumb-item>
        </el-breadcrumb>
        <router-link :to="backPath" class="nav-back">返回列表</router-link>
      </div>

      <el-alert v-if="errorMessage" :title="errorMessage" type="error" show-icon :closable="false" style="margin: 20px 0;" />
      <div v-if="errorMessage" style="margin-bottom: 20px; display: flex; gap: 12px;">
        <el-button @click="loadDetail">重试请求</el-button>
        <router-link :to="backPath"><el-button>返回列表</el-button></router-link>
      </div>

      <el-skeleton v-if="loading" :rows="10" animated />

      <template v-else-if="detail">
        <article class="detail-article">
          <header class="detail-article__header">
            <div class="detail-article__meta-top">
              <el-tag size="small" effect="plain" type="info">{{ detail.categoryName }}</el-tag>
              <span class="view-count"><el-icon><View /></el-icon> 阅读量: {{ detail.viewCount }}</span>
            </div>
            
            <h1 class="detail-article__title">{{ detail.title }}</h1>
            
            <div class="detail-article__summary" v-if="detail.summary">
              <strong>核心线索：</strong>{{ detail.summary }}
            </div>

            <div class="detail-article__tags" v-if="detail.tags && detail.tags.length">
              <el-tag v-for="tag in detail.tags" :key="tag" type="info" size="small" round># {{ tag }}</el-tag>
            </div>
          </header>

          <div class="detail-article__hero">
            <img
              class="detail-article__cover"
              :src="resolveAssetUrl(detail.coverImage, detail.title)"
              :alt="detail.title"
              @error="(event) => applyImageFallback(event, detail.title)"
            />
          </div>

          <div class="detail-article__body">
            <div class="reading-guide-box">
              <strong>阅读提示：</strong>本页以主题化方式组织已有内容，帮助更快理解相关景点与文化线索。当前展示基于现有平台资料，部分原始条目仍保留其既有外文命名。
            </div>

            <div class="content-source-info" v-if="detail.source || detail.author">
              <span v-if="detail.source">内容来源：{{ detail.source }}</span>
              <span v-if="detail.author">贡献作者：{{ detail.author }}</span>
            </div>
            
            <div class="detail-article__html" v-html="detail.content || detail.summary || '暂无详细内容。'" />
          </div>
        </article>

        <section class="detail-related">
          <div class="detail-related__header">
            <h2>延伸了解</h2>
            <p>继续探索本主题下的其他相关内容与文化线索。</p>
          </div>

          <el-empty v-if="!detail.relatedList?.length" description="暂无相关内容" />

          <div v-else class="card-grid">
            <el-card v-for="item in detail.relatedList" :key="item.id" class="related-card" shadow="hover" @click="goRelated(item.id)">
              <div class="related-image-box">
                <img
                  class="image-cover"
                  :src="resolveAssetUrl(item.coverImage, item.title)"
                  :alt="item.title"
                  @error="(event) => applyImageFallback(event, item.title)"
                />
              </div>
              <div class="related-card__body">
                <h3>{{ item.title }}</h3>
                <p>{{ item.summary || '暂无导读摘要。' }}</p>
              </div>
            </el-card>
          </div>
        </section>
      </template>

      <el-empty v-else description="暂未获取到相关内容" />
    </div>
  </SiteLayout>
</template>

<style scoped>
.topic-detail-nav {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.nav-back {
  color: var(--gz-text-regular);
  font-size: 14px;
  display: flex;
  align-items: center;
  transition: color 0.3s;
}

.nav-back:hover {
  color: var(--gz-brand-primary);
}

.detail-article {
  max-width: 860px;
  margin: 0 auto 56px;
  animation: fadeIn 0.6s ease-out;
}

.detail-article__header {
  text-align: center;
  margin-bottom: 32px;
}

.detail-article__meta-top {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 16px;
  margin-bottom: 20px;
}

.view-count {
  font-size: 13px;
  color: var(--gz-text-secondary);
  display: flex;
  align-items: center;
  gap: 4px;
}

.detail-article__title {
  font-size: 38px;
  font-weight: 800;
  color: var(--gz-brand-secondary);
  line-height: 1.3;
  margin: 0 0 24px;
  letter-spacing: -0.5px;
}

.detail-article__summary {
  background: var(--gz-bg-page);
  padding: 20px 28px;
  border-radius: var(--gz-radius-md);
  color: var(--gz-text-regular);
  font-size: 15px;
  line-height: 1.8;
  text-align: left;
  border-left: 4px solid var(--gz-brand-primary);
  margin-bottom: 24px;
}

.detail-article__summary strong {
  color: var(--gz-brand-secondary);
}

.detail-article__tags {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 10px;
}

.detail-article__hero {
  border-radius: var(--gz-radius-lg);
  overflow: hidden;
  margin-bottom: 40px;
  box-shadow: 0 16px 40px rgba(15, 23, 42, 0.08);
}

.detail-article__cover {
  width: 100%;
  height: 440px;
  object-fit: cover;
  display: block;
}

.detail-article__body {
  max-width: 760px;
  margin: 0 auto;
}

.reading-guide-box {
  background: var(--gz-bg-page, #f8fafc);
  padding: 16px 20px;
  border-radius: var(--gz-radius-md, 8px);
  color: var(--gz-text-regular, #475569);
  font-size: 14px;
  line-height: 1.7;
  margin-bottom: 24px;
  border: 1px solid var(--gz-border-light, #e2e8f0);
}

.reading-guide-box strong {
  color: var(--gz-brand-primary, #0f766e);
}

.content-source-info {
  display: flex;
  gap: 24px;
  flex-wrap: wrap;
  color: var(--gz-text-secondary);
  font-size: 14px;
  margin-bottom: 32px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--gz-border-light);
}

.detail-article__html {
  font-size: 16px;
  line-height: 2.1;
  color: #334155;
  word-wrap: break-word;
  white-space: pre-line;
}

.detail-article__html :deep(img) {
  max-width: 100%;
  border-radius: var(--gz-radius-md);
  margin: 20px 0;
}

.detail-related {
  max-width: 1000px;
  margin: 0 auto;
  border-top: 1px solid var(--gz-border-light);
  padding-top: 48px;
}

.detail-related__header {
  text-align: center;
  margin-bottom: 32px;
}

.detail-related__header h2 {
  font-size: 28px;
  color: var(--gz-brand-secondary);
  margin: 0 0 8px;
}

.detail-related__header p {
  margin: 0;
  color: var(--gz-text-secondary);
  font-size: 15px;
}

.related-card {
  cursor: pointer;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.related-image-box {
  overflow: hidden;
}

.related-card__body {
  padding: 20px;
  flex: 1;
  display: flex;
  flex-direction: column;
}

.related-card__body h3 {
  margin: 0 0 10px;
  font-size: 18px;
  color: var(--gz-brand-secondary);
  line-height: 1.4;
}

.related-card__body p {
  margin: 0;
  color: var(--gz-text-regular);
  line-height: 1.7;
  font-size: 14px;
}

@media (max-width: 768px) {
  .detail-article__title {
    font-size: 28px;
  }
  
  .detail-article__cover {
    height: 240px;
  }
}
</style>
