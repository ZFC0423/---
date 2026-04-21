# Front API Contract

## 1. Purpose

This document freezes the frontend-facing contract for the immersive Ganzhou experience site.

The goal is to clearly separate three kinds of fields:

- DB-backed fields: edited in admin and stored in MySQL
- Service-derived fields: assembled in the backend service layer for presentation
- AI protocol fields: generated at response time and not stored as content fields

All frontend interfaces still follow the unified response wrapper:

```json
{
  "code": 200,
  "message": "success",
  "data": {}
}
```

## 2. GET /api/front/home

### 2.1 Main purpose

Provide the homepage hero, chapter entrances, featured scenic items, curated articles, and AI entrance copy in one payload.

### 2.2 DB-backed fields

- `siteName`
- `siteDescription`
- `hero.image`
- `hero.note`
- `chapterEntries[].chapterLabel`
- `chapterEntries[].heroImage`
- `chapterEntries[].heroCaption`
- `chapterEntries[].routeLabel`
- `chapterEntries[].moodTone`
- `featuredScenic[]` items read scenic narrative fields from `scenic_spots`
- `curatedArticles[]` items read article quote from `articles`
- `featuredScenic[]` / `curatedArticles[]` selection order comes from `home_recommends`
- `featuredScenic[]` / `curatedArticles[]` may include:
  - `visualRole`
  - `summaryOverride`

### 2.3 Service-derived fields

- `hero.title`
- `hero.subtitle`
- `hero.primaryAction`
- `hero.secondaryAction`
- `chapterEntries[].chapterNo`
- `chapterEntries[].chapterEn`
- `chapterEntries[].path`
- `chapterEntries[].leadItem`
- `chapterEntries[].count`
- `aiEntry`
- `epilogue`
- `visualSystem`

### 2.4 Example shape

```json
{
  "siteName": "赣州长卷",
  "siteDescription": "A curated digital culture experience for Ganzhou",
  "hero": {
    "title": "赣州长卷",
    "subtitle": "A curated digital culture experience for Ganzhou",
    "image": "/immersive/hero/example.jpg",
    "note": "Enter the city before entering the menu",
    "primaryAction": {
      "label": "进入景点图谱",
      "path": "/scenic"
    },
    "secondaryAction": {
      "label": "向 AI 导览员提问",
      "path": "/ai-chat"
    }
  },
  "chapterEntries": [],
  "featuredScenic": [],
  "curatedArticles": [],
  "aiEntry": {},
  "epilogue": {},
  "visualSystem": {}
}
```

## 3. GET /api/front/scenic/list

### 3.1 Main purpose

Return scenic items for atlas-style browsing.

### 3.2 DB-backed fields

- `heroCaption`
- `routeLabel`
- `moodTone`
- `quote`
- `bestVisitSeason`
- `visitMode`
- `pairingSuggestion`
- `bestLightTime`
- `walkingIntensity`
- `photoPoint`
- `familyFriendly`

### 3.3 Service-derived fields

- `subtitle`
- `dek`
- `curatorNote`
- `coverImageMobile`
- `focalPointX`
- `focalPointY`
- `media`
- `path`

### 3.4 Example item

```json
{
  "id": 1,
  "name": "通天岩",
  "region": "章贡区",
  "heroCaption": "Stone caves, terrain and history overlap here.",
  "routeLabel": "Stone caves and the old city edge",
  "moodTone": "earth",
  "quote": "A place where the mountain speaks first.",
  "bestVisitSeason": "Spring and autumn",
  "visitMode": "Walking",
  "pairingSuggestion": "Pair with old city route",
  "bestLightTime": "Morning to dusk",
  "walkingIntensity": "Medium",
  "photoPoint": "Rock face turning point",
  "familyFriendly": true
}
```

## 4. GET /api/front/scenic/detail/:id

### 4.1 Main purpose

Return a single scenic dossier view.

### 4.2 Extra fields on detail

- `quickFacts`
- `relatedList`

### 4.3 Contract note

The narrative fields stay the same as the list item contract. Detail only adds richer presentation structures.

## 5. GET /api/front/article/list

### 5.1 Main purpose

Return article cards for chapter pages.

### 5.2 DB-backed fields

