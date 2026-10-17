---

title: "Net Worth Ledger: one number, computed from entries a human can audit"

published: false

tags: ["finance-ops","sql","net-worth","ledger","audit-trail","automation"]

description: "Assets and liabilities aggregate into a single live number with on-demand refresh and a dated history. The arithmetic happens in SQL, not in a model."

slug: net-worth-ledger

canonical: https://sport.taila73942.ts.net/portfolio/project/net-worth-ledger.html

---

# Net Worth Ledger: one number, computed from entries a human can audit

**A net-worth ledger that adds up assets and liabilities into one live number, with a deliberate refresh and an append-only history you can audit line by line.**

The Net Worth Ledger aggregates assets and liabilities into one live figure, refreshed on demand, with a dated history behind it. It is the same discipline as commission and financial reporting work: one number, computed from entries a human can audit. The arithmetic is done in code rather than by a model — totals and history are SQL, and the only model call in the picture is an occasional free-tier web lookup when a balance needs refreshing, confirmed by a human before it lands.

## What it is
A net-worth ledger that aggregates assets and liabilities into one live number, with on-demand refresh and a dated history. It is the same discipline as commission and financial reporting work — one number, computed from entries a human can audit — with the arithmetic done in code rather than by a model.

## How it works

- **Accounts as entries** — Each asset and liability is a row with a value and a date; there is no hidden cell arithmetic.

- **Refresh deliberately** — A balance updates by hand, or by a web-search job that looks up a published value and proposes it.

- **Append, never overwrite** — Every change is a dated entry, so a wrong number is visible in the trend instead of silently replacing the old one.

- **Compute in code** — Totals are a query over rows. A language model never does the arithmetic.

## What it costs
Free-tier model for the occasional lookup and a local database for everything else: the running cost is effectively zero, which is what you want under a number you make decisions with.

## How to build it this way

- **Store facts, compute totals** — Never let a model do arithmetic you can do in SQL.

- **Append-only history** — If a value can be overwritten silently, you cannot trust the trend.

- **Make refresh explicit** — A button, not a background job, for numbers that matter.

## What I learned

- One number computed from dated entries beats a spreadsheet nobody trusts.

- The valuable part of finance automation is the audit trail, not the total.

## FAQ

### What does it cost to run?
Effectively nothing: an occasional free-tier model call for a balance lookup and a local database for everything else. The running cost stays near zero, which is what you want under a number you make decisions with.

### Does a model do the arithmetic?
No. Totals and history are computed in SQL against stored entries. Never let a model do arithmetic you can do in SQL — the model's only job here is the occasional lookup, and a human confirms it.

### How is the history handled?
Append, never overwrite. Every refresh adds dated entries, so the same figure can be recomputed and audited later instead of overwriting the value that was there before.

## Where to see it
Personal financial data — never published.

The full write-up, the build steps and the screenshots are on the [project page](https://sport.taila73942.ts.net/portfolio/project/net-worth-ledger.html).

---

This one carries personal financial data, so it is never published — the design rules are the shareable part.

*I build AI systems that turn messy operations into clean numbers. Need something like this?
ddaymude.ai@gmail.com*
