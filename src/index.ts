// EDtunnel - A Cloudflare Worker-based VLESS Proxy with WebSocket Transport
// @ts-ignore
import { Hono } from "hono";
import { connect } from "cloudflare:sockets";

// ======================================
// Configuration
// ======================================

/**
 * User configuration and settings
 * Generate UUID: [Windows] Press "Win + R", input cmd and run: Powershell -NoExit -Command "[guid]::NewGuid()"
 */
let userID = "d342d11e-d424-4583-b36e-524ab1f0afa4";

/**
 * Array of proxy server addresses with ports
 * Format: ['hostname:port', 'hostname:port']
 */
const proxyIPs = ["cdn.xn--b6gac.eu.org:443", "cdn-all.xn--b6gac.eu.org:443"];

// Randomly select a proxy server from the pool
let proxyIP = proxyIPs[Math.floor(Math.random() * proxyIPs.length)];
let proxyPort = proxyIP.includes(":") ? proxyIP.split(":")[1] : "443";

// Alternative configurations:
// Single proxy IP: let proxyIP = 'cdn.xn--b6gac.eu.org';
// IPv6 example: let proxyIP = "[2a01:4f8:c2c:123f:64:5:6810:c55a]"

/**
 * SOCKS5 proxy configuration
 * Format: 'username:password@host:port' or 'host:port'
 */
let socks5Address = "";

/**
 * SOCKS5 relay mode
 * When true: All traffic is proxied through SOCKS5
 * When false: Only Cloudflare IPs use SOCKS5
 */
let socks5Relay = false;

if (!isValidUUID(userID)) {
  throw new Error("uuid is not valid");
}

// Add this interface near the top of the file, with other type definitions
interface Socks5Address {
  username?: string;
  password?: string;
  hostname: string;
  port: number;
}
interface ProtocolHeaderResult {
  hasError: boolean;
  message?: string;
  addressRemote?: string;
  addressType?: number;
  portRemote?: number;
  rawDataIndex?: number;
  protocolVersion?: Uint8Array;
  isUDP?: boolean;
}
interface Base64Result {
  earlyData: ArrayBuffer | null;
  error: Error | null;
}
// Update the parsedSocks5Address declaration
let parsedSocks5Address: Socks5Address = {
  hostname: "",
  port: 0,
};

let enableSocks = false;

// Define the bindings type for environment variables
type Bindings = {
  UUID: string;
  PROXYIP: string;
  SOCKS5: string;
  SOCKS5_RELAY: string;
};

// Create Hono app instance with bindings
const app = new Hono<{ Bindings: Bindings }>();

let allowedUserIDs: Set<string>;

// Define routes
app.get("/cf", (c) => {
  // @ts-ignore
  return c.json(c.req.cf);
});

app.get("/:userID", async (c) => {
  const requestedUserID = c.req.param("userID");
  if (!allowedUserIDs.has(requestedUserID)) {
    return handleDefaultPath(new URL(c.req.url), c.req.raw);
  }
  const host = c.req.header("Host");
  return c.html(getConfig(requestedUserID, host || ""));
});

app.get("/sub/:userID", async (c) => {
  const requestedUserID = c.req.param("userID");
  if (!allowedUserIDs.has(requestedUserID)) {
    return handleDefaultPath(new URL(c.req.url), c.req.raw);
  }
  const host = c.req.header("Host");
  return c.text(btoa(GenSub(requestedUserID, host || "")));
});

app.get("/bestip/:userID", async (c) => {
  const requestedUserID = c.req.param("userID");
  if (!allowedUserIDs.has(requestedUserID)) {
    return handleDefaultPath(new URL(c.req.url), c.req.raw);
  }
  const host = c.req.header("Host");
  const headers = Object.fromEntries(c.req.raw.headers.entries());
  return fetch(
    `https://sub.xf.free.hr/auto?host=${host}&uuid=${requestedUserID}&path=/`,
    { headers }
  );
});

// Default route handler for non-WebSocket requests
// WebSocket handler
app.all("*", async (c) => {
  const upgradeHeader = c.req.header("Upgrade");
  if (upgradeHeader !== "websocket") {
    return handleDefaultPath(new URL(c.req.url), c.req.raw);
  }
  // @ts-ignore
  return await ProtocolOverWSHandler(c.req.raw);
});

// Export the worker
export default {
  async fetch(request: Request, env: Bindings, ctx: ExecutionContext) {
    // Set global variables from environment
    userID = env.UUID || userID;
    allowedUserIDs = new Set(userID.split(","));
    socks5Address = env.SOCKS5 || socks5Address;
    socks5Relay = env.SOCKS5_RELAY === "true" || socks5Relay;

    if (env.PROXYIP) {
      const proxyAddresses = env.PROXYIP.split(",").map((addr) => addr.trim());
      const selectedProxy =
        proxyAddresses[Math.floor(Math.random() * proxyAddresses.length)];
      [proxyIP, proxyPort = "443"] = selectedProxy.split(":");
    } else {
      proxyPort = proxyIP.includes(":") ? proxyIP.split(":")[1] : "443";
      proxyIP = proxyIP.split(":")[0];
    }
    if (socks5Address) {
      try {
        // Split SOCKS5 into an array of addresses
        const socks5Addresses = socks5Address
          .split(",")
          .map((addr) => addr.trim());
        // Randomly select one SOCKS5 address
        const selectedSocks5 =
          socks5Addresses[Math.floor(Math.random() * socks5Addresses.length)];
        parsedSocks5Address = socks5AddressParser(selectedSocks5);
        enableSocks = true;
      } catch (err) {
        console.log(err);
        enableSocks = false;
      }
    }
    if (!isValidUUID(userID)) {
      throw new Error("uuid is not valid");
    }

    // Handle the request with Hono
    return app.fetch(request, env, ctx);
  },
};

