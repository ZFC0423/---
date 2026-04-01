<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import SiteLayout from './SiteLayout.vue';
import { getArticleListApi } from '../api/front';
import { applyImageFallback, resolveAssetUrl } from '../utils/assets';
import { View, Search } from '@element-plus/icons-vue';

const props = defineProps({
  pageTitle: { type: String, required: true },
  pageDescription: { type: String, required: true },
  categoryCode: { type: String, required: true },
  detailBasePath: { type: String, required: true }
});

const router = useRouter();
const loading = ref(false);
const errorMessage = ref('');
const listData = ref([]);
const pagination = reactive({
  page: 1,
  pageSize: 6,
  total: 0
});
const filters = reactive({
  keyword: ''
});

const accentColor = computed(() => {
  if (props.categoryCode === 'food') return '#f97316';
  if (props.categoryCode === 'heritage') return '#14b8a6';
  return '#ef4444';
});

async function loadList() {
  loading.value = true;
  errorMessage.value = '';

  try {
    const response = await getArticleListApi({
      page: pagination.page,
      pageSize: pagination.pageSize,
      keyword: filters.keyword,
      categoryCode: props.categoryCode
    });

    listData.value = response.data.list;
    pagination.total = response.data.total;
  } catch (error) {
    errorMessage.value = error.response?.data?.message || '主题内容加载失败，请稍后重试。';
    ElMessage.error(errorMessage.value);
  } finally {
    loading.value = false;
  }
}

function handleSearch() {
  pagination.page = 1;
  loadList();
}

function goDetail(id) {
  router.push(`${props.detailBasePath}/${id}`);
}

watch(() => pagination.page, loadList);
onMounted(loadList);
</script>

<template>
  <SiteLayout>
    <div class="page-shell">
      <section class="topic-hero">
        <div class="topic-hero__accent-line" :style="{ backgroundColor: accentColor }"></div>
        <div class="topic-hero__content">
          <div class="topic-hero__badge" :style="{ color: accentColor, borderColor: accentColor }">
            {{ categoryCode === 'food' ? '地道美食' : categoryCode === 'heritage' ? '非遗传承' : '红色记忆' }}
          </div>
          <h1 class="page-title topic-hero__title">{{ pageTitle }}</h1>
          <p class="page-subtitle topic-hero__desc">{{ pageDescription }}</p>
        </div>
      </section>

      <el-card class="topic-search" shadow="never">
        <div class="topic-search__bar">
          <el-input v-model="filters.keyword" placeholder="输入关键词，筛选该主题下的文化线索..." clearable @keyup.enter="handleSearch">
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
          <el-button type="primary" class="search-btn" @click="handleSearch">筛选内容</el-button>
        </div>
      </el-card>

      <el-alert v-if="errorMessage" :title="errorMessage" type="error" show-icon :closable="false" style="margin-bottom: 24px;" />
      <div v-if="errorMessage" style="margin-bottom: 24px;">
        <el-button @click="loadList">重试请求</el-button>
      </div>

      <el-skeleton v-if="loading" :rows="8" animated />

      <template v-else>
        <el-empty v-if="!listData.length" description="暂无符合该主题的相关文化线索" />

        <div v-else>
          <div class="reading-guide-box">
            <strong>浏览提示：</strong>本页按主题组织已有内容，为您提供清晰的探索入口。当前展示基于平台现有资料，部分原始条目保留了外文命名。
          </div>
          <div class="card-grid">
            <el-card v-for="item in listData" :key="item.id" class="topic-card" shadow="hover" @click="goDetail(item.id)">
            <div class="topic-card__image-wrapper">
              <img
                class="image-cover topic-card__image"
                :src="resolveAssetUrl(item.coverImage, item.title)"
                :alt="item.title"
                @error="(event) => applyImageFallback(event, item.title)"
              />
            </div>
            <div class="topic-card__body">
              <div class="topic-card__meta">
                <span class="meta-cat">{{ item.categoryName }}</span>
                <span class="meta-view"><el-icon><View /></el-icon> {{ item.viewCount }}</span>
              </div>
              <h3 class="topic-card__title">{{ item.title }}</h3>
              <p class="topic-card__summary">{{ item.summary || '暂无核心线索说明。' }}</p>
              <div class="topic-card__tags" v-if="item.tags && item.tags.length">
                <el-tag v-for="tag in item.tags" :key="tag" size="small" type="info" effect="plain">{{ tag }}</el-tag>
              </div>
            </div>
            </div>
          </el-card>
        </div>

        <div class="topic-pagination">
          <el-pagination
            v-model:current-page="pagination.page"
            v-model:page-size="pagination.pageSize"
            layout="total, prev, pager, next"
            :total="pagination.total"
            background
          />
        </div>
      </template>
    </div>
  </SiteLayout>
