// Strip emojis from game files, preserving card suits and dice used for gameplay.
// SAFE VERSION: only removes emoji chars + collapses resulting multiple spaces.
// Does NOT touch attribute-level whitespace.
const fs = require('fs');
const path = require('path');

// Keep these Unicode characters (they're gameplay-critical, not branding emoji)
const KEEP = new Set([
  '♠','♥','♦','♣',         // card suits
  '⚀','⚁','⚂','⚃','⚄','⚅', // dice faces
  '♔','♕','♖','♗','♘','♙', // chess white
  '♚','♛','♜','♝','♞','♟', // chess black
]);

// Emoji regex — broad coverage
const EMOJI_RE = /[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}\u{2300}-\u{23FF}\u{2B00}-\u{2BFF}\u{3030}\u{303D}\u{3297}\u{3299}\uFE0F\u200D]/gu;

function stripEmoji(text) {
  // 1. Remove emoji chars but keep gameplay symbols
  let out = text.replace(EMOJI_RE, (m) => KEEP.has(m) ? m : '');
  // 2. Clean up double spaces that ONLY result from mid-string emoji removal.
  //    We only collapse runs of spaces that are > 2 consecutive, preserving indentation.
  //    Also collapse "emoji + space" -> "" pattern: something like "( icon)" -> "(icon)"
  //    More conservative: only fix triple+ space and space-before-closing-paren/quote inside strings.
  // Safe fix: collapse 3+ spaces to 1 (indentation rarely has 3+ sequential spaces on same line beyond known patterns, but this is risky in CSS/code).
  // Even safer: leave whitespace alone. Users can manually clean up any " " stray.
  return out;
}

const gameDir = path.join(__dirname, '..', 'game');
const files = fs.readdirSync(gameDir).filter(f => /\.(jsx|html)$/.test(f));

let totalReplaced = 0;
for (const f of files) {
  const p = path.join(gameDir, f);
  const before = fs.readFileSync(p, 'utf-8');
  const after = stripEmoji(before);
  if (before !== after) {
    fs.writeFileSync(p, after);
    const beforeCount = (before.match(EMOJI_RE) || []).filter(c => !KEEP.has(c)).length;
    const afterCount = (after.match(EMOJI_RE) || []).filter(c => !KEEP.has(c)).length;
    console.log(`${f}: ${beforeCount} -> ${afterCount} emoji`);
    totalReplaced += beforeCount - afterCount;
  }
}

// Also strip game-api/worker.js
const workerPath = path.join(__dirname, '..', 'game-api', 'worker.js');
if (fs.existsSync(workerPath)) {
  const before = fs.readFileSync(workerPath, 'utf-8');
  const after = stripEmoji(before);
  if (before !== after) {
    fs.writeFileSync(workerPath, after);
    console.log('game-api/worker.js: stripped');
  }
}

console.log(`\nTotal emojis stripped: ${totalReplaced}`);
