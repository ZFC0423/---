<script setup>
import { computed, ref } from 'vue';
import { ElAlert, ElButton, ElInput, ElMessage, ElTag } from 'element-plus';
import { postDiscoveryQueryApi, postRoutePlanGenerateApi } from '../api/ai';
import {
  buildRoutePlanPayloadFromDiscoveryAction,
  discoveryStatusLabels,
  getRoutePlanGenerateAction,
  isSafeClarifyResult,
  routeWarningSuggestions,
  sanitizePriorState,
  unwrapFrontResponse
} from '../view-models/ai-discovery-flow';

const exampleQuestions = [
  '赣州有什么适合带老人去的地方？',
  '郁孤台和通天岩哪个更适合带老人？',
  '准备玩 3 天，带老人，想轻松一点，推荐几个地方'
];

const userQuery = ref('');
const lastDiscoveryQuestion = ref('');
const discoveryLoading = ref(false);
const routeLoading = ref(false);
const discoveryError = ref('');
const routeError = ref('');
const discoveryResult = ref(null);
const clarifyResult = ref(null);
const priorState = ref(null);
const routePlan = ref(null);
const lockedOptionKeys = ref([]);

let discoveryRequestSeq = 0;
let routeRequestSeq = 0;

const pageLocked = computed(() => discoveryLoading.value || routeLoading.value);
const routeAction = computed(() => getRoutePlanGenerateAction(discoveryResult.value));
const hasMissingTarget = computed(() => discoveryResult.value?.comparison?.outcome === 'missing_target');
const canGenerateRoute = computed(() => Boolean(routeAction.value) && !pageLocked.value);
const rankedOptions = computed(() => discoveryResult.value?.ranked_options || []);
const comparison = computed(() => discoveryResult.value?.comparison || null);
const discoveryWarnings = computed(() => discoveryResult.value?.warnings || []);
const routeWarnings = computed(() => routePlan.value?.warnings || []);
const routeDays = computed(() => routePlan.value?.days || []);
const isRouteFailed = computed(() => routePlan.value?.planning_status === 'failed');
const optionNameMap = computed(() => {
  const map = new Map();

  rankedOptions.value.forEach((option) => {
    map.set(option.option_key, option.display_name || option.option_key);
  });

  return map;
});
const lockedOptionLabels = computed(() => lockedOptionKeys.value.map((key) => optionNameMap.value.get(key) || key));

function formatList(value) {
  return Array.isArray(value) && value.length ? value.join('、') : '暂无';
}

function formatStatus(value) {
  return discoveryStatusLabels[value] || value || '待查询';
}

function formatScore(value) {
  return Number.isFinite(Number(value)) ? Math.round(Number(value)) : '--';
}

function warningText(warning) {
  if (!warning?.code) {
    return '未知提示';
  }

  return routeWarningSuggestions[warning.code] || warning.code;
}

function axisTitle(axis) {
  const marker = axis?.is_decisive ? '关键判断' : '参考维度';
  return `${marker} · ${axis?.axis_code || 'axis'}`;
}

function resetRouteState() {
  routePlan.value = null;
  routeError.value = '';
  lockedOptionKeys.value = [];
}

async function submitDiscovery(customQuestion) {
  if (pageLocked.value) {
    return;
  }

  const nextQuestion = String(customQuestion ?? userQuery.value).trim();

  if (!nextQuestion) {
    ElMessage.warning('请先输入你想比较或发现的问题。');
    return;
  }

  const seq = ++discoveryRequestSeq;
  discoveryLoading.value = true;
  discoveryError.value = '';
  clarifyResult.value = null;
  discoveryResult.value = null;
  resetRouteState();

  try {
    const response = await postDiscoveryQueryApi({
      user_query: nextQuestion,
      priorState: priorState.value,
      previous_public_result: null,
      decision_context: null,
      action: null
    });
    const data = unwrapFrontResponse(response);

    if (seq !== discoveryRequestSeq) {
      return;
    }

    lastDiscoveryQuestion.value = nextQuestion;

    if (isSafeClarifyResult(data)) {
      clarifyResult.value = data;
      discoveryResult.value = null;
      priorState.value = sanitizePriorState(data);
      return;
    }

    priorState.value = null;
    clarifyResult.value = null;
    discoveryResult.value = data;
  } catch (error) {
    if (seq !== discoveryRequestSeq) {
      return;
    }

    discoveryError.value = error.response?.data?.message || error.message || '系统暂时无法完成请求，请稍后重试。';
    ElMessage.error(discoveryError.value);
  } finally {
    if (seq === discoveryRequestSeq) {
      discoveryLoading.value = false;
    }
  }
}

