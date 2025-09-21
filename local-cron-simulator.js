#!/usr/bin/env node

/**
 * Simulatore locale del cron job Vercel
 * Esegue il polling dei feed ogni minuto come in produzione
 */

const http = require('http');

const POLLING_INTERVAL = 60 * 1000; // 1 minuto
const API_URL = 'http://localhost:3000/api/cron/poll-feeds';

let pollCount = 0;

async function makeRequest() {
  return new Promise((resolve, reject) => {
    const req = http.request(API_URL, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Local-Cron-Simulator/1.0'
      }
    }, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          resolve(result);
        } catch (error) {
          reject(new Error(`Invalid JSON response: ${data}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.setTimeout(30000, () => {
      req.destroy();
      reject(new Error('Request timeout after 30 seconds'));
    });

    req.end();
  });
}

async function executePoll() {
  pollCount++;
  const timestamp = new Date().toISOString();

  console.log(`\n🔄 [${timestamp}] Poll #${pollCount} - Checking feeds...`);

  try {
    const result = await makeRequest();

    if (result.success) {
      const { results } = result;
      console.log(`✅ Poll completed successfully:`);
      console.log(`   📊 Sources: ${results.totalSources}`);
      console.log(`   ✅ Successful: ${results.successfulPolls}`);
      console.log(`   ❌ Failed: ${results.failedPolls}`);
      console.log(`   🆕 New items: ${results.newItemsFound}`);
      console.log(`   🔄 Duplicates: ${results.duplicatesSkipped || 0}`);
      console.log(`   ⏱️  Duration: ${results.duration}ms`);

      if (results.errors && results.errors.length > 0) {
        console.log(`   ⚠️  Errors: ${results.errors.join(', ')}`);
      }

      if (results.newItemsFound > 0) {
        console.log(`\n🎉 NEW ARTICLES DETECTED! ${results.newItemsFound} new items found!`);
      }
    } else {
      console.log(`❌ Poll failed: ${result.error}`);
    }

  } catch (error) {
    console.log(`💥 Poll error: ${error.message}`);
  }
}

function startCronSimulator() {
  console.log('🚀 Starting Local Cron Simulator for AutoGeorge');
  console.log(`⏰ Polling interval: ${POLLING_INTERVAL / 1000} seconds`);
  console.log(`🎯 Target URL: ${API_URL}`);
  console.log(`📅 Started at: ${new Date().toISOString()}`);
  console.log('\n' + '='.repeat(50));

  // Esegui immediatamente il primo poll
  executePoll();

  // Poi ogni minuto
  const interval = setInterval(executePoll, POLLING_INTERVAL);

  // Gestione graceful shutdown
  process.on('SIGINT', () => {
    console.log(`\n\n🛑 Stopping Local Cron Simulator...`);
    console.log(`📊 Total polls executed: ${pollCount}`);
    console.log(`⏰ Stopped at: ${new Date().toISOString()}`);
    clearInterval(interval);
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    console.log(`\n\n🛑 Received SIGTERM, stopping gracefully...`);
    clearInterval(interval);
    process.exit(0);
  });
}

// Verifica che il server locale sia raggiungibile prima di iniziare
async function checkServerHealth() {
  try {
    console.log('🔍 Checking if local server is running...');
    await makeRequest();
    console.log('✅ Local server is responsive\n');
    return true;
  } catch (error) {
    console.log(`❌ Local server not reachable: ${error.message}`);
    console.log('💡 Make sure "npm run dev" is running in another terminal');
    return false;
  }
}

// Main execution
async function main() {
  const isServerRunning = await checkServerHealth();

  if (isServerRunning) {
    startCronSimulator();
  } else {
    process.exit(1);
  }
}

main();