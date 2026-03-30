<script setup>
import { onMounted, ref } from 'vue';
import { ElMessage } from 'element-plus';
import SiteLayout from '../components/SiteLayout.vue';
import { getRecommendQuestionsApi, postAiChatApi } from '../api/ai';

const question = ref('');
const loading = ref(false);
const recommendLoading = ref(false);
const errorMessage = ref('');
const recommendQuestions = ref([]);
const chatRecords = ref([]);

async function loadRecommendQuestions() {
  recommendLoading.value = true;

  try {
    const response = await getRecommendQuestionsApi();
    recommendQuestions.value = response.data || [];
  } catch (error) {
    recommendQuestions.value = [];
  } finally {
    recommendLoading.value = false;
  }
}

async function submitQuestion(customQuestion) {
  const currentQuestion = String(customQuestion ?? question.value).trim();

  if (!currentQuestion) {
    ElMessage.warning('请先输入问题');
    return;
  }

  loading.value = true;
  errorMessage.value = '';

  try {
    const response = await postAiChatApi({ question: currentQuestion });
    chatRecords.value.unshift({
      question: currentQuestion,
      answer: response.data.answer,
      modelName: response.data.model_name || '',
      matchedContext: response.data.matchedContext || []
    });
    question.value = currentQuestion;
  } catch (error) {
    errorMessage.value = error.response?.data?.message || 'AI 问答暂时不可用，请稍后再试。';
    ElMessage.error(errorMessage.value);
  } finally {
    loading.value = false;
  }
}

function handleRecommendClick(item) {
  question.value = item;
  submitQuestion(item);
}

onMounted(loadRecommendQuestions);
</script>

<template>
  <SiteLayout>
    <div class="page-shell">
      <section class="ai-chat-hero">
        <div>
          <div class="ai-chat-hero__eyebrow">AI 智能问答</div>
          <h1 class="page-title">赣州旅游文化垂直助手</h1>
          <p class="page-subtitle">
            这个页面会先从站内景点和专题文章里召回相关资料，再生成面向游客的简洁回答。
          </p>
        </div>
      </section>

      <el-card class="ai-chat-card">
        <template #header>
          <div class="ai-chat-card__header">
            <span>请输入你的问题</span>
            <span class="ai-chat-card__tip">建议尽量围绕赣州景点、美食、非遗、红色文化来提问</span>
          </div>
        </template>

        <el-input
          v-model="question"
          type="textarea"
          :rows="4"
          maxlength="200"
          show-word-limit
          placeholder="例如：赣州有哪些适合周末玩的地方？"
        />

        <div class="ai-chat-actions">
          <el-button type="primary" :loading="loading" @click="submitQuestion()">
            {{ loading ? '正在生成回答...' : '提交问题' }}
          </el-button>
        </div>
      </el-card>

      <section class="ai-recommend-card">
        <div class="ai-recommend-card__title">推荐问题</div>
        <el-skeleton v-if="recommendLoading" :rows="2" animated />
        <div v-else-if="recommendQuestions.length" class="recommend-list">
          <el-button
            v-for="item in recommendQuestions"
            :key="item"
            text
            bg
            class="recommend-button"
            @click="handleRecommendClick(item)"
          >
            {{ item }}
          </el-button>
        </div>
        <el-empty v-else description="暂时没有推荐问题" />
      </section>

      <el-alert
        v-if="errorMessage"
        :title="errorMessage"
        type="error"
        show-icon
        :closable="false"
        style="margin-bottom: 16px;"
      />

      <section class="answer-section">
        <div class="answer-section__title">问答结果</div>
        <el-skeleton v-if="loading" :rows="8" animated />
        <el-empty
          v-else-if="!chatRecords.length"
          description="你还没有发起提问，可以点击上方推荐问题快速体验。"
        />

        <div v-else class="answer-list">
          <el-card v-for="(item, index) in chatRecords" :key="`${item.question}-${index}`" class="answer-card">
            <div class="answer-card__question">
              <span class="answer-card__label">问题</span>
              <p>{{ item.question }}</p>
            </div>

            <div class="answer-card__answer">
              <span class="answer-card__label">回答</span>
              <div v-if="item.modelName" class="answer-card__model">模型：{{ item.modelName }}</div>
              <div class="answer-card__content">{{ item.answer }}</div>
            </div>

            <div class="answer-card__context">
              <span class="answer-card__label">命中资料</span>
              <el-empty v-if="!item.matchedContext.length" description="没有命中明确资料" :image-size="80" />
              <div v-else class="context-tags">
                <el-tag v-for="context in item.matchedContext" :key="`${context.type}-${context.id}`" type="info">
                  {{ context.type === 'scenic' ? '景点' : '文章' }}：{{ context.title }}
                </el-tag>
              </div>
            </div>
          </el-card>
        </div>
      </section>
    </div>
  </SiteLayout>
</template>

<style scoped>
.ai-chat-hero {
  padding: 38px 32px;
  border-radius: 24px;
  margin-bottom: 24px;
  background: linear-gradient(135deg, #dbeafe, #dcfce7);
}

.ai-chat-hero__eyebrow {
  color: #0f766e;
  font-weight: 700;
  margin-bottom: 10px;
}

.ai-chat-card {
  margin-bottom: 24px;
}

.ai-chat-card__header {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.ai-chat-card__tip {
  color: #6b7280;
  font-size: 13px;
}

.ai-chat-actions {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
}

.ai-recommend-card {
  margin-bottom: 24px;
  padding: 24px;
  border-radius: 24px;
  background: #fff;
  box-shadow: 0 12px 28px rgba(15, 23, 42, 0.06);
}

.ai-recommend-card__title,
.answer-section__title {
  font-size: 20px;
  font-weight: 600;
  margin-bottom: 16px;
}

.recommend-list {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.recommend-button {
  white-space: normal;
}

.answer-list {
  display: grid;
  gap: 20px;
}

.answer-card__question,
.answer-card__answer,
.answer-card__context {
  margin-bottom: 18px;
}

.answer-card__context {
  margin-bottom: 0;
}

.answer-card__label {
  display: inline-block;
  margin-bottom: 8px;
  color: #0f766e;
  font-weight: 700;
}

.answer-card__question p {
  margin: 0;
  line-height: 1.75;
}

.answer-card__content {
  line-height: 1.85;
  color: #374151;
  white-space: pre-line;
}

.answer-card__model {
  margin-bottom: 10px;
  color: #6b7280;
  font-size: 13px;
}

.context-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}
</style>