function submitExample(question) {
  if (pageLocked.value) {
    return;
  }

  priorState.value = null;
  clarifyResult.value = null;
  userQuery.value = question;
  submitDiscovery(question);
}

async function generateRoute() {
  if (pageLocked.value) {
    return;
  }

  const action = routeAction.value;
  const payloadResult = buildRoutePlanPayloadFromDiscoveryAction({
    action,
    discoveryResult: discoveryResult.value,
    userQuery: lastDiscoveryQuestion.value || userQuery.value
  });

  if (!payloadResult.ok) {
    ElMessage.warning(payloadResult.message);
    return;
  }

  const seq = ++routeRequestSeq;
  routeLoading.value = true;
  routeError.value = '';
  routePlan.value = null;
  lockedOptionKeys.value = payloadResult.value.routerResult.constraints.locked_targets;

  try {
    const response = await postRoutePlanGenerateApi(payloadResult.value);
    const data = unwrapFrontResponse(response);

    if (seq !== routeRequestSeq) {
      return;
    }

    routePlan.value = data;
  } catch (error) {
    if (seq !== routeRequestSeq) {
      return;
    }

    routeError.value = error.response?.data?.message || error.message || '系统暂时无法完成请求，请稍后重试。';
    ElMessage.error(routeError.value);
  } finally {
    if (seq === routeRequestSeq) {
      routeLoading.value = false;
    }
  }
}
</script>

