#!/usr/bin/env tsx

import fs from 'fs';
import path from 'path';
import axios from 'axios';

const BASE_URL = 'http://localhost:5000';
const OUTPUT_DIR = path.join(process.cwd(), 'docs');
const TRACE_LOG_FILE = path.join(process.cwd(), 'logs', 'restaurant-audit.jsonl');

// Known Badiali identifiers from the contamination issue
const BADIALI_PLACE_ID = 'ChIJuQdEYaE1K4gRSb-QHzZpGss';
const BADIALI_RESTAURANT_ID = 26; // From search results

async function fetchWithCookies(url: string, options: any = {}) {
  const sessionCookie = 'connect.sid=s%3AvQNsCEyQ8MktsswAJvjwdpmA6ci_QxNH.chpXz1SpP99lA9ko%2FjCJ3XxRQsGoxweXX6E0BNzwnHM';
  
  return axios({
    ...options,
    url,
    headers: {
      ...options.headers,
      'Cookie': sessionCookie,
    },
    timeout: 10000,
  });
}

async function probeBadiali() {
  console.log('🔍 Probing Badiali for cross-contamination...');
  
  // Clear existing trace log
  if (fs.existsSync(TRACE_LOG_FILE)) {
    fs.writeFileSync(TRACE_LOG_FILE, '');
  }
  
  const results = {
    timestamp: new Date().toISOString(),
    placeIdPath: {
      url: '',
      response: null as any,
      traces: [] as any[],
      errors: [] as string[]
    },
    restaurantIdPath: {
      url: '',
      response: null as any,
      traces: [] as any[],
      errors: [] as string[]
    },
    ratingsData: {
      data: [] as any[],
      containsTestData: false,
      crossContamination: false,
      traces: [] as any[]
    },
    circleScoreData: {
      score: null as any,
      cacheKey: '',
      traces: [] as any[]
    }
  };
  
  try {
    // Test 1: Load via Google Place ID (search → detail handoff)
    console.log('Testing Place ID path...');
    const tracePos1 = getTraceLogPosition();
    
    try {
      results.placeIdPath.url = `/api/restaurants?googlePlaceId=${BADIALI_PLACE_ID}`;
      const response1 = await fetchWithCookies(`${BASE_URL}${results.placeIdPath.url}`);
      results.placeIdPath.response = response1.data;
      results.placeIdPath.traces = getTracesAfterPosition(tracePos1);
    } catch (error) {
      results.placeIdPath.errors.push(error instanceof Error ? error.message : 'Unknown error');
    }
    
    // Test 2: Load via Restaurant ID (direct access)
    console.log('Testing Restaurant ID path...');
    const tracePos2 = getTraceLogPosition();
    
    try {
      results.restaurantIdPath.url = `/api/restaurants/${BADIALI_RESTAURANT_ID}`;
      const response2 = await fetchWithCookies(`${BASE_URL}${results.restaurantIdPath.url}`);
      results.restaurantIdPath.response = response2.data;
      results.restaurantIdPath.traces = getTracesAfterPosition(tracePos2);
    } catch (error) {
      results.restaurantIdPath.errors.push(error instanceof Error ? error.message : 'Unknown error');
    }
    
    // Test 3: Fetch ratings for this restaurant
    console.log('Testing ratings data...');
    const tracePos3 = getTraceLogPosition();
    
    try {
      const ratingsResponse = await fetchWithCookies(`${BASE_URL}/api/ratings/restaurant/${BADIALI_PLACE_ID}?type=google_place`);
      results.ratingsData.data = Array.isArray(ratingsResponse.data) ? ratingsResponse.data : [ratingsResponse.data];
      results.ratingsData.traces = getTracesAfterPosition(tracePos3);
      
      // Check for test data contamination
      for (const rating of results.ratingsData.data) {
        if (rating.note?.includes('Universal system test') || rating.restaurant_name === 'Villa di Roma') {
          results.ratingsData.containsTestData = true;
        }
        
        // Check for cross-contamination (different restaurant names with same place ID)
        if (rating.restaurant_name && rating.restaurant_name !== 'Pizzeria Badiali') {
          results.ratingsData.crossContamination = true;
        }
      }
    } catch (error) {
      results.ratingsData.traces = getTracesAfterPosition(tracePos3);
    }
    
    // Test 4: Fetch Circle Score
    console.log('Testing Circle Score...');
    const tracePos4 = getTraceLogPosition();
    
    try {
      const circleScoreResponse = await fetchWithCookies(`${BASE_URL}/api/restaurant/${BADIALI_RESTAURANT_ID}/circle-score`);
      results.circleScoreData.score = circleScoreResponse.data;
      results.circleScoreData.cacheKey = `circleScore:${BADIALI_RESTAURANT_ID}`;
      results.circleScoreData.traces = getTracesAfterPosition(tracePos4);
    } catch (error) {
      results.circleScoreData.traces = getTracesAfterPosition(tracePos4);
    }
    
    // Generate report
    await generateProbeReport(results);
    
    console.log('✅ Badiali probe complete');
    console.log(`📄 Report: ${OUTPUT_DIR}/PROBE_BADIALI.md`);
    
  } catch (error) {
    console.error('❌ Probe failed:', error);
    process.exit(1);
  }
}

