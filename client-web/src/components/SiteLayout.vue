<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { getThemeMeta, siteManifesto } from '../content/site-manifest';

const route = useRoute();
const menuOpen = ref(false);
const isScrolled = ref(false);

const navigationEntries = [
  { label: '首页', path: '/', desc: '片头海报与世界观入口' },
  { label: '城脉与老城生活', path: '/food', desc: '从味觉、街巷与夜色进入赣州' },
  { label: '客乡与手艺', path: '/heritage', desc: '从器物、聚落与传承进入地方文化' },
  { label: '红土与记忆', path: '/red-culture', desc: '让地点先开口，再进入历史重量' },
  { label: '景点图谱', path: '/scenic', desc: '先记住地方，再记住信息' },
  { label: 'AI 导览室', path: '/ai-chat', desc: '让导览员继续把线索讲清楚' }
];

const secondaryEntries = [
  { label: '发现决策室', path: '/ai-discovery', desc: '先比较候选，再把选择交给路线生成' },
  { label: '路线工作室', path: '/ai-trip', desc: '把兴趣、天数与节奏编排成路线长卷' },
  { label: '策展附记', path: '/about', desc: '解释这部长卷为什么这样编排' }
];

const footerChapters = [
  { ...getThemeMeta('food'), path: '/food' },
  { ...getThemeMeta('heritage'), path: '/heritage' },
  { ...getThemeMeta('red_culture'), path: '/red-culture' }
];

const isHome = computed(() => route.path === '/');
const shellLabel = computed(() => route.meta?.shellLabel || 'Ganzhou Scroll');
const chapterTitle = computed(() => route.meta?.chapterTitle || siteManifesto.title);
const shellTone = computed(() => route.meta?.shellTone || 'paper');

function updateScrollState() {
  isScrolled.value = window.scrollY > 18;
}

function isActive(path) {
  if (path === '/') {
    return route.path === '/';
  }

  return route.path.startsWith(path);
}

function toggleMenu() {
  menuOpen.value = !menuOpen.value;
}

watch(
  () => route.fullPath,
  () => {
    menuOpen.value = false;
  }
);

watch(menuOpen, (value) => {
  document.body.style.overflow = value ? 'hidden' : '';
});

onMounted(() => {
  updateScrollState();
  window.addEventListener('scroll', updateScrollState, { passive: true });
});

onBeforeUnmount(() => {
  document.body.style.overflow = '';
  window.removeEventListener('scroll', updateScrollState);
});
</script>

