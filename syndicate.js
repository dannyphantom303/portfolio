#!/usr/bin/env node
// Syndication: turn each portfolio project into a blog post draft, then publish
// to every platform whose API key is configured. Platforms without keys are
// skipped (drafts are still written to dist/posts/ for manual cross-posting).
//
// Required env (see .env.example):
//   DEVTO_API_KEY    — https://dev.to/settings/extensions  (dev.to API key)
//   HASHNODE_TOKEN   — https://hashnode.com/settings/developer (personal access token)
//   HASHNODE_PUB_ID  — your Hashnode publication id (from the publication settings)
//
// Usage:  node syndicate.js            (dry run if no keys set)
//         node syndicate.js --publish  (actually POST to configured platforms)
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const reg = JSON.parse(fs.readFileSync(path.join(ROOT, 'projects.json'), 'utf8'));
const SITE = process.env.SITE_URL || 'https://sport.taila73942.ts.net/portfolio';
const PUBLISH = process.argv.includes('--publish');
const projects = reg.projects.filter(p => p.publicSafe !== false);

fs.mkdirSync(path.join(ROOT, 'dist', 'posts'), { recursive: true });

function markdown(p) {
  // Only emit sections that have content: an empty "## Stack" heading reads as a
  // broken post on the blog (5 projects have no stack recorded yet).
  const highlights = (p.highlights || []).filter(h => h && String(h).trim());
  const stack = (p.stack || []).filter(s => s && String(s).trim());
  const sections = [
    highlights.length ? `## Highlights\n${highlights.map(h => `- ${h}`).join('\n')}` : '',
    stack.length ? `## Stack\n${stack.join(', ')}` : '',
    `## Live project\nSee the write-up, screenshots, and demo at ${SITE}/project/${p.slug}.html`,
  ].filter(Boolean).join('\n\n');
  return `---
title: "Building ${p.name}: ${p.tagline}"
published: false
tags: ${JSON.stringify((p.stack || []).slice(0, 4).map(s => s.toLowerCase().replace(/[^a-z0-9]/g, '')))}
---
# ${p.name}

**${p.tagline}**

${p.writeup}

${sections}

---
*I build AI systems that turn messy operations into clean numbers. Need something like this?
ddaymude.ai@gmail.com*
`;
}

async function postDevTo(p, md) {
  const body = {
    article: {
      title: `Building ${p.name}`,
      body_markdown: md,
      published: PUBLISH,
      tags: (p.stack || []).slice(0, 4).map(s => s.toLowerCase().replace(/[^a-z0-9]/g, '')).slice(0, 4),
      canonical_url: `${SITE}/project/${p.slug}.html`,
    },
  };
  const r = await fetch('https://dev.to/api/articles', {
    method: 'POST',
    headers: { 'api-key': process.env.DEVTO_API_KEY, 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`dev.to ${r.status}: ${(await r.text()).slice(0, 200)}`);
  return (await r.json()).url;
}

async function postHashnode(p, md) {
  const q = `mutation($input: CreateDraftInput!){ createDraft(input:$input){ draft{ slug } } }`;
  const r = await fetch('https://gql.hashnode.com/', {
    method: 'POST',
    headers: { Authorization: process.env.HASHNODE_TOKEN, 'content-type': 'application/json' },
    body: JSON.stringify({
      query: q,
      variables: { input: { publicationId: process.env.HASHNODE_PUB_ID, title: `Building ${p.name}`, contentMarkdown: md } },
    }),
  });
  if (!r.ok) throw new Error(`hashnode ${r.status}`);
  return 'hashnode draft created';
}

(async () => {
  const devto = !!process.env.DEVTO_API_KEY;
  const hashnode = !!process.env.HASHNODE_TOKEN && !!process.env.HASHNODE_PUB_ID;
  console.log(`Syndication ${PUBLISH ? '(PUBLISH)' : '(draft/offline)'} — dev.to:${devto ? 'on' : 'off'} hashnode:${hashnode ? 'on' : 'off'}`);
  for (const p of projects) {
    const md = markdown(p);
    fs.writeFileSync(path.join(ROOT, 'dist', 'posts', `${p.slug}.md`), md);
    if (devto) { try { console.log(`  dev.to  ${p.slug}: ${await postDevTo(p, md)}`); } catch (e) { console.log(`  dev.to  ${p.slug}: FAIL ${e.message}`); } }
    if (hashnode) { try { console.log(`  hashnode ${p.slug}: ${await postHashnode(p, md)}`); } catch (e) { console.log(`  hashnode ${p.slug}: FAIL ${e.message}`); } }
  }
  console.log(`Wrote ${projects.length} drafts → dist/posts/. Add API keys to publish automatically.`);
})();