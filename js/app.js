// app.js

document.addEventListener('DOMContentLoaded', () => {
    let etfData = [];
    let selectedEtf1 = null;
    let selectedEtf2 = null;

    // DOM Elements
    const etf1Input = document.getElementById('etf1-input');
    const etf2Input = document.getElementById('etf2-input');
    const etf1Results = document.getElementById('etf1-results');
    const etf2Results = document.getElementById('etf2-results');
    const resultsSection = document.getElementById('results-section');

    // Overlap Metrics Elements
    // Overlap Metrics Elements
    const overlapPercentageSpan = document.getElementById('overlap-percentage');
    const holdingsBody = document.getElementById('holdings-body');
    const circle1 = document.getElementById('circle1');
    const circle2 = document.getElementById('circle2');

    // Load Data
    // Using window.etfDataset loaded from script tag to avoid local fetch issues
    if (window.etfDataset) {
        etfData = window.etfDataset;
        console.log('Loaded ' + etfData.length + ' ETFs from global scope');
    } else {
        console.error('ETF Data not found in global scope. Check if etfs.js is loaded.');
    }

    // Event Listeners for Search
    etf1Input.addEventListener('input', (e) => handleSearch(e.target.value, 1));
    etf2Input.addEventListener('input', (e) => handleSearch(e.target.value, 2));

    // Handle Search Logic
    function handleSearch(query, etfIndex) {
        const resultsContainer = etfIndex === 1 ? etf1Results : etf2Results;
        resultsContainer.innerHTML = '';

        if (!query) {
            resultsContainer.classList.add('hidden');
            return;
        }

        const filtered = etfData.filter(etf =>
            etf.ticker.toLowerCase().includes(query.toLowerCase()) ||
            etf.name.toLowerCase().includes(query.toLowerCase())
        );

        if (filtered.length > 0) {
            resultsContainer.classList.remove('hidden');
            filtered.forEach(etf => {
                const div = document.createElement('div');
                div.className = 'search-result-item';
                div.innerHTML = `<strong>${etf.ticker}</strong> - ${etf.name}`;
                div.addEventListener('click', () => selectEtf(etf, etfIndex));
                resultsContainer.appendChild(div);
            });
        } else {
            resultsContainer.classList.add('hidden');
        }
    }

    // Handle Selection
    function selectEtf(etf, etfIndex) {
        if (etfIndex === 1) {
            selectedEtf1 = etf;
            etf1Input.value = `${etf.ticker} - ${etf.name}`;
            etf1Results.classList.add('hidden');
        } else {
            selectedEtf2 = etf;
            etf2Input.value = `${etf.ticker} - ${etf.name}`;
            etf2Results.classList.add('hidden');
        }

        if (selectedEtf1 && selectedEtf2) {
            calculateOverlap();
        }
    }

    // Core Overlap Logic
    function calculateOverlap() {
        resultsSection.classList.remove('hidden');

        const holdings1 = selectedEtf1.holdings;
        const holdings2 = selectedEtf2.holdings;

        let overlapWeight = 0;
        let commonCount = 0;
        const overlappingHoldings = [];

        // Map for O(1) lookup
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

        // Sort by overlap weight descending
        overlappingHoldings.sort((a, b) => b.overlap - a.overlap);

        updateUI(overlapWeight, commonCount, overlappingHoldings);
    }

    // Update UI Elements
    function updateUI(overlapWeight, commonCount, holdings) {
        // Round to 2 decimals
        const weightPct = overlapWeight.toFixed(2) + '%';

        overlapPercentageSpan.textContent = weightPct;

        // Update Table Headers with Tickers
        const th1 = document.getElementById('th-etf1');
        const th2 = document.getElementById('th-etf2');
        if (th1) th1.textContent = selectedEtf1.ticker + ' Weight';
        if (th2) th2.textContent = selectedEtf2.ticker + ' Weight';

        // Populate Table
        holdingsBody.innerHTML = '';
        if (holdings.length === 0) {
            holdingsBody.innerHTML = '<tr><td colspan="3" style="text-align:center; padding: 20px;">No overlapping holdings found in top positions.</td></tr>';
        } else {
            holdings.forEach(h => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>
                        <div style="font-weight:600">${h.ticker}</div>
                        <div style="font-size:12px; color:#86868b">${h.name}</div>
                    </td>
                    <td>${h.weight1.toFixed(2)}%</td>
                    <td>${h.weight2.toFixed(2)}%</td>
                `;
                holdingsBody.appendChild(tr);
            });
        }

        // Update New Financial Metrics (Including Common Holdings)
        updateFinancialMetrics(selectedEtf1, selectedEtf2, commonCount);

        // Update Sector Drift (New)
        if (typeof updateSectorDrift === 'function') {
            updateSectorDrift(selectedEtf1, selectedEtf2);
        }

        // Update Breakdowns
        updateBreakdownChart('sector-breakdown', selectedEtf1.sectors, selectedEtf2.sectors);
        updateBreakdownChart('country-breakdown', selectedEtf1.countries, selectedEtf2.countries);
    }

    function updateFinancialMetrics(etf1, etf2, commonCount) {
        const grid = document.getElementById('key-metrics-grid');

        const metrics = [
            { label: 'Common Holdings', val1: commonCount, val2: '(Count)', isSingle: true }, // Special case
            { label: 'Expense Ratio (TER)', val1: etf1.ter ? etf1.ter + '%' : 'N/A', val2: etf2.ter ? etf2.ter + '%' : 'N/A' },
            { label: 'Distribution Policy', val1: etf1.policy || 'N/A', val2: etf2.policy || 'N/A' },
            { label: 'Fund Size (AUM)', val1: etf1.aum || 'N/A', val2: etf2.aum || 'N/A' },
            { label: 'Replication', val1: etf1.replication || 'N/A', val2: etf2.replication || 'N/A' },
            { label: 'ISIN', val1: etf1.isin || 'N/A', val2: etf2.isin || 'N/A' }
        ];

        grid.innerHTML = metrics.map(m => {
            if (m.isSingle) {
                return `
                    <div class="metric-comparison-card featured-metric">
                        <div class="metric-label">${m.label}</div>
                        <div class="metric-values vertical-stack">
                            <span class="val-single" style="font-size:24px; color:var(--text-primary); background:none;">${m.val1}</span>
                        </div>
                    </div>
                `;
            }
            return `
            <div class="metric-comparison-card">
                <div class="metric-label">${m.label}</div>
                <div class="metric-values vertical-stack">
                    <span class="val-1">${m.val1}</span>
                    <span class="val-2">${m.val2}</span>
                </div>
            </div>
        `}).join('');
    }

    function updateBreakdownChart(containerId, data1, data2) {
        const container = document.getElementById(containerId);
        container.innerHTML = '';

        // Merge keys from both datasets
        const keys = new Set([...Object.keys(data1 || {}), ...Object.keys(data2 || {})]);

        // Convert to array and sort by average weight descending for better visualization
        const sortedKeys = Array.from(keys).sort((a, b) => {
            const avgA = ((data1?.[a] || 0) + (data2?.[a] || 0)) / 2;
            const avgB = ((data1?.[b] || 0) + (data2?.[b] || 0)) / 2;
            return avgB - avgA;
        });

        // Limit to top 5 categories to avoid clutter
        const topKeys = sortedKeys.slice(0, 5);

        topKeys.forEach(key => {
            const val1 = data1?.[key] || 0;
            const val2 = data2?.[key] || 0;

            const row = document.createElement('div');
            row.className = 'breakdown-row';
            row.innerHTML = `
                <div class="breakdown-label">
                    <span>${key}</span>
                </div>
                <div class="bar-visual-row">
                    <span style="color:var(--bar-1-color); width: 40px; text-align:right;">${val1.toFixed(1)}%</span>
                    <div class="bar-bg">
                        <div class="bar-fill fill-1" style="width: ${Math.min(val1, 100)}%"></div>
                    </div>
                </div>
                <div class="bar-visual-row">
                    <span style="color:var(--bar-2-color); width: 40px; text-align:right;">${val2.toFixed(1)}%</span>
                    <div class="bar-bg">
                        <div class="bar-fill fill-2" style="width: ${Math.min(val2, 100)}%"></div>
                    </div>
                </div>
            `;
            container.appendChild(row);
        });
    }
    // New Function for Sector Drift
    function updateSectorDrift(etf1, etf2) {
        const container = document.getElementById('sector-drift-chart');
        if (!container) return;
        container.innerHTML = '';

        const sectors1 = etf1.sectors || {};
        const sectors2 = etf2.sectors || {};

        // Get all unique sectors
        const allSectors = new Set([...Object.keys(sectors1), ...Object.keys(sectors2)]);

        // Calculate drift (Difference: ETF1 - ETF2)
        const drifts = Array.from(allSectors).map(sector => {
            const w1 = sectors1[sector] || 0;
            const w2 = sectors2[sector] || 0;
            return {
                sector: sector,
                diff: w1 - w2,
                w1: w1,
                w2: w2
            };
        }).filter(d => Math.abs(d.diff) > 0.1) // Filter out tiny differences
            .sort((a, b) => b.diff - a.diff); // Sort by positive to negative drift

        // Render Bars
        drifts.forEach(d => {
            const isPositive = d.diff >= 0;
            const color = isPositive ? 'var(--bar-1-color)' : 'var(--bar-2-color)';

            // Amplified Visualization: Cap at 20% diff for full width
            const MAX_SCALE = 20;
            let widthPct = (Math.abs(d.diff) / MAX_SCALE) * 100;
            if (widthPct > 100) widthPct = 100;
            // Minimum visual width (5%) so small drifts are visible
            if (widthPct < 5) widthPct = 5;

            const row = document.createElement('div');
            row.className = 'drift-row';

            row.innerHTML = `
                <div class="drift-label" title="${d.sector}">${d.sector}</div>
                <div class="drift-visual">
                    <div class="drift-left">
                        ${!isPositive ? `<div class="drift-bar negative" style="width: ${widthPct}%"></div>` : ''}
                    </div>
                    <div class="drift-center-line"></div>
                    <div class="drift-right">
                        ${isPositive ? `<div class="drift-bar positive" style="width: ${widthPct}%"></div>` : ''}
                    </div>
                </div>
                <div class="drift-value" style="color: ${color}">
                    ${d.diff > 0 ? '+' : ''}${d.diff.toFixed(1)}%
                </div>
            `;
            container.appendChild(row);
        });

        if (drifts.length === 0) {
            container.innerHTML = '<div style="text-align:center; color:var(--text-secondary); padding:20px;">No significant sector drift found.</div>';
        }
    }
});
