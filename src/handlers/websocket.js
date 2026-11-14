/**
 * WebSocket protocol handler
 */

import { makeReadableWebSocketStream } from '../proxy/stream.js';
import { handleTCPOutBound } from '../proxy/tcp.js';
import { handleDNSQuery } from '../protocol/dns.js';
import { processProtocolHeader } from '../protocol/vless.js';
import { isTrojanProtocol, processTrojanHeader } from '../protocol/trojan.js';
import { canHandleUDP, handleUDPOutbound } from '../proxy/udp-handler.js';

/**
 * Handles protocol over WebSocket requests.
 * Creates WebSocket pair, accepts connection, and processes protocol header.
 * @param {import("@cloudflare/workers-types").Request} request - The incoming request object
 * @param {Object} config - Request configuration
 * @param {Function} connect - Cloudflare socket connect function
 * @returns {Promise<Response>} WebSocket response
 */
export async function protocolOverWSHandler(request, config, connect) {
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
	let remoteSocketWrapper = {
		value: null,
	};
	let isDns = false;

	// ws --> remote
	readableWebSocketStream.pipeTo(new WritableStream({
		async write(chunk, controller) {
			if (isDns) {
				return await handleDNSQuery(chunk, webSocket, null, log, connect);
			}
			if (remoteSocketWrapper.value) {
				const writer = remoteSocketWrapper.value.writable.getWriter();
				await writer.write(chunk);
				writer.releaseLock();
				return;
			}

			// Auto-detect protocol: Trojan or VLESS
			// Trojan detection requires password verification to avoid false positives
			let protocolResult;
			let protocolType = 'vless';

			if (isTrojanProtocol(chunk, config.trojanPassword)) {
				protocolType = 'trojan';
				protocolResult = processTrojanHeader(chunk, config.trojanPassword);
			} else {
				protocolResult = processProtocolHeader(chunk, config.userID);
			}

			const {
				hasError,
				message,
				addressType,
				portRemote = 443,
				addressRemote = '',
				rawDataIndex,
				protocolVersion = new Uint8Array([0, 0]),
				isUDP,
			} = protocolResult;
			address = addressRemote;
			portWithRandomLog = `${portRemote}--${Math.random()} ${isUDP ? 'udp ' : 'tcp '} [${protocolType}]`;
			if (hasError) {
				throw new Error(message);
			}
			// Handle UDP connections
			if (isUDP) {
				// Check if we have a UDP-capable outbound (e.g., VLESS outbound)
				if (canHandleUDP(config)) {
					// Full UDP support via VLESS outbound
					const protocolResponseHeader = protocolType === 'trojan'
						? null
						: new Uint8Array([protocolVersion[0], 0]);
					const rawClientData = chunk.slice(rawDataIndex);
					const udpWritable = await handleUDPOutbound(
						webSocket,
						protocolResponseHeader,
						addressType,
						addressRemote,
						portRemote,
						rawClientData,
						log,
						config
					);
					if (udpWritable) {
						// Store the writable stream for subsequent messages
						remoteSocketWrapper.value = { writable: udpWritable };
					}
					return;
				} else if (portRemote === 53) {
					// Fallback to DNS-only mode when no UDP-capable outbound
					isDns = true;
				} else {
					throw new Error('UDP proxy requires VLESS outbound configuration');
				}
				return; // Early return after setting isDns or throwing error
			}
			// Protocol response header: VLESS needs 2-byte header, Trojan needs none
			const protocolResponseHeader = protocolType === 'trojan'
				? null
				: new Uint8Array([protocolVersion[0], 0]);
			const rawClientData = chunk.slice(rawDataIndex);

			if (isDns) {
				return handleDNSQuery(rawClientData, webSocket, protocolResponseHeader, log, connect);
			}
			await handleTCPOutBound(remoteSocketWrapper, addressType, addressRemote, portRemote, rawClientData, webSocket, protocolResponseHeader, log, config, connect);
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
