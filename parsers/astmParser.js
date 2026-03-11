/**
 * ASTM E1394 Parser
 * Converts raw ASTM messages into structured result objects
 */

class ASTMParser {
  parse(rawMessage, analyzerId) {
    try {
      console.log(`[Parser] 🔍 Parsing ASTM message (${rawMessage.length} chars)`);
      
      const lines = rawMessage.split('\r');
      const results = [];

      let currentMessage = {
        analyzer_id: analyzerId,
        patient_id: null,
        analyzer_sample_id: null,
        test_code: null,
        test_name: null,
        result_value: null,
        unit: null,
        reference_range: null,
        normal_flag: 'N',
        result_timestamp: new Date()
      };

      console.log(`[Parser] 📋 Processing ${lines.length} ASTM lines`);

      for (const [lineIndex, line] of lines.entries()) {
        if (!line || line.length < 2) continue;

        const type = line.charAt(0);
        const parts = line.split('|');

        // Debug log for key record types
        if (['H', 'P', 'O', 'R', 'L'].includes(type)) {
          console.log(`[Parser] Line ${lineIndex + 1}: ${type} record → ${parts.length} fields`);
        }

        // Parse based on record type
        if (type === 'P') {
          // Patient record: P|seq||patient_id||name
          currentMessage.patient_id = parts[3] || null;
          console.log(`[Parser] 👤 Patient ID: ${currentMessage.patient_id}`);
        } 
        else if (type === 'O') {
          // Order record: O|seq|specimen_id||test_code^test_name
          currentMessage.analyzer_sample_id = parts[2] || null;
          const testField = parts[4] || '';
          const testParts = testField.split('^');
          currentMessage.test_code = testParts[0] || null;
          currentMessage.test_name = testParts[1] || null;
          console.log(`[Parser] 🧪 Sample: ${currentMessage.analyzer_sample_id}, Test: ${currentMessage.test_code}`);
        } 
        else if (type === 'R') {
          // Result record: R|seq|test_id|value|unit|reference|flag
          const testField = parts[2] || '';
          const testParts = testField.split('^');
          currentMessage.test_code = testParts[testParts.length - 1] || currentMessage.test_code;
          
          currentMessage.result_value = parts[3] || null;
          currentMessage.unit = parts[4] || null;
          currentMessage.reference_range = parts[5] || null;
          currentMessage.normal_flag = parts[6] || 'N';
          
          console.log(`[Parser] 📊 Result: ${currentMessage.test_code} = ${currentMessage.result_value} ${currentMessage.unit}`);
          
          // Clone and save result (CRITICAL for batch processing)
          if (currentMessage.result_value && currentMessage.test_code) {
            const resultCopy = { ...currentMessage };
            results.push(resultCopy);
            console.log(`[Parser] ✅ Added result ${results.length}: ${resultCopy.test_code}`);
          }
        }
      }

      console.log(`[Parser] 🎯 PARSING COMPLETE: Found ${results.length} valid results`);
      return results;
    } catch (error) {
      console.error('[Parser] ❌ ERROR parsing ASTM message:', error.message);
      console.error('[Parser] Raw message:', JSON.stringify(rawMessage.substring(0, 200)));
      return [];
    }
  }

  parseTimestamp(timeStr) {
    if (!timeStr) return new Date();
    
    try {
      // Format: YYYYMMDDHHMMSS
      if (timeStr.length === 14) {
        const year = parseInt(timeStr.substring(0, 4));
        const month = parseInt(timeStr.substring(4, 6)) - 1;
        const day = parseInt(timeStr.substring(6, 8));
        const hour = parseInt(timeStr.substring(8, 10));
        const minute = parseInt(timeStr.substring(10, 12));
        const second = parseInt(timeStr.substring(12, 14));
        
        return new Date(year, month, day, hour, minute, second);
      }
    } catch (e) {
      console.warn('[Parser] Could not parse timestamp:', timeStr);
    }
    
    return new Date();
  }
}

module.exports = new ASTMParser();
