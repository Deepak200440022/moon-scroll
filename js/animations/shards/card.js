/* Explore Beyond — the project info card (phase F).
 [ animation: shard*s] The details stay hidden until the pointer
 comes: hover a shard to open its card — including while the story
 is parked at the card's stopping point (the card floats there, but
 its info card is not shown on its own) — and click to pin it
 (click elsewhere to unpin). The card tracks the shard it describes
 across the screen (desktop) or docks to the bottom (mobile, via
 CSS). The raycast runs at most once per frame (pointermove only
 records the pointer). The card reads the shard meshes from this
 folder's shards.js (shards never imports the card: the entry
 injects getActive() into the shard stream, so there is no circular
 dependency). */
import { M } from '../../shared/math.js';
import { config as C } from '../../config.js';
import { data } from '../../data/projects.js';
import shardStream from './shards.js';

var cardEl, cardInner, cardName, cardDesc, cardTags, cardLink;
var ready = false;

/* ---- card / hover state ---- */
var hoverIdx = -1;
var pinned = false;
var cardIdx = -1;
var cardOpen = false;
/* real-time (rawDt) countdown until an un-hovered card closes: the
   story clock (ctx.t) is frozen while parked, so the delay can't be
   keyed off it (it would never elapse) */
var closeIn = -1;
var pointerOverCard = false;
var cardW = 300, cardH = 200;
var activeIndex = -1;

/* reusable temps (no allocation in the loop) */
var _wPos, _cardV, _ray, _pointer;
var lastX = -1, lastY = -1;
var _cands = [];
var pointerDirty = false;   // pointer moved since the last frame's raycast

function fillCard(i) {
  var pr = data.PROJECTS[i];
  cardName.textContent = pr.name;
  cardDesc.textContent = pr.desc;
  cardLink.href = pr.url;
  cardTags.innerHTML = '';
  for (var t = 0; t < pr.tags.length; t++) {
    var s = document.createElement('span');
    s.className = 'pill';
    s.textContent = pr.tags[t];
    cardTags.appendChild(s);
  }
  cardW = cardInner.offsetWidth;
  cardH = cardInner.offsetHeight;
}

function openCard(i) {
  if (cardIdx !== i) { cardIdx = i; fillCard(i); }
  if (!cardOpen) {
    cardOpen = true;
    cardEl.classList.add('open');
    lastX = -1; lastY = -1;
  }
}

function closeCard() {
  if (!cardOpen && !pinned) return;
  cardOpen = false;
  pinned = false;
  cardIdx = -1;
  closeIn = -1;
  cardEl.classList.remove('open');
}

function doRaycast(ctx) {
  _ray.setFromCamera(_pointer, ctx.camera);
  // Raycaster ignores .visible, so only offer shards that have arrived
  _cands.length = 0;
  for (var k = 0; k < shardStream.projectShards.length; k++) {
    var ps = shardStream.projectShards[k];
    if (ps.interactive && ps.mesh.visible) _cands.push(ps.mesh);
  }
  if (!_cands.length) return -1;
  var hits = _ray.intersectObjects(_cands, false);
  if (hits.length && hits[0].distance < 25) return hits[0].object.userData.index;
  return -1;
}

