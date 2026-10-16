# Auto-publishing setup — what the engine can post, and what it needs from you

Goal: every project becomes a blog post that lands on every reachable platform automatically.
Below is exactly what is fully automatic, what needs a key, and what can only be manual.

## Fully automatic (once a key is pasted in)

| Platform | Free? | What I need from you | Notes |
|---|---|---|---|
| **GitHub Pages** | Yes | GitHub username (one-time login) | Hosts the free domain `https://<user>.github.io/portfolio/` |
| **Dev.to** | Yes | Dev.to API key → https://dev.to/settings/extensions | `syndicate.js` posts automatically |
| **Hashnode** | Yes | Personal access token → https://hashnode.com/settings/developer **and** publication id | GraphQL createDraft/publish |
| **Blogger** | Yes | Google OAuth token (see below) | `blogger-publish.js` creates **drafts** on danieldaymude.blogspot.com — nothing publishes itself |
| **Reddit** | Yes | A "script" OAuth app (client id/secret + your login) | r/SideProject, r/LocalLLaMA, r/goldprospecting |

Put the keys in `/Users/dan/portfolio/.env` (see `.env.example`). The daily job will then publish.

## Blogger — drafts only, and the API write block to expect

`node blogger-publish.js`            → dry run: shows what would be created
`node blogger-publish.js --live`     → creates/refreshes the drafts (never publishes)
`node blogger-publish.js --live --max 5` → cap writes per run (default 5)

Blog id `6379488244824949695` (danieldaymude.blogspot.com), token at
`~/.hermes/profiles/dev/blog/blogger-token.json` (or `BLOGGER_ACCESS_TOKEN`).
Every post goes up with `isDraft=true`, and the script skips any slug whose title already
exists — Dan reviews and hits Publish himself.

**Expect this to fail on a young blog.** Blogger's anti-spam blocks API post creation on a new
blog: a burst of writes returns `429 rateLimitExceeded` and then a hard
`403 "The caller does not have permission"` that lasts for days (reads, edits, deletes and the
web editor keep working). Retrying extends it, so `blogger-publish.js` stops on the first 403 and
records `blocked.remaining` in `publish/blogger-results.json`. When it happens, create the
remaining drafts through the web editor (https://www.blogger.com/blog/posts/6379488244824949695):
open the draft, set the title, paste the post HTML, save — the editor path is not blocked. Record
the ids in `publish/blogger-results.json` with `"via": "editor"` so the script skips them next run.

## Not fully automatable (I'll prep the post; you click publish)

| Platform | Why | What happens |
|---|---|---|
| **Hacker News / Lobste.rs** | No posting API (deliberately) | I write the "Show HN" text; you paste it |
| **Product Hunt** | Launch-gated, no write API | I prepare the launch assets; you launch |
| **LinkedIn** | API is partner-only | I write the post; you paste it (or use a scheduler) |
| **X / Twitter** | API now paid (~$100/mo) | Skipped unless you want to pay |
| **Medium** | Public write API deprecated | Cross-post via Medium's "import from URL" on our site |
| **YouTube** | Needs OAuth + quota | Possible later; video uploads |

## The honest bottom line
With a GitHub username + a Dev.to key, you get: free domain + auto-published, SEO-indexed project
posts — the two highest-value channels — fully automatic. Hashnode and Reddit are quick adds.
HN/LinkedIn/Product Hunt stay human-in-the-loop by design.

## Security rule
`.env` (keys) and any token must never be committed. The repo `.gitignore` excludes `.env` and
`refresh.log`. The portfolio only renders projects flagged `"publicSafe": true`.
