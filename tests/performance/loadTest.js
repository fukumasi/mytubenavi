const axios = require('axios');
const { performance } = require('perf_hooks');

const BASE_URL = 'http://localhost:5000'; // アプリケーションのベースURL
const NUM_REQUESTS = 50; // リクエスト数
const DELAY_BETWEEN_REQUESTS = 1000; // リクエスト間の遅延（ミリ秒）
const MAX_RETRIES = 3; // 最大リトライ回数
const INITIAL_BACKOFF = 2000; // 初期バックオフ時間（ミリ秒）

let CONCURRENT_USERS = 1; // 同時ユーザー数（変更可能）

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function makeRequest(endpoint) {
  const url = new URL(endpoint, BASE_URL).toString();
  let retries = 0;
  while (retries < MAX_RETRIES) {
    try {
      const startTime = performance.now();
      const response = await axios.get(url, { timeout: 10000 }); // 10秒のタイムアウトを設定
      const endTime = performance.now();
      const responseTime = endTime - startTime;
      console.log(`Successful request to ${url}: ${responseTime.toFixed(2)}ms`);
      return { responseTime, status: response.status, data: response.data };
    } catch (error) {
      console.error(`Error making request to ${url}:`, error.message);
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);
      } else if (error.request) {
        console.error('No response received. Error details:', error.request);
      } else {
        console.error('Error details:', error);
      }
      retries++;
      if (retries >= MAX_RETRIES) {
        console.error(`Max retries reached for ${url}`);
        return { error: error.message, status: error.response?.status };
      }
      const delay = INITIAL_BACKOFF * Math.pow(2, retries - 1);
      console.log(`Retrying in ${delay}ms...`);
      await sleep(delay);
    }
  }
}

async function runLoadTest() {
  const endpoints = [
    '/api/search?q=test',
    '/api/videos/dQw4w9WgXcQ',
    '/api/videos/dQw4w9WgXcQ/related',
    '/api/featured-videos'
  ];

  const results = {};

  for (const endpoint of endpoints) {
    const responseTimes = [];
    const statusCodes = {};
    const errors = [];
    const promises = [];

    console.log(`Testing endpoint: ${endpoint}`);

    const startTime = performance.now();

    for (let i = 0; i < NUM_REQUESTS; i++) {
      if (promises.length >= CONCURRENT_USERS) {
        await Promise.race(promises);
        promises.splice(promises.indexOf(Promise.resolve()), 1);
      }

      const promise = makeRequest(endpoint).then(async result => {
        if (result.responseTime) {
          responseTimes.push(result.responseTime);
          statusCodes[result.status] = (statusCodes[result.status] || 0) + 1;
        } else if (result.error) {
          errors.push(result.error);
          statusCodes[result.status] = (statusCodes[result.status] || 0) + 1;
        }
        await sleep(DELAY_BETWEEN_REQUESTS);
      });

      promises.push(promise);
    }

    await Promise.all(promises);

    const endTime = performance.now();
    const totalTime = endTime - startTime;

    if (responseTimes.length > 0) {
      const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
      const maxResponseTime = Math.max(...responseTimes);
      const minResponseTime = Math.min(...responseTimes);
      const p95ResponseTime = responseTimes.sort((a, b) => a - b)[Math.floor(responseTimes.length * 0.95)];

      results[endpoint] = {
        avgResponseTime: avgResponseTime.toFixed(2),
        maxResponseTime: maxResponseTime.toFixed(2),
        minResponseTime: minResponseTime.toFixed(2),
        p95ResponseTime: p95ResponseTime.toFixed(2),
        successRate: ((responseTimes.length / NUM_REQUESTS) * 100).toFixed(2),
        totalTime: totalTime.toFixed(2),
        requestsPerSecond: ((NUM_REQUESTS / totalTime) * 1000).toFixed(2),
        statusCodes,
        errors: errors.length > 0 ? errors : undefined
      };
    } else {
      results[endpoint] = {
        error: 'All requests failed',
        totalTime: totalTime.toFixed(2),
        statusCodes,
        errors
      };
    }
  }

  console.log('Load test results:');
  console.log(JSON.stringify(results, null, 2));
  return results;
}

