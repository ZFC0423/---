<script setup>
import { reactive, ref } from 'vue';
import { ElMessage } from 'element-plus';
import SiteLayout from '../components/SiteLayout.vue';
import { postAiTripPlanApi } from '../api/ai';

const interestOptions = [
  { label: '自然风光', value: 'natural' },
  { label: '红色文化', value: 'red_culture' },
  { label: '客家文化', value: 'hakka_culture' },
  { label: '非遗文化', value: 'heritage' },
  { label: '美食体验', value: 'food' },
  { label: '亲子休闲', value: 'family' },
  { label: '拍照打卡', value: 'photography' }
];

const paceLabelMap = {
  relaxed: '轻松漫步',
  normal: '松弛有度',
  compact: '充实紧凑'
};

const transportLabelMap = {
  public_transport: '公共交通',
  self_drive: '自驾出行'
};

const slotLabelMap = {
  morning: '上午',
  noon: '中午',
  afternoon: '下午',
  evening: '傍晚'
};

const formState = reactive({
  days: 2,
  interests: ['red_culture', 'food'],
  pace: 'normal',
  transport: 'public_transport',
  notes: ''
});

const loading = ref(false);
const errorMessage = ref('');
const result = ref(null);

function validateForm() {
  if (!Number.isInteger(formState.days) || formState.days < 1 || formState.days > 5) {
    ElMessage.warning('出行天数需要在 1 到 5 天之间');
    return false;
  }

  if (!formState.interests.length) {
    ElMessage.warning('请至少选择一个兴趣偏好');
    return false;
  }

  if (!formState.pace) {
    ElMessage.warning('请选择行程节奏');
    return false;
  }

  if (!formState.transport) {
    ElMessage.warning('请选择交通方式');
    return false;
  }

  if ((formState.notes || '').length > 300) {
    ElMessage.warning('补充说明请控制在 300 字以内');
    return false;
  }

  return true;
}

async function submitTripPlan() {
  if (!validateForm()) {
    return;
  }

  loading.value = true;
  errorMessage.value = '';

  try {
    const response = await postAiTripPlanApi({
      days: formState.days,
      interests: formState.interests,
      pace: formState.pace,
      transport: formState.transport,
      notes: formState.notes
    });

    result.value = response.data;
  } catch (error) {
    errorMessage.value = error.response?.data?.message || '行程推荐服务暂时繁忙，请稍后再试';
    ElMessage.error(errorMessage.value);
  } finally {
    loading.value = false;
  }
}

function formatTimeSlot(value) {
  return slotLabelMap[value] || value || '时段建议';
}

function formatContextType(value) {
  return value === 'scenic' ? '景点' : '专题';
}
</script>

