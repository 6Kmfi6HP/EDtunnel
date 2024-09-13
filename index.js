// @ts-ignore
import { connect } from 'cloudflare:sockets';

// How to generate your own UUID:
// [Windows] Press "Win + R", input cmd and run:  Powershell -NoExit -Command "[guid]::NewGuid()"
let userID = 'd342d11e-d424-4583-b36e-524ab1f0afa4';

const proxyIPs = ['cdn.xn--b6gac.eu.org', 'cdn-all.xn--b6gac.eu.org'];

// if you want to use ipv6 or single proxyIP, please add comment at this line and remove comment at the next line
let proxyIP = proxyIPs[Math.floor(Math.random() * proxyIPs.length)];
// use single proxyip instead of random
// let proxyIP = 'cdn.xn--b6gac.eu.org';
// ipv6 proxyIP example remove comment to use
// let proxyIP = "[2a01:4f8:c2c:123f:64:5:6810:c55a]"

// Example:  user:pass@host:port  or  host:port
let socks5Address = '';
// socks5Relay is true, will proxy all traffic to socks5Address, otherwise socks5Address only be used for cloudflare ips
let socks5Relay = false;

if (!isValidUUID(userID)) {
	throw new Error('uuid is not valid');
}

let parsedSocks5Address = {};
let enableSocks = false;


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
			proxyIP = PROXYIP || proxyIP;
			socks5Address = SOCKS5 || socks5Address;
			socks5Relay = SOCKS5_RELAY || socks5Relay;

			if (socks5Address) {
				try {
					parsedSocks5Address = socks5AddressParser(socks5Address);
					enableSocks = true;
				} catch (err) {
					console.log(err.toString());
					enableSocks = false;
				}
			}

			const userID_Path = userID.includes(',') ? userID.split(',')[0] : userID;
			const url = new URL(request.url);
			const host = request.headers.get('Host');

			if (request.headers.get('Upgrade') !== 'websocket') {
				switch (url.pathname) {
					case '/cf':
						return new Response(JSON.stringify(request.cf, null, 4), {
							status: 200,
							headers: { "Content-Type": "application/json;charset=utf-8" },
						});
					case `/${userID_Path}`:
						return new Response(getConfig(userID, host), {
							status: 200,
							headers: { "Content-Type": "text/html; charset=utf-8" },
						});
					case `/sub/${userID_Path}`:
						return new Response(btoa(GenSub(userID, host)), {
							status: 200,
							headers: { "Content-Type": "text/plain;charset=utf-8" },
						});
					case `/bestip/${userID_Path}`:
						return fetch(`https://sub.xf.free.hr/auto?host=${host}&uuid=${userID}&path=/`, { headers: request.headers });
					default:
						return handleDefaultPath(url, request);
				}
			} else {
				if (url.pathname.includes('trojan')) {
					return await ProtocolOverWSHandler(request, 'trojan');
				} else {
					return await ProtocolOverWSHandler(request, 'vless');
				}
			}
		} catch (err) {
			return new Response(err.toString());
		}
	},
};

async function handleDefaultPath(url, request) {
	const randomHostname = hostnames[Math.floor(Math.random() * hostnames.length)];
	const newHeaders = new Headers(request.headers);
	newHeaders.set('cf-connecting-ip', '1.2.3.4');
	newHeaders.set('x-forwarded-for', '1.2.3.4');
	newHeaders.set('x-real-ip', '1.2.3.4');
	newHeaders.set('referer', 'https://www.google.com/search?q=edtunnel');

	const proxyUrl = 'https://' + randomHostname + url.pathname + url.search;
	const modifiedRequest = new Request(proxyUrl, {
		method: request.method,
		headers: newHeaders,
		body: request.body,
		redirect: 'manual',
	});

	const proxyResponse = await fetch(modifiedRequest, { redirect: 'manual' });
	if ([301, 302].includes(proxyResponse.status)) {
		return new Response(`Redirects to ${randomHostname} are not allowed.`, {
			status: 403,
			statusText: 'Forbidden',
		});
	}
	return proxyResponse;
}

/**
 * Handles protocol over WebSocket requests by creating a WebSocket pair, accepting the WebSocket connection, and processing the protocol header.
 * @param {import("@cloudflare/workers-types").Request} request The incoming request object.
 * @param {string} protocol The protocol to use ('vless' or 'trojan')
 * @returns {Promise<Response>} A Promise that resolves to a WebSocket response object.
 */
