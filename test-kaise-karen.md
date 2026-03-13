Server test karne ke **3 practical tarike** hain. Main aapko **realistic workflow** bata raha hoon jo LIS integration me use hota hai. 🧪

---

# 1️⃣ Step 1 — Server Run karo

Project folder me run karo:

```bash
node app.js
```

Expected output:

```
Express API running on port 3000
HL7 TCP Server running on port 5000
```

Ab aapka system ready hai.

---

# 2️⃣ Step 2 — Express API Test (Health Check)

Browser me open karo:

```
http://localhost:3000/api/health
```

Response:

```json
{
  "status": "Analyzer server running"
}
```

Ye confirm karta hai ki **Express server working hai**. ✅

---

# 3️⃣ Step 3 — HL7 Message Test (Analyzer Simulation)

Real analyzer abhi nahi hai, isliye hum **TCP client se HL7 message bhejenge**.

### Method 1 (Recommended) — netcat

Linux / Mac / WSL me:

```bash
nc localhost 5000
```

Phir HL7 message paste karo:

```
<CTRL+V><CTRL+K>
MSH|^~\&|BS230|LAB|LIS|HOSP|202603111200||ORU^R01|1234|P|2.3
PID|||123456||John Doe
OBR|1||SAMPLE100||GLU
OBX|1|NM|GLU||105|mg/dL|70-110|N
OBX|2|NM|UREA||30|mg/dL|10-50|N
<CTRL+V><CTRL+\>
```

Server console me output:

```
Analyzer connected: 127.0.0.1

HL7 MESSAGE RECEIVED:
MSH|^~\&|BS230...

Parsed:
Analyzer: BS230
Sample: SAMPLE100

ACK sent
```

---

# 4️⃣ Step 4 — Database Check

MySQL me check karo:

```sql
SELECT * FROM analyzer_results;
```

Result:

| analyzer | sample_id | test_code | value |
| -------- | --------- | --------- | ----- |
| BS230    | SAMPLE100 | GLU       | 105   |
| BS230    | SAMPLE100 | UREA      | 30    |

---

# 5️⃣ Step 5 — Easy Testing (Best Method)

Main usually **Node client script** se test karta hoon.

Create file:

```
testClient.js
```

Code:

```javascript
import net from "net";

const client = new net.Socket();

const message =
"\x0BMSH|^~\\&|BS230|LAB|LIS|HOSP|202603111200||ORU^R01|1234|P|2.3\r" +
"PID|||123456||John Doe\r" +
"OBR|1||SAMPLE100||GLU\r" +
"OBX|1|NM|GLU||105|mg/dL|70-110|N\r" +
"OBX|2|NM|UREA||30|mg/dL|10-50|N\r" +
"\x1C\r";

client.connect(5000, "127.0.0.1", () => {

  console.log("Connected to HL7 server");

  client.write(message);

});

client.on("data", (data) => {

  console.log("ACK Received:");
  console.log(data.toString());

  client.destroy();

});
```

Run:

```bash
node testClient.js
```

Output:

```
Connected to HL7 server

ACK Received:
MSH|^~\&|LIS|LAB|BS230|LAB...
MSA|AA|1234
```

---

# 6️⃣ Real Analyzer Testing

Analyzer UI me configure:

```
HOST : 192.168.1.50
PORT : 5000
PROTOCOL : HL7
```

Then run sample → analyzer automatically send karega.

---

# 7️⃣ Advanced Testing Tool (Best)

Professional LIS testing ke liye tools:

| Tool          | Use            |
| ------------- | -------------- |
| HL7 Inspector | HL7 debugging  |
| Mirth Connect | HL7 simulator  |
| HL7 Soup      | HL7 testing    |
| TCP Test Tool | socket testing |

---

# 8️⃣ Real Production Debugging

Server me logs add karna zaroori hota hai:

```
connection log
message log
parse log
ack log
error log
```

---

# ⚠️ One Important Thing

Real analyzers **MLLP framing** use karte hain:

```
0x0B  -> start
0x1C  -> end
0x0D  -> carriage return
```

Isliye testing message me:

```
\x0B  start
\x1C\r end
```

zaroor hona chahiye.

---

# 🚀 If you want, I can also show you

* **How to simulate 50 analyzers at once**
* **How to load test HL7 server**
* **How big LIS systems process 10k results/hour**
* **Auto analyzer detection system**

Ye cheezein **real diagnostic lab LIS architecture** ka part hoti hain.