<template>
  <SiteLayout>
    <div class="page-shell">
      <section class="trip-hero">
        <div class="trip-hero__content">
          <div class="trip-hero__eyebrow">行程推荐</div>
          <h1 class="page-title">赣州行程推荐</h1>
          <p class="page-subtitle">
            根据出行天数、兴趣方向与节奏偏好，生成一份可参考的赣州游览建议。
          </p>
        </div>
      </section>

      <el-card class="trip-form-card">
        <template #header>
          <div class="trip-form-card__header">
            <span class="trip-form-title">出行偏好</span>
            <span class="trip-form-card__tip">填写您的基本出行信息</span>
          </div>
        </template>

        <el-form label-position="top">
          <div class="trip-form-grid">
            <el-form-item label="游玩天数">
              <el-input-number v-model="formState.days" :min="1" :max="5" />
            </el-form-item>

            <el-form-item label="行程节奏">
              <el-radio-group v-model="formState.pace">
                <el-radio-button label="relaxed">轻松</el-radio-button>
                <el-radio-button label="normal">适中</el-radio-button>
                <el-radio-button label="compact">紧凑</el-radio-button>
              </el-radio-group>
            </el-form-item>

            <el-form-item label="出行方式">
              <el-radio-group v-model="formState.transport">
                <el-radio-button label="public_transport">公共交通</el-radio-button>
                <el-radio-button label="self_drive">自驾出行</el-radio-button>
              </el-radio-group>
            </el-form-item>
          </div>

          <el-form-item label="兴趣方向（可多选）">
            <el-checkbox-group v-model="formState.interests" class="trip-checkbox-group">
              <el-checkbox
                v-for="item in interestOptions"
                :key="item.value"
                :label="item.value"
                border
              >
                {{ item.label }}
              </el-checkbox>
            </el-checkbox-group>
          </el-form-item>

          <el-form-item label="补充说明（选填）">
            <el-input
              v-model="formState.notes"
              type="textarea"
              :rows="3"
              maxlength="300"
              show-word-limit
              placeholder="例如：带两位长辈出行，希望步道平缓，尽量包含地道的客家美食推荐。"
            />
          </el-form-item>
        </el-form>

        <div class="trip-form-actions">
          <el-button type="primary" size="large" :loading="loading" @click="submitTripPlan" class="submit-btn">
            {{ loading ? '正在生成建议...' : '获取行程建议' }}
          </el-button>
        </div>
      </el-card>

      <el-alert
        v-if="errorMessage"
        :title="errorMessage"
        type="error"
        show-icon
        :closable="false"
        style="margin-bottom: 24px;"
      />

      <section class="trip-result-section" v-if="loading || result">
        <div class="trip-result-header">
          <h2 class="trip-result-title">行程建议</h2>
        </div>

        <div v-if="loading" class="loading-state">
           <div class="loading-spinner"></div>
           <p>正在根据偏好检索平台内容...</p>
        </div>

        <div v-else-if="result" class="trip-result">
          <el-card class="trip-summary-card">
            <div class="trip-summary-card__meta">
              <el-tag effect="plain" round type="info" size="small">出行节奏：{{ paceLabelMap[formState.pace] }}</el-tag>
              <el-tag effect="plain" round type="info" size="small">交通：{{ transportLabelMap[formState.transport] }}</el-tag>
              <el-tag effect="light" round size="small" class="model-tag">生成模型：{{ result.model_name || '默认模型' }}</el-tag>
            </div>
            <div class="trip-summary-card__content">{{ result.summary }}</div>
          </el-card>

          <div class="trip-day-list">
            <el-card
              v-for="day in result.days || []"
              :key="day.dayIndex"
              class="trip-day-card"
            >
              <template #header>
                <div class="trip-day-card__header">
                  <div class="trip-day-card__title">{{ day.title }}</div>
                  <div class="day-line"></div>
                </div>
              </template>

              <div v-if="day.items?.length" class="trip-item-list">
                <div
                  v-for="(item, index) in day.items"
                  :key="`${day.dayIndex}-${item.timeSlot}-${index}`"
                  class="trip-item"
                >
                  <div class="trip-item__slot">
                    <span class="slot-dot"></span>
                    {{ formatTimeSlot(item.timeSlot) }}
                  </div>
                  <div class="trip-item__main">
                    <div class="trip-item__name">
                      {{ item.name }}
                      <el-tag size="small" type="success" effect="light">{{ formatContextType(item.type) }}</el-tag>
                    </div>
                    <div class="trip-item__reason">{{ item.reason }}</div>
                    <div class="trip-item__tips">
                      <strong>💡 参考提示：</strong>{{ item.tips }}
                    </div>
                  </div>
                </div>
              </div>

              <el-empty v-else description="当日暂无具体安排建议" :image-size="70" />
            </el-card>
          </div>

          <div class="trip-bottom-cards">
            <el-card class="trip-extra-card">
              <template #header>
                <div class="trip-extra-card__title">🎒 出行提示</div>
              </template>
              <ul class="trip-tip-list">
                <li v-for="(tip, index) in result.travelTips || []" :key="`${tip}-${index}`">
                  {{ tip }}
                </li>
              </ul>
            </el-card>

            <el-card class="trip-extra-card">
              <template #header>
                <div class="trip-extra-card__title">📚 参考来源</div>
              </template>
              <div v-if="result.matchedContext?.length" class="trip-context-tags">
                <el-tag
                  v-for="context in result.matchedContext"
                  :key="`${context.type}-${context.id}`"
                  type="info"
                  effect="plain"
                >
                  {{ formatContextType(context.type) }} · {{ context.title }}
                </el-tag>
              </div>
              <el-empty v-else description="暂无关联平台内容" :image-size="50" />
            </el-card>
          </div>
        </div>
      </section>
    </div>
  </SiteLayout>
</template>

<style scoped>
.trip-hero {
  padding: 48px 36px;
  border-radius: var(--gz-radius-lg);
  margin-bottom: 32px;
  background: linear-gradient(135deg, #f0fdfa, #fdf4ff);
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.6);
  text-align: center;
}

