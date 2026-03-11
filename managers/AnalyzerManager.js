/**
 * Analyzer Manager
 * Handles multiple analyzers with dynamic port configuration from database
 */

const net = require('net');
const db = require('../database/analyzerDb');

class AnalyzerManager {
  constructor() {
    this.servers = new Map(); // Map of analyzerId -> server
    this.sockets = new Map(); // Map of analyzerId -> Set of sockets
  }

  /**
   * Initialize all active analyzers from database
   */
  async initializeAnalyzers() {
    try {
      const analyzers = await db.getActiveAnalyzers();
      
      console.log(`[Manager] Found ${analyzers.length} active analyzers`);

      for (const analyzer of analyzers) {
        // Get all active ports for this analyzer
        const ports = await db.getAnalyzerPorts(analyzer.id);
        
        if (ports.length === 0) {
          console.warn(`[Manager] Analyzer ${analyzer.analyzer_code} has no active ports configured`);
          continue;
        }

        console.log(`[${analyzer.analyzer_code}] Found ${ports.length} active port(s)`);

        // Start server for each active port
        for (const port of ports) {
          await this.startAnalyzerServer(analyzer, port);
        }
      }

      return analyzers.length;
    } catch (error) {
      console.error('[Manager] Error initializing analyzers:', error.message);
      throw error;
    }
  }

  /**
   * Start TCP server for a specific analyzer on a specific port
   * Supports both TCP and RS232 protocols
   */
  async startAnalyzerServer(analyzer, portConfig) {
    try {
      const { id, analyzer_code, communication_type } = analyzer;
      const { id: portId, port_number, protocol } = portConfig;

      // Create unique server key for this analyzer+port combination
      const serverKey = `${id}_${port_number}`;

      if (this.servers.has(serverKey)) {
        console.log(`[${analyzer_code}] Port ${port_number} already running`);
        return;
      }

      // Handle different protocols
      if (protocol === 'RS232') {
        console.log(`[${analyzer_code}] RS232 support - configure via SerialPort module`);
        // TODO: Implement RS232 support using serialport npm module
        return;
      }

      // TCP Protocol (default)
      const server = net.createServer(async (socket) => {
        await this.handleAnalyzerConnection(socket, id, analyzer_code, analyzer.lab_id);
      });

      server.listen(port_number, '0.0.0.0', () => {
        console.log(`[${analyzer_code}] TCP server listening on port ${port_number}`);
      });

      server.on('error', (error) => {
        console.error(`[${analyzer_code}] Server error on port ${port_number}:`, error.message);
      });

      this.servers.set(serverKey, server);
      
      // Initialize socket set for this analyzer if not exists
      if (!this.sockets.has(id)) {
        this.sockets.set(id, new Set());
      }

    } catch (error) {
      console.error('[Manager] Error starting analyzer server:', error.message);
    }
  }

