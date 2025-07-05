// EDtunnel - A Cloudflare Worker-based VLESS Proxy with WebSocket Transport (Optimized)
// @ts-ignore
import { connect } from "cloudflare:sockets";

// ======================================
// WebSocket Management
// ======================================

/**
 * Centralized WebSocket connection manager for VLESS proxy operations
 * Handles connection lifecycle, error management, and resource cleanup
 */
class WebSocketManager {
  constructor(config = {}) {
    this.config = {
      connectionTimeout: config.connectionTimeout || CONNECTION_TIMEOUT,
      maxRetries: config.maxRetries || MAX_RETRIES,
      wsReadyStateOpen: config.wsReadyStateOpen || WS_READY_STATE_OPEN,
      wsReadyStateClosing: config.wsReadyStateClosing || WS_READY_STATE_CLOSING,
      maxConnections: config.maxConnections || 1000,
      ...config
    };
    
    this.connections = new Map();
    this.connectionStats = {
      total: 0,
      active: 0,
      closed: 0,
      errors: 0,
      rejected: 0
    };
    
    // Memory management
    this.lastCleanup = Date.now();
  }

  /**
   * Creates a new WebSocket connection pair with proper initialization
   * @param {Request} request - The incoming request object
   * @returns {Object} Connection object with client, server, and metadata
   */
  createConnection(request) {
    // Check connection limits
    if (this.connections.size >= this.config.maxConnections) {
      this.connectionStats.rejected++;
      throw WorkerError.tooManyRequests("Maximum connections exceeded", {
        current: this.connections.size,
        max: this.config.maxConnections
      });
    }
    
    try {
      const webSocketPair = new WebSocketPair();
      const [client, webSocket] = Object.values(webSocketPair);
      
      const connectionId = this._generateConnectionId();
      const connectionLogger = logger.child({
        connectionId,
        type: "websocket",
      });

      const connection = {
        id: connectionId,
        client,
        webSocket,
        logger: connectionLogger,
        created: Date.now(),
        lastActivity: Date.now(),
        status: 'initializing',
        remoteSocketWrapper: { value: null },
        isDns: false,
        address: '',
        port: '',
        earlyDataHeader: request.headers.get("sec-websocket-protocol") || "",
        _eventListeners: new Map() // Track event listeners for cleanup
      };

      webSocket.accept();
      connection.status = 'connected';
      
      this.connections.set(connectionId, connection);
      this.connectionStats.total++;
      this.connectionStats.active++;

      connectionLogger.debug("WebSocket connection created", {
        connectionId,
        totalConnections: this.connectionStats.total,
        activeConnections: this.connectionStats.active
      });

      return connection;
    } catch (error) {
      this.connectionStats.errors++;
      throw WorkerError.internal("Failed to create WebSocket connection", {
        error: error.message
      });
    }
  }

  /**
   * Creates a readable stream from WebSocket with enhanced error handling and resource management
   * @param {Object} connection - Connection object from createConnection
   * @returns {ReadableStream} Stream of WebSocket data
   */
  createReadableStream(connection) {
    const { webSocket, logger: log, earlyDataHeader } = connection;
    let readableStreamCancel = false;
    let streamClosed = false;
    const self = this; // Capture this context
    
    // Track event listeners for cleanup
    const eventListeners = new Map();

    const stream = new ReadableStream({
      start(controller) {
        // Message handler with error recovery
        const messageHandler = (event) => {
          if (readableStreamCancel || streamClosed) return;
          try {
            connection.lastActivity = Date.now();
            const message = event.data;
            
            // Check message size to prevent memory issues
            if (message instanceof ArrayBuffer && message.byteLength > 1024 * 1024) { // 1MB limit
              log.warn("Large message received, potential memory impact", {
                size: message.byteLength,
                connectionId: connection.id
              });
            }
            
            controller.enqueue(message);
          } catch (enqueueError) {
            log.error("Error enqueuing WebSocket message", {
              error: enqueueError.message,
              connectionId: connection.id
            });
            controller.error(enqueueError);
          }
        };
        
        // Close handler with cleanup
        const closeHandler = (event) => {
          if (streamClosed) return;
          streamClosed = true;
          
          log.debug("WebSocket connection closed", {
            connectionId: connection.id,
            code: event.code,
            reason: event.reason
          });
          
          self._handleConnectionClose(connection);
          self._cleanupEventListeners(connection);
          
          if (!readableStreamCancel) {
            controller.close();
          }
        };
        
        // Error handler with cleanup
        const errorHandler = (err) => {
          if (streamClosed) return;
          streamClosed = true;
          
          log.error("WebSocket connection error", {
            error: err.message || "Unknown error",
            connectionId: connection.id
          });
          
          self._handleConnectionError(connection, err);
          self._cleanupEventListeners(connection);
          controller.error(err);
        };
        
        // Add event listeners and track them
        webSocket.addEventListener("message", messageHandler);
        webSocket.addEventListener("close", closeHandler);
        webSocket.addEventListener("error", errorHandler);
        
        eventListeners.set("message", messageHandler);
        eventListeners.set("close", closeHandler);
        eventListeners.set("error", errorHandler);
        connection._eventListeners = eventListeners;

        // Process early data with validation
        try {
          const { earlyData, error } = base64ToArrayBuffer(earlyDataHeader);
          if (error) {
            controller.error(error);
          } else if (earlyData) {
            controller.enqueue(earlyData);
          }
        } catch (parseError) {
          log.error("Error parsing early data", {
            error: parseError.message,
            connectionId: connection.id
          });
          controller.error(parseError);
        }
      },

      pull(_controller) {
        // Implement backpressure monitoring
        connection.lastActivity = Date.now();
      },

      cancel(reason) {
        log.debug("WebSocket stream cancelled", {
          reason: reason?.toString(),
          connectionId: connection.id
        });
        readableStreamCancel = true;
        streamClosed = true;
        self._cleanupEventListeners(connection);
        self.closeConnection(connection.id);
      }
    });

    return stream;
  }

  /**
   * Safely closes a WebSocket connection with cleanup
   * @param {string} connectionId - Connection ID to close
   * @param {number} code - Close code (optional)
   * @param {string} reason - Close reason (optional)
   */
  closeConnection(connectionId, code = 1000, reason = "Normal closure") {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    try {
      if (connection.webSocket && 
          (connection.webSocket.readyState === this.config.wsReadyStateOpen ||
           connection.webSocket.readyState === this.config.wsReadyStateClosing)) {
        connection.webSocket.close(code, reason);
      }

      if (connection.remoteSocketWrapper?.value) {
        try {
          connection.remoteSocketWrapper.value.close();
        } catch (socketError) {
          connection.logger.warn("Error closing remote socket", {
            error: socketError.message,
            connectionId
          });
        }
      }

      connection.status = 'closed';
      connection.logger.debug("Connection closed successfully", {
        connectionId,
        code,
        reason
      });
      
    } catch (error) {
      connection.logger.error("Error during connection closure", {
        error: error.message,
        connectionId
      });
    } finally {
      this._cleanupConnection(connectionId);
    }
  }

  /**
   * Gets connection by ID
   * @param {string} connectionId - Connection ID
   * @returns {Object|null} Connection object or null if not found
   */
  getConnection(connectionId) {
    return this.connections.get(connectionId) || null;
  }

  /**
   * Gets connection statistics
   * @returns {Object} Connection statistics
   */
  getStats() {
    return {
      ...this.connectionStats,
      activeConnections: Array.from(this.connections.values()).filter(
        conn => conn.status === 'connected'
      ).length
    };
  }

  /**
   * Cleanup inactive connections based on timeout
   * @param {number} timeoutMs - Timeout in milliseconds
   */
  cleanupInactiveConnections(timeoutMs = 300000) { // 5 minutes default
    const now = Date.now();
    const inactiveConnections = [];

    for (const [id, connection] of this.connections) {
      if (now - connection.lastActivity > timeoutMs) {
        inactiveConnections.push(id);
      }
    }

    inactiveConnections.forEach(id => {
      logger.debug("Cleaning up inactive connection", { connectionId: id });
      this.closeConnection(id, 1001, "Connection timeout");
    });

    return inactiveConnections.length;
  }

  /**
   * Private method to generate unique connection ID
   * @returns {string} Unique connection ID
   */
  _generateConnectionId() {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
  }

  /**
   * Private method to handle connection close events
   * @param {Object} connection - Connection object
   */
  _handleConnectionClose(connection) {
    connection.status = 'closing';
    this.connectionStats.active = Math.max(0, this.connectionStats.active - 1);
    this.connectionStats.closed++;
  }

  /**
   * Private method to handle connection errors
   * @param {Object} connection - Connection object
   * @param {Error} error - Error object
   */
  _handleConnectionError(connection, error) {
    connection.status = 'error';
    this.connectionStats.errors++;
    
    connection.logger.error("WebSocket connection error handled", {
      error: error.message,
      connectionId: connection.id
    });
  }

  /**
   * Private method to cleanup event listeners
   * @param {Object} connection - Connection object
   */
  _cleanupEventListeners(connection) {
    if (connection._eventListeners && connection.webSocket) {
      try {
        for (const [eventType, handler] of connection._eventListeners) {
          connection.webSocket.removeEventListener(eventType, handler);
        }
        connection._eventListeners.clear();
      } catch (error) {
        connection.logger?.warn("Error cleaning up event listeners", {
          error: error.message,
          connectionId: connection.id
        });
      }
    }
  }
  
  /**
   * Private method to cleanup connection resources
   * @param {string} connectionId - Connection ID to cleanup
   */
  _cleanupConnection(connectionId) {
    const connection = this.connections.get(connectionId);
    if (connection) {
      if (this.connectionStats.active > 0 && connection.status === 'connected') {
        this.connectionStats.active--;
      }
      
      // Clean up event listeners to prevent memory leaks
      this._cleanupEventListeners(connection);
      
      // Clear any remaining references
      connection.client = null;
      connection.webSocket = null;
      connection.logger = null;
      connection.remoteSocketWrapper = null;
      
      this.connections.delete(connectionId);
    }
  }
  
  /**
   * Force cleanup of all connections and resources
   */
  forceCleanup() {
    const now = Date.now();
    
    // Close all connections older than 10 minutes
    for (const [id, connection] of this.connections) {
      if (now - connection.created > 600000) {
        this.closeConnection(id, 1001, "Force cleanup");
      }
    }
    
    // Update last cleanup time
    this.lastCleanup = now;
    
    // Log cleanup statistics
    logger.info("Force cleanup completed", {
      connectionsRemaining: this.connections.size,
      stats: this.connectionStats
    });
  }
}

// Global WebSocket manager instance with resource limits
let globalWSManager = null;
let cleanupIntervalId = null;

/**
 * Initialize global WebSocket manager with default configuration
 * @param {Object} config - Configuration object
 */
function initializeGlobalWSManager(config = {}) {
  if (!globalWSManager) {
    globalWSManager = new WebSocketManager({
      connectionTimeout: CONNECTION_TIMEOUT,
      maxRetries: MAX_RETRIES,
      wsReadyStateOpen: WS_READY_STATE_OPEN,
      wsReadyStateClosing: WS_READY_STATE_CLOSING,
      maxConnections: 1000, // Limit concurrent connections
      ...config
    });
    
    // Set up more aggressive cleanup for better memory management
    if (typeof setInterval !== 'undefined') {
      cleanupIntervalId = setInterval(() => {
        if (globalWSManager) {
          const cleaned = globalWSManager.cleanupInactiveConnections();
          if (cleaned > 0) {
            logger.info(`Cleaned up ${cleaned} inactive WebSocket connections`);
          }
          
          // Force garbage collection if connection count is high
          const stats = globalWSManager.getStats();
          if (stats.activeConnections > 500) {
            globalWSManager.forceCleanup();
          }
        }
      }, 60000); // Every 1 minute for better resource management
    }
  }
  return globalWSManager;
}

/**
 * Cleanup global WebSocket manager resources
 */
function cleanupGlobalWSManager() {
  if (cleanupIntervalId) {
    clearInterval(cleanupIntervalId);
    cleanupIntervalId = null;
  }
  if (globalWSManager) {
    globalWSManager.forceCleanup();
    globalWSManager = null;
  }
}

/**
 * Global cache cleanup function
 */
