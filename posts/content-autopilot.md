---

title: "Content Autopilot: draft, review, approve, publish on a schedule"

published: false

tags: ["content-automation","human-in-the-loop","llm","buffer","workflow","wearables"]

description: "An AI content pipeline where drafts arrive with review, edit and redo controls, approved items hand off to scheduling, and deterministic gates catch mistakes free."

slug: content-autopilot

canonical: https://sport.taila73942.ts.net/portfolio/project/content-autopilot.html

---

# Content Autopilot: draft, review, approve, publish on a schedule

**A pipeline that has the machine do the volume and the human keep the judgement, with the quality gates running offline before any model time is spent.**

Content Autopilot drafts, reviews, approves and publishes on a schedule. Drafts arrive with review, edit and redo controls, approved items hand off to social scheduling, and the review surfaces include wearable targets rather than only a browser tab. The same engine runs the blog job that produces one post on a fixed cadence, which is why the pipeline is built the way it is: everything that can be checked mechanically is checked mechanically, and the model is only asked for the part that genuinely needs judgement.

## What it is
An AI content pipeline that drafts, reviews, approves and publishes on a schedule — built so the machine does the volume and the human keeps the judgement. Drafts arrive with review/edit/redo controls, approved items hand off to scheduling, and the review surfaces include wearable targets (Meta Ray-Ban Display, Quest). The same engine runs the blog job that drafts one post every three days.

## How it works

- **Topic queue** — A roadmap file holds the queue. The job takes the next item and flips it to drafted, recording the resulting post id — so the same topic cannot be picked twice.

- **Draft** — An agent writes the full post as HTML in a house style, from a fixed set of real links and facts.

- **Offline gates** — Before a human ever sees it: a format gate (structure, image sizing, link attributes) and a duplicate guard that fails the draft if it reuses too much prose from an earlier post.

- **Review, edit, redo** — The reviewer edits in the app or the editor; edits are mirrored back into the source file so the next regeneration cannot silently revert them.

- **Publish** — Only approved content ships — to the scheduling API or as a blog draft. Publishing is a separate, explicit step.

## What it costs
Cost is dominated by drafting tokens, which is why the guard rails are deterministic: the checks that protect quality run for free, offline, before any model time is spent.

## How to build it this way

- **One source-of-truth file per post** — Keep the authored HTML in a durable workspace and treat the editor as a renderer.

- **Gate before review** — Format and duplicate checks are cheap and deterministic — run them so a human never reviews something structurally broken.

- **Mirror every editor-side edit back** — Changes made in a UI exist only in that UI until you write them back.

- **Strip the house footer before similarity scoring** — Otherwise every post looks like a duplicate of every other post.

- **Leave it a draft** — Draft is the correct resting state for machine-written prose.

## What I learned

- Guard rails are cheaper than re-editing: measure similarity and structure offline, not with a model.

- 'Human in the loop' only counts if the human's edits survive the next run.

- Design for the review surface you will actually use — glasses and tablets included.

## FAQ

### What does the deterministic gate actually check?
Format and duplicate detection, run as plain scripts with zero tokens involved. Similarity scoring is done offline and the house footer is stripped before scoring so the site's own boilerplate does not make every post look alike.

### Why build review for wearables as well as a browser?
Because the review surface you actually use decides whether approval happens. Designing the controls so they work in a constrained viewport with arrows rather than a pointer means the queue gets cleared wherever I happen to be, not only when I am at a desk.

### What happens after a post is approved?
It hands off to social scheduling and stays a draft until it is explicitly published, so approval and publication remain two separate decisions rather than one button that does both.

## Where to see it
The review app is token-gated and shows unpublished work, so it is not linked publicly.

The full write-up, the build steps and the screenshots are on the [project page](https://sport.taila73942.ts.net/portfolio/project/content-autopilot.html).

---

The review app is token-gated and shows unpublished work, so there is no public link, but the gate-before-review pattern is the reusable part.

*I build AI systems that turn messy operations into clean numbers. Need something like this?
ddaymude.ai@gmail.com*
