import net from "net";

const HOST = "127.0.0.1";
const PORT = 8017;

const ENQ = "\x05";
const ACK = "\x06";
const EOT = "\x04";

// 🔹 ASTM frames
const frames = [
  "\x021H|\\^&|||H500^305YODH05816^4.0.2.3|||||||P|LIS2-A2|20260323161205\r\x03D3\r\n",
  "\x022P|1||2526027213||^manshi r||^25^Y|F\r\x0360\r\n",
  "\x023O|1|2526027213||^^^DIF|R|20260323151903|||||X||||BLOOD|||||AP^WOMAN|||||F\r\x0330\r\n",
  "\x027R|1|^^^WBC^6690-2|8.39|1E03/mm3|4.00 - 11.00^REFERENCE_RANGE|N\r\x0343\r\n",
  "\x024L|1|N\r\x03AA\r\n"
];

const client = new net.Socket();

let step = 0;
let frameIndex = 0;

client.connect(PORT, HOST, () => {
  console.log("Connected to server");

  // 🔹 Step 1: Send ENQ
  console.log("Sending ENQ");
  client.write(ENQ);
});

// 🔹 Handle server response (ACK आधारित flow)
client.on("data", (data) => {
  const response = data.toString();

  console.log("Received from server:", JSON.stringify(response));

  // 🔹 Step 2: After ENQ → expect ACK → send first frame
  if (step === 0 && response.includes(ACK)) {
    step = 1;
    sendNextFrame();
    return;
  }

  // 🔹 Step 3: After each frame ACK → send next frame
  if (step === 1 && response.includes(ACK)) {
    sendNextFrame();
    return;
  }
});

// 🔹 Send frames one by one
function sendNextFrame() {
  if (frameIndex < frames.length) {
    console.log(`Sending frame ${frameIndex + 1}`);
    client.write(frames[frameIndex]);
    frameIndex++;
  } else {
    // 🔹 Step 4: All frames sent → send EOT
    console.log("Sending EOT");
    client.write(EOT);
    step = 2;
  }
}

client.on("close", () => {
  console.log("Connection closed");
});

client.on("error", (err) => {
  console.error("Error:", err.message);
});