  /**
   * Handle connection from specific analyzer
   */
  async handleAnalyzerConnection(socket, analyzerId, analyzerCode, labId) {
    try {
      console.log(`[${analyzerCode}] Client connected: ${socket.remoteAddress}:${socket.remotePort}`);

      // Track this socket
      const sockets = this.sockets.get(analyzerId);
      if (sockets) {
        sockets.add(socket);
      }

      let buffer = '';

      socket.on('data', async (data) => {
        try {
          const chunk = data.toString();
          buffer += chunk;
          
          console.log(`[${analyzerCode}] Received ${chunk.length} bytes, buffer now ${buffer.length} bytes`);

          // Check for complete ASTM messages (multiple end markers supported)
          const ETX = '\x03'; // End of Text
          const EOT = '\x04'; // End of Transmission  
          const LF = '\n';    // Line Feed (most common)

          let foundMessages = [];
          
          // Split by any of the end markers
          for (const marker of [ETX, EOT, LF]) {
            if (buffer.includes(marker)) {
              const parts = buffer.split(marker);
              buffer = parts.pop() || ''; // Keep incomplete part
              foundMessages.push(...parts.filter(msg => msg.trim()));
              break; // Use first marker found
            }
          }

          console.log(`[${analyzerCode}] Found ${foundMessages.length} complete message(s)`);

          // Process each complete message
          for (const [index, rawMessage] of foundMessages.entries()) {
            console.log(`[${analyzerCode}] Processing message ${index + 1}/${foundMessages.length}`);
            await this.processAnalyzerMessage(analyzerId, analyzerCode, labId, rawMessage.trim());
          }

          // Log buffer status
          if (buffer.length > 0) {
            console.log(`[${analyzerCode}] Buffer has ${buffer.length} bytes remaining`);
          }

        } catch (error) {
          console.error(`[${analyzerCode}] Error processing data chunk:`, error.message);
        }
      });

      socket.on('error', (error) => {
        console.error(`[${analyzerCode}] Socket error: ${error.message}`);
      });

      socket.on('end', () => {
        console.log(`[${analyzerCode}] Client disconnected: ${socket.remoteAddress}:${socket.remotePort}`);
        sockets.delete(socket);
      });

    } catch (error) {
      console.error('[Manager] Connection error:', error.message);
      socket.destroy();
    }
  }

  /**
   * Process message from specific analyzer with enhanced batch logging
   */
  async processAnalyzerMessage(analyzerId, analyzerCode, labId, rawMessage) {
    try {
      console.log(`[${analyzerCode}] =====================================`);
      console.log(`[${analyzerCode}] 📨 PROCESSING ASTM MESSAGE`);
      console.log(`[${analyzerCode}] Length: ${rawMessage.length} characters`);
      console.log(`[${analyzerCode}] Content: ${JSON.stringify(rawMessage.substring(0, 100))}${rawMessage.length > 100 ? '...' : ''}`);
      console.log(`[${analyzerCode}] =====================================`);
      
      // Store raw message with analyzer_id
      const rawMessageId = await db.insertRawMessage(analyzerId, 'ASTM', rawMessage);
      console.log(`[${analyzerCode}] 💾 Stored raw message ID: ${rawMessageId}`);

      // Parse message
      const astmParser = require('../parsers/astmParser');
      const results = astmParser.parse(rawMessage, analyzerId);

      console.log(`[${analyzerCode}] 🔍 Parser found ${results.length} result(s)`);

      // Insert results with detailed tracking
      let insertedCount = 0;
      let duplicateCount = 0;
      let errorCount = 0;

      for (const [index, result] of results.entries()) {
        try {
          console.log(`[${analyzerCode}] 📋 Result ${index + 1}: ${result.test_code}=${result.result_value} (${result.patient_id})`);
          
          // Add lab_id to result data (convert undefined to null for database)
          result.lab_id = labId || null;
          
          const resultId = await db.insertAnalyzerResult(rawMessageId, result);
          if (resultId) {
            insertedCount++;
            console.log(`[${analyzerCode}] ✅ Inserted result ${index + 1} → ID: ${resultId}`);
          } else {
            duplicateCount++;
            console.log(`[${analyzerCode}] ⚠️  Result ${index + 1} → DUPLICATE (skipped)`);
          }
        } catch (error) {
          errorCount++;
          console.log(`[${analyzerCode}] ❌ Result ${index + 1} → ERROR: ${error.message}`);
        }
      }

      // Mark as parsed
      await db.markMessageAsParsed(rawMessageId);

      console.log(`[${analyzerCode}] =====================================`);
      console.log(`[${analyzerCode}] 📊 BATCH SUMMARY - Message ${rawMessageId}:`);
      console.log(`[${analyzerCode}] • Total Results: ${results.length}`);
      console.log(`[${analyzerCode}] • ✅ Inserted: ${insertedCount}`);
      console.log(`[${analyzerCode}] • ⚠️  Duplicates: ${duplicateCount}`);
      console.log(`[${analyzerCode}] • ❌ Errors: ${errorCount}`);
      console.log(`[${analyzerCode}] • Status: ${errorCount === 0 ? 'SUCCESS' : 'PARTIAL'}`);
      console.log(`[${analyzerCode}] =====================================`);

    } catch (error) {
      console.error(`[${analyzerCode}] ❌ CRITICAL ERROR processing message:`, error.message);
      console.error(`[${analyzerCode}] Stack:`, error.stack);
    }
  }

