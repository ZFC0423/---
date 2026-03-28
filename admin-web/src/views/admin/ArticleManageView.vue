<script setup>
import { onMounted, reactive, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import AdminShell from '../../components/AdminShell.vue';
import {
  createArticleApi,
  deleteArticleApi,
  getArticleDetailApi,
  getArticleListApi,
  updateArticleApi,
  updateArticleStatusApi
} from '../../api/article';

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
  categoryCode: ''
});
const tableData = ref([]);
const categoryOptions = [
  { label: 'Food', value: 3, code: 'food' },
  { label: 'Heritage', value: 4, code: 'heritage' },
  { label: 'Red Culture', value: 5, code: 'red_culture' }
];
const form = reactive({
  id: null,
  title: '',
  categoryId: 3,
  coverImage: '',
  summary: '',
  content: '',
  source: '',
  author: '',
  tags: '',
  recommendFlag: 0,
  status: 1
});

const rules = {
  title: [{ required: true, message: 'Please input title', trigger: 'blur' }],
  categoryId: [{ required: true, message: 'Please select category', trigger: 'change' }]
};

function resetForm() {
  Object.assign(form, {
    id: null,
    title: '',
    categoryId: 3,
    coverImage: '',
    summary: '',
    content: '',
    source: '',
    author: '',
    tags: '',
    recommendFlag: 0,
    status: 1
  });
}

function buildPayload() {
  return {
    title: form.title,
    categoryId: form.categoryId,
    coverImage: form.coverImage,
    summary: form.summary,
    content: form.content,
    source: form.source,
    author: form.author,
    tags: form.tags,
    recommendFlag: form.recommendFlag,
    status: form.status
  };
}

async function loadTable() {
  loading.value = true;

  try {
    const response = await getArticleListApi({
      page: pagination.page,
      pageSize: pagination.pageSize,
      keyword: filters.keyword,
      categoryCode: filters.categoryCode
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
  const response = await getArticleDetailApi(row.id);
  dialogMode.value = 'edit';
  Object.assign(form, {
    ...response.data,
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
      await createArticleApi(payload);
      ElMessage.success('Article created');
    } else {
      await updateArticleApi(form.id, payload);
      ElMessage.success('Article updated');
    }

    dialogVisible.value = false;
    await loadTable();
  } catch (error) {
    // message handled by request interceptor
  }
}

async function handleDelete(row) {
  try {
    await ElMessageBox.confirm(`Delete article "${row.title}"?`, 'Confirm', { type: 'warning' });
    await deleteArticleApi(row.id);
    ElMessage.success('Article deleted');
    await loadTable();
  } catch (error) {
    // ignore cancel, request message handled globally
  }
}

async function handleStatusChange(row, value) {
  try {
    await updateArticleStatusApi(row.id, { status: value ? 1 : 0 });
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
        <el-input v-model="filters.keyword" placeholder="Search by title or summary" clearable />
        <el-select v-model="filters.categoryCode" placeholder="Category" clearable style="width: 200px;">
          <el-option v-for="item in categoryOptions" :key="item.code" :label="item.label" :value="item.code" />
        </el-select>
        <el-button type="primary" @click="handleSearch">Search</el-button>
        <el-button @click="openCreateDialog">Create</el-button>
      </div>

      <el-table v-loading="loading" :data="tableData" border>
        <el-table-column prop="id" label="ID" width="70" />
        <el-table-column prop="title" label="Title" min-width="220" />
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

    <el-dialog v-model="dialogVisible" :title="dialogMode === 'create' ? 'Create Article' : 'Edit Article'" width="760px">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="120px">
        <el-form-item label="Title" prop="title">
          <el-input v-model="form.title" />
        </el-form-item>
        <el-form-item label="Category" prop="categoryId">
          <el-select v-model="form.categoryId" style="width: 100%;">
            <el-option v-for="item in categoryOptions" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="Cover Image">
          <el-input v-model="form.coverImage" placeholder="/uploads/..." />
        </el-form-item>
        <el-form-item label="Summary">
          <el-input v-model="form.summary" type="textarea" rows="3" />
        </el-form-item>
        <el-form-item label="Content">
          <el-input v-model="form.content" type="textarea" rows="6" />
        </el-form-item>
        <el-form-item label="Source">
          <el-input v-model="form.source" />
        </el-form-item>
        <el-form-item label="Author">
          <el-input v-model="form.author" />
        </el-form-item>
        <el-form-item label="Tags">
          <el-input v-model="form.tags" placeholder="comma separated tags" />
        </el-form-item>
        <el-form-item label="Recommend">
          <el-switch v-model="form.recommendFlag" :active-value="1" :inactive-value="0" />
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
