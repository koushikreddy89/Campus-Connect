#!/usr/bin/env node

/**
 * Indian Colleges Data Fetcher & Processor
 * 
 * Senior Data Engineer Implementation
 * 
 * Purpose: Fetch, clean, and validate Indian university data
 * Output: Production-ready colleges.json with accurate academic domains
 * 
 * Features:
 * - API data fetching with error handling
 * - Intelligent domain filtering and validation
 * - Duplicate removal
 * - Alphabetical sorting
 * - Comprehensive logging
 * - Production-ready output
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// ES Module compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================
// CONFIGURATION
// ============================================

const API_URL = 'http://universities.hipolabs.com/search?country=India';
const OUTPUT_FILE = path.join(__dirname, '../public/data/colleges.json');
const OUTPUT_DIR = path.dirname(OUTPUT_FILE);

// Academic domain patterns
const ACADEMIC_DOMAIN_PATTERNS = [
  /\.edu\.in$/i,
  /\.ac\.in$/i,
  /\.edu$/i,
  /\.ac\.uk$/i,
  /\.ac\.jp$/i,
];

// Generic domains to ignore
const IGNORE_PATTERNS = [
  /^www\./i,
  /^mail\./i,
  /^ftp\./i,
];

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Validate if domain is academic
 * @param {string} domain - Domain to validate
 * @returns {boolean}
 */
function isAcademicDomain(domain) {
  if (!domain || typeof domain !== 'string') return false;

  const normalized = domain.toLowerCase().trim();

  // Check if matches academic patterns
  const isAcademic = ACADEMIC_DOMAIN_PATTERNS.some(pattern => 
    pattern.test(normalized)
  );

  if (!isAcademic) return false;

  // Exclude generic subdomains
  const hasGenericPrefix = IGNORE_PATTERNS.some(pattern =>
    pattern.test(normalized)
  );

  return !hasGenericPrefix;
}

/**
 * Normalize domain
 * @param {string} domain - Raw domain
 * @returns {string} - Normalized domain
 */
