export function parseHL7(rawMessage) {

  console.log("Parsing HL7 message...");
  console.log("Raw message:", rawMessage);

  const clean = rawMessage
    .replace(/\x0B/g, "")
    .replace(/\x1C/g, "")
    .replace(/\x0D/g, "\r");

  const segments = clean.split("\r");

  const result = {
    analyzer: null,
    messageId: null,
    sampleId: null,
    tests: []
  };

  for (const segment of segments) {

    const fields = segment.split("|");

    switch (fields[0]) {

      case "MSH":
        result.analyzer = fields[2];
        result.messageId = fields[9];
        break;

      case "OBR":
        result.sampleId = fields[3];
        break;

      case "OBX":
        result.tests.push({
          testCode: fields[3],
          value: fields[5],
          unit: fields[6]
        });
        break;

    }

  }

  return result;
}