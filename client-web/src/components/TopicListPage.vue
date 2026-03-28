<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import SiteLayout from './SiteLayout.vue';
import { getArticleListApi } from '../api/front';
import { applyImageFallback, resolveAssetUrl } from '../utils/assets';

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

const heroColor = computed(() => {
  if (props.categoryCode === 'food') return 'linear-gradient(135deg, #f97316, #fdba74)';
  if (props.categoryCode === 'heritage') return 'linear-gradient(135deg, #0f766e, #5eead4)';
  return 'linear-gradient(135deg, #991b1b, #f87171)';
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
    errorMessage.value = error.response?.data?.message || 'Failed to load topic content.';
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
      <section class="topic-hero" :style="{ background: heroColor }">
        <div>
          <h1 class="page-title topic-hero__title">{{ pageTitle }}</h1>
          <p class="page-subtitle topic-hero__desc">{{ pageDescription }}</p>
        </div>
      </section>

      <el-card class="topic-search">
        <div class="topic-search__bar">
          <el-input v-model="filters.keyword" placeholder="Search by title, summary or tag" clearable @keyup.enter="handleSearch" />
          <el-button type="primary" @click="handleSearch">Search</el-button>
        </div>
      </el-card>

      <el-alert v-if="errorMessage" :title="errorMessage" type="error" show-icon :closable="false" style="margin-bottom: 16px;" />
      <div v-if="errorMessage" style="margin-bottom: 16px;">
        <el-button @click="loadList">Retry</el-button>
      </div>

      <el-skeleton v-if="loading" :rows="8" animated />

      <template v-else>
        <el-empty v-if="!listData.length" description="No topic content matched the current search" />

        <div v-else class="card-grid">
          <el-card v-for="item in listData" :key="item.id" class="topic-card" shadow="hover" @click="goDetail(item.id)">
            <img
              class="image-cover topic-card__image"
              :src="resolveAssetUrl(item.coverImage, item.title)"
              :alt="item.title"
              @error="(event) => applyImageFallback(event, item.title)"
            />
            <div class="topic-card__body">
              <div class="topic-card__meta">{{ item.categoryName }} - Views {{ item.viewCount }}</div>
              <h3 class="topic-card__title">{{ item.title }}</h3>
              <p class="topic-card__summary">{{ item.summary || 'No summary yet.' }}</p>
              <div class="topic-card__tags">
                <el-tag v-for="tag in item.tags" :key="tag" size="small" type="info">{{ tag }}</el-tag>
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
          />
        </div>
      </template>
    </div>
  </SiteLayout>
</template>

<style scoped>
.topic-hero {
  border-radius: 24px;
  padding: 42px 32px;
  color: #fff;
  margin-bottom: 24px;
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.12);
}

.topic-hero__title,
.topic-hero__desc {
  color: #fff;
}

.topic-search {
  margin-bottom: 24px;
}

.topic-search__bar {
  display: flex;
  gap: 12px;
}

.topic-card {
  overflow: hidden;
  cursor: pointer;
  height: 100%;
}

.topic-card__image {
  height: 220px;
}

.topic-card__body {
  padding-top: 16px;
}

.topic-card__meta {
  color: #6b7280;
  font-size: 13px;
  margin-bottom: 8px;
}

.topic-card__title {
  margin: 0 0 10px;
  font-size: 20px;
}

.topic-card__summary {
  margin: 0 0 14px;
  color: #4b5563;
  line-height: 1.7;
  min-height: 76px;
}

.topic-card__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.topic-pagination {
  margin-top: 24px;
  display: flex;
  justify-content: flex-end;
}

@media (max-width: 768px) {
  .topic-search__bar {
    flex-direction: column;
  }
}
</style>
