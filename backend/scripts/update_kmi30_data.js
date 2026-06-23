const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { getPSXHistory } = require('../src/services/stockService');

// Get the Python API URL from environment variables or use default
const PYTHON_API_URL = process.env.PYTHON_API_URL || "http://127.0.0.1:8001";

const KMI30_STOCKS = [
    'AIRLINK', 'ATRL', 'CNERGY', 'CPHL', 'DGKC', 'EFERT', 'ENGRO', 'FCCL', 'FFC', 'FFL',
    'GAL', 'GHNI', 'GLAXO', 'HUBC', 'IIL', 'ISL', 'LUCK', 'MLCF', 'MARI', 'MEBL',
    'NRL', 'OGDC', 'PPL', 'PRL', 'PSO', 'PAEL', 'SAZEW', 'SEARL', 'SNGP', 'SSGC', 'SYS',
    // --- Added blue-chips (20) ---
    'HBL', 'UBL', 'MCB', 'BAHL', 'BAFL', 'NBP', 'POL', 'APL', 'SHEL', 'INDU',
    'MTL', 'HCAR', 'NESTLE', 'COLG', 'NATF', 'EPCL', 'FATIMA', 'NML', 'ILP', 'KEL'
];

/**
 * Gets the last recorded date for a specific symbol from the Python API.
 * Returns null if no record found.
 */
async function getLastRecordedDateRemote(symbol) {
    try {
        const response = await axios.get(`${PYTHON_API_URL}/last-date/${symbol}`);
        const dateStr = response.data.last_date;
        return dateStr ? new Date(dateStr) : null;
    } catch (error) {
        console.error(`Error fetching last-date for ${symbol} from Python:`, error.message);
        return null; // Fallback to fetching full history or local logic if needed
    }
}

/**
 * Sends new stock records to the Python API.
 */
async function sendRecordsToPython(symbol, records) {
    try {
        const payload = {
            symbol: symbol,
            records: records.map(r => ({
                date: r.timestamp,
                open: r.open,
                high: r.high,
                low: r.low,
                close: r.close,
                volume: r.volume
            }))
        };
        const response = await axios.post(`${PYTHON_API_URL}/update-data`, payload);
        return response.data;
    } catch (error) {
        console.error(`Error sending data for ${symbol} to Python:`, error.response?.data || error.message);
        throw error;
    }
}

async function updateKMI30Data() {
    console.log(`Starting incremental update (API-based) for ${KMI30_STOCKS.length} stocks...`);
    console.log(`Python API Target: ${PYTHON_API_URL}`);

    for (const symbol of KMI30_STOCKS) {
        try {
            const lastDate = await getLastRecordedDateRemote(symbol);
            console.log(`\nSymbol: ${symbol} | Last Recorded on Python: ${lastDate ? lastDate.toISOString() : 'None'}`);

            const range = lastDate ? '1mo' : '3y';
            const data = await getPSXHistory(symbol, range, '1d');

            if (data && data.history && data.history.length > 0) {
                const newRecords = data.history.filter(row => {
                    const rowDate = new Date(row.timestamp);
                    return lastDate ? rowDate > lastDate : true;
                });

                if (newRecords.length > 0) {
                    console.log(`Found ${newRecords.length} new records for ${symbol}. Sending to Python...`);
                    
                    const result = await sendRecordsToPython(symbol, newRecords);
                    console.log(`Successfully updated ${symbol} on Python side:`, result.message);
                } else {
                    console.log(`No new data found for ${symbol}.`);
                }
            } else {
                console.warn(`No history returned for ${symbol}.`);
            }
        } catch (error) {
            console.error(`Error updating ${symbol}:`, error.message);
        }

        // Delay to avoid Yahoo Finance rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log('\nIncremental update via API complete.');
}

updateKMI30Data();