.trip-hero__content {
  max-width: 600px;
  margin: 0 auto;
}

.trip-hero__eyebrow {
  color: var(--gz-brand-primary);
  font-weight: 700;
  margin-bottom: 12px;
  letter-spacing: 2px;
  font-size: 13px;
  text-transform: uppercase;
}

.trip-form-card {
  margin-bottom: 32px;
  max-width: 860px;
  margin-left: auto;
  margin-right: auto;
  border-radius: var(--gz-radius-md) !important;
}

.trip-form-card__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.trip-form-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--gz-brand-secondary);
}

.trip-form-card__tip {
  color: var(--gz-text-secondary);
  font-size: 13px;
}

.trip-form-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 24px;
}

.trip-checkbox-group {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.trip-form-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 10px;
}

.submit-btn {
  padding: 0 40px;
  border-radius: 20px;
  font-size: 15px;
}

.trip-result-section {
  max-width: 860px;
  margin: 0 auto;
  animation: fadeIn 0.6s ease-out;
}

.trip-result-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.trip-result-title {
  font-size: 24px;
  font-weight: 700;
  margin: 0;
  color: var(--gz-brand-secondary);
}

.trip-result {
  display: grid;
  gap: 24px;
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 0;
  color: var(--gz-brand-primary);
  font-weight: 500;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #ccfbf1;
  border-top-color: var(--gz-brand-primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 16px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.trip-summary-card {
  background: white;
}

.trip-summary-card__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 16px;
}

.model-tag {
  color: #64748b;
  border-color: #e2e8f0;
  background: #f8fafc;
}

.trip-summary-card__content {
  line-height: 1.85;
  color: var(--gz-text-regular);
  white-space: pre-line;
  font-size: 15px;
}

.trip-day-list {
  display: grid;
  gap: 24px;
}

.trip-day-card {
  border-radius: var(--gz-radius-md) !important;
}

.trip-day-card__header {
  display: flex;
  align-items: center;
  gap: 16px;
}

.trip-day-card__title {
  font-size: 18px;
  font-weight: 700;
  color: var(--gz-brand-primary);
  white-space: nowrap;
}

.day-line {
  height: 1px;
  flex: 1;
  background: linear-gradient(90deg, var(--gz-border-light), transparent);
}

.trip-item-list {
  display: grid;
  gap: 20px;
}

.trip-item {
  display: grid;
  grid-template-columns: 80px 1fr;
  gap: 24px;
  position: relative;
  padding: 4px 0;
}

.trip-item:not(:last-child)::after {
  content: '';
  position: absolute;
  left: 21px; 
  top: 30px;
  bottom: -20px;
  width: 1px;
  background: var(--gz-border-light);
}

.trip-item__slot {
  color: var(--gz-text-regular);
  font-weight: 600;
  display: flex;
  gap: 12px;
  padding-top: 2px;
}

.slot-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--gz-brand-primary);
  position: relative;
  top: 5px;
  box-shadow: 0 0 0 3px #ccfbf1;
}

.trip-item__main {
  background: var(--gz-bg-page);
  padding: 16px 20px;
  border-radius: 12px;
  display: grid;
  gap: 12px;
  transition: var(--gz-transition-base);
}

.trip-item__main:hover {
  background: #f0fdfa;
  transform: translateX(4px);
}

.trip-item__name {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  font-size: 17px;
  font-weight: 700;
  color: var(--gz-brand-secondary);
}

.trip-item__reason {
  line-height: 1.7;
  color: var(--gz-text-regular);
  font-size: 15px;
}

.trip-item__tips {
  line-height: 1.7;
  color: #854d0e;
  background: #fefce8;
  padding: 10px 14px;
  border-radius: 8px;
  font-size: 14px;
}

.trip-bottom-cards {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
}

.trip-extra-card__title {
  font-size: 16px;
  font-weight: 600;
}

.trip-tip-list {
  margin: 0;
  padding-left: 20px;
  display: grid;
  gap: 12px;
  color: var(--gz-text-regular);
  line-height: 1.7;
}

.trip-context-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

@media (max-width: 900px) {
  .trip-form-grid {
    grid-template-columns: 1fr;
  }

  .trip-item {
    grid-template-columns: 1fr;
    gap: 12px;
  }
  
  .trip-item:not(:last-child)::after {
    display: none;
  }
  
  .trip-bottom-cards {
    grid-template-columns: 1fr;
  }
}
</style>
