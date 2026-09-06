// Engine regression tests for Triad Arena.
//
// index.html has no build step and no test hooks of its own — these tests
// load the real page in headless Chromium and call the engine's own global
// functions/state directly via page.evaluate() (the same "direct
// state-injection" style used for ad-hoc manual testing throughout
// PROJECT.md), rather than driving the UI with clicks. That keeps tests
// fast and immune to unrelated markup/CSS changes, at the cost of not
// covering the UI wiring itself — see PROJECT.md section 9 for how manual
// click-through testing still fits alongside this.
//
// Run with: npm test  (needs `npx playwright install chromium` once).
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { startServer } from './server.mjs';

let server, baseURL, browser;

before(async () => {
  ({ server, baseURL } = await startServer());
  browser = await chromium.launch({ args: ['--no-sandbox'] });
});

after(async () => {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
});

async function newPage(){
  const page = await browser.newPage();
  const pageErrors = [];
  page.on('pageerror', e => pageErrors.push(e.message));
  // The page's CSS pulls Google Fonts over the network (see index.html's
  // @import) — blocking anything outside our own static server keeps
  // these tests fast and runnable offline, and the engine itself never
  // depends on the fonts actually loading.
  await page.route(url => !url.href.startsWith(baseURL), route => route.abort());
  await page.goto(baseURL + '/index.html');
  await page.waitForFunction(() => typeof state !== 'undefined');
  return { page, pageErrors };
}

function freshEntrySnippet(){
  // Injected into page.evaluate calls that need it — plain board entries,
  // matching the shape placeCard() builds (see index.html).
  return `function freshEntry(card, owner){ return { card, owner, shieldUsed:false, grantedShield:false, captureBonus:0 }; }`;
}

test('base engine: a stronger card captures a weaker adjacent enemy on placement', async () => {
  const { page, pageErrors } = await newPage();
  const captured = await page.evaluate(() => {
    state.board = Array(9).fill(null);
    state.wins = { blue: 0, red: 0 };
    const strong = findCardById('bahamut'); // 10/10/10/10-tier, wins against almost anything
    const weak = findCardById('ogre');
    state.board[1] = { card: weak, owner: 'red', shieldUsed:false, grantedShield:false, captureBonus:0 };
    const result = (function(){
      // Mirrors what placeCard does for the flip step, without the hand/UI bookkeeping.
      state.board[4] = { card: strong, owner: 'blue', shieldUsed:false, grantedShield:false, captureBonus:0 };
      return resolveFlips(4, 'blue');
    })();
    return { flips: result.flips, ownerAfter: state.board[1].owner };
  });
  assert.equal(captured.ownerAfter, 'blue');
  assert.ok(captured.flips >= 1);
  assert.deepEqual(pageErrors, []);
  await page.close();
});

// Tiamat's ultimate was rebuilt in a later session (see PROJECT.md) and no
// longer uses SpecialVerbs.debuffThisRound — these tests exercise the
// round-clock primitive directly instead of through a specific card, since
// no shipped card currently uses it (documented in PROJECT.md as a
// generic, currently-unused-but-available engine primitive).
test('round clock: SpecialVerbs.debuffThisRound expires after the target\'s next turn; debuff() stays permanent', async () => {
  const { page, pageErrors } = await newPage();
  const result = await page.evaluate(`(() => {
    ${freshEntrySnippet()}
    const dummy = findCardById('ogre');

    state.board = Array(9).fill(null);
    const weaken = freshEntry(dummy, 'red');
    state.board[1] = weaken; // sweepExpiredRoundEffects only scans state.board
    state.turnCount = 10;
    SpecialVerbs.debuffThisRound(weaken, 1);
    const afterCast = weaken.captureBonus;
    state.turnCount++; sweepExpiredRoundEffects();
    const afterOpponentTurn = weaken.captureBonus; // should still be weakened
    state.turnCount++; sweepExpiredRoundEffects();
    const afterOwnNextTurn = weaken.captureBonus; // should be back to 0

    const permanent = freshEntry(dummy, 'red');
    SpecialVerbs.debuff(permanent, 1);
    state.turnCount += 5; sweepExpiredRoundEffects();

    return { afterCast, afterOpponentTurn, afterOwnNextTurn, permanentAfterSweeps: permanent.captureBonus };
  })()`);
  assert.equal(result.afterCast, -1);
  assert.equal(result.afterOpponentTurn, -1, 'debuffThisRound should still apply through the opponent\'s reply');
  assert.equal(result.afterOwnNextTurn, 0, 'debuffThisRound should be gone by the caster\'s next turn');
  assert.equal(result.permanentAfterSweeps, -1, 'plain debuff() has no time limit and must not expire');
  assert.deepEqual(pageErrors, []);
  await page.close();
});

