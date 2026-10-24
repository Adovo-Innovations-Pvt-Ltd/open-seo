---
title: "AI Visibility"
description: "Research prompts, compare AI answers, and track brand mentions and citations."
---

AI Visibility helps you choose questions to track and see whether AI answers mention your brand, cite your website, or include competitors.

## Set up your project

Add your website, then complete the setup shown on the AI visibility pages. Research fills missing project context and generates keywords; existing context and competitors are preserved. Generating keywords does not automatically run paid prompt research for each one.

## Research, explore, and track

- **Prompt Research:** analyze a keyword to find the questions people ask about it, with ChatGPT's answers and cited sources. Research currently covers US English. The questions come from DataForSEO's dataset, built mostly from Google "People also ask" questions; they are not logged ChatGPT prompts, and OpenSEO does not estimate how often they are asked in AI.
- **Prompt Explorer:** try one prompt in ChatGPT, or add Claude, Gemini, and Perplexity to compare answers and available citations. These are API model answers and can differ from consumer-site answers collected by tracking.
- **Prompt Tracking:** save exact questions under topics, select engines and a market, then run a check or enable daily, weekly, or monthly tracking. Editing a question's wording starts a new question, so earlier answers keep the wording they were collected for. ChatGPT and Gemini are selected by default; Google AI Overviews, Claude, and Perplexity are also supported. Enabling tracking starts an initial check.
- **Competitors and Citations:** open these tabs in Prompt Tracking to review saved brand mentions, competitor appearances, and cited pages. Competitors come from shared Project context. Your brand counts as mentioned when its name or domain appears in an answer, and as cited when the answer links to your site. A failed check is not evidence that your brand was absent.

The trend chart includes manual and scheduled checks, using the latest finished run per day. Review and export saved results without using credits.

## AI Intelligence

Open **Analytics dashboard** in the **AI Intelligence** sidebar module to compare stored brand mentions, source visibility and competitor gaps, or search the full saved answer text. Choose one market or all markets, an engine, a topic and a prompt cohort. Reading these dashboards uses no collection credits and does not change tracking settings.

The default view uses the latest finished scheduled or baseline check per market in the reporting window. Manual checks are available through the saved-check selector for one market. Failed and no-answer observations appear in coverage but are excluded from visibility rates. Configured prompts outside a saved check are shown separately.

Tracked-brand share of voice is a brand's answer-level mentions divided by all tracked-brand mentions in that selection. Source visibility is the share of answered observations citing a URL or domain; repeated citations in one answer count once. These describe your tracked sample, not the whole market. Historical brand matches are preserved.

Open **View answers** to inspect the exact supporting observations. Response search and evidence filters narrow that list without changing the dashboard's metric denominators. Market comparison uses only shared exact prompt wording and engine pairs; incomplete coverage or different historical matching sets prevents a comparability claim.

Assistants can read the same dashboards with `get_ai_saved_answer_analytics`, then inspect an observation with `get_ai_visibility_answer`.

## Credits and cost

Prompt research costs about $0.25 in credits per keyword. Explorer charges actual usage for uncached answers. Tracking shows a cost estimate before a check or schedule is started and bills each check as it collects answers. Run now collects live answers, which usually arrive within a minute and cost more per answer than scheduled checks. Checks stop when your credits run out.

Tracking collects ChatGPT and Gemini answers from their consumer sites. Claude and Perplexity have no consumer-site collection, so every check, scheduled or Run now, asks their model API at live API pricing, which costs more per answer.

On hosted OpenSEO, Prompt Research and Prompt Explorer require the paid plan; prompt tracking only needs credits. Setup research uses available credits and is billed after completion.

Self-hosted users pay providers directly: set `DATAFORSEO_API_KEY` for research and answer collection, and `OPENROUTER_API_KEY` for setup research, Prompt Research, and generated prompt suggestions. See the [self-hosting guides](/docs/self-hosting).

## Use your assistant

Connect [OpenSEO MCP](/docs/mcp) to research prompts, configure tracking and read saved results from your assistant. For a one-off answer, ask the assistant to use `explore_prompt`; it defaults to ChatGPT.

Use [AI Prompt Research](/docs/skills/ai-prompt-research) to find questions before tracking, or [AI Visibility Audit](/docs/skills/ai-visibility-audit) to investigate improvements using answers and cited pages.

Open **AI Intelligence → Analytics dashboard** in the sidebar for analytics across
all project markets. **All citation sources** is the default: it includes your
site, tracked competitors and other websites. **Citations to your site** counts
links to your own domain only; it can be zero while other sources are cited.
Use **Reset analytics filters** to restore the default selection. Historical
charts use saved checks and show a notice when only one collection date exists.
The existing Prompt Tracking screens and schedules remain available separately.

### Detailed tracking reports

In **AI Intelligence**, use **More tracking reports** for AI rankings, Rankings
gap, Rankings and citations, Source analysis and URL impact, Reddit and YouTube
citation overviews, Competitor performance, and Preceding-period comparison.
The model and topic views also include a topic-by-model matrix.

Ranking tables link to exact saved answers. Mention order is among your tracked
brands; citation position is the order of retained source links. Source impact
compares observed brand mentions with and without a citation source, which is
an association rather than proof that the source caused a mention. Reddit and
YouTube reports show cited URLs and saved titles, without engagement metrics.

Period changes require comparable saved evidence in both windows. When a check
is missing, coverage is incomplete, or historical brand definitions differ,
changes remain unavailable. The explanation appears beside the report.

Use **Manage report columns** to choose visible columns. Paged CSV exports cover
the displayed page and include all report columns. **Saved filter views** stores
up to ten named selections in this browser for the current project; it does not
modify prompts, history or schedules.