function init(ctx) {
  cardEl = document.getElementById('card');
  cardInner = document.getElementById('card-inner');
  cardName = document.getElementById('card-name');
  cardDesc = document.getElementById('card-desc');
  cardTags = document.getElementById('card-tags');
  cardLink = document.getElementById('card-link');
  ready = !!(cardEl && cardInner && cardName && cardDesc && cardTags && cardLink);
  if (!ready) return;

  _wPos = new THREE.Vector3();
  _cardV = new THREE.Vector3();
  _ray = new THREE.Raycaster();
  _pointer = new THREE.Vector2();

  /* pointermove only records the pointer: the raycast itself runs at
     most once per frame in update(), so a 120Hz+ mouse never triggers
     one raycast per event */
  window.addEventListener('pointermove', function (e) {
    _pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
    _pointer.y = -(e.clientY / window.innerHeight) * 2 + 1;
    pointerOverCard = cardOpen && cardEl.contains(e.target);
    pointerDirty = true;
  }, { passive: true });

  window.addEventListener('click', function (e) {
    if (e.target === cardLink && cardLink.getAttribute('href') === '#') {
      e.preventDefault();
      return;
    }
    if (!(ctx.p >= C.F_IN && ctx.p < C.F_OUT)) {
      if (cardOpen || pinned) closeCard();
      return;
    }
    if (cardEl.contains(e.target)) return; // clicking the card never unpins
    _pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
    _pointer.y = -(e.clientY / window.innerHeight) * 2 + 1;
    var hit = doRaycast(ctx);
    if (hit >= 0) {
      pinned = true;
      closeAt = -1;
      openCard(hit);
    } else if (pinned) {
      pinned = false;
      closeIn = 0.15;
    }
  });
}

function update(ctx) {
  if (!ready) return;
  var p = ctx.p;
  var inHover = p >= C.F_IN && p < C.F_OUT;

  /* the raycast, at most once per frame */
  if (inHover) {
    if (pointerDirty && !pointerOverCard) {
      hoverIdx = doRaycast(ctx);
      pointerDirty = false;
    }
  } else {
    hoverIdx = -1;
    pointerDirty = false;
  }

  /* hover state — the details stay hidden until the pointer comes,
     whether the story is parked at the card or in free flow. The
     close countdown runs on rawDt: the story clock (ctx.t) is frozen
     while parked, so it can't time a delay */
  if (inHover) {
    activeIndex = pinned ? cardIdx : hoverIdx;
    if (!pinned && cardOpen && hoverIdx === -1 && !pointerOverCard) {
      if (closeIn < 0) closeIn = 0.15;
    } else if (!pinned && hoverIdx >= 0) {
      closeIn = -1;
      openCard(hoverIdx);
    }
    if (closeIn >= 0) {
      closeIn -= ctx.rawDt;
      if (closeIn < 0) {
        closeIn = -1;
        if (!pinned && !pointerOverCard) closeCard();
      }
    }
  } else {
    activeIndex = -1;
    if (cardOpen || pinned) closeCard();
  }

  /* shard not interactive (still arriving / leaving) -> no card */
  if (cardOpen && cardIdx >= 0 && !shardStream.projectShards[cardIdx].interactive) closeCard();
  if (hoverIdx >= 0 && !shardStream.projectShards[hoverIdx].interactive) hoverIdx = -1;

  /* info card position (desktop: beside the shard; mobile: docked via CSS) */
  if (cardOpen && cardIdx >= 0 && !ctx.isMobile && shardStream.projectMeshes[cardIdx].visible) {
    shardStream.projectMeshes[cardIdx].getWorldPosition(_wPos);
    _cardV.copy(_wPos).project(ctx.camera);
    var csx = (_cardV.x * 0.5 + 0.5) * window.innerWidth;
    var csy = (-_cardV.y * 0.5 + 0.5) * window.innerHeight;
    var cleft = M.clamp(csx + 24, 8, Math.max(8, window.innerWidth - cardW - 8));
    var ctop = M.clamp(csy - cardH * 0.5, 8, Math.max(8, window.innerHeight - cardH - 8));
    if (Math.abs(cleft - lastX) > 0.5 || Math.abs(ctop - lastY) > 0.5) {
      lastX = cleft; lastY = ctop;
      cardEl.style.transform = 'translate(' + cleft.toFixed(1) + 'px,' + ctop.toFixed(1) + 'px)';
    }
  }
}

// resize: the card's on-screen size only matters while it is open
function refreshSize() {
  if (cardOpen) { cardW = cardInner.offsetWidth; cardH = cardInner.offsetHeight; }
}

const card = {
  init: init,
  update: update,
  refreshSize: refreshSize,
  activeIndex: function () { return activeIndex; },
  hoverIndex: function () { return hoverIdx; }
};

export default card;
