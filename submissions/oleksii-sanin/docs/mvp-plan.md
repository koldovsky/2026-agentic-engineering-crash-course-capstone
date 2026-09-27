# MVP plan: markdown-to-everywhere tool for daily creators

Date: 2026-09-20
Source: Ideabrowser idea 8024, project `41d53b93-ba2e-424b-a707-0ed0e627674a`
Project URL: https://www.ideabrowser.com/hub/build/write-once-markdown-publisher-that-outputs-blog-newsletter-and-social-posts-b8795184

Scores from Ideabrowser: opportunity 9, pain 8, builder confidence 10, execution difficulty 3.

Research sections pulled: competitive analysis, execution plan, go-to-market, market gaps, keyword list.

Working name in this document is Fmttr. It is a placeholder. Naming is not week-one work.

## What the research supports

The gap is real and it is narrow. Ghost covers blog and email. Buffer covers social. Typeshare covers threads. Repurpose.io covers video. No product takes one `.md` file and returns all four text outputs.

The buyer is technical. Obsidian users, indie hackers, and solo SaaS founders who publish every week. r/ObsidianMD has 48K members. r/Markdown has 13.7K. r/SideProject has 267K.

The price band for a solo user is $15 to $40 a month. The report's own gap analysis says so. The $29 headline in the idea summary sits inside that band.

The real competitor is ChatGPT plus copy-paste, not Buffer. You have to beat a free workaround that already feels good enough to most people.

Ideabrowser estimates a free tier converts at 10 to 15 percent to registration, then 5 to 10 percent of those to paid.

## Where the research is wrong

I do not want this smoothed over later, so it goes at the top.

**The `high_barriers` and `venture_scale` tags contradict the report's own body.** The competitive section says switching costs are low, network effects are weak, and there is no patent protection. A markdown-to-thread splitter is a weekend project for a competent developer. Treat this as a $10K to $30K MRR niche product, not a venture business. That already matches the bar in my founder notes.

**The keyword list points at the wrong crowd.** Its top keywords are "markdown converter", "convert markdown to pdf", and "md to word converter". Those searchers want a free utility and will not pay. The one buyer-shaped keyword, "content repurposing", is marked low commercial intent in the same data. Do not build a week-one SEO plan on this list.

**One-click publishing is blocked on day one.** The X API costs money at the tier this needs. LinkedIn posting needs partner approval for most applications. Ghost and Buffer are easy. The other two are not. The 4-to-6 week estimate in the idea summary assumes all four work.

**"Updates sync across all connected channels in real time" is a liability.** You cannot recall a sent email or edit a posted X thread. Drop that promise from all copy.

## Stack

Most of this is already fixed by `AGENTS.md`. I stay inside it.

| Layer | Choice | Why |
| --- | --- | --- |
| App | Next.js 16, TypeScript, pnpm | Project rule. |
| Transform | `unified` with `remark-parse` and `remark-rehype` | The parser exists. Do not write one. |
| Thread split | `Intl.Segmenter` | Native. No dependency. |
| Tests | Vitest, beside the code in `lib/` | Project rule. |
| Database | None in week one | The transform is a pure function. |
| Auth | None in week one | Nothing to protect yet. |
| Email capture | Buttondown or Kit | No schema. No migration. |
| Hosting | Vercel hobby | $0 against an under-$5K budget. |
| LLM | One Haiku 4.5 call, off by default | Only for the hook line. |

The whole transform is a pure function in `lib/`, with no React import and no Next import. That follows the project convention, and it also means all four outputs are testable without a browser.

Three of the four outputs need no AI at all.

**Blog.** `remark-rehype`, then stringify. Deterministic.

**Email.** The same HTML with inline style attributes. Deterministic.

**LinkedIn.** Plain text, emphasis stripped, 3000-character cap, links on their own lines. Deterministic.

**X thread.** Walk the markdown AST, group blocks, split at sentence boundaries under 280 graphemes. Deterministic, with one known ceiling:

```ts
// ponytail: grapheme count, not X's weighted char count.
// Swap in twitter-text if users report off-by-a-few splits.
```

Cut from week one: an AI layer on every output, a template language, credential storage, a scheduler, a job queue. Add the AI hook when users say the first tweet reads flat. Add credentials when 20 people ask to publish instead of copy.

## Data model

Week one has no schema. Text goes in, four outputs come out, the browser holds them. Emails live in Buttondown.

This is the shape to create when accounts arrive, around week three:

```ts
user   { id, email, created_at }
piece  { id, user_id, title, source_md, created_at, updated_at }
render { id, piece_id, channel, body, meta, created_at }
```

`piece.source_md` is the canonical file. Everything else derives from it.

`render` is a cache, not a record of truth. You can delete every row and regenerate.

`channel` is an enum with four values: `blog`, `email`, `x`, `linkedin`.

`meta` is JSON. It holds the thread part count and the character counts.

Two more tables arrive later, and only on evidence:

```ts
brand      { user_id, style_json }          // when users ask for voice control
connection { user_id, provider, token_enc } // when users ask to publish, not copy
```