</template>

<style scoped>
.topic-hero {
  position: relative;
  border-radius: var(--gz-radius-lg);
  padding: 56px 40px;
  background: linear-gradient(135deg, #1e293b, #0f172a);
  color: #fff;
  margin-bottom: 32px;
  box-shadow: 0 20px 40px rgba(15, 23, 42, 0.15);
  overflow: hidden;
}

.topic-hero__accent-line {
  position: absolute;
  top: 0;
  left: 0;
  width: 6px;
  height: 100%;
}

.topic-hero__content {
  position: relative;
  z-index: 2;
  max-width: 800px;
}

.topic-hero__badge {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 20px;
  border: 1px solid;
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 16px;
  background: rgba(255, 255, 255, 0.05);
}

.topic-hero__title {
  color: #f8fafc;
  font-size: 40px;
  font-weight: 800;
  margin: 0 0 16px;
  letter-spacing: -0.5px;
}

.topic-hero__desc {
  color: #cbd5e1;
  font-size: 16px;
  line-height: 1.6;
  margin: 0;
  max-width: 600px;
}

.topic-search {
  margin-bottom: 32px;
  border-radius: var(--gz-radius-md);
  background: #f8fafc;
  border: 1px solid var(--gz-border-light);
}

.topic-search__bar {
  display: flex;
  gap: 16px;
  align-items: center;
}

.search-btn {
  padding: 0 32px;
  font-weight: 600;
}

.topic-card {
  overflow: hidden;
  cursor: pointer;
  height: 100%;
  display: flex;
  flex-direction: column;
  border-radius: var(--gz-radius-md);
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.topic-card:hover {
  transform: translateY(-6px);
  box-shadow: 0 20px 40px rgba(15, 23, 42, 0.1);
}

.topic-card:hover .topic-card__image {
  transform: scale(1.05);
}

.topic-card__image-wrapper {
  overflow: hidden;
  height: 220px;
}

.topic-card__image {
  height: 100%;
  width: 100%;
  object-fit: cover;
  transition: transform 0.5s ease;
}

.topic-card__body {
  padding: 24px;
  flex: 1;
  display: flex;
  flex-direction: column;
}

.topic-card__meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  font-size: 13px;
  color: var(--gz-text-secondary);
}

.meta-cat {
  color: var(--gz-brand-primary);
  font-weight: 600;
}

.meta-view {
  display: flex;
  align-items: center;
  gap: 4px;
}

.topic-card__title {
  margin: 0 0 12px;
  font-size: 20px;
  font-weight: 700;
  color: var(--gz-brand-secondary);
  line-height: 1.4;
}

.topic-card__summary {
  margin: 0 0 20px;
  color: var(--gz-text-regular);
  line-height: 1.7;
  font-size: 14px;
  flex: 1;
}

.topic-card__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.topic-pagination {
  margin-top: 40px;
  display: flex;
  justify-content: center;
}

@media (max-width: 768px) {
  .topic-hero {
    padding: 32px 24px;
  }
  
  .topic-hero__title {
    font-size: 32px;
  }
  
  .topic-search__bar {
    flex-direction: column;
  }
  
  .search-btn {
    width: 100%;
  }
}

.reading-guide-box {
  background: var(--gz-bg-page, #f8fafc);
  padding: 14px 20px;
  border-radius: var(--gz-radius-md, 8px);
  color: var(--gz-text-regular, #475569);
  font-size: 14px;
  line-height: 1.6;
  margin-bottom: 24px;
  border: 1px solid var(--gz-border-light, #e2e8f0);
}

.reading-guide-box strong {
  color: var(--gz-brand-primary, #0f766e);
}
</style>