/**
 * Handles default path requests when no specific route matches.
 * Generates and returns a cloud drive interface HTML page.
 * @param {URL} url - The URL object of the request
 * @param {Request} request - The incoming request object
 * @returns {Response} HTML response with cloud drive interface
 */
async function handleDefaultPath(
  url: URL,
  request: { headers: { get: (arg0: string) => any } }
): Promise<Response> {
  const host = request.headers.get("Host");
  const DrivePage = `
	  <!DOCTYPE html>
	  <html lang="en">
	  <head>
		  <meta charset="UTF-8">
		  <meta name="viewport" content="width=device-width, initial-scale=1.0">
		  <title>${host} - Cloud Drive</title>
		  <style>
			  body {
				  font-family: Arial, sans-serif;
				  line-height: 1.6;
				  margin: 0;
				  padding: 20px;
				  background-color: #f4f4f4;
			  }
			  .container {
				  max-width: 800px;
				  margin: auto;
				  background: white;
				  padding: 20px;
				  border-radius: 5px;
				  box-shadow: 0 0 10px rgba(0,0,0,0.1);
			  }
			  h1 {
				  color: #333;
			  }
			  .file-list {
				  list-style-type: none;
				  padding: 0;
			  }
			  .file-list li {
				  background: #f9f9f9;
				  margin-bottom: 10px;
				  padding: 10px;
				  border-radius: 3px;
				  display: flex;
				  align-items: center;
			  }
			  .file-list li:hover {
				  background: #f0f0f0;
			  }
			  .file-icon {
				  margin-right: 10px;
				  font-size: 1.2em;
			  }
			  .file-link {
				  text-decoration: none;
				  color: #0066cc;
				  flex-grow: 1;
			  }
			  .file-link:hover {
				  text-decoration: underline;
			  }
			  .upload-area {
				  margin-top: 20px;
				  padding: 40px;
				  background: #e9e9e9;
				  border: 2px dashed #aaa;
				  border-radius: 5px;
				  text-align: center;
				  cursor: pointer;
				  transition: all 0.3s ease;
			  }
			  .upload-area:hover, .upload-area.drag-over {
				  background: #d9d9d9;
				  border-color: #666;
			  }
			  .upload-area h2 {
				  margin-top: 0;
				  color: #333;
			  }
			  #fileInput {
				  display: none;
			  }
			  .upload-icon {
				  font-size: 48px;
				  color: #666;
				  margin-bottom: 10px;
			  }
			  .upload-text {
				  font-size: 18px;
				  color: #666;
			  }
			  .upload-status {
				  margin-top: 20px;
				  font-style: italic;
				  color: #666;
			  }
			  .file-actions {
				  display: flex;
				  gap: 10px;
			  }
			  .delete-btn {
				  color: #ff4444;
				  cursor: pointer;
				  background: none;
				  border: none;
				  padding: 5px;
			  }
			  .delete-btn:hover {
				  color: #ff0000;
			  }
			  .clear-all-btn {
				  background-color: #ff4444;
				  color: white;
				  border: none;
				  padding: 10px 15px;
				  border-radius: 4px;
				  cursor: pointer;
				  margin-bottom: 20px;
			  }
			  .clear-all-btn:hover {
				  background-color: #ff0000;
			  }
		  </style>
	  </head>
	  <body>
		  <div class="container">
			  <h1>Cloud Drive</h1>
			  <p>Welcome to your personal cloud storage. Here are your uploaded files:</p>
			  <button id="clearAllBtn" class="clear-all-btn">Clear All Files</button>
			  <ul id="fileList" class="file-list">
			  </ul>
			  <div id="uploadArea" class="upload-area">
				  <div class="upload-icon">📁</div>
				  <h2>Upload a File</h2>
				  <p class="upload-text">Drag and drop a file here or click to select</p>
				  <input type="file" id="fileInput" hidden>
			  </div>
			  <div id="uploadStatus" class="upload-status"></div>
		  </div>
		  <script>
			  function loadFileList() {
				  const fileList = document.getElementById('fileList');
				  const savedFiles = JSON.parse(localStorage.getItem('uploadedFiles')) || [];
				  fileList.innerHTML = '';
				  savedFiles.forEach((file, index) => {
					  const li = document.createElement('li');
					  li.innerHTML = \`
						  <span class="file-icon">📄</span>
						  <a href="https://ipfs.io/ipfs/\${file.Url.split('/').pop()}" class="file-link" target="_blank">\${file.Name}</a>
						  <div class="file-actions">
							  <button class="delete-btn" onclick="deleteFile(\${index})">
								  <span class="file-icon">❌</span>
							  </button>
						  </div>
					  \`;
					  fileList.appendChild(li);
				  });
			  }

			  function deleteFile(index) {
				  const savedFiles = JSON.parse(localStorage.getItem('uploadedFiles')) || [];
				  savedFiles.splice(index, 1);
				  localStorage.setItem('uploadedFiles', JSON.stringify(savedFiles));
				  loadFileList();
			  }

			  document.getElementById('clearAllBtn').addEventListener('click', () => {
				  if (confirm('Are you sure you want to clear all files?')) {
					  localStorage.removeItem('uploadedFiles');
					  loadFileList();
				  }
			  });

			  loadFileList();

			  const uploadArea = document.getElementById('uploadArea');
			  const fileInput = document.getElementById('fileInput');
			  const uploadStatus = document.getElementById('uploadStatus');

			  uploadArea.addEventListener('dragover', (e) => {
				  e.preventDefault();
				  uploadArea.classList.add('drag-over');
			  });

			  uploadArea.addEventListener('dragleave', () => {
				  uploadArea.classList.remove('drag-over');
			  });

			  uploadArea.addEventListener('drop', (e) => {
				  e.preventDefault();
				  uploadArea.classList.remove('drag-over');
				  const files = e.dataTransfer.files;
				  if (files.length) {
					  handleFileUpload(files[0]);
				  }
			  });

			  uploadArea.addEventListener('click', () => {
				  fileInput.click();
			  });

			  fileInput.addEventListener('change', (e) => {
				  const file = e.target.files[0];
				  if (file) {
					  handleFileUpload(file);
				  }
			  });

			  async function handleFileUpload(file) {
				  uploadStatus.textContent = \`Uploading: \${file.name}...\`;
				  
				  const formData = new FormData();
				  formData.append('file', file);

				  try {
					  const response = await fetch('https://app.img2ipfs.org/api/v0/add', {
						  method: 'POST',
						  body: formData,
						  headers: {
							  'Accept': 'application/json',
						  },
					  });

					  if (!response.ok) {
						  throw new Error('Upload failed');
					  }

					  const result = await response.json();
					  uploadStatus.textContent = \`File uploaded successfully! IPFS Hash: \${result.Hash}\`;
					  
					  const savedFiles = JSON.parse(localStorage.getItem('uploadedFiles')) || [];
					  savedFiles.push(result);
					  localStorage.setItem('uploadedFiles', JSON.stringify(savedFiles));
					  
					  loadFileList();
					  
				  } catch (error) {
					  console.error('Error:', error);
					  uploadStatus.textContent = 'Upload failed. Please try again.';
				  }
			  }
		  </script>
	  </body>
	  </html>
	`;

  // 返回伪装的网盘页面
  return new Response(DrivePage, {
    headers: {
      "content-type": "text/html;charset=UTF-8",
    },
  });
}