<template>
  <div :class="['site-shell', `site-shell--${shellTone}`]">
    <header
      :class="[
        'site-header',
        {
          'site-header--home': isHome,
          'site-header--scrolled': isScrolled || !isHome,
          'site-header--menu-open': menuOpen
        }
      ]"
    >
      <div class="site-header__frame">
        <div class="site-header__context">
          <span class="site-header__marker">{{ shellLabel }}</span>
          <router-link class="site-brand" to="/">
            <span class="site-brand__kicker">Ganzhou Scroll</span>
            <span class="site-brand__title">{{ siteManifesto.title }}</span>
          </router-link>
        </div>

        <nav class="site-nav site-nav--desktop" aria-label="主导航">
          <router-link
            v-for="item in navigationEntries"
            :key="item.path"
            :to="item.path"
            :class="['site-nav__link', { 'site-nav__link--active': isActive(item.path) }]"
          >
            {{ item.label }}
          </router-link>
        </nav>

        <div class="site-header__actions">
          <router-link class="site-header__action" to="/ai-trip">路线工作室</router-link>
          <button
            type="button"
            class="site-header__menu-button"
            :aria-expanded="menuOpen ? 'true' : 'false'"
            :aria-label="menuOpen ? '关闭章节导航' : '打开章节导航'"
            @click="toggleMenu"
          >
            <span></span>
            <span></span>
            <span></span>
          </button>
        </div>
      </div>

      <transition name="shell-sheet">
        <div v-if="menuOpen" class="site-sheet">
          <div class="site-sheet__inner">
            <div class="site-sheet__intro">
              <div class="chapter-mark chapter-mark--dark">Curated Navigation</div>
              <h2>{{ chapterTitle }}</h2>
              <p>
                这不是在换页面，而是在进入同一部赣州导览长卷里的另一个空间。
                入口、阅读、地方记忆与 AI 续讲必须属于同一个世界。
              </p>
            </div>

            <div class="site-sheet__grid">
              <router-link
                v-for="item in navigationEntries"
                :key="item.path"
                :to="item.path"
                :class="['site-sheet__link', { 'site-sheet__link--active': isActive(item.path) }]"
              >
                <span>{{ item.label }}</span>
                <small>{{ item.desc }}</small>
              </router-link>

              <router-link
                v-for="item in secondaryEntries"
                :key="item.path"
                :to="item.path"
                :class="[
                  'site-sheet__link',
                  'site-sheet__link--secondary',
                  { 'site-sheet__link--active': isActive(item.path) }
                ]"
              >
                <span>{{ item.label }}</span>
                <small>{{ item.desc }}</small>
              </router-link>
            </div>
          </div>
        </div>
      </transition>
    </header>

    <main class="site-main">
      <slot />
    </main>

    <footer class="site-epilogue">
      <div class="site-epilogue__inner">
        <div class="site-epilogue__statement">
          <div class="chapter-mark chapter-mark--dark">Epilogue</div>
          <h2>一座城最好的打开方式，不是更快浏览，而是更慢进入。</h2>
          <p>{{ siteManifesto.subtitle }}</p>
        </div>

        <div class="site-epilogue__chapters">
          <router-link
            v-for="item in footerChapters"
            :key="item.path"
            :to="item.path"
            class="site-epilogue__chapter"
          >
            <span>{{ item.chapterNo }}</span>
            <strong>{{ item.chapterLabel }}</strong>
            <small>{{ item.heroCaption }}</small>
          </router-link>
        </div>
      </div>

      <div class="site-epilogue__bottom">
        <div class="site-epilogue__brand">
          <strong>{{ siteManifesto.title }}</strong>
          <span>地方记忆、章节阅读与 AI 导览共同构成的数字文化体验。</span>
        </div>

        <div class="site-epilogue__links">
          <router-link to="/scenic">景点图谱</router-link>
          <router-link to="/ai-chat">AI 导览室</router-link>
          <router-link to="/ai-trip">路线工作室</router-link>
          <router-link to="/about">策展附记</router-link>
        </div>
      </div>
    </footer>
  </div>
</template>

<style scoped>
.site-shell {
  min-height: 100vh;
  background: var(--surface-page);
  color: var(--color-text-primary);
}

