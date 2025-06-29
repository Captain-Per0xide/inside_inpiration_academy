#!/usr/bin/env node

/**
 * Test Date Verification Script
 * 
 * This script verifies that the test date utility is working correctly
 * and returns the expected September 15, 2025 date.
 */

// Since we're running this as a Node.js script, we need to import the module
// with a simple require pattern for testing
const fs = require('fs');
const path = require('path');

// Read the testDate.ts file and extract the test date
const testDateFile = fs.readFileSync(path.join(__dirname, 'utils', 'testDate.ts'), 'utf8');

// Extract test mode and test date values
const testModeMatch = testDateFile.match(/const TEST_MODE = (true|false);/);
const testDateMatch = testDateFile.match(/const TEST_DATE = new Date\((\d+), (\d+), (\d+)\);/);

if (!testModeMatch || !testDateMatch) {
    console.error('❌ Could not parse test date configuration');
    process.exit(1);
}

const testMode = testModeMatch[1] === 'true';
const [, year, month, day] = testDateMatch;

console.log('🔍 Test Date Configuration Verification');
console.log('=====================================');
console.log(`📅 Test Mode: ${testMode ? '✅ ENABLED' : '❌ DISABLED'}`);
console.log(`📅 Test Date: ${new Date(parseInt(year), parseInt(month), parseInt(day)).toDateString()}`);
console.log(`📅 Expected: Mon Sep 15 2025`);

// Verify the configuration
const expectedDate = new Date(2025, 8, 15); // Month 8 = September (0-indexed)
const configuredDate = new Date(parseInt(year), parseInt(month), parseInt(day));

if (configuredDate.getTime() === expectedDate.getTime() && testMode) {
    console.log('✅ Test date configuration is CORRECT');
    console.log(`📝 Current Month: September (${month})`);
    console.log(`📝 Current Year: ${year}`);
    console.log(`📝 Current Day: ${day}`);
    console.log('');
    console.log('🎯 Payment System Testing Ready!');
    console.log('   - Elective course duration calculations will use Sep 2025');
    console.log('   - Monthly payments will show "Sept 2025"');
    console.log('   - Payment history will use September 15, 2025 timestamps');
    console.log('   - File uploads will go to "Sept" folders');
} else if (!testMode) {
    console.log('⚠️  Test mode is DISABLED - app will use real current date');
    console.log('   To enable test mode, set TEST_MODE = true in utils/testDate.ts');
} else {
    console.log('❌ Test date configuration is INCORRECT');
    console.log(`   Expected: September 15, 2025`);
    console.log(`   Configured: ${configuredDate.toDateString()}`);
}

console.log('');
console.log('📁 Files Updated:');
console.log('   - app/(students)/payment.tsx');
console.log('   - app/(admin)/payment.tsx');  
console.log('   - components/payment.tsx');
console.log('   - components/add-courses.tsx');
console.log('   - utils/sessionDebug.ts');
console.log('');
console.log('🔄 To switch back to real date: Change TEST_MODE to false in utils/testDate.ts');
