export function buildACK(messageId, analyzer) {

  const time = new Date().toISOString();

  const ack =
`MSH|^~\\&|LIS|LAB|${analyzer}|LAB|${time}||ACK|${messageId}|P|2.3\r
MSA|AA|${messageId}\r`;

  return "\x0B" + ack + "\x1C\r";
}