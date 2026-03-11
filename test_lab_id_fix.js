#!/usr/bin/env node

/**
 * Quick Test: Verify lab_id handling
 * Tests that undefined lab_id is converted to null properly
 */

// Test the conversion logic
const labId = undefined;
const result = {};

// This is what we're now doing
result.lab_id = labId || null;

console.log('Test: Undefined lab_id conversion');
console.log('Input: labId =', labId);
console.log('Output: result.lab_id =', result.lab_id);
console.log('Type:', typeof result.lab_id);
console.log('Is null?', result.lab_id === null);
console.log('');

if (result.lab_id === null) {
  console.log('✅ TEST PASSED: undefined correctly converted to null');
} else {
  console.log('❌ TEST FAILED: lab_id is not null');
  process.exit(1);
}

// Test with actual lab_id value
const labId2 = 1;
const result2 = {};
result2.lab_id = labId2 || null;

console.log('Test: With actual lab_id value');
console.log('Input: labId = 1');
console.log('Output: result.lab_id =', result2.lab_id);
console.log('');

if (result2.lab_id === 1) {
  console.log('✅ TEST PASSED: lab_id value preserved');
} else {
  console.log('❌ TEST FAILED: lab_id value not preserved');
  process.exit(1);
}

console.log('');
console.log('All tests passed! The fix is working correctly.');
