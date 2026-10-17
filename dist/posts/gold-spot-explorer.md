---

title: "Gold Spot Explorer: ranking historical gold ground against bare-earth LiDAR"

published: false

tags: ["geospatial","lidar","gold-prospecting","3d-terrain","gpx","local-llm"]

description: "USGS bare-earth LiDAR picks out creek beds and ravines and scores which one is the source, overlaid with active claims and land status, exported as GPX — all free public data."

slug: gold-spot-explorer

canonical: https://sport.taila73942.ts.net/portfolio/project/gold-spot-explorer.html

---

# Gold Spot Explorer: ranking historical gold ground against bare-earth LiDAR

**Ranks historical gold ground against where the gold actually is, then reads the terrain itself to score which creek bed or ravine is the source.**

Gold Spot Explorer ranks historical gold ground against where you actually find it, then reads USGS bare-earth LiDAR to pick out the creek beds and ravines themselves and score which one is the source. It overlays active claims and land status so you know whether you may mine, lifts the terrain into a real 3D mesh, and exports targets as GPX for the field. Every data source is free and keyless, and an in-page AI guide points the map at its own answer, running on local weights so no location data leaves the machine.

## What it is
Ranks historical gold ground against where you actually find it, then reads USGS bare-earth LiDAR to pick out the creek beds and ravines themselves and score which one is the source. It overlays active claims and land status, lifts the terrain into a real 3D mesh, exports targets as GPX, and includes an in-page AI guide that points the map at its answer. Every data source is free public data.

## How it works

- **Free data only** — USGS historical production records, BLM claim and land-status services, and USGS bare-earth LiDAR — keyless endpoints, no data bill.

- **Read the terrain itself** — The LiDAR bare-earth model exposes creek beds, benches and inside bends that a satellite image hides under tree cover, and the renderer re-drapes the terrain at every zoom so old diggings stay readable close in.

- **Score the ground** — Each area gets a 0-100 score — roughly 75+ 'go check', 60-75 strong, 45-60 possible, under 45 weak — with walkable target zones.

- **Tell you if you may mine** — Land-status overlays distinguish claimed land from BLM, National Forest, state and private ground, so the answer to 'can I dig here' comes before the drive.

- **Lift it into 3D** — A real elevation mesh you can tilt, spin and exaggerate, with every overlay draped onto the actual ground.

- **Ask the guide** — A local-model guide answers questions about the ground on screen and moves the map to what it is talking about.

## What it costs
Deliberately a $0-data project: the historical, claim, land-status and LiDAR sources are free and keyless, and the guide runs on local weights. The only cost is compute you already own, which is what makes the offline field kit on the Pi possible.

## How to build it this way

- **Prefer keyless public endpoints** — No API key means no quota, no billing and no expiry surprise in a canyon.

- **Bound every remote call and mirror it** — Public geospatial hosts flake — one host returned a 502 inside a 200 response. Keep a second host for the same dataset and a short timeout on the primary.

- **Never treat a 200 as data** — Parse, and raise loudly when both sources fail — an empty list reads as 'nobody ever found gold here'.

- **Vendor the map library for the field** — A CDN tag is a network dependency at open time, which is exactly the failure an offline map exists to survive.

- **Make the assistant read the screen** — A guide answering from the last scan rather than the current view is worse than no guide.

## What I learned

- Bare-earth LiDAR is the best free prospecting signal available — free data, real terrain.

- Public data hosts go down quietly; bound the primary, keep a mirror, and fail loudly when both are gone.

- An offline-capable map is a different engineering problem from a fast one.

## FAQ

### Where does the data come from?
Free keyless public sources: historical gold ground, active mining claims, land status and USGS bare-earth LiDAR. No API key means no quota, no billing and no expiry surprise in a canyon.

### What does the in-page AI guide cost?
$0 per question. It runs on local weights via ollama (ornith-1.5:9b), so there is no per-token bill and no location data leaves the machine.

### How do you handle unreliable public APIs?
Bound every remote call with a short timeout, keep a mirror host for the same dataset, and parse the response instead of trusting the status code — one host returned a 502 inside a 200, so a 200 is never treated as data.

### Can you take it into the field?
That is the direction: because the data layer is keyless and the guide is local, the same tool can run offline on a small edge machine. Terrain and land lookups have no model in the data path at all.

## Where to see it
Runs locally and is free for early users; ask me for access.

The full write-up, the build steps and the screenshots are on the [project page](https://sport.taila73942.ts.net/portfolio/project/gold-spot-explorer.html).

---

It runs locally and is free for early users — ask me for access.

*I build AI systems that turn messy operations into clean numbers. Need something like this?
ddaymude.ai@gmail.com*
