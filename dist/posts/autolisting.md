---

title: "Autolisting: a visible ten-step pipeline that turns property video into a finished listing"

published: false

tags: ["media-pipeline","ffmpeg","video-processing","real-estate","llm","automation"]

description: "Chunked upload, ffmpeg frame extraction, straightening and tone-mapping, then one short generation for the copy — ten named steps with live state and a verdict on every job."

slug: autolisting

canonical: https://sport.taila73942.ts.net/portfolio/project/autolisting.html

---

# Autolisting: a visible ten-step pipeline that turns property video into a finished listing

**Upload a property video and a few fields, get back a finished, formatted listing — with every one of the ten pipeline steps visible while it runs.**

Autolisting takes a property walkthrough video and a handful of fields and returns a finished, formatted listing. The pipeline is deliberately visible: ten named steps with live state, so the user can see exactly where the machine is and step in when needed. Under the hood it is a chunked uploader that survives an interrupted tunnel, a local ffmpeg and Python worker that probes the media before touching it, a framing and enhancement pass that straightens shots and maps their tone, and an LLM writing the copy from what the frames actually show.

## What it is
Upload property video and a few fields, get back a finished, formatted listing. The pipeline is deliberately visible — ten named steps with live state — so the user can see exactly where the machine is and step in when needed. Under the hood it is a chunked uploader, an ffmpeg/Python worker, a framing and enhancement pass, and an LLM writing the copy.

## How it works

- **Chunked upload** — The front end splits the file into 4 MB chunks and PUTs each one at its byte offset with retries. A single large PUT is all-or-nothing and dies on a long tunnel; chunking makes uploads resumable and survivable.

- **Probe before processing** — The server verifies the file it owns before starting work — a video whose index never arrived fails immediately with a real message instead of hanging.

- **Extract frames** — A Python worker pulls frames with ffmpeg, using absolute tool paths because a launchd environment does not have Homebrew on PATH.

- **Straighten and enhance** — Each frame is squared up (roll plus vertical perspective) and run through an enhancement pass, so phone footage reads like a listing rather than a walkthrough.

- **Write the copy** — An LLM turns the structured facts into the listing text; the images stay deterministic image processing, not generation.

- **Always write a verdict** — Every job ends in a terminal state — ready or failed — and a sweeper picks up jobs that were uploaded but never started. 'Processing forever' is treated as a bug class, not a state.

## What it costs
The expensive half of this pipeline is compute, not tokens — frame extraction and enhancement — and it runs on this machine, so a finished listing costs local machine time plus a single short generation. Nothing is billed per uploaded megabyte.

## How to build it this way

- **Chunk your uploads** — Anything over a few megabytes over a tunnel needs resumable chunks with explicit offsets.

- **Probe media before you trust it** — A video without its index is indistinguishable from a hang until you check.

- **Always write a terminal state** — Ready or failed, every job needs a verdict or the UI polls forever.

- **Sweep for orphaned jobs** — A periodic sweeper that resumes 'uploaded but never started' work is what turns an occasional failure into a non-event.

- **Resolve tool paths explicitly** — Servers started by launchd get a minimal PATH; a bare ffmpeg call fails there and works perfectly by hand.

## What I learned

- A job that never writes its verdict looks like a hang, not an error — design the failure state first.

- An interrupted upload leaves a clean prefix, so you cannot tell it from a bad source file: instrument the upload itself.

- Straightening and tone-mapping are what make a phone walkthrough look like a listing.

## FAQ

### What does one finished listing cost?
The expensive half of this pipeline is compute, not tokens: frame extraction and enhancement run locally on my machine, so a listing costs local machine time plus a single short generation — nothing is billed per uploaded megabyte.

### Why is every step shown to the user?
Because a job that never writes a terminal state looks like a hang, not an error. Ten named steps with live state, and an explicit ready-or-failed verdict, mean the UI never polls forever and the user can see where to intervene.

### How does the video get in and out?
Anything over a few megabytes over a tunnel goes up as resumable chunks with explicit offsets; the worker probes the file before processing, extracts frames, straightens and enhances them, and one low-cost catalogue model writes the listing copy in a single generation.

## Where to see it
Runs inside the dashboard; the input is a private video, so it is not published.

The full write-up, the build steps and the screenshots are on the [project page](https://sport.taila73942.ts.net/portfolio/project/autolisting.html).

---

Autolisting runs inside the dashboard; the input is a private video, so the pipeline itself is not published.

*I build AI systems that turn messy operations into clean numbers. Need something like this?
ddaymude.ai@gmail.com*