function performGlobalCleanup() {
  const now = Date.now();
  let totalCacheSize = uuidCache.size + addressCache.size + validationCache.size;
  
  logger.info("Performing global cache cleanup", {
    uuidCacheSize: uuidCache.size,
    addressCacheSize: addressCache.size,
    validationCacheSize: validationCache.size,
    totalCacheSize
  });
  
  // Clear caches if they're getting too large
  if (totalCacheSize > CACHE_SIZE_LIMIT * 3) {
    const keepRatio = 0.3; // Keep 30% of entries
    
    // Clear UUID cache
    if (uuidCache.size > 0) {
      const uuidEntries = Array.from(uuidCache.entries());
      const keepCount = Math.floor(uuidEntries.length * keepRatio);
      uuidCache.clear();
      uuidEntries.slice(-keepCount).forEach(([k, v]) => uuidCache.set(k, v));
    }
    
    // Clear address cache
    if (addressCache.size > 0) {
      const addressEntries = Array.from(addressCache.entries());
      const keepCount = Math.floor(addressEntries.length * keepRatio);
      addressCache.clear();
      addressEntries.slice(-keepCount).forEach(([k, v]) => addressCache.set(k, v));
    }
    
    // Clear validation cache
    if (validationCache.size > 0) {
      const validationEntries = Array.from(validationCache.entries());
      const keepCount = Math.floor(validationEntries.length * keepRatio);
      validationCache.clear();
      validationEntries.slice(-keepCount).forEach(([k, v]) => validationCache.set(k, v));
    }
    
    logger.info("Cache cleanup completed", {
      before: totalCacheSize,
      after: uuidCache.size + addressCache.size + validationCache.size
    });
  }
  
  // Cleanup WebSocket manager if needed
  if (globalWSManager) {
    const stats = globalWSManager.getStats();
    if (stats.activeConnections > 800) {
      globalWSManager.forceCleanup();
    }
  }
}

/**
 * Get comprehensive performance and memory statistics
 * @returns {Object} Statistics object with memory and performance data
 */
function getWSManagerStats() {
  const stats = {
    timestamp: Date.now(),
    caches: {
      uuid: uuidCache.size,
      address: addressCache.size,
      validation: validationCache.size,
      total: uuidCache.size + addressCache.size + validationCache.size
    }
  };
  
  if (globalWSManager) {
    stats.webSocket = globalWSManager.getStats();
  } else {
    stats.webSocket = { error: "WebSocket manager not initialized" };
  }
  
  return stats;
}

/**
 * Trigger periodic cleanup based on cache sizes
 */
function conditionalCleanup() {
  const totalCacheSize = uuidCache.size + addressCache.size + validationCache.size;
  
  // Trigger cleanup if cache sizes are high
  if (totalCacheSize > CACHE_SIZE_LIMIT * 2) {
    performGlobalCleanup();
  }
}

// ======================================
// Error Handling
// ======================================

/**
 * Unified error class for Cloudflare Worker operations
 * Provides structured error handling with proper HTTP status codes and context
 */
class WorkerError extends Error {
  constructor(message, status = 500, code = null, context = null) {
    super(message);
    this.name = "WorkerError";
    this.status = status;
    this.code = code;
    this.context = context;
    this.timestamp = new Date().toISOString();

    // Ensure proper prototype chain
    Object.setPrototypeOf(this, WorkerError.prototype);
  }

  /**
   * Create a 400 Bad Request error
   */
  static badRequest(message, context = null) {
    return new WorkerError(message, 400, "BAD_REQUEST", context);
  }

  /**
   * Create a 401 Unauthorized error
   */
  static unauthorized(message, context = null) {
    return new WorkerError(message, 401, "UNAUTHORIZED", context);
  }

  /**
   * Create a 403 Forbidden error
   */
  static forbidden(message, context = null) {
    return new WorkerError(message, 403, "FORBIDDEN", context);
  }

  /**
   * Create a 404 Not Found error
   */
  static notFound(message, context = null) {
    return new WorkerError(message, 404, "NOT_FOUND", context);
  }

  /**
   * Create a 408 Request Timeout error
   */
  static timeout(message, context = null) {
    return new WorkerError(message, 408, "TIMEOUT", context);
  }

  /**
   * Create a 413 Payload Too Large error
   */
  static payloadTooLarge(message, context = null) {
    return new WorkerError(message, 413, "PAYLOAD_TOO_LARGE", context);
  }

  /**
   * Create a 429 Too Many Requests error
   */
  static tooManyRequests(message, context = null) {
    return new WorkerError(message, 429, "TOO_MANY_REQUESTS", context);
  }

  /**
   * Create a 500 Internal Server Error
   */
  static internal(message, context = null) {
    return new WorkerError(message, 500, "INTERNAL_ERROR", context);
  }

  /**
   * Create a 502 Bad Gateway error
   */
  static badGateway(message, context = null) {
    return new WorkerError(message, 502, "BAD_GATEWAY", context);
  }

  /**
   * Create a 503 Service Unavailable error
   */
  static serviceUnavailable(message, context = null) {
    return new WorkerError(message, 503, "SERVICE_UNAVAILABLE", context);
  }

  /**
   * Create a 504 Gateway Timeout error
   */
  static gatewayTimeout(message, context = null) {
    return new WorkerError(message, 504, "GATEWAY_TIMEOUT", context);
  }

  /**
   * Convert WorkerError to Response object
   */
  toResponse() {
    const isDev = globalThis.DEBUG === "true";

    const errorResponse = {
      error: {
        message: this.message,
        code: this.code,
        timestamp: this.timestamp,
      },
    };

    // Include context and stack in development mode
    if (isDev) {
      if (this.context) {
        errorResponse.error.context = this.context;
      }
      if (this.stack) {
        errorResponse.error.stack = this.stack;
      }
    }

    return new Response(JSON.stringify(errorResponse), {
      status: this.status,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache",
      },
    });
  }

  /**
   * Log error with structured format
   */
  log() {
    const logData = {
      level: "error",
      message: this.message,
      code: this.code,
      status: this.status,
      context: this.context,
      timestamp: this.timestamp,
    };

    console.error("[WorkerError]", JSON.stringify(logData));
  }
}

// ======================================
// Logging
// ======================================

/**
 * Structured logging class for Cloudflare Workers
 * Provides standardized logging with different levels and structured output
 */
class Logger {
  constructor(level = "INFO", prefix = "EDtunnel") {
    this.levels = {
      ERROR: 0,
      WARN: 1,
      INFO: 2,
      DEBUG: 3,
      VERBOSE: 4,
    };

    this.currentLevel = this.levels[level.toUpperCase()] ?? this.levels["INFO"];
    this.prefix = prefix;
    this.isDev = globalThis.DEBUG === "true";
  }

  /**
   * Create structured log entry
   * @param {string} level - Log level
   * @param {string} message - Log message
   * @param {Object} metadata - Additional metadata
   * @returns {Object} Structured log entry
   */
  _createLogEntry(level, message, metadata = {}) {
    const entry = {
      timestamp: new Date().toISOString(),
      level: level.toUpperCase(),
      prefix: this.prefix,
      message,
      ...metadata,
    };

    if (this.isDev && metadata.context) {
      entry.context = metadata.context;
    }

    return entry;
  }

  /**
   * Output log entry to console
   * @param {Object} logEntry - Structured log entry
   * @param {string} level - Log level
   */
  _output(logEntry, level) {
    const levelNumber = this.levels[level];
    if (levelNumber > this.currentLevel) return;

    const formatted = `[${logEntry.timestamp}] [${logEntry.level}] [${logEntry.prefix}] ${logEntry.message}`;

    if (this.isDev) {
      // In development, output full structured log
      console.log(formatted, logEntry);
    } else {
      // In production, output simplified format
      switch (level) {
        case "ERROR":
          console.error(formatted);
          break;
        case "WARN":
          console.warn(formatted);
          break;
        case "DEBUG":
        case "VERBOSE":
          console.debug ? console.debug(formatted) : console.log(formatted);
          break;
        default:
          console.log(formatted);
      }
    }
  }

  /**
   * Log error message
   * @param {string} message - Error message
   * @param {Object} metadata - Additional metadata
   */
  error(message, metadata = {}) {
    const logEntry = this._createLogEntry("ERROR", message, metadata);
    this._output(logEntry, "ERROR");
    return logEntry;
  }

  /**
   * Log warning message
   * @param {string} message - Warning message
   * @param {Object} metadata - Additional metadata
   */
  warn(message, metadata = {}) {
    const logEntry = this._createLogEntry("WARN", message, metadata);
    this._output(logEntry, "WARN");
    return logEntry;
  }

  /**
   * Log info message
   * @param {string} message - Info message
   * @param {Object} metadata - Additional metadata
   */
  info(message, metadata = {}) {
    const logEntry = this._createLogEntry("INFO", message, metadata);
    this._output(logEntry, "INFO");
    return logEntry;
  }

  /**
   * Log debug message
   * @param {string} message - Debug message
   * @param {Object} metadata - Additional metadata
   */
  debug(message, metadata = {}) {
    const logEntry = this._createLogEntry("DEBUG", message, metadata);
    this._output(logEntry, "DEBUG");
    return logEntry;
  }

  /**
   * Log verbose message
   * @param {string} message - Verbose message
   * @param {Object} metadata - Additional metadata
   */
  verbose(message, metadata = {}) {
    const logEntry = this._createLogEntry("VERBOSE", message, metadata);
    this._output(logEntry, "VERBOSE");
    return logEntry;
  }

  /**
   * Create a child logger with additional context
   * @param {Object} context - Additional context for child logger
   * @returns {Logger} Child logger instance
   */
  child(context = {}) {
    const childLogger = new Logger(
      Object.keys(this.levels).find(
        (key) => this.levels[key] === this.currentLevel
      ),
      this.prefix
    );
    childLogger.childContext = { ...this.childContext, ...context };
    return childLogger;
  }

  /**
   * Log with custom level
   * @param {string} level - Custom log level
   * @param {string} message - Log message
   * @param {Object} metadata - Additional metadata
   */
  log(level, message, metadata = {}) {
    if (this.childContext) {
      metadata = { ...metadata, ...this.childContext };
    }

    switch (level.toUpperCase()) {
      case "ERROR":
        return this.error(message, metadata);
      case "WARN":
        return this.warn(message, metadata);
      case "INFO":
        return this.info(message, metadata);
      case "DEBUG":
        return this.debug(message, metadata);
      case "VERBOSE":
        return this.verbose(message, metadata);
      default:
        return this.info(message, metadata);
    }
  }

  /**
   * Set log level
   * @param {string} level - New log level
   */
  setLevel(level) {
    this.currentLevel = this.levels[level.toUpperCase()] ?? this.levels["INFO"];
  }

  /**
   * Get current log level
   * @returns {string} Current log level
   */
  getLevel() {
    return Object.keys(this.levels).find(
      (key) => this.levels[key] === this.currentLevel
    );
  }
}

// Create global logger instance
const logger = new Logger(globalThis.LOG_LEVEL || "INFO", "EDtunnel");

// ======================================
// Configuration
// ======================================

/**
 * Centralized configuration management class for Cloudflare Workers
 * Handles environment variables, validation, and defaults
 */