test('round clock: a "this round" effect is symmetric regardless of which side casts it', async () => {
  const { page, pageErrors } = await newPage();
  const result = await page.evaluate(`(() => {
    ${freshEntrySnippet()}
    const dummy = findCardById('ogre');
    state.board = Array(9).fill(null);
    const target = freshEntry(dummy, 'blue');
    state.board[7] = target; // sweepExpiredRoundEffects only scans state.board
    state.turnCount = 50;
    SpecialVerbs.debuffThisRound(target, 1);
    state.turnCount++; sweepExpiredRoundEffects();
    const afterOne = target.captureBonus;
    state.turnCount++; sweepExpiredRoundEffects();
    const afterTwo = target.captureBonus;
    return { afterOne, afterTwo };
  })()`);
  assert.equal(result.afterOne, -1);
  assert.equal(result.afterTwo, 0);
  assert.deepEqual(pageErrors, []);
  await page.close();
});

test('conquest banner: an AOE special (Pallis & Pell) triggers it on an actual capture', async () => {
  const { page, pageErrors } = await newPage();
  const result = await page.evaluate(`(() => {
    ${freshEntrySnippet()}
    state.board = Array(9).fill(null);
    state.board[4] = freshEntry(findCardById('pallispell'), 'blue');
    state.board[1] = freshEntry(findCardById('ogre'), 'red');
    state.wins = { blue: 5, red: 5 };
    state.specialUsed = {};
    state.conquestPopup = false;
    runSpecialResolution(4, null, {});
    return { ownerAfter: state.board[1].owner, conquestPopup: state.conquestPopup };
  })()`);
  assert.equal(result.ownerAfter, 'blue');
  assert.equal(result.conquestPopup, 'blue');
  assert.deepEqual(pageErrors, []);
  await page.close();
});

test('conquest banner: a non-capturing special (Deathblade\'s swap) does not trigger it', async () => {
  const { page, pageErrors } = await newPage();
  const result = await page.evaluate(`(() => {
    ${freshEntrySnippet()}
    state.board = Array(9).fill(null);
    state.board[4] = freshEntry(findCardById('deathblade'), 'blue');
    state.board[1] = freshEntry(findCardById('tiamat'), 'red');
    state.wins = { blue: 5, red: 5 };
    state.specialUsed = {};
    state.conquestPopup = false;
    runSpecialResolution(4, 1, {});
    return { conquestPopup: state.conquestPopup };
  })()`);
  assert.equal(result.conquestPopup, false);
  assert.deepEqual(pageErrors, []);
  await page.close();
});

test('conquest banner: a stale justFlipped flag elsewhere on the board is not a false positive', async () => {
  const { page, pageErrors } = await newPage();
  const result = await page.evaluate(`(() => {
    ${freshEntrySnippet()}
    state.board = Array(9).fill(null);
    const stale = freshEntry(findCardById('ogre'), 'blue');
    stale.justFlipped = true; // leftover from an earlier, already-resolved action
    state.board[0] = stale;
    state.board[4] = freshEntry(findCardById('torn'), 'blue'); // AOE debuff, never captures
    state.board[1] = freshEntry(findCardById('ogre'), 'red');
    state.wins = { blue: 5, red: 5 };
    state.specialUsed = {};
    state.conquestPopup = false;
    runSpecialResolution(4, null, {});
    return { conquestPopup: state.conquestPopup };
  })()`);
  assert.equal(result.conquestPopup, false);
  assert.deepEqual(pageErrors, []);
  await page.close();
});

// Tiamat, The Celestial Judgment, The Infinite Seraph and The Eclipse
// Fenrir were redesigned in a later session from new source art (see
// PROJECT.md section 5) — these cover the new shared primitives
// (active.boardLeadBonus / active.debuffImmune) and each card's rebuilt
// ultimate.
test('Tiamat: rebuilt Fivefold Apocalypse captures with a permanent +1 on win', async () => {
  const { page, pageErrors } = await newPage();
  const result = await page.evaluate(`(() => {
    ${freshEntrySnippet()}
    state.board = Array(9).fill(null);
    const src = freshEntry(findCardById('tiamat'), 'blue');
    const target = freshEntry(findCardById('ogre'), 'red');
    state.board[4] = src;
    state.board[1] = target;
    SPECIAL_HANDLERS.tiamat({ srcEntry: src, targetEntry: target, targetIndex: 1, owner: 'blue' });
    return { capturedOwner: target.owner, srcPermanentBonus: src.captureBonus };
  })()`);
  assert.equal(result.capturedOwner, 'blue');
  assert.equal(result.srcPermanentBonus, 1);
  assert.deepEqual(pageErrors, []);
  await page.close();
});

