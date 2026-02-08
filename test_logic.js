const fs = require('fs');
const path = require('path');

// Load Data
const dataPath = path.join(__dirname, 'data', 'etfs.json');
const rawData = fs.readFileSync(dataPath, 'utf8');
const etfData = JSON.parse(rawData);

console.log(`Loaded ${etfData.length} ETFs.`);

// Mock Selection
const etf1 = etfData.find(e => e.ticker === 'VWCE');
const etf2 = etfData.find(e => e.ticker === 'SWDA');

if (!etf1 || !etf2) {
    console.error('Could not find VWCE or SWDA for testing.');
    process.exit(1);
}

console.log(`Testing overlap between ${etf1.ticker} and ${etf2.ticker}...`);

// Overlap Logic (Replicated from app.js)
const holdings1 = etf1.holdings;
const holdings2 = etf2.holdings;

let overlapWeight = 0;
let commonCount = 0;
const overlappingHoldings = [];

const map2 = new Map(holdings2.map(h => [h.ticker, h]));

holdings1.forEach(h1 => {
    if (map2.has(h1.ticker)) {
        const h2 = map2.get(h1.ticker);
        const weightOverlap = Math.min(h1.weight, h2.weight);

        overlapWeight += weightOverlap;
        commonCount++;

        overlappingHoldings.push({
            ticker: h1.ticker,
            name: h1.name,
            weight1: h1.weight,
            weight2: h2.weight,
            overlap: weightOverlap
        });
    }
});

overlappingHoldings.sort((a, b) => b.overlap - a.overlap);

// Assertions
console.log(`Overlap Weight: ${overlapWeight.toFixed(2)}%`);
console.log(`Common Holdings: ${commonCount}`);
console.log('Top Overlapping Holding:', overlappingHoldings[0]);

if (overlapWeight > 0 && commonCount > 0) {
    console.log('SUCCESS: Overlap detected correctly.');
} else {
    console.error('FAILURE: No overlap detected between valid ETFs.');
    process.exit(1);
}

// Check for disjoint ETFs
const gold = etfData.find(e => e.ticker === 'SGLD');
if (gold) {
    console.log(`\nTesting disjoint overlap between ${etf1.ticker} and ${gold.ticker}...`);
    // Logic again for disjoint
    let disjointOverlap = 0;
    const mapGold = new Map(gold.holdings.map(h => [h.ticker, h]));
    holdings1.forEach(h1 => {
        if (mapGold.has(h1.ticker)) {
            disjointOverlap += Math.min(h1.weight, mapGold.get(h1.ticker).weight);
        }
    });

    console.log(`Disjoint Overlap Weight: ${disjointOverlap.toFixed(2)}%`);
    if (disjointOverlap === 0) {
        console.log('SUCCESS: Correctly detected 0% overlap for disjoint assets.');
    } else {
        console.error('FAILURE: Detected overlap where there should be none.');
    }
}