class WorkerConfig {
  constructor(env = {}, urlParams = {}) {
    // Default configuration values
    this.defaults = {
      userID: "d342d11e-d424-4583-b36e-524ab1f0afa4",
      proxyIPs: ["cdn.xn--b6gac.eu.org:443", "cdn-all.xn--b6gac.eu.org:443"],
      socks5Address: "",
      socks5Relay: false,
      maxRetries: 3,
      connectionTimeout: 30000,
      wsReadyStateOpen: 1,
      wsReadyStateClosing: 2,
    };

    // Validation patterns (cached for performance)
    this.patterns = {
      proxy:
        /^([a-zA-Z0-9][-a-zA-Z0-9.]*(\.[-a-zA-Z0-9.]*)+|\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}|\[[0-9a-fA-F:]+\]):\d{1,5}$/,
      socks5:
        /^(([^:@]+:[^:@]+@)?[-a-zA-Z0-9.]*(\.[-a-zA-Z0-9.]*)+|\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}):\d{1,5}$/,
      uuid: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    };

    // Initialize configuration from environment and URL parameters
    this._initializeConfig(env, urlParams);

    // Validate configuration
    this._validateConfig();
  }

  /**
   * Initialize configuration from environment variables and URL parameters
   * @param {Object} env - Environment variables
   * @param {Object} urlParams - URL parameters
   */
  _initializeConfig(env, urlParams) {
    // Primary configuration (environment takes precedence over defaults)
    this.userID = env.UUID || this.defaults.userID;
    this.socks5Address =
      urlParams.socks5 || env.SOCKS5 || this.defaults.socks5Address;
    this.socks5Relay =
      this._parseBoolean(urlParams.socks5_relay) ||
      this._parseBoolean(env.SOCKS5_RELAY) ||
      this.defaults.socks5Relay;

    // Proxy configuration
    const proxyConfig = this._initializeProxyConfig(
      env.PROXYIP || urlParams.proxyip
    );
    this.proxyIP = proxyConfig.ip;
    this.proxyPort = proxyConfig.port;

    // SOCKS5 configuration
    this.enableSocks = false;
    this.parsedSocks5Address = {};
    if (this.socks5Address) {
      try {
        const selectedSocks5 = this._selectRandomAddress(this.socks5Address);
        this.parsedSocks5Address = this._parseSocks5Address(selectedSocks5);
        this.enableSocks = true;
      } catch (err) {
        logger.warn("SOCKS5 configuration error", {
          error: err.message,
          socks5Address: this.socks5Address,
        });
        this.enableSocks = false;
      }
    }

    // Constants
    this.maxRetries = this.defaults.maxRetries;
    this.connectionTimeout = this.defaults.connectionTimeout;
    this.wsReadyStateOpen = this.defaults.wsReadyStateOpen;
    this.wsReadyStateClosing = this.defaults.wsReadyStateClosing;
  }

  /**
   * Initialize proxy configuration
   * @param {string} proxyIP - Proxy IP configuration
   * @returns {Object} Proxy configuration
   */
  _initializeProxyConfig(proxyIP) {
    try {
      if (proxyIP && this._validateProxyAddress(proxyIP)) {
        const proxyAddresses = proxyIP
          .split(",")
          .map((addr) => addr.trim())
          .filter((addr) => addr);
        const selectedProxy = this._selectRandomAddress(proxyAddresses);
        const [ip, port = "443"] = selectedProxy.split(":");
        return { ip, port };
      } else {
        // Use default proxy IPs
        const selectedProxy = this._selectRandomAddress(this.defaults.proxyIPs);
        const [ip, port = "443"] = selectedProxy.split(":");
        return { ip, port };
      }
    } catch (error) {
      logger.warn("Error handling proxy config", {
        error: error.message,
        proxyIP,
      });
      const [ip, port = "443"] = this.defaults.proxyIPs[0].split(":");
      return { ip, port };
    }
  }

  /**
   * Parse boolean values from strings
   * @param {any} value - Value to parse
   * @returns {boolean} Parsed boolean value
   */
  _parseBoolean(value) {
    if (typeof value === "boolean") return value;
    if (typeof value === "string") return value.toLowerCase() === "true";
    return false;
  }

  /**
   * Validate the entire configuration
   */
  _validateConfig() {
    // Validate UUID
    if (!this._isValidUUID(this.userID)) {
      // For comma-separated UUIDs, validate each one
      const uuids = this.userID.includes(",")
        ? this.userID.split(",").map((id) => id.trim())
        : [this.userID];
      const invalidUUIDs = uuids.filter((uuid) => !this._isValidUUID(uuid));
      if (invalidUUIDs.length > 0) {
        throw WorkerError.badRequest("Invalid UUID(s) found", { invalidUUIDs });
      }
    }

    // Validate proxy configuration if provided
    if (
      this.proxyIP &&
      !this.patterns.proxy.test(`${this.proxyIP}:${this.proxyPort}`)
    ) {
      logger.warn("Invalid proxy configuration, using defaults", {
        invalidProxy: `${this.proxyIP}:${this.proxyPort}`,
        fallback: this.defaults.proxyIPs[0],
      });
      const [ip, port = "443"] = this.defaults.proxyIPs[0].split(":");
      this.proxyIP = ip;
      this.proxyPort = port;
    }
  }

  /**
   * Validate UUID format
   * @param {string} uuid - UUID to validate
   * @returns {boolean} True if valid
   */
  _isValidUUID(uuid) {
    if (typeof uuid !== "string") return false;
    return this.patterns.uuid.test(uuid);
  }

  /**
   * Validate proxy address format
   * @param {string} proxyAddresses - Comma-separated proxy addresses
   * @returns {boolean} True if all addresses are valid
   */
  _validateProxyAddress(proxyAddresses) {
    const addresses = proxyAddresses.split(",").map((addr) => addr.trim());
    return addresses.every((addr) =>
      this._validateInput(addr, this.patterns.proxy)
    );
  }

  /**
   * Validate SOCKS5 address format
   * @param {string} socks5Addresses - Comma-separated SOCKS5 addresses
   * @returns {boolean} True if all addresses are valid
   */
  _validateSocks5Address(socks5Addresses) {
    const addresses = socks5Addresses.split(",").map((addr) => addr.trim());
    return addresses.every((addr) =>
      this._validateInput(addr, this.patterns.socks5)
    );
  }

  /**
   * Enhanced input validation with security checks
   * @param {string} input - Input string to validate
   * @param {RegExp} pattern - Validation pattern
   * @param {number} maxLength - Maximum allowed length
   * @returns {boolean} Validation result
   */
  _validateInput(input, pattern, maxLength = 2048) {
    if (!input || typeof input !== "string") return false;
    if (input.length > maxLength) return false;
    if (input.includes("<") || input.includes(">")) return false; // Basic XSS prevention
    return pattern.test(input);
  }

  /**
   * Optimized random address selection for WorkerConfig
   * @param {string|string[]} addresses - Addresses to choose from
   * @returns {string} Selected address
   */
  _selectRandomAddress(addresses) {
    try {
      let addressArray;
      if (typeof addresses === "string") {
        // Use optimized parsing with caching
        addressArray = parseAddresses(addresses);
      } else {
        addressArray = addresses.filter((addr) => addr);
      }

      if (addressArray.length === 0) {
        throw WorkerError.badRequest("No valid addresses provided", {
          originalAddresses: addresses,
        });
      }

      // Use optimized selection
      const selected = optimizedRandomSelect(addressArray, `config-${typeof addresses === 'string' ? addresses : addresses.join(',')}`);
      return selected;
    } catch (error) {
      logger.warn("Error selecting random address", {
        error: error.message,
        addresses,
        fallback: this.defaults.proxyIPs[0],
      });
      return this.defaults.proxyIPs[0]; // Fallback to first proxy IP
    }
  }

  /**
   * Parse SOCKS5 address string
   * @param {string} address - SOCKS5 address string
   * @returns {Object} Parsed address information
   */
  _parseSocks5Address(address) {
    try {
      let [latter, former] = address.split("@").reverse();
      let username, password, hostname, port;

      if (former) {
        const formers = former.split(":");
        if (formers.length !== 2) {
          throw WorkerError.badRequest(
            "Invalid SOCKS address format: credentials must be username:password",
            {
              address,
              credentialsParts: formers.length,
            }
          );
        }
        [username, password] = formers;
      }

      const latters = latter.split(":");
      const portStr = latters.pop();
      port = Number(portStr);

      if (isNaN(port) || port <= 0 || port > 65535) {
        throw WorkerError.badRequest(
          "Invalid SOCKS address format: invalid port number",
          {
            address,
            port: portStr,
            validRange: "1-65535",
          }
        );
      }

      hostname = latters.join(":");
      const regex = /^\[.*\]$/;

      if (hostname.includes(":") && !regex.test(hostname)) {
        throw WorkerError.badRequest(
          "Invalid SOCKS address format: IPv6 address must be wrapped in brackets",
          {
            address,
            hostname,
          }
        );
      }

      if (!hostname) {
        throw WorkerError.badRequest(
          "Invalid SOCKS address format: hostname cannot be empty",
          {
            address,
          }
        );
      }

      return { username, password, hostname, port };
    } catch (error) {
      if (error instanceof WorkerError) {
        throw error;
      }
      throw WorkerError.badRequest(
        `SOCKS5 address parsing failed: ${error.message}`,
        {
          address,
          originalError: error.message,
        }
      );
    }
  }

  /**
   * Create request-specific configuration from URL parameters
   * @param {Object} urlParams - URL parameters
   * @returns {WorkerConfig} New configuration instance
   */
  createRequestConfig(urlParams) {
    // Create a new config instance with current env but new URL params
    const requestConfig = new WorkerConfig(
      {
        UUID: this.userID,
        SOCKS5: this.socks5Address,
        SOCKS5_RELAY: this.socks5Relay.toString(),
        PROXYIP: `${this.proxyIP}:${this.proxyPort}`,
      },
      urlParams
    );

    return requestConfig;
  }

  /**
   * Get configuration summary for logging
   * @returns {Object} Configuration summary
   */
  getConfigSummary() {
    return {
      hasUserID: !!this.userID,
      userIDCount: this.userID.includes(",")
        ? this.userID.split(",").length
        : 1,
      proxyIP: this.proxyIP,
      proxyPort: this.proxyPort,
      hasSocks5: this.enableSocks,
      socks5Relay: this.socks5Relay,
      connectionTimeout: this.connectionTimeout,
      maxRetries: this.maxRetries,
    };
  }
}

// Legacy variables for backward compatibility (will be removed after refactoring)
let userID = "d342d11e-d424-4583-b36e-524ab1f0afa4";
const proxyIPs = ["cdn.xn--b6gac.eu.org:443", "cdn-all.xn--b6gac.eu.org:443"];
let proxyIP = proxyIPs[Math.floor(Math.random() * proxyIPs.length)];
let proxyPort = proxyIP.includes(":") ? proxyIP.split(":")[1] : "443";
let socks5Address = "";
let socks5Relay = false;

// Global validation patterns (cached for performance)
const PROXY_PATTERN =
  /^([a-zA-Z0-9][-a-zA-Z0-9.]*(\.[-a-zA-Z0-9.]*)+|\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}|\[[0-9a-fA-F:]+\]):\d{1,5}$/;
const SOCKS5_PATTERN =
  /^(([^:@]+:[^:@]+@)?[-a-zA-Z0-9.]*(\.[-a-zA-Z0-9.]*)+|\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}):\d{1,5}$/;

// Constants
const WS_READY_STATE_OPEN = 1;
const WS_READY_STATE_CLOSING = 2;
const MAX_RETRIES = 3;
const CONNECTION_TIMEOUT = 30000; // 30 seconds

if (!isValidUUID(userID)) {
  throw WorkerError.badRequest("UUID is not valid", { userID });
}

let parsedSocks5Address = {};
let enableSocks = false;

/**
 * Creates immutable request configuration to avoid state pollution
 * @param {Object} env - Environment variables
 * @param {Object} urlParams - URL parameters
 * @returns {Object} Request configuration
 */
function createRequestConfig(env, urlParams) {
  return Object.freeze({
    userID: env.UUID || userID,
    socks5Address: urlParams.socks5 || env.SOCKS5 || socks5Address,
    socks5Relay:
      urlParams.socks5_relay === "true" ||
      env.SOCKS5_RELAY === "true" ||
      socks5Relay,
    proxyIP: null,
    proxyPort: null,
    enableSocks: false,
    parsedSocks5Address: {},
  });
}

/**
 * Enhanced error handler with WorkerError integration
 * @param {Error|WorkerError} error - The error object
 * @param {string} context - Error context for debugging
 * @returns {Response} Error response
 */
function handleError(error, context = "Unknown") {
  // If it's already a WorkerError, use its toResponse method
  if (error instanceof WorkerError) {
    error.log();
    return error.toResponse();
  }

  // Convert regular Error to WorkerError
  const workerError = WorkerError.internal(
    error instanceof Error ? error.message : "Internal server error",
    { originalContext: context, originalStack: error.stack }
  );

  workerError.log();
  return workerError.toResponse();
}

/**
 * Enhanced input validation with security checks
 * @param {string} input - Input string to validate
 * @param {RegExp} pattern - Validation pattern
 * @param {number} maxLength - Maximum allowed length
 * @returns {boolean} Validation result
 */
function validateInput(input, pattern, maxLength = 2048) {
  if (!input || typeof input !== "string") return false;
  if (input.length > maxLength) return false;
  if (input.includes("<") || input.includes(">")) return false; // Basic XSS prevention
  return pattern.test(input);
}

/**
 * Main handler for the Cloudflare Worker. Processes incoming requests and routes them appropriately.
 * @param {import("@cloudflare/workers-types").Request} request - The incoming request object
 * @param {Object} env - Environment variables containing configuration
 * @param {string} env.UUID - User ID for authentication
 * @param {string} env.PROXYIP - Proxy server IP address
 * @param {string} env.SOCKS5 - SOCKS5 proxy configuration
 * @param {string} env.SOCKS5_RELAY - SOCKS5 relay mode flag
 * @returns {Promise<Response>} Response object
 */
