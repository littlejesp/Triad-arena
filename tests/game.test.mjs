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
