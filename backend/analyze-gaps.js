const fs = require('fs');
const data = JSON.parse(fs.readFileSync('test-results.json', 'utf8'));

console.log('\n=== Test Results Summary ===');
console.log(`Total Problems: ${data.totalProblems}`);
console.log(`Optimal Rate: ${data.correctDiscards}`);
console.log(`Avg Gap: ${data.scoreStats.avgGap}`);
console.log(`Max Gap: ${data.scoreStats.maxGap}`);

console.log('\n=== Cases with Large Gaps (>300) ===\n');
const large = data.examples.filter(e => e.gap > 300).slice(0, 15);
large.forEach(e => {
  console.log(`Problem ${e.number}: Gap ${e.gap}`);
  console.log(`  Discarded: ${e.discardTile} | Best: ${e.bestTile}`);
  console.log(`  Hand: [${e.hand.slice(0, 7).join(', ')}...]`);
  console.log('');
});

console.log('\n=== Gap Distribution ===');
const gaps = data.examples.map(e => e.gap);
console.log(`Below 50: ${gaps.filter(g => g < 50).length}`);
console.log(`50-100: ${gaps.filter(g => g >= 50 && g < 100).length}`);
console.log(`100-200: ${gaps.filter(g => g >= 100 && g < 200).length}`);
console.log(`200-300: ${gaps.filter(g => g >= 200 && g < 300).length}`);
console.log(`300+: ${gaps.filter(g => g >= 300).length}`);