export default {
  /**
   * @param {import("@cloudflare/workers-types").Request} request
   * @param {{UUID: string, PROXYIP: string, SOCKS5: string, SOCKS5_RELAY: string}} env
   * @param {import("@cloudflare/workers-types").ExecutionContext} ctx
   * @returns {Promise<Response>}
   */
  async fetch(request, env) {
    try {
      // Initialize global WebSocket manager if not already done
      initializeGlobalWSManager();
      
      // Perform conditional cleanup to manage memory
      conditionalCleanup();
      
      const url = new URL(request.url);

      // Parse URL parameters safely
      const urlParams = {
        proxyip: url.searchParams.get("proxyip"),
        socks5: url.searchParams.get("socks5"),
        socks5_relay: url.searchParams.get("socks5_relay"),
      };

      // Check for encoded parameters in path
      if (!urlParams.proxyip && !urlParams.socks5 && !urlParams.socks5_relay) {
        const encodedParams = parseEncodedQueryParams(url.pathname);
        urlParams.proxyip = urlParams.proxyip || encodedParams.proxyip;
        urlParams.socks5 = urlParams.socks5 || encodedParams.socks5;
        urlParams.socks5_relay =
          urlParams.socks5_relay || encodedParams.socks5_relay;
      }

      // Create centralized configuration using WorkerConfig class
      const workerConfig = new WorkerConfig(env, urlParams);

      // Log configuration summary for debugging
      logger.info("Worker Configuration initialized", {
        config: workerConfig.getConfigSummary(),
        url: url.pathname,
        stats: getWSManagerStats() // Include performance stats
      });

      // Route handling
      const userIDs = workerConfig.userID.includes(",")
        ? workerConfig.userID.split(",").map((id) => id.trim())
        : [workerConfig.userID];

      const host = request.headers.get("Host");
      const requestedPath = url.pathname.substring(1);
      const matchingUserID = findMatchingUserID(userIDs, requestedPath);

      // Handle non-WebSocket requests
      if (request.headers.get("Upgrade") !== "websocket") {
        if (url.pathname === "/cf") {
          return new Response(JSON.stringify(request.cf, null, 4), {
            status: 200,
            headers: { "Content-Type": "application/json;charset=utf-8" },
          });
        }
        
        // Performance monitoring endpoint
        if (url.pathname === "/stats" || url.pathname === "/performance") {
          const stats = getWSManagerStats();
          return new Response(JSON.stringify(stats, null, 2), {
            status: 200,
            headers: { 
              "Content-Type": "application/json;charset=utf-8",
              "Cache-Control": "no-cache"
            },
          });
        }
        
        // Manual cleanup endpoint
        if (url.pathname === "/cleanup") {
          performGlobalCleanup();
          const stats = getWSManagerStats();
          return new Response(JSON.stringify({
            message: "Cleanup completed",
            stats
          }, null, 2), {
            status: 200,
            headers: { 
              "Content-Type": "application/json;charset=utf-8",
              "Cache-Control": "no-cache"
            },
          });
        }

        if (matchingUserID) {
          return await handleUserRoutes(
            url,
            matchingUserID,
            host,
            env.PROXYIP,
            workerConfig
          );
        }

        return handleDefaultPath(url, request);
      } else {
        // Handle WebSocket connections
        return await ProtocolOverWSHandler(request, workerConfig);
      }
    } catch (err) {
      return handleError(err, "Main Handler");
    }
  },
};

/**
 * Enhanced proxy address validation
 * @param {string} proxyAddresses - Comma-separated proxy addresses
 * @returns {boolean} Validation result
 */
function validateProxyAddress(proxyAddresses) {
  const addresses = proxyAddresses.split(",").map((addr) => addr.trim());
  return addresses.every((addr) => validateInput(addr, PROXY_PATTERN));
}

/**
 * Enhanced SOCKS5 address validation
 * @param {string} socks5Addresses - Comma-separated SOCKS5 addresses
 * @returns {boolean} Validation result
 */
function validateSocks5Address(socks5Addresses) {
  const addresses = socks5Addresses.split(",").map((addr) => addr.trim());
  return addresses.every((addr) => validateInput(addr, SOCKS5_PATTERN));
}

/**
 * Find matching user ID from request path
 * @param {string[]} userIDs - Array of user IDs
 * @param {string} requestedPath - Requested path
 * @returns {string|null} Matching user ID or null
 */
function findMatchingUserID(userIDs, requestedPath) {
  if (userIDs.length === 1) {
    const patterns = [userIDs[0], `sub/${userIDs[0]}`, `bestip/${userIDs[0]}`];
    return patterns.some((pattern) => requestedPath === pattern)
      ? userIDs[0]
      : null;
  }

  return (
    userIDs.find((id) => {
      const patterns = [id, `sub/${id}`, `bestip/${id}`];
      return patterns.some((pattern) => requestedPath.startsWith(pattern));
    }) || null
  );
}

/**
 * Handle user-specific routes
 * @param {URL} url - Request URL
 * @param {string} userID - Matching user ID
 * @param {string} host - Request host
 * @param {string} proxyIP - Proxy IP configuration
 * @param {Object} config - Request configuration
 * @returns {Promise<Response>} Response
 */
async function handleUserRoutes(url, userID, host, proxyIP, config) {
  try {
    if (url.pathname === `/${userID}` || url.pathname === `/sub/${userID}`) {
      const isSubscription = url.pathname.startsWith("/sub/");
      const proxyAddresses = proxyIP
        ? proxyIP.split(",").map((addr) => addr.trim())
        : [`${config.proxyIP}:${config.proxyPort}`];
      const content = isSubscription
        ? GenSub(userID, host, proxyAddresses)
        : getConfig(userID, host, proxyAddresses);

      return new Response(content, {
        status: 200,
        headers: {
          "Content-Type": isSubscription
            ? "text/plain;charset=utf-8"
            : "text/html; charset=utf-8",
          "Cache-Control": "no-cache",
        },
      });
    } else if (url.pathname === `/bestip/${userID}`) {
      return fetch(
        `https://bestip.06151953.xyz/auto?host=${host}&uuid=${userID}&path=/`,
        {
          headers: {
            "User-Agent": "EDtunnel/1.0",
            Accept: "application/json",
          },
        }
      );
    }
  } catch (err) {
    return handleError(err, "User Routes");
  }

  return new Response("Not Found", { status: 404 });
}

/**
 * Handles default path requests when no specific route matches.
 * Generates and returns a cloud drive interface HTML page.
 * @param {URL} url - The URL object of the request
 * @param {Request} request - The incoming request object
 * @returns {Response} HTML response with cloud drive interface
 */
