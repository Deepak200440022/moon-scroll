/* Explore Beyond — the story's timing sheet.
   Every scroll-driven module reads its boundaries from here, so the whole
   timeline can be re-tuned in one place. */

var FLOW = 930;         // shard stream: world units per 1.0 of progress (z0=-250 reaches the camera near the end of the band)
var DRIFT = 12;         // camera forward drift per 1.0 of progress, starting at the flash
var D_READ = 9;         // readable-zone distance (camera-relative)
var D_ENTER = 120;      // project shards glide in from this far
var D_PAST = 22;        // how far past the camera a shard keeps flying before it's gone

/* the stopping points (see shared/parkgate.js): every card's park is
   a mandatory stop — no matter how fast the user scrolled, the story
   lands there, holds (the card floats; details stay hover-only) until
   scrolls on again. The gate latches on the forward lead (a
   destination ahead of the story while it crosses a card's arrival
   window), so no margin is needed to avoid skipping a card.
   PARK_MARGIN is how far past a park the destination must lie for the
   blast cinematic's arrival drift to fast-forward (ARRIVE_SKIP);
   PARK_ARRIVE_K is how fast a latched story converges onto the park
   (fast enough that the card's burst keeps its pace) */
var PARK_MARGIN = 0.02;
var PARK_ARRIVE_K = 0.12;

/* the blast cinematic: the moment the user's scroll reaches the edge
   of the explosion, the blast stops being scroll-driven and plays as
   a self-running animation. Three beats, all on the clock:
     1. the blast   EXPLODE_AT -> card 1's birth point, at the pace
                    set by EXPLODE_DUR (the flash, fireball and
                    shockwave get to finish completely)
     2. the hush    EXPLODE_HOLD seconds of smoldering aftermath at
                    the blast's heart — card 1 is still hidden inside
                    it (this keeps it from bursting out early)
     3. the arrival card 1 fades in out of the embers and drifts to
                    its stop over ARRIVE_DUR seconds (or ARRIVE_SKIP,
                     fast-forwarded, if the user is already scrolling
                     on past the park)
   It can't stall mid-blast with a resting hand, and it plays in
   full for ANY forward destination — a flick to the bottom of the
   page still lands card 1 out of the embers (and holds at its park:
   the stopping point, see PARK_MARGIN below). The beats are kept
   short on purpose: the card arrives promptly and the story stops —
   no dead beat where the user has to scroll to get the card. A
   forward scroll gesture made after the card is born skips the rest
   of the arrival and lands at the parked card (scrolling on moves
   the story on; the blast itself always plays through). Scrolling
   back past EXPLODE_AT cancels it (the story reverses). */
var EXPLODE_AT = 0.53;   // the edge of the blast where the hand-off happens
var EXPLODE_DUR = 2.4;   // seconds that set the blast's pace
var EXPLODE_HOLD = 0.3;  // a short beat of smoldering embers before card 1 appears
var ARRIVE_DUR = 1.2;    // seconds for card 1's arrival to its stop (prompt)
var ARRIVE_SKIP = 0.35;  // arrival duration when the destination is already
                         // clearly past the park: the drift fast-forwards

/* the project band is broken into explicit story segments, one per
   hand-off:
     S1 blast -> P1 : project 1 emerges out of the settled blast, parks
     S2 P1  -> P2   : P1 flows off the screen, a beat, P2 arrives, parks
     S3 P2  -> P3   : same hand-off for P2 / P3
     S4 P3  -> nova : P3 flows off into the second supernova / black hole
   per project:  in   = arrival starts (also where the stop-point gate
                        latches a far destination to this card)
                 park = the stopping point: the story holds here until
                        the user scrolls on (parkgate lead latch)
                 out  = user scrolled on -> the card flows forward off-screen
                 off  = gone */
var WIN = [
  /* P1's birth point (in) sits at 0.585 — AFTER the fireball has fully
     expanded and the blast is spent — so the card never pops out of a
     still-burning explosion */
  { in: 0.585, park: 0.606, out: 0.646, off: 0.674 },
  { in: 0.680, park: 0.724, out: 0.762, off: 0.788 },
  { in: 0.794, park: 0.836, out: 0.866, off: 0.890 }
];
var F_IN = 0.56;        // project band start (S1): P1 arrives out of the blast
var F_OUT = 0.90;       // project band end: P3 has flown off into the supernova

var SHARD_COUNT = 600;          // ambient rocks (desktop)
var SHARD_COUNT_MOBILE = 300;   // ambient rocks (mobile: half the fragment cost)
var DUST_COUNT = 300;
var FIRE_COUNT = 6000;

/* the four animation folders and the story ranges they own: the main
   page plays them in sequence, and each folder's standalone run.html
   scrubs exactly its range (see animations/<name>/run.js). Ranges
   overlap on purpose — the story's hand-offs (blast embers into the
   shard stream, P3 flowing off into the nova) live in the overlap. */
var RANGES = {
  zoom: [0.000, 0.40],      // A-C: inside the station -> planet full focus
  blast: [0.40, 0.585],     // D-E: the moon spins up and detonates
  shards: [0.585, 0.89],    // F: the shard stream, projects one by one
  blackhole: [0.875, 1.0]   // G-I: nova -> black hole -> the orbit page
};

export const config = {
  FLOW: FLOW,
  DRIFT: DRIFT,
  D_READ: D_READ,
  D_ENTER: D_ENTER,
  D_PAST: D_PAST,
  PARK_MARGIN: PARK_MARGIN,
  PARK_ARRIVE_K: PARK_ARRIVE_K,
  WIN: WIN,
  F_IN: F_IN,
  F_OUT: F_OUT,
  EXPLODE_AT: EXPLODE_AT,
  EXPLODE_DUR: EXPLODE_DUR,
  EXPLODE_HOLD: EXPLODE_HOLD,
  ARRIVE_DUR: ARRIVE_DUR,
  ARRIVE_SKIP: ARRIVE_SKIP,
  SHARD_COUNT: SHARD_COUNT,
  SHARD_COUNT_MOBILE: SHARD_COUNT_MOBILE,
  DUST_COUNT: DUST_COUNT,
  FIRE_COUNT: FIRE_COUNT,
  RANGES: RANGES
};