- `quote`

### 5.3 Service-derived fields

- `subtitle`
- `dek`
- `heroCaption`
- `curatorNote`
- `routeLabel`
- `moodTone`
- `coverImageMobile`
- `focalPointX`
- `focalPointY`
- `media`
- `path`

## 6. GET /api/front/article/detail/:id

### 6.1 Main purpose

Return a single article detail for the exhibition-style reading page.

### 6.2 Extra fields on detail

- `relatedList`
- `readingRoom`

### 6.3 Contract note

`readingRoom` is a service-layer presentation block and should not be stored directly in the database.

## 7. POST /api/front/ai/chat

### 7.1 Main purpose

Return a structured guide-style answer instead of only one text paragraph.

### 7.2 Protocol-only fields

- `leadTitle`
- `answerBlocks[]`
- `citations[]`
- `relatedCards[]`
- `followupPrompts[]`
- `heroSpotlight`

### 7.3 Compatibility fields

These can still be returned for internal use or fallback, but the frontend should primarily consume the new structured protocol:

- `answer`
- `directAnswer`
- `culturalContext`
- `relatedTopics`
- `relatedSpots`
- `nextSteps`
- `matchedContext`

## 8. POST /api/front/ai/trip-plan

### 8.1 Main purpose

Return a route-workshop style itinerary payload.

### 8.2 Protocol-only fields

- `routeTitle`
- `routeMood`
- `introNote`
- `days[]`
- `packingTips[]`
- `routeWarnings[]`
- `citations[]`
- `interestLabel`

### 8.3 Compatibility fields

- `summary`
- `pathPositioning`
- `suitableFor`
- `routeHighlights`
- `adjustmentSuggestions`
- `travelTips`
- `matchedContext`

## 9. POST /api/front/ai/intent

### 9.1 Main purpose

Return a structured routing decision before entering any downstream AI execution chain.

### 9.2 Request shape

```json
{
  "input": "周末两天，公共交通，想看老城和美食，轻松一点",
  "priorState": null
}
```

`priorState` is optional and only accepts the compact prior intent state used for merge. It must not contain execution fields such as `clarification_questions`, `next_agent`, or `_meta`.

### 9.2.1 Minimal request example

```http
POST /api/front/ai/intent
Content-Type: application/json
```

```json
{
  "input": "周末两天，公共交通，想看老城和美食，轻松一点"
}
```

### 9.3 Response shape

```json
{
  "task_type": "plan_route",
  "task_confidence": 0.84,
  "constraints": {
    "user_query": "周末两天，公共交通，想看老城和美食，轻松一点",
    "time_budget": {
      "days": 2,
      "date_text": "周末"
    },
    "money_budget": null,
    "travel_mode": "public_transport",
    "companions": null,
    "pace_preference": "relaxed",
    "theme_preferences": [
      "food"
    ],
    "hard_avoidances": null,
    "physical_constraints": null,
    "status_flags": null,
    "route_origin": null,
    "destination_scope": null
  },
  "clarification_needed": false,
  "clarification_reason": null,
  "missing_required_fields": [],
  "clarification_questions": [],
  "next_agent": "ai_trip"
}
```

### 9.3.1 Normal response example