async function handleDefaultPath(url, request) {
  const host = request.headers.get("Host");
  const DrivePage = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${host} - Cloud Drive</title><style> body { font-family: Arial, sans-serif; line-height: 1.6; margin: 0; padding: 20px; background-color: #f4f4f4; } .container { max-width: 800px; margin: auto; background: white; padding: 20px; border-radius: 5px; box-shadow: 0 0 10px rgba(0,0,0,0.1); } h1 { color: #333; } .file-list { list-style-type: none; padding: 0; } .file-list li { background: #f9f9f9; margin-bottom: 10px; padding: 10px; border-radius: 3px; display: flex; align-items: center; } .file-list li:hover { background: #f0f0f0; } .file-icon { margin-right: 10px; font-size: 1.2em; } .file-link { text-decoration: none; color: #0066cc; flex-grow: 1; } .file-link:hover { text-decoration: underline; } .upload-area { margin-top: 20px; padding: 40px; background: #e9e9e9; border: 2px dashed #aaa; border-radius: 5px; text-align: center; cursor: pointer; transition: all 0.3s ease; } .upload-area:hover, .upload-area.drag-over { background: #d9d9d9; border-color: #666; } .upload-area h2 { margin-top: 0; color: #333; } #fileInput { display: none; } .upload-icon { font-size: 48px; color: #666; margin-bottom: 10px; } .upload-text { font-size: 18px; color: #666; } .upload-status { margin-top: 20px; font-style: italic; color: #666; } .file-actions { display: flex; gap: 10px; } .delete-btn { color: #ff4444; cursor: pointer; background: none; border: none; padding: 5px; } .delete-btn:hover { color: #ff0000; } .clear-all-btn { background-color: #ff4444; color: white; border: none; padding: 10px 15px; border-radius: 4px; cursor: pointer; margin-bottom: 20px; } .clear-all-btn:hover { background-color: #ff0000; } </style></head><body><div class="container"><h1>Cloud Drive</h1><p>Welcome to your personal cloud storage. Here are your uploaded files:</p><button id="clearAllBtn" class="clear-all-btn">Clear All Files</button><ul id="fileList" class="file-list"></ul><div id="uploadArea" class="upload-area"><div class="upload-icon">📁</div><h2>Upload a File</h2><p class="upload-text">Drag and drop a file here or click to select</p><input type="file" id="fileInput" hidden></div><div id="uploadStatus" class="upload-status"></div></div><script> function loadFileList() { const fileList = document.getElementById('fileList'); const savedFiles = JSON.parse(localStorage.getItem('uploadedFiles')) || []; fileList.innerHTML = ''; savedFiles.forEach((file, index) => { const li = document.createElement('li'); li.innerHTML = \` <span class="file-icon">📄</span><a href="https://ipfs.io/ipfs/\${file.Url.split('/').pop()}" class="file-link" target="_blank">\${file.Name}</a><div class="file-actions"><button class="delete-btn" onclick="deleteFile(\${index})"><span class="file-icon">❌</span></button></div> \`; fileList.appendChild(li); }); } function deleteFile(index) { const savedFiles = JSON.parse(localStorage.getItem('uploadedFiles')) || []; savedFiles.splice(index, 1); localStorage.setItem('uploadedFiles', JSON.stringify(savedFiles)); loadFileList(); } document.getElementById('clearAllBtn').addEventListener('click', () => { if (confirm('Are you sure you want to clear all files?')) { localStorage.removeItem('uploadedFiles'); loadFileList(); } }); loadFileList(); const uploadArea = document.getElementById('uploadArea'); const fileInput = document.getElementById('fileInput'); const uploadStatus = document.getElementById('uploadStatus'); uploadArea.addEventListener('dragover', (e) => { e.preventDefault(); uploadArea.classList.add('drag-over'); }); uploadArea.addEventListener('dragleave', () => { uploadArea.classList.remove('drag-over'); }); uploadArea.addEventListener('drop', (e) => { e.preventDefault(); uploadArea.classList.remove('drag-over'); const files = e.dataTransfer.files; if (files.length) { handleFileUpload(files[0]); } }); uploadArea.addEventListener('click', () => { fileInput.click(); }); fileInput.addEventListener('change', (e) => { const file = e.target.files[0]; if (file) { handleFileUpload(file); } }); async function handleFileUpload(file) { uploadStatus.textContent = \`Uploading: \${file.name}...\`; const formData = new FormData(); formData.append('file', file); try { const response = await fetch('https://app.img2ipfs.org/api/v0/add', { method: 'POST', body: formData, headers: { 'Accept': 'application/json', }, }); if (!response.ok) { throw new Error('Upload failed'); } const result = await response.json(); uploadStatus.textContent = \`File uploaded successfully! IPFS Hash: \${result.Hash}\`; const savedFiles = JSON.parse(localStorage.getItem('uploadedFiles')) || []; savedFiles.push(result); localStorage.setItem('uploadedFiles', JSON.stringify(savedFiles)); loadFileList(); } catch (error) { console.error('Error:', error); uploadStatus.textContent = 'Upload failed. Please try again.'; } } </script></body></html>`;
  return new Response(DrivePage, {
    headers: {
      "content-type": "text/html;charset=UTF-8",
    },
  });
}

/**
 * Handles protocol over WebSocket requests with enhanced error handling and timeouts
 * @param {import("@cloudflare/workers-types").Request} request - The incoming request object
 * @param {Object} config - The configuration for this request
 * @returns {Promise<Response>} WebSocket response
 */
async function ProtocolOverWSHandler(request, config = null) {
  // Use global configuration if none provided (backward compatibility)
  if (!config) {
    config = {
      userID,
      socks5Address,
      socks5Relay,
      proxyIP,
      proxyPort,
      enableSocks,
      parsedSocks5Address,
      maxRetries: MAX_RETRIES,
      connectionTimeout: CONNECTION_TIMEOUT,
      wsReadyStateOpen: WS_READY_STATE_OPEN,
      wsReadyStateClosing: WS_READY_STATE_CLOSING,
    };
  }

  try {
    // Initialize or get global WebSocket manager instance
    const wsManager = initializeGlobalWSManager(config);
    
    // Create connection using the manager
    const connection = wsManager.createConnection(request);
    const { client, webSocket, logger: connectionLogger, id: connectionId } = connection;
    
    // Store connection ID on the webSocket for other functions to access
    webSocket._connectionId = connectionId;

    let address = "";
    let portWithRandomLog = "";

    const log = (
      /** @type {string} */ info,
      /** @type {string | undefined} */ event
    ) => {
      connectionLogger.debug(`[${address}:${portWithRandomLog}] ${info}`, {
        event: event || "",
        address,
        port: portWithRandomLog,
        connectionId,
      });
    };

    // Create readable stream using the manager
    const readableWebSocketStream = wsManager.createReadableStream(connection);

    /** @type {{ value: import("@cloudflare/workers-types").Socket | null}}*/
    let remoteSocketWapper = connection.remoteSocketWrapper;
    let isDns = connection.isDns;

    // Enhanced stream processing with timeout handling
    const processStream = async () => {
      const controller = new AbortController();
      const connectionTimeout = config.connectionTimeout || CONNECTION_TIMEOUT;
      const timeoutId = setTimeout(() => {
        controller.abort();
        connectionLogger.warn("Stream timeout - aborting connection", {
          timeout: connectionTimeout,
        });
      }, connectionTimeout);

      try {
        await readableWebSocketStream.pipeTo(
          new WritableStream({
            async write(chunk, streamController) {
              try {
                if (isDns) {
                  return await handleDNSQuery(chunk, webSocket, null, log);
                }
                if (remoteSocketWapper.value) {
                  const writer = remoteSocketWapper.value.writable.getWriter();
                  await writer.write(chunk);
                  writer.releaseLock();
                  return;
                }

                // Use the dedicated VLESS protocol handler
                const protocolHandler = new VLESSProtocolHandler();
                const protocolResult = protocolHandler.parseHeader(
                  chunk,
                  config.userID
                );

                const {
                  hasError,
                  message,
                  addressType,
                  portRemote = 443,
                  addressRemote = "",
                  rawDataIndex,
                  protocolVersion = new Uint8Array([0, 0]),
                  isUDP,
                  command,
                  version,
                } = protocolResult;

                address = addressRemote;
                portWithRandomLog = `${portRemote}--${Math.random()} ${
                  isUDP ? "udp " : "tcp "
                } `;

                if (hasError) {
                  connectionLogger.warn("VLESS protocol parsing failed", {
                    error: message,
                    code: protocolResult.code,
                    addressRemote,
                    portRemote,
                    addressType,
                  });
                  throw WorkerError.badRequest(message, {
                    addressRemote,
                    portRemote,
                    addressType,
                    code: protocolResult.code,
                  });
                }

                // Log successful protocol parsing
                connectionLogger.debug("VLESS protocol parsed successfully", {
                  command: protocolHandler.getCommandName(command),
                  addressType: protocolHandler.getAddressTypeName(addressType),
                  addressRemote,
                  portRemote,
                  version,
                  isUDP,
                });

                // Handle UDP connections for DNS (port 53) only
                if (isUDP) {
                  if (portRemote === 53) {
                    isDns = true;
                  } else {
                    throw WorkerError.forbidden(
                      "UDP proxy is only enabled for DNS (port 53)",
                      {
                        portRemote,
                        protocol: "UDP",
                      }
                    );
                  }
                  return;
                }

                const ProtocolResponseHeader =
                  protocolHandler.createResponseHeader(version || 0, 0);
                const rawClientData = chunk.slice(rawDataIndex);

                if (isDns) {
                  return handleDNSQuery(
                    rawClientData,
                    webSocket,
                    ProtocolResponseHeader,
                    log
                  );
                }

                await HandleTCPOutBound(
                  remoteSocketWapper,
                  addressType,
                  addressRemote,
                  portRemote,
                  rawClientData,
                  webSocket,
                  ProtocolResponseHeader,
                  log,
                  config
                );
              } catch (writeError) {
                connectionLogger.error("Write error occurred", {
                  error: writeError.message,
                  address,
                  port: portWithRandomLog,
                });
                streamController.error(writeError);
              }
            },
            close() {
              log(`readableWebSocketStream is close`);
              clearTimeout(timeoutId);
            },
            abort(reason) {
              log(`readableWebSocketStream is abort`, JSON.stringify(reason));
              clearTimeout(timeoutId);
            },
          }),
          { signal: controller.signal }
        );
      } catch (streamError) {
        connectionLogger.error("Stream processing error", {
          error: streamError.message,
          address,
          port: portWithRandomLog,
        });
        throw streamError;
      } finally {
        clearTimeout(timeoutId);
      }
    };

    // Process stream asynchronously
    processStream().catch((err) => {
      connectionLogger.error("WebSocket stream processing failed", {
        error: err.message,
        address,
        port: portWithRandomLog,
        connectionId,
      });
      wsManager.closeConnection(connectionId, 1011, "Stream processing failed");
    });

    return new Response(null, {
      status: 101,
      // @ts-ignore
      webSocket: client,
    });
  } catch (error) {
    return handleError(error, "WebSocket Handler");
  }
}

/**
 * Enhanced TCP outbound handling with retry logic and better error handling
 * @param {Socket} remoteSocket - Remote socket connection
 * @param {string} addressType - Type of address (IPv4/IPv6)
 * @param {string} addressRemote - Remote server address
 * @param {number} portRemote - Remote server port
 * @param {Uint8Array} rawClientData - Raw data from client
 * @param {WebSocket} webSocket - WebSocket connection
 * @param {Uint8Array} protocolResponseHeader - Protocol response header
 * @param {Function} log - Logging function
 * @param {Object} config - The configuration for this request
 */
async function HandleTCPOutBound(
  remoteSocket,
  addressType,
  addressRemote,
  portRemote,
  rawClientData,
  webSocket,
  protocolResponseHeader,
  log,
  config = null
) {
  if (!config) {
    config = {
      userID,
      socks5Address,
      socks5Relay,
      proxyIP,
      proxyPort,
      enableSocks,
      parsedSocks5Address,
    };
  }

  async function connectAndWrite(address, port, socks = false) {
    /** @type {import("@cloudflare/workers-types").Socket} */
    let tcpSocket;
    try {
      if (config.socks5Relay) {
        tcpSocket = await socks5Connect(
          addressType,
          address,
          port,
          log,
          config.parsedSocks5Address
        );
      } else {
        tcpSocket = socks
          ? await socks5Connect(
              addressType,
              address,
              port,
              log,
              config.parsedSocks5Address
            )
          : connect({
              hostname: address,
              port: port,
            });
      }

      if (!tcpSocket) {
        throw WorkerError.serviceUnavailable(
          "Failed to create socket connection",
          {
            address,
            port,
            socks,
          }
        );
      }

      remoteSocket.value = tcpSocket;
      log(`connected to ${address}:${port}`);

      const writer = tcpSocket.writable.getWriter();
      await writer.write(rawClientData);
      writer.releaseLock();
      return tcpSocket;
    } catch (connectError) {
      logger.error("TCP connection failed", {
        address,
        port,
        error: connectError.message,
        socks,
      });
      throw connectError;
    }
  }

  // Enhanced retry function with exponential backoff
  async function retry() {
    let lastError;
    const maxRetries = config.maxRetries || MAX_RETRIES;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        let tcpSocket;
        if (config.enableSocks) {
          tcpSocket = await connectAndWrite(addressRemote, portRemote, true);
        } else {
          tcpSocket = await connectAndWrite(
            config.proxyIP || addressRemote,
            config.proxyPort || portRemote,
            false
          );
        }

        tcpSocket.closed
          .catch((error) => {
            log("retry tcpSocket closed error", error.message);
          })
          .finally(() => {
            safeCloseWebSocket(webSocket);
          });

        RemoteSocketToWS(
          tcpSocket,
          webSocket,
          protocolResponseHeader,
          null,
          log,
          config
        );
        return;
      } catch (retryError) {
        lastError = retryError;
        logger.warn("TCP connection retry attempt failed", {
          attempt,
          maxRetries,
          error: retryError.message,
          address: addressRemote,
          port: portRemote,
        });

        if (attempt < maxRetries) {
          // Exponential backoff: 100ms, 200ms, 400ms
          const backoffDelay = 100 * Math.pow(2, attempt - 1);
          await new Promise((resolve) => setTimeout(resolve, backoffDelay));
        }
      }
    }

    logger.error("All retry attempts exhausted", {
      lastError: lastError?.message,
      address: addressRemote,
      port: portRemote,
      maxRetries,
    });
    safeCloseWebSocket(webSocket);
  }

  try {
    const tcpSocket = await connectAndWrite(addressRemote, portRemote);
    RemoteSocketToWS(
      tcpSocket,
      webSocket,
      protocolResponseHeader,
      retry,
      log,
      config
    );
  } catch (error) {
    logger.warn("Initial TCP connection failed, starting retry", {
      error: error.message,
      address: addressRemote,
      port: portRemote,
    });
    await retry();
  }
}

/**
 * Creates a readable stream from WebSocket server with enhanced error handling.
 * @param {WebSocket} webSocketServer - WebSocket server instance
 * @param {string} earlyDataHeader - Header for early data (0-RTT)
 * @param {Function} log - Logging function
 * @returns {ReadableStream} Stream of WebSocket data
 */
function MakeReadableWebSocketStream(webSocketServer, earlyDataHeader, log) {
  let readableStreamCancel = false;
  const stream = new ReadableStream({
    start(controller) {
      webSocketServer.addEventListener("message", (event) => {
        if (readableStreamCancel) return;
        try {
          const message = event.data;
          controller.enqueue(message);
        } catch (enqueueError) {
          log("Error enqueuing message:", enqueueError.message);
          controller.error(enqueueError);
        }
      });

      webSocketServer.addEventListener("close", () => {
        safeCloseWebSocket(webSocketServer);
        if (!readableStreamCancel) {
          controller.close();
        }
      });

      webSocketServer.addEventListener("error", (err) => {
        log("webSocketServer has error:", err.message || "Unknown error");
        controller.error(err);
      });

      try {
        const { earlyData, error } = base64ToArrayBuffer(earlyDataHeader);
        if (error) {
          controller.error(error);
        } else if (earlyData) {
          controller.enqueue(earlyData);
        }
      } catch (parseError) {
        log("Error parsing early data:", parseError.message);
        controller.error(parseError);
      }
    },

    pull(_controller) {
      // Implement backpressure if needed
    },

    cancel(reason) {
      log(`ReadableStream was canceled, due to ${reason}`);
      readableStreamCancel = true;
      safeCloseWebSocket(webSocketServer);
    },
  });

  return stream;
}

/**
 * Dedicated VLESS Protocol Handler for parsing and validating protocol headers
 * Provides structured protocol parsing with enhanced error handling and validation
 */
class VLESSProtocolHandler {
  constructor() {
    this.supportedCommands = new Set([1, 2]); // TCP, UDP
    this.supportedAddressTypes = new Set([1, 2, 3]); // IPv4, Domain, IPv6
    this.minHeaderLength = 24;
  }

  /**
   * Parse VLESS protocol header from buffer
   * @param {ArrayBuffer} protocolBuffer - Buffer containing protocol header
   * @param {string} userID - User ID(s) for validation (comma-separated)
   * @returns {Object} Parsed protocol information or error
   */
  parseHeader(protocolBuffer, userID) {
    try {
      // Basic validation
      const validationResult = this._validateBuffer(protocolBuffer);
      if (validationResult.hasError) {
        return validationResult;
      }

      const dataView = new DataView(protocolBuffer);

      // Parse protocol version
      const version = dataView.getUint8(0);

      // Parse and validate user ID
      const userValidation = this._validateUserID(
        protocolBuffer.slice(1, 17),
        userID
      );
      if (userValidation.hasError) {
        return userValidation;
      }

      // Parse optional length and command
      const optLength = dataView.getUint8(17);
      const command = dataView.getUint8(18 + optLength);

      // Validate command
      const commandValidation = this._validateCommand(command);
      if (commandValidation.hasError) {
        return commandValidation;
      }

      // Parse port and address
      const portIndex = 18 + optLength + 1;
      const portRemote = dataView.getUint16(portIndex);

      // Parse address based on type
      const addressResult = this._parseAddress(
        dataView,
        protocolBuffer,
        portIndex
      );
      if (addressResult.hasError) {
        return addressResult;
      }

      // Construct successful result
      return {
        hasError: false,
        addressRemote: addressResult.addressValue,
        addressType: addressResult.addressType,
        portRemote,
        rawDataIndex: addressResult.rawDataIndex,
        protocolVersion: new Uint8Array([version]),
        isUDP: command === 2,
        command,
        version,
        optLength,
      };
    } catch (parseError) {
      logger.error("VLESS protocol parsing error", {
        error: parseError.message,
        bufferLength: protocolBuffer?.byteLength,
      });
      return {
        hasError: true,
        message: `Protocol parsing error: ${parseError.message}`,
        code: "PARSE_ERROR",
      };
    }
  }

