---

title: "Track My Gold: a YouTube engagement and affiliate dashboard"

published: false

tags: ["youtube","content-operations","seo","dashboard","affiliate","approval-workflow"]

description: "A content-ops dashboard for a gold-prospecting channel: video metrics, an approval queue for comments, affiliate revenue tracking and a live SEO panel."

slug: track-my-gold

canonical: https://sport.taila73942.ts.net/portfolio/project/track-my-gold.html

---

# Track My Gold: a YouTube engagement and affiliate dashboard

**A content-operation dashboard that surfaces video performance, queues comments and engagement for review, tracks affiliate revenue and drives the content calendar.**

Track My Gold is the operating dashboard behind a gold-prospecting content channel. It surfaces video performance, runs an approval queue for comments and engagement, tracks affiliate revenue, checks search performance and feeds the weekly content calendar. The single most important design decision is where the post actually happens: comments go out through the YouTube API from the approve button itself, not from a scheduled session that may already have finished. Search Console feeds a live SEO tab under a read-only OAuth scope, so the view of search is never more stale than the last refresh. The public product side is trackmygold.net.

## What it is
A content-operation dashboard for a gold-prospecting channel: it surfaces video performance, runs an approval queue for comments and engagement, tracks affiliate revenue, checks SEO and drives the content calendar. Comments are posted through the YouTube API from the approve button itself — not from a cron session that may already have finished. Search Console feeds a live SEO tab under a read-only OAuth scope. The product side is trackmygold.net.

## How it works

- **Discovery** — A scheduled job finds newly published videos in the target niche and pushes candidates into the dashboard, each with a draft comment drawn from an approved library.

- **Review queue** — Nothing goes out unreviewed. Comments are edited, approved or discarded on the dashboard — the human step is the product decision, and it is enforced by design.

- **Approve = post** — The approve button calls the YouTube API directly and then writes the result into the tracking store, so the UI cannot drift from reality.

- **Measure** — A weekly job pulls trials, churn and channel metrics; an SEO tab reads Search Console impressions and queries; affiliate review runs weekly.

- **Publish** — Approved content hands off to the publishing pipeline (Buffer / the blog) instead of being copied around by hand.

## What it costs
The recurring work runs on the free tier, and the platform APIs used (YouTube data, Search Console read-only) add nothing to the bill. The real cost of this project is attention — which is why the approval queue exists.

## How to build it this way

- **Put the API call inside the button** — Do not route an action through a session that might have exited. Clicking approve should be the same thing as posting.

- **Reconcile against the raw record** — The UI should re-derive posted state from the tracking file on load, so a crash mid-write cannot leave it lying.

- **Deliver jobs somewhere a human reads** — Not a fire-and-forget webhook.

- **Make the niche search a job, not a habit** — Discovery belongs on a schedule with a review gate.

- **Measure the funnel, not the toil** — Impressions, trials, conversions by channel. The vanity number hides the leak.

## What I learned

- The bottleneck was acquisition, not integration — the dashboard proved that quickly and honestly.

- A dashboard that silently drifts from the underlying data is worse than no dashboard.

- Approvals in a web surface the person actually uses beat a webhook nobody reads.

## FAQ

### Why post comments from a button instead of a scheduled job?
Because the scheduled session may already have ended by the time the decision is made. Putting the API call inside the approve button means the action happens in the same context as the approval, so it either really posted or it visibly failed at the moment I clicked.

### How is the SEO data kept current?
Search Console feeds a live tab under a read-only OAuth scope, and the panels are refreshed on a schedule. Read-only matters: the reporting side never needs write access to the search property to be useful.

### What does the approval queue actually hold?
Outbound engagement that needs a human decision, comment replies and similar actions, presented so they can be reviewed, edited and approved in one pass. It is the reason the channel can be worked in batches instead of being babysat.

## Where to see it
[trackmygold.net](https://trackmygold.net)

The full write-up, the build steps and the screenshots are on the [project page](https://sport.taila73942.ts.net/portfolio/project/track-my-gold.html).

---

The dashboard itself is private, but the product it runs, trackmygold.net, is public.

*I build AI systems that turn messy operations into clean numbers. Need something like this?
ddaymude.ai@gmail.com*
