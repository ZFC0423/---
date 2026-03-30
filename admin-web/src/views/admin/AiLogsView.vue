<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import AdminShell from '../../components/AdminShell.vue';
import {
  getAiChatLogsApi,
  getAiCopywritingLogsApi,
  getAiTripLogsApi
} from '../../api/ai-logs';

const activeTab = ref('chat');
const loading = ref(false);
const errorText = ref('');
const detailVisible = ref(false);
const detailRecord = ref(null);
const tableData = ref([]);
const pagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0
});

const tabOptions = [
  { label: 'Chat Logs', value: 'chat' },
  { label: 'Trip Logs', value: 'trip' },
  { label: 'Copywriting Logs', value: 'copywriting' }
];

const requestMap = {
  chat: getAiChatLogsApi,
  trip: getAiTripLogsApi,
  copywriting: getAiCopywritingLogsApi
};

const detailTitle = computed(() => {
  if (!detailRecord.value) {
    return 'Log Detail';
  }

  if (activeTab.value === 'chat') {
    return `Chat Log #${detailRecord.value.id}`;
  }

  if (activeTab.value === 'trip') {
    return `Trip Log #${detailRecord.value.id}`;
  }

  return `Copywriting Log #${detailRecord.value.id}`;
});

function formatDateTime(value) {
  if (!value) {
    return '-';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleString('zh-CN', { hour12: false });
}

function truncateText(value, maxLength = 60) {
  const normalized = String(value || '').replace(/\s+/g, ' ').trim();

  if (!normalized) {
    return '-';
  }

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength)}...`;
}

function stringifyValue(value) {
  if (value === null || value === undefined || value === '') {
    return '-';
  }

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return JSON.stringify(parsed, null, 2);
    } catch (error) {
      return value;
    }
  }

  return JSON.stringify(value, null, 2);
}

function getChatSummary(row) {
  return truncateText(row.question, 80);
}

function getTripSummary(row) {
  const parts = [`${row.days || 0} day(s)`];

  if (row.preferences) {
    parts.push(String(row.preferences));
  }

  if (row.pace) {
    parts.push(`pace: ${row.pace}`);
  }

  return truncateText(parts.join(' | '), 80);
}

function getCopywritingSummary(row) {
  const parts = [String(row.target_type || '-')];

  if (row.target_id) {
    parts.push(`targetId: ${row.target_id}`);
  }

  return parts.join(' | ');
}

async function loadLogs() {
  loading.value = true;
  errorText.value = '';

  try {
    const request = requestMap[activeTab.value];
    const response = await request({
      page: pagination.page,
      pageSize: pagination.pageSize
    });

    tableData.value = response.data.list || [];
    pagination.total = response.data.pagination?.total || 0;
    pagination.page = response.data.pagination?.page || pagination.page;
    pagination.pageSize = response.data.pagination?.pageSize || pagination.pageSize;
  } catch (error) {
    tableData.value = [];
    pagination.total = 0;
    errorText.value = error.response?.data?.message || 'Failed to load AI logs';
  } finally {
    loading.value = false;
  }
}

function handleTabChange() {
  pagination.page = 1;
  detailVisible.value = false;
  detailRecord.value = null;
  loadLogs();
}

function handlePageChange(page) {
  pagination.page = page;
  loadLogs();
}

function openDetail(row) {
  detailRecord.value = row;
  detailVisible.value = true;
}

onMounted(loadLogs);
</script>

<template>
  <AdminShell>
    <el-card>
      <template #header>
        <div>
          <div style="font-size: 18px; font-weight: 600;">AI 日志查看</div>
          <div style="font-size: 13px; color: #6b7280; margin-top: 4px;">
            查看 AI 问答、行程推荐、文案生成的历史记录
          </div>
        </div>
      </template>

      <el-tabs v-model="activeTab" @tab-change="handleTabChange">
        <el-tab-pane
          v-for="item in tabOptions"
          :key="item.value"
          :label="item.label"
          :name="item.value"
        />
      </el-tabs>

      <div v-if="errorText" style="margin-bottom: 16px;">
        <el-alert :title="errorText" type="error" show-icon :closable="false" />
      </div>

      <el-table v-if="tableData.length" v-loading="loading" :data="tableData" border>
        <el-table-column prop="id" label="ID" width="80" />

        <el-table-column v-if="activeTab === 'chat'" label="Question" min-width="260">
          <template #default="{ row }">
            {{ getChatSummary(row) }}
          </template>
        </el-table-column>

        <el-table-column v-if="activeTab === 'trip'" label="Trip Summary" min-width="280">
          <template #default="{ row }">
            {{ getTripSummary(row) }}
          </template>
        </el-table-column>

        <el-table-column v-if="activeTab === 'copywriting'" label="Target" min-width="220">
          <template #default="{ row }">
            {{ getCopywritingSummary(row) }}
          </template>
        </el-table-column>

        <el-table-column prop="model_name" label="Model" width="160" />
        <el-table-column prop="token_usage" label="Token" width="100" />
        <el-table-column label="Created At" width="180">
          <template #default="{ row }">
            {{ formatDateTime(row.created_at) }}
          </template>
        </el-table-column>
        <el-table-column label="Action" width="120" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="openDetail(row)">View Detail</el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-empty
        v-else-if="!loading"
        :description="errorText ? '日志加载失败，请重试' : '当前暂无日志数据'"
      />

      <div style="display: flex; justify-content: flex-end; margin-top: 16px;">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.pageSize"
          layout="total, prev, pager, next"
          :total="pagination.total"
          @current-change="handlePageChange"
        />
      </div>
    </el-card>

    <el-dialog v-model="detailVisible" :title="detailTitle" width="860px">
      <template v-if="detailRecord">
        <el-descriptions :column="2" border style="margin-bottom: 16px;">
          <el-descriptions-item label="ID">{{ detailRecord.id }}</el-descriptions-item>
          <el-descriptions-item label="Model">{{ detailRecord.model_name || '-' }}</el-descriptions-item>
          <el-descriptions-item label="Token">{{ detailRecord.token_usage ?? 0 }}</el-descriptions-item>
          <el-descriptions-item label="Created At">{{ formatDateTime(detailRecord.created_at) }}</el-descriptions-item>
        </el-descriptions>

        <template v-if="activeTab === 'chat'">
          <div style="margin-bottom: 12px;">
            <div style="font-weight: 600; margin-bottom: 6px;">Question</div>
            <pre style="white-space: pre-wrap;">{{ detailRecord.question || '-' }}</pre>
          </div>
          <div style="margin-bottom: 12px;">
            <div style="font-weight: 600; margin-bottom: 6px;">Answer</div>
            <pre style="white-space: pre-wrap;">{{ detailRecord.answer || '-' }}</pre>
          </div>
          <div>
            <div style="font-weight: 600; margin-bottom: 6px;">Matched Context</div>
            <pre style="white-space: pre-wrap;">{{ stringifyValue(detailRecord.matched_context) }}</pre>
          </div>
        </template>

        <template v-else-if="activeTab === 'trip'">
          <el-descriptions :column="2" border style="margin-bottom: 16px;">
            <el-descriptions-item label="Days">{{ detailRecord.days || '-' }}</el-descriptions-item>
            <el-descriptions-item label="Pace">{{ detailRecord.pace || '-' }}</el-descriptions-item>
            <el-descriptions-item label="Preferences" :span="2">
              {{ detailRecord.preferences || '-' }}
            </el-descriptions-item>
            <el-descriptions-item label="Extra Requirement" :span="2">
              {{ detailRecord.extra_requirement || '-' }}
            </el-descriptions-item>
          </el-descriptions>
          <div>
            <div style="font-weight: 600; margin-bottom: 6px;">Result Content</div>
            <pre style="white-space: pre-wrap;">{{ stringifyValue(detailRecord.result_content) }}</pre>
          </div>
        </template>

        <template v-else>
          <el-descriptions :column="2" border style="margin-bottom: 16px;">
            <el-descriptions-item label="Target Type">{{ detailRecord.target_type || '-' }}</el-descriptions-item>
            <el-descriptions-item label="Target ID">{{ detailRecord.target_id || '-' }}</el-descriptions-item>
          </el-descriptions>
          <div style="margin-bottom: 12px;">
            <div style="font-weight: 600; margin-bottom: 6px;">Input Data</div>
            <pre style="white-space: pre-wrap;">{{ stringifyValue(detailRecord.input_data) }}</pre>
          </div>
          <div style="margin-bottom: 12px;">
            <div style="font-weight: 600; margin-bottom: 6px;">Output Content</div>
            <pre style="white-space: pre-wrap;">{{ stringifyValue(detailRecord.output_content) }}</pre>
          </div>
          <div>
            <div style="font-weight: 600; margin-bottom: 6px;">Prompt Text</div>
            <pre style="white-space: pre-wrap;">{{ detailRecord.prompt_text || '-' }}</pre>
          </div>
        </template>
      </template>
    </el-dialog>
  </AdminShell>
</template>