  /**
   * Validate protocol buffer basic requirements
   * @private
   */
  _validateBuffer(protocolBuffer) {
    if (!protocolBuffer || !(protocolBuffer instanceof ArrayBuffer)) {
      return {
        hasError: true,
        message: "Invalid protocol buffer",
        code: "INVALID_BUFFER",
      };
    }

    if (protocolBuffer.byteLength < this.minHeaderLength) {
      return {
        hasError: true,
        message: `Protocol header too short: ${protocolBuffer.byteLength} bytes, minimum ${this.minHeaderLength} required`,
        code: "HEADER_TOO_SHORT",
      };
    }

    return { hasError: false };
  }

  /**
   * Validate user ID from protocol header
   * @private
   */
  _validateUserID(userIDBuffer, expectedUserID) {
    try {
      const slicedBufferString = stringify(new Uint8Array(userIDBuffer));
      const uuids = expectedUserID.includes(",")
        ? expectedUserID.split(",").map((id) => id.trim())
        : [expectedUserID];

      const isValidUser = uuids.some((uuid) => slicedBufferString === uuid);

      if (!isValidUser) {
        return {
          hasError: true,
          message: "Invalid user ID in protocol header",
          code: "INVALID_USER_ID",
        };
      }

      return { hasError: false };
    } catch (error) {
      return {
        hasError: true,
        message: `User ID validation error: ${error.message}`,
        code: "USER_ID_PARSE_ERROR",
      };
    }
  }

  /**
   * Validate protocol command
   * @private
   */
  _validateCommand(command) {
    if (!this.supportedCommands.has(command)) {
      return {
        hasError: true,
        message: `Unsupported command ${command}. Supported commands: 01-tcp, 02-udp`,
        code: "UNSUPPORTED_COMMAND",
      };
    }
    return { hasError: false };
  }

  /**
   * Parse address from protocol header based on address type
   * @private
   */
  _parseAddress(dataView, protocolBuffer, portIndex) {
    const addressType = dataView.getUint8(portIndex + 2);

    if (!this.supportedAddressTypes.has(addressType)) {
      return {
        hasError: true,
        message: `Invalid address type: ${addressType}. Supported types: 1-IPv4, 2-Domain, 3-IPv6`,
        code: "INVALID_ADDRESS_TYPE",
      };
    }

    let addressValue, addressLength, addressValueIndex;

    try {
      switch (addressType) {
        case 1: // IPv4
          addressLength = 4;
          addressValueIndex = portIndex + 3;
          addressValue = new Uint8Array(
            protocolBuffer.slice(
              addressValueIndex,
              addressValueIndex + addressLength
            )
          ).join(".");
          break;

        case 2: // Domain
          addressLength = dataView.getUint8(portIndex + 3);
          addressValueIndex = portIndex + 4;

          if (addressLength === 0 || addressLength > 253) {
            return {
              hasError: true,
              message: `Invalid domain length: ${addressLength}`,
              code: "INVALID_DOMAIN_LENGTH",
            };
          }

          addressValue = new TextDecoder().decode(
            protocolBuffer.slice(
              addressValueIndex,
              addressValueIndex + addressLength
            )
          );
          break;

        case 3: // IPv6
          addressLength = 16;
          addressValueIndex = portIndex + 3;
          addressValue = Array.from({ length: 8 }, (_, i) =>
            dataView.getUint16(addressValueIndex + i * 2).toString(16)
          ).join(":");
          break;
      }

      if (!addressValue) {
        return {
          hasError: true,
          message: `Address value is empty for address type ${addressType}`,
          code: "EMPTY_ADDRESS",
        };
      }

      return {
        hasError: false,
        addressValue,
        addressType,
        addressLength,
        rawDataIndex: addressValueIndex + addressLength,
      };
    } catch (error) {
      return {
        hasError: true,
        message: `Address parsing error for type ${addressType}: ${error.message}`,
        code: "ADDRESS_PARSE_ERROR",
      };
    }
  }

  /**
   * Get human-readable command name
   * @param {number} command - Command number
   * @returns {string} Command name
   */
  getCommandName(command) {
    const commandMap = {
      1: "TCP",
      2: "UDP",
    };
    return commandMap[command] || `Unknown(${command})`;
  }

  /**
   * Get human-readable address type name
   * @param {number} addressType - Address type number
   * @returns {string} Address type name
   */
  getAddressTypeName(addressType) {
    const typeMap = {
      1: "IPv4",
      2: "Domain",
      3: "IPv6",
    };
    return typeMap[addressType] || `Unknown(${addressType})`;
  }

  /**
   * Create protocol response header
   * @param {number} version - Protocol version
   * @param {number} responseCode - Response code (0 = success)
   * @returns {Uint8Array} Response header
   */
  createResponseHeader(version, responseCode = 0) {
    return new Uint8Array([version, responseCode]);
  }
}

/**
 * Legacy function for backward compatibility
 * @param {ArrayBuffer} protocolBuffer - Buffer containing protocol header
 * @param {string} userID - User ID for validation
 * @returns {Object} Processed header information
 */
function ProcessProtocolHeader(protocolBuffer, userID) {
  const handler = new VLESSProtocolHandler();
  return handler.parseHeader(protocolBuffer, userID);
}

/**
 * Enhanced remote socket to WebSocket conversion with better error handling
 * @param {Socket} remoteSocket - Remote socket connection
 * @param {WebSocket} webSocket - WebSocket connection
 * @param {ArrayBuffer} protocolResponseHeader - Protocol response header
 * @param {Function} retry - Retry function for failed connections
 * @param {Function} log - Logging function
 */
async function RemoteSocketToWS(
  remoteSocket,
  webSocket,
  protocolResponseHeader,
  retry,
  log,
  config = null
) {
  let hasIncomingData = false;
  const wsReadyStateOpen = config?.wsReadyStateOpen || WS_READY_STATE_OPEN;

  try {
    await remoteSocket.readable.pipeTo(
      new WritableStream({
        async write(chunk) {
          if (webSocket.readyState !== wsReadyStateOpen) {
            throw WorkerError.badGateway("WebSocket connection is not open", {
              readyState: webSocket.readyState,
            });
          }

          hasIncomingData = true;

          try {
            if (protocolResponseHeader) {
              webSocket.send(
                await new Blob([protocolResponseHeader, chunk]).arrayBuffer()
              );
              protocolResponseHeader = null;
            } else {
              webSocket.send(chunk);
            }
          } catch (sendError) {
            log("Error sending to WebSocket:", sendError.message);
            throw sendError;
          }
        },
        close() {
          log(
            `Remote connection readable closed. Had incoming data: ${hasIncomingData}`
          );
        },
        abort(reason) {
          log(
            `Remote connection readable aborted:`,
            reason?.message || "Unknown reason"
          );
        },
      })
    );
  } catch (error) {
    log(`RemoteSocketToWS error:`, error.message);
    safeCloseWebSocket(webSocket);
  }

  // Retry logic with incoming data check
  if (!hasIncomingData && retry) {
    log(`No incoming data detected, initiating retry`);
    try {
      await retry();
    } catch (retryError) {
      log(`Retry failed:`, retryError.message);
      safeCloseWebSocket(webSocket);
    }
  }
}

/**
 * Optimized base64 to ArrayBuffer conversion with caching and validation
 * @param {string} base64Str - Base64 encoded string
 * @returns {Object} Object containing decoded data or error
 */
function base64ToArrayBuffer(base64Str) {
  if (!base64Str) {
    return { earlyData: null, error: null };
  }
  
  // Check cache first
  if (validationCache.has(base64Str)) {
    const cached = validationCache.get(base64Str);
    // Return a new view of the cached buffer to prevent mutation
    return cached.error ? cached : {
      earlyData: cached.earlyData.slice(),
      error: null
    };
  }
  
  try {
    // Length validation
    if (base64Str.length > 8192) { // 8KB limit for early data
      throw new Error("Base64 string too large");
    }
    
    // Convert modified Base64 for URL (RFC 4648) to standard Base64
    base64Str = base64Str.replace(/-/g, "+").replace(/_/g, "/");
    // Add padding if needed
    while (base64Str.length % 4) {
      base64Str += "=";
    }
    
    // Validate base64 format
    if (!/^[A-Za-z0-9+/]*={0,2}$/.test(base64Str)) {
      throw new Error("Invalid base64 format");
    }
    
    // Decode Base64 string
    const binaryStr = atob(base64Str);
    
    // Use more efficient buffer creation for larger data
    const buffer = new ArrayBuffer(binaryStr.length);
    const view = new Uint8Array(buffer);
    
    // Optimized loop with bounds checking
    for (let i = 0; i < binaryStr.length; i++) {
      view[i] = binaryStr.charCodeAt(i);
    }
    
    const result = { earlyData: buffer, error: null };
    
    // Cache the result with size management
    if (validationCache.size < CACHE_SIZE_LIMIT) {
      validationCache.set(base64Str, result);
    } else if (validationCache.size >= CACHE_SIZE_LIMIT * 1.5) {
      // Clear oldest entries
      const entries = Array.from(validationCache.entries());
      const keepCount = Math.floor(CACHE_SIZE_LIMIT * 0.7);
      validationCache.clear();
      entries.slice(-keepCount).forEach(([k, v]) => validationCache.set(k, v));
    }
    
    return result;
  } catch (error) {
    const errorResult = {
      earlyData: null,
      error: new Error(`Base64 decode failed: ${error.message}`),
    };
    
    // Cache error results too to avoid repeated processing
    if (validationCache.size < CACHE_SIZE_LIMIT) {
      validationCache.set(base64Str, errorResult);
    }
    
    return errorResult;
  }
}

/**
 * Enhanced UUID validation
 * @param {string} uuid - UUID string to validate
 * @returns {boolean} True if valid UUID
 */