.site-shell--ink {
  background:
    radial-gradient(circle at top, rgba(142, 48, 40, 0.12), transparent 22%),
    linear-gradient(180deg, #0c1114 0%, #12191d 18%, #f6f1e8 18.1%, #f6f1e8 100%);
}

.site-header {
  position: sticky;
  top: 0;
  z-index: var(--z-header);
  padding: 12px var(--page-gutter-current) 0;
}

.site-header__frame {
  width: min(100%, calc(var(--container-page) + 128px));
  margin: 0 auto;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 24px;
  padding: 18px 0 16px;
  border-bottom: 1px solid rgba(93, 76, 48, 0.14);
  transition:
    border-color var(--transition-base),
    background-color var(--transition-base),
    color var(--transition-base),
    box-shadow var(--transition-base);
}

.site-header--home:not(.site-header--scrolled) .site-header__frame {
  color: #f5efe2;
  border-bottom-color: rgba(245, 239, 226, 0.18);
}

.site-header--scrolled .site-header__frame,
.site-header:not(.site-header--home) .site-header__frame,
.site-header--menu-open .site-header__frame {
  color: var(--color-text-primary);
  background: linear-gradient(180deg, rgba(246, 241, 232, 0.96), rgba(246, 241, 232, 0.84));
  backdrop-filter: blur(14px);
  border-bottom-color: rgba(93, 76, 48, 0.2);
  box-shadow: var(--shadow-header);
}

.site-header__context {
  display: grid;
  gap: 8px;
}

.site-header__marker {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  font-size: 11px;
  letter-spacing: 0.28em;
  text-transform: uppercase;
  opacity: 0.72;
}

.site-header__marker::before {
  content: '';
  width: 22px;
  height: 1px;
  background: currentColor;
  opacity: 0.56;
}

.site-brand {
  display: inline-grid;
  gap: 4px;
  align-content: start;
}

.site-brand__kicker {
  font-size: 11px;
  letter-spacing: 0.26em;
  text-transform: uppercase;
  opacity: 0.72;
}

.site-brand__title {
  font-family: var(--font-family-display);
  font-size: clamp(1.5rem, 2.1vw, 2rem);
  line-height: 1;
  letter-spacing: var(--tracking-tight-2);
}

.site-nav {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 18px;
  flex-wrap: wrap;
}

.site-nav__link,
.site-header__action,
.site-sheet__link,
.site-epilogue__links a {
  color: inherit;
  transition:
    color var(--transition-base),
    opacity var(--transition-base),
    transform var(--transition-base),
    border-color var(--transition-base);
}

.site-nav__link {
  position: relative;
  padding: 4px 0;
  font-size: 14px;
  opacity: 0.68;
}

.site-nav__link::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: -8px;
  height: 1px;
  background: currentColor;
  transform: scaleX(0);
  transform-origin: left center;
  transition: transform var(--transition-base);
  opacity: 0.64;
}

.site-nav__link:hover,
.site-nav__link--active {
  opacity: 1;
}

.site-nav__link:hover::after,
.site-nav__link--active::after {
  transform: scaleX(1);
}

.site-header__actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.site-header__action {
  min-height: 42px;
  padding: 0 16px;
  display: inline-flex;
  align-items: center;
  border-radius: var(--radius-round);
  border: 1px solid currentColor;
  border-color: rgba(245, 239, 226, 0.22);
  font-size: 14px;
  opacity: 0.88;
}

.site-header--scrolled .site-header__action,
.site-header:not(.site-header--home) .site-header__action,
.site-header--menu-open .site-header__action {
  border-color: rgba(93, 76, 48, 0.22);
}

.site-header__action:hover {
  transform: translateY(-1px);
}

.site-header__menu-button {
  width: 44px;
  height: 44px;
  display: inline-grid;
  place-items: center;
  gap: 4px;
  border: 1px solid rgba(245, 239, 226, 0.22);
  border-radius: 50%;
  color: inherit;
}

.site-header--scrolled .site-header__menu-button,
.site-header:not(.site-header--home) .site-header__menu-button,
.site-header--menu-open .site-header__menu-button {
  border-color: rgba(93, 76, 48, 0.22);
}

.site-header__menu-button span {
  width: 16px;
  height: 1.5px;
  background: currentColor;
  border-radius: 999px;
}

.site-sheet {
  width: min(100%, calc(var(--container-page) + 128px));
  margin: 18px auto 0;
  padding-top: 20px;
}

.site-sheet__inner {
  display: grid;
  gap: 28px;
  padding: 26px 28px 30px;
  border-radius: 32px;
  background: linear-gradient(180deg, rgba(246, 241, 232, 0.98), rgba(236, 228, 214, 0.96));
  border: 1px solid rgba(93, 76, 48, 0.16);
  box-shadow: var(--shadow-floating);
}

.site-sheet__intro {
  display: grid;
  gap: 12px;
  max-width: 760px;
}

.site-sheet__intro h2 {
  margin: 0;
  font-family: var(--font-family-display);
  font-size: clamp(2rem, 4vw, 3rem);
  line-height: 1.05;
}

.site-sheet__intro p {
  margin: 0;
  color: var(--color-text-secondary);
  line-height: 1.8;
}

.site-sheet__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.site-sheet__link {
  display: grid;
  gap: 8px;
  padding: 18px 18px 20px;
  border-radius: 22px;
  background: rgba(255, 250, 243, 0.72);
  border: 1px solid rgba(93, 76, 48, 0.1);
}