/**
 * Handles protocol over WebSocket requests by creating a WebSocket pair, accepting the WebSocket connection, and processing the protocol header.
 * @param {import("@cloudflare/workers-types").Request} request - The incoming request object
 * @returns {Promise<Response>} WebSocket response
 */
async function ProtocolOverWSHandler(request: {
  headers: { get: (arg0: string) => string };
}): Promise<Response> {
  /** @type {import("@cloudflare/workers-types").WebSocket[]} */
  // @ts-ignore
  const webSocketPair: import("@cloudflare/workers-types").WebSocket[] = new WebSocketPair();
  const [client, webSocket] = Object.values(webSocketPair);

  webSocket.accept();

  let address = "";
  let portWithRandomLog = "";
  let hasIncomingData = false;
  let isClosed = false;

  // Handle messages received on the WebSocket
  const log = (info: string, event?: any) => {
    console.log(`[${address}:${portWithRandomLog}] ${info}`);
    if (event) {
      console.log(event);
    }
  };

  const earlyDataHeader = request.headers.get("sec-websocket-protocol") || "";

  const readableWebSocketStream = MakeReadableWebSocketStream(
    webSocket,
    earlyDataHeader,
    (info: any, event?: any) => log(info, event)
  );

  /** @type {{ value: import("@cloudflare/workers-types").Socket | null}}*/
  let remoteSocketWapper: { value: Socket | null } = {
    value: null,
  };
  let isDns = false;

  // ws --> remote
  readableWebSocketStream
    .pipeTo(
      new WritableStream({
        async write(chunk) {
          if (isDns) {
            return await handleDNSQuery(
              chunk,
              webSocket,
              null,
              (info: string, event?: string) => log(info, event || "")
            );
          }
          if (remoteSocketWapper.value) {
            const writer = remoteSocketWapper.value.writable.getWriter();
            await writer.write(chunk);
            writer.releaseLock();
            return;
          }

          const {
            hasError,
            message,
            addressType,
            portRemote = 443,
            addressRemote = "",
            rawDataIndex,
            protocolVersion: ProtocolVersion = new Uint8Array([0, 0]),
            isUDP,
          } = ProcessProtocolHeader(chunk, userID);

          address = addressRemote;
          portWithRandomLog = `${portRemote}--${Math.random()} ${
            isUDP ? "udp " : "tcp "
          } `;
          if (hasError) {
            // controller.error(message);
            throw new Error(message); // cf seems has bug, controller.error will not end stream
          }
          // Handle UDP connections for DNS (port 53) only
          if (isUDP) {
            if (portRemote === 53) {
              isDns = true;
            } else {
              throw new Error("UDP proxy is only enabled for DNS (port 53)");
            }
            return; // Early return after setting isDns or throwing error
          }
          // ["version", "附加信息长度 N"]
          const ProtocolResponseHeader = new Uint8Array([
            ProtocolVersion[0],
            0,
          ]);
          const rawClientData = chunk.slice(rawDataIndex);

          if (isDns) {
            return handleDNSQuery(
              rawClientData,
              webSocket,
              ProtocolResponseHeader,
              (info: any, event?: any) => log(info, event)
            );
          }
          HandleTCPOutBound(
            remoteSocketWapper,
            addressType,
            addressRemote,
            portRemote,
            rawClientData,
            webSocket,
            ProtocolResponseHeader,
            (info: any, event?: any) => log(info, event)
          );
        },
        close() {
          log(
            `Remote connection readable closed. Had incoming data: ${hasIncomingData}`
          );
          isClosed = true;
        },
        abort(reason) {
          isClosed = true;
          console.error(`Remote connection readable aborted:`, reason);
        },
      })
    )
    .catch((err) => {
      log("readableWebSocketStream pipeTo error", err);
    });

  return new Response(null, {
    status: 101,
    // @ts-ignore
    webSocket: client,
  });
}

