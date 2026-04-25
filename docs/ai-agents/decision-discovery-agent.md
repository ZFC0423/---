# Decision & Discovery Agent 当前状态

## 已完成

- direct endpoint: `POST /api/front/ai/discovery`
- natural language endpoint: `POST /api/front/ai/discovery/query`
- Intent Router 已支持：
  - `discover_options`
  - `compare_options`
  - `narrow_options`
  - `suggest_alternatives`
- Router-to-Discovery Adapter 已完成
- machine-first retrieve / score / compare
- axis-first comparison
- `explicitTargetOptionKeys`
- `fit_score` clamp
- error boundary hardening

## 当前边界

- 不做 narrative
- 不做前端 UI
- 不做日志后台
- 不做地图 / 距离 / 实时交通
- `articles` 暂不做 evidence

## Deferred

- Discovery -> Route Planner handoff
- Frontend Discovery UI
- Narrative 说明层
- Decision logs / admin 可视化
- Article supporting evidence
