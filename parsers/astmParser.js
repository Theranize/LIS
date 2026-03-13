/**
 * ASTM Parser (lightweight)
 * Output style matches your previous parser:
 * {
 *   analyzer: string|null,
 *   messageId: string|null,
 *   sampleId: string|null,
 *   tests: [{ testCode, value, unit, referenceRange, flag }]
 * }
 *
 * Adjusted to correctly parse your sample messages:
 * - H record contains analyzer name at parts[4] (e.g., "Mindray BS-230")
 * - P record contains patient/message id at parts[3] (e.g., "STREAM001")
 * - O record contains sample id at parts[2] (e.g., "SAMPLE005")
 * - R record contains test code in parts[2] like "^^^HDL" -> HDL
 */

export function astmParser(rawData, options = {}) {
  const {
    analyzer = null,    // if you already know analyzer from connection/profile
    analyzerId = null   // optional, not used in output unless analyzer missing
  } = options;

  const message = rawData;

  // Normalize line endings (your sample ends with \n after L)
  const lines = message.replace(/\n/g, "").split("\r");

  const result = {
    analyzer: analyzer,
    messageId: null,
    sampleId: null,
    tests: []
  };

  for (const line of lines) {
    if (!line || line.length < 2) continue;

    const type = line.charAt(0); // H, P, O, R, L
    const parts = line.split("|");

    if (type === "H") {
      // Example: H|\\^&|||Mindray BS-230|||||P|1
      // analyzer is at index 4 in your message
      if (!result.analyzer) result.analyzer = parts[4] || null;
      if (!result.analyzer && analyzerId != null) result.analyzer = String(analyzerId);
    }

    if (type === "P") {
      // Example: P|1||STREAM001||GARCIA^CARLOS
      // Using STREAM001 as messageId/correlation id
      if (!result.messageId) result.messageId = parts[3] || null;
    }

    if (type === "O") {
      // Example: O|1|SAMPLE005||HDL^HDL Cholesterol
      result.sampleId = parts[2] || result.sampleId || null;
    }

    if (type === "R") {
      // Example: R|1|^^^HDL|55|mg/dL|>40|N||F
      const rawTestField = parts[2] || "";
      const testParts = rawTestField.split("^").filter(Boolean);
      const testCode = (testParts.length ? testParts[testParts.length - 1] : rawTestField) || null;

      const value = parts[3] || null;
      const unit = parts[4] || null;
      const referenceRange = parts[5] || null;
      const flag = parts[6] || null;

      result.tests.push({ testCode, value, unit, referenceRange, flag });
    }
  }

  return result;
}