.site-sheet__link span {
  font-family: var(--font-family-display);
  font-size: 1.35rem;
  line-height: 1.08;
}

.site-sheet__link small {
  color: var(--color-text-secondary);
  line-height: 1.65;
}

.site-sheet__link--active,
.site-sheet__link:hover {
  transform: translateY(-2px);
  border-color: rgba(142, 48, 40, 0.24);
  color: var(--color-accent);
}

.site-main {
  min-height: calc(100vh - 260px);
}

.site-epilogue {
  width: min(100%, calc(var(--container-page) + (var(--page-gutter-current) * 2)));
  margin: 0 auto;
  padding: 56px var(--page-gutter-current) 36px;
  display: grid;
  gap: 22px;
}

.site-epilogue__inner {
  display: grid;
  grid-template-columns: minmax(0, 0.94fr) minmax(320px, 1fr);
  gap: 28px;
  padding: 30px;
  border-top: 1px solid rgba(93, 76, 48, 0.18);
}

.site-epilogue__statement,
.site-epilogue__chapters {
  display: grid;
  gap: 16px;
}

.site-epilogue__statement h2 {
  margin: 0;
  font-family: var(--font-family-display);
  font-size: clamp(2rem, 3.4vw, 3.1rem);
  line-height: 1.06;
}

.site-epilogue__statement p {
  margin: 0;
  max-width: 42rem;
  color: var(--color-text-secondary);
  line-height: 1.85;
}

.site-epilogue__chapters {
  grid-template-columns: 1fr;
}

.site-epilogue__chapter {
  display: grid;
  gap: 6px;
  padding: 16px 0;
  border-bottom: 1px solid rgba(93, 76, 48, 0.12);
}

.site-epilogue__chapter span {
  font-size: 11px;
  letter-spacing: 0.26em;
  text-transform: uppercase;
  color: var(--color-accent);
}

.site-epilogue__chapter strong {
  font-family: var(--font-family-display);
  font-size: 1.5rem;
  line-height: 1.08;
}

.site-epilogue__chapter small {
  color: var(--color-text-secondary);
  line-height: 1.75;
}

.site-epilogue__bottom {
  display: flex;
  justify-content: space-between;
  gap: 22px;
  align-items: center;
  padding: 0 30px;
}

.site-epilogue__brand {
  display: grid;
  gap: 6px;
}

.site-epilogue__brand strong {
  font-family: var(--font-family-display);
  font-size: 1.4rem;
}

.site-epilogue__brand span {
  color: var(--color-text-secondary);
  line-height: 1.7;
}

.site-epilogue__links {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 14px 20px;
}

.site-epilogue__links a {
  color: var(--color-text-secondary);
}

.site-epilogue__links a:hover {
  color: var(--color-accent);
}

.shell-sheet-enter-active,
.shell-sheet-leave-active {
  transition:
    opacity 0.28s ease,
    transform 0.28s ease;
}

.shell-sheet-enter-from,
.shell-sheet-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

@media (max-width: 1180px) {
  .site-header__frame,
  .site-epilogue__inner {
    grid-template-columns: 1fr;
  }

  .site-nav {
    justify-content: flex-start;
  }
}

@media (max-width: 1023px) {
  .site-nav--desktop,
  .site-header__action {
    display: none;
  }

  .site-sheet__grid,
  .site-epilogue__inner {
    grid-template-columns: 1fr;
  }

  .site-epilogue__bottom {
    flex-direction: column;
    align-items: flex-start;
    padding: 0;
  }
}

@media (max-width: 743px) {
  .site-header {
    padding-top: 10px;
  }

  .site-header__frame {
    gap: 14px;
    padding: 16px 0 14px;
  }

  .site-brand__title {
    font-size: 1.55rem;
  }

  .site-sheet__inner,
  .site-epilogue__inner {
    padding: 22px;
  }

  .site-epilogue__bottom {
    gap: 14px;
  }
}
</style>