test('active.boardLeadBonus: strict lead (Tiamat) vs. tie-counts (The Celestial Judgment)', async () => {
  const { page, pageErrors } = await newPage();
  const result = await page.evaluate(`(() => {
    ${freshEntrySnippet()}
    // Tied board count (1 vs 1): Tiamat's "more than" requirement should NOT apply...
    state.board = Array(9).fill(null);
    state.board[0] = freshEntry(findCardById('tiamat'), 'blue');
    state.board[1] = freshEntry(findCardById('ogre'), 'red');
    state.playerHand = [1,2]; state.enemyHand = [1,2]; // length >= 2 so lastStandBonus contributes 0
    const tiamatTied = fullEffectiveValue(findCardById('tiamat'), 'top', null, 0, 'blue', 'attack');
    // ...but a strict lead (2 vs 1) should.
    state.board[2] = freshEntry(findCardById('ogre'), 'blue');
    const tiamatLeading = fullEffectiveValue(findCardById('tiamat'), 'top', null, 0, 'blue', 'attack');

    // The Celestial Judgment's Balance uses orEqual: true, so a tie DOES apply.
    state.board = Array(9).fill(null);
    state.board[0] = freshEntry(findCardById('celestialjudgment'), 'blue');
    state.board[1] = freshEntry(findCardById('ogre'), 'red');
    const judgmentTied = fullEffectiveValue(findCardById('celestialjudgment'), 'top', null, 0, 'blue', 'attack');

    return {
      tiamatTiedBonus: tiamatTied - findCardById('tiamat').top,
      tiamatLeadingBonus: tiamatLeading - findCardById('tiamat').top,
      judgmentTiedBonus: judgmentTied - findCardById('celestialjudgment').top,
    };
  })()`);
  assert.equal(result.tiamatTiedBonus, 0, 'a tie should not satisfy Tiamat\'s strict "more than" requirement');
  assert.equal(result.tiamatLeadingBonus, 1, 'a strict lead should grant Tiamat\'s +1');
  assert.equal(result.judgmentTiedBonus, 1, 'a tie should satisfy Judgment\'s orEqual requirement');
  assert.deepEqual(pageErrors, []);
  await page.close();
});

test('The Celestial Judgment: Eternal Verdict destroys a weak facing side, debuffs a strong one', async () => {
  const { page, pageErrors } = await newPage();
  const result = await page.evaluate(`(() => {
    ${freshEntrySnippet()}
    state.board = Array(9).fill(null);
    const src = freshEntry(findCardById('celestialjudgment'), 'blue');
    state.board[4] = src;
    const fragile = { id:'fragile-test', name:'Fragile', top:2, right:5, bottom:5, left:5 };
    const sturdy = { id:'sturdy-test', name:'Sturdy', top:8, right:5, bottom:5, left:5 };
    state.board[1] = freshEntry(fragile, 'red'); // directly 'up' from center
    SPECIAL_HANDLERS.celestialjudgment({ srcEntry: src, sourceIndex: 4, owner: 'blue', direction: 'up' });
    const fragileResult = state.board[1];

    state.board = Array(9).fill(null);
    state.board[4] = freshEntry(findCardById('celestialjudgment'), 'blue');
    state.board[1] = freshEntry(sturdy, 'red');
    SPECIAL_HANDLERS.celestialjudgment({ srcEntry: state.board[4], sourceIndex: 4, owner: 'blue', direction: 'up' });
    const sturdyResult = state.board[1];

    return {
      fragileDestroyed: fragileResult === null,
      sturdyDebuff: sturdyResult ? sturdyResult.captureBonus : 'missing',
    };
  })()`);
  assert.equal(result.fragileDestroyed, true, 'a facing side of 3 or less should be destroyed outright');
  assert.equal(result.sturdyDebuff, -1, 'a facing side above 3 should just get -1 permanently');
  assert.deepEqual(pageErrors, []);
  await page.close();
});

test('The Infinite Seraph: Eternal Presence blocks Vaelira\'s destroy-all, but not without her present', async () => {
  const { page, pageErrors } = await newPage();
  const result = await page.evaluate(`(() => {
    ${freshEntrySnippet()}
    state.board = Array(9).fill(null);
    state.board[0] = freshEntry(findCardById('vaelira'), 'blue');
    state.board[1] = freshEntry(findCardById('ogre'), 'red');
    state.board[2] = freshEntry(findCardById('infiniteseraph'), 'red');
    const blockedMsg = SPECIAL_HANDLERS.vaelira({ srcEntry: state.board[0], owner: 'blue' });
    const survivedWithSeraph = state.board[1] !== null;

    state.board = Array(9).fill(null);
    state.board[0] = freshEntry(findCardById('vaelira'), 'blue');
    state.board[1] = freshEntry(findCardById('ogre'), 'red');
    SPECIAL_HANDLERS.vaelira({ srcEntry: state.board[0], owner: 'blue' });
    const destroyedWithoutSeraph = state.board[1] === null;

    return { survivedWithSeraph, blockedMsg, destroyedWithoutSeraph };
  })()`);
  assert.equal(result.survivedWithSeraph, true);
  assert.ok(result.blockedMsg.includes('Eternal Presence'));
  assert.equal(result.destroyedWithoutSeraph, true, 'without Eternal Presence, Infernal Pact should destroy as normal');
  assert.deepEqual(pageErrors, []);
  await page.close();
});

test('The Eclipse Fenrir: Eternal Loyalty makes him immune to debuff() and debuffThisRound()', async () => {
  const { page, pageErrors } = await newPage();
  const result = await page.evaluate(`(() => {
    ${freshEntrySnippet()}
    const fenrir = freshEntry(findCardById('fenrir'), 'red');
    SpecialVerbs.debuff(fenrir, 5);
    const afterDebuff = fenrir.captureBonus;
    SpecialVerbs.debuffThisRound(fenrir, 5);
    return { afterDebuff, afterDebuffThisRound: fenrir.captureBonus, tempEffects: (fenrir.tempEffects || []).length };
  })()`);
  assert.equal(result.afterDebuff, 0);
  assert.equal(result.afterDebuffThisRound, 0);
  assert.equal(result.tempEffects, 0);
  assert.deepEqual(pageErrors, []);
  await page.close();
});

