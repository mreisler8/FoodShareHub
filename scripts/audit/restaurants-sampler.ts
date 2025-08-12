#!/usr/bin/env tsx

import fs from 'fs';
import path from 'path';
import axios from 'axios';

const BASE_URL = 'http://localhost:5000';
const OUTPUT_DIR = path.join(process.cwd(), 'docs');
const TRACE_LOG_FILE = path.join(process.cwd(), 'logs', 'restaurant-audit.jsonl');

interface TraceLog {
  t: "trace";
  timestamp: string;
  path: string;
  method: string;
  rid: number | null;
  placeId: string | null;
  userId: number | null;
  op: string;
  cacheHit: boolean | null;
  source: string;
  ms: number;
  note: string;
}

interface RestaurantSample {
  id: string;
  name: string;
  googlePlaceId?: string;
  resolvedRestaurantId?: number;
  ratingsMismatch: boolean;
  circleScoreInconsistencies: number;
  requestCount: number;
  errors: string[];
}

async function fetchWithCookies(url: string, options: any = {}) {
  // Use session cookie from authenticated user (user ID 7)
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

async function sampleRestaurants() {
  console.log('🔍 Starting restaurant sampling audit...');
  
  // Clear existing trace log
  if (fs.existsSync(TRACE_LOG_FILE)) {
    fs.writeFileSync(TRACE_LOG_FILE, '');
  }
  
  const samples: RestaurantSample[] = [];
  const csvRows: string[] = ['id,name,googlePlaceId,resolvedRestaurantId,ratingsMismatch,circleScoreInconsistencies,requestCount,errors'];
  
  try {
    // Fetch sample restaurants from search
    console.log('Fetching restaurants from search...');
    const searchQueries = ['pizza', 'sushi', 'restaurant', 'cafe', 'italian'];
    
    for (const query of searchQueries) {
      try {
        const response = await fetchWithCookies(`${BASE_URL}/api/search/unified?q=${query}&limit=20`);
        const restaurants = response.data.restaurants || [];
        
        for (const restaurant of restaurants.slice(0, 5)) { // Limit to 5 per query
          const sample = await analyzeRestaurant(restaurant);
          samples.push(sample);
          
          // Convert to CSV row
          const csvRow = [
            sample.id,
            `"${sample.name.replace(/"/g, '""')}"`,
            sample.googlePlaceId || '',
            sample.resolvedRestaurantId || '',
            sample.ratingsMismatch,
            sample.circleScoreInconsistencies,
            sample.requestCount,
            `"${sample.errors.join('; ').replace(/"/g, '""')}"`
          ].join(',');
          
          csvRows.push(csvRow);
        }
      } catch (error) {
        console.warn(`Search failed for query "${query}":`, error instanceof Error ? error.message : error);
      }
    }
    
    // Generate reports
    await generateMarkdownReport(samples);
    await generateCsvReport(csvRows);
    
    console.log(`✅ Audit complete. Analyzed ${samples.length} restaurants.`);
    console.log(`📄 Reports generated in ${OUTPUT_DIR}/`);
    
  } catch (error) {
    console.error('❌ Audit failed:', error);
    process.exit(1);
  }
}

async function analyzeRestaurant(restaurant: any): Promise<RestaurantSample> {
  const sample: RestaurantSample = {
    id: restaurant.id || restaurant.googlePlaceId || 'unknown',
    name: restaurant.name || 'Unknown',
    googlePlaceId: restaurant.metadata?.googlePlaceId || restaurant.googlePlaceId,
    ratingsMismatch: false,
    circleScoreInconsistencies: 0,
    requestCount: 0,
    errors: []
  };
  
  console.log(`Analyzing: ${sample.name} (${sample.id})`);
  
  try {
    // Clear trace log for this restaurant
    const traceStartPosition = getTraceLogPosition();
    
    // Test restaurant detail page via Google Place ID if available
    if (sample.googlePlaceId) {
      try {
        const response = await fetchWithCookies(`${BASE_URL}/api/restaurants?googlePlaceId=${sample.googlePlaceId}`);
        sample.resolvedRestaurantId = response.data?.id;
      } catch (error) {
        sample.errors.push(`Detail fetch failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
    
    // Test ratings endpoint
    if (sample.resolvedRestaurantId) {
      try {
        await fetchWithCookies(`${BASE_URL}/api/ratings/restaurant/${sample.resolvedRestaurantId}`);
      } catch (error) {
        sample.errors.push(`Ratings fetch failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
    
    // Test circle score endpoints
    if (sample.resolvedRestaurantId) {
      try {
        await fetchWithCookies(`${BASE_URL}/api/restaurant/${sample.resolvedRestaurantId}/circle-score`);
      } catch (error) {
        sample.errors.push(`Circle score fetch failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
    
    // Analyze trace logs for this restaurant
    const traces = getTracesAfterPosition(traceStartPosition);
    sample.requestCount = traces.length;
    
    // Check for mismatches and inconsistencies
    for (const trace of traces) {
      if (trace.note.includes('RATINGS_MISMATCH')) {
        sample.ratingsMismatch = true;
      }
      if (trace.note.includes('CIRCLE_SCORE_INCONSISTENT')) {
        sample.circleScoreInconsistencies++;
      }
    }
    
  } catch (error) {
    sample.errors.push(`Analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
  
  return sample;
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

function getTracesAfterPosition(position: number): TraceLog[] {
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

async function generateMarkdownReport(samples: RestaurantSample[]) {
  const totalSamples = samples.length;
  const withMismatches = samples.filter(s => s.ratingsMismatch).length;
  const withInconsistencies = samples.filter(s => s.circleScoreInconsistencies > 0).length;
  const avgRequestCount = samples.reduce((sum, s) => sum + s.requestCount, 0) / totalSamples;
  
  const report = `# Restaurant Sampling Audit Report

**Generated:** ${new Date().toISOString()}  
**Samples Analyzed:** ${totalSamples}

## Summary

- **Ratings Mismatches:** ${withMismatches}/${totalSamples} restaurants (${((withMismatches/totalSamples)*100).toFixed(1)}%)
- **Circle Score Inconsistencies:** ${withInconsistencies}/${totalSamples} restaurants (${((withInconsistencies/totalSamples)*100).toFixed(1)}%)
- **Average Requests per Page:** ${avgRequestCount.toFixed(1)}

## Key Findings

### Data Integrity Issues
${withMismatches > 0 ? 
  `⚠️ **${withMismatches} restaurants** have ratings mismatches where the rating payload references a different restaurantId than expected.` :
  '✅ **No ratings mismatches** detected across all sampled restaurants.'
}

### Circle Score Consistency
${withInconsistencies > 0 ? 
  `⚠️ **${withInconsistencies} restaurants** have Circle Score inconsistencies where different values are calculated for the same restaurant.` :
  '✅ **No Circle Score inconsistencies** detected across all sampled restaurants.'
}

### Performance Impact
- Average of **${avgRequestCount.toFixed(1)} requests** per restaurant page load
- ${samples.filter(s => s.requestCount > 5).length} restaurants required more than 5 requests

## Top Issues

${samples
  .filter(s => s.errors.length > 0 || s.ratingsMismatch || s.circleScoreInconsistencies > 0)
  .slice(0, 10)
  .map(s => `### ${s.name} (ID: ${s.id})
- **Ratings Mismatch:** ${s.ratingsMismatch ? '❌' : '✅'}
- **Circle Score Issues:** ${s.circleScoreInconsistencies}
- **Request Count:** ${s.requestCount}
- **Errors:** ${s.errors.length > 0 ? s.errors.join(', ') : 'None'}
`)
  .join('\n')}

## Recommendations

${withMismatches > 0 ? 
  '1. **Fix Ratings Binding:** Implement strict restaurant ID validation in rating endpoints' : 
  '1. **Ratings System:** ✅ Working correctly'
}

${withInconsistencies > 0 ?
  '2. **Unify Circle Score:** Consolidate to single endpoint and cache key' :
  '2. **Circle Score System:** ✅ Working consistently'
}

3. **Optimize Requests:** Reduce average requests per page from ${avgRequestCount.toFixed(1)} to <3

## Trace Log Location
- **File:** \`${TRACE_LOG_FILE}\`
- **Format:** JSON Lines (one trace per line)
`;

  fs.writeFileSync(path.join(OUTPUT_DIR, 'AUDIT_RESTAURANTS_SAMPLE.md'), report);
}

async function generateCsvReport(csvRows: string[]) {
  const csvContent = csvRows.join('\n');
  fs.writeFileSync(path.join(OUTPUT_DIR, 'AUDIT_RESTAURANTS_SAMPLE.csv'), csvContent);
}

// Ensure output directory exists
fs.mkdirSync(OUTPUT_DIR, { recursive: true });

// Run the audit
sampleRestaurants().catch(console.error);