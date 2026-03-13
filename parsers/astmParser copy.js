export function astmParser(rawData) {

  const message = rawData.toString();

  const lines = message.split('\r');

  const result = {
    analyzer: null,
    messageId: null,
    sampleId: null,
    tests: []
  };

  lines.forEach(line => {

    const parts = line.split('|');

    // Analyzer + Message ID (HL7 MSH)
    if (parts[0] === 'MSH') {
      result.analyzer = parts[2] || null;
      result.messageId = parts[9] || null;
    }

    // Sample ID
    if (parts[0] === 'O') {
      result.sampleId = parts[2] || null;
    }

    // Test Results
    if (parts[0] === 'R') {
      result.tests.push({
        testCode: parts[2] || null,
        value: parts[3] || null,
        unit: parts[4] || null
      });
    }

  });

  return result;

}