// Three Head Dragon was redesigned from a new source poster in the same
// later session as Tiamat/Judgment/Seraph/Fenrir above (see PROJECT.md
// section 5) — it's the card that finally gives the round-clock a live
// user again after Tiamat's rebuild retired its only previous one.
test('Three Head Dragon: on-place passive hits only each enemy\'s own weakest side', async () => {
  const { page, pageErrors } = await newPage();
  const result = await page.evaluate(`(() => {
    ${freshEntrySnippet()}
    state.board = Array(9).fill(null);
    state.playerHand = [findCardById('threeheaddragon')];
    const asym = { id:'asym-test', name:'Asym', top:8, right:3, bottom:9, left:7 };
    state.board[1] = freshEntry(asym, 'red');
    placeCard(4, 'threeheaddragon', 'blue');
    const sb = state.board[1].sideBonus || {};
    return { weakestSideHit: sb.right || 0, otherSidesUntouched: (sb.top||0) + (sb.bottom||0) + (sb.left||0) };
  })()`);
  assert.equal(result.weakestSideHit, -1);
  assert.equal(result.otherSidesUntouched, 0);
  assert.deepEqual(pageErrors, []);
  await page.close();
});

test('Three Head Dragon: Ice\'s Breath freezes a defender unless it has debuffImmune', async () => {
  const { page, pageErrors } = await newPage();
  const result = await page.evaluate(`(() => {
    state.playerHand = [1,2]; state.enemyHand = [1,2];
    const dragon = findCardById('threeheaddragon');
    const dummy = { id:'dummy-test', name:'Dummy', top:5, right:5, bottom:5, left:5 };
    const normalDefense = fullEffectiveValue(dummy, 'top', dragon, 99, 'red', 'defense') - dummy.top;
    const fenrirCard = findCardById('fenrir');
    const fenrirDefense = fullEffectiveValue(fenrirCard, 'top', dragon, 99, 'red', 'defense') - fenrirCard.top;
    return { normalDefense, fenrirDefense };
  })()`);
  assert.equal(result.normalDefense, -2);
  assert.equal(result.fenrirDefense, 0, 'Eternal Loyalty (debuffImmune) should block the freeze too');
  assert.deepEqual(pageErrors, []);
  await page.close();
});

test('Three Head Dragon: Fire\'s Wrath hits enemy neighbors of a just-captured square, not the winner\'s own', async () => {
  const { page, pageErrors } = await newPage();
  const result = await page.evaluate(`(() => {
    ${freshEntrySnippet()}
    state.board = Array(9).fill(null);
    state.playerHand = [findCardById('threeheaddragon')];
    state.board[1] = freshEntry({ id:'weak1', name:'Weak1', top:1,right:1,bottom:1,left:1 }, 'red');
    state.board[0] = freshEntry({ id:'neighbor1', name:'Neighbor1', top:5,right:5,bottom:5,left:5 }, 'red');
    state.board[2] = freshEntry({ id:'neighbor2', name:'Neighbor2', top:5,right:5,bottom:5,left:5 }, 'blue');
    placeCard(4, 'threeheaddragon', 'blue');
    return { capturedOwner: state.board[1].owner, enemyNeighborHit: state.board[0].captureBonus, ownNeighborUntouched: state.board[2].captureBonus };
  })()`);
  assert.equal(result.capturedOwner, 'blue');
  assert.equal(result.enemyNeighborHit, -1);
  assert.equal(result.ownNeighborUntouched, 0);
  assert.deepEqual(pageErrors, []);
  await page.close();
});

test('active.destroyImmune: Vaelira/Nyxara skip it, The Celestial Judgment debuffs instead of destroying', async () => {
  const { page, pageErrors } = await newPage();
  const result = await page.evaluate(`(() => {
    ${freshEntrySnippet()}
    state.board = Array(9).fill(null);
    state.board[0] = freshEntry(findCardById('vaelira'), 'blue');
    state.board[1] = freshEntry(findCardById('threeheaddragon'), 'red');
    state.board[2] = freshEntry(findCardById('ogre'), 'red');
    SPECIAL_HANDLERS.vaelira({ srcEntry: state.board[0], owner: 'blue' });
    const immuneSurvived = state.board[1] !== null;
    const normalDestroyed = state.board[2] === null;

    state.board = Array(9).fill(null);
    state.board[4] = freshEntry(findCardById('celestialjudgment'), 'blue');
    const fragileImmune = { id:'fragile-immune', name:'FragileImmune', top:2, right:5, bottom:5, left:5, active:{ destroyImmune:true } };
    state.board[1] = freshEntry(fragileImmune, 'red');
    SPECIAL_HANDLERS.celestialjudgment({ srcEntry: state.board[4], sourceIndex: 4, owner: 'blue', direction: 'up' });

    return { immuneSurvived, normalDestroyed, judgmentDebuffedInstead: state.board[1] ? state.board[1].captureBonus : 'destroyed' };
  })()`);
  assert.equal(result.immuneSurvived, true);
  assert.equal(result.normalDestroyed, true);
  assert.equal(result.judgmentDebuffedInstead, -1);
  assert.deepEqual(pageErrors, []);
  await page.close();
});

