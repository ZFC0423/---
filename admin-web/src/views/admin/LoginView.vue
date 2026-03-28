<script setup>
import { reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { loginApi } from '../../api/auth';
import { setToken } from '../../utils/auth';

const router = useRouter();
const loading = ref(false);
const formRef = ref();
const form = reactive({
  username: 'admin',
  password: 'Admin@123456'
});

const rules = {
  username: [{ required: true, message: 'Please input username', trigger: 'blur' }],
  password: [{ required: true, message: 'Please input password', trigger: 'blur' }]
};

async function handleLogin() {
  const valid = await formRef.value.validate().catch(() => false);

  if (!valid) {
    return;
  }

  loading.value = true;

  try {
    const response = await loginApi(form);
    setToken(response.data.token);
    ElMessage.success('Login success');
    router.push('/admin/dashboard');
  } catch (error) {
    // message handled by request interceptor
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div style="min-height: 100vh; display: flex; align-items: center; justify-content: center; background: #f3f4f6;">
    <el-card style="width: 420px;">
      <template #header>
        <div style="font-size: 20px; font-weight: 600;">Admin Login</div>
      </template>
      <el-form ref="formRef" :model="form" :rules="rules" label-position="top">
        <el-form-item label="Username" prop="username">
          <el-input v-model="form.username" placeholder="Please input username" />
        </el-form-item>
        <el-form-item label="Password" prop="password">
          <el-input v-model="form.password" type="password" show-password placeholder="Please input password" />
        </el-form-item>
        <el-button type="primary" :loading="loading" style="width: 100%;" @click="handleLogin">
          Login
        </el-button>
      </el-form>
    </el-card>
  </div>
</template>
