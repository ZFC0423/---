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
  relaxed: '轻松',
  normal: '适中',
  compact: '紧凑'
};

const transportLabelMap = {
  public_transport: '公共交通',
  self_drive: '自驾'
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
  notes: '周末出行，希望不要太赶'
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
    ElMessage.warning('补充说明不要超过 300 个字符');
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
    errorMessage.value = error.response?.data?.message || 'AI 行程推荐暂时不可用，请稍后再试';
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
        <div>
          <div class="trip-hero__eyebrow">AI 行程推荐</div>
          <h1 class="page-title">赣州旅游文化行程建议</h1>
          <p class="page-subtitle">
            输入天数、兴趣、节奏和交通方式，系统会先从站内景点与专题内容中召回资料，再生成一份适合演示与参考的赣州旅游建议。
          </p>
        </div>
      </section>

      <el-card class="trip-form-card">
        <template #header>
          <div class="trip-form-card__header">
            <span>行程条件输入</span>
            <span class="trip-form-card__tip">首版会优先保证结构稳定和可演示，不包含实时天气、地图导航与票务信息</span>
          </div>
        </template>

        <el-form label-position="top">
          <div class="trip-form-grid">
            <el-form-item label="旅行天数">
              <el-input-number v-model="formState.days" :min="1" :max="5" />
            </el-form-item>

            <el-form-item label="行程节奏">
              <el-radio-group v-model="formState.pace">
                <el-radio-button label="relaxed">轻松</el-radio-button>
                <el-radio-button label="normal">适中</el-radio-button>
                <el-radio-button label="compact">紧凑</el-radio-button>
              </el-radio-group>
            </el-form-item>

            <el-form-item label="交通方式">
              <el-radio-group v-model="formState.transport">
                <el-radio-button label="public_transport">公共交通</el-radio-button>
                <el-radio-button label="self_drive">自驾</el-radio-button>
              </el-radio-group>
            </el-form-item>
          </div>

          <el-form-item label="兴趣偏好">
            <el-checkbox-group v-model="formState.interests" class="trip-checkbox-group">
              <el-checkbox
                v-for="item in interestOptions"
                :key="item.value"
                :label="item.value"
              >
                {{ item.label }}
              </el-checkbox>
            </el-checkbox-group>
          </el-form-item>

          <el-form-item label="补充说明（可选）">
            <el-input
              v-model="formState.notes"
              type="textarea"
              :rows="4"
              maxlength="300"
              show-word-limit
              placeholder="例如：周末轻松一点，不想太赶；更想体验文化内容；希望适合拍照等"
            />
          </el-form-item>
        </el-form>

        <div class="trip-form-actions">
          <el-button type="primary" :loading="loading" @click="submitTripPlan">
            {{ loading ? '正在生成行程...' : '生成行程建议' }}
          </el-button>
        </div>
      </el-card>

      <el-alert
        v-if="errorMessage"
        :title="errorMessage"
        type="error"
        show-icon
        :closable="false"
        style="margin-bottom: 20px;"
      />

      <section class="trip-result-section">
        <div class="trip-result-section__title">生成结果</div>

        <el-skeleton v-if="loading" :rows="10" animated />

        <el-empty
          v-else-if="!result"
          description="你还没有生成行程建议，可先保留默认参数直接体验"
        />

        <div v-else class="trip-result">
          <el-card class="trip-summary-card">
            <div class="trip-summary-card__meta">
              <span>模型：{{ result.model_name }}</span>
              <span>节奏：{{ paceLabelMap[formState.pace] }}</span>
              <span>交通：{{ transportLabelMap[formState.transport] }}</span>
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
                <div class="trip-day-card__title">{{ day.title }}</div>
              </template>

              <div v-if="day.items?.length" class="trip-item-list">
                <div
                  v-for="(item, index) in day.items"
                  :key="`${day.dayIndex}-${item.timeSlot}-${index}`"
                  class="trip-item"
                >
                  <div class="trip-item__slot">{{ formatTimeSlot(item.timeSlot) }}</div>
                  <div class="trip-item__main">
                    <div class="trip-item__name">
                      {{ item.name }}
                      <el-tag size="small" type="info">{{ formatContextType(item.type) }}</el-tag>
                    </div>
                    <div class="trip-item__reason">{{ item.reason }}</div>
                    <div class="trip-item__tips">建议：{{ item.tips }}</div>
                  </div>
                </div>
              </div>

              <el-empty v-else description="当天没有生成明确行程项" :image-size="70" />
            </el-card>
          </div>

          <el-card class="trip-extra-card">
            <template #header>
              <div class="trip-extra-card__title">出行提示</div>
            </template>
            <ul class="trip-tip-list">
              <li v-for="(tip, index) in result.travelTips || []" :key="`${tip}-${index}`">
                {{ tip }}
              </li>
            </ul>
          </el-card>

          <el-card class="trip-extra-card">
            <template #header>
              <div class="trip-extra-card__title">命中资料</div>
            </template>
            <div v-if="result.matchedContext?.length" class="trip-context-tags">
              <el-tag
                v-for="context in result.matchedContext"
                :key="`${context.type}-${context.id}`"
                type="success"
              >
                {{ formatContextType(context.type) }}：{{ context.title }}
              </el-tag>
            </div>
            <el-empty v-else description="没有命中明确资料" :image-size="70" />
          </el-card>
        </div>
      </section>
    </div>
  </SiteLayout>
</template>

<style scoped>
.trip-hero {
  padding: 36px 32px;
  border-radius: 24px;
  margin-bottom: 24px;
  background: linear-gradient(135deg, #e0f2fe, #ecfccb);
}

.trip-hero__eyebrow {
  color: #0f766e;
  font-weight: 700;
  margin-bottom: 10px;
}

.trip-form-card {
  margin-bottom: 24px;
}

.trip-form-card__header {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.trip-form-card__tip {
  color: #6b7280;
  font-size: 13px;
}

.trip-form-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 20px;
}

.trip-checkbox-group {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
}

.trip-form-actions {
  display: flex;
  justify-content: flex-end;
}

.trip-result-section__title {
  font-size: 20px;
  font-weight: 600;
  margin-bottom: 16px;
}

.trip-result {
  display: grid;
  gap: 20px;
}

.trip-summary-card__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  margin-bottom: 14px;
  color: #6b7280;
  font-size: 13px;
}

.trip-summary-card__content {
  line-height: 1.85;
  color: #374151;
  white-space: pre-line;
}

.trip-day-list {
  display: grid;
  gap: 20px;
}

.trip-day-card__title,
.trip-extra-card__title {
  font-size: 18px;
  font-weight: 600;
}

.trip-item-list {
  display: grid;
  gap: 16px;
}

.trip-item {
  display: grid;
  grid-template-columns: 88px 1fr;
  gap: 16px;
  padding: 16px;
  border-radius: 18px;
  background: #f8fafc;
}

.trip-item__slot {
  color: #0f766e;
  font-weight: 700;
}

.trip-item__main {
  display: grid;
  gap: 10px;
}

.trip-item__name {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  font-size: 16px;
  font-weight: 600;
}

.trip-item__reason,
.trip-item__tips {
  line-height: 1.8;
  color: #4b5563;
}

.trip-tip-list {
  margin: 0;
  padding-left: 20px;
  display: grid;
  gap: 10px;
  color: #374151;
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
  }
}
</style>