test('Three Head Dragon: Apokalyps debuffs all enemies for the rest of the round, then expires', async () => {
  const { page, pageErrors } = await newPage();
  const result = await page.evaluate(`(() => {
    ${freshEntrySnippet()}
    state.board = Array(9).fill(null);
    const dragonSrc = freshEntry(findCardById('threeheaddragon'), 'blue');
    const enemy = freshEntry({ id:'e1', name:'E1', top:5,right:5,bottom:5,left:5 }, 'red');
    state.board[0] = dragonSrc;
    state.board[1] = enemy;
    state.turnCount = 100;
    SPECIAL_HANDLERS.threeheaddragon({ srcEntry: dragonSrc, owner: 'blue' });
    const afterCast = enemy.captureBonus;
    state.turnCount++; sweepExpiredRoundEffects();
    const afterOneSweep = enemy.captureBonus;
    state.turnCount++; sweepExpiredRoundEffects();
    const afterTwoSweeps = enemy.captureBonus;
    return { afterCast, afterOneSweep, afterTwoSweeps };
  })()`);
  assert.equal(result.afterCast, -3);
  assert.equal(result.afterOneSweep, -3, 'should still apply through the opponent\'s reply');
  assert.equal(result.afterTwoSweeps, 0, 'should be gone by the caster\'s next turn');
  assert.deepEqual(pageErrors, []);
  await page.close();
});

// Playtester feedback: retrying a failed Campaign stage forced a full
// reselect of all five champions every time. resetGame() now preserves
// state.selected when draftMode is 'campaign' (Random/Choose Your Five
// still clear it, unchanged — see resetGame() in index.html).
test('Campaign: retrying a stage keeps the same five champions pre-checked', async () => {
  const { page, pageErrors } = await newPage();

  await page.evaluate(() => {
    campaignProgress = { stageIndex: 1, unlocked: ['templaren'], ngPlus: 0 };
    saveCampaignProgress();
    state.draftMode = 'campaign';
    state.selected = ['graff', 'elara', 'sarah', 'zaevir', 'templaren'];
    startCampaignBattle();
  });
  await page.waitForFunction(() => state.phase === 'battle', { timeout: 5000 });

  // Force a loss deterministically rather than playing it out.
  await page.evaluate(() => {
    const stage = currentCampaignStage();
    state.board = stage.enemyIds.slice(0, 5)
      .map(id => ({ card: findCardById(id), owner: 'red', shieldUsed: false, grantedShield: false, captureBonus: 0 }))
      .concat(Array(4).fill(null));
    state.playerHand = [];
    state.enemyHand = [];
    finishGame();
  });
  await page.waitForFunction(() => state.phase === 'result', { timeout: 5000 });

  await page.click('#campaign-retry-btn');
  await page.waitForTimeout(200);

  const result = await page.evaluate(() => ({
    phase: state.phase,
    selected: state.selected.slice(),
    checkedCount: document.querySelectorAll('.draft-grid .card.selected').length,
    beginBtnDisabled: document.getElementById('campaign-begin-btn')?.disabled,
  }));

  assert.equal(result.phase, 'draft');
  assert.deepEqual(result.selected.sort(), ['elara', 'graff', 'sarah', 'templaren', 'zaevir']);
  assert.equal(result.checkedCount, 5, 'all five should render as checked in the picker grid');
  assert.equal(result.beginBtnDisabled, false, 'Begin Stage should be immediately clickable');
  assert.deepEqual(pageErrors, []);
  await page.close();
});

test('Random Draft / Choose Your Five: resetGame() still clears the selection (unchanged)', async () => {
  const { page, pageErrors } = await newPage();
  const result = await page.evaluate(() => {
    state.draftMode = 'random';
    state.selected = ['graff', 'elara', 'sarah', 'zaevir', 'templaren'];
    resetGame();
    const randomAfter = state.selected.slice();

    state.draftMode = 'manual';
    state.selected = ['graff', 'elara', 'sarah', 'zaevir', 'templaren'];
    resetGame();
    const manualAfter = state.selected.slice();

    return { randomAfter, manualAfter };
  });
  assert.deepEqual(result.randomAfter, []);
  assert.deepEqual(result.manualAfter, []);
  assert.deepEqual(pageErrors, []);
  await page.close();
});

