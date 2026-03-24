/**
 * ASTM Parser (Production Ready - Horiba Compatible)
 *
 * Handles:
 * - Frame numbers (e.g., 1H, 2P, etc.)
 * - Control characters (STX, ETX)
 * - Checksum removal
 * - Proper line splitting
 *
 * Output:
 * {
 *   analyzer: string|null,
 *   messageId: string|null,
 *   sampleId: string|null,
 *   tests: [{ testCode, value, unit, referenceRange, flag }]
 * }
 */

export function astmParser(rawData, options = {}) {

  const {
    analyzer = null,
    analyzerId = null
  } = options;

  // 🔹 Step 1: Remove ASTM control characters and normalize line breaks
  let cleaned = rawData
    .replace(/\x02/g, "") // Remove STX (start of text)
    .replace(/\x03/g, "") // Remove ETX (end of text)
    .replace(/\r/g, "\n"); // Normalize line endings

  // 🔹 Step 2: Split message into lines
  let lines = cleaned
    .split("\n")
    .map(line => line.trim())
    .filter(Boolean);

  // 🔹 Step 3: Remove frame numbers and checksum
  lines = lines.map(line => {

    // Remove leading frame number (e.g., "1H" → "H")
    line = line.replace(/^\d+/, "");

    // Remove trailing checksum (last 2 hex characters)
    line = line.replace(/[0-9A-F]{2}$/, "");

    return line.trim();
  });

  const result = {
    analyzer: analyzer,
    messageId: null,
    sampleId: null,
    tests: []
  };

  // 🔹 Step 4: Parse each line
  for (const line of lines) {

    if (!line || line.length < 2) continue;

    const type = line.charAt(0); // Record type: H, P, O, R, L
    const parts = line.split("|");

    // 🔹 Header record (H)
    if (type === "H") {
      // Example: H|\^&|||H500^305YODH05816^4.0.2.3
      if (!result.analyzer) result.analyzer = parts[4] || null;

      // Fallback to analyzerId if analyzer name is missing
      if (!result.analyzer && analyzerId != null) {
        result.analyzer = String(analyzerId);
      }
    }

    // 🔹 Patient record (P)
    if (type === "P") {
      // Example: P|1||2526027213
      if (!result.messageId) {
        result.messageId = parts[3] || null;
      }
    }

    // 🔹 Order record (O)
    if (type === "O") {
      // Example: O|1|2526027213
      result.sampleId = parts[2] || result.sampleId || null;
    }

    // 🔹 Result record (R)
    if (type === "R") {

      const rawTestField = parts[2] || "";

      // Extract test code from field like: ^^^WBC^6690-2
      let testCode = null;
      const testParts = rawTestField.split("^").filter(Boolean);

      if (testParts.length >= 2) {
        // Usually second last value is actual test code (e.g., WBC)
        testCode = testParts[testParts.length - 2];
      } else if (testParts.length === 1) {
        testCode = testParts[0];
      }

      const value = parts[3] || null;
      const unit = parts[4] || null;
      const referenceRange = parts[5] || null;
      const flag = parts[6] || null;

      result.tests.push({
        testCode,
        value,
        unit,
        referenceRange,
        flag
      });
    }
  }

  return result;
}