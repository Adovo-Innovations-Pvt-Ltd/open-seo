# AI visibility across markets

A project can have one AI visibility tracker for each country and language pair.
The project supplies shared brand and competitor context. Each market owns its
exact prompt records, engine selection, schedule and answer history.

The tracking page has a market selector. Prompts, competitors, citations, trends,
settings, cost reviews and Run now use the selected market. Selecting another
market resets the selected execution and open editing state. A historical prompt
resolves its owning market, so its answers cannot be confused with another
market's answers to the same words.

Existing API callers can omit `trackerId` to use the project's default country
and language, falling back deterministically to its oldest tracker. Callers can
read `markets` from the tracker state and pass `trackerId` to select another
market. Explicit tracker IDs must belong to the authorized project. An explicit
`createMarket` request adds an empty, paused tracker; saving settings on an
existing tracker retains its schedule.

Every run snapshots its tracker's country and language. The collector uses that
snapshot for every engine request, even if settings change while it is running.
Scheduled execution loads configuration by both project and tracker ID. Prompts
and answers retain their existing identities and historical brand snapshots.

This design extends the existing tracker relationship rather than duplicating
projects or putting several countries in a tracker field. A shared prompt library
would introduce different editing semantics: wording can differ by market, and
old answers must always refer to the exact wording originally collected. Keeping
market-owned prompt records preserves those semantics while allowing a shared
library to be designed separately.