// Playtester request: the Triple Triad Sisters (Campaign stage 17's boss
// trio) were originally FOREST_FOES-only by explicit earlier design. Made
// playable in a later session — duplicated into HEROES, and stage 17 now
// hands them out as its unlockIds reward instead of an empty array.
test('The Triple Triad Sisters are playable: in HEROES, and their mechanics work owned by blue', async () => {
  const { page, pageErrors } = await newPage();
  const result = await page.evaluate(`(() => {
    ${freshEntrySnippet()}
    const out = {};
    out.inHeroes = ['vaelira','seraphine','nyxara'].every(id => HEROES.some(h => h.id === id));
    out.stillInForestFoes = ['vaelira','seraphine','nyxara'].every(id => FOREST_FOES.some(f => f.id === id));

    state.board = Array(9).fill(null);
    state.board[0] = freshEntry(findCardById('vaelira'), 'blue');
    state.board[1] = freshEntry(findCardById('seraphine'), 'blue');
    state.playerHand = [1,2]; state.enemyHand = [1,2];
    out.sisterAuraBonusForBlue = fullEffectiveValue(findCardById('vaelira'), 'top', null, 0, 'blue', 'attack') - findCardById('vaelira').top;

    state.board = Array(9).fill(null);
    state.playerHand = [findCardById('vaelira')];
    state.board[1] = freshEntry(findCardById('ogre'), 'red');
    placeCard(4, 'vaelira', 'blue');
    out.onPlaceBurnByBlue = state.board[1].captureBonus;

    state.board = Array(9).fill(null);
    const src = freshEntry(findCardById('vaelira'), 'blue');
    const enemy = freshEntry(findCardById('ogre'), 'red');
    state.board[0] = src;
    state.board[1] = enemy;
    SPECIAL_HANDLERS.vaelira({ srcEntry: src, owner: 'blue' });
    out.blueVaeliraDestroyedEnemy = state.board[1] === null;

    out.stage17UnlockIds = CAMPAIGN_STAGES[16].unlockIds.slice().sort();
    return out;
  })()`);
  assert.equal(result.inHeroes, true);
  assert.equal(result.stillInForestFoes, true, 'they should still work as Campaign stage 17\'s enemy hand too');
  assert.equal(result.sisterAuraBonusForBlue, 2, 'sisterAura should apply regardless of which side owns them');
  assert.equal(result.onPlaceBurnByBlue, -2);
  assert.equal(result.blueVaeliraDestroyedEnemy, true);
  assert.deepEqual(result.stage17UnlockIds, ['nyxara', 'seraphine', 'vaelira']);
  assert.deepEqual(pageErrors, []);
  await page.close();
});

// Playtester feedback: Campaign stage 2+ felt too hard with only 5 cards
// (starters + whatever had been unlocked so far) to choose from. On the
// user's explicit request, campaignPool() no longer gates card access by
// progression — every HEROES card is selectable from stage 2 onward.
// campaignProgress.unlocked / CAMPAIGN_STAGES' unlockIds are unchanged
// (still tracked, still drive the result screen's "new champions joined
// your story" beat) — they just no longer restrict the picker.
test('Campaign: every HEROES card is selectable from stage 2 onward, regardless of unlocked progress', async () => {
  const { page, pageErrors } = await newPage();

  const result = await page.evaluate(() => {
    campaignProgress = { stageIndex: 1, unlocked: [], ngPlus: 0 }; // stage 2, nothing unlocked yet
    saveCampaignProgress();
    state.draftMode = 'campaign';
    state.selected = [];
    render();
    return {
      poolSize: campaignPool().length,
      heroesSize: HEROES.length,
      draftGridCards: document.querySelectorAll('.draft-grid .card').length,
    };
  });

  assert.equal(result.poolSize, result.heroesSize, 'campaignPool() should return every HEROES card');
  assert.equal(result.draftGridCards, result.heroesSize, 'the picker grid should render every HEROES card');
  assert.deepEqual(pageErrors, []);
  await page.close();
});

// Triune Desire — a fourth Triple Triad Sisters card (the three fused
// into one boss), added in a later session from a new source poster,
// playable from the start (see PROJECT.md section 5).
test('Triune Desire: Crimson Allure locks a random enemy\'s Special Attack for one round', async () => {
  const { page, pageErrors } = await newPage();
  const result = await page.evaluate(`(() => {
    ${freshEntrySnippet()}
    state.board = Array(9).fill(null);
    state.playerHand = [findCardById('triunedesire')];
    state.board[1] = freshEntry(findCardById('ogre'), 'red');
    state.turnCount = 50;
    placeCard(4, 'triunedesire', 'blue');
    const target = state.board[1];
    const withSpecial = { ...target.card, special: { name:'Test', cost:0, once:false, targets:'aoe' } };
    target.card = withSpecial;
    const lockedAtCast = specialUsable(withSpecial, 'red', target);
    state.turnCount++;
    const lockedAfterOpponentTurn = specialUsable(withSpecial, 'red', target);
    state.turnCount++;
    const unlockedAtCasterNextTurn = specialUsable(withSpecial, 'red', target);
    return { lockedAtCast, lockedAfterOpponentTurn, unlockedAtCasterNextTurn };
  })()`);
  assert.equal(result.lockedAtCast, false);
  assert.equal(result.lockedAfterOpponentTurn, false, 'should still be locked through the opponent\'s reply');
  assert.equal(result.unlockedAtCasterNextTurn, true, 'should unlock by the caster\'s next turn');
  assert.deepEqual(pageErrors, []);
  await page.close();
});

test('Triune Desire: Void Embrace buffs the whole team on any win, capped at +3', async () => {
  const { page, pageErrors } = await newPage();
  const result = await page.evaluate(`(() => {
    ${freshEntrySnippet()}
    state.board = Array(9).fill(null);
    state.playerHand = [findCardById('triunedesire')];
    const ally = freshEntry({ id:'ally-test', name:'Ally', top:5,right:5,bottom:5,left:5 }, 'blue');
    state.board[0] = ally;
    [1,7,3,5].forEach(i => { state.board[i] = freshEntry({ id:'weak'+i, name:'Weak', top:1,right:1,bottom:1,left:1 }, 'red'); });
    placeCard(4, 'triunedesire', 'blue'); // 4 adjacent captures in one placement
    return { allyBoost: ally.captureBonus };
  })()`);
  assert.equal(result.allyBoost, 3, 'four wins in one placement should still cap the stack at +3');
  assert.deepEqual(pageErrors, []);
  await page.close();
});

