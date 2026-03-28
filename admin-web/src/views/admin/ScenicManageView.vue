<script setup>
import { onMounted, reactive, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import AdminShell from '../../components/AdminShell.vue';
import {
  createScenicApi,
  deleteScenicApi,
  getScenicDetailApi,
  getScenicListApi,
  updateScenicApi,
  updateScenicStatusApi
} from '../../api/scenic';
import { getToken } from '../../utils/auth';

const loading = ref(false);
const dialogVisible = ref(false);
const dialogMode = ref('create');
const formRef = ref();
const pagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0
});
const filters = reactive({
  keyword: '',
  region: ''
});
const tableData = ref([]);
const scenicCategoryOptions = [
  { label: 'Nature Scenic', value: 1 },
  { label: 'History Scenic', value: 2 }
];
const uploadAction = `${import.meta.env.VITE_ADMIN_API_BASE || 'http://localhost:3000'}/api/admin/upload/image`;
const form = reactive({
  id: null,
  name: '',
  region: '',
  categoryId: 1,
  coverImage: '',
  galleryImages: '',
  intro: '',
  cultureDesc: '',
  openTime: '',
  ticketInfo: '',
  suggestedDuration: '',
  address: '',
  trafficGuide: '',
  tips: '',
  tags: '',
  recommendFlag: 0,
  hotScore: 0,
  status: 1
});

const rules = {
  name: [{ required: true, message: 'Please input scenic name', trigger: 'blur' }],
  region: [{ required: true, message: 'Please input region', trigger: 'blur' }],
  categoryId: [{ required: true, message: 'Please select category', trigger: 'change' }]
};

function resetForm() {
  Object.assign(form, {
    id: null,
    name: '',
    region: '',
    categoryId: 1,
    coverImage: '',
    galleryImages: '',
    intro: '',
    cultureDesc: '',
    openTime: '',
    ticketInfo: '',
    suggestedDuration: '',
    address: '',
    trafficGuide: '',
    tips: '',
    tags: '',
    recommendFlag: 0,
    hotScore: 0,
    status: 1
  });
}

const uploadHeaders = {
  Authorization: `Bearer ${getToken()}`
};

function handleCoverUploadSuccess(response) {
  form.coverImage = response.data.url;
  ElMessage.success('Cover image uploaded');
}

function handleUploadError() {
  ElMessage.error('Upload failed');
}

function buildPayload() {
  return {
    name: form.name,
    region: form.region,
    categoryId: form.categoryId,
    coverImage: form.coverImage,
    galleryImages: form.galleryImages,
    intro: form.intro,
    cultureDesc: form.cultureDesc,
    openTime: form.openTime,
    ticketInfo: form.ticketInfo,
    suggestedDuration: form.suggestedDuration,
    address: form.address,
    trafficGuide: form.trafficGuide,
    tips: form.tips,
    tags: form.tags,
    recommendFlag: form.recommendFlag,
    hotScore: form.hotScore,
    status: form.status
  };
}

async function loadTable() {
  loading.value = true;

  try {
    const response = await getScenicListApi({
      page: pagination.page,
      pageSize: pagination.pageSize,
      keyword: filters.keyword,
      region: filters.region
    });

    tableData.value = response.data.list;
    pagination.total = response.data.total;
  } finally {
    loading.value = false;
  }
}

function openCreateDialog() {
  dialogMode.value = 'create';
  resetForm();
  dialogVisible.value = true;
}

async function openEditDialog(row) {
  const response = await getScenicDetailApi(row.id);
  dialogMode.value = 'edit';
  Object.assign(form, {
    ...response.data,
    galleryImages: (response.data.galleryImages || []).join(','),
    tags: (response.data.tags || []).join(',')
  });
  dialogVisible.value = true;
}

async function submitForm() {
  const valid = await formRef.value.validate().catch(() => false);

  if (!valid) {
    return;
  }

  const payload = buildPayload();

  try {
    if (dialogMode.value === 'create') {
      await createScenicApi(payload);
      ElMessage.success('Scenic created');
    } else {
      await updateScenicApi(form.id, payload);
      ElMessage.success('Scenic updated');
    }

    dialogVisible.value = false;
    await loadTable();
  } catch (error) {
    // message handled by request interceptor
  }
}

async function handleDelete(row) {
  try {
    await ElMessageBox.confirm(`Delete scenic "${row.name}"?`, 'Confirm', { type: 'warning' });
    await deleteScenicApi(row.id);
    ElMessage.success('Scenic deleted');
    await loadTable();
  } catch (error) {
    // ignore cancel, request message handled globally
  }
}