`connection` brings token encryption, refresh jobs, and platform policy risk. That is why it is last, not first.

## Landing page copy

---

# Write it once. Ship it four ways.

Paste your markdown. Get a blog post, an email, an X thread, and a LinkedIn post, each formatted for where it lands. No reformatting. No lost links. No broken code blocks.

**[ Paste your markdown ]**

Free. No account. Nothing to install.

### The hour after you finish writing

You wrote the piece in Obsidian. Now the real work starts.

Paste into Ghost, fix the headings. Paste into the email tool, watch the code block collapse. Open ChatGPT, ask for a thread, get back something that does not sound like you. Open Buffer, split it by hand. Strip the markdown out for LinkedIn, because LinkedIn eats asterisks.

That is an hour. Every week. Forever.

### What you get back

**Blog.** Clean HTML. Headings, code fences, and links survive intact.

**Email.** Inline styles that render in Gmail, Outlook, and Apple Mail. Your code block still looks like code.

**X thread.** Split at sentence boundaries, never mid-word, never over the limit. Numbered. Ready to queue.

**LinkedIn.** Plain text under 3000 characters, asterisks removed, links on their own line.

Copy each one. Paste where it goes. Done in two minutes.

### Your file stays yours

Your markdown is the source of truth. We do not host your blog, own your list, or take a cut of your subscriptions. We are the step between writing and publishing, nothing more.

### It does not rewrite you

Three of the four outputs are pure formatting. No model touches your words. The thread splitter cuts at your sentences, it does not invent new ones. If you would not have written it, it is not in there.

### Free while we build it

The converter stays free. Paid plans arrive when saved pieces, brand templates, and one-click publishing do.

**Leave your email and I will tell you when that happens.**

[ your@email.com ] [ Keep me posted ]

Built in public by one developer. Posts go to r/ObsidianMD and Indie Hackers.

---

Reasons for these choices. The hook leads with the lost hour, not with markdown. "Your file stays yours" answers the Ghost and Substack lock-in objection. "It does not rewrite you" answers AI fatigue, which the Ideabrowser report names as a real risk. The free tool is the lead magnet, which fits my preference for compounding assets over constant public posting.

## Week one

Part-time, about 15 hours. Tight but real, because the scope is small.

| Day | Ship |
| --- | --- |
| 1 | Landing page. Static. Email capture only. No tool behind it. Deploy it. |
| 2 | `lib/transform`, blog and email outputs. Vitest beside them. |
| 3 | `lib/transform`, X thread splitter and LinkedIn output. Tests for the split edge cases. |
| 4 | Tool page. Textarea, four tabs, four copy buttons. No account. |
| 5 | Run three of my own real posts through it. Fix what breaks. |
| 6 | Post to r/ObsidianMD, r/Markdown, r/SideProject, and Indie Hackers. Show the tool, not a waitlist. |
| 7 | Read every comment. Write down what people paste and what they complain about. |

Day 1 comes before the code on purpose. My founder notes name the trap: an Alchemist polishes the system instead of deploying it. A landing page on day 1 makes that harder.

Not in week one: accounts, a database, publish integrations, scheduling, analytics, templates, payment, and the AI hook generator. Each one is a week-three decision at the earliest, and each needs evidence first.

## Kill line

Written before the start, not after.

**Go.** 200 people use the tool in 14 days, 30 of them return in week two, and 5 say in writing they would pay $19 a month.

**Pivot.** High traffic, no return visits. That means it is a utility, not a workflow. Consider a paid Obsidian plugin instead.

**Stop.** Under 50 uses after honest posts in all four communities. The pain is real but nobody pays for it.

At $19 a month, a $10K MRR bar needs 525 subscribers. At $29 it needs 345. Both are large numbers for a niche this size. Decide now whether a $3K to $5K MRR result counts as a success, because that is the likely landing zone.

## Decisions

| Decision | Who |
| --- | --- |
| Use the existing Ideabrowser project instead of a new one | Agent. The project already existed, `start_project` was idempotent. |
| Which research sections to pull | Agent. Five of 21 sections, chosen for MVP relevance. |
| Contradict the `high_barriers` and `venture_scale` tags | Agent. The report's own competitive section is the evidence. |
| Drop the AI layer from three of four outputs | Agent. Deterministic AST transforms cover them. |
| No database and no auth in week one | Agent. |
| Stack is Next.js 16, TypeScript, pnpm, Vitest | Human, already fixed in `AGENTS.md`. |
| Write this plan to `docs/` | Human, in session on 2026-09-20. |
| Whether to build any of it | Open. Not decided. |

## Open questions

1. Is a $3K to $5K MRR outcome acceptable, or is this a stop condition?
2. Ghost and Buffer integrations are cheap. X and LinkedIn are not. Is copy-to-clipboard an acceptable permanent answer for those two?
3. The free converter attracts the "markdown to pdf" crowd, who do not pay. Does the free tier stay free forever, or does it become a 3-piece trial?