/**
 * Handles outbound TCP connections for the proxy.
 * Establishes connection to remote server and manages data flow.
 * @param {Socket} remoteSocket - Socket for remote connection
 * @param {string} addressType - Type of address
 * @param {string} addressRemote - Remote server address
 * @param {number} portRemote - Remote server port
 * @param {Uint8Array} rawClientData - Raw data from client
 * @param {WebSocket} webSocket - WebSocket connection
 * @param {Uint8Array} ProtocolResponseHeader - Protocol response header
 * @param {Function} log - Logging function
 */
async function HandleTCPOutBound(
  remoteSocket: { value: any },
  addressType: number | undefined,
  addressRemote: string,
  portRemote: number,
  rawClientData: any,
  webSocket: WebSocket,
  ProtocolResponseHeader: Uint8Array,
  log: { (info: any, event: any): void; (arg0: string): void }
) {
  async function connectAndWrite(address: any, port: any, socks = false) {
    /** @type {import("@cloudflare/workers-types").Socket} */
    let tcpSocket: import("@cloudflare/workers-types").Socket;
    if (socks5Relay) {
      tcpSocket = await socks5Connect(addressType, address, port, log);
    } else {
      tcpSocket = socks
        ? await socks5Connect(addressType, address, port, log)
        : connect({
            hostname: address,
            port: port,
          });
    }
    remoteSocket.value = tcpSocket;
    log(`connected to ${address}:${port}`);
    const writer = tcpSocket?.writable.getWriter();
    await writer?.write(rawClientData); // first write, normal is tls client hello
    writer?.releaseLock();
    return tcpSocket;
  }

  // if the cf connect tcp socket have no incoming data, we retry to redirect ip
  async function retry() {
    if (enableSocks) {
      tcpSocket = await connectAndWrite(addressRemote, portRemote, true);
    } else {
      tcpSocket = await connectAndWrite(
        proxyIP || addressRemote,
        proxyPort || portRemote,
        false
      );
    }
    // no matter retry success or not, close websocket
    tcpSocket?.closed
      .catch((error) => {
        console.log("retry tcpSocket closed error", error);
      })
      .finally(() => {
        safeCloseWebSocket(webSocket);
      });
    RemoteSocketToWS(tcpSocket, webSocket, ProtocolResponseHeader, null, log);
  }

  let tcpSocket = await connectAndWrite(addressRemote, portRemote);

  // when remoteSocket is ready, pass to websocket
  // remote--> ws
  RemoteSocketToWS(tcpSocket, webSocket, ProtocolResponseHeader, retry, log);
}

/**
 * Creates a readable stream from WebSocket server.
 * Handles early data and WebSocket messages.
 * @param {WebSocket} webSocketServer - WebSocket server instance
 * @param {string} earlyDataHeader - Header for early data (0-RTT)
 * @param {Function} log - Logging function
 * @returns {ReadableStream} Stream of WebSocket data
 */