async function handleStatusChange(row, value) {
  try {
    await updateScenicStatusApi(row.id, { status: value ? 1 : 0 });
    ElMessage.success('Status updated');
    await loadTable();
  } catch (error) {
    // message handled by request interceptor
  }
}

function handleSearch() {
  pagination.page = 1;
  loadTable();
}

onMounted(loadTable);
</script>

<template>
  <AdminShell>
    <el-card>
      <div style="display: flex; gap: 12px; margin-bottom: 16px;">
        <el-input v-model="filters.keyword" placeholder="Search by name or intro" clearable />
        <el-input v-model="filters.region" placeholder="Filter by region" clearable />
        <el-button type="primary" @click="handleSearch">Search</el-button>
        <el-button @click="openCreateDialog">Create</el-button>
      </div>

      <el-table v-loading="loading" :data="tableData" border>
        <el-table-column prop="id" label="ID" width="70" />
        <el-table-column prop="name" label="Name" min-width="140" />
        <el-table-column prop="region" label="Region" width="120" />
        <el-table-column prop="categoryName" label="Category" width="140" />
        <el-table-column prop="status" label="Status" width="120">
          <template #default="{ row }">
            <el-switch :model-value="row.status === 1" @change="(value) => handleStatusChange(row, value)" />
          </template>
        </el-table-column>
        <el-table-column label="Actions" width="180" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="openEditDialog(row)">Edit</el-button>
            <el-button link type="danger" @click="handleDelete(row)">Delete</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div style="display: flex; justify-content: flex-end; margin-top: 16px;">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.pageSize"
          layout="total, prev, pager, next"
          :total="pagination.total"
          @current-change="loadTable"
        />
      </div>
    </el-card>

    <el-dialog v-model="dialogVisible" :title="dialogMode === 'create' ? 'Create Scenic' : 'Edit Scenic'" width="760px">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="140px">
        <el-form-item label="Name" prop="name">
          <el-input v-model="form.name" />
        </el-form-item>
        <el-form-item label="Region" prop="region">
          <el-input v-model="form.region" />
        </el-form-item>
        <el-form-item label="Category" prop="categoryId">
          <el-select v-model="form.categoryId" style="width: 100%;">
            <el-option v-for="item in scenicCategoryOptions" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="Cover Image">
          <div style="width: 100%;">
            <el-input v-model="form.coverImage" placeholder="/uploads/..." />
            <el-upload
              :action="uploadAction"
              :headers="uploadHeaders"
              :show-file-list="false"
              style="margin-top: 8px;"
              @success="handleCoverUploadSuccess"
              @error="handleUploadError"
            >
              <el-button>Upload Cover</el-button>
            </el-upload>
          </div>
        </el-form-item>
        <el-form-item label="Gallery Images">
          <el-input v-model="form.galleryImages" placeholder="comma separated image urls" />
        </el-form-item>
        <el-form-item label="Intro">
          <el-input v-model="form.intro" type="textarea" rows="3" />
        </el-form-item>
        <el-form-item label="Culture Desc">
          <el-input v-model="form.cultureDesc" type="textarea" rows="3" />
        </el-form-item>
        <el-form-item label="Open Time">
          <el-input v-model="form.openTime" />
        </el-form-item>
        <el-form-item label="Ticket Info">
          <el-input v-model="form.ticketInfo" />
        </el-form-item>
        <el-form-item label="Suggested Duration">
          <el-input v-model="form.suggestedDuration" />
        </el-form-item>
        <el-form-item label="Address">
          <el-input v-model="form.address" />
        </el-form-item>
        <el-form-item label="Traffic Guide">
          <el-input v-model="form.trafficGuide" type="textarea" rows="2" />
        </el-form-item>
        <el-form-item label="Tips">
          <el-input v-model="form.tips" type="textarea" rows="2" />
        </el-form-item>
        <el-form-item label="Tags">
          <el-input v-model="form.tags" placeholder="comma separated tags" />
        </el-form-item>
        <el-form-item label="Recommend Flag">
          <el-switch v-model="form.recommendFlag" :active-value="1" :inactive-value="0" />
        </el-form-item>
        <el-form-item label="Hot Score">
          <el-input-number v-model="form.hotScore" :min="0" />
        </el-form-item>
        <el-form-item label="Status">
          <el-switch v-model="form.status" :active-value="1" :inactive-value="0" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">Cancel</el-button>
        <el-button type="primary" @click="submitForm">Save</el-button>
      </template>
    </el-dialog>
  </AdminShell>
</template>
