# Saved-answer analytics

AI Intelligence is a separate read-only module in the project sidebar, with its
own project route. Existing AI Visibility routes and tracking workflows retain
their behavior. Legacy analytics URLs redirect with their filters preserved.
Analytics opens with all markets and all citation sources selected. It
uses saved observations, historical brand matches and citations. Opening or
filtering a dashboard never collects answers, changes a schedule or reprocesses
historical brand evidence. The existing tracking tables and answer viewer remain
available.

The default snapshot is the latest finished scheduled or baseline check in the
selected reporting window, once per market. A specific saved check can be chosen
for one market, including a manual check. An explicit check overrides the date
window. Active runs do not enter the dashboard. Discovery metrics default to
non-branded prompts; branded diagnostics remain a separate selectable cohort.

Mention and citation rates count distinct answered observations for a brand over
answered observations that stored that brand. Tracked-brand share of voice is a
brand's answer-level mentions divided by all stored tracked-brand mentions in
the cohort. A zero denominator is unavailable. Share of voice describes this
tracked sample rather than the wider market. Historical brand names and changes
to the tracked set are disclosed; matches are never silently recalculated.

Source visibility counts distinct answered observations citing a URL or domain
over all answered observations in scope. Repeated citations from one answer
count once. Sources can overlap, so their percentages need not sum to one
hundred. Source ownership follows the brand snapshots of the citing answer.

A competitor gap requires a successfully answered observation, a known own brand
that is neither mentioned nor cited, and a tracked competitor that is mentioned
or cited. Per-competitor denominators require both brands to be present in the
stored matching set. Missing matching metadata is unknown rather than absence.

Response search scans the full retained prose with literal case-insensitive
matching. Search, source and brand evidence filters narrow response rows without
changing dashboard denominators. Aggregation precedes pagination. Each result
opens the existing answer viewer at the exact observation, including its market,
engine, collected date and citations.

Market comparison intersects exact prompt wording and engine cells from the
selected snapshots. It does not infer equivalence between regional variants.
Coverage below ninety percent or changing brand matching snapshots prevents a
comparability claim. Snapshot dates, whole-check prompt counts and configured
prompts outside each check remain visible. Single snapshots do not establish
period-over-period change or a synchronized time series.

The UI and the project-authorized analytics MCP tool use the same service and
validated output contract. Full answer prose is read one market at a time; only
bounded snippets and paginated evidence rows are returned. No separate analytics
store is needed for these deterministic calculations.

Historical charts use light stored evidence from finished scheduled and baseline
checks, filtered by the selected markets, engines, topic and prompt type. An
explicit saved check limits the chart to that check. The newest two hundred
checks are retained when the window exceeds that bound, with a visible notice.
UTC day, week and month buckets use summed counts rather than means of rates.
These descriptive charts disclose sample changes and do not infer a fair
period comparison. A single collection date is shown as a point, with an
insufficient-history notice.

The overview distinguishes citations to the project's domain from all retained
citation links and source domains. Its most-cited sources and citation counts
are independent of the source table's ownership filter. Source and response
empty states explain which selection is empty and offer scoped recovery actions.
Model and topic charts reuse the same snapshot aggregates as their tables.

Prompt-level ranking reports retain the exact observation, market and engine.
Mention position follows the existing tracked-brand first-mention ordering;
citation position follows the first retained source position for a domain.
Missing position evidence is unavailable rather than a zero position. A
mention/citation matrix keeps the four combinations separate and excludes
failed answers and missing brand matching metadata from the “neither” cell.

Preceding-period comparisons select one finished scheduled or baseline check per
market in each adjacent window. Exact prompt, engine, market, language and
branded-cohort keys define shared cells. Brand identity changes, missing prior
observations and insufficient coverage withhold changes. Rates and source-change
classifications use only shared cells answered in both periods. Gained/lost
brand presence requires the same evidence checks on each individual pair.

Source analysis deduplicates a source per answer and retains its earliest
position. Conditional brand mention rates with and without a source describe
association, not causal influence. Source overlap uses only observations that
stored both brands and reports its eligible sample. Reddit and YouTube views
classify retained citation domains with domain-boundary matching; they do not
fetch engagement statistics or infer unseen thread/video metadata. Prompt
topics form the tag/model matrix rather than inferred response concepts.

Detailed reports paginate after filtering and aggregation. CSV exports label
page scope and include all report columns, even when a user hides columns in
the table. Saved filter views are validated, bounded, browser-local and scoped
to the project. They store no answer text and never change tracking settings.