test('Triune Desire: Divine Temptation buffs your side and debuffs enemies (except debuffImmune)', async () => {
  const { page, pageErrors } = await newPage();
  const result = await page.evaluate(`(() => {
    ${freshEntrySnippet()}
    state.board = Array(9).fill(null);
    state.board[0] = freshEntry(findCardById('triunedesire'), 'blue');
    const ownCard = { id:'own-test', name:'Own', top:5,right:5,bottom:5,left:5 };
    const enemyCard = { id:'enemy-test', name:'Enemy', top:5,right:5,bottom:5,left:5 };
    state.board[1] = freshEntry(ownCard, 'blue');
    state.board[2] = freshEntry(enemyCard, 'red');
    state.playerHand = [1,2]; state.enemyHand = [1,2];
    const fenrirCard = findCardById('fenrir');
    state.board[3] = freshEntry(fenrirCard, 'red');
    return {
      ownBoost: fullEffectiveValue(ownCard, 'top', null, 1, 'blue', 'attack') - ownCard.top,
      enemyDebuff: fullEffectiveValue(enemyCard, 'top', null, 2, 'red', 'attack') - enemyCard.top,
      fenrirUnaffected: fullEffectiveValue(fenrirCard, 'top', null, 3, 'red', 'attack') - fenrirCard.top,
    };
  })()`);
  assert.equal(result.ownBoost, 1);
  assert.equal(result.enemyDebuff, -1);
  assert.equal(result.fenrirUnaffected, 0, 'Eternal Loyalty should block the aura debuff too');
  assert.deepEqual(pageErrors, []);
  await page.close();
});

test('Triune Desire: Sister\'s Will frees the Ultimate with just 1 sister (Nyxara still needs 2)', async () => {
  const { page, pageErrors } = await newPage();
  const result = await page.evaluate(`(() => {
    ${freshEntrySnippet()}
    state.board = Array(9).fill(null);
    const triuneSrc = freshEntry(findCardById('triunedesire'), 'blue');
    state.board[0] = triuneSrc;
    state.board[1] = freshEntry(findCardById('vaelira'), 'blue');
    state.wins = { blue: 0, red: 0 };
    state.specialUsed = {};
    const triuneFree = specialUsable(triuneSrc.card, 'blue', triuneSrc);

    state.board = Array(9).fill(null);
    const nyxaraSrc = freshEntry(findCardById('nyxara'), 'blue');
    state.board[0] = nyxaraSrc;
    state.board[1] = freshEntry(findCardById('vaelira'), 'blue');
    state.wins = { blue: 0, red: 0 };
    const nyxaraStillGated = specialUsable(nyxaraSrc.card, 'blue', nyxaraSrc);

    return { triuneFree, nyxaraStillGated };
  })()`);
  assert.equal(result.triuneFree, true, 'Triune Desire only needs 1 of the 3 sisters present');
  assert.equal(result.nyxaraStillGated, false, 'Nyxara still needs both other sisters, unaffected by the generalization');
  assert.deepEqual(pageErrors, []);
  await page.close();
});

test('Triune Desire: Forbidden Harmony destroys adjacent enemies (respecting destroyImmune) and locks the rest', async () => {
  const { page, pageErrors } = await newPage();
  const result = await page.evaluate(`(() => {
    ${freshEntrySnippet()}
    state.board = Array(9).fill(null);
    const src = freshEntry(findCardById('triunedesire'), 'blue');
    state.board[4] = src;
    state.board[1] = freshEntry(findCardById('ogre'), 'red');
    state.board[3] = freshEntry(findCardById('threeheaddragon'), 'red'); // destroyImmune
    state.turnCount = 200;
    SPECIAL_HANDLERS.triunedesire({ srcEntry: src, sourceIndex: 4, owner: 'blue' });
    return {
      normalDestroyed: state.board[1] === null,
      immuneSurvived: state.board[3] !== null,
      immuneStillLocked: state.board[3] ? state.board[3].specialLockedUntilTurnCount > state.turnCount : false,
    };
  })()`);
  assert.equal(result.normalDestroyed, true);
  assert.equal(result.immuneSurvived, true);
  assert.equal(result.immuneStillLocked, true, 'destroyImmune blocks destruction but not the ability-lock');
  assert.deepEqual(pageErrors, []);
  await page.close();
});