async function runLoadTestWithGradualIncrease() {
  const userCounts = [1, 5, 10, 20, 50]; // ユーザー数を増やしました
  const allResults = {};
  
  for (const userCount of userCounts) {
    console.log(`\nRunning load test with ${userCount} concurrent users:`);
    CONCURRENT_USERS = userCount;
    const results = await runLoadTest();
    allResults[userCount] = results;
    await sleep(10000); // テスト間の休憩
  }

  console.log('\nSummary of all tests:');
  console.log(JSON.stringify(allResults, null, 2));

  // 結果の分析
  analyzeResults(allResults);
}

function analyzeResults(allResults) {
  const endpoints = Object.keys(allResults[1]);
  
  endpoints.forEach(endpoint => {
    console.log(`\nAnalysis for endpoint: ${endpoint}`);
    const endpointData = Object.entries(allResults).map(([userCount, results]) => ({
      userCount: parseInt(userCount),
      avgResponseTime: parseFloat(results[endpoint].avgResponseTime),
      successRate: parseFloat(results[endpoint].successRate),
      requestsPerSecond: parseFloat(results[endpoint].requestsPerSecond)
    }));

    // レスポンスタイムの増加率を計算
    const responseTimeIncreaseRate = endpointData.reduce((acc, curr, index, array) => {
      if (index === 0) return acc;
      const prevAvg = array[index - 1].avgResponseTime;
      const increaseRate = ((curr.avgResponseTime - prevAvg) / prevAvg) * 100;
      acc.push({ userCount: curr.userCount, increaseRate });
      return acc;
    }, []);

    console.log('Response time increase rate:');
    console.log(responseTimeIncreaseRate);

    // 成功率の変化を分析
    const successRateChanges = endpointData.reduce((acc, curr, index, array) => {
      if (index === 0) return acc;
      const prevRate = array[index - 1].successRate;
      const change = curr.successRate - prevRate;
      acc.push({ userCount: curr.userCount, change });
      return acc;
    }, []);

    console.log('Success rate changes:');
    console.log(successRateChanges);
    // スケーラビリティの評価
    const scalabilityScore = responseTimeIncreaseRate.reduce((acc, curr) => {
      return acc + (curr.increaseRate < 20 ? 1 : 0);  // 20%未満の増加を良好とする
    }, 0) / (responseTimeIncreaseRate.length);

    console.log(`Scalability score (0-1): ${scalabilityScore.toFixed(2)}`);

    // 警告の表示
    if (scalabilityScore < 0.5) {
      console.warn(`Warning: The endpoint ${endpoint} may have scalability issues.`);
    }

    // エラー率の計算
    const errorRates = endpointData.map(data => ({
      userCount: data.userCount,
      errorRate: 100 - data.successRate
    }));

    console.log('Error rates:');
    console.log(errorRates);

    // 高いエラー率の警告
    errorRates.forEach(rate => {
      if (rate.errorRate > 5) {  // 5%以上のエラー率を警告とする
        console.warn(`Warning: High error rate (${rate.errorRate.toFixed(2)}%) for ${rate.userCount} users on endpoint ${endpoint}`);
      }
    });

    // スループットの分析
    const throughputChanges = endpointData.reduce((acc, curr, index, array) => {
      if (index === 0) return acc;
      const prevThroughput = array[index - 1].requestsPerSecond;
      const change = ((curr.requestsPerSecond - prevThroughput) / prevThroughput) * 100;
      acc.push({ userCount: curr.userCount, change });
      return acc;
    }, []);

    console.log('Throughput changes (%):');
    console.log(throughputChanges);

    // スループットの低下警告
    throughputChanges.forEach(change => {
      if (change.change < -10) {  // 10%以上のスループット低下を警告とする
        console.warn(`Warning: Significant throughput decrease (${change.change.toFixed(2)}%) for ${change.userCount} users on endpoint ${endpoint}`);
      }
    });
  });
}

runLoadTestWithGradualIncrease().catch(error => {
  console.error('Load test failed:', error);
  process.exit(1);
});