The formal frontend contract does not expose `_meta` by default:

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "task_type": "plan_route",
    "task_confidence": 0.84,
    "constraints": {
      "user_query": "周末两天，公共交通，想看老城和美食，轻松一点",
      "time_budget": {
        "days": 2,
        "date_text": "周末"
      },
      "money_budget": null,
      "travel_mode": "public_transport",
      "companions": null,
      "pace_preference": "relaxed",
      "theme_preferences": [
        "food"
      ],
      "hard_avoidances": null,
      "physical_constraints": null,
      "status_flags": null,
      "route_origin": null,
      "destination_scope": null
    },
    "clarification_needed": false,
    "clarification_reason": null,
    "missing_required_fields": [],
    "clarification_questions": [],
    "next_agent": "ai_trip"
  }
}
```

### 9.3.2 Debug response example

`_meta` is debug-only. It may be exposed only in non-production requests when the debug gate is explicitly enabled, for example:

```http
POST /api/front/ai/intent
Content-Type: application/json
x-debug-intent: 1
```

```json
{
  "input": "周末两天，公共交通，想看老城和美食，轻松一点"
}
```

Example response in non-production:

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "task_type": "plan_route",
    "task_confidence": 0.84,
    "constraints": {
      "user_query": "周末两天，公共交通，想看老城和美食，轻松一点",
      "time_budget": {
        "days": 2,
        "date_text": "周末"
      },
      "money_budget": null,
      "travel_mode": "public_transport",
      "companions": null,
      "pace_preference": "relaxed",
      "theme_preferences": [
        "food"
      ],
      "hard_avoidances": null,
      "physical_constraints": null,
      "status_flags": null,
      "route_origin": null,
      "destination_scope": null
    },
    "clarification_needed": false,
    "clarification_reason": null,
    "missing_required_fields": [],
    "clarification_questions": [],
    "next_agent": "ai_trip",
    "_meta": {
      "decision_source": "llm",
      "prior_state_usage": "none",
      "fallback_reason": null,
      "missing_required_fields": [],
      "rule_hits": [
        "llm_result_received"
      ],
      "conflict_codes": [],
      "fallback_resolution": null,
      "model_name": "gpt-4.1-mini",
      "token_usage": 312
    }
  }
}
```

### 9.3.3 safe_clarify response example

When the router can identify the main intent but required route slots are still missing, it keeps the business intent and sends the request to `safe_clarify`:

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "task_type": "plan_route",
    "task_confidence": 0.79,
    "constraints": {
      "user_query": "帮我安排一条赣州路线，公共交通，节奏适中",
      "time_budget": null,
      "money_budget": null,
      "travel_mode": "public_transport",
      "companions": null,
      "pace_preference": "normal",
      "theme_preferences": null,
      "hard_avoidances": null,
      "physical_constraints": null,
      "status_flags": null,
      "route_origin": null,
      "destination_scope": null
    },
    "clarification_needed": true,
    "clarification_reason": "missing_slots",
    "missing_required_fields": [
      "time_budget"
    ],
    "clarification_questions": [
      "你计划在赣州玩几天？"
    ],
    "next_agent": "safe_clarify"
  }
}
```

### 9.4 Runtime enums

- `task_type`: `guide_understand` | `plan_route` | `null`
- `next_agent`: `ai_chat` | `ai_trip` | `safe_clarify`
- `clarification_reason`: `missing_slots` | `intent_ambiguous` | `constraint_conflict` | `null`

### 9.5 Missing value encoding

- Unknown scalar: `null`
- Unknown list: `null`
- Explicitly no preference / no constraint list: `[]`
- Unknown object: `null`
- Known object with partial unknown fields: nested fields stay `null`
- Normalized responses do not omit protocol fields

### 9.6 Debug-only meta

The service always generates internal `_meta` data for replay and debugging, but the controller does not expose it by default.

`_meta` is only returned in non-production requests when an explicit debug gate is enabled, and frontend business logic must not depend on it.

## 10. POST /api/front/ai/knowledge

### 10.1 Main purpose

Accept a validated `guide_understand` router result and return a guide-style answer with a structured evidence layer.

This endpoint is not a free chat interface. It only accepts the downstream compatibility slot currently emitted by the router for guide tasks: `next_agent = ai_chat`.

### 10.2 Request shape

```json
{
  "routerResult": {
    "task_type": "guide_understand",
    "task_confidence": 0.91,
    "constraints": {
      "user_query": "请讲讲郁孤台为什么值得看",
      "subject_entities": ["郁孤台"],
      "theme_preferences": null,
      "region_hints": null,
      "scenic_hints": null,
      "hard_avoidances": null,
      "companions": null
    },
    "clarification_needed": false,
    "clarification_reason": null,
    "missing_required_fields": [],
    "clarification_questions": [],
    "next_agent": "ai_chat"
  }
}
```

### 10.2.1 Contract rules

- `routerResult.task_type` must be `guide_understand`
- `routerResult.clarification_needed` must be `false`
- `routerResult.next_agent` must be `ai_chat`
- `routerResult.constraints.user_query` is required
- This endpoint does not accept raw free-chat text as its main input

### 10.3 Response shape

```json
{
  "task_type": "guide_understand",
  "retrieval_status": "hit",
  "evidence_status": "sufficient",
  "answer": {
    "lead_title": "站内资料讲解结果",
    "answer_blocks": [
      {
        "type": "direct_answer",
        "title": "核心讲解",
        "content": "郁孤台相关资料主要指向赣州古城的历史空间与观看方式。"
      },
      {
        "type": "context",
        "title": "证据来源",
        "content": "郁孤台（intro）；赣州古城与遗产阅读（summary）"
      }
    ],
    "uncertainty_note": null
  },
  "evidence": {
    "citations": [
      {
        "source_type": "scenic",
        "source_id": 3,
        "source_title": "郁孤台",
        "source_field": "intro",
        "excerpt": "郁孤台是赣州老城的重要地标，与宋城记忆密切相关。",
        "support_level": "primary",
        "matched_by": ["subject_entities"],
        "path": "/scenic/3",
        "source_label": null,
        "author_label": null
      }
    ],
    "gap_note": null
  }
}
```

### 10.3.1 Wrapper example

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "task_type": "guide_understand",
    "retrieval_status": "hit",
    "evidence_status": "sufficient",
    "answer": {
      "lead_title": "站内资料讲解结果",
      "answer_blocks": [
        {
          "type": "direct_answer",
          "title": "核心讲解",
          "content": "郁孤台相关资料主要指向赣州古城的历史空间与观看方式。"
        }
      ],
      "uncertainty_note": null
    },
    "evidence": {
      "citations": [
        {
          "source_type": "scenic",
          "source_id": 3,
          "source_title": "郁孤台",
          "source_field": "intro",
          "excerpt": "郁孤台是赣州老城的重要地标，与宋城记忆密切相关。",
          "support_level": "primary",
          "matched_by": ["subject_entities"],
          "path": "/scenic/3",
          "source_label": null,
          "author_label": null
        }
      ],
      "gap_note": null
    }
  }
}
```