<template>
  <div class="page-shell discovery-page">
    <section class="discovery-hero">
      <div>
        <span class="section-eyebrow">Decision Room</span>
        <h1 class="page-title">先发现和比较，再把选择变成路线。</h1>
        <p class="page-subtitle">
          这里承接 Discovery Agent 与 Route Planner 的最小闭环：用户提出问题，系统保留后端推荐动作，并把已选景点作为路线硬约束。
        </p>
      </div>
      <div class="discovery-hero__note panel-note-muted">
        <div class="section-label">Flow</div>
        <p>问问题、看候选、确认是否能生成路线。路线失败不是系统错误，而是当前约束下的业务冲突。</p>
      </div>
    </section>

    <section class="page-workspace discovery-workspace">
      <aside class="page-workspace__aside discovery-workspace__aside">
        <div class="filter-card discovery-composer">
          <div class="discovery-composer__head">
            <span class="section-eyebrow">Discovery Query</span>
            <h2 class="section-title">输入你想发现或比较的问题。</h2>
          </div>

          <el-input
            v-model="userQuery"
            type="textarea"
            :rows="6"
            maxlength="500"
            show-word-limit
            :disabled="routeLoading"
            placeholder="例如：准备玩 3 天，带老人，想轻松一点，推荐几个地方"
            @keyup.ctrl.enter="submitDiscovery()"
          />

          <div class="discovery-composer__examples">
            <button
              v-for="item in exampleQuestions"
              :key="item"
              type="button"
              :disabled="pageLocked"
              @click="submitExample(item)"
            >
              {{ item }}
            </button>
          </div>

          <el-button type="primary" :loading="discoveryLoading" :disabled="pageLocked" @click="submitDiscovery()">
            {{ discoveryLoading ? '正在分析' : '开始发现' }}
          </el-button>
        </div>

        <div v-if="priorState" class="panel-note-accent discovery-prior">
          <div class="section-label">Clarification Context</div>
          <p>系统已保留上一轮澄清上下文。补充回答后会带着 priorState 再次进入 Intent Router。</p>
        </div>

        <el-alert
          v-if="discoveryError"
          :title="discoveryError"
          type="error"
          show-icon
          :closable="false"
          class="page-alert page-alert--block"
        />
      </aside>

      <main class="page-workspace__main discovery-workspace__main">
        <section v-if="!discoveryResult && !clarifyResult && !discoveryLoading" class="panel-soft-card discovery-empty">
          <span class="section-eyebrow">Result Canvas</span>
          <h2 class="section-title">结果会在这里展开。</h2>
          <p class="section-desc">
            可以从泛发现、两地比较、适老路线候选开始。只有后端给出 route_plan.generate 时，页面才允许生成路线。
          </p>
        </section>

        <section v-if="discoveryLoading" class="panel-soft-card discovery-loading">
          <div class="discovery-loading__pulse"></div>
          <div>
            <strong>Discovery 正在整理候选</strong>
            <p>正在识别你的意图、约束和可比较景点。</p>
          </div>
        </section>

        <section v-if="clarifyResult && !discoveryLoading" class="panel-soft-card discovery-clarify">
          <span class="section-eyebrow">Safe Clarify</span>
          <h2 class="section-title">还需要补充一点信息。</h2>
          <p v-if="clarifyResult.missing_required_fields?.length">
            缺少字段：{{ formatList(clarifyResult.missing_required_fields) }}
          </p>
          <ul>
            <li v-for="(question, index) in clarifyResult.clarification_questions || []" :key="index">
              {{ question }}
            </li>
          </ul>
        </section>

        <template v-if="discoveryResult && !discoveryLoading">
          <section class="panel-soft-card discovery-result">
            <div class="discovery-result__head">
              <div>
                <span class="section-eyebrow">Discovery Result</span>
                <h2 class="section-title">{{ formatStatus(discoveryResult.result_status) }}</h2>
              </div>
              <el-tag type="info">{{ discoveryResult.task_type }}</el-tag>
            </div>

            <el-alert
              v-if="['empty', 'invalid'].includes(discoveryResult.result_status)"
              title="当前没有找到合适候选，请换一种说法或减少约束。"
              type="warning"
              show-icon
              :closable="false"
            />

            <div v-if="discoveryWarnings.length" class="discovery-warning-list">
              <div v-for="warning in discoveryWarnings" :key="`${warning.code}-${warning.field || warning.scope}`">
                {{ warning.code }}
              </div>
            </div>
          </section>

          <section v-if="rankedOptions.length" class="discovery-options">
            <article v-for="option in rankedOptions" :key="option.option_key" class="discovery-option panel-soft-card">
              <div class="discovery-option__score">
                <strong>{{ formatScore(option.fit_score) }}</strong>
                <span>{{ option.fit_level }}</span>
              </div>
              <div class="discovery-option__body">
                <div class="discovery-option__head">
                  <h3>{{ option.display_name }}</h3>
                  <small>{{ option.region || '区域待确认' }} · {{ option.option_key }}</small>
                </div>
                <p v-if="option.fit_reasons?.length">匹配原因：{{ formatList(option.fit_reasons) }}</p>
                <p v-if="option.caution_reasons?.length" class="discovery-option__caution">
                  注意事项：{{ formatList(option.caution_reasons) }}
                </p>
              </div>
            </article>
          </section>

          <section v-if="comparison" class="panel-soft-card discovery-comparison">
            <div class="discovery-result__head">
              <div>
                <span class="section-eyebrow">Comparison</span>
                <h2 class="section-title">{{ comparison.outcome }}</h2>
              </div>
              <el-tag v-if="hasMissingTarget" type="warning">缺少目标</el-tag>
            </div>

            <div class="discovery-targets">
              <div v-for="target in comparison.targets || []" :key="`${target.requested_text}-${target.option_key}`">
                <strong>{{ target.requested_text }}</strong>
                <span>{{ target.resolution_status }}</span>
                <small>{{ target.option_key || target.resolution_reason }}</small>
              </div>
            </div>

            <div v-if="comparison.axes?.length" class="discovery-axes">
              <article v-for="axis in comparison.axes" :key="axis.axis_code">
                <strong>{{ axisTitle(axis) }}</strong>
                <span>{{ axis.outcome }}</span>
              </article>
            </div>
          </section>

          <section class="panel-note-accent discovery-action">
            <div>
              <div class="section-label">Route Planner Handoff</div>
              <p v-if="routeAction">
                后端 next_actions 已允许生成路线，将锁定：{{ formatList(routeAction.payload.option_keys) }}
              </p>
              <p v-else>
                当前结果没有可执行的 route_plan.generate 动作，因此不会猜测生成路线。
              </p>
            </div>
            <el-button type="primary" :loading="routeLoading" :disabled="!canGenerateRoute" @click="generateRoute">
              {{ routeLoading ? '正在生成路线' : '生成路线' }}
            </el-button>
          </section>
        </template>

        <el-alert
          v-if="routeError"
          :title="routeError"
          type="error"
          show-icon
          :closable="false"
          class="page-alert page-alert--block"
        />

        <section v-if="routeLoading" class="panel-soft-card discovery-loading">
          <div class="discovery-loading__pulse"></div>
          <div>
            <strong>Route Planner 正在排期</strong>
            <p>锁定景点会作为硬约束进入路线生成。</p>
          </div>
        </section>

        <section v-if="routePlan && !routeLoading" class="discovery-route">
          <div :class="['panel-soft-card', 'discovery-route__summary', { 'discovery-route__summary--failed': isRouteFailed }]">
            <div>
              <span class="section-eyebrow">Route Plan</span>
              <h2 class="section-title">{{ routePlan.planning_status }}</h2>
            </div>
            <p>锁定来源：{{ formatList(lockedOptionLabels) }}</p>
            <p v-if="routePlan.route_positioning">
              {{ routePlan.route_positioning.duration_days }} 天 · {{ routePlan.route_positioning.travel_mode }} ·
              {{ routePlan.route_positioning.pace_preference }}
            </p>
          </div>

          <div v-if="routeWarnings.length" class="discovery-route__warnings">
            <article v-for="warning in routeWarnings" :key="`${warning.code}-${warning.field}`" class="panel-note-muted">
              <strong>{{ warning.code }}</strong>
              <p>{{ warningText(warning) }}</p>
              <small v-if="warning.conflicting_keys?.length">
                冲突项：{{ formatList(warning.conflicting_keys) }}
              </small>
            </article>
          </div>

          <section v-if="isRouteFailed" class="panel-note-accent discovery-route__failed">
            <div class="section-label">Recovery</div>
            <p>已识别你的选择，但当前约束下无法生成完整路线。可以减少锁定景点、调整游玩天数、放宽节奏或回到 Discovery 重新选择。</p>
          </section>

          <section v-else class="discovery-route__days">
            <article v-for="day in routeDays" :key="day.day_index" class="panel-soft-card discovery-route-day">
              <div>
                <span class="section-eyebrow">Day {{ day.day_index }}</span>
                <h3>{{ day.region_key || '区域待定' }}</h3>
              </div>
              <div class="discovery-route-day__items">
                <div v-for="item in day.items" :key="item.item_key">
                  <strong>{{ item.title }}</strong>
                  <small>{{ item.item_key }} · {{ item.region_key }}</small>
                </div>
              </div>
            </article>
          </section>
        </section>
      </main>
    </section>
  </div>
