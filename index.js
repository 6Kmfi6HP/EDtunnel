// EDtunnel - A Cloudflare Worker-based VLESS Proxy with WebSocket Transport
// @ts-ignore
import { connect } from 'cloudflare:sockets';

// ======================================
// Configuration
// ======================================

/**
 * User configuration and settings
 * Generate UUID: [Windows] Press "Win + R", input cmd and run: Powershell -NoExit -Command "[guid]::NewGuid()"
 */
let userID = 'd342d11e-d424-4583-b36e-524ab1f0afa4';

/**
 * Array of proxy server addresses with ports
 * Format: ['hostname:port', 'hostname:port']
 */
const proxyIPs = ['cdn.xn--b6gac.eu.org:443', 'cdn-all.xn--b6gac.eu.org:443'];

// Randomly select a proxy server from the pool
let proxyIP = proxyIPs[Math.floor(Math.random() * proxyIPs.length)];
let proxyPort = proxyIP.includes(':') ? proxyIP.split(':')[1] : '443';

// Alternative configurations:
// Single proxy IP: let proxyIP = 'cdn.xn--b6gac.eu.org';
// IPv6 example: let proxyIP = "[2a01:4f8:c2c:123f:64:5:6810:c55a]"

/**
 * SOCKS5 proxy configuration
 * Format: 'username:password@host:port' or 'host:port'
 */
let socks5Address = '';

/**
 * SOCKS5 relay mode
 * When true: All traffic is proxied through SOCKS5
 * When false: Only Cloudflare IPs use SOCKS5
 */
let socks5Relay = false;

if (!isValidUUID(userID)) {
	throw new Error('uuid is not valid');
}

let parsedSocks5Address = {};
let enableSocks = false;

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
	 * @param {import("@cloudflare/workers-types").ExecutionContext} _ctx
	 * @returns {Promise<Response>}
	 */
	async fetch(request, env, _ctx) {
		try {
			const { UUID, PROXYIP, SOCKS5, SOCKS5_RELAY } = env;
			userID = UUID || userID;
			socks5Address = SOCKS5 || socks5Address;
			socks5Relay = SOCKS5_RELAY || socks5Relay;

			// Handle proxy configuration
			const proxyConfig = handleProxyConfig(PROXYIP);
			proxyIP = proxyConfig.ip;
			proxyPort = proxyConfig.port;

			if (socks5Address) {
				try {
					const selectedSocks5 = selectRandomAddress(socks5Address);
					parsedSocks5Address = socks5AddressParser(selectedSocks5);
					enableSocks = true;
				} catch (err) {
					console.log(err.toString());
					enableSocks = false;
				}
			}

			const userIDs = userID.includes(',') ? userID.split(',').map(id => id.trim()) : [userID];
			const url = new URL(request.url);
			const host = request.headers.get('Host');
			const requestedPath = url.pathname.substring(1); // Remove leading slash
			const matchingUserID = userIDs.length === 1 ?
				(requestedPath === userIDs[0] || 
				 requestedPath === `sub/${userIDs[0]}` || 
				 requestedPath === `bestip/${userIDs[0]}` ? userIDs[0] : null) :
				userIDs.find(id => {
					const patterns = [id, `sub/${id}`, `bestip/${id}`];
					return patterns.some(pattern => requestedPath.startsWith(pattern));
				});

			if (request.headers.get('Upgrade') !== 'websocket') {
				if (url.pathname === '/cf') {
					return new Response(JSON.stringify(request.cf, null, 4), {
						status: 200,
						headers: { "Content-Type": "application/json;charset=utf-8" },
					});
				}

				if (matchingUserID) {
					if (url.pathname === `/${matchingUserID}` || url.pathname === `/sub/${matchingUserID}`) {
						const isSubscription = url.pathname.startsWith('/sub/');
						const proxyAddresses = PROXYIP ? PROXYIP.split(',').map(addr => addr.trim()) : proxyIP;
						const content = isSubscription ?
							GenSub(matchingUserID, host, proxyAddresses) :
							getConfig(matchingUserID, host, proxyAddresses);

						return new Response(content, {
							status: 200,
							headers: {
								"Content-Type": isSubscription ?
									"text/plain;charset=utf-8" :
									"text/html; charset=utf-8"
							},
						});
					} else if (url.pathname === `/bestip/${matchingUserID}`) {
						return fetch(`https://sub.xf.free.hr/auto?host=${host}&uuid=${matchingUserID}&path=/`, { headers: request.headers });
					}
				}
				return handleDefaultPath(url, request);
			} else {
				return await ProtocolOverWSHandler(request);
			}
		} catch (err) {
			return new Response(err.toString());
		}
	},
};

