export default {
  async fetch(req, env) {
    const upgrade = req.headers.get("Upgrade");

    // ===== UUID Whitelist check =====
    const allowUUID = [
      "83778298-9028-4acb-9055-2f0025c990d6", // Ganti dengan UUID kamu sendiri
      
    ];

    const url = new URL(req.url);
    const clientUUID = url.searchParams.get("uuid");

    if (!allowUUID.includes(clientUUID)) {
      return new Response("Forbidden: Invalid UUID", { status: 403 });
    }

    // ===== Handle WebSocket Upgrade =====
    if (upgrade !== null && upgrade.toLowerCase() === "websocket") {
      const targetIp = "54.169.229.188"; // IP server kamu
      const targetPort = 443;

      const wsPair = new WebSocketPair();
      const [client, server] = Object.values(wsPair);

      let tcpSocket;
      try {
        tcpSocket = await connect({
          hostname: targetIp,
          port: targetPort
        });
      } catch (e) {
        server.close(1011, "Failed to connect to server");
        return new Response("TCP connection failed", { status: 500 });
      }

      server.accept();

      // Pipe WebSocket <=> TCP
      pipeSocket(server, tcpSocket);
      pipeSocketReverse(tcpSocket, server);

      return new Response(null, {
        status: 101,
        webSocket: client
      });
    }

    return new Response("EDTunnel Active", { status: 200 });
  }
};

function pipeSocket(ws, tcp) {
  ws.addEventListener("message", event => {
    if (typeof event.data === "string") {
      tcp.write(new TextEncoder().encode(event.data));
    } else {
      tcp.write(event.data);
    }
  });
  ws.addEventListener("close", () => tcp.close());
  ws.addEventListener("error", () => tcp.close());
}

function pipeSocketReverse(tcp, ws) {
  const reader = tcp.readable.getReader();
  const read = () => {
    reader.read().then(({ value, done }) => {
      if (done) {
        ws.close();
        return;
      }
      ws.send(value);
      read();
    });
  };
  read();
}