function isValidUUID(uuid) {
  if (typeof uuid !== "string") return false;
  // More precise UUID regex pattern
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Enhanced WebSocket closure with timeout protection
 * Uses WebSocketManager if available, falls back to direct close
 * @param {WebSocket} socket - WebSocket to close
 */
function safeCloseWebSocket(socket) {
  try {
    // Use WebSocketManager if available and connection ID is set
    if (globalWSManager && socket?._connectionId) {
      globalWSManager.closeConnection(socket._connectionId, 1000, "Safe close requested");
      return;
    }
    
    // Fallback to direct close
    if (
      socket &&
      (socket.readyState === WS_READY_STATE_OPEN ||
        socket.readyState === WS_READY_STATE_CLOSING)
    ) {
      socket.close();
    }
  } catch (error) {
    logger.warn("Safe WebSocket close error", {
      error: error.message,
      readyState: socket?.readyState,
      hasConnectionId: !!socket?._connectionId,
      hasGlobalManager: !!globalWSManager,
    });
  }
}

// Pre-computed hex lookup table for performance
const byteToHex = Array.from({ length: 256 }, (_, i) =>
  (i + 0x100).toString(16).slice(1)
);

// UUID and address caching for performance
const uuidCache = new Map();
const addressCache = new Map();
const validationCache = new Map();
const CACHE_SIZE_LIMIT = 1000;

/**
 * Converts byte array to hex string without validation (performance optimized)
 * @param {Uint8Array} arr - Byte array to convert
 * @param {number} offset - Starting offset
 * @returns {string} Hex string
 */
function unsafeStringify(arr, offset = 0) {
  // Check cache first for performance
  const cacheKey = `${arr[offset]}-${arr[offset + 1]}-${arr[offset + 2]}-${arr[offset + 3]}`;
  if (uuidCache.has(cacheKey)) {
    return uuidCache.get(cacheKey);
  }
  
  const result = [
    byteToHex[arr[offset]],
    byteToHex[arr[offset + 1]],
    byteToHex[arr[offset + 2]],
    byteToHex[arr[offset + 3]],
    "-",
    byteToHex[arr[offset + 4]],
    byteToHex[arr[offset + 5]],
    "-",
    byteToHex[arr[offset + 6]],
    byteToHex[arr[offset + 7]],
    "-",
    byteToHex[arr[offset + 8]],
    byteToHex[arr[offset + 9]],
    "-",
    byteToHex[arr[offset + 10]],
    byteToHex[arr[offset + 11]],
    byteToHex[arr[offset + 12]],
    byteToHex[arr[offset + 13]],
    byteToHex[arr[offset + 14]],
    byteToHex[arr[offset + 15]],
  ]
    .join("")
    .toLowerCase();
  
  // Cache the result with size management
  if (uuidCache.size < CACHE_SIZE_LIMIT) {
    uuidCache.set(cacheKey, result);
  } else if (uuidCache.size >= CACHE_SIZE_LIMIT * 1.5) {
    // Clear oldest entries when cache gets too large
    const entries = Array.from(uuidCache.entries());
    const keepCount = Math.floor(CACHE_SIZE_LIMIT * 0.7);
    uuidCache.clear();
    entries.slice(-keepCount).forEach(([k, v]) => uuidCache.set(k, v));
  }
  
  return result;
}

/**
 * Safely converts byte array to hex string with validation
 * @param {Uint8Array} arr - Byte array to convert
 * @param {number} offset - Starting offset
 * @returns {string} Hex string
 */
function stringify(arr, offset = 0) {
  const uuid = unsafeStringify(arr, offset);
  if (!isValidUUID(uuid)) {
    throw new TypeError("Stringified UUID is invalid");
  }
  return uuid;
}

/**
 * Enhanced DNS query handling with timeout protection
 * @param {ArrayBuffer} udpChunk - UDP data chunk
 * @param {WebSocket} webSocket - WebSocket connection
 * @param {ArrayBuffer} protocolResponseHeader - Protocol response header
 * @param {Function} log - Logging function
 */
async function handleDNSQuery(
  udpChunk,
  webSocket,
  protocolResponseHeader,
  log
) {
  try {
    const dnsServer = "8.8.4.4";
    const dnsPort = 53;
    /** @type {ArrayBuffer | null} */
    let vlessHeader = protocolResponseHeader;

    const tcpSocket = connect({
      hostname: dnsServer,
      port: dnsPort,
    });

    log(`connected to ${dnsServer}:${dnsPort}`);

    // Set up timeout for DNS query
    const timeoutId = setTimeout(() => {
      tcpSocket.close?.();
      log("DNS query timeout");
    }, 5000);

    try {
      const writer = tcpSocket.writable.getWriter();
      await writer.write(udpChunk);
      writer.releaseLock();

      await tcpSocket.readable.pipeTo(
        new WritableStream({
          async write(chunk) {
            if (webSocket.readyState === WS_READY_STATE_OPEN) {
              if (vlessHeader) {
                webSocket.send(
                  await new Blob([vlessHeader, chunk]).arrayBuffer()
                );
                vlessHeader = null;
              } else {
                webSocket.send(chunk);
              }
            }
          },
          close() {
            log(`dns server(${dnsServer}) tcp is close`);
            clearTimeout(timeoutId);
          },
          abort(reason) {
            log(
              `dns server(${dnsServer}) tcp is abort`,
              reason?.message || "Unknown"
            );
            clearTimeout(timeoutId);
          },
        })
      );
    } finally {
      clearTimeout(timeoutId);
    }
  } catch (error) {
    log(`handleDNSQuery exception: ${error.message}`);
  }
}

/**
 * Enhanced SOCKS5 connection with better error handling and timeout
 * @param {number} addressType - Type of address
 * @param {string} addressRemote - Remote address
 * @param {number} portRemote - Remote port
 * @param {Function} log - Logging function
 * @param {Object} parsedSocks5Addr - Parsed SOCKS5 address information
 * @returns {Promise<Socket>} Connected socket
 */
async function socks5Connect(
  addressType,
  addressRemote,
  portRemote,
  log,
  parsedSocks5Addr = null
) {
  const { username, password, hostname, port } =
    parsedSocks5Addr || parsedSocks5Address;

  try {
    // Connect to the SOCKS server
    const socket = connect({
      hostname,
      port,
    });

    const socksGreeting = new Uint8Array([5, 2, 0, 2]);
    const writer = socket.writable.getWriter();

    await writer.write(socksGreeting);
    log("sent socks greeting");

    const reader = socket.readable.getReader();
    const encoder = new TextEncoder();

    let res = (await reader.read()).value;
    if (res[0] !== 0x05) {
      throw WorkerError.badGateway(
        `SOCKS server version error: ${res[0]} expected: 5`,
        {
          received: res[0],
          expected: 5,
        }
      );
    }
    if (res[1] === 0xff) {
      throw WorkerError.badGateway(
        "No acceptable SOCKS authentication methods",
        {
          response: res[1],
        }
      );
    }

    // Handle authentication if required
    if (res[1] === 0x02) {
      log("socks server needs auth");
      if (!username || !password) {
        throw WorkerError.unauthorized(
          "SOCKS authentication required: please provide username/password",
          {
            hasUsername: !!username,
            hasPassword: !!password,
          }
        );
      }

      const authRequest = new Uint8Array([
        1,
        username.length,
        ...encoder.encode(username),
        password.length,
        ...encoder.encode(password),
      ]);
      await writer.write(authRequest);
      res = (await reader.read()).value;

      if (res[0] !== 0x01 || res[1] !== 0x00) {
        throw WorkerError.unauthorized("SOCKS authentication failed", {
          response: [res[0], res[1]],
          expected: [0x01, 0x00],
        });
      }
    }

    // Prepare destination address
    let DSTADDR;
    switch (addressType) {
      case 1:
        DSTADDR = new Uint8Array([1, ...addressRemote.split(".").map(Number)]);
        break;
      case 2:
        DSTADDR = new Uint8Array([
          3,
          addressRemote.length,
          ...encoder.encode(addressRemote),
        ]);
        break;
      case 3:
        DSTADDR = new Uint8Array([
          4,
          ...addressRemote
            .split(":")
            .flatMap((x) => [
              parseInt(x.slice(0, 2), 16),
              parseInt(x.slice(2), 16),
            ]),
        ]);
        break;
      default:
        throw WorkerError.badRequest(`Invalid address type: ${addressType}`, {
          addressType,
          supportedTypes: [1, 2, 3],
        });
    }

    const socksRequest = new Uint8Array([
      5,
      1,
      0,
      ...DSTADDR,
      portRemote >> 8,
      portRemote & 0xff,
    ]);
    await writer.write(socksRequest);
    log("sent socks request");

    res = (await reader.read()).value;
    if (res[1] !== 0x00) {
      throw WorkerError.badGateway("Failed to open SOCKS connection", {
        response: res[1],
        expected: 0x00,
      });
    }

    log("socks connection opened");
    writer.releaseLock();
    reader.releaseLock();
    return socket;
  } catch (error) {
    logger.error("SOCKS5 connection failed", {
      error: error.message,
      hostname: parsedSocks5Addr?.hostname || parsedSocks5Address?.hostname,
      port: parsedSocks5Addr?.port || parsedSocks5Address?.port,
      addressType,
      addressRemote,
      portRemote,
    });
    throw error;
  }
}

/**
 * Enhanced SOCKS5 address parser with better validation
 * @param {string} address - SOCKS5 address string
 * @returns {Object} Parsed address information
 */
function socks5AddressParser(address) {
  try {
    let [latter, former] = address.split("@").reverse();
    let username, password, hostname, port;

    if (former) {
      const formers = former.split(":");
      if (formers.length !== 2) {
        throw WorkerError.badRequest(
          "Invalid SOCKS address format: credentials must be username:password",
          {
            address,
            credentialsParts: formers.length,
          }
        );
      }
      [username, password] = formers;
    }

    const latters = latter.split(":");
    const portStr = latters.pop();
    port = Number(portStr);

    if (isNaN(port) || port <= 0 || port > 65535) {
      throw WorkerError.badRequest(
        "Invalid SOCKS address format: invalid port number",
        {
          address,
          port: portStr,
          validRange: "1-65535",
        }
      );
    }

    hostname = latters.join(":");
    const regex = /^\[.*\]$/;

    if (hostname.includes(":") && !regex.test(hostname)) {
      throw WorkerError.badRequest(
        "Invalid SOCKS address format: IPv6 address must be wrapped in brackets",
        {
          address,
          hostname,
        }
      );
    }

    if (!hostname) {
      throw WorkerError.badRequest(
        "Invalid SOCKS address format: hostname cannot be empty",
        {
          address,
        }
      );
    }

    return {
      username,
      password,
      hostname,
      port,
    };
  } catch (error) {
    if (error instanceof WorkerError) {
      throw error;
    }
    throw WorkerError.badRequest(
      `SOCKS5 address parsing failed: ${error.message}`,
      {
        address,
        originalError: error.message,
      }
    );
  }
}

const at = "QA==";
const pt = "dmxlc3M=";
const ed = "RUR0dW5uZWw=";

/**
 * Generates configuration for VLESS client with enhanced error handling
 * @param {string} userIDs - Single or comma-separated user IDs
 * @param {string} hostName - Host name for configuration
 * @param {string|string[]} proxyIP - Proxy IP address or array of addresses
 * @returns {string} Configuration HTML
 */
function getConfig(userIDs, hostName, proxyIP) {
  try {
    const commonUrlPart = `?encryption=none&security=tls&sni=${hostName}&fp=randomized&type=ws&host=${hostName}&path=%2F%3Fed%3D2048#${hostName}`;

    // Split the userIDs into an array
    const userIDArray = userIDs.split(",").map((id) => id.trim());

    // Prepare output string for each userID
    const sublink = `https://${hostName}/sub/${userIDArray[0]}?format=clash`;
    const subbestip = `https://${hostName}/bestip/${userIDArray[0]}`;
    const clash_link = `https://url.v1.mk/sub?target=clash&url=${encodeURIComponent(
      `https://${hostName}/sub/${userIDArray[0]}?format=clash`
    )}&insert=false&emoji=true&list=false&tfo=false&scv=true&fdn=false&sort=false&new_name=true`;

    // HTML Head with CSS and FontAwesome library
    const htmlHead = `
		  <head>
			<title>EDtunnel: Configuration</title>
			<meta name='viewport' content='width=device-width, initial-scale=1'>
			<meta property='og:site_name' content='EDtunnel: Protocol Configuration' />
			<meta property='og:type' content='website' />
			<meta property='og:title' content='EDtunnel - Protocol Configuration and Subscribe Output' />
			<meta property='og:description' content='Use Cloudflare Pages and Worker serverless to implement protocol' />
			<meta property='og:url' content='https://${hostName}/' />
			<meta property='og:image' content='https://cdn.jsdelivr.net/gh/6Kmfi6HP/EDtunnel@refs/heads/main/image/logo.png' />
			<meta name='twitter:card' content='summary_large_image' />
			<meta name='twitter:title' content='EDtunnel - Protocol Configuration and Subscribe Output' />
			<meta name='twitter:description' content='Use Cloudflare Pages and Worker serverless to implement protocol' />
			<meta name='twitter:url' content='https://${hostName}/' />
			<meta name='twitter:image' content='https://cdn.jsdelivr.net/gh/6Kmfi6HP/EDtunnel@refs/heads/main/image/logo.png' />
			<meta property='og:image:width' content='1500' />
			<meta property='og:image:height' content='1500' />

			<style>
			  body {
				font-family: 'Roboto', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
				background-color: #000000;
				color: #ffffff;
				line-height: 1.6;
				padding: 20px;
				max-width: 1200px;
				margin: 0 auto;
			  }
			  .container {
				background-color: #111111;
				border-radius: 8px;
				box-shadow: 0 4px 6px rgba(255, 255, 255, 0.1);
				padding: 20px;
				margin-bottom: 20px;
			  }
			  h1, h2 {
				color: #ffffff;
			  }
			  .config-item {
				background-color: #222222;
				border: 1px solid #333333;
				border-radius: 4px;
				padding: 15px;
				margin-bottom: 15px;
			  }
			  .config-item h3 {
				margin-top: 0;
				color: #ffffff;
			  }
			  .btn {
				background-color: #ffffff;
				color: #000000;
				border: none;
				padding: 10px 15px;
				border-radius: 4px;
				cursor: pointer;
				transition: background-color 0.3s, color 0.3s;
			  }
			  .btn:hover {
				background-color: #cccccc;
			  }
			  .btn-group {
				margin-top: 10px;
			  }
			  .btn-group .btn {
				margin-right: 10px;
			  }
			  pre {
				background-color: #333333;
				border: 1px solid #444444;
				border-radius: 4px;
				padding: 10px;
				white-space: pre-wrap;
				word-wrap: break-word;
				color: #00ff00;
			  }
			  .logo {
				float: left;
				margin-right: 20px;
				margin-bottom: 20px;
				max-width: 30%;
			  }
			  @media (max-width: 768px) {
				.logo {
				  float: none;
				  display: block;
				  margin: 0 auto 20px;
				  max-width: 90%;
				}
				.btn-group {
				  display: flex;
				  flex-direction: column;
				  align-items: center;
				}
				.btn-group .btn {
				  margin-bottom: 10px;
				  width: 100%;
				  text-align: center;
				}
			  }
			  .code-container {
				position: relative;
				margin-bottom: 15px;
			  }
			  .code-container pre {
				margin: 0;
				padding-right: 100px;
			  }
			  .copy-btn {
				position: absolute;
				top: 5px;
				right: 5px;
				padding: 5px 10px;
				font-size: 0.8em;
			  }
			  .subscription-info {
				margin-top: 20px;
				background-color: #222222;
				border-radius: 4px;
				padding: 15px;
			  }
			  .subscription-info h3 {
				color: #ffffff;
				margin-top: 0;
			  }
			  .subscription-info ul {
				padding-left: 20px;
			  }
			  .subscription-info li {
				margin-bottom: 10px;
			  }
			</style>
			<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.3/css/all.min.css">
		  </head>
		  `;

    const header = `
			<div class="container">
			  <h1>EDtunnel: Protocol Configuration</h1>
			  <img src="https://cdn.jsdelivr.net/gh/6Kmfi6HP/EDtunnel@refs/heads/main/image/logo.png" alt="EDtunnel Logo" class="logo">
			  <p>Welcome! This function generates configuration for the vless protocol. If you found this useful, please check our GitHub project:</p>
			  <p><a href="https://github.com/6Kmfi6HP/EDtunnel" target="_blank" style="color: #00ff00;">EDtunnel - https://github.com/6Kmfi6HP/EDtunnel</a></p>
			  <div style="clear: both;"></div>
			  <div class="btn-group">
				<a href="//${hostName}/sub/${
      userIDArray[0]
    }" class="btn" target="_blank"><i class="fas fa-link"></i> VLESS Subscription</a>
				<a href="clash://install-config?url=${encodeURIComponent(
          `https://${hostName}/sub/${userIDArray[0]}?format=clash`
        )}" class="btn" target="_blank"><i class="fas fa-bolt"></i> Clash Subscription</a>
				<a href="${clash_link}" class="btn" target="_blank"><i class="fas fa-bolt"></i> Clash Link</a>
				<a href="${subbestip}" class="btn" target="_blank"><i class="fas fa-star"></i> Best IP Subscription</a>
			  </div>
			  <div class="subscription-info">
				<h3>Options Explained:</h3>
				<ul>
				  <li><strong>VLESS Subscription:</strong> Direct link for VLESS protocol configuration. Suitable for clients supporting VLESS.</li>
				  <li><strong>Clash Subscription:</strong> Opens the Clash client with pre-configured settings. Best for Clash users on mobile devices.</li>
				  <li><strong>Clash Link:</strong> A web link to convert the VLESS config to Clash format. Useful for manual import or troubleshooting.</li>
				  <li><strong>Best IP Subscription:</strong> Provides a curated list of optimal server IPs for many <b>different countries</b>.</li>
				</ul>
				<p>Choose the option that best fits your client and needs. For most users, the VLESS or Clash Subscription will be the easiest to use.</p>
			  </div>
			</div>
		  `;

    const configOutput = userIDArray
      .map((userID) => {
        const protocolMain =
          atob(pt) +
          "://" +
          userID +
          atob(at) +
          hostName +
          ":443" +
          commonUrlPart;
        const protocolSec =
          atob(pt) +
          "://" +
          userID +
          atob(at) +
          proxyIP[0].split(":")[0] +
          ":" +
          proxyPort +
          commonUrlPart;
        return `
			  <div class="container config-item">
				<h2>UUID: ${userID}</h2>
				<h3>Default IP Configuration</h3>
				<div class="code-container">
				  <pre><code>${protocolMain}</code></pre>
				  <button class="btn copy-btn" onclick='copyToClipboard("${protocolMain}")'><i class="fas fa-copy"></i> Copy</button>
				</div>
				
				<h3>Best IP Configuration</h3>
				<div class="input-group mb-3">
				  <select class="form-select" id="proxySelect" onchange="updateProxyConfig()">
					${
            typeof proxyIP === "string"
              ? `<option value="${proxyIP}">${proxyIP}</option>`
              : Array.from(proxyIP)
                  .map((proxy) => `<option value="${proxy}">${proxy}</option>`)
                  .join("")
          }
				  </select>
				</div>
				<br>
				<div class="code-container">
				  <pre><code id="proxyConfig">${protocolSec}</code></pre>
				  <button class="btn copy-btn" onclick='copyToClipboard(document.getElementById("proxyConfig").textContent)'><i class="fas fa-copy"></i> Copy</button>
				</div>
			  </div>
			`;
      })
      .join("");

    return `
		  <html>
		  ${htmlHead}
		  <body>
			${header}
			${configOutput}
			<script>
			  const userIDArray = ${JSON.stringify(userIDArray)};
			  const pt = "${pt}";
			  const at = "${at}";
			  const commonUrlPart = "?encryption=none&security=tls&sni=${hostName}&fp=randomized&type=ws&host=${hostName}&path=%2F%3Fed%3D2048#${hostName}";

			  function copyToClipboard(text) {
				navigator.clipboard.writeText(text)
				  .then(() => {
					alert("Copied to clipboard");
				  })
				  .catch((err) => {
					console.error("Failed to copy to clipboard:", err);
				  });
			  }

			  function updateProxyConfig() {
				const select = document.getElementById('proxySelect');
				const proxyValue = select.value;
				const [host, port] = proxyValue.split(':');
				const protocolSec = atob(pt) + '://' + userIDArray[0] + atob(at) + host + ":" + port + commonUrlPart;
				document.getElementById("proxyConfig").textContent = protocolSec;
			  }
			</script>
		  </body>
		  </html>`;
  } catch (error) {
    logger.error("Error generating config", {
      error: error.message,
      userIDs,
      hostName,
      proxyIP: typeof proxyIP === "string" ? proxyIP : "[array]",
    });
    return `<html><body><h1>Error generating configuration</h1><p>${error.message}</p></body></html>`;
  }
}

const HttpPort = new Set([80, 8080, 8880, 2052, 2086, 2095, 2082]);
const HttpsPort = new Set([443, 8443, 2053, 2096, 2087, 2083]);

/**
 * Generates subscription content with enhanced error handling
 * @param {string} userID_path - User ID path
 * @param {string} hostname - Host name
 * @param {string|string[]} proxyIP - Proxy IP address or array of addresses
 * @returns {string} Subscription content
 */
function GenSub(userID_path, hostname, proxyIP) {
  try {
    // Add all CloudFlare public CNAME domains
    const mainDomains = new Set([
      hostname,
      // public domains
      "icook.hk",
      "japan.com",
      "malaysia.com",
      "russia.com",
      "singapore.com",
      "www.visa.com",
      "www.csgo.com",
      "www.shopify.com",
      "www.whatismyip.com",
      "www.ipget.net",
      // 高频率更新
      "freeyx.cloudflare88.eu.org", // 1000ip/3min
      "cloudflare.182682.xyz", // 15ip/15min
      "cfip.cfcdn.vip", // 6ip/1天
      proxyIPs,
      // 手动更新和未知频率
      "cf.0sm.com", // 手动更新
      "cloudflare-ip.mofashi.ltd", // 未知频率
      "cf.090227.xyz", // 未知频率
      "cf.zhetengsha.eu.org", // 未知频率
      "cloudflare.9jy.cc", // 未知频率
      "cf.zerone-cdn.pp.ua", // 未知频率
      "cfip.1323123.xyz", // 未知频率
      "cdn.tzpro.xyz", // 未知频率
      "cf.877771.xyz", // 未知频率
      "cnamefuckxxs.yuchen.icu", // 未知频率
      "cfip.xxxxxxxx.tk", // OTC大佬提供维护
    ]);

    const userIDArray = userID_path.includes(",")
      ? userID_path.split(",").map((id) => id.trim())
      : [userID_path];
    const proxyIPArray = Array.isArray(proxyIP)
      ? proxyIP
      : proxyIP
      ? proxyIP.includes(",")
        ? proxyIP.split(",").map((ip) => ip.trim())
        : [proxyIP]
      : proxyIPs;
    const randomPath = () =>
      "/" + Math.random().toString(36).substring(2, 15) + "?ed=2048";
    const commonUrlPartHttp = `?encryption=none&security=none&fp=random&type=ws&host=${hostname}&path=${encodeURIComponent(
      randomPath()
    )}#`;
    const commonUrlPartHttps = `?encryption=none&security=tls&sni=${hostname}&fp=random&type=ws&host=${hostname}&path=%2F%3Fed%3D2048#`;

    const result = userIDArray.flatMap((userID) => {
      let allUrls = [];
      // Generate main HTTP URLs first for all domains
      if (!hostname.includes("pages.dev")) {
        mainDomains.forEach((domain) => {
          Array.from(HttpPort).forEach((port) => {
            const urlPart = `${hostname.split(".")[0]}-${domain}-HTTP-${port}`;
            const mainProtocolHttp =
              atob(pt) +
              "://" +
              userID +
              atob(at) +
              domain +
              ":" +
              port +
              commonUrlPartHttp +
              urlPart;
            allUrls.push(mainProtocolHttp);
          });
        });
      }

      // Generate main HTTPS URLs for all domains
      mainDomains.forEach((domain) => {
        Array.from(HttpsPort).forEach((port) => {
          const urlPart = `${hostname.split(".")[0]}-${domain}-HTTPS-${port}`;
          const mainProtocolHttps =
            atob(pt) +
            "://" +
            userID +
            atob(at) +
            domain +
            ":" +
            port +
            commonUrlPartHttps +
            urlPart;
          allUrls.push(mainProtocolHttps);
        });
      });

      // Generate proxy HTTPS URLs
      proxyIPArray.forEach((proxyAddr) => {
        const [proxyHost, proxyPort = "443"] = proxyAddr.split(":");
        const urlPart = `${
          hostname.split(".")[0]
        }-${proxyHost}-HTTPS-${proxyPort}`;
        const secondaryProtocolHttps =
          atob(pt) +
          "://" +
          userID +
          atob(at) +
          proxyHost +
          ":" +
          proxyPort +
          commonUrlPartHttps +
          urlPart +
          "-" +
          atob(ed);
        allUrls.push(secondaryProtocolHttps);
      });

      return allUrls;
    });

    return btoa(result.join("\n"));
  } catch (error) {
    logger.error("Error generating subscription", {
      error: error.message,
      userID_path,
      hostname,
      proxyIP: typeof proxyIP === "string" ? proxyIP : "[array]",
    });
    return btoa(`Error generating subscription: ${error.message}`);
  }
}

