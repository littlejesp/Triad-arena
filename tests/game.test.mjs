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
test('round clock: SpecialVerbs.debuffThisRound expires after the caster\'s own next turn (4 ticks); debuff() stays permanent', async () => {
  const { page, pageErrors } = await newPage();
  const result = await page.evaluate(`(() => {
    ${freshEntrySnippet()}
    const dummy = findCardById('ogre');

    // Widened from the original 2-tick window (opponent's reply only) to 4
    // (through the caster's OWN next turn too) — the original 2-tick window
    // meant a "this round" grant from something that doesn't itself attack
    // immediately (e.g. an AOE Ultimate) was usually already gone again by
    // the caster's very next turn unless they capitalized on it in the same
    // turn they cast it, which read as "the debuff did nothing" in practice
    // (reported against Shiva's Diamond Storm). See sweepExpiredRoundEffects().
    state.board = Array(9).fill(null);
    const weaken = freshEntry(dummy, 'red');
    state.board[1] = weaken; // sweepExpiredRoundEffects only scans state.board
    state.turnCount = 10;
    SpecialVerbs.debuffThisRound(weaken, 1);
    const afterCast = weaken.captureBonus;
    state.turnCount++; sweepExpiredRoundEffects();
    const afterOpponentTurn = weaken.captureBonus; // tick 1: still weakened
    state.turnCount++; sweepExpiredRoundEffects();
    const afterOwnNextTurn = weaken.captureBonus; // tick 2 (caster's own next turn): still weakened now
    state.turnCount++; sweepExpiredRoundEffects();
    const afterSecondOpponentTurn = weaken.captureBonus; // tick 3: still weakened
    state.turnCount++; sweepExpiredRoundEffects();
    const afterExpiry = weaken.captureBonus; // tick 4: back to 0

    const permanent = freshEntry(dummy, 'red');
    SpecialVerbs.debuff(permanent, 1);
    state.turnCount += 5; sweepExpiredRoundEffects();

    return { afterCast, afterOpponentTurn, afterOwnNextTurn, afterSecondOpponentTurn, afterExpiry, permanentAfterSweeps: permanent.captureBonus };
  })()`);
  assert.equal(result.afterCast, -1);
  assert.equal(result.afterOpponentTurn, -1, 'debuffThisRound should still apply through the opponent\'s reply');
  assert.equal(result.afterOwnNextTurn, -1, 'debuffThisRound should still apply on the caster\'s own next turn — the whole point of the widened window');
  assert.equal(result.afterSecondOpponentTurn, -1, 'debuffThisRound should still apply through the opponent\'s second reply');
  assert.equal(result.afterExpiry, 0, 'debuffThisRound should be gone after 4 ticks');
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
    state.turnCount++; sweepExpiredRoundEffects();
    const afterThree = target.captureBonus;
    state.turnCount++; sweepExpiredRoundEffects();
    const afterFour = target.captureBonus;
    return { afterOne, afterTwo, afterThree, afterFour };
  })()`);
  assert.equal(result.afterOne, -1);
  assert.equal(result.afterTwo, -1);
  assert.equal(result.afterThree, -1);
  assert.equal(result.afterFour, 0);
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
    state.turnCount++; sweepExpiredRoundEffects();
    const afterThreeSweeps = enemy.captureBonus;
    state.turnCount++; sweepExpiredRoundEffects();
    const afterFourSweeps = enemy.captureBonus;
    return { afterCast, afterOneSweep, afterTwoSweeps, afterThreeSweeps, afterFourSweeps };
  })()`);
  assert.equal(result.afterCast, -3);
  assert.equal(result.afterOneSweep, -3, 'should still apply through the opponent\'s reply');
  assert.equal(result.afterTwoSweeps, -3, 'should still apply on the caster\'s own next turn (widened round window)');
  assert.equal(result.afterThreeSweeps, -3, 'should still apply through the opponent\'s second reply');
  assert.equal(result.afterFourSweeps, 0, 'should be gone after 4 ticks');
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
test('Triune Desire: Crimson Allure locks a random enemy\'s Special Attack through the caster\'s own next turn', async () => {
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
    const lockedAtCasterNextTurn = specialUsable(withSpecial, 'red', target);
    state.turnCount++;
    const lockedAfterSecondOpponentTurn = specialUsable(withSpecial, 'red', target);
    state.turnCount++;
    const unlockedAfterExpiry = specialUsable(withSpecial, 'red', target);
    return { lockedAtCast, lockedAfterOpponentTurn, lockedAtCasterNextTurn, lockedAfterSecondOpponentTurn, unlockedAfterExpiry };
  })()`);
  assert.equal(result.lockedAtCast, false);
  assert.equal(result.lockedAfterOpponentTurn, false, 'should still be locked through the opponent\'s reply');
  assert.equal(result.lockedAtCasterNextTurn, false, 'should still be locked on the caster\'s own next turn (widened round window)');
  assert.equal(result.lockedAfterSecondOpponentTurn, false, 'should still be locked through the opponent\'s second reply');
  assert.equal(result.unlockedAfterExpiry, true, 'should unlock after 4 ticks');
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

test('Kaeldryx: Dragon Hunter/Scalebreaker passives, Hunter\'s Focus buff-lock, Execution, Dragonslayer ultimate', async () => {
  const { page, pageErrors } = await newPage();
  const result = await page.evaluate(`(() => {
    ${freshEntrySnippet()}
    const out = {};
    const kaeldryx = findCardById('kaeldryx');

    state.board = Array(9).fill(null);
    state.playerHand = [1,2]; state.enemyHand = [1,2];
    // A synthetic dragon with a facing side below 8, so Scalebreaker (+1 vs
    // 8+ facing) doesn't also kick in here and confound the Dragon Hunter
    // reading — Scalebreaker gets its own isolated assertions below.
    const weakDragon = { id:'weak-dragon', name:'WeakDragon', top:1,right:1,bottom:1,left:1, isDragon:true };
    out.dragonHunterBonus = fullEffectiveValue(kaeldryx, 'top', weakDragon, 0, 'blue', 'attack') - kaeldryx.top;
    const strongFacing = { id:'s8', name:'S8', top:8,right:1,bottom:1,left:1 };
    const weakFacing = { id:'s7', name:'S7', top:7,right:1,bottom:1,left:1 };
    out.scaleBreakerAt8 = fullEffectiveValue(kaeldryx, 'bottom', strongFacing, 0, 'blue', 'attack') - kaeldryx.bottom;
    out.scaleBreakerBelow8 = fullEffectiveValue(kaeldryx, 'bottom', weakFacing, 0, 'blue', 'attack') - kaeldryx.bottom;

    // Hunter's Focus (called directly, isolated from battle resolution)
    state.board = Array(9).fill(null);
    const hfSrc = freshEntry(kaeldryx, 'blue');
    const hfTarget = freshEntry(findCardById('ogre'), 'red');
    state.board[4] = hfSrc; state.board[1] = hfTarget;
    state.turnCount = 50;
    ON_PLACE_HANDLERS.kaeldryx(hfSrc, 'blue', 4);
    out.buffLockedAfterPlace = hfTarget.buffLockedUntilTurnCount > state.turnCount;
    SpecialVerbs.attackBoost(hfTarget, 5);
    out.buffBlockedWhileLocked = hfTarget.captureBonus === 0;
    state.turnCount += 4;
    SpecialVerbs.attackBoost(hfTarget, 5);
    out.buffWorksAfterLockExpires = hfTarget.captureBonus === 5;

    // Execution: a 10+ power win destroys the loser outright
    state.board = Array(9).fill(null);
    state.playerHand = [1,2]; state.enemyHand = [1,2];
    state.board[4] = freshEntry(kaeldryx, 'blue');
    state.board[1] = freshEntry({ id:'exec-weak', name:'ExecWeak', top:1,right:1,bottom:1,left:1 }, 'red');
    resolveFlips(4, 'blue');
    out.executionDestroyedLoser = state.board[1] === null;

    // Dragonslayer: destroys ALL dragons (both sides, respecting destroyImmune), debuffs remaining enemies
    state.board = Array(9).fill(null);
    const ksrc = freshEntry(kaeldryx, 'blue');
    const allyDragon = freshEntry(findCardById('dragon'), 'blue');
    const immuneDragon = freshEntry(findCardById('threeheaddragon'), 'red');
    const plainEnemy = freshEntry(findCardById('ogre'), 'red');
    state.board[0] = ksrc; state.board[1] = allyDragon; state.board[2] = immuneDragon; state.board[3] = plainEnemy;
    SPECIAL_HANDLERS.kaeldryx({ srcEntry: ksrc, owner: 'blue' });
    out.dragonslayerKilledAllyDragon = state.board[1] === null;
    out.dragonslayerRespectsDestroyImmune = state.board[2] !== null;
    out.dragonslayerDebuffedRemainingEnemy = plainEnemy.captureBonus === -3;

    return out;
  })()`);
  assert.equal(result.dragonHunterBonus, 4, 'Dragon Hunter: +4 vs an isDragon card');
  assert.equal(result.scaleBreakerAt8, 1, 'Scalebreaker: +1 vs an 8+ facing side');
  assert.equal(result.scaleBreakerBelow8, 0, 'Scalebreaker: no bonus below 8');
  assert.equal(result.buffLockedAfterPlace, true);
  assert.equal(result.buffBlockedWhileLocked, true, "Hunter's Focus blocks positive bonuses while locked");
  assert.equal(result.buffWorksAfterLockExpires, true);
  assert.equal(result.executionDestroyedLoser, true);
  assert.equal(result.dragonslayerKilledAllyDragon, true, 'Dragonslayer hits allied dragons too');
  assert.equal(result.dragonslayerRespectsDestroyImmune, true);
  assert.equal(result.dragonslayerDebuffedRemainingEnemy, true);
  assert.deepEqual(pageErrors, []);
  await page.close();
});

test('Nexzoth: debuffImmune, weakVsElement(light), World Shatter line-destroy on win, The Ending spares only itself', async () => {
  const { page, pageErrors } = await newPage();
  const result = await page.evaluate(`(() => {
    ${freshEntrySnippet()}
    const out = {};
    const nexzoth = findCardById('nexzoth');

    state.board = Array(9).fill(null);
    const immuneEntry = freshEntry(nexzoth, 'blue');
    state.board[0] = immuneEntry;
    SpecialVerbs.debuff(immuneEntry, 5);
    out.debuffImmune = immuneEntry.captureBonus === 0;

    state.playerHand = [1,2]; state.enemyHand = [1,2];
    const lightCard = { id:'light-test', name:'Light', top:5,right:5,bottom:5,left:5, element:'light' };
    out.weakVsLight = fullEffectiveValue(nexzoth, 'top', lightCard, 0, 'blue', 'attack') - nexzoth.top;

    // World Shatter: winning destroys enemies further along that same line —
    // BALANCE CAP (deliberate deviation from source text, see PROJECT.md):
    // only the FIRST such win destroys the line; a second win by the same
    // Nexzoth must not repeat it, since paired with his permanent
    // debuffImmune an uncapped version has no counterplay.
    state.board = Array(9).fill(null);
    const nexShatter = freshEntry(nexzoth, 'blue');
    state.board[7] = nexShatter;
    state.board[4] = freshEntry({ id:'near', name:'Near', top:1,right:1,bottom:1,left:1 }, 'red');
    state.board[1] = freshEntry({ id:'far', name:'Far', top:1,right:1,bottom:1,left:1 }, 'red');
    resolveFlips(7, 'blue');
    out.worldShatterCapturedNear = state.board[4] && state.board[4].owner === 'blue';
    out.worldShatterDestroyedFar = state.board[1] === null;
    out.worldShatterMarkedUsed = nexShatter.onWinLineDestroyUsed === true;

    // Second win by the SAME Nexzoth (same 'top' direction, a fresh enemy
    // now sitting where the first destroyed one used to be): must NOT
    // destroy again since onWinLineDestroyUsed is now set.
    state.board[1] = freshEntry({ id:'far2', name:'Far2', top:1,right:1,bottom:1,left:1 }, 'red');
    checkOnWinBonuses(nexShatter, 'top', state.board[4], 4, 7, 10);
    out.worldShatterDoesNotRepeat = state.board[1] !== null;

    // The Ending: destroys every other card, both sides, except itself; respects destroyImmune
    state.board = Array(9).fill(null);
    const nexSrc = freshEntry(nexzoth, 'blue');
    state.board[4] = nexSrc;
    state.board[0] = freshEntry(findCardById('ogre'), 'blue');
    state.board[1] = freshEntry(findCardById('ogre'), 'red');
    state.board[8] = freshEntry(findCardById('threeheaddragon'), 'red');
    SPECIAL_HANDLERS.nexzoth({ srcEntry: nexSrc, sourceIndex: 4, owner: 'blue' });
    out.endingKeepsSelf = state.board[4] === nexSrc;
    out.endingDestroysOwnSide = state.board[0] === null;
    out.endingDestroysEnemySide = state.board[1] === null;
    out.endingRespectsDestroyImmune = state.board[8] !== null;

    return out;
  })()`);
  assert.equal(result.debuffImmune, true);
  assert.equal(result.weakVsLight, -4);
  assert.equal(result.worldShatterCapturedNear, true);
  assert.equal(result.worldShatterDestroyedFar, true, 'World Shatter destroys enemies further along the winning line');
  assert.equal(result.worldShatterMarkedUsed, true);
  assert.equal(result.worldShatterDoesNotRepeat, true, 'World Shatter is capped to once per match (balance deviation from source text)');
  assert.equal(result.endingKeepsSelf, true);
  assert.equal(result.endingDestroysOwnSide, true, 'The Ending hits both sides, not just the enemy');
  assert.equal(result.endingDestroysEnemySide, true);
  assert.equal(result.endingRespectsDestroyImmune, true);
  assert.deepEqual(pageErrors, []);
  await page.close();
});

test('Morvath: King of the Depths buff-on-destroy, threshold-gated Drowned Souls, Endless Tide destroy+revive', async () => {
  const { page, pageErrors } = await newPage();
  const result = await page.evaluate(`(() => {
    ${freshEntrySnippet()}
    const out = {};
    const morvath = findCardById('morvath');

    // King of the Depths: +1 permanent Power whenever ANY enemy card is destroyed
    state.board = Array(9).fill(null);
    state.rules.graveyard = true;
    state.graveyard = { blue: [], red: [] };
    const morvathEntry = freshEntry(morvath, 'blue');
    state.board[0] = morvathEntry;
    state.board[1] = freshEntry(findCardById('ogre'), 'red');
    destroyCard(1);
    out.kingOfDepthsBuff = morvathEntry.captureBonus === 1;

    // Drowned Souls: only revives on a 10+ power win
    state.board = Array(9).fill(null);
    state.rules.graveyard = true;
    state.graveyard = { blue: [], red: [findCardById('ogre')] };
    state.playerHand = [1,2]; state.enemyHand = [1,2];
    const belowThreshold = freshEntry(morvath, 'blue'); // top:9, no bonus
    state.board[4] = belowThreshold;
    state.board[1] = freshEntry({ id:'mv1', name:'MV1', top:1,right:1,bottom:1,left:1 }, 'red');
    resolveFlips(4, 'blue');
    out.noRevoiveBelowThreshold = state.graveyard.red.length === 1;

    state.board = Array(9).fill(null);
    state.graveyard = { blue: [], red: [findCardById('ogre')] };
    const aboveThreshold = freshEntry(morvath, 'blue');
    aboveThreshold.captureBonus = 2; // push to 11
    state.board[4] = aboveThreshold;
    state.board[1] = freshEntry({ id:'mv2', name:'MV2', top:1,right:1,bottom:1,left:1 }, 'red');
    resolveFlips(4, 'blue');
    out.revivedAboveThreshold = state.graveyard.red.length === 0 &&
      state.board.some(e => e && e.owner === 'blue' && e.card.id === 'ogre' && e.captureBonus === -2);

    // Abyssal Grasp: same once-per-match balance cap as Nexzoth's World
    // Shatter (see PROJECT.md) — Morvath also has permanent debuffImmune,
    // so an uncapped destroy-on-every-win would be the same snowball risk.
    state.board = Array(9).fill(null);
    const morvGrasp = freshEntry(morvath, 'blue');
    state.board[7] = morvGrasp;
    state.board[4] = freshEntry({ id:'ag-near', name:'AGNear', top:1,right:1,bottom:1,left:1 }, 'red');
    state.board[1] = freshEntry({ id:'ag-far', name:'AGFar', top:1,right:1,bottom:1,left:1 }, 'red');
    resolveFlips(7, 'blue');
    out.abyssalGraspDestroyedFar = state.board[1] === null;
    state.board[1] = freshEntry({ id:'ag-far2', name:'AGFar2', top:1,right:1,bottom:1,left:1 }, 'red');
    checkOnWinBonuses(morvGrasp, 'top', state.board[4], 4, 7, 10);
    out.abyssalGraspDoesNotRepeat = state.board[1] !== null;

    // Ultimate: destroys every enemy, then revives up to 2 from the graveyard on Morvath's own side
    state.board = Array(9).fill(null);
    state.graveyard = { blue: [], red: [] };
    const mSrc = freshEntry(morvath, 'blue');
    state.board[0] = mSrc;
    state.board[1] = freshEntry(findCardById('ogre'), 'red');
    state.board[2] = freshEntry(findCardById('wendigo'), 'red');
    SPECIAL_HANDLERS.morvath({ srcEntry: mSrc, owner: 'blue' });
    out.noneRemainRedOwned = state.board.every(e => !e || e.owner !== 'red');
    out.revivedTwoWithPenalty = state.board.filter(e => e && e.owner === 'blue' && e.captureBonus === -3).length === 2;

    return out;
  })()`);
  assert.equal(result.kingOfDepthsBuff, true);
  assert.equal(result.noRevoiveBelowThreshold, true, "Drowned Souls doesn't trigger below a 10-power win");
  assert.equal(result.revivedAboveThreshold, true, 'Drowned Souls revives the just-destroyed graveyard card at a 10+ win');
  assert.equal(result.abyssalGraspDestroyedFar, true);
  assert.equal(result.abyssalGraspDoesNotRepeat, true, 'Abyssal Grasp is capped to once per match (balance deviation from source text)');
  assert.equal(result.noneRemainRedOwned, true, 'The Endless Tide leaves no red-owned cards on the board');
  assert.equal(result.revivedTwoWithPenalty, true, 'The Endless Tide revives up to 2 cards under Morvath\'s owner with -3 Power');
  assert.deepEqual(pageErrors, []);
  await page.close();
});

test('Vorgrath: debuffImmuneFirstRound expires after round 1, Crushing Weight hits every enemy on win, The Falling World ultimate', async () => {
  const { page, pageErrors } = await newPage();
  const result = await page.evaluate(`(() => {
    ${freshEntrySnippet()}
    const out = {};
    const vorgrath = findCardById('vorgrath');

    state.board = Array(9).fill(null);
    const vgEntry = freshEntry(vorgrath, 'blue');
    state.board[0] = vgEntry;
    state.turnCount = 0;
    SpecialVerbs.debuff(vgEntry, 5);
    out.immuneDuringFirstRound = vgEntry.captureBonus === 0;
    state.turnCount = 5;
    SpecialVerbs.debuff(vgEntry, 5);
    out.notImmuneAfterFirstRound = vgEntry.captureBonus === -5;

    // Crushing Weight: on any win, ALL enemy cards get -1 this round, not just neighbors
    state.board = Array(9).fill(null);
    state.playerHand = [1,2]; state.enemyHand = [1,2];
    state.board[4] = freshEntry(vorgrath, 'blue');
    state.board[1] = freshEntry({ id:'near', name:'Near', top:1,right:1,bottom:1,left:1 }, 'red');
    const farEnemy = freshEntry({ id:'far', name:'Far', top:9,right:9,bottom:9,left:9 }, 'red');
    state.board[6] = farEnemy; // not adjacent to index 4
    resolveFlips(4, 'blue');
    out.crushingWeightHitNonAdjacentEnemy = farEnemy.captureBonus === -1;

    // The Falling World: direction-choice ultimate destroys the whole line
    state.board = Array(9).fill(null);
    const vgSrc = freshEntry(vorgrath, 'blue');
    state.board[7] = vgSrc;
    state.board[4] = freshEntry(findCardById('ogre'), 'red');
    state.board[1] = freshEntry(findCardById('ogre'), 'red');
    SPECIAL_HANDLERS.vorgrath({ srcEntry: vgSrc, sourceIndex: 7, owner: 'blue', direction: 'up' });
    out.fallingWorldDestroyedWholeLine = state.board[4] === null && state.board[1] === null;

    // On-place: Ashfall + World Denial both fire from one placement
    state.board = Array(9).fill(null);
    const opSrc = freshEntry(vorgrath, 'blue');
    state.board[4] = opSrc;
    const t1 = freshEntry(findCardById('ogre'), 'red');
    const t2 = freshEntry(findCardById('wendigo'), 'red');
    state.board[0] = t1; state.board[1] = t2;
    state.turnCount = 50;
    ON_PLACE_HANDLERS.vorgrath(opSrc, 'blue', 4);
    // Ashfall and World Denial each independently pick a random enemy and
    // apply -2 — they may land on the same card (giving it -4 and leaving
    // the other untouched) or on different cards (-2 each), so the only
    // invariant that holds regardless of which is: two -2 hits were
    // applied in total, somewhere across the two possible targets.
    out.onPlaceTotalDebuff = t1.captureBonus + t2.captureBonus;
    out.onPlaceLockedExactlyOne = [t1, t2].filter(e => e.specialLockedUntilTurnCount > state.turnCount).length === 1;

    return out;
  })()`);
  assert.equal(result.immuneDuringFirstRound, true);
  assert.equal(result.notImmuneAfterFirstRound, true);
  assert.equal(result.crushingWeightHitNonAdjacentEnemy, true, 'Crushing Weight hits every enemy card, not just neighbors');
  assert.equal(result.fallingWorldDestroyedWholeLine, true);
  assert.equal(result.onPlaceTotalDebuff, -4, 'Ashfall and World Denial together apply two -2 hits');
  assert.equal(result.onPlaceLockedExactlyOne, true);
  assert.deepEqual(pageErrors, []);
  await page.close();
});

test('Zalazar: Ashen Resurrection reuses the shield mechanic, World In Flames revives unconditionally, Apocalypse spares allies', async () => {
  const { page, pageErrors } = await newPage();
  const result = await page.evaluate(`(() => {
    ${freshEntrySnippet()}
    const out = {};
    const zalazar = findCardById('zalazar');

    state.board = Array(9).fill(null);
    const zalEntry = freshEntry(zalazar, 'blue');
    state.board[4] = zalEntry;
    out.hasShield = isShielded(zalEntry, 4) === true;

    // World In Flames: revives on ANY win, no power threshold required
    state.board = Array(9).fill(null);
    state.rules.graveyard = true;
    state.graveyard = { blue: [], red: [findCardById('ogre')] };
    state.playerHand = [1,2]; state.enemyHand = [1,2];
    state.board[4] = freshEntry(zalazar, 'blue');
    state.board[1] = freshEntry({ id:'zv', name:'ZV', top:1,right:1,bottom:1,left:1 }, 'red');
    resolveFlips(4, 'blue');
    out.revivedRegardlessOfPower = state.graveyard.red.length === 0;

    // Apocalypse: destroys every enemy card, spares allies
    state.board = Array(9).fill(null);
    state.rules.graveyard = false;
    const zSrc = freshEntry(zalazar, 'blue');
    state.board[0] = zSrc;
    state.board[1] = freshEntry(findCardById('ogre'), 'blue');
    state.board[2] = freshEntry(findCardById('ogre'), 'red');
    SPECIAL_HANDLERS.zalazar({ srcEntry: zSrc, owner: 'blue' });
    out.apocalypseSparesAlly = state.board[1] !== null;
    out.apocalypseKillsEnemy = state.board[2] === null;

    return out;
  })()`);
  assert.equal(result.hasShield, true);
  assert.equal(result.revivedRegardlessOfPower, true);
  assert.equal(result.apocalypseSparesAlly, true);
  assert.equal(result.apocalypseKillsEnemy, true);
  assert.deepEqual(pageErrors, []);
  await page.close();
});

test('AI can now use direction-targeting Ultimates (Vorgrath and friends) — previously always skipped', async () => {
  const { page, pageErrors } = await newPage();
  const result = await page.evaluate(`(() => {
    ${freshEntrySnippet()}
    state.board = Array(9).fill(null);
    state.wins = { blue: 0, red: 5 };
    state.specialUsed = {};
    state.turn = 'red';
    state.phase = 'battle';
    const aiVorgrath = freshEntry(findCardById('vorgrath'), 'red');
    state.board[4] = aiVorgrath;
    state.board[1] = freshEntry(findCardById('ogre'), 'blue');
    state.board[7] = freshEntry(findCardById('ogre'), 'blue');
    const used = enemyTryUseSpecial();
    return { used, somethingDied: state.board[1] === null || state.board[7] === null };
  })()`);
  assert.equal(result.used, true, 'the AI actually fired a direction-targeting Ultimate');
  assert.equal(result.somethingDied, true);
  assert.deepEqual(pageErrors, []);
  await page.close();
});

test('Naline (redesigned): Divine Touch/Soul Revive on-place, buffThisRound expiry, Healing Radiance cleanse, Rise Again ultimate', async () => {
  const { page, pageErrors } = await newPage();
  const result = await page.evaluate(`(() => {
    ${freshEntrySnippet()}
    const out = {};
    const naline = findCardById('naline');
    out.stillPlayable = HEROES.some(h => h.id === 'naline');
    out.isLightElement = naline.element === 'light';
    out.specialIsAoeNotDirection = naline.special.targets === 'aoe';
    out.rivalryPairsDropped = !isRivalryPair('ragnar','naline') && !isRivalryPair('naline','deathblade');

    // Divine Touch (temp +2) + Soul Revive (own graveyard, fixed 1 Power) both fire on-place
    state.board = Array(9).fill(null);
    state.rules.graveyard = true;
    state.graveyard = { blue: [findCardById('ogre')], red: [] };
    state.turnCount = 20;
    const nSrc = freshEntry(naline, 'blue');
    state.board[4] = nSrc;
    ON_PLACE_HANDLERS.naline(nSrc, 'blue', 4);
    out.divineTouchTempBuff = nSrc.captureBonus === 2 && nSrc.tempEffects.length === 1;
    out.soulReviveTookFromOwnGraveyard = state.graveyard.blue.length === 0;
    const revived = state.board.find((e,i) => i !== 4 && e && e.owner === 'blue');
    out.soulReviveAtFixedPower = !!revived && revived.card.top === 1 && revived.card.left === 1;
    state.turnCount += 4;
    sweepExpiredRoundEffects();
    out.divineTouchExpiredAfterRound = nSrc.captureBonus === 0;

    // Healing Radiance: on-win, clears a negative captureBonus and adds +1
    // permanent. Calls checkOnWinBonuses directly (not via resolveFlips) —
    // going through a real battle would flip the loser onto Naline's own
    // side too, giving onWinCleanseAlly's random pick a second, wrong
    // candidate and making this assertion flaky.
    state.board = Array(9).fill(null);
    const nWinner = freshEntry(naline, 'blue');
    nWinner.captureBonus = -3;
    nWinner.tempEffects = [{ captureDelta: -3, expiresAtTurnCount: 999 }];
    state.board[4] = nWinner;
    const hrLoser = freshEntry({ id:'hr-loser', name:'HRLoser', top:1,right:1,bottom:1,left:1 }, 'red');
    checkOnWinBonuses(nWinner, 'top', hrLoser, null, 4, 10);
    out.healingRadianceCleansed = nWinner.captureBonus === 1 && nWinner.tempEffects.length === 0;

    // Rise Again: up to 2 from OWN graveyard, temporarily destroy-immune
    state.board = Array(9).fill(null);
    state.graveyard = { blue: [findCardById('ogre'), findCardById('wendigo')], red: [] };
    state.turnCount = 30;
    const ultSrc = freshEntry(naline, 'blue');
    state.board[4] = ultSrc;
    SPECIAL_HANDLERS.naline({ srcEntry: ultSrc, owner: 'blue' });
    out.riseAgainRevivedBoth = state.graveyard.blue.length === 0;
    const revivedEntries = state.board.filter(e => e && e.owner === 'blue' && e !== ultSrc);
    out.riseAgainAtFixedPower = revivedEntries.length === 2 && revivedEntries.every(e => e.card.top === 1);
    out.riseAgainImmuneThisRound = revivedEntries.every(e => isDestroyImmune(e));
    state.turnCount += 4;
    out.riseAgainImmuneExpires = revivedEntries.every(e => !isDestroyImmune(e));

    return out;
  })()`);
  assert.equal(result.stillPlayable, true, 'redesign keeps Naline in HEROES, same as Tiamat\'s redesign');
  assert.equal(result.isLightElement, true);
  assert.equal(result.specialIsAoeNotDirection, true);
  assert.equal(result.rivalryPairsDropped, true);
  assert.equal(result.divineTouchTempBuff, true);
  assert.equal(result.soulReviveTookFromOwnGraveyard, true);
  assert.equal(result.soulReviveAtFixedPower, true);
  assert.equal(result.divineTouchExpiredAfterRound, true);
  assert.equal(result.healingRadianceCleansed, true);
  assert.equal(result.riseAgainRevivedBoth, true);
  assert.equal(result.riseAgainAtFixedPower, true);
  assert.equal(result.riseAgainImmuneThisRound, true, "Rise Again's revived cards resist destroyCard() this round");
  assert.equal(result.riseAgainImmuneExpires, true);
  assert.deepEqual(pageErrors, []);
  await page.close();
});

test('Umbrael: debuffImmune, Reality Fracture underdog bonus, weakVsElement mutual with Naline, End of All spares only itself', async () => {
  const { page, pageErrors } = await newPage();
  const result = await page.evaluate(`(() => {
    ${freshEntrySnippet()}
    const out = {};
    const umbrael = findCardById('umbrael');
    out.forestFoesOnly = FOREST_FOES.some(f => f.id === 'umbrael') && !HEROES.some(h => h.id === 'umbrael');
    out.isDarkElement = umbrael.element === 'dark';

    state.board = Array(9).fill(null);
    const umbraelEntry = freshEntry(umbrael, 'blue');
    state.board[0] = umbraelEntry;
    SpecialVerbs.debuff(umbraelEntry, 5);
    out.debuffImmune = umbraelEntry.captureBonus === 0;

    state.playerHand = [1,2]; state.enemyHand = [1,2];
    const stronger = { id:'stronger', name:'Stronger', top:15,right:1,bottom:1,left:1 };
    out.realityFractureTriggersVsStronger = fullEffectiveValue(umbrael, 'bottom', stronger, 0, 'blue', 'attack') - umbrael.bottom === 2;
    const weaker = { id:'weaker', name:'Weaker', top:1,right:1,bottom:1,left:1 };
    out.realityFractureSkipsVsWeaker = fullEffectiveValue(umbrael, 'bottom', weaker, 0, 'blue', 'attack') - umbrael.bottom === 0;

    // Mutual elemental weakness with Naline (light vs dark), both newly-added this batch
    const naline = findCardById('naline');
    out.umbraelWeakVsNalinesLight = fullEffectiveValue(umbrael, 'top', naline, 0, 'blue', 'attack') - umbrael.top === -4;
    out.nalineWeakVsUmbraelsDark = fullEffectiveValue(naline, 'top', umbrael, 0, 'blue', 'attack') - naline.top === -4;

    // End of All: destroys everything except itself, both sides
    state.board = Array(9).fill(null);
    const uSrc = freshEntry(umbrael, 'blue');
    state.board[4] = uSrc;
    state.board[0] = freshEntry(findCardById('ogre'), 'blue');
    state.board[1] = freshEntry(findCardById('ogre'), 'red');
    SPECIAL_HANDLERS.umbrael({ srcEntry: uSrc, sourceIndex: 4, owner: 'blue' });
    out.endOfAllKeepsSelf = state.board[4] === uSrc;
    out.endOfAllDestroysOwnSide = state.board[0] === null;
    out.endOfAllDestroysEnemySide = state.board[1] === null;

    return out;
  })()`);
  assert.equal(result.forestFoesOnly, true);
  assert.equal(result.isDarkElement, true);
  assert.equal(result.debuffImmune, true);
  assert.equal(result.realityFractureTriggersVsStronger, true);
  assert.equal(result.realityFractureSkipsVsWeaker, true);
  assert.equal(result.umbraelWeakVsNalinesLight, true);
  assert.equal(result.nalineWeakVsUmbraelsDark, true);
  assert.equal(result.endOfAllKeepsSelf, true);
  assert.equal(result.endOfAllDestroysOwnSide, true);
  assert.equal(result.endOfAllDestroysEnemySide, true);
  assert.deepEqual(pageErrors, []);
  await page.close();
});

test('Zlaizer: Light of Forgiveness (probabilistic own-side graveyard), Second Dawn, Divine Balance/Redemption Touch, Rebirth ultimate', async () => {
  const { page, pageErrors } = await newPage();
  const result = await page.evaluate(`(() => {
    ${freshEntrySnippet()}
    const out = {};
    const zlaizer = findCardById('zlaizer');
    out.playableInHeroes = HEROES.some(h => h.id === 'zlaizer');
    out.alsoInForestFoes = FOREST_FOES.some(f => f.id === 'zlaizer');

    // Light of Forgiveness: ~50% chance to graveyard on Zlaizer's OWN side even with the rule off
    state.board = Array(9).fill(null);
    state.rules.graveyard = false;
    state.graveyard = { blue: [], red: [] };
    const zlEntry = freshEntry(zlaizer, 'blue');
    state.board[0] = zlEntry;
    let ownHits = 0;
    for(let i=0;i<200;i++){
      state.board[1] = freshEntry(findCardById('ogre'), 'blue');
      destroyCard(1);
      if(state.graveyard.blue.length > 0){ ownHits++; state.graveyard.blue = []; }
    }
    out.roughlyHalfOwnSide = ownHits > 60 && ownHits < 140;

    // Never protects the OPPONENT's side
    state.graveyard = { blue: [], red: [] };
    let enemyHits = 0;
    for(let i=0;i<100;i++){
      state.board[1] = freshEntry(findCardById('ogre'), 'red');
      destroyCard(1);
      if(state.graveyard.red.length > 0){ enemyHits++; state.graveyard.red = []; }
    }
    out.neverProtectsEnemySide = enemyHits === 0;

    // Rule ON still always records regardless of Zlaizer
    state.rules.graveyard = true;
    state.graveyard = { blue: [], red: [] };
    state.board[1] = freshEntry(findCardById('ogre'), 'blue');
    destroyCard(1);
    out.ruleOnAlwaysRecords = state.graveyard.blue.length === 1;

    // Second Dawn: on-win, revives from OWN graveyard with a -1 penalty
    state.rules.graveyard = false;
    state.board = Array(9).fill(null);
    state.playerHand = [1,2]; state.enemyHand = [1,2];
    state.graveyard = { blue: [findCardById('wendigo')], red: [] };
    const winner = freshEntry(zlaizer, 'blue');
    state.board[4] = winner;
    state.board[1] = freshEntry({ id:'loser', name:'Loser', top:1,right:1,bottom:1,left:1 }, 'red');
    resolveFlips(4, 'blue');
    out.secondDawnRevived = state.graveyard.blue.length === 0;
    const revivedByWin = state.board.find((e,i) => i!==4 && e && e.owner === 'blue' && e.card.id === 'wendigo');
    out.secondDawnPenalty = !!revivedByWin && revivedByWin.captureBonus === -1;

    // On-place: Divine Balance + Redemption Touch (two +2-this-round hits, one grants temp immunity)
    state.board = Array(9).fill(null);
    const src = freshEntry(zlaizer, 'blue');
    const ally = freshEntry({ id:'ally', name:'Ally', top:5,right:5,bottom:5,left:5 }, 'blue');
    state.board[4] = src;
    state.board[0] = ally;
    state.turnCount = 40;
    ON_PLACE_HANDLERS.zlaizer(src, 'blue');
    out.twoPlusTwoHitsApplied = (src.captureBonus + ally.captureBonus) === 4;
    out.exactlyOneGrantedImmunity = [src, ally].filter(e => isDestroyImmune(e)).length === 1;

    // Rebirth ultimate: up to 3 from own graveyard, fixed 1 Power, no leftover negative effects
    state.board = Array(9).fill(null);
    state.graveyard = { blue: [findCardById('ogre'), findCardById('wendigo'), findCardById('harpy')], red: [] };
    const ultSrc = freshEntry(zlaizer, 'blue');
    state.board[4] = ultSrc;
    SPECIAL_HANDLERS.zlaizer({ srcEntry: ultSrc, owner: 'blue' });
    out.rebirthRevivedAllThree = state.graveyard.blue.length === 0;
    const revivedEntries = state.board.filter(e => e && e.owner === 'blue' && e !== ultSrc);
    out.rebirthAtFixedCleanPower = revivedEntries.length === 3 && revivedEntries.every(e => e.card.top === 1 && e.captureBonus === 0);

    // Weakness vs a shadow-element card (mechanism works even though dormant today)
    state.playerHand = [1,2]; state.enemyHand = [1,2];
    const shadowCard = { id:'shadow-test', name:'ShadowTest', top:5,right:5,bottom:5,left:5, element:'shadow' };
    out.weakVsShadow = fullEffectiveValue(zlaizer, 'top', shadowCard, 0, 'blue', 'attack') - zlaizer.top === -4;

    return out;
  })()`);
  assert.equal(result.playableInHeroes, true);
  assert.equal(result.alsoInForestFoes, true);
  assert.equal(result.roughlyHalfOwnSide, true, "Light of Forgiveness fires roughly half the time on Zlaizer's own side");
  assert.equal(result.neverProtectsEnemySide, true);
  assert.equal(result.ruleOnAlwaysRecords, true);
  assert.equal(result.secondDawnRevived, true);
  assert.equal(result.secondDawnPenalty, true);
  assert.equal(result.twoPlusTwoHitsApplied, true);
  assert.equal(result.exactlyOneGrantedImmunity, true);
  assert.equal(result.rebirthRevivedAllThree, true);
  assert.equal(result.rebirthAtFixedCleanPower, true);
  assert.equal(result.weakVsShadow, true);
  assert.deepEqual(pageErrors, []);
  await page.close();
});

test('Visual feedback: SpecialVerbs now flash every changed card (not just single-target specials), and destroys leave a fading ghost', async () => {
  const { page, pageErrors } = await newPage();
  const result = await page.evaluate(`(() => {
    ${freshEntrySnippet()}
    const out = {};

    // Positive change (attackBoost) flashes green ("+N Power")
    const posEntry = freshEntry(findCardById('ogre'), 'blue');
    SpecialVerbs.attackBoost(posEntry, 3);
    out.positiveFlash = posEntry.bonusFlash === true && posEntry.bonusAmount === 3;

    // Negative change (debuff) flashes with a negative amount
    const negEntry = freshEntry(findCardById('ogre'), 'blue');
    SpecialVerbs.debuff(negEntry, 2);
    out.negativeFlash = negEntry.bonusFlash === true && negEntry.bonusAmount === -2;

    // debuffThisRound / buffThisRound / directionalBoost / stealPower all flash too
    const dtrEntry = freshEntry(findCardById('ogre'), 'blue');
    SpecialVerbs.debuffThisRound(dtrEntry, 1);
    out.debuffThisRoundFlash = dtrEntry.bonusAmount === -1;
    const btrEntry = freshEntry(findCardById('ogre'), 'blue');
    SpecialVerbs.buffThisRound(btrEntry, 4);
    out.buffThisRoundFlash = btrEntry.bonusAmount === 4;
    const dirEntry = freshEntry(findCardById('ogre'), 'blue');
    SpecialVerbs.directionalBoost(dirEntry, ['top'], -1);
    out.directionalBoostFlash = dirEntry.bonusAmount === -1;
    const stealSrc = freshEntry(findCardById('ogre'), 'blue');
    const stealTgt = freshEntry(findCardById('ogre'), 'red');
    SpecialVerbs.stealPower(stealSrc, stealTgt, 2);
    out.stealPowerFlashesBoth = stealSrc.bonusAmount === 2 && stealTgt.bonusAmount === -2;

    // A blocked change (debuffImmune) does NOT flash — no misleading popup for a no-op
    const immuneEntry = freshEntry(findCardById('nexzoth'), 'blue');
    SpecialVerbs.debuff(immuneEntry, 5);
    out.blockedChangeDoesNotFlash = immuneEntry.bonusFlash !== true;

    // destroyCard() leaves a fading ghost record, cleared by runSpecialResolution's own cleanup timer
    state.board = Array(9).fill(null);
    const src = freshEntry(findCardById('vaelira'), 'blue');
    state.board[0] = src;
    state.board[1] = freshEntry(findCardById('ogre'), 'red');
    state.playerHand = []; state.enemyHand = [];
    runSpecialResolution(0, null);
    out.ghostRecordedImmediately = state.destroyGhosts.length === 1 && state.destroyGhosts[0].index === 1;

    return out;
  })()`);
  assert.equal(result.positiveFlash, true);
  assert.equal(result.negativeFlash, true, 'debuff() flashes with a negative bonusAmount, not the old always-positive popup');
  assert.equal(result.debuffThisRoundFlash, true);
  assert.equal(result.buffThisRoundFlash, true);
  assert.equal(result.directionalBoostFlash, true);
  assert.equal(result.stealPowerFlashesBoth, true);
  assert.equal(result.blockedChangeDoesNotFlash, true, "a debuffImmune-blocked change doesn't show a misleading flash");
  assert.equal(result.ghostRecordedImmediately, true, 'destroyCard() records a destroyGhosts entry for the shattered-card animation');
  assert.deepEqual(pageErrors, []);
  await page.close();

  // Ghost cleanup happens on a real 1300ms timer — verified in a second,
  // fresh page so the first page's assertions above aren't slowed down by
  // waiting for it.
  const { page: page2, pageErrors: pageErrors2 } = await newPage();
  const cleared = await page2.evaluate(async () => {
    function freshEntry(card, owner){ return { card, owner, shieldUsed:false, grantedShield:false, captureBonus:0 }; }
    state.board = Array(9).fill(null);
    const src = freshEntry(findCardById('vaelira'), 'blue');
    state.board[0] = src;
    state.board[1] = freshEntry(findCardById('ogre'), 'red');
    state.playerHand = []; state.enemyHand = [];
    runSpecialResolution(0, null);
    await new Promise(r => setTimeout(r, 1600));
    return state.destroyGhosts.length;
  });
  assert.equal(cleared, 0, 'destroyGhosts is cleared by the existing 1300ms animation-cleanup timer');
  assert.deepEqual(pageErrors2, []);
  await page2.close();
});

test('Medusa (redesigned): Stone Gaze petrify-on-win, Curse of the Gorgon margin-block, Serpent Queen aura, Living Statue shield, Throne of Stone, Gorgon\'s Dominion ultimate', async () => {
  const { page, pageErrors } = await newPage();
  const result = await page.evaluate(`(() => {
    ${freshEntrySnippet()}
    const out = {};
    const medusa = findCardById('medusa');

    out.playableAndEnemy = HEROES.some(h => h.id === 'medusa') && FOREST_FOES.some(f => f.id === 'medusa');
    out.elementEarth = medusa.element === 'earth';

    // Stone Gaze: winning a battle petrifies the loser until end of next round
    state.board = Array(9).fill(null);
    state.playerHand = [1,2]; state.enemyHand = [1,2];
    state.turnCount = 10;
    const winner = freshEntry(medusa, 'blue');
    state.board[4] = winner;
    const loser = freshEntry({ id:'weak', name:'Weak', top:1,right:1,bottom:1,left:1 }, 'red');
    state.board[1] = loser;
    resolveFlips(4, 'blue');
    out.petrifiedAfterWin = loser.petrifiedUntilTurnCount === 14; // turnCount(10) + 4
    out.petrifiedCantUseSpecial = !specialUsable({ ...findCardById('ogre'), special:{name:'x',cost:0,once:false,targets:'aoe'} }, 'blue', loser);
    state.turnCount = 14;
    out.notPetrifiedAfterExpiry = !(loser.petrifiedUntilTurnCount > state.turnCount);

    // Curse of the Gorgon: enemy wins by <=2 margin against Medusa -> the
    // flip is blocked and the attacker is debuffed. shieldUsed is pre-set
    // true on Medusa in both cases below to isolate this margin-based check
    // from her separate, always-on-first-loss Living Statue shield (which
    // would otherwise also block the exact same scenario, for a different
    // reason, and pre-empt the OR check before the margin logic even runs).
    state.board = Array(9).fill(null);
    state.playerHand = [1,2]; state.enemyHand = [1,2];
    const medusaDefender = freshEntry(medusa, 'blue'); // top:8
    medusaDefender.shieldUsed = true;
    state.board[4] = medusaDefender;
    const closeAttacker = freshEntry({ id:'close', name:'Close', top:1,right:1,bottom:10,left:1 }, 'red'); // bottom:10 vs medusa's top:8, margin=2
    state.board[1] = closeAttacker;
    resolveFlips(1, 'red');
    out.curseBlockedCloseWin = state.board[4].owner === 'blue';
    out.curseDebuffedAttacker = closeAttacker.captureBonus === -1;

    // A bigger margin (>2) should NOT be blocked
    state.board = Array(9).fill(null);
    state.playerHand = [1,2]; state.enemyHand = [1,2];
    const medusaDefender2 = freshEntry(medusa, 'blue');
    medusaDefender2.shieldUsed = true;
    state.board[4] = medusaDefender2;
    const bigAttacker = freshEntry({ id:'big', name:'Big', top:1,right:1,bottom:20,left:1 }, 'red');
    state.board[1] = bigAttacker;
    resolveFlips(1, 'red');
    out.bigMarginNotBlocked = state.board[4].owner === 'red';

    // Serpent Queen: +1 per petrified enemy on the board, capped at 3
    state.board = Array(9).fill(null);
    state.playerHand = [1,2]; state.enemyHand = [1,2];
    state.turnCount = 5;
    for(let i=0;i<5;i++){
      state.board[i] = freshEntry({ id:'p'+i, name:'P'+i, top:1,right:1,bottom:1,left:1 }, 'red');
      state.board[i].petrifiedUntilTurnCount = 10;
    }
    out.serpentQueenCapped = fullEffectiveValue(medusa, 'top', null, 8, 'blue', 'attack') - medusa.top === 3;

    // Living Statue: a one-time shield blocks a loss and grants a permanent +1
    state.board = Array(9).fill(null);
    state.playerHand = [1,2]; state.enemyHand = [1,2];
    const medusaShield = freshEntry(medusa, 'blue');
    state.board[4] = medusaShield;
    const crusher = freshEntry({ id:'crusher', name:'Crusher', top:1,right:1,bottom:20,left:1 }, 'red');
    state.board[1] = crusher;
    resolveFlips(1, 'red');
    out.livingStatueBlocked = state.board[4].owner === 'blue';
    out.livingStatueGrantedBonus = medusaShield.captureBonus === 1;
    out.livingStatueUsedUp = medusaShield.shieldUsed === true;

    // A second big loss after the shield is used should NOT be blocked again.
    // crusher2 sits at index3 (left of medusa at index4) — index3's RIGHT
    // edge is what faces medusa's LEFT edge, so its strong stat is on 'right'.
    const crusher2 = freshEntry({ id:'crusher2', name:'Crusher2', top:1,right:20,bottom:1,left:1 }, 'red');
    state.board[3] = crusher2;
    resolveFlips(3, 'red');
    out.shieldDoesNotReuse = state.board[4].owner === 'red';

    // Throne of Stone: +2 with 2+ adjacent allies, +0 with only 1
    state.board = Array(9).fill(null);
    state.board[4] = freshEntry(medusa, 'blue');
    state.board[1] = freshEntry({ id:'ally1', name:'A1', top:1,right:1,bottom:1,left:1 }, 'blue');
    state.board[3] = freshEntry({ id:'ally2', name:'A2', top:1,right:1,bottom:1,left:1 }, 'blue');
    out.throneOfStoneWithTwoAllies = fullEffectiveValue(medusa, 'top', null, 4, 'blue', 'attack') - medusa.top === 2;
    state.board[3] = null;
    out.throneOfStoneWithOnlyOneAlly = fullEffectiveValue(medusa, 'top', null, 4, 'blue', 'attack') - medusa.top === 0;

    // Ultimate: Gorgon's Dominion petrifies all enemies, -2 to them, +3 to self
    state.board = Array(9).fill(null);
    state.turnCount = 20;
    const ultSrc = freshEntry(medusa, 'blue');
    state.board[4] = ultSrc;
    const foe1 = freshEntry({ id:'foe1', name:'Foe1', top:5,right:5,bottom:5,left:5 }, 'red');
    const foe2 = freshEntry({ id:'foe2', name:'Foe2', top:5,right:5,bottom:5,left:5 }, 'red');
    state.board[1] = foe1; state.board[2] = foe2;
    SPECIAL_HANDLERS.medusa({ srcEntry: ultSrc, owner: 'blue' });
    out.ultimatePetrifiedBoth = foe1.petrifiedUntilTurnCount === 24 && foe2.petrifiedUntilTurnCount === 24;
    out.ultimateDebuffedBoth = foe1.captureBonus === -2 && foe2.captureBonus === -2;
    out.ultimateSelfBuffed = ultSrc.captureBonus === 3;

    return out;
  })()`);
  assert.equal(result.playableAndEnemy, true);
  assert.equal(result.elementEarth, true);
  assert.equal(result.petrifiedAfterWin, true);
  assert.equal(result.petrifiedCantUseSpecial, true, 'a petrified card cannot activate its own Special Attack');
  assert.equal(result.notPetrifiedAfterExpiry, true);
  assert.equal(result.curseBlockedCloseWin, true);
  assert.equal(result.curseDebuffedAttacker, true);
  assert.equal(result.bigMarginNotBlocked, true, 'a win by more than the margin threshold still flips Medusa normally');
  assert.equal(result.serpentQueenCapped, true);
  assert.equal(result.livingStatueBlocked, true);
  assert.equal(result.livingStatueGrantedBonus, true);
  assert.equal(result.livingStatueUsedUp, true);
  assert.equal(result.shieldDoesNotReuse, true, 'Living Statue only blocks the first loss, not every loss');
  assert.equal(result.throneOfStoneWithTwoAllies, true);
  assert.equal(result.throneOfStoneWithOnlyOneAlly, true);
  assert.equal(result.ultimatePetrifiedBoth, true);
  assert.equal(result.ultimateDebuffedBoth, true);
  assert.equal(result.ultimateSelfBuffed, true);
  assert.deepEqual(pageErrors, []);
  await page.close();
});

test('Shiva: Frost Aura on-place, Diamond Dust/Frost Barrier, Ice Touch, Eternal Winter, Diamond Storm ultimate', async () => {
  const { page, pageErrors } = await newPage();
  const result = await page.evaluate(`(() => {
    ${freshEntrySnippet()}
    const out = {};
    const shiva = findCardById('shiva');
    out.playableAndEnemy = HEROES.some(h => h.id === 'shiva') && FOREST_FOES.some(f => f.id === 'shiva');
    out.elementIce = shiva.element === 'ice';

    // Frost Aura: only ADJACENT enemies get hit on placement, not the whole board
    state.board = Array(9).fill(null);
    state.playerHand = [1,2]; state.enemyHand = [1,2];
    const shivaEntry = freshEntry(shiva, 'blue');
    state.board[4] = shivaEntry;
    const adjFoe = freshEntry({ id:'af', name:'AF', top:1,right:1,bottom:1,left:1 }, 'red');
    const farFoe = freshEntry({ id:'ff', name:'FF', top:1,right:1,bottom:1,left:1 }, 'red');
    state.board[1] = adjFoe; state.board[0] = farFoe;
    ON_PLACE_HANDLERS.shiva(shivaEntry, 'blue', 4);
    out.frostAuraAdjacentOnly = adjFoe.captureBonus === -1 && farFoe.captureBonus === 0;

    // Diamond Dust (on-win, this round) + Frost Barrier (one-time shield)
    state.board = Array(9).fill(null);
    state.playerHand = [1,2]; state.enemyHand = [1,2];
    const shivaWinner = freshEntry(shiva, 'blue');
    state.board[4] = shivaWinner;
    const weak = freshEntry({ id:'w', name:'W', top:1,right:1,bottom:1,left:1 }, 'red');
    state.board[1] = weak;
    resolveFlips(4, 'blue');
    out.diamondDust = weak.captureBonus === -2;

    state.board = Array(9).fill(null);
    state.playerHand = [1,2]; state.enemyHand = [1,2];
    const shivaShield = freshEntry(shiva, 'blue');
    state.board[4] = shivaShield;
    const crusher = freshEntry({ id:'c', name:'C', top:1,right:1,bottom:20,left:1 }, 'red');
    state.board[1] = crusher;
    resolveFlips(1, 'red');
    out.frostBarrierBlocked = state.board[4].owner === 'blue';
    out.frostBarrierUsed = shivaShield.shieldUsed === true;

    // Ice Touch: flat +2 on attack only, never on defense
    state.board = Array(9).fill(null);
    state.board[4] = freshEntry(shiva, 'blue');
    out.iceTouchAttack = fullEffectiveValue(shiva, 'top', null, 4, 'blue', 'attack') - shiva.top === 2;
    out.iceTouchNotDefense = fullEffectiveValue(shiva, 'top', null, 4, 'blue', 'defense') - shiva.top === 0;

    // Eternal Winter: +1 on all sides with 2+ adjacent enemies, +0 with only 1
    state.board = Array(9).fill(null);
    state.board[4] = freshEntry(shiva, 'blue');
    state.board[1] = freshEntry({ id:'e1', name:'E1', top:1,right:1,bottom:1,left:1 }, 'red');
    state.board[3] = freshEntry({ id:'e2', name:'E2', top:1,right:1,bottom:1,left:1 }, 'red');
    out.eternalWinterTwo = fullEffectiveValue(shiva, 'top', null, 4, 'blue', 'defense') - shiva.top === 1;
    state.board[3] = null;
    out.eternalWinterOne = fullEffectiveValue(shiva, 'top', null, 4, 'blue', 'defense') - shiva.top === 0;

    // Diamond Storm: AOE debuff, freeze ADJACENT enemies only (specialUsable
    // block), self-buff, and a temporary "execute weak foes" grant that
    // actually destroys a <=10-total-Power foe on Shiva's next win.
    state.board = Array(9).fill(null);
    state.turnCount = 20;
    const shivaUlt = freshEntry(shiva, 'blue');
    state.board[4] = shivaUlt;
    const adjEnemy = freshEntry({ id:'ae', name:'AE', top:5,right:5,bottom:5,left:5 }, 'red');
    const farEnemy = freshEntry({ id:'fe', name:'FE', top:5,right:5,bottom:5,left:5 }, 'red');
    state.board[1] = adjEnemy; state.board[8] = farEnemy;
    SPECIAL_HANDLERS.shiva({ srcEntry: shivaUlt, sourceIndex: 4, owner: 'blue' });
    out.ultDebuffAll = adjEnemy.captureBonus === -3 && farEnemy.captureBonus === -3;
    out.ultFreezeAdjacentOnly = adjEnemy.specialLockedUntilTurnCount === 24 && !(farEnemy.specialLockedUntilTurnCount > 0);
    out.ultSelfBuff = shivaUlt.captureBonus === 3;
    state.board[1] = null;
    const weakFoe = freshEntry({ id:'wk', name:'WK', top:1,right:1,bottom:1,left:1 }, 'red');
    state.board[1] = weakFoe;
    resolveFlips(4, 'blue');
    out.ultExecutesWeakFoe = state.board[1] === null;

    return out;
  })()`);
  assert.equal(result.playableAndEnemy, true);
  assert.equal(result.elementIce, true);
  assert.equal(result.frostAuraAdjacentOnly, true);
  assert.equal(result.diamondDust, true);
  assert.equal(result.frostBarrierBlocked, true);
  assert.equal(result.frostBarrierUsed, true);
  assert.equal(result.iceTouchAttack, true);
  assert.equal(result.iceTouchNotDefense, true);
  assert.equal(result.eternalWinterTwo, true);
  assert.equal(result.eternalWinterOne, true);
  assert.equal(result.ultDebuffAll, true);
  assert.equal(result.ultFreezeAdjacentOnly, true, "freeze only hits enemies actually adjacent to Shiva");
  assert.equal(result.ultSelfBuff, true);
  assert.equal(result.ultExecutesWeakFoe, true, "Diamond Storm's temporary execute-weak-foes grant fires on Shiva's next win");
  assert.deepEqual(pageErrors, []);
  await page.close();
});

test('Leviathan: Abyssal Presence on-place, Crushing Tide/Maelstrom/Abyssal Armor, Call of the Deep, Abyssal Deluge ultimate', async () => {
  const { page, pageErrors } = await newPage();
  const result = await page.evaluate(`(() => {
    ${freshEntrySnippet()}
    const out = {};
    const leviathan = findCardById('leviathan');
    out.playableAndEnemy = HEROES.some(h => h.id === 'leviathan') && FOREST_FOES.some(f => f.id === 'leviathan');
    out.elementWater = leviathan.element === 'water';

    state.board = Array(9).fill(null);
    state.playerHand = [1,2]; state.enemyHand = [1,2];
    const levEntry = freshEntry(leviathan, 'blue');
    state.board[4] = levEntry;
    const levAdj = freshEntry({ id:'la', name:'LA', top:1,right:1,bottom:1,left:1 }, 'red');
    state.board[1] = levAdj;
    ON_PLACE_HANDLERS.leviathan(levEntry, 'blue', 4);
    out.abyssalPresence = levAdj.captureBonus === -1;

    state.board = Array(9).fill(null);
    state.board[4] = freshEntry(leviathan, 'blue');
    state.board[1] = freshEntry({ id:'m1', name:'M1', top:1,right:1,bottom:1,left:1 }, 'red');
    state.board[3] = freshEntry({ id:'m2', name:'M2', top:1,right:1,bottom:1,left:1 }, 'red');
    out.maelstromTwo = fullEffectiveValue(leviathan, 'top', null, 4, 'blue', 'defense') - leviathan.top === 2;

    // Call of the Deep: +2 this round on any capture (on-capture hook, not on-win)
    state.board = Array(9).fill(null);
    state.playerHand = [1,2]; state.enemyHand = [1,2];
    const levCap = freshEntry(leviathan, 'blue');
    state.board[4] = levCap;
    state.board[1] = freshEntry({ id:'lw', name:'LW', top:1,right:1,bottom:1,left:1 }, 'red');
    resolveFlips(4, 'blue');
    out.callOfDeep = levCap.captureBonus === 2 && levCap.tempEffects && levCap.tempEffects.length === 1;

    // Abyssal Armor: one-time shield
    state.board = Array(9).fill(null);
    state.playerHand = [1,2]; state.enemyHand = [1,2];
    const levShield = freshEntry(leviathan, 'blue');
    state.board[4] = levShield;
    const levCrusher = freshEntry({ id:'lc', name:'LC', top:1,right:1,bottom:20,left:1 }, 'red');
    state.board[1] = levCrusher;
    resolveFlips(1, 'red');
    out.abyssalArmorBlocked = state.board[4].owner === 'blue';

    // Abyssal Deluge: adjacent enemies take an extra -1 (total -3 vs the
    // board-wide -2), self-buff, and a temporary "permanent +1 on any win
    // this round" grant that stacks with Call of the Deep's own on-capture bonus.
    state.board = Array(9).fill(null);
    state.turnCount = 30;
    const levUlt = freshEntry(leviathan, 'blue');
    state.board[4] = levUlt;
    const levAdjE = freshEntry({ id:'lae', name:'LAE', top:5,right:5,bottom:5,left:5 }, 'red');
    const levFarE = freshEntry({ id:'lfe', name:'LFE', top:5,right:5,bottom:5,left:5 }, 'red');
    state.board[1] = levAdjE; state.board[8] = levFarE;
    SPECIAL_HANDLERS.leviathan({ srcEntry: levUlt, sourceIndex: 4, owner: 'blue' });
    out.ultAdjacentExtra = levAdjE.captureBonus === -3;
    out.ultFarOnly = levFarE.captureBonus === -2;
    out.ultSelfBuff = levUlt.captureBonus === 3;
    state.board[1] = null;
    state.board[1] = freshEntry({ id:'lt', name:'LT', top:1,right:1,bottom:1,left:1 }, 'red');
    resolveFlips(4, 'blue');
    // +3 this-round (ultimate) + Call of the Deep's own +2-this-round (also fires on this capture) + the ultimate's new permanent +1
    out.ultPermanentOnWin = levUlt.captureBonus === 3 + 2 + 1;

    return out;
  })()`);
  assert.equal(result.playableAndEnemy, true);
  assert.equal(result.elementWater, true);
  assert.equal(result.abyssalPresence, true);
  assert.equal(result.maelstromTwo, true);
  assert.equal(result.callOfDeep, true);
  assert.equal(result.abyssalArmorBlocked, true);
  assert.equal(result.ultAdjacentExtra, true);
  assert.equal(result.ultFarOnly, true);
  assert.equal(result.ultSelfBuff, true);
  assert.equal(result.ultPermanentOnWin, true, "the ultimate's permanent-on-win grant stacks with Call of the Deep's own on-capture bonus");
  assert.deepEqual(pageErrors, []);
  await page.close();
});

test('Omega Weapon: Omega Core debuffImmune, Anti-Matter Cannon (once/match), Absolute Defense (resets each round), Destroyer Protocol, Omega Protocol ultimate', async () => {
  const { page, pageErrors } = await newPage();
  const result = await page.evaluate(`(() => {
    ${freshEntrySnippet()}
    const out = {};
    const omega = findCardById('omegaweapon');
    out.playableAndEnemy = HEROES.some(h => h.id === 'omegaweapon') && FOREST_FOES.some(f => f.id === 'omegaweapon');

    out.debuffImmune = (() => {
      state.board = Array(9).fill(null);
      const o = freshEntry(omega, 'blue');
      state.board[4] = o;
      SpecialVerbs.debuff(o, 5);
      return o.captureBonus === 0;
    })();

    state.board = Array(9).fill(null);
    state.playerHand = [1,2]; state.enemyHand = [1,2];
    const omegaWinner = freshEntry(omega, 'blue');
    state.board[4] = omegaWinner;
    const omegaLoser = freshEntry({ id:'ol', name:'OL', top:1,right:1,bottom:1,left:1 }, 'red');
    state.board[1] = omegaLoser;
    resolveFlips(4, 'blue');
    out.hyperPulse = omegaLoser.captureBonus === -2;

    // Anti-Matter Cannon: +4 vs a stronger total-Power foe, but only once ever
    out.antiMatterVsStronger = fullEffectiveValue(omega, 'top', {top:10,right:10,bottom:10,left:10}, 4, 'blue', 'attack') - omega.top === 4;
    out.antiMatterNotVsWeaker = fullEffectiveValue(omega, 'top', {top:1,right:1,bottom:1,left:1}, 4, 'blue', 'attack') - omega.top === 0;
    state.board = Array(9).fill(null);
    state.playerHand = [1,2]; state.enemyHand = [1,2];
    const omegaAtk = freshEntry(omega, 'blue');
    state.board[4] = omegaAtk;
    state.board[1] = freshEntry({ id:'sf', name:'SF', top:10,right:10,bottom:10,left:10 }, 'red');
    resolveFlips(4, 'blue');
    out.antiMatterConsumedAfterRealAttack = omegaAtk.vsStrongerBoostUsed === true;

    // Absolute Defense: unlike every other card's one-time shield, this one
    // resets via sweepExpiredRoundEffects (called on every turn switch).
    state.board = Array(9).fill(null);
    state.playerHand = [1,2]; state.enemyHand = [1,2];
    const omegaDef = freshEntry(omega, 'blue');
    state.board[4] = omegaDef;
    const bigHit = freshEntry({ id:'b1', name:'B1', top:1,right:1,bottom:20,left:1 }, 'red');
    state.board[1] = bigHit;
    resolveFlips(1, 'red');
    out.absoluteDefenseBlocksFirst = state.board[4].owner === 'blue';
    out.shieldUsedAfterFirst = omegaDef.shieldUsed === true;
    sweepExpiredRoundEffects();
    out.shieldResetsEachRound = omegaDef.shieldUsed === false;

    // Destroyer Protocol: capped at +3 total, +1 per enemy destroyed
    state.board = Array(9).fill(null);
    const omegaDestroyer = freshEntry(omega, 'blue');
    state.board[4] = omegaDestroyer;
    state.board[0] = freshEntry({ id:'d0', name:'D0', top:1,right:1,bottom:1,left:1 }, 'red');
    state.board[1] = freshEntry({ id:'d1', name:'D1', top:1,right:1,bottom:1,left:1 }, 'red');
    state.board[2] = freshEntry({ id:'d2', name:'D2', top:1,right:1,bottom:1,left:1 }, 'red');
    state.board[3] = freshEntry({ id:'d3', name:'D3', top:1,right:1,bottom:1,left:1 }, 'red');
    destroyCard(0); destroyCard(1); destroyCard(2); destroyCard(3);
    out.destroyerProtocolCapped = omegaDestroyer.captureBonus === 3;

    // Omega Protocol ultimate: destroys only foes whose weakest side is
    // <=5 AFTER the ultimate's own -3 debuff, spares tankier foes (merely
    // debuffing them), and Destroyer Protocol's capped self-buff fires
    // automatically through the shared destroyCard() hook for each kill.
    state.board = Array(9).fill(null);
    const omegaUlt = freshEntry(omega, 'blue');
    state.board[4] = omegaUlt;
    const weakOmegaFoe = freshEntry({ id:'wof', name:'WOF', top:5,right:5,bottom:5,left:5 }, 'red');
    const tankyOmegaFoe = freshEntry({ id:'tof', name:'TOF', top:9,right:9,bottom:9,left:9 }, 'red');
    state.board[1] = weakOmegaFoe; state.board[2] = tankyOmegaFoe;
    SPECIAL_HANDLERS.omegaweapon({ srcEntry: omegaUlt, owner: 'blue' });
    out.ultDestroysWeak = state.board[1] === null;
    out.ultSparesTanky = state.board[2] !== null && tankyOmegaFoe.captureBonus === -3;
    out.ultSelfBuff = omegaUlt.captureBonus === 3 + 1;

    return out;
  })()`);
  assert.equal(result.playableAndEnemy, true);
  assert.equal(result.debuffImmune, true);
  assert.equal(result.hyperPulse, true);
  assert.equal(result.antiMatterVsStronger, true);
  assert.equal(result.antiMatterNotVsWeaker, true);
  assert.equal(result.antiMatterConsumedAfterRealAttack, true);
  assert.equal(result.absoluteDefenseBlocksFirst, true);
  assert.equal(result.shieldUsedAfterFirst, true);
  assert.equal(result.shieldResetsEachRound, true, "Absolute Defense resets each round, unlike every other card's one-time shield");
  assert.equal(result.destroyerProtocolCapped, true);
  assert.equal(result.ultDestroysWeak, true);
  assert.equal(result.ultSparesTanky, true);
  assert.equal(result.ultSelfBuff, true);
  assert.deepEqual(pageErrors, []);
  await page.close();
});

test("Yojimbo: Mercenary's Code, Daigoro's Hunt/Price of Death/Kozuka/Wakizashi, Zanmato ultimate with cost refund", async () => {
  const { page, pageErrors } = await newPage();
  const result = await page.evaluate(`(() => {
    ${freshEntrySnippet()}
    const out = {};
    const yojimbo = findCardById('yojimbo');
    out.playableAndEnemy = HEROES.some(h => h.id === 'yojimbo') && FOREST_FOES.some(f => f.id === 'yojimbo');
    state.playerHand = [1,2,3]; state.enemyHand = [1,2,3];

    // Mercenary's Code: checked once, AT placement time, not a live aura
    state.board = Array(9).fill(null);
    state.board[0] = freshEntry({ id:'x0', name:'X0', top:1,right:1,bottom:1,left:1 }, 'red');
    state.board[1] = freshEntry({ id:'x1', name:'X1', top:1,right:1,bottom:1,left:1 }, 'red');
    const yojEntry = freshEntry(yojimbo, 'blue');
    state.board[4] = yojEntry;
    ON_PLACE_HANDLERS.yojimbo(yojEntry, 'blue');
    out.mercenaryCodeTriggers = yojEntry.captureBonus === 1;
    state.board = Array(9).fill(null);
    const yojEntry2 = freshEntry(yojimbo, 'blue');
    state.board[4] = yojEntry2;
    ON_PLACE_HANDLERS.yojimbo(yojEntry2, 'blue');
    out.mercenaryCodeNoTrigger = yojEntry2.captureBonus === 0;

    // Daigoro's Hunt: permanent -1 on win (uncapped, unlike onWinDebuffOnce)
    state.board = Array(9).fill(null);
    const yojWinner = freshEntry(yojimbo, 'blue');
    state.board[4] = yojWinner;
    const yojLoser = freshEntry({ id:'yl', name:'YL', top:1,right:1,bottom:1,left:1 }, 'red');
    state.board[1] = yojLoser;
    resolveFlips(4, 'blue');
    out.daigorosHunt = yojLoser.captureBonus === -1;

    // Price of Death: +3 attacking a stronger-total-power foe, every attack (no cap)
    state.board = Array(9).fill(null);
    out.priceOfDeath = fullEffectiveValue(yojimbo, 'top', {top:10,right:10,bottom:10,left:10}, 4, 'blue', 'attack') - yojimbo.top === 3;
    out.priceOfDeathNotVsWeaker = fullEffectiveValue(yojimbo, 'top', {top:1,right:1,bottom:1,left:1}, 4, 'blue', 'attack') - yojimbo.top === 0;

    // Kozuka: once per match, +2 on any attack regardless of the opponent
    state.board = Array(9).fill(null);
    state.board[4] = freshEntry(yojimbo, 'blue');
    out.kozukaFirstAttack = fullEffectiveValue(yojimbo, 'top', null, 4, 'blue', 'attack') - yojimbo.top === 2;
    state.board = Array(9).fill(null);
    const yojKozuka = freshEntry(yojimbo, 'blue');
    state.board[4] = yojKozuka;
    const kozTarget = freshEntry({ id:'kt', name:'KT', top:1,right:1,bottom:9,left:1 }, 'red'); // bottom 9 ties yojimbo's top(9) normally — Kozuka's +2 wins it
    state.board[1] = kozTarget;
    resolveFlips(4, 'blue');
    out.kozukaWonTieViaBoost = state.board[1].owner === 'blue';
    out.kozukaConsumed = yojKozuka.oncePerMatchAttackBoostUsed === true;
    // Wakizashi's onCaptureBonus (+1 permanent) legitimately persists here too
    out.kozukaNotReapplied = fullEffectiveValue(yojimbo, 'top', null, 4, 'blue', 'attack') - yojimbo.top === 1;

    // Wakizashi reuses the existing onCaptureBonus primitive directly
    out.wakizashiIsOnCaptureBonus = yojimbo.active.onCaptureBonus === 1;

    // Zanmato: destroys on a 3+ margin win, and the "costs only 2 Wins vs a
    // stronger target" clause is a 1-Win refund after the normal deduction
    // (which happens in runSpecialResolution, not the handler itself — so
    // calling the handler directly here just checks the refund math).
    state.board = Array(9).fill(null);
    state.wins = { blue: 3, red: 0 };
    const yojUlt = freshEntry(yojimbo, 'blue');
    state.board[4] = yojUlt;
    const zanWeak = freshEntry({ id:'zt', name:'ZT', top:1,right:1,bottom:1,left:1 }, 'red');
    state.board[1] = zanWeak;
    SPECIAL_HANDLERS.yojimbo({ srcEntry: yojUlt, targetEntry: zanWeak, targetIndex: 1, owner: 'blue' });
    out.zanmatoDestroysOnBigMargin = state.board[1] === null;
    out.zanmatoNoRefundVsWeaker = state.wins.blue === 3;

    state.board = Array(9).fill(null);
    state.wins = { blue: 3, red: 0 };
    const yojUlt2 = freshEntry(yojimbo, 'blue');
    yojUlt2.captureBonus = 10; // gives Yojimbo enough total Power to still win despite the target's higher printed total
    state.board[4] = yojUlt2;
    const zanStrong = freshEntry({ id:'zs2', name:'ZS2', top:10,right:10,bottom:10,left:9 }, 'red');
    state.board[1] = zanStrong;
    SPECIAL_HANDLERS.yojimbo({ srcEntry: yojUlt2, targetEntry: zanStrong, targetIndex: 1, owner: 'blue' });
    out.zanmatoRefundVsStrongerRaw = state.wins.blue === 4;

    return out;
  })()`);
  assert.equal(result.playableAndEnemy, true);
  assert.equal(result.mercenaryCodeTriggers, true);
  assert.equal(result.mercenaryCodeNoTrigger, true);
  assert.equal(result.daigorosHunt, true);
  assert.equal(result.priceOfDeath, true);
  assert.equal(result.priceOfDeathNotVsWeaker, true);
  assert.equal(result.kozukaFirstAttack, true);
  assert.equal(result.kozukaWonTieViaBoost, true);
  assert.equal(result.kozukaConsumed, true);
  assert.equal(result.kozukaNotReapplied, true, "Wakizashi's own permanent onCaptureBonus persists after Kozuka's boost is spent");
  assert.equal(result.wakizashiIsOnCaptureBonus, true);
  assert.equal(result.zanmatoDestroysOnBigMargin, true);
  assert.equal(result.zanmatoNoRefundVsWeaker, true);
  assert.equal(result.zanmatoRefundVsStrongerRaw, true, "Zanmato's discount vs a stronger target is a 1-Win refund after the normal deduction");
  assert.deepEqual(pageErrors, []);
  await page.close();
});

test('Chocobo King: Golden Feathers (isBeast tag), Choco Dash/Royal Plumage/Feather Storm, Royal Choco Meteor ultimate', async () => {
  const { page, pageErrors } = await newPage();
  const result = await page.evaluate(`(() => {
    ${freshEntrySnippet()}
    const out = {};
    const chocobo = findCardById('chocoboking');
    out.playableAndEnemy = HEROES.some(h => h.id === 'chocoboking') && FOREST_FOES.some(f => f.id === 'chocoboking');
    out.isBeastTag = chocobo.isBeast === true;

    // Golden Feathers: self +1 this round, PLUS an adjacent allied Beast
    // card also gets +1 — a non-Beast adjacent ally does not.
    state.board = Array(9).fill(null);
    state.playerHand = [1,2]; state.enemyHand = [1,2];
    const chocoEntry = freshEntry(chocobo, 'blue');
    const beastAlly = freshEntry({ id:'ba', name:'BA', top:1,right:1,bottom:1,left:1, isBeast:true }, 'blue');
    const nonBeastAlly = freshEntry({ id:'nba', name:'NBA', top:1,right:1,bottom:1,left:1 }, 'blue');
    state.board[1] = beastAlly; state.board[3] = nonBeastAlly;
    state.board[4] = chocoEntry;
    ON_PLACE_HANDLERS.chocoboking(chocoEntry, 'blue', 4);
    out.selfBuffOnPlace = chocoEntry.captureBonus === 1;
    out.beastAllyBuffed = beastAlly.captureBonus === 1;
    out.nonBeastAllyNotBuffed = nonBeastAlly.captureBonus === 0;

    // Choco Dash: flat +2 on attack only
    state.board = Array(9).fill(null);
    out.chocoDash = fullEffectiveValue(chocobo, 'top', null, 4, 'blue', 'attack') - chocobo.top === 2;
    out.chocoDashNotDefense = fullEffectiveValue(chocobo, 'top', null, 4, 'blue', 'defense') - chocobo.top === 0;

    // Royal Plumage: one-time shield
    state.board = Array(9).fill(null);
    state.playerHand = [1,2]; state.enemyHand = [1,2];
    const chocoShield = freshEntry(chocobo, 'blue');
    state.board[4] = chocoShield;
    const chocoCrusher = freshEntry({ id:'cc', name:'CC', top:1,right:1,bottom:20,left:1 }, 'red');
    state.board[1] = chocoCrusher;
    resolveFlips(1, 'red');
    out.royalPlumageBlocked = state.board[4].owner === 'blue';

    // Feather Storm: a random ADJACENT enemy (not necessarily the loser of
    // this battle) gets -2 this round. Calls checkOnWinBonuses directly —
    // same reasoning as Naline's Healing Radiance test: a real battle here
    // would flip every adjacent enemy Chocobo King's strong stats beat,
    // leaving no still-enemy-owned bystander for the random pick to land on.
    state.board = Array(9).fill(null);
    const chocoWinner = freshEntry(chocobo, 'blue');
    state.board[4] = chocoWinner;
    const chocoBystander = freshEntry({ id:'cb', name:'CB', top:1,right:1,bottom:1,left:1 }, 'red');
    state.board[3] = chocoBystander;
    const chocoDetachedLoser = freshEntry({ id:'dl', name:'DL', top:1,right:1,bottom:1,left:1 }, 'blue');
    checkOnWinBonuses(chocoWinner, 'top', chocoDetachedLoser, null, 4, 10);
    out.featherStormHitsBystander = chocoBystander.captureBonus === -2;

    // Royal Choco Meteor: target at index0 (a corner, NOT adjacent to
    // Chocobo King at index4) so King's Command's own adjacent-ally buff
    // doesn't also land on the just-flipped target and muddy the
    // -2-this-round assertion; chocoAlly at index1 covers that separately.
    state.board = Array(9).fill(null);
    const chocoUlt = freshEntry(chocobo, 'blue');
    state.board[4] = chocoUlt;
    const chocoAlly = freshEntry({ id:'ca', name:'CA', top:1,right:1,bottom:1,left:1 }, 'blue');
    state.board[1] = chocoAlly;
    const chocoTarget = freshEntry({ id:'ct', name:'CT', top:1,right:1,bottom:1,left:1 }, 'red');
    state.board[0] = chocoTarget;
    state.extraTurnPending = null;
    SPECIAL_HANDLERS.chocoboking({ srcEntry: chocoUlt, sourceIndex: 4, targetEntry: chocoTarget, targetIndex: 0, owner: 'blue' });
    out.ultCapturesTarget = state.board[0].owner === 'blue';
    out.ultDebuffsTarget = chocoTarget.captureBonus === -2;
    out.ultBuffsAdjacentAlly = chocoAlly.captureBonus === 1;
    out.ultExtraTurn = state.extraTurnPending === 'blue';

    return out;
  })()`);
  assert.equal(result.playableAndEnemy, true);
  assert.equal(result.isBeastTag, true);
  assert.equal(result.selfBuffOnPlace, true);
  assert.equal(result.beastAllyBuffed, true);
  assert.equal(result.nonBeastAllyNotBuffed, true);
  assert.equal(result.chocoDash, true);
  assert.equal(result.chocoDashNotDefense, true);
  assert.equal(result.royalPlumageBlocked, true);
  assert.equal(result.featherStormHitsBystander, true);
  assert.equal(result.ultCapturesTarget, true);
  assert.equal(result.ultDebuffsTarget, true);
  assert.equal(result.ultBuffsAdjacentAlly, true);
  assert.equal(result.ultExtraTurn, true);
  assert.deepEqual(pageErrors, []);
  await page.close();
});

test("Odin: Allfather's Gaze (board-wide on-place), Gungnir Strike, Warrior's Soul, Valhalla's Call (board-wide on-capture), Zantetsuken ultimate", async () => {
  const { page, pageErrors } = await newPage();
  const result = await page.evaluate(`(() => {
    ${freshEntrySnippet()}
    const out = {};
    const odin = findCardById('odin');
    out.playableAndEnemy = HEROES.some(h => h.id === 'odin') && FOREST_FOES.some(f => f.id === 'odin');

    // Allfather's Gaze: hits EVERY enemy on the board, not just adjacent
    // ones (unlike Shiva/Leviathan's Frost Aura/Abyssal Presence).
    state.board = Array(9).fill(null);
    state.playerHand = [1,2]; state.enemyHand = [1,2];
    const odinEntry = freshEntry(odin, 'blue');
    state.board[4] = odinEntry;
    const odinAdjFoe = freshEntry({ id:'oaf', name:'OAF', top:1,right:1,bottom:1,left:1 }, 'red');
    const odinFarFoe = freshEntry({ id:'off', name:'OFF', top:1,right:1,bottom:1,left:1 }, 'red');
    state.board[1] = odinAdjFoe; state.board[8] = odinFarFoe;
    ON_PLACE_HANDLERS.odin(odinEntry, 'blue');
    out.allfathersGazeBoardWide = odinAdjFoe.captureBonus === -1 && odinFarFoe.captureBonus === -1;

    // Gungnir Strike: flat +2 on attack only
    state.board = Array(9).fill(null);
    out.gungnirStrike = fullEffectiveValue(odin, 'top', null, 4, 'blue', 'attack') - odin.top === 2;

    // Warrior's Soul: one-time shield
    state.board = Array(9).fill(null);
    state.playerHand = [1,2]; state.enemyHand = [1,2];
    const odinShield = freshEntry(odin, 'blue');
    state.board[4] = odinShield;
    const odinCrusher = freshEntry({ id:'oc', name:'OC', top:1,right:1,bottom:20,left:1 }, 'red');
    state.board[1] = odinCrusher;
    resolveFlips(1, 'red');
    out.warriorsSoulBlocked = state.board[4].owner === 'blue';

    // Valhalla's Call: buffs EVERY allied card on-capture, board-wide (unlike
    // Chocobo King's King's Command, which is adjacent-only).
    state.board = Array(9).fill(null);
    state.playerHand = [1,2]; state.enemyHand = [1,2];
    const odinCap = freshEntry(odin, 'blue');
    state.board[4] = odinCap;
    const odinFarAlly = freshEntry({ id:'ofa', name:'OFA', top:1,right:1,bottom:1,left:1 }, 'blue');
    state.board[8] = odinFarAlly;
    state.board[1] = freshEntry({ id:'ow', name:'OW', top:1,right:1,bottom:1,left:1 }, 'red');
    resolveFlips(4, 'blue');
    out.valhallasCallBoardWide = odinFarAlly.captureBonus === 1;

    // Zantetsuken: permanent -3 to the target (respects debuffImmune via
    // SpecialVerbs.debuff), -1 this round to every OTHER enemy, +3 this
    // round to Odin himself.
    state.board = Array(9).fill(null);
    const odinUlt = freshEntry(odin, 'blue');
    state.board[4] = odinUlt;
    const odinTarget = freshEntry({ id:'ot', name:'OT', top:1,right:1,bottom:1,left:1 }, 'red');
    const odinOther = freshEntry({ id:'oo', name:'OO', top:1,right:1,bottom:1,left:1 }, 'red');
    state.board[1] = odinTarget; state.board[8] = odinOther;
    SPECIAL_HANDLERS.odin({ srcEntry: odinUlt, targetEntry: odinTarget, targetIndex: 1, owner: 'blue' });
    out.ultCapturesAndDebuffsTarget = state.board[1].owner === 'blue' && odinTarget.captureBonus === -3;
    out.ultDebuffsOthersThisRound = odinOther.captureBonus === -1;
    out.ultSelfBuff = odinUlt.captureBonus === 3;

    return out;
  })()`);
  assert.equal(result.playableAndEnemy, true);
  assert.equal(result.allfathersGazeBoardWide, true);
  assert.equal(result.gungnirStrike, true);
  assert.equal(result.warriorsSoulBlocked, true);
  assert.equal(result.valhallasCallBoardWide, true);
  assert.equal(result.ultCapturesAndDebuffsTarget, true);
  assert.equal(result.ultDebuffsOthersThisRound, true);
  assert.equal(result.ultSelfBuff, true);
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
