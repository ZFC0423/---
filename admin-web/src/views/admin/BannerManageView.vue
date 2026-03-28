<script setup>
import { onMounted, reactive, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import AdminShell from '../../components/AdminShell.vue';
import {
  createBannerApi,
  deleteBannerApi,
  getBannerListApi,
  updateBannerApi
} from '../../api/banner';
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
const tableData = ref([]);
const uploadAction = `${import.meta.env.VITE_ADMIN_API_BASE || 'http://localhost:3000'}/api/admin/upload/image`;
const form = reactive({
  id: null,
  title: '',
  imageUrl: '',
  linkType: '',
  linkTarget: '',
  sort: 0,
  status: 1
});

const rules = {
  title: [{ required: true, message: 'Please input banner title', trigger: 'blur' }],
  imageUrl: [{ required: true, message: 'Please input image url', trigger: 'blur' }]
};

function resetForm() {
  Object.assign(form, {
    id: null,
    title: '',
    imageUrl: '',
    linkType: '',
    linkTarget: '',
    sort: 0,
    status: 1
  });
}

const uploadHeaders = {
  Authorization: `Bearer ${getToken()}`
};

function handleBannerUploadSuccess(response) {
  form.imageUrl = response.data.url;
  ElMessage.success('Banner image uploaded');
}

function handleUploadError() {
  ElMessage.error('Upload failed');
}

async function loadTable() {
  loading.value = true;

  try {
    const response = await getBannerListApi({
      page: pagination.page,
      pageSize: pagination.pageSize
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

function openEditDialog(row) {
  dialogMode.value = 'edit';
  Object.assign(form, row);
  dialogVisible.value = true;
}

async function submitForm() {
  const valid = await formRef.value.validate().catch(() => false);

  if (!valid) {
    return;
  }

  const payload = {
    title: form.title,
    imageUrl: form.imageUrl,
    linkType: form.linkType,
    linkTarget: form.linkTarget,
    sort: form.sort,
    status: form.status
  };

  try {
    if (dialogMode.value === 'create') {
      await createBannerApi(payload);
      ElMessage.success('Banner created');
    } else {
      await updateBannerApi(form.id, payload);
      ElMessage.success('Banner updated');
    }

    dialogVisible.value = false;
    await loadTable();
  } catch (error) {
    // message handled by request interceptor
  }
}

async function handleDelete(row) {
  try {
    await ElMessageBox.confirm(`Delete banner "${row.title}"?`, 'Confirm', { type: 'warning' });
    await deleteBannerApi(row.id);
    ElMessage.success('Banner deleted');
    await loadTable();
  } catch (error) {
    // ignore cancel, request message handled globally
  }
}

onMounted(loadTable);
</script>

<template>
  <AdminShell>
    <el-card>
      <div style="display: flex; justify-content: space-between; margin-bottom: 16px;">
        <div style="font-weight: 600;">Banner List</div>
        <el-button @click="openCreateDialog">Create</el-button>
      </div>

      <el-table v-loading="loading" :data="tableData" border>
        <el-table-column prop="id" label="ID" width="70" />
        <el-table-column prop="title" label="Title" min-width="180" />
        <el-table-column prop="imageUrl" label="Image URL" min-width="220" />
        <el-table-column prop="sort" label="Sort" width="100" />
        <el-table-column prop="status" label="Status" width="100" />
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

    <el-dialog v-model="dialogVisible" :title="dialogMode === 'create' ? 'Create Banner' : 'Edit Banner'" width="640px">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="120px">
        <el-form-item label="Title" prop="title">
          <el-input v-model="form.title" />
        </el-form-item>
        <el-form-item label="Image URL" prop="imageUrl">
          <div style="width: 100%;">
            <el-input v-model="form.imageUrl" placeholder="/uploads/..." />
            <el-upload
              :action="uploadAction"
              :headers="uploadHeaders"
              :show-file-list="false"
              style="margin-top: 8px;"
              @success="handleBannerUploadSuccess"
              @error="handleUploadError"
            >
              <el-button>Upload Image</el-button>
            </el-upload>
          </div>
        </el-form-item>
        <el-form-item label="Link Type">
          <el-input v-model="form.linkType" placeholder="scenic / article / custom" />
        </el-form-item>
        <el-form-item label="Link Target">
          <el-input v-model="form.linkTarget" />
        </el-form-item>
        <el-form-item label="Sort">
          <el-input-number v-model="form.sort" :min="0" />
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