function normalizeDomain(domain) {
  if (!domain) return null;

  return domain
    .toLowerCase()
    .trim()
    .replace(/^https?:\/\//, '') // Remove protocol
    .replace(/\/$/, ''); // Remove trailing slash
}

/**
 * Extract valid domain from array
 * @param {array} domains - Array of domains
 * @returns {string|null} - First valid academic domain
 */
function extractValidDomain(domains) {
  if (!Array.isArray(domains) || domains.length === 0) {
    return null;
  }

  for (const domain of domains) {
    const normalized = normalizeDomain(domain);
    
    if (normalized && isAcademicDomain(normalized)) {
      return normalized;
    }
  }

  return null;
}

/**
 * Format college entry
 * @param {object} rawData - Raw university data
 * @returns {object|null} - Formatted college entry or null if invalid
 */
function formatCollege(rawData) {
  if (!rawData || !rawData.name) {
    return null;
  }

  const domain = extractValidDomain(rawData.domains || []);

  if (!domain) {
    return null;
  }

  return {
    name: rawData.name.trim(),
    domain: domain,
  };
}

// ============================================
// MAIN FUNCTIONS
// ============================================

/**
 * Fetch universities from API
 * @returns {Promise<array>}
 */
async function fetchData() {
  console.log('🔍 Fetching data from API...');
  console.log(`   URL: ${API_URL}\n`);

  try {
    const response = await fetch(API_URL);

    if (!response.ok) {
      throw new Error(`HTTP Error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    if (!Array.isArray(data)) {
      throw new Error('API response is not an array');
    }

    if (data.length === 0) {
      throw new Error('API returned empty array');
    }

    console.log(`✅ Successfully fetched ${data.length} universities from API\n`);
    return data;

  } catch (error) {
    console.error(`❌ API Fetch Error: ${error.message}\n`);
    throw error;
  }
}

/**
 * Process and clean the raw data
 * @param {array} rawData - Raw university data from API
 * @returns {object} - Processed data with statistics
 */
function cleanData(rawData) {
  console.log('🧹 Processing and validating data...\n');

  const validColleges = [];
  const skippedDomains = [];
  const duplicateDomains = new Set();
  const processed = new Map();

  rawData.forEach((university, index) => {
    try {
      const college = formatCollege(university);

      if (!college) {
        // Log why it was skipped
        skippedDomains.push({
          name: university.name || 'Unknown',
          reason: !Array.isArray(university.domains) 
            ? 'No domains provided'
            : university.domains.length === 0
            ? 'Empty domains array'
            : 'No academic domains found',
          domains: university.domains || [],
        });
        return;
      }

      // Check for duplicate domains
      if (processed.has(college.domain)) {
        duplicateDomains.add(college.domain);
        
        console.warn(
          `⚠️  Duplicate domain detected: "${college.domain}"`
        );
        console.warn(
          `    Existing: ${processed.get(college.domain)}`
        );
        console.warn(
          `    New: ${college.name}`
        );
        console.warn(
          `    → Keeping first occurrence\n`
        );
        return;
      }

      processed.set(college.domain, college.name);
      validColleges.push(college);

    } catch (error) {
      console.error(
        `❌ Error processing university ${index}: ${error.message}`
      );
    }
  });

  console.log(`✅ Data processing complete\n`);

  return {
    colleges: validColleges,
    stats: {
      totalFetched: rawData.length,
      totalValid: validColleges.length,
      totalSkipped: skippedDomains.length,
      duplicatesDomains: duplicateDomains.size,
      duplicateRecords: Array.from(duplicateDomains),
    },
    skipped: skippedDomains,
  };
}

/**
 * Sort colleges alphabetically by name
 * @param {array} colleges - College array
 * @returns {array} - Sorted college array
 */
function sortColleges(colleges) {
  return [...colleges].sort((a, b) => 
    a.name.localeCompare(b.name, 'en', { sensitivity: 'base' })
  );
}

/**
 * Ensure output directory exists
 */
function ensureOutputDirectory() {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    console.log(`📁 Created output directory: ${OUTPUT_DIR}\n`);
  }
}

/**
 * Save colleges to JSON file
 * @param {array} colleges - Sorted colleges array
 * @returns {void}
 */
function saveToFile(colleges) {
  console.log('💾 Saving to file...\n');

  try {
    ensureOutputDirectory();

    const output = {
      metadata: {
        version: '1.0.0',
        description: 'Indian Universities and Colleges Academic Email Domains',
        generatedAt: new Date().toISOString(),
        totalRecords: colleges.length,
        source: 'universities.hipolabs.com',
      },
      colleges: colleges,
    };

    // Write with pretty printing (2 spaces)
    fs.writeFileSync(
      OUTPUT_FILE,
      JSON.stringify(output, null, 2),
      'utf8'
    );

    console.log(`✅ Successfully saved to: ${OUTPUT_FILE}`);
    console.log(`   File size: ${(fs.statSync(OUTPUT_FILE).size / 1024).toFixed(2)} KB\n`);

  } catch (error) {
    console.error(`❌ File Save Error: ${error.message}\n`);
    throw error;
  }
}

/**
 * Generate comprehensive statistics report
 * @param {object} processedData - Output from cleanData()
 * @param {array} sortedColleges - Final sorted colleges
 */
function generateReport(processedData, sortedColleges) {
  const stats = processedData.stats;
  
  console.log('═════════════════════════════════════════════════════════');
  console.log('📊 DATA PROCESSING REPORT');
  console.log('═════════════════════════════════════════════════════════\n');

  console.log('📈 STATISTICS:');
  console.log(`   Total fetched from API:  ${stats.totalFetched}`);
  console.log(`   Valid colleges extracted: ${stats.totalValid}`);
  console.log(`   Records skipped:         ${stats.totalSkipped}`);
  console.log(`   Duplicate domains found: ${stats.duplicatesDomains}`);
  console.log(`   Final sorted records:    ${sortedColleges.length}\n`);

  // Success rate
  const successRate = ((stats.totalValid / stats.totalFetched) * 100).toFixed(1);
  console.log(`✅ Success Rate: ${successRate}%\n`);

  if (stats.duplicateRecords.length > 0) {
    console.log('🔄 DUPLICATE DOMAINS:');
    stats.duplicateRecords.forEach(domain => {
      console.log(`   • ${domain}`);
    });
    console.log();
  }

  // Show sample data
  console.log('📋 SAMPLE DATA (First 5 colleges):');
  sortedColleges.slice(0, 5).forEach((college, idx) => {
    console.log(`   ${idx + 1}. ${college.name}`);
    console.log(`      └─ ${college.domain}`);
  });
  console.log();

  // Show skipped reasons breakdown
  const reasonCounts = {};
  processedData.skipped.forEach(item => {
    reasonCounts[item.reason] = (reasonCounts[item.reason] || 0) + 1;
  });

  console.log('⚠️  SKIP REASONS:');
  Object.entries(reasonCounts).forEach(([reason, count]) => {
    console.log(`   • ${reason}: ${count}`);
  });
  console.log();
}

/**
 * Main execution
 */
async function main() {
  console.log('═════════════════════════════════════════════════════════');
  console.log('🎯 INDIAN COLLEGES DATA PROCESSOR');
  console.log('═════════════════════════════════════════════════════════\n');

  // Step 1: Fetch data
  const rawData = await fetchData();

  // Step 2: Clean and process data
  const processedData = cleanData(rawData);

  // Step 3: Sort colleges
  const sortedColleges = sortColleges(processedData.colleges);

  // Step 4: Generate report
  generateReport(processedData, sortedColleges);

  // Step 5: Save to file
  saveToFile(sortedColleges);

  // Success summary
  console.log('═════════════════════════════════════════════════════════');
  console.log('✨ PROCESSING COMPLETE');
  console.log('═════════════════════════════════════════════════════════\n');
  console.log(`🎉 Output: ${sortedColleges.length} colleges ready for production\n`);
}

// ============================================
// EXECUTE
// ============================================

try {
  await main();
  process.exit(0);
} catch (error) {
  console.error('Unhandled error:', error);
  process.exit(1);
}