  /**
   * Stop analyzer server(s) - handles multiple ports per analyzer
   */
  async stopAnalyzer(analyzerId, analyzerCode) {
    try {
      // Get all ports for this analyzer
      const ports = await db.getAnalyzerPorts(analyzerId);

      // Close all servers for this analyzer
      let stoppedCount = 0;
      for (const port of ports) {
        const serverKey = `${analyzerId}_${port.port_number}`;
        const server = this.servers.get(serverKey);
        
        if (server) {
          server.close(() => {
            console.log(`[${analyzerCode}] Server on port ${port.port_number} stopped`);
          });
          this.servers.delete(serverKey);
          stoppedCount++;
        }
      }

      // Close all connected sockets for this analyzer
      const sockets = this.sockets.get(analyzerId);
      if (sockets) {
        for (const socket of sockets) {
          socket.destroy();
        }
        this.sockets.delete(analyzerId);
      }

      console.log(`[${analyzerCode}] Stopped ${stoppedCount} server(s)`);

      // Update database
      await db.updateAnalyzerStatus(analyzerId, 'STOPPED');
    } catch (error) {
      console.error('[Manager] Error stopping analyzer:', error.message);
    }
  }

  /**
   * Get analyzer status (including all ports)
   */
  async getAnalyzerStatus(analyzerId) {
    try {
      const ports = await db.getAnalyzerPorts(analyzerId);
      const sockets = this.sockets.get(analyzerId) || new Set();
      
      const portStatus = {};
      for (const port of ports) {
        const serverKey = `${analyzerId}_${port.port_number}`;
        const server = this.servers.get(serverKey);
        portStatus[port.port_number] = {
          protocol: port.protocol,
          running: server ? true : false,
          active: port.is_active
        };
      }
      
      return {
        running: Object.values(portStatus).some(p => p.running),
        activeConnections: sockets.size,
        ports: portStatus
      };
    } catch (error) {
      console.error('[Manager] Error getting analyzer status:', error.message);
      return {
        running: false,
        activeConnections: 0,
        ports: {}
      };
    }
  }

  /**
   * Get all analyzer statuses
   */
  async getAllAnalyzerStatus() {
    try {
      const analyzers = await db.getAllAnalyzers();
      const status = {};

      for (const analyzer of analyzers) {
        const analyzerStatus = await this.getAnalyzerStatus(analyzer.id);
        const ports = await db.getAnalyzerPorts(analyzer.id);
        
        status[analyzer.analyzer_code] = {
          id: analyzer.id,
          code: analyzer.analyzer_code,
          name: analyzer.analyzer_name,
          manufacturer: analyzer.manufacturer,
          communication_type: analyzer.communication_type,
          is_active: analyzer.is_active,
          ...analyzerStatus,
          ports: ports.map(p => ({ 
            id: p.id, 
            port: p.port_number, 
            protocol: p.protocol, 
            active: p.is_active 
          }))
        };
      }

      return status;
    } catch (error) {
      console.error('[Manager] Error getting status:', error.message);
      return {};
    }
  }

  /**
   * Graceful shutdown
   */
  async shutdown() {
    console.log('[Manager] Shutting down all analyzers...');

    for (const [analyzerId, server] of this.servers) {
      const sockets = this.sockets.get(analyzerId) || new Set();
      
      // Close all sockets
      for (const socket of sockets) {
        socket.destroy();
      }

      // Close server
      await new Promise(resolve => {
        server.close(resolve);
      });
    }

    this.servers.clear();
    this.sockets.clear();
    console.log('[Manager] All analyzers shut down');
  }
}

module.exports = new AnalyzerManager();
