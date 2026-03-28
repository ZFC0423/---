<script setup>
import { onMounted, reactive, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import SiteLayout from '../components/SiteLayout.vue';
import { getScenicListApi } from '../api/front';
import { applyImageFallback, resolveAssetUrl } from '../utils/assets';

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
  keyword: '',
  region: '',
  tag: ''
});

async function loadList() {
  loading.value = true;
  errorMessage.value = '';

  try {
    const response = await getScenicListApi({
      page: pagination.page,
      pageSize: pagination.pageSize,
      keyword: filters.keyword,
      region: filters.region,
      tag: filters.tag
    });

    listData.value = response.data.list;
    pagination.total = response.data.total;
  } catch (error) {
    errorMessage.value = error.response?.data?.message || 'Failed to load scenic list.';
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
  router.push(`/scenic/${id}`);
}

watch(() => pagination.page, loadList);
onMounted(loadList);
</script>

<template>
  <SiteLayout>
    <div class="page-shell">
      <section class="scenic-hero">
        <div>
          <h1 class="page-title">Scenic Spots</h1>
          <p class="page-subtitle">
            Public scenic content maintained in the backend can be searched and browsed here.
          </p>
        </div>
      </section>

      <el-card class="filter-card">
        <div class="filter-bar">
          <el-input v-model="filters.keyword" clearable placeholder="Search by name or intro" @keyup.enter="handleSearch" />
          <el-input v-model="filters.region" clearable placeholder="Filter by region, such as Zhanggong" @keyup.enter="handleSearch" />
          <el-input v-model="filters.tag" clearable placeholder="Filter by tag, such as history" @keyup.enter="handleSearch" />
          <el-button type="primary" @click="handleSearch">Search</el-button>
        </div>
      </el-card>

      <el-alert v-if="errorMessage" :title="errorMessage" type="error" show-icon :closable="false" style="margin-bottom: 16px;" />
      <div v-if="errorMessage" style="margin-bottom: 16px;">
        <el-button @click="loadList">Retry</el-button>
      </div>

      <el-skeleton v-if="loading" :rows="8" animated />

      <template v-else>
        <el-empty v-if="!listData.length" description="No scenic data matched the current filters" />

        <div v-else class="card-grid">
          <el-card v-for="item in listData" :key="item.id" class="scenic-card" shadow="hover" @click="goDetail(item.id)">
            <img
              class="image-cover"
              :src="resolveAssetUrl(item.coverImage, item.name)"
              :alt="item.name"
              @error="(event) => applyImageFallback(event, item.name)"
            />
            <div class="scenic-card__body">
              <div class="scenic-card__head">
                <h3>{{ item.name }}</h3>
                <span>{{ item.region }}</span>
              </div>
              <p>{{ item.intro || 'No introduction yet.' }}</p>
              <div class="scenic-card__tags">
                <el-tag v-for="tag in item.tags" :key="tag" size="small" type="success">{{ tag }}</el-tag>
              </div>
            </div>
          </el-card>
        </div>

        <div class="pagination-wrap">
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
.scenic-hero {
  margin-bottom: 24px;
  padding: 34px 30px;
  border-radius: 24px;
  background: linear-gradient(135deg, #d1fae5, #ecfeff);
}

.filter-card {
  margin-bottom: 22px;
}

.filter-bar {
  display: grid;
  grid-template-columns: 1.2fr 1fr 1fr auto;
  gap: 12px;
}

.scenic-card {
  cursor: pointer;
  height: 100%;
}

.scenic-card__body {
  padding-top: 14px;
}

.scenic-card__head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: baseline;
}

.scenic-card__head h3 {
  margin: 0;
}

.scenic-card__head span {
  color: #0f766e;
  font-size: 13px;
}

.scenic-card__body p {
  margin: 12px 0;
  color: #4b5563;
  line-height: 1.7;
  min-height: 72px;
}

.scenic-card__tags {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.pagination-wrap {
  margin-top: 24px;
  display: flex;
  justify-content: flex-end;
}

@media (max-width: 900px) {
  .filter-bar {
    grid-template-columns: 1fr;
  }
}
</style>