/**
 * Enhanced proxy configuration handler
 * @param {string} PROXYIP - Proxy IP configuration from environment
 * @returns {{ip: string, port: string}} Standardized proxy configuration
 */
function handleProxyConfig(PROXYIP) {
  try {
    if (PROXYIP) {
      const proxyAddresses = PROXYIP.split(",")
        .map((addr) => addr.trim())
        .filter((addr) => addr);
      const selectedProxy = selectRandomAddress(proxyAddresses);
      const [ip, port = "443"] = selectedProxy.split(":");
      return { ip, port };
    } else {
      const port = proxyIP.includes(":") ? proxyIP.split(":")[1] : "443";
      const ip = proxyIP.split(":")[0];
      return { ip, port };
    }
  } catch (error) {
    logger.warn("Error handling proxy config", {
      error: error.message,
      PROXYIP,
      fallback: proxyIPs[0],
    });
    return { ip: proxyIPs[0].split(":")[0], port: "443" };
  }
}

/**
 * Optimized random address selection with caching and validation
 * @param {string|string[]} addresses - Comma-separated string or array of addresses
 * @returns {string} Selected address
 */
function selectRandomAddress(addresses) {
  try {
    let addressArray;
    if (typeof addresses === "string") {
      // Use optimized parsing with caching
      addressArray = parseAddresses(addresses);
    } else {
      addressArray = addresses.filter((addr) => addr);
    }

    if (addressArray.length === 0) {
      throw WorkerError.badRequest("No valid addresses provided", {
        originalAddresses: addresses,
      });
    }

    // Use optimized selection
    const selected = optimizedRandomSelect(addressArray, `select-${typeof addresses === 'string' ? addresses : addresses.join(',')}`);
    return selected;
  } catch (error) {
    logger.warn("Error selecting random address", {
      error: error.message,
      addresses,
      fallback: proxyIPs[0],
    });
    return proxyIPs[0]; // Fallback to first proxy IP
  }
}

/**
 * Enhanced encoded query parameter parser
 * @param {string} pathname - URL路径
 * @returns {Object} 解析的参数对象
 */
function parseEncodedQueryParams(pathname) {
  const params = {};
  try {
    if (pathname.includes("%3F")) {
      const encodedParamsMatch = pathname.match(/%3F(.+)$/);
      if (encodedParamsMatch) {
        const encodedParams = encodedParamsMatch[1];
        const paramPairs = encodedParams.split("&");

        for (const pair of paramPairs) {
          const [key, value] = pair.split("=");
          if (key && value) {
            try {
              params[key] = decodeURIComponent(value);
            } catch (decodeError) {
              logger.warn("Failed to decode parameter", {
                key,
                value,
                error: decodeError.message,
              });
            }
          }
        }
      }
    }
  } catch (error) {
    logger.warn("Error parsing encoded query params", {
      error: error.message,
      pathname,
    });
  }
  return params;
}