function getTraceLogPosition(): number {
  try {
    if (!fs.existsSync(TRACE_LOG_FILE)) {
      return 0;
    }
    const stats = fs.statSync(TRACE_LOG_FILE);
    return stats.size;
  } catch {
    return 0;
  }
}

function getTracesAfterPosition(position: number): any[] {
  try {
    if (!fs.existsSync(TRACE_LOG_FILE)) {
      return [];
    }
    
    const content = fs.readFileSync(TRACE_LOG_FILE, 'utf-8');
    const newContent = content.slice(position);
    
    return newContent
      .split('\n')
      .filter(line => line.trim())
      .map(line => {
        try {
          return JSON.parse(line);
        } catch {
          return null;
        }
      })
      .filter(Boolean);
  } catch {
    return [];
  }
}

async function generateProbeReport(results: any) {
  const report = `# Badiali Cross-Contamination Probe Report

**Generated:** ${results.timestamp}  
**Target:** Pizzeria Badiali  
**Google Place ID:** \`${BADIALI_PLACE_ID}\`  
**Restaurant ID:** ${BADIALI_RESTAURANT_ID}

## Test Results

### 1. Place ID Access Path
**URL:** \`${results.placeIdPath.url}\`  
**Status:** ${results.placeIdPath.errors.length === 0 ? '✅ Success' : '❌ Failed'}  
**Errors:** ${results.placeIdPath.errors.length > 0 ? results.placeIdPath.errors.join(', ') : 'None'}

**Response Data:**
\`\`\`json
${JSON.stringify(results.placeIdPath.response, null, 2)}
\`\`\`

**Trace Analysis:**
- **Requests Made:** ${results.placeIdPath.traces.length}
- **Identity Resolution:** ${results.placeIdPath.traces.some((t: any) => t.op === 'identity.resolve') ? '✅ Used' : '❌ Not used'}
- **Notes:** ${results.placeIdPath.traces.filter((t: any) => t.note).map((t: any) => t.note).join(', ') || 'None'}

### 2. Restaurant ID Access Path
**URL:** \`${results.restaurantIdPath.url}\`  
**Status:** ${results.restaurantIdPath.errors.length === 0 ? '✅ Success' : '❌ Failed'}  
**Errors:** ${results.restaurantIdPath.errors.length > 0 ? results.restaurantIdPath.errors.join(', ') : 'None'}

**Response Data:**
\`\`\`json
${JSON.stringify(results.restaurantIdPath.response, null, 2)}
\`\`\`

**Trace Analysis:**
- **Requests Made:** ${results.restaurantIdPath.traces.length}
- **Direct DB Access:** ${results.restaurantIdPath.traces.some((t: any) => t.source === 'db') ? '✅ Yes' : '❌ No'}

### 3. Ratings Data Analysis
**Status:** ${results.ratingsData.data.length > 0 ? '✅ Data Found' : '❌ No Data'}  
**Test Data Contamination:** ${results.ratingsData.containsTestData ? '❌ FOUND' : '✅ Clean'}  
**Cross-Contamination:** ${results.ratingsData.crossContamination ? '❌ FOUND' : '✅ Clean'}

**Rating Records:**
${results.ratingsData.data.map((rating: any, index: number) => `
**Rating ${index + 1}:**
- **Restaurant Name:** ${rating.restaurant_name || 'N/A'}
- **Note:** ${rating.note || 'N/A'}
- **Is Test:** ${rating.is_test || false}
- **Rating Value:** ${rating.ratingValue || 'N/A'}
`).join('')}

**Trace Analysis:**
- **Requests Made:** ${results.ratingsData.traces.length}
- **Mismatches Detected:** ${results.ratingsData.traces.filter((t: any) => t.note.includes('MISMATCH')).length}

### 4. Circle Score Consistency
**Status:** ${results.circleScoreData.score ? '✅ Retrieved' : '❌ Failed'}  
**Cache Key:** \`${results.circleScoreData.cacheKey}\`

**Score Data:**
\`\`\`json
${JSON.stringify(results.circleScoreData.score, null, 2)}
\`\`\`

**Trace Analysis:**
- **Requests Made:** ${results.circleScoreData.traces.length}
- **Cache Used:** ${results.circleScoreData.traces.some((t: any) => t.cacheHit) ? '✅ Yes' : '❌ No'}
- **Inconsistencies:** ${results.circleScoreData.traces.filter((t: any) => t.note.includes('INCONSISTENT')).length}

## Key Findings

### Data Integrity
${results.ratingsData.containsTestData ? 
  '⚠️ **Test data contamination detected** - Villa di Roma test data still appears in Badiali results' :
  '✅ **No test data contamination** - Production queries are clean'
}

${results.ratingsData.crossContamination ?
  '⚠️ **Cross-restaurant contamination detected** - Multiple restaurant names share the same Google Place ID' :
  '✅ **No cross-contamination** - Only Badiali data returned for Badiali requests'
}

### Identity Resolution
${results.placeIdPath.traces.some((t: any) => t.op === 'identity.resolve') ?
  '✅ **Identity resolution active** - Google Place ID properly mapped to restaurant ID' :
  '⚠️ **No identity resolution** - Missing canonical identity mapping'
}

### Circle Score
${results.circleScoreData.traces.filter((t: any) => t.note.includes('INCONSISTENT')).length === 0 ?
  '✅ **Circle Score consistent** - No inconsistencies detected' :
  '⚠️ **Circle Score inconsistent** - Multiple values detected for same restaurant'
}

## Trace Log Details

**Full Trace File:** \`${TRACE_LOG_FILE}\`

**All Traces:**
\`\`\`json
${JSON.stringify([
  ...results.placeIdPath.traces,
  ...results.restaurantIdPath.traces,
  ...results.ratingsData.traces,
  ...results.circleScoreData.traces
], null, 2)}
\`\`\`

## Recommendations

${results.ratingsData.containsTestData || results.ratingsData.crossContamination ?
  '1. **CRITICAL:** Fix data contamination before production deployment' :
  '1. **Data Quality:** ✅ Ready for production'
}

2. **Identity System:** ${results.placeIdPath.traces.some((t: any) => t.op === 'identity.resolve') ? 
  'Working correctly' : 
  'Implement identity resolution service'
}

3. **Circle Score:** ${results.circleScoreData.traces.filter((t: any) => t.note.includes('INCONSISTENT')).length === 0 ?
  'Working consistently' :
  'Unify Circle Score endpoints and cache keys'
}
`;

  fs.writeFileSync(path.join(OUTPUT_DIR, 'PROBE_BADIALI.md'), report);
}

// Ensure output directory exists
fs.mkdirSync(OUTPUT_DIR, { recursive: true });

// Run the probe
probeBadiali().catch(console.error);