async function ProtocolOverWSHandler(request, protocol) {
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

	const readableWebSocketStream = makeReadableWebSocketStream(webSocket, earlyDataHeader, log);

	/** @type {{ value: import("@cloudflare/workers-types").Socket | null}}*/
	let remoteSocketWapper = {
		value: null,
	};
	let isDns = false;
	let udpStreamWrite = null;

	// ws --> remote
	readableWebSocketStream.pipeTo(new WritableStream({
		async write(chunk, controller) {
			if (protocol === 'trojan' && udpStreamWrite) {
				return udpStreamWrite(chunk);
			}
			if (isDns) {
				return await handleDNSQuery(chunk, webSocket, null, log);
			}
			if (remoteSocketWapper.value) {
				const writer = remoteSocketWapper.value.writable.getWriter()
				await writer.write(chunk);
				writer.releaseLock();
				return;
			}

			let processedHeader;
			if (protocol === 'vless') {
				processedHeader = processProtocolHeader(chunk, userID);
			} else if (protocol === 'trojan') {
				processedHeader = await parseTrojanHeader(chunk);
			} else {
				throw new Error('Invalid protocol');
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
				rawClientData
			} = processedHeader;

			address = addressRemote;
			portWithRandomLog = `${portRemote}--${Math.random()} ${isUDP ? 'udp ' : 'tcp '} `;

			if (hasError) {
				throw new Error(message);
				return;
			}

			if (isUDP && protocol === 'vless') {
				if (portRemote === 53) {
					isDns = true;
				} else {
					throw new Error('UDP proxy only enable for DNS which is port 53');
					return;
				}
			}

			const ProtocolResponseHeader = new Uint8Array([ProtocolVersion[0], 0]);
			const clientData = protocol === 'vless' ? chunk.slice(rawDataIndex) : rawClientData;

			if (isDns) {
				return handleDNSQuery(clientData, webSocket, ProtocolResponseHeader, log);
			}
			handleTCPOutBound(remoteSocketWapper, addressType, addressRemote, portRemote, clientData, webSocket, ProtocolResponseHeader, log);
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
 * Handles outbound TCP connections.
 *
 * @param {any} remoteSocket 
 * @param {string} addressRemote The remote address to connect to.
 * @param {number} portRemote The remote port to connect to.
 * @param {Uint8Array} rawClientData The raw client data to write.
 * @param {import("@cloudflare/workers-types").WebSocket} webSocket The WebSocket to pass the remote socket to.
 * @param {Uint8Array} protocolResponseHeader The protocol response header.
 * @param {function} log The logging function.
 * @returns {Promise<void>} The remote socket.
 */
async function handleTCPOutBound(remoteSocket, addressType, addressRemote, portRemote, rawClientData, webSocket, ProtocolResponseHeader, log,) {
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
			tcpSocket = await connectAndWrite(proxyIP || addressRemote, portRemote);
		}
		// no matter retry success or not, close websocket
		tcpSocket.closed.catch(error => {
			console.log('retry tcpSocket closed error', error);
		}).finally(() => {
			safeCloseWebSocket(webSocket);
		})
		remoteSocketToWS(tcpSocket, webSocket, ProtocolResponseHeader, null, log);
	}

	let tcpSocket = await connectAndWrite(addressRemote, portRemote);

	// when remoteSocket is ready, pass to websocket
	// remote--> ws
	remoteSocketToWS(tcpSocket, webSocket, ProtocolResponseHeader, retry, log);
}

/**
 * Creates a readable stream from a WebSocket server, allowing for data to be read from the WebSocket.
 * @param {import("@cloudflare/workers-types").WebSocket} webSocketServer The WebSocket server to create the readable stream from.
 * @param {string} earlyDataHeader The header containing early data for WebSocket 0-RTT.
 * @param {(info: string)=> void} log The logging function.
 * @returns {ReadableStream} A readable stream that can be used to read data from the WebSocket.
 */
function makeReadableWebSocketStream(webSocketServer, earlyDataHeader, log) {
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

// https://xtls.github.io/development/protocols/protocol.html
// https://github.com/zizifn/excalidraw-backup/blob/main/v2ray-protocol.excalidraw

/**
 * Processes the protocol header buffer and returns an object with the relevant information.
 * @param {ArrayBuffer} protocolBuffer The protocol header buffer to process.
 * @param {string} userID The user ID to validate against the UUID in the protocol header.
 * @returns {{
 *  hasError: boolean,
 *  message?: string,
 *  addressRemote?: string,
 *  addressType?: number,
 *  portRemote?: number,
 *  rawDataIndex?: number,
 *  protocolVersion?: Uint8Array,
 *  isUDP?: boolean
 * }} An object with the relevant information extracted from the protocol header buffer.
 */
function processProtocolHeader(protocolBuffer, userID) {
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
 * Converts a remote socket to a WebSocket connection.
 * @param {import("@cloudflare/workers-types").Socket} remoteSocket The remote socket to convert.
 * @param {import("@cloudflare/workers-types").WebSocket} webSocket The WebSocket to connect to.
 * @param {ArrayBuffer | null} protocolResponseHeader The protocol response header.
 * @param {(() => Promise<void>) | null} retry The function to retry the connection if it fails.
 * @param {(info: string) => void} log The logging function.
 * @returns {Promise<void>} A Promise that resolves when the conversion is complete.
 */
async function remoteSocketToWS(remoteSocket, webSocket, protocolResponseHeader, retry, log) {
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
		console.error(`remoteSocketToWS error:`, error.stack || error);
		safeCloseWebSocket(webSocket);
	}

	if (!hasIncomingData && retry) {
		log(`No incoming data, retrying`);
		await retry();
	}
}
/**
 * Decodes a base64 string into an ArrayBuffer.
 * @param {string} base64Str The base64 string to decode.
 * @returns {{earlyData: ArrayBuffer|null, error: Error|null}} An object containing the decoded ArrayBuffer or null if there was an error, and any error that occurred during decoding or null if there was no error.
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
 * Checks if a given string is a valid UUID.
 * @param {string} uuid The string to validate as a UUID.
 * @returns {boolean} True if the string is a valid UUID, false otherwise.
 */
function isValidUUID(uuid) {
	// More precise UUID regex pattern
	const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
	return uuidRegex.test(uuid);
}

const WS_READY_STATE_OPEN = 1;
const WS_READY_STATE_CLOSING = 2;

/**
 * Closes a WebSocket connection safely without throwing exceptions.
 * @param {import("@cloudflare/workers-types").WebSocket} socket The WebSocket connection to close.
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

function stringify(arr, offset = 0) {
	const uuid = unsafeStringify(arr, offset);
	if (!isValidUUID(uuid)) {
		throw new TypeError("Stringified UUID is invalid");
	}
	return uuid;
}


/**
 * Handles outbound UDP traffic by transforming the data into DNS queries and sending them over a WebSocket connection.
 * @param {import("@cloudflare/workers-types").WebSocket} webSocket The WebSocket connection to send the DNS queries over.
 * @param {ArrayBuffer} protocolResponseHeader The protocol response header.
 * @param {(string) => void} log The logging function.
 * @returns {{write: (chunk: Uint8Array) => void}} An object with a write method that accepts a Uint8Array chunk to write to the transform stream.
 */
async function handleUDPOutBound(webSocket, protocolResponseHeader, log) {

	let isprotocolHeaderSent = false;
	const transformStream = new TransformStream({
		start(_controller) {

		},
		transform(chunk, controller) {
			// udp message 2 byte is the the length of udp data
			// TODO: this should have bug, beacsue maybe udp chunk can be in two websocket message
			for (let index = 0; index < chunk.byteLength;) {
				const lengthBuffer = chunk.slice(index, index + 2);
				const udpPakcetLength = new DataView(lengthBuffer).getUint16(0);
				const udpData = new Uint8Array(
					chunk.slice(index + 2, index + 2 + udpPakcetLength)
				);
				index = index + 2 + udpPakcetLength;
				controller.enqueue(udpData);
			}
		},
		flush(_controller) {
		}
	});

	// only handle dns udp for now
	transformStream.readable.pipeTo(new WritableStream({
		async write(chunk) {
			const resp = await fetch(dohURL, // dns server url
				{
					method: 'POST',
					headers: {
						'content-type': 'application/dns-message',
					},
					body: chunk,
				})
			const dnsQueryResult = await resp.arrayBuffer();
			const udpSize = dnsQueryResult.byteLength;
			// console.log([...new Uint8Array(dnsQueryResult)].map((x) => x.toString(16)));
			const udpSizeBuffer = new Uint8Array([(udpSize >> 8) & 0xff, udpSize & 0xff]);
			if (webSocket.readyState === WS_READY_STATE_OPEN) {
				log(`doh success and dns message length is ${udpSize}`);
				if (isprotocolHeaderSent) {
					webSocket.send(await new Blob([udpSizeBuffer, dnsQueryResult]).arrayBuffer());
				} else {
					webSocket.send(await new Blob([protocolResponseHeader, udpSizeBuffer, dnsQueryResult]).arrayBuffer());
					isprotocolHeaderSent = true;
				}
			}
		}
	})).catch((error) => {
		log('dns udp has error' + error)
	});

	const writer = transformStream.writable.getWriter();

	return {
		/**
		 * 
		 * @param {Uint8Array} chunk 
		 */
		write(chunk) {
			writer.write(chunk);
		}
	};
}

/**
 * 
 * @param {ArrayBuffer} udpChunk 
 * @param {import("@cloudflare/workers-types").WebSocket} webSocket 
 * @param {ArrayBuffer} protocolResponseHeader 
 * @param {(string)=> void} log 
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
 * 
 * @param {number} addressType
 * @param {string} addressRemote
 * @param {number} portRemote
 * @param {function} log The logging function.
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
 * 
 * @param {string} address
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


async function parseTrojanHeader(buffer) {
	if (buffer.byteLength < 58) {
		return { hasError: true, message: "Invalid data length" };
	}

	const view = new DataView(buffer);
	if (view.getUint8(56) !== 0x0d || view.getUint8(57) !== 0x0a) {
		return { hasError: true, message: "Invalid header format (missing CR LF)" };
	}

	const password = new TextDecoder().decode(buffer.slice(0, 56));
	if (password !== Sha256.sha224(userID)) {
		return { hasError: true, message: "Invalid password" };
	}

	const socks5Data = new DataView(buffer, 58);
	if (socks5Data.byteLength < 6) {
		return { hasError: true, message: "Invalid SOCKS5 request data" };
	}

	if (socks5Data.getUint8(0) !== 1) {
		return { hasError: true, message: "Unsupported command, only TCP (CONNECT) is allowed" };
	}

	const atype = socks5Data.getUint8(1);
	let address;
	let addressEnd;

	switch (atype) {
		case 1: // IPv4
			address = Array.from(new Uint8Array(socks5Data.buffer, socks5Data.byteOffset + 2, 4)).join('.');
			addressEnd = 6;
			break;
		case 3: // Domain name
			const domainLength = socks5Data.getUint8(2);
			address = new TextDecoder().decode(socks5Data.buffer.slice(socks5Data.byteOffset + 3, socks5Data.byteOffset + 3 + domainLength));
			addressEnd = 3 + domainLength;
			break;
		case 4: // IPv6
			address = Array.from(new Uint8Array(socks5Data.buffer, socks5Data.byteOffset + 2, 16))
				.map(x => x.toString(16).padStart(2, '0'))
				.join(':')
				.replace(/(:0)+:/, '::');
			addressEnd = 18;
			break;
		default:
			return { hasError: true, message: `Invalid address type: ${atype}` };
	}

	const port = socks5Data.getUint16(addressEnd);

	return {
		hasError: false,
		address,
		port,
		data: buffer.slice(58 + addressEnd + 2)
	};
}


const VlessCmd = {
	TCP: 1,
	UDP: 2,
	MUX: 3,
};

const VlessAddrType = {
	IPv4: 1,		// 4-bytes
	DomainName: 2,	// The first byte indicates the length of the following domain name
	IPv6: 3,		// 16-bytes
};

/**
 * Generate a vless request header.
 * @param {number} command - The command to execute (see VlessCmd).
 * @param {number} destType - The type of destination address (see VlessAddrType).
 * @param {string} destAddr - The destination address.
 * @param {number} destPort - The destination port.
 * @param {string} uuid - The UUID of the request.
 * @returns {Uint8Array} - The vless request header as a Uint8Array.
 * @throws {Error} - If the address type is unknown.
 */
function makeVlessReqHeader(command, destType, destAddr, destPort, uuid) {
	/** @type {number} */
	let addressFieldLength;
	/** @type {Uint8Array | undefined} */
	let addressEncoded;
	switch (destType) {
		case VlessAddrType.IPv4:
			addressFieldLength = 4;
			break;
		case VlessAddrType.DomainName:
			addressEncoded = new TextEncoder().encode(destAddr);
			addressFieldLength = addressEncoded.length + 1;
			break;
		case VlessAddrType.IPv6:
			addressFieldLength = 16;
			break;
		default:
			throw new Error(`Unknown address type: ${destType}`);
	}

	const uuidString = uuid.replace(/-/g, '');
	const uuidOffset = 1;
	const vlessHeader = new Uint8Array(22 + addressFieldLength);

	// Protocol Version = 0
	vlessHeader[0] = 0x00;

	for (let i = 0; i < uuidString.length; i += 2) {
		vlessHeader[uuidOffset + i / 2] = parseInt(uuidString.substr(i, 2), 16);
	}

	// Additional Information Length M = 0
	vlessHeader[17] = 0x00;

	// Instruction
	vlessHeader[18] = command;

	// Port, 2-byte big-endian
	vlessHeader[19] = destPort >> 8;
	vlessHeader[20] = destPort & 0xFF;

	// Address Type
	// 1--> ipv4  addressLength =4
	// 2--> domain name addressLength=addressBuffer[1]
	// 3--> ipv6  addressLength =16
	vlessHeader[21] = destType;

	// Address
	switch (destType) {
		case VlessAddrType.IPv4:
			const octetsIPv4 = destAddr.split('.');
			for (let i = 0; i < 4; i++) {
				vlessHeader[22 + i] = parseInt(octetsIPv4[i]);
			}
			break;
		case VlessAddrType.DomainName:
			vlessHeader[22] = addressEncoded.length;
			vlessHeader.set(addressEncoded, 23);
			break;
		case VlessAddrType.IPv6:
			const groupsIPv6 = ipv6.split(':');
			for (let i = 0; i < 8; i++) {
				const hexGroup = parseInt(groupsIPv6[i], 16);
				vlessHeader[i * 2 + 22] = hexGroup >> 8;
				vlessHeader[i * 2 + 23] = hexGroup & 0xFF;
			}
			break;
		default:
			throw new Error(`Unknown address type: ${destType}`);
	}

	return vlessHeader;
}

/**
 * Checks if the provided VLESS configuration is valid for the given address and stream settings.
 * @param {string} address - The address to check against.
 * @param {Object} streamSettings - The stream settings to check.
 * @throws {Error} If the outbound stream method is not 'ws'.
 * @throws {Error} If the security layer is not 'none' or 'tls'.
 * @throws {Error} If the Host field in the http header is different from the server address.
 * @throws {Error} If the SNI is different from the server address.
 */
function checkVlessConfig(address, streamSettings) {
	if (streamSettings.network !== 'ws') {
		throw new Error(`Unsupported outbound stream method: ${streamSettings.network}, has to be ws (Websocket)`);
	}

	if (streamSettings.security !== 'tls' && streamSettings.security !== 'none') {
		throw new Error(`Usupported security layer: ${streamSettings.network}, has to be none or tls.`);
	}

	if (streamSettings.wsSettings && streamSettings.wsSettings.headers && streamSettings.wsSettings.headers.Host !== address) {
		throw new Error(`The Host field in the http header is different from the server address, this is unsupported due to Cloudflare API restrictions`);
	}

	if (streamSettings.tlsSettings && streamSettings.tlsSettings.serverName !== address) {
		throw new Error(`The SNI is different from the server address, this is unsupported due to Cloudflare API restrictions`);
	}
}


/**
 * Parses a VLESS URL string into its components.
 * @param {string} url The VLESS URL string in the format "vless://uuid@remoteHost:remotePort?queryParams#descriptiveText".
 * @returns {{
*  protocol: string,
*  uuid: string,
*  remoteHost: string,
*  remotePort: number,
*  descriptiveText: string,
*  queryParams: Object<string, string>
* }} An object containing the parsed components of the VLESS URL string.
* @throws {Error} If the URL string is in an invalid format.
*/
function parseVlessString(url) {
	const regex = /^(.+):\/\/(.+?)@(.+?):(\d+)(\?[^#]*)?(#.*)?$/;
	const match = url.match(regex);

	if (!match) {
		throw new Error('Invalid URL format');
	}

	const [, protocol, uuid, remoteHost, remotePort, query, descriptiveText] = match;

	const json = {
		protocol,
		uuid,
		remoteHost,
		remotePort: parseInt(remotePort),
		descriptiveText: descriptiveText ? descriptiveText.substring(1) : '',
		queryParams: {}
	};

	if (query) {
		const queryFields = query.substring(1).split('&');
		queryFields.forEach(field => {
			const [key, value] = field.split('=');
			json.queryParams[key] = value;
		});
	}

	return json;
}


const at = 'QA==';
const pt = 'dmxlc3M=';
const ed = 'RUR0dW5uZWw=';

/**
 *
 * @param {string} userID - single or comma separated userIDs
 * @param {string | null} hostName
 * @returns {string}
 */
function getConfig(userIDs, hostName) {
	const commonUrlPart = `:443?encryption=none&security=tls&sni=${hostName}&fp=randomized&type=ws&host=${hostName}&path=%2F%3Fed%3D2048#${hostName}`;

	// Split the userIDs into an array
	const userIDArray = userIDs.split(",");

	// Prepare output string for each userID
	const sublink = `https://${hostName}/sub/${userIDArray[0]}?format=clash`
	const subbestip = `https://${hostName}/bestip/${userIDArray[0]}`;
	const clash_link = `https://url.v1.mk/sub?target=clash&url=${encodeURIComponent(sublink)}&insert=false&emoji=true&list=false&tfo=false&scv=true&fdn=false&sort=false&new_name=true`;
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
		const protocolMain = atob(pt) + '://' + userID + atob(at) + hostName + commonUrlPart;
		const protocolSec = atob(pt) + '://' + userID + atob(at) + proxyIP + commonUrlPart;
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
	}).join('');

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
          console.error("Failed to copy to clipboard:", err);
        });
    }
  </script>
  </html>`;
}

const HttpPort = new Set([80, 8080, 8880, 2052, 2086, 2095, 2082]);
const HttpsPort = new Set([443, 8443, 2053, 2096, 2087, 2083]);

function GenSub(ไอดีผู้ใช้_เส้นทาง, ชื่อโฮสต์) {
	const อาร์เรย์ไอดีผู้ใช้ = ไอดีผู้ใช้_เส้นทาง.includes(',') ? ไอดีผู้ใช้_เส้นทาง.split(',') : [ไอดีผู้ใช้_เส้นทาง];
	const randomPath = () => '/' + Math.random().toString(36).substring(2, 15) + '?ed=2048';
	const ส่วนUrlทั่วไปHttp = `?encryption=none&security=none&fp=random&type=ws&host=${ชื่อโฮสต์}&path=${encodeURIComponent(randomPath())}#`;
	const ส่วนUrlทั่วไปHttps = `?encryption=none&security=tls&sni=${ชื่อโฮสต์}&fp=random&type=ws&host=${ชื่อโฮสต์}&path=%2F%3Fed%3D2048#`;

	const ผลลัพธ์ = อาร์เรย์ไอดีผู้ใช้.flatMap((ไอดีผู้ใช้) => {
		const PartHttp = Array.from(HttpPort).flatMap((พอร์ต) => {
			if (!ชื่อโฮสต์.includes('pages.dev')) {
				const ส่วนUrl = `${ชื่อโฮสต์}-HTTP-${พอร์ต}`;
				const protocolหลักHttp = atob(pt) + '://' + ไอดีผู้ใช้ + atob(at) + ชื่อโฮสต์ + ':' + พอร์ต + ส่วนUrlทั่วไปHttp + ส่วนUrl;
				return proxyIPs.flatMap((proxyIP) => {
					const protocolรองHttp = atob(pt) + '://' + ไอดีผู้ใช้ + atob(at) + proxyIP + ':' + พอร์ต + ส่วนUrlทั่วไปHttp + ส่วนUrl + '-' + proxyIP + '-' + atob(ed);
					return [protocolหลักHttp, protocolรองHttp];
				});
			}
			return [];
		});

		const PartHttps = Array.from(HttpsPort).flatMap((พอร์ต) => {
			const ส่วนUrl = `${ชื่อโฮสต์}-HTTPS-${พอร์ต}`;
			const protocolหลักHttps = atob(pt) + '://' + ไอดีผู้ใช้ + atob(at) + ชื่อโฮสต์ + ':' + พอร์ต + ส่วนUrlทั่วไปHttps + ส่วนUrl;
			return proxyIPs.flatMap((proxyIP) => {
				const protocolรองHttps = atob(pt) + '://' + ไอดีผู้ใช้ + atob(at) + proxyIP + ':' + พอร์ต + ส่วนUrlทั่วไปHttps + ส่วนUrl + '-' + proxyIP + '-' + atob(ed);
				return [protocolหลักHttps, protocolรองHttps];
			});
		});

		return [...PartHttp, ...PartHttps];
	});

	return ผลลัพธ์.join('\n');
}

const hostnames = [
	'weibo.com',                // Weibo - A popular social media platform
	'www.baidu.com',            // Baidu - The largest search engine in China
	'www.qq.com',               // QQ - A widely used instant messaging platform
	'www.taobao.com',           // Taobao - An e-commerce website owned by Alibaba Group
	'www.jd.com',               // JD.com - One of the largest online retailers in China
	'www.sina.com.cn',          // Sina - A Chinese online media company
	'www.sohu.com',             // Sohu - A Chinese internet service provider
	'www.tmall.com',            // Tmall - An online retail platform owned by Alibaba Group
	'www.163.com',              // NetEase Mail - One of the major email providers in China
	'www.zhihu.com',            // Zhihu - A popular question-and-answer website
	'www.youku.com',            // Youku - A Chinese video sharing platform
	'www.xinhuanet.com',        // Xinhua News Agency - Official news agency of China
	'www.douban.com',           // Douban - A Chinese social networking service
	'www.meituan.com',          // Meituan - A Chinese group buying website for local services
	'www.toutiao.com',          // Toutiao - A news and information content platform
	'www.ifeng.com',            // iFeng - A popular news website in China
	'www.autohome.com.cn',      // Autohome - A leading Chinese automobile online platform
	'www.360.cn',               // 360 - A Chinese internet security company
	'www.douyin.com',           // Douyin - A Chinese short video platform
	'www.kuaidi100.com',        // Kuaidi100 - A Chinese express delivery tracking service
	'www.wechat.com',           // WeChat - A popular messaging and social media app
	'www.csdn.net',             // CSDN - A Chinese technology community website
	'www.imgo.tv',              // ImgoTV - A Chinese live streaming platform
	'www.aliyun.com',           // Alibaba Cloud - A Chinese cloud computing company
	'www.eyny.com',             // Eyny - A Chinese multimedia resource-sharing website
	'www.mgtv.com',             // MGTV - A Chinese online video platform
	'www.xunlei.com',           // Xunlei - A Chinese download manager and torrent client
	'www.hao123.com',           // Hao123 - A Chinese web directory service
	'www.bilibili.com',         // Bilibili - A Chinese video sharing and streaming platform
	'www.youth.cn',             // Youth.cn - A China Youth Daily news portal
	'www.hupu.com',             // Hupu - A Chinese sports community and forum
	'www.youzu.com',            // Youzu Interactive - A Chinese game developer and publisher
	'www.panda.tv',             // Panda TV - A Chinese live streaming platform
	'www.tudou.com',            // Tudou - A Chinese video-sharing website
	'www.zol.com.cn',           // ZOL - A Chinese electronics and gadgets website
	'www.toutiao.io',           // Toutiao - A news and information app
	'www.tiktok.com',           // TikTok - A Chinese short-form video app
	'www.netease.com',          // NetEase - A Chinese internet technology company
	'www.cnki.net',             // CNKI - China National Knowledge Infrastructure, an information aggregator
	'www.zhibo8.cc',            // Zhibo8 - A website providing live sports streams
	'www.zhangzishi.cc',        // Zhangzishi - Personal website of Zhang Zishi, a public intellectual in China
	'www.xueqiu.com',           // Xueqiu - A Chinese online social platform for investors and traders
	'www.qqgongyi.com',         // QQ Gongyi - Tencent's charitable foundation platform
	'www.ximalaya.com',         // Ximalaya - A Chinese online audio platform
	'www.dianping.com',         // Dianping - A Chinese online platform for finding and reviewing local businesses
	'www.suning.com',           // Suning - A leading Chinese online retailer
	'www.zhaopin.com',          // Zhaopin - A Chinese job recruitment platform
	'www.jianshu.com',          // Jianshu - A Chinese online writing platform
	'www.mafengwo.cn',          // Mafengwo - A Chinese travel information sharing platform
	'www.51cto.com',            // 51CTO - A Chinese IT technical community website
	'www.qidian.com',           // Qidian - A Chinese web novel platform
	'www.ctrip.com',            // Ctrip - A Chinese travel services provider
	'www.pconline.com.cn',      // PConline - A Chinese technology news and review website
	'www.cnzz.com',             // CNZZ - A Chinese web analytics service provider
	'www.telegraph.co.uk',      // The Telegraph - A British newspaper website	
	'www.ynet.com',             // Ynet - A Chinese news portal
	'www.ted.com',              // TED - A platform for ideas worth spreading
	'www.renren.com',           // Renren - A Chinese social networking service
	'www.pptv.com',             // PPTV - A Chinese online video streaming platform
	'www.liepin.com',           // Liepin - A Chinese online recruitment website
	'www.881903.com',           // 881903 - A Hong Kong radio station website
	'www.aipai.com',            // Aipai - A Chinese online video sharing platform
	'www.ttpaihang.com',        // Ttpaihang - A Chinese celebrity popularity ranking website
	'www.quyaoya.com',          // Quyaoya - A Chinese online ticketing platform
	'www.91.com',               // 91.com - A Chinese software download website
	'www.dianyou.cn',           // Dianyou - A Chinese game information website
	'www.tmtpost.com',          // TMTPost - A Chinese technology media platform
	'www.douban.com',           // Douban - A Chinese social networking service
	'www.guancha.cn',           // Guancha - A Chinese news and commentary website
	'www.so.com',               // So.com - A Chinese search engine
	'www.58.com',               // 58.com - A Chinese classified advertising website
	'www.cnblogs.com',          // Cnblogs - A Chinese technology blog community
	'www.cntv.cn',              // CCTV - China Central Television official website
	'www.secoo.com',            // Secoo - A Chinese luxury e-commerce platform
];

/**
 * [js-sha256]{@link https://github.com/emn178/js-sha256}
 *
 * @version 0.11.0
 * @author Chen, Yi-Cyuan [emn178@gmail.com]
 * @copyright Chen, Yi-Cyuan 2014-2024
 * @license MIT
 */
/*jslint bitwise: true */
(function () {
	'use strict';

	var ERROR = 'input is invalid type';
	var WINDOW = typeof window === 'object';
	var root = WINDOW ? window : {};
	if (root.JS_SHA256_NO_WINDOW) {
		WINDOW = false;
	}
	var WEB_WORKER = !WINDOW && typeof self === 'object';
	var NODE_JS = !root.JS_SHA256_NO_NODE_JS && typeof process === 'object' && process.versions && process.versions.node;
	if (NODE_JS) {
		root = global;
	} else if (WEB_WORKER) {
		root = self;
	}
	var COMMON_JS = !root.JS_SHA256_NO_COMMON_JS && typeof module === 'object' && module.exports;
	var AMD = typeof define === 'function' && define.amd;
	var ARRAY_BUFFER = !root.JS_SHA256_NO_ARRAY_BUFFER && typeof ArrayBuffer !== 'undefined';
	var HEX_CHARS = '0123456789abcdef'.split('');
	var EXTRA = [-2147483648, 8388608, 32768, 128];
	var SHIFT = [24, 16, 8, 0];
	var K = [
		0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
		0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
		0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
		0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
		0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
		0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
		0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
		0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
	];
	var OUTPUT_TYPES = ['hex', 'array', 'digest', 'arrayBuffer'];

	var blocks = [];

	if (root.JS_SHA256_NO_NODE_JS || !Array.isArray) {
		Array.isArray = function (obj) {
			return Object.prototype.toString.call(obj) === '[object Array]';
		};
	}

	if (ARRAY_BUFFER && (root.JS_SHA256_NO_ARRAY_BUFFER_IS_VIEW || !ArrayBuffer.isView)) {
		ArrayBuffer.isView = function (obj) {
			return typeof obj === 'object' && obj.buffer && obj.buffer.constructor === ArrayBuffer;
		};
	}

	var createOutputMethod = function (outputType, is224) {
		return function (message) {
			return new Sha256(is224, true).update(message)[outputType]();
		};
	};

	var createMethod = function (is224) {
		var method = createOutputMethod('hex', is224);
		if (NODE_JS) {
			method = nodeWrap(method, is224);
		}
		method.create = function () {
			return new Sha256(is224);
		};
		method.update = function (message) {
			return method.create().update(message);
		};
		for (var i = 0; i < OUTPUT_TYPES.length; ++i) {
			var type = OUTPUT_TYPES[i];
			method[type] = createOutputMethod(type, is224);
		}
		return method;
	};

	var nodeWrap = function (method, is224) {
		var crypto = require('crypto')
		var Buffer = require('buffer').Buffer;
		var algorithm = is224 ? 'sha224' : 'sha256';
		var bufferFrom;
		if (Buffer.from && !root.JS_SHA256_NO_BUFFER_FROM) {
			bufferFrom = Buffer.from;
		} else {
			bufferFrom = function (message) {
				return new Buffer(message);
			};
		}
		var nodeMethod = function (message) {
			if (typeof message === 'string') {
				return crypto.createHash(algorithm).update(message, 'utf8').digest('hex');
			} else {
				if (message === null || message === undefined) {
					throw new Error(ERROR);
				} else if (message.constructor === ArrayBuffer) {
					message = new Uint8Array(message);
				}
			}
			if (Array.isArray(message) || ArrayBuffer.isView(message) ||
				message.constructor === Buffer) {
				return crypto.createHash(algorithm).update(bufferFrom(message)).digest('hex');
			} else {
				return method(message);
			}
		};
		return nodeMethod;
	};

	var createHmacOutputMethod = function (outputType, is224) {
		return function (key, message) {
			return new HmacSha256(key, is224, true).update(message)[outputType]();
		};
	};

	var createHmacMethod = function (is224) {
		var method = createHmacOutputMethod('hex', is224);
		method.create = function (key) {
			return new HmacSha256(key, is224);
		};
		method.update = function (key, message) {
			return method.create(key).update(message);
		};
		for (var i = 0; i < OUTPUT_TYPES.length; ++i) {
			var type = OUTPUT_TYPES[i];
			method[type] = createHmacOutputMethod(type, is224);
		}
		return method;
	};

	function Sha256(is224, sharedMemory) {
		if (sharedMemory) {
			blocks[0] = blocks[16] = blocks[1] = blocks[2] = blocks[3] =
				blocks[4] = blocks[5] = blocks[6] = blocks[7] =
				blocks[8] = blocks[9] = blocks[10] = blocks[11] =
				blocks[12] = blocks[13] = blocks[14] = blocks[15] = 0;
			this.blocks = blocks;
		} else {
			this.blocks = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
		}

		if (is224) {
			this.h0 = 0xc1059ed8;
			this.h1 = 0x367cd507;
			this.h2 = 0x3070dd17;
			this.h3 = 0xf70e5939;
			this.h4 = 0xffc00b31;
			this.h5 = 0x68581511;
			this.h6 = 0x64f98fa7;
			this.h7 = 0xbefa4fa4;
		} else { // 256
			this.h0 = 0x6a09e667;
			this.h1 = 0xbb67ae85;
			this.h2 = 0x3c6ef372;
			this.h3 = 0xa54ff53a;
			this.h4 = 0x510e527f;
			this.h5 = 0x9b05688c;
			this.h6 = 0x1f83d9ab;
			this.h7 = 0x5be0cd19;
		}

		this.block = this.start = this.bytes = this.hBytes = 0;
		this.finalized = this.hashed = false;
		this.first = true;
		this.is224 = is224;
	}

	Sha256.prototype.update = function (message) {
		if (this.finalized) {
			return;
		}
		var notString, type = typeof message;
		if (type !== 'string') {
			if (type === 'object') {
				if (message === null) {
					throw new Error(ERROR);
				} else if (ARRAY_BUFFER && message.constructor === ArrayBuffer) {
					message = new Uint8Array(message);
				} else if (!Array.isArray(message)) {
					if (!ARRAY_BUFFER || !ArrayBuffer.isView(message)) {
						throw new Error(ERROR);
					}
				}
			} else {
				throw new Error(ERROR);
			}
			notString = true;
		}
		var code, index = 0, i, length = message.length, blocks = this.blocks;
		while (index < length) {
			if (this.hashed) {
				this.hashed = false;
				blocks[0] = this.block;
				this.block = blocks[16] = blocks[1] = blocks[2] = blocks[3] =
					blocks[4] = blocks[5] = blocks[6] = blocks[7] =
					blocks[8] = blocks[9] = blocks[10] = blocks[11] =
					blocks[12] = blocks[13] = blocks[14] = blocks[15] = 0;
			}

			if (notString) {
				for (i = this.start; index < length && i < 64; ++index) {
					blocks[i >>> 2] |= message[index] << SHIFT[i++ & 3];
				}
			} else {
				for (i = this.start; index < length && i < 64; ++index) {
					code = message.charCodeAt(index);
					if (code < 0x80) {
						blocks[i >>> 2] |= code << SHIFT[i++ & 3];
					} else if (code < 0x800) {
						blocks[i >>> 2] |= (0xc0 | (code >>> 6)) << SHIFT[i++ & 3];
						blocks[i >>> 2] |= (0x80 | (code & 0x3f)) << SHIFT[i++ & 3];
					} else if (code < 0xd800 || code >= 0xe000) {
						blocks[i >>> 2] |= (0xe0 | (code >>> 12)) << SHIFT[i++ & 3];
						blocks[i >>> 2] |= (0x80 | ((code >>> 6) & 0x3f)) << SHIFT[i++ & 3];
						blocks[i >>> 2] |= (0x80 | (code & 0x3f)) << SHIFT[i++ & 3];
					} else {
						code = 0x10000 + (((code & 0x3ff) << 10) | (message.charCodeAt(++index) & 0x3ff));
						blocks[i >>> 2] |= (0xf0 | (code >>> 18)) << SHIFT[i++ & 3];
						blocks[i >>> 2] |= (0x80 | ((code >>> 12) & 0x3f)) << SHIFT[i++ & 3];
						blocks[i >>> 2] |= (0x80 | ((code >>> 6) & 0x3f)) << SHIFT[i++ & 3];
						blocks[i >>> 2] |= (0x80 | (code & 0x3f)) << SHIFT[i++ & 3];
					}
				}
			}

			this.lastByteIndex = i;
			this.bytes += i - this.start;
			if (i >= 64) {
				this.block = blocks[16];
				this.start = i - 64;
				this.hash();
				this.hashed = true;
			} else {
				this.start = i;
			}
		}
		if (this.bytes > 4294967295) {
			this.hBytes += this.bytes / 4294967296 << 0;
			this.bytes = this.bytes % 4294967296;
		}
		return this;
	};

	Sha256.prototype.finalize = function () {
		if (this.finalized) {
			return;
		}
		this.finalized = true;
		var blocks = this.blocks, i = this.lastByteIndex;
		blocks[16] = this.block;
		blocks[i >>> 2] |= EXTRA[i & 3];
		this.block = blocks[16];
		if (i >= 56) {
			if (!this.hashed) {
				this.hash();
			}
			blocks[0] = this.block;
			blocks[16] = blocks[1] = blocks[2] = blocks[3] =
				blocks[4] = blocks[5] = blocks[6] = blocks[7] =
				blocks[8] = blocks[9] = blocks[10] = blocks[11] =
				blocks[12] = blocks[13] = blocks[14] = blocks[15] = 0;
		}
		blocks[14] = this.hBytes << 3 | this.bytes >>> 29;
		blocks[15] = this.bytes << 3;
		this.hash();
	};

	Sha256.prototype.hash = function () {
		var a = this.h0, b = this.h1, c = this.h2, d = this.h3, e = this.h4, f = this.h5, g = this.h6,
			h = this.h7, blocks = this.blocks, j, s0, s1, maj, t1, t2, ch, ab, da, cd, bc;

		for (j = 16; j < 64; ++j) {
			// rightrotate
			t1 = blocks[j - 15];
			s0 = ((t1 >>> 7) | (t1 << 25)) ^ ((t1 >>> 18) | (t1 << 14)) ^ (t1 >>> 3);
			t1 = blocks[j - 2];
			s1 = ((t1 >>> 17) | (t1 << 15)) ^ ((t1 >>> 19) | (t1 << 13)) ^ (t1 >>> 10);
			blocks[j] = blocks[j - 16] + s0 + blocks[j - 7] + s1 << 0;
		}

		bc = b & c;
		for (j = 0; j < 64; j += 4) {
			if (this.first) {
				if (this.is224) {
					ab = 300032;
					t1 = blocks[0] - 1413257819;
					h = t1 - 150054599 << 0;
					d = t1 + 24177077 << 0;
				} else {
					ab = 704751109;
					t1 = blocks[0] - 210244248;
					h = t1 - 1521486534 << 0;
					d = t1 + 143694565 << 0;
				}
				this.first = false;
			} else {
				s0 = ((a >>> 2) | (a << 30)) ^ ((a >>> 13) | (a << 19)) ^ ((a >>> 22) | (a << 10));
				s1 = ((e >>> 6) | (e << 26)) ^ ((e >>> 11) | (e << 21)) ^ ((e >>> 25) | (e << 7));
				ab = a & b;
				maj = ab ^ (a & c) ^ bc;
				ch = (e & f) ^ (~e & g);
				t1 = h + s1 + ch + K[j] + blocks[j];
				t2 = s0 + maj;
				h = d + t1 << 0;
				d = t1 + t2 << 0;
			}
			s0 = ((d >>> 2) | (d << 30)) ^ ((d >>> 13) | (d << 19)) ^ ((d >>> 22) | (d << 10));
			s1 = ((h >>> 6) | (h << 26)) ^ ((h >>> 11) | (h << 21)) ^ ((h >>> 25) | (h << 7));
			da = d & a;
			maj = da ^ (d & b) ^ ab;
			ch = (h & e) ^ (~h & f);
			t1 = g + s1 + ch + K[j + 1] + blocks[j + 1];
			t2 = s0 + maj;
			g = c + t1 << 0;
			c = t1 + t2 << 0;
			s0 = ((c >>> 2) | (c << 30)) ^ ((c >>> 13) | (c << 19)) ^ ((c >>> 22) | (c << 10));
			s1 = ((g >>> 6) | (g << 26)) ^ ((g >>> 11) | (g << 21)) ^ ((g >>> 25) | (g << 7));
			cd = c & d;
			maj = cd ^ (c & a) ^ da;
			ch = (g & h) ^ (~g & e);
			t1 = f + s1 + ch + K[j + 2] + blocks[j + 2];
			t2 = s0 + maj;
			f = b + t1 << 0;
			b = t1 + t2 << 0;
			s0 = ((b >>> 2) | (b << 30)) ^ ((b >>> 13) | (b << 19)) ^ ((b >>> 22) | (b << 10));
			s1 = ((f >>> 6) | (f << 26)) ^ ((f >>> 11) | (f << 21)) ^ ((f >>> 25) | (f << 7));
			bc = b & c;
			maj = bc ^ (b & d) ^ cd;
			ch = (f & g) ^ (~f & h);
			t1 = e + s1 + ch + K[j + 3] + blocks[j + 3];
			t2 = s0 + maj;
			e = a + t1 << 0;
			a = t1 + t2 << 0;
			this.chromeBugWorkAround = true;
		}

		this.h0 = this.h0 + a << 0;
		this.h1 = this.h1 + b << 0;
		this.h2 = this.h2 + c << 0;
		this.h3 = this.h3 + d << 0;
		this.h4 = this.h4 + e << 0;
		this.h5 = this.h5 + f << 0;
		this.h6 = this.h6 + g << 0;
		this.h7 = this.h7 + h << 0;
	};

	Sha256.prototype.hex = function () {
		this.finalize();

		var h0 = this.h0, h1 = this.h1, h2 = this.h2, h3 = this.h3, h4 = this.h4, h5 = this.h5,
			h6 = this.h6, h7 = this.h7;

		var hex = HEX_CHARS[(h0 >>> 28) & 0x0F] + HEX_CHARS[(h0 >>> 24) & 0x0F] +
			HEX_CHARS[(h0 >>> 20) & 0x0F] + HEX_CHARS[(h0 >>> 16) & 0x0F] +
			HEX_CHARS[(h0 >>> 12) & 0x0F] + HEX_CHARS[(h0 >>> 8) & 0x0F] +
			HEX_CHARS[(h0 >>> 4) & 0x0F] + HEX_CHARS[h0 & 0x0F] +
			HEX_CHARS[(h1 >>> 28) & 0x0F] + HEX_CHARS[(h1 >>> 24) & 0x0F] +
			HEX_CHARS[(h1 >>> 20) & 0x0F] + HEX_CHARS[(h1 >>> 16) & 0x0F] +
			HEX_CHARS[(h1 >>> 12) & 0x0F] + HEX_CHARS[(h1 >>> 8) & 0x0F] +
			HEX_CHARS[(h1 >>> 4) & 0x0F] + HEX_CHARS[h1 & 0x0F] +
			HEX_CHARS[(h2 >>> 28) & 0x0F] + HEX_CHARS[(h2 >>> 24) & 0x0F] +
			HEX_CHARS[(h2 >>> 20) & 0x0F] + HEX_CHARS[(h2 >>> 16) & 0x0F] +
			HEX_CHARS[(h2 >>> 12) & 0x0F] + HEX_CHARS[(h2 >>> 8) & 0x0F] +
			HEX_CHARS[(h2 >>> 4) & 0x0F] + HEX_CHARS[h2 & 0x0F] +
			HEX_CHARS[(h3 >>> 28) & 0x0F] + HEX_CHARS[(h3 >>> 24) & 0x0F] +
			HEX_CHARS[(h3 >>> 20) & 0x0F] + HEX_CHARS[(h3 >>> 16) & 0x0F] +
			HEX_CHARS[(h3 >>> 12) & 0x0F] + HEX_CHARS[(h3 >>> 8) & 0x0F] +
			HEX_CHARS[(h3 >>> 4) & 0x0F] + HEX_CHARS[h3 & 0x0F] +
			HEX_CHARS[(h4 >>> 28) & 0x0F] + HEX_CHARS[(h4 >>> 24) & 0x0F] +
			HEX_CHARS[(h4 >>> 20) & 0x0F] + HEX_CHARS[(h4 >>> 16) & 0x0F] +
			HEX_CHARS[(h4 >>> 12) & 0x0F] + HEX_CHARS[(h4 >>> 8) & 0x0F] +
			HEX_CHARS[(h4 >>> 4) & 0x0F] + HEX_CHARS[h4 & 0x0F] +
			HEX_CHARS[(h5 >>> 28) & 0x0F] + HEX_CHARS[(h5 >>> 24) & 0x0F] +
			HEX_CHARS[(h5 >>> 20) & 0x0F] + HEX_CHARS[(h5 >>> 16) & 0x0F] +
			HEX_CHARS[(h5 >>> 12) & 0x0F] + HEX_CHARS[(h5 >>> 8) & 0x0F] +
			HEX_CHARS[(h5 >>> 4) & 0x0F] + HEX_CHARS[h5 & 0x0F] +
			HEX_CHARS[(h6 >>> 28) & 0x0F] + HEX_CHARS[(h6 >>> 24) & 0x0F] +
			HEX_CHARS[(h6 >>> 20) & 0x0F] + HEX_CHARS[(h6 >>> 16) & 0x0F] +
			HEX_CHARS[(h6 >>> 12) & 0x0F] + HEX_CHARS[(h6 >>> 8) & 0x0F] +
			HEX_CHARS[(h6 >>> 4) & 0x0F] + HEX_CHARS[h6 & 0x0F];
		if (!this.is224) {
			hex += HEX_CHARS[(h7 >>> 28) & 0x0F] + HEX_CHARS[(h7 >>> 24) & 0x0F] +
				HEX_CHARS[(h7 >>> 20) & 0x0F] + HEX_CHARS[(h7 >>> 16) & 0x0F] +
				HEX_CHARS[(h7 >>> 12) & 0x0F] + HEX_CHARS[(h7 >>> 8) & 0x0F] +
				HEX_CHARS[(h7 >>> 4) & 0x0F] + HEX_CHARS[h7 & 0x0F];
		}
		return hex;
	};

	Sha256.prototype.toString = Sha256.prototype.hex;

	Sha256.prototype.digest = function () {
		this.finalize();

		var h0 = this.h0, h1 = this.h1, h2 = this.h2, h3 = this.h3, h4 = this.h4, h5 = this.h5,
			h6 = this.h6, h7 = this.h7;

		var arr = [
			(h0 >>> 24) & 0xFF, (h0 >>> 16) & 0xFF, (h0 >>> 8) & 0xFF, h0 & 0xFF,
			(h1 >>> 24) & 0xFF, (h1 >>> 16) & 0xFF, (h1 >>> 8) & 0xFF, h1 & 0xFF,
			(h2 >>> 24) & 0xFF, (h2 >>> 16) & 0xFF, (h2 >>> 8) & 0xFF, h2 & 0xFF,
			(h3 >>> 24) & 0xFF, (h3 >>> 16) & 0xFF, (h3 >>> 8) & 0xFF, h3 & 0xFF,
			(h4 >>> 24) & 0xFF, (h4 >>> 16) & 0xFF, (h4 >>> 8) & 0xFF, h4 & 0xFF,
			(h5 >>> 24) & 0xFF, (h5 >>> 16) & 0xFF, (h5 >>> 8) & 0xFF, h5 & 0xFF,
			(h6 >>> 24) & 0xFF, (h6 >>> 16) & 0xFF, (h6 >>> 8) & 0xFF, h6 & 0xFF
		];
		if (!this.is224) {
			arr.push((h7 >>> 24) & 0xFF, (h7 >>> 16) & 0xFF, (h7 >>> 8) & 0xFF, h7 & 0xFF);
		}
		return arr;
	};

	Sha256.prototype.array = Sha256.prototype.digest;

	Sha256.prototype.arrayBuffer = function () {
		this.finalize();

		var buffer = new ArrayBuffer(this.is224 ? 28 : 32);
		var dataView = new DataView(buffer);
		dataView.setUint32(0, this.h0);
		dataView.setUint32(4, this.h1);
		dataView.setUint32(8, this.h2);
		dataView.setUint32(12, this.h3);
		dataView.setUint32(16, this.h4);
		dataView.setUint32(20, this.h5);
		dataView.setUint32(24, this.h6);
		if (!this.is224) {
			dataView.setUint32(28, this.h7);
		}
		return buffer;
	};

	function HmacSha256(key, is224, sharedMemory) {
		var i, type = typeof key;
		if (type === 'string') {
			var bytes = [], length = key.length, index = 0, code;
			for (i = 0; i < length; ++i) {
				code = key.charCodeAt(i);
				if (code < 0x80) {
					bytes[index++] = code;
				} else if (code < 0x800) {
					bytes[index++] = (0xc0 | (code >>> 6));
					bytes[index++] = (0x80 | (code & 0x3f));
				} else if (code < 0xd800 || code >= 0xe000) {
					bytes[index++] = (0xe0 | (code >>> 12));
					bytes[index++] = (0x80 | ((code >>> 6) & 0x3f));
					bytes[index++] = (0x80 | (code & 0x3f));
				} else {
					code = 0x10000 + (((code & 0x3ff) << 10) | (key.charCodeAt(++i) & 0x3ff));
					bytes[index++] = (0xf0 | (code >>> 18));
					bytes[index++] = (0x80 | ((code >>> 12) & 0x3f));
					bytes[index++] = (0x80 | ((code >>> 6) & 0x3f));
					bytes[index++] = (0x80 | (code & 0x3f));
				}
			}
			key = bytes;
		} else {
			if (type === 'object') {
				if (key === null) {
					throw new Error(ERROR);
				} else if (ARRAY_BUFFER && key.constructor === ArrayBuffer) {
					key = new Uint8Array(key);
				} else if (!Array.isArray(key)) {
					if (!ARRAY_BUFFER || !ArrayBuffer.isView(key)) {
						throw new Error(ERROR);
					}
				}
			} else {
				throw new Error(ERROR);
			}
		}

		if (key.length > 64) {
			key = (new Sha256(is224, true)).update(key).array();
		}

		var oKeyPad = [], iKeyPad = [];
		for (i = 0; i < 64; ++i) {
			var b = key[i] || 0;
			oKeyPad[i] = 0x5c ^ b;
			iKeyPad[i] = 0x36 ^ b;
		}

		Sha256.call(this, is224, sharedMemory);

		this.update(iKeyPad);
		this.oKeyPad = oKeyPad;
		this.inner = true;
		this.sharedMemory = sharedMemory;
	}
	HmacSha256.prototype = new Sha256();

	HmacSha256.prototype.finalize = function () {
		Sha256.prototype.finalize.call(this);
		if (this.inner) {
			this.inner = false;
			var innerHash = this.array();
			Sha256.call(this, this.is224, this.sharedMemory);
			this.update(this.oKeyPad);
			this.update(innerHash);
			Sha256.prototype.finalize.call(this);
		}
	};

	var exports = createMethod();
	exports.sha256 = exports;
	exports.sha224 = createMethod(true);
	exports.sha256.hmac = createHmacMethod();
	exports.sha224.hmac = createHmacMethod(true);

	if (COMMON_JS) {
		module.exports = exports;
	} else {
		root.sha256 = exports.sha256;
		root.sha224 = exports.sha224;
		if (AMD) {
			define(function () {
				return exports;
			});
		}
	}
})();