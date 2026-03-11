/**
 * Batch Test Simulator
 * Tests your LIS server's ability to handle batch messages from analyzers
 */

const net = require('net');

const HOST = '127.0.0.1';
const PORT = 5001;

// Test Case 1: Multiple messages in rapid succession (batch scenario)
function testRapidBatch() {
  console.log('\n=== TEST 1: Rapid Batch (3 messages together) ===');
  
  const client = new net.Socket();
  
  client.connect(PORT, HOST, () => {
    console.log('Connected to LIS for batch test');

    // Send 3 ASTM messages rapidly without delay
    const message1 = 
      'H|\\\\^&|||Mindray BS-230|||||P|1\r' +
      'P|1||BATCH001||DOE^JOHN\r' +
      'O|1|SAMPLE001||GLU^Glucose\r' +
      'R|1|^^^GLU|95|mg/dL|70-110|N||F\r' +
      'L|1|N\n';

    const message2 = 
      'H|\\\\^&|||Mindray BS-230|||||P|1\r' +
      'P|1||BATCH002||SMITH^JANE\r' +
      'O|1|SAMPLE002||CHO^Cholesterol\r' +
      'R|1|^^^CHO|180|mg/dL|<200|N||F\r' +
      'L|1|N\n';

    const message3 = 
      'H|\\\\^&|||Mindray BS-230|||||P|1\r' +
      'P|1||BATCH003||BROWN^BOB\r' +
      'O|1|SAMPLE003||TRI^Triglycerides\r' +
      'R|1|^^^TRI|150|mg/dL|<150|N||F\r' +
      'L|1|N\n';

    // Send all messages at once (simulates batch)
    console.log('Sending 3 messages in rapid succession...');
    client.write(message1 + message2 + message3);
    
    setTimeout(() => {
      client.end();
      console.log('Batch test completed');
    }, 1000);
  });

  client.on('error', (err) => {
    console.error('Batch test error:', err.message);
  });

  client.on('close', () => {
    console.log('Batch test connection closed');
    setTimeout(testMultipleResults, 2000); // Next test in 2 seconds
  });
}

// Test Case 2: Single message with multiple results
function testMultipleResults() {
  console.log('\n=== TEST 2: Single Message with Multiple Results ===');
  
  const client = new net.Socket();
  
  client.connect(PORT, HOST, () => {
    console.log('Connected to LIS for multi-result test');

    // Single message with multiple R records (multiple tests for one patient)
    const multiResultMessage = 
      'H|\\\\^&|||Mindray BS-230|||||P|1\r' +
      'P|1||MULTI001||WILSON^MARY\r' +
      'O|1|SAMPLE004||PANEL^Basic Metabolic Panel\r' +
      'R|1|^^^GLU|110|mg/dL|70-110|H||F\r' +
      'R|2|^^^BUN|45|mg/dL|7-20|H||F\r' +
      'R|3|^^^CRE|1.2|mg/dL|0.6-1.2|N||F\r' +
      'R|4|^^^NA|138|mEq/L|136-145|N||F\r' +
      'R|5|^^^K|4.1|mEq/L|3.5-5.1|N||F\r' +
      'L|1|N\n';

    console.log('Sending 1 message with 5 results...');
    client.write(multiResultMessage);
    
    setTimeout(() => {
      client.end();
      console.log('Multi-result test completed');
    }, 1000);
  });

  client.on('error', (err) => {
    console.error('Multi-result test error:', err.message);
  });

  client.on('close', () => {
    console.log('Multi-result test connection closed');
    setTimeout(testDelayedBatch, 2000); // Next test in 2 seconds
  });
}

// Test Case 3: Delayed batch (streaming test)
function testDelayedBatch() {
  console.log('\n=== TEST 3: Delayed Batch (Streaming) ===');
  
  const client = new net.Socket();
  
  client.connect(PORT, HOST, () => {
    console.log('Connected to LIS for streaming test');

    const messages = [
      'H|\\\\^&|||Mindray BS-230|||||P|1\r' +
      'P|1||STREAM001||GARCIA^CARLOS\r' +
      'O|1|SAMPLE005||HDL^HDL Cholesterol\r' +
      'R|1|^^^HDL|55|mg/dL|>40|N||F\r' +
      'L|1|N\n',
      
      'H|\\\\^&|||Mindray BS-230|||||P|1\r' +
      'P|1||STREAM002||JONES^SARAH\r' +
      'O|1|SAMPLE006||LDL^LDL Cholesterol\r' +
      'R|1|^^^LDL|85|mg/dL|<100|N||F\r' +
      'L|1|N\n',
      
      
      'H|\\\\^&|||Mindray BS-230|||||P|1\r' +
      'P|1||STREAM003||DAVIS^MIKE\r' +
      'O|1|SAMPLE007||HBA1C^Hemoglobin A1c\r' +
      'R|1|^^^HBA1C|6.8|%|<7.0|N||F\r' +
      'L|1|N\n'
    ];

    let messageIndex = 0;
    
    const sendNextMessage = () => {
      if (messageIndex < messages.length) {
        console.log(`Sending streaming message ${messageIndex + 1}...`);
        client.write(messages[messageIndex]);
        messageIndex++;
        
        // Send next message after 200ms delay
        setTimeout(sendNextMessage, 200);
      } else {
        setTimeout(() => {
          client.end();
          console.log('Streaming test completed');
        }, 500);
      }
    };
    
    sendNextMessage();
  });

  client.on('error', (err) => {
    console.error('Streaming test error:', err.message);
  });

  client.on('close', () => {
    console.log('Streaming test connection closed');
    console.log('\n=== ALL TESTS COMPLETED ===');
    console.log('Check your LIS server logs and database for results!');
  });
}

// Start the test suite
console.log('Starting Batch Processing Test Suite...');
console.log('Make sure your LIS server is running on port 5001');

setTimeout(testRapidBatch, 1000);