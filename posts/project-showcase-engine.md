---

title: "Project Showcase Engine: the daily pipeline that generates this portfolio"

published: false

tags: ["static-site","generator","automation","cron","publishing","portfolio"]

description: "A project registry drives the write-ups, the resume, the demo videos and the per-project post drafts; a scheduled job rebuilds and publishes the whole site every morning."

slug: project-showcase-engine

canonical: https://sport.taila73942.ts.net/portfolio/project/project-showcase-engine.html

---

# Project Showcase Engine: the daily pipeline that generates this portfolio

**The system that builds the site you are reading: one registry, one generator, a video step, a syndication step, and a scheduled rebuild every morning.**

This portfolio is generated, not hand-written. A project registry drives the write-ups, one page per project and a self-updating résumé. A discovery step syncs new projects in from the working dashboard so the site cannot drift from reality; a video step renders the demos; a syndication step drafts a per-project post for the publishing platforms; and a scheduled job rebuilds and publishes the whole thing every morning. The page you are reading is the output of a daily pipeline, which is the only reason an eighteen-project portfolio stays current.

## What it is
This site is generated. A project registry drives the write-ups, one page per project, and a self-updating résumé; a discovery step syncs new projects in from the working dashboard; a video step renders the demos; a syndication step drafts a per-project post for the publishing platforms; and a scheduled job rebuilds and publishes the whole thing every morning. The page you are reading is the output of a daily pipeline.

## How it works

- **Registry is the source of truth** — Every project is one record: name, tagline, status, stack, write-up, links. Nothing on the site exists outside the registry (or the authored page layer).

- **Discovery syncs reality** — A discovery pass reads the working dashboard and appends projects that are not in the registry yet — idempotently, and never storing a token-bearing URL.

- **Videos first, then pages** — The demo renderer runs before the build so the pages can embed assets that exist; the build preserves the generated directories it does not own.

- **Build is disposable** — The build wipes its output directory and regenerates it from sources. Hand-authored pages live in a source folder and are rendered verbatim, which is what makes a redesign survive the next rebuild.

- **Syndicate** — A syndication step writes a per-project post draft from the same registry and can publish to the platforms whose keys are present.

- **Publish on a schedule** — A launchd job runs the whole chain daily and commits the result, so the site is never more than a day stale.

## What it costs
Hosting is free (a static directory behind the existing private router) and the build is machine time measured in seconds. The only real cost of this project is the discipline of keeping one source of truth.

## How to build it this way

- **Registry -> generator** — One JSON file, one build script, static output. Anything more elaborate is a liability at this scale.

- **Never hand-edit generated output** — The build directory is disposable by design. Authored files go in the source layer or the next rebuild eats them.

- **Test the regressions you actually hit** — There is a test for each one: that generated directories survive a rebuild, that the served index matches its source, and that no secret-like string reaches the published output.

- **Sync discovery, do not copy-paste** — New work should appear on the site without anyone remembering to add it.

- **Let the schedule do the publishing** — A daily rebuild keeps the résumé and the project list honest without a reminder.

## What I learned

- The build directory is disposable: put authored files in a source layer or the next rebuild deletes them.

- A scheduled job that fails silently is worse than no job — the very first cron run died on a minimal PATH and looked like nothing had changed.

- Publishing from the generator is what keeps a portfolio from rotting.

## FAQ

### How is this site built?
One JSON project registry drives a generator that writes the write-ups, per-project pages and the résumé. A discovery step syncs new projects from the working dashboard, a video step renders demos, and a syndication step drafts the per-project posts.

### What does it cost to host?
Hosting is free — a static directory behind the existing private router — and the build is machine time measured in seconds. The only real cost of the project is the discipline of keeping one source of truth.

### Why automate the publishing?
Because a portfolio that is updated by hand rots. A scheduled job rebuilds and publishes from the registry every morning, so the site reflects current work without anyone remembering to redeploy it — and the first cron failure taught me to check that the job actually fires.

## Where to see it
[This site](https://sport.taila73942.ts.net/portfolio)

The full write-up, the build steps and the screenshots are on the [project page](https://sport.taila73942.ts.net/portfolio/project/project-showcase-engine.html).

---

The site rebuilds and republishes itself every morning from the project registry.

*I build AI systems that turn messy operations into clean numbers. Need something like this?
ddaymude.ai@gmail.com*
