import net from "net";

const client = new net.Socket();

const hl7Message =
"\x0BMSH|^~\\&|BS230|LAB|LIS|HOSP|202603111200||ORU^R01|1234|P|2.3\r" +
"PID|||123456||John Doe\r" +
"OBR|1||SAMPLE100||GLU\r" +
"OBX|1|NM|GLU||105|mg/dL|70-110|N\r" +
"OBX|2|NM|UREA||30|mg/dL|10-50|N\r" +
"\x1C\r";

const astmMessage =
'H|\\\\^&|||Mindray BS-230|||||P|1\r' +
'P|1||STREAM001||GARCIA^CARLOS\r' +
'O|1|SAMPLE005||HDL^HDL Cholesterol\r' +
'R|1|^^^HDL|55|mg/dL|>40|N||F\r' +
'L|1|N\n';

client.connect(8017, "69.62.77.70", () => {

  console.log("Connected to HL7 server");

  // client.write(hl7Message);
  // client.write(astmMessage);
  // client.write(astmMessage);
  client.write(astmMessage);

});

client.on("data", (data) => {

  console.log("ACK Received:");
  console.log(data.toString());

  client.destroy();

});