### 10.3.2 Empty / uncertainty example

When retrieval is empty, the endpoint does not fabricate citations:

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "task_type": "guide_understand",
    "retrieval_status": "empty",
    "evidence_status": "not_applicable",
    "answer": {
      "lead_title": "当前资料暂未命中",
      "answer_blocks": [
        {
          "type": "uncertainty",
          "title": "资料状态",
          "content": "基于当前站内资料，暂未检索到能直接支撑该问题的内容。"
        }
      ],
      "uncertainty_note": "当前是零命中场景，建议补充更具体的景点、主题或区域线索。"
    },
    "evidence": {
      "citations": [],
      "gap_note": "当前站内资料中没有检索到可直接支撑这个问题的内容。"
    }
  }
}
```

### 10.4 Evidence rules

- `retrieval_status`:
  - `hit`: direct or strong structured hits exist
  - `partial`: some records were found, but the retrieval strength is weak
  - `empty`: zero retrieval hits
- `evidence_status`:
  - `sufficient`: at least 2 citations and at least 1 primary citation
  - `insufficient`: retrieval exists but evidence cannot support a stronger conclusion
  - `not_applicable`: only used when `retrieval_status = empty`
- Primary evidence fields:
  - scenic: `intro`, `culture_desc`
  - article: `summary`, `content`
- Secondary evidence fields:
  - scenic: `hero_caption`, `quote`
  - article: `quote`
- Explicitly excluded from the v1 primary evidence chain:
  - `tips`
  - `traffic_guide`
  - `open_time`
  - `ticket_info`
  - `suggested_duration`

### 10.5 Mock provider

`AI_GUIDE_PROVIDER=mock` returns a hardcoded structured payload for data-flow verification.

`AI_GUIDE_PROVIDER=llm` enables real answer generation, but `citations`, `retrieval_status`, `evidence_status`, and `gap_note` remain code-owned fields.

## 11. Why this contract is frozen this way

- We only store fields that need long-term editorial control.
- We keep layout assembly logic in the service layer, because that is easier to adjust without repeated schema churn.
- We keep AI output as response protocol, because AI answers are generated content, not reusable editorial assets.
- This keeps the graduation project easier to explain:
  - database stores stable content
  - service layer assembles presentation
  - AI layer returns structured temporary output
