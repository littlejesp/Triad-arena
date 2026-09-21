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
  const result = await page.evaluate(`(async () => {
    ${freshEntrySnippet()}
    state.board = Array(9).fill(null);
    state.board[4] = freshEntry(findCardById('pallispell'), 'blue');
    state.board[1] = freshEntry(findCardById('ogre'), 'red');
    state.wins = { blue: 5, red: 5 };
    state.specialUsed = {};
    state.conquestPopup = false;
    runSpecialResolution(4, null, {});
    // Game feel phase 4: the effect no longer resolves synchronously —
    // runSpecialResolution now plays a windup beat first (see
    // playUltimateSequence). Wait past it before reading the result.
    await new Promise(r => setTimeout(r, ULTIMATE_WINDUP_MS + 50));
    return { ownerAfter: state.board[1].owner, conquestPopup: state.conquestPopup };
  })()`);
  assert.equal(result.ownerAfter, 'blue');
  assert.equal(result.conquestPopup, 'blue');
  assert.deepEqual(pageErrors, []);
  await page.close();
});

test('Hunter\'s Wrath: each defeated card permanently loses 2 Power on all sides, on top of the both-flipped self-buff', async () => {
  const { page, pageErrors } = await newPage();
  const result = await page.evaluate(`(async () => {
    ${freshEntrySnippet()}
    state.board = Array(9).fill(null);
    const src = freshEntry(findCardById('pallispell'), 'blue');
    state.board[4] = src;
    state.board[1] = freshEntry(findCardById('ogre'), 'red');
    state.board[7] = freshEntry(findCardById('ogre'), 'red');
    state.wins = { blue: 5, red: 5 };
    state.specialUsed = {};
    runSpecialResolution(4, null, {});
    await new Promise(r => setTimeout(r, ULTIMATE_WINDUP_MS + 50));
    return {
      firstFlipped: state.board[1].owner === 'blue',
      secondFlipped: state.board[7].owner === 'blue',
      firstDebuff: state.board[1].captureBonus,
      secondDebuff: state.board[7].captureBonus,
      selfBuffApplied: src.captureBonus,
    };
  })()`);
  assert.equal(result.firstFlipped, true);
  assert.equal(result.secondFlipped, true);
  assert.equal(result.firstDebuff, -2, 'defeated card permanently loses 2 Power on all sides');
  assert.equal(result.secondDebuff, -2, 'defeated card permanently loses 2 Power on all sides');
  assert.equal(result.selfBuffApplied, 1, 'both targets flipped, so Pallis and Pell still gain the existing +1 self-buff');
  assert.deepEqual(pageErrors, []);
  await page.close();
});

test('conquest banner: a non-capturing special (Deathblade\'s swap) does not trigger it', async () => {
  const { page, pageErrors } = await newPage();
  const result = await page.evaluate(`(async () => {
    ${freshEntrySnippet()}
    state.board = Array(9).fill(null);
    state.board[4] = freshEntry(findCardById('deathblade'), 'blue');
    state.board[1] = freshEntry(findCardById('tiamat'), 'red');
    state.wins = { blue: 5, red: 5 };
    state.specialUsed = {};
    state.conquestPopup = false;
    runSpecialResolution(4, 1, {});
    await new Promise(r => setTimeout(r, ULTIMATE_WINDUP_MS + 50));
    return { conquestPopup: state.conquestPopup };
  })()`);
  assert.equal(result.conquestPopup, false);
  assert.deepEqual(pageErrors, []);
  await page.close();
});

test('conquest banner: a stale justFlipped flag elsewhere on the board is not a false positive', async () => {
  const { page, pageErrors } = await newPage();
  const result = await page.evaluate(`(async () => {
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
    await new Promise(r => setTimeout(r, ULTIMATE_WINDUP_MS + 50));
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

test("Tiamat: second Fivefold Apocalypse rework -- Ice/Storm/Void/Nature are now mechanically distinct (Fire's behavior, tested above, is unchanged)", async () => {
  const { page, pageErrors } = await newPage();
  const result = await page.evaluate(`(() => {
    ${freshEntrySnippet()}
    const out = {};
    const tiamat = findCardById('tiamat'); // total 38 (10+9+10+9)

    // Ice: no self-boost, but -3 to the target's defense this attack.
    // A target with total 39 (1 more than Tiamat's raw 38) would repel a
    // plain attack, but Ice's -3 flips it into a win -- and unlike Fire,
    // no permanent captureBonus is granted.
    state.board = Array(9).fill(null);
    const iceSrc = freshEntry(tiamat, 'blue');
    state.board[4] = iceSrc;
    const iceTarget = freshEntry({ id:'ice-test', name:'IceTest', top:10,right:10,bottom:10,left:9 }, 'red'); // total 39
    state.board[1] = iceTarget;
    SPECIAL_HANDLERS.tiamat({ srcEntry: iceSrc, targetEntry: iceTarget, targetIndex: 1, owner: 'blue', power: 'ice' });
    out.iceCaptured = iceTarget.owner === 'blue';
    out.iceNoPermanentBonus = iceSrc.captureBonus === 0;

    // Storm: +3 attack; on win, every OTHER adjacent-to-target enemy gets
    // -1 Power this round -- but not an allied card in the same spot, and
    // not a permanent captureBonus on Tiamat herself.
    state.board = Array(9).fill(null);
    const stormSrc = freshEntry(tiamat, 'blue');
    state.board[4] = stormSrc; // center, 'up' neighbor is index 1
    const stormTarget = freshEntry(findCardById('ogre'), 'red');
    state.board[1] = stormTarget; // weak target, easily won regardless of power
    const stormEnemyNeighbor = freshEntry(findCardById('ogre'), 'red');
    state.board[0] = stormEnemyNeighbor; // adjacent to target (index 1), not to Tiamat
    const stormAllyNeighbor = freshEntry(findCardById('ogre'), 'blue');
    state.board[2] = stormAllyNeighbor; // also adjacent to target, but allied
    SPECIAL_HANDLERS.tiamat({ srcEntry: stormSrc, targetEntry: stormTarget, targetIndex: 1, owner: 'blue', power: 'storm' });
    out.stormCaptured = stormTarget.owner === 'blue';
    out.stormNoPermanentBonus = stormSrc.captureBonus === 0;
    out.stormHitEnemyNeighbor = stormEnemyNeighbor.captureBonus === -1;
    out.stormSparedAllyNeighbor = stormAllyNeighbor.captureBonus === 0;

    // Void: destroys outright (board cell goes null, not captured) when the
    // target's total Power is 10 or lower; a sturdier target just gets
    // captured normally; destroyImmune blocks the destroy and falls back
    // to a normal capture.
    state.board = Array(9).fill(null);
    const voidSrcWeak = freshEntry(tiamat, 'blue');
    state.board[4] = voidSrcWeak;
    const weakTarget = freshEntry({ id:'void-weak', name:'VoidWeak', top:2,right:2,bottom:2,left:2 }, 'red'); // total 8
    state.board[1] = weakTarget;
    SPECIAL_HANDLERS.tiamat({ srcEntry: voidSrcWeak, targetEntry: weakTarget, targetIndex: 1, owner: 'blue', power: 'void' });
    out.voidDestroyedWeak = state.board[1] === null;

    state.board = Array(9).fill(null);
    const voidSrcSturdy = freshEntry(tiamat, 'blue');
    state.board[4] = voidSrcSturdy;
    const sturdyTarget = freshEntry(findCardById('ogre'), 'red'); // total 25, above the threshold
    state.board[1] = sturdyTarget;
    SPECIAL_HANDLERS.tiamat({ srcEntry: voidSrcSturdy, targetEntry: sturdyTarget, targetIndex: 1, owner: 'blue', power: 'void' });
    out.voidCapturedSturdy = state.board[1] !== null && state.board[1].owner === 'blue';

    state.board = Array(9).fill(null);
    const voidSrcImmune = freshEntry(tiamat, 'blue');
    state.board[4] = voidSrcImmune;
    const immuneTarget = freshEntry({ id:'void-immune', name:'VoidImmune', top:2,right:2,bottom:2,left:2, active:{destroyImmune:true} }, 'red');
    state.board[1] = immuneTarget;
    SPECIAL_HANDLERS.tiamat({ srcEntry: voidSrcImmune, targetEntry: immuneTarget, targetIndex: 1, owner: 'blue', power: 'void' });
    out.voidRespectsDestroyImmune = state.board[1] !== null && state.board[1].owner === 'blue';

    // Nature: +2 attack; on win, cleanses negative effects on Tiamat's
    // WHOLE side (captureBonus<0 reset to 0, tempEffects cleared) --
    // a positive captureBonus ally is left untouched.
    state.board = Array(9).fill(null);
    const natureSrc = freshEntry(tiamat, 'blue');
    state.board[4] = natureSrc;
    const natureTarget = freshEntry(findCardById('ogre'), 'red');
    state.board[1] = natureTarget;
    const debuffedAlly = freshEntry(findCardById('ogre'), 'blue');
    debuffedAlly.captureBonus = -2;
    debuffedAlly.tempEffects = [{ captureDelta: -2, expiresAtTurnCount: 999 }];
    state.board[0] = debuffedAlly;
    const buffedAlly = freshEntry(findCardById('ogre'), 'blue');
    buffedAlly.captureBonus = 3;
    state.board[2] = buffedAlly;
    SPECIAL_HANDLERS.tiamat({ srcEntry: natureSrc, targetEntry: natureTarget, targetIndex: 1, owner: 'blue', power: 'nature' });
    out.natureCleansedNegative = debuffedAlly.captureBonus === 0 && debuffedAlly.tempEffects.length === 0;
    out.naturePreservedPositive = buffedAlly.captureBonus === 3;

    return out;
  })()`);
  assert.equal(result.iceCaptured, true, "Ice's -3 to the target should turn a would-be repel into a win");
  assert.equal(result.iceNoPermanentBonus, true, 'Ice grants no permanent captureBonus, unlike Fire');
  assert.equal(result.stormCaptured, true);
  assert.equal(result.stormNoPermanentBonus, true, 'Storm grants no permanent captureBonus, unlike Fire');
  assert.equal(result.stormHitEnemyNeighbor, true, "Storm's splash debuffs other enemies adjacent to the captured cell");
  assert.equal(result.stormSparedAllyNeighbor, true, "Storm's splash must not hit Tiamat's own side");
  assert.equal(result.voidDestroyedWeak, true, 'Void destroys a target at or below 10 total Power outright');
  assert.equal(result.voidCapturedSturdy, true, 'Void just captures normally above the threshold');
  assert.equal(result.voidRespectsDestroyImmune, true, 'destroyImmune blocks the destroy, falling back to a normal capture');
  assert.equal(result.natureCleansedNegative, true, "Nature cleanses negative captureBonus/tempEffects on Tiamat's whole side");
  assert.equal(result.naturePreservedPositive, true, 'Nature must not touch an already-positive captureBonus');
  assert.deepEqual(pageErrors, []);
  await page.close();
});

test("Three Head Dragon: Poison's Torment marks whoever beats it, -2 on that entry's next attack only", async () => {
  const { page, pageErrors } = await newPage();
  const result = await page.evaluate(`(() => {
    ${freshEntrySnippet()}
    const out = {};
    const dragon = findCardById('threeheaddragon');

    // Case A: Three Head Dragon loses as the DEFENDER (a stronger card is
    // placed next to it and wins) -- the WINNER gets tagged.
    state.board = Array(9).fill(null);
    state.playerHand = [1,2]; state.enemyHand = [1,2];
    const weakDragon = freshEntry({ ...dragon, top:1, right:1, bottom:1, left:1 }, 'blue');
    state.board[1] = weakDragon;
    state.playerHand = [];
    state.enemyHand = [{ id:'strong-atk', name:'StrongAtk', top:9,right:9,bottom:9,left:9 }];
    placeCard(4, 'strong-atk', 'red'); // 'up' edge attacks weakDragon's 'bottom'
    const winner = state.board[4];
    out.defenderLossTaggedWinner = winner.poisonedTorment === true;

    // That winner's NEXT attack (any later placement) takes -2 -- proven by
    // pitting it against a target it would otherwise juuust beat, but loses
    // to once poisoned.
    state.board = Array(9).fill(null);
    state.board[4] = winner; // carries poisonedTorment:true from above
    const marginTarget = freshEntry({ id:'margin-test', name:'MarginTest', top:8,right:8,bottom:8,left:8 }, 'red'); // 9 vs 8 would normally win
    state.board[1] = marginTarget;
    const battleResult = { flipSeq: 0, flips: 0, shielded: 0, bonusTriggered: false };
    battleNeighbors(4, 'blue', battleResult);
    out.poisonedAttackLost = marginTarget.owner === 'red'; // -2 turns a 9-vs-8 win into a 7-vs-8 loss
    out.flagClearedAfterUse = winner.poisonedTorment === false;

    // A SECOND attack after the flag is consumed must NOT still apply -2.
    state.board = Array(9).fill(null);
    state.board[4] = winner;
    const secondTarget = freshEntry({ id:'second-test', name:'SecondTest', top:8,right:8,bottom:8,left:8 }, 'red');
    state.board[1] = secondTarget;
    battleNeighbors(4, 'blue', { flipSeq: 0, flips: 0, shielded: 0, bonusTriggered: false });
    out.secondAttackNotPoisoned = secondTarget.owner === 'blue';

    // Case B: Three Head Dragon loses as the ATTACKER (freshly placed,
    // loses to a stronger neighbor already on the board) -- the successful
    // DEFENDER gets tagged instead.
    state.board = Array(9).fill(null);
    state.playerHand = [1,2]; state.enemyHand = [1,2];
    const defender = freshEntry({ id:'strong-def', name:'StrongDef', top:1,right:1,bottom:9,left:1 }, 'red');
    state.board[1] = defender; // 'bottom' edge (9) faces down into index 4
    state.playerHand = [{ ...dragon, top:1, right:1, bottom:1, left:1 }];
    state.enemyHand = [];
    placeCard(4, dragon.id, 'blue');
    out.attackerLossTaggedDefender = defender.poisonedTorment === true;

    // debuffImmune (The Eclipse Fenrir) must block the tag entirely.
    state.board = Array(9).fill(null);
    state.playerHand = [1,2]; state.enemyHand = [1,2];
    const weakDragon2 = freshEntry({ ...dragon, top:1, right:1, bottom:1, left:1 }, 'blue');
    state.board[1] = weakDragon2;
    state.playerHand = [];
    state.enemyHand = [{ ...findCardById('fenrir'), top:9,right:9,bottom:9,left:9 }];
    placeCard(4, 'fenrir', 'red');
    out.debuffImmuneNotTagged = state.board[4].poisonedTorment !== true;

    return out;
  })()`);
  assert.equal(result.defenderLossTaggedWinner, true, 'the winner over a defending Three Head Dragon should be tagged poisonedTorment');
  assert.equal(result.poisonedAttackLost, true, "the tagged entry's next attack should take -2 and lose a battle it would otherwise win");
  assert.equal(result.flagClearedAfterUse, true, 'the flag is consumed after one attack');
  assert.equal(result.secondAttackNotPoisoned, true, 'a later attack after the flag is consumed must not still take -2');
  assert.equal(result.attackerLossTaggedDefender, true, 'the defender who beats an attacking Three Head Dragon should be tagged instead');
  assert.equal(result.debuffImmuneNotTagged, true, 'debuffImmune must block the poisonedTorment tag entirely');
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

    // Seraphine's Silver Judgment (aoe destroy-all, reworked from a debuff)
    state.board = Array(9).fill(null);
    state.graveyard = { blue: [], red: [] };
    const sSrc = freshEntry(findCardById('seraphine'), 'blue');
    state.board[0] = sSrc;
    state.board[1] = freshEntry(findCardById('ogre'), 'red');
    SPECIAL_HANDLERS.seraphine({ srcEntry: sSrc, owner: 'blue' });
    const seraphine = state.graveyard.red.length === 1 && state.graveyard.red[0].id === 'ogre';

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

    return { vaelira, nyxara, seraphine, triunedesire, resetClears };
  })()`);
  assert.equal(result.vaelira, true, "Vaelira's Infernal Pact kills land in the graveyard");
  assert.equal(result.nyxara, true, "Nyxara's Void Dominion kills land in the graveyard");
  assert.equal(result.seraphine, true, "Seraphine's Silver Judgment kills land in the graveyard");
  assert.equal(result.triunedesire, true, "Triune Desire's Forbidden Harmony kills land in the graveyard");
  assert.equal(result.resetClears, true, 'resetGame() clears the graveyard for the next match');
  assert.deepEqual(pageErrors, []);
  await page.close();
});

test('Kaeldryx: reworked per approved art — Dragon Hunter +2, uncapped Hunter\'s Focus, on-place Scalebreaker debuff, weak-loser Execution, Dragonslayer extra turn', async () => {
  const { page, pageErrors } = await newPage();
  const result = await page.evaluate(`(() => {
    ${freshEntrySnippet()}
    const out = {};
    const kaeldryx = findCardById('kaeldryx');
    out.statsMatchArt = kaeldryx.top === 10 && kaeldryx.right === 9 && kaeldryx.bottom === 9 && kaeldryx.left === 10;

    state.board = Array(9).fill(null);
    state.playerHand = [1,2]; state.enemyHand = [1,2];
    const weakDragon = { id:'weak-dragon', name:'WeakDragon', top:1,right:1,bottom:1,left:1, isDragon:true };
    out.dragonHunterBonus = fullEffectiveValue(kaeldryx, 'top', weakDragon, 0, 'blue', 'attack') - kaeldryx.top;

    // Hunter's Focus: +1 Power all sides after EVERY win, uncapped (no max).
    state.board = Array(9).fill(null);
    const hfSrc = freshEntry(kaeldryx, 'blue');
    state.board[4] = hfSrc;
    for(let i=0;i<5;i++){
      state.board[1] = freshEntry({ id:'hf-weak'+i, name:'HFWeak'+i, top:1,right:1,bottom:1,left:1 }, 'red');
      resolveFlips(4, 'blue');
    }
    out.huntersFocusUncappedAfterFiveWins = hfSrc.captureBonus === 5;

    // Scalebreaker: on-place, permanently debuffs a random enemy by 2 (does not destroy).
    state.board = Array(9).fill(null);
    const placedSrc = freshEntry(kaeldryx, 'blue');
    state.board[4] = placedSrc;
    const onlyEnemy = freshEntry({ id:'sb-target', name:'SBTarget', top:5,right:5,bottom:5,left:5 }, 'red');
    state.board[1] = onlyEnemy;
    ON_PLACE_HANDLERS.kaeldryx(placedSrc, 'blue');
    out.scalebreakerDebuffed = onlyEnemy.captureBonus === -2;
    out.scalebreakerDidNotDestroy = state.board[1] !== null;

    // Execution: winning against a card with total power <= 3 destroys it
    // outright, and it cannot be revived (skips the Graveyard).
    state.rules.graveyard = true;
    state.graveyard = { blue: [], red: [] };
    state.board = Array(9).fill(null);
    state.board[4] = freshEntry(kaeldryx, 'blue');
    state.board[1] = freshEntry({ id:'exec-weak', name:'ExecWeak', top:1,right:1,bottom:1,left:0 }, 'red'); // total 3
    resolveFlips(4, 'blue');
    out.executionDestroyedWeakLoser = state.board[1] === null;
    out.executionSkippedGraveyard = state.graveyard.red.length === 0;

    // A loser with total power > 3 is captured normally, not destroyed.
    state.board = Array(9).fill(null);
    state.board[4] = freshEntry(kaeldryx, 'blue');
    state.board[1] = freshEntry({ id:'exec-strong', name:'ExecStrong', top:5,right:5,bottom:5,left:5 }, 'red');
    resolveFlips(4, 'blue');
    out.strongLoserCapturedNotDestroyed = state.board[1] !== null && state.board[1].owner === 'blue';

    // Dragonslayer: destroys ALL dragons (both sides, respecting
    // destroyImmune, no revive), no longer debuffs remaining enemies, and
    // always grants an extra turn.
    state.board = Array(9).fill(null);
    const ksrc = freshEntry(kaeldryx, 'blue');
    const allyDragon = freshEntry(findCardById('dragon'), 'blue');
    const immuneDragon = freshEntry(findCardById('threeheaddragon'), 'red');
    const plainEnemy = freshEntry(findCardById('ogre'), 'red');
    state.board[0] = ksrc; state.board[1] = allyDragon; state.board[2] = immuneDragon; state.board[3] = plainEnemy;
    state.extraTurnPending = null;
    SPECIAL_HANDLERS.kaeldryx({ srcEntry: ksrc, owner: 'blue' });
    out.dragonslayerKilledAllyDragon = state.board[1] === null;
    out.dragonslayerRespectsDestroyImmune = state.board[2] !== null;
    out.dragonslayerNoLongerDebuffsEnemy = plainEnemy.captureBonus === 0;
    out.dragonslayerGrantsExtraTurn = state.extraTurnPending === 'blue';

    return out;
  })()`);
  assert.equal(result.statsMatchArt, true, 'stats matched to the approved art: 10/9/9/10 (top/right/bottom/left)');
  assert.equal(result.dragonHunterBonus, 2, 'Dragon Hunter reduced from +4 to +2 per the approved art');
  assert.equal(result.huntersFocusUncappedAfterFiveWins, true, "Hunter's Focus is now an uncapped +1-per-win self buff, not a buff-lock");
  assert.equal(result.scalebreakerDebuffed, true, 'Scalebreaker is now an on-place permanent -2 debuff, not a facing-side bonus');
  assert.equal(result.scalebreakerDidNotDestroy, true);
  assert.equal(result.executionDestroyedWeakLoser, true, "Execution now checks the LOSER's total power (<=3), not the winner's effective power");
  assert.equal(result.executionSkippedGraveyard, true);
  assert.equal(result.strongLoserCapturedNotDestroyed, true);
  assert.equal(result.dragonslayerKilledAllyDragon, true, 'Dragonslayer hits allied dragons too');
  assert.equal(result.dragonslayerRespectsDestroyImmune, true);
  assert.equal(result.dragonslayerNoLongerDebuffsEnemy, true, 'the old -3-to-remaining-enemies clause was dropped per the approved art');
  assert.equal(result.dragonslayerGrantsExtraTurn, true);
  assert.deepEqual(pageErrors, []);
  await page.close();
});

test('Bahamut: Astral Aegis shield and Celestial Sovereign added, Dragon King\'s Majesty text synced, Megaflare rebuilt into an AOE destroy-all', async () => {
  const { page, pageErrors } = await newPage();
  const result = await page.evaluate(`(() => {
    ${freshEntrySnippet()}
    const out = {};
    const bahamut = findCardById('bahamut');
    out.statsUnchanged = bahamut.top === 10 && bahamut.right === 9 && bahamut.bottom === 9 && bahamut.left === 10;
    out.hasDragonKingsMajesty = bahamut.active.onCaptureBonus === 1;
    out.hasAstralAegis = bahamut.active.shield === true;
    out.hasCelestialSovereign = bahamut.active.adjacentAlliesBoost && bahamut.active.adjacentAlliesBoost.minCount === 2 && bahamut.active.adjacentAlliesBoost.amount === 1;
    out.skillCount = bahamut.skills.length;
    state.playerHand = [1,2]; state.enemyHand = [1,2];

    // Astral Aegis: the first loss is ignored (generic active.shield:true).
    state.board = Array(9).fill(null);
    const shieldedDefender = freshEntry(bahamut, 'blue'); // top:10
    state.board[4] = shieldedDefender;
    const attacker = freshEntry({ id:'bah-attacker', name:'BahAttacker', top:1,right:1,bottom:20,left:1 }, 'red');
    state.board[1] = attacker;
    resolveFlips(1, 'red');
    out.shieldBlockedFirstLoss = state.board[4].owner === 'blue';

    // Celestial Sovereign: +1 all sides while 2+ allies are adjacent.
    state.board = Array(9).fill(null);
    state.board[4] = freshEntry(bahamut, 'blue');
    state.board[1] = freshEntry({ id:'ally1', name:'Ally1', top:1,right:1,bottom:1,left:1 }, 'blue');
    state.board[3] = freshEntry({ id:'ally2', name:'Ally2', top:1,right:1,bottom:1,left:1 }, 'blue');
    out.sovereignBonusWithTwoAllies = fullEffectiveValue(bahamut, 'top', {top:1,right:1,bottom:1,left:1}, 4, 'blue', 'attack') - bahamut.top;
    state.board[3] = null;
    out.noSovereignBonusWithOneAlly = fullEffectiveValue(bahamut, 'top', {top:1,right:1,bottom:1,left:1}, 4, 'blue', 'attack') - bahamut.top;

    // Megaflare, rebuilt into an AOE: destroys every enemy (no revive),
    // spares allies, respects destroyImmune, and grants +1 Power per card destroyed.
    state.rules.graveyard = true;
    state.graveyard = { blue: [], red: [] };
    state.board = Array(9).fill(null);
    const wsrc = freshEntry(bahamut, 'blue');
    const ally = freshEntry({ id:'mf-ally', name:'MFAlly', top:1,right:1,bottom:1,left:1 }, 'blue');
    const enemy1 = freshEntry({ id:'mf-enemy1', name:'MFEnemy1', top:1,right:1,bottom:1,left:1 }, 'red');
    const immuneEnemy = freshEntry(findCardById('threeheaddragon'), 'red');
    state.board[4] = wsrc; state.board[0] = ally; state.board[1] = enemy1; state.board[2] = immuneEnemy;
    SPECIAL_HANDLERS.bahamut({ srcEntry: wsrc, owner: 'blue' });
    out.megaflareSparedAlly = state.board[0] !== null;
    out.megaflareDestroyedEnemy = state.board[1] === null;
    out.megaflareRespectsDestroyImmune = state.board[2] !== null;
    out.megaflareSkippedGraveyard = state.graveyard.red.length === 0;
    out.megaflareGainedOnePerDestroyed = wsrc.captureBonus === 1;

    return out;
  })()`);
  assert.equal(result.statsUnchanged, true);
  assert.equal(result.hasDragonKingsMajesty, true);
  assert.equal(result.hasAstralAegis, true);
  assert.equal(result.hasCelestialSovereign, true);
  assert.equal(result.skillCount, 4, "the printed card carries Dragon King's Majesty, Astral Aegis, Celestial Sovereign, and Megaflare");
  assert.equal(result.shieldBlockedFirstLoss, true);
  assert.equal(result.sovereignBonusWithTwoAllies, 1);
  assert.equal(result.noSovereignBonusWithOneAlly, 0);
  assert.equal(result.megaflareSparedAlly, true);
  assert.equal(result.megaflareDestroyedEnemy, true);
  assert.equal(result.megaflareRespectsDestroyImmune, true);
  assert.equal(result.megaflareSkippedGraveyard, true);
  assert.equal(result.megaflareGainedOnePerDestroyed, true);
  assert.deepEqual(pageErrors, []);
  await page.close();
});

test('Deathblade: card data trimmed to Night\'s Veil/Executioner/Shadow Assault, Executioner destroys a weak loser, Shadow Assault swap unchanged', async () => {
  const { page, pageErrors } = await newPage();
  const result = await page.evaluate(`(() => {
    ${freshEntrySnippet()}
    const out = {};
    const deathblade = findCardById('deathblade');
    out.statsUnchanged = deathblade.top === 9 && deathblade.right === 8 && deathblade.bottom === 6 && deathblade.left === 7 && deathblade.element === 'earth';
    out.hasShield = deathblade.active.shield === true;
    out.hasExecutioner = deathblade.active.onWinDestroyIfLoserWeak && deathblade.active.onWinDestroyIfLoserWeak.maxTotal === 6;
    out.skillCount = deathblade.skills.length;
    state.playerHand = [1,2]; state.enemyHand = [1,2];

    // Executioner: winning against a card with total power <= 6 destroys it
    // outright (board cell becomes null, no capture).
    state.board = Array(9).fill(null);
    state.board[4] = freshEntry(deathblade, 'blue'); // top:9
    state.board[1] = freshEntry({ id:'db-weak', name:'DBWeak', top:1,right:1,bottom:1,left:1 }, 'red'); // total 4
    resolveFlips(4, 'blue');
    out.executionerDestroyedWeakLoser = state.board[1] === null;

    // A loser with total power > 6 is captured normally, not destroyed.
    state.board = Array(9).fill(null);
    state.board[4] = freshEntry(deathblade, 'blue');
    state.board[1] = freshEntry({ id:'db-strong', name:'DBStrong', top:5,right:5,bottom:5,left:5 }, 'red'); // total 20
    resolveFlips(4, 'blue');
    out.strongLoserCapturedNotDestroyed = state.board[1] !== null && state.board[1].owner === 'blue';

    // Shadow Assault: unchanged position-swap + permanent -2 all sides on the target.
    state.board = Array(9).fill(null);
    const src = freshEntry(deathblade, 'blue');
    const target = freshEntry(findCardById('ogre'), 'red');
    state.board[4] = src; state.board[1] = target;
    SPECIAL_HANDLERS.deathblade({ srcEntry: src, sourceIndex: 4, targetEntry: target, targetIndex: 1, owner: 'blue' });
    out.swappedPositions = state.board[1] === src && state.board[4] === target;
    out.targetDebuffed = state.board[4].captureBonus === -2;

    return out;
  })()`);
  assert.equal(result.statsUnchanged, true);
  assert.equal(result.hasShield, true);
  assert.equal(result.hasExecutioner, true, 'Executioner is now backed by active.onWinDestroyIfLoserWeak:{maxTotal:6}');
  assert.equal(result.skillCount, 3, 'the printed card only carries Night\'s Veil, Executioner, and Shadow Assault');
  assert.equal(result.executionerDestroyedWeakLoser, true);
  assert.equal(result.strongLoserCapturedNotDestroyed, true);
  assert.equal(result.swappedPositions, true);
  assert.equal(result.targetDebuffed, true);
  assert.deepEqual(pageErrors, []);
  await page.close();
});

test('Lyrith: card trimmed to Venomous Fangs/Silent Strike/Serpent\'s Wrath, both passives reuse existing primitives, Ultimate unchanged', async () => {
  const { page, pageErrors } = await newPage();
  const result = await page.evaluate(`(() => {
    ${freshEntrySnippet()}
    const out = {};
    const lyrith = findCardById('lyrith');
    out.statsUnchanged = lyrith.top === 9 && lyrith.right === 9 && lyrith.bottom === 6 && lyrith.left === 8 && lyrith.element === 'water';
    out.hasVenomousFangs = lyrith.active.onWinDebuffLoserPermanent === 1;
    out.hasSilentStrike = lyrith.active.vsStrongerTotalPowerBoost && lyrith.active.vsStrongerTotalPowerBoost.amount === 2;
    out.skillCount = lyrith.skills.length;
    state.playerHand = [1,2]; state.enemyHand = [1,2];

    // Venomous Fangs: winning a battle permanently debuffs the loser -1 all sides.
    state.board = Array(9).fill(null);
    state.board[4] = freshEntry(lyrith, 'blue'); // top:9
    const loser = freshEntry({ id:'lyr-weak', name:'LyrWeak', top:1,right:1,bottom:1,left:1 }, 'red');
    state.board[1] = loser;
    resolveFlips(4, 'blue');
    out.venomousFangsDebuffedLoser = loser.captureBonus === -1;

    // Silent Strike: +2 Power on the attack when the enemy's total Power is higher.
    const weakerFoe = { id:'lyr-weaker', name:'Weaker', top:1,right:1,bottom:1,left:1 };
    const strongerFoe = { id:'lyr-stronger', name:'Stronger', top:9,right:9,bottom:9,left:9 };
    out.noBonusVsWeaker = fullEffectiveValue(lyrith, 'top', weakerFoe, 0, 'blue', 'attack') - lyrith.top;
    out.bonusVsStronger = fullEffectiveValue(lyrith, 'top', strongerFoe, 0, 'blue', 'attack') - lyrith.top;

    // Serpent's Wrath (unchanged): non-crit win flips the target and grants
    // permanent +4 Power all sides; Math.random forced high to avoid the
    // 25% crit-destroy branch so this assertion is deterministic.
    state.board = Array(9).fill(null);
    const src = freshEntry(lyrith, 'blue');
    const target = freshEntry(findCardById('ogre'), 'red');
    state.board[4] = src; state.board[1] = target;
    const realRandom = Math.random;
    Math.random = () => 0.99;
    SPECIAL_HANDLERS.lyrith({ srcEntry: src, targetEntry: target, targetIndex: 1, owner: 'blue' });
    Math.random = realRandom;
    out.wrathFlippedTarget = target.owner === 'blue';
    out.wrathPermanentBoost = src.captureBonus === 4;

    return out;
  })()`);
  assert.equal(result.statsUnchanged, true);
  assert.equal(result.hasVenomousFangs, true, 'Venomous Fangs reuses active.onWinDebuffLoserPermanent, same as Yojimbo/Torn');
  assert.equal(result.hasSilentStrike, true, 'Silent Strike reuses active.vsStrongerTotalPowerBoost, same as Yojimbo/Ysara/Sarah');
  assert.equal(result.skillCount, 3, 'the printed card only carries Venomous Fangs, Silent Strike, and Serpent\'s Wrath');
  assert.equal(result.venomousFangsDebuffedLoser, true);
  assert.equal(result.noBonusVsWeaker, 0);
  assert.equal(result.bonusVsStronger, 2);
  assert.equal(result.wrathFlippedTarget, true);
  assert.equal(result.wrathPermanentBoost, true);
  assert.deepEqual(pageErrors, []);
  await page.close();
});

test('Aurelia: card trimmed to Radiant Guardian/Luminous Strike/Dawn\'s Reckoning, stats matched to approved art, Ultimate unchanged', async () => {
  const { page, pageErrors } = await newPage();
  const result = await page.evaluate(`(() => {
    ${freshEntrySnippet()}
    const out = {};
    const aurelia = findCardById('aurelia');
    out.statsMatchArt = aurelia.top === 9 && aurelia.right === 6 && aurelia.bottom === 8 && aurelia.left === 7 && aurelia.element === 'wind';
    out.hasRadiantGuardian = aurelia.active.shield === true;
    out.hasLuminousStrike = aurelia.active.onWinDirectionalBoost === 2;
    out.skillCount = aurelia.skills.length;
    state.playerHand = [1,2]; state.enemyHand = [1,2];

    // Radiant Guardian: the first loss is ignored (generic active.shield:true).
    state.board = Array(9).fill(null);
    const shieldedDefender = freshEntry(aurelia, 'blue'); // bottom:8
    state.board[4] = shieldedDefender;
    const attacker = freshEntry({ id:'aur-attacker', name:'AurAttacker', top:1,right:1,bottom:20,left:1 }, 'red'); // bottom faces the defender above it
    state.board[1] = attacker;
    resolveFlips(1, 'red');
    out.shieldBlockedFirstLoss = state.board[4].owner === 'blue';
    out.shieldConsumed = state.board[4].shieldUsed === true;

    // Luminous Strike: winning an attack grants permanent +2 Power on the
    // attacking side only, once per match.
    state.board = Array(9).fill(null);
    const src = freshEntry(aurelia, 'blue'); // top:9
    src.shieldUsed = true; // isolate from Radiant Guardian, same trick as Darien's test
    state.board[4] = src;
    state.board[1] = freshEntry({ id:'aur-weak', name:'AurWeak', top:1,right:1,bottom:1,left:1 }, 'red');
    resolveFlips(4, 'blue');
    out.luminousStrikeBoostedAttackSide = src.sideBonus && src.sideBonus.top === 2;
    out.luminousStrikeOnlyAttackSide = src.sideBonus && (src.sideBonus.right||0) === 0 && (src.sideBonus.bottom||0) === 0 && (src.sideBonus.left||0) === 0;

    // Dawn's Reckoning (unchanged): non-crit win flips the target and grants
    // permanent +4 Power all sides; Math.random forced high to avoid the
    // 25% crit-wipe branch so this assertion is deterministic.
    state.board = Array(9).fill(null);
    const wsrc = freshEntry(aurelia, 'blue');
    const wtarget = freshEntry(findCardById('ogre'), 'red');
    state.board[4] = wsrc; state.board[1] = wtarget;
    const realRandom = Math.random;
    Math.random = () => 0.99;
    SPECIAL_HANDLERS.aurelia({ srcEntry: wsrc, targetEntry: wtarget, targetIndex: 1, owner: 'blue' });
    Math.random = realRandom;
    out.reckoningFlippedTarget = wtarget.owner === 'blue';
    out.reckoningPermanentBoost = wsrc.captureBonus === 4;

    // Dawn's Reckoning crit branch: target is still flipped but gets -20 instead.
    state.board = Array(9).fill(null);
    const csrc = freshEntry(aurelia, 'blue');
    const ctarget = freshEntry(findCardById('ogre'), 'red');
    state.board[4] = csrc; state.board[1] = ctarget;
    Math.random = () => 0.01;
    SPECIAL_HANDLERS.aurelia({ srcEntry: csrc, targetEntry: ctarget, targetIndex: 1, owner: 'blue' });
    Math.random = realRandom;
    out.critStillFlipsTarget = ctarget.owner === 'blue';
    out.critWipesInsteadOfBoost = ctarget.captureBonus === -20;

    return out;
  })()`);
  assert.equal(result.statsMatchArt, true, 'stats matched to the approved art: 9/6/8/7 (top/right/bottom/left)');
  assert.equal(result.hasRadiantGuardian, true);
  assert.equal(result.hasLuminousStrike, true);
  assert.equal(result.skillCount, 3, 'the printed card only carries Radiant Guardian, Luminous Strike, and Dawn\'s Reckoning');
  assert.equal(result.shieldBlockedFirstLoss, true);
  assert.equal(result.shieldConsumed, true);
  assert.equal(result.luminousStrikeBoostedAttackSide, true);
  assert.equal(result.luminousStrikeOnlyAttackSide, true);
  assert.equal(result.reckoningFlippedTarget, true);
  assert.equal(result.reckoningPermanentBoost, true);
  assert.equal(result.critStillFlipsTarget, true, 'the crit branch still flips the target card');
  assert.equal(result.critWipesInsteadOfBoost, true, 'the crit branch wipes the target to -20 instead of the attacker getting +4');
  assert.deepEqual(pageErrors, []);
  await page.close();
});

test('Twisted Gipsy: card trimmed to The House Always Wins/Loaded Deck/House of Shadows, stats matched to approved art, Ultimate text synced to real behavior', async () => {
  const { page, pageErrors } = await newPage();
  const result = await page.evaluate(`(() => {
    ${freshEntrySnippet()}
    const out = {};
    const gipsy = findCardById('twistedgipsy');
    out.statsMatchArt = gipsy.top === 9 && gipsy.right === 7 && gipsy.bottom === 9 && gipsy.left === 10 && gipsy.element === 'wind';
    out.hasHouseAlwaysWins = gipsy.active.onWinDebuffLoserPermanent === 1 && gipsy.active.onCaptureBonus === 1;
    out.hasLoadedDeck = gipsy.active.oncePerMatchAttackBoost && gipsy.active.oncePerMatchAttackBoost.amount === 3;
    out.skillCount = gipsy.skills.length;
    state.playerHand = [1,2]; state.enemyHand = [1,2];

    // The House Always Wins: winning permanently steals 1 Power (loser -1, Gipsy +1).
    state.board = Array(9).fill(null);
    const src = freshEntry(gipsy, 'blue'); // top:9
    state.board[4] = src;
    const loser = freshEntry({ id:'tg-weak', name:'TGWeak', top:1,right:1,bottom:1,left:1 }, 'red');
    state.board[1] = loser;
    resolveFlips(4, 'blue');
    out.loserPermanentlyDebuffed = loser.captureBonus === -1;
    out.gipsyPermanentlyBoosted = src.captureBonus === 1;

    // Loaded Deck: +3 Power on the next attack, once per match. The read
    // needs a live board entry at cellIndex to check oncePerMatchAttackBoostUsed.
    state.board = Array(9).fill(null);
    state.board[0] = freshEntry(gipsy, 'blue');
    const weakFoe = { id:'tg-weaker', name:'Weaker', top:1,right:1,bottom:1,left:1 };
    out.loadedDeckBoost = fullEffectiveValue(gipsy, 'top', weakFoe, 0, 'blue', 'attack') - gipsy.top;

    // House of Shadows (unchanged code, synced UI text): steals 2 Power on
    // win and grants a further permanent +1 to the attacker.
    state.board = Array(9).fill(null);
    const wsrc = freshEntry(gipsy, 'blue');
    const wtarget = freshEntry(findCardById('ogre'), 'red');
    state.board[4] = wsrc; state.board[1] = wtarget;
    SPECIAL_HANDLERS.twistedgipsy({ srcEntry: wsrc, targetEntry: wtarget, targetIndex: 1, owner: 'blue' });
    out.wrathFlippedTarget = wtarget.owner === 'blue';
    out.wrathStoleTwoPower = wtarget.captureBonus === -2;
    out.wrathGainedPermanentOne = wsrc.captureBonus === 3; // +2 stolen + 1 permanent

    return out;
  })()`);
  assert.equal(result.statsMatchArt, true, 'stats matched to the approved art: 9/7/9/10 (top/right/bottom/left)');
  assert.equal(result.hasHouseAlwaysWins, true, 'reuses onWinDebuffLoserPermanent + onCaptureBonus, same combination Yojimbo already has');
  assert.equal(result.hasLoadedDeck, true, "reuses oncePerMatchAttackBoost, same as Yojimbo's Kozuka");
  assert.equal(result.skillCount, 3, 'the printed card only carries The House Always Wins, Loaded Deck, and House of Shadows');
  assert.equal(result.loserPermanentlyDebuffed, true);
  assert.equal(result.gipsyPermanentlyBoosted, true);
  assert.equal(result.loadedDeckBoost, 3);
  assert.equal(result.wrathFlippedTarget, true);
  assert.equal(result.wrathStoleTwoPower, true);
  assert.equal(result.wrathGainedPermanentOne, true);
  assert.deepEqual(pageErrors, []);
  await page.close();
});

test('Astrael: element added, new Cosmic Ward shield, Starborn unchanged, Falling Stars now also debuffs the target', async () => {
  const { page, pageErrors } = await newPage();
  const result = await page.evaluate(`(() => {
    ${freshEntrySnippet()}
    const out = {};
    const astrael = findCardById('astrael');
    out.statsUnchanged = astrael.top === 8 && astrael.right === 8 && astrael.bottom === 8 && astrael.left === 8;
    out.hasElement = astrael.element === 'magic';
    out.hasStarborn = astrael.active.onPlaceBoost === 2;
    out.hasCosmicWard = astrael.active.shield === true;
    out.skillCount = astrael.skills.length;
    state.playerHand = [1,2]; state.enemyHand = [1,2];

    // Starborn (unchanged): placing Astrael grants +2 Power on exactly one
    // random side.
    state.board = Array(9).fill(null);
    state.playerHand = [astrael, {id:'filler1'}];
    placeCard(4, 'astrael', 'blue');
    const placed = state.board[4];
    const sb = placed.sideBonus || {};
    const boostedSides = ['top','right','bottom','left'].filter(s => (sb[s]||0) === 2);
    out.starbornBoostedExactlyOneSide = boostedSides.length === 1;
    out.starbornTotalIsTwo = (sb.top||0)+(sb.right||0)+(sb.bottom||0)+(sb.left||0) === 2;

    // Cosmic Ward: the first loss is ignored (generic active.shield:true).
    state.board = Array(9).fill(null);
    state.playerHand = [1,2]; state.enemyHand = [1,2];
    const shieldedDefender = freshEntry(astrael, 'blue'); // top:8
    state.board[4] = shieldedDefender;
    const attacker = freshEntry({ id:'ast-attacker', name:'AstAttacker', top:1,right:1,bottom:20,left:1 }, 'red');
    state.board[1] = attacker;
    resolveFlips(1, 'red');
    out.shieldBlockedFirstLoss = state.board[4].owner === 'blue';

    // Falling Stars: on win, the target is flipped AND permanently loses 2
    // Power on all sides, while Astrael permanently gains +1 (combining
    // both the pre-existing self-buff and the art's target-debuff).
    state.board = Array(9).fill(null);
    const wsrc = freshEntry(astrael, 'blue');
    const wtarget = freshEntry(findCardById('ogre'), 'red');
    state.board[4] = wsrc; state.board[1] = wtarget;
    SPECIAL_HANDLERS.astrael({ srcEntry: wsrc, targetEntry: wtarget, targetIndex: 1, owner: 'blue' });
    out.starsFlippedTarget = wtarget.owner === 'blue';
    out.starsDebuffedTarget = wtarget.captureBonus === -2;
    out.starsBoostedSelf = wsrc.captureBonus === 1;

    return out;
  })()`);
  assert.equal(result.statsUnchanged, true);
  assert.equal(result.hasElement, true, 'element:magic added, no CANON conflict since the field was previously empty');
  assert.equal(result.hasStarborn, true);
  assert.equal(result.hasCosmicWard, true);
  assert.equal(result.skillCount, 3, 'the printed card now carries Starborn, Cosmic Ward, and Falling Stars');
  assert.equal(result.starbornBoostedExactlyOneSide, true);
  assert.equal(result.starbornTotalIsTwo, true);
  assert.equal(result.shieldBlockedFirstLoss, true);
  assert.equal(result.starsFlippedTarget, true);
  assert.equal(result.starsDebuffedTarget, true, 'combining both interpretations: the target is now also permanently debuffed -2 all sides');
  assert.equal(result.starsBoostedSelf, true, 'the pre-existing self-buff (+1 permanent) is kept');
  assert.deepEqual(pageErrors, []);
  await page.close();
});

test('Vaelira: new capped Crimson Surge, all other mechanics (Undying Flame/Sister\'s Bond/Weakness/Infernal Pact) unchanged', async () => {
  const { page, pageErrors } = await newPage();
  const result = await page.evaluate(`(() => {
    ${freshEntrySnippet()}
    const out = {};
    const vaelira = findCardById('vaelira');
    out.statsUnchanged = vaelira.top === 10 && vaelira.right === 9 && vaelira.bottom === 10 && vaelira.left === 10 && vaelira.element === 'fire';
    out.hasSisterAuraUnchanged = vaelira.active.sisterAura && vaelira.active.sisterAura.partners.includes('seraphine') && vaelira.active.sisterAura.partners.includes('nyxara') && !vaelira.active.sisterAura.partners.includes('lyrith') && !vaelira.active.sisterAura.partners.includes('aurelia');
    out.hasCrimsonSurge = vaelira.active.onWinCappedBoost && vaelira.active.onWinCappedBoost.amount === 1 && vaelira.active.onWinCappedBoost.max === 3;
    state.playerHand = [1,2]; state.enemyHand = [1,2];

    // Crimson Surge: +1 Power all sides per win, capped at 3 stacks total.
    state.board = Array(9).fill(null);
    const src = freshEntry(vaelira, 'blue'); // top:10
    state.board[4] = src;
    for(let i=0;i<4;i++){
      state.board[1] = freshEntry({ id:'v-weak'+i, name:'VWeak'+i, top:1,right:1,bottom:1,left:1 }, 'red');
      resolveFlips(4, 'blue');
    }
    out.crimsonSurgeCappedAtThree = src.captureBonus === 3;

    // Undying Flame (unchanged): on-place, permanently debuffs one random
    // not-yet-burned enemy by 2.
    state.board = Array(9).fill(null);
    const placedSrc = freshEntry(vaelira, 'blue');
    state.board[4] = placedSrc;
    const onlyEnemy = freshEntry({ id:'v-burn-target', name:'BurnTarget', top:5,right:5,bottom:5,left:5 }, 'red');
    state.board[1] = onlyEnemy;
    ON_PLACE_HANDLERS.vaelira(placedSrc, 'blue');
    out.undyingFlameBurnedEnemy = onlyEnemy.captureBonus === -2 && onlyEnemy.vaeliraBurned === true;

    // Infernal Pact (unchanged): destroys every enemy, spares allies, grants an extra turn.
    state.board = Array(9).fill(null);
    const wsrc = freshEntry(vaelira, 'blue');
    const ally = freshEntry({ id:'v-ally', name:'Ally', top:1,right:1,bottom:1,left:1 }, 'blue');
    const enemy1 = freshEntry({ id:'v-enemy1', name:'Enemy1', top:1,right:1,bottom:1,left:1 }, 'red');
    state.board[4] = wsrc; state.board[0] = ally; state.board[1] = enemy1;
    state.extraTurnPending = null;
    SPECIAL_HANDLERS.vaelira({ srcEntry: wsrc, owner: 'blue' });
    out.pactSparedAlly = state.board[0] !== null;
    out.pactDestroyedEnemy = state.board[1] === null;
    out.pactGrantedExtraTurn = state.extraTurnPending === 'blue';

    return out;
  })()`);
  assert.equal(result.statsUnchanged, true);
  assert.equal(result.hasSisterAuraUnchanged, true, "Sister's Bond still points at Seraphine/Nyxara, not the image-generation error (Lyrith/Aurelia)");
  assert.equal(result.hasCrimsonSurge, true, 'Crimson Surge is the agreed capped +1x3 variant, not the uncapped +2 the art text showed');
  assert.equal(result.crimsonSurgeCappedAtThree, true);
  assert.equal(result.undyingFlameBurnedEnemy, true);
  assert.equal(result.pactSparedAlly, true);
  assert.equal(result.pactDestroyedEnemy, true);
  assert.equal(result.pactGrantedExtraTurn, true);
  assert.deepEqual(pageErrors, []);
  await page.close();
});

test('Seraphine: new Celestial Mark (on-place mark + hardcoded +2 vs that specific entry), Silver Sight replaced by vsStrongerTotalPowerBoost, Silver Judgment reworked from a debuff into a destroy-all (matching her sisters)', async () => {
  const { page, pageErrors } = await newPage();
  const result = await page.evaluate(`(() => {
    ${freshEntrySnippet()}
    const out = {};
    const seraphine = findCardById('seraphine');
    out.statsUnchanged = seraphine.top === 10 && seraphine.right === 10 && seraphine.bottom === 10 && seraphine.left === 10 && seraphine.element === 'wind';
    out.hasSisterAuraUnchanged = seraphine.active.sisterAura && seraphine.active.sisterAura.partners.includes('vaelira') && seraphine.active.sisterAura.partners.includes('nyxara');
    out.hasSilverSight = seraphine.active.vsStrongerTotalPowerBoost && seraphine.active.vsStrongerTotalPowerBoost.amount === 2;
    state.playerHand = [1,2]; state.enemyHand = [1,2];

    // Celestial Mark: on-place marks a random enemy.
    state.board = Array(9).fill(null);
    const placedSrc = freshEntry(seraphine, 'blue');
    state.board[4] = placedSrc;
    const onlyEnemy = freshEntry({ id:'cm-target', name:'CMTarget', top:5,right:5,bottom:5,left:5 }, 'red');
    state.board[1] = onlyEnemy;
    ON_PLACE_HANDLERS.seraphine(placedSrc, 'blue');
    out.markedEnemy = onlyEnemy.seraphineMarked === true;

    // The +2 only applies when Seraphine specifically attacks the MARKED
    // entry, resolved live in battleNeighbors (not fullEffectiveValue,
    // which can't see the flag) -- isolated here with a defender whose
    // facing side (11) beats Seraphine's plain top (10) but loses once the
    // mark's +2 is added (12).
    state.board = Array(9).fill(null);
    const srcUnmarked = freshEntry(seraphine, 'blue'); // top:10
    state.board[4] = srcUnmarked;
    const closeDefender = freshEntry({ id:'close-defender', name:'CloseDefender', top:1,right:1,bottom:11,left:1 }, 'red');
    state.board[1] = closeDefender;
    resolveFlips(4, 'blue');
    out.unmarkedAttackLoses = state.board[1].owner === 'red';

    state.board = Array(9).fill(null);
    const srcMarked = freshEntry(seraphine, 'blue');
    state.board[4] = srcMarked;
    const markedDefender = freshEntry({ id:'marked-defender', name:'MarkedDefender', top:1,right:1,bottom:11,left:1 }, 'red');
    markedDefender.seraphineMarked = true;
    state.board[1] = markedDefender;
    resolveFlips(4, 'blue');
    out.markedAttackWins = state.board[1].owner === 'blue';

    // Silver Sight: +2 Power vs a stronger enemy.
    const weakerFoe = { id:'ser-weaker', name:'Weaker', top:1,right:1,bottom:1,left:1 };
    const strongerFoe = { id:'ser-stronger', name:'Stronger', top:20,right:20,bottom:20,left:20 };
    out.noBonusVsWeaker = fullEffectiveValue(seraphine, 'top', weakerFoe, 0, 'blue', 'attack') - seraphine.top;
    out.bonusVsStronger = fullEffectiveValue(seraphine, 'top', strongerFoe, 0, 'blue', 'attack') - seraphine.top;

    // Silver Judgment: previously stripped bonuses and hit every enemy for
    // -2 Power; now destroys every enemy outright, mirroring Vaelira's
    // Infernal Pact and Nyxara's Void Dominion (same protectedByInfiniteSeraph
    // guard, same isDestroyImmune check, same destroyCard() routing).
    state.board = Array(9).fill(null);
    const judgeSrc = freshEntry(seraphine, 'blue');
    const ally = freshEntry({ id:'sj-ally', name:'Ally', top:1,right:1,bottom:1,left:1 }, 'blue');
    const enemy1 = freshEntry({ id:'sj-enemy1', name:'Enemy1', top:1,right:1,bottom:1,left:1 }, 'red');
    state.board[4] = judgeSrc; state.board[0] = ally; state.board[1] = enemy1;
    const judgmentMsg = SPECIAL_HANDLERS.seraphine({ srcEntry: judgeSrc, owner: 'blue' });
    out.judgmentSparedAlly = state.board[0] !== null;
    out.judgmentDestroyedEnemy = state.board[1] === null;
    out.judgmentMsgMentionsDestruction = /burns|destroy/i.test(judgmentMsg);

    // Blocked by The Infinite Seraph's Eternal Presence, same as her sisters.
    state.board = Array(9).fill(null);
    const guardedSrc = freshEntry(seraphine, 'blue');
    state.board[0] = guardedSrc;
    state.board[1] = freshEntry(findCardById('ogre'), 'red');
    state.board[2] = freshEntry(findCardById('infiniteseraph'), 'red');
    const guardedMsg = SPECIAL_HANDLERS.seraphine({ srcEntry: guardedSrc, owner: 'blue' });
    out.blockedByInfiniteSeraph = state.board[1] !== null;
    out.blockedMsgMentionsSeraph = guardedMsg.includes('Eternal Presence');

    return out;
  })()`);
  assert.equal(result.statsUnchanged, true);
  assert.equal(result.hasSisterAuraUnchanged, true);
  assert.equal(result.hasSilverSight, true, 'Silver Sight now reuses active.vsStrongerTotalPowerBoost');
  assert.equal(result.markedEnemy, true);
  assert.equal(result.unmarkedAttackLoses, true, 'without the mark, top:10 loses to a facing side of 11');
  assert.equal(result.markedAttackWins, true, 'the mark\'s +2 flips that same matchup into a win (10+2 > 11)');
  assert.equal(result.noBonusVsWeaker, 0);
  assert.equal(result.bonusVsStronger, 2);
  assert.equal(result.judgmentSparedAlly, true, 'Silver Judgment only hits enemies, never the caster\'s own side');
  assert.equal(result.judgmentDestroyedEnemy, true, 'Silver Judgment now destroys enemy cards instead of just debuffing them');
  assert.equal(result.judgmentMsgMentionsDestruction, true);
  assert.equal(result.blockedByInfiniteSeraph, true, "The Infinite Seraph's Eternal Presence blocks Silver Judgment the same way it blocks Vaelira/Nyxara");
  assert.equal(result.blockedMsgMentionsSeraph, true);
  assert.deepEqual(pageErrors, []);
  await page.close();
});

test('Nyxara: stats matched to approved art, sisterAura total for 2 sisters tightened to +5, Weakness text tightened (mechanic unchanged), Void Dominion still lands in the Graveyard', async () => {
  const { page, pageErrors } = await newPage();
  const result = await page.evaluate(`(() => {
    ${freshEntrySnippet()}
    const out = {};
    const nyxara = findCardById('nyxara');
    out.statsMatchArt = nyxara.top === 10 && nyxara.right === 9 && nyxara.bottom === 10 && nyxara.left === 10 && nyxara.element === 'water';
    out.sisterAuraOneSister = nyxara.active.sisterAura.bonusByCount[1] === 1;
    out.sisterAuraTwoSisters = nyxara.active.sisterAura.bonusByCount[2] === 5;
    state.playerHand = [1,2]; state.enemyHand = [1,2];

    // Weakness -- Broken Focus: mechanic unchanged, still only triggers on
    // recapture (checkSisterFlip, shared with Vaelira/Seraphine), not on
    // every ordinary loss.
    state.board = Array(9).fill(null);
    const recaptured = freshEntry(nyxara, 'blue');
    recaptured.owner = 'red'; // was captured by the enemy
    recaptured.sisterHomeOwner = 'blue';
    checkSisterFlip(recaptured);
    out.markedAsCapturedWhileEnemyOwned = recaptured.sisterWasCaptured === true;
    recaptured.owner = 'blue'; // recaptured back to her own side
    checkSisterFlip(recaptured);
    out.debuffedOnlyOnRecapture = recaptured.captureBonus === -3;

    // Void Dominion: unchanged -- still destroys every enemy (+3 Power per
    // destroyed), spares allies, respects destroyImmune, and still lands in
    // the Graveyard (matches Vaelira/Triune Desire's own AOE destroy-alls,
    // NOT changed to noRevive despite the approved art's "(cannot be
    // revived)" wording -- see chat: that would break an existing,
    // deliberate cross-card Graveyard consistency test).
    state.rules.graveyard = true;
    state.graveyard = { blue: [], red: [] };
    state.board = Array(9).fill(null);
    const wsrc = freshEntry(nyxara, 'blue');
    const ally = freshEntry({ id:'vd-ally', name:'VDAlly', top:1,right:1,bottom:1,left:1 }, 'blue');
    const enemy1 = freshEntry({ id:'vd-enemy1', name:'VDEnemy1', top:1,right:1,bottom:1,left:1 }, 'red');
    const immuneEnemy = freshEntry(findCardById('threeheaddragon'), 'red');
    state.board[4] = wsrc; state.board[0] = ally; state.board[1] = enemy1; state.board[2] = immuneEnemy;
    SPECIAL_HANDLERS.nyxara({ srcEntry: wsrc, owner: 'blue' });
    out.dominionSparedAlly = state.board[0] !== null;
    out.dominionDestroyedEnemy = state.board[1] === null;
    out.dominionRespectsDestroyImmune = state.board[2] !== null;
    out.dominionStillLandsInGraveyard = state.graveyard.red.length === 1 && state.graveyard.red[0].id === 'vd-enemy1';
    out.dominionGainedThreePerDestroyed = wsrc.captureBonus === 3;

    return out;
  })()`);
  assert.equal(result.statsMatchArt, true, 'stats matched to the approved art: 10/9/10/10 (top/right/bottom/left)');
  assert.equal(result.sisterAuraOneSister, true);
  assert.equal(result.sisterAuraTwoSisters, true, 'tightened from 6 to 5 to match the art\'s "+1 base, +4 additional" reading');
  assert.equal(result.markedAsCapturedWhileEnemyOwned, true);
  assert.equal(result.debuffedOnlyOnRecapture, true, 'the art\'s "every loss" reading was NOT adopted, keeping her sisters\' shared recapture-only mechanic');
  assert.equal(result.dominionSparedAlly, true);
  assert.equal(result.dominionDestroyedEnemy, true);
  assert.equal(result.dominionRespectsDestroyImmune, true);
  assert.equal(result.dominionStillLandsInGraveyard, true);
  assert.equal(result.dominionGainedThreePerDestroyed, true);
  assert.deepEqual(pageErrors, []);
  await page.close();
});

test('Nexzoth: Reality Consume adjacency aura, Endless Void round-start drain, weakVsElement(light), World Shatter now destroys every win outright (no revive), Devourer, The Ending now spares allies (no revive)', async () => {
  const { page, pageErrors } = await newPage();
  const result = await page.evaluate(`(() => {
    ${freshEntrySnippet()}
    const out = {};
    const nexzoth = findCardById('nexzoth');

    state.playerHand = [1,2]; state.enemyHand = [1,2];
    const lightCard = { id:'light-test', name:'Light', top:5,right:5,bottom:5,left:5, element:'light' };
    out.weakVsLight = fullEffectiveValue(nexzoth, 'top', lightCard, 0, 'blue', 'attack') - nexzoth.top;

    // Reality Consume: adjacent enemies have -1 Power (live aura, both
    // attack and defense), allies untouched, and a debuffImmune neighbor
    // is unaffected.
    state.board = Array(9).fill(null);
    state.board[4] = freshEntry(nexzoth, 'blue');
    const adjacentEnemy = { top:5,right:5,bottom:5,left:5 };
    out.realityConsumeHitsAdjacentEnemyAttack = fullEffectiveValue(adjacentEnemy, 'top', {top:1,right:1,bottom:1,left:1}, 1, 'red', 'attack') - adjacentEnemy.top;
    out.realityConsumeHitsAdjacentEnemyDefense = fullEffectiveValue(adjacentEnemy, 'top', {top:1,right:1,bottom:1,left:1}, 1, 'red', 'defense') - adjacentEnemy.top;
    const farEnemy = { top:5,right:5,bottom:5,left:5 };
    out.realityConsumeIgnoresFarEnemy = fullEffectiveValue(farEnemy, 'top', {top:1,right:1,bottom:1,left:1}, 0, 'red', 'attack') - farEnemy.top;
    const adjacentAlly = { top:5,right:5,bottom:5,left:5 };
    out.realityConsumeIgnoresAlly = fullEffectiveValue(adjacentAlly, 'top', {top:1,right:1,bottom:1,left:1}, 1, 'blue', 'attack') - adjacentAlly.top;
    const immuneNeighbor = { top:5,right:5,bottom:5,left:5, active:{debuffImmune:true} };
    out.realityConsumeRespectsDebuffImmune = fullEffectiveValue(immuneNeighbor, 'top', {top:1,right:1,bottom:1,left:1}, 1, 'red', 'attack') - immuneNeighbor.top;

    // Endless Void: at the start of each round (turn switch), every enemy
    // on the board loses 1 Power this round (temporary, non-stacking).
    state.board = Array(9).fill(null);
    state.board[4] = freshEntry(nexzoth, 'blue');
    const voidTarget = freshEntry({ id:'void-target', name:'VoidTarget', top:5,right:5,bottom:5,left:5 }, 'red');
    state.board[1] = voidTarget;
    const allyUnaffected = freshEntry({ id:'void-ally', name:'VoidAlly', top:5,right:5,bottom:5,left:5 }, 'blue');
    state.board[0] = allyUnaffected;
    sweepExpiredRoundEffects();
    out.endlessVoidDebuffedEnemy = voidTarget.captureBonus === -1;
    out.endlessVoidSparedAlly = allyUnaffected.captureBonus === 0;

    // World Shatter, simplified per the approved art: every win destroys the
    // direct target outright (no capture), uncapped (no once-per-match flag
    // this time — that cap is exclusive to Morvath's line-AOE
    // onWinLineDestroy), and skips the Graveyard even with the rule on.
    state.rules.graveyard = true;
    state.graveyard = { blue: [], red: [] };
    state.board = Array(9).fill(null);
    const nexShatter = freshEntry(nexzoth, 'blue');
    state.board[4] = nexShatter;
    state.board[1] = freshEntry({ id:'ws-target', name:'WSTarget', top:1,right:1,bottom:1,left:1 }, 'red');
    resolveFlips(4, 'blue');
    out.worldShatterDestroyedTarget = state.board[1] === null;
    out.worldShatterSkippedGraveyard = state.graveyard.red.length === 0;

    // A second, independent win by the same Nexzoth also destroys — uncapped.
    state.board[1] = freshEntry({ id:'ws-target2', name:'WSTarget2', top:1,right:1,bottom:1,left:1 }, 'red');
    resolveFlips(4, 'blue');
    out.worldShatterRepeatsEveryWin = state.board[1] === null;

    // Devourer: +1 Power permanent every time ANY enemy card is destroyed,
    // by any effect (reuses active.buffOnEnemyDestroyed, same as Morvath).
    state.board = Array(9).fill(null);
    const devSrc = freshEntry(nexzoth, 'blue');
    state.board[4] = devSrc;
    const devTarget = freshEntry({ id:'dev-target', name:'DevTarget', top:1,right:1,bottom:1,left:1 }, 'red');
    state.board[1] = devTarget;
    destroyCard(1);
    out.devourerGainedPower = devSrc.captureBonus === 1;

    // The Ending, simplified per the approved art: enemy-only now (spares
    // allies, unlike before), still respects destroyImmune, skips the
    // Graveyard entirely.
    state.rules.graveyard = true;
    state.graveyard = { blue: [], red: [] };
    state.board = Array(9).fill(null);
    const nexSrc = freshEntry(nexzoth, 'blue');
    state.board[4] = nexSrc;
    state.board[0] = freshEntry(findCardById('ogre'), 'blue');
    state.board[1] = freshEntry(findCardById('ogre'), 'red');
    state.board[8] = freshEntry(findCardById('threeheaddragon'), 'red');
    SPECIAL_HANDLERS.nexzoth({ srcEntry: nexSrc, sourceIndex: 4, owner: 'blue' });
    out.endingKeepsSelf = state.board[4] === nexSrc;
    out.endingSparesOwnSide = state.board[0] !== null;
    out.endingDestroysEnemySide = state.board[1] === null;
    out.endingRespectsDestroyImmune = state.board[8] !== null;
    out.endingSkippedGraveyard = state.graveyard.red.length === 0;

    return out;
  })()`);
  assert.equal(result.weakVsLight, -4);
  assert.equal(result.realityConsumeHitsAdjacentEnemyAttack, -1);
  assert.equal(result.realityConsumeHitsAdjacentEnemyDefense, -1, 'Reality Consume applies on both attack and defense');
  assert.equal(result.realityConsumeIgnoresFarEnemy, 0, 'only ADJACENT enemies are affected');
  assert.equal(result.realityConsumeIgnoresAlly, 0, 'allies are never hit by the aura');
  assert.equal(result.realityConsumeRespectsDebuffImmune, 0, 'a debuffImmune neighbor is unaffected');
  assert.equal(result.endlessVoidDebuffedEnemy, true, 'Endless Void debuffs every enemy on the board at each turn switch');
  assert.equal(result.endlessVoidSparedAlly, true);
  assert.equal(result.worldShatterDestroyedTarget, true);
  assert.equal(result.worldShatterSkippedGraveyard, true, "World Shatter's destroy cannot be revived, even with the Graveyard rule on");
  assert.equal(result.worldShatterRepeatsEveryWin, true, 'World Shatter is uncapped now (no once-per-match flag, unlike Morvath\'s line-AOE)');
  assert.equal(result.devourerGainedPower, true);
  assert.equal(result.endingKeepsSelf, true);
  assert.equal(result.endingSparesOwnSide, true, 'The Ending now spares allies, matching the approved art');
  assert.equal(result.endingDestroysEnemySide, true);
  assert.equal(result.endingRespectsDestroyImmune, true);
  assert.equal(result.endingSkippedGraveyard, true);
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
  const result = await page.evaluate(`(async () => {
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
    // Game feel phase 4: the effect itself is deferred behind a windup beat
    // now (see playUltimateSequence) — used is still true synchronously
    // (the AI committed to the cast), but the actual board change needs
    // waiting for.
    await new Promise(r => setTimeout(r, ULTIMATE_WINDUP_MS + 50));
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
  const result = await page.evaluate(`(async () => {
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
    // (Morvath, not Nexzoth -- Nexzoth's own debuffImmune was replaced by
    // Endless Void's new round-start drain mechanic, see PROJECT.md.)
    const immuneEntry = freshEntry(findCardById('morvath'), 'blue');
    SpecialVerbs.debuff(immuneEntry, 5);
    out.blockedChangeDoesNotFlash = immuneEntry.bonusFlash !== true;

    // destroyCard() leaves a fading ghost record, cleared by runSpecialResolution's own cleanup timer.
    // Game feel phase 4: runSpecialResolution now plays a windup beat before
    // the handler (and so destroyCard) actually runs — see
    // playUltimateSequence — so this waits past ULTIMATE_WINDUP_MS instead
    // of checking immediately.
    state.board = Array(9).fill(null);
    const src = freshEntry(findCardById('vaelira'), 'blue');
    state.board[0] = src;
    state.board[1] = freshEntry(findCardById('ogre'), 'red');
    state.playerHand = []; state.enemyHand = [];
    runSpecialResolution(0, null);
    await new Promise(r => setTimeout(r, ULTIMATE_WINDUP_MS + 50));
    out.ghostRecordedAfterResolve = state.destroyGhosts.length === 1 && state.destroyGhosts[0].index === 1;

    return out;
  })()`);
  assert.equal(result.positiveFlash, true);
  assert.equal(result.negativeFlash, true, 'debuff() flashes with a negative bonusAmount, not the old always-positive popup');
  assert.equal(result.debuffThisRoundFlash, true);
  assert.equal(result.buffThisRoundFlash, true);
  assert.equal(result.directionalBoostFlash, true);
  assert.equal(result.stealPowerFlashesBoth, true);
  assert.equal(result.blockedChangeDoesNotFlash, true, "a debuffImmune-blocked change doesn't show a misleading flash");
  assert.equal(result.ghostRecordedAfterResolve, true, 'destroyCard() records a destroyGhosts entry for the shattered-card animation');
  assert.deepEqual(pageErrors, []);
  await page.close();

  // Ghost cleanup happens on a real 1300ms timer AFTER the windup beat —
  // verified in a second, fresh page so the first page's assertions above
  // aren't slowed down by waiting for it.
  const { page: page2, pageErrors: pageErrors2 } = await newPage();
  const cleared = await page2.evaluate(async () => {
    function freshEntry(card, owner){ return { card, owner, shieldUsed:false, grantedShield:false, captureBonus:0 }; }
    state.board = Array(9).fill(null);
    const src = freshEntry(findCardById('vaelira'), 'blue');
    state.board[0] = src;
    state.board[1] = freshEntry(findCardById('ogre'), 'red');
    state.playerHand = []; state.enemyHand = [];
    runSpecialResolution(0, null);
    await new Promise(r => setTimeout(r, ULTIMATE_WINDUP_MS + 1300 + 250));
    return state.destroyGhosts.length;
  });
  assert.equal(cleared, 0, 'destroyGhosts is cleared by the existing windup+1300ms animation-cleanup timers');
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

test('Templaren: reworked per audit — Holy Aura (on-place directional ally buff), Divine Retribution (on-capture self buff), Faithful Defense unchanged, Shield Wall dropped', async () => {
  const { page, pageErrors } = await newPage();
  const result = await page.evaluate(`(() => {
    ${freshEntrySnippet()}
    const out = {};
    const templaren = findCardById('templaren');
    // Templaren is a campaign unlock reward (CAMPAIGN_STAGES unlockIds),
    // intentionally player-only — unlike most heroes he's never in
    // FOREST_FOES, so only HEROES membership is checked here.
    out.playable = HEROES.some(h => h.id === 'templaren');
    out.skillCount = templaren.skills.length === 3;
    out.shieldWallDropped = !templaren.skills.some(s => s.name === 'Shield Wall');

    // Holy Aura: each adjacent ally gets +1 on the side FACING Templaren
    // (opposite of the direction he's offset from them), a non-adjacent
    // ally and an adjacent enemy are both untouched.
    state.board = Array(9).fill(null);
    state.playerHand = [1,2]; state.enemyHand = [1,2];
    const templarenEntry = freshEntry(templaren, 'blue');
    const upAlly = freshEntry({ id:'ua', name:'UA', top:1,right:1,bottom:1,left:1 }, 'blue');
    const leftAlly = freshEntry({ id:'la', name:'LA', top:1,right:1,bottom:1,left:1 }, 'blue');
    const rightAlly = freshEntry({ id:'ra', name:'RA', top:1,right:1,bottom:1,left:1 }, 'blue');
    const downAlly = freshEntry({ id:'da', name:'DA', top:1,right:1,bottom:1,left:1 }, 'blue');
    const adjEnemy = freshEntry({ id:'ae', name:'AE', top:1,right:1,bottom:1,left:1 }, 'red');
    state.board[1] = upAlly; state.board[3] = leftAlly; state.board[5] = rightAlly; state.board[7] = downAlly;
    state.board[4] = templarenEntry;
    ON_PLACE_HANDLERS.templaren(templarenEntry, 'blue', 4);
    out.upAllyGetsBottom = upAlly.sideBonus && upAlly.sideBonus.bottom === 1 && !upAlly.sideBonus.top && !upAlly.sideBonus.left && !upAlly.sideBonus.right;
    out.leftAllyGetsRight = leftAlly.sideBonus && leftAlly.sideBonus.right === 1 && !leftAlly.sideBonus.left;
    out.rightAllyGetsLeft = rightAlly.sideBonus && rightAlly.sideBonus.left === 1 && !rightAlly.sideBonus.right;
    out.downAllyGetsTop = downAlly.sideBonus && downAlly.sideBonus.top === 1 && !downAlly.sideBonus.bottom;
    out.enemyUntouched = !adjEnemy.sideBonus;

    // Divine Retribution: capturing an enemy grants +1 all sides this round.
    state.board = Array(9).fill(null);
    state.playerHand = [1,2]; state.enemyHand = [1,2];
    const templarenWinner = freshEntry(templaren, 'blue');
    state.board[4] = templarenWinner;
    const weakFoe = freshEntry({ id:'wf', name:'WF', top:1,right:1,bottom:1,left:1 }, 'red');
    state.board[1] = weakFoe;
    resolveFlips(4, 'blue');
    out.divineRetributionBuffed = templarenWinner.captureBonus === 1;

    // Faithful Defense: unchanged, still a live conditional shield.
    state.board = Array(9).fill(null);
    const templarenShielded = freshEntry(templaren, 'blue');
    state.board[4] = templarenShielded;
    state.board[1] = freshEntry({ id:'a1', name:'A1', top:1,right:1,bottom:1,left:1 }, 'blue');
    state.board[3] = freshEntry({ id:'a2', name:'A2', top:1,right:1,bottom:1,left:1 }, 'blue');
    out.faithfulDefenseHolds = isShielded(templarenShielded, 4) === true;

    return out;
  })()`);
  assert.equal(result.playable, true);
  assert.equal(result.skillCount, true);
  assert.equal(result.shieldWallDropped, true);
  assert.equal(result.upAllyGetsBottom, true);
  assert.equal(result.leftAllyGetsRight, true);
  assert.equal(result.rightAllyGetsLeft, true);
  assert.equal(result.downAllyGetsTop, true);
  assert.equal(result.enemyUntouched, true);
  assert.equal(result.divineRetributionBuffed, true);
  assert.equal(result.faithfulDefenseHolds, true);
  assert.deepEqual(pageErrors, []);
  await page.close();
});

test('Tilda: reworked per audit — stats buffed to 7/8/8/8, Piercing Shot + Marked Target (on-place), Umbral Step (renamed, on-win, live-expiring), Night\'s Advantage unchanged, first-ever Ultimate Nightfall', async () => {
  const { page, pageErrors } = await newPage();
  const result = await page.evaluate(`(() => {
    ${freshEntrySnippet()}
    const out = {};
    const tilda = findCardById('tilda');
    out.statsBuffed = tilda.top === 7 && tilda.right === 8 && tilda.bottom === 8 && tilda.left === 8;
    out.skillCount = tilda.skills.length === 5;
    out.shadowStepRenamed = !tilda.skills.some(s => s.name === 'Shadow Step') && tilda.skills.some(s => s.name === 'Umbral Step');
    out.hasNightsAdvantage = tilda.active.underdogBonus === 2;
    out.specialName = tilda.special.name === 'Nightfall';
    out.specialCost = tilda.special.cost === 2;

    // Piercing Shot + Marked Target both fire on placement. Math.random
    // forced to 0 so the random direction picks 'up' (dirs[0]) and any
    // random-index picks land on index 0 of their candidate list.
    const realRandom = Math.random;

    // Case A: enemy directly above Tilda (in the forced 'up' line) — both
    // Piercing Shot (-2 this round) AND Marked Target (tildaMarked) should
    // land on it, since it's also the only enemy on the board.
    state.board = Array(9).fill(null);
    state.playerHand = [1,2]; state.enemyHand = [1,2];
    const tildaA = freshEntry(tilda, 'blue');
    state.board[4] = tildaA;
    const inLineFoe = freshEntry({ id:'ilf', name:'ILF', top:1,right:1,bottom:1,left:1 }, 'red');
    state.board[1] = inLineFoe;
    Math.random = () => 0;
    ON_PLACE_HANDLERS.tilda(tildaA, 'blue', 4);
    Math.random = realRandom;
    out.piercingShotHitInLineTarget = inLineFoe.captureBonus === -2;
    out.markedTargetHitInLineTarget = inLineFoe.tildaMarked === true;

    // Case B: enemy at a CORNER (index 0) — not orthogonally aligned with
    // Tilda at center (index 4), so Piercing Shot's line-scan (forced
    // 'up') never reaches it, but Marked Target (whole-board random pick)
    // still marks it regardless of position.
    state.board = Array(9).fill(null);
    state.playerHand = [1,2]; state.enemyHand = [1,2];
    const tildaB = freshEntry(tilda, 'blue');
    state.board[4] = tildaB;
    const cornerFoe = freshEntry({ id:'cf', name:'CF', top:1,right:1,bottom:1,left:1 }, 'red');
    state.board[0] = cornerFoe;
    Math.random = () => 0;
    ON_PLACE_HANDLERS.tilda(tildaB, 'blue', 4);
    Math.random = realRandom;
    out.piercingShotMissedCorner = cornerFoe.captureBonus === 0;
    out.markedTargetStillHitsCorner = cornerFoe.tildaMarked === true;

    // Marked Target's +2 applies to ANY allied attacker, not just Tilda
    // (unlike Seraphine's self-only Celestial Mark) — checked directly via
    // battleNeighbors' real resolution path.
    state.board = Array(9).fill(null);
    state.playerHand = [1,2]; state.enemyHand = [1,2];
    // Without the +2 mark bonus, otherAlly's 5 loses to markedFoe's 6 on
    // every side — only the mark makes this a win (5+2=7 > 6), proving the
    // bonus is what flips the outcome.
    const markedFoe = freshEntry({ id:'mf', name:'MF', top:6,right:6,bottom:6,left:6 }, 'red');
    markedFoe.tildaMarked = true;
    state.board[1] = markedFoe;
    const otherAlly = freshEntry({ id:'oa', name:'OA', top:5,right:5,bottom:5,left:5 }, 'blue');
    state.board[4] = otherAlly;
    resolveFlips(4, 'blue');
    out.markedTargetBoostsAnyAlly = state.board[1].owner === 'blue';

    // Umbral Step: on win, a random side (forced to 'top', sides[0]) gets
    // live +1 for the round-clock window, then expires — nothing to
    // reverse since it's never written into sideBonus/captureBonus.
    state.board = Array(9).fill(null);
    state.playerHand = [1,2]; state.enemyHand = [1,2];
    const tildaWinner = freshEntry(tilda, 'blue');
    state.board[4] = tildaWinner;
    const weakFoe = freshEntry({ id:'wf', name:'WF', top:1,right:1,bottom:1,left:1 }, 'red');
    state.board[1] = weakFoe;
    Math.random = () => 0;
    resolveFlips(4, 'blue');
    Math.random = realRandom;
    out.umbralStepSideChosen = tildaWinner.umbralStepSide === 'top';
    const dummyOpp = { id:'dummy', name:'D', top:1,right:1,bottom:1,left:1 };
    out.umbralStepLiveBonusOnChosenSide = fullEffectiveValue(tilda, 'top', dummyOpp, 4, 'blue', 'defense') - tilda.top === 1;
    out.umbralStepNoBonusOnOtherSide = fullEffectiveValue(tilda, 'right', dummyOpp, 4, 'blue', 'defense') - tilda.right === 0;
    const savedTurnCount = state.turnCount;
    state.turnCount = tildaWinner.umbralStepUntilTurnCount;
    out.umbralStepExpiredAfterWindow = fullEffectiveValue(tilda, 'top', dummyOpp, 4, 'blue', 'defense') - tilda.top === 0;
    state.turnCount = savedTurnCount;

    // Nightfall: first-ever Ultimate, same total-power-threshold shape as
    // Sarah/Vayra/Ysara/Aurelia/Lyrith (+3 temp threshold, +1 permanent
    // all-sides on a win).
    state.board = Array(9).fill(null);
    const nfSrc = freshEntry(tilda, 'blue');
    state.board[4] = nfSrc;
    const nfWeak = freshEntry({ id:'nf-weak', name:'NFWeak', top:1,right:1,bottom:1,left:1 }, 'red');
    state.board[1] = nfWeak;
    SPECIAL_HANDLERS.tilda({ srcEntry: nfSrc, targetEntry: nfWeak, targetIndex: 1, owner: 'blue' });
    out.nightfallCapturedAndBuffed = nfWeak.owner === 'blue' && nfSrc.captureBonus === 1;

    state.board = Array(9).fill(null);
    const nfSrc2 = freshEntry(tilda, 'blue'); // total 31
    state.board[4] = nfSrc2;
    const nfStrong = freshEntry({ id:'nf-strong', name:'NFStrong', top:20,right:20,bottom:20,left:20 }, 'red'); // total 80, 31+3 <= 80
    state.board[1] = nfStrong;
    SPECIAL_HANDLERS.tilda({ srcEntry: nfSrc2, targetEntry: nfStrong, targetIndex: 1, owner: 'blue' });
    out.nightfallNoEffectVsMuchStronger = nfStrong.owner === 'red' && nfSrc2.captureBonus === 0;

    return out;
  })()`);
  assert.equal(result.statsBuffed, true);
  assert.equal(result.skillCount, true);
  assert.equal(result.shadowStepRenamed, true);
  assert.equal(result.hasNightsAdvantage, true);
  assert.equal(result.specialName, true);
  assert.equal(result.specialCost, true);
  assert.equal(result.piercingShotHitInLineTarget, true);
  assert.equal(result.markedTargetHitInLineTarget, true);
  assert.equal(result.piercingShotMissedCorner, true, "Piercing Shot's line-scan should not reach a diagonal corner");
  assert.equal(result.markedTargetStillHitsCorner, true, "Marked Target is a whole-board pick, unaffected by position");
  assert.equal(result.markedTargetBoostsAnyAlly, true, "Marked Target boosts ANY allied attacker, not just Tilda herself");
  assert.equal(result.umbralStepSideChosen, true);
  assert.equal(result.umbralStepLiveBonusOnChosenSide, true);
  assert.equal(result.umbralStepNoBonusOnOtherSide, true);
  assert.equal(result.umbralStepExpiredAfterWindow, true);
  assert.equal(result.nightfallCapturedAndBuffed, true, 'Nightfall captures and grants +1 permanent on a win');
  assert.equal(result.nightfallNoEffectVsMuchStronger, true, 'Nightfall fails against a target whose total power exceeds the +3 threshold');
  assert.deepEqual(pageErrors, []);
  await page.close();
});

test('Tahabata: reworked per audit — Dragonfire\'s Fury (oncePerMatchAttackBoost), Soul Petrification (grantShield), Wrath Eruption (on-win directional debuff, live-expiring), Pyrelord\'s Awakening (any-role adjacent-enemy aura), Shield unchanged, Inferno Dominion combined with the approved art\'s dominant-win clause, mirrored in HEROES and FOREST_FOES', async () => {
  const { page, pageErrors } = await newPage();
  const result = await page.evaluate(`(() => {
    ${freshEntrySnippet()}
    const out = {};
    const tahabata = findCardById('tahabata');
    out.statsUnchanged = tahabata.top === 10 && tahabata.right === 10 && tahabata.bottom === 8 && tahabata.left === 9;
    out.roleMatchesArt = tahabata.role === 'Pyrelord';
    out.isDragonTagged = tahabata.isDragon === true;
    out.skillCount = tahabata.skills.length === 6;
    out.hasPyrelordsShield = tahabata.active.shield === true;
    out.specialName = tahabata.special.name === 'Inferno Dominion';
    out.specialCost = tahabata.special.cost === 2;

    // Mirrored in both HEROES (player) and FOREST_FOES (AI) — same active fields.
    const forestTahabata = FOREST_FOES.find(f => f.id === 'tahabata');
    out.mirroredInForestFoes = forestTahabata
      && forestTahabata.active.oncePerMatchAttackBoost.amount === 2
      && forestTahabata.active.onCaptureGrantShield === true
      && forestTahabata.active.onWinAdjacentEnemyDebuff === 1
      && forestTahabata.active.adjacentEnemiesBoostAnyRole.minCount === 2
      && forestTahabata.active.adjacentEnemiesBoostAnyRole.amount === 1
      && forestTahabata.role === 'Pyrelord'
      && forestTahabata.isDragon === true;

    // Dragonfire's Fury: reuses the existing oncePerMatchAttackBoost primitive.
    state.board = Array(9).fill(null);
    state.playerHand = [1,2]; state.enemyHand = [1,2];
    out.dragonfiresFuryField = tahabata.active.oncePerMatchAttackBoost.amount === 2;
    const dfSrc = freshEntry(tahabata, 'blue');
    state.board[4] = dfSrc;
    const dfTarget = freshEntry({ id:'dft', name:'DFT', top:1,right:1,bottom:1,left:1 }, 'red');
    state.board[1] = dfTarget;
    out.dragonfiresFuryAppliesOnAttack = fullEffectiveValue(tahabata, 'top', dfTarget, 4, 'blue', 'attack') - tahabata.top === 2;
    resolveFlips(4, 'blue');
    out.dragonfiresFuryConsumed = dfSrc.oncePerMatchAttackBoostUsed === true;

    // Soul Petrification: the just-captured card gets a one-time shield
    // (SpecialVerbs.grantShield), blocking the very next attempt to flip
    // it back even against overwhelming power.
    state.board = Array(9).fill(null);
    state.playerHand = [1,2]; state.enemyHand = [1,2];
    const spSrc = freshEntry(tahabata, 'blue');
    state.board[4] = spSrc;
    const spWeak = freshEntry({ id:'spw', name:'SPW', top:1,right:1,bottom:1,left:1 }, 'red');
    state.board[1] = spWeak;
    resolveFlips(4, 'blue');
    out.soulPetrificationCaptured = state.board[1].owner === 'blue';
    out.soulPetrificationGrantedShield = spWeak.grantedShield === true;
    // index 0 is horizontally adjacent to index 1 (row 0, col 0/1), so the
    // relevant attacking side is 'right', not 'bottom'.
    const spCrusher = freshEntry({ id:'spc', name:'SPC', top:1,right:20,bottom:1,left:1 }, 'red');
    state.board[0] = spCrusher;
    resolveFlips(0, 'red');
    out.soulPetrificationBlockedRecapture = state.board[1].owner === 'blue';
    out.soulPetrificationShieldConsumed = spWeak.shieldUsed === true;

    // Wrath Eruption: after Tahabata wins ONE battle, every OTHER still-
    // enemy-owned adjacent card gets -1 live on the side facing him, this
    // round. Down neighbor (index 7) survives (crusher stats), so it's
    // still enemy-owned when checkOnWinBonuses runs off the up neighbor's
    // capture -- its facing side is 'top' (opposite of Tahabata's [1,0]
    // offset onto it).
    state.board = Array(9).fill(null);
    state.playerHand = [1,2]; state.enemyHand = [1,2];
    const weSrc = freshEntry(tahabata, 'blue');
    state.board[4] = weSrc;
    const weWeak = freshEntry({ id:'wew', name:'WEW', top:1,right:1,bottom:1,left:1 }, 'red');
    state.board[1] = weWeak;
    const weSurvivor = freshEntry({ id:'wes', name:'WES', top:20,right:1,bottom:1,left:1 }, 'red');
    state.board[7] = weSurvivor;
    resolveFlips(4, 'blue');
    out.wrathEruptionCapturedWeak = state.board[1].owner === 'blue';
    out.wrathEruptionSurvivorStillEnemy = state.board[7].owner === 'red';
    out.wrathEruptionSideSet = weSurvivor.wrathEruptionSide === 'top';
    const dummyOpp = { id:'dummy', name:'D', top:1,right:1,bottom:1,left:1 };
    out.wrathEruptionLiveDebuff = fullEffectiveValue(weSurvivor.card, 'top', dummyOpp, 7, 'red', 'defense') - weSurvivor.card.top === -1;
    out.wrathEruptionNoDebuffOtherSide = fullEffectiveValue(weSurvivor.card, 'right', dummyOpp, 7, 'red', 'defense') - weSurvivor.card.right === 0;
    const savedTurnCount = state.turnCount;
    state.turnCount = weSurvivor.wrathEruptionUntilTurnCount;
    out.wrathEruptionExpired = fullEffectiveValue(weSurvivor.card, 'top', dummyOpp, 7, 'red', 'defense') - weSurvivor.card.top === 0;
    state.turnCount = savedTurnCount;

    // Pyrelord's Awakening: +1 all sides while surrounded by 2+ enemies,
    // on BOTH attack and defense (variant "a", no role gate) -- the key
    // difference from Tiamat's attack-only adjacentEnemiesBoost. Marks
    // oncePerMatchAttackBoostUsed so Dragonfire's Fury doesn't also add
    // its own +2 and muddy the attack-role assertion.
    state.board = Array(9).fill(null);
    state.playerHand = [1,2]; state.enemyHand = [1,2];
    const paEntry = freshEntry(tahabata, 'blue');
    paEntry.oncePerMatchAttackBoostUsed = true;
    state.board[4] = paEntry;
    state.board[1] = freshEntry({ id:'pae1', name:'PAE1', top:1,right:1,bottom:1,left:1 }, 'red');
    state.board[3] = freshEntry({ id:'pae2', name:'PAE2', top:1,right:1,bottom:1,left:1 }, 'red');
    out.awakeningAppliesOnAttack = fullEffectiveValue(tahabata, 'top', dummyOpp, 4, 'blue', 'attack') - tahabata.top === 1;
    out.awakeningAppliesOnDefense = fullEffectiveValue(tahabata, 'top', dummyOpp, 4, 'blue', 'defense') - tahabata.top === 1;
    state.board[3] = null;
    out.awakeningNoBonusBelowThreshold = fullEffectiveValue(tahabata, 'top', dummyOpp, 4, 'blue', 'defense') - tahabata.top === 0;

    // Inferno Dominion, combined per the user's choice "C": the old
    // lenient totalPower+2<=target threshold stays as the baseline (a
    // narrow win, even while slightly weaker, still succeeds and still
    // respects shields), but a DOMINANT win (margin of 2+, the approved
    // art's own threshold) now also bypasses shields entirely, leaving
    // them unconsumed. Tahabata's total power is 37.

    // Case: fails outright -- target total 40 (37+2=39 <= 40).
    state.board = Array(9).fill(null);
    const idFailSrc = freshEntry(tahabata, 'blue');
    state.board[4] = idFailSrc;
    const idFailTarget = freshEntry({ id:'id-fail', name:'IDFail', top:10,right:10,bottom:10,left:10 }, 'red'); // total 40
    state.board[1] = idFailTarget;
    SPECIAL_HANDLERS.tahabata({ srcEntry: idFailSrc, targetEntry: idFailTarget, targetIndex: 1, owner: 'blue' });
    out.infernoFailsOutright = idFailTarget.owner === 'red';

    // Case: lenient win preserved -- target total 38 (Tahabata is
    // nominally weaker, 37 < 38, but the old +2 threshold still lets this
    // succeed), no shield involved.
    state.board = Array(9).fill(null);
    const idLenientSrc = freshEntry(tahabata, 'blue');
    state.board[4] = idLenientSrc;
    const idLenientTarget = freshEntry({ id:'id-lenient', name:'IDLenient', top:10,right:10,bottom:9,left:9 }, 'red'); // total 38
    state.board[1] = idLenientTarget;
    SPECIAL_HANDLERS.tahabata({ srcEntry: idLenientSrc, targetEntry: idLenientTarget, targetIndex: 1, owner: 'blue' });
    out.infernoLenientWinPreserved = idLenientTarget.owner === 'blue';

    // Case: narrow win (margin 1, target total 36) with a shield -- NOT
    // dominant, so the shield still blocks exactly as the old code did.
    state.board = Array(9).fill(null);
    const idNarrowSrc = freshEntry(tahabata, 'blue');
    state.board[4] = idNarrowSrc;
    const idNarrowTarget = freshEntry({ id:'id-narrow', name:'IDNarrow', top:9,right:9,bottom:9,left:9, active:{shield:true} }, 'red'); // total 36, margin 1
    state.board[1] = idNarrowTarget;
    SPECIAL_HANDLERS.tahabata({ srcEntry: idNarrowSrc, targetEntry: idNarrowTarget, targetIndex: 1, owner: 'blue' });
    out.infernoNarrowWinStillBlockedByShield = idNarrowTarget.owner === 'red';

    // Case: dominant win (margin 3, target total 34) with a shield -- the
    // approved art's own clause kicks in: shields don't stop this at all.
    // The shield is bypassed, not consumed (specialBlockedByShield, which
    // marks shieldUsed, is skipped outright).
    state.board = Array(9).fill(null);
    const idDomSrc = freshEntry(tahabata, 'blue');
    state.board[4] = idDomSrc;
    const idDomTarget = freshEntry({ id:'id-dom', name:'IDDom', top:9,right:9,bottom:8,left:8, active:{shield:true} }, 'red'); // total 34, margin 3
    state.board[1] = idDomTarget;
    SPECIAL_HANDLERS.tahabata({ srcEntry: idDomSrc, targetEntry: idDomTarget, targetIndex: 1, owner: 'blue' });
    out.infernoDominantWinBypassesShield = idDomTarget.owner === 'blue';
    out.infernoDominantShieldLeftUnconsumed = idDomTarget.shieldUsed === false;

    return out;
  })()`);
  assert.equal(result.statsUnchanged, true);
  assert.equal(result.roleMatchesArt, true, "role should read 'Pyrelord' per the approved art's subtitle");
  assert.equal(result.isDragonTagged, true, 'the approved art shows "Type: Dragon"');
  assert.equal(result.skillCount, true);
  assert.equal(result.hasPyrelordsShield, true);
  assert.equal(result.specialName, true);
  assert.equal(result.specialCost, true);
  assert.equal(result.mirroredInForestFoes, true, 'the FOREST_FOES copy must carry the same new active fields');
  assert.equal(result.dragonfiresFuryField, true);
  assert.equal(result.dragonfiresFuryAppliesOnAttack, true);
  assert.equal(result.dragonfiresFuryConsumed, true);
  assert.equal(result.soulPetrificationCaptured, true);
  assert.equal(result.soulPetrificationGrantedShield, true, 'Soul Petrification grants the just-captured card a one-time shield');
  assert.equal(result.soulPetrificationBlockedRecapture, true, "the shield blocks the enemy's immediate attempt to win it back");
  assert.equal(result.soulPetrificationShieldConsumed, true);
  assert.equal(result.wrathEruptionCapturedWeak, true);
  assert.equal(result.wrathEruptionSurvivorStillEnemy, true);
  assert.equal(result.wrathEruptionSideSet, true, "the surviving neighbor's facing side is marked");
  assert.equal(result.wrathEruptionLiveDebuff, true);
  assert.equal(result.wrathEruptionNoDebuffOtherSide, true);
  assert.equal(result.wrathEruptionExpired, true);
  assert.equal(result.awakeningAppliesOnAttack, true);
  assert.equal(result.awakeningAppliesOnDefense, true, "Pyrelord's Awakening applies on defense too, unlike Tiamat's attack-only adjacentEnemiesBoost");
  assert.equal(result.awakeningNoBonusBelowThreshold, true);
  assert.equal(result.infernoFailsOutright, true, "Inferno Dominion still fails when the target's total Power is 2+ higher");
  assert.equal(result.infernoLenientWinPreserved, true, 'the old lenient threshold still lets a nominally-weaker Tahabata win');
  assert.equal(result.infernoNarrowWinStillBlockedByShield, true, 'a non-dominant win still respects shields, same as before');
  assert.equal(result.infernoDominantWinBypassesShield, true, "a dominant win (margin 2+) bypasses shields entirely, per the approved art");
  assert.equal(result.infernoDominantShieldLeftUnconsumed, true, 'a bypassed shield is left unconsumed, not destroyed');
  assert.deepEqual(pageErrors, []);
  await page.close();
});

test('Board display: stored captureBonus/sideBonus show as a live-updated number with a buffed/debuffed color; static board-position bonuses (pairPresence etc.) now also fold in, but attack/defense-role-gated and matchup-dependent bonuses stay excluded', async () => {
  const { page, pageErrors } = await newPage();
  const result = await page.evaluate(`(() => {
    ${freshEntrySnippet()}
    const out = {};
    const ogre = findCardById('ogre'); // top:8, right:5, bottom:8, left:4

    // effectiveStatFor: pure math, no rendering. No cellIndex/owner in opts
    // (a bare hand/draft card, or a unit-test call with no board context)
    // means none of the new static-bonus lookups can apply either --
    // confirms the Fas 1 fix is additive, not a behavior change for the
    // cases that already worked.
    out.baseUnaffected = effectiveStatFor(ogre, 'top', {}).value === 8 && effectiveStatFor(ogre, 'top', {}).bonus === 0;
    out.captureBonusApplies = effectiveStatFor(ogre, 'top', { captureBonus: 2 }).value === 10;
    out.sideBonusAppliesOnlyToThatSide = effectiveStatFor(ogre, 'right', { sideBonus: { right: -1 } }).value === 4
      && effectiveStatFor(ogre, 'top', { sideBonus: { right: -1 } }).value === 8;
    out.captureAndSideBonusStack = effectiveStatFor(ogre, 'top', { captureBonus: 1, sideBonus: { top: 1 } }).value === 10
      && effectiveStatFor(ogre, 'top', { captureBonus: 1, sideBonus: { top: 1 } }).bonus === 2;

    // statNumHtml: value shown + buffed/debuffed class, neutral gets no class.
    out.buffedClassAndValue = statNumHtml(ogre, 'top', { captureBonus: 2 }).includes('buffed') && statNumHtml(ogre, 'top', { captureBonus: 2 }).includes('>10<');
    out.debuffedClassAndValue = statNumHtml(ogre, 'top', { captureBonus: -3 }).includes('debuffed') && statNumHtml(ogre, 'top', { captureBonus: -3 }).includes('>5<');
    out.neutralHasNoColorClass = !statNumHtml(ogre, 'top', {}).includes('buffed') && !statNumHtml(ogre, 'top', {}).includes('debuffed');

    // End-to-end via a real board cell: boardCellHtml must actually pass
    // the live entry's captureBonus/sideBonus/cellIndex through to
    // cardFace/statNumHtml. Hands set to a non-trivial length so
    // lastStandBonus (0 or 1 cards left -> +1/+2) can't spuriously fire in
    // this otherwise hand-less unit-test harness.
    state.board = Array(9).fill(null);
    state.playerHand = [1,2,3]; state.enemyHand = [1,2,3];
    const entry = freshEntry(ogre, 'blue');
    entry.captureBonus = 3;
    state.board[4] = entry;
    const html = boardCellHtml(entry, 4);
    out.boardCellReflectsLiveBonus = html.includes('buffed') && html.includes('>11<');

    // Fas 1 fix: a STATIC, always-on-right-now board bonus (Darien/Elara's
    // mutual pairPresence, +2 all sides while the partner is anywhere on
    // the board) now actually shows up in the printed number once the card
    // is placed -- this used to be entirely invisible (the exact "the card
    // lies about its own numbers" gap the design review flagged).
    const darien = findCardById('darien'); // top:10, active.pairPresence partner 'elara' amount 2
    const elara = findCardById('elara');
    state.board = Array(9).fill(null);
    state.playerHand = [1,2,3]; state.enemyHand = [1,2,3];
    state.board[0] = freshEntry(darien, 'blue');
    state.board[8] = freshEntry(elara, 'blue'); // far corner, not adjacent -- isolates pairPresence from the separate adjacency-only rivalry bonus
    out.pairPresenceShowsOnBoard = statNumHtml(darien, 'top', { owner:'blue', cellIndex:0 }).includes('buffed') && statNumHtml(darien, 'top', { owner:'blue', cellIndex:0 }).includes('>12<');

    // But a role-gated (attack-only) bonus must still NOT appear on the
    // resting display -- it only ever applies mid-battle while actually
    // attacking, so a single flat "resting" number can't honestly show it;
    // that stays the live capture preview's job instead (computeCapturePreview).
    const odin = findCardById('odin'); // top:10, active.flatAttackBonus:2 (attack-role only)
    state.board = Array(9).fill(null);
    state.playerHand = [1,2,3]; state.enemyHand = [1,2,3];
    state.board[4] = freshEntry(odin, 'blue');
    out.attackOnlyBonusStaysExcluded = effectiveStatFor(odin, 'top', { owner:'blue', cellIndex:4 }).value === 10;

    return out;
  })()`);
  assert.equal(result.baseUnaffected, true);
  assert.equal(result.captureBonusApplies, true);
  assert.equal(result.sideBonusAppliesOnlyToThatSide, true);
  assert.equal(result.captureAndSideBonusStack, true);
  assert.equal(result.buffedClassAndValue, true);
  assert.equal(result.debuffedClassAndValue, true);
  assert.equal(result.neutralHasNoColorClass, true);
  assert.equal(result.boardCellReflectsLiveBonus, true, 'the board cell render must show the live modified number, not just the base stat');
  assert.equal(result.pairPresenceShowsOnBoard, true, 'a static board-position bonus like pairPresence must now show in the printed number');
  assert.equal(result.attackOnlyBonusStaysExcluded, true, 'an attack-only bonus must stay off the resting display -- it is only ever true mid-attack');
  assert.deepEqual(pageErrors, []);
  await page.close();
});

test('Fas 1 live capture preview: computeCapturePreview/getPreviewCaptureTargets report the real outcome without mutating board state', async () => {
  const { page, pageErrors } = await newPage();
  const result = await page.evaluate(`(() => {
    ${freshEntrySnippet()}
    const out = {};
    const bahamut = findCardById('bahamut'); // 10/10/10/10-tier, wins against almost anything
    const ogre = findCardById('ogre'); // top:8, right:5, bottom:8, left:4

    // A strong card previewed into a cell next to a weak enemy: reports a
    // capture, names the right cell, and leaves the real board untouched
    // (still empty at the candidate cell, enemy still owned by red).
    state.board = Array(9).fill(null);
    state.rules = { same:false, plus:false, combo:false, elemental:false, graveyard:false };
    state.board[1] = freshEntry(ogre, 'red');
    const strongPreview = computeCapturePreview('bahamut', 4, 'blue');
    out.strongPreviewCaptures = strongPreview.captures === 1 && strongPreview.indices.includes(1);
    out.noMutationAfterPreview = state.board[4] === null && state.board[1].owner === 'red' && state.board[1].card.id === 'ogre';

    // The reverse matchup (weak card previewed against a strong defender)
    // correctly reports zero captures.
    state.board = Array(9).fill(null);
    state.board[1] = freshEntry(bahamut, 'red');
    const weakPreview = computeCapturePreview('ogre', 4, 'blue');
    out.weakPreviewNoCaptures = weakPreview.captures === 0 && weakPreview.indices.length === 0;

    // An already-occupied cell can never be previewed into.
    state.board = Array(9).fill(null);
    state.board[4] = freshEntry(ogre, 'blue');
    out.occupiedCellPreviewIsEmpty = computeCapturePreview('bahamut', 4, 'blue').captures === 0;

    // getPreviewCaptureTargets aggregates across every empty legal cell so
    // the UI can mark a vulnerable enemy card regardless of which specific
    // empty cell it would be captured from.
    state.board = Array(9).fill(null);
    state.board[1] = freshEntry(ogre, 'red');
    state.playerHand = [1,2,3]; state.enemyHand = [1,2,3];
    state.pendingCard = 'bahamut';
    state.turn = 'blue'; state.phase = 'battle'; state.placedThisTurn = false; state.ultimateBanner = null;
    const vulnerable = getPreviewCaptureTargets();
    out.vulnerableSetFindsTarget = vulnerable.has(1) && vulnerable.size === 1;

    // No pending card (nothing selected yet) means nothing is flagged.
    state.pendingCard = null;
    out.noPendingCardMeansNoVulnerable = getPreviewCaptureTargets().size === 0;

    return out;
  })()`);
  assert.equal(result.strongPreviewCaptures, true);
  assert.equal(result.noMutationAfterPreview, true, 'computeCapturePreview must never leave a stub entry behind or flip the real board');
  assert.equal(result.weakPreviewNoCaptures, true);
  assert.equal(result.occupiedCellPreviewIsEmpty, true);
  assert.equal(result.vulnerableSetFindsTarget, true);
  assert.equal(result.noPendingCardMeansNoVulnerable, true);
  assert.deepEqual(pageErrors, []);
  await page.close();
});

test('Pallis: reworked per audit — Protective Aura (temporary capture-immunity via isShielded), Wolf Paw\'s Grip (on-place directional debuff), Chain of Loyalty (on-win bonus capture), Loyal Heart/Wave of Loyalty unchanged, Loyal Instinct dropped', async () => {
  const { page, pageErrors } = await newPage();
  const result = await page.evaluate(`(() => {
    ${freshEntrySnippet()}
    const out = {};
    const pallis = findCardById('pallis');
    out.statsUnchanged = pallis.top === 4 && pallis.right === 10 && pallis.bottom === 10 && pallis.left === 8;
    out.skillCount = pallis.skills.length === 5;
    out.loyalInstinctDropped = !pallis.skills.some(s => s.name === 'Loyal Instinct');
    out.hasLoyalHeart = pallis.active.shield === true;
    out.specialName = pallis.special.name === 'Wave of Loyalty';
    out.specialCost = pallis.special.cost === 2;

    const realRandom = Math.random;

    // Protective Aura: random ADJACENT ally (not whole-board) gets a
    // temporary capture-immunity window, checked via isShielded() -- even
    // though it has no native shield of its own.
    state.board = Array(9).fill(null);
    state.playerHand = [1,2]; state.enemyHand = [1,2];
    const paSrc = freshEntry(pallis, 'blue');
    state.board[4] = paSrc;
    const paAlly = freshEntry({ id:'pa-ally', name:'PAAlly', top:1,right:1,bottom:1,left:1 }, 'blue');
    state.board[1] = paAlly;
    Math.random = () => 0;
    ON_PLACE_HANDLERS.pallis(paSrc, 'blue', 4);
    Math.random = realRandom;
    out.protectiveAuraSetWindow = paAlly.protectiveAuraUntilTurnCount === state.turnCount + 4;
    out.protectiveAuraShieldsUnshieldedAlly = isShielded(paAlly, 1) === true;
    const savedTurnCount1 = state.turnCount;
    state.turnCount = paAlly.protectiveAuraUntilTurnCount;
    out.protectiveAuraExpires = isShielded(paAlly, 1) === false;
    state.turnCount = savedTurnCount1;

    // Wolf Paw's Grip: random side, the enemy there (if any) gets a live
    // -2 on the side facing Pallis, this round.
    state.board = Array(9).fill(null);
    state.playerHand = [1,2]; state.enemyHand = [1,2];
    const wpSrc = freshEntry(pallis, 'blue');
    state.board[4] = wpSrc;
    const wpFoe = freshEntry({ id:'wp-foe', name:'WPFoe', top:5,right:5,bottom:5,left:5 }, 'red');
    state.board[1] = wpFoe;
    Math.random = () => 0;
    ON_PLACE_HANDLERS.pallis(wpSrc, 'blue', 4);
    Math.random = realRandom;
    out.wolfPawSideSet = wpFoe.wolfPawSide === 'bottom';
    const dummyOpp = { id:'dummy', name:'D', top:1,right:1,bottom:1,left:1 };
    out.wolfPawLiveDebuff = fullEffectiveValue(wpFoe.card, 'bottom', dummyOpp, 1, 'red', 'defense') - wpFoe.card.bottom === -2;
    out.wolfPawNoDebuffOtherSide = fullEffectiveValue(wpFoe.card, 'top', dummyOpp, 1, 'red', 'defense') - wpFoe.card.top === 0;
    const savedTurnCount2 = state.turnCount;
    state.turnCount = wpFoe.wolfPawUntilTurnCount;
    out.wolfPawExpires = fullEffectiveValue(wpFoe.card, 'bottom', dummyOpp, 1, 'red', 'defense') - wpFoe.card.bottom === 0;
    state.turnCount = savedTurnCount2;

    // Chain of Loyalty: called directly (same style as testing any other
    // on-win hook) since it's only really meaningful when Pallis wins a
    // DEFENSIVE battle and can then snipe an unrelated, already-standing
    // neighbor -- her own placement always battles every adjacent enemy
    // simultaneously anyway, so there's no "extra" neighbor left over in
    // that scenario for the comparison to matter against.
    // Case: succeeds -- Pallis's top(4) beats the candidate's bottom(1).
    state.board = Array(9).fill(null);
    const clSrc = freshEntry(pallis, 'blue');
    state.board[4] = clSrc;
    const clWeak = freshEntry({ id:'cl-weak', name:'CLWeak', top:1,right:1,bottom:1,left:1 }, 'red');
    state.board[1] = clWeak;
    const dummyLoser = freshEntry({ id:'cl-dummy-loser', name:'DL', top:1,right:1,bottom:1,left:1 }, 'red');
    Math.random = () => 0;
    checkOnWinBonuses(clSrc, 'right', dummyLoser, null, 4, 99);
    Math.random = realRandom;
    out.chainOfLoyaltyCaptures = state.board[1].owner === 'blue';

    // Case: fails -- the candidate's bottom(20) beats Pallis's top(4).
    state.board = Array(9).fill(null);
    const clSrc2 = freshEntry(pallis, 'blue');
    state.board[4] = clSrc2;
    const clStrong = freshEntry({ id:'cl-strong', name:'CLStrong', top:20,right:20,bottom:20,left:20 }, 'red');
    state.board[1] = clStrong;
    Math.random = () => 0;
    checkOnWinBonuses(clSrc2, 'right', dummyLoser, null, 4, 99);
    Math.random = realRandom;
    out.chainOfLoyaltyFailsVsStronger = state.board[1].owner === 'red';

    // Case: a shielded candidate still blocks the chain capture, same as
    // any other capture.
    state.board = Array(9).fill(null);
    const clSrc3 = freshEntry(pallis, 'blue');
    state.board[4] = clSrc3;
    const clShielded = freshEntry({ id:'cl-shielded', name:'CLShielded', top:1,right:1,bottom:1,left:1, active:{shield:true} }, 'red');
    state.board[1] = clShielded;
    Math.random = () => 0;
    checkOnWinBonuses(clSrc3, 'right', dummyLoser, null, 4, 99);
    Math.random = realRandom;
    out.chainOfLoyaltyRespectsShield = clShielded.owner === 'red' && clShielded.shieldUsed === true;

    return out;
  })()`);
  assert.equal(result.statsUnchanged, true);
  assert.equal(result.skillCount, true);
  assert.equal(result.loyalInstinctDropped, true);
  assert.equal(result.hasLoyalHeart, true);
  assert.equal(result.specialName, true);
  assert.equal(result.specialCost, true);
  assert.equal(result.protectiveAuraSetWindow, true);
  assert.equal(result.protectiveAuraShieldsUnshieldedAlly, true, 'Protective Aura grants immunity even to a card with no native shield');
  assert.equal(result.protectiveAuraExpires, true);
  assert.equal(result.wolfPawSideSet, true);
  assert.equal(result.wolfPawLiveDebuff, true);
  assert.equal(result.wolfPawNoDebuffOtherSide, true);
  assert.equal(result.wolfPawExpires, true);
  assert.equal(result.chainOfLoyaltyCaptures, true);
  assert.equal(result.chainOfLoyaltyFailsVsStronger, true, "Chain of Loyalty fails when the candidate's facing side is stronger");
  assert.equal(result.chainOfLoyaltyRespectsShield, true, 'a shielded candidate blocks the chain capture and consumes the shield');
  assert.deepEqual(pageErrors, []);
  await page.close();
});

test('Ifrit: Hellfire Claw (once-per-ROUND attack boost), Burning Dominion (adjacent defeatedByIfrit aura), and Volcanic Armor (defender debuffs attacker once) added, Eternal Inferno/Hellfire/stats unchanged, Rage of the Beast still unbuilt (unresolved wording)', async () => {
  const { page, pageErrors } = await newPage();
  const result = await page.evaluate(`(() => {
    ${freshEntrySnippet()}
    const out = {};
    const ifrit = findCardById('ifrit');
    out.statsUnchanged = ifrit.top === 9 && ifrit.right === 10 && ifrit.bottom === 8 && ifrit.left === 10;
    out.skillCount = ifrit.skills.length === 6;
    out.hasEternalInferno = ifrit.active.onCaptureBonus === 1;
    out.specialName = ifrit.special.name === 'Hellfire';
    out.specialCost = ifrit.special.cost === 2;

    const forestIfrit = FOREST_FOES.find(f => f.id === 'ifrit');
    out.mirroredInForestFoes = forestIfrit
      && forestIfrit.active.oncePerMatchAttackBoost.amount === 2
      && forestIfrit.active.attackBoostResetsEachRound === true
      && forestIfrit.active.adjacentDefeatedByMeBoost.minCount === 2
      && forestIfrit.active.adjacentDefeatedByMeBoost.amount === 1
      && forestIfrit.active.volcanicArmorPenalty === 1;

    // Hellfire Claw: +2 on attack, consumed on use, but -- unlike every
    // other oncePerMatchAttackBoost user -- reset back to usable by
    // sweepExpiredRoundEffects (same mechanism as Omega Weapon's
    // shieldResetsEachRound, just resetting oncePerMatchAttackBoostUsed).
    state.board = Array(9).fill(null);
    state.playerHand = [1,2]; state.enemyHand = [1,2];
    out.hellfireClawField = ifrit.active.oncePerMatchAttackBoost.amount === 2;
    const hcSrc = freshEntry(ifrit, 'blue');
    state.board[4] = hcSrc;
    const hcTarget = freshEntry({ id:'hct', name:'HCT', top:1,right:1,bottom:1,left:1 }, 'red');
    state.board[1] = hcTarget;
    out.hellfireClawAppliesOnAttack = fullEffectiveValue(ifrit, 'top', hcTarget, 4, 'blue', 'attack') - ifrit.top === 2;
    resolveFlips(4, 'blue');
    out.hellfireClawConsumed = hcSrc.oncePerMatchAttackBoostUsed === true;
    sweepExpiredRoundEffects();
    out.hellfireClawResetsEachRound = hcSrc.oncePerMatchAttackBoostUsed === false;

    // Burning Dominion: +1 all sides (both roles, no attack-only gate)
    // while 2+ adjacent ALLIES specifically carry defeatedByIfrit --
    // plain adjacency or the flag alone isn't enough on its own.
    state.board = Array(9).fill(null);
    state.playerHand = [1,2]; state.enemyHand = [1,2];
    const bdEntry = freshEntry(ifrit, 'blue');
    bdEntry.oncePerMatchAttackBoostUsed = true; // isolate from Hellfire Claw's own +2 attack bonus
    state.board[4] = bdEntry;
    const dummyOpp = { id:'dummy', name:'D', top:1,right:1,bottom:1,left:1 };
    const tagged1 = freshEntry({ id:'bd1', name:'BD1', top:1,right:1,bottom:1,left:1 }, 'blue');
    tagged1.defeatedByIfrit = true;
    state.board[1] = tagged1;
    const untaggedAlly = freshEntry({ id:'bd2', name:'BD2', top:1,right:1,bottom:1,left:1 }, 'blue');
    state.board[3] = untaggedAlly;
    out.burningDominionNoBonusWithOnlyOneTagged = fullEffectiveValue(ifrit, 'top', dummyOpp, 4, 'blue', 'defense') - ifrit.top === 0;
    const tagged2 = freshEntry({ id:'bd3', name:'BD3', top:1,right:1,bottom:1,left:1 }, 'blue');
    tagged2.defeatedByIfrit = true;
    state.board[3] = tagged2;
    out.burningDominionAppliesOnDefense = fullEffectiveValue(ifrit, 'top', dummyOpp, 4, 'blue', 'defense') - ifrit.top === 1;
    out.burningDominionAppliesOnAttack = fullEffectiveValue(ifrit, 'top', dummyOpp, 4, 'blue', 'attack') - ifrit.top === 1;
    // An enemy-owned card carrying the flag (e.g. recaptured back) doesn't count.
    state.board[3].owner = 'red';
    out.burningDominionRequiresCurrentOwnership = fullEffectiveValue(ifrit, 'top', dummyOpp, 4, 'blue', 'defense') - ifrit.top === 0;

    // Burning Dominion's tagging mechanism itself: a card Ifrit personally
    // flips in a real battle gets defeatedByIfrit set automatically.
    state.board = Array(9).fill(null);
    state.playerHand = [1,2]; state.enemyHand = [1,2];
    const tagSrc = freshEntry(ifrit, 'blue');
    state.board[4] = tagSrc;
    const tagTarget = freshEntry({ id:'tgt', name:'TGT', top:1,right:1,bottom:1,left:1 }, 'red');
    state.board[1] = tagTarget;
    resolveFlips(4, 'blue');
    out.defeatedByIfritTaggedOnCapture = tagTarget.owner === 'blue' && tagTarget.defeatedByIfrit === true;

    // Volcanic Armor: the first time Ifrit (as DEFENDER) would lose,
    // reduce the attacker's Power by 1 for that battle -- approximated
    // via totalPower(attacker) > totalPower(defender), mirroring
    // oncePerMatchVsStrongerBoost's own simplification. Attacker's
    // bottom(10) vs Ifrit's top(9) would normally win; the -1 penalty
    // ties it, and ties favor the defender.
    state.board = Array(9).fill(null);
    state.playerHand = [1,2]; state.enemyHand = [1,2];
    const vaIfrit = freshEntry(ifrit, 'blue'); // total 37
    state.board[4] = vaIfrit;
    const vaAttacker = freshEntry({ id:'va-atk', name:'VAAtk', top:10,right:10,bottom:10,left:10 }, 'red'); // total 40
    state.board[1] = vaAttacker;
    resolveFlips(1, 'red');
    out.volcanicArmorBlockedFirstLoss = state.board[4].owner === 'blue';
    out.volcanicArmorConsumed = vaIfrit.volcanicArmorUsed === true;

    // Second attack against the same Ifrit: armor already used, so an
    // attacker with the same kind of marginal edge (left:11 vs Ifrit's
    // right:10) wins outright this time.
    const vaAttacker2 = freshEntry({ id:'va-atk2', name:'VAAtk2', top:1,right:1,bottom:1,left:11 }, 'red');
    state.board[5] = vaAttacker2;
    resolveFlips(5, 'red');
    out.volcanicArmorOnlyOnce = state.board[4].owner === 'red';

    return out;
  })()`);
  assert.equal(result.statsUnchanged, true);
  assert.equal(result.skillCount, true);
  assert.equal(result.hasEternalInferno, true);
  assert.equal(result.specialName, true);
  assert.equal(result.specialCost, true);
  assert.equal(result.mirroredInForestFoes, true, 'the FOREST_FOES copy must carry the same new active fields');
  assert.equal(result.hellfireClawField, true);
  assert.equal(result.hellfireClawAppliesOnAttack, true);
  assert.equal(result.hellfireClawConsumed, true);
  assert.equal(result.hellfireClawResetsEachRound, true, "Hellfire Claw resets each round, unlike every other oncePerMatchAttackBoost user");
  assert.equal(result.burningDominionNoBonusWithOnlyOneTagged, true);
  assert.equal(result.burningDominionAppliesOnDefense, true);
  assert.equal(result.burningDominionAppliesOnAttack, true, 'Burning Dominion is not attack-only, unlike Tiamat\'s adjacentEnemiesBoost');
  assert.equal(result.burningDominionRequiresCurrentOwnership, true, 'a defeatedByIfrit card that changed owner no longer counts');
  assert.equal(result.defeatedByIfritTaggedOnCapture, true);
  assert.equal(result.volcanicArmorBlockedFirstLoss, true, "Volcanic Armor's -1 penalty turns a marginal loss into a defended tie");
  assert.equal(result.volcanicArmorConsumed, true);
  assert.equal(result.volcanicArmorOnlyOnce, true, 'a second attacker with the same marginal edge wins once the armor is already used');
  assert.deepEqual(pageErrors, []);
  await page.close();
});

test('Evil Twist Yang: Yang Resonance fixed to debuffThisRound (was permanent), Inner Harmony (neutralizes attacker bonus on defense), Mind\'s Balance (swaps strength on attack when losing), Guardian of Balance/stats unchanged', async () => {
  const { page, pageErrors } = await newPage();
  const result = await page.evaluate(`(() => {
    ${freshEntrySnippet()}
    const out = {};
    const yang = findCardById('eviltwistyang');
    out.statsUnchanged = yang.top === 8 && yang.right === 8 && yang.bottom === 9 && yang.left === 10;
    out.skillCount = yang.skills.length === 4;
    out.hasGuardianOfBalance = yang.active.pairPresence && yang.active.pairPresence.partner === 'eviltwistyin'
      && yang.active.pairPresence.attack === 1 && yang.active.pairPresence.defense === 2;
    out.specialName = yang.special.name === 'Yang Resonance';
    out.specialCost = yang.special.cost === 3;

    const forestYang = FOREST_FOES.find(f => f.id === 'eviltwistyang');
    out.mirroredInForestFoes = forestYang
      && forestYang.active.neutralizeAttackerBonus === true
      && forestYang.active.mindsBalanceSwap === true;

    // Yang Resonance: now debuffThisRound (temporary), not permanent --
    // the actual bug this rework fixed. Needs Yin on the board too
    // (requiresPartner).
    state.board = Array(9).fill(null);
    const yrYang = freshEntry(yang, 'blue');
    state.board[4] = yrYang;
    const yrYin = freshEntry(findCardById('eviltwistyin'), 'blue');
    state.board[1] = yrYin;
    const yrFoe = freshEntry({ id:'yr-foe', name:'YRFoe', top:5,right:5,bottom:5,left:5 }, 'red');
    state.board[0] = yrFoe;
    state.specialUsed = {};
    SPECIAL_HANDLERS.eviltwistyang({ srcEntry: yrYang, owner: 'blue' });
    out.yangResonanceDebuffedImmediately = yrFoe.captureBonus === -2;
    const savedTurnCount = state.turnCount;
    state.turnCount += 4;
    sweepExpiredRoundEffects();
    out.yangResonanceExpiresThisRound = yrFoe.captureBonus === 0;
    state.turnCount = savedTurnCount;

    // Inner Harmony: an attacker with a +3 captureBonus (base bottom:6,
    // boosted to 9) would normally beat Yang's top(8); neutralized back
    // to its base 6, Yang defends successfully instead.
    state.board = Array(9).fill(null);
    state.playerHand = [1,2]; state.enemyHand = [1,2];
    const ihYang = freshEntry(yang, 'blue');
    state.board[4] = ihYang;
    const ihAttackerCard = { id:'ih-atk', name:'IHAtk', top:1,right:1,bottom:6,left:1 };
    state.playerHand = [];
    state.enemyHand = [{ id:'ih-atk', name:'IHAtk', top:1,right:1,bottom:6,left:1 }];
    placeCard(1, 'ih-atk', 'red');
    state.board[1].captureBonus = 3; // boosted bottom would be 9, beating Yang's top(8)
    resolveFlips(1, 'red');
    out.innerHarmonyDefended = state.board[4].owner === 'blue';

    // Mind's Balance: Yang attacks with top(8) into a defender whose
    // bottom(15) would normally win -- the swap flips it into a win
    // for Yang instead.
    state.board = Array(9).fill(null);
    state.playerHand = [1,2]; state.enemyHand = [1,2];
    const mbDefender = freshEntry({ id:'mb-def', name:'MBDef', top:1,right:1,bottom:15,left:1 }, 'red');
    state.board[1] = mbDefender;
    state.playerHand = [{ id:'eviltwistyang', name:'Evil Twist', top:8,right:8,bottom:9,left:10, active: yang.active, special: yang.special, skills: yang.skills, element:'wind', role:yang.role, hue:yang.hue, accent:yang.accent }];
    placeCard(4, 'eviltwistyang', 'blue');
    out.mindsBalanceWonViaSwap = state.board[1].owner === 'blue';

    return out;
  })()`);
  assert.equal(result.statsUnchanged, true);
  assert.equal(result.skillCount, true);
  assert.equal(result.hasGuardianOfBalance, true);
  assert.equal(result.specialName, true);
  assert.equal(result.specialCost, true);
  assert.equal(result.mirroredInForestFoes, true, 'the FOREST_FOES copy must carry the same new active fields');
  assert.equal(result.yangResonanceDebuffedImmediately, true);
  assert.equal(result.yangResonanceExpiresThisRound, true, 'Yang Resonance must be temporary, matching the card text -- this is the bug fix');
  assert.equal(result.innerHarmonyDefended, true, "Inner Harmony neutralizes the attacker's bonus, turning a would-be loss into a successful defense");
  assert.equal(result.mindsBalanceWonViaSwap, true, "Mind's Balance swaps strength when the defender's is higher, turning a would-be loss into a win");
  assert.deepEqual(pageErrors, []);
  await page.close();
});

test('Evil Twist Yin: mirrors Yang exactly -- Yin Resonance (debuffThisRound), Inner Harmony, Mind\'s Balance, Guardian of Balance/stats unchanged', async () => {
  const { page, pageErrors } = await newPage();
  const result = await page.evaluate(`(() => {
    ${freshEntrySnippet()}
    const out = {};
    const yin = findCardById('eviltwistyin');
    out.statsUnchanged = yin.top === 9 && yin.right === 10 && yin.bottom === 8 && yin.left === 8;
    out.hasGuardianOfBalance = yin.active.pairPresence && yin.active.pairPresence.partner === 'eviltwistyang';
    out.specialName = yin.special.name === 'Yin Resonance';
    out.hasNeutralizeAttackerBonus = yin.active.neutralizeAttackerBonus === true;
    out.hasMindsBalanceSwap = yin.active.mindsBalanceSwap === true;

    const forestYin = FOREST_FOES.find(f => f.id === 'eviltwistyin');
    out.mirroredInForestFoes = forestYin
      && forestYin.active.neutralizeAttackerBonus === true
      && forestYin.active.mindsBalanceSwap === true;

    // Yin Resonance: same debuffThisRound fix as Yang Resonance, exercised
    // via Yin's own separate handler.
    state.board = Array(9).fill(null);
    const yrYin = freshEntry(yin, 'blue');
    state.board[4] = yrYin;
    const yrYang = freshEntry(findCardById('eviltwistyang'), 'blue');
    state.board[1] = yrYang;
    const yrFoe = freshEntry({ id:'yr-foe2', name:'YRFoe2', top:5,right:5,bottom:5,left:5 }, 'red');
    state.board[0] = yrFoe;
    state.specialUsed = {};
    SPECIAL_HANDLERS.eviltwistyin({ srcEntry: yrYin, owner: 'blue' });
    out.yinResonanceDebuffedImmediately = yrFoe.captureBonus === -2;
    const savedTurnCount = state.turnCount;
    state.turnCount += 4;
    sweepExpiredRoundEffects();
    out.yinResonanceExpiresThisRound = yrFoe.captureBonus === 0;
    state.turnCount = savedTurnCount;

    // Inner Harmony via Yin as defender: same shape as Yang's own test,
    // exercised through Yin's id to confirm the shared battleNeighbors
    // check isn't accidentally scoped to Yang only.
    state.board = Array(9).fill(null);
    state.playerHand = []; state.enemyHand = [{ id:'ih-atk2', name:'IHAtk2', top:1,right:1,bottom:6,left:1 }];
    const ihYin = freshEntry(yin, 'blue');
    state.board[4] = ihYin;
    placeCard(1, 'ih-atk2', 'red');
    state.board[1].captureBonus = 3;
    resolveFlips(1, 'red');
    out.innerHarmonyDefended = state.board[4].owner === 'blue';

    return out;
  })()`);
  assert.equal(result.statsUnchanged, true);
  assert.equal(result.hasGuardianOfBalance, true);
  assert.equal(result.specialName, true);
  assert.equal(result.hasNeutralizeAttackerBonus, true);
  assert.equal(result.hasMindsBalanceSwap, true);
  assert.equal(result.mirroredInForestFoes, true);
  assert.equal(result.yinResonanceDebuffedImmediately, true);
  assert.equal(result.yinResonanceExpiresThisRound, true);
  assert.equal(result.innerHarmonyDefended, true, "Inner Harmony works identically through Yin's own id");
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
    // round to Odin himself -- this is the "coin flip missed" branch.
    const realRandom = Math.random;
    state.board = Array(9).fill(null);
    const odinUlt = freshEntry(odin, 'blue');
    state.board[4] = odinUlt;
    const odinTarget = freshEntry({ id:'ot', name:'OT', top:1,right:1,bottom:1,left:1 }, 'red');
    const odinOther = freshEntry({ id:'oo', name:'OO', top:1,right:1,bottom:1,left:1 }, 'red');
    state.board[1] = odinTarget; state.board[8] = odinOther;
    Math.random = () => 0.9;
    SPECIAL_HANDLERS.odin({ srcEntry: odinUlt, sourceIndex: 4, targetEntry: odinTarget, targetIndex: 1, owner: 'blue' });
    Math.random = realRandom;
    out.ultCapturesAndDebuffsTarget = state.board[1].owner === 'blue' && odinTarget.captureBonus === -3;
    out.ultDebuffsOthersThisRound = odinOther.captureBonus === -1;
    out.ultSelfBuff = odinUlt.captureBonus === 3;

    // Zantetsuken's Ragnarok clause: on the other half of the 50% coin
    // flip, every OTHER card on the board is destroyed -- allies included,
    // not just enemies -- while Odin himself and the just-flipped target
    // are always spared.
    state.board = Array(9).fill(null);
    const odinUlt2 = freshEntry(odin, 'blue');
    state.board[4] = odinUlt2;
    const odinTarget2 = freshEntry({ id:'ot2', name:'OT2', top:1,right:1,bottom:1,left:1 }, 'red');
    const odinAlly2 = freshEntry({ id:'oa2', name:'OA2', top:1,right:1,bottom:1,left:1 }, 'blue');
    const odinFoe2 = freshEntry({ id:'of2', name:'OF2', top:1,right:1,bottom:1,left:1 }, 'red');
    state.board[1] = odinTarget2; state.board[2] = odinAlly2; state.board[8] = odinFoe2;
    Math.random = () => 0.1;
    SPECIAL_HANDLERS.odin({ srcEntry: odinUlt2, sourceIndex: 4, targetEntry: odinTarget2, targetIndex: 1, owner: 'blue' });
    Math.random = realRandom;
    out.ragnarokSparesOdin = state.board[4] === odinUlt2;
    out.ragnarokSparesTarget = state.board[1] === odinTarget2 && odinTarget2.owner === 'blue';
    out.ragnarokDestroysAlly = state.board[2] === null;
    out.ragnarokDestroysOtherFoe = state.board[8] === null;

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
  assert.equal(result.ragnarokSparesOdin, true);
  assert.equal(result.ragnarokSparesTarget, true);
  assert.equal(result.ragnarokDestroysAlly, true);
  assert.equal(result.ragnarokDestroysOtherFoe, true);
  assert.deepEqual(pageErrors, []);
  await page.close();
});

test('Ancient Wyrmking: Conquests Witnessed scales with total Wins claimed, caps at +3, locks in permanently, and mildly debuffs enemies', async () => {
  const { page, pageErrors } = await newPage();
  const result = await page.evaluate(`(() => {
    ${freshEntrySnippet()}
    const out = {};
    const dragon = findCardById('dragon');
    out.playableAndEnemy = HEROES.some(h => h.id === 'dragon') && FOREST_FOES.some(f => f.id === 'dragon');
    out.statsUnchanged = dragon.top === 10 && dragon.right === 8 && dragon.bottom === 9 && dragon.left === 10
      && dragon.element === 'earth' && dragon.isDragon === true;
    out.hasWeightOfAges = dragon.active.weightOfAges === true;
    out.oldShieldGone = !dragon.active.shield;
    out.specialCost = dragon.special.cost === 3;

    // 0 total Wins claimed -> no self-buff, but the mild AOE debuff still applies
    state.board = Array(9).fill(null);
    state.wins = { blue: 0, red: 0 };
    const src0 = freshEntry(dragon, 'blue');
    state.board[4] = src0;
    const foe0 = freshEntry({ id:'f0', name:'F0', top:5,right:5,bottom:5,left:5 }, 'red');
    state.board[1] = foe0;
    SPECIAL_HANDLERS.dragon({ srcEntry: src0, owner: 'blue' });
    out.zeroWinsNoBonus = src0.captureBonus === 0;
    out.zeroWinsStillDebuffs = foe0.captureBonus === -1;

    // 4 total Wins (2 + 2) -> +2 Power
    state.board = Array(9).fill(null);
    state.wins = { blue: 2, red: 2 };
    const src1 = freshEntry(dragon, 'blue');
    state.board[4] = src1;
    SPECIAL_HANDLERS.dragon({ srcEntry: src1, owner: 'blue' });
    out.fourWinsBonus2 = src1.captureBonus === 2;

    // 20 total Wins -> capped at +3, not +10
    state.board = Array(9).fill(null);
    state.wins = { blue: 10, red: 10 };
    const src2 = freshEntry(dragon, 'blue');
    state.board[4] = src2;
    SPECIAL_HANDLERS.dragon({ srcEntry: src2, owner: 'blue' });
    out.cappedAtThree = src2.captureBonus === 3;

    // Locked in at activation: cast at 4 total Wins (+2), then Wins keep
    // rising afterward — the bonus must NOT recompute live.
    state.board = Array(9).fill(null);
    state.wins = { blue: 2, red: 2 };
    const src3 = freshEntry(dragon, 'blue');
    state.board[4] = src3;
    SPECIAL_HANDLERS.dragon({ srcEntry: src3, owner: 'blue' });
    const bonusAfterCast = src3.captureBonus;
    state.wins = { blue: 10, red: 10 };
    out.bonusLockedNotLive = src3.captureBonus === bonusAfterCast && bonusAfterCast === 2;

    // Only enemies are debuffed, allies are untouched
    state.board = Array(9).fill(null);
    state.wins = { blue: 4, red: 0 };
    const src4 = freshEntry(dragon, 'blue');
    state.board[4] = src4;
    const ally4 = freshEntry({ id:'a4', name:'A4', top:5,right:5,bottom:5,left:5 }, 'blue');
    state.board[1] = ally4;
    const foe4 = freshEntry({ id:'foe4', name:'Foe4', top:5,right:5,bottom:5,left:5 }, 'red');
    state.board[2] = foe4;
    SPECIAL_HANDLERS.dragon({ srcEntry: src4, owner: 'blue' });
    out.allyUnaffected = ally4.captureBonus === 0;
    out.enemyDebuffed = foe4.captureBonus === -1;

    return out;
  })()`);
  assert.equal(result.playableAndEnemy, true);
  assert.equal(result.statsUnchanged, true, 'base stats/element/isDragon must be untouched');
  assert.equal(result.hasWeightOfAges, true, 'Ancient Shield was replaced by Weight of Ages');
  assert.equal(result.oldShieldGone, true, 'the old active.shield flag must be gone, not just supplemented');
  assert.equal(result.specialCost, true);
  assert.equal(result.zeroWinsNoBonus, true);
  assert.equal(result.zeroWinsStillDebuffs, true);
  assert.equal(result.fourWinsBonus2, true);
  assert.equal(result.cappedAtThree, true, 'the self-buff must never exceed +3 regardless of total Wins');
  assert.equal(result.bonusLockedNotLive, true, 'the bonus is a one-time snapshot, not a live formula');
  assert.equal(result.allyUnaffected, true);
  assert.equal(result.enemyDebuffed, true);
  assert.deepEqual(pageErrors, []);
  await page.close();
});

test('Ancient Wyrmking: Weight of Ages raises the flip margin the longer he stands unbroken, caps at +2, and resets on capture or move', async () => {
  const { page, pageErrors } = await newPage();
  const result = await page.evaluate(`(() => {
    ${freshEntrySnippet()}
    const out = {};
    const dragon = findCardById('dragon');
    // A fresh page's default hands are empty, which makes lastStandBonus()
    // add +2 to whichever side has 0 cards left — that would silently
    // pollute every carefully calibrated margin check below. Set once,
    // up front, for the whole test.
    state.playerHand = [1,2]; state.enemyHand = [1,2];

    // Fresh placement: turnsStanding is undefined/0, so the margin wall is
    // 0 — any winning margin flips him normally, exactly like before.
    state.board = Array(9).fill(null);
    const fresh = freshEntry(dragon, 'blue');
    state.board[4] = fresh;
    const margin1Attacker = freshEntry({ id:'m1', name:'M1', top:1,right:1,bottom:11,left:1 }, 'red'); // beats top:10 by 1
    state.board[1] = margin1Attacker;
    resolveFlips(1, 'red');
    out.freshPlacementFlipsNormally = state.board[4].owner === 'red';

    // After 2 ticks (sweepExpiredRoundEffects called twice, same owner and
    // cell throughout): +1 to the margin wall. A margin-1 win is now
    // blocked (draw); a margin-2 win still flips him.
    state.board = Array(9).fill(null);
    const twoTicks = freshEntry(dragon, 'blue');
    twoTicks.turnsStanding = 0; twoTicks.turnsStandingOwner = 'blue'; twoTicks.turnsStandingCell = 4; // placeCard() sets these; freshEntry() doesn't
    state.board[4] = twoTicks;
    sweepExpiredRoundEffects();
    sweepExpiredRoundEffects();
    out.turnsStandingAfterTwoTicks = twoTicks.turnsStanding === 2;
    const margin1AttackerB = freshEntry({ id:'m1b', name:'M1B', top:1,right:1,bottom:11,left:1 }, 'red');
    state.board[1] = margin1AttackerB;
    resolveFlips(1, 'red');
    out.marginOneBlockedAtTwoTicks = state.board[4].owner === 'blue';
    out.noAttackerDebuffFromWeightOfAges = margin1AttackerB.captureBonus === 0;
    state.board[1] = null;
    const margin2AttackerB = freshEntry({ id:'m2b', name:'M2B', top:1,right:1,bottom:12,left:1 }, 'red'); // beats top:10 by 2
    state.board[1] = margin2AttackerB;
    resolveFlips(1, 'red');
    out.marginTwoStillFlipsAtTwoTicks = state.board[1].owner === 'red';

    // After 4 ticks: +2 (the cap). A margin-2 win is now also blocked; a
    // margin-3 win still flips him.
    state.board = Array(9).fill(null);
    const fourTicks = freshEntry(dragon, 'blue');
    fourTicks.turnsStanding = 0; fourTicks.turnsStandingOwner = 'blue'; fourTicks.turnsStandingCell = 4;
    state.board[4] = fourTicks;
    sweepExpiredRoundEffects(); sweepExpiredRoundEffects(); sweepExpiredRoundEffects(); sweepExpiredRoundEffects();
    out.turnsStandingAfterFourTicks = fourTicks.turnsStanding === 4;
    const margin2AttackerC = freshEntry({ id:'m2c', name:'M2C', top:1,right:1,bottom:12,left:1 }, 'red');
    state.board[1] = margin2AttackerC;
    resolveFlips(1, 'red');
    out.marginTwoBlockedAtFourTicks = state.board[4].owner === 'blue';
    state.board[1] = null;
    const margin3AttackerC = freshEntry({ id:'m3c', name:'M3C', top:1,right:1,bottom:13,left:1 }, 'red'); // beats top:10 by 3
    state.board[1] = margin3AttackerC;
    resolveFlips(1, 'red');
    out.marginThreeStillFlipsAtFourTicks = state.board[1].owner === 'red';

    // Cap holds: 6 ticks is still only +2, not +3 — a margin-2 win must
    // stay blocked, not suddenly flip.
    state.board = Array(9).fill(null);
    const sixTicks = freshEntry(dragon, 'blue');
    sixTicks.turnsStanding = 0; sixTicks.turnsStandingOwner = 'blue'; sixTicks.turnsStandingCell = 4;
    state.board[4] = sixTicks;
    for(let i=0;i<6;i++) sweepExpiredRoundEffects();
    out.turnsStandingAfterSixTicks = sixTicks.turnsStanding === 6;
    const margin2AttackerD = freshEntry({ id:'m2d', name:'M2D', top:1,right:1,bottom:12,left:1 }, 'red');
    state.board[1] = margin2AttackerD;
    resolveFlips(1, 'red');
    out.capHoldsAtSixTicks = state.board[4].owner === 'blue';

    // Resets to 0 the instant he's actually flipped (captured by the
    // enemy) — verified by reading the tracked fields directly right
    // after the capture, before any further sweep has a chance to run.
    state.board = Array(9).fill(null);
    const toFlip = freshEntry(dragon, 'blue');
    toFlip.turnsStanding = 0; toFlip.turnsStandingOwner = 'blue'; toFlip.turnsStandingCell = 4;
    state.board[4] = toFlip;
    sweepExpiredRoundEffects(); sweepExpiredRoundEffects(); sweepExpiredRoundEffects(); sweepExpiredRoundEffects();
    const bigAttacker = freshEntry({ id:'big', name:'Big', top:1,right:1,bottom:20,left:1 }, 'red');
    state.board[1] = bigAttacker;
    resolveFlips(1, 'red');
    out.capturedByEnemy = state.board[4].owner === 'red';
    sweepExpiredRoundEffects();
    out.resetsAfterCapture = state.board[4].turnsStanding === 0 && state.board[4].turnsStandingOwner === 'red';

    // Resets to 0 if moved to a different cell even under the SAME owner
    // (e.g. a position-swap effect) — the mountain "moving" breaks the vigil.
    state.board = Array(9).fill(null);
    const toMove = freshEntry(dragon, 'blue');
    toMove.turnsStanding = 0; toMove.turnsStandingOwner = 'blue'; toMove.turnsStandingCell = 4;
    state.board[4] = toMove;
    sweepExpiredRoundEffects(); sweepExpiredRoundEffects();
    out.turnsStandingBeforeMove = toMove.turnsStanding === 2;
    state.board[4] = null;
    state.board[7] = toMove; // same owner, different cell — simulates a swap
    sweepExpiredRoundEffects();
    out.resetsAfterMove = toMove.turnsStanding === 0 && toMove.turnsStandingCell === 7;

    return out;
  })()`);
  assert.equal(result.freshPlacementFlipsNormally, true, 'a freshly placed Ancient Wyrmking has no margin wall yet');
  assert.equal(result.turnsStandingAfterTwoTicks, true);
  assert.equal(result.marginOneBlockedAtTwoTicks, true, '+1 margin wall blocks a margin-1 loss after 2 ticks');
  assert.equal(result.noAttackerDebuffFromWeightOfAges, true, "Weight of Ages must NOT apply Curse of the Gorgon's attacker debuff");
  assert.equal(result.marginTwoStillFlipsAtTwoTicks, true, 'a margin-2 win still flips him at only +1 wall');
  assert.equal(result.turnsStandingAfterFourTicks, true);
  assert.equal(result.marginTwoBlockedAtFourTicks, true, '+2 margin wall (the cap) blocks a margin-2 loss after 4 ticks');
  assert.equal(result.marginThreeStillFlipsAtFourTicks, true, 'a margin-3 win still flips him even at the +2 cap');
  assert.equal(result.turnsStandingAfterSixTicks, true);
  assert.equal(result.capHoldsAtSixTicks, true, 'the wall never exceeds +2 no matter how long he stands');
  assert.equal(result.capturedByEnemy, true);
  assert.equal(result.resetsAfterCapture, true, 'turnsStanding resets to 0 the moment ownership changes');
  assert.equal(result.turnsStandingBeforeMove, true);
  assert.equal(result.resetsAfterMove, true, 'turnsStanding resets to 0 if moved to a different cell, even under the same owner');
  assert.deepEqual(pageErrors, []);
  await page.close();
});

test('Little Jesp: Even Ground grants +2 Power only while board counts are exactly tied', async () => {
  const { page, pageErrors } = await newPage();
  const result = await page.evaluate(`(() => {
    ${freshEntrySnippet()}
    const out = {};
    const littlejesp = findCardById('littlejesp');
    out.statsAreEven = littlejesp.top === 9 && littlejesp.right === 9 && littlejesp.bottom === 9 && littlejesp.left === 9;
    out.hasEvenGround = littlejesp.active.boardLeadBonus && littlejesp.active.boardLeadBonus.tieOnly === true;
    out.divineBondUnchanged = littlejesp.active.pairPresence && littlejesp.active.pairPresence.partner === 'pallispell' && littlejesp.active.pairPresence.amount === 2;
    state.playerHand = [1,2]; state.enemyHand = [1,2];

    // Tied board count (1 vs 1): Even Ground applies.
    state.board = Array(9).fill(null);
    state.board[0] = freshEntry(littlejesp, 'blue');
    state.board[1] = freshEntry(findCardById('ogre'), 'red');
    const tied = fullEffectiveValue(littlejesp, 'top', null, 0, 'blue', 'attack');
    out.tiedBonus = tied - littlejesp.top;

    // A strict lead (2 vs 1) must NOT apply Even Ground (it's tie-only, unlike Tiamat's strict-lead or Judgment's lead-or-tie).
    state.board[2] = freshEntry(findCardById('ogre'), 'blue');
    const leading = fullEffectiveValue(littlejesp, 'top', null, 0, 'blue', 'attack');
    out.leadingBonus = leading - littlejesp.top;

    // Falling behind (1 vs 2) must also NOT apply.
    state.board = Array(9).fill(null);
    state.board[0] = freshEntry(littlejesp, 'blue');
    state.board[1] = freshEntry(findCardById('ogre'), 'red');
    state.board[2] = freshEntry(findCardById('ogre'), 'red');
    const behind = fullEffectiveValue(littlejesp, 'top', null, 0, 'blue', 'attack');
    out.behindBonus = behind - littlejesp.top;

    return out;
  })()`);
  assert.equal(result.statsAreEven, true, 'Little Jesp must be 9/9/9/9 after the Balance rework');
  assert.equal(result.hasEvenGround, true);
  assert.equal(result.divineBondUnchanged, true, 'the Pallispell relationship must be untouched by the rework');
  assert.equal(result.tiedBonus, 2, 'Even Ground grants +2 when board counts are exactly equal');
  assert.equal(result.leadingBonus, 0, 'Even Ground must not apply while Little Jesp is ahead, only when exactly tied');
  assert.equal(result.behindBonus, 0, 'Even Ground must not apply while Little Jesp is behind, only when exactly tied');
  assert.deepEqual(pageErrors, []);
  await page.close();
});

test('Little Jesp: Scales of Judgment scales inversely with the Wins gap, debuffs whichever side currently leads (even his own), and skips the debuff on an exact tie', async () => {
  const { page, pageErrors } = await newPage();
  const result = await page.evaluate(`(() => {
    ${freshEntrySnippet()}
    const out = {};
    const littlejesp = findCardById('littlejesp');
    out.specialName = littlejesp.special.name === 'Scales of Judgment';
    out.specialCost = littlejesp.special.cost === 2;

    // Perfectly tied (0-0): maximum bonus (+3), and no debuff to anyone since there is nothing to correct.
    state.board = Array(9).fill(null);
    state.wins = { blue: 0, red: 0 };
    const src0 = freshEntry(littlejesp, 'blue');
    state.board[4] = src0;
    const ally0 = freshEntry({ id:'a0', name:'A0', top:5,right:5,bottom:5,left:5 }, 'blue');
    state.board[1] = ally0;
    const foe0 = freshEntry({ id:'f0', name:'F0', top:5,right:5,bottom:5,left:5 }, 'red');
    state.board[2] = foe0;
    SPECIAL_HANDLERS.littlejesp({ srcEntry: src0, owner: 'blue' });
    out.tiedBonus3 = src0.captureBonus === 3;
    out.tiedNoDebuffAlly = ally0.captureBonus === 0;
    out.tiedNoDebuffFoe = foe0.captureBonus === 0;

    // Gap of 1 (3 vs 2, blue leading): bonus +2, and the LEADING side (blue,
    // his own side here) gets debuffed -- not the trailing enemy.
    state.board = Array(9).fill(null);
    state.wins = { blue: 3, red: 2 };
    const src1 = freshEntry(littlejesp, 'blue');
    state.board[4] = src1;
    const ally1 = freshEntry({ id:'a1', name:'A1', top:5,right:5,bottom:5,left:5 }, 'blue');
    state.board[1] = ally1;
    const foe1 = freshEntry({ id:'foe1', name:'Foe1', top:5,right:5,bottom:5,left:5 }, 'red');
    state.board[2] = foe1;
    SPECIAL_HANDLERS.littlejesp({ srcEntry: src1, owner: 'blue' });
    // src1 is ON the leading (blue) side himself, so he receives BOTH the
    // +2 self-buff AND the -1 leading-side debuff (net +1) -- "not even his
    // own side is exempt from his judgment" per the card's own flavor text.
    out.gapOneNetBonus1 = src1.captureBonus === 1;
    out.ownLeadingSideDebuffed = ally1.captureBonus === -1;
    out.trailingEnemyUntouched = foe1.captureBonus === 0;

    // Gap of 3 or more (5 vs 0): no self-buff (bonus would be 0, so
    // attackBoost is skipped entirely) -- but the leading side, himself
    // included, still eats the -1 debuff since his side still leads.
    state.board = Array(9).fill(null);
    state.wins = { blue: 5, red: 0 };
    const src2 = freshEntry(littlejesp, 'blue');
    state.board[4] = src2;
    SPECIAL_HANDLERS.littlejesp({ srcEntry: src2, owner: 'blue' });
    out.gapThreeNoBonusStillSelfDebuffed = src2.captureBonus === -1;

    // Locked in at activation: cast at a gap of 1 (net +1, same self-
    // inclusion as src1 above), then the gap widens afterward -- the
    // result must not recompute live.
    state.board = Array(9).fill(null);
    state.wins = { blue: 3, red: 2 };
    const src3 = freshEntry(littlejesp, 'blue');
    state.board[4] = src3;
    SPECIAL_HANDLERS.littlejesp({ srcEntry: src3, owner: 'blue' });
    const bonusAfterCast = src3.captureBonus;
    state.wins = { blue: 10, red: 0 };
    out.bonusLockedNotLive = src3.captureBonus === bonusAfterCast && bonusAfterCast === 1;

    // The enemy side leading (0 vs 3): the ENEMY gets debuffed instead, own side untouched.
    state.board = Array(9).fill(null);
    state.wins = { blue: 0, red: 3 };
    const src4 = freshEntry(littlejesp, 'blue');
    state.board[4] = src4;
    const ally4 = freshEntry({ id:'a4', name:'A4', top:5,right:5,bottom:5,left:5 }, 'blue');
    state.board[1] = ally4;
    const foe4 = freshEntry({ id:'foe4', name:'Foe4', top:5,right:5,bottom:5,left:5 }, 'red');
    state.board[2] = foe4;
    SPECIAL_HANDLERS.littlejesp({ srcEntry: src4, owner: 'blue' });
    out.enemyLeadingSideDebuffed = foe4.captureBonus === -1;
    out.ownTrailingSideUntouched = ally4.captureBonus === 0;

    return out;
  })()`);
  assert.equal(result.specialName, true);
  assert.equal(result.specialCost, true);
  assert.equal(result.tiedBonus3, true, 'a perfectly tied score grants the maximum +3');
  assert.equal(result.tiedNoDebuffAlly, true, 'an exact tie must skip the debuff step entirely');
  assert.equal(result.tiedNoDebuffFoe, true);
  assert.equal(result.gapOneNetBonus1, true, 'the +2 self-buff and the -1 leading-side self-debuff both land, netting +1');
  assert.equal(result.ownLeadingSideDebuffed, true, "whichever side currently leads is debuffed, even the caster's own side");
  assert.equal(result.trailingEnemyUntouched, true);
  assert.equal(result.gapThreeNoBonusStillSelfDebuffed, true, 'no self-buff at a gap of 3+, but the leading side (himself included) still eats the -1');
  assert.equal(result.bonusLockedNotLive, true, 'the bonus is a one-time snapshot, not a live formula');
  assert.equal(result.enemyLeadingSideDebuffed, true, 'when the ENEMY leads, the debuff correctly targets them instead');
  assert.equal(result.ownTrailingSideUntouched, true);
  assert.deepEqual(pageErrors, []);
  await page.close();
});

test('Sylvarion: Windrush and Vanguard of the Hunt only apply on attack, and Vanguard requires being behind on board count', async () => {
  const { page, pageErrors } = await newPage();
  const result = await page.evaluate(`(() => {
    ${freshEntrySnippet()}
    const out = {};
    const sylvarion = findCardById('sylvarion');
    out.statsUnchanged = sylvarion.top === 10 && sylvarion.right === 8 && sylvarion.bottom === 10 && sylvarion.left === 9 && sylvarion.element === 'wind';
    out.specialCost = sylvarion.special.cost === 2;
    out.specialName = sylvarion.special.name === "Herald's Gale";
    state.playerHand = [1,2]; state.enemyHand = [1,2];

    // Behind on board count (1 vs 2): both Windrush and Vanguard apply on attack.
    state.board = Array(9).fill(null);
    state.board[0] = freshEntry(sylvarion, 'blue');
    state.board[1] = freshEntry(findCardById('ogre'), 'red');
    state.board[2] = freshEntry(findCardById('ogre'), 'red');
    const behindAttack = fullEffectiveValue(sylvarion, 'top', null, 0, 'blue', 'attack');
    out.behindAttackBonus = behindAttack - sylvarion.top;

    // Same behind-on-board state, but on DEFENSE: only Windrush's flatAttackBonus
    // is attack-only, and boardUnderdogAttackBonus is also attack-only, so
    // NEITHER should apply while defending.
    const behindDefense = fullEffectiveValue(sylvarion, 'top', null, 0, 'blue', 'defense');
    out.behindDefenseBonus = behindDefense - sylvarion.top;

    // Even on board count (1 vs 1): only Windrush (unconditional flat +2)
    // applies on attack, not Vanguard of the Hunt (requires being behind).
    state.board = Array(9).fill(null);
    state.board[0] = freshEntry(sylvarion, 'blue');
    state.board[1] = freshEntry(findCardById('ogre'), 'red');
    const evenAttack = fullEffectiveValue(sylvarion, 'top', null, 0, 'blue', 'attack');
    out.evenAttackBonus = evenAttack - sylvarion.top;

    return out;
  })()`);
  assert.equal(result.statsUnchanged, true, 'stats and element must be untouched by the rework');
  assert.equal(result.specialCost, true, 'Ultimate cost normalized from 5 to 2');
  assert.equal(result.specialName, true);
  assert.equal(result.behindAttackBonus, 4, 'Windrush (+2) and Vanguard of the Hunt (+2) both apply while attacking and behind on board count');
  assert.equal(result.behindDefenseBonus, 0, 'both bonuses are attack-only and must not apply on defense');
  assert.equal(result.evenAttackBonus, 2, 'only Windrush applies when board counts are even (Vanguard requires being behind)');
  assert.deepEqual(pageErrors, []);
  await page.close();
});

test("Sylvarion: Herald's Gale debuffs every enemy, and self-buff scales with how far behind his side is on board count, capped at +3", async () => {
  const { page, pageErrors } = await newPage();
  const result = await page.evaluate(`(() => {
    ${freshEntrySnippet()}
    const out = {};
    const sylvarion = findCardById('sylvarion');

    // Even board count (1 vs 1): no deficit, so no self-buff, but the AOE
    // debuff still lands on every enemy.
    state.board = Array(9).fill(null);
    const src0 = freshEntry(sylvarion, 'blue');
    state.board[4] = src0;
    const foe0 = freshEntry({ id:'f0', name:'F0', top:5,right:5,bottom:5,left:5 }, 'red');
    state.board[1] = foe0;
    SPECIAL_HANDLERS.sylvarion({ srcEntry: src0, owner: 'blue' });
    out.evenNoBonus = src0.captureBonus === 0;
    out.evenStillDebuffsEnemy = foe0.captureBonus === -2;

    // Behind by 2 (1 vs 3): self-buff +2, allies untouched, enemies debuffed.
    state.board = Array(9).fill(null);
    state.wins = { blue: 0, red: 0 };
    const src1 = freshEntry(sylvarion, 'blue');
    state.board[4] = src1;
    const foe1a = freshEntry({ id:'f1a', name:'F1A', top:5,right:5,bottom:5,left:5 }, 'red');
    state.board[1] = foe1a;
    const foe1b = freshEntry({ id:'f1b', name:'F1B', top:5,right:5,bottom:5,left:5 }, 'red');
    state.board[2] = foe1b;
    const foe1c = freshEntry({ id:'f1c', name:'F1C', top:5,right:5,bottom:5,left:5 }, 'red');
    state.board[3] = foe1c;
    SPECIAL_HANDLERS.sylvarion({ srcEntry: src1, owner: 'blue' });
    out.behindByTwoBonus = src1.captureBonus === 2;
    out.bothEnemiesDebuffed = foe1a.captureBonus === -2 && foe1b.captureBonus === -2 && foe1c.captureBonus === -2;

    // Deeply behind (1 vs 5): capped at +3, not +4.
    state.board = Array(9).fill(null);
    const src2 = freshEntry(sylvarion, 'blue');
    state.board[4] = src2;
    [0,1,2,3,8].forEach(i => { state.board[i] = freshEntry({ id:'x'+i, name:'X'+i, top:5,right:5,bottom:5,left:5 }, 'red'); });
    SPECIAL_HANDLERS.sylvarion({ srcEntry: src2, owner: 'blue' });
    out.cappedAtThree = src2.captureBonus === 3;

    // Locked in at cast time: deficit shrinks afterward (an ally joins the
    // board), the already-granted bonus must not recompute live.
    state.board = Array(9).fill(null);
    const src3 = freshEntry(sylvarion, 'blue');
    state.board[4] = src3;
    const foe3 = freshEntry({ id:'f3', name:'F3', top:5,right:5,bottom:5,left:5 }, 'red');
    state.board[1] = foe3;
    const foe3b = freshEntry({ id:'f3b', name:'F3B', top:5,right:5,bottom:5,left:5 }, 'red');
    state.board[2] = foe3b;
    SPECIAL_HANDLERS.sylvarion({ srcEntry: src3, owner: 'blue' });
    const bonusAfterCast = src3.captureBonus;
    state.board[3] = freshEntry({ id:'ally3', name:'Ally3', top:5,right:5,bottom:5,left:5 }, 'blue'); // board now even, 2 vs 2
    out.bonusLockedNotLive = src3.captureBonus === bonusAfterCast && bonusAfterCast === 1;

    return out;
  })()`);
  assert.equal(result.evenNoBonus, true, 'no self-buff when board counts are already even');
  assert.equal(result.evenStillDebuffsEnemy, true, 'the AOE debuff applies regardless of board count');
  assert.equal(result.behindByTwoBonus, true, 'self-buff equals the deficit (2 fewer cards -> +2)');
  assert.equal(result.bothEnemiesDebuffed, true, 'every enemy card is hit, not just one');
  assert.equal(result.cappedAtThree, true, 'the self-buff never exceeds +3 regardless of how large the deficit is');
  assert.equal(result.bonusLockedNotLive, true, 'the bonus is a one-time snapshot at cast time, not a live formula');
  assert.deepEqual(pageErrors, []);
  await page.close();
});

test('Darien: Umbral Ward margin-block, Elara\'s Bond stacks with the rivalry-pair bonus, and Shadow Breaker is unchanged', async () => {
  const { page, pageErrors } = await newPage();
  const result = await page.evaluate(`(() => {
    ${freshEntrySnippet()}
    const out = {};
    const darien = findCardById('darien');
    out.statsUnchanged = darien.top === 10 && darien.right === 10 && darien.bottom === 9 && darien.left === 9 && darien.element === 'water';
    out.hasUmbralWard = darien.active.marginShieldThreshold === 2;
    out.hasElaraBond = darien.active.pairPresence && darien.active.pairPresence.partner === 'elara' && darien.active.pairPresence.amount === 2;
    state.playerHand = [1,2]; state.enemyHand = [1,2];

    // Umbral Ward: enemy wins by <=2 margin -> blocked, attacker debuffed -1.
    // shieldUsed pre-set true to isolate this from Dark Aegis's own
    // always-on-first-loss shield, same isolation trick as Medusa's test.
    state.board = Array(9).fill(null);
    const darienDefender = freshEntry(darien, 'blue'); // top:10
    darienDefender.shieldUsed = true;
    state.board[4] = darienDefender;
    const closeAttacker = freshEntry({ id:'close', name:'Close', top:1,right:1,bottom:12,left:1 }, 'red'); // bottom:12 vs top:10, margin=2
    state.board[1] = closeAttacker;
    resolveFlips(1, 'red');
    out.wardBlockedCloseWin = state.board[4].owner === 'blue';
    out.wardDebuffedAttacker = closeAttacker.captureBonus === -1;

    // A bigger margin (>2) should NOT be blocked.
    state.board = Array(9).fill(null);
    const darienDefender2 = freshEntry(darien, 'blue');
    darienDefender2.shieldUsed = true;
    state.board[4] = darienDefender2;
    const bigAttacker = freshEntry({ id:'big', name:'Big', top:1,right:1,bottom:20,left:1 }, 'red');
    state.board[1] = bigAttacker;
    resolveFlips(1, 'red');
    out.bigMarginNotBlocked = state.board[4].owner === 'red';

    // Elara's Bond: +2 while Elara is anywhere on the board, on top of the
    // existing +1 rivalry-pair bonus when actually adjacent to her.
    state.board = Array(9).fill(null);
    state.board[0] = freshEntry(darien, 'blue');
    state.board[8] = freshEntry(findCardById('elara'), 'blue'); // far away, not adjacent
    const farValue = fullEffectiveValue(darien, 'top', null, 0, 'blue', 'attack');
    out.bondOnlyFar = farValue - darien.top === 2;

    state.board = Array(9).fill(null);
    state.board[4] = freshEntry(darien, 'blue');
    state.board[1] = freshEntry(findCardById('elara'), 'blue'); // adjacent this time
    const adjacentValue = fullEffectiveValue(darien, 'top', null, 4, 'blue', 'attack');
    out.bondPlusRivalryAdjacent = adjacentValue - darien.top === 3;

    // Shadow Breaker is untouched: still executes weak targets outright and
    // permanently weakens strong ones by -3, unblockable either way.
    state.board = Array(9).fill(null);
    const src = freshEntry(darien, 'blue');
    state.board[4] = src;
    const weakTarget = freshEntry({ id:'weak', name:'Weak', top:5,right:5,bottom:5,left:5 }, 'red'); // avg 5 <= 7
    state.board[1] = weakTarget;
    SPECIAL_HANDLERS.darien({ srcEntry: src, targetEntry: weakTarget, targetIndex: 1, owner: 'blue' });
    out.weakTargetDestroyed = state.board[1] === null;

    state.board = Array(9).fill(null);
    state.board[4] = src;
    const strongTarget = freshEntry({ id:'strong', name:'Strong', top:10,right:10,bottom:10,left:10 }, 'red'); // avg 10 > 7
    state.board[1] = strongTarget;
    SPECIAL_HANDLERS.darien({ srcEntry: src, targetEntry: strongTarget, targetIndex: 1, owner: 'blue' });
    out.strongTargetWeakened = strongTarget.captureBonus === -3 && state.board[1] === strongTarget;

    return out;
  })()`);
  assert.equal(result.statsUnchanged, true, 'stats and element must be untouched by the rework');
  assert.equal(result.hasUmbralWard, true);
  assert.equal(result.hasElaraBond, true);
  assert.equal(result.wardBlockedCloseWin, true, 'a margin-2 loss is blocked by Umbral Ward');
  assert.equal(result.wardDebuffedAttacker, true, 'the attacker is debuffed -1 when blocked');
  assert.equal(result.bigMarginNotBlocked, true, 'a margin greater than 2 still flips him normally');
  assert.equal(result.bondOnlyFar, true, "+2 from Elara's Bond alone when she is on the board but not adjacent");
  assert.equal(result.bondPlusRivalryAdjacent, true, "+2 from Elara's Bond plus +1 from the existing rivalry-pair adjacency bonus when she is actually adjacent");
  assert.equal(result.weakTargetDestroyed, true, 'Shadow Breaker still destroys targets with average Power <= 7');
  assert.equal(result.strongTargetWeakened, true, 'Shadow Breaker still permanently weakens stronger targets by -3 instead of capturing them');
  assert.deepEqual(pageErrors, []);
  await page.close();
});

test('Ferea: Frostmark on win, Queen\'s Blessing aura scales with Frostmarked enemies, and The Frozen Crown ultimate', async () => {
  const { page, pageErrors } = await newPage();
  const result = await page.evaluate(`(() => {
    ${freshEntrySnippet()}
    const out = {};
    const ferea = findCardById('ferea');
    out.playableAndEnemy = HEROES.some(h => h.id === 'ferea') && FOREST_FOES.some(f => f.id === 'ferea');
    out.statsMatchArt = ferea.top === 10 && ferea.right === 9 && ferea.bottom === 9 && ferea.left === 10 && ferea.element === 'water';
    out.specialCost = ferea.special.cost === 3;
    out.specialName = ferea.special.name === 'The Frozen Crown';

    // Frostmark: winning a battle marks the loser, permanently (no expiry,
    // unlike Medusa's temporary petrify).
    state.board = Array(9).fill(null);
    state.playerHand = [1,2]; state.enemyHand = [1,2];
    const winner = freshEntry(ferea, 'blue');
    state.board[4] = winner;
    const loser = freshEntry({ id:'weak', name:'Weak', top:1,right:1,bottom:1,left:1 }, 'red');
    state.board[1] = loser;
    resolveFlips(4, 'blue');
    out.frostmarkedAfterWin = loser.frostmarked === true;

    // Queen's Blessing: +1 per Frostmarked enemy on the board, capped at +3.
    state.board = Array(9).fill(null);
    const src1 = freshEntry(ferea, 'blue');
    state.board[4] = src1;
    const marked1 = freshEntry({ id:'m1', name:'M1', top:5,right:5,bottom:5,left:5 }, 'red');
    marked1.frostmarked = true;
    state.board[1] = marked1;
    const unmarked1 = freshEntry({ id:'u1', name:'U1', top:5,right:5,bottom:5,left:5 }, 'red');
    state.board[2] = unmarked1;
    const oneMarkedValue = fullEffectiveValue(ferea, 'top', null, 4, 'blue', 'attack');
    out.oneMarkedBonus = oneMarkedValue - ferea.top === 1;

    state.board = Array(9).fill(null);
    const src2 = freshEntry(ferea, 'blue');
    state.board[4] = src2;
    [0,1,2,3].forEach(i => { const e = freshEntry({ id:'m'+i, name:'M'+i, top:5,right:5,bottom:5,left:5 }, 'red'); e.frostmarked = true; state.board[i] = e; });
    const fourMarkedValue = fullEffectiveValue(ferea, 'top', null, 4, 'blue', 'attack');
    out.cappedAtThree = fourMarkedValue - ferea.top === 3;

    // The Frozen Crown: marks every enemy, debuffs them -2 this round, and
    // grants a permanent self-buff equal to how many were marked (capped at 3).
    state.board = Array(9).fill(null);
    const src3 = freshEntry(ferea, 'blue');
    state.board[4] = src3;
    const foe3a = freshEntry({ id:'f3a', name:'F3A', top:5,right:5,bottom:5,left:5 }, 'red');
    state.board[1] = foe3a;
    const foe3b = freshEntry({ id:'f3b', name:'F3B', top:5,right:5,bottom:5,left:5 }, 'red');
    state.board[2] = foe3b;
    const ally3 = freshEntry({ id:'a3', name:'A3', top:5,right:5,bottom:5,left:5 }, 'blue');
    state.board[3] = ally3;
    SPECIAL_HANDLERS.ferea({ srcEntry: src3, owner: 'blue' });
    out.bothEnemiesFrostmarked = foe3a.frostmarked === true && foe3b.frostmarked === true;
    out.bothEnemiesDebuffed = foe3a.captureBonus === -2 && foe3b.captureBonus === -2;
    out.selfBuffEqualsCount = src3.captureBonus === 2;
    out.allyUntouched = ally3.frostmarked !== true && ally3.captureBonus === 0;

    return out;
  })()`);
  assert.equal(result.playableAndEnemy, true);
  assert.equal(result.statsMatchArt, true, 'stats must match the approved card art (10/9/9/10, water)');
  assert.equal(result.specialCost, true);
  assert.equal(result.specialName, true);
  assert.equal(result.frostmarkedAfterWin, true, 'winning a battle Frostmarks the defeated enemy permanently');
  assert.equal(result.oneMarkedBonus, true, "Queen's Blessing grants +1 per Frostmarked enemy on the board");
  assert.equal(result.cappedAtThree, true, "Queen's Blessing never exceeds +3 regardless of how many enemies are marked");
  assert.equal(result.bothEnemiesFrostmarked, true, 'The Frozen Crown Frostmarks every enemy');
  assert.equal(result.bothEnemiesDebuffed, true, 'The Frozen Crown debuffs every enemy -2 this round');
  assert.equal(result.selfBuffEqualsCount, true, 'the self-buff equals the number of enemies marked (2 here)');
  assert.equal(result.allyUntouched, true, 'allies are never Frostmarked or debuffed by the ultimate');
  assert.deepEqual(pageErrors, []);
  await page.close();
});

test("Elara: Frostbloom cleanse-on-win, Crystal Sanctuary margin-block, Darien's Grace, and Requiem of Light ultimate", async () => {
  const { page, pageErrors } = await newPage();
  const result = await page.evaluate(`(() => {
    ${freshEntrySnippet()}
    const out = {};
    const elara = findCardById('elara');
    out.statsUnchanged = elara.top === 8 && elara.right === 8 && elara.bottom === 8 && elara.left === 10 && elara.element === 'water';
    out.oldShieldGone = !elara.active.shield;
    out.hasMarginWard = elara.active.marginShieldThreshold === 2;
    out.hasDarienBond = elara.active.pairPresence && elara.active.pairPresence.partner === 'darien' && elara.active.pairPresence.amount === 2;
    out.specialName = elara.special.name === 'Requiem of Light';
    out.specialCost = elara.special.cost === 2;
    state.playerHand = [1,2]; state.enemyHand = [1,2];

    // Frostbloom: on-win, clears a negative captureBonus + tempEffects and
    // adds +1 permanent. Calls checkOnWinBonuses directly (same isolation
    // trick as Naline's Healing Radiance test) so the random ally pick
    // deterministically lands on Elara herself.
    state.board = Array(9).fill(null);
    const winner = freshEntry(elara, 'blue');
    winner.captureBonus = -3;
    winner.tempEffects = [{ captureDelta: -3, expiresAtTurnCount: 999 }];
    state.board[4] = winner;
    const hrLoser = freshEntry({ id:'hr-loser', name:'HRLoser', top:1,right:1,bottom:1,left:1 }, 'red');
    checkOnWinBonuses(winner, 'top', hrLoser, null, 4, 10);
    out.frostbloomCleansed = winner.captureBonus === 1 && winner.tempEffects.length === 0;

    // Crystal Sanctuary: enemy wins by <=2 margin -> blocked, attacker
    // debuffed -1. No pre-set shieldUsed needed this time -- Elara no
    // longer carries a separate plain shield to isolate from.
    state.board = Array(9).fill(null);
    const defender = freshEntry(elara, 'blue'); // top:8
    state.board[4] = defender;
    const closeAttacker = freshEntry({ id:'close', name:'Close', top:1,right:1,bottom:10,left:1 }, 'red'); // bottom:10 vs top:8, margin=2
    state.board[1] = closeAttacker;
    resolveFlips(1, 'red');
    out.sanctuaryBlockedCloseWin = state.board[4].owner === 'blue';
    out.sanctuaryDebuffedAttacker = closeAttacker.captureBonus === -1;

    state.board = Array(9).fill(null);
    const defender2 = freshEntry(elara, 'blue');
    state.board[4] = defender2;
    const bigAttacker = freshEntry({ id:'big', name:'Big', top:1,right:1,bottom:20,left:1 }, 'red');
    state.board[1] = bigAttacker;
    resolveFlips(1, 'red');
    out.bigMarginNotBlocked = state.board[4].owner === 'red';

    // Darien's Grace: +2 while Darien is on the board, +3 total when
    // actually adjacent (stacking with the existing rivalry-pair bonus).
    state.board = Array(9).fill(null);
    state.board[0] = freshEntry(elara, 'blue');
    state.board[8] = freshEntry(findCardById('darien'), 'blue'); // far away
    const farValue = fullEffectiveValue(elara, 'top', null, 0, 'blue', 'attack');
    out.graceOnlyFar = farValue - elara.top === 2;

    state.board = Array(9).fill(null);
    state.board[4] = freshEntry(elara, 'blue');
    state.board[1] = freshEntry(findCardById('darien'), 'blue'); // adjacent
    const adjacentValue = fullEffectiveValue(elara, 'top', null, 4, 'blue', 'attack');
    out.gracePlusRivalryAdjacent = adjacentValue - elara.top === 3;

    // Requiem of Light: every ally with something to clear gets cleansed
    // and +1; an ally with nothing to clear is untouched; enemies are
    // never touched at all.
    state.board = Array(9).fill(null);
    const src = freshEntry(elara, 'blue');
    state.board[4] = src;
    const hurtAlly = freshEntry({ id:'hurt', name:'Hurt', top:5,right:5,bottom:5,left:5 }, 'blue');
    hurtAlly.captureBonus = -2;
    state.board[1] = hurtAlly;
    const healthyAlly = freshEntry({ id:'healthy', name:'Healthy', top:5,right:5,bottom:5,left:5 }, 'blue');
    state.board[2] = healthyAlly;
    const foe = freshEntry({ id:'foe', name:'Foe', top:5,right:5,bottom:5,left:5 }, 'red');
    foe.captureBonus = -2;
    state.board[3] = foe;
    SPECIAL_HANDLERS.elara({ srcEntry: src, owner: 'blue' });
    out.hurtAllyCleansedAndBuffed = hurtAlly.captureBonus === 1; // -2 cleared to 0, then +1
    out.healthyAllyUntouched = healthyAlly.captureBonus === 0;
    out.enemyUntouched = foe.captureBonus === -2;

    return out;
  })()`);
  assert.equal(result.statsUnchanged, true, 'stats and element must be untouched by the rework');
  assert.equal(result.oldShieldGone, true, 'the old plain active.shield must be gone, replaced by Crystal Sanctuary');
  assert.equal(result.hasMarginWard, true);
  assert.equal(result.hasDarienBond, true);
  assert.equal(result.specialName, true, 'Elara now has an Ultimate for the first time');
  assert.equal(result.specialCost, true);
  assert.equal(result.frostbloomCleansed, true, 'Frostbloom clears a negative captureBonus and tempEffects, then adds +1');
  assert.equal(result.sanctuaryBlockedCloseWin, true, 'a margin-2 loss is blocked by Crystal Sanctuary');
  assert.equal(result.sanctuaryDebuffedAttacker, true, 'the attacker is debuffed -1 when blocked');
  assert.equal(result.bigMarginNotBlocked, true, 'a margin greater than 2 still flips her normally');
  assert.equal(result.graceOnlyFar, true, "+2 from Darien's Grace alone when he is on the board but not adjacent");
  assert.equal(result.gracePlusRivalryAdjacent, true, "+2 from Darien's Grace plus +1 from the existing rivalry-pair adjacency bonus when he is actually adjacent");
  assert.equal(result.hurtAllyCleansedAndBuffed, true, 'an ally with negative effects is cleansed to 0 then gains +1');
  assert.equal(result.healthyAllyUntouched, true, 'an ally with nothing to clear is left untouched, no free +1');
  assert.equal(result.enemyUntouched, true, 'enemies are never affected by Requiem of Light');
  assert.deepEqual(pageErrors, []);
  await page.close();
});

test('Vayra: Shadow Step margin-block, Silent Strike permanent capture bonus, and Eclipse is unchanged', async () => {
  const { page, pageErrors } = await newPage();
  const result = await page.evaluate(`(() => {
    ${freshEntrySnippet()}
    const out = {};
    const vayra = findCardById('vayra');
    out.statsUnchanged = vayra.top === 10 && vayra.right === 8 && vayra.bottom === 8 && vayra.left === 9 && vayra.element === 'earth';
    out.oldShieldGone = !vayra.active.shield;
    out.hasShadowStep = vayra.active.marginShieldThreshold === 2;
    out.hasSilentStrike = vayra.active.onCaptureBonus === 1;
    out.specialName = vayra.special.name === 'Eclipse';
    out.specialCost = vayra.special.cost === 2;
    state.playerHand = [1,2]; state.enemyHand = [1,2];

    // Shadow Step: enemy wins by <=2 margin -> blocked, attacker debuffed -1.
    state.board = Array(9).fill(null);
    const defender = freshEntry(vayra, 'blue'); // top:10
    state.board[4] = defender;
    const closeAttacker = freshEntry({ id:'close', name:'Close', top:1,right:1,bottom:12,left:1 }, 'red'); // bottom:12 vs top:10, margin=2
    state.board[1] = closeAttacker;
    resolveFlips(1, 'red');
    out.shadowStepBlockedCloseWin = state.board[4].owner === 'blue';
    out.shadowStepDebuffedAttacker = closeAttacker.captureBonus === -1;

    state.board = Array(9).fill(null);
    const defender2 = freshEntry(vayra, 'blue');
    state.board[4] = defender2;
    const bigAttacker = freshEntry({ id:'big', name:'Big', top:1,right:1,bottom:20,left:1 }, 'red');
    state.board[1] = bigAttacker;
    resolveFlips(1, 'red');
    out.bigMarginNotBlocked = state.board[4].owner === 'red';

    // Silent Strike: winning a battle (taking control of an enemy card)
    // grants a permanent +1 Power via the existing onCaptureBonus field.
    state.board = Array(9).fill(null);
    const winner = freshEntry(vayra, 'blue');
    state.board[4] = winner;
    const weakFoe = freshEntry({ id:'weak', name:'Weak', top:1,right:1,bottom:1,left:1 }, 'red');
    state.board[1] = weakFoe;
    resolveFlips(4, 'blue');
    out.silentStrikeGrantedPermanentBonus = winner.captureBonus === 1;

    // Eclipse: unchanged, still requires beating the target's total power by
    // at least 3 (the temp boost), and grants +1 permanent on all sides if it wins.
    state.board = Array(9).fill(null);
    const src = freshEntry(vayra, 'blue');
    state.board[4] = src;
    const target = freshEntry({ id:'t', name:'T', top:5,right:5,bottom:5,left:5 }, 'red'); // total 20
    state.board[1] = target;
    SPECIAL_HANDLERS.vayra({ srcEntry: src, targetEntry: target, targetIndex: 1, owner: 'blue' });
    out.eclipseCapturedAndBuffed = target.owner === 'blue' && src.captureBonus === 1;

    return out;
  })()`);
  assert.equal(result.statsUnchanged, true, 'stats and element must be untouched by the rework');
  assert.equal(result.oldShieldGone, true, 'the old plain active.shield must be gone, replaced by Shadow Step');
  assert.equal(result.hasShadowStep, true);
  assert.equal(result.hasSilentStrike, true);
  assert.equal(result.specialName, true);
  assert.equal(result.specialCost, true);
  assert.equal(result.shadowStepBlockedCloseWin, true, 'a margin-2 loss is blocked by Shadow Step');
  assert.equal(result.shadowStepDebuffedAttacker, true, 'the attacker is debuffed -1 when blocked');
  assert.equal(result.bigMarginNotBlocked, true, 'a margin greater than 2 still flips her normally');
  assert.equal(result.silentStrikeGrantedPermanentBonus, true, 'capturing an enemy card grants a permanent +1 via Silent Strike');
  assert.equal(result.eclipseCapturedAndBuffed, true, 'Eclipse still captures and grants +1 permanent on a win, unchanged from before');
  assert.deepEqual(pageErrors, []);
  await page.close();
});

test("Aurelian: Skyward Reach only boosts Up/Down while attacking, Celestial Bond mirrors the Twin pattern, and Skybreaker is unchanged", async () => {
  const { page, pageErrors } = await newPage();
  const result = await page.evaluate(`(() => {
    ${freshEntrySnippet()}
    const out = {};
    const aurelian = findCardById('aurelian');
    out.statsUnchanged = aurelian.top === 10 && aurelian.right === 7 && aurelian.bottom === 10 && aurelian.left === 6 && aurelian.element === 'wind';
    out.hasSkywardReach = aurelian.active.axisBonus && aurelian.active.axisBonus.amount === 1 && aurelian.active.axisBonus.dirs.includes('top') && aurelian.active.axisBonus.dirs.includes('bottom');
    out.hasCelestialBond = aurelian.active.pairPresence && aurelian.active.pairPresence.partner === 'vorlix' && aurelian.active.pairPresence.amount === 2;
    out.specialName = aurelian.special.name === 'Skybreaker';
    state.playerHand = [1,2]; state.enemyHand = [1,2];

    // Skyward Reach: +1 on Up/Down while attacking, nothing on Left/Right,
    // and nothing at all while defending (even on Up/Down).
    state.board = Array(9).fill(null);
    state.board[4] = freshEntry(aurelian, 'blue');
    const topAttack = fullEffectiveValue(aurelian, 'top', null, 4, 'blue', 'attack');
    out.topAttackBonus = topAttack - aurelian.top === 1;
    const bottomAttack = fullEffectiveValue(aurelian, 'bottom', null, 4, 'blue', 'attack');
    out.bottomAttackBonus = bottomAttack - aurelian.bottom === 1;
    const rightAttack = fullEffectiveValue(aurelian, 'right', null, 4, 'blue', 'attack');
    out.rightAttackUnaffected = rightAttack - aurelian.right === 0;
    const topDefense = fullEffectiveValue(aurelian, 'top', null, 4, 'blue', 'defense');
    out.topDefenseUnaffected = topDefense - aurelian.top === 0;

    // Celestial Bond: +2 while Vorlix is anywhere on the board.
    state.board = Array(9).fill(null);
    state.board[0] = freshEntry(aurelian, 'blue');
    state.board[8] = freshEntry(findCardById('vorlix'), 'blue');
    const withVorlix = fullEffectiveValue(aurelian, 'left', null, 0, 'blue', 'defense');
    out.celestialBondBonus = withVorlix - aurelian.left === 2;
    state.board[8] = null;
    const withoutVorlix = fullEffectiveValue(aurelian, 'left', null, 0, 'blue', 'defense');
    out.noBondWithoutVorlix = withoutVorlix - aurelian.left === 0;

    // Skybreaker: rebuilt to match the approved card art -- a total-power
    // threshold check (+3) rather than an Up/Down-specific temp boost, and
    // a generic +1 all-sides permanent buff via attackBoost on a win,
    // same shape as Vayra's Eclipse / Ysara's Eternal Eclipse.
    state.board = Array(9).fill(null);
    const src = freshEntry(aurelian, 'blue');
    state.board[4] = src;
    const weakTarget = freshEntry({ id:'weak', name:'Weak', top:1,right:1,bottom:1,left:1 }, 'red'); // total 4, easily beaten
    state.board[1] = weakTarget;
    SPECIAL_HANDLERS.aurelian({ srcEntry: src, targetEntry: weakTarget, targetIndex: 1, owner: 'blue' });
    out.skybreakerCaptured = weakTarget.owner === 'blue';
    out.skybreakerBoostedAllSides = src.captureBonus === 1;

    state.board = Array(9).fill(null);
    const src2 = freshEntry(aurelian, 'blue'); // total 33
    state.board[4] = src2;
    const strongTarget = freshEntry({ id:'strong', name:'Strong', top:20,right:20,bottom:20,left:20 }, 'red'); // total 80, 33+3 <= 80
    state.board[1] = strongTarget;
    SPECIAL_HANDLERS.aurelian({ srcEntry: src2, targetEntry: strongTarget, targetIndex: 1, owner: 'blue' });
    out.skybreakerNoEffectVsMuchStronger = strongTarget.owner === 'red' && src2.captureBonus === 0;

    return out;
  })()`);
  assert.equal(result.statsUnchanged, true, 'stats and element must be untouched by the rework');
  assert.equal(result.hasSkywardReach, true);
  assert.equal(result.hasCelestialBond, true);
  assert.equal(result.specialName, true);
  assert.equal(result.topAttackBonus, true, 'Skyward Reach grants +1 on Up while attacking');
  assert.equal(result.bottomAttackBonus, true, 'Skyward Reach grants +1 on Down while attacking');
  assert.equal(result.rightAttackUnaffected, true, 'Skyward Reach does not apply to Left/Right');
  assert.equal(result.topDefenseUnaffected, true, 'Skyward Reach is attack-only, even on Up/Down');
  assert.equal(result.celestialBondBonus, true, '+2 on all sides while Vorlix is anywhere on the board');
  assert.equal(result.noBondWithoutVorlix, true, 'no bonus once Vorlix leaves the board');
  assert.equal(result.skybreakerCaptured, true, 'Skybreaker still captures a much weaker target');
  assert.equal(result.skybreakerBoostedAllSides, true, 'Skybreaker now grants a generic +1 on all sides, matching the approved card art');
  assert.equal(result.skybreakerNoEffectVsMuchStronger, true, 'Skybreaker fails against a target whose total power exceeds the +3 threshold');
  assert.deepEqual(pageErrors, []);
  await page.close();
});

test("Vorlix: Horizon's Reach only boosts Left/Right while attacking, Celestial Bond mirrors Aurelian's, and WorldCleaver is unchanged (axis-specific, unlike Aurelian's now-generic Skybreaker)", async () => {
  const { page, pageErrors } = await newPage();
  const result = await page.evaluate(`(() => {
    ${freshEntrySnippet()}
    const out = {};
    const vorlix = findCardById('vorlix');
    out.statsUnchanged = vorlix.top === 10 && vorlix.right === 9 && vorlix.bottom === 6 && vorlix.left === 9 && vorlix.element === 'water';
    out.hasHorizonsReach = vorlix.active.axisBonus && vorlix.active.axisBonus.amount === 1 && vorlix.active.axisBonus.dirs.includes('left') && vorlix.active.axisBonus.dirs.includes('right');
    out.hasCelestialBond = vorlix.active.pairPresence && vorlix.active.pairPresence.partner === 'aurelian' && vorlix.active.pairPresence.amount === 2;
    out.specialName = vorlix.special.name === 'WorldCleaver';
    state.playerHand = [1,2]; state.enemyHand = [1,2];

    // Horizon's Reach: +1 on Left/Right while attacking, nothing on
    // Up/Down, and nothing at all while defending.
    state.board = Array(9).fill(null);
    state.board[4] = freshEntry(vorlix, 'blue');
    const leftAttack = fullEffectiveValue(vorlix, 'left', null, 4, 'blue', 'attack');
    out.leftAttackBonus = leftAttack - vorlix.left === 1;
    const rightAttack = fullEffectiveValue(vorlix, 'right', null, 4, 'blue', 'attack');
    out.rightAttackBonus = rightAttack - vorlix.right === 1;
    const topAttack = fullEffectiveValue(vorlix, 'top', null, 4, 'blue', 'attack');
    out.topAttackUnaffected = topAttack - vorlix.top === 0;
    const leftDefense = fullEffectiveValue(vorlix, 'left', null, 4, 'blue', 'defense');
    out.leftDefenseUnaffected = leftDefense - vorlix.left === 0;

    // Celestial Bond: +2 while Aurelian is anywhere on the board.
    state.board = Array(9).fill(null);
    state.board[0] = freshEntry(vorlix, 'blue');
    state.board[8] = freshEntry(findCardById('aurelian'), 'blue');
    const withAurelian = fullEffectiveValue(vorlix, 'top', null, 0, 'blue', 'defense');
    out.celestialBondBonus = withAurelian - vorlix.top === 2;
    state.board[8] = null;
    const withoutAurelian = fullEffectiveValue(vorlix, 'top', null, 0, 'blue', 'defense');
    out.noBondWithoutAurelian = withoutAurelian - vorlix.top === 0;

    // WorldCleaver: fully unchanged -- still axis-specific (Left/Right
    // only), unlike Aurelian's Skybreaker which became generic per the
    // user's explicit choice for that card alone.
    state.board = Array(9).fill(null);
    const src = freshEntry(vorlix, 'blue');
    state.board[4] = src;
    const target = freshEntry({ id:'t', name:'T', top:1,right:1,bottom:1,left:1 }, 'red');
    state.board[1] = target;
    SPECIAL_HANDLERS.vorlix({ srcEntry: src, targetEntry: target, targetIndex: 1, owner: 'blue' });
    out.worldCleaverCaptured = target.owner === 'blue';
    out.worldCleaverBoostedLeftRightOnly = src.sideBonus && src.sideBonus.left === 1 && src.sideBonus.right === 1 && !src.sideBonus.top && !src.sideBonus.bottom;

    return out;
  })()`);
  assert.equal(result.statsUnchanged, true, 'stats and element must be untouched by the rework');
  assert.equal(result.hasHorizonsReach, true);
  assert.equal(result.hasCelestialBond, true);
  assert.equal(result.specialName, true);
  assert.equal(result.leftAttackBonus, true, "Horizon's Reach grants +1 on Left while attacking");
  assert.equal(result.rightAttackBonus, true, "Horizon's Reach grants +1 on Right while attacking");
  assert.equal(result.topAttackUnaffected, true, "Horizon's Reach does not apply to Up/Down");
  assert.equal(result.leftDefenseUnaffected, true, "Horizon's Reach is attack-only, even on Left/Right");
  assert.equal(result.celestialBondBonus, true, '+2 on all sides while Aurelian is anywhere on the board');
  assert.equal(result.noBondWithoutAurelian, true, 'no bonus once Aurelian leaves the board');
  assert.equal(result.worldCleaverCaptured, true, 'WorldCleaver still captures on a win');
  assert.equal(result.worldCleaverBoostedLeftRightOnly, true, 'WorldCleaver still only permanently boosts Left/Right, fully unchanged from before');
  assert.deepEqual(pageErrors, []);
  await page.close();
});

test('Ysara: Future Sight vs a stronger foe, Paradox Veil debuff immunity, and Eternal Eclipse is unchanged', async () => {
  const { page, pageErrors } = await newPage();
  const result = await page.evaluate(`(() => {
    ${freshEntrySnippet()}
    const out = {};
    const ysara = findCardById('ysara');
    out.statsUnchanged = ysara.top === 9 && ysara.right === 7 && ysara.bottom === 10 && ysara.left === 8 && ysara.element === 'wind';
    out.oldShieldGone = !ysara.active.shield;
    out.hasFutureSight = ysara.active.vsStrongerTotalPowerBoost && ysara.active.vsStrongerTotalPowerBoost.amount === 3;
    out.hasParadoxVeil = ysara.active.debuffImmune === true;
    out.specialName = ysara.special.name === 'Eternal Eclipse';
    out.specialCost = ysara.special.cost === 2;
    state.playerHand = [1,2]; state.enemyHand = [1,2]; // avoid lastStandBonus() polluting the comparisons below

    // Future Sight: +3 attacking a stronger-total-power foe, nothing vs a weaker one.
    out.futureSightVsStronger = fullEffectiveValue(ysara, 'top', {top:10,right:10,bottom:10,left:10}, 4, 'blue', 'attack') - ysara.top === 3;
    out.futureSightVsWeaker = fullEffectiveValue(ysara, 'top', {top:1,right:1,bottom:1,left:1}, 4, 'blue', 'attack') - ysara.top === 0;

    // Paradox Veil: debuffThisRound and debuff both do nothing to her.
    state.board = Array(9).fill(null);
    const guarded = freshEntry(ysara, 'blue');
    state.board[4] = guarded;
    SpecialVerbs.debuffThisRound(guarded, 3);
    SpecialVerbs.debuff(guarded, 3);
    out.paradoxVeilBlocksDebuffs = guarded.captureBonus === 0;

    // Eternal Eclipse: unchanged, still a total-power threshold check
    // (+3) with a permanent +1 all-sides buff on a win.
    state.board = Array(9).fill(null);
    const src = freshEntry(ysara, 'blue');
    state.board[4] = src;
    const weakTarget = freshEntry({ id:'weak', name:'Weak', top:1,right:1,bottom:1,left:1 }, 'red');
    state.board[1] = weakTarget;
    SPECIAL_HANDLERS.ysara({ srcEntry: src, targetEntry: weakTarget, targetIndex: 1, owner: 'blue' });
    out.eclipseCapturedAndBuffed = weakTarget.owner === 'blue' && src.captureBonus === 1;

    return out;
  })()`);
  assert.equal(result.statsUnchanged, true, 'stats and element must be untouched by the rework');
  assert.equal(result.oldShieldGone, true, 'the old plain active.shield must be gone, replaced by Future Sight/Paradox Veil');
  assert.equal(result.hasFutureSight, true);
  assert.equal(result.hasParadoxVeil, true);
  assert.equal(result.specialName, true);
  assert.equal(result.specialCost, true);
  assert.equal(result.futureSightVsStronger, true, 'Future Sight grants +3 when attacking a card with higher total Power');
  assert.equal(result.futureSightVsWeaker, true, 'Future Sight grants nothing against an equal-or-weaker foe');
  assert.equal(result.paradoxVeilBlocksDebuffs, true, "Paradox Veil blocks both debuff() and debuffThisRound()");
  assert.equal(result.eclipseCapturedAndBuffed, true, 'Eternal Eclipse still captures and grants +1 permanent on a win, unchanged from before');
  assert.deepEqual(pageErrors, []);
  await page.close();
});

test("Torn: Predator's Mark vs a stronger facing side, Poisoned Edge permanent debuff on a win, and Lethal Volley is unchanged", async () => {
  const { page, pageErrors } = await newPage();
  const result = await page.evaluate(`(() => {
    ${freshEntrySnippet()}
    const out = {};
    const torn = findCardById('torn');
    out.hasElement = torn.element === 'earth';
    out.hasPredatorsMark = torn.active.underdogSideBonus === 2;
    out.hasPoisonedEdge = torn.active.onWinDebuffLoserPermanent === 1;
    out.specialName = torn.special.name === 'Lethal Volley';
    out.specialCost = torn.special.cost === 2;
    state.playerHand = [1,2]; state.enemyHand = [1,2];

    // Predator's Mark: +2 when the opponent's facing side beats Torn's own
    // printed side on that edge, nothing when it doesn't.
    const stronger = { top:9, right:8, bottom:20, left:9 }; // bottom(20) faces Torn's top(9) when placed above her
    const weaker = { top:9, right:8, bottom:1, left:9 };
    out.markTriggersVsStronger = fullEffectiveValue(torn, 'top', stronger, 4, 'blue', 'defense') - torn.top === 2;
    out.markSkipsVsWeaker = fullEffectiveValue(torn, 'top', weaker, 4, 'blue', 'defense') - torn.top === 0;

    // Poisoned Edge: winning a battle permanently weakens the loser by -1,
    // via a real capture (resolveFlips), not just checkOnWinBonuses directly.
    state.board = Array(9).fill(null);
    const winner = freshEntry(torn, 'blue');
    state.board[4] = winner;
    const loser = freshEntry({ id:'weak', name:'Weak', top:1,right:1,bottom:1,left:1 }, 'red');
    state.board[1] = loser;
    resolveFlips(4, 'blue');
    out.poisonedEdgeAppliedOnWin = loser.captureBonus === -1;

    // Lethal Volley: unchanged, AOE permanent -2 to every enemy, unblockable
    // (no shield check at all).
    state.board = Array(9).fill(null);
    const src = freshEntry(torn, 'blue');
    state.board[4] = src;
    const shieldedFoe = freshEntry({ id:'sf', name:'SF', top:5,right:5,bottom:5,left:5, active:{shield:true} }, 'red');
    state.board[1] = shieldedFoe;
    const plainFoe = freshEntry({ id:'pf', name:'PF', top:5,right:5,bottom:5,left:5 }, 'red');
    state.board[2] = plainFoe;
    SPECIAL_HANDLERS.torn({ srcEntry: src, owner: 'blue' });
    out.volleyHitsEvenShielded = shieldedFoe.captureBonus === -2 && plainFoe.captureBonus === -2;

    return out;
  })()`);
  assert.equal(result.hasElement, true, 'Torn now has an element (Earth), filling a previously empty field');
  assert.equal(result.hasPredatorsMark, true);
  assert.equal(result.hasPoisonedEdge, true);
  assert.equal(result.specialName, true);
  assert.equal(result.specialCost, true);
  assert.equal(result.markTriggersVsStronger, true, "Predator's Mark grants +2 when the opponent's facing side is higher");
  assert.equal(result.markSkipsVsWeaker, true, "Predator's Mark grants nothing when the opponent's facing side is lower");
  assert.equal(result.poisonedEdgeAppliedOnWin, true, 'Poisoned Edge permanently weakens the loser by -1 after a real win');
  assert.equal(result.volleyHitsEvenShielded, true, 'Lethal Volley is unblockable, hitting every enemy including shielded ones');
  assert.deepEqual(pageErrors, []);
  await page.close();
});

test('Graff: Behind Enemy Lines requires 2+ adjacent enemies, Shadowplay is unchanged, and Whirlwind Assault combines a guaranteed AOE splash with the original single-target capture', async () => {
  const { page, pageErrors } = await newPage();
  const result = await page.evaluate(`(() => {
    ${freshEntrySnippet()}
    const out = {};
    const graff = findCardById('graff');
    out.hasShadowplay = graff.active.onCaptureBonus === 1;
    out.hasBehindEnemyLines = graff.active.adjacentEnemiesBoost && graff.active.adjacentEnemiesBoost.minCount === 2 && graff.active.adjacentEnemiesBoost.amount === 2;
    out.specialName = graff.special.name === 'Whirlwind Assault';
    state.playerHand = [1,2]; state.enemyHand = [1,2];

    // Behind Enemy Lines: +2 on attack with 2+ adjacent enemies, nothing with only 1.
    state.board = Array(9).fill(null);
    state.board[4] = freshEntry(graff, 'blue');
    state.board[1] = freshEntry(findCardById('ogre'), 'red');
    state.board[3] = freshEntry(findCardById('ogre'), 'red');
    const twoAdjacent = fullEffectiveValue(graff, 'top', null, 4, 'blue', 'attack');
    out.behindEnemyLinesTwoAdjacent = twoAdjacent - graff.top === 2;
    state.board[3] = null;
    const oneAdjacent = fullEffectiveValue(graff, 'top', null, 4, 'blue', 'attack');
    out.behindEnemyLinesOneAdjacent = oneAdjacent - graff.top === 0;

    // Whirlwind Assault: the AOE splash hits every OTHER enemy (-2 this
    // round) unconditionally -- even when the chosen target is too strong
    // for the single-target capture to succeed. The chosen target itself
    // is excluded from the splash (it gets the capture-or-nothing outcome
    // instead).
    state.board = Array(9).fill(null);
    const src = freshEntry(graff, 'blue');
    state.board[4] = src;
    const strongTarget = freshEntry({ id:'strong', name:'Strong', top:20,right:20,bottom:20,left:20 }, 'red');
    state.board[1] = strongTarget;
    const splashFoe = freshEntry({ id:'splash', name:'Splash', top:5,right:5,bottom:5,left:5 }, 'red');
    state.board[2] = splashFoe;
    SPECIAL_HANDLERS.graff({ srcEntry: src, targetEntry: strongTarget, targetIndex: 1, owner: 'blue' });
    out.splashHitsOtherEnemies = splashFoe.captureBonus === -2;
    out.targetExcludedFromSplash = strongTarget.captureBonus === 0;
    out.failedCaptureVsStronger = strongTarget.owner === 'red';

    // Against a weak target, the capture still succeeds and grants the
    // permanent +3 all-sides buff, same as before this change.
    state.board = Array(9).fill(null);
    const src2 = freshEntry(graff, 'blue');
    state.board[4] = src2;
    const weakTarget = freshEntry({ id:'weak', name:'Weak', top:1,right:1,bottom:1,left:1 }, 'red');
    state.board[1] = weakTarget;
    SPECIAL_HANDLERS.graff({ srcEntry: src2, targetEntry: weakTarget, targetIndex: 1, owner: 'blue' });
    out.capturedAndBuffed = weakTarget.owner === 'blue' && src2.captureBonus === 3;

    return out;
  })()`);
  assert.equal(result.hasShadowplay, true, 'Shadowplay must be untouched');
  assert.equal(result.hasBehindEnemyLines, true);
  assert.equal(result.specialName, true, 'the Ultimate name is now consistent (was "Shadow Assault" in special vs "Whirlwind Assault" in the skill text)');
  assert.equal(result.behindEnemyLinesTwoAdjacent, true, 'Behind Enemy Lines grants +2 with 2+ adjacent enemies');
  assert.equal(result.behindEnemyLinesOneAdjacent, true, 'Behind Enemy Lines grants nothing with only 1 adjacent enemy');
  assert.equal(result.splashHitsOtherEnemies, true, 'the AOE splash lands on other enemies even when the chosen target resists capture');
  assert.equal(result.targetExcludedFromSplash, true, 'the chosen target is not double-hit by the splash');
  assert.equal(result.failedCaptureVsStronger, true, 'the single-target capture still fails against a much stronger target');
  assert.equal(result.capturedAndBuffed, true, 'the single-target capture still succeeds and grants the permanent +3 buff against a weaker target');
  assert.deepEqual(pageErrors, []);
  await page.close();
});

test('Voidqueen (renamed The Hungering Void): title collision with Nyxara resolved, Hunger of the Void and Oblivion\'s Call unchanged, Insatiable is new', async () => {
  const { page, pageErrors } = await newPage();
  const result = await page.evaluate(`(() => {
    ${freshEntrySnippet()}
    const out = {};
    const voidqueen = findCardById('voidqueen');
    const nyxara = findCardById('nyxara');
    out.nameChanged = voidqueen.name === 'The Hungering Void';
    out.noLongerCollidesWithNyxara = voidqueen.name !== nyxara.name;
    out.hasHungerOfTheVoid = voidqueen.active.underdogBonus === 3;
    out.hasInsatiable = voidqueen.active.onCaptureBonus === 1;
    out.specialName = voidqueen.special.name === "Oblivion's Call";
    out.specialCost = voidqueen.special.cost === 2;
    state.playerHand = [1,2]; state.enemyHand = [1,2];

    // Insatiable: winning a battle (taking control of an enemy card) grants
    // a permanent +1 via the existing onCaptureBonus field, same as Vayra's
    // Silent Strike / Graff's Shadowplay.
    state.board = Array(9).fill(null);
    const winner = freshEntry(voidqueen, 'blue');
    state.board[4] = winner;
    const weakFoe = freshEntry({ id:'weak', name:'Weak', top:1,right:1,bottom:1,left:1 }, 'red');
    state.board[1] = weakFoe;
    resolveFlips(4, 'blue');
    out.insatiableGrantedPermanentBonus = winner.captureBonus === 1;

    // Oblivion's Call: unchanged, still hits every enemy adjacent to the
    // chosen target with a PERMANENT -2 (SpecialVerbs.debuff, not
    // debuffThisRound -- matches the approved card art's "(permanent)" text).
    state.board = Array(9).fill(null);
    const src = freshEntry(voidqueen, 'blue');
    state.board[4] = src;
    const target = freshEntry({ id:'t', name:'T', top:5,right:5,bottom:5,left:5 }, 'red');
    state.board[1] = target;
    const adjacentFoe = freshEntry({ id:'af', name:'AF', top:5,right:5,bottom:5,left:5 }, 'red');
    state.board[2] = adjacentFoe;
    SPECIAL_HANDLERS.voidqueen({ srcEntry: src, targetEntry: target, targetIndex: 1, owner: 'blue' });
    out.oblivionsCallHitAdjacent = adjacentFoe.captureBonus === -2;

    return out;
  })()`);
  assert.equal(result.nameChanged, true, 'the printed name must no longer be "The Void Empress"');
  assert.equal(result.noLongerCollidesWithNyxara, true, 'the only real lore contradiction in the roster is now resolved');
  assert.equal(result.hasHungerOfTheVoid, true);
  assert.equal(result.hasInsatiable, true);
  assert.equal(result.specialName, true);
  assert.equal(result.specialCost, true);
  assert.equal(result.insatiableGrantedPermanentBonus, true, 'Insatiable grants a permanent +1 on capturing an enemy card');
  assert.equal(result.oblivionsCallHitAdjacent, true, "Oblivion's Call still permanently weakens cards adjacent to the chosen target");
  assert.deepEqual(pageErrors, []);
  await page.close();
});

test("Sarah: Light Shield unchanged, Feared Huntress vs a stronger foe, and her first-ever Ultimate Aion's Last Light", async () => {
  const { page, pageErrors } = await newPage();
  const result = await page.evaluate(`(() => {
    ${freshEntrySnippet()}
    const out = {};
    const sarah = findCardById('sarah');
    out.statsUnchanged = sarah.top === 10 && sarah.right === 10 && sarah.bottom === 10 && sarah.left === 10 && sarah.element === 'wind';
    out.hasLightShield = sarah.active.shield === true;
    out.hasFearedHuntress = sarah.active.vsStrongerTotalPowerBoost && sarah.active.vsStrongerTotalPowerBoost.amount === 3;
    out.specialName = sarah.special.name === "Aion's Last Light";
    out.specialCost = sarah.special.cost === 2;
    state.playerHand = [1,2]; state.enemyHand = [1,2];

    // Feared Huntress: +3 attacking a stronger-total-power foe, nothing vs a weaker one.
    out.fearedVsStronger = fullEffectiveValue(sarah, 'top', {top:20,right:20,bottom:20,left:20}, 4, 'blue', 'attack') - sarah.top === 3;
    out.fearedVsWeaker = fullEffectiveValue(sarah, 'top', {top:1,right:1,bottom:1,left:1}, 4, 'blue', 'attack') - sarah.top === 0;

    // Aion's Last Light: her first-ever Ultimate, same shape as Vayra's
    // Eclipse / Ysara's Eternal Eclipse (+3 temp threshold, +1 permanent
    // all-sides on a win).
    state.board = Array(9).fill(null);
    const src = freshEntry(sarah, 'blue');
    state.board[4] = src;
    const weakTarget = freshEntry({ id:'weak', name:'Weak', top:1,right:1,bottom:1,left:1 }, 'red');
    state.board[1] = weakTarget;
    SPECIAL_HANDLERS.sarah({ srcEntry: src, targetEntry: weakTarget, targetIndex: 1, owner: 'blue' });
    out.capturedAndBuffed = weakTarget.owner === 'blue' && src.captureBonus === 1;

    state.board = Array(9).fill(null);
    const src2 = freshEntry(sarah, 'blue'); // total 40
    state.board[4] = src2;
    const strongTarget = freshEntry({ id:'strong', name:'Strong', top:20,right:20,bottom:20,left:20 }, 'red'); // total 80, 40+3 <= 80
    state.board[1] = strongTarget;
    SPECIAL_HANDLERS.sarah({ srcEntry: src2, targetEntry: strongTarget, targetIndex: 1, owner: 'blue' });
    out.noEffectVsMuchStronger = strongTarget.owner === 'red' && src2.captureBonus === 0;

    return out;
  })()`);
  assert.equal(result.statsUnchanged, true, 'stats and element must be untouched by the rework');
  assert.equal(result.hasLightShield, true, "Light Shield's tie to her title is kept unchanged");
  assert.equal(result.hasFearedHuntress, true);
  assert.equal(result.specialName, true);
  assert.equal(result.specialCost, true);
  assert.equal(result.fearedVsStronger, true, 'Feared Huntress grants +3 when attacking a card with higher total Power');
  assert.equal(result.fearedVsWeaker, true, 'Feared Huntress grants nothing against an equal-or-weaker foe');
  assert.equal(result.capturedAndBuffed, true, "Aion's Last Light captures and grants +1 permanent on a win");
  assert.equal(result.noEffectVsMuchStronger, true, "Aion's Last Light fails against a target whose total power exceeds the +3 threshold");
  assert.deepEqual(pageErrors, []);
  await page.close();
});

test("Zaevir: card rebuilt from a 0/4-wired stub -- Eternal Aim (onPlaceBoost), Focus (shield), and his first-ever Ultimate Eternal Arrow", async () => {
  const { page, pageErrors } = await newPage();
  const result = await page.evaluate(`(() => {
    ${freshEntrySnippet()}
    const out = {};
    const zaevir = findCardById('zaevir');
    out.statsMatchArt = zaevir.top === 10 && zaevir.right === 10 && zaevir.bottom === 9 && zaevir.left === 8 && zaevir.element === 'wind';
    out.hasEternalAim = zaevir.active.onPlaceBoost === 2;
    out.hasFocus = zaevir.active.shield === true;
    out.skillCount = zaevir.skills.length;
    state.playerHand = [1,2]; state.enemyHand = [1,2];

    // Eternal Aim: placing him grants +2 Power on exactly one random side.
    state.board = Array(9).fill(null);
    state.playerHand = [zaevir, {id:'filler1'}];
    placeCard(4, 'zaevir', 'blue');
    const placed = state.board[4];
    const sb = placed.sideBonus || {};
    const boostedSides = ['top','right','bottom','left'].filter(s => (sb[s]||0) === 2);
    out.eternalAimBoostedExactlyOneSide = boostedSides.length === 1;

    // Focus: the first loss is ignored (generic active.shield:true).
    state.board = Array(9).fill(null);
    state.playerHand = [1,2]; state.enemyHand = [1,2];
    const shieldedDefender = freshEntry(zaevir, 'blue'); // top:10
    state.board[4] = shieldedDefender;
    const attacker = freshEntry({ id:'zae-attacker', name:'ZaeAttacker', top:1,right:1,bottom:20,left:1 }, 'red');
    state.board[1] = attacker;
    resolveFlips(1, 'red');
    out.shieldBlockedFirstLoss = state.board[4].owner === 'blue';

    // Eternal Arrow (same Eclipse shape as Sarah/Vayra/Ysara): non-crit win
    // flips the target and grants permanent +1 Power all sides.
    state.board = Array(9).fill(null);
    const src = freshEntry(zaevir, 'blue');
    const target = freshEntry(findCardById('ogre'), 'red');
    state.board[4] = src; state.board[1] = target;
    SPECIAL_HANDLERS.zaevir({ srcEntry: src, targetEntry: target, targetIndex: 1, owner: 'blue' });
    out.arrowFlippedTarget = target.owner === 'blue';
    out.arrowPermanentBoost = src.captureBonus === 1;

    return out;
  })()`);
  assert.equal(result.statsMatchArt, true, 'stats matched to the approved art: 10/10/9/8 (top/right/bottom/left)');
  assert.equal(result.hasEternalAim, true);
  assert.equal(result.hasFocus, true);
  assert.equal(result.skillCount, 4, "the printed card carries Eternal Aim, Focus, Hunt-Bond (Fas 3 synergy pilot with Sylvarion), and Eternal Arrow -- Forest's Path and the old Eternal Arrow chain-attack concept are gone");
  assert.equal(result.eternalAimBoostedExactlyOneSide, true);
  assert.equal(result.shieldBlockedFirstLoss, true);
  assert.equal(result.arrowFlippedTarget, true);
  assert.equal(result.arrowPermanentBoost, true);
  assert.deepEqual(pageErrors, []);
  await page.close();
});

test('Ragnar: card rebuilt from a 0/4-wired stub -- War Breaker (vsStrongerTotalPowerBoost), Blood Rush (onCaptureBonus), and his first-ever Ultimate Blood Fury', async () => {
  const { page, pageErrors } = await newPage();
  const result = await page.evaluate(`(() => {
    ${freshEntrySnippet()}
    const out = {};
    const ragnar = findCardById('ragnar');
    out.statsMatchArt = ragnar.top === 9 && ragnar.right === 6 && ragnar.bottom === 9 && ragnar.left === 5 && ragnar.element === 'fire';
    out.hasWarBreaker = ragnar.active.vsStrongerTotalPowerBoost && ragnar.active.vsStrongerTotalPowerBoost.amount === 2;
    out.hasBloodRush = ragnar.active.onCaptureBonus === 1;
    out.skillCount = ragnar.skills.length;
    state.playerHand = [1,2]; state.enemyHand = [1,2];

    // War Breaker: +2 Power attacking a stronger-total-power foe, nothing vs a weaker one.
    out.warBreakerVsStronger = fullEffectiveValue(ragnar, 'top', {top:20,right:20,bottom:20,left:20}, 0, 'blue', 'attack') - ragnar.top;
    out.warBreakerVsWeaker = fullEffectiveValue(ragnar, 'top', {top:1,right:1,bottom:1,left:1}, 0, 'blue', 'attack') - ragnar.top;

    // Blood Rush: capturing a card permanently grants +1 Power.
    state.board = Array(9).fill(null);
    const src = freshEntry(ragnar, 'blue'); // top:9
    state.board[4] = src;
    state.board[1] = freshEntry({ id:'rag-weak', name:'RagWeak', top:1,right:1,bottom:1,left:1 }, 'red');
    resolveFlips(4, 'blue');
    out.bloodRushGainedPower = src.captureBonus === 1;

    // Blood Fury (same Eclipse shape as Zaevir/Sarah/Vayra/Ysara): non-crit
    // win flips the target and grants permanent +1 Power all sides.
    state.board = Array(9).fill(null);
    const wsrc = freshEntry(ragnar, 'blue');
    const wtarget = freshEntry(findCardById('ogre'), 'red');
    state.board[4] = wsrc; state.board[1] = wtarget;
    SPECIAL_HANDLERS.ragnar({ srcEntry: wsrc, targetEntry: wtarget, targetIndex: 1, owner: 'blue' });
    out.furyFlippedTarget = wtarget.owner === 'blue';
    out.furyPermanentBoost = wsrc.captureBonus === 1;

    return out;
  })()`);
  assert.equal(result.statsMatchArt, true, 'stats matched to the approved art: 9/6/9/5 (top/right/bottom/left)');
  assert.equal(result.hasWarBreaker, true);
  assert.equal(result.hasBloodRush, true);
  assert.equal(result.skillCount, 3, 'the printed card carries War Breaker, Blood Rush, and Blood Fury -- Double Strike and Last Fury are gone');
  assert.equal(result.warBreakerVsStronger, 2);
  assert.equal(result.warBreakerVsWeaker, 0);
  assert.equal(result.bloodRushGainedPower, true);
  assert.equal(result.furyFlippedTarget, true);
  assert.equal(result.furyPermanentBoost, true);
  assert.deepEqual(pageErrors, []);
  await page.close();
});

test('Maximus: card trimmed from a 1/6-wired stub -- Gladiator\'s Dominion (onCaptureBonus), Blood for Glory (vsStrongerTotalPowerBoost), Axe of Dominion unchanged', async () => {
  const { page, pageErrors } = await newPage();
  const result = await page.evaluate(`(() => {
    ${freshEntrySnippet()}
    const out = {};
    const maximus = findCardById('maximus');
    out.statsUnchanged = maximus.top === 10 && maximus.right === 10 && maximus.bottom === 8 && maximus.left === 9 && maximus.element === 'fire';
    out.hasGladiatorsDominion = maximus.active.onCaptureBonus === 1;
    out.hasBloodForGlory = maximus.active.vsStrongerTotalPowerBoost && maximus.active.vsStrongerTotalPowerBoost.amount === 3;
    out.skillCount = maximus.skills.length;
    state.playerHand = [1,2]; state.enemyHand = [1,2];

    // Gladiator's Dominion: capturing a card permanently grants +1 all sides.
    state.board = Array(9).fill(null);
    const src = freshEntry(maximus, 'blue'); // top:10
    state.board[4] = src;
    state.board[1] = freshEntry({ id:'max-weak', name:'MaxWeak', top:1,right:1,bottom:1,left:1 }, 'red');
    resolveFlips(4, 'blue');
    out.dominionGainedPower = src.captureBonus === 1;

    // Blood for Glory: +3 Power attacking a stronger-total-power foe, nothing vs a weaker one.
    out.gloryVsStronger = fullEffectiveValue(maximus, 'top', {top:20,right:20,bottom:20,left:20}, 0, 'blue', 'attack') - maximus.top;
    out.gloryVsWeaker = fullEffectiveValue(maximus, 'top', {top:1,right:1,bottom:1,left:1}, 0, 'blue', 'attack') - maximus.top;

    // Axe of Dominion (unchanged): threshold +4, flip, permanent +2, extra
    // turn only when the defeated card was stronger.
    state.board = Array(9).fill(null);
    const wsrc = freshEntry(maximus, 'blue'); // total 37
    const weakTarget = freshEntry(findCardById('ogre'), 'red');
    state.board[4] = wsrc; state.board[1] = weakTarget;
    state.extraTurnPending = null;
    SPECIAL_HANDLERS.maximus({ srcEntry: wsrc, targetEntry: weakTarget, targetIndex: 1, owner: 'blue' });
    out.axeFlippedWeakTarget = weakTarget.owner === 'blue';
    out.axePermanentBoost = wsrc.captureBonus === 2;
    out.axeNoExtraTurnVsWeaker = state.extraTurnPending === null;

    state.board = Array(9).fill(null);
    const wsrc2 = freshEntry(maximus, 'blue');
    const strongTarget = freshEntry({ id:'max-strong', name:'MaxStrong', top:10,right:10,bottom:10,left:9 }, 'red'); // total 39: > Maximus's 37, still < 37+4=41
    state.board[4] = wsrc2; state.board[1] = strongTarget;
    state.extraTurnPending = null;
    SPECIAL_HANDLERS.maximus({ srcEntry: wsrc2, targetEntry: strongTarget, targetIndex: 1, owner: 'blue' });
    out.axeGrantsExtraTurnVsStronger = state.extraTurnPending === 'blue';

    return out;
  })()`);
  assert.equal(result.statsUnchanged, true);
  assert.equal(result.hasGladiatorsDominion, true);
  assert.equal(result.hasBloodForGlory, true);
  assert.equal(result.skillCount, 4, "the printed card carries Gladiator's Dominion, Blood for Glory, Warpath (Fas 3 differentiation from Darum), and Axe of Dominion -- Spinning Axe, Arena Rage, and Champion's Will are gone");
  assert.equal(result.dominionGainedPower, true);
  assert.equal(result.gloryVsStronger, 4, 'vsStrongerTotalPowerBoost (+3) plus the new Warpath flatAttackBonus (+1), which applies on every attack regardless of matchup');
  assert.equal(result.gloryVsWeaker, 1, 'Warpath\'s flatAttackBonus (+1) still applies even against a weaker foe, unlike Blood for Glory');
  assert.equal(result.axeFlippedWeakTarget, true);
  assert.equal(result.axePermanentBoost, true);
  assert.equal(result.axeNoExtraTurnVsWeaker, true, 'no extra turn when the defeated card was NOT stronger');
  assert.equal(result.axeGrantsExtraTurnVsStronger, true, 'extra turn granted when the defeated card had higher total Power');
  assert.deepEqual(pageErrors, []);
  await page.close();
});

test('Darum: card trimmed from a 0/5-wired stub -- Wall of Resolve (onWinDirectionalBoost), Crushing Counter (vsStrongerTotalPowerBoost), Ironwall (shield), Gate of Dominion unchanged', async () => {
  const { page, pageErrors } = await newPage();
  const result = await page.evaluate(`(() => {
    ${freshEntrySnippet()}
    const out = {};
    const darum = findCardById('darum');
    out.statsUnchanged = darum.top === 10 && darum.right === 10 && darum.bottom === 8 && darum.left === 9 && darum.element === 'earth';
    out.hasWallOfResolve = darum.active.onWinDirectionalBoost === 1;
    out.hasCrushingCounter = darum.active.vsStrongerTotalPowerBoost && darum.active.vsStrongerTotalPowerBoost.amount === 3;
    out.hasIronwall = darum.active.shield === true;
    out.skillCount = darum.skills.length;
    state.playerHand = [1,2]; state.enemyHand = [1,2];

    // Wall of Resolve: winning a battle (as the attacker -- checkOnWinBonuses
    // only ever fires for the placing/attacking side in this engine, never
    // a defender that merely resists) grants permanent +1 on the winning
    // side, once per match.
    state.board = Array(9).fill(null);
    const src = freshEntry(darum, 'blue'); // top:10
    src.shieldUsed = true; // isolate from Ironwall's own shield
    state.board[4] = src;
    state.board[1] = freshEntry({ id:'dar-weak', name:'DarWeak', top:1,right:1,bottom:1,left:1 }, 'red');
    resolveFlips(4, 'blue');
    out.wallOfResolveBoosted = src.sideBonus && src.sideBonus.top === 1;

    // Crushing Counter: +3 Power vs a stronger-total-power foe, nothing vs a weaker one.
    out.counterVsStronger = fullEffectiveValue(darum, 'top', {top:20,right:20,bottom:20,left:20}, 0, 'blue', 'attack') - darum.top;
    out.counterVsWeaker = fullEffectiveValue(darum, 'top', {top:1,right:1,bottom:1,left:1}, 0, 'blue', 'attack') - darum.top;

    // Ironwall: the first loss is ignored (generic active.shield:true).
    state.board = Array(9).fill(null);
    const shieldedDefender = freshEntry(darum, 'blue');
    state.board[4] = shieldedDefender;
    const bigAttacker = freshEntry({ id:'dar-big', name:'DarBig', top:1,right:1,bottom:20,left:1 }, 'red');
    state.board[1] = bigAttacker;
    resolveFlips(1, 'red');
    out.ironwallBlockedFirstLoss = state.board[4].owner === 'blue';

    // Gate of Dominion (unchanged): threshold +4, flip, permanent +2.
    state.board = Array(9).fill(null);
    const wsrc = freshEntry(darum, 'blue');
    const wtarget = freshEntry(findCardById('ogre'), 'red');
    state.board[4] = wsrc; state.board[1] = wtarget;
    SPECIAL_HANDLERS.darum({ srcEntry: wsrc, targetEntry: wtarget, targetIndex: 1, owner: 'blue' });
    out.gateFlippedTarget = wtarget.owner === 'blue';
    out.gatePermanentBoost = wsrc.captureBonus === 2;

    return out;
  })()`);
  assert.equal(result.statsUnchanged, true);
  assert.equal(result.hasWallOfResolve, true);
  assert.equal(result.hasCrushingCounter, true);
  assert.equal(result.hasIronwall, true);
  assert.equal(result.skillCount, 4, "the printed card carries Wall of Resolve, Crushing Counter, Ironwall, and Gate of Dominion -- Boulder Bash, Fortress Stance, and the Special-Attack immunity are gone");
  assert.equal(result.wallOfResolveBoosted, true);
  assert.equal(result.counterVsStronger, 3);
  assert.equal(result.counterVsWeaker, 0);
  assert.equal(result.ironwallBlockedFirstLoss, true);
  assert.equal(result.gateFlippedTarget, true);
  assert.equal(result.gatePermanentBoost, true);
  assert.deepEqual(pageErrors, []);
  await page.close();
});

test('Daron: card trimmed from a 0/5-wired stub -- Corrupted Bloodline (onWinDirectionalBoost + vsStrongerTotalPowerBoost), Soul Drain (onWinDebuffLoserPermanent + onCaptureBonus), Shattered Crown unchanged', async () => {
  const { page, pageErrors } = await newPage();
  const result = await page.evaluate(`(() => {
    ${freshEntrySnippet()}
    const out = {};
    const daron = findCardById('daron');
    out.statsUnchanged = daron.top === 10 && daron.right === 10 && daron.bottom === 9 && daron.left === 8 && daron.element === 'water';
    out.hasOnWinBoost = daron.active.onWinDirectionalBoost === 1;
    out.hasVsStronger = daron.active.vsStrongerTotalPowerBoost && daron.active.vsStrongerTotalPowerBoost.amount === 1;
    out.hasSoulDrainDebuff = daron.active.onWinDebuffLoserPermanent === 1;
    out.hasSoulDrainGain = daron.active.onCaptureBonus === 1;
    out.skillCount = daron.skills.length;
    state.playerHand = [1,2]; state.enemyHand = [1,2];

    // Corrupted Bloodline, part 1: winning a battle (as attacker) grants
    // permanent +1 on the winning side, once per match.
    state.board = Array(9).fill(null);
    const src = freshEntry(daron, 'blue'); // top:10
    state.board[4] = src;
    state.board[1] = freshEntry({ id:'dn-weak', name:'DnWeak', top:1,right:1,bottom:1,left:1 }, 'red');
    resolveFlips(4, 'blue');
    out.onWinBoostApplied = src.sideBonus && src.sideBonus.top === 1;

    // Corrupted Bloodline, part 2: +1 Power attacking a stronger-total-power foe.
    out.strongerVsStronger = fullEffectiveValue(daron, 'top', {top:20,right:20,bottom:20,left:20}, 0, 'blue', 'attack') - daron.top;
    out.strongerVsWeaker = fullEffectiveValue(daron, 'top', {top:1,right:1,bottom:1,left:1}, 0, 'blue', 'attack') - daron.top;

    // Soul Drain: winning permanently steals 1 Power (loser -1, Daron +1).
    // Reuses src from above, which already has +1 from onWinDirectionalBoost.
    state.board[1] = freshEntry({ id:'dn-weak2', name:'DnWeak2', top:1,right:1,bottom:1,left:1 }, 'red');
    resolveFlips(4, 'blue');
    out.soulDrainDebuffedLoser = state.board[1].captureBonus === -1;
    // src already captured once in the first resolveFlips above too, so
    // onCaptureBonus (uncapped, unlike onWinDirectionalBoost) has now
    // fired twice: +2 total.
    out.soulDrainGainedSelf = src.captureBonus === 2;

    // Shattered Crown (unchanged): threshold +4, flip, steals 2 Power permanently.
    state.board = Array(9).fill(null);
    const wsrc = freshEntry(daron, 'blue');
    const wtarget = freshEntry(findCardById('ogre'), 'red');
    state.board[4] = wsrc; state.board[1] = wtarget;
    SPECIAL_HANDLERS.daron({ srcEntry: wsrc, targetEntry: wtarget, targetIndex: 1, owner: 'blue' });
    out.crownFlippedTarget = wtarget.owner === 'blue';
    out.crownStoleTwoPower = wtarget.captureBonus === -2;
    out.crownGainedTwoPower = wsrc.captureBonus === 2;

    return out;
  })()`);
  assert.equal(result.statsUnchanged, true);
  assert.equal(result.hasOnWinBoost, true);
  assert.equal(result.hasVsStronger, true);
  assert.equal(result.hasSoulDrainDebuff, true);
  assert.equal(result.hasSoulDrainGain, true);
  assert.equal(result.skillCount, 3, "the printed card carries Corrupted Bloodline, Soul Drain, and Shattered Crown -- Dark Sorcery, Twisted Royalty, and Mother's Torment are gone");
  assert.equal(result.onWinBoostApplied, true);
  assert.equal(result.strongerVsStronger, 1);
  assert.equal(result.strongerVsWeaker, 0);
  assert.equal(result.soulDrainDebuffedLoser, true);
  assert.equal(result.soulDrainGainedSelf, true, 'onCaptureBonus fired on both captures (uncapped), unlike the once-only onWinDirectionalBoost');
  assert.equal(result.crownFlippedTarget, true);
  assert.equal(result.crownStoleTwoPower, true);
  assert.equal(result.crownGainedTwoPower, true);
  assert.deepEqual(pageErrors, []);
  await page.close();
});

test('Vorathos: card cleaned up from an orphan active.shield -- Time Barrier (onWinDirectionalBoost), Eternal Boundary (oncePerMatchAttackBoost), Time Collapse now also debuffs the target (combined resolution)', async () => {
  const { page, pageErrors } = await newPage();
  const result = await page.evaluate(`(() => {
    ${freshEntrySnippet()}
    const out = {};
    const vorathos = findCardById('vorathos');
    out.statsUnchanged = vorathos.top === 7 && vorathos.right === 10 && vorathos.bottom === 8 && vorathos.left === 9 && vorathos.element === 'wind';
    out.hasTimeBarrier = vorathos.active.onWinDirectionalBoost === 1;
    out.hasEternalBoundary = vorathos.active.oncePerMatchAttackBoost && vorathos.active.oncePerMatchAttackBoost.amount === 2;
    out.orphanShieldRemoved = vorathos.active.shield === undefined;
    out.skillCount = vorathos.skills.length;
    state.playerHand = [1,2]; state.enemyHand = [1,2];

    // Time Barrier: winning a battle grants permanent +1 on the winning side, once per match.
    state.board = Array(9).fill(null);
    const src = freshEntry(vorathos, 'blue'); // right:10
    state.board[4] = src;
    state.board[5] = freshEntry({ id:'vt-weak', name:'VtWeak', top:1,right:1,bottom:1,left:1 }, 'red');
    resolveFlips(4, 'blue');
    out.timeBarrierApplied = src.sideBonus && src.sideBonus.right === 1;

    // Eternal Boundary: +2 Power on the next attack, once per match. The
    // read needs a live board entry at cellIndex to check the used-flag.
    state.board = Array(9).fill(null);
    state.board[0] = freshEntry(vorathos, 'blue');
    out.eternalBoundaryBoost = fullEffectiveValue(vorathos, 'top', {top:1,right:1,bottom:1,left:1}, 0, 'blue', 'attack') - vorathos.top;

    // Time Collapse (combined resolution): non-crit win flips the target,
    // grants Vorathos permanent +1 on the chosen direction, AND the target
    // permanently loses 1 on that same direction.
    state.board = Array(9).fill(null);
    const wsrc = freshEntry(vorathos, 'blue');
    const wtarget = freshEntry(findCardById('ogre'), 'red');
    state.board[4] = wsrc; state.board[1] = wtarget;
    SPECIAL_HANDLERS.vorathos({ srcEntry: wsrc, targetEntry: wtarget, targetIndex: 1, owner: 'blue', direction: 'up' });
    out.collapseFlippedTarget = wtarget.owner === 'blue';
    out.collapseBoostedSelf = wsrc.sideBonus && wsrc.sideBonus.top === 1;
    out.collapseDebuffedTarget = wtarget.sideBonus && wtarget.sideBonus.top === -1;

    return out;
  })()`);
  assert.equal(result.statsUnchanged, true);
  assert.equal(result.hasTimeBarrier, true);
  assert.equal(result.hasEternalBoundary, true);
  assert.equal(result.orphanShieldRemoved, true, 'the old undocumented active.shield (matched no named skill) was removed, not silently kept');
  assert.equal(result.skillCount, 3, "the printed card carries Time Barrier, Eternal Boundary, and Time Collapse -- Standstill and Reversed Shield are gone");
  assert.equal(result.timeBarrierApplied, true);
  assert.equal(result.eternalBoundaryBoost, 2);
  assert.equal(result.collapseFlippedTarget, true);
  assert.equal(result.collapseBoostedSelf, true, "Vorathos's own +1 self-buff is kept");
  assert.equal(result.collapseDebuffedTarget, true, "the approved art's enemy-debuff reading was added on top, per the user's combined ('C') resolution");
  assert.deepEqual(pageErrors, []);
  await page.close();
});

test('Game feel phase 3: chainShake triggers on a large Same/Combo chain, fxStep escalates per flip, both clear on schedule', async () => {
  const { page, pageErrors } = await newPage();
  const result = await page.evaluate(`(() => {
    const out = {};

    // A clean 4-way Same capture at the center: all four neighbors' facing
    // edge equals the placed card's matching edge (all 5s). Same captures
    // EVERY match once >=2 match, so this deterministically flips all 4
    // neighbors in one placement via the real placeCard()/resolveFlips()
    // path -- no hand-simulation of the chain logic itself.
    state.rules.same = true;
    state.rules.plus = false;
    state.rules.combo = true;
    state.board = Array(9).fill(null);
    const mk = (id, top, right, bottom, left, owner) => ({
      card: { id, name: id, top, right, bottom, left },
      owner, shieldUsed:false, grantedShield:false, captureBonus:0,
    });
    state.board[1] = mk('e-up',    1,1,5,1, 'red'); // bottom=5 matches placed top=5
    state.board[3] = mk('e-left',  1,5,1,1, 'red'); // right=5 matches placed left=5
    state.board[5] = mk('e-right',1,1,1,5, 'red'); // left=5 matches placed right=5
    state.board[7] = mk('e-down',  5,1,1,1, 'red'); // top=5 matches placed bottom=5
    state.playerHand = [{ id:'chain-src', name:'ChainSrc', top:5, right:5, bottom:5, left:5 }];
    state.enemyHand = [];
    state.turn = 'blue';
    state.placedThisTurn = false;
    placeCard(4, 'chain-src', 'blue');

    out.allCaptured = [1,3,5,7].every(i => state.board[i].owner === 'blue');
    out.chainShakeImmediatelyAfter = state.chainShake === true;
    // Every flipped neighbor should have gotten a DISTINCT fxStep (0-3, in
    // whatever order getEnemyNeighbors' NEIGHBOR_DIRS iterates: top/bottom/
    // left/right) -- proving the escalating-intensity CSS hook actually
    // receives different values per flip in the chain, not the same one.
    const steps = [1,3,5,7].map(i => state.board[i].fxStep).sort((a,b)=>a-b);
    out.fxStepsDistinct0to3 = JSON.stringify(steps) === JSON.stringify([0,1,2,3]);

    return out;
  })()`);
  assert.equal(result.allCaptured, true, 'all four Same-matched neighbors should be captured');
  assert.equal(result.chainShakeImmediatelyAfter, true, 'a 4-card Same/Combo chain should trigger chainShake');
  assert.equal(result.fxStepsDistinct0to3, true, 'each flip in the chain should get a distinct, escalating fxStep');

  // chainShake clears ~500ms after the triggering placement (see placeCard),
  // separately from fxStep/fxDelay's own later 1300ms cleanup.
  await page.waitForTimeout(650);
  const afterShakeWindow = await page.evaluate(() => state.chainShake);
  assert.equal(afterShakeWindow, false, 'chainShake should clear on its own ~500ms after the placement');

  await page.waitForTimeout(700); // total >1300ms since placeCard
  const fxStepsClearedAfter1300 = await page.evaluate(() => state.board.filter(Boolean).every(e => !e.fxStep));
  assert.equal(fxStepsClearedAfter1300, true, 'fxStep should be cleared by the existing 1300ms flag-clear cleanup');

  assert.deepEqual(pageErrors, []);
  await page.close();
});

test('Game feel phase 4: Ultimates get a windup beat + name banner before resolving, then a scaled impact, then cleanup; overlapping casts queue instead of colliding', async () => {
  const { page, pageErrors } = await newPage();

  // Part A: a single cast's full lifecycle (cast -> impact -> cleanup).
  const single = await page.evaluate(`(async () => {
    ${freshEntrySnippet()}
    const out = {};
    state.board = Array(9).fill(null);
    const src = freshEntry(findCardById('pallispell'), 'blue');
    state.board[4] = src;
    state.board[1] = freshEntry(findCardById('ogre'), 'red');
    state.wins = { blue: 5, red: 5 };
    state.specialUsed = {};
    state.turn = 'blue';
    runSpecialResolution(4, null, {});

    // Right after the call: windup phase, board NOT yet touched, wins
    // already deducted (that part stays synchronous/immediate).
    out.windsUpImmediately = state.ultimateBanner && state.ultimateBanner.phase === 'cast' && state.ultimateBanner.name === 'Hunter\\'s Wrath';
    out.castingGlowOnSource = src.ultimateCasting === true;
    out.winsDeductedImmediately = state.wins.blue === 3; // cost 2, 5-2=3
    out.boardUntouchedDuringWindup = state.board[1].owner === 'red';

    await new Promise(r => setTimeout(r, ULTIMATE_WINDUP_MS + 50));
    out.effectResolvedAfterWindup = state.board[1].owner === 'blue';
    out.castingGlowClearedAfterWindup = src.ultimateCasting === false;
    out.impactPhaseAfterWindup = state.ultimateBanner && state.ultimateBanner.phase === 'impact';

    await new Promise(r => setTimeout(r, 1300 + 200));
    out.bannerGoneAfterCleanup = state.ultimateBanner === null;

    return out;
  })()`);
  assert.equal(single.windsUpImmediately, true, 'the banner should appear in the cast phase immediately, showing the Ultimate name');
  assert.equal(single.castingGlowOnSource, true, 'the casting card should get the ultimate-casting glow during windup');
  assert.equal(single.winsDeductedImmediately, true, 'wins deduction stays immediate/synchronous, only the handler effect is deferred');
  assert.equal(single.boardUntouchedDuringWindup, true, "the effect must NOT have resolved yet during the windup beat -- that's the whole point of the anticipation pause");
  assert.equal(single.effectResolvedAfterWindup, true, 'the effect resolves once the windup beat elapses');
  assert.equal(single.castingGlowClearedAfterWindup, true);
  assert.equal(single.impactPhaseAfterWindup, true, 'the banner switches to its impact phase once the effect lands');
  assert.equal(single.bannerGoneAfterCleanup, true, 'the banner is cleared by the existing windup+1300ms cleanup, same timing as fxStep/justFlipped');
  assert.deepEqual(pageErrors, []);

  // Part B: a second cast triggered WHILE the first is still mid-sequence
  // (mirrors enemyTurn's `while(enemyTryUseSpecial()){}` loop, which can
  // fire several casts in one synchronous burst) must queue behind the
  // first, not overlap it -- one banner/effect at a time.
  const queued = await page.evaluate(`(async () => {
    ${freshEntrySnippet()}
    const out = {};
    state.board = Array(9).fill(null);
    const first = freshEntry(findCardById('pallispell'), 'blue');
    state.board[0] = first;
    state.board[1] = freshEntry(findCardById('ogre'), 'red');
    const second = freshEntry(findCardById('pallispell'), 'blue');
    state.board[4] = second;
    state.board[5] = freshEntry(findCardById('ogre'), 'red');
    state.wins = { blue: 10, red: 5 };
    state.specialUsed = {};
    state.turn = 'blue';

    runSpecialResolution(0, null, {}); // starts immediately
    runSpecialResolution(4, null, {}); // called while the first is still mid-windup -- must queue

    out.stillOnFirstCastRightAfter = state.ultimateBanner && state.ultimateBanner.sourceIndex === 0 && state.ultimateBanner.phase === 'cast';
    out.secondNotResolvedYet = state.board[5].owner === 'red';

    // First cast's full lifecycle: windup + impact-hold + fade + cleanup.
    await new Promise(r => setTimeout(r, ULTIMATE_WINDUP_MS + 1300 + 100));
    out.firstResolved = state.board[1].owner === 'blue';
    // The queued second cast should have started its OWN windup by now
    // (immediately after the first's cleanup), not resolved yet.
    out.secondNowWindingUp = state.ultimateBanner && state.ultimateBanner.sourceIndex === 4 && state.ultimateBanner.phase === 'cast';
    out.secondStillNotResolved = state.board[5].owner === 'red';

    await new Promise(r => setTimeout(r, ULTIMATE_WINDUP_MS + 50));
    out.secondResolvedAfterItsOwnWindup = state.board[5].owner === 'blue';

    return out;
  })()`);
  assert.equal(queued.stillOnFirstCastRightAfter, true, 'the banner right after both calls should still be the FIRST cast (sourceIndex 0)');
  assert.equal(queued.secondNotResolvedYet, true, 'the second cast must not resolve while queued');
  assert.equal(queued.firstResolved, true, 'the first cast resolves on its own normal schedule');
  assert.equal(queued.secondNowWindingUp, true, 'the queued second cast starts its own windup right after the first fully cleans up');
  assert.equal(queued.secondStillNotResolved, true, "the second cast's own effect hasn't run yet at that point either");
  assert.equal(queued.secondResolvedAfterItsOwnWindup, true, 'the second cast eventually resolves too, after its own windup');
  assert.deepEqual(pageErrors, []);

  await page.close();
});

test('Game feel phase 4c: Ifrit, Nyxara, Vaelira, Seraphine, Triune Desire, Bahamut, Tiamat, Three Head Dragon, Omega Weapon, Shiva and Odin\'s Ultimates play their real voice-line audio files on cast, other cards stay silent, and sound-off suppresses it', async () => {
  const { page, pageErrors } = await newPage();

  const result = await page.evaluate(`(() => {
    ${freshEntrySnippet()}
    const out = {};

    const playCalls = [];
    const OrigAudio = window.Audio;
    window.Audio = function(src){
      playCalls.push(src);
      return { volume: 1, play: () => Promise.resolve() };
    };

    playUltimateVoiceLine('ifrit');
    out.ifritCall = playCalls.slice();

    playCalls.length = 0;
    playUltimateVoiceLine('nyxara');
    out.nyxaraCall = playCalls.slice();

    playCalls.length = 0;
    playUltimateVoiceLine('vaelira');
    out.vaeliraCall = playCalls.slice();

    playCalls.length = 0;
    playUltimateVoiceLine('seraphine');
    out.seraphineCall = playCalls.slice();

    playCalls.length = 0;
    playUltimateVoiceLine('triunedesire');
    out.triunedesireCall = playCalls.slice();

    playCalls.length = 0;
    playUltimateVoiceLine('bahamut');
    out.bahamutCall = playCalls.slice();

    playCalls.length = 0;
    playUltimateVoiceLine('tiamat');
    out.tiamatCall = playCalls.slice();

    playCalls.length = 0;
    playUltimateVoiceLine('threeheaddragon');
    out.threeheaddragonCall = playCalls.slice();

    playCalls.length = 0;
    playUltimateVoiceLine('omegaweapon');
    out.omegaweaponCall = playCalls.slice();

    playCalls.length = 0;
    playUltimateVoiceLine('shiva');
    out.shivaCall = playCalls.slice();

    playCalls.length = 0;
    playUltimateVoiceLine('odin');
    out.odinCall = playCalls.slice();

    playCalls.length = 0;
    playUltimateVoiceLine('pallispell'); // no voice line entry for this card
    out.noEntryCall = playCalls.slice();

    playCalls.length = 0;
    soundOn = false;
    playUltimateVoiceLine('ifrit');
    out.silentWhenSoundOff = playCalls.slice();
    soundOn = true;

    window.Audio = OrigAudio;
    return out;
  })()`);
  assert.deepEqual(result.ifritCall, ['voices/ifrit.mp3'], "Ifrit's Ultimate cast should play his voice-line file");
  assert.deepEqual(result.nyxaraCall, ['voices/nyxara.mp3'], "Nyxara's Ultimate cast should play her voice-line file");
  assert.deepEqual(result.vaeliraCall, ['voices/vaelira.mp3'], "Vaelira's Ultimate cast should play her voice-line file");
  assert.deepEqual(result.seraphineCall, ['voices/seraphine.mp3'], "Seraphine's Ultimate cast should play her voice-line file");
  assert.deepEqual(result.triunedesireCall, ['voices/triunedesire.mp3'], "Triune Desire's Ultimate cast should play its voice-line file");
  assert.deepEqual(result.bahamutCall, ['voices/bahamut.mp3'], "Bahamut's Ultimate cast should play his voice-line file");
  assert.deepEqual(result.tiamatCall, ['voices/tiamat.mp3'], "Tiamat's Ultimate cast should play her voice-line file");
  assert.deepEqual(result.threeheaddragonCall, ['voices/threeheaddragon.mp3'], "Three Head Dragon's Ultimate cast should play its voice-line file");
  assert.deepEqual(result.omegaweaponCall, ['voices/omegaweapon.mp3'], "Omega Weapon's Ultimate cast should play its voice-line file");
  assert.deepEqual(result.shivaCall, ['voices/shiva.mp3'], "Shiva's Ultimate cast should play her voice-line file");
  assert.deepEqual(result.odinCall, ['voices/odin.mp3'], "Odin's Ultimate cast should play his voice-line file");
  assert.deepEqual(result.noEntryCall, [], 'cards with no ULTIMATE_VOICE_LINES entry stay silent');
  assert.deepEqual(result.silentWhenSoundOff, [], 'sound-off must suppress the voice line like every other SFX');
  assert.deepEqual(pageErrors, []);

  // Also runs through the real casting flow (playUltimateSequence), not just
  // the helper in isolation, to confirm the wiring itself is correct -- once
  // for a single-target Ultimate (Ifrit) and once for an AOE one (Nyxara,
  // targetIndex null) since executeSpecial calls runSpecialResolution
  // differently for each targeting mode.
  const viaCast = await page.evaluate(`(async () => {
    ${freshEntrySnippet()}
    const out = {};

    const playCalls = [];
    const OrigAudio = window.Audio;
    window.Audio = function(src){
      playCalls.push(src);
      return { volume: 1, play: () => Promise.resolve() };
    };

    state.board = Array(9).fill(null);
    state.board[4] = freshEntry(findCardById('ifrit'), 'blue');
    state.board[1] = freshEntry(findCardById('ogre'), 'red');
    state.wins = { blue: 5, red: 5 };
    state.specialUsed = {};
    state.turn = 'blue';
    runSpecialResolution(4, 1, {});
    out.ifritPlayedDuringWindup = playCalls.slice();

    await new Promise(r => setTimeout(r, ULTIMATE_WINDUP_MS + 1300 + 100));

    playCalls.length = 0;
    state.board = Array(9).fill(null);
    state.board[4] = freshEntry(findCardById('nyxara'), 'blue');
    state.board[1] = freshEntry(findCardById('ogre'), 'red');
    state.wins = { blue: 5, red: 5 };
    state.specialUsed = {};
    state.turn = 'blue';
    runSpecialResolution(4, null, {}); // AOE: null target, mirrors executeSpecial
    out.nyxaraPlayedDuringWindup = playCalls.slice();

    window.Audio = OrigAudio;
    return out;
  })()`);
  assert.deepEqual(viaCast.ifritPlayedDuringWindup, ['voices/ifrit.mp3'], 'the real cast flow (runSpecialResolution/playUltimateSequence) must trigger the voice line too');
  assert.deepEqual(viaCast.nyxaraPlayedDuringWindup, ['voices/nyxara.mp3'], 'the AOE cast flow must trigger the voice line the same way');
  assert.deepEqual(pageErrors, []);

  await page.close();
});

test('Game feel phase 4d: Ifrit\'s Hellfire, Nyxara\'s Void Dominion, Vaelira\'s Infernal Pact, Seraphine\'s Silver Judgment, Omega Weapon\'s Omega Protocol, Shiva\'s Diamond Storm, Bahamut\'s Megaflare and Odin\'s Zantetsuken also play a short impact sound effect timed to the impact beat (not the cast windup), via a reusable ULTIMATE_IMPACT_SFX mapping', async () => {
  const { page, pageErrors } = await newPage();

  const result = await page.evaluate(`(() => {
    ${freshEntrySnippet()}
    const out = {};

    const playCalls = [];
    const OrigAudio = window.Audio;
    window.Audio = function(src){
      playCalls.push(src);
      return { volume: 1, play: () => Promise.resolve() };
    };

    playUltimateImpactSfx('ifrit');
    out.ifritCall = playCalls.slice();

    playCalls.length = 0;
    playUltimateImpactSfx('nyxara');
    out.nyxaraCall = playCalls.slice();

    playCalls.length = 0;
    playUltimateImpactSfx('vaelira');
    out.vaeliraCall = playCalls.slice();

    playCalls.length = 0;
    playUltimateImpactSfx('seraphine');
    out.seraphineCall = playCalls.slice();

    playCalls.length = 0;
    playUltimateImpactSfx('omegaweapon');
    out.omegaweaponCall = playCalls.slice();

    playCalls.length = 0;
    playUltimateImpactSfx('shiva');
    out.shivaCall = playCalls.slice();

    playCalls.length = 0;
    playUltimateImpactSfx('bahamut');
    out.bahamutCall = playCalls.slice();

    playCalls.length = 0;
    playUltimateImpactSfx('odin');
    out.odinCall = playCalls.slice();

    playCalls.length = 0;
    playUltimateImpactSfx('triunedesire'); // no impact-SFX entry for this card
    out.noEntryCall = playCalls.slice();

    playCalls.length = 0;
    soundOn = false;
    playUltimateImpactSfx('ifrit');
    out.silentWhenSoundOff = playCalls.slice();
    soundOn = true;

    window.Audio = OrigAudio;
    return out;
  })()`);
  assert.deepEqual(result.ifritCall, ['sfx/ifrit.mp3'], "Ifrit's Ultimate impact should play his impact SFX file");
  assert.deepEqual(result.nyxaraCall, ['sfx/nyxara.mp3'], "Nyxara's Ultimate impact should play her impact SFX file");
  assert.deepEqual(result.vaeliraCall, ['sfx/vaelira.mp3'], "Vaelira's Ultimate impact should play her impact SFX file");
  assert.deepEqual(result.seraphineCall, ['sfx/seraphine.mp3'], "Seraphine's Ultimate impact should play her impact SFX file");
  assert.deepEqual(result.omegaweaponCall, ['sfx/omegaweapon.mp3'], "Omega Weapon's Ultimate impact should play its impact SFX file");
  assert.deepEqual(result.shivaCall, ['sfx/shiva.mp3'], "Shiva's Ultimate impact should play her impact SFX file");
  assert.deepEqual(result.bahamutCall, ['sfx/bahamut.mp3'], "Bahamut's Ultimate impact should play his impact SFX file");
  assert.deepEqual(result.odinCall, ['sfx/odin.mp3'], "Odin's Ultimate impact should play his impact SFX file");
  assert.deepEqual(result.noEntryCall, [], 'cards with no ULTIMATE_IMPACT_SFX entry stay silent at impact');
  assert.deepEqual(result.silentWhenSoundOff, [], 'sound-off must suppress the impact SFX like every other SFX');
  assert.deepEqual(pageErrors, []);

  // Runs through the real casting flow to confirm the impact SFX fires at
  // the IMPACT beat specifically, not alongside the cast-phase voice line --
  // once for a single-target Ultimate (Ifrit) and once for an AOE one
  // (Nyxara, targetIndex null), same distinction as the voice-line test.
  const viaCast = await page.evaluate(`(async () => {
    ${freshEntrySnippet()}
    const out = {};

    const playCalls = [];
    const OrigAudio = window.Audio;
    window.Audio = function(src){
      playCalls.push(src);
      return { volume: 1, play: () => Promise.resolve() };
    };

    state.board = Array(9).fill(null);
    state.board[4] = freshEntry(findCardById('ifrit'), 'blue');
    state.board[1] = freshEntry(findCardById('ogre'), 'red');
    state.wins = { blue: 5, red: 5 };
    state.specialUsed = {};
    state.turn = 'blue';
    runSpecialResolution(4, 1, {});
    out.ifritDuringWindup = playCalls.slice(); // only the cast-phase voice line so far

    await new Promise(r => setTimeout(r, ULTIMATE_WINDUP_MS + 1300 + 100));
    out.ifritAtImpact = playCalls.slice(); // now the impact SFX should have joined it

    playCalls.length = 0;
    state.board = Array(9).fill(null);
    state.board[4] = freshEntry(findCardById('nyxara'), 'blue');
    state.board[1] = freshEntry(findCardById('ogre'), 'red');
    state.wins = { blue: 5, red: 5 };
    state.specialUsed = {};
    state.turn = 'blue';
    runSpecialResolution(4, null, {}); // AOE: null target, mirrors executeSpecial
    out.nyxaraDuringWindup = playCalls.slice();

    await new Promise(r => setTimeout(r, ULTIMATE_WINDUP_MS + 50));
    out.nyxaraAtImpact = playCalls.slice();

    await new Promise(r => setTimeout(r, ULTIMATE_CLEANUP_MS + 100));

    playCalls.length = 0;
    state.board = Array(9).fill(null);
    state.board[4] = freshEntry(findCardById('vaelira'), 'blue');
    state.board[1] = freshEntry(findCardById('ogre'), 'red');
    state.wins = { blue: 5, red: 5 };
    state.specialUsed = {};
    state.turn = 'blue';
    runSpecialResolution(4, null, {}); // AOE: null target, mirrors executeSpecial
    out.vaeliraDuringWindup = playCalls.slice();

    await new Promise(r => setTimeout(r, ULTIMATE_WINDUP_MS + 50));
    out.vaeliraAtImpact = playCalls.slice();

    await new Promise(r => setTimeout(r, ULTIMATE_CLEANUP_MS + 100));

    playCalls.length = 0;
    state.board = Array(9).fill(null);
    state.board[4] = freshEntry(findCardById('seraphine'), 'blue');
    state.board[1] = freshEntry(findCardById('ogre'), 'red');
    state.wins = { blue: 5, red: 5 };
    state.specialUsed = {};
    state.turn = 'blue';
    runSpecialResolution(4, null, {}); // AOE: null target, mirrors executeSpecial
    out.seraphineDuringWindup = playCalls.slice();

    await new Promise(r => setTimeout(r, ULTIMATE_WINDUP_MS + 50));
    out.seraphineAtImpact = playCalls.slice();

    await new Promise(r => setTimeout(r, ULTIMATE_CLEANUP_MS + 100));

    playCalls.length = 0;
    state.board = Array(9).fill(null);
    state.board[4] = freshEntry(findCardById('omegaweapon'), 'blue');
    state.board[1] = freshEntry(findCardById('ogre'), 'red');
    state.wins = { blue: 5, red: 5 };
    state.specialUsed = {};
    state.turn = 'blue';
    runSpecialResolution(4, null, {}); // AOE: null target, mirrors executeSpecial
    out.omegaweaponDuringWindup = playCalls.slice();

    await new Promise(r => setTimeout(r, ULTIMATE_WINDUP_MS + 50));
    out.omegaweaponAtImpact = playCalls.slice();

    await new Promise(r => setTimeout(r, ULTIMATE_CLEANUP_MS + 100));

    playCalls.length = 0;
    state.board = Array(9).fill(null);
    state.board[4] = freshEntry(findCardById('shiva'), 'blue');
    state.board[1] = freshEntry(findCardById('ogre'), 'red');
    state.wins = { blue: 5, red: 5 };
    state.specialUsed = {};
    state.turn = 'blue';
    runSpecialResolution(4, null, {}); // AOE: null target, mirrors executeSpecial
    out.shivaDuringWindup = playCalls.slice();

    await new Promise(r => setTimeout(r, ULTIMATE_WINDUP_MS + 50));
    out.shivaAtImpact = playCalls.slice();

    window.Audio = OrigAudio;
    return out;
  })()`);
  assert.deepEqual(viaCast.ifritDuringWindup, ['voices/ifrit.mp3'], 'only the voice line should have played during the windup, not the impact SFX yet');
  assert.deepEqual(viaCast.ifritAtImpact, ['voices/ifrit.mp3', 'sfx/ifrit.mp3'], 'the impact SFX joins once the windup beat elapses and the effect actually lands');
  assert.deepEqual(viaCast.nyxaraDuringWindup, ['voices/nyxara.mp3'], 'same timing split for the AOE cast flow');
  assert.deepEqual(viaCast.nyxaraAtImpact, ['voices/nyxara.mp3', 'sfx/nyxara.mp3'], 'the AOE impact SFX joins once its own windup beat elapses');
  assert.deepEqual(viaCast.vaeliraDuringWindup, ['voices/vaelira.mp3'], 'same timing split for Vaelira\'s AOE cast flow');
  assert.deepEqual(viaCast.vaeliraAtImpact, ['voices/vaelira.mp3', 'sfx/vaelira.mp3'], 'Vaelira\'s impact SFX joins once its own windup beat elapses');
  assert.deepEqual(viaCast.seraphineDuringWindup, ['voices/seraphine.mp3'], 'same timing split for Seraphine\'s AOE cast flow');
  assert.deepEqual(viaCast.seraphineAtImpact, ['voices/seraphine.mp3', 'sfx/seraphine.mp3'], 'Seraphine\'s impact SFX joins once its own windup beat elapses');
  assert.deepEqual(viaCast.omegaweaponDuringWindup, ['voices/omegaweapon.mp3'], 'same timing split for Omega Weapon\'s AOE cast flow');
  assert.deepEqual(viaCast.omegaweaponAtImpact, ['voices/omegaweapon.mp3', 'sfx/omegaweapon.mp3'], 'Omega Weapon\'s impact SFX joins once its own windup beat elapses');
  assert.deepEqual(viaCast.shivaDuringWindup, ['voices/shiva.mp3'], 'same timing split for Shiva\'s AOE cast flow');
  assert.deepEqual(viaCast.shivaAtImpact, ['voices/shiva.mp3', 'sfx/shiva.mp3'], 'Shiva\'s impact SFX joins once its own windup beat elapses');
  assert.deepEqual(pageErrors, []);

  await page.close();
});

test('Nyxara Void Dominion identity VFX (one-off test): void aura/darkening/crack/particles ride the existing cast->impact->cleanup lifecycle, chainShake fires despite Void Dominion never setting justFlipped, other cards are unaffected', async () => {
  const { page, pageErrors } = await newPage();

  const result = await page.evaluate(`(async () => {
    ${freshEntrySnippet()}
    const out = {};

    state.phase = 'battle'; // needed so render() takes the renderBattle() branch and actually builds the void-dominion-* markup
    state.board = Array(9).fill(null);
    const src = freshEntry(findCardById('nyxara'), 'blue');
    state.board[0] = src; // top-left cell -> --void-x/--void-y should be ~16.67%
    state.board[1] = freshEntry(findCardById('ogre'), 'red');
    state.wins = { blue: 5, red: 5 };
    state.specialUsed = {};
    state.turn = 'blue';
    runSpecialResolution(0, null, {});

    // Cast phase: darkening + fx wrapper + card aura should all be present,
    // correctly positioned over Nyxara's actual cell (index 0), and the
    // board must NOT be touched yet (matches the existing anticipation-pause
    // guarantee every Ultimate already has).
    const dark = document.querySelector('.void-dominion-dark');
    const fx = document.querySelector('.void-dominion-fx');
    out.darkPresentDuringCast = dark && dark.classList.contains('phase-cast');
    out.fxPresentDuringCast = fx && fx.classList.contains('phase-cast');
    out.fxOriginMatchesCell0 = fx && Math.abs(parseFloat(fx.style.getPropertyValue('--void-x')) - 16.667) < 0.1
      && Math.abs(parseFloat(fx.style.getPropertyValue('--void-y')) - 16.667) < 0.1;
    out.cardHasVoidAura = document.querySelector('.card.void-dominion-casting') !== null;
    out.particleCount = document.querySelectorAll('.void-particle').length;
    out.boardUntouchedDuringCast = state.board[1].owner === 'red';

    await new Promise(r => setTimeout(r, ULTIMATE_WINDUP_MS + 50));

    // Impact phase: effect has landed (destroy, not a capture -- so
    // justFlipped is never set), the crack/darkening switch to their
    // impact-phase classes, and chainShake fires anyway via the explicit
    // Void Dominion opt-in (not the capturedCount>=3 threshold, which would
    // stay 0 here).
    const dark2 = document.querySelector('.void-dominion-dark');
    const fx2 = document.querySelector('.void-dominion-fx');
    out.effectLanded = state.board[1] === null;
    out.darkPresentDuringImpact = dark2 && dark2.classList.contains('phase-impact');
    out.fxPresentDuringImpact = fx2 && fx2.classList.contains('phase-impact');
    out.chainShakeFiredDespiteNoCaptures = state.chainShake === true;

    await new Promise(r => setTimeout(r, ULTIMATE_CLEANUP_MS + 100));

    // Cleanup: everything gone, same as any other Ultimate.
    out.darkGoneAfterCleanup = document.querySelector('.void-dominion-dark') === null;
    out.fxGoneAfterCleanup = document.querySelector('.void-dominion-fx') === null;
    out.chainShakeClearedAfterCleanup = state.chainShake === false;
    out.bannerGoneAfterCleanup = state.ultimateBanner === null;

    // A different Ultimate (Ifrit) must get NONE of this -- it's scoped
    // strictly to Nyxara's card id + her Ultimate's exact name.
    state.board = Array(9).fill(null);
    const ifritSrc = freshEntry(findCardById('ifrit'), 'blue');
    state.board[4] = ifritSrc;
    state.board[1] = freshEntry(findCardById('ogre'), 'red');
    state.wins = { blue: 5, red: 5 };
    state.specialUsed = {};
    state.turn = 'blue';
    runSpecialResolution(4, 1, {});
    out.noVoidVfxForIfrit = document.querySelector('.void-dominion-dark') === null
      && document.querySelector('.void-dominion-fx') === null
      && document.querySelector('.card.void-dominion-casting') === null;

    return out;
  })()`);
  assert.equal(result.darkPresentDuringCast, true, 'the darkening overlay should appear during the cast/windup phase');
  assert.equal(result.fxPresentDuringCast, true, 'the crack/particle wrapper should appear during the cast/windup phase');
  assert.equal(result.fxOriginMatchesCell0, true, "the effect's origin should match Nyxara's actual board cell (index 0 -> ~16.67%/16.67%)");
  assert.equal(result.cardHasVoidAura, true, "Nyxara's own card should get the void-dominion-casting class during her windup");
  assert.equal(result.particleCount, 8, 'all 8 particles should render during the cast phase');
  assert.equal(result.boardUntouchedDuringCast, true, 'the board must stay untouched during the windup, same guarantee every Ultimate already has');
  assert.equal(result.effectLanded, true, "Void Dominion destroys the enemy card once the windup elapses");
  assert.equal(result.darkPresentDuringImpact, true, 'the darkening switches to its impact-phase fade-out');
  assert.equal(result.fxPresentDuringImpact, true, 'the crack/particle wrapper switches to its impact-phase burst');
  assert.equal(result.chainShakeFiredDespiteNoCaptures, true, 'chainShake must fire for Void Dominion even though destroys never set justFlipped (capturedCount stays 0)');
  assert.equal(result.darkGoneAfterCleanup, true);
  assert.equal(result.fxGoneAfterCleanup, true);
  assert.equal(result.chainShakeClearedAfterCleanup, true);
  assert.equal(result.bannerGoneAfterCleanup, true);
  assert.equal(result.noVoidVfxForIfrit, true, "this identity VFX must stay scoped to Nyxara's Void Dominion specifically, not leak onto other Ultimates");
  assert.deepEqual(pageErrors, []);

  await page.close();
});

test('Ifrit Hellfire identity VFX (one-off test): card aura/rumble/blast/target-hit ride the existing cast->impact->cleanup lifecycle, chainShake fires despite a single-target capture never reaching the >=3 threshold, other cards are unaffected', async () => {
  const { page, pageErrors } = await newPage();

  const result = await page.evaluate(`(async () => {
    ${freshEntrySnippet()}
    const out = {};

    state.phase = 'battle'; // needed so render() takes the renderBattle() branch and actually builds the hellfire-* markup
    state.board = Array(9).fill(null);
    const src = freshEntry(findCardById('ifrit'), 'blue');
    state.board[4] = src; // center cell -> --hellfire-x/--hellfire-y should be ~50%/50%
    state.board[1] = freshEntry(findCardById('ogre'), 'red'); // top-middle -> --hellfire-target-x/--hellfire-target-y should be ~50%/16.67%
    state.wins = { blue: 5, red: 5 };
    state.specialUsed = {};
    state.turn = 'blue';
    runSpecialResolution(4, 1, {});

    // Cast phase: card aura + arena rumble + fx wrapper all present, origin
    // matches Ifrit's actual cell, board untouched (same anticipation-pause
    // guarantee every Ultimate already has).
    out.cardHasHellfireAura = document.querySelector('.card.hellfire-casting') !== null;
    out.arenaHasRumbleDuringCast = document.querySelector('.arena-frame.hellfire-rumble') !== null;
    const fx = document.querySelector('.hellfire-fx');
    out.fxPresentDuringCast = fx !== null && fx.classList.contains('phase-cast');
    out.fxOriginMatchesCell4 = fx && Math.abs(parseFloat(fx.style.getPropertyValue('--hellfire-x')) - 50) < 0.1
      && Math.abs(parseFloat(fx.style.getPropertyValue('--hellfire-y')) - 50) < 0.1;
    out.boardUntouchedDuringCast = state.board[1].owner === 'red';

    await new Promise(r => setTimeout(r, ULTIMATE_WINDUP_MS + 50));

    // Impact phase: the rumble is gone (it was cast-phase only), the blast
    // and target-hit both appear, the target position matches the ACTUAL
    // target cell (not Ifrit's own cell), and chainShake fires despite a
    // single-target capture (capturedCount stays at 1, never >= 3).
    out.rumbleGoneAtImpact = document.querySelector('.arena-frame.hellfire-rumble') === null;
    const fx2 = document.querySelector('.hellfire-fx');
    out.fxPresentDuringImpact = fx2 !== null && fx2.classList.contains('phase-impact');
    out.blastPresent = document.querySelector('.hellfire-blast') !== null;
    out.targetHitPresent = document.querySelector('.hellfire-target-hit') !== null;
    out.targetPositionMatchesCell1 = fx2 && Math.abs(parseFloat(fx2.style.getPropertyValue('--hellfire-target-x')) - 50) < 0.1
      && Math.abs(parseFloat(fx2.style.getPropertyValue('--hellfire-target-y')) - 16.667) < 0.1;
    out.effectLanded = state.board[1].owner === 'blue';
    out.chainShakeFiredForSingleTargetCapture = state.chainShake === true;

    await new Promise(r => setTimeout(r, ULTIMATE_CLEANUP_MS + 100));

    out.fxGoneAfterCleanup = document.querySelector('.hellfire-fx') === null;
    out.cardAuraGoneAfterCleanup = document.querySelector('.card.hellfire-casting') === null;
    out.chainShakeClearedAfterCleanup = state.chainShake === false;
    out.bannerGoneAfterCleanup = state.ultimateBanner === null;

    // A different Ultimate (Nyxara) must get NONE of this -- scoped
    // strictly to Ifrit's card id + his Ultimate's exact name.
    state.board = Array(9).fill(null);
    const nyxaraSrc = freshEntry(findCardById('nyxara'), 'blue');
    state.board[0] = nyxaraSrc;
    state.board[1] = freshEntry(findCardById('ogre'), 'red');
    state.wins = { blue: 5, red: 5 };
    state.specialUsed = {};
    state.turn = 'blue';
    runSpecialResolution(0, null, {});
    out.noHellfireVfxForNyxara = document.querySelector('.hellfire-fx') === null
      && document.querySelector('.arena-frame.hellfire-rumble') === null
      && document.querySelector('.card.hellfire-casting') === null;

    return out;
  })()`);
  assert.equal(result.cardHasHellfireAura, true, "Ifrit's own card should get the hellfire-casting class during his windup");
  assert.equal(result.arenaHasRumbleDuringCast, true, 'the arena should get a subtle building rumble during the cast/windup phase');
  assert.equal(result.fxPresentDuringCast, true, 'the blast/target-hit wrapper should appear during the cast/windup phase');
  assert.equal(result.fxOriginMatchesCell4, true, "the effect's origin should match Ifrit's actual board cell (index 4, center -> ~50%/50%)");
  assert.equal(result.boardUntouchedDuringCast, true, 'the board must stay untouched during the windup, same guarantee every Ultimate already has');
  assert.equal(result.rumbleGoneAtImpact, true, 'the rumble is cast-phase only -- the impact beat gets the sharper chain-shake instead, not a continuing rumble');
  assert.equal(result.fxPresentDuringImpact, true, 'the fx wrapper switches to its impact-phase burst');
  assert.equal(result.blastPresent, true, 'the board-wide fire blast should appear at impact');
  assert.equal(result.targetHitPresent, true, 'the target-specific fire hit should appear at impact (Hellfire is single-target, unlike Void Dominion)');
  assert.equal(result.targetPositionMatchesCell1, true, "the target-hit flash's position should match the ACTUAL targeted cell (index 1), not Ifrit's own cell");
  assert.equal(result.effectLanded, true, 'Hellfire captures the targeted enemy card once the windup elapses');
  assert.equal(result.chainShakeFiredForSingleTargetCapture, true, 'chainShake must fire for Hellfire even though a single-target capture never reaches the capturedCount >= 3 threshold');
  assert.equal(result.fxGoneAfterCleanup, true);
  assert.equal(result.cardAuraGoneAfterCleanup, true);
  assert.equal(result.chainShakeClearedAfterCleanup, true);
  assert.equal(result.bannerGoneAfterCleanup, true);
  assert.equal(result.noHellfireVfxForNyxara, true, "this identity VFX must stay scoped to Ifrit's Hellfire specifically, not leak onto other Ultimates");
  assert.deepEqual(pageErrors, []);

  await page.close();
});

test('Vaelira Infernal Pact identity VFX (one-off test): card aura/sigil/wave/per-enemy hits ride the existing cast->impact->cleanup lifecycle, chainShake fires despite destroy never setting justFlipped, hit count matches the actual number of enemies present at cast time, synced with her impact SFX, other cards are unaffected', async () => {
  const { page, pageErrors } = await newPage();

  const result = await page.evaluate(`(async () => {
    ${freshEntrySnippet()}
    const out = {};

    state.phase = 'battle'; // needed so render() takes the renderBattle() branch and actually builds the infernal-pact-* markup
    const playCalls = [];
    const OrigAudio = window.Audio;
    window.Audio = function(src){
      playCalls.push(src);
      return { volume: 1, play: () => Promise.resolve() };
    };

    state.board = Array(9).fill(null);
    const src = freshEntry(findCardById('vaelira'), 'blue');
    state.board[4] = src; // center cell -> --pact-x/--pact-y should be ~50%/50%
    state.board[1] = freshEntry(findCardById('ogre'), 'red');
    state.board[7] = freshEntry(findCardById('ogre'), 'red'); // two enemies, to verify hit-flash count matches
    state.wins = { blue: 5, red: 5 };
    state.specialUsed = {};
    state.turn = 'blue';
    runSpecialResolution(4, null, {}); // AOE, mirrors executeSpecial

    // Cast phase: card aura + sigil + fx wrapper (with its 8 particles) all
    // present, origin matches Vaelira's actual cell, board untouched.
    out.cardHasPactAura = document.querySelector('.card.infernal-pact-casting') !== null;
    const fx = document.querySelector('.infernal-pact-fx');
    out.fxPresentDuringCast = fx !== null && fx.classList.contains('phase-cast');
    out.fxOriginMatchesCell4 = fx && Math.abs(parseFloat(fx.style.getPropertyValue('--pact-x')) - 50) < 0.1
      && Math.abs(parseFloat(fx.style.getPropertyValue('--pact-y')) - 50) < 0.1;
    out.particleCount = document.querySelectorAll('.infernal-pact-particle').length;
    // The hit-flash elements exist in the DOM during cast too (same pattern
    // as hellfire-target-hit) -- their own base class starts at opacity:0
    // and only the .phase-impact CSS selector triggers the animation that
    // makes them visible, so "not active yet" is what's actually true here,
    // not "not present".
    const castHits = [...document.querySelectorAll('.infernal-pact-hit')];
    out.hitFlashesInvisibleDuringCast = castHits.length === 2 && castHits.every(h => getComputedStyle(h).opacity === '0');
    out.boardUntouchedDuringCast = state.board[1].owner === 'red' && state.board[7].owner === 'red';

    await new Promise(r => setTimeout(r, ULTIMATE_WINDUP_MS + 50));

    // Impact phase: wave present, exactly ONE hit-flash per enemy that was
    // actually on the board at cast time (2 here), chainShake fires despite
    // a destroy-based AOE never setting justFlipped, and the impact SFX
    // (added earlier this session) fires in the SAME beat as this markup --
    // the "synced with the Ultimate sound" part of the brief.
    const fx2 = document.querySelector('.infernal-pact-fx');
    out.fxPresentDuringImpact = fx2 !== null && fx2.classList.contains('phase-impact');
    out.wavePresent = document.querySelector('.infernal-pact-wave') !== null;
    out.hitCountMatchesEnemyCount = document.querySelectorAll('.infernal-pact-hit').length === 2;
    out.effectLanded = state.board[1] === null && state.board[7] === null;
    out.chainShakeFiredDespiteDestroy = state.chainShake === true;
    out.impactSfxSyncedWithVfx = playCalls.includes('sfx/vaelira.mp3');

    await new Promise(r => setTimeout(r, ULTIMATE_CLEANUP_MS + 100));

    out.fxGoneAfterCleanup = document.querySelector('.infernal-pact-fx') === null;
    out.cardAuraGoneAfterCleanup = document.querySelector('.card.infernal-pact-casting') === null;
    out.chainShakeClearedAfterCleanup = state.chainShake === false;
    out.bannerGoneAfterCleanup = state.ultimateBanner === null;

    // A different Ultimate (Nyxara, same destroy-AOE shape) must get NONE
    // of this -- scoped strictly to Vaelira's card id + her exact Ultimate
    // name, not "any AOE destroy".
    state.board = Array(9).fill(null);
    const nyxaraSrc = freshEntry(findCardById('nyxara'), 'blue');
    state.board[0] = nyxaraSrc;
    state.board[1] = freshEntry(findCardById('ogre'), 'red');
    state.wins = { blue: 5, red: 5 };
    state.specialUsed = {};
    state.turn = 'blue';
    runSpecialResolution(0, null, {});
    out.noPactVfxForNyxara = document.querySelector('.infernal-pact-fx') === null
      && document.querySelector('.card.infernal-pact-casting') === null;

    window.Audio = OrigAudio;
    return out;
  })()`);
  assert.equal(result.cardHasPactAura, true, "Vaelira's own card should get the infernal-pact-casting class (and its sigil ring) during her windup");
  assert.equal(result.fxPresentDuringCast, true, 'the wave/particle wrapper should appear during the cast/windup phase');
  assert.equal(result.fxOriginMatchesCell4, true, "the effect's origin should match Vaelira's actual board cell (index 4, center -> ~50%/50%)");
  assert.equal(result.particleCount, 8, 'all 8 particles should render during the cast phase');
  assert.equal(result.hitFlashesInvisibleDuringCast, true, 'the per-enemy hit-flash elements exist (2, matching the enemy count) but stay invisible until the impact-phase CSS class triggers their animation');
  assert.equal(result.boardUntouchedDuringCast, true, 'the board must stay untouched during the windup, same guarantee every Ultimate already has');
  assert.equal(result.fxPresentDuringImpact, true, 'the fx wrapper switches to its impact-phase burst');
  assert.equal(result.wavePresent, true, 'the board-wide crimson wave should appear at impact');
  assert.equal(result.hitCountMatchesEnemyCount, true, 'exactly one hit-flash per enemy actually present at cast time (2 here), not a fixed count');
  assert.equal(result.effectLanded, true, "Infernal Pact destroys both enemy cards once the windup elapses");
  assert.equal(result.chainShakeFiredDespiteDestroy, true, 'chainShake must fire for Infernal Pact even though destroy-based AOE never sets justFlipped (capturedCount stays 0)');
  assert.equal(result.impactSfxSyncedWithVfx, true, "the impact SFX (sfx/vaelira.mp3) must fire in the SAME beat as the visual impact, per the brief's sync requirement");
  assert.equal(result.fxGoneAfterCleanup, true);
  assert.equal(result.cardAuraGoneAfterCleanup, true);
  assert.equal(result.chainShakeClearedAfterCleanup, true);
  assert.equal(result.bannerGoneAfterCleanup, true);
  assert.equal(result.noPactVfxForNyxara, true, "this identity VFX must stay scoped to Vaelira's Infernal Pact specifically, not leak onto other destroy-based AOE Ultimates");
  assert.deepEqual(pageErrors, []);

  await page.close();
});

test('Seraphine Silver Judgment identity VFX (one-off test): card aura/beams/sparkles/per-enemy hits/wave/flash ride the existing cast->impact->cleanup lifecycle, beam angles point at the correct cells, chainShake fires despite destroy never setting justFlipped, synced with her impact SFX, other cards are unaffected', async () => {
  const { page, pageErrors } = await newPage();

  const result = await page.evaluate(`(async () => {
    ${freshEntrySnippet()}
    const out = {};

    state.phase = 'battle'; // needed so render() takes the renderBattle() branch and actually builds the silver-judgment-* markup
    const playCalls = [];
    const OrigAudio = window.Audio;
    window.Audio = function(src){
      playCalls.push(src);
      return { volume: 1, play: () => Promise.resolve() };
    };

    state.board = Array(9).fill(null);
    const src = freshEntry(findCardById('seraphine'), 'blue');
    state.board[4] = src; // center cell -> --sj-x/--sj-y should be ~50%/50%
    state.board[0] = freshEntry(findCardById('ogre'), 'red'); // top-left
    state.board[7] = freshEntry(findCardById('ogre'), 'red'); // bottom-middle, straight down from center
    state.wins = { blue: 5, red: 5 };
    state.specialUsed = {};
    state.turn = 'blue';
    runSpecialResolution(4, null, {}); // AOE, mirrors executeSpecial

    // Cast phase: card aura + fx wrapper (with one beam per enemy) all
    // present, origin matches Seraphine's actual cell, board untouched.
    out.cardHasAura = document.querySelector('.card.silver-judgment-casting') !== null;
    const fx = document.querySelector('.silver-judgment-fx');
    out.fxPresentDuringCast = fx !== null && fx.classList.contains('phase-cast');
    out.fxOriginMatchesCell4 = fx && Math.abs(parseFloat(fx.style.getPropertyValue('--sj-x')) - 50) < 0.1
      && Math.abs(parseFloat(fx.style.getPropertyValue('--sj-y')) - 50) < 0.1;
    out.beamCount = document.querySelectorAll('.silver-judgment-beam').length;
    // The bottom-middle enemy (cell 7) is straight down from the center
    // (cell 4) -- same X, so its beam should point at exactly 90deg. This
    // catches a sign/axis error in the atan2 math that a mere "does an
    // element exist" check would miss.
    const beams = [...document.querySelectorAll('.silver-judgment-beam')];
    out.oneBeamPointsStraightDown = beams.some(b => b.style.transform.includes('90deg') && !b.style.transform.includes('-90deg'));
    out.boardUntouchedDuringCast = state.board[0].owner === 'red' && state.board[7].owner === 'red';

    await new Promise(r => setTimeout(r, ULTIMATE_WINDUP_MS + 50));

    // Impact phase: hit count matches the enemy count, wave and flash both
    // appear, both enemies destroyed, chainShake fires despite a
    // destroy-based AOE never setting justFlipped, and the impact SFX
    // fires in the same beat -- the brief's "synka med ljudet" requirement.
    const fx2 = document.querySelector('.silver-judgment-fx');
    out.fxPresentDuringImpact = fx2 !== null && fx2.classList.contains('phase-impact');
    out.hitCountMatchesEnemyCount = document.querySelectorAll('.silver-judgment-hit').length === 2;
    out.wavePresent = document.querySelector('.silver-judgment-wave') !== null;
    out.flashPresent = document.querySelector('.silver-judgment-flash.phase-impact') !== null;
    out.effectLanded = state.board[0] === null && state.board[7] === null;
    out.chainShakeFiredDespiteDestroy = state.chainShake === true;
    out.impactSfxSyncedWithVfx = playCalls.includes('sfx/seraphine.mp3');

    await new Promise(r => setTimeout(r, ULTIMATE_CLEANUP_MS + 100));

    out.fxGoneAfterCleanup = document.querySelector('.silver-judgment-fx') === null;
    out.flashGoneAfterCleanup = document.querySelector('.silver-judgment-flash') === null;
    out.cardAuraGoneAfterCleanup = document.querySelector('.card.silver-judgment-casting') === null;
    out.chainShakeClearedAfterCleanup = state.chainShake === false;
    out.bannerGoneAfterCleanup = state.ultimateBanner === null;

    // A different destroy-based AOE Ultimate (Vaelira) must get NONE of
    // this -- scoped strictly to Seraphine's card id + her exact Ultimate
    // name, not "any destroy-AOE".
    state.board = Array(9).fill(null);
    const vaeliraSrc = freshEntry(findCardById('vaelira'), 'blue');
    state.board[4] = vaeliraSrc;
    state.board[1] = freshEntry(findCardById('ogre'), 'red');
    state.wins = { blue: 5, red: 5 };
    state.specialUsed = {};
    state.turn = 'blue';
    runSpecialResolution(4, null, {});
    out.noSilverJudgmentVfxForVaelira = document.querySelector('.silver-judgment-fx') === null
      && document.querySelector('.silver-judgment-flash') === null
      && document.querySelector('.card.silver-judgment-casting') === null;

    window.Audio = OrigAudio;
    return out;
  })()`);
  assert.equal(result.cardHasAura, true, "Seraphine's own card should get the silver-judgment-casting class (and its rings) during her windup");
  assert.equal(result.fxPresentDuringCast, true, 'the beam/sparkle wrapper should appear during the cast/windup phase');
  assert.equal(result.fxOriginMatchesCell4, true, "the effect's origin should match Seraphine's actual board cell (index 4, center -> ~50%/50%)");
  assert.equal(result.beamCount, 2, 'one beam per enemy actually present at cast time');
  assert.equal(result.oneBeamPointsStraightDown, true, 'the beam toward the straight-down enemy (same X as Seraphine) should compute exactly 90deg -- catches an axis/sign error in the angle math');
  assert.equal(result.boardUntouchedDuringCast, true, 'the board must stay untouched during the windup, same guarantee every Ultimate already has');
  assert.equal(result.fxPresentDuringImpact, true, 'the fx wrapper switches to its impact-phase burst');
  assert.equal(result.hitCountMatchesEnemyCount, true, 'exactly one hit-flash per enemy actually present at cast time, not a fixed count');
  assert.equal(result.wavePresent, true, 'the final board-wide wave should appear at impact');
  assert.equal(result.flashPresent, true, 'the soft full-frame flash should appear at impact');
  assert.equal(result.effectLanded, true, 'Silver Judgment destroys both enemy cards once the windup elapses');
  assert.equal(result.chainShakeFiredDespiteDestroy, true, 'chainShake must fire for Silver Judgment even though destroy-based AOE never sets justFlipped (capturedCount stays 0)');
  assert.equal(result.impactSfxSyncedWithVfx, true, "the impact SFX (sfx/seraphine.mp3) must fire in the SAME beat as the visual impact, per the brief's sync requirement");
  assert.equal(result.fxGoneAfterCleanup, true);
  assert.equal(result.flashGoneAfterCleanup, true);
  assert.equal(result.cardAuraGoneAfterCleanup, true);
  assert.equal(result.chainShakeClearedAfterCleanup, true);
  assert.equal(result.bannerGoneAfterCleanup, true);
  assert.equal(result.noSilverJudgmentVfxForVaelira, true, "this identity VFX must stay scoped to Seraphine's Silver Judgment specifically, not leak onto other destroy-based AOE Ultimates");
  assert.deepEqual(pageErrors, []);

  await page.close();
});

test('Omega Weapon Omega Protocol identity VFX (one-off test): card aura/targeting reticles/blast/explosions/flash ride the existing cast->impact->cleanup lifecycle, reticle count matches enemy count during cast (before hits exist), chainShake fires despite conditional destroy never setting justFlipped, other cards are unaffected', async () => {
  const { page, pageErrors } = await newPage();

  const result = await page.evaluate(`(async () => {
    ${freshEntrySnippet()}
    const out = {};

    state.phase = 'battle'; // needed so render() takes the renderBattle() branch and actually builds the omega-protocol-* markup
    state.board = Array(9).fill(null);
    const src = freshEntry(findCardById('omegaweapon'), 'blue');
    state.board[4] = src; // center cell -> --op-x/--op-y should be ~50%/50%
    state.board[0] = freshEntry(findCardById('ogre'), 'red');
    state.board[7] = freshEntry(findCardById('ogre'), 'red');
    state.wins = { blue: 5, red: 5 };
    state.specialUsed = {};
    state.turn = 'blue';
    runSpecialResolution(4, null, {}); // AOE, mirrors executeSpecial

    // Cast phase: card aura + fx wrapper + one targeting reticle PER ENEMY
    // (the "lock-on" beat, unique to this card -- no other Ultimate puts
    // markup on enemies before impact) all present, origin matches Omega
    // Weapon's actual cell, no hit-explosions yet (those are impact-only),
    // board untouched.
    out.cardHasAura = document.querySelector('.card.omega-protocol-casting') !== null;
    const fx = document.querySelector('.omega-protocol-fx');
    out.fxPresentDuringCast = fx !== null && fx.classList.contains('phase-cast');
    out.fxOriginMatchesCell4 = fx && Math.abs(parseFloat(fx.style.getPropertyValue('--op-x')) - 50) < 0.1
      && Math.abs(parseFloat(fx.style.getPropertyValue('--op-y')) - 50) < 0.1;
    out.targetReticleCountMatchesEnemyCount = document.querySelectorAll('.omega-protocol-target').length === 2;
    // The hit-explosion elements exist in the DOM during cast too (same
    // pattern as hellfire-target-hit/infernal-pact-hit) -- their own base
    // class starts at opacity:0 and only the .phase-impact CSS selector
    // triggers the animation that makes them visible, so "not active yet"
    // is what's actually true here, not "not present".
    const castHits = [...document.querySelectorAll('.omega-protocol-hit')];
    out.hitsInvisibleDuringCast = castHits.length === 2 && castHits.every(h => getComputedStyle(h).opacity === '0');
    out.boardUntouchedDuringCast = state.board[0].owner === 'red' && state.board[7].owner === 'red';

    await new Promise(r => setTimeout(r, ULTIMATE_WINDUP_MS + 50));

    // Impact phase: blast + explosion hits (one per enemy) + flash all
    // appear, both weak enemies destroyed, chainShake fires despite Omega
    // Protocol's conditional destroy never setting justFlipped.
    const fx2 = document.querySelector('.omega-protocol-fx');
    out.fxPresentDuringImpact = fx2 !== null && fx2.classList.contains('phase-impact');
    out.blastPresent = document.querySelector('.omega-protocol-blast') !== null;
    out.hitCountMatchesEnemyCount = document.querySelectorAll('.omega-protocol-hit').length === 2;
    out.flashPresent = document.querySelector('.omega-protocol-flash.phase-impact') !== null;
    out.effectLanded = state.board[0] === null && state.board[7] === null;
    out.chainShakeFiredDespiteConditionalDestroy = state.chainShake === true;

    await new Promise(r => setTimeout(r, ULTIMATE_CLEANUP_MS + 100));

    out.fxGoneAfterCleanup = document.querySelector('.omega-protocol-fx') === null;
    out.flashGoneAfterCleanup = document.querySelector('.omega-protocol-flash') === null;
    out.cardAuraGoneAfterCleanup = document.querySelector('.card.omega-protocol-casting') === null;
    out.chainShakeClearedAfterCleanup = state.chainShake === false;
    out.bannerGoneAfterCleanup = state.ultimateBanner === null;

    // A different destroy-based AOE Ultimate (Seraphine) must get NONE of
    // this -- scoped strictly to Omega Weapon's card id + its exact
    // Ultimate name.
    state.board = Array(9).fill(null);
    const seraphineSrc = freshEntry(findCardById('seraphine'), 'blue');
    state.board[4] = seraphineSrc;
    state.board[1] = freshEntry(findCardById('ogre'), 'red');
    state.wins = { blue: 5, red: 5 };
    state.specialUsed = {};
    state.turn = 'blue';
    runSpecialResolution(4, null, {});
    out.noOmegaProtocolVfxForSeraphine = document.querySelector('.omega-protocol-fx') === null
      && document.querySelector('.omega-protocol-flash') === null
      && document.querySelector('.card.omega-protocol-casting') === null;

    return out;
  })()`);
  assert.equal(result.cardHasAura, true, "Omega Weapon's own card should get the omega-protocol-casting class (and its contracting rings) during its windup");
  assert.equal(result.fxPresentDuringCast, true, 'the targeting/blast wrapper should appear during the cast/windup phase');
  assert.equal(result.fxOriginMatchesCell4, true, "the effect's origin should match Omega Weapon's actual board cell (index 4, center -> ~50%/50%)");
  assert.equal(result.targetReticleCountMatchesEnemyCount, true, 'one targeting reticle per enemy actually present at cast time');
  assert.equal(result.hitsInvisibleDuringCast, true, 'the per-enemy explosion elements exist (2, matching the enemy count) but stay invisible until the impact-phase CSS class triggers their animation');
  assert.equal(result.boardUntouchedDuringCast, true, 'the board must stay untouched during the windup, same guarantee every Ultimate already has');
  assert.equal(result.fxPresentDuringImpact, true, 'the fx wrapper switches to its impact-phase burst');
  assert.equal(result.blastPresent, true, 'the massive central blast should appear at impact');
  assert.equal(result.hitCountMatchesEnemyCount, true, 'exactly one explosion hit per enemy actually present at cast time, not a fixed count');
  assert.equal(result.flashPresent, true, 'the punchy full-frame flash should appear at impact');
  assert.equal(result.effectLanded, true, 'Omega Protocol destroys both weak enemy cards once the windup elapses');
  assert.equal(result.chainShakeFiredDespiteConditionalDestroy, true, 'chainShake must fire for Omega Protocol even though its conditional destroy never sets justFlipped (capturedCount stays 0)');
  assert.equal(result.fxGoneAfterCleanup, true);
  assert.equal(result.flashGoneAfterCleanup, true);
  assert.equal(result.cardAuraGoneAfterCleanup, true);
  assert.equal(result.chainShakeClearedAfterCleanup, true);
  assert.equal(result.bannerGoneAfterCleanup, true);
  assert.equal(result.noOmegaProtocolVfxForSeraphine, true, "this identity VFX must stay scoped to Omega Weapon's Omega Protocol specifically, not leak onto other destroy-based AOE Ultimates");
  assert.deepEqual(pageErrors, []);

  await page.close();
});

test('Shiva Diamond Storm identity VFX (one-off test): card aura/shard rails/fragments/hits/wave/flash ride the existing cast->impact->cleanup lifecycle, rail/hit count matches enemy count, chainShake fires despite a plain AOE debuff never setting justFlipped, other cards are unaffected', async () => {
  const { page, pageErrors } = await newPage();

  const result = await page.evaluate(`(async () => {
    ${freshEntrySnippet()}
    const out = {};

    state.phase = 'battle'; // needed so render() takes the renderBattle() branch and actually builds the diamond-storm-* markup
    state.board = Array(9).fill(null);
    const src = freshEntry(findCardById('shiva'), 'blue');
    state.board[4] = src; // center cell -> --ds-x/--ds-y should be ~50%/50%
    state.board[0] = freshEntry({ id:'e0', name:'E0', top:1,right:1,bottom:1,left:1 }, 'red');
    state.board[7] = freshEntry({ id:'e7', name:'E7', top:1,right:1,bottom:1,left:1 }, 'red');
    state.wins = { blue: 5, red: 5 };
    state.specialUsed = {};
    state.turn = 'blue';
    runSpecialResolution(4, null, {}); // AOE, mirrors executeSpecial

    // Cast phase: card aura + fx wrapper + one rail PER ENEMY, fixed 8
    // fragments always present, origin matches Shiva's actual cell, no
    // hit-bursts visible yet (impact-only), board untouched.
    out.cardHasAura = document.querySelector('.card.diamond-storm-casting') !== null;
    const fx = document.querySelector('.diamond-storm-fx');
    out.fxPresentDuringCast = fx !== null && fx.classList.contains('phase-cast');
    out.fxOriginMatchesCell4 = fx && Math.abs(parseFloat(fx.style.getPropertyValue('--ds-x')) - 50) < 0.1
      && Math.abs(parseFloat(fx.style.getPropertyValue('--ds-y')) - 50) < 0.1;
    out.railCountMatchesEnemyCount = document.querySelectorAll('.diamond-storm-rail').length === 2;
    out.shardCountMatchesTwoPerRail = document.querySelectorAll('.diamond-storm-shard').length === 4;
    out.fragmentCount = document.querySelectorAll('.diamond-storm-fragment').length;
    // Same pattern as every other AOE identity-VFX card's hit elements:
    // they exist in the DOM during cast too, just invisible (opacity:0)
    // until the .phase-impact CSS selector triggers their animation.
    const castHits = [...document.querySelectorAll('.diamond-storm-hit')];
    out.hitsInvisibleDuringCast = castHits.length === 2 && castHits.every(h => getComputedStyle(h).opacity === '0');
    out.boardUntouchedDuringCast = state.board[0].owner === 'red' && state.board[7].owner === 'red';

    await new Promise(r => setTimeout(r, ULTIMATE_WINDUP_MS + 50));

    // Impact phase: hit bursts (one per enemy) + wave + flash all appear,
    // both enemies debuffed and Shiva buffed (a plain AOE debuff, not a
    // destroy or a capture), chainShake fires despite that.
    const fx2 = document.querySelector('.diamond-storm-fx');
    out.fxPresentDuringImpact = fx2 !== null && fx2.classList.contains('phase-impact');
    out.hitCountMatchesEnemyCount = document.querySelectorAll('.diamond-storm-hit').length === 2;
    out.wavePresent = document.querySelector('.diamond-storm-wave') !== null;
    out.flashPresent = document.querySelector('.diamond-storm-flash.phase-impact') !== null;
    out.effectLanded = state.board[0].captureBonus === -3 && state.board[7].captureBonus === -3 && src.captureBonus === 3;
    out.chainShakeFiredDespitePlainDebuff = state.chainShake === true;

    await new Promise(r => setTimeout(r, ULTIMATE_CLEANUP_MS + 100));

    out.fxGoneAfterCleanup = document.querySelector('.diamond-storm-fx') === null;
    out.flashGoneAfterCleanup = document.querySelector('.diamond-storm-flash') === null;
    out.cardAuraGoneAfterCleanup = document.querySelector('.card.diamond-storm-casting') === null;
    out.chainShakeClearedAfterCleanup = state.chainShake === false;
    out.bannerGoneAfterCleanup = state.ultimateBanner === null;

    // A different plain-AOE-debuff Ultimate (Ancient Wyrmking's Conquests
    // Witnessed) must get NONE of this -- scoped strictly to Shiva's card
    // id + its exact Ultimate name.
    state.board = Array(9).fill(null);
    const dragonSrc = freshEntry(findCardById('dragon'), 'blue');
    state.board[4] = dragonSrc;
    state.board[1] = freshEntry(findCardById('ogre'), 'red');
    state.wins = { blue: 5, red: 5 };
    state.specialUsed = {};
    state.turn = 'blue';
    runSpecialResolution(4, null, {});
    out.noDiamondStormVfxForDragon = document.querySelector('.diamond-storm-fx') === null
      && document.querySelector('.diamond-storm-flash') === null
      && document.querySelector('.card.diamond-storm-casting') === null;

    return out;
  })()`);
  assert.equal(result.cardHasAura, true, "Shiva's own card should get the diamond-storm-casting class (and its accelerating rings) during her windup");
  assert.equal(result.fxPresentDuringCast, true, 'the shard/fragment wrapper should appear during the cast/windup phase');
  assert.equal(result.fxOriginMatchesCell4, true, "the effect's origin should match Shiva's actual board cell (index 4, center -> ~50%/50%)");
  assert.equal(result.railCountMatchesEnemyCount, true, 'one shard rail per enemy actually present at cast time');
  assert.equal(result.shardCountMatchesTwoPerRail, true, 'two shard sparkles per rail (denser crystal storm than a single sparkle)');
  assert.equal(result.fragmentCount, 8, 'the fixed set of 8 larger crystal fragments around the cards should always be present');
  assert.equal(result.hitsInvisibleDuringCast, true, 'the per-enemy crystal-impact elements exist (2, matching the enemy count) but stay invisible until the impact-phase CSS class triggers their animation');
  assert.equal(result.boardUntouchedDuringCast, true, 'the board must stay untouched during the windup, same guarantee every Ultimate already has');
  assert.equal(result.fxPresentDuringImpact, true, 'the fx wrapper switches to its impact-phase burst');
  assert.equal(result.hitCountMatchesEnemyCount, true, 'exactly one crystal-impact per enemy actually present at cast time, not a fixed count');
  assert.equal(result.wavePresent, true, 'the final crystal wave should appear at impact');
  assert.equal(result.flashPresent, true, 'the soft icy full-frame flash should appear at impact');
  assert.equal(result.effectLanded, true, "Diamond Storm's actual mechanic (AOE debuff + self-buff) still applies once the windup elapses");
  assert.equal(result.chainShakeFiredDespitePlainDebuff, true, 'chainShake must fire for Diamond Storm even though a plain AOE debuff never sets justFlipped (capturedCount stays 0)');
  assert.equal(result.fxGoneAfterCleanup, true);
  assert.equal(result.flashGoneAfterCleanup, true);
  assert.equal(result.cardAuraGoneAfterCleanup, true);
  assert.equal(result.chainShakeClearedAfterCleanup, true);
  assert.equal(result.bannerGoneAfterCleanup, true);
  assert.equal(result.noDiamondStormVfxForDragon, true, "this identity VFX must stay scoped to Shiva's Diamond Storm specifically, not leak onto other plain-AOE-debuff Ultimates");
  assert.deepEqual(pageErrors, []);

  await page.close();
});

test('Bahamut Megaflare identity VFX (one-off test): card aura/charge/sweep/hits/wave/stars/flash ride the existing cast->impact->cleanup lifecycle, sweep origin matches his cell, hit count matches enemy count, chainShake fires despite destroy never setting justFlipped, other cards are unaffected', async () => {
  const { page, pageErrors } = await newPage();

  const result = await page.evaluate(`(async () => {
    ${freshEntrySnippet()}
    const out = {};

    state.phase = 'battle'; // needed so render() takes the renderBattle() branch and actually builds the megaflare-* markup
    state.board = Array(9).fill(null);
    const src = freshEntry(findCardById('bahamut'), 'blue');
    state.board[4] = src; // center cell -> --mf-x/--mf-y should be ~50%/50%
    state.board[0] = freshEntry({ id:'e0', name:'E0', top:1,right:1,bottom:1,left:1 }, 'red');
    state.board[5] = freshEntry({ id:'e5', name:'E5', top:1,right:1,bottom:1,left:1 }, 'red');
    state.wins = { blue: 5, red: 5 };
    state.specialUsed = {};
    state.turn = 'blue';
    runSpecialResolution(4, null, {}); // AOE, mirrors executeSpecial

    // Cast phase: card aura + fx wrapper + the charging core at his own
    // cell, origin matches Bahamut's actual cell, no sweep/hits yet
    // (impact-only), board untouched.
    out.cardHasAura = document.querySelector('.card.megaflare-casting') !== null;
    const fx = document.querySelector('.megaflare-fx');
    out.fxPresentDuringCast = fx !== null && fx.classList.contains('phase-cast');
    out.fxOriginMatchesCell4 = fx && Math.abs(parseFloat(fx.style.getPropertyValue('--mf-x')) - 50) < 0.1
      && Math.abs(parseFloat(fx.style.getPropertyValue('--mf-y')) - 50) < 0.1;
    out.chargePresentDuringCast = document.querySelector('.megaflare-charge') !== null;
    // Same pattern as every other AOE identity-VFX card's hit elements:
    // they exist in the DOM during cast too, just invisible (opacity:0)
    // until the .phase-impact CSS selector triggers their animation.
    const castHits = [...document.querySelectorAll('.megaflare-hit')];
    out.hitsInvisibleDuringCast = castHits.length === 2 && castHits.every(h => getComputedStyle(h).opacity === '0');
    out.boardUntouchedDuringCast = state.board[0].owner === 'red' && state.board[5].owner === 'red';

    await new Promise(r => setTimeout(r, ULTIMATE_WINDUP_MS + 50));

    // Impact phase: the full-width sweep + hit bursts (one per enemy) +
    // board-wide wave + lingering stars + flash all appear, both enemies
    // destroyed, chainShake fires despite Megaflare's destroy never
    // setting justFlipped.
    const fx2 = document.querySelector('.megaflare-fx');
    out.fxPresentDuringImpact = fx2 !== null && fx2.classList.contains('phase-impact');
    out.sweepPresent = document.querySelector('.megaflare-sweep') !== null;
    out.hitCountMatchesEnemyCount = document.querySelectorAll('.megaflare-hit').length === 2;
    out.wavePresent = document.querySelector('.megaflare-wave') !== null;
    out.starCount = document.querySelectorAll('.megaflare-star').length;
    out.flashPresent = document.querySelector('.megaflare-flash.phase-impact') !== null;
    out.effectLanded = state.board[0] === null && state.board[5] === null;
    out.chainShakeFiredDespiteDestroy = state.chainShake === true;

    await new Promise(r => setTimeout(r, ULTIMATE_CLEANUP_MS + 100));

    out.fxGoneAfterCleanup = document.querySelector('.megaflare-fx') === null;
    out.flashGoneAfterCleanup = document.querySelector('.megaflare-flash') === null;
    out.cardAuraGoneAfterCleanup = document.querySelector('.card.megaflare-casting') === null;
    out.chainShakeClearedAfterCleanup = state.chainShake === false;
    out.bannerGoneAfterCleanup = state.ultimateBanner === null;

    // A different destroy-based AOE Ultimate (Nyxara's Void Dominion) must
    // get NONE of this -- scoped strictly to Bahamut's card id + its
    // exact Ultimate name.
    state.board = Array(9).fill(null);
    const nyxaraSrc = freshEntry(findCardById('nyxara'), 'blue');
    state.board[4] = nyxaraSrc;
    state.board[1] = freshEntry(findCardById('ogre'), 'red');
    state.wins = { blue: 5, red: 5 };
    state.specialUsed = {};
    state.turn = 'blue';
    runSpecialResolution(4, null, {});
    out.noMegaflareVfxForNyxara = document.querySelector('.megaflare-fx') === null
      && document.querySelector('.megaflare-flash') === null
      && document.querySelector('.card.megaflare-casting') === null;

    return out;
  })()`);
  assert.equal(result.cardHasAura, true, "Bahamut's own card should get the megaflare-casting class (and its ring + swelling core) during his windup");
  assert.equal(result.fxPresentDuringCast, true, 'the charge/sweep wrapper should appear during the cast/windup phase');
  assert.equal(result.fxOriginMatchesCell4, true, "the effect's origin should match Bahamut's actual board cell (index 4, center -> ~50%/50%)");
  assert.equal(result.chargePresentDuringCast, true, 'the swelling energy core should be present at his own cell during cast');
  assert.equal(result.hitsInvisibleDuringCast, true, 'the per-enemy impact elements exist (2, matching the enemy count) but stay invisible until the impact-phase CSS class triggers their animation');
  assert.equal(result.boardUntouchedDuringCast, true, 'the board must stay untouched during the windup, same guarantee every Ultimate already has');
  assert.equal(result.fxPresentDuringImpact, true, 'the fx wrapper switches to its impact-phase burst');
  assert.equal(result.sweepPresent, true, 'the full-width sweeping beam should appear at impact');
  assert.equal(result.hitCountMatchesEnemyCount, true, 'exactly one impact per enemy actually present at cast time, not a fixed count');
  assert.equal(result.wavePresent, true, 'the final board-wide cosmic wave should appear at impact');
  assert.equal(result.starCount, 6, 'the fixed set of 6 lingering star particles should always be present');
  assert.equal(result.flashPresent, true, 'the bright full-frame flash should appear at impact');
  assert.equal(result.effectLanded, true, 'Megaflare destroys both enemy cards once the windup elapses');
  assert.equal(result.chainShakeFiredDespiteDestroy, true, "chainShake must fire for Megaflare even though its destroy-all-enemies effect never sets justFlipped (capturedCount stays 0)");
  assert.equal(result.fxGoneAfterCleanup, true);
  assert.equal(result.flashGoneAfterCleanup, true);
  assert.equal(result.cardAuraGoneAfterCleanup, true);
  assert.equal(result.chainShakeClearedAfterCleanup, true);
  assert.equal(result.bannerGoneAfterCleanup, true);
  assert.equal(result.noMegaflareVfxForNyxara, true, "this identity VFX must stay scoped to Bahamut's Megaflare specifically, not leak onto other destroy-based AOE Ultimates");
  assert.deepEqual(pageErrors, []);

  await page.close();
});

test('Odin normal-attack Slash VFX (one-off test): a lightning trail/impact/sparks ride an ordinary attack (not an Ultimate -- no cast/impact banner involved), oriented from his cell to the actual target, staggered across multiple simultaneous battles, chainShake fires, cleaned up on the existing 1300ms schedule, other cards attacking normally are unaffected', async () => {
  const { page, pageErrors } = await newPage();

  const result = await page.evaluate(`(async () => {
    ${freshEntrySnippet()}
    const out = {};

    state.phase = 'battle'; // needed so render() takes the renderBattle() branch and actually builds the odin-slash-* markup
    state.board = Array(9).fill(null);
    state.playerHand = []; state.enemyHand = [];
    state.wins = { blue: 0, red: 0 };
    state.specialUsed = {};
    state.turn = 'blue';
    // Odin lands at center (index 4) with a weak enemy directly above
    // (index 1) and another to the right (index 5) -- battles both at
    // once, same as a real multi-neighbor placement.
    state.board[1] = { card: { id:'w1', name:'W1', top:1,right:1,bottom:1,left:1 }, owner:'red', captureBonus:0 };
    state.board[5] = { card: { id:'w2', name:'W2', top:1,right:1,bottom:1,left:1 }, owner:'red', captureBonus:0 };
    state.playerHand = [findCardById('odin')];
    placeCard(4, 'odin', 'blue');

    out.slashesRecorded = state.odinSlashes.length;
    const fx = document.querySelector('.odin-slash-fx');
    out.fxExists = fx !== null;
    out.railCountMatchesBattleCount = document.querySelectorAll('.odin-slash-rail').length === 2;
    out.impactCountMatchesBattleCount = document.querySelectorAll('.odin-slash-impact').length === 2;
    out.sparkCountIsFourPerImpact = document.querySelectorAll('.odin-slash-spark').length === 8;
    // Cell 1 sits directly ABOVE cell 4 -> the rail toward it should point
    // straight up (-90deg), catching an axis/sign error in the angle math.
    const rails = [...document.querySelectorAll('.odin-slash-rail')];
    out.oneRailPointsStraightUp = rails.some(r => Math.abs(parseFloat(r.style.transform.match(/rotate\\(([-\\d.]+)deg\\)/)[1]) - (-90)) < 0.5);
    out.bothEnemiesFlipped = state.board[1].owner === 'blue' && state.board[5].owner === 'blue';
    out.chainShakeFired = state.chainShake === true;

    await new Promise(r => setTimeout(r, 1300 + 100));
    out.slashesClearedAfterCleanup = state.odinSlashes.length === 0;
    out.fxGoneAfterCleanup = document.querySelector('.odin-slash-fx') === null;
    out.chainShakeClearedAfterCleanup = state.chainShake === false;

    // A different card attacking normally must get NONE of this -- scoped
    // strictly to Odin's own attacks.
    state.board = Array(9).fill(null);
    state.wins = { blue: 0, red: 0 };
    state.board[1] = { card: { id:'w3', name:'W3', top:1,right:1,bottom:1,left:1 }, owner:'red', captureBonus:0 };
    state.playerHand = [findCardById('ifrit')];
    placeCard(4, 'ifrit', 'blue');
    out.noOdinSlashForIfrit = state.odinSlashes.length === 0 && document.querySelector('.odin-slash-fx') === null;

    return out;
  })()`);
  assert.equal(result.slashesRecorded, 2, 'both simultaneous battles from this one placement should be recorded');
  assert.equal(result.fxExists, true, 'the slash VFX wrapper should appear on an ordinary Odin attack, no Ultimate involved');
  assert.equal(result.railCountMatchesBattleCount, true, 'one lightning rail per battle actually fought this placement');
  assert.equal(result.impactCountMatchesBattleCount, true, 'one golden impact per battle actually fought this placement');
  assert.equal(result.sparkCountIsFourPerImpact, true, 'four scattering sparks per impact');
  assert.equal(result.oneRailPointsStraightUp, true, 'the rail toward the cell directly above Odin should compute exactly -90deg -- catches an axis/sign error in the angle math');
  assert.equal(result.bothEnemiesFlipped, true, "Odin's actual attack mechanic is unaffected by the VFX work");
  assert.equal(result.chainShakeFired, true, 'a brief moderate screen shake should fire on Odin\'s normal attack, reusing the same chainShake mechanism as every other card\'s VFX');
  assert.equal(result.slashesClearedAfterCleanup, true);
  assert.equal(result.fxGoneAfterCleanup, true);
  assert.equal(result.chainShakeClearedAfterCleanup, true);
  assert.equal(result.noOdinSlashForIfrit, true, "this VFX must stay scoped to Odin's own attacks, not fire for any other card's ordinary battles");
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

// ---------------- Fas 2: AI lookahead (design review overhaul) ----------------
// The old AI (simulateFlips, now removed) scored only the 4 immediate
// neighbors of one candidate placement — no idea what the opponent could do
// next turn. These tests exercise the new minimax/alpha-beta search
// (simulatePlacementOutcome/searchBestPlacement/chooseAIPlacement) directly
// via page.evaluate(), same "state-injection" style as the rest of this file.

test('simulatePlacementOutcome: mirrors real capture resolution (Same/Plus/Combo aware) without mutating its input board', async () => {
  const { page, pageErrors } = await newPage();
  const result = await page.evaluate(`(() => {
    ${freshEntrySnippet()}
    const out = {};
    const bahamut = findCardById('bahamut'); // 10/9/9/10
    const ogre = findCardById('ogre'); // top:8, right:5, bottom:8, left:4

    state.board = Array(9).fill(null);
    state.rules = { same:false, plus:false, combo:false, elemental:false, graveyard:false };
    state.board[1] = freshEntry(ogre, 'red');
    const before = state.board.slice();
    const outcome = simulatePlacementOutcome(state.board, 4, bahamut, 'blue');
    out.inputBoardUntouched = state.board[4] === null && state.board[1].owner === 'red' && state.board.every((e,i) => e === before[i]);
    out.capturedOgre = outcome[1].owner === 'blue';
    out.placedCellIsNewObject = outcome[4] && outcome[4].card.id === 'bahamut' && outcome[4].owner === 'blue';

    // Same rule: two neighbors whose raw printed values both match the
    // placed card's facing side capture outright, no comparison at all —
    // even a card far too weak to win a normal fight still captures via Same.
    // weakAttacker's top (3) must match matchA's bottom (3) — cell 1 sits
    // ABOVE cell 4, so cell 4's placed card's top edge faces cell 1's
    // bottom edge (see NEIGHBOR_DIRS: dr:-1 -> myEdge:'top', theirEdge:'bottom').
    // Likewise weakAttacker's left (3) must match matchB's right (3) — cell
    // 3 sits LEFT of cell 4 (dr:0,dc:-1 -> myEdge:'left', theirEdge:'right').
    const weakAttacker = { id:'weak-same', name:'WeakSame', top:3, right:9, bottom:9, left:3 };
    const matchA = { id:'match-a', name:'MatchA', top:9, right:9, bottom:3, left:9 };
    const matchB = { id:'match-b', name:'MatchB', top:9, right:3, bottom:9, left:9 };
    state.board = Array(9).fill(null);
    state.rules = { same:true, plus:false, combo:false, elemental:false, graveyard:false };
    state.board[1] = freshEntry(matchA, 'red'); // above cell 4
    state.board[3] = freshEntry(matchB, 'red'); // left of cell 4
    const sameOutcome = simulatePlacementOutcome(state.board, 4, weakAttacker, 'blue');
    out.sameRuleCapturesBothDespiteWeakStats = sameOutcome[1].owner === 'blue' && sameOutcome[3].owner === 'blue';

    // onCaptureBonus: a capturing card with this flag should show the bonus
    // stacked onto ITS OWN captureBonus in the returned scratch board (used
    // by later plies in the same search to correctly value its next attack).
    const vayra = findCardById('vayra'); // active.onCaptureBonus:1
    state.board = Array(9).fill(null);
    state.board[1] = freshEntry(ogre, 'red');
    const vayraOutcome = simulatePlacementOutcome(state.board, 4, vayra, 'blue');
    out.onCaptureBonusStacksOnScratchEntry = vayraOutcome[4].captureBonus === 1;

    return out;
  })()`);
  assert.equal(result.inputBoardUntouched, true, 'simulatePlacementOutcome must never mutate the board it was given');
  assert.equal(result.capturedOgre, true);
  assert.equal(result.placedCellIsNewObject, true);
  assert.equal(result.sameRuleCapturesBothDespiteWeakStats, true, 'Same rule must capture on raw value match regardless of the normal power comparison');
  assert.equal(result.onCaptureBonusStacksOnScratchEntry, true);
  assert.deepEqual(pageErrors, []);
  await page.close();
});

test('searchBestPlacement: a 2-ply lookahead avoids a trap that a 1-ply greedy search walks straight into', async () => {
  const { page, pageErrors } = await newPage();
  const result = await page.evaluate(`(() => {
    ${freshEntrySnippet()}
    const out = {};
    // A hand-crafted 2-empty-cell endgame: cell 1 (above center) and cell 4
    // (center) are open. Red holds cardR (top:9,right:5,bottom:1,left:8),
    // blue holds cardB (top:5,right:5,bottom:5,left:5). Cell 0 holds a weak
    // blue card W (all 1s); cell 5 holds a second weak blue card W2 (all
    // 1s); cells 2/3/6/7/8 hold invincible 10/10/10/10 filler (never flip
    // either way, so they're a constant baseline both branches share).
    //
    // Greedy (depth 1) sees two equally-scoring immediate placements (each
    // captures exactly one weak card) and, on a tie, keeps the first one it
    // tried in cell order: cell 1 -- which captures W but leaves cardR's
    // weak bottom (1) exposed to blue's comeback at cell 4 (top:5 beats
    // bottom:1), recapturing cell 1 right back. Final board-control score
    // for that line: 3.
    //
    // The better line is cell 4 first: it captures W2 immediately (right:5
    // beats W2's left:1) AND cardR's strong top (9) holds cell 4 against
    // blue's forced last placement at cell 1 (bottom:5 does not beat top:9).
    // Final score for that line: 5 -- strictly better, but invisible to a
    // search that never looks past its own first move.
    const filler = { id:'filler', name:'Filler', top:10, right:10, bottom:10, left:10 };
    const W = { id:'w', name:'W', top:1, right:1, bottom:1, left:1 };
    const W2 = { id:'w2', name:'W2', top:1, right:1, bottom:1, left:1 };
    const cardR = { id:'cardR', name:'CardR', top:9, right:5, bottom:1, left:8 };
    const cardB = { id:'cardB', name:'CardB', top:5, right:5, bottom:5, left:5 };

    state.board = Array(9).fill(null);
    state.rules = { same:false, plus:false, combo:false, elemental:false, graveyard:false };
    state.board[0] = freshEntry(W, 'blue');
    state.board[2] = freshEntry(filler, 'red');
    state.board[3] = freshEntry(filler, 'red');
    state.board[5] = freshEntry(W2, 'blue');
    state.board[6] = freshEntry(filler, 'red');
    state.board[7] = freshEntry(filler, 'red');
    state.board[8] = freshEntry(filler, 'red');

    const hands = { blue: [cardB], red: [cardR] };
    const greedy = searchBestPlacement(state.board, hands, 'red', 'red', 1, -Infinity, Infinity);
    const lookahead = searchBestPlacement(state.board, hands, 'red', 'red', 2, -Infinity, Infinity);

    const scoreOf = (board) => board.reduce((s,e) => s + (e ? (e.owner==='red' ? 1 : -1) : 0), 0);
    const trapLineFinal = simulatePlacementOutcome(simulatePlacementOutcome(state.board, 1, cardR, 'red'), 4, cardB, 'blue');
    const safeLineFinal = simulatePlacementOutcome(simulatePlacementOutcome(state.board, 4, cardR, 'red'), 1, cardB, 'blue');

    out.greedyPicksTrap = greedy.cellIndex === 1;
    out.lookaheadPicksSafe = lookahead.cellIndex === 4;
    out.trapLineScore = scoreOf(trapLineFinal);
    out.safeLineScore = scoreOf(safeLineFinal);
    out.boardUntouched = state.board[1] === null && state.board[4] === null;
    return out;
  })()`);
  assert.equal(result.greedyPicksTrap, true, "a 1-ply search should fall for the trap (no visibility into the opponent's reply)");
  assert.equal(result.lookaheadPicksSafe, true, 'a 2-ply search must foresee the trap and play the objectively better move instead');
  assert.equal(result.trapLineScore, 3);
  assert.equal(result.safeLineScore, 5);
  assert.ok(result.safeLineScore > result.trapLineScore, "the lookahead's chosen line must actually score higher, not just look different");
  assert.equal(result.boardUntouched, true);
  assert.deepEqual(pageErrors, []);
  await page.close();
});

test('chooseAIPlacement: full exhaustive endgame search overrides difficulty once few enough cells remain; depth otherwise scales with state.aiDifficulty', async () => {
  const { page, pageErrors } = await newPage();
  const result = await page.evaluate(`(() => {
    ${freshEntrySnippet()}
    const out = {};
    out.depthMapping = AI_DIFFICULTY_DEPTH.easy === 1 && AI_DIFFICULTY_DEPTH.normal === 2 && AI_DIFFICULTY_DEPTH.hard === 3;
    out.fullSearchThreshold = AI_FULL_SEARCH_MAX_EMPTY === 5;

    // Reuse the exact trap scenario above (2 empty cells, well under the
    // full-search threshold) -- even 'easy' must play the objectively
    // correct endgame move here, since depth stops being a difficulty
    // knob once the whole rest of the match is cheap to search exactly.
    const filler = { id:'filler', name:'Filler', top:10, right:10, bottom:10, left:10 };
    const W = { id:'w', name:'W', top:1, right:1, bottom:1, left:1 };
    const W2 = { id:'w2', name:'W2', top:1, right:1, bottom:1, left:1 };
    const cardR = { id:'cardR', name:'CardR', top:9, right:5, bottom:1, left:8 };
    const cardB = { id:'cardB', name:'CardB', top:5, right:5, bottom:5, left:5 };

    function setupTrapBoard(){
      state.board = Array(9).fill(null);
      state.rules = { same:false, plus:false, combo:false, elemental:false, graveyard:false };
      state.board[0] = freshEntry(W, 'blue');
      state.board[2] = freshEntry(filler, 'red');
      state.board[3] = freshEntry(filler, 'red');
      state.board[5] = freshEntry(W2, 'blue');
      state.board[6] = freshEntry(filler, 'red');
      state.board[7] = freshEntry(filler, 'red');
      state.board[8] = freshEntry(filler, 'red');
      state.playerHand = [cardB];
      state.enemyHand = [cardR];
      state.turn = 'red';
      state.phase = 'battle';
    }

    setupTrapBoard();
    state.aiDifficulty = 'easy';
    out.easyPlaysOptimalInEndgame = chooseAIPlacement().cellIndex === 4;

    setupTrapBoard();
    state.aiDifficulty = 'hard';
    out.hardPlaysOptimalInEndgame = chooseAIPlacement().cellIndex === 4;

    // Smoke test at a full, realistic board size (9 empty cells, real hands)
    // for every difficulty -- must return a legal, in-hand move without
    // hanging or throwing, regardless of how deep the search goes.
    const freshHand = () => ['bahamut','sarah','zaevir','vayra','darien'].map(id => findCardById(id));
    out.smoke = {};
    ['easy','normal','hard'].forEach(diff => {
      state.board = Array(9).fill(null);
      state.rules = { same:false, plus:false, combo:false, elemental:false, graveyard:false };
      state.playerHand = freshHand();
      state.enemyHand = freshHand();
      state.turn = 'red';
      state.phase = 'battle';
      state.aiDifficulty = diff;
      const choice = chooseAIPlacement();
      out.smoke[diff] = !!choice && state.board[choice.cellIndex] === null && state.enemyHand.some(c => c.id === choice.card.id);
    });

    return out;
  })()`);
  assert.equal(result.depthMapping, true);
  assert.equal(result.fullSearchThreshold, true);
  assert.equal(result.easyPlaysOptimalInEndgame, true, 'endgame exhaustive search must apply regardless of difficulty');
  assert.equal(result.hardPlaysOptimalInEndgame, true);
  assert.equal(result.smoke.easy, true);
  assert.equal(result.smoke.normal, true);
  assert.equal(result.smoke.hard, true);
  assert.deepEqual(pageErrors, []);
  await page.close();
});

test('enemyTryUseSpecial: Hard difficulty waits on a once-per-match AOE special until at least 2 enemies are on board (while cells remain); Easy/Normal fire immediately as before', async () => {
  const { page, pageErrors } = await newPage();
  const result = await page.evaluate(`(() => {
    ${freshEntrySnippet()}
    const out = {};
    const elara = findCardById('elara'); // active.special.targets === 'aoe', cost 2, once
    const ogre = findCardById('ogre');

    function setup(difficulty){
      state.board = Array(9).fill(null);
      state.board[4] = freshEntry(elara, 'red');
      state.board[1] = freshEntry(ogre, 'blue'); // exactly ONE enemy on board
      state.playerHand = [1,2]; state.enemyHand = [1,2];
      state.turn = 'red'; state.phase = 'battle';
      state.wins = { blue:0, red:2 };
      state.specialUsed = {};
      state.ultimateBanner = null;
      state.aiDifficulty = difficulty;
    }

    setup('hard');
    out.hardWaitsWithOneEnemyAndEmptyCells = enemyTryUseSpecial() === false && !state.specialUsed['red:elara'];

    setup('normal');
    out.normalFiresImmediatelyWithOneEnemy = enemyTryUseSpecial() === true;

    setup('easy');
    out.easyFiresImmediatelyWithOneEnemy = enemyTryUseSpecial() === true;

    // Hard should still fire right away once a second enemy is present.
    setup('hard');
    state.board[3] = freshEntry(ogre, 'blue'); // second enemy
    out.hardFiresWithTwoEnemies = enemyTryUseSpecial() === true;

    // Hard must not wait forever: once the board is completely full (no
    // more empty cells for a second enemy to ever appear on), it fires even
    // with only one enemy rather than wasting the special entirely.
    setup('hard');
    state.board = state.board.map((c,i) => i === 4 ? freshEntry(elara,'red') : (i === 1 ? freshEntry(ogre,'blue') : freshEntry({id:'filler2',name:'F',top:10,right:10,bottom:10,left:10}, 'red')));
    out.hardFiresWhenBoardIsFullRegardless = enemyTryUseSpecial() === true;

    return out;
  })()`);
  assert.equal(result.hardWaitsWithOneEnemyAndEmptyCells, true);
  assert.equal(result.normalFiresImmediatelyWithOneEnemy, true, 'only Hard gets the wait heuristic -- Normal keeps the original immediate-fire behavior');
  assert.equal(result.easyFiresImmediatelyWithOneEnemy, true);
  assert.equal(result.hardFiresWithTwoEnemies, true);
  assert.equal(result.hardFiresWhenBoardIsFullRegardless, true, 'Hard must never permanently waste a special by waiting for an enemy that can no longer appear');
  assert.deepEqual(pageErrors, []);
  await page.close();
});

test('AI difficulty selector: persists via localStorage and survives resetGame()', async () => {
  const { page, pageErrors } = await newPage();
  const result = await page.evaluate(`(() => {
    const out = {};
    out.defaultsToNormal = state.aiDifficulty === 'normal';
    state.aiDifficulty = 'hard';
    saveAIDifficulty('hard');
    out.savedToLocalStorage = localStorage.getItem(AI_DIFFICULTY_SAVE_KEY) === 'hard';
    out.loadReturnsSaved = loadAIDifficulty() === 'hard';
    resetGame();
    out.survivesReset = state.aiDifficulty === 'hard';
    return out;
  })()`);
  assert.equal(result.defaultsToNormal, true);
  assert.equal(result.savedToLocalStorage, true);
  assert.equal(result.loadReturnsSaved, true);
  assert.equal(result.survivesReset, true, 'resetGame() must preserve the chosen AI difficulty like it already does for rules/draftMode');
  assert.deepEqual(pageErrors, []);
  await page.close();
});

// ---------------- Fas 3: card-system coherence pass ----------------
// Design review found Darum/Maximus and Twin Brothers/Twin Sisters to be
// near-byte-identical duplicates with no real reason to pick one over the
// other, and Nyxara's "Shadow Rend" honestly labeled "(Flavor only)" for
// lacking a generic "destroy the weakest enemy" hook. Also pilots the
// synergy-surface expansion the review recommended (only ~22% of the
// roster had any multi-card synergy before this) with two new small
// pairPresence bonds reusing the existing primitive verbatim.

test('Fas 3: Maximus (Warpath) and Twin Brothers (Fraternal Fury) get an aggressive flat/on-capture hook Darum/Twin Sisters lack; Twin Sisters (Sisterly Ward) gets a defensive margin-shield hook Twin Brothers lacks', async () => {
  const { page, pageErrors } = await newPage();
  const result = await page.evaluate(`(() => {
    ${freshEntrySnippet()}
    const out = {};
    const maximus = findCardById('maximus');
    const darum = findCardById('darum');
    out.maximusHasWarpath = maximus.active.flatAttackBonus === 1;
    out.darumHasNoFlatAttackBonus = !darum.active.flatAttackBonus;
    out.darumStillHasShield = darum.active.shield === true;

    const brothers = findCardById('twinbrothers');
    const sisters = findCardById('twinsisters');
    out.brothersHasOnCaptureBonus = brothers.active.onCaptureBonus === 1;
    out.sistersHasNoOnCaptureBonus = !sisters.active.onCaptureBonus;
    out.sistersHasMarginShield = sisters.active.marginShieldThreshold === 1;
    out.brothersHasNoMarginShield = !brothers.active.marginShieldThreshold;
    // Both still share the bond and the base shield -- differentiation is
    // additive, not a replacement of their existing identity.
    out.bothStillShareBond = brothers.active.pairPresence.partner === 'twinsisters' && brothers.active.pairPresence.amount === 2
      && sisters.active.pairPresence.partner === 'twinbrothers' && sisters.active.pairPresence.amount === 2;
    out.bothStillHaveShield = brothers.active.shield === true && sisters.active.shield === true;

    // Twin Sisters' new margin shield actually blocks a narrow (1-Power) loss.
    state.board = Array(9).fill(null);
    const sistersDefender = freshEntry(sisters, 'blue'); // top:7
    sistersDefender.shieldUsed = true; // her own base shield already spent, isolating the NEW margin-shield hook
    state.board[4] = sistersDefender;
    const narrowAttacker = freshEntry({ id:'narrow', name:'Narrow', top:1,right:1,bottom:8,left:1 }, 'red'); // beats top:7 by exactly 1
    state.board[1] = narrowAttacker;
    resolveFlips(1, 'red');
    out.marginShieldBlocksNarrowLoss = state.board[4].owner === 'blue';

    return out;
  })()`);
  assert.equal(result.maximusHasWarpath, true);
  assert.equal(result.darumHasNoFlatAttackBonus, true);
  assert.equal(result.darumStillHasShield, true);
  assert.equal(result.brothersHasOnCaptureBonus, true);
  assert.equal(result.sistersHasNoOnCaptureBonus, true);
  assert.equal(result.sistersHasMarginShield, true);
  assert.equal(result.brothersHasNoMarginShield, true);
  assert.equal(result.bothStillShareBond, true, 'differentiation must not touch the pair\'s existing shared bond');
  assert.equal(result.bothStillHaveShield, true);
  assert.equal(result.marginShieldBlocksNarrowLoss, true);
  assert.deepEqual(pageErrors, []);
  await page.close();
});

test('Fas 3: Nyxara\'s Shadow Rend destroys the weakest enemy on her first win, once per match, respecting destroy-immunity', async () => {
  const { page, pageErrors } = await newPage();
  const result = await page.evaluate(`(() => {
    ${freshEntrySnippet()}
    const out = {};
    const nyxara = findCardById('nyxara');
    out.hasShadowRendFlag = nyxara.active.onWinDestroyWeakestEnemy === true;

    // She wins against TWO adjacent cards in the SAME placement (index 1
    // and index 5 are both weak enough to flip directly) while TWO
    // separate non-adjacent enemies sit at index 0 (weakest) and index 2
    // (next-weakest) -- neither touched by direct combat, so they can only
    // change via the Shadow Rend hook. Index 3 is a third adjacent enemy
    // matched exactly to her own stats (a tie, so she does NOT capture it)
    // with high total power, proving Shadow Rend correctly skips a strong
    // survivor in favor of the real weakest card.
    //
    // checkOnWinBonuses fires once per capture within this SINGLE
    // resolveFlips call (NEIGHBOR_DIRS processes top/index1 before right/
    // index5) -- this is the realistic way a card can "win" more than once
    // in the same match (one placement flipping multiple weak neighbors at
    // once), and it proves the once-per-match cap holds even within one
    // placement: only the FIRST win (index 1) should trigger Shadow Rend
    // (destroying the true weakest, index 0), while the SECOND win in the
    // very same call (index 5) must not also destroy index 2.
    state.board = Array(9).fill(null);
    const src = freshEntry(nyxara, 'blue');
    state.board[4] = src;
    state.board[1] = freshEntry({ id:'mid', name:'Mid', top:1,right:1,bottom:1,left:1 }, 'red'); // adjacent (top), she flips this one first
    state.board[5] = freshEntry({ id:'second-fight', name:'SecondFight', top:1,right:1,bottom:1,left:1 }, 'red'); // adjacent (right), she flips this one second, in the same placement
    state.board[3] = freshEntry({ id:'strong-enemy', name:'StrongEnemy', top:10,right:10,bottom:10,left:10 }, 'red'); // adjacent (left), ties her own stats -- survives combat, total 40
    state.board[0] = freshEntry({ id:'weakest', name:'Weakest', top:1,right:1,bottom:1,left:1 }, 'red'); // NOT adjacent to index 4, total 4 -- the true weakest
    state.board[2] = freshEntry({ id:'another-weak', name:'AnotherWeak', top:2,right:2,bottom:2,left:2 }, 'red'); // NOT adjacent to index 4, total 8 -- weak, but not the weakest
    resolveFlips(4, 'blue');
    out.fought1Captured = state.board[1].owner === 'blue';
    out.secondFightCaptured = state.board[5].owner === 'blue';
    out.strongEnemySurvivedCombat = state.board[3] !== null && state.board[3].owner === 'red';
    out.nonAdjacentWeakestDestroyed = state.board[0] === null;
    out.usedFlagSet = src.onWinDestroyWeakestUsed === true;
    out.secondWinDoesNotDestroyAgain = state.board[2] !== null;

    // Destroy-immune cards must never be picked, even if they look like
    // the weakest by raw power -- the next-weakest NON-immune card gets
    // destroyed instead.
    state.board = Array(9).fill(null);
    const src3 = freshEntry(nyxara, 'blue');
    state.board[4] = src3;
    state.board[1] = freshEntry({ id:'mid2', name:'Mid2', top:1,right:1,bottom:1,left:1 }, 'red'); // adjacent, triggers the win
    state.board[0] = freshEntry({ id:'immune-weak', name:'ImmuneWeak', top:1,right:1,bottom:1,left:1, active:{destroyImmune:true} }, 'red'); // lowest power, but immune
    state.board[2] = freshEntry({ id:'next-weakest', name:'NextWeakest', top:2,right:2,bottom:2,left:2 }, 'red'); // next-lowest power, not immune
    resolveFlips(4, 'blue');
    out.immuneCardSurvives = state.board[0] !== null;
    out.nextWeakestDestroyedInstead = state.board[2] === null;

    return out;
  })()`);
  assert.equal(result.hasShadowRendFlag, true);
  assert.equal(result.fought1Captured, true);
  assert.equal(result.strongEnemySurvivedCombat, true);
  assert.equal(result.nonAdjacentWeakestDestroyed, true, 'Shadow Rend must destroy the weakest enemy ANYWHERE on the board, not just the one she fought in direct combat');
  assert.equal(result.usedFlagSet, true);
  assert.equal(result.secondFightCaptured, true);
  assert.equal(result.secondWinDoesNotDestroyAgain, true, 'capped to once per match -- a deliberate balance deviation, same reasoning as onWinLineDestroy');
  assert.equal(result.immuneCardSurvives, true, 'destroy-immune cards must never be picked as the weakest target');
  assert.equal(result.nextWeakestDestroyedInstead, true, 'the search must skip the immune card and destroy the actual next-weakest eligible target');
  assert.deepEqual(pageErrors, []);
  await page.close();
});

test('Fas 3: synergy pilot -- Zaevir/Sylvarion and Torn/Vayra each get a small mutual pairPresence bond', async () => {
  const { page, pageErrors } = await newPage();
  const result = await page.evaluate(`(() => {
    ${freshEntrySnippet()}
    const out = {};
    const zaevir = findCardById('zaevir');
    const sylvarion = findCardById('sylvarion');
    const torn = findCardById('torn');
    const vayra = findCardById('vayra');

    out.zaevirBondsToSylvarion = zaevir.active.pairPresence.partner === 'sylvarion' && zaevir.active.pairPresence.amount === 1;
    out.sylvarionBondsToZaevir = sylvarion.active.pairPresence.partner === 'zaevir' && sylvarion.active.pairPresence.amount === 1;
    out.tornBondsToVayra = torn.active.pairPresence.partner === 'vayra' && torn.active.pairPresence.amount === 1;
    out.vayraBondsToTorn = vayra.active.pairPresence.partner === 'torn' && vayra.active.pairPresence.amount === 1;

    // End-to-end via fullEffectiveValue: Zaevir gets +1 on the board while
    // Sylvarion is anywhere on his side, nothing when she isn't. Hand set
    // to a non-trivial length so lastStandBonus (0 or 1 cards left -> +1/+2)
    // can't spuriously inflate the baseline in this hand-less unit test.
    state.board = Array(9).fill(null);
    state.playerHand = [1,2,3];
    state.board[0] = freshEntry(zaevir, 'blue');
    out.noBondWithoutPartner = fullEffectiveValue(zaevir, 'top', null, 0, 'blue', 'attack') === zaevir.top;
    state.board[8] = freshEntry(sylvarion, 'blue'); // far corner, not adjacent
    out.bondAppliesAnywhereOnBoard = fullEffectiveValue(zaevir, 'top', null, 0, 'blue', 'attack') === zaevir.top + 1;

    return out;
  })()`);
  assert.equal(result.zaevirBondsToSylvarion, true);
  assert.equal(result.sylvarionBondsToZaevir, true);
  assert.equal(result.tornBondsToVayra, true);
  assert.equal(result.vayraBondsToTorn, true);
  assert.equal(result.noBondWithoutPartner, true);
  assert.equal(result.bondAppliesAnywhereOnBoard, true);
  assert.deepEqual(pageErrors, []);
  await page.close();
});

// ---------------- Fas 4: progression pilot ----------------
// Design review found Random Draft/Choose Your Five had zero persistence
// (no record, no streaks, no reward for the campaign's own unlocks beyond
// pure flavor), and that campaign difficulty only ever scaled via raw
// stats/rules, never the AI's own playing strength. Three scoped additions,
// confirmed with the user first: (1) win/loss/streak/favorite-card
// tracking for Random Draft/Choose Your Five, (2) a purely cosmetic gold
// ring on campaign-unlocked champions (gating stays removed, per the
// user's own prior explicit request), (3) campaign stages auto-assign the
// Forest's AI difficulty (1-5 Easy, 6-11 Normal, 12-17 Hard).

test('Fas 4: recordMatchResult tracks wins/losses/draws/streaks/favorite card for Random Draft & Choose Your Five, but never for Campaign', async () => {
  const { page, pageErrors } = await newPage();
  const result = await page.evaluate(`(() => {
    const out = {};
    try { localStorage.removeItem(MATCH_STATS_SAVE_KEY); } catch(e){}
    matchStats = loadMatchStats();
    out.startsAtZero = matchStats.matches === 0 && matchStats.wins === 0 && matchStats.currentStreak === 0 && matchStats.bestStreak === 0;

    state.draftMode = 'random';
    state.selected = ['bahamut','sarah','zaevir','vayra','darien'];
    recordMatchResult('blue');
    recordMatchResult('blue');
    out.twoWinsTracked = matchStats.wins === 2 && matchStats.matches === 2;
    out.streakAfterTwoWins = matchStats.currentStreak === 2 && matchStats.bestStreak === 2;
    out.cardWinsIncremented = matchStats.cardWins.bahamut === 2 && matchStats.cardWins.sarah === 2;

    recordMatchResult('red');
    out.streakResetsOnLoss = matchStats.currentStreak === 0 && matchStats.bestStreak === 2 && matchStats.losses === 1;

    recordMatchResult('draw');
    out.drawTrackedAndResetsStreak = matchStats.draws === 1 && matchStats.currentStreak === 0;

    // A later, longer streak correctly raises bestStreak past the old high.
    recordMatchResult('blue'); recordMatchResult('blue'); recordMatchResult('blue');
    out.newBestStreak = matchStats.currentStreak === 3 && matchStats.bestStreak === 3;

    out.favorite = favoriteCardInfo();

    // Campaign matches must never be recorded here (they have their own
    // stage-progress tracking instead).
    const beforeCampaign = JSON.stringify(matchStats);
    state.draftMode = 'campaign';
    recordMatchResult('blue');
    out.campaignMatchNotRecorded = JSON.stringify(matchStats) === beforeCampaign;

    // Persists to localStorage and survives a fresh load.
    saveMatchStats();
    const reloaded = loadMatchStats();
    out.persistsAcrossReload = reloaded.matches === matchStats.matches && reloaded.wins === matchStats.wins && reloaded.bestStreak === matchStats.bestStreak;

    return out;
  })()`);
  assert.equal(result.startsAtZero, true);
  assert.equal(result.twoWinsTracked, true);
  assert.equal(result.streakAfterTwoWins, true);
  assert.equal(result.cardWinsIncremented, true);
  assert.equal(result.streakResetsOnLoss, true);
  assert.equal(result.drawTrackedAndResetsStreak, true);
  assert.equal(result.newBestStreak, true);
  assert.deepEqual(result.favorite, { name: 'The Celestial Bahamut', wins: 5 }, 'Bahamut was in all 5 winning fives -- the clear favorite');
  assert.equal(result.campaignMatchNotRecorded, true, 'Campaign has its own stage-progress tracking; recordMatchResult must be a no-op there');
  assert.equal(result.persistsAcrossReload, true);
  assert.deepEqual(pageErrors, []);
  await page.close();
});

test('Fas 4: cardFace marks a campaign-unlocked champion with the cosmetic champion-unlocked class, never a gameplay gate', async () => {
  const { page, pageErrors } = await newPage();
  const result = await page.evaluate(`(() => {
    const out = {};
    const bahamut = findCardById('bahamut');
    out.notMarkedByDefault = !cardFace(bahamut, { clickable:true }).includes('champion-unlocked');
    out.markedWhenUnlocked = cardFace(bahamut, { clickable:true, unlocked:true }).includes('champion-unlocked');
    // Cosmetic only: campaignPool() must still return every HEROES card
    // regardless of unlocked state -- confirms Fas 4 never re-introduces
    // the gating the user explicitly had removed before.
    campaignProgress = { stageIndex: 0, unlocked: [], ngPlus: 0 };
    out.poolStillFullyOpen = campaignPool().length === HEROES.length && campaignPool().includes('bahamut');
    return out;
  })()`);
  assert.equal(result.notMarkedByDefault, true);
  assert.equal(result.markedWhenUnlocked, true);
  assert.equal(result.poolStillFullyOpen, true, 'unlocking must stay cosmetic -- campaignPool() must never gate again');
  assert.deepEqual(pageErrors, []);
  await page.close();
});

test('Fas 4: campaign stages auto-assign AI difficulty (1-5 Easy, 6-11 Normal, 12-17 Hard); manual choice still applies outside Campaign', async () => {
  const { page, pageErrors } = await newPage();
  const result = await page.evaluate(`(() => {
    const out = {};
    // 0-based stageIndex: stage 1 = index 0, stage 17 = index 16.
    out.stage1IsEasy = campaignStageAIDifficulty(0) === 'easy';
    out.stage5IsEasy = campaignStageAIDifficulty(4) === 'easy';
    out.stage6IsNormal = campaignStageAIDifficulty(5) === 'normal';
    out.stage11IsNormal = campaignStageAIDifficulty(10) === 'normal';
    out.stage12IsHard = campaignStageAIDifficulty(11) === 'hard';
    out.stage17IsHard = campaignStageAIDifficulty(16) === 'hard';

    state.draftMode = 'campaign';
    campaignProgress = { stageIndex: 11, unlocked: [], ngPlus: 0 }; // stage 12
    state.aiDifficulty = 'easy'; // manual choice must be ignored in Campaign
    out.campaignUsesStageDifficulty = effectiveAIDifficulty() === 'hard';

    state.draftMode = 'random';
    out.nonCampaignUsesManualChoice = effectiveAIDifficulty() === 'easy';

    return out;
  })()`);
  assert.equal(result.stage1IsEasy, true);
  assert.equal(result.stage5IsEasy, true);
  assert.equal(result.stage6IsNormal, true);
  assert.equal(result.stage11IsNormal, true);
  assert.equal(result.stage12IsHard, true);
  assert.equal(result.stage17IsHard, true);
  assert.equal(result.campaignUsesStageDifficulty, true, "Campaign must use the stage's assigned difficulty, ignoring the player's manual Easy/Normal/Hard choice");
  assert.equal(result.nonCampaignUsesManualChoice, true, 'Random Draft/Choose Your Five must still fully respect the manual choice');
  assert.deepEqual(pageErrors, []);
  await page.close();
});