test('Graveyard optional rule: destroyCard() records only when the rule is enabled', async () => {
  const { page, pageErrors } = await newPage();
  const result = await page.evaluate(`(() => {
    ${freshEntrySnippet()}
    state.board = Array(9).fill(null);
    state.rules.graveyard = false;
    state.graveyard = { blue: [], red: [] };
    state.board[1] = freshEntry(findCardById('ogre'), 'red');
    destroyCard(1);
    const ruleOff = { recorded: state.graveyard.red.length, boardCleared: state.board[1] === null };

    state.board = Array(9).fill(null);
    state.rules.graveyard = true;
    state.graveyard = { blue: [], red: [] };
    state.board[2] = freshEntry(findCardById('ogre'), 'red');
    destroyCard(2);
    const ruleOn = { recorded: state.graveyard.red.length, cardId: state.graveyard.red[0] && state.graveyard.red[0].id, boardCleared: state.board[2] === null };

    // destroying an already-empty cell must not throw or push undefined
    destroyCard(5);
    const emptyCellSafe = state.graveyard.blue.length === 0 && state.graveyard.red.length === 1;

    return { ruleOff, ruleOn, emptyCellSafe };
  })()`);
  assert.equal(result.ruleOff.recorded, 0, 'no record when the rule is off');
  assert.equal(result.ruleOff.boardCleared, true);
  assert.equal(result.ruleOn.recorded, 1, 'destroyed card recorded when the rule is on');
  assert.equal(result.ruleOn.cardId, 'ogre');
  assert.equal(result.ruleOn.boardCleared, true);
  assert.equal(result.emptyCellSafe, true, 'destroying an empty cell is a safe no-op');
  assert.deepEqual(pageErrors, []);
  await page.close();
});

test('Graveyard optional rule: every destroy-capable Special routes through destroyCard()', async () => {
  const { page, pageErrors } = await newPage();
  const result = await page.evaluate(`(() => {
    ${freshEntrySnippet()}
    state.rules.graveyard = true;

    // Vaelira's Infernal Pact (aoe destroy-all)
    state.board = Array(9).fill(null);
    state.graveyard = { blue: [], red: [] };
    const vSrc = freshEntry(findCardById('vaelira'), 'blue');
    state.board[0] = vSrc;
    state.board[1] = freshEntry(findCardById('ogre'), 'red');
    SPECIAL_HANDLERS.vaelira({ srcEntry: vSrc, owner: 'blue' });
    const vaelira = state.graveyard.red.length === 1 && state.graveyard.red[0].id === 'ogre';

    // Nyxara's Void Dominion (aoe destroy-all)
    state.board = Array(9).fill(null);
    state.graveyard = { blue: [], red: [] };
    const nSrc = freshEntry(findCardById('nyxara'), 'blue');
    state.board[0] = nSrc;
    state.board[1] = freshEntry(findCardById('ogre'), 'red');
    SPECIAL_HANDLERS.nyxara({ srcEntry: nSrc, owner: 'blue' });
    const nyxara = state.graveyard.red.length === 1 && state.graveyard.red[0].id === 'ogre';

    // Triune Desire's Forbidden Harmony (directional adjacent destroy)
    state.board = Array(9).fill(null);
    state.graveyard = { blue: [], red: [] };
    const tSrc = freshEntry(findCardById('triunedesire'), 'blue');
    state.board[4] = tSrc;
    state.board[1] = freshEntry(findCardById('ogre'), 'red');
    state.turnCount = 200;
    SPECIAL_HANDLERS.triunedesire({ srcEntry: tSrc, sourceIndex: 4, owner: 'blue' });
    const triunedesire = state.graveyard.red.length === 1 && state.graveyard.red[0].id === 'ogre';

    // resetGame() clears any leftover graveyard between matches
    state.graveyard.blue.push(findCardById('ogre'));
    resetGame();
    const resetClears = state.graveyard.blue.length === 0 && state.graveyard.red.length === 0;

    return { vaelira, nyxara, triunedesire, resetClears };
  })()`);
  assert.equal(result.vaelira, true, "Vaelira's Infernal Pact kills land in the graveyard");
  assert.equal(result.nyxara, true, "Nyxara's Void Dominion kills land in the graveyard");
  assert.equal(result.triunedesire, true, "Triune Desire's Forbidden Harmony kills land in the graveyard");
  assert.equal(result.resetClears, true, 'resetGame() clears the graveyard for the next match');
  assert.deepEqual(pageErrors, []);
  await page.close();
});

test('a full Random Draft game runs from draft to a result with no errors', async () => {
  const { page, pageErrors } = await newPage();

  await page.evaluate(() => {
    state.selected = HEROES.slice(0, 5).map(h => h.id);
    state.draftMode = 'random';
    startBattle();
  });
  await page.waitForFunction(() => state.phase === 'battle', { timeout: 5000 });

  for(let i = 0; i < 20; i++){
    await page.waitForFunction(
      () => state.phase === 'result' || state.turn === 'blue',
      { timeout: 8000 }
    );
    if(await page.evaluate(() => state.phase === 'result')) break;
    await page.evaluate(() => {
      if(state.placedThisTurn){ endPlayerTurn(); return; }
      const emptyIdx = state.board.findIndex(c => !c);
      const cardId = state.playerHand[0] && state.playerHand[0].id;
      if(emptyIdx === -1 || !cardId){ endPlayerTurn(); return; }
      placeCard(emptyIdx, cardId, 'blue');
    });
    await page.waitForTimeout(300);
  }

  const finalPhase = await page.evaluate(() => state.phase);
  assert.equal(finalPhase, 'result');
  assert.deepEqual(pageErrors, []);
  await page.close();
});
