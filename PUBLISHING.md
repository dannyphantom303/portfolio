# Auto-publishing setup — what the engine can post, and what it needs from you

Goal: every project becomes a blog post that lands on every reachable platform automatically.
Below is exactly what is fully automatic, what needs a key, and what can only be manual.

## Fully automatic (once a key is pasted in)

| Platform | Free? | What I need from you | Notes |
|---|---|---|---|
| **GitHub Pages** | Yes | GitHub username (one-time login) | Hosts the free domain `https://<user>.github.io/portfolio/` |
| **Dev.to** | Yes | Dev.to API key → https://dev.to/settings/extensions | `syndicate.js` posts automatically |
| **Hashnode** | Yes | Personal access token → https://hashnode.com/settings/developer **and** publication id | GraphQL createDraft/publish |
| **Reddit** | Yes | A "script" OAuth app (client id/secret + your login) | r/SideProject, r/LocalLLaMA, r/goldprospecting |

Put the keys in `/Users/dan/portfolio/.env` (see `.env.example`). The daily job will then publish.

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
