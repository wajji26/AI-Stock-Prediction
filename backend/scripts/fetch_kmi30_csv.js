const fs = require('fs');
const path = require('path');
const { getPSXHistory } = require('../src/services/stockService');

const KMI30_STOCKS = [
    'AIRLINK', 'ATRL', 'CNERGY', 'CPHL', 'DGKC', 'EFERT', 'ENGRO', 'FCCL', 'FFC', 'FFL',
    'GAL', 'GHNI', 'GLAXO', 'HUBC', 'IIL', 'ISL', 'LUCK', 'MLCF', 'MARI', 'MEBL',
    'NRL', 'OGDC', 'PPL', 'PRL', 'PSO', 'PAEL', 'SAZEW', 'SEARL', 'SNGP', 'SSGC', 'SYS'
];

async function fetchAndSaveKMI30Data() {
    const csvHeader = 'Date,Symbol,Open,High,Low,Close,Volume\n';
    const masterFilePath = path.join(__dirname, '../data/kmi30_stocks_history.csv');
    const individualFilesDir = path.join(__dirname, '../data/kmi30');
    
    // Attempt to clear the master file and write header
    try {
        fs.writeFileSync(masterFilePath, csvHeader);
    } catch (e) {
        console.warn(`Warning: Could not open master file ${masterFilePath}. It might be locked. Proceeding with individual files anyway.`);
    }

    console.log(`Starting data extraction for ${KMI30_STOCKS.length} stocks...`);

    for (const symbol of KMI30_STOCKS) {
        try {
            console.log(`Fetching data for ${symbol}...`);
            const data = await getPSXHistory(symbol, 'max', '1d');
            
            if (data && data.history && data.history.length > 0) {
                const csvRows = data.history.map(row => {
                    return `${row.timestamp},${symbol},${row.open},${row.high},${row.low},${row.close},${row.volume}`;
                }).join('\n');
                
                // Append to master file
                try {
                    fs.appendFileSync(masterFilePath, csvRows + '\n');
                } catch (e) {
                    // Silently ignore master file failures if it's locked
                }

                // Save to individual file
                const individualFilePath = path.join(individualFilesDir, `${symbol}.csv`);
                fs.writeFileSync(individualFilePath, csvHeader + csvRows + '\n');

                console.log(`Successfully saved ${data.history.length} rows for ${symbol} (Master + Individual).`);
            } else {
                console.warn(`No history found for ${symbol}.`);
            }
        } catch (error) {
            console.error(`Error fetching data for ${symbol}:`, error.message);
        }
        
        // Add a small delay to avoid hitting rate limits if any
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log(`Finished data extraction. Master file: ${masterFilePath}`);
    console.log(`Individual files saved in: ${individualFilesDir}`);
}

fetchAndSaveKMI30Data();