</template>

<style scoped>
.discovery-page {
  display: grid;
  gap: 36px;
}

.discovery-hero {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(280px, 0.42fr);
  gap: 24px;
  align-items: end;
  padding: 36px;
  border-radius: 34px;
  background:
    linear-gradient(120deg, rgba(142, 48, 40, 0.12), rgba(246, 241, 232, 0.92)),
    var(--surface-panel);
  border: 1px solid var(--border-subtle);
  box-shadow: var(--shadow-card);
}

.discovery-hero__note,
.discovery-prior,
.discovery-action,
.discovery-route__failed {
  padding: 20px;
}

.discovery-hero__note p,
.discovery-prior p,
.discovery-action p,
.discovery-clarify p,
.discovery-clarify li,
.discovery-option p,
.discovery-route__summary p,
.discovery-route__warnings p,
.discovery-route__failed p {
  margin: 0;
  color: var(--color-text-secondary);
  line-height: 1.8;
}

.discovery-workspace__aside,
.discovery-workspace__main,
.discovery-composer,
.discovery-result,
.discovery-comparison,
.discovery-route,
.discovery-route__days {
  display: grid;
  gap: 18px;
}

.discovery-composer {
  padding: 22px;
}

.discovery-composer__head,
.discovery-clarify,
.discovery-empty,
.discovery-loading {
  display: grid;
  gap: 14px;
}