function MakeReadableWebSocketStream(
  webSocketServer: WebSocket,
  earlyDataHeader: any,
  log: { (info: any, event: any): void; (arg0: string): void }
): ReadableStream {
  let readableStreamCancel = false;
  let controller: ReadableStreamDefaultController<any>;

  const stream = new ReadableStream({
    start(c) {
      controller = c;

      webSocketServer.addEventListener("message", (event: { data: any }) => {
        if (!readableStreamCancel) {
          try {
            controller.enqueue(event.data);
          } catch (err) {
            console.error("Failed to enqueue websocket message:", err);
          }
        }
      });

      webSocketServer.addEventListener("close", () => {
        if (!readableStreamCancel) {
          safeCloseWebSocket(webSocketServer);
          controller.close();
        }
      });

      webSocketServer.addEventListener("error", (err: any) => {
        log("webSocketServer has error");
        if (!readableStreamCancel) {
          controller.error(err);
        }
      });

      const { earlyData, error } = base64ToArrayBuffer(earlyDataHeader);
      if (error) {
        controller.error(error);
      } else if (earlyData) {
        controller.enqueue(earlyData);
      }
    },

    pull(_controller) {
      // if ws can stop read if stream is full, we can implement backpressure
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
 * Processes VLESS protocol header.
 * Extracts and validates protocol information from buffer.
 * @param {ArrayBuffer} protocolBuffer - Buffer containing protocol header
 * @param {string} userID - User ID for validation
 * @returns {Object} Processed header information
 */
function ProcessProtocolHeader(
  protocolBuffer: ArrayBufferLike & { BYTES_PER_ELEMENT?: never },
  userID: string
): ProtocolHeaderResult {
  if (protocolBuffer.byteLength < 24) {
    return { hasError: true, message: "invalid data" };
  }

  const dataView = new DataView(protocolBuffer);
  const version = dataView.getUint8(0);
  const slicedBufferString = stringify(
    new Uint8Array(protocolBuffer.slice(1, 17))
  );

  const uuids = userID.includes(",") ? userID.split(",") : [userID];
  const isValidUser =
    uuids.some((uuid: string) => slicedBufferString === uuid.trim()) ||
    (uuids.length === 1 && slicedBufferString === uuids[0].trim());

  console.log(`userID: ${slicedBufferString}`);

  if (!isValidUser) {
    return { hasError: true, message: "invalid user" };
  }

  const optLength = dataView.getUint8(17);
  const command = dataView.getUint8(18 + optLength);

  if (command !== 1 && command !== 2) {
    return {
      hasError: true,
      message: `command ${command} is not supported, command 01-tcp,02-udp,03-mux`,
    };
  }

  const portIndex = 18 + optLength + 1;
  const portRemote = dataView.getUint16(portIndex);
  const addressType = dataView.getUint8(portIndex + 2);
  let addressValue, addressLength, addressValueIndex: number;

  switch (addressType) {
    case 1:
      addressLength = 4;
      addressValueIndex = portIndex + 3;
      addressValue = new Uint8Array(
        protocolBuffer.slice(
          addressValueIndex,
          addressValueIndex + addressLength
        )
      ).join(".");
      break;
    case 2:
      addressLength = dataView.getUint8(portIndex + 3);
      addressValueIndex = portIndex + 4;
      addressValue = new TextDecoder().decode(
        protocolBuffer.slice(
          addressValueIndex,
          addressValueIndex + addressLength
        )
      );
      break;
    case 3:
      addressLength = 16;
      addressValueIndex = portIndex + 3;
      addressValue = Array.from({ length: 8 }, (_, i) =>
        dataView.getUint16(addressValueIndex + i * 2).toString(16)
      ).join(":");
      break;
    default:
      return { hasError: true, message: `invalid addressType: ${addressType}` };
  }

  if (!addressValue) {
    return {
      hasError: true,
      message: `addressValue is empty, addressType is ${addressType}`,
    };
  }

  return {
    hasError: false,
    addressRemote: addressValue,
    addressType,
    portRemote,
    rawDataIndex: addressValueIndex + addressLength,
    protocolVersion: new Uint8Array([version]),
    isUDP: command === 2,
  };
}

/**
 * Converts remote socket connection to WebSocket.
 * Handles data transfer between socket and WebSocket.
 * @param {Socket} remoteSocket - Remote socket connection
 * @param {WebSocket} webSocket - WebSocket connection
 * @param {ArrayBuffer} protocolResponseHeader - Protocol response header
 * @param {Function} retry - Retry function for failed connections
 * @param {Function} log - Logging function
 */
async function RemoteSocketToWS(
  remoteSocket: Socket | undefined,
  webSocket: WebSocket,
  protocolResponseHeader: Uint8Array | null,
  retry: { (): Promise<void>; (): any } | null,
  log: (arg0: string) => void
) {
  let hasIncomingData = false;
  let isClosed = false;

  try {
    await remoteSocket?.readable.pipeTo(
      new WritableStream({
        async write(chunk) {
          if (webSocket.readyState === WS_READY_STATE_OPEN) {
            hasIncomingData = true;
            if (protocolResponseHeader) {
              webSocket.send(
                await new Blob([protocolResponseHeader, chunk]).arrayBuffer()
              );
              protocolResponseHeader = null;
            } else {
              webSocket.send(chunk);
            }
          }
        },
        close() {
          log(
            `Remote connection readable closed. Had incoming data: ${hasIncomingData}`
          );
          isClosed = true;
        },
        abort(reason) {
          isClosed = true;
          console.error(`Remote connection readable aborted:`, reason);
        },
      })
    );
  } catch (error: unknown) {
    if (!isClosed) {
      console.error(`RemoteSocketToWS error:`, (error as Error).stack || error);
      safeCloseWebSocket(webSocket);
    }
  }

  if (!hasIncomingData && retry && !isClosed) {
    log(`No incoming data, retrying`);
    await retry();
  }
}
/**
 * Converts base64 string to ArrayBuffer.
 * @param {string} base64Str - Base64 encoded string
 * @returns {Base64Result} Object containing decoded data or error
 */
function base64ToArrayBuffer(base64Str: string): Base64Result {
  if (!base64Str) {
    return { earlyData: null, error: null };
  }
  try {
    // Convert modified Base64 for URL (RFC 4648) to standard Base64
    const standardB64Str = base64Str.replace(/-/g, "+").replace(/_/g, "/");
    const binaryStr = atob(standardB64Str);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }
    return { earlyData: bytes.buffer, error: null };
  } catch (error) {
    return { earlyData: null, error: error as Error };
  }
}

/**
 * Validates UUID format.
 * @param {string} uuid - UUID string to validate
 * @returns {boolean} True if valid UUID
 */
function isValidUUID(uuid: string): boolean {
  // More precise UUID regex pattern
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

const WS_READY_STATE_OPEN = 1;
const WS_READY_STATE_CLOSING = 2;

/**
 * Safely closes WebSocket connection.
 * Prevents exceptions during WebSocket closure.
 * @param {WebSocket} socket - WebSocket to close
 */
function safeCloseWebSocket(socket: { readyState: number; close: () => void }) {
  try {
    if (
      socket.readyState === WS_READY_STATE_OPEN ||
      socket.readyState === WS_READY_STATE_CLOSING
    ) {
      socket.close();
    }
  } catch (error) {
    console.error("safeCloseWebSocket error:", error);
  }
}

const byteToHex = Array.from({ length: 256 }, (_, i) =>
  (i + 0x100).toString(16).slice(1)
);

/**
 * Converts byte array to hex string without validation.
 * @param {Uint8Array} arr - Byte array to convert
 * @param {number} offset - Starting offset
 * @returns {string} Hex string
 */
function unsafeStringify(arr: (string | number)[], offset: number = 0): string {
  return [
    byteToHex[arr[offset] as number],
    byteToHex[arr[offset + 1] as number],
    byteToHex[arr[offset + 2] as number],
    byteToHex[arr[offset + 3] as number],
    "-",
    byteToHex[arr[offset + 4] as number],
    byteToHex[arr[offset + 5] as number],
    "-",
    byteToHex[arr[offset + 6] as number],
    byteToHex[arr[offset + 7] as number],
    "-",
    byteToHex[arr[offset + 8] as number],
    byteToHex[arr[offset + 9] as number],
    "-",
    byteToHex[arr[offset + 10] as number],
    byteToHex[arr[offset + 11] as number],
    byteToHex[arr[offset + 12] as number],
    byteToHex[arr[offset + 13] as number],
    byteToHex[arr[offset + 14] as number],
    byteToHex[arr[offset + 15] as number],
  ]
    .join("")
    .toLowerCase();
}

/**
 * Safely converts byte array to hex string with validation.
 * @param {Uint8Array} arr - Byte array to convert
 * @param {number} offset - Starting offset
 * @returns {string} Hex string
 */
function stringify(arr: Uint8Array, offset: number = 0): string {
  const uuid = unsafeStringify(Array.from(arr), offset);
  if (!isValidUUID(uuid)) {
    throw new TypeError("Stringified UUID is invalid");
  }
  return uuid;
}

/**
 * Handles DNS query through UDP.
 * Processes DNS requests and forwards them.
 * @param {ArrayBuffer} udpChunk - UDP data chunk
 * @param {WebSocket} webSocket - WebSocket connection
 * @param {ArrayBuffer} protocolResponseHeader - Protocol response header
 * @param {Function} log - Logging function
 */
async function handleDNSQuery(
  udpChunk: any,
  webSocket: WebSocket,
  protocolResponseHeader: Uint8Array | null,
  log: {
    (info: any, event: any): void;
    (info: any, event: any): void;
    (arg0: string): void;
  }
) {
  // no matter which DNS server client send, we alwasy use hard code one.
  // beacsue someof DNS server is not support DNS over TCP
  try {
    const dnsServer = "8.8.4.4"; // change to 1.1.1.1 after cf fix connect own ip bug
    const dnsPort = 53;
    /** @type {ArrayBuffer | null} */
    let vlessHeader: ArrayBuffer | null = protocolResponseHeader;
    /** @type {import("@cloudflare/workers-types").Socket} */
    const tcpSocket: import("@cloudflare/workers-types").Socket = connect({
      hostname: dnsServer,
      port: dnsPort,
    });

    log(`connected to ${dnsServer}:${dnsPort}`);
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
        },
        abort(reason) {
          console.error(`dns server(${dnsServer}) tcp is abort`, reason);
        },
      })
    );
  } catch (error: unknown) {
    console.error(
      `handleDNSQuery have exception, error: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

/**
 * Establishes SOCKS5 proxy connection.
 * @param {number} addressType - Type of address
 * @param {string} addressRemote - Remote address
 * @param {number} portRemote - Remote port
 * @param {Function} log - Logging function
 * @returns {Promise<Socket>} Connected socket
 */
async function socks5Connect(
  addressType: any,
  addressRemote: string | undefined,
  portRemote: number,
  log: (arg0: string) => void
): Promise<Socket> {
  const { username, password, hostname, port } = parsedSocks5Address;
  // Connect to the SOCKS server
  const socket = connect({
    hostname,
    port,
  });

  // Request head format (Worker -> Socks Server):
  // +----+----------+----------+
  // |VER | NMETHODS | METHODS  |
  // +----+----------+----------+
  // | 1  |    1     | 1 to 255 |
  // +----+----------+----------+

  // https://en.wikipedia.org/wiki/SOCKS#SOCKS5
  // For METHODS:
  // 0x00 NO AUTHENTICATION REQUIRED
  // 0x02 USERNAME/PASSWORD https://datatracker.ietf.org/doc/html/rfc1929
  const socksGreeting = new Uint8Array([5, 2, 0, 2]);

  const writer = socket.writable.getWriter();

  await writer.write(socksGreeting);
  log("sent socks greeting");

  const reader = socket.readable.getReader();
  const encoder = new TextEncoder();
  let res = (await reader.read()).value;
  // Response format (Socks Server -> Worker):
  // +----+--------+
  // |VER | METHOD |
  // +----+--------+
  // | 1  |   1    |
  // +----+--------+
  if (res[0] !== 0x05) {
    log(`socks server version error: ${res[0]} expected: 5`);
    return socket;
  }
  if (res[1] === 0xff) {
    log("no acceptable methods");
    return socket;
  }

  // if return 0x0502
  if (res[1] === 0x02) {
    log("socks server needs auth");
    if (!username || !password) {
      log("please provide username/password");
      return socket;
    }
    // +----+------+----------+------+----------+
    // |VER | ULEN |  UNAME   | PLEN |  PASSWD  |
    // +----+------+----------+------+----------+
    // | 1  |  1   | 1 to 255 |  1   | 1 to 255 |
    // +----+------+----------+------+----------+
    const authRequest = new Uint8Array([
      1,
      username.length,
      ...encoder.encode(username),
      password.length,
      ...encoder.encode(password),
    ]);
    await writer.write(authRequest);
    res = (await reader.read()).value;
    // expected 0x0100
    if (res[0] !== 0x01 || res[1] !== 0x00) {
      log("fail to auth socks server");
      return socket;
    }
  }

  // Request data format (Worker -> Socks Server):
  // +----+-----+-------+------+----------+----------+
  // |VER | CMD |  RSV  | ATYP | DST.ADDR | DST.PORT |
  // +----+-----+-------+------+----------+----------+
  // | 1  |  1  | X'00' |  1   | Variable |    2     |
  // +----+-----+-------+------+----------+----------+
  // ATYP: address type of following address
  // 0x01: IPv4 address
  // 0x03: Domain name
  // 0x04: IPv6 address
  // DST.ADDR: desired destination address
  // DST.PORT: desired destination port in network octet order

  // addressType
  // 1--> ipv4  addressLength =4
  // 2--> domain name
  // 3--> ipv6  addressLength =16
  let DSTADDR; // DSTADDR = ATYP + DST.ADDR
  switch (addressType) {
    case 1:
      DSTADDR = new Uint8Array([
        1,
        ...(addressRemote?.split(".")?.map(Number) ?? []),
      ]);
      break;
    case 2:
      DSTADDR = new Uint8Array([
        3,
        addressRemote?.length ?? 0,
        ...encoder.encode(addressRemote ?? ""),
      ]);
      break;
    case 3:
      DSTADDR = new Uint8Array([
        4,
        ...(addressRemote
          ?.split(":")
          ?.flatMap((x: string) => [
            parseInt(x.slice(0, 2), 16),
            parseInt(x.slice(2), 16),
          ]) ?? []),
      ]);
      break;
    default:
      log(`invild  addressType is ${addressType}`);
      return socket;
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
  // Response format (Socks Server -> Worker):
  //  +----+-----+-------+------+----------+----------+
  // |VER | REP |  RSV  | ATYP | BND.ADDR | BND.PORT |
  // +----+-----+-------+------+----------+----------+
  // | 1  |  1  | X'00' |  1   | Variable |    2     |
  // +----+-----+-------+------+----------+----------+
  if (res[1] === 0x00) {
    log("socks connection opened");
  } else {
    log("fail to open socks connection");
    return socket;
  }
  writer.releaseLock();
  reader.releaseLock();
  return socket;
}

/**
 * Parses SOCKS5 address string.
 * @param {string} address - SOCKS5 address string
 * @returns {Object} Parsed address information
 */
function socks5AddressParser(address: string): Socks5Address {
  let [latter, former] = address.split("@").reverse();
  let username, password, hostname, port;
  if (former) {
    const formers = former.split(":");
    if (formers.length !== 2) {
      throw new Error("Invalid SOCKS address format");
    }
    [username, password] = formers;
  }
  const latters = latter.split(":");
  port = Number(latters.pop());
  if (isNaN(port)) {
    throw new Error("Invalid SOCKS address format");
  }
  hostname = latters.join(":");
  const regex = /^\[.*\]$/;
  if (hostname.includes(":") && !regex.test(hostname)) {
    throw new Error("Invalid SOCKS address format");
  }
  return {
    username,
    password,
    hostname,
    port,
  };
}

const at = "QA==";
const pt = "dmxlc3M=";
const ed = "RUR0dW5uZWw=";

/**
 * Generates configuration for VLESS client.
 * @param {string} userIDs - Single or comma-separated user IDs
 * @param {string} hostName - Host name for configuration
 * @returns {string} Configuration HTML
 */
function getConfig(userIDs: string, hostName: string): string {
  const commonUrlPart = `?encryption=none&security=tls&sni=${hostName}&fp=randomized&type=ws&host=${hostName}&path=%2F%3Fed%3D2048#${hostName}`;

  // Split the userIDs into an array
  const userIDArray = userIDs.split(",");

  // Prepare output string for each userID
  const sublink = `https://${hostName}/sub/${userIDArray[0]}?format=clash`;
  const subbestip = `https://${hostName}/bestip/${userIDArray[0]}`;
  const clash_link = `https://url.v1.mk/sub?target=clash&url=${encodeURIComponent(
    sublink
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
    <meta property='og:image' content='https://ipfs.io/ipfs/bafybeigd6i5aavwpr6wvnwuyayklq3omonggta4x2q7kpmgafj357nkcky' />
    <meta name='twitter:card' content='summary_large_image' />
    <meta name='twitter:title' content='EDtunnel - Protocol Configuration and Subscribe Output' />
    <meta name='twitter:description' content='Use Cloudflare Pages and Worker serverless to implement protocol' />
    <meta name='twitter:url' content='https://${hostName}/' />
    <meta name='twitter:image' content='https://ipfs.io/ipfs/bafybeigd6i5aavwpr6wvnwuyayklq3omonggta4x2q7kpmgafj357nkcky' />
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
          max-width: 90%; /* Adjust the max-width to fit within the container */
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
        padding-right: 100px; /* Make space for the button */
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
      <img src="https://ipfs.io/ipfs/bafybeigd6i5aavwpr6wvnwuyayklq3omonggta4x2q7kpmgafj357nkcky" alt="EDtunnel Logo" class="logo">
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
    .map((userID: string) => {
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
        proxyIP +
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
        <div class="code-container">
          <pre><code>${protocolSec}</code></pre>
          <button class="btn copy-btn" onclick='copyToClipboard("${protocolSec}")'><i class="fas fa-copy"></i> Copy</button>
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
  </body>
  <script>
    function copyToClipboard(text) {
      navigator.clipboard.writeText(text)
        .then(() => {
          alert("Copied to clipboard");
        })
        .catch((err) => {
          console.error('Error:', err);
        });
    }
  </script>
  </html>`;
}

const HttpPort = new Set([80, 8080, 8880, 2052, 2086, 2095, 2082]);
const HttpsPort = new Set([443, 8443, 2053, 2096, 2087, 2083]);

/**
 * Generates subscription content.
 * @param {string} userID_path - User ID path
 * @param {string} hostname - Host name
 * @returns {string} Subscription content
 */
function GenSub(userID_path: string, hostname: string | string[]): string {
  const userIDArray = userID_path.includes(",")
    ? userID_path.split(",")
    : [userID_path];
  const randomPath = () =>
    "/" + Math.random().toString(36).substring(2, 15) + "?ed=2048";
  const commonUrlPartHttp = `?encryption=none&security=none&fp=random&type=ws&host=${hostname}&path=${encodeURIComponent(
    randomPath()
  )}#`;
  const commonUrlPartHttps = `?encryption=none&security=tls&sni=${hostname}&fp=random&type=ws&host=${hostname}&path=%2F%3Fed%3D2048#`;

  const result = userIDArray.flatMap((userID: string) => {
    const PartHttp = Array.from(HttpPort).flatMap((port) => {
      if (!hostname.includes("pages.dev")) {
        const urlPart = `${hostname}-HTTP-${port}`;
        const mainProtocolHttp =
          atob(pt) +
          "://" +
          userID +
          atob(at) +
          hostname +
          ":" +
          port +
          commonUrlPartHttp +
          urlPart;
        return proxyIPs.flatMap((proxyIP) => {
          const secondaryProtocolHttp =
            atob(pt) +
            "://" +
            userID +
            atob(at) +
            proxyIP.split(":")[0] +
            ":" +
            proxyPort +
            commonUrlPartHttp +
            urlPart +
            "-" +
            proxyIP +
            "-" +
            atob(ed);
          return [mainProtocolHttp, secondaryProtocolHttp];
        });
      }
      return [];
    });

    const PartHttps = Array.from(HttpsPort).flatMap((port) => {
      const urlPart = `${hostname}-HTTPS-${port}`;
      const mainProtocolHttps =
        atob(pt) +
        "://" +
        userID +
        atob(at) +
        hostname +
        ":" +
        port +
        commonUrlPartHttps +
        urlPart;
      return proxyIPs.flatMap((proxyIP) => {
        const secondaryProtocolHttps =
          atob(pt) +
          "://" +
          userID +
          atob(at) +
          proxyIP.split(":")[0] +
          ":" +
          proxyPort +
          commonUrlPartHttps +
          urlPart +
          "-" +
          proxyIP +
          "-" +
          atob(ed);
        return [mainProtocolHttps, secondaryProtocolHttps];
      });
    });

    return [...PartHttp, ...PartHttps];
  });

  return result.join("\n");
}
