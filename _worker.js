export default {
  async fetch(req, env) {
    const upgrade = req.headers.get("Upgrade");

    // ===== UUID Whitelist check =====
    const allowUUID = [
      "3b603fb3-4b66-459a-bdc2-b51e3fe6a345", // Ganti dengan UUID kamu sendiri
      "12345678-1234-1234-1234-123456789000"
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
