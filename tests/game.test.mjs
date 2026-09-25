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

test('conquered badge: an AOE special (Pallis & Pell) sets justFlipped on the captured cell, and renderBattle() shows the small per-cell badge there', async () => {
  const { page, pageErrors } = await newPage();
  const result = await page.evaluate(`(async () => {
    ${freshEntrySnippet()}
    state.phase = 'battle';
    state.board = Array(9).fill(null);
    state.board[4] = freshEntry(findCardById('pallispell'), 'blue');
    state.board[1] = freshEntry(findCardById('ogre'), 'red');
    state.wins = { blue: 5, red: 5 };
    state.specialUsed = {};
    runSpecialResolution(4, null, {});
    // Game feel phase 4: the effect no longer resolves synchronously —
    // runSpecialResolution now plays a windup beat first (see
    // playUltimateSequence). Wait past it before reading the result.
    await new Promise(r => setTimeout(r, ULTIMATE_WINDUP_MS + ULTIMATE_HITSTOP_MS + 50));
    const html = renderBattle();
    return {
      ownerAfter: state.board[1].owner,
      justFlippedOnCapturedCell: state.board[1].justFlipped === true,
      html,
    };
  })()`);
  assert.equal(result.ownerAfter, 'blue');
  assert.equal(result.justFlippedOnCapturedCell, true, 'the badge (see boardCellHtml) is gated directly on cell.justFlipped');
  assert.equal(result.html.includes('class="conquered-badge-small" src="conquered-badge.png"'), true, "blue's own capture must use the blue badge art");
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
    await new Promise(r => setTimeout(r, ULTIMATE_WINDUP_MS + ULTIMATE_HITSTOP_MS + 50));
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

test('conquered badge: a non-capturing special (Deathblade\'s swap) never sets justFlipped, so no badge renders anywhere', async () => {
  const { page, pageErrors } = await newPage();
  const result = await page.evaluate(`(async () => {
    ${freshEntrySnippet()}
    state.phase = 'battle';
    state.board = Array(9).fill(null);
    state.board[4] = freshEntry(findCardById('deathblade'), 'blue');
    state.board[1] = freshEntry(findCardById('tiamat'), 'red');
    state.wins = { blue: 5, red: 5 };
    state.specialUsed = {};
    runSpecialResolution(4, 1, {});
    await new Promise(r => setTimeout(r, ULTIMATE_WINDUP_MS + ULTIMATE_HITSTOP_MS + 50));
    return { anyFlipped: state.board.some(e => e && e.justFlipped), html: renderBattle() };
  })()`);
  assert.equal(result.anyFlipped, false);
  assert.equal(result.html.includes('conquered-badge-small'), false);
  assert.deepEqual(pageErrors, []);
  await page.close();
});

// The old design used a single GLOBAL state.conquestPopup flag, derived by
// diffing captures against an "alreadyFlipped" snapshot specifically so a
// stale justFlipped left over from an earlier, still-animating action
// wouldn't falsely re-trigger the one shared banner for an unrelated later
// action. The redesigned badge (see boardCellHtml/.conquered-badge-small)
// has no such global flag to corrupt any more -- each cell's badge is
// gated purely on that SAME cell's own justFlipped, so there is nothing
// left to "falsely trigger": a leftover flag on one cell just means that
// cell's own still-recent capture is still (correctly) showing its badge,
// while a genuinely non-capturing action on a DIFFERENT cell simply never
// sets justFlipped there at all. This test now covers that direct
// per-cell correctness instead of the old cross-cell contamination bug.
test('conquered badge: an AOE debuff (Torn\'s Lethal Volley, never captures) does not set justFlipped on the cell it debuffs, even with an unrelated stale flag elsewhere on the board', async () => {
  const { page, pageErrors } = await newPage();
  const result = await page.evaluate(`(async () => {
    ${freshEntrySnippet()}
    state.phase = 'battle';
    state.board = Array(9).fill(null);
    const stale = freshEntry(findCardById('ogre'), 'blue');
    stale.justFlipped = true; // leftover from an earlier, already-resolved action -- still legitimately showing its OWN badge, not a bug
    state.board[0] = stale;
    state.board[4] = freshEntry(findCardById('torn'), 'blue'); // AOE debuff, never captures
    state.board[1] = freshEntry(findCardById('ogre'), 'red');
    state.wins = { blue: 5, red: 5 };
    state.specialUsed = {};
    runSpecialResolution(4, null, {});
    await new Promise(r => setTimeout(r, ULTIMATE_WINDUP_MS + ULTIMATE_HITSTOP_MS + 50));
    return { debuffedCellFlipped: state.board[1].justFlipped === true, staleCellStillFlipped: state.board[0].justFlipped === true };
  })()`);
  assert.equal(result.debuffedCellFlipped, false, "a debuff-only AOE must never set justFlipped on the cell it merely weakened");
  assert.equal(result.staleCellStillFlipped, true, "an unrelated cell's own pre-existing flag is untouched by a different action -- no cross-cell contamination possible in the per-cell design");
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

    // Fas 35 moved the Sisters stage from index 16 to index 18 (Campaign
    // is now 20 stages, not 17) when Triune Desire was added as the new
    // finale -- same stage, same unlockIds, new position.
    out.sistersStageUnlockIds = CAMPAIGN_STAGES[18].unlockIds.slice().sort();
    return out;
  })()`);
  assert.equal(result.inHeroes, true);
  assert.equal(result.stillInForestFoes, true, 'they should still work as the Sisters stage\'s enemy hand too');
  assert.equal(result.sisterAuraBonusForBlue, 2, 'sisterAura should apply regardless of which side owns them');
  assert.equal(result.onPlaceBurnByBlue, -2);
  assert.equal(result.blueVaeliraDestroyedEnemy, true);
  assert.deepEqual(result.sistersStageUnlockIds, ['nyxara', 'seraphine', 'vaelira']);
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
    // Explicit rules-off: triunedesire's flat 10/10/10/10 against four
    // 1/1/1/1s makes every touching-side sum equal (11 in all four
    // directions), which would otherwise satisfy the Plus rule (default
    // ON as of Fas 6's design review #2) and route the capture through
    // computeSamePlusCaptures instead of the normal battleOneNeighbor
    // path this test is specifically exercising for the on-win hook.
    state.rules = { same:false, plus:false, combo:false, elemental:false, graveyard:false };
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
    await new Promise(r => setTimeout(r, ULTIMATE_WINDUP_MS + ULTIMATE_HITSTOP_MS + 50));
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
    await new Promise(r => setTimeout(r, ULTIMATE_WINDUP_MS + ULTIMATE_HITSTOP_MS + 50));
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
    await new Promise(r => setTimeout(r, ULTIMATE_WINDUP_MS + ULTIMATE_HITSTOP_MS + 1300 + 250));
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

    // Nightfall: Fas 7 (design review #2) rework -- weakens the TARGET
    // (-2 this round) before the strike lands, instead of buffing Tilda
    // herself, so it always saps the target even on a failed attack, but
    // grants no permanent stat gain on a win (the trade-off).
    state.board = Array(9).fill(null);
    const nfSrc = freshEntry(tilda, 'blue');
    state.board[4] = nfSrc;
    const nfWeak = freshEntry({ id:'nf-weak', name:'NFWeak', top:1,right:1,bottom:1,left:1 }, 'red');
    state.board[1] = nfWeak;
    SPECIAL_HANDLERS.tilda({ srcEntry: nfSrc, targetEntry: nfWeak, targetIndex: 1, owner: 'blue' });
    out.nightfallCapturesAndDebuffsWeakTarget = nfWeak.owner === 'blue' && nfWeak.captureBonus === -2 && nfSrc.captureBonus === 0;

    state.board = Array(9).fill(null);
    const nfSrc2 = freshEntry(tilda, 'blue'); // total 31
    state.board[4] = nfSrc2;
    const nfStrong = freshEntry({ id:'nf-strong', name:'NFStrong', top:20,right:20,bottom:20,left:20 }, 'red'); // total 80, still 72 after the -2/-8-total debuff -- 31 still doesn't beat it
    state.board[1] = nfStrong;
    SPECIAL_HANDLERS.tilda({ srcEntry: nfSrc2, targetEntry: nfStrong, targetIndex: 1, owner: 'blue' });
    out.nightfallStillDebuffsButNoCaptureVsMuchStronger = nfStrong.owner === 'red' && nfStrong.captureBonus === -2 && nfSrc2.captureBonus === 0;

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
  assert.equal(result.nightfallCapturesAndDebuffsWeakTarget, true, 'Nightfall debuffs the target and captures it, with no self-buff');
  assert.equal(result.nightfallStillDebuffsButNoCaptureVsMuchStronger, true, 'Nightfall still saps a much stronger target even though it fails to capture it');
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

test("Aurelian: Skyward Reach only boosts Up/Down while attacking, Celestial Bond mirrors the Twin pattern, and Skybreaker grants +2 top/bottom only on a win (Fas 7 rework)", async () => {
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

    // Skybreaker: total-power threshold check (+3), and Fas 7 (design
    // review #2) reworked the win-bonus from a generic +1 all-sides to a
    // narrower-but-stronger +2 on just top/bottom (via directionalBoost),
    // matching his own axisBonus passive's vertical-spear identity.
    state.board = Array(9).fill(null);
    const src = freshEntry(aurelian, 'blue');
    state.board[4] = src;
    const weakTarget = freshEntry({ id:'weak', name:'Weak', top:1,right:1,bottom:1,left:1 }, 'red'); // total 4, easily beaten
    state.board[1] = weakTarget;
    SPECIAL_HANDLERS.aurelian({ srcEntry: src, targetEntry: weakTarget, targetIndex: 1, owner: 'blue' });
    out.skybreakerCaptured = weakTarget.owner === 'blue';
    out.skybreakerBoostedTopBottomOnly = src.sideBonus.top === 2 && src.sideBonus.bottom === 2 && !src.sideBonus.left && !src.sideBonus.right && src.captureBonus === 0;

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
  assert.equal(result.skybreakerBoostedTopBottomOnly, true, 'Skybreaker grants +2 on top/bottom only, matching Aurelian\'s vertical-spear identity');
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

test('Ysara: Future Sight vs a stronger foe, Paradox Veil debuff immunity, and Eternal Eclipse now grants an extra turn on a win (Fas 7 rework)', async () => {
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

    // Eternal Eclipse: still a total-power threshold check (+3), but Fas 7
    // (design review #2) reworked the win-bonus from a permanent +1
    // all-sides buff into an extra turn instead (the Timeweaver loops the
    // moment back on herself rather than just hitting harder next time).
    state.board = Array(9).fill(null);
    state.extraTurnPending = null;
    const src = freshEntry(ysara, 'blue');
    state.board[4] = src;
    const weakTarget = freshEntry({ id:'weak', name:'Weak', top:1,right:1,bottom:1,left:1 }, 'red');
    state.board[1] = weakTarget;
    SPECIAL_HANDLERS.ysara({ srcEntry: src, targetEntry: weakTarget, targetIndex: 1, owner: 'blue' });
    out.eclipseCapturedAndGrantedExtraTurn = weakTarget.owner === 'blue' && src.captureBonus === 0 && state.extraTurnPending === 'blue';

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
  assert.equal(result.eclipseCapturedAndGrantedExtraTurn, true, 'Eternal Eclipse still captures on a win, now granting an extra turn instead of a permanent buff');
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

    await new Promise(r => setTimeout(r, ULTIMATE_WINDUP_MS + ULTIMATE_HITSTOP_MS + 50));
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
    await new Promise(r => setTimeout(r, ULTIMATE_WINDUP_MS + ULTIMATE_HITSTOP_MS + 1300 + 100));
    out.firstResolved = state.board[1].owner === 'blue';
    // The queued second cast should have started its OWN windup by now
    // (immediately after the first's cleanup), not resolved yet.
    out.secondNowWindingUp = state.ultimateBanner && state.ultimateBanner.sourceIndex === 4 && state.ultimateBanner.phase === 'cast';
    out.secondStillNotResolved = state.board[5].owner === 'red';

    await new Promise(r => setTimeout(r, ULTIMATE_WINDUP_MS + ULTIMATE_HITSTOP_MS + 50));
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

test('Bug fix (reported: "numbers didn\'t go down, couldn\'t press end turn"): a queued single-target Ultimate whose chosen cell gets destroyed by an earlier queued AOE-destroy Ultimate must fizzle gracefully, not crash and wedge state.ultimateBanner forever', async () => {
  const { page, pageErrors } = await newPage();

  // Nexzoth's The Ending (whole-board AOE destroy) cast first, then Ifrit's
  // Hellfire (single-target) cast on one of the same enemies WHILE Nexzoth
  // is still mid-sequence -- Ifrit's job queues behind Nexzoth's. By the
  // time the queued Hellfire job actually resolves, Nexzoth has already
  // destroyed every enemy cell, including Hellfire's chosen target -- the
  // real-world scenario the user hit that left End Turn permanently
  // unresponsive (endPlayerTurn refuses to act while state.ultimateBanner
  // is set, and it never got cleared because the old code threw a
  // TypeError reading targetEntry.card on a now-null cell).
  const result = await page.evaluate(`(async () => {
    ${freshEntrySnippet()}
    const out = {};
    state.board = Array(9).fill(null);
    state.board[4] = freshEntry(findCardById('nexzoth'), 'blue');
    state.board[3] = freshEntry(findCardById('ifrit'), 'blue');
    state.board[1] = freshEntry(findCardById('ogre'), 'red');
    state.wins = { blue: 10, red: 5 };
    state.specialUsed = {};
    state.turn = 'blue';

    runSpecialResolution(4, null, {}); // Nexzoth's The Ending -- starts immediately
    runSpecialResolution(3, 1, {}); // Ifrit's Hellfire on the same enemy -- must queue

    out.queuedRightAfter = ultimateQueue.length === 1;

    // Nexzoth's full lifecycle: windup + hitstop + shake/cleanup.
    await new Promise(r => setTimeout(r, ULTIMATE_WINDUP_MS + ULTIMATE_HITSTOP_MS + 1300 + 100));
    out.targetDestroyedByNexzoth = state.board[1] === null;
    out.hellfireNowWindingUp = state.ultimateBanner && state.ultimateBanner.sourceIndex === 3 && state.ultimateBanner.phase === 'cast';

    // Hellfire's own full lifecycle -- this is where the old code crashed
    // partway through and left state.ultimateBanner stuck forever.
    await new Promise(r => setTimeout(r, ULTIMATE_WINDUP_MS + ULTIMATE_HITSTOP_MS + 1300 + 100));
    out.bannerClearedAfterQueuedFizzle = state.ultimateBanner === null;
    out.logMentionsFizzle = typeof state.log === 'string' && state.log.length > 0;

    return out;
  })()`);
  assert.equal(result.queuedRightAfter, true, "Ifrit's Hellfire must queue behind Nexzoth's still-active Ultimate");
  assert.equal(result.targetDestroyedByNexzoth, true, "Nexzoth's The Ending must have destroyed the shared target cell first");
  assert.equal(result.hellfireNowWindingUp, true, "the queued Hellfire cast must start its own windup once Nexzoth's cleanup finishes");
  assert.equal(result.bannerClearedAfterQueuedFizzle, true, 'state.ultimateBanner must clear normally even when the queued target no longer exists -- this is the actual bug: it used to stay stuck forever, permanently blocking End Turn');
  assert.equal(result.logMentionsFizzle, true, 'a fizzle message should still be logged instead of silently doing nothing');
  assert.deepEqual(pageErrors, [], 'no uncaught exception (the old bug: Cannot read properties of null, reading "card") should occur');

  await page.close();
});

test('Game feel phase 4c: Ifrit, Nyxara, Vaelira, Seraphine, Triune Desire, Bahamut, Tiamat, Three Head Dragon, Omega Weapon, Shiva, Odin, and Morvath\'s Ultimates play their real voice-line audio files on cast, other cards stay silent, and sound-off suppresses it', async () => {
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
    playUltimateVoiceLine('morvath');
    out.morvathCall = playCalls.slice();

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
  assert.deepEqual(result.morvathCall, ['voices/morvath.mp3'], "Morvath's Ultimate cast should play his voice-line file");
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

    await new Promise(r => setTimeout(r, ULTIMATE_WINDUP_MS + ULTIMATE_HITSTOP_MS + 1300 + 100));

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

    await new Promise(r => setTimeout(r, ULTIMATE_WINDUP_MS + ULTIMATE_HITSTOP_MS + 1300 + 100));
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

    await new Promise(r => setTimeout(r, ULTIMATE_WINDUP_MS + ULTIMATE_HITSTOP_MS + 50));
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

    await new Promise(r => setTimeout(r, ULTIMATE_WINDUP_MS + ULTIMATE_HITSTOP_MS + 50));
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

    await new Promise(r => setTimeout(r, ULTIMATE_WINDUP_MS + ULTIMATE_HITSTOP_MS + 50));
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

    await new Promise(r => setTimeout(r, ULTIMATE_WINDUP_MS + ULTIMATE_HITSTOP_MS + 50));
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

    await new Promise(r => setTimeout(r, ULTIMATE_WINDUP_MS + ULTIMATE_HITSTOP_MS + 50));
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

    await new Promise(r => setTimeout(r, ULTIMATE_WINDUP_MS + ULTIMATE_HITSTOP_MS + 50));

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

    await new Promise(r => setTimeout(r, ULTIMATE_WINDUP_MS + ULTIMATE_HITSTOP_MS + 50));

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

    await new Promise(r => setTimeout(r, ULTIMATE_WINDUP_MS + ULTIMATE_HITSTOP_MS + 50));

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

    await new Promise(r => setTimeout(r, ULTIMATE_WINDUP_MS + ULTIMATE_HITSTOP_MS + 50));

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

    await new Promise(r => setTimeout(r, ULTIMATE_WINDUP_MS + ULTIMATE_HITSTOP_MS + 50));

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

    await new Promise(r => setTimeout(r, ULTIMATE_WINDUP_MS + ULTIMATE_HITSTOP_MS + 50));

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

    await new Promise(r => setTimeout(r, ULTIMATE_WINDUP_MS + ULTIMATE_HITSTOP_MS + 50));

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
    // Fas 6 (design review #2): tiered per difficulty -- Hard keeps the
    // original threshold, Easy/Normal now stop playing exhaustively
    // (provably-perfect) endgame moves much earlier in the match.
    out.fullSearchThreshold = AI_FULL_SEARCH_MAX_EMPTY.easy === 2 && AI_FULL_SEARCH_MAX_EMPTY.normal === 3 && AI_FULL_SEARCH_MAX_EMPTY.hard === 5;

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

test('Fas 6 (design review #2): AI_FULL_SEARCH_MAX_EMPTY is tiered per difficulty -- Easy stops playing exhaustively-optimal endgame moves earlier than Normal/Hard', async () => {
  const { page, pageErrors } = await newPage();
  const result = await page.evaluate(`(() => {
    ${freshEntrySnippet()}
    const out = {};
    // Same trap shape as the 2-empty-cell test above, plus a third empty
    // cell (6) walled off from the contested zone (its only neighbors, 3
    // and 7, are same-owner red fillers throughout, so whatever goes there
    // never wins or loses a battle) and a second red card F (weak 1s, so
    // it never out-scores cardR's real captures at cell 1/4 either) to
    // fill it. This keeps the original trap/safe dynamic intact -- cell 1
    // first still scores 3 once blue replies optimally, cell 4 first still
    // scores 5 -- but now spread across 3 empty cells/plies instead of 2,
    // so Easy's new fullSearchMaxEmpty=2 threshold no longer covers it
    // while Normal's fullSearchMaxEmpty=3 (and Hard's =5) still do.
    const filler = { id:'filler', name:'Filler', top:10, right:10, bottom:10, left:10 };
    const W = { id:'w', name:'W', top:1, right:1, bottom:1, left:1 };
    const W2 = { id:'w2', name:'W2', top:1, right:1, bottom:1, left:1 };
    const F = { id:'f', name:'F', top:1, right:1, bottom:1, left:1 };
    const cardR = { id:'cardR', name:'CardR', top:9, right:5, bottom:1, left:8 };
    const cardB = { id:'cardB', name:'CardB', top:5, right:5, bottom:5, left:5 };

    function setupBoard(){
      state.board = Array(9).fill(null);
      state.rules = { same:false, plus:false, combo:false, elemental:false, graveyard:false };
      state.board[0] = freshEntry(W, 'blue');
      state.board[2] = freshEntry(filler, 'red');
      state.board[3] = freshEntry(filler, 'red');
      state.board[5] = freshEntry(W2, 'blue');
      state.board[7] = freshEntry(filler, 'red');
      state.board[8] = freshEntry(filler, 'red');
      // cell 6 left empty (was filler in the 2-cell version) for F to fill.
      state.playerHand = [cardB];
      state.enemyHand = [cardR, F];
      state.turn = 'red';
      state.phase = 'battle';
    }

    setupBoard();
    state.aiDifficulty = 'easy';
    out.easyFallsForTrap = chooseAIPlacement().cellIndex === 1;

    setupBoard();
    state.aiDifficulty = 'normal';
    out.normalPlaysSafe = chooseAIPlacement().cellIndex === 4;

    setupBoard();
    state.aiDifficulty = 'hard';
    out.hardPlaysSafe = chooseAIPlacement().cellIndex === 4;

    return out;
  })()`);
  assert.equal(result.easyFallsForTrap, true, "at 3 empty cells Easy's threshold (2) is exceeded, so it must fall back to its shallow depth-1 search and fall for the trap");
  assert.equal(result.normalPlaysSafe, true, "Normal's threshold (3) now covers 3 empty cells, so it must search exhaustively and avoid the trap -- this is the actual behavior change from the fix");
  assert.equal(result.hardPlaysSafe, true, "Hard's threshold (5) already covered this case before the fix -- must be unaffected");
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

test('Fas 4: campaign stages auto-assign AI difficulty (1-5 Easy, 6-11 Normal, 12+ Hard); manual choice still applies outside Campaign', async () => {
  const { page, pageErrors } = await newPage();
  const result = await page.evaluate(`(() => {
    const out = {};
    // 0-based stageIndex: stage 1 = index 0. campaignStageAIDifficulty is a
    // pure function of the index (idx>=11 -> hard, uncapped), so Fas 35
    // extending Campaign to 20 stages just means more indices land in the
    // already-existing "hard" bucket -- checked at both the old boundary
    // (index 16, once the finale, now "Sovereigns of the Deep") and the
    // new last index (CAMPAIGN_STAGES.length-1, "The Forbidden Union").
    out.stage1IsEasy = campaignStageAIDifficulty(0) === 'easy';
    out.stage5IsEasy = campaignStageAIDifficulty(4) === 'easy';
    out.stage6IsNormal = campaignStageAIDifficulty(5) === 'normal';
    out.stage11IsNormal = campaignStageAIDifficulty(10) === 'normal';
    out.stage12IsHard = campaignStageAIDifficulty(11) === 'hard';
    out.stage17IsHard = campaignStageAIDifficulty(16) === 'hard';
    out.finaleIsHard = campaignStageAIDifficulty(CAMPAIGN_STAGES.length - 1) === 'hard';

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
  assert.equal(result.finaleIsHard, true);
  assert.equal(result.campaignUsesStageDifficulty, true, "Campaign must use the stage's assigned difficulty, ignoring the player's manual Easy/Normal/Hard choice");
  assert.equal(result.nonCampaignUsesManualChoice, true, 'Random Draft/Choose Your Five must still fully respect the manual choice');
  assert.deepEqual(pageErrors, []);
  await page.close();
});

test('Fas 5: How to Play button has its own prominent styling, not the muted .ghost treatment', async () => {
  const { page, pageErrors } = await newPage();
  const result = await page.evaluate(`(() => {
    const out = {};
    const btn = document.getElementById('how-to-play-btn');
    out.exists = !!btn;
    out.noGhostClass = !btn.classList.contains('ghost');
    out.hasOwnClass = btn.classList.contains('how-to-play-btn');
    const cs = getComputedStyle(btn);
    out.hasVisibleBorder = cs.borderStyle === 'solid' && cs.borderWidth !== '0px';
    out.fillsWidth = cs.display === 'flex' && cs.width !== 'auto';
    return out;
  })()`);
  assert.equal(result.exists, true);
  assert.equal(result.noGhostClass, true, 'must no longer inherit .ghost\'s muted, easy-to-miss look');
  assert.equal(result.hasOwnClass, true);
  assert.equal(result.hasVisibleBorder, true, 'expects the new gold-bordered treatment');
  assert.equal(result.fillsWidth, true, 'expects a full-width flex button, not the old inline .ghost sizing');
  assert.deepEqual(pageErrors, []);
  await page.close();
});

test('Fas 5: hand-card info button gets an expanded invisible tap target on mobile without growing the visible badge', async () => {
  const { page, pageErrors } = await newPage();
  await page.setViewportSize({ width: 375, height: 700 });
  const result = await page.evaluate(`(() => {
    const out = {};
    const card = findCardById('bahamut');
    document.body.insertAdjacentHTML('beforeend', '<div class="side-hand hand-row">' + cardFace(card, { clickable:true }) + '</div>');
    const btn = document.querySelector('.side-hand.hand-row .info-btn');
    out.visibleBadgeStaysTiny = getComputedStyle(btn).width === '13px';
    const before = getComputedStyle(btn, '::before');
    out.beforeIsAbsolute = before.position === 'absolute';
    out.beforeExpandsOutward = before.top === '-6px' && before.right === '-6px' && before.bottom === '-6px' && before.left === '-6px';
    return out;
  })()`);
  assert.equal(result.visibleBadgeStaysTiny, true, 'the rendered badge must stay 13px so it does not collide with neighboring badges');
  assert.equal(result.beforeIsAbsolute, true);
  assert.equal(result.beforeExpandsOutward, true, 'the invisible ::before overlay should expand the tappable area ~6px in every direction');
  assert.deepEqual(pageErrors, []);
  await page.close();
});

test('Fas 5: rulebook page images carry real English alt text describing their actual (Swedish-language) content', async () => {
  const { page, pageErrors } = await newPage();
  const result = await page.evaluate(`(() => {
    const out = {};
    out.altArrayMatchesPageCount = RULEBOOK_PAGE_ALT.length === RULEBOOK_PAGES.length;
    out.everyEntryIsNonTrivialText = RULEBOOK_PAGE_ALT.every(t => typeof t === 'string' && t.length > 40);
    state.showRulebook = true;
    state.rulebookPage = 0;
    const htmlFirst = renderRulebookModal();
    out.firstPageAltIncludesRealText = htmlFirst.includes(RULEBOOK_PAGE_ALT[0]);
    state.rulebookPage = 3;
    const htmlFourth = renderRulebookModal();
    out.fourthPageAltIncludesRealText = htmlFourth.includes(RULEBOOK_PAGE_ALT[3]);
    out.stillIncludesPageNumberFallback = htmlFourth.includes('Rulebook page 4 of');
    return out;
  })()`);
  assert.equal(result.altArrayMatchesPageCount, true);
  assert.equal(result.everyEntryIsNonTrivialText, true);
  assert.equal(result.firstPageAltIncludesRealText, true);
  assert.equal(result.fourthPageAltIncludesRealText, true);
  assert.equal(result.stillIncludesPageNumberFallback, true, 'page-number text stays as a prefix alongside the new description');
  assert.deepEqual(pageErrors, []);
  await page.close();
});

test('Fas 6 (design review #2): cloneScratchBoard preserves shield/turnsStanding state, so the AI search no longer misjudges shielded or Ancient-Wyrmking-style cards', async () => {
  const { page, pageErrors } = await newPage();
  const result = await page.evaluate(`(() => {
    const out = {};
    const attacker = { id:'atk', name:'Atk', top:9, right:9, bottom:9, left:9 };

    // 1. A currently-active granted shield (e.g. Tahabata's Soul
    //    Petrification) must still block the simulated capture -- before
    //    the fix, cloneScratchBoard dropped grantedShield entirely, so the
    //    AI's search saw every shielded card as freely capturable.
    const shieldedDefender = { id:'def1', name:'Def1', top:1, right:1, bottom:1, left:1 };
    state.board = Array(9).fill(null);
    state.board[1] = { card: shieldedDefender, owner:'blue', grantedShield:true, shieldUsed:false, captureBonus:0 };
    let scratch = simulatePlacementOutcome(state.board, 4, attacker, 'red');
    out.activeGrantedShieldBlocksCapture = scratch[1].owner === 'blue';

    // 2. A one-time active.shield that has ALREADY been spent (shieldUsed:
    //    true on the real board) must NOT re-protect the card in
    //    simulation -- before the fix, the clone always reset shieldUsed
    //    to falsy, so the AI stayed needlessly cautious around a card it
    //    had already broken through for the rest of the match.
    const spentShieldDefender = { id:'def2', name:'Def2', top:1, right:1, bottom:1, left:1, active:{ shield:true } };
    state.board = Array(9).fill(null);
    state.board[1] = { card: spentShieldDefender, owner:'blue', grantedShield:false, shieldUsed:true, captureBonus:0 };
    scratch = simulatePlacementOutcome(state.board, 4, attacker, 'red');
    out.spentShieldNoLongerBlocksCapture = scratch[1].owner === 'red';

    // 3. An UNUSED active.shield must still block, same as the real game --
    //    confirms the fix widens what's preserved without breaking the
    //    still-shielded case.
    const unusedShieldDefender = { id:'def3', name:'Def3', top:1, right:1, bottom:1, left:1, active:{ shield:true } };
    state.board = Array(9).fill(null);
    state.board[1] = { card: unusedShieldDefender, owner:'blue', grantedShield:false, shieldUsed:false, captureBonus:0 };
    scratch = simulatePlacementOutcome(state.board, 4, attacker, 'red');
    out.unusedShieldStillBlocksCapture = scratch[1].owner === 'blue';

    // 4. Ancient Wyrmking's weightOfAges margin wall (+1 per 2 turns
    //    standing, capped at +2) was entirely uncomputed in
    //    simulatePlacementOutcome's battleOneNeighbor before the fix, so
    //    the AI's search never saw it at all. Attacker beats Wyrmking by
    //    exactly 1 (9 vs 8) -- with 4 turns standing (bonus 2), that margin
    //    isn't enough to capture; with 0 turns standing (bonus 0), it is.
    const wyrmking = { id:'wyrm', name:'Wyrm', top:8, right:8, bottom:8, left:8, active:{ weightOfAges:true } };
    state.board = Array(9).fill(null);
    state.board[1] = { card: wyrmking, owner:'blue', grantedShield:false, shieldUsed:false, captureBonus:0, turnsStanding:4 };
    scratch = simulatePlacementOutcome(state.board, 4, attacker, 'red');
    out.agedWyrmkingResistsNarrowCapture = scratch[1].owner === 'blue';

    state.board = Array(9).fill(null);
    state.board[1] = { card: wyrmking, owner:'blue', grantedShield:false, shieldUsed:false, captureBonus:0, turnsStanding:0 };
    scratch = simulatePlacementOutcome(state.board, 4, attacker, 'red');
    out.freshWyrmkingIsCaptured = scratch[1].owner === 'red';

    return out;
  })()`);
  assert.equal(result.activeGrantedShieldBlocksCapture, true);
  assert.equal(result.spentShieldNoLongerBlocksCapture, true);
  assert.equal(result.unusedShieldStillBlocksCapture, true);
  assert.equal(result.agedWyrmkingResistsNarrowCapture, true, "weightOfAges' margin bonus must now be visible to the AI's search");
  assert.equal(result.freshWyrmkingIsCaptured, true, 'a freshly-placed Wyrmking (no standing bonus yet) must still be capturable at the same narrow margin');
  assert.deepEqual(pageErrors, []);
  await page.close();
});

test('Fas 6 (design review #2): Same/Plus/Combo default ON for a fresh page (Random Draft/Choose Your Five); Elemental/Graveyard stay opt-in; Campaign still fully overrides from its own per-stage rules', async () => {
  const { page, pageErrors } = await newPage();
  const result = await page.evaluate(`(() => {
    const out = {};
    out.sameOnByDefault = state.rules.same === true;
    out.plusOnByDefault = state.rules.plus === true;
    out.comboOnByDefault = state.rules.combo === true;
    out.elementalOffByDefault = state.rules.elemental === false;
    out.graveyardOffByDefault = state.rules.graveyard === false;

    // resetGame() must keep whatever the player last set, same as every
    // other preference it preserves (aiDifficulty, fastMode, draftMode).
    state.rules.same = false;
    resetGame();
    out.resetGamePreservesCurrentChoice = state.rules.same === false;

    // Campaign must still fully overwrite from CAMPAIGN_STAGES' own
    // per-stage rules regardless of this default -- confirms the fix
    // didn't touch the campaign escalation curve at all.
    state.draftMode = 'campaign';
    campaignProgress = { stageIndex: 0, unlocked: [], ngPlus: 0 };
    startCampaignBattle();
    out.campaignStage1StillAllOff = !state.rules.same && !state.rules.plus && !state.rules.combo && !state.rules.elemental;

    return out;
  })()`);
  assert.equal(result.sameOnByDefault, true);
  assert.equal(result.plusOnByDefault, true);
  assert.equal(result.comboOnByDefault, true);
  assert.equal(result.elementalOffByDefault, true, 'Elemental stays opt-in -- a flat +1 that many cards sit outside of');
  assert.equal(result.graveyardOffByDefault, true, 'Graveyard stays opt-in -- reviving cards would surprise a new player');
  assert.equal(result.resetGamePreservesCurrentChoice, true);
  assert.equal(result.campaignStage1StillAllOff, true, "Campaign's own stage-1 rules (all off) must be untouched by this default change");
  assert.deepEqual(pageErrors, []);
  await page.close();
});

test('Fas 6 (design review #2): Fast Mode persists via localStorage, survives resetGame(), and scales routine timing constants without touching Ultimate spectacle timing', async () => {
  const { page, pageErrors } = await newPage();
  const result = await page.evaluate(`(() => {
    const out = {};
    out.defaultsToOff = state.fastMode === false;
    out.fxTimeIsNoOpWhenOff = fxTime(1000) === 1000;

    toggleFastMode();
    out.toggleTurnsOn = state.fastMode === true;
    out.savedToLocalStorage = localStorage.getItem(FAST_MODE_SAVE_KEY) === '1';
    out.loadReturnsSaved = loadFastMode() === true;
    out.fxTimeScalesDownWhenOn = fxTime(1000) === Math.round(1000 * FAST_MODE_SCALE) && fxTime(1000) < 1000;

    // Deliberately NOT scaled -- Ultimate cast/shake/cleanup windows are
    // the spectacle payoff, not per-move friction (see fxTime's own
    // comment in index.html).
    out.ultimateWindupUntouched = ULTIMATE_WINDUP_MS === 950;

    resetGame();
    out.survivesReset = state.fastMode === true;

    toggleFastMode();
    out.toggleTurnsOffAndPersists = state.fastMode === false && localStorage.getItem(FAST_MODE_SAVE_KEY) === '0';

    return out;
  })()`);
  assert.equal(result.defaultsToOff, true);
  assert.equal(result.fxTimeIsNoOpWhenOff, true);
  assert.equal(result.toggleTurnsOn, true);
  assert.equal(result.savedToLocalStorage, true);
  assert.equal(result.loadReturnsSaved, true);
  assert.equal(result.fxTimeScalesDownWhenOn, true);
  assert.equal(result.ultimateWindupUntouched, true);
  assert.equal(result.survivesReset, true, 'resetGame() must preserve Fast Mode like it already does for aiDifficulty/rules');
  assert.equal(result.toggleTurnsOffAndPersists, true);
  assert.deepEqual(pageErrors, []);
  await page.close();
});

test('Fas 6 (design review #2): the arena-frame only carries fast-mode when state.fastMode is on, and the masthead toggle button reflects it', async () => {
  const { page, pageErrors } = await newPage();
  const result = await page.evaluate(`(() => {
    const out = {};
    state.phase = 'battle';
    state.board = Array(9).fill(null);
    state.playerHand = []; state.enemyHand = [];

    state.fastMode = false;
    let html = renderBattle();
    out.noFastModeClassWhenOff = !/class="arena-frame [^"]*fast-mode/.test(html) && !html.includes('arena-frame fast-mode');

    state.fastMode = true;
    html = renderBattle();
    out.fastModeClassWhenOn = html.includes('fast-mode');

    const mastheadHtml = masthead(false);
    out.toggleButtonPresent = mastheadHtml.includes('id="fast-toggle"');
    out.toggleShowsOnState = /class="fast-toggle on"/.test(mastheadHtml);

    return out;
  })()`);
  assert.equal(result.noFastModeClassWhenOff, true);
  assert.equal(result.fastModeClassWhenOn, true);
  assert.equal(result.toggleButtonPresent, true);
  assert.equal(result.toggleShowsOnState, true);
  assert.deepEqual(pageErrors, []);
  await page.close();
});

test('Fas 6 (design review #2): the result screen surfaces the win streak (with a new-best flag) and favorite champion right when the match ends, non-campaign only', async () => {
  const { page, pageErrors } = await newPage();
  const result = await page.evaluate(`(() => {
    const out = {};
    try { localStorage.removeItem(MATCH_STATS_SAVE_KEY); } catch(e){}
    matchStats = { matches:0, wins:0, losses:0, draws:0, currentStreak:0, bestStreak:0, cardWins:{} };
    state.draftMode = 'random';
    state.selected = ['bahamut','sarah','zaevir','vayra','darien'];

    function finishAsWin(){
      state.board = ['bahamut','sarah','zaevir','vayra','darien','ogre','ogre','ogre','ogre'].map((id,i) =>
        i < 5 ? { card: findCardById(id), owner:'blue' } : { card: findCardById(id), owner:'red' });
      state.phase = 'battle';
      finishGame();
    }

    // First win: streak 1, not yet worth surfacing (< 2), but a favorite
    // champion already exists after a single win.
    finishAsWin();
    let html = renderBattle();
    out.singleWinHidesStreakLine = !html.includes('win streak');
    out.singleWinShowsFavorite = html.includes('Favorite champion') && html.includes('Bahamut');

    // Second consecutive win: 2-win streak, first time it equals bestStreak
    // -- must show the "new best" flag.
    finishAsWin();
    html = renderBattle();
    out.secondWinShowsStreak = html.includes('2-win streak');
    out.secondWinFlagsNewBest = html.includes('new best');

    // Third consecutive win: still climbing (3 > previous best of 2) --
    // still a new best, just at a higher number.
    finishAsWin();
    html = renderBattle();
    out.thirdWinShowsStreakThree = html.includes('3-win streak');
    out.thirdWinStillNewBest = html.includes('new best');

    // A loss resets the streak to 0 -- nothing streak-related to show,
    // and it must never claim a "new best" on a loss.
    state.board = ['bahamut','sarah','zaevir','vayra','darien','ogre','ogre','ogre','ogre'].map((id,i) =>
      i < 5 ? { card: findCardById(id), owner:'red' } : { card: findCardById(id), owner:'blue' });
    state.phase = 'battle';
    finishGame();
    html = renderBattle();
    out.lossHidesStreakLine = !html.includes('win streak') && !html.includes('new best');

    // Campaign matches never touch matchStats (recordMatchResult is a
    // no-op there) -- the result screen must show no stats line at all.
    state.draftMode = 'campaign';
    campaignProgress = { stageIndex: 0, unlocked: [], ngPlus: 0 };
    state.board = ['bahamut','sarah','zaevir','vayra','darien','ogre','ogre','ogre','ogre'].map((id,i) =>
      i < 5 ? { card: findCardById(id), owner:'blue' } : { card: findCardById(id), owner:'red' });
    state.phase = 'battle';
    finishGame();
    html = renderBattle();
    out.campaignShowsNoStatsLine = !html.includes('result-stats');

    return out;
  })()`);
  assert.equal(result.singleWinHidesStreakLine, true, 'a 1-win streak is not yet worth surfacing');
  assert.equal(result.singleWinShowsFavorite, true);
  assert.equal(result.secondWinShowsStreak, true);
  assert.equal(result.secondWinFlagsNewBest, true);
  assert.equal(result.thirdWinShowsStreakThree, true);
  assert.equal(result.thirdWinStillNewBest, true);
  assert.equal(result.lossHidesStreakLine, true);
  assert.equal(result.campaignShowsNoStatsLine, true, 'Campaign has its own stage-progress feedback, never Random Draft/Choose Your Five stats');
  assert.deepEqual(pageErrors, []);
  await page.close();
});

test('Fas 6 (design review #2): a Petrified card with an unused Special no longer hides one badge behind the other', async () => {
  const { page, pageErrors } = await newPage();
  const result = await page.evaluate(`(() => {
    const out = {};
    const card = findCardById('bahamut');
    const specialInfo = { ready:true, title:'Test Special' };
    const faceHtml = cardFace(card, { clickable:true, petrified:true, specialInfo });
    document.body.insertAdjacentHTML('beforeend', '<div class="cell">' + faceHtml + '</div>');
    const petrified = document.querySelector('.petrified-badge');
    const diamond = document.querySelector('.special-diamond');
    out.bothBadgesPresent = !!petrified && !!diamond;
    const petrifiedBottom = getComputedStyle(petrified).bottom;
    const diamondBottom = getComputedStyle(diamond).bottom;
    out.diamondOffsetWhenBothPresent = diamondBottom !== petrifiedBottom;

    // Without petrification, the diamond must stay at its normal slot
    // (bottom:4px) -- confirms the sibling-selector fix is scoped to the
    // actual collision case, not a blanket repositioning.
    document.body.innerHTML = '';
    const soloFaceHtml = cardFace(card, { clickable:true, specialInfo });
    document.body.insertAdjacentHTML('beforeend', '<div class="cell">' + soloFaceHtml + '</div>');
    out.diamondStaysAtDefaultSlotWithoutPetrification = getComputedStyle(document.querySelector('.special-diamond')).bottom === '4px';

    return out;
  })()`);
  assert.equal(result.bothBadgesPresent, true);
  assert.equal(result.diamondOffsetWhenBothPresent, true, 'the two badges must no longer render at the exact same position');
  assert.equal(result.diamondStaysAtDefaultSlotWithoutPetrification, true);
  assert.deepEqual(pageErrors, []);
  await page.close();
});

test('Fas 7 (design review #2): three of the seven reworked copy-paste Ultimates get real mechanical hooks existing tests happened not to exercise -- Sarah shields an ally, Vayra ignores shields, Ragnar splashes a second enemy', async () => {
  const { page, pageErrors } = await newPage();
  const result = await page.evaluate(`(() => {
    ${freshEntrySnippet()}
    const out = {};

    // Sarah's Aion's Last Light: on a win, shields a random OTHER ally
    // (not herself, not the target) -- needs a second blue card on board
    // to actually observe, which the pre-existing Sarah test's minimal
    // 2-card setup never had.
    state.board = Array(9).fill(null);
    const sSrc = freshEntry(findCardById('sarah'), 'blue');
    const sAlly = freshEntry({ id:'s-ally', name:'SAlly', top:5,right:5,bottom:5,left:5 }, 'blue');
    const sTarget = freshEntry({ id:'s-weak', name:'SWeak', top:1,right:1,bottom:1,left:1 }, 'red');
    state.board[4] = sSrc; state.board[0] = sAlly; state.board[1] = sTarget;
    SPECIAL_HANDLERS.sarah({ srcEntry: sSrc, targetEntry: sTarget, targetIndex: 1, owner: 'blue' });
    out.sarahShieldedTheOnlyOtherAlly = sTarget.owner === 'blue' && sAlly.grantedShield === true && sSrc.grantedShield !== true;

    // Vayra's Eclipse: ignores an active granted shield entirely -- the
    // pre-existing Vayra test's target never had a shield, so this never
    // got exercised.
    state.board = Array(9).fill(null);
    const vSrc = freshEntry(findCardById('vayra'), 'blue');
    const vTarget = freshEntry({ id:'v-weak', name:'VWeak', top:1,right:1,bottom:1,left:1 }, 'red');
    vTarget.grantedShield = true;
    state.board[4] = vSrc; state.board[1] = vTarget;
    SPECIAL_HANDLERS.vayra({ srcEntry: vSrc, targetEntry: vTarget, targetIndex: 1, owner: 'blue' });
    out.eclipseIgnoredTheShield = vTarget.owner === 'blue';

    // Ragnar's Blood Fury: on a win, also splashes -2-this-round onto a
    // SECOND enemy -- the pre-existing Ragnar test only ever had the one
    // target on board, so there was never a second enemy to splash onto.
    state.board = Array(9).fill(null);
    const rSrc = freshEntry(findCardById('ragnar'), 'blue');
    const rTarget = freshEntry({ id:'r-weak', name:'RWeak', top:1,right:1,bottom:1,left:1 }, 'red');
    const rOther = freshEntry({ id:'r-other', name:'ROther', top:5,right:5,bottom:5,left:5 }, 'red');
    state.board[4] = rSrc; state.board[1] = rTarget; state.board[8] = rOther;
    SPECIAL_HANDLERS.ragnar({ srcEntry: rSrc, targetEntry: rTarget, targetIndex: 1, owner: 'blue' });
    out.bloodFurySplashedTheOnlyOtherEnemy = rTarget.owner === 'blue' && rOther.captureBonus === -2;

    return out;
  })()`);
  assert.equal(result.sarahShieldedTheOnlyOtherAlly, true, "Aion's Last Light must shield an ally, never herself, on a win");
  assert.equal(result.eclipseIgnoredTheShield, true, 'Eclipse must bypass a granted shield entirely');
  assert.equal(result.bloodFurySplashedTheOnlyOtherEnemy, true, "Blood Fury's rage must splash onto a second enemy, -2 this round");
  assert.deepEqual(pageErrors, []);
  await page.close();
});

test("Fas 7 (design review #2): Ifrit's Rage of the Beast wires in the last dead ability -- +2 this round when a DIFFERENT card on his side is captured, never on his own capture", async () => {
  const { page, pageErrors } = await newPage();
  const result = await page.evaluate(`(() => {
    ${freshEntrySnippet()}
    const out = {};
    const ifrit = findCardById('ifrit');
    out.hasRageFlag = ifrit.active.rageOfTheBeast === true;
    state.rules = { same:false, plus:false, combo:false, elemental:false, graveyard:false };
    state.playerHand = [1,2]; state.enemyHand = [1,2];

    // A different blue card gets captured by a red attacker -- Ifrit (also
    // blue, but not the one losing) should rage: +2 all sides this round.
    state.board = Array(9).fill(null);
    const ragingIfrit = freshEntry(ifrit, 'blue');
    const ally = freshEntry({ id:'rage-ally', name:'RageAlly', top:1,right:1,bottom:1,left:1 }, 'blue');
    state.board[0] = ragingIfrit; // corner, not adjacent to cell 4
    state.board[4] = { card: { id:'rage-atk', name:'RageAtk', top:9,right:9,bottom:9,left:9 }, owner:'red', shieldUsed:false, grantedShield:false, captureBonus:0 };
    state.board[1] = ally; // adjacent to the attacker at 4
    resolveFlips(4, 'red');
    out.allyCaptured = state.board[1].owner === 'red';
    out.ifritRaged = fullEffectiveValue(ifrit, 'top', {top:1,right:1,bottom:1,left:1}, 0, 'blue', 'defense') - ifrit.top === 2;

    // Ifrit himself being captured must NOT trigger self-rage.
    state.board = Array(9).fill(null);
    const selfIfrit = freshEntry(ifrit, 'blue');
    state.board[4] = { card: { id:'rage-atk2', name:'RageAtk2', top:9,right:9,bottom:9,left:9 }, owner:'red', shieldUsed:false, grantedShield:false, captureBonus:0 };
    state.board[1] = selfIfrit; // adjacent to the attacker, captured directly
    resolveFlips(4, 'red');
    out.ifritSelfCaptured = state.board[1].owner === 'red';
    out.noSelfRage = selfIfrit.captureBonus === 0;

    return out;
  })()`);
  assert.equal(result.hasRageFlag, true);
  assert.equal(result.allyCaptured, true, 'test setup: the ally must actually be captured');
  assert.equal(result.ifritRaged, true, "Ifrit must gain +2 all sides this round when a different card on his side is captured");
  assert.equal(result.ifritSelfCaptured, true, 'test setup: Ifrit himself must actually be captured');
  assert.equal(result.noSelfRage, true, "Ifrit must not rage from his own capture (only a teammate's)");
  assert.deepEqual(pageErrors, []);
  await page.close();
});

test('Fas 7 (design review #2, revised Fas 33): campaign stages get a flat statBoost on top of AI difficulty, stacking additively with (not capped by) New Game+, except the two guaranteed-synergy-pair stages and the finale', async () => {
  const { page, pageErrors } = await newPage();
  const result = await page.evaluate(`(() => {
    const out = {};
    // Stages 1-8 (index 0-7) and the finale (last index, CAMPAIGN_STAGES.
    // length-1 -- Fas 35 made this Triune Desire's "The Forbidden Union"
    // at index 19, not the Sisters at index 16 any more) get no statBoost.
    // Stage 9 "Hunter's Pact" (index 8) and stage 11 "The Twin Storm"
    // (index 10) also get none -- a Fas 33 balance pass removed it after
    // simulation showed those two Normal-AI stages were already the
    // hardest in the back half thanks to a guaranteed synergy pair
    // (Aurelian+Vorlix / Evil Twist Yin+Yang) on their fixed roster, so
    // stacking a flat boost on top only worsened an already-sharp spike.
    // A second, follow-up user report -- stuck at stage 12 on NG+1 -- then
    // surfaced that statBoost stacks additively with ngPlusBoostCard's own
    // +2/cycle, so the intended within-playthrough ramp was hitting NG+
    // players much harder than a first clear; the remaining boosted
    // stages 10,12,13,14,15,16 (index 9,11,12,13,14,15) were halved from
    // 1,2,2,2,3,3 to 1,1,1,1,2,2 to leave NG+ headroom to stack on top
    // without tipping into unwinnable. Fas 35 then added two more boosted
    // stages (index 16,17, "Sovereigns of the Deep"/"The Silent
    // Reckoning") at statBoost:2, matching Ashes and Frost/Wyrmking's
    // Domain right before them rather than escalating further.
    out.earlyStagesUnboosted = CAMPAIGN_STAGES.slice(0, 8).every(s => !s.statBoost);
    out.finaleUnboosted = !CAMPAIGN_STAGES[CAMPAIGN_STAGES.length - 1].statBoost;
    out.pairStagesUnboosted = !CAMPAIGN_STAGES[8].statBoost && !CAMPAIGN_STAGES[10].statBoost;
    out.lateStageBoosts = [9,11,12,13,14,15,16,17].map(i => CAMPAIGN_STAGES[i].statBoost).join(',') === '1,1,1,1,2,2,2,2';

    const card = { id:'boost-test', name:'BoostTest', top:5, right:5, bottom:5, left:5 };
    out.zeroBoostReturnsSameCard = campaignStatBoost(card, 0) === card;
    const boosted = campaignStatBoost(card, 3);
    out.boostAddsFlatAmount = boosted.top === 8 && boosted.right === 8 && boosted.bottom === 8 && boosted.left === 8;
    out.originalCardUntouched = card.top === 5;

    // statBoost and NG+ must stack additively, not compound or cap each
    // other -- NG+2 (flat +4, capped at 3 cycles) plus a stage statBoost
    // of 2 should total +6, not get folded into NG+'s own Math.min(...,3) cap.
    const stacked = campaignStatBoost(ngPlusBoostCard(card, 2), 2);
    out.stacksAdditively = stacked.top === 5 + 4 + 2;

    // Wire-up: startBattle() must actually apply it for a real campaign stage.
    state.draftMode = 'campaign';
    campaignProgress = { stageIndex: 9, unlocked: [], ngPlus: 0 }; // stage 10, statBoost 1
    state.selected = HEROES.slice(0, 5).map(h => h.id);
    startBattle();
    const stage10Enemy = FOREST_FOES.find(f => f.id === CAMPAIGN_STAGES[9].enemyIds[0]);
    const placedEnemy = state.enemyHand.find(c => c.id === stage10Enemy.id);
    out.startBattleAppliesStatBoost = placedEnemy.top === stage10Enemy.top + 1;

    return out;
  })()`);
  assert.equal(result.earlyStagesUnboosted, true);
  assert.equal(result.finaleUnboosted, true, 'the Sisters finale stays a pure difficulty/thematic peak, not a bigger-numbers one');
  assert.equal(result.pairStagesUnboosted, true, "Hunter's Pact and The Twin Storm must stay unboosted -- their guaranteed synergy pair is already the difficulty spike");
  assert.equal(result.lateStageBoosts, true);
  assert.equal(result.zeroBoostReturnsSameCard, true);
  assert.equal(result.boostAddsFlatAmount, true);
  assert.equal(result.originalCardUntouched, true, 'campaignStatBoost must never mutate the shared FOREST_FOES object');
  assert.equal(result.stacksAdditively, true, "a stage's own statBoost and New Game+ must stack additively, never cap each other");
  assert.equal(result.startBattleAppliesStatBoost, true, "startBattle() must actually apply the current stage's statBoost to the drawn enemy hand");
  assert.deepEqual(pageErrors, []);
  await page.close();
});

test('Fas 7 (design review #2): a lightweight achievement list unlocks from existing matchStats/state data, persists, never fires in Campaign, and surfaces on the result screen', async () => {
  const { page, pageErrors } = await newPage();
  const result = await page.evaluate(`(() => {
    ${freshEntrySnippet()}
    const out = {};
    try { localStorage.removeItem(ACHIEVEMENTS_SAVE_KEY); localStorage.removeItem(MATCH_STATS_SAVE_KEY); } catch(e){}
    unlockedAchievements = [];
    matchStats = { matches:0, wins:0, losses:0, draws:0, currentStreak:0, bestStreak:0, cardWins:{} };
    state.draftMode = 'random';
    state.selected = ['bahamut','sarah','zaevir','vayra','darien'];
    state.aiDifficulty = 'easy';
    state.rules = { same:false, plus:false, combo:false, elemental:false, graveyard:false };

    function winningBoard(){
      return ['bahamut','sarah','zaevir','vayra','darien','ogre','ogre','ogre','ogre'].map((id,i) =>
        i < 5 ? { card: findCardById(id), owner:'blue' } : { card: findCardById(id), owner:'red' });
    }

    // First Blood: fires on the very first win.
    state.board = winningBoard();
    state.phase = 'battle';
    finishGame();
    out.firstBloodUnlocked = state.newAchievements.includes('first-blood');
    out.firstBloodPersisted = unlockedAchievements.includes('first-blood');
    out.savedToLocalStorage = JSON.parse(localStorage.getItem(ACHIEVEMENTS_SAVE_KEY)).includes('first-blood');

    // Never fires twice.
    state.board = winningBoard();
    state.phase = 'battle';
    finishGame();
    out.firstBloodNotReUnlocked = !state.newAchievements.includes('first-blood');

    // Total Domination: win by controlling all 9 squares.
    state.board = ['bahamut','sarah','zaevir','vayra','darien','ogre','ogre','ogre','ogre'].map(id => ({ card: findCardById(id), owner:'blue' }));
    state.phase = 'battle';
    finishGame();
    out.totalDominationUnlocked = state.newAchievements.includes('total-domination');

    // Hard-Fought Victory: win with AI difficulty set to Hard.
    unlockedAchievements = unlockedAchievements.filter(id => id !== 'hard-fought');
    state.aiDifficulty = 'hard';
    state.board = winningBoard();
    state.phase = 'battle';
    finishGame();
    out.hardFoughtUnlocked = state.newAchievements.includes('hard-fought');
    state.aiDifficulty = 'easy';

    // Purist: win with every optional rule active.
    unlockedAchievements = unlockedAchievements.filter(id => id !== 'purist');
    state.rules = { same:true, plus:true, combo:true, elemental:true, graveyard:false };
    state.board = winningBoard();
    state.phase = 'battle';
    finishGame();
    out.puristUnlocked = state.newAchievements.includes('purist');
    state.rules = { same:false, plus:false, combo:false, elemental:false, graveyard:false };

    // On a Roll: a 5-win streak (matchStats.currentStreak already climbing
    // from the wins above -- force it to exactly 4 so this next win ticks it to 5).
    matchStats.currentStreak = 4;
    unlockedAchievements = unlockedAchievements.filter(id => id !== 'on-a-roll');
    state.board = winningBoard();
    state.phase = 'battle';
    finishGame();
    out.onARollUnlocked = state.newAchievements.includes('on-a-roll') && matchStats.currentStreak === 5;

    // Veteran: 10 total wins.
    matchStats.wins = 9;
    unlockedAchievements = unlockedAchievements.filter(id => id !== 'veteran');
    state.board = winningBoard();
    state.phase = 'battle';
    finishGame();
    out.veteranUnlocked = state.newAchievements.includes('veteran') && matchStats.wins === 10;

    // Campaign mode: checkAchievements must always return [] there, even
    // for an objectively-qualifying win (matches recordMatchResult's own
    // campaign no-op).
    unlockedAchievements = [];
    state.draftMode = 'campaign';
    state.board = ['bahamut','sarah','zaevir','vayra','darien','ogre','ogre','ogre','ogre'].map(id => ({ card: findCardById(id), owner:'blue' }));
    state.phase = 'battle';
    out.campaignNeverUnlocks = checkAchievements('blue', 9).length === 0;

    // Result screen surfaces a newly unlocked achievement.
    state.draftMode = 'random';
    unlockedAchievements = [];
    matchStats = { matches:0, wins:0, losses:0, draws:0, currentStreak:0, bestStreak:0, cardWins:{} };
    state.board = winningBoard();
    state.phase = 'battle';
    finishGame();
    const html = renderBattle();
    out.resultScreenShowsAchievement = html.includes('Achievement unlocked') && html.includes('First Blood');

    return out;
  })()`);
  assert.equal(result.firstBloodUnlocked, true);
  assert.equal(result.firstBloodPersisted, true);
  assert.equal(result.savedToLocalStorage, true);
  assert.equal(result.firstBloodNotReUnlocked, true, 'an achievement must only ever unlock once');
  assert.equal(result.totalDominationUnlocked, true);
  assert.equal(result.hardFoughtUnlocked, true);
  assert.equal(result.puristUnlocked, true);
  assert.equal(result.onARollUnlocked, true);
  assert.equal(result.veteranUnlocked, true);
  assert.equal(result.campaignNeverUnlocks, true, 'Campaign has its own stage-progress reward loop, never achievements');
  assert.equal(result.resultScreenShowsAchievement, true);
  assert.deepEqual(pageErrors, []);
  await page.close();
});

test('Fas 8 (design review #2, VFX expansion): cellCenterPercent/angleAndLengthPercent geometry helpers produce the exact same numbers the 7 existing cards previously computed inline', async () => {
  const { page, pageErrors } = await newPage();
  const result = await page.evaluate(`(() => {
    const out = {};
    // Center cell (4): dead center, 50/50.
    const center = cellCenterPercent(4);
    out.centerIsFiftyFifty = Math.abs(center.x - 50) < 1e-9 && Math.abs(center.y - 50) < 1e-9;
    // Corner cells: (0,0) top-left -> (16.67, 16.67); (8) bottom-right -> (83.33, 83.33).
    const topLeft = cellCenterPercent(0);
    const bottomRight = cellCenterPercent(8);
    out.topLeftCorrect = Math.abs(topLeft.x - 100/6) < 1e-9 && Math.abs(topLeft.y - 100/6) < 1e-9;
    out.bottomRightCorrect = Math.abs(bottomRight.x - 500/6) < 1e-9 && Math.abs(bottomRight.y - 500/6) < 1e-9;

    // Angle/length: a target directly to the right (same row) must be
    // angle 0, and a target directly below (same column) must account
    // for the wrapper's 5/7 aspect-ratio normalization (not a naive 90deg
    // for equal raw percentage deltas).
    const rightOf = angleAndLengthPercent(50, 50, 83.33, 50);
    out.rightAngleIsZero = Math.abs(rightOf.angleDeg) < 0.01;
    const below = angleAndLengthPercent(50, 50, 50, 83.33);
    out.belowAngleIsNinety = Math.abs(below.angleDeg - 90) < 0.01;
    out.belowLengthReflectsAspectRatio = Math.abs(below.lengthPercent - 33.33 * (7/5)) < 0.1;

    return out;
  })()`);
  assert.equal(result.centerIsFiftyFifty, true);
  assert.equal(result.topLeftCorrect, true);
  assert.equal(result.bottomRightCorrect, true);
  assert.equal(result.rightAngleIsZero, true);
  assert.equal(result.belowAngleIsNinety, true);
  assert.equal(result.belowLengthReflectsAspectRatio, true, 'the 5/7 aspect-ratio normalization must survive the extraction into a shared helper');
  assert.deepEqual(pageErrors, []);
  await page.close();
});

test('Fas 8 (design review #2, VFX expansion): the geometry refactor left every existing card\'s derived VFX positions/angles numerically unchanged', async () => {
  const { page, pageErrors } = await newPage();
  const result = await page.evaluate(`(() => {
    const out = {};
    state.phase = 'battle';

    // Nyxara (single-origin AOE): origin must be her own cell's center.
    state.board = Array(9).fill(null);
    state.board[0] = { card: findCardById('nyxara'), owner:'blue' };
    state.board[1] = { card: findCardById('ogre'), owner:'red' };
    state.ultimateBanner = { phase:'impact', owner:'blue', name:'Void Dominion', sourceIndex:0, targetIndex:null, enemyIndices:[1] };
    let html = renderBattle();
    const nyxaraCenter = cellCenterPercent(0);
    out.nyxaraOriginCorrect = html.includes('--void-x:' + nyxaraCenter.x + '%') && html.includes('--void-y:' + nyxaraCenter.y + '%');

    // Bahamut (enemyIndices-based hit delays derived from horizontal
    // distance from his own column): a target in the SAME column should
    // get the minimum possible delay (horizFraction 0 -> hitDelay 0.15 + n*0.02).
    state.board = Array(9).fill(null);
    state.board[4] = { card: findCardById('bahamut'), owner:'blue' };
    state.board[7] = { card: findCardById('ogre'), owner:'red' }; // same column as cell 4
    state.ultimateBanner = { phase:'impact', owner:'blue', name:'Megaflare', sourceIndex:4, targetIndex:null, enemyIndices:[7] };
    html = renderBattle();
    out.megaflareSameColumnHasMinimalDelay = html.includes('megaflare-hit') && html.includes('animation-delay:0.15s');

    // Silver Judgment (angle/length trig for a directional beam): a
    // target directly below her own cell must produce a 90deg beam.
    state.board = Array(9).fill(null);
    state.board[1] = { card: findCardById('seraphine'), owner:'blue' }; // top-middle
    state.board[4] = { card: findCardById('ogre'), owner:'red' }; // center, directly below
    state.ultimateBanner = { phase:'impact', owner:'blue', name:'Silver Judgment', sourceIndex:1, targetIndex:null, enemyIndices:[4] };
    html = renderBattle();
    const beamAngleMatch = html.match(/transform:rotate\\(([-\\d.]+)deg\\)/);
    out.silverJudgmentBeamAngleCorrect = !!beamAngleMatch && Math.abs(parseFloat(beamAngleMatch[1]) - 90) < 0.01;

    return out;
  })()`);
  assert.equal(result.nyxaraOriginCorrect, true);
  assert.equal(result.megaflareSameColumnHasMinimalDelay, true);
  assert.equal(result.silverJudgmentBeamAngleCorrect, true, "Silver Judgment's beam angle math must still work identically through the shared helper");
  assert.deepEqual(pageErrors, []);
  await page.close();
});

test('Fas 8 (design review #2, VFX expansion): three new cards (Odin/Tiamat/Ancient Wyrmking) get identity VFX built on the shared .ultimate-vfx/.vfx-* toolkit', async () => {
  const { page, pageErrors } = await newPage();
  const result = await page.evaluate(`(() => {
    const out = {};
    state.phase = 'battle';

    // Odin's Zantetsuken: single-target, 7 staggered .vfx-hit strikes at
    // the target position plus one finishing .vfx-ring.
    state.board = Array(9).fill(null);
    state.board[4] = { card: findCardById('odin'), owner:'blue' };
    state.board[1] = { card: findCardById('ogre'), owner:'red' };
    state.ultimateBanner = { phase:'impact', owner:'blue', name:'Zantetsuken', sourceIndex:4, targetIndex:1, enemyIndices:null };
    let html = renderBattle();
    out.odinUsesSharedToolkit = html.includes('ultimate-vfx') && html.includes('vfx-hit') && html.includes('vfx-ring');
    out.odinHasSevenStrikes = (html.match(/class="vfx-hit"/g) || []).length === 7;
    const odinTargetCenter = cellCenterPercent(1); // top-middle
    out.odinTargetPositioned = html.includes('left:' + odinTargetCenter.x + '%; top:' + odinTargetCenter.y + '%; animation-delay:0s');

    // Tiamat's Fivefold Apocalypse: 5 differently-colored rings.
    state.board = Array(9).fill(null);
    state.board[4] = { card: findCardById('tiamat'), owner:'blue' };
    state.board[1] = { card: findCardById('ogre'), owner:'red' };
    state.ultimateBanner = { phase:'impact', owner:'blue', name:'The Fivefold Apocalypse', sourceIndex:4, targetIndex:1, enemyIndices:null };
    html = renderBattle();
    out.fivefoldHasFiveRings = (html.match(/class="vfx-ring"/g) || []).length === 5;
    out.fivefoldColorsDistinct = html.includes('rgba(255,140,60') && html.includes('rgba(150,90,220') && html.includes('rgba(150,220,120');

    // Ancient Wyrmking's Conquests Witnessed: true AOE (see the dedicated
    // aoeEnemyIndicesAtCast test below) -- one .vfx-hit per enemy present
    // at cast, positions supplied via state.ultimateBanner.enemyIndices.
    state.board = Array(9).fill(null);
    state.board[4] = { card: findCardById('dragon'), owner:'blue' };
    state.board[0] = { card: findCardById('ogre'), owner:'red' };
    state.board[8] = { card: findCardById('ogre'), owner:'red' };
    state.ultimateBanner = { phase:'impact', owner:'blue', name:'Conquests Witnessed', sourceIndex:4, targetIndex:null, enemyIndices:[0,8] };
    html = renderBattle();
    out.wyrmkingHasTwoHits = (html.match(/class="vfx-hit"/g) || []).length === 2;
    out.wyrmkingHasTwinkles = (html.match(/class="vfx-particle[ "]/g) || []).length === 10;

    // No card active -- none of the three should render anything.
    state.board = Array(9).fill(null);
    state.ultimateBanner = null;
    html = renderBattle();
    out.nothingRendersWithNoBanner = !html.includes('vfx-ring') && !html.includes('vfx-hit') && !html.includes('vfx-particle');

    return out;
  })()`);
  assert.equal(result.odinUsesSharedToolkit, true);
  assert.equal(result.odinHasSevenStrikes, true, "Zantetsuken's seven lightning-fast strikes must render as 7 distinct .vfx-hit elements");
  assert.equal(result.odinTargetPositioned, true);
  assert.equal(result.fivefoldHasFiveRings, true, "The Fivefold Apocalypse must render all 5 elemental rings regardless of which power was mechanically chosen");
  assert.equal(result.fivefoldColorsDistinct, true);
  assert.equal(result.wyrmkingHasTwoHits, true);
  assert.equal(result.wyrmkingHasTwinkles, true);
  assert.equal(result.nothingRendersWithNoBanner, true);
  assert.deepEqual(pageErrors, []);
  await page.close();
});

test('Fas 8 (design review #2, VFX expansion): Conquests Witnessed (Ancient Wyrmking) is a true AOE, added to playUltimateSequence\'s aoeEnemyIndicesAtCast snapshot list', async () => {
  const { page, pageErrors } = await newPage();
  const result = await page.evaluate(`(() => {
    ${freshEntrySnippet()}
    const out = {};
    state.board = Array(9).fill(null);
    const wyrmkingEntry = freshEntry(findCardById('dragon'), 'blue');
    state.board[4] = wyrmkingEntry;
    state.board[0] = freshEntry({ id:'w1', name:'W1', top:1,right:1,bottom:1,left:1 }, 'red');
    state.board[8] = freshEntry({ id:'w2', name:'W2', top:1,right:1,bottom:1,left:1 }, 'red');
    state.wins = { blue: 3, red: 0 };
    state.specialUsed = {};
    state.turn = 'blue';
    state.phase = 'battle';
    runSpecialResolution(4, null, {});
    out.bannerCarriesBothEnemyIndices = state.ultimateBanner
      && state.ultimateBanner.name === 'Conquests Witnessed'
      && state.ultimateBanner.enemyIndices
      && state.ultimateBanner.enemyIndices.includes(0)
      && state.ultimateBanner.enemyIndices.includes(8);
    return out;
  })()`);
  assert.equal(result.bannerCarriesBothEnemyIndices, true, "Conquests Witnessed must snapshot enemy positions at cast time exactly like the other 6 AOE identity-VFX cards");
  assert.deepEqual(pageErrors, []);
  await page.close();
});

test('Fas 9 (design review #2, VFX expansion round 2): Medusa, Fenrir, and the Twins get identity VFX on the shared toolkit', async () => {
  const { page, pageErrors } = await newPage();
  const result = await page.evaluate(`(() => {
    const out = {};
    state.phase = 'battle';

    // Medusa's Gorgon's Dominion: true AOE (petrify-only, added to
    // aoeEnemyIndicesAtCast), one .vfx-hit per enemy present at cast.
    state.board = Array(9).fill(null);
    state.board[4] = { card: findCardById('medusa'), owner:'blue' };
    state.board[0] = { card: findCardById('ogre'), owner:'red' };
    state.board[8] = { card: findCardById('ogre'), owner:'red' };
    state.ultimateBanner = { phase:'impact', owner:'blue', name:"Gorgon's Dominion", sourceIndex:4, targetIndex:null, enemyIndices:[0,8] };
    let html = renderBattle();
    out.gorgonHasTwoHits = (html.match(/class="vfx-hit"/g) || []).length === 2;
    out.gorgonHasRing = html.includes('vfx-ring');

    // Fenrir's Ragnarök: direction-target, not AOE -- only the cells in
    // the chosen line get a .vfx-hit, derived via the SAME
    // enemiesInDirection() the real resolution/AI dispatch use, not a
    // re-derived line calculation.
    state.board = Array(9).fill(null);
    state.board[4] = { card: findCardById('fenrir'), owner:'blue' }; // center
    state.board[1] = { card: findCardById('ogre'), owner:'red' };    // up from center
    state.board[7] = { card: findCardById('ogre'), owner:'red' };    // down from center -- must NOT be hit (wrong direction)
    state.ultimateBanner = { phase:'impact', owner:'blue', name:'Ragnarök', sourceIndex:4, targetIndex:null, enemyIndices:null, direction:'up' };
    html = renderBattle();
    out.ragnarokHitsOnlyUpDirection = (html.match(/class="vfx-hit"/g) || []).length === 1;
    const upCenter = cellCenterPercent(1);
    out.ragnarokHitPositionCorrect = html.includes('left:' + upCenter.x + '%; top:' + upCenter.y + '%');

    // Ragnarök with no direction chosen yet (shouldn't happen in practice,
    // but the banner could theoretically lack one) -- must not throw and
    // must render zero hits rather than guessing a direction.
    state.ultimateBanner = { phase:'impact', owner:'blue', name:'Ragnarök', sourceIndex:4, targetIndex:null, enemyIndices:null, direction:undefined };
    html = renderBattle();
    out.ragnarokNoDirectionIsSafe = (html.match(/class="vfx-hit"/g) || []).length === 0;

    // Twin Brothers' Solar Tempest and Twin Sisters' Lunar Eclipse:
    // single-target, mirrored warm/cool color schemes, never both active
    // at once.
    state.board = Array(9).fill(null);
    state.board[4] = { card: findCardById('twinbrothers'), owner:'blue' };
    state.board[1] = { card: findCardById('ogre'), owner:'red' };
    state.ultimateBanner = { phase:'impact', owner:'blue', name:'Solar Tempest', sourceIndex:4, targetIndex:1, enemyIndices:null };
    html = renderBattle();
    out.solarTempestIsWarmGold = html.includes('rgba(255,210,120') && !html.includes('rgba(200,190,255');

    state.ultimateBanner = { phase:'impact', owner:'blue', name:'Lunar Eclipse', sourceIndex:4, targetIndex:1, enemyIndices:null };
    html = renderBattle();
    out.lunarEclipseIsCoolSilver = html.includes('rgba(200,190,255') && !html.includes('rgba(255,210,120');

    return out;
  })()`);
  assert.equal(result.gorgonHasTwoHits, true);
  assert.equal(result.gorgonHasRing, true);
  assert.equal(result.ragnarokHitsOnlyUpDirection, true, "Ragnarök's VFX must only mark cells in the actual chosen direction, reusing enemiesInDirection()");
  assert.equal(result.ragnarokHitPositionCorrect, true);
  assert.equal(result.ragnarokNoDirectionIsSafe, true, 'a missing direction must render safely with zero hits, never throw');
  assert.equal(result.solarTempestIsWarmGold, true);
  assert.equal(result.lunarEclipseIsCoolSilver, true);
  assert.deepEqual(pageErrors, []);
  await page.close();
});

test('Fas 9 (design review #2, VFX expansion round 2): state.ultimateBanner carries extra.direction through both cast and impact phases for direction-target specials, and Gorgon\'s Dominion is added to aoeEnemyIndicesAtCast', async () => {
  const { page, pageErrors } = await newPage();
  const result = await page.evaluate(`(() => {
    ${freshEntrySnippet()}
    const out = {};

    // Fenrir: direction threaded onto the banner at both cast and impact.
    state.board = Array(9).fill(null);
    const fenrirEntry = freshEntry(findCardById('fenrir'), 'blue');
    state.board[4] = fenrirEntry;
    state.board[1] = freshEntry({ id:'fr1', name:'FR1', top:1,right:1,bottom:1,left:1 }, 'red');
    state.wins = { blue: 2, red: 0 };
    state.specialUsed = {};
    state.turn = 'blue';
    state.phase = 'battle';
    runSpecialResolution(4, null, { direction: 'up' });
    out.castPhaseCarriesDirection = state.ultimateBanner && state.ultimateBanner.direction === 'up';

    // Medusa: Gorgon's Dominion snapshots enemy positions at cast time.
    // state.ultimateBanner must be cleared first -- runSpecialResolution
    // queues onto ultimateQueue instead of casting immediately whenever
    // one is already in flight (see playUltimateSequence), and Fenrir's
    // cast above left one set.
    state.ultimateBanner = null;
    state.board = Array(9).fill(null);
    const medusaEntry = freshEntry(findCardById('medusa'), 'blue');
    state.board[4] = medusaEntry;
    state.board[0] = freshEntry({ id:'gd1', name:'GD1', top:1,right:1,bottom:1,left:1 }, 'red');
    state.board[8] = freshEntry({ id:'gd2', name:'GD2', top:1,right:1,bottom:1,left:1 }, 'red');
    state.wins = { blue: 3, red: 0 };
    state.specialUsed = {};
    state.turn = 'blue';
    runSpecialResolution(4, null, {});
    out.gorgonBannerCarriesBothEnemyIndices = state.ultimateBanner
      && state.ultimateBanner.name === "Gorgon's Dominion"
      && state.ultimateBanner.enemyIndices
      && state.ultimateBanner.enemyIndices.includes(0)
      && state.ultimateBanner.enemyIndices.includes(8);

    return out;
  })()`);
  assert.equal(result.castPhaseCarriesDirection, true);
  assert.equal(result.gorgonBannerCarriesBothEnemyIndices, true);
  assert.deepEqual(pageErrors, []);
  await page.close();
});

test('Fas 10 (design review #2, VFX expansion round 3): The Celestial Judgment, Lyrith, Vorlix, and Triune Desire get identity VFX on the shared toolkit', async () => {
  const { page, pageErrors } = await newPage();
  const result = await page.evaluate(`(() => {
    const out = {};
    state.phase = 'battle';

    // The Celestial Judgment's Eternal Verdict: direction-target, same
    // "only the chosen line gets a .vfx-hit" shape as Fenrir's Ragnarök,
    // but driven off the enemyIndices SNAPSHOT (it can destroy cells,
    // unlike Ragnarök's pure debuff) rather than a live enemiesInDirection()
    // recompute at render time.
    state.board = Array(9).fill(null);
    state.board[4] = { card: findCardById('celestialjudgment'), owner:'blue' };
    state.board[1] = { card: findCardById('ogre'), owner:'red' };
    state.ultimateBanner = { phase:'impact', owner:'blue', name:'Eternal Verdict', sourceIndex:4, targetIndex:null, enemyIndices:[1] };
    let html = renderBattle();
    out.eternalVerdictHasOneHit = (html.match(/class="vfx-hit"/g) || []).length === 1;
    const upCenter = cellCenterPercent(1);
    out.eternalVerdictHitPositionCorrect = html.includes('left:' + upCenter.x + '%; top:' + upCenter.y + '%');
    out.eternalVerdictIsGold = html.includes('rgba(255,225,120');

    // A destroyed cell (already null on the live board by impact-phase
    // render) must still show its hit -- the whole reason this card uses
    // the enemyIndices snapshot instead of a live board query.
    state.board[1] = null;
    html = renderBattle();
    out.eternalVerdictSurvivesDestroyedCell = (html.match(/class="vfx-hit"/g) || []).length === 1;

    // Lyrith's Serpent's Wrath: single-target venomous strike.
    state.board = Array(9).fill(null);
    state.board[4] = { card: findCardById('lyrith'), owner:'blue' };
    state.board[1] = { card: findCardById('ogre'), owner:'red' };
    state.ultimateBanner = { phase:'impact', owner:'blue', name:"Serpent's Wrath", sourceIndex:4, targetIndex:1, enemyIndices:null };
    html = renderBattle();
    out.serpentsWrathIsVenomMagenta = html.includes('rgba(194,59,206') && !html.includes('rgba(181,101,242');

    // Vorlix's WorldCleaver: single-target void-purple strike, distinct
    // color from Lyrith's venom-magenta above.
    state.board = Array(9).fill(null);
    state.board[4] = { card: findCardById('vorlix'), owner:'blue' };
    state.board[1] = { card: findCardById('ogre'), owner:'red' };
    state.ultimateBanner = { phase:'impact', owner:'blue', name:'WorldCleaver', sourceIndex:4, targetIndex:1, enemyIndices:null };
    html = renderBattle();
    out.worldCleaverIsVoidPurple = html.includes('rgba(181,101,242') && !html.includes('rgba(194,59,206');

    // Triune Desire's Forbidden Harmony: up to 4 adjacent-only hits, cycled
    // through the three sisters' own identity-VFX colors (Nyxara's void
    // magenta, Vaelira's infernal crimson, Seraphine's silver-gold).
    state.board = Array(9).fill(null);
    state.board[4] = { card: findCardById('triunedesire'), owner:'blue' };
    state.ultimateBanner = { phase:'impact', owner:'blue', name:'Forbidden Harmony', sourceIndex:4, targetIndex:null, enemyIndices:[1,3,5,7] };
    html = renderBattle();
    out.forbiddenHarmonyHasFourHits = (html.match(/class="vfx-hit"/g) || []).length === 4;
    out.forbiddenHarmonyHasAllThreeSisterColors = html.includes('rgba(196,110,240') && html.includes('rgba(230,60,70') && html.includes('rgba(255,230,160');

    return out;
  })()`);
  assert.equal(result.eternalVerdictHasOneHit, true);
  assert.equal(result.eternalVerdictHitPositionCorrect, true);
  assert.equal(result.eternalVerdictIsGold, true);
  assert.equal(result.eternalVerdictSurvivesDestroyedCell, true, "Eternal Verdict's hit VFX must come from the cast-time snapshot, not a live board query, since it can destroy cells outright");
  assert.equal(result.serpentsWrathIsVenomMagenta, true);
  assert.equal(result.worldCleaverIsVoidPurple, true);
  assert.equal(result.forbiddenHarmonyHasFourHits, true);
  assert.equal(result.forbiddenHarmonyHasAllThreeSisterColors, true);
  assert.deepEqual(pageErrors, []);
  await page.close();
});

test('Fas 10 (design review #2, VFX expansion round 3): Eternal Verdict and Forbidden Harmony snapshot only their OWN affected cells at cast time, not the whole board', async () => {
  const { page, pageErrors } = await newPage();
  const result = await page.evaluate(`(() => {
    ${freshEntrySnippet()}
    const out = {};
    state.phase = 'battle';

    // Eternal Verdict: only the enemy in the chosen line (index 1, "up"
    // from center) belongs in the snapshot -- an enemy elsewhere on the
    // board (index 6, unrelated to the line) must NOT be included, unlike
    // the whole-board AOE cards (Infernal Pact, Silver Judgment, etc).
    state.board = Array(9).fill(null);
    const judgmentEntry = freshEntry(findCardById('celestialjudgment'), 'blue');
    state.board[4] = judgmentEntry;
    state.board[1] = freshEntry({ id:'ev1', name:'EV1', top:1,right:1,bottom:1,left:1 }, 'red');
    state.board[6] = freshEntry({ id:'ev2', name:'EV2', top:1,right:1,bottom:1,left:1 }, 'red');
    state.wins = { blue: 2, red: 0 };
    state.specialUsed = {};
    state.turn = 'blue';
    runSpecialResolution(4, null, { direction: 'up' });
    out.eternalVerdictSnapshotsOnlyTheLine = state.ultimateBanner
      && state.ultimateBanner.enemyIndices
      && state.ultimateBanner.enemyIndices.includes(1)
      && !state.ultimateBanner.enemyIndices.includes(6);

    // Forbidden Harmony: only the up-to-4 cells immediately adjacent to the
    // caster (index 4's own neighbors) belong in the snapshot -- a
    // non-adjacent enemy (index 0, a diagonal, never counted as adjacent by
    // SPECIAL_HANDLERS.triunedesire's own up/right/down/left dirs) must NOT
    // be included, same "scoped, not whole-board" contrast as above.
    state.ultimateBanner = null;
    state.board = Array(9).fill(null);
    const triuneEntry = freshEntry(findCardById('triunedesire'), 'blue');
    state.board[4] = triuneEntry;
    state.board[1] = freshEntry({ id:'fh1', name:'FH1', top:1,right:1,bottom:1,left:1 }, 'red');
    state.board[3] = freshEntry({ id:'fh2', name:'FH2', top:1,right:1,bottom:1,left:1 }, 'red');
    state.board[0] = freshEntry({ id:'fh3', name:'FH3', top:1,right:1,bottom:1,left:1 }, 'red');
    state.wins = { blue: 4, red: 0 };
    state.specialUsed = {};
    state.turn = 'blue';
    runSpecialResolution(4, null, {});
    out.forbiddenHarmonySnapshotsOnlyAdjacent = state.ultimateBanner
      && state.ultimateBanner.name === 'Forbidden Harmony'
      && state.ultimateBanner.enemyIndices
      && state.ultimateBanner.enemyIndices.includes(1)
      && state.ultimateBanner.enemyIndices.includes(3)
      && !state.ultimateBanner.enemyIndices.includes(0);

    return out;
  })()`);
  assert.equal(result.eternalVerdictSnapshotsOnlyTheLine, true);
  assert.equal(result.forbiddenHarmonySnapshotsOnlyAdjacent, true);
  assert.deepEqual(pageErrors, []);
  await page.close();
});

test('Fas 11 (game-feel review: hitstop + impact punch): the impact VFX lands with the struck card(s) still on the board, and destroys/flips only resolve after a brief hitstop hold', async () => {
  const { page, pageErrors } = await newPage();
  const result = await page.evaluate(`(async () => {
    ${freshEntrySnippet()}
    const out = {};
    state.board = Array(9).fill(null);
    const src = freshEntry(findCardById('vaelira'), 'blue'); // Infernal Pact -- destroyCard-based AOE
    state.board[4] = src;
    state.board[1] = freshEntry(findCardById('ogre'), 'red');
    state.wins = { blue: 5, red: 0 };
    state.specialUsed = {};
    state.turn = 'blue';
    runSpecialResolution(4, null, {});

    await new Promise(r => setTimeout(r, ULTIMATE_WINDUP_MS + 50));
    // Past the windup, but well before the hitstop hold elapses: the impact
    // banner/VFX should already be live (this is the moment the player sees
    // the hit connect), but the target must NOT be destroyed yet -- the
    // whole point of the hitstop hold.
    out.impactBannerLiveDuringHitstop = state.ultimateBanner && state.ultimateBanner.phase === 'impact' && state.ultimateBanner.enemyIndices && state.ultimateBanner.enemyIndices.includes(1);
    out.targetStillOnBoardDuringHitstop = state.board[1] !== null && state.board[1].owner === 'red';
    out.noGhostYetDuringHitstop = state.destroyGhosts.length === 0;

    await new Promise(r => setTimeout(r, ULTIMATE_HITSTOP_MS + 50));
    out.targetDestroyedAfterHitstop = state.board[1] === null;
    out.ghostRecordedAfterHitstop = state.destroyGhosts.length === 1 && state.destroyGhosts[0].index === 1;

    return out;
  })()`);
  assert.equal(result.impactBannerLiveDuringHitstop, true, 'the impact VFX must already be showing while the target is still intact');
  assert.equal(result.targetStillOnBoardDuringHitstop, true, "the target must not be destroyed yet -- that's the entire point of the hitstop hold");
  assert.equal(result.noGhostYetDuringHitstop, true);
  assert.equal(result.targetDestroyedAfterHitstop, true, 'the destroy resolves once the hitstop hold elapses');
  assert.equal(result.ghostRecordedAfterHitstop, true);
  assert.deepEqual(pageErrors, []);
  await page.close();
});

test('Fas 11 (game-feel review: hitstop + impact punch): state.impactPunch fires on EVERY Ultimate\'s actual resolve moment, not gated by chainShake\'s capture-magnitude threshold, and clears alongside it', async () => {
  const { page, pageErrors } = await newPage();
  const result = await page.evaluate(`(async () => {
    ${freshEntrySnippet()}
    const out = {};
    state.board = Array(9).fill(null);
    // Twin Brothers' Solar Tempest: single-target, capturedCount will be 1
    // (well under chainShake's >=3 threshold and not on its explicit
    // opt-in list) -- proves impactPunch is unconditional, unlike chainShake.
    state.board[4] = freshEntry(findCardById('twinbrothers'), 'blue');
    state.board[1] = freshEntry({ id:'weak1', name:'Weak1', top:1,right:1,bottom:1,left:1 }, 'red');
    state.wins = { blue: 5, red: 0 };
    state.specialUsed = {};
    state.turn = 'blue';
    runSpecialResolution(4, 1, {});

    await new Promise(r => setTimeout(r, ULTIMATE_WINDUP_MS + 50));
    out.notPunchedYetDuringHitstop = state.impactPunch === false;

    await new Promise(r => setTimeout(r, ULTIMATE_HITSTOP_MS + 50));
    out.punchedAtResolve = state.impactPunch === true;
    out.chainShakeStaysOffForSmallCapture = state.chainShake === false;

    await new Promise(r => setTimeout(r, 500 + 50)); // ULTIMATE_SHAKE_MS
    out.punchClearedAfterShakeWindow = state.impactPunch === false;

    return out;
  })()`);
  assert.equal(result.notPunchedYetDuringHitstop, true);
  assert.equal(result.punchedAtResolve, true, 'impactPunch fires at the actual resolve moment even for a small single-target capture');
  assert.equal(result.chainShakeStaysOffForSmallCapture, true, 'a single capture stays under chainShake\'s own magnitude threshold, proving the punch is unconditional and independent of it');
  assert.equal(result.punchClearedAfterShakeWindow, true);
  assert.deepEqual(pageErrors, []);
  await page.close();
});

test('Fas 11 (game-feel review: hitstop + impact punch): .board gets the impact-punch class only while state.impactPunch is true', async () => {
  const { page, pageErrors } = await newPage();
  const result = await page.evaluate(`(() => {
    const out = {};
    state.phase = 'battle';
    state.board = Array(9).fill(null);
    state.ultimateBanner = null;

    state.impactPunch = false;
    out.noClassWhenFalse = !renderBattle().includes('impact-punch');

    state.impactPunch = true;
    out.classPresentWhenTrue = renderBattle().includes('class="board impact-punch"');

    return out;
  })()`);
  assert.equal(result.noClassWhenFalse, true);
  assert.equal(result.classPresentWhenTrue, true);
  assert.deepEqual(pageErrors, []);
  await page.close();
});

test('Fas 12 (VFX expansion round 4): Vorgrath, Pallis, and Evil Twist Yang/Yin get identity VFX on the shared toolkit', async () => {
  const { page, pageErrors } = await newPage();
  const result = await page.evaluate(`(() => {
    const out = {};
    state.phase = 'battle';

    // Vorgrath's The Falling World: direction-target, same shape as
    // Eternal Verdict but with a fiery doom palette, driven off the
    // enemyIndices snapshot since it can destroy cells outright.
    state.board = Array(9).fill(null);
    state.board[4] = { card: findCardById('vorgrath'), owner:'blue' };
    state.board[1] = { card: findCardById('ogre'), owner:'red' };
    state.ultimateBanner = { phase:'impact', owner:'blue', name:'The Falling World', sourceIndex:4, targetIndex:null, enemyIndices:[1] };
    let html = renderBattle();
    out.fallingWorldHasOneHit = (html.match(/class="vfx-hit"/g) || []).length === 1;
    out.fallingWorldIsDoomFire = html.includes('rgba(220,90,50');

    // Pallis's Wave of Loyalty: a BLESSING on his own element-matching
    // allies, never an enemy. Pallis is earth himself (so he's a match too
    // -- SPECIAL_HANDLERS.pallis's own filter never excludes the caster)
    // plus two more earth allies + one non-earth ally + one enemy on the
    // board -- only the three earth allies (Pallis included) should get a
    // hit, and the wind ally / red enemy must NOT.
    state.board = Array(9).fill(null);
    state.board[4] = { card: findCardById('pallis'), owner:'blue' }; // earth
    state.board[0] = { card: { id:'earth1', name:'Earth1', element:'earth', top:1,right:1,bottom:1,left:1 }, owner:'blue' };
    state.board[8] = { card: { id:'earth2', name:'Earth2', element:'earth', top:1,right:1,bottom:1,left:1 }, owner:'blue' };
    state.board[2] = { card: { id:'wind1', name:'Wind1', element:'wind', top:1,right:1,bottom:1,left:1 }, owner:'blue' };
    state.board[6] = { card: findCardById('ogre'), owner:'red' };
    state.ultimateBanner = { phase:'impact', owner:'blue', name:'Wave of Loyalty', sourceIndex:4, targetIndex:null, enemyIndices:null, element:'earth' };
    html = renderBattle();
    out.waveOfLoyaltyHasThreeHits = (html.match(/class="vfx-hit"/g) || []).length === 3;
    out.waveOfLoyaltyIsWarmGold = html.includes('rgba(255,215,120');

    // Evil Twist Yang/Yin's Resonance: mirrored pair, white/gold vs
    // black/violet, both whole-board AOE debuffs.
    state.board = Array(9).fill(null);
    state.board[4] = { card: findCardById('eviltwistyang'), owner:'blue' };
    state.board[1] = { card: findCardById('ogre'), owner:'red' };
    state.board[7] = { card: findCardById('ogre'), owner:'red' };
    state.ultimateBanner = { phase:'impact', owner:'blue', name:'Yang Resonance', sourceIndex:4, targetIndex:null, enemyIndices:[1,7] };
    html = renderBattle();
    out.yangResonanceHasTwoHits = (html.match(/class="vfx-hit"/g) || []).length === 2;
    out.yangIsWhiteGold = html.includes('rgba(230,214,150') && !html.includes('rgba(120,70,190');

    state.ultimateBanner = { phase:'impact', owner:'blue', name:'Yin Resonance', sourceIndex:4, targetIndex:null, enemyIndices:[1,7] };
    html = renderBattle();
    out.yinResonanceHasTwoHits = (html.match(/class="vfx-hit"/g) || []).length === 2;
    out.yinIsBlackViolet = html.includes('rgba(120,70,190') && !html.includes('rgba(230,214,150');

    return out;
  })()`);
  assert.equal(result.fallingWorldHasOneHit, true);
  assert.equal(result.fallingWorldIsDoomFire, true);
  assert.equal(result.waveOfLoyaltyHasThreeHits, true, "Wave of Loyalty's VFX must only mark the caster's own element-matching allies (Pallis himself included), never enemies or off-element allies");
  assert.equal(result.waveOfLoyaltyIsWarmGold, true);
  assert.equal(result.yangResonanceHasTwoHits, true);
  assert.equal(result.yangIsWhiteGold, true);
  assert.equal(result.yinResonanceHasTwoHits, true);
  assert.equal(result.yinIsBlackViolet, true);
  assert.deepEqual(pageErrors, []);
  await page.close();
});

test('Fas 12 (VFX expansion round 4): state.ultimateBanner carries extra.element through both phases, Vorgrath\'s The Falling World snapshots only the chosen line, and Yang/Yin Resonance are added to aoeEnemyIndicesAtCast', async () => {
  const { page, pageErrors } = await newPage();
  const result = await page.evaluate(`(() => {
    ${freshEntrySnippet()}
    const out = {};
    state.phase = 'battle';

    // Pallis: element threaded onto the banner at cast time.
    state.board = Array(9).fill(null);
    const pallisEntry = freshEntry(findCardById('pallis'), 'blue');
    state.board[4] = pallisEntry;
    state.board[1] = freshEntry({ id:'earth1', name:'Earth1', element:'earth', top:1,right:1,bottom:1,left:1 }, 'blue');
    state.wins = { blue: 2, red: 0 };
    state.specialUsed = {};
    state.turn = 'blue';
    runSpecialResolution(4, null, { element: 'earth' });
    out.castPhaseCarriesElement = state.ultimateBanner && state.ultimateBanner.element === 'earth';

    // Vorgrath: only the enemy in the chosen line (index 1, "up" from
    // center) belongs in the snapshot -- an enemy elsewhere (index 6)
    // must NOT be included.
    state.ultimateBanner = null;
    state.board = Array(9).fill(null);
    const vorgrathEntry = freshEntry(findCardById('vorgrath'), 'blue');
    state.board[4] = vorgrathEntry;
    state.board[1] = freshEntry({ id:'fw1', name:'FW1', top:1,right:1,bottom:1,left:1 }, 'red');
    state.board[6] = freshEntry({ id:'fw2', name:'FW2', top:1,right:1,bottom:1,left:1 }, 'red');
    state.wins = { blue: 3, red: 0 };
    state.specialUsed = {};
    state.turn = 'blue';
    runSpecialResolution(4, null, { direction: 'up' });
    out.fallingWorldSnapshotsOnlyTheLine = state.ultimateBanner
      && state.ultimateBanner.enemyIndices
      && state.ultimateBanner.enemyIndices.includes(1)
      && !state.ultimateBanner.enemyIndices.includes(6);

    // Evil Twist Yang: whole-board snapshot (like Diamond Storm), not
    // scoped to a line or adjacency.
    state.ultimateBanner = null;
    state.board = Array(9).fill(null);
    const yangEntry = freshEntry(findCardById('eviltwistyang'), 'blue');
    const yinEntry = freshEntry(findCardById('eviltwistyin'), 'blue'); // requiresPartner
    state.board[4] = yangEntry;
    state.board[0] = yinEntry;
    state.board[1] = freshEntry({ id:'yr1', name:'YR1', top:1,right:1,bottom:1,left:1 }, 'red');
    state.board[8] = freshEntry({ id:'yr2', name:'YR2', top:1,right:1,bottom:1,left:1 }, 'red');
    state.wins = { blue: 3, red: 0 };
    state.specialUsed = {};
    state.turn = 'blue';
    runSpecialResolution(4, null, {});
    out.yangResonanceSnapshotsWholeBoard = state.ultimateBanner
      && state.ultimateBanner.name === 'Yang Resonance'
      && state.ultimateBanner.enemyIndices
      && state.ultimateBanner.enemyIndices.includes(1)
      && state.ultimateBanner.enemyIndices.includes(8);

    return out;
  })()`);
  assert.equal(result.castPhaseCarriesElement, true);
  assert.equal(result.fallingWorldSnapshotsOnlyTheLine, true);
  assert.equal(result.yangResonanceSnapshotsWholeBoard, true);
  assert.deepEqual(pageErrors, []);
  await page.close();
});

test('Fas 13 (VFX expansion round 5, new primitives): Skybreaker, Shattered Crown, Time Collapse, and The Ending each use a genuinely new shared VFX primitive', async () => {
  const { page, pageErrors } = await newPage();
  const result = await page.evaluate(`(() => {
    const out = {};
    state.phase = 'battle';

    // Aurelian's Skybreaker: .vfx-projectile (a falling strike, only
    // present during the CAST/windup phase, not impact).
    state.board = Array(9).fill(null);
    state.board[4] = { card: findCardById('aurelian'), owner:'blue' };
    state.board[1] = { card: findCardById('ogre'), owner:'red' };
    state.ultimateBanner = { phase:'cast', owner:'blue', name:'Skybreaker', sourceIndex:4, targetIndex:1, enemyIndices:null };
    let html = renderBattle();
    out.skybreakerHasProjectileDuringCast = html.includes('class="vfx-projectile"');
    state.ultimateBanner = { phase:'impact', owner:'blue', name:'Skybreaker', sourceIndex:4, targetIndex:1, enemyIndices:null };
    html = renderBattle();
    out.skybreakerHasRingAtImpact = html.includes('class="vfx-ring"');

    // Daron's Shattered Crown: 6 .vfx-shard fragments at impact.
    state.ultimateBanner = { phase:'impact', owner:'blue', name:'Shattered Crown', sourceIndex:4, targetIndex:1, enemyIndices:null };
    html = renderBattle();
    out.shatteredCrownHasSixShards = (html.match(/class="vfx-shard"/g) || []).length === 6;

    // Vorathos's Time Collapse: 2 .vfx-clockhand elements during cast.
    state.ultimateBanner = { phase:'cast', owner:'blue', name:'Time Collapse', sourceIndex:4, targetIndex:1, enemyIndices:null };
    html = renderBattle();
    out.timeCollapseHasTwoClockhands = (html.match(/class="vfx-clockhand"/g) || []).length === 2;

    // Nexzoth's The Ending: 5 .vfx-crack-line paths spanning the whole
    // board, all starting from his own cell's center.
    state.board = Array(9).fill(null);
    state.board[0] = { card: findCardById('nexzoth'), owner:'blue' };
    state.board[1] = { card: findCardById('ogre'), owner:'red' };
    state.board[8] = { card: findCardById('ogre'), owner:'red' };
    state.ultimateBanner = { phase:'cast', owner:'blue', name:'The Ending', sourceIndex:0, targetIndex:null, enemyIndices:[1,8] };
    html = renderBattle();
    out.theEndingHasFiveCracks = (html.match(/class="vfx-crack-line"/g) || []).length === 5;
    const origin = cellCenterPercent(0);
    out.theEndingCracksStartAtNexzothsCell = html.includes('d="M ' + origin.x + ',' + origin.y + ' L');

    return out;
  })()`);
  assert.equal(result.skybreakerHasProjectileDuringCast, true, 'Skybreaker must show the falling projectile during the cast/windup phase');
  assert.equal(result.skybreakerHasRingAtImpact, true);
  assert.equal(result.shatteredCrownHasSixShards, true);
  assert.equal(result.timeCollapseHasTwoClockhands, true);
  assert.equal(result.theEndingHasFiveCracks, true);
  assert.equal(result.theEndingCracksStartAtNexzothsCell, true, "every crack line must originate from the caster's own cell");
  assert.deepEqual(pageErrors, []);
  await page.close();
});

test('Fas 13 (VFX expansion round 5, new primitives): The Ending is added to aoeEnemyIndicesAtCast as a whole-board destroy', async () => {
  const { page, pageErrors } = await newPage();
  const result = await page.evaluate(`(() => {
    ${freshEntrySnippet()}
    const out = {};
    state.phase = 'battle';
    state.board = Array(9).fill(null);
    const nexzothEntry = freshEntry(findCardById('nexzoth'), 'blue');
    state.board[0] = nexzothEntry;
    state.board[1] = freshEntry({ id:'te1', name:'TE1', top:1,right:1,bottom:1,left:1 }, 'red');
    state.board[8] = freshEntry({ id:'te2', name:'TE2', top:1,right:1,bottom:1,left:1 }, 'red');
    state.wins = { blue: 3, red: 0 };
    state.specialUsed = {};
    state.turn = 'blue';
    runSpecialResolution(0, null, {});
    out.theEndingBannerCarriesBothEnemyIndices = state.ultimateBanner
      && state.ultimateBanner.name === 'The Ending'
      && state.ultimateBanner.enemyIndices
      && state.ultimateBanner.enemyIndices.includes(1)
      && state.ultimateBanner.enemyIndices.includes(8);
    return out;
  })()`);
  assert.equal(result.theEndingBannerCarriesBothEnemyIndices, true);
  assert.deepEqual(pageErrors, []);
  await page.close();
});

test('Fas 14 (conquered badge redesign): red side gets the red badge art, and a multi-capture AOE (Pallis & Pell\'s Hunter\'s Wrath) shows one badge PER captured cell instead of a single shared one', async () => {
  const { page, pageErrors } = await newPage();
  const result = await page.evaluate(`(async () => {
    ${freshEntrySnippet()}
    state.phase = 'battle';
    const out = {};

    // Red side (the AI/forest) captures -- must use the red badge art, not
    // the blue one.
    state.board = Array(9).fill(null);
    state.board[1] = freshEntry({ id:'weak1', name:'Weak1', top:1,right:1,bottom:1,left:1 }, 'blue');
    state.enemyHand = [findCardById('bahamut')];
    placeCard(4, 'bahamut', 'red'); // 'up' edge attacks weak1's 'bottom'
    let html = renderBattle();
    out.redCaptureUsesRedBadge = html.includes('class="conquered-badge-small" src="conquered-badge-red.png"');
    out.redCaptureNeverUsesBlueBadge = !html.includes('src="conquered-badge.png"');

    // A single AOE Ultimate that captures TWO different cells at once
    // (Pallis & Pell's Hunter's Wrath) -- each captured cell should carry
    // its own badge instance, not one shared banner.
    state.board = Array(9).fill(null);
    state.board[4] = freshEntry(findCardById('pallispell'), 'blue');
    state.board[1] = freshEntry(findCardById('ogre'), 'red');
    state.board[7] = freshEntry(findCardById('ogre'), 'red');
    state.wins = { blue: 5, red: 5 };
    state.specialUsed = {};
    runSpecialResolution(4, null, {});
    await new Promise(r => setTimeout(r, ULTIMATE_WINDUP_MS + ULTIMATE_HITSTOP_MS + 50));
    html = renderBattle();
    out.bothCellsFlipped = state.board[1].justFlipped === true && state.board[7].justFlipped === true;
    out.twoBadgeInstancesRendered = (html.match(/class="conquered-badge-small"/g) || []).length === 2;

    return out;
  })()`);
  assert.equal(result.redCaptureUsesRedBadge, true);
  assert.equal(result.redCaptureNeverUsesBlueBadge, true);
  assert.equal(result.bothCellsFlipped, true);
  assert.equal(result.twoBadgeInstancesRendered, true, 'a two-cell AOE capture must render two separate per-cell badges, not one shared banner');
  assert.deepEqual(pageErrors, []);
  await page.close();
});

test('Fas 14 (conquered badge redesign): the badge fades out with the same justFlipped cleanup window every other per-cell flip effect already uses, and advanceTurn\'s AI pacing still slows down after a capture', async () => {
  const { page, pageErrors } = await newPage();
  const result = await page.evaluate(`(async () => {
    ${freshEntrySnippet()}
    state.phase = 'battle';
    const out = {};
    state.board = Array(9).fill(null);
    state.board[4] = freshEntry(findCardById('pallispell'), 'blue');
    state.board[1] = freshEntry(findCardById('ogre'), 'red');
    state.wins = { blue: 5, red: 5 };
    state.specialUsed = {};
    runSpecialResolution(4, null, {});
    await new Promise(r => setTimeout(r, ULTIMATE_WINDUP_MS + ULTIMATE_HITSTOP_MS + 50));
    out.badgeShowsRightAfterCapture = state.board[1].justFlipped === true && renderBattle().includes('conquered-badge-small');

    // The same ULTIMATE_CLEANUP_MS (1300ms) timer that already clears
    // justFlipped/shieldFlash/etc also removes the badge -- no separate
    // timer needed any more (see playUltimateSequence's cleanup step).
    await new Promise(r => setTimeout(r, 1300 + 100));
    out.badgeGoneAfterCleanup = state.board[1].justFlipped === false && !renderBattle().includes('conquered-badge-small');

    return out;
  })()`);
  assert.equal(result.badgeShowsRightAfterCapture, true);
  assert.equal(result.badgeGoneAfterCleanup, true);
  assert.deepEqual(pageErrors, []);
  await page.close();
});

test('Fas 15 (two new cards, externally sketched + reviewed): Elyrion — Soul Threads, Weaver\'s Touch, Thread of Fate, and Soul Resonance all wire onto existing primitives correctly', async () => {
  const { page, pageErrors } = await newPage();
  const result = await page.evaluate(`(async () => {
    ${freshEntrySnippet()}
    const out = {};

    // Soul Threads: on placement, a random ally (himself included) gets
    // +1 Power this round. With Elyrion alone on the board, he must be
    // his own target (no randomness to control for).
    state.board = Array(9).fill(null);
    state.playerHand = [findCardById('elyrion')];
    placeCard(4, 'elyrion', 'blue');
    out.soulThreadsBuffsSelfWhenAlone = state.board[4].captureBonus === 1;

    // Weaver's Touch: when Elyrion wins a normal battle, the defeated
    // enemy gets -1 Power on all sides THIS ROUND (active.
    // onWinDebuffLoserThisRound, an existing generic flag -- not a new
    // "next round" primitive).
    state.board = Array(9).fill(null);
    const weaverElyrion = freshEntry(findCardById('elyrion'), 'blue'); // total 36
    state.board[4] = weaverElyrion;
    const weakEnemy = freshEntry({ id:'we1', name:'WE1', top:1,right:1,bottom:1,left:1 }, 'red');
    state.board[1] = weakEnemy;
    resolveFlips(4, 'blue');
    out.weaversTouchAppliesThisRoundDebuff = weakEnemy.owner === 'blue' && weakEnemy.captureBonus === -1;

    // Thread of Fate: the first time Elyrion would lose, the attacker's
    // strength is reduced by 1 (same shape/verb and same test numbers as
    // the existing Ifrit Volcanic Armor test -- volcanicArmorPenalty's own
    // trigger condition compares TOTAL power, not the single edge: the
    // attacker's total (40) must exceed Elyrion's real total (36) for the
    // penalty to even engage, then the -1 lands on the specific edge
    // (bottom 10 vs Elyrion's top 9), turning that marginal win into a
    // defended tie.
    state.board = Array(9).fill(null);
    const fateElyrion = freshEntry(findCardById('elyrion'), 'blue'); // total 36 (9+8+10+9)
    state.board[4] = fateElyrion;
    const fateAttacker = freshEntry({ id:'fa1', name:'FA1', top:10,right:10,bottom:10,left:10 }, 'red'); // total 40; bottom 10 vs Elyrion's top 9
    state.board[1] = fateAttacker;
    resolveFlips(1, 'red');
    out.threadOfFateBlockedFirstLoss = state.board[4].owner === 'blue';
    out.threadOfFateConsumed = fateElyrion.volcanicArmorUsed === true;
    // Second attacker: armor already used, so a plain marginal edge (left
    // 11 vs Elyrion's right 8, from cell 5 which sits to Elyrion's right)
    // wins outright this time.
    const fateAttacker2 = freshEntry({ id:'fa2', name:'FA2', top:1,right:1,bottom:1,left:11 }, 'red');
    state.board[5] = fateAttacker2;
    resolveFlips(5, 'red');
    out.threadOfFateOnlyOnce = state.board[4].owner === 'red';

    // Soul Resonance: when an ALLY (not Elyrion himself) wins a battle,
    // Elyrion gains +1 on the SAME side that ally used to win, capped at
    // +2 total per match.
    state.board = Array(9).fill(null);
    const resonanceElyrion = freshEntry(findCardById('elyrion'), 'blue');
    state.board[4] = resonanceElyrion; // center -- never battles directly in this scenario

    // First ally win: cell 0's 'bottom' edge beats cell 3.
    const ally1 = freshEntry({ id:'ra1', name:'RA1', top:1,right:1,bottom:10,left:1 }, 'blue');
    state.board[0] = ally1;
    const enemy1 = freshEntry({ id:'re1', name:'RE1', top:1,right:1,bottom:1,left:1 }, 'red');
    state.board[3] = enemy1;
    resolveFlips(0, 'blue');
    out.firstAllyWinStacksOnce = resonanceElyrion.soulResonanceStacks === 1 && resonanceElyrion.sideBonus && resonanceElyrion.sideBonus.bottom === 1;
    out.allyItselfNotBuffed = ally1.captureBonus === 0;

    // Second ally win: cell 2's 'left' edge beats cell 1 -- a DIFFERENT
    // side, proving Elyrion's bonus tracks whichever side each ally
    // actually used, not a single fixed side.
    const ally2 = freshEntry({ id:'ra2', name:'RA2', top:1,right:1,bottom:1,left:10 }, 'blue');
    state.board[2] = ally2;
    const enemy2 = freshEntry({ id:'re2', name:'RE2', top:1,right:1,bottom:1,left:1 }, 'red');
    state.board[1] = enemy2;
    resolveFlips(2, 'blue');
    out.secondAllyWinStacksTwice = resonanceElyrion.soulResonanceStacks === 2 && resonanceElyrion.sideBonus.left === 1;

    // Third ally win: cell 8's 'top' edge beats cell 5 -- must NOT stack a
    // third time, the +2/match cap is already reached.
    const ally3 = freshEntry({ id:'ra3', name:'RA3', top:10,right:1,bottom:1,left:1 }, 'blue');
    state.board[8] = ally3;
    const enemy3 = freshEntry({ id:'re3', name:'RE3', top:1,right:1,bottom:1,left:1 }, 'red');
    state.board[5] = enemy3;
    resolveFlips(8, 'blue');
    out.thirdAllyWinCapped = resonanceElyrion.soulResonanceStacks === 2 && !resonanceElyrion.sideBonus.top;

    return out;
  })()`);
  assert.equal(result.soulThreadsBuffsSelfWhenAlone, true);
  assert.equal(result.weaversTouchAppliesThisRoundDebuff, true);
  assert.equal(result.threadOfFateBlockedFirstLoss, true, "Thread of Fate's -1 penalty turns a marginal loss into a defended tie");
  assert.equal(result.threadOfFateConsumed, true);
  assert.equal(result.threadOfFateOnlyOnce, true);
  assert.equal(result.firstAllyWinStacksOnce, true);
  assert.equal(result.allyItselfNotBuffed, true, "Soul Resonance buffs ELYRION, not the ally that actually won");
  assert.equal(result.secondAllyWinStacksTwice, true, 'the bonus tracks whichever side each ally actually used to win');
  assert.equal(result.thirdAllyWinCapped, true, 'capped at +2 total per match');
  assert.deepEqual(pageErrors, []);
  await page.close();
});

test('Fas 15 (two new cards, externally sketched + reviewed): The Concord — Synchronized Souls scales and caps correctly, United Presence is a flat threshold bonus (NOT a capture-immunity mechanic), and Inspiring Aura buffs arriving allies (never itself)', async () => {
  const { page, pageErrors } = await newPage();
  const result = await page.evaluate(`(async () => {
    ${freshEntrySnippet()}
    const out = {};
    const concordCard = findCardById('concord');
    const rawTop = concordCard.top; // 8

    // Synchronized Souls (+1 per OTHER ally, max +3) and United Presence
    // (+2 flat once 3+ total allies, Concord included) are both live
    // fullEffectiveValue bonuses -- progressively add allies and check the
    // combined total at each step.
    state.board = Array(9).fill(null);
    state.board[0] = freshEntry(concordCard, 'blue');
    state.playerHand = [1,2]; state.enemyHand = [1,2];
    out.aloneNoBonus = fullEffectiveValue(concordCard, 'top', null, 0, 'blue', 'attack') === rawTop;

    state.board[1] = freshEntry({ id:'ca1', name:'CA1', top:1,right:1,bottom:1,left:1 }, 'blue');
    out.oneOtherAllyPlusOne = fullEffectiveValue(concordCard, 'top', null, 0, 'blue', 'attack') === rawTop + 1;

    state.board[2] = freshEntry({ id:'ca2', name:'CA2', top:1,right:1,bottom:1,left:1 }, 'blue');
    out.twoOthersHitsPresenceThreshold = fullEffectiveValue(concordCard, 'top', null, 0, 'blue', 'attack') === rawTop + 2 + 2; // synced+2, presence+2

    state.board[3] = freshEntry({ id:'ca3', name:'CA3', top:1,right:1,bottom:1,left:1 }, 'blue');
    out.threeOthersSyncedCapsAtThree = fullEffectiveValue(concordCard, 'top', null, 0, 'blue', 'attack') === rawTop + 3 + 2;

    state.board[4] = freshEntry({ id:'ca4', name:'CA4', top:1,right:1,bottom:1,left:1 }, 'blue');
    out.fourOthersStillCappedAtThree = fullEffectiveValue(concordCard, 'top', null, 0, 'blue', 'attack') === rawTop + 3 + 2;

    // Inspiring Aura: place Concord first (no self-buff on its own
    // placement -- captureBonus stays 0, Synchronized Souls/United
    // Presence are live bonuses, not stored on captureBonus), then place
    // another ally -- THAT card gets +1 this round.
    state.board = Array(9).fill(null);
    state.playerHand = [findCardById('concord')];
    placeCard(4, 'concord', 'blue');
    out.concordOwnPlacementNotBuffed = state.board[4].captureBonus === 0;
    state.playerHand = [{ id:'ia1', name:'IA1', top:1,right:1,bottom:1,left:1 }];
    placeCard(1, 'ia1', 'blue');
    out.arrivingAllyBuffedByAura = state.board[1].captureBonus === 1;

    return out;
  })()`);
  assert.equal(result.aloneNoBonus, true);
  assert.equal(result.oneOtherAllyPlusOne, true);
  assert.equal(result.twoOthersHitsPresenceThreshold, true, 'United Presence must be a flat +2 stat bonus once 3+ allies are controlled, not a capture-immunity flag');
  assert.equal(result.threeOthersSyncedCapsAtThree, true);
  assert.equal(result.fourOthersStillCappedAtThree, true, "Synchronized Souls' scaling bonus must cap at +3");
  assert.equal(result.concordOwnPlacementNotBuffed, true);
  assert.equal(result.arrivingAllyBuffedByAura, true, "Inspiring Aura must buff the ARRIVING ally, not Concord itself");
  assert.deepEqual(pageErrors, []);
  await page.close();
});

test('Fas 15 (two new cards, externally sketched + reviewed): The Concord\'s United Will ultimate -- team buff gated by the 3-ally threshold, self buff always applies', async () => {
  const { page, pageErrors } = await newPage();
  const result = await page.evaluate(`(async () => {
    ${freshEntrySnippet()}
    const out = {};

    // Below threshold (2 allies total): no team buff, but Concord's own
    // +2 still applies regardless.
    state.board = Array(9).fill(null);
    const soloConcord = freshEntry(findCardById('concord'), 'blue');
    state.board[4] = soloConcord;
    const soloAlly = freshEntry({ id:'uw1', name:'UW1', top:1,right:1,bottom:1,left:1 }, 'blue');
    state.board[0] = soloAlly;
    state.wins = { blue: 2, red: 0 };
    state.specialUsed = {};
    state.turn = 'blue';
    runSpecialResolution(4, null, {});
    await new Promise(r => setTimeout(r, ULTIMATE_WINDUP_MS + ULTIMATE_HITSTOP_MS + 50));
    out.belowThresholdNoTeamBuff = soloAlly.captureBonus === 0;
    out.belowThresholdSelfStillBuffed = soloConcord.captureBonus === 2;

    // At threshold (3 allies total): team buff fires for everyone,
    // Concord's own +2 stacks on top (not replaced by the +1).
    state.ultimateBanner = null;
    state.board = Array(9).fill(null);
    const teamConcord = freshEntry(findCardById('concord'), 'blue');
    state.board[4] = teamConcord;
    const teamAlly1 = freshEntry({ id:'uw2', name:'UW2', top:1,right:1,bottom:1,left:1 }, 'blue');
    state.board[0] = teamAlly1;
    const teamAlly2 = freshEntry({ id:'uw3', name:'UW3', top:1,right:1,bottom:1,left:1 }, 'blue');
    state.board[1] = teamAlly2;
    state.wins = { blue: 2, red: 0 };
    state.specialUsed = {};
    state.turn = 'blue';
    runSpecialResolution(4, null, {});
    await new Promise(r => setTimeout(r, ULTIMATE_WINDUP_MS + ULTIMATE_HITSTOP_MS + 50));
    out.atThresholdTeamBuffed = teamAlly1.captureBonus === 1 && teamAlly2.captureBonus === 1;
    out.atThresholdSelfBuffedOnTopOfTeamBuff = teamConcord.captureBonus === 3; // +1 team + +2 self

    return out;
  })()`);
  assert.equal(result.belowThresholdNoTeamBuff, true);
  assert.equal(result.belowThresholdSelfStillBuffed, true, "Concord's own +2 applies unconditionally, per the literal card text");
  assert.equal(result.atThresholdTeamBuffed, true);
  assert.equal(result.atThresholdSelfBuffedOnTopOfTeamBuff, true);
  assert.deepEqual(pageErrors, []);
  await page.close();
});

test('Fas 15 (two new cards, externally sketched + reviewed): Elyrion\'s Threads of Destiny ultimate -- debuffs first, then checks defeat (same shape as Tilda\'s Nightfall), buffs allies only on an actual capture', async () => {
  const { page, pageErrors } = await newPage();
  const result = await page.evaluate(`(async () => {
    ${freshEntrySnippet()}
    const out = {};

    // Target survives the debuff (still too strong): no capture, no ally buff.
    state.board = Array(9).fill(null);
    const weakElyrion = freshEntry({ ...findCardById('elyrion'), top:1,right:1,bottom:1,left:1 }, 'blue');
    state.board[4] = weakElyrion;
    const sturdyTarget = freshEntry({ id:'st1', name:'ST1', top:10,right:10,bottom:10,left:10 }, 'red');
    state.board[1] = sturdyTarget;
    const ally = freshEntry({ id:'el-ally1', name:'ElAlly1', top:1,right:1,bottom:1,left:1 }, 'blue');
    state.board[7] = ally;
    state.wins = { blue: 2, red: 0 };
    state.specialUsed = {};
    state.turn = 'blue';
    runSpecialResolution(4, 1, {});
    await new Promise(r => setTimeout(r, ULTIMATE_WINDUP_MS + ULTIMATE_HITSTOP_MS + 50));
    out.survivedTargetStillDebuffed = sturdyTarget.captureBonus === -2 && sturdyTarget.owner === 'red';
    out.noAllyBuffWhenTargetSurvives = ally.captureBonus === 0;

    // Target is defeated by the debuff: captured, and the whole side gets +1.
    state.ultimateBanner = null;
    state.board = Array(9).fill(null);
    const strongElyrion = freshEntry(findCardById('elyrion'), 'blue'); // top 9
    state.board[4] = strongElyrion;
    const marginalTarget = freshEntry({ id:'mt1', name:'MT1', top:10,right:10,bottom:10,left:10 }, 'red'); // totalPower 40, beats Elyrion's 36 alone -- but the -2-all-sides debuff drops it to 32, which loses
    state.board[1] = marginalTarget;
    const ally2 = freshEntry({ id:'el-ally2', name:'ElAlly2', top:1,right:1,bottom:1,left:1 }, 'blue');
    state.board[7] = ally2;
    state.wins = { blue: 2, red: 0 };
    state.specialUsed = {};
    state.turn = 'blue';
    runSpecialResolution(4, 1, {});
    await new Promise(r => setTimeout(r, ULTIMATE_WINDUP_MS + ULTIMATE_HITSTOP_MS + 50));
    out.defeatedTargetCaptured = marginalTarget.owner === 'blue';
    out.allySideBuffedOnCapture = ally2.captureBonus === 1 && strongElyrion.captureBonus === 1;

    return out;
  })()`);
  assert.equal(result.survivedTargetStillDebuffed, true);
  assert.equal(result.noAllyBuffWhenTargetSurvives, true);
  assert.equal(result.defeatedTargetCaptured, true);
  assert.equal(result.allySideBuffedOnCapture, true, "the whole side (Elyrion included) gets +1 only when the debuff actually defeats the target");
  assert.deepEqual(pageErrors, []);
  await page.close();
});

test('Fas 15 (VFX for the two new cards): Elyrion\'s Threads of Destiny and The Concord\'s United Will both use the shared .ultimate-vfx toolkit', async () => {
  const { page, pageErrors } = await newPage();
  const result = await page.evaluate(`(() => {
    const out = {};
    state.phase = 'battle';

    // Elyrion: single-target ring+hit, emerald/teal.
    state.board = Array(9).fill(null);
    state.board[4] = { card: findCardById('elyrion'), owner:'blue' };
    state.board[1] = { card: findCardById('ogre'), owner:'red' };
    state.ultimateBanner = { phase:'impact', owner:'blue', name:'Threads of Destiny', sourceIndex:4, targetIndex:1, enemyIndices:null };
    let html = renderBattle();
    out.elyrionHasRingAndHit = html.includes('class="vfx-ring"') && html.includes('class="vfx-hit"');
    out.elyrionIsEmeraldTeal = html.includes('rgba(62,207,142');

    // The Concord: AOE ring+hit on every own-side ally, distinct gold palette.
    state.board = Array(9).fill(null);
    state.board[4] = { card: findCardById('concord'), owner:'blue' };
    state.board[0] = { card: findCardById('ogre'), owner:'blue' };
    state.board[8] = { card: findCardById('ogre'), owner:'blue' };
    state.board[6] = { card: findCardById('ogre'), owner:'red' };
    state.ultimateBanner = { phase:'impact', owner:'blue', name:'United Will', sourceIndex:4, targetIndex:null, enemyIndices:null };
    html = renderBattle();
    out.concordHitsAllThreeAllies = (html.match(/class="vfx-hit"/g) || []).length === 3; // self + 2 allies, never the red enemy
    out.concordIsGold = html.includes('rgba(224,192,47');

    return out;
  })()`);
  assert.equal(result.elyrionHasRingAndHit, true);
  assert.equal(result.elyrionIsEmeraldTeal, true);
  assert.equal(result.concordHitsAllThreeAllies, true, "United Will's VFX must mark every own-side ally (Concord included), never the enemy card");
  assert.equal(result.concordIsGold, true);
  assert.deepEqual(pageErrors, []);
  await page.close();
});

test('Fas 15 follow-up: Elyrion and The Concord have real CARD_IMAGES art (cropped from the user\'s own supplied images), not just the icon+gradient fallback', async () => {
  const { page, pageErrors } = await newPage();
  const result = await page.evaluate(`(() => {
    return {
      elyrionHasArt: typeof CARD_IMAGES.elyrion === 'string' && CARD_IMAGES.elyrion.length > 0,
      concordHasArt: typeof CARD_IMAGES.concord === 'string' && CARD_IMAGES.concord.length > 0,
    };
  })()`);
  assert.equal(result.elyrionHasArt, true);
  assert.equal(result.concordHasArt, true);
  assert.deepEqual(pageErrors, []);
  await page.close();
});

test('Fas 16 (better light effects, user-supplied textures): .vfx-ring/.vfx-twinkle are upgraded with real light-burst/spark textures via ::before, and .vfx-magic-circle renders as a true centered circle (regression test for a margin-percentage-relative-to-width CSS bug that broke centering in a non-square container)', async () => {
  const { page, pageErrors } = await newPage();
  const result = await page.evaluate(`(() => {
    const out = {};
    state.phase = 'battle';
    state.board = Array(9).fill(null);
    state.board[4] = { card: findCardById('lyrith'), owner:'blue' };
    state.board[1] = { card: findCardById('ogre'), owner:'red' };
    state.ultimateBanner = { phase:'impact', owner:'blue', name:"Serpent's Wrath", sourceIndex:4, targetIndex:1, enemyIndices:null };
    render();
    const ring = document.querySelector('.vfx-ring');
    const ringBefore = getComputedStyle(ring, '::before');
    out.ringHasLightBurstTexture = (ringBefore.webkitMaskImage || ringBefore.maskImage || '').includes('vfx-lightburst.png');

    // Serpent's Wrath is single-target and has no .vfx-twinkle/.vfx-particle
    // at all -- switch to Wave of Loyalty (Pallis), one of the toolkit's
    // particle-swarm-using AOE cards (see particleSwarmHtml, added after
    // this test was first written -- Wave of Loyalty's fixed 6-point
    // twinkle grid was replaced with a randomized swarm), to check the
    // swarm's own spark texture, applied directly to .vfx-particle rather
    // than via ::before.
    state.board[4] = { card: findCardById('pallis'), owner:'blue' };
    state.ultimateBanner = { phase:'impact', owner:'blue', name:'Wave of Loyalty', sourceIndex:4, targetIndex:null, enemyIndices:null, element:'earth' };
    render();
    const particle = document.querySelector('.vfx-particle');
    const particleStyle = particle ? getComputedStyle(particle) : null;
    out.twinkleHasSparkTexture = !!particleStyle && (particleStyle.webkitMaskImage || particleStyle.maskImage || '').includes('vfx-spark.png');

    // Magic-circle centering regression test: place it in a deliberately
    // non-square wrapper (matching .ultimate-vfx's real 5/7 aspect-ratio)
    // and verify the rendered circle is actually centered on the
    // wrapper's own center point, with equal width/height (a true
    // circle, not an oval stretched by the container's own aspect ratio).
    const probe = document.createElement('div');
    probe.className = 'ultimate-vfx phase-impact';
    probe.style.cssText = 'position:absolute; top:100px; left:100px; width:200px; aspect-ratio:5/7;';
    probe.style.setProperty('--vfx-x', '50%');
    probe.style.setProperty('--vfx-y', '50%');
    probe.innerHTML = '<div class="vfx-magic-circle" style="animation:none; opacity:1; transform:translate(-50%,-50%);"></div>';
    document.body.appendChild(probe);
    const wrapRect = probe.getBoundingClientRect();
    const circleRect = probe.querySelector('.vfx-magic-circle').getBoundingClientRect();
    const wrapCenterX = wrapRect.left + wrapRect.width/2;
    const wrapCenterY = wrapRect.top + wrapRect.height/2;
    const circleCenterX = circleRect.left + circleRect.width/2;
    const circleCenterY = circleRect.top + circleRect.height/2;
    out.magicCircleCenteredX = Math.abs(circleCenterX - wrapCenterX) < 2;
    out.magicCircleCenteredY = Math.abs(circleCenterY - wrapCenterY) < 2;
    out.magicCircleIsRound = Math.abs(circleRect.width - circleRect.height) < 2;
    probe.remove();

    return out;
  })()`);
  assert.equal(result.ringHasLightBurstTexture, true);
  assert.equal(result.twinkleHasSparkTexture, true);
  assert.equal(result.magicCircleCenteredX, true);
  assert.equal(result.magicCircleCenteredY, true, "vertical centering must not break in a non-square container (the margin-percent-uses-width CSS quirk)");
  assert.equal(result.magicCircleIsRound, true, "width:N%; aspect-ratio:1 must render a true circle regardless of the container's own aspect ratio");
  assert.deepEqual(pageErrors, []);
  await page.close();
});

test('Fas 17 (VFX expansion round 6): Three Head Dragon, The Infinite Seraph, Tilda, and Graff get identity VFX on the shared toolkit', async () => {
  const { page, pageErrors } = await newPage();
  const result = await page.evaluate(`(() => {
    const out = {};
    state.phase = 'battle';

    // Three Head Dragon's Apokalyps: the first card to use .vfx-magic-circle
    // (Fas 16's new standalone primitive), plus hit markers on every enemy.
    state.board = Array(9).fill(null);
    state.board[4] = { card: findCardById('threeheaddragon'), owner:'blue' };
    state.board[1] = { card: findCardById('ogre'), owner:'red' };
    state.board[7] = { card: findCardById('ogre'), owner:'red' };
    state.ultimateBanner = { phase:'impact', owner:'blue', name:'Apokalyps', sourceIndex:4, targetIndex:null, enemyIndices:null };
    let html = renderBattle();
    out.apokalypsUsesMagicCircle = html.includes('class="vfx-magic-circle"');
    out.apokalypsHasTwoHits = (html.match(/class="vfx-hit"/g) || []).length === 2;
    out.apokalypsIsViolet = html.includes('rgba(139,110,242');

    // The Infinite Seraph's All Possibilities: direction-target, only the
    // chosen line gets a hit, live enemiesInDirection() recompute (never
    // destroys, same shape as Ragnarök).
    state.board = Array(9).fill(null);
    state.board[4] = { card: findCardById('infiniteseraph'), owner:'blue' };
    state.board[1] = { card: findCardById('ogre'), owner:'red' };
    state.board[7] = { card: findCardById('ogre'), owner:'red' };
    state.ultimateBanner = { phase:'impact', owner:'blue', name:'All Possibilities', sourceIndex:4, targetIndex:null, enemyIndices:null, direction:'up' };
    html = renderBattle();
    out.allPossibilitiesHitsOnlyUpDirection = (html.match(/class="vfx-hit"/g) || []).length === 1;
    out.allPossibilitiesIsLavender = html.includes('rgba(200,190,220');

    // Tilda's Nightfall: single-target dark palette.
    state.board = Array(9).fill(null);
    state.board[4] = { card: findCardById('tilda'), owner:'blue' };
    state.board[1] = { card: findCardById('ogre'), owner:'red' };
    state.ultimateBanner = { phase:'impact', owner:'blue', name:'Nightfall', sourceIndex:4, targetIndex:1, enemyIndices:null };
    html = renderBattle();
    out.nightfallIsDarkIndigo = html.includes('rgba(60,40,110');

    // Graff's Whirlwind Assault: hybrid shape -- a main target hit PLUS a
    // splash hit on every OTHER enemy, in the same special.
    state.board = Array(9).fill(null);
    state.board[4] = { card: findCardById('graff'), owner:'blue' };
    state.board[1] = { card: findCardById('ogre'), owner:'red' };
    state.board[3] = { card: findCardById('ogre'), owner:'red' };
    state.board[5] = { card: findCardById('ogre'), owner:'red' };
    state.ultimateBanner = { phase:'impact', owner:'blue', name:'Whirlwind Assault', sourceIndex:4, targetIndex:1, enemyIndices:null };
    html = renderBattle();
    out.whirlwindHasThreeHits = (html.match(/class="vfx-hit"/g) || []).length === 3; // 1 main target + 2 splash (cells 3,5; cell1 is the target itself, excluded from splash)

    return out;
  })()`);
  assert.equal(result.apokalypsUsesMagicCircle, true, "Apokalyps must be the first card using the new .vfx-magic-circle primitive");
  assert.equal(result.apokalypsHasTwoHits, true);
  assert.equal(result.apokalypsIsViolet, true);
  assert.equal(result.allPossibilitiesHitsOnlyUpDirection, true, "All Possibilities' VFX must only mark cells in the actual chosen direction");
  assert.equal(result.allPossibilitiesIsLavender, true);
  assert.equal(result.nightfallIsDarkIndigo, true);
  assert.equal(result.whirlwindHasThreeHits, true, "Whirlwind Assault must show the main target hit PLUS a splash hit on every OTHER enemy, never double-counting the target itself");
  assert.deepEqual(pageErrors, []);
  await page.close();
});

test('Fas 19 (better light effects, round 2): direction/line-target cards (Ragnarök, Eternal Verdict, The Falling World, All Possibilities) now show a real .vfx-beam connecting the caster to the farthest hit cell', async () => {
  const { page, pageErrors } = await newPage();
  const result = await page.evaluate(`(() => {
    const out = {};
    state.phase = 'battle';

    // Ragnarök: source at 4, one hit at 1 ('up').
    state.board = Array(9).fill(null);
    state.board[4] = { card: findCardById('fenrir'), owner:'blue' };
    state.board[1] = { card: findCardById('ogre'), owner:'red' };
    state.ultimateBanner = { phase:'impact', owner:'blue', name:'Ragnarök', sourceIndex:4, targetIndex:null, enemyIndices:null, direction:'up' };
    let html = renderBattle();
    out.ragnarokHasBeam = html.includes('class="vfx-beam"') && html.includes('class="vfx-beam-inner"');

    // Eternal Verdict: snapshot-based enemyIndices, still gets a beam.
    state.ultimateBanner = { phase:'impact', owner:'blue', name:'Eternal Verdict', sourceIndex:4, targetIndex:null, enemyIndices:[1] };
    html = renderBattle();
    out.eternalVerdictHasBeam = html.includes('class="vfx-beam"');

    // The Falling World: same snapshot shape.
    state.ultimateBanner = { phase:'impact', owner:'blue', name:'The Falling World', sourceIndex:4, targetIndex:null, enemyIndices:[1] };
    html = renderBattle();
    out.fallingWorldHasBeam = html.includes('class="vfx-beam"');

    // All Possibilities: live direction recompute.
    state.ultimateBanner = { phase:'impact', owner:'blue', name:'All Possibilities', sourceIndex:4, targetIndex:null, enemyIndices:null, direction:'up' };
    html = renderBattle();
    out.allPossibilitiesHasBeam = html.includes('class="vfx-beam"');

    // No enemies in the line at all -- must render safely with NO beam
    // (nothing to point at), not throw.
    state.board = Array(9).fill(null);
    state.board[4] = { card: findCardById('fenrir'), owner:'blue' };
    state.ultimateBanner = { phase:'impact', owner:'blue', name:'Ragnarök', sourceIndex:4, targetIndex:null, enemyIndices:null, direction:'up' };
    html = renderBattle();
    out.noBeamWhenNoHits = !html.includes('class="vfx-beam"');

    return out;
  })()`);
  assert.equal(result.ragnarokHasBeam, true);
  assert.equal(result.eternalVerdictHasBeam, true);
  assert.equal(result.fallingWorldHasBeam, true);
  assert.equal(result.allPossibilitiesHasBeam, true);
  assert.equal(result.noBeamWhenNoHits, true, 'a direction-target card with nothing in its line must not render a dangling beam');
  assert.deepEqual(pageErrors, []);
  await page.close();
});

test('VFX expansion round 7: every remaining card without bespoke identity VFX (29 cards) now renders real ring/hit VFX instead of just the plain name banner', async () => {
  const { page, pageErrors } = await newPage();
  const result = await page.evaluate(`(() => {
    const out = {};
    state.phase = 'battle';
    state.wins = { blue: 5, red: 2 };

    // Plain single-target captures -- ring+hit at the target cell.
    const singleTargetCases = [
      ['darien', 'Shadow Breaker'], ['zaevir', 'Eternal Arrow'], ['sarah', "Aion's Last Light"],
      ['vayra', 'Eclipse'], ['ysara', 'Eternal Eclipse'], ['ragnar', 'Blood Fury'],
      ['deathblade', 'Shadow Assault'], ['tahabata', 'Inferno Dominion'], ['aurelia', "Dawn's Reckoning"],
      ['twistedgipsy', 'House of Shadows'], ['maximus', 'Axe of Dominion'], ['darum', 'Gate of Dominion'],
      ['astrael', 'Falling Stars'], ['yojimbo', 'Zanmato'], ['chocoboking', 'Royal Choco Meteor'],
    ];
    out.singleTargetResults = singleTargetCases.map(([id, name]) => {
      state.board = Array(9).fill(null);
      state.board[4] = { card: findCardById(id), owner:'blue' };
      state.board[1] = { card: findCardById('ogre'), owner:'red' };
      state.ultimateBanner = { phase:'impact', owner:'blue', name, sourceIndex:4, targetIndex:1, enemyIndices:null };
      const html = renderBattle();
      return { id, hasRing: html.includes('class="vfx-ring"'), hasHit: html.includes('vfx-hit') };
    });
    out.zaevirHasProjectile = (() => {
      state.board = Array(9).fill(null);
      state.board[4] = { card: findCardById('zaevir'), owner:'blue' };
      state.board[1] = { card: findCardById('ogre'), owner:'red' };
      state.ultimateBanner = { phase:'impact', owner:'blue', name:'Eternal Arrow', sourceIndex:4, targetIndex:1, enemyIndices:null };
      return renderBattle().includes('vfx-projectile');
    })();
    out.astraelHasTwinkle = (() => {
      state.board = Array(9).fill(null);
      state.board[4] = { card: findCardById('astrael'), owner:'blue' };
      state.board[1] = { card: findCardById('ogre'), owner:'red' };
      state.ultimateBanner = { phase:'impact', owner:'blue', name:'Falling Stars', sourceIndex:4, targetIndex:1, enemyIndices:null };
      return renderBattle().includes('vfx-particle');
    })();

    // Own-side "blessing" AOEs -- ring at the caster + a hit marker on
    // every allied cell (Elara/Naline/Zlaizer heal/revive their OWN side).
    const ownSideCases = [['elara', 'Requiem of Light'], ['naline', 'Rise Again'], ['zlaizer', 'Rebirth']];
    out.ownSideResults = ownSideCases.map(([id, name]) => {
      state.board = Array(9).fill(null);
      state.board[4] = { card: findCardById(id), owner:'blue' };
      state.board[0] = { card: findCardById('ogre'), owner:'blue' }; // ally
      state.board[1] = { card: findCardById('ogre'), owner:'red' }; // enemy -- must NOT be marked
      state.ultimateBanner = { phase:'impact', owner:'blue', name, sourceIndex:4, targetIndex:null, enemyIndices:null };
      const html = renderBattle();
      // Exactly 2 hits expected: the caster (index 4) and the one ally (index 0) -- never the enemy.
      const hitCount = (html.match(/class="vfx-hit"/g) || []).length;
      return { id, hasRing: html.includes('class="vfx-ring"'), hitCount };
    });

    // Whole-board enemy strikes (debuff-only AND destroy-all cards alike)
    // -- ring at the caster + a hit marker on every cast-time enemyIndices cell.
    const wholeBoardCases = [
      ['torn', 'Lethal Volley'], ['sylvarion', "Herald's Gale"], ['ferea', 'The Frozen Crown'],
      ['leviathan', 'Abyssal Deluge'], ['morvath', 'The Endless Tide'], ['zalazar', 'Apocalypse'],
      ['kaeldryx', 'Dragonslayer'], ['umbrael', 'End of All'], ['pallispell', "Hunter's Wrath"],
    ];
    out.wholeBoardResults = wholeBoardCases.map(([id, name]) => {
      state.board = Array(9).fill(null);
      state.board[4] = { card: findCardById(id), owner:'blue' };
      state.board[1] = { card: findCardById('ogre'), owner:'red' };
      state.board[7] = { card: findCardById('ogre'), owner:'red' };
      state.ultimateBanner = { phase:'impact', owner:'blue', name, sourceIndex:4, targetIndex:null, enemyIndices:[1,7] };
      const html = renderBattle();
      const hitCount = (html.match(/class="vfx-hit"/g) || []).length;
      return { id, hasRing: html.includes('class="vfx-ring"'), hitCount };
    });
    out.morvathUsesMagicCircle = (() => {
      state.ultimateBanner = { phase:'impact', owner:'blue', name:'The Endless Tide', sourceIndex:4, targetIndex:null, enemyIndices:[1,7] };
      state.board[4] = { card: findCardById('morvath'), owner:'blue' };
      return renderBattle().includes('vfx-magic-circle');
    })();

    // Voidqueen's Oblivion's Call -- ring at the TARGET (not the caster),
    // plus a hit marker only on enemies ADJACENT to that target.
    state.board = Array(9).fill(null);
    state.board[4] = { card: findCardById('voidqueen'), owner:'blue' };
    state.board[1] = { card: findCardById('ogre'), owner:'red' }; // the chosen target
    state.board[2] = { card: findCardById('ogre'), owner:'red' }; // adjacent to target -- withered
    state.board[7] = { card: findCardById('ogre'), owner:'red' }; // NOT adjacent to target -- untouched
    state.ultimateBanner = { phase:'impact', owner:'blue', name:"Oblivion's Call", sourceIndex:4, targetIndex:1, enemyIndices:null };
    let html = renderBattle();
    out.oblivionHasRing = html.includes('class="vfx-ring"');
    out.oblivionHitCount = (html.match(/class="vfx-hit"/g) || []).length; // only cell 2, not cell 7

    // Little Jesp's Scales of Judgment -- self ring + a hit marker on
    // whichever side currently holds MORE wins (live from state.wins).
    state.board = Array(9).fill(null);
    state.board[4] = { card: findCardById('littlejesp'), owner:'blue' };
    state.board[0] = { card: findCardById('ogre'), owner:'blue' };
    state.board[1] = { card: findCardById('ogre'), owner:'red' };
    state.wins = { blue: 6, red: 2 }; // blue is leading -- blue's own 2 cells (4 and 0) get marked
    state.ultimateBanner = { phase:'impact', owner:'blue', name:'Scales of Judgment', sourceIndex:4, targetIndex:null, enemyIndices:null };
    html = renderBattle();
    out.scalesHasRing = html.includes('class="vfx-ring"');
    out.scalesHitCountLeading = (html.match(/class="vfx-hit"/g) || []).length;
    state.wins = { blue: 3, red: 3 }; // tied -- no side is "leading", no hits at all
    html = renderBattle();
    out.scalesHitCountTied = (html.match(/class="vfx-hit"/g) || []).length;

    return out;
  })()`);
  result.singleTargetResults.forEach(r => {
    assert.equal(r.hasRing, true, `${r.id} must render a .vfx-ring`);
    assert.equal(r.hasHit, true, `${r.id} must render a .vfx-hit`);
  });
  assert.equal(result.zaevirHasProjectile, true, "Eternal Arrow (a ranged marksman's shot) should get a falling .vfx-projectile like Skybreaker");
  assert.equal(result.astraelHasTwinkle, true, 'Falling Stars should get a .vfx-particle swarm for its cosmic/starry flavor');
  result.ownSideResults.forEach(r => {
    assert.equal(r.hasRing, true, `${r.id} must render a .vfx-ring`);
    assert.equal(r.hitCount, 2, `${r.id} must mark the caster + the one ally, never the enemy cell`);
  });
  result.wholeBoardResults.forEach(r => {
    assert.equal(r.hasRing, true, `${r.id} must render a .vfx-ring`);
    assert.equal(r.hitCount, 2, `${r.id} must mark both enemyIndices cells`);
  });
  assert.equal(result.morvathUsesMagicCircle, true, "Morvath's The Endless Tide is the flagship treatment for this round and should use .vfx-magic-circle");
  assert.equal(result.oblivionHasRing, true);
  assert.equal(result.oblivionHitCount, 1, "Oblivion's Call must wither only the enemy ADJACENT to the target, never the non-adjacent one");
  assert.equal(result.scalesHasRing, true);
  assert.equal(result.scalesHitCountLeading, 2, 'Scales of Judgment must mark every cell on the currently-leading side');
  assert.equal(result.scalesHitCountTied, 0, 'a perfectly tied score must mark no one');
  assert.deepEqual(pageErrors, []);
  await page.close();
});

test('VFX polish pass on the older single-target cards: shard/twinkle/clockhand/projectile flourishes, plus Deathblade\'s bespoke dual-location swap VFX', async () => {
  const { page, pageErrors } = await newPage();
  const result = await page.evaluate(`(() => {
    const out = {};
    state.phase = 'battle';

    function cast(id, name, extraSetup){
      state.board = Array(9).fill(null);
      state.board[4] = { card: findCardById(id), owner:'blue' };
      state.board[1] = { card: findCardById('ogre'), owner:'red' };
      if(extraSetup) extraSetup();
      state.ultimateBanner = { phase:'impact', owner:'blue', name, sourceIndex:4, targetIndex:1, enemyIndices:null };
      return renderBattle();
    }

    out.shardCards = ['darien|Shadow Breaker', 'ragnar|Blood Fury', 'tahabata|Inferno Dominion', 'maximus|Axe of Dominion', 'yojimbo|Zanmato'].map(s => {
      const [id, name] = s.split('|');
      const html = cast(id, name);
      return { id, hasShard: html.includes('class="vfx-shard"'), hasRing: html.includes('class="vfx-ring"') };
    });

    out.twinkleCards = ['vayra|Eclipse', 'aurelia|Dawn\\'s Reckoning', 'twistedgipsy|House of Shadows'].map(s => {
      const [id, name] = s.split('|');
      const html = cast(id, name);
      const twinkleCount = (html.match(/class="vfx-particle[ "]/g) || []).length;
      return { id, twinkleCount };
    });

    out.ysaraHasClockhand = (() => {
      const html = cast('ysara', 'Eternal Eclipse');
      return (html.match(/class="vfx-clockhand"/g) || []).length === 2;
    })();

    out.sarahHasProjectile = cast('sarah', "Aion's Last Light").includes('vfx-projectile');

    // Gate of Dominion is a deliberate "stay plain" case -- ring+hit only,
    // no extra flourish (see the SIMPLE_SINGLE_TARGET_VFX comment).
    const darumHtml = cast('darum', 'Gate of Dominion');
    out.darumStaysPlain = darumHtml.includes('class="vfx-ring"') && !darumHtml.includes('class="vfx-shard"') && !darumHtml.includes('class="vfx-twinkle') && !darumHtml.includes('class="vfx-particle') && !darumHtml.includes('class="vfx-projectile"') && !darumHtml.includes('class="vfx-clockhand"');

    // Deathblade's Shadow Assault swaps positions with its target instead
    // of capturing/destroying it -- must show a ring+hit at the ORIGINAL
    // target cell (idx 1) AND a second ring+twinkle at Deathblade's own
    // origin cell (idx 4), never the plain single-target shape.
    const swapHtml = cast('deathblade', 'Shadow Assault');
    out.shadowAssaultRingCount = (swapHtml.match(/class="vfx-ring"/g) || []).length;
    out.shadowAssaultHasTwinkle = swapHtml.includes('vfx-twinkle');
    out.shadowAssaultNotInSimpleTable = !swapHtml.includes('class="vfx-projectile"') && !swapHtml.includes('class="vfx-shard"');

    return out;
  })()`);
  result.shardCards.forEach(r => {
    assert.equal(r.hasRing, true, `${r.id} must still render a .vfx-ring`);
    assert.equal(r.hasShard, true, `${r.id} should get a .vfx-shard fragment burst`);
  });
  result.twinkleCards.forEach(r => {
    assert.equal(r.twinkleCount, 6, `${r.id} should get a randomized 6-particle swarm, not a single dot`);
  });
  assert.equal(result.ysaraHasClockhand, true, "Eternal Eclipse (Timeweaver) should get Vorathos's own .vfx-clockhand pair for its time flavor");
  assert.equal(result.sarahHasProjectile, true, "Aion's Last Light should get a falling .vfx-projectile like Skybreaker");
  assert.equal(result.darumStaysPlain, true, 'Gate of Dominion is a deliberate plain ring+hit card, no extra flourish');
  assert.equal(result.shadowAssaultRingCount, 2, "Shadow Assault must show a ring at BOTH the target cell and Deathblade's own origin cell (the position swap)");
  assert.equal(result.shadowAssaultHasTwinkle, true);
  assert.equal(result.shadowAssaultNotInSimpleTable, true, 'Shadow Assault must use its own bespoke derivation, not the generic single-target table');
  assert.deepEqual(pageErrors, []);
  await page.close();
});

test('Bug fix: simulatePlacementDetailed no longer seeds its Combo chain from an ordinary (non-Same/Plus) battle capture, matching resolveFlips\' own samePlusSeeds-only queue', async () => {
  const { page, pageErrors } = await newPage();
  const result = await page.evaluate(`(() => {
    const out = {};
    state.rules.same = false;
    state.rules.plus = false;
    state.rules.combo = true;
    state.board = Array(9).fill(null);
    const mk = (id, top, right, bottom, left, owner) => ({
      card: { id, name: id, top, right, bottom, left }, owner, captureBonus: 0,
    });
    // Placed card wins an ORDINARY battle against index1 (top 9 vs its
    // bottom 3, no Same/Plus rule active at all) -- index1, if allowed to
    // chain, would ALSO win against index0 (its own left 9 vs index0's
    // right 2). The old bug: simulatePlacementDetailed's combo BFS used
    // to seed its queue from every capture so far (including this plain
    // battle win), so index0 got wrongly captured too. Fixed: the queue
    // only ever seeds from real Same/Plus captures, so with both rules
    // off, index0 must never be touched.
    state.board[1] = mk('mid', 1, 1, 3, 9, 'red');
    state.board[0] = mk('corner', 1, 2, 1, 1, 'red');
    const placed = { id:'src', name:'Src', top:9, right:1, bottom:1, left:1 };

    const detailed = simulatePlacementDetailed(state.board, 4, placed, 'blue');
    out.sameOrPlus = detailed.sameOrPlus;
    out.combo = detailed.combo;
    out.index1Captured = detailed.board[1].owner === 'blue';
    out.index0StaysRed = detailed.board[0].owner === 'red';
    out.inputBoardUntouched = state.board[1].owner === 'red' && state.board[0].owner === 'red';

    return out;
  })()`);
  assert.equal(result.index1Captured, true, 'the ordinary battle win at index 1 must still happen');
  assert.equal(result.sameOrPlus, 0, 'no Same/Plus rule was active, so sameOrPlus must be 0');
  assert.equal(result.combo, 0, 'an ordinary battle capture must never seed a further Combo chain -- this is the bug being fixed');
  assert.equal(result.index0StaysRed, true, 'index 0 must NOT be captured -- the old bug let the chain wrongly reach it from the plain battle win at index 1');
  assert.equal(result.inputBoardUntouched, true);
  assert.deepEqual(pageErrors, []);
  await page.close();
});

test('simulatePlacementDetailed: a Same-seeded chain correctly cascades through a second hop, counted in .combo (not just .sameOrPlus)', async () => {
  const { page, pageErrors } = await newPage();
  const result = await page.evaluate(`(() => {
    const out = {};
    state.rules.same = true;
    state.rules.plus = false;
    state.rules.combo = true;
    state.board = Array(9).fill(null);
    const mk = (id, top, right, bottom, left, owner) => ({
      card: { id, name: id, top, right, bottom, left }, owner, captureBonus: 0,
    });
    // The Same rule only ever fires with AT LEAST 2 simultaneous matches
    // (see computeSamePlusCaptures' own matches.length >= 2 gate) -- a
    // lone matching neighbor never captures on its own, classic Triple
    // Triad Same semantics. So this needs two matched neighbors: index3
    // (left 5, matches placed's left-facing 5, no further chain of its
    // own) and index5 (left 5, matches placed's right-facing 5) -- index5
    // then, now blue, wins an ORDINARY battle against index2 via its own
    // top edge (9) against index2's bottom (1), a real second-hop Combo
    // capture only reachable because index5 itself was a genuine Same
    // capture.
    state.board[3] = mk('same-a', 1, 5, 1, 1, 'red');
    state.board[5] = mk('same-b', 9, 1, 1, 5, 'red');
    state.board[2] = mk('hop2', 1, 1, 1, 1, 'red');
    const placed = { id:'src', name:'Src', top:1, right:5, bottom:1, left:5 };

    const detailed = simulatePlacementDetailed(state.board, 4, placed, 'blue');
    out.sameOrPlus = detailed.sameOrPlus;
    out.combo = detailed.combo;
    out.sameACaptured = detailed.board[3].owner === 'blue';
    out.sameBCaptured = detailed.board[5].owner === 'blue';
    out.hop2Captured = detailed.board[2].owner === 'blue';

    return out;
  })()`);
  assert.equal(result.sameACaptured, true);
  assert.equal(result.sameBCaptured, true);
  assert.equal(result.hop2Captured, true, 'the second-hop capture, chained from a real Same capture, must succeed');
  assert.equal(result.sameOrPlus, 2, 'both simultaneous Same matches count toward sameOrPlus');
  assert.equal(result.combo, 1, 'exactly one further Combo-chain capture happened at hop 2, beyond the two immediate Same captures');
  assert.deepEqual(pageErrors, []);
  await page.close();
});

test('Gameplay aids (Easy/Normal only, user-requested "extra hjälpmedel"): the suggested-placement hint picks the one cell that actually captures, and the "crazy combo" glow lights up a cell that would trigger a big Same chain -- both suppressed entirely on Hard', async () => {
  const { page, pageErrors } = await newPage();
  const result = await page.evaluate(`(() => {
    const out = {};
    state.draftMode = null;
    state.phase = 'battle';
    state.turn = 'blue';
    state.placedThisTurn = false;
    state.ultimateBanner = null;
    state.enemyHand = [];
    state.rules.same = false;
    state.rules.plus = false;
    state.rules.combo = false;

    // Cave Ogre (top8/right5/bottom8/left4, no active abilities -- a real,
    // plain registered card) placed next to a lone enemy Cave Ogre at
    // index 4: only index 3 (attacking with right(5) into the enemy's
    // left(4)) wins; index 1/7 tie (8 vs 8) and index 5 loses (4 vs 5).
    state.board = Array(9).fill(null);
    state.board[4] = { card: findCardById('ogre'), owner:'red', captureBonus:0 };
    state.pendingCard = 'ogre';

    state.aiDifficulty = 'normal';
    out.suggestedNormal = getSuggestedPlacementCell();

    state.aiDifficulty = 'hard';
    out.suggestedHard = getSuggestedPlacementCell();
    out.comboHardEmpty = getComboChainCells().size;

    // Reset for the combo-glow check: a real registered card (Cave Ogre)
    // as the caster, surrounded by four synthetic enemies whose facing
    // edge exactly matches the ogre's own -- a real, deterministic 4-way
    // Same capture reaching BIG_COMBO_CHAIN_THRESHOLD in one hop.
    state.rules.same = true;
    state.rules.combo = true;
    state.board = Array(9).fill(null);
    const mk = (top, right, bottom, left) => ({ card: { id:'synth', name:'Synth', top, right, bottom, left }, owner:'red', captureBonus:0 });
    state.board[1] = mk(1, 1, 8, 1); // bottom 8 matches ogre's top 8
    state.board[3] = mk(1, 4, 1, 1); // right 4 matches ogre's left 4
    state.board[5] = mk(1, 1, 1, 5); // left 5 matches ogre's right 5
    state.board[7] = mk(8, 1, 1, 1); // top 8 matches ogre's bottom 8
    state.pendingCard = 'ogre';
    state.aiDifficulty = 'normal';
    out.comboNormal = Array.from(getComboChainCells());

    state.aiDifficulty = 'hard';
    out.comboHard = Array.from(getComboChainCells());
    out.suggestedHardOnComboBoard = getSuggestedPlacementCell();

    // Full render wiring: cell 4 should carry BOTH the suggested-ring and
    // the combo-hint-ring markup on Normal, and NEITHER on Hard.
    state.aiDifficulty = 'normal';
    let html = renderBattle();
    out.htmlHasSuggestedRingNormal = (html.match(/class="suggested-ring"/g) || []).length;
    out.htmlHasComboRingNormal = (html.match(/class="combo-hint-ring"/g) || []).length;
    state.aiDifficulty = 'hard';
    html = renderBattle();
    out.htmlHasSuggestedRingHard = (html.match(/class="suggested-ring"/g) || []).length;
    out.htmlHasComboRingHard = (html.match(/class="combo-hint-ring"/g) || []).length;

    return out;
  })()`);
  assert.equal(result.suggestedNormal, 3, 'the only cell that actually captures (index 3) must be the suggested one');
  assert.equal(result.suggestedHard, null, 'no suggestion at all on Hard difficulty');
  assert.equal(result.comboHardEmpty, 0, 'no combo glow at all on Hard difficulty');
  assert.deepEqual(result.comboNormal, [4], 'the 4-way Same capture cell must glow -- it reaches BIG_COMBO_CHAIN_THRESHOLD in a single hop');
  assert.deepEqual(result.comboHard, [], 'the combo glow must also be fully suppressed on Hard, even though the same board would glow on Normal');
  assert.equal(result.suggestedHardOnComboBoard, null);
  assert.equal(result.htmlHasSuggestedRingNormal, 1);
  assert.equal(result.htmlHasComboRingNormal, 1);
  assert.equal(result.htmlHasSuggestedRingHard, 0);
  assert.equal(result.htmlHasComboRingHard, 0);
  assert.deepEqual(pageErrors, []);
  await page.close();
});

test('Bug fix (reported: AI turn freezes right after a Same/Plus capture): a card with an on-win DESTROY passive (Nexzoth\'s onWinDestroyLoserAlways) chained into via Combo must not get queued for further chaining once its "capture" is actually a destroy', async () => {
  const { page, pageErrors } = await newPage();
  const result = await page.evaluate(`(() => {
    const out = {};
    state.phase = 'battle';
    state.turn = 'red';
    state.placedThisTurn = false;
    state.ultimateBanner = null;
    state.draftMode = null;
    state.rules = { same: true, plus: true, combo: true, elemental: false };
    state.chainShake = false;
    state.destroyGhosts = [];
    state.specialUsed = {};
    state.wins = { blue: 2, red: 1 };
    state.graveyard = { blue: [], red: [] };

    // Exact reproduction of the reported freeze: Astrael placed at the
    // center, Same/Plus-capturing BOTH Leviathan (index 1) and Nexzoth
    // (index 5) at once. The Combo chain then routes an attack through
    // Nexzoth (now red) against Chocobo King (index 2) -- Nexzoth wins,
    // but his own onWinDestroyLoserAlways passive ("destroyed outright
    // instead of captured") destroys Chocobo King instead of capturing
    // him. The old bug: battleNeighbors still unconditionally counted
    // that as a flip and queued index 2 for further Combo chaining, so
    // popping it later called battleNeighbors/getEnemyNeighbors on a now-
    // null board slot and threw, aborting placeCard() mid-way -- the
    // whole game silently wedged exactly like the Fas 20 bug (nothing
    // rendering further, turn stuck).
    const mkEntry = (id, owner) => ({ card: findCardById(id), owner, shieldUsed:false, grantedShield:false, captureBonus:0 });
    state.board = Array(9).fill(null);
    state.board[0] = mkEntry('omegaweapon', 'blue');
    state.board[1] = mkEntry('leviathan', 'blue');
    state.board[2] = mkEntry('chocoboking', 'blue');
    state.board[5] = mkEntry('nexzoth', 'blue');
    state.enemyHand = [findCardById('astrael')];
    state.playerHand = [findCardById('ragnar'), findCardById('tilda')];

    let threw = null;
    try {
      placeCard(4, 'astrael', 'red');
    } catch (e) {
      threw = e.message;
    }

    out.threw = threw;
    out.chocoboKingDestroyed = state.board[2] === null;
    out.nexzothCaptured = state.board[5] && state.board[5].owner === 'red';
    out.leviathanCaptured = state.board[1] && state.board[1].owner === 'red';
    // The destroyed cell must never count toward the winner's flip/win
    // tally -- it was destroyed, not actually claimed as territory.
    out.winsAfter = state.wins.red;

    return out;
  })()`);
  assert.equal(result.threw, null, 'placeCard must not throw when a Combo-chained card destroys (rather than captures) its target');
  assert.equal(result.chocoboKingDestroyed, true, "Nexzoth's onWinDestroyLoserAlways must still actually destroy the target");
  assert.equal(result.nexzothCaptured, true);
  assert.equal(result.leviathanCaptured, true);
  assert.equal(result.winsAfter, 3, 'red should gain exactly 2 wins (Leviathan + Nexzoth via Same/Plus) -- the destroyed Chocobo King must NOT also count as a flip/win');
  assert.deepEqual(pageErrors, []);
  await page.close();
});

test('Particle Swarm ("gör det bättre" follow-up): particleSwarmHtml() generates randomized instances instead of a fixed layout -- no two calls look the same, and a fraction curve via the .orbit variant', async () => {
  const { page, pageErrors } = await newPage();
  const result = await page.evaluate(`(() => {
    const out = {};

    // Exactly N particles, every time, regardless of randomization.
    const htmlA = particleSwarmHtml(10);
    const countA = (htmlA.match(/class="vfx-particle/g) || []).length;
    out.countIsExactlyRequested = countA === 10;

    // Every particle carries its own randomized custom properties -- a
    // fixed-position system (the old .vfx-twinkle-0..5 grid) never needed
    // inline per-instance styles at all, everything lived in the stylesheet.
    out.everyParticleHasOwnVars = /--size:[\\d.]+px; --peak-opacity:[\\d.]+; --duration:[\\d.]+s; --delay:[\\d.]+s; --dx:-?[\\d.]+px; --dy:-?[\\d.]+px;/.test(htmlA);

    // Two separate calls must not produce identical output -- proves real
    // per-render randomization, not a static template being reused (the
    // whole point: "inte gröna maskar" -- never the same static pattern
    // twice).
    const htmlB = particleSwarmHtml(10);
    out.differsBetweenCalls = htmlA !== htmlB;

    // Across enough particles, both plain drift AND the curved .orbit
    // variant should show up (roughly 30% orbit per particleSwarmHtml) --
    // generate a big batch to make a false negative astronomically
    // unlikely rather than asserting on a tiny, flake-prone sample.
    const bigBatch = particleSwarmHtml(200);
    out.hasPlainParticles = /class="vfx-particle"/.test(bigBatch);
    out.hasOrbitParticles = /class="vfx-particle orbit"/.test(bigBatch);
    // Orbit instances additionally carry a curved midpoint offset that
    // plain drifting particles don't.
    const orbitCount = (bigBatch.match(/class="vfx-particle orbit"/g) || []).length;
    const midCount = (bigBatch.match(/--mid-x:/g) || []).length;
    out.orbitCountMatchesMidCount = orbitCount === midCount && orbitCount > 0;

    // Wired into the real toolkit: Wave of Loyalty (a former fixed
    // 6-point grid user) now renders a real particle swarm in its actual
    // impact-phase markup, not just in isolation.
    state.phase = 'battle';
    state.board = Array(9).fill(null);
    state.board[4] = { card: findCardById('pallis'), owner:'blue' };
    state.board[1] = { card: findCardById('ogre'), owner:'red' };
    state.ultimateBanner = { phase:'impact', owner:'blue', name:'Wave of Loyalty', sourceIndex:4, targetIndex:null, enemyIndices:null, element:'earth' };
    const waveHtml = renderBattle();
    out.waveOfLoyaltyUsesSwarm = (waveHtml.match(/class="vfx-particle[ "]/g) || []).length === 10;
    out.waveOfLoyaltyHasNoOldFixedGrid = !waveHtml.includes('vfx-twinkle-0');

    return out;
  })()`);
  assert.equal(result.countIsExactlyRequested, true);
  assert.equal(result.everyParticleHasOwnVars, true, 'each particle instance must carry its own randomized inline custom properties');
  assert.equal(result.differsBetweenCalls, true, 'two calls must never produce byte-identical markup -- proves real randomization, not a reused static template');
  assert.equal(result.hasPlainParticles, true);
  assert.equal(result.hasOrbitParticles, true, 'a large batch must include at least one .orbit (curved) particle');
  assert.equal(result.orbitCountMatchesMidCount, true, 'every .orbit particle (and only those) must carry a --mid-x curve offset');
  assert.equal(result.waveOfLoyaltyUsesSwarm, true, 'Wave of Loyalty must render the real 10-particle swarm in its actual impact markup');
  assert.equal(result.waveOfLoyaltyHasNoOldFixedGrid, true, 'the old fixed .vfx-twinkle-0..5 grid must be gone from Wave of Loyalty');
  assert.deepEqual(pageErrors, []);
  await page.close();
});

test('Leaderboard (Fas 26): degrades gracefully with no Firebase loaded (this test harness blocks external requests, same as production behind an ad-blocker/offline), and calls window.leaderboardSyncScore/leaderboardFetchTop correctly once mocked in', async () => {
  const { page, pageErrors } = await newPage();

  // Part A: with window.leaderboardSyncScore/leaderboardFetchTop entirely
  // absent (exactly what happens when the Firebase module script's real
  // network request is blocked -- an ad-blocker, offline, or this test
  // harness's own route-blocking), nothing must throw, and the UI must
  // show a clear error state rather than hanging or silently doing nothing.
  const partA = await page.evaluate(`(() => {
    const out = {};
    playerName = 'NoFirebaseTest';
    out.syncNoThrow = (() => { try { syncLeaderboardScore(); return true; } catch(e){ return false; } })();

    state.showLeaderboard = true;
    state.leaderboardStatus = 'loading';
    state.leaderboardEntries = null;
    render();
    // Mirrors attachHandlers' own leaderboard-open-btn click handler logic.
    if(window.leaderboardFetchTop){
      out.hadRealFetch = true;
    } else {
      state.leaderboardStatus = 'error';
      render();
      out.hadRealFetch = false;
    }
    out.showsErrorStatus = document.querySelector('.leaderboard-status') !== null;
    out.errorText = document.querySelector('.leaderboard-status') ? document.querySelector('.leaderboard-status').textContent : null;
    state.showLeaderboard = false;
    return out;
  })()`);
  assert.equal(partA.syncNoThrow, true, 'syncLeaderboardScore must never throw when the Firebase module has not loaded');
  assert.equal(partA.hadRealFetch, false, 'this test harness blocks external requests, so the real Firebase module never loads -- confirms the test is actually exercising the no-Firebase path');
  assert.equal(partA.showsErrorStatus, true);

  // Part B: mock window.leaderboardSyncScore/leaderboardFetchTop directly
  // (standing in for the real Firebase module script, which we can't load
  // here) to verify OUR code -- syncLeaderboardScore's payload shape, the
  // name-input change handler, and the open-button's fetch-and-render
  // flow -- is actually correct.
  const partB = await page.evaluate(`(async () => {
    const out = {};
    const syncCalls = [];
    window.leaderboardSyncScore = async (pid, data) => { syncCalls.push({ pid, data }); };
    window.leaderboardFetchTop = async (count) => {
      out.fetchCalledWithCount = count;
      return [
        { id: playerId, name: 'MockMe', wins: 7, losses: 2, draws: 1 },
        { id: 'someone-else', name: 'MockRival', wins: 5, losses: 5, draws: 0 },
      ];
    };

    state.draftMode = null;
    matchStats.wins = 7; matchStats.losses = 2; matchStats.draws = 1; matchStats.matches = 10;
    playerName = 'MockMe';
    savePlayerName('MockMe');
    syncLeaderboardScore();
    await new Promise(r => setTimeout(r, 0));
    out.syncCallCount = syncCalls.length;
    out.syncPayload = syncCalls[0] ? syncCalls[0].data : null;
    out.syncUsedRealPlayerId = syncCalls[0] ? syncCalls[0].pid === playerId : false;

    // Full open-button flow, exactly mirroring attachHandlers' own handler.
    state.showLeaderboard = true;
    state.leaderboardStatus = 'loading';
    state.leaderboardEntries = null;
    render();
    const rows = await window.leaderboardFetchTop(20);
    state.leaderboardEntries = rows;
    state.leaderboardStatus = rows === null ? 'error' : 'ready';
    render();

    out.statusAfterFetch = state.leaderboardStatus;
    out.rowCount = document.querySelectorAll('.leaderboard-row').length;
    out.youRowShowsCorrectPlayer = document.querySelector('.leaderboard-row.leaderboard-you').textContent.includes('MockMe');
    out.rivalRowNotHighlighted = !document.querySelector('.leaderboard-row:not(.leaderboard-you)').classList.contains('leaderboard-you');

    return out;
  })()`);
  assert.equal(partB.syncCallCount, 1, 'syncLeaderboardScore must call window.leaderboardSyncScore exactly once');
  assert.equal(partB.syncUsedRealPlayerId, true, "must sync under this browser's own stable playerId, not a fresh/random one");
  assert.deepEqual(partB.syncPayload, { name: 'MockMe', wins: 7, losses: 2, draws: 1, matchesPlayed: 10, updatedAt: partB.syncPayload.updatedAt }, 'the synced payload must mirror matchStats exactly, field for field');
  assert.equal(partB.fetchCalledWithCount, 20, 'the leaderboard should request a reasonable top-N, not the entire collection');
  assert.equal(partB.statusAfterFetch, 'ready');
  assert.equal(partB.rowCount, 2);
  assert.equal(partB.youRowShowsCorrectPlayer, true, "this browser's own row must be identified by playerId and show the right name");
  assert.equal(partB.rivalRowNotHighlighted, true, "another player's row must never get the 'you' highlight");
  assert.deepEqual(pageErrors, []);
  await page.close();
});

test('Leaderboard (Fas 26): player names are HTML-escaped before rendering, both in the name input and in fetched leaderboard rows -- a malicious name must never execute as markup', async () => {
  const { page, pageErrors } = await newPage();
  const result = await page.evaluate(`(async () => {
    const out = {};
    const evilName = '<img src=x onerror="window.__xss=true">';

    // 1. The name input's own value attribute.
    playerName = evilName;
    state.draftMode = null;
    let html = renderDraft();
    out.inputHtmlEscaped = html.includes('&lt;img') && !html.includes('<img src=x onerror');

    // 2. A fetched leaderboard row carrying the same hostile name (as if
    // written directly via the Firestore SDK, bypassing our own UI/rules'
    // type checks, which validate shape/length but not HTML content).
    window.leaderboardFetchTop = async () => [{ id: 'attacker', name: evilName, wins: 1, losses: 0, draws: 0 }];
    state.showLeaderboard = true;
    state.leaderboardStatus = 'ready';
    state.leaderboardEntries = await window.leaderboardFetchTop();
    html = renderLeaderboardModal();
    out.rowHtmlEscaped = html.includes('&lt;img') && !html.includes('<img src=x onerror');

    // 3. Actually mount it and confirm the onerror handler never executed
    // (the real proof an escape works -- not just string-matching).
    window.__xss = false;
    render();
    await new Promise(r => setTimeout(r, 50));
    out.xssDidNotFire = window.__xss === false;

    return out;
  })()`);
  assert.equal(result.inputHtmlEscaped, true, "a malicious player name must be escaped before landing in the name input's value attribute");
  assert.equal(result.rowHtmlEscaped, true, "a malicious name coming back from Firestore must be escaped before rendering in the leaderboard list");
  assert.equal(result.xssDidNotFire, true, 'the escaped markup must never actually execute as HTML/JS');
  assert.deepEqual(pageErrors, []);
  await page.close();
});

test('Progression (Fas 27, step 1): every match earns points, Campaign stage/full clears earn more, and level tracks lifetime points via LEVEL_THRESHOLDS', async () => {
  const { page, pageErrors } = await newPage();
  const result = await page.evaluate(() => {
    const out = {};
    const win = () => { state.board = Array(9).fill({ card: HEROES[0], owner: 'blue' }); };
    const loss = () => { state.board = Array(9).fill({ card: HEROES[0], owner: 'red' }); state.board[0] = { card: HEROES[0], owner: 'blue' }; };

    // A regular (non-Campaign) win/loss.
    state.draftMode = 'random';
    state.selected = ['darien'];
    win();
    finishGame();
    out.afterRandomWin = playerProgress.points;

    loss();
    finishGame();
    out.afterRandomLoss = playerProgress.points;

    // A Campaign stage win, NOT the final stage -- stage bonus only, no
    // full-clear bonus, campaignClearedOnce stays false.
    campaignProgress = { stageIndex: 0, unlocked: [], ngPlus: 0 };
    state.draftMode = 'campaign';
    win();
    finishGame();
    out.afterCampaignStageWin = playerProgress.points;
    out.campaignClearedOnceAfterOneStage = playerProgress.campaignClearedOnce;
    out.stageIndexAfterOneStage = campaignProgress.stageIndex;

    // Clearing the FINAL stage -- stage bonus + the one-time 2000 bonus.
    campaignProgress = { stageIndex: CAMPAIGN_STAGES.length - 1, unlocked: [], ngPlus: 0 };
    win();
    finishGame();
    out.afterFullClear = playerProgress.points;
    out.campaignClearedOnceAfterFullClear = playerProgress.campaignClearedOnce;

    // A SECOND full clear (New Game+1) must award the stage bonus again
    // AND a bigger clear bonus (3000, not another flat 2000) -- per the
    // user's own request that clearing NG+1/+2/etc. earns progressively
    // more, not nothing beyond the very first clear.
    campaignProgress = { stageIndex: CAMPAIGN_STAGES.length - 1, unlocked: [], ngPlus: 1 };
    win();
    finishGame();
    out.afterSecondFullClear = playerProgress.points;

    // A THIRD full clear (New Game+2) scales again (4000).
    campaignProgress = { stageIndex: CAMPAIGN_STAGES.length - 1, unlocked: [], ngPlus: 2 };
    win();
    finishGame();
    out.afterThirdFullClear = playerProgress.points;

    // Level thresholds.
    playerProgress.lifetimePoints = 0;
    out.levelAtZero = playerLevel();
    playerProgress.lifetimePoints = 499;
    out.levelJustBelowThreshold = playerLevel();
    playerProgress.lifetimePoints = 500;
    out.levelAtThreshold = playerLevel();
    playerProgress.lifetimePoints = 999999;
    out.levelWayAboveMax = playerLevel();
    out.pointsToNextAtMax = pointsToNextLevel();

    return out;
  });
  assert.equal(result.afterRandomWin, 50, 'a Random/Choose Your Five win should award 50 points');
  assert.equal(result.afterRandomLoss, 60, 'a loss should still award something (10), just less than a win');
  assert.equal(result.afterCampaignStageWin, 160, 'a Campaign stage win awards 100, on top of the 60 already banked');
  assert.equal(result.campaignClearedOnceAfterOneStage, false, 'clearing one Campaign stage must not flag the whole Campaign as cleared');
  assert.equal(result.stageIndexAfterOneStage, 1, 'campaignProgress.stageIndex must still advance normally');
  assert.equal(result.afterFullClear, 160 + 100 + 2000, 'clearing the FINAL stage awards the stage bonus AND the first 2000 full-clear bonus');
  assert.equal(result.campaignClearedOnceAfterFullClear, true, 'campaignClearedOnce must flip true the first time the whole Campaign is cleared');
  assert.equal(result.afterSecondFullClear, 160 + 100 + 2000 + 100 + 3000, 'clearing New Game+1 must award the stage bonus AND a bigger clear bonus (3000, scaling with the NG+ cycle just finished)');
  assert.equal(result.afterThirdFullClear, 160 + 100 + 2000 + 100 + 3000 + 100 + 4000, 'clearing New Game+2 scales again to 4000');
  assert.equal(result.levelAtZero, 1);
  assert.equal(result.levelJustBelowThreshold, 1, '499 lifetime points must not yet reach Level 2 (threshold is exactly 500)');
  assert.equal(result.levelAtThreshold, 2, 'exactly 500 lifetime points must reach Level 2');
  assert.equal(result.levelWayAboveMax, 10, 'lifetime points far past the last threshold must cap at the max level (10), never overflow past it');
  assert.equal(result.pointsToNextAtMax, null, 'pointsToNextLevel() must return null at max level, not a nonsensical/negative number');
  assert.deepEqual(pageErrors, []);
  await page.close();
});

test('Progression (Fas 27, step 1): playerProgress persists across a fresh load and survives resetGame(), same as matchStats/campaignProgress', async () => {
  const { page, pageErrors } = await newPage();
  await page.evaluate(() => {
    awardPoints(750);
    playerProgress.campaignClearedOnce = true;
    savePlayerProgress();
  });
  await page.reload();
  await page.waitForFunction(() => typeof state !== 'undefined');
  const afterReload = await page.evaluate(() => ({ points: playerProgress.points, lifetimePoints: playerProgress.lifetimePoints, campaignClearedOnce: playerProgress.campaignClearedOnce, level: playerLevel() }));
  assert.equal(afterReload.points, 750, 'points must survive a full page reload, same persistence guarantee as matchStats/campaignProgress');
  assert.equal(afterReload.lifetimePoints, 750);
  assert.equal(afterReload.campaignClearedOnce, true);
  assert.equal(afterReload.level, 2);

  const afterReset = await page.evaluate(() => {
    resetGame();
    return { points: playerProgress.points, campaignClearedOnce: playerProgress.campaignClearedOnce };
  });
  assert.equal(afterReset.points, 750, 'resetGame() (a per-match reset) must never touch lifetime player progress');
  assert.equal(afterReset.campaignClearedOnce, true);
  assert.deepEqual(pageErrors, []);
  await page.close();
});

test('Progression (Fas 29, step 2): packs are locked until Campaign is cleared once, then gated per-tier by level and points, and respect the 10-copy cap', async () => {
  const { page, pageErrors } = await newPage();
  const result = await page.evaluate(() => {
    const out = {};
    const rare = PACK_TIERS.find(t => t.id === 'rare');
    const epic = PACK_TIERS.find(t => t.id === 'epic');

    // Locked entirely before Campaign is cleared, even with plenty of points/level.
    playerProgress = { points: 999999, lifetimePoints: 999999, earnedCards: {}, campaignClearedOnce: false };
    out.lockedDespiteMaxPointsAndLevel = canBuyPack(rare);

    // Cleared, but not enough points yet.
    playerProgress = { points: 100, lifetimePoints: 100, earnedCards: {}, campaignClearedOnce: true };
    out.tooFewPoints = canBuyPack(rare);

    // Enough points for Epic's cost, but level too low (Epic needs Level 3).
    playerProgress = { points: 10000, lifetimePoints: 100, earnedCards: {}, campaignClearedOnce: true };
    out.enoughPointsButLevelLocked = canBuyPack(epic);

    // Both satisfied (1500 lifetime points = Level 3, the exact gate Epic needs).
    playerProgress = { points: 10000, lifetimePoints: 1500, earnedCards: {}, campaignClearedOnce: true };
    out.bothSatisfied = canBuyPack(epic);
    out.levelForCheck = playerLevel();

    // buyPack deducts the exact cost and yields exactly tier.count cards.
    const before = playerProgress.points;
    buyPack('epic');
    out.pointsDeducted = before - playerProgress.points;
    out.drawnCount = state.packOpenResult.drawn.length;
    out.tierNameShown = state.packOpenResult.tierName;

    // buyPack refuses silently (no throw, no deduction) if canBuyPack is false.
    playerProgress = { points: 0, lifetimePoints: 0, earnedCards: {}, campaignClearedOnce: true };
    const pointsBeforeRefusedBuy = playerProgress.points;
    buyPack('mystic');
    out.refusedBuyDidNotThrow = true;
    out.refusedBuyDidNotDeduct = playerProgress.points === pointsBeforeRefusedBuy;
    out.refusedBuyLeftNoResult = state.packOpenResult === null || state.packOpenResult.tierId !== 'mystic';

    // The 10-copy cap: a card already at 10 must never exceed it, however
    // many packs get opened, but it still shows up in `drawn` (capped:true)
    // so the reveal UI can tell the player.
    const cardId = HEROES[0].id;
    playerProgress = { points: 1000000, lifetimePoints: 1000000, earnedCards: { [cardId]: 10 }, campaignClearedOnce: true };
    let sawCappedDraw = false;
    for(let i = 0; i < 30; i++){
      buyPack('mystic');
      if(state.packOpenResult.drawn.some(c => c.id === cardId && c.capped)) sawCappedDraw = true;
    }
    out.capNeverExceeded = playerProgress.earnedCards[cardId] === 10;
    out.cappedDrawWasFlagged = sawCappedDraw;

    return out;
  });
  assert.equal(result.lockedDespiteMaxPointsAndLevel, false, 'packs must stay locked until campaignClearedOnce is true, regardless of points/level');
  assert.equal(result.tooFewPoints, false);
  assert.equal(result.enoughPointsButLevelLocked, false, "Epic pack needs Level 3 even if the player can afford its point cost");
  assert.equal(result.levelForCheck, 3);
  assert.equal(result.bothSatisfied, true);
  assert.equal(result.pointsDeducted, 10000, "buyPack must deduct exactly the tier's cost");
  assert.equal(result.drawnCount, 10, 'a pack must draw exactly tier.count cards');
  assert.equal(result.tierNameShown, 'Epic Pack');
  assert.equal(result.refusedBuyDidNotThrow, true);
  assert.equal(result.refusedBuyDidNotDeduct, true, 'buyPack must be a no-op (not throw, not deduct) when canBuyPack is false');
  assert.equal(result.refusedBuyLeftNoResult, true);
  assert.equal(result.capNeverExceeded, true, 'a card already at the 10-copy cap must never exceed it no matter how many more packs are opened');
  assert.equal(result.cappedDrawWasFlagged, true, 'a draw of an already-capped card must still appear in the reveal, flagged as capped');
  assert.deepEqual(pageErrors, []);
  await page.close();
});

test('Progression (Fas 32, step 3): Rivals are locked until Campaign is cleared and until the player has 5 distinct earned cards, and beginRiskMatch wires a real battle correctly', async () => {
  const { page, pageErrors } = await newPage();
  const result = await page.evaluate(async () => {
    const out = {};

    // Locked before Campaign cleared, even with plenty of earned cards.
    playerProgress = { points: 0, lifetimePoints: 0, campaignClearedOnce: false, earnedCards: { gambler:1, vaelira:1, nyxara:1, seraphine:1, odin:1 }, opponentHeld: {} };
    out.lockedBeforeCampaign = canChallengeRivals();

    // Cleared, but fewer than 5 distinct earned cards.
    playerProgress = { points: 0, lifetimePoints: 0, campaignClearedOnce: true, earnedCards: { gambler:4 }, opponentHeld: {} };
    out.lockedTooFewDistinct = canChallengeRivals();

    // Cleared, 5 distinct earned cards -> unlocked.
    playerProgress = { points: 0, lifetimePoints: 0, campaignClearedOnce: true, earnedCards: { gambler:1, vaelira:1, nyxara:1, seraphine:1, odin:1 }, opponentHeld: {} };
    out.unlockedWithFive = canChallengeRivals();

    // beginRiskMatch wires up draftMode/selected/riskMatch and the
    // opponent's own fixed enemy hand once the coinflip settles.
    const prevDifficulty = state.aiDifficulty;
    beginRiskMatch('gambler-rival', ['gambler','vaelira','nyxara','seraphine','odin']);
    out.draftModeAfterBegin = state.draftMode;
    out.selectedAfterBegin = state.selected.slice().sort();
    out.riskMatchAfterBegin = { ...state.riskMatch };
    out.modalClosedAfterBegin = state.showRivals;

    await new Promise(r => setTimeout(r, 3000)); // coinflip -> battle transition
    out.phaseAfterCoinflip = state.phase;
    out.enemyHandIds = state.enemyHand.map(c => c.id);
    out.playerHandIdsSorted = state.playerHand.map(c => c.id).sort();

    return out;
  });
  assert.equal(result.lockedBeforeCampaign, false, 'Rivals must stay locked until campaignClearedOnce, regardless of earned cards');
  assert.equal(result.lockedTooFewDistinct, false, 'fewer than 5 DISTINCT earned card ids must not unlock Rivals, even with duplicates of one card');
  assert.equal(result.unlockedWithFive, true);
  assert.equal(result.draftModeAfterBegin, 'risk');
  assert.deepEqual(result.selectedAfterBegin, ['gambler','nyxara','odin','seraphine','vaelira']);
  assert.equal(result.riskMatchAfterBegin.opponentId, 'gambler-rival');
  assert.equal(result.riskMatchAfterBegin.rule, 'one', 'The Gambler is a ONE-rule opponent');
  assert.equal(result.modalClosedAfterBegin, false, 'beginRiskMatch must close the Rivals modal before starting the battle');
  assert.equal(result.phaseAfterCoinflip, 'battle');
  assert.deepEqual(result.enemyHandIds.slice().sort(), ['gambler','nyxara','odin','seraphine','vaelira'], "the opponent's hand must be their own fixed RISK_OPPONENTS.enemyIds, not a random draw");
  assert.deepEqual(result.playerHandIdsSorted, ['gambler','nyxara','odin','seraphine','vaelira'], "the player's hand must be exactly the 5 wagered cards");
  assert.deepEqual(pageErrors, []);
  await page.close();
});

test('Progression (Fas 32, step 3): resolveRiskMatch applies the ONE/ALL rule correctly on a loss, lets a win reclaim exactly one held card, and a draw changes nothing', async () => {
  const { page, pageErrors } = await newPage();
  const result = await page.evaluate(() => {
    const out = {};
    const wageredFive = ['gambler','vaelira','nyxara','seraphine','odin'];
    const winBoard = (winnerOwner) => new Array(9).fill(null).map((_, i) => ({ card: HEROES[0], owner: i < 6 ? winnerOwner : (winnerOwner === 'blue' ? 'red' : 'blue') }));

    // ONE rule loss: exactly one of the five wagered cards is removed.
    playerProgress = { points: 0, lifetimePoints: 0, campaignClearedOnce: true, earnedCards: { gambler:1, vaelira:1, nyxara:1, seraphine:1, odin:1 }, opponentHeld: {} };
    state.draftMode = 'risk';
    state.selected = wageredFive.slice();
    state.riskMatch = { opponentId: 'gambler-rival', rule: 'one', previousAiDifficulty: 'normal' };
    state.board = winBoard('red');
    finishGame();
    const totalRemaining = Object.values(playerProgress.earnedCards).reduce((a,b)=>a+b, 0);
    out.oneRuleRemainingCount = totalRemaining;
    out.oneRuleResultKind = state.riskResult && state.riskResult.kind;
    out.oneRuleHeldTotal = Object.values(playerProgress.opponentHeld['gambler-rival']).reduce((a,b)=>a+b, 0);
    out.riskMatchClearedAfterOne = state.riskMatch;

    // ALL rule loss: all five wagered cards are removed.
    playerProgress = { points: 0, lifetimePoints: 0, campaignClearedOnce: true, earnedCards: { gambler:1, vaelira:1, nyxara:1, seraphine:1, odin:1 }, opponentHeld: {} };
    state.draftMode = 'risk';
    state.selected = wageredFive.slice();
    state.riskMatch = { opponentId: 'tiamat-rival', rule: 'all', previousAiDifficulty: 'normal' };
    state.board = winBoard('red');
    finishGame();
    out.allRuleRemainingCount = Object.values(playerProgress.earnedCards).reduce((a,b)=>a+b, 0);
    out.allRuleHeldTotal = Object.values(playerProgress.opponentHeld['tiamat-rival']).reduce((a,b)=>a+b, 0);

    // A win reclaims exactly one held card, capped at EARNED_CARD_CAP.
    playerProgress = { points: 0, lifetimePoints: 0, campaignClearedOnce: true, earnedCards: { gambler:1, vaelira:1, nyxara:1, seraphine:1, odin:1 }, opponentHeld: { 'gambler-rival': { tiamat: 2 } } };
    state.draftMode = 'risk';
    state.selected = wageredFive.slice();
    state.riskMatch = { opponentId: 'gambler-rival', rule: 'one', previousAiDifficulty: 'normal' };
    state.board = winBoard('blue');
    finishGame();
    out.reclaimResultKind = state.riskResult && state.riskResult.kind;
    out.reclaimedTiamatCount = playerProgress.earnedCards.tiamat;
    out.heldTiamatAfterReclaim = playerProgress.opponentHeld['gambler-rival'].tiamat;

    // A win with nothing held: no reclaim, riskResult stays null.
    playerProgress = { points: 0, lifetimePoints: 0, campaignClearedOnce: true, earnedCards: { gambler:1, vaelira:1, nyxara:1, seraphine:1, odin:1 }, opponentHeld: {} };
    state.draftMode = 'risk';
    state.selected = wageredFive.slice();
    state.riskMatch = { opponentId: 'gambler-rival', rule: 'one', previousAiDifficulty: 'normal' };
    state.board = winBoard('blue');
    finishGame();
    out.winNothingHeldResult = state.riskResult;

    // A draw changes nothing at all.
    playerProgress = { points: 0, lifetimePoints: 0, campaignClearedOnce: true, earnedCards: { gambler:1, vaelira:1, nyxara:1, seraphine:1, odin:1 }, opponentHeld: {} };
    state.draftMode = 'risk';
    state.selected = wageredFive.slice();
    state.riskMatch = { opponentId: 'gambler-rival', rule: 'one', previousAiDifficulty: 'normal' };
    state.board = new Array(9).fill({ card: HEROES[0], owner: 'blue' }).map((c,i) => i < 5 ? c : null);
    // Force an actual tie board (equal counts) rather than relying on the half-filled one above.
    state.board = [
      { card: HEROES[0], owner: 'blue' }, { card: HEROES[0], owner: 'blue' }, { card: HEROES[0], owner: 'blue' }, { card: HEROES[0], owner: 'blue' },
      { card: HEROES[0], owner: 'red' }, { card: HEROES[0], owner: 'red' }, { card: HEROES[0], owner: 'red' }, { card: HEROES[0], owner: 'red' },
      null,
    ];
    const earnedCardsBeforeDraw = JSON.stringify(playerProgress.earnedCards);
    finishGame();
    out.drawWinner = state.winner;
    out.drawResult = state.riskResult;
    out.drawEarnedCardsUnchanged = JSON.stringify(playerProgress.earnedCards) === earnedCardsBeforeDraw;

    return out;
  });
  assert.equal(result.oneRuleRemainingCount, 4, 'ONE rule must remove exactly 1 of the 5 wagered cards on a loss');
  assert.equal(result.oneRuleResultKind, 'lost');
  assert.equal(result.oneRuleHeldTotal, 1, "the opponent's held pile must gain exactly the 1 card taken");
  assert.equal(result.riskMatchClearedAfterOne, null, 'state.riskMatch must be cleared after resolution, win or lose');
  assert.equal(result.allRuleRemainingCount, 0, 'ALL rule must remove every one of the 5 wagered cards on a loss');
  assert.equal(result.allRuleHeldTotal, 5, "the opponent's held pile must gain all 5 taken cards");
  assert.equal(result.reclaimResultKind, 'reclaimed');
  assert.equal(result.reclaimedTiamatCount, 1, 'a reclaim must add exactly 1 copy back to earnedCards (tiamat was not owned at all before the win)');
  assert.equal(result.heldTiamatAfterReclaim, 1, "the opponent's held count for the reclaimed card must drop by exactly 1");
  assert.equal(result.winNothingHeldResult, null, 'a win with nothing held must not fabricate a reclaim result');
  assert.equal(result.drawWinner, 'draw');
  assert.equal(result.drawResult, null, 'a draw must never trigger a risk win or loss outcome');
  assert.equal(result.drawEarnedCardsUnchanged, true, 'a draw must never touch earnedCards');
  assert.deepEqual(pageErrors, []);
  await page.close();
});

test('16-card audit items #15-16: Twin Brothers/Twin Sisters get onCaptureBuffSelfThisRound (folds Brotherly Might/Dual Strike and Synergy of Souls/Echoing Power into the one already-implemented mechanic) and a working Solar Tempest/Lunar Eclipse special (previously undefined in SPECIAL_HANDLERS, a silent no-op)', async () => {
  const { page, pageErrors } = await newPage();
  const result = await page.evaluate(`(async () => {
    ${freshEntrySnippet()}
    const out = {};

    // onCaptureBuffSelfThisRound:3 must actually fire on a real capture via
    // placeCard -- not just be present on the card data. Cell 5 is the EAST
    // neighbor of center cell 4, so Twin Brothers/Sisters' right side (8)
    // faces Ogre's left side (4) -- a clean directional win (their own top
    // (7) vs Ogre's bottom (8) would actually lose, so the neighbor cell
    // matters here, unlike the special's totalPower-based threshold below).
    state.board = Array(9).fill(null);
    state.wins = { blue: 0, red: 0 };
    state.specialUsed = {};
    const weak = findCardById('ogre'); // 8/5/8/4
    state.board[5] = freshEntry(weak, 'red');
    state.playerHand = [findCardById('twinbrothers')];
    placeCard(4, 'twinbrothers', 'blue');
    out.brothersCaptured = state.board[5].owner === 'blue';
    out.brothersSelfBuff = state.board[4].captureBonus;

    state.board = Array(9).fill(null);
    state.wins = { blue: 0, red: 0 };
    state.specialUsed = {};
    state.board[5] = freshEntry(weak, 'red');
    state.playerHand = [findCardById('twinsisters')];
    placeCard(4, 'twinsisters', 'blue');
    out.sistersCaptured = state.board[5].owner === 'blue';
    out.sistersSelfBuff = state.board[4].captureBonus;

    // Solar Tempest: was a total no-op before this fix (no SPECIAL_HANDLERS
    // entry at all -- runSpecialResolution's "if(!handler) return;" guard
    // meant selecting it did literally nothing). Success case: Twin
    // Brothers (total 30) +3 vs a weak target beats it outright.
    state.board = Array(9).fill(null);
    state.board[4] = freshEntry(findCardById('twinbrothers'), 'blue');
    state.board[7] = freshEntry(findCardById('twinsisters'), 'blue'); // on board -> should also get the team buff
    state.board[1] = freshEntry(weak, 'red');
    state.wins = { blue: 5, red: 5 };
    state.specialUsed = {};
    runSpecialResolution(4, 1, {});
    await new Promise(r => setTimeout(r, ULTIMATE_WINDUP_MS + ULTIMATE_HITSTOP_MS + 50));
    out.solarTempestFlipped = state.board[1].owner === 'blue';
    out.solarTempestSelfBuff = state.board[4].captureBonus;
    out.solarTempestPartnerBuff = state.board[7].captureBonus;
    out.solarTempestCostDeducted = state.wins.blue === 3;

    // Failure case: a target with total power high enough that +3 isn't
    // enough (Bahamut, total 38) must NOT flip and must NOT grant any buff.
    state.board = Array(9).fill(null);
    const src2 = freshEntry(findCardById('twinbrothers'), 'blue');
    state.board[4] = src2;
    state.board[1] = freshEntry(findCardById('bahamut'), 'red');
    state.wins = { blue: 5, red: 5 };
    state.specialUsed = {};
    runSpecialResolution(4, 1, {});
    await new Promise(r => setTimeout(r, ULTIMATE_WINDUP_MS + ULTIMATE_HITSTOP_MS + 50));
    out.solarTempestFailNotFlipped = state.board[1].owner === 'red';
    out.solarTempestFailNoBuff = src2.captureBonus === 0;

    // Lunar Eclipse (Twin Sisters' own special) mirrors the same success path.
    state.board = Array(9).fill(null);
    state.board[4] = freshEntry(findCardById('twinsisters'), 'blue');
    state.board[1] = freshEntry(weak, 'red');
    state.wins = { blue: 5, red: 5 };
    state.specialUsed = {};
    runSpecialResolution(4, 1, {});
    await new Promise(r => setTimeout(r, ULTIMATE_WINDUP_MS + ULTIMATE_HITSTOP_MS + 50));
    out.lunarEclipseFlipped = state.board[1].owner === 'blue';
    out.lunarEclipseSelfBuff = state.board[4].captureBonus;

    return out;
  })()`);
  assert.equal(result.brothersCaptured, true);
  assert.equal(result.brothersSelfBuff, 4, "onCaptureBuffSelfThisRound:3 (Brotherly Might's +1 folded with Dual Strike's +2) plus the pre-existing onCaptureBonus:1 (Fraternal Fury) must both fire on the same capture");
  assert.equal(result.sistersCaptured, true);
  assert.equal(result.sistersSelfBuff, 3, "same folded mechanic for Synergy of Souls + Echoing Power");
  assert.equal(result.solarTempestFlipped, true);
  assert.equal(result.solarTempestSelfBuff, 1, "Solar Tempest's own +1 all sides this round on the caster");
  assert.equal(result.solarTempestPartnerBuff, 1, "Solar Tempest also buffs Twin Sisters when she's on the board, per the card text");
  assert.equal(result.solarTempestCostDeducted, true);
  assert.equal(result.solarTempestFailNotFlipped, true, 'a target strong enough must not be flipped by Solar Tempest');
  assert.equal(result.solarTempestFailNoBuff, true, 'a failed Solar Tempest must not grant any buff');
  assert.equal(result.lunarEclipseFlipped, true);
  assert.equal(result.lunarEclipseSelfBuff, 1, "Lunar Eclipse's own +1 all sides this round on the caster");
  assert.deepEqual(pageErrors, []);
  await page.close();
});

test('Fas 35: Campaign extended from 17 to 20 stages — two new stages before the Sisters, and Triune Desire wired in as the new true finale', async () => {
  const { page, pageErrors } = await newPage();
  const result = await page.evaluate(`(() => {
    const out = {};
    out.totalStages = CAMPAIGN_STAGES.length;
    out.stageNames = CAMPAIGN_STAGES.slice(16).map(s => s.name);

    const finale = CAMPAIGN_STAGES[CAMPAIGN_STAGES.length - 1];
    out.finaleName = finale.name;
    out.finaleHasNoStatBoost = !finale.statBoost;
    out.finaleRosterHasTriuneDesire = finale.enemyIds.includes('triunedesire');
    // Deliberately only 2 of the 3 sisters, not all 3 -- see the stage's
    // own comment for why (avoids stacking every sisterAura/Sister's Bond
    // bonus AND all three board-wipe specials plus Triune Desire's own).
    const sisterCount = ['vaelira','seraphine','nyxara'].filter(id => finale.enemyIds.includes(id)).length;
    out.finaleHasExactlyTwoSisters = sisterCount === 2;
    out.finaleUnlocksTriuneDesire = finale.unlockIds.includes('triunedesire');

    // Triune Desire must actually be a real, fully-defined card on both
    // sides (HEROES so she's playable once unlocked, FOREST_FOES so
    // startBattle() can actually find her for the enemy hand).
    out.triuneDesireInHeroes = HEROES.some(h => h.id === 'triunedesire');
    out.triuneDesireInForestFoes = FOREST_FOES.some(f => f.id === 'triunedesire');

    // Wire-up: startBattle() must actually build the finale's enemy hand
    // with her included, not just have her sit in enemyIds unused.
    state.draftMode = 'campaign';
    campaignProgress = { stageIndex: CAMPAIGN_STAGES.length - 1, unlocked: [], ngPlus: 0 };
    state.selected = HEROES.slice(0, 5).map(h => h.id);
    startBattle();
    out.startBattleFieldsTriuneDesire = state.enemyHand.some(c => c.id === 'triunedesire');

    // The two new pre-finale stages (index 16-17) must have neither
    // pairPresence partner of a known bonded pair on the same roster --
    // the exact Fas 33 lesson about guaranteed-synergy-pair spikes.
    const KNOWN_PAIRS = [['darien','elara'],['sylvarion','zaevir'],['torn','vayra'],
      ['littlejesp','pallispell'],['twinbrothers','twinsisters'],
      ['eviltwistyang','eviltwistyin'],['aurelian','vorlix']];
    out.newStagesAvoidGuaranteedPairs = [16, 17].every(i => {
      const ids = CAMPAIGN_STAGES[i].enemyIds;
      return KNOWN_PAIRS.every(([a,b]) => !(ids.includes(a) && ids.includes(b)));
    });

    return out;
  })()`);
  assert.equal(result.totalStages, 20, 'Campaign must now have 20 stages, not 17');
  assert.deepEqual(result.stageNames, [
    'Sovereigns of the Deep',
    'The Silent Reckoning',
    'The Triple Triad Sisters',
    'The Forbidden Union',
  ]);
  assert.equal(result.finaleName, 'The Forbidden Union');
  assert.equal(result.finaleHasNoStatBoost, true, 'the true finale stays a difficulty/thematic peak, not a bigger-numbers one, same reasoning as the old Sisters finale');
  assert.equal(result.finaleRosterHasTriuneDesire, true);
  assert.equal(result.finaleHasExactlyTwoSisters, true, 'only 2 of 3 sisters -- fielding all 3 alongside Triune Desire would stack every sisterAura bonus and four separate board-wipe specials at once');
  assert.equal(result.finaleUnlocksTriuneDesire, true);
  assert.equal(result.triuneDesireInHeroes, true);
  assert.equal(result.triuneDesireInForestFoes, true);
  assert.equal(result.startBattleFieldsTriuneDesire, true, 'a real startBattle() call for the finale must actually include Triune Desire in the enemy hand');
  assert.equal(result.newStagesAvoidGuaranteedPairs, true);
  assert.deepEqual(pageErrors, []);
  await page.close();
});

test('Fas 36: My Bag — a read-only browsable view of playerProgress.earnedCards, since Rivals\' wager-picker only ever showed a capped 5-card SELECTION, never the full collection', async () => {
  const { page, pageErrors } = await newPage();
  const result = await page.evaluate(`(() => {
    const out = {};

    // Locked before the Campaign is cleared, same gating as Packs/Rivals.
    playerProgress.campaignClearedOnce = false;
    playerProgress.earnedCards = {};
    state.showBag = true;
    const lockedHtml = renderBagModal();
    out.lockedShowsGate = lockedHtml.includes('cleared the whole Campaign');

    // Empty (cleared, but nothing earned yet) shows a distinct empty state.
    playerProgress.campaignClearedOnce = true;
    const emptyHtml = renderBagModal();
    out.emptyShowsHint = emptyHtml.includes('bag is empty');

    // With cards earned: every id with count > 0 appears, sorted by count
    // descending, each with its own count badge; a stale 0-count entry
    // (e.g. every copy already lost to a Rival) must NOT appear.
    playerProgress.earnedCards = { ifrit: 10, bahamut: 3, sarah: 1, ysara: 0 };
    playerProgress.points = 4250;
    const html = renderBagModal();
    out.showsAllPositiveCounts = ['ifrit','bahamut','sarah'].every(id => html.includes(\`data-cardid="\${id}"\`));
    out.hidesZeroCount = !html.includes('data-cardid="ysara"');
    out.showsCountBadges = html.includes('>×10<') && html.includes('>×3<') && html.includes('>×1<');
    // Sorted by count descending: Ifrit (10) must appear before Bahamut (3) before Sarah (1).
    out.sortedByCountDesc = html.indexOf('data-cardid="ifrit"') < html.indexOf('data-cardid="bahamut"')
      && html.indexOf('data-cardid="bahamut"') < html.indexOf('data-cardid="sarah"');
    // "i väskan ska man se sina credits ... som guldmynt typ" -- points
    // balance shown as a gold-coin pill (.bag-wallet), always visible
    // whenever the bag is open, not gated behind having any cards.
    out.showsWallet = html.includes('bag-wallet') && html.includes('4,250') && html.includes('🪙');

    return out;
  })()`);
  assert.equal(result.lockedShowsGate, true);
  assert.equal(result.emptyShowsHint, true);
  assert.equal(result.showsAllPositiveCounts, true);
  assert.equal(result.hidesZeroCount, true, 'a card with 0 copies left (e.g. all lost to a Rival) must not show up in the bag');
  assert.equal(result.showsCountBadges, true);
  assert.equal(result.sortedByCountDesc, true);
  assert.equal(result.showsWallet, true, "the bag must show the player's points balance as a gold-coin badge");
  assert.deepEqual(pageErrors, []);
  await page.close();
});

test('Bug fix: the Sisters stage lore panel must not be crushed by flexbox when the page is taller than the viewport (a flex item with overflow != visible gets an automatic min-size of 0, so it was shrinking to ~34px and hiding all the story text but the first title)', async () => {
  const { page, pageErrors } = await newPage();
  await page.setViewportSize({ width: 1400, height: 1000 });
  const result = await page.evaluate(() => {
    state.draftMode = 'campaign';
    // The Sisters stage is index 18 (Fas 35 moved it from 16 to make room
    // for the two new pre-finale stages) -- find it by name rather than
    // hardcoding the index, so this test survives any future reordering.
    const stageIndex = CAMPAIGN_STAGES.findIndex(s => s.name === 'The Triple Triad Sisters');
    campaignProgress = { stageIndex, unlocked: [], ngPlus: 0 };
    state.showSisterLore = true;
    render();
    const panel = document.querySelector('.lore-panel');
    return {
      rendered: !!panel,
      contentHeight: panel.scrollHeight,
      visibleHeight: panel.getBoundingClientRect().height,
      flexShrink: getComputedStyle(panel).flexShrink,
    };
  });
  assert.equal(result.rendered, true);
  assert.ok(result.contentHeight > 420, 'sanity check: the real lore content must exceed the panel\'s own 420px max-height, or this test would pass even with the bug');
  assert.equal(result.flexShrink, '0', 'the panel must opt out of flex-shrink, or it gets crushed below its max-height when the page overflows the viewport');
  assert.ok(result.visibleHeight >= 400, `the panel must render near its intended 420px max-height, not get crushed (got ${result.visibleHeight}px)`);
  assert.deepEqual(pageErrors, []);
  await page.close();
});

test('Fas 38: pack-exclusive cards -- Dragon (dragonlancer) is a real, findable card that is NEVER draftable normally, only drawable via a Rare pack or a lucky Random Draft pull, with a working Piercing Lance/Onyx Momentum/Dragonfall Charge kit', async () => {
  const { page, pageErrors } = await newPage();
  const result = await page.evaluate(`(() => {
    ${freshEntrySnippet()}
    const out = {};

    // Never draftable normally.
    out.notInHeroes = !HEROES.some(h => h.id === 'dragonlancer');
    out.notInCampaignPool = !campaignPool().includes('dragonlancer');
    out.findableAnyway = findCardById('dragonlancer') !== null && findCardById('dragonlancer').name === 'Dragon';

    // Piercing Lance: ignores an active Shield on a NORMAL attack, and
    // Onyx Momentum grants +2 specifically because the target was
    // Shielded -- proven by a matchup that would otherwise LOSE without
    // the bonus (Dragon's right(9) vs Bahamut's left(10)).
    state.board = Array(9).fill(null);
    state.wins = { blue: 0, red: 0 };
    const dragon = findCardById('dragonlancer');
    state.board[4] = freshEntry(dragon, 'blue');
    state.board[5] = freshEntry(findCardById('bahamut'), 'red');
    const battleResult = { flipSeq:0, flips:0, shielded:0, bonusTriggered:false };
    battleNeighbors(4, 'blue', battleResult);
    out.ignoredShieldAndWon = state.board[5].owner === 'blue';
    out.notLoggedAsShieldedBlock = battleResult.shielded === 0;

    // buyPack: dragonlancer only ever appears in the 'rare' tier pool.
    playerProgress = { points: 100000, lifetimePoints:100000, earnedCards:{}, campaignClearedOnce:true, opponentHeld:{} };
    let sawInRare = false, sawInEpic = false;
    for(let i = 0; i < 150; i++){
      playerProgress.earnedCards = {}; playerProgress.points = 100000;
      buyPack('rare');
      if(playerProgress.earnedCards.dragonlancer) sawInRare = true;
    }
    for(let i = 0; i < 150; i++){
      playerProgress.earnedCards = {}; playerProgress.points = 100000;
      buyPack('epic');
      if(playerProgress.earnedCards.dragonlancer) sawInEpic = true;
    }
    out.drawableFromRarePack = sawInRare;
    out.neverFromOtherTiers = !sawInEpic;

    // drawRandomFive: a player who owns it has a real chance to draw it.
    playerProgress.earnedCards = { dragonlancer: 5 };
    let sawInRandomDraw = false;
    for(let i = 0; i < 300; i++){
      drawRandomFive();
      if(state.selected.includes('dragonlancer')){ sawInRandomDraw = true; break; }
    }
    out.drawableInRandomDraft = sawInRandomDraw;

    // A player who does NOT own it can never draw it randomly either.
    playerProgress.earnedCards = {};
    let everSawWithoutOwning = false;
    for(let i = 0; i < 200; i++){
      drawRandomFive();
      if(state.selected.includes('dragonlancer')) everSawWithoutOwning = true;
    }
    out.neverDrawnWithoutOwning = !everSawWithoutOwning;

    // Special Attack: Dragonfall Charge ignores Shield entirely, and only
    // rewards the permanent +2 when the target actually WAS Shielded.
    const weakShielded = { id:'test-shield', name:'TestShield', top:5,right:5,bottom:5,left:5, active:{shield:true} };
    const weakUnshielded = { id:'test-noshield', name:'TestNoShield', top:5,right:5,bottom:5,left:5 };

    state.board = Array(9).fill(null);
    const src1 = freshEntry(dragon, 'blue');
    state.board[4] = src1;
    state.board[1] = freshEntry(weakShielded, 'red');
    state.wins = { blue: 5, red: 5 }; state.specialUsed = {};
    SPECIAL_HANDLERS.dragonlancer({ srcEntry: src1, targetEntry: state.board[1], targetIndex: 1, owner: 'blue' });
    out.specialFlipsShielded = state.board[1].owner === 'blue';
    out.specialRewardsBonusVsShielded = src1.captureBonus === 2;

    state.board = Array(9).fill(null);
    const src2 = freshEntry(dragon, 'blue');
    state.board[4] = src2;
    state.board[1] = freshEntry(weakUnshielded, 'red');
    state.wins = { blue: 5, red: 5 }; state.specialUsed = {};
    SPECIAL_HANDLERS.dragonlancer({ srcEntry: src2, targetEntry: state.board[1], targetIndex: 1, owner: 'blue' });
    out.specialFlipsUnshielded = state.board[1].owner === 'blue';
    out.specialNoBonusVsUnshielded = src2.captureBonus === 0;

    return out;
  })()`);
  assert.equal(result.notInHeroes, true, 'Dragon must never be draftable in Campaign/Random Draft/Choose Your Five');
  assert.equal(result.notInCampaignPool, true);
  assert.equal(result.findableAnyway, true, 'findCardById must still resolve him for My Bag/Rivals/a real match');
  assert.equal(result.ignoredShieldAndWon, true, "Piercing Lance must let a normal attack ignore the target's Shield");
  assert.equal(result.notLoggedAsShieldedBlock, true);
  assert.equal(result.drawableFromRarePack, true);
  assert.equal(result.neverFromOtherTiers, true, 'Dragon must only ever come from the Rare tier, never Epic/Legendary/Mystic');
  assert.equal(result.drawableInRandomDraft, true, "an owned exclusive card must have a real chance to appear in a Random Draft hand");
  assert.equal(result.neverDrawnWithoutOwning, true, "a player who hasn't earned Dragon must never draw him randomly");
  assert.equal(result.specialFlipsShielded, true);
  assert.equal(result.specialRewardsBonusVsShielded, true);
  assert.equal(result.specialFlipsUnshielded, true);
  assert.equal(result.specialNoBonusVsUnshielded, true, 'the +2 reward must be conditional on the target having actually been Shielded');
  assert.deepEqual(pageErrors, []);
  await page.close();
});

test('Fas 39: second pack-exclusive card -- Reaper (reaperseraph), an Epic-tier AOE/comeback contrast to Dragon\'s single-target piercing kit', async () => {
  const { page, pageErrors } = await newPage();
  const result = await page.evaluate(`(() => {
    ${freshEntrySnippet()}
    const out = {};
    const reaper = findCardById('reaperseraph');
    out.findable = reaper !== null && reaper.name === 'Reaper';
    out.notInHeroes = !HEROES.some(h => h.id === 'reaperseraph');
    out.notInCampaignPool = !campaignPool().includes('reaperseraph');

    // Reaper's Toll: winning a battle debuffs every enemy orthogonally
    // adjacent to the CAPTURED cell, this round only.
    state.board = Array(9).fill(null);
    state.wins = { blue: 0, red: 0 };
    state.board[4] = freshEntry(reaper, 'blue');
    state.board[1] = freshEntry({ id:'weak1', name:'Weak1', top:1,right:1,bottom:1,left:1 }, 'red');
    state.board[0] = freshEntry({ id:'weak2', name:'Weak2', top:5,right:5,bottom:5,left:5 }, 'red');
    const battleResult = { flipSeq:0, flips:0, shielded:0, bonusTriggered:false };
    battleNeighbors(4, 'blue', battleResult);
    out.capturedAndDebuffedNeighbor = state.board[1].owner === 'blue' && state.board[0].captureBonus === -1;

    // Rising Vengeance: +2 attack ONLY while behind on board count --
    // hands populated (non-empty) so the unrelated lastStandBonus (which
    // also reads fullEffectiveValue) doesn't confound this isolated check.
    state.playerHand = [1,2]; state.enemyHand = [1,2];
    state.board = Array(9).fill(null);
    state.board[4] = freshEntry(reaper, 'blue');
    out.noBonusWhenEven = fullEffectiveValue(reaper, 'top', null, 4, 'blue', 'attack') - reaper.top === 0;
    state.board[0] = freshEntry({ id:'r1', name:'R1', top:1,right:1,bottom:1,left:1 }, 'red');
    state.board[2] = freshEntry({ id:'r2', name:'R2', top:1,right:1,bottom:1,left:1 }, 'red');
    state.board[6] = freshEntry({ id:'r3', name:'R3', top:1,right:1,bottom:1,left:1 }, 'red');
    out.bonusWhenUnderdog = fullEffectiveValue(reaper, 'top', null, 4, 'blue', 'attack') - reaper.top === 2;

    // Special Attack: Judgment Descent -- board-wide -2 this round, no
    // single target needed (special.targets:'aoe').
    state.board = Array(9).fill(null);
    const src = freshEntry(reaper, 'blue');
    state.board[4] = src;
    const e1 = freshEntry({ id:'e1', name:'E1', top:5,right:5,bottom:5,left:5 }, 'red');
    const e2 = freshEntry({ id:'e2', name:'E2', top:5,right:5,bottom:5,left:5 }, 'red');
    state.board[0] = e1; state.board[8] = e2;
    state.wins = { blue: 5, red: 5 }; state.specialUsed = {};
    SPECIAL_HANDLERS.reaperseraph({ srcEntry: src, owner: 'blue' });
    out.judgmentHitAllEnemies = e1.captureBonus === -2 && e2.captureBonus === -2;

    // buyPack: reaperseraph only ever comes from the Epic tier, never Rare
    // (where Dragon lives) or any other tier.
    playerProgress = { points: 100000, lifetimePoints:100000, earnedCards:{}, campaignClearedOnce:true, opponentHeld:{} };
    let sawInEpic = false, sawInRare = false;
    for(let i = 0; i < 150; i++){
      playerProgress.earnedCards = {}; playerProgress.points = 100000;
      buyPack('epic');
      if(playerProgress.earnedCards.reaperseraph) sawInEpic = true;
    }
    for(let i = 0; i < 150; i++){
      playerProgress.earnedCards = {}; playerProgress.points = 100000;
      buyPack('rare');
      if(playerProgress.earnedCards.reaperseraph) sawInRare = true;
    }
    out.drawableFromEpicPack = sawInEpic;
    out.neverFromRarePack = !sawInRare;

    return out;
  })()`);
  assert.equal(result.findable, true);
  assert.equal(result.notInHeroes, true, 'Reaper must never be draftable in Campaign/Random Draft/Choose Your Five');
  assert.equal(result.notInCampaignPool, true);
  assert.equal(result.capturedAndDebuffedNeighbor, true, "Reaper's Toll must debuff an adjacent enemy the moment he captures a card");
  assert.equal(result.noBonusWhenEven, true, 'Rising Vengeance must grant nothing when board counts are even');
  assert.equal(result.bonusWhenUnderdog, true, 'Rising Vengeance must grant +2 attack specifically while behind on board count');
  assert.equal(result.judgmentHitAllEnemies, true);
  assert.equal(result.drawableFromEpicPack, true);
  assert.equal(result.neverFromRarePack, true, "Reaper must only ever come from the Epic tier, never Rare (Dragon's tier) or any other");
  assert.deepEqual(pageErrors, []);
  await page.close();
});

test('Fas 40: third pack-exclusive card -- Freya (Legendary), a pure support kit contrasting Dragon/Reaper\'s offensive kits', async () => {
  const { page, pageErrors } = await newPage();
  const result = await page.evaluate(`(() => {
    ${freshEntrySnippet()}
    const out = {};
    const freya = findCardById('freya');
    out.findable = freya !== null && freya.name === 'Freya';
    out.notInHeroes = !HEROES.some(h => h.id === 'freya');
    out.notInCampaignPool = !campaignPool().includes('freya');

    state.playerHand = [1,2]; state.enemyHand = [1,2];

    // Blooming Touch: the just-captured card (now allied) permanently +1.
    state.board = Array(9).fill(null);
    state.wins = { blue: 0, red: 0 };
    state.board[4] = freshEntry(freya, 'blue');
    state.board[1] = freshEntry({ id:'weak1', name:'Weak1', top:1,right:1,bottom:1,left:1 }, 'red');
    const battleResult = { flipSeq:0, flips:0, shielded:0, bonusTriggered:false };
    battleNeighbors(4, 'blue', battleResult);
    out.capturedAndBloomed = state.board[1].owner === 'blue' && state.board[1].captureBonus === 1;

    // Grace of the Sanctuary: OTHER allies get +1, Freya herself does not,
    // and no aura at all when she isn't on the board.
    state.board = Array(9).fill(null);
    state.board[4] = freshEntry(freya, 'blue');
    const ally = { id:'ally1', name:'Ally1', top:5,right:5,bottom:5,left:5 };
    state.board[0] = freshEntry(ally, 'blue');
    out.allyGetsBonus = fullEffectiveValue(ally, 'top', null, 0, 'blue', 'attack') - ally.top === 1;
    out.freyaGetsNoSelfBonus = fullEffectiveValue(freya, 'top', null, 4, 'blue', 'attack') - freya.top === 0;
    state.board = Array(9).fill(null);
    state.board[0] = freshEntry(ally, 'blue');
    out.noAuraWithoutFreya = fullEffectiveValue(ally, 'top', null, 0, 'blue', 'attack') - ally.top === 0;

    // Special Attack: Sanctuary's Blessing buffs the whole side this round.
    state.board = Array(9).fill(null);
    const src = freshEntry(freya, 'blue');
    const a1 = freshEntry({ id:'a1', name:'A1', top:5,right:5,bottom:5,left:5 }, 'blue');
    state.board[4] = src; state.board[0] = a1;
    state.wins = { blue: 5, red: 5 };
    SPECIAL_HANDLERS.freya({ srcEntry: src, owner: 'blue' });
    out.blessingBuffedBoth = src.captureBonus === 2 && a1.captureBonus === 2;

    // buyPack: freya only from the Legendary tier.
    playerProgress = { points: 100000, lifetimePoints:100000, earnedCards:{}, campaignClearedOnce:true, opponentHeld:{} };
    let sawInLegendary = false, sawInEpic = false;
    for(let i = 0; i < 150; i++){
      playerProgress.earnedCards = {}; playerProgress.points = 100000;
      buyPack('legendary');
      if(playerProgress.earnedCards.freya) sawInLegendary = true;
    }
    for(let i = 0; i < 150; i++){
      playerProgress.earnedCards = {}; playerProgress.points = 100000;
      buyPack('epic');
      if(playerProgress.earnedCards.freya) sawInEpic = true;
    }
    out.drawableFromLegendaryPack = sawInLegendary;
    out.neverFromEpicPack = !sawInEpic;

    return out;
  })()`);
  assert.equal(result.findable, true);
  assert.equal(result.notInHeroes, true);
  assert.equal(result.notInCampaignPool, true);
  assert.equal(result.capturedAndBloomed, true, "Blooming Touch must permanently buff the just-captured card, not Freya herself");
  assert.equal(result.allyGetsBonus, true, "Grace of the Sanctuary must buff other allied cards");
  assert.equal(result.freyaGetsNoSelfBonus, true, "Freya's own aura must not buff herself");
  assert.equal(result.noAuraWithoutFreya, true, 'the aura must require Freya actually being on the board');
  assert.equal(result.blessingBuffedBoth, true);
  assert.equal(result.drawableFromLegendaryPack, true);
  assert.equal(result.neverFromEpicPack, true, "Freya must only ever come from the Legendary tier");
  assert.deepEqual(pageErrors, []);
  await page.close();
});

test('Fas 41: fourth pack-exclusive card -- Zidane (Mystic), a momentum/combo kit reusing existing onWinCappedBoost/adjacentAlliesBoost fields', async () => {
  const { page, pageErrors } = await newPage();
  const result = await page.evaluate(`(() => {
    ${freshEntrySnippet()}
    const out = {};
    const zidane = findCardById('zidane');
    out.findable = zidane !== null && zidane.name === 'Zidane';
    out.notInHeroes = !HEROES.some(h => h.id === 'zidane');
    out.notInCampaignPool = !campaignPool().includes('zidane');

    // Twin Blade Fury: +1 per win, capped at 3 -- proven by winning 4
    // separate battles and confirming the 4th grants no further stacking.
    state.board = Array(9).fill(null);
    state.wins = { blue: 0, red: 0 };
    const src = freshEntry(zidane, 'blue');
    state.board[4] = src;
    for(let i = 0; i < 4; i++){
      state.board[1] = freshEntry({ id:'w'+i, name:'W', top:1,right:1,bottom:1,left:1 }, 'red');
      battleNeighbors(4, 'blue', { flipSeq:0, flips:0, shielded:0, bonusTriggered:false });
    }
    out.cappedAtThree = src.captureBonus === 3;

    // Special Attack: Trance -- a pure +4 permanent self-buff, no target.
    state.board = Array(9).fill(null);
    const src2 = freshEntry(zidane, 'blue');
    state.board[4] = src2;
    state.wins = { blue: 5, red: 5 };
    SPECIAL_HANDLERS.zidane({ srcEntry: src2, owner: 'blue' });
    out.tranceBuff = src2.captureBonus === 4;

    // buyPack: mystic tier only.
    playerProgress = { points: 100000, lifetimePoints:100000, earnedCards:{}, campaignClearedOnce:true, opponentHeld:{} };
    let sawInMystic = false, sawInLegendary = false;
    for(let i = 0; i < 150; i++){
      playerProgress.earnedCards = {}; playerProgress.points = 100000;
      buyPack('mystic');
      if(playerProgress.earnedCards.zidane) sawInMystic = true;
    }
    for(let i = 0; i < 150; i++){
      playerProgress.earnedCards = {}; playerProgress.points = 100000;
      buyPack('legendary');
      if(playerProgress.earnedCards.zidane) sawInLegendary = true;
    }
    out.drawableFromMysticPack = sawInMystic;
    out.neverFromLegendaryPack = !sawInLegendary;

    return out;
  })()`);
  assert.equal(result.findable, true);
  assert.equal(result.notInHeroes, true);
  assert.equal(result.notInCampaignPool, true);
  assert.equal(result.cappedAtThree, true, "Twin Blade Fury must cap at +3, same stacking-cap shape as Vaelira's Crimson Surge");
  assert.equal(result.tranceBuff, true);
  assert.equal(result.drawableFromMysticPack, true);
  assert.equal(result.neverFromLegendaryPack, true, "Zidane must only ever come from the Mystic tier");
  assert.deepEqual(pageErrors, []);
  await page.close();
});