.discovery-composer__examples {
  display: grid;
  gap: 10px;
}

.discovery-composer__examples button {
  width: 100%;
  padding: 11px 13px;
  border: 1px solid var(--border-subtle);
  border-radius: 18px;
  background: var(--surface-muted);
  color: var(--color-text-secondary);
  text-align: left;
  cursor: pointer;
}

.discovery-composer__examples button:disabled {
  cursor: not-allowed;
  opacity: 0.58;
}

.discovery-empty,
.discovery-loading,
.discovery-result,
.discovery-comparison,
.discovery-route__summary,
.discovery-route-day {
  padding: 24px;
}

.discovery-loading {
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
}

.discovery-loading__pulse {
  width: 12px;
  height: 12px;
  border-radius: 999px;
  background: var(--color-accent);
  animation: soft-pulse 1.2s ease-in-out infinite;
}

.discovery-result__head,
.discovery-action,
.discovery-option,
.discovery-option__head,
.discovery-route__summary {
  display: flex;
  justify-content: space-between;
  gap: 18px;
  align-items: flex-start;
}

.discovery-warning-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.discovery-warning-list div {
  padding: 8px 10px;
  border-radius: 999px;
  background: rgba(142, 48, 40, 0.08);
  color: var(--color-accent);
  font-size: 12px;
}

.discovery-options {
  display: grid;
  gap: 14px;
}

.discovery-option {
  padding: 18px;
}

.discovery-option__score {
  width: 72px;
  min-width: 72px;
  display: grid;
  place-items: center;
  gap: 2px;
  padding: 12px 8px;
  border-radius: 20px;
  background: rgba(142, 48, 40, 0.08);
  color: var(--color-accent);
}

.discovery-option__score strong {
  font-size: 1.55rem;
  line-height: 1;
}

.discovery-option__score span,
.discovery-option__head small,
.discovery-route-day__items small {
  color: var(--color-text-tertiary);
  font-size: 12px;
}

.discovery-option__body,
.discovery-option__head,
.discovery-targets,
.discovery-axes,
.discovery-route__warnings,
.discovery-route-day,
.discovery-route-day__items {
  display: grid;
  gap: 12px;
}

.discovery-option h3,
.discovery-route-day h3 {
  margin: 0;
  font-family: var(--font-family-display);
}

.discovery-option__caution {
  color: var(--color-accent);
}

.discovery-targets {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.discovery-targets div,
.discovery-axes article,
.discovery-route-day__items div {
  display: grid;
  gap: 6px;
  padding: 14px;
  border-radius: 18px;
  background: rgba(93, 76, 48, 0.05);
}

.discovery-targets span,
.discovery-axes span {
  color: var(--color-accent);
  font-size: 13px;
}

.discovery-axes {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.discovery-route__summary--failed {
  border-color: rgba(142, 48, 40, 0.26);
}

.discovery-route__warnings {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.discovery-route__warnings article {
  display: grid;
  gap: 8px;
  padding: 18px;
}

@media (max-width: 1023px) {
  .discovery-hero,
  .discovery-targets,
  .discovery-axes,
  .discovery-route__warnings {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 743px) {
  .discovery-page {
    gap: 28px;
  }

  .discovery-hero,
  .discovery-empty,
  .discovery-loading,
  .discovery-result,
  .discovery-comparison,
  .discovery-route__summary,
  .discovery-route-day,
  .discovery-composer {
    padding: 20px;
  }

  .discovery-result__head,
  .discovery-action,
  .discovery-option,
  .discovery-route__summary {
    flex-direction: column;
  }

  .discovery-option__score {
    width: 100%;
    min-width: 0;
    grid-template-columns: auto auto;
    justify-content: start;
  }
}
</style>