/**
 * Handles default path requests when no specific route matches.
 * Generates and returns a cloud drive interface HTML page.
 * @param {URL} url - The URL object of the request
 * @param {Request} request - The incoming request object
 * @returns {Response} HTML response with cloud drive interface
 */
async function handleDefaultPath(url, request) {
	const host = request.headers.get('Host');
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
async function ProtocolOverWSHandler(request) {

	/** @type {import("@cloudflare/workers-types").WebSocket[]} */
	// @ts-ignore
	const webSocketPair = new WebSocketPair();
	const [client, webSocket] = Object.values(webSocketPair);

	webSocket.accept();

	let address = '';
	let portWithRandomLog = '';
	const log = (/** @type {string} */ info, /** @type {string | undefined} */ event) => {
		console.log(`[${address}:${portWithRandomLog}] ${info}`, event || '');
	};
	const earlyDataHeader = request.headers.get('sec-websocket-protocol') || '';

	const readableWebSocketStream = MakeReadableWebSocketStream(webSocket, earlyDataHeader, log);

	/** @type {{ value: import("@cloudflare/workers-types").Socket | null}}*/
	let remoteSocketWapper = {
		value: null,
	};
	let isDns = false;

	// ws --> remote
	readableWebSocketStream.pipeTo(new WritableStream({
		async write(chunk, controller) {
			if (isDns) {
				return await handleDNSQuery(chunk, webSocket, null, log);
			}
			if (remoteSocketWapper.value) {
				const writer = remoteSocketWapper.value.writable.getWriter()
				await writer.write(chunk);
				writer.releaseLock();
				return;
			}

			const {
				hasError,
				message,
				addressType,
				portRemote = 443,
				addressRemote = '',
				rawDataIndex,
				ProtocolVersion = new Uint8Array([0, 0]),
				isUDP,
			} = ProcessProtocolHeader(chunk, userID);
			address = addressRemote;
			portWithRandomLog = `${portRemote}--${Math.random()} ${isUDP ? 'udp ' : 'tcp '
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
					throw new Error('UDP proxy is only enabled for DNS (port 53)');
				}
				return; // Early return after setting isDns or throwing error
			}
			// ["version", "附加信息长度 N"]
			const ProtocolResponseHeader = new Uint8Array([ProtocolVersion[0], 0]);
			const rawClientData = chunk.slice(rawDataIndex);

			if (isDns) {
				return handleDNSQuery(rawClientData, webSocket, ProtocolResponseHeader, log);
			}
			HandleTCPOutBound(remoteSocketWapper, addressType, addressRemote, portRemote, rawClientData, webSocket, ProtocolResponseHeader, log);
		},
		close() {
			log(`readableWebSocketStream is close`);
		},
		abort(reason) {
			log(`readableWebSocketStream is abort`, JSON.stringify(reason));
		},
	})).catch((err) => {
		log('readableWebSocketStream pipeTo error', err);
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
 * @param {Socket} remoteSocket - Remote socket connection
 * @param {string} addressType - Type of address (IPv4/IPv6)
 * @param {string} addressRemote - Remote server address
 * @param {number} portRemote - Remote server port
 * @param {Uint8Array} rawClientData - Raw data from client
 * @param {WebSocket} webSocket - WebSocket connection
 * @param {Uint8Array} protocolResponseHeader - Protocol response header
 * @param {Function} log - Logging function
 */
async function HandleTCPOutBound(remoteSocket, addressType, addressRemote, portRemote, rawClientData, webSocket, protocolResponseHeader, log,) {
	async function connectAndWrite(address, port, socks = false) {
		/** @type {import("@cloudflare/workers-types").Socket} */
		let tcpSocket;
		if (socks5Relay) {
			tcpSocket = await socks5Connect(addressType, address, port, log)
		} else {
			tcpSocket = socks ? await socks5Connect(addressType, address, port, log)
				: connect({
					hostname: address,
					port: port,
				});
		}
		remoteSocket.value = tcpSocket;
		log(`connected to ${address}:${port}`);
		const writer = tcpSocket.writable.getWriter();
		await writer.write(rawClientData); // first write, normal is tls client hello
		writer.releaseLock();
		return tcpSocket;
	}

	// if the cf connect tcp socket have no incoming data, we retry to redirect ip
	async function retry() {
		if (enableSocks) {
			tcpSocket = await connectAndWrite(addressRemote, portRemote, true);
		} else {
			tcpSocket = await connectAndWrite(proxyIP || addressRemote, proxyPort || portRemote, false);
		}
		// no matter retry success or not, close websocket
		tcpSocket.closed.catch(error => {
			console.log('retry tcpSocket closed error', error);
		}).finally(() => {
			safeCloseWebSocket(webSocket);
		})
		RemoteSocketToWS(tcpSocket, webSocket, protocolResponseHeader, null, log);
	}

	let tcpSocket = await connectAndWrite(addressRemote, portRemote);

	// when remoteSocket is ready, pass to websocket
	// remote--> ws
	RemoteSocketToWS(tcpSocket, webSocket, protocolResponseHeader, retry, log);
}

/**
 * Creates a readable stream from WebSocket server.
 * Handles early data and WebSocket messages.
 * @param {WebSocket} webSocketServer - WebSocket server instance
 * @param {string} earlyDataHeader - Header for early data (0-RTT)
 * @param {Function} log - Logging function
 * @returns {ReadableStream} Stream of WebSocket data
 */
function MakeReadableWebSocketStream(webSocketServer, earlyDataHeader, log) {
	let readableStreamCancel = false;
	const stream = new ReadableStream({
		start(controller) {
			webSocketServer.addEventListener('message', (event) => {
				const message = event.data;
				controller.enqueue(message);
			});

			webSocketServer.addEventListener('close', () => {
				safeCloseWebSocket(webSocketServer);
				controller.close();
			});

			webSocketServer.addEventListener('error', (err) => {
				log('webSocketServer has error');
				controller.error(err);
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
			// https://streams.spec.whatwg.org/#example-rs-push-backpressure
		},

		cancel(reason) {
			log(`ReadableStream was canceled, due to ${reason}`)
			readableStreamCancel = true;
			safeCloseWebSocket(webSocketServer);
		}
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
function ProcessProtocolHeader(protocolBuffer, userID) {
	if (protocolBuffer.byteLength < 24) {
		return { hasError: true, message: 'invalid data' };
	}

	const dataView = new DataView(protocolBuffer);
	const version = dataView.getUint8(0);
	const slicedBufferString = stringify(new Uint8Array(protocolBuffer.slice(1, 17)));

	const uuids = userID.includes(',') ? userID.split(",") : [userID];
	const isValidUser = uuids.some(uuid => slicedBufferString === uuid.trim()) ||
		(uuids.length === 1 && slicedBufferString === uuids[0].trim());

	console.log(`userID: ${slicedBufferString}`);

	if (!isValidUser) {
		return { hasError: true, message: 'invalid user' };
	}

	const optLength = dataView.getUint8(17);
	const command = dataView.getUint8(18 + optLength);

	if (command !== 1 && command !== 2) {
		return { hasError: true, message: `command ${command} is not supported, command 01-tcp,02-udp,03-mux` };
	}

	const portIndex = 18 + optLength + 1;
	const portRemote = dataView.getUint16(portIndex);
	const addressType = dataView.getUint8(portIndex + 2);
	let addressValue, addressLength, addressValueIndex;

	switch (addressType) {
		case 1:
			addressLength = 4;
			addressValueIndex = portIndex + 3;
			addressValue = new Uint8Array(protocolBuffer.slice(addressValueIndex, addressValueIndex + addressLength)).join('.');
			break;
		case 2:
			addressLength = dataView.getUint8(portIndex + 3);
			addressValueIndex = portIndex + 4;
			addressValue = new TextDecoder().decode(protocolBuffer.slice(addressValueIndex, addressValueIndex + addressLength));
			break;
		case 3:
			addressLength = 16;
			addressValueIndex = portIndex + 3;
			addressValue = Array.from({ length: 8 }, (_, i) => dataView.getUint16(addressValueIndex + i * 2).toString(16)).join(':');
			break;
		default:
			return { hasError: true, message: `invalid addressType: ${addressType}` };
	}

	if (!addressValue) {
		return { hasError: true, message: `addressValue is empty, addressType is ${addressType}` };
	}

	return {
		hasError: false,
		addressRemote: addressValue,
		addressType,
		portRemote,
		rawDataIndex: addressValueIndex + addressLength,
		protocolVersion: new Uint8Array([version]),
		isUDP: command === 2
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
async function RemoteSocketToWS(remoteSocket, webSocket, protocolResponseHeader, retry, log) {
	let hasIncomingData = false;

	try {
		await remoteSocket.readable.pipeTo(
			new WritableStream({
				async write(chunk) {
					if (webSocket.readyState !== WS_READY_STATE_OPEN) {
						throw new Error('WebSocket is not open');
					}

					hasIncomingData = true;

					if (protocolResponseHeader) {
						webSocket.send(await new Blob([protocolResponseHeader, chunk]).arrayBuffer());
						protocolResponseHeader = null;
					} else {
						webSocket.send(chunk);
					}
				},
				close() {
					log(`Remote connection readable closed. Had incoming data: ${hasIncomingData}`);
				},
				abort(reason) {
					console.error(`Remote connection readable aborted:`, reason);
				},
			})
		);
	} catch (error) {
		console.error(`RemoteSocketToWS error:`, error.stack || error);
		safeCloseWebSocket(webSocket);
	}

	if (!hasIncomingData && retry) {
		log(`No incoming data, retrying`);
		await retry();
	}
}

/**
 * Converts base64 string to ArrayBuffer.
 * @param {string} base64Str - Base64 encoded string
 * @returns {Object} Object containing decoded data or error
 */
function base64ToArrayBuffer(base64Str) {
	if (!base64Str) {
		return { earlyData: null, error: null };
	}
	try {
		// Convert modified Base64 for URL (RFC 4648) to standard Base64
		base64Str = base64Str.replace(/-/g, '+').replace(/_/g, '/');
		// Decode Base64 string
		const binaryStr = atob(base64Str);
		// Convert binary string to ArrayBuffer
		const buffer = new ArrayBuffer(binaryStr.length);
		const view = new Uint8Array(buffer);
		for (let i = 0; i < binaryStr.length; i++) {
			view[i] = binaryStr.charCodeAt(i);
		}
		return { earlyData: buffer, error: null };
	} catch (error) {
		return { earlyData: null, error };
	}
}

/**
 * Validates UUID format.
 * @param {string} uuid - UUID string to validate
 * @returns {boolean} True if valid UUID
 */
function isValidUUID(uuid) {
	// More precise UUID regex pattern
	const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
	return uuidRegex.test(uuid);
}

const WS_READY_STATE_OPEN = 1;
const WS_READY_STATE_CLOSING = 2;

/**
 * Safely closes WebSocket connection.
 * Prevents exceptions during WebSocket closure.
 * @param {WebSocket} socket - WebSocket to close
 */
function safeCloseWebSocket(socket) {
	try {
		if (socket.readyState === WS_READY_STATE_OPEN || socket.readyState === WS_READY_STATE_CLOSING) {
			socket.close();
		}
	} catch (error) {
		console.error('safeCloseWebSocket error:', error);
	}
}

const byteToHex = Array.from({ length: 256 }, (_, i) => (i + 0x100).toString(16).slice(1));

/**
 * Converts byte array to hex string without validation.
 * @param {Uint8Array} arr - Byte array to convert
 * @param {number} offset - Starting offset
 * @returns {string} Hex string
 */
function unsafeStringify(arr, offset = 0) {
	return [
		byteToHex[arr[offset]],
		byteToHex[arr[offset + 1]],
		byteToHex[arr[offset + 2]],
		byteToHex[arr[offset + 3]],
		'-',
		byteToHex[arr[offset + 4]],
		byteToHex[arr[offset + 5]],
		'-',
		byteToHex[arr[offset + 6]],
		byteToHex[arr[offset + 7]],
		'-',
		byteToHex[arr[offset + 8]],
		byteToHex[arr[offset + 9]],
		'-',
		byteToHex[arr[offset + 10]],
		byteToHex[arr[offset + 11]],
		byteToHex[arr[offset + 12]],
		byteToHex[arr[offset + 13]],
		byteToHex[arr[offset + 14]],
		byteToHex[arr[offset + 15]]
	].join('').toLowerCase();
}

/**
 * Safely converts byte array to hex string with validation.
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
 * Handles DNS query through UDP.
 * Processes DNS requests and forwards them.
 * @param {ArrayBuffer} udpChunk - UDP data chunk
 * @param {WebSocket} webSocket - WebSocket connection
 * @param {ArrayBuffer} protocolResponseHeader - Protocol response header
 * @param {Function} log - Logging function
 */
async function handleDNSQuery(udpChunk, webSocket, protocolResponseHeader, log) {
	// no matter which DNS server client send, we alwasy use hard code one.
	// beacsue someof DNS server is not support DNS over TCP
	try {
		const dnsServer = '8.8.4.4'; // change to 1.1.1.1 after cf fix connect own ip bug
		const dnsPort = 53;
		/** @type {ArrayBuffer | null} */
		let vlessHeader = protocolResponseHeader;
		/** @type {import("@cloudflare/workers-types").Socket} */
		const tcpSocket = connect({
			hostname: dnsServer,
			port: dnsPort,
		});

		log(`connected to ${dnsServer}:${dnsPort}`);
		const writer = tcpSocket.writable.getWriter();
		await writer.write(udpChunk);
		writer.releaseLock();
		await tcpSocket.readable.pipeTo(new WritableStream({
			async write(chunk) {
				if (webSocket.readyState === WS_READY_STATE_OPEN) {
					if (vlessHeader) {
						webSocket.send(await new Blob([vlessHeader, chunk]).arrayBuffer());
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
		}));
	} catch (error) {
		console.error(
			`handleDNSQuery have exception, error: ${error.message}`
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
async function socks5Connect(addressType, addressRemote, portRemote, log) {
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
	log('sent socks greeting');

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
		return;
	}
	if (res[1] === 0xff) {
		log("no acceptable methods");
		return;
	}

	// if return 0x0502
	if (res[1] === 0x02) {
		log("socks server needs auth");
		if (!username || !password) {
			log("please provide username/password");
			return;
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
			...encoder.encode(password)
		]);
		await writer.write(authRequest);
		res = (await reader.read()).value;
		// expected 0x0100
		if (res[0] !== 0x01 || res[1] !== 0x00) {
			log("fail to auth socks server");
			return;
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
	let DSTADDR;	// DSTADDR = ATYP + DST.ADDR
	switch (addressType) {
		case 1:
			DSTADDR = new Uint8Array(
				[1, ...addressRemote.split('.').map(Number)]
			);
			break;
		case 2:
			DSTADDR = new Uint8Array(
				[3, addressRemote.length, ...encoder.encode(addressRemote)]
			);
			break;
		case 3:
			DSTADDR = new Uint8Array(
				[4, ...addressRemote.split(':').flatMap(x => [parseInt(x.slice(0, 2), 16), parseInt(x.slice(2), 16)])]
			);
			break;
		default:
			log(`invild  addressType is ${addressType}`);
			return;
	}
	const socksRequest = new Uint8Array([5, 1, 0, ...DSTADDR, portRemote >> 8, portRemote & 0xff]);
	await writer.write(socksRequest);
	log('sent socks request');

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
		return;
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
function socks5AddressParser(address) {
	let [latter, former] = address.split("@").reverse();
	let username, password, hostname, port;
	if (former) {
		const formers = former.split(":");
		if (formers.length !== 2) {
			throw new Error('Invalid SOCKS address format');
		}
		[username, password] = formers;
	}
	const latters = latter.split(":");
	port = Number(latters.pop());
	if (isNaN(port)) {
		throw new Error('Invalid SOCKS address format');
	}
	hostname = latters.join(":");
	const regex = /^\[.*\]$/;
	if (hostname.includes(":") && !regex.test(hostname)) {
		throw new Error('Invalid SOCKS address format');
	}
	return {
		username,
		password,
		hostname,
		port,
	}
}

const at = 'QA==';
const pt = 'dmxlc3M=';
const ed = 'RUR0dW5uZWw=';

/**
 * Generates configuration for VLESS client.
 * @param {string} userIDs - Single or comma-separated user IDs
 * @param {string} hostName - Host name for configuration
 * @param {string|string[]} proxyIP - Proxy IP address or array of addresses
 * @returns {string} Configuration HTML
 */
function getConfig(userIDs, hostName, proxyIP) {
	const commonUrlPart = `?encryption=none&security=tls&sni=${hostName}&fp=randomized&type=ws&host=${hostName}&path=%2F%3Fed%3D2048#${hostName}`;

	// Split the userIDs into an array
	const userIDArray = userIDs.split(",");

	// Prepare output string for each userID
	const sublink = `https://${hostName}/sub/${userIDArray[0]}?format=clash`
	const subbestip = `https://${hostName}/bestip/${userIDArray[0]}`;
	const clash_link = `https://url.v1.mk/sub?target=clash&url=${encodeURIComponent(`https://${hostName}/sub/${userIDArray[0]}?format=clash`)}&insert=false&emoji=true&list=false&tfo=false&scv=true&fdn=false&sort=false&new_name=true`;
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
      <img src="https://cdn.jsdelivr.net/gh/6Kmfi6HP/EDtunnel@refs/heads/main/image/logo.png" alt="EDtunnel Logo" class="logo">
      <p>Welcome! This function generates configuration for the vless protocol. If you found this useful, please check our GitHub project:</p>
      <p><a href="https://github.com/6Kmfi6HP/EDtunnel" target="_blank" style="color: #00ff00;">EDtunnel - https://github.com/6Kmfi6HP/EDtunnel</a></p>
      <div style="clear: both;"></div>
      <div class="btn-group">
        <a href="//${hostName}/sub/${userIDArray[0]}" class="btn" target="_blank"><i class="fas fa-link"></i> VLESS Subscription</a>
        <a href="clash://install-config?url=${encodeURIComponent(`https://${hostName}/sub/${userIDArray[0]}?format=clash`)}" class="btn" target="_blank"><i class="fas fa-bolt"></i> Clash Subscription</a>
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

	const configOutput = userIDArray.map((userID) => {
		const protocolMain = atob(pt) + '://' + userID + atob(at) + hostName + ":443" + commonUrlPart;
		const protocolSec = atob(pt) + '://' + userID + atob(at) + proxyIP[0].split(':')[0] + ":" + proxyPort + commonUrlPart;
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
            ${typeof proxyIP === 'string' ? 
              `<option value="${proxyIP}">${proxyIP}</option>` : 
              Array.from(proxyIP).map(proxy => `<option value="${proxy}">${proxy}</option>`).join('')}
          </select>
        </div>
		<br>
        <div class="code-container">
          <pre><code id="proxyConfig">${protocolSec}</code></pre>
          <button class="btn copy-btn" onclick='copyToClipboard(document.getElementById("proxyConfig").textContent)'><i class="fas fa-copy"></i> Copy</button>
        </div>
      </div>
    `;
	}).join('');

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
}

const HttpPort = new Set([80, 8080, 8880, 2052, 2086, 2095, 2082]);
const HttpsPort = new Set([443, 8443, 2053, 2096, 2087, 2083]);

/**
 * Generates subscription content.
 * @param {string} userID_path - User ID path
 * @param {string} hostname - Host name
 * @param {string|string[]} proxyIP - Proxy IP address or array of addresses
 * @returns {string} Subscription content
 */
function GenSub(userID_path, hostname, proxyIP) {
	// Add all CloudFlare public CNAME domains
	const mainDomains = new Set([
		hostname,
		// public domains
		'icook.hk',
		'japan.com',
		'malaysia.com',
		'russia.com',
		'singapore.com',
		'www.visa.com',
		'www.csgo.com',
		'www.shopify.com',
		'www.whatismyip.com',
		'www.ipget.net',
		// 高频率更新
		'speed.marisalnc.com',           // 1000ip/3min
		'freeyx.cloudflare88.eu.org',    // 1000ip/3min
		'cloudflare.182682.xyz',         // 15ip/15min
		// '115155.xyz',                    // 18ip/1小时
		// 'cdn.2020111.xyz',               // 15ip/10min
		'cfip.cfcdn.vip',                // 6ip/1天
		proxyIPs,
		// 手动更新和未知频率
		'cf.0sm.com',                    // 手动更新
		'cloudflare-ip.mofashi.ltd',     // 未知频率
		'cf.090227.xyz',                 // 未知频率
		'cname.xirancdn.us',             // 未知频率
		// 'f3058171cad.002404.xyz',        // 未知频率
		'cf.zhetengsha.eu.org',          // 未知频率
		'cloudflare.9jy.cc',             // 未知频率
		// '8.889288.xyz',                  // 未知频率
		'cf.zerone-cdn.pp.ua',           // 未知频率
		'cfip.1323123.xyz',              // 未知频率
		'cdn.tzpro.xyz',                 // 未知频率
		'cf.877771.xyz',                 // 未知频率
		'cnamefuckxxs.yuchen.icu',       // 未知频率
		'cfip.xxxxxxxx.tk',              // OTC大佬提供维护
	]);

	const userIDArray = userID_path.includes(',') ? userID_path.split(",") : [userID_path];
	const proxyIPArray = Array.isArray(proxyIP) ? proxyIP : (proxyIP ? (proxyIP.includes(',') ? proxyIP.split(',') : [proxyIP]) : proxyIPs);
	const randomPath = () => '/' + Math.random().toString(36).substring(2, 15) + '?ed=2048';
	const commonUrlPartHttp = `?encryption=none&security=none&fp=random&type=ws&host=${hostname}&path=${encodeURIComponent(randomPath())}#`;
	const commonUrlPartHttps = `?encryption=none&security=tls&sni=${hostname}&fp=random&type=ws&host=${hostname}&path=%2F%3Fed%3D2048#`;

	const result = userIDArray.flatMap((userID) => {
		let allUrls = [];
		// Generate main HTTP URLs first for all domains
		if (!hostname.includes('pages.dev')) {
			mainDomains.forEach(domain => {
				Array.from(HttpPort).forEach((port) => {
					const urlPart = `${hostname.split('.')[0]}-${domain}-HTTP-${port}`;
					const mainProtocolHttp = atob(pt) + '://' + userID + atob(at) + domain + ':' + port + commonUrlPartHttp + urlPart;
					allUrls.push(mainProtocolHttp);
				});
			});
		}

		// Generate main HTTPS URLs for all domains
		mainDomains.forEach(domain => {
			Array.from(HttpsPort).forEach((port) => {
				const urlPart = `${hostname.split('.')[0]}-${domain}-HTTPS-${port}`;
				const mainProtocolHttps = atob(pt) + '://' + userID + atob(at) + domain + ':' + port + commonUrlPartHttps + urlPart;
				allUrls.push(mainProtocolHttps);
			});
		});

		// Generate proxy HTTPS URLs
		proxyIPArray.forEach((proxyAddr) => {
			const [proxyHost, proxyPort = '443'] = proxyAddr.split(':');
			const urlPart = `${hostname.split('.')[0]}-${proxyHost}-HTTPS-${proxyPort}`;
			const secondaryProtocolHttps = atob(pt) + '://' + userID + atob(at) + proxyHost + ':' + proxyPort + commonUrlPartHttps + urlPart + '-' + atob(ed);
			allUrls.push(secondaryProtocolHttps);
		});

		return allUrls;
	});

	return btoa(result.join('\n'));
	// return result.join('\n');
}

/**
 * Handles proxy configuration and returns standardized proxy settings
 * @param {string} PROXYIP - Proxy IP configuration from environment
 * @returns {{ip: string, port: string}} Standardized proxy configuration
 */
function handleProxyConfig(PROXYIP) {
	if (PROXYIP) {
		const proxyAddresses = PROXYIP.split(',').map(addr => addr.trim());
		const selectedProxy = selectRandomAddress(proxyAddresses);
		const [ip, port = '443'] = selectedProxy.split(':');
		return { ip, port };
	} else {
		const port = proxyIP.includes(':') ? proxyIP.split(':')[1] : '443';
		const ip = proxyIP.split(':')[0];
		return { ip, port };
	}
}

/**
 * Selects a random address from a comma-separated string or array of addresses
 * @param {string|string[]} addresses - Comma-separated string or array of addresses
 * @returns {string} Selected address
 */
function selectRandomAddress(addresses) {
	const addressArray = typeof addresses === 'string' ?
		addresses.split(',').map(addr => addr.trim()) :
		addresses;
	return addressArray[Math.floor(Math.random() * addressArray.length)];
}
