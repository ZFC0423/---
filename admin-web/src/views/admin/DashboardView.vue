<script setup>
import { onMounted, reactive, ref } from 'vue';
import AdminShell from '../../components/AdminShell.vue';
import { getScenicListApi } from '../../api/scenic';
import { getArticleListApi } from '../../api/article';
import { getBannerListApi } from '../../api/banner';

const loading = ref(false);
const summary = reactive({
  scenicTotal: 0,
  articleTotal: 0,
  bannerTotal: 0
});

async function loadSummary() {
  loading.value = true;

  try {
    const [scenicRes, articleRes, bannerRes] = await Promise.all([
      getScenicListApi({ page: 1, pageSize: 1 }),
      getArticleListApi({ page: 1, pageSize: 1 }),
      getBannerListApi({ page: 1, pageSize: 1 })
    ]);

    summary.scenicTotal = scenicRes.data.total;
    summary.articleTotal = articleRes.data.total;
    summary.bannerTotal = bannerRes.data.total;
  } catch (error) {
    // message handled by request interceptor
  } finally {
    loading.value = false;
  }
}

onMounted(loadSummary);
</script>

<template>
  <AdminShell>
    <el-row :gutter="16" v-loading="loading">
      <el-col :span="8">
        <el-card>
          <div style="font-size: 14px; color: #6b7280;">Scenic Total</div>
          <div style="font-size: 28px; font-weight: 700; margin-top: 12px;">{{ summary.scenicTotal }}</div>
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card>
          <div style="font-size: 14px; color: #6b7280;">Article Total</div>
          <div style="font-size: 28px; font-weight: 700; margin-top: 12px;">{{ summary.articleTotal }}</div>
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card>
          <div style="font-size: 14px; color: #6b7280;">Banner Total</div>
          <div style="font-size: 28px; font-weight: 700; margin-top: 12px;">{{ summary.bannerTotal }}</div>
        </el-card>
      </el-col>
    </el-row>
  </AdminShell>
</template>
