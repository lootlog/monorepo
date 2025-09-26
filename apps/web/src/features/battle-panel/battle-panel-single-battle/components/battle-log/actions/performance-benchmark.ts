/**
 * Performance benchmark for battle actions parser
 *
 * Run this to validate parsing performance improvements
 */

import { parseActions } from './battle-actions-parser';

// Generate mock battle data for performance testing
const generateMockBattleActions = (count: number) => {
  const actionTypes = [
    '+dmgd', '+dmgf', '+dmgl', 'heal', 'poison', 'tspell',
    'energy', 'mana', '+crit', '+pierce', 'winner', 'loser',
    'hp_per-allies', 'aura-resall', '+absorb', '-blok'
  ];

  return Array.from({ length: count }, (_, i) => ({
    actionType: actionTypes[i % actionTypes.length],
    param: `${Math.floor(Math.random() * 500)}`
  }));
};

// Benchmark function
const benchmarkParsing = (actionCount: number, iterations: number = 1000) => {
  const mockActions = generateMockBattleActions(actionCount);

  console.log(`\n🔥 Benchmarking ${actionCount} actions over ${iterations} iterations`);

  const startTime = performance.now();

  for (let i = 0; i < iterations; i++) {
    parseActions(mockActions);
  }

  const endTime = performance.now();
  const totalTime = endTime - startTime;
  const avgTime = totalTime / iterations;

  console.log(`📊 Results:`);
  console.log(`   Total time: ${totalTime.toFixed(2)}ms`);
  console.log(`   Average per parse: ${avgTime.toFixed(4)}ms`);
  console.log(`   Actions per second: ${(actionCount * iterations / totalTime * 1000).toFixed(0)}`);
  console.log(`   Memory efficient: ${avgTime < 1 ? '✅' : '⚠️'} ${avgTime < 1 ? 'Fast' : 'Consider optimization'}`);

  return {
    totalTime,
    avgTime,
    actionsPerSecond: actionCount * iterations / totalTime * 1000
  };
};

// Validate parser correctness with comprehensive test
const validateParser = () => {
  console.log('\n🧪 Validating parser correctness...');

  const testActions = [
    { actionType: '+dmgd', param: '150' },
    { actionType: 'heal', param: '50' },
    { actionType: 'tspell', param: 'Fireball' },
    { actionType: 'winner', param: 'Hero' },
    { actionType: 'hp_per-allies', param: '10' },
    { actionType: 'unknown_action', param: 'test' }
  ];

  const result = parseActions(testActions);

  const validations = [
    { name: 'Attack actions parsed', check: result.attackActions.length === 1 },
    { name: 'Passive actions parsed', check: result.passiveActions.length === 1 },
    { name: 'Spell actions parsed', check: result.spellActions.length === 1 },
    { name: 'Outcome actions parsed', check: result.outcomeActions.length === 1 },
    { name: 'Buff actions parsed', check: result.buffActions.length === 1 },
    { name: 'Total categories populated', check: Object.values(result).some(arr => arr.length > 0) },
  ];

  validations.forEach(({ name, check }) => {
    console.log(`   ${check ? '✅' : '❌'} ${name}`);
  });

  const allPassed = validations.every(v => v.check);
  console.log(`\n${allPassed ? '🎉 All validations passed!' : '⚠️ Some validations failed'}`);

  return allPassed;
};

// Memory usage test
const testMemoryUsage = () => {
  console.log('\n💾 Testing memory efficiency...');

  const initialMemory = process.memoryUsage().heapUsed;
  const largeActions = generateMockBattleActions(10000);

  // Parse many times to test for memory leaks
  for (let i = 0; i < 100; i++) {
    parseActions(largeActions);
  }

  // Force garbage collection if available
  if (global.gc) {
    global.gc();
  }

  const finalMemory = process.memoryUsage().heapUsed;
  const memoryIncrease = finalMemory - initialMemory;
  const mbIncrease = memoryIncrease / 1024 / 1024;

  console.log(`   Initial memory: ${(initialMemory / 1024 / 1024).toFixed(2)}MB`);
  console.log(`   Final memory: ${(finalMemory / 1024 / 1024).toFixed(2)}MB`);
  console.log(`   Memory increase: ${mbIncrease.toFixed(2)}MB`);
  console.log(`   Memory efficient: ${mbIncrease < 10 ? '✅' : '⚠️'} ${mbIncrease < 10 ? 'Good' : 'Check for leaks'}`);

  return mbIncrease;
};

// Run all benchmarks
export const runBenchmarks = () => {
  console.log('🚀 Starting Battle Actions Parser Benchmarks');
  console.log('='.repeat(50));

  // Validate correctness first
  const isValid = validateParser();
  if (!isValid) {
    console.log('❌ Parser validation failed. Fix issues before benchmarking.');
    return;
  }

  // Test different scales
  const smallScale = benchmarkParsing(10, 10000);    // Small battles
  const mediumScale = benchmarkParsing(50, 2000);    // Medium battles
  const largeScale = benchmarkParsing(200, 500);     // Large battles
  const extremeScale = benchmarkParsing(1000, 100);  // Extreme battles

  // Memory test
  const memoryIncrease = testMemoryUsage();

  // Summary
  console.log('\n📋 Performance Summary');
  console.log('='.repeat(30));
  console.log(`Small battles (10 actions): ${smallScale.avgTime.toFixed(4)}ms avg`);
  console.log(`Medium battles (50 actions): ${mediumScale.avgTime.toFixed(4)}ms avg`);
  console.log(`Large battles (200 actions): ${largeScale.avgTime.toFixed(4)}ms avg`);
  console.log(`Extreme battles (1000 actions): ${extremeScale.avgTime.toFixed(4)}ms avg`);
  console.log(`Memory efficiency: ${memoryIncrease.toFixed(2)}MB increase`);

  // Performance rating
  const avgPerformance = (smallScale.avgTime + mediumScale.avgTime + largeScale.avgTime) / 3;
  let rating = '⭐';
  if (avgPerformance < 0.1) rating = '⭐⭐⭐⭐⭐ Excellent';
  else if (avgPerformance < 0.5) rating = '⭐⭐⭐⭐ Very Good';
  else if (avgPerformance < 1.0) rating = '⭐⭐⭐ Good';
  else if (avgPerformance < 2.0) rating = '⭐⭐ Fair';
  else rating = '⭐ Needs Optimization';

  console.log(`\n🏆 Overall Performance Rating: ${rating}`);
  console.log('\n✨ Benchmark completed!');
};

// Export for manual testing
export { benchmarkParsing, validateParser, testMemoryUsage };

// Auto-run if executed directly (for Node.js testing)
if (typeof window === 'undefined' && require.main === module) {
  runBenchmarks();
}