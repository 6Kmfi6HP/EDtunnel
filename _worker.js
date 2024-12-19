import { connect } from "cloudflare:sockets";
let userID = "f5d09650-b154-4192-97c5-633ea7717364";
const proxyIPs = ["104.248.145.216"];
let proxyIP = proxyIPs[Math.floor(Math.random() * proxyIPs.length)];
let proxyPort = proxyIP.includes(":") ? proxyIP.split(":")[0x1] : "443";
let socks5Address = '';
let socks5Relay = false;
if (!isValidUUID(userID)) {
  throw new Error("uuid is not valid");
}
let parsedSocks5Address = {};
let enableSocks = false;
export default {
  async "fetch"(_0x4c608e, _0x1de656, _0xeb9d8a) {
    try {
      const {
        UUID: _0x3ee73a,
        PROXYIP: _0x3030f8,
        SOCKS5: _0x24bb3c,
        SOCKS5_RELAY: _0x25f526
      } = _0x1de656;
      userID = _0x3ee73a || userID;
      socks5Address = _0x24bb3c || socks5Address;
      socks5Relay = _0x25f526 || socks5Relay;
      const _0x12df04 = handleProxyConfig(_0x3030f8);
      proxyIP = _0x12df04.ip;
      proxyPort = _0x12df04.port;
      if (socks5Address) {
        try {
          const _0xca445f = selectRandomAddress(socks5Address);
          parsedSocks5Address = socks5AddressParser(_0xca445f);
          enableSocks = true;
        } catch (_0x30e2a2) {
          console.log(_0x30e2a2.toString());
          enableSocks = false;
        }
      }
      const _0x4d59cd = userID.includes(",") ? userID.split(",").map(_0x20d3fa => _0x20d3fa.trim()) : [userID];
      const _0x4a1924 = new URL(_0x4c608e.url);
      const _0x413eac = _0x4c608e.headers.get("Host");
      const _0x1d09b7 = _0x4a1924.pathname.substring(0x1);
      const _0x2fb3f1 = _0x4d59cd.length === 0x1 ? _0x1d09b7 === _0x4d59cd[0x0] || _0x1d09b7 === "sub/" + _0x4d59cd[0x0] || _0x1d09b7 === "bestip/" + _0x4d59cd[0x0] ? _0x4d59cd[0x0] : null : _0x4d59cd.find(_0x368d84 => {
        const _0x3faac6 = [_0x368d84, "sub/" + _0x368d84, "bestip/" + _0x368d84];
        return _0x3faac6.some(_0x6510c => _0x1d09b7.startsWith(_0x6510c));
      });
      if (_0x4c608e.headers.get("Upgrade") !== "websocket") {
        if (_0x4a1924.pathname === "/cf") {
          const _0x13de78 = {
            "Content-Type": "application/json;charset=utf-8"
          };
          const _0x85f355 = {
            status: 0xc8,
            headers: _0x13de78
          };
          return new Response(JSON.stringify(_0x4c608e.cf, null, 0x4), _0x85f355);
        }
        if (_0x2fb3f1) {
          if (_0x4a1924.pathname === "/" + _0x2fb3f1 || _0x4a1924.pathname === "/sub/" + _0x2fb3f1) {
            const _0x28d2cb = _0x4a1924.pathname.startsWith("/sub/");
            const _0x15165b = _0x3030f8 ? _0x3030f8.split(",").map(_0x2ba5b9 => _0x2ba5b9.trim()) : proxyIP;
            const _0x931a5e = _0x28d2cb ? GenSub(_0x2fb3f1, _0x413eac, _0x15165b) : getConfig(_0x2fb3f1, _0x413eac, _0x15165b);
            const _0x5c3db7 = {
              "Content-Type": _0x28d2cb ? "text/plain;charset=utf-8" : "text/html; charset=utf-8"
            };
            const _0x1ae26c = {
              status: 0xc8,
              headers: _0x5c3db7
            };
            return new Response(_0x931a5e, _0x1ae26c);
          } else {
            if (_0x4a1924.pathname === "/bestip/" + _0x2fb3f1) {
              const _0x1ebe81 = {
                headers: _0x4c608e.headers
              };
              return fetch("https://sub.xf.free.hr/auto?host=" + _0x413eac + "&uuid=" + _0x2fb3f1 + "&path=/", _0x1ebe81);
            }
          }
        }
        return handleDefaultPath(_0x4a1924, _0x4c608e);
      } else {
        return await ProtocolOverWSHandler(_0x4c608e);
      }
    } catch (_0x18a030) {
      return new Response(_0x18a030.toString());
    }
  }
};
async function handleDefaultPath(_0x2a8053, _0x5ec7de) {
  const _0x2743da = _0x5ec7de.headers.get("Host");
  const _0x26e182 = "\n\t  <!DOCTYPE html>\n\t  <html lang=\"en\">\n\t  <head>\n\t\t  <meta charset=\"UTF-8\">\n\t\t  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n\t\t  <title>" + _0x2743da + " - Cloud Drive</title>\n\t\t  <style>\n\t\t\t  body {\n\t\t\t\t  font-family: Arial, sans-serif;\n\t\t\t\t  line-height: 1.6;\n\t\t\t\t  margin: 0;\n\t\t\t\t  padding: 20px;\n\t\t\t\t  background-color: #f4f4f4;\n\t\t\t  }\n\t\t\t  .container {\n\t\t\t\t  max-width: 800px;\n\t\t\t\t  margin: auto;\n\t\t\t\t  background: white;\n\t\t\t\t  padding: 20px;\n\t\t\t\t  border-radius: 5px;\n\t\t\t\t  box-shadow: 0 0 10px rgba(0,0,0,0.1);\n\t\t\t  }\n\t\t\t  h1 {\n\t\t\t\t  color: #333;\n\t\t\t  }\n\t\t\t  .file-list {\n\t\t\t\t  list-style-type: none;\n\t\t\t\t  padding: 0;\n\t\t\t  }\n\t\t\t  .file-list li {\n\t\t\t\t  background: #f9f9f9;\n\t\t\t\t  margin-bottom: 10px;\n\t\t\t\t  padding: 10px;\n\t\t\t\t  border-radius: 3px;\n\t\t\t\t  display: flex;\n\t\t\t\t  align-items: center;\n\t\t\t  }\n\t\t\t  .file-list li:hover {\n\t\t\t\t  background: #f0f0f0;\n\t\t\t  }\n\t\t\t  .file-icon {\n\t\t\t\t  margin-right: 10px;\n\t\t\t\t  font-size: 1.2em;\n\t\t\t  }\n\t\t\t  .file-link {\n\t\t\t\t  text-decoration: none;\n\t\t\t\t  color: #0066cc;\n\t\t\t\t  flex-grow: 1;\n\t\t\t  }\n\t\t\t  .file-link:hover {\n\t\t\t\t  text-decoration: underline;\n\t\t\t  }\n\t\t\t  .upload-area {\n\t\t\t\t  margin-top: 20px;\n\t\t\t\t  padding: 40px;\n\t\t\t\t  background: #e9e9e9;\n\t\t\t\t  border: 2px dashed #aaa;\n\t\t\t\t  border-radius: 5px;\n\t\t\t\t  text-align: center;\n\t\t\t\t  cursor: pointer;\n\t\t\t\t  transition: all 0.3s ease;\n\t\t\t  }\n\t\t\t  .upload-area:hover, .upload-area.drag-over {\n\t\t\t\t  background: #d9d9d9;\n\t\t\t\t  border-color: #666;\n\t\t\t  }\n\t\t\t  .upload-area h2 {\n\t\t\t\t  margin-top: 0;\n\t\t\t\t  color: #333;\n\t\t\t  }\n\t\t\t  #fileInput {\n\t\t\t\t  display: none;\n\t\t\t  }\n\t\t\t  .upload-icon {\n\t\t\t\t  font-size: 48px;\n\t\t\t\t  color: #666;\n\t\t\t\t  margin-bottom: 10px;\n\t\t\t  }\n\t\t\t  .upload-text {\n\t\t\t\t  font-size: 18px;\n\t\t\t\t  color: #666;\n\t\t\t  }\n\t\t\t  .upload-status {\n\t\t\t\t  margin-top: 20px;\n\t\t\t\t  font-style: italic;\n\t\t\t\t  color: #666;\n\t\t\t  }\n\t\t\t  .file-actions {\n\t\t\t\t  display: flex;\n\t\t\t\t  gap: 10px;\n\t\t\t  }\n\t\t\t  .delete-btn {\n\t\t\t\t  color: #ff4444;\n\t\t\t\t  cursor: pointer;\n\t\t\t\t  background: none;\n\t\t\t\t  border: none;\n\t\t\t\t  padding: 5px;\n\t\t\t  }\n\t\t\t  .delete-btn:hover {\n\t\t\t\t  color: #ff0000;\n\t\t\t  }\n\t\t\t  .clear-all-btn {\n\t\t\t\t  background-color: #ff4444;\n\t\t\t\t  color: white;\n\t\t\t\t  border: none;\n\t\t\t\t  padding: 10px 15px;\n\t\t\t\t  border-radius: 4px;\n\t\t\t\t  cursor: pointer;\n\t\t\t\t  margin-bottom: 20px;\n\t\t\t  }\n\t\t\t  .clear-all-btn:hover {\n\t\t\t\t  background-color: #ff0000;\n\t\t\t  }\n\t\t  </style>\n\t  </head>\n\t  <body>\n\t\t  <div class=\"container\">\n\t\t\t  <h1>Cloud Drive</h1>\n\t\t\t  <p>Welcome to your personal cloud storage. Here are your uploaded files:</p>\n\t\t\t  <button id=\"clearAllBtn\" class=\"clear-all-btn\">Clear All Files</button>\n\t\t\t  <ul id=\"fileList\" class=\"file-list\">\n\t\t\t  </ul>\n\t\t\t  <div id=\"uploadArea\" class=\"upload-area\">\n\t\t\t\t  <div class=\"upload-icon\">📁</div>\n\t\t\t\t  <h2>Upload a File</h2>\n\t\t\t\t  <p class=\"upload-text\">Drag and drop a file here or click to select</p>\n\t\t\t\t  <input type=\"file\" id=\"fileInput\" hidden>\n\t\t\t  </div>\n\t\t\t  <div id=\"uploadStatus\" class=\"upload-status\"></div>\n\t\t  </div>\n\t\t  <script>\n\t\t\t  function loadFileList() {\n\t\t\t\t  const fileList = document.getElementById('fileList');\n\t\t\t\t  const savedFiles = JSON.parse(localStorage.getItem('uploadedFiles')) || [];\n\t\t\t\t  fileList.innerHTML = '';\n\t\t\t\t  savedFiles.forEach((file, index) => {\n\t\t\t\t\t  const li = document.createElement('li');\n\t\t\t\t\t  li.innerHTML = `\n\t\t\t\t\t\t  <span class=\"file-icon\">📄</span>\n\t\t\t\t\t\t  <a href=\"https://ipfs.io/ipfs/${file.Url.split('/').pop()}\" class=\"file-link\" target=\"_blank\">${file.Name}</a>\n\t\t\t\t\t\t  <div class=\"file-actions\">\n\t\t\t\t\t\t\t  <button class=\"delete-btn\" onclick=\"deleteFile(${index})\">\n\t\t\t\t\t\t\t\t  <span class=\"file-icon\">❌</span>\n\t\t\t\t\t\t\t  </button>\n\t\t\t\t\t\t  </div>\n\t\t\t\t\t  `;\n\t\t\t\t\t  fileList.appendChild(li);\n\t\t\t\t  });\n\t\t\t  }\n\n\t\t\t  function deleteFile(index) {\n\t\t\t\t  const savedFiles = JSON.parse(localStorage.getItem('uploadedFiles')) || [];\n\t\t\t\t  savedFiles.splice(index, 1);\n\t\t\t\t  localStorage.setItem('uploadedFiles', JSON.stringify(savedFiles));\n\t\t\t\t  loadFileList();\n\t\t\t  }\n\n\t\t\t  document.getElementById('clearAllBtn').addEventListener('click', () => {\n\t\t\t\t  if (confirm('Are you sure you want to clear all files?')) {\n\t\t\t\t\t  localStorage.removeItem('uploadedFiles');\n\t\t\t\t\t  loadFileList();\n\t\t\t\t  }\n\t\t\t  });\n\n\t\t\t  loadFileList();\n\n\t\t\t  const uploadArea = document.getElementById('uploadArea');\n\t\t\t  const fileInput = document.getElementById('fileInput');\n\t\t\t  const uploadStatus = document.getElementById('uploadStatus');\n\n\t\t\t  uploadArea.addEventListener('dragover', (e) => {\n\t\t\t\t  e.preventDefault();\n\t\t\t\t  uploadArea.classList.add('drag-over');\n\t\t\t  });\n\n\t\t\t  uploadArea.addEventListener('dragleave', () => {\n\t\t\t\t  uploadArea.classList.remove('drag-over');\n\t\t\t  });\n\n\t\t\t  uploadArea.addEventListener('drop', (e) => {\n\t\t\t\t  e.preventDefault();\n\t\t\t\t  uploadArea.classList.remove('drag-over');\n\t\t\t\t  const files = e.dataTransfer.files;\n\t\t\t\t  if (files.length) {\n\t\t\t\t\t  handleFileUpload(files[0]);\n\t\t\t\t  }\n\t\t\t  });\n\n\t\t\t  uploadArea.addEventListener('click', () => {\n\t\t\t\t  fileInput.click();\n\t\t\t  });\n\n\t\t\t  fileInput.addEventListener('change', (e) => {\n\t\t\t\t  const file = e.target.files[0];\n\t\t\t\t  if (file) {\n\t\t\t\t\t  handleFileUpload(file);\n\t\t\t\t  }\n\t\t\t  });\n\n\t\t\t  async function handleFileUpload(file) {\n\t\t\t\t  uploadStatus.textContent = `Uploading: ${file.name}...`;\n\t\t\t\t  \n\t\t\t\t  const formData = new FormData();\n\t\t\t\t  formData.append('file', file);\n\n\t\t\t\t  try {\n\t\t\t\t\t  const response = await fetch('https://app.img2ipfs.org/api/v0/add', {\n\t\t\t\t\t\t  method: 'POST',\n\t\t\t\t\t\t  body: formData,\n\t\t\t\t\t\t  headers: {\n\t\t\t\t\t\t\t  'Accept': 'application/json',\n\t\t\t\t\t\t  },\n\t\t\t\t\t  });\n\n\t\t\t\t\t  if (!response.ok) {\n\t\t\t\t\t\t  throw new Error('Upload failed');\n\t\t\t\t\t  }\n\n\t\t\t\t\t  const result = await response.json();\n\t\t\t\t\t  uploadStatus.textContent = `File uploaded successfully! IPFS Hash: ${result.Hash}`;\n\t\t\t\t\t  \n\t\t\t\t\t  const savedFiles = JSON.parse(localStorage.getItem('uploadedFiles')) || [];\n\t\t\t\t\t  savedFiles.push(result);\n\t\t\t\t\t  localStorage.setItem('uploadedFiles', JSON.stringify(savedFiles));\n\t\t\t\t\t  \n\t\t\t\t\t  loadFileList();\n\t\t\t\t\t  \n\t\t\t\t  } catch (error) {\n\t\t\t\t\t  console.error('Error:', error);\n\t\t\t\t\t  uploadStatus.textContent = 'Upload failed. Please try again.';\n\t\t\t\t  }\n\t\t\t  }\n\t\t  </script>\n\t  </body>\n\t  </html>\n\t";
  const _0x23525b = {
    "content-type": "text/html;charset=UTF-8"
  };
  const _0x6b12a4 = {
    headers: _0x23525b
  };
  return new Response(_0x26e182, _0x6b12a4);
}
async function ProtocolOverWSHandler(_0x473f5b) {
  const _0xeb6d92 = new WebSocketPair();
  const [_0x3dab03, _0x3fbaa8] = Object.values(_0xeb6d92);
  _0x3fbaa8.accept();
  let _0x5b1245 = '';
  let _0x3c3083 = '';
  const _0x2901fc = (_0x5472b0, _0x4c14c7) => {
    console.log("[" + _0x5b1245 + ":" + _0x3c3083 + "] " + _0x5472b0, _0x4c14c7 || '');
  };
  const _0x1a8f6b = _0x473f5b.headers.get("sec-websocket-protocol") || '';
  const _0x7db0b9 = MakeReadableWebSocketStream(_0x3fbaa8, _0x1a8f6b, _0x2901fc);
  const _0x3731b2 = {
    value: null
  };
  let _0x2c7c5d = false;
  _0x7db0b9.pipeTo(new WritableStream({
    async "write"(_0x15655e, _0x366cee) {
      if (_0x2c7c5d) {
        return await handleDNSQuery(_0x15655e, _0x3fbaa8, null, _0x2901fc);
      }
      const _0x131268 = null.writable.getWriter();
      await _0x131268.write(_0x15655e);
      _0x131268.releaseLock();
      return;
      const {
        hasError: _0x3e4e7c,
        message: _0x16b089,
        addressType: _0x13ad2e,
        portRemote = 0x1bb,
        addressRemote = '',
        rawDataIndex: _0x7835c9,
        ProtocolVersion = new Uint8Array([0x0, 0x0]),
        isUDP: _0x4dc87e
      } = ProcessProtocolHeader(_0x15655e, userID);
      _0x5b1245 = addressRemote;
      _0x3c3083 = portRemote + "--" + Math.random() + " " + (_0x4dc87e ? "udp " : "tcp ") + " ";
      if (_0x3e4e7c) {
        throw new Error(_0x16b089);
      }
      if (_0x4dc87e) {
        if (portRemote === 0x35) {
          _0x2c7c5d = true;
        } else {
          throw new Error("UDP proxy is only enabled for DNS (port 53)");
        }
        return;
      }
      const _0xe55705 = new Uint8Array([ProtocolVersion[0x0], 0x0]);
      const _0x439997 = _0x15655e.slice(_0x7835c9);
      if (_0x2c7c5d) {
        return handleDNSQuery(_0x439997, _0x3fbaa8, _0xe55705, _0x2901fc);
      }
      HandleTCPOutBound(_0x3731b2, _0x13ad2e, addressRemote, portRemote, _0x439997, _0x3fbaa8, _0xe55705, _0x2901fc);
    },
    "close"() {
      _0x2901fc("readableWebSocketStream is close");
    },
    "abort"(_0x5eb849) {
      _0x2901fc("readableWebSocketStream is abort", JSON.stringify(_0x5eb849));
    }
  }))["catch"](_0x45b721 => {
    _0x2901fc("readableWebSocketStream pipeTo error", _0x45b721);
  });
  const _0x3d6cb5 = {
    status: 0x65,
    webSocket: _0x3dab03
  };
  return new Response(null, _0x3d6cb5);
}
async function HandleTCPOutBound(_0x225e1c, _0x4058fb, _0x2887b6, _0x198cb8, _0x29d2ca, _0x32a170, _0x1b8339, _0x21807b) {
  async function _0x4abd91(_0x2a9555, _0x11c517, _0x11fbdd = false) {
    let _0x10ce29;
    if (socks5Relay) {
      _0x10ce29 = await socks5Connect(_0x4058fb, _0x2a9555, _0x11c517, _0x21807b);
    } else {
      _0x10ce29 = _0x11fbdd ? await socks5Connect(_0x4058fb, _0x2a9555, _0x11c517, _0x21807b) : connect({
        "hostname": _0x2a9555,
        "port": _0x11c517
      });
    }
    _0x225e1c.value = _0x10ce29;
    _0x21807b("connected to " + _0x2a9555 + ":" + _0x11c517);
    const _0x32d12b = _0x10ce29.writable.getWriter();
    await _0x32d12b.write(_0x29d2ca);
    _0x32d12b.releaseLock();
    return _0x10ce29;
  }
  async function _0x3e4bf3() {
    if (enableSocks) {
      _0x455385 = await _0x4abd91(_0x2887b6, _0x198cb8, true);
    } else {
      _0x455385 = await _0x4abd91(proxyIP || _0x2887b6, proxyPort || _0x198cb8, false);
    }
    _0x455385.closed["catch"](_0xbb495f => {
      console.log("retry tcpSocket closed error", _0xbb495f);
    })["finally"](() => {
      safeCloseWebSocket(_0x32a170);
    });
    RemoteSocketToWS(_0x455385, _0x32a170, _0x1b8339, null, _0x21807b);
  }
  let _0x455385 = await _0x4abd91(_0x2887b6, _0x198cb8);
  RemoteSocketToWS(_0x455385, _0x32a170, _0x1b8339, _0x3e4bf3, _0x21807b);
}
function MakeReadableWebSocketStream(_0x5473a3, _0x20d26c, _0x3bd8ed) {
  let _0x4e4d42 = false;
  const _0x21fe06 = new ReadableStream({
    "start"(_0x472e97) {
      _0x5473a3.addEventListener("message", _0x12a6a2 => {
        const _0x422c4f = _0x12a6a2.data;
        _0x472e97.enqueue(_0x422c4f);
      });
      _0x5473a3.addEventListener("close", () => {
        safeCloseWebSocket(_0x5473a3);
        _0x472e97.close();
      });
      _0x5473a3.addEventListener("error", _0x40b6c7 => {
        _0x3bd8ed("webSocketServer has error");
        _0x472e97.error(_0x40b6c7);
      });
      const {
        earlyData: _0x144aa0,
        error: _0x550f48
      } = base64ToArrayBuffer(_0x20d26c);
      if (_0x550f48) {
        _0x472e97.error(_0x550f48);
      } else {
        if (_0x144aa0) {
          _0x472e97.enqueue(_0x144aa0);
        }
      }
    },
    "pull"(_0x3d6a8e) {},
    "cancel"(_0x35ede7) {
      _0x3bd8ed("ReadableStream was canceled, due to " + _0x35ede7);
      _0x4e4d42 = true;
      safeCloseWebSocket(_0x5473a3);
    }
  });
  return _0x21fe06;
}
function ProcessProtocolHeader(_0x44f072, _0x285089) {
  if (_0x44f072.byteLength < 0x18) {
    const _0x4be5a2 = {
      hasError: true,
      message: "invalid data"
    };
    return _0x4be5a2;
  }
  const _0x563888 = new DataView(_0x44f072);
  const _0x4611ef = _0x563888.getUint8(0x0);
  const _0xc9d18a = stringify(new Uint8Array(_0x44f072.slice(0x1, 0x11)));
  const _0x47137a = _0x285089.includes(",") ? _0x285089.split(",") : [_0x285089];
  const _0x5b46d0 = _0x47137a.some(_0x194509 => _0xc9d18a === _0x194509.trim()) || _0x47137a.length === 0x1 && _0xc9d18a === _0x47137a[0x0].trim();
  console.log("userID: " + _0xc9d18a);
  if (!_0x5b46d0) {
    const _0x2a42f3 = {
      hasError: true,
      message: "invalid user"
    };
    return _0x2a42f3;
  }
  const _0x2cffa8 = _0x563888.getUint8(0x11);
  const _0x18941e = _0x563888.getUint8(0x12 + _0x2cffa8);
  if (_0x18941e !== 0x1 && _0x18941e !== 0x2) {
    const _0x240554 = {
      hasError: true,
      message: "command " + _0x18941e + " is not supported, command 01-tcp,02-udp,03-mux"
    };
    return _0x240554;
  }
  const _0x21aff2 = 0x12 + _0x2cffa8 + 0x1;
  const _0xb83711 = _0x563888.getUint16(_0x21aff2);
  const _0x26c1bf = _0x563888.getUint8(_0x21aff2 + 0x2);
  let _0x412100;
  let _0x7f36a6;
  let _0x2a698c;
  switch (_0x26c1bf) {
    case 0x1:
      _0x7f36a6 = 0x4;
      _0x2a698c = _0x21aff2 + 0x3;
      _0x412100 = new Uint8Array(_0x44f072.slice(_0x2a698c, _0x2a698c + _0x7f36a6)).join(".");
      break;
    case 0x2:
      _0x7f36a6 = _0x563888.getUint8(_0x21aff2 + 0x3);
      _0x2a698c = _0x21aff2 + 0x4;
      _0x412100 = new TextDecoder().decode(_0x44f072.slice(_0x2a698c, _0x2a698c + _0x7f36a6));
      break;
    case 0x3:
      _0x7f36a6 = 0x10;
      _0x2a698c = _0x21aff2 + 0x3;
      const _0x2724d2 = {
        length: 0x8
      };
      _0x412100 = Array.from(_0x2724d2, (_0x2c41be, _0x162da9) => _0x563888.getUint16(_0x2a698c + _0x162da9 * 0x2).toString(0x10)).join(":");
      break;
    default:
      const _0x46e826 = {
        hasError: true,
        message: "invalid addressType: " + _0x26c1bf
      };
      return _0x46e826;
  }
  if (!_0x412100) {
    const _0x21df9f = {
      hasError: true,
      message: "addressValue is empty, addressType is " + _0x26c1bf
    };
    return _0x21df9f;
  }
  return {
    "hasError": false,
    "addressRemote": _0x412100,
    "addressType": _0x26c1bf,
    "portRemote": _0xb83711,
    "rawDataIndex": _0x2a698c + _0x7f36a6,
    "protocolVersion": new Uint8Array([_0x4611ef]),
    "isUDP": _0x18941e === 0x2
  };
}
async function RemoteSocketToWS(_0x1e49ba, _0x92b30b, _0x26e20d, _0x4bfc51, _0x361fb5) {
  let _0x26eb43 = false;
  try {
    await _0x1e49ba.readable.pipeTo(new WritableStream({
      async "write"(_0x5710c4) {
        if (_0x92b30b.readyState !== 0x1) {
          throw new Error("WebSocket is not open");
        }
        _0x26eb43 = true;
        if (_0x26e20d) {
          _0x92b30b.send(await new Blob([_0x26e20d, _0x5710c4]).arrayBuffer());
          _0x26e20d = null;
        } else {
          _0x92b30b.send(_0x5710c4);
        }
      },
      "close"() {
        _0x361fb5("Remote connection readable closed. Had incoming data: " + _0x26eb43);
      },
      "abort"(_0x505bb1) {
        console.error("Remote connection readable aborted:", _0x505bb1);
      }
    }));
  } catch (_0x4b7b51) {
    console.error("RemoteSocketToWS error:", _0x4b7b51.stack || _0x4b7b51);
    safeCloseWebSocket(_0x92b30b);
  }
  if (!_0x26eb43 && _0x4bfc51) {
    _0x361fb5("No incoming data, retrying");
    await _0x4bfc51();
  }
}
function base64ToArrayBuffer(_0x94d6a) {
  if (!_0x94d6a) {
    const _0x3a144a = {
      earlyData: null,
      error: null
    };
    return _0x3a144a;
  }
  try {
    _0x94d6a = _0x94d6a.replace(/-/g, "+").replace(/_/g, "/");
    const _0xff9867 = atob(_0x94d6a);
    const _0x80b581 = new ArrayBuffer(_0xff9867.length);
    const _0x406522 = new Uint8Array(_0x80b581);
    for (let _0x378b90 = 0x0; _0x378b90 < _0xff9867.length; _0x378b90++) {
      _0x406522[_0x378b90] = _0xff9867.charCodeAt(_0x378b90);
    }
    const _0x323432 = {
      earlyData: _0x80b581,
      error: null
    };
    return _0x323432;
  } catch (_0x1f6f4c) {
    const _0x5068d8 = {
      earlyData: null,
      error: _0x1f6f4c
    };
    return _0x5068d8;
  }
}
function isValidUUID(_0x82efaf) {
  const _0x1953db = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return _0x1953db.test(_0x82efaf);
}
function safeCloseWebSocket(_0x3132d6) {
  try {
    if (_0x3132d6.readyState === 0x1 || _0x3132d6.readyState === 0x2) {
      _0x3132d6.close();
    }
  } catch (_0x539830) {
    console.error("safeCloseWebSocket error:", _0x539830);
  }
}
const a0_0x345f1f = {
  length: 0x100
};
const byteToHex = Array.from(a0_0x345f1f, (_0x140155, _0x390eb0) => (_0x390eb0 + 0x100).toString(0x10).slice(0x1));
function unsafeStringify(_0x2195c6, _0x36169d = 0x0) {
  return [byteToHex[_0x2195c6[_0x36169d]], byteToHex[_0x2195c6[_0x36169d + 0x1]], byteToHex[_0x2195c6[_0x36169d + 0x2]], byteToHex[_0x2195c6[_0x36169d + 0x3]], "-", byteToHex[_0x2195c6[_0x36169d + 0x4]], byteToHex[_0x2195c6[_0x36169d + 0x5]], "-", byteToHex[_0x2195c6[_0x36169d + 0x6]], byteToHex[_0x2195c6[_0x36169d + 0x7]], "-", byteToHex[_0x2195c6[_0x36169d + 0x8]], byteToHex[_0x2195c6[_0x36169d + 0x9]], "-", byteToHex[_0x2195c6[_0x36169d + 0xa]], byteToHex[_0x2195c6[_0x36169d + 0xb]], byteToHex[_0x2195c6[_0x36169d + 0xc]], byteToHex[_0x2195c6[_0x36169d + 0xd]], byteToHex[_0x2195c6[_0x36169d + 0xe]], byteToHex[_0x2195c6[_0x36169d + 0xf]]].join('').toLowerCase();
}
function stringify(_0x34f386, _0x4a9de8 = 0x0) {
  const _0x4c110f = unsafeStringify(_0x34f386, _0x4a9de8);
  if (!isValidUUID(_0x4c110f)) {
    throw new TypeError("Stringified UUID is invalid");
  }
  return _0x4c110f;
}
async function handleDNSQuery(_0x3bc42a, _0x54b181, _0xade1ea, _0x475204) {
  try {
    let _0x3cf198 = _0xade1ea;
    const _0x530671 = {
      hostname: "8.8.4.4",
      port: 0x35
    };
    const _0x2da300 = connect(_0x530671);
    _0x475204("connected to 8.8.4.4:53");
    const _0xabeddd = _0x2da300.writable.getWriter();
    await _0xabeddd.write(_0x3bc42a);
    _0xabeddd.releaseLock();
    await _0x2da300.readable.pipeTo(new WritableStream({
      async "write"(_0x3ed9bf) {
        if (_0x54b181.readyState === 0x1) {
          if (_0x3cf198) {
            _0x54b181.send(await new Blob([_0x3cf198, _0x3ed9bf]).arrayBuffer());
            _0x3cf198 = null;
          } else {
            _0x54b181.send(_0x3ed9bf);
          }
        }
      },
      "close"() {
        _0x475204("dns server(8.8.4.4) tcp is close");
      },
      "abort"(_0x43d6ac) {
        console.error("dns server(8.8.4.4) tcp is abort", _0x43d6ac);
      }
    }));
  } catch (_0x49f64d) {
    console.error("handleDNSQuery have exception, error: " + _0x49f64d.message);
  }
}
async function socks5Connect(_0x4a6216, _0x2a71c2, _0x327ea2, _0x3e2385) {
  const {
    username: _0x1dd0b8,
    password: _0x2496d1,
    hostname: _0x5029fb,
    port: _0x121ff8
  } = parsedSocks5Address;
  const _0x13a955 = {
    hostname: _0x5029fb,
    port: _0x121ff8
  };
  const _0x596959 = connect(_0x13a955);
  const _0x266849 = new Uint8Array([0x5, 0x2, 0x0, 0x2]);
  const _0xb5bd0d = _0x596959.writable.getWriter();
  await _0xb5bd0d.write(_0x266849);
  _0x3e2385("sent socks greeting");
  const _0x2487fc = _0x596959.readable.getReader();
  const _0x4e5c83 = new TextEncoder();
  let _0x279bdc = (await _0x2487fc.read()).value;
  if (_0x279bdc[0x0] !== 0x5) {
    _0x3e2385("socks server version error: " + _0x279bdc[0x0] + " expected: 5");
    return;
  }
  if (_0x279bdc[0x1] === 0xff) {
    _0x3e2385("no acceptable methods");
    return;
  }
  if (_0x279bdc[0x1] === 0x2) {
    _0x3e2385("socks server needs auth");
    if (!_0x1dd0b8 || !_0x2496d1) {
      _0x3e2385("please provide username/password");
      return;
    }
    const _0x15dfe2 = new Uint8Array([0x1, _0x1dd0b8.length, ..._0x4e5c83.encode(_0x1dd0b8), _0x2496d1.length, ..._0x4e5c83.encode(_0x2496d1)]);
    await _0xb5bd0d.write(_0x15dfe2);
    _0x279bdc = (await _0x2487fc.read()).value;
    if (_0x279bdc[0x0] !== 0x1 || _0x279bdc[0x1] !== 0x0) {
      _0x3e2385("fail to auth socks server");
      return;
    }
  }
  let _0x5094cb;
  switch (_0x4a6216) {
    case 0x1:
      _0x5094cb = new Uint8Array([0x1, ..._0x2a71c2.split(".").map(Number)]);
      break;
    case 0x2:
      _0x5094cb = new Uint8Array([0x3, _0x2a71c2.length, ..._0x4e5c83.encode(_0x2a71c2)]);
      break;
    case 0x3:
      _0x5094cb = new Uint8Array([0x4, ..._0x2a71c2.split(":").flatMap(_0x5021b7 => [parseInt(_0x5021b7.slice(0x0, 0x2), 0x10), parseInt(_0x5021b7.slice(0x2), 0x10)])]);
      break;
    default:
      _0x3e2385("invild  addressType is " + _0x4a6216);
      return;
  }
  const _0x56ac08 = new Uint8Array([0x5, 0x1, 0x0, ..._0x5094cb, _0x327ea2 >> 0x8, _0x327ea2 & 0xff]);
  await _0xb5bd0d.write(_0x56ac08);
  _0x3e2385("sent socks request");
  _0x279bdc = (await _0x2487fc.read()).value;
  if (_0x279bdc[0x1] === 0x0) {
    _0x3e2385("socks connection opened");
  } else {
    _0x3e2385("fail to open socks connection");
    return;
  }
  _0xb5bd0d.releaseLock();
  _0x2487fc.releaseLock();
  return _0x596959;
}
function socks5AddressParser(_0x35d498) {
  let [_0x47b0ac, _0x497fdd] = _0x35d498.split("@").reverse();
  let _0x235891;
  let _0x33934f;
  let _0x5e4dd9;
  let _0xbc0905;
  if (_0x497fdd) {
    const _0x59c3f8 = _0x497fdd.split(":");
    if (_0x59c3f8.length !== 0x2) {
      throw new Error("Invalid SOCKS address format");
    }
    [_0x235891, _0x33934f] = _0x59c3f8;
  }
  const _0x4291a8 = _0x47b0ac.split(":");
  _0xbc0905 = Number(_0x4291a8.pop());
  if (isNaN(_0xbc0905)) {
    throw new Error("Invalid SOCKS address format");
  }
  _0x5e4dd9 = _0x4291a8.join(":");
  const _0x421b15 = /^\[.*\]$/;
  if (_0x5e4dd9.includes(":") && !_0x421b15.test(_0x5e4dd9)) {
    throw new Error("Invalid SOCKS address format");
  }
  const _0x1a7be6 = {
    username: _0x235891,
    password: _0x33934f,
    hostname: _0x5e4dd9,
    port: _0xbc0905
  };
  return _0x1a7be6;
}
function getConfig(_0x195764, _0x3d3dd5, _0x17c9a6) {
  const _0x54157b = "?encryption=none&security=tls&sni=" + _0x3d3dd5 + "&fp=randomized&type=ws&host=" + _0x3d3dd5 + "&path=%2F%3Fed%3D2048#" + _0x3d3dd5;
  const _0x2ca9b8 = _0x195764.split(",");
  const _0x355e9a = "https://" + _0x3d3dd5 + "/bestip/" + _0x2ca9b8[0x0];
  const _0x30b851 = "https://url.v1.mk/sub?target=clash&url=" + encodeURIComponent("https://" + _0x3d3dd5 + "/sub/" + _0x2ca9b8[0x0] + "?format=clash") + "&insert=false&emoji=true&list=false&tfo=false&scv=true&fdn=false&sort=false&new_name=true";
  const _0x302b94 = "\n  <head>\n    <title>EDtunnel: Configuration</title>\n    <meta name='viewport' content='width=device-width, initial-scale=1'>\n    <meta property='og:site_name' content='EDtunnel: Protocol Configuration' />\n    <meta property='og:type' content='website' />\n    <meta property='og:title' content='EDtunnel - Protocol Configuration and Subscribe Output' />\n    <meta property='og:description' content='Use Cloudflare Pages and Worker serverless to implement protocol' />\n    <meta property='og:url' content='https://" + _0x3d3dd5 + "/' />\n    <meta property='og:image' content='https://cdn.jsdelivr.net/gh/6Kmfi6HP/EDtunnel@refs/heads/main/image/logo.png' />\n    <meta name='twitter:card' content='summary_large_image' />\n    <meta name='twitter:title' content='EDtunnel - Protocol Configuration and Subscribe Output' />\n    <meta name='twitter:description' content='Use Cloudflare Pages and Worker serverless to implement protocol' />\n    <meta name='twitter:url' content='https://" + _0x3d3dd5 + "/' />\n    <meta name='twitter:image' content='https://cdn.jsdelivr.net/gh/6Kmfi6HP/EDtunnel@refs/heads/main/image/logo.png' />\n    <meta property='og:image:width' content='1500' />\n    <meta property='og:image:height' content='1500' />\n\n    <style>\n      body {\n        font-family: 'Roboto', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;\n        background-color: #000000;\n        color: #ffffff;\n        line-height: 1.6;\n        padding: 20px;\n        max-width: 1200px;\n        margin: 0 auto;\n      }\n      .container {\n        background-color: #111111;\n        border-radius: 8px;\n        box-shadow: 0 4px 6px rgba(255, 255, 255, 0.1);\n        padding: 20px;\n        margin-bottom: 20px;\n      }\n      h1, h2 {\n        color: #ffffff;\n      }\n      .config-item {\n        background-color: #222222;\n        border: 1px solid #333333;\n        border-radius: 4px;\n        padding: 15px;\n        margin-bottom: 15px;\n      }\n      .config-item h3 {\n        margin-top: 0;\n        color: #ffffff;\n      }\n      .btn {\n        background-color: #ffffff;\n        color: #000000;\n        border: none;\n        padding: 10px 15px;\n        border-radius: 4px;\n        cursor: pointer;\n        transition: background-color 0.3s, color 0.3s;\n      }\n      .btn:hover {\n        background-color: #cccccc;\n      }\n      .btn-group {\n        margin-top: 10px;\n      }\n      .btn-group .btn {\n        margin-right: 10px;\n      }\n      pre {\n        background-color: #333333;\n        border: 1px solid #444444;\n        border-radius: 4px;\n        padding: 10px;\n        white-space: pre-wrap;\n        word-wrap: break-word;\n        color: #00ff00;\n      }\n      .logo {\n        float: left;\n        margin-right: 20px;\n        margin-bottom: 20px;\n\t\tmax-width: 30%;\n      }\n      @media (max-width: 768px) {\n        .logo {\n          float: none;\n          display: block;\n          margin: 0 auto 20px;\n          max-width: 90%; /* Adjust the max-width to fit within the container */\n        }\n        .btn-group {\n          display: flex;\n          flex-direction: column;\n          align-items: center;\n        }\n        .btn-group .btn {\n          margin-bottom: 10px;\n          width: 100%;\n          text-align: center;\n        }\n      }\n      .code-container {\n        position: relative;\n        margin-bottom: 15px;\n      }\n      .code-container pre {\n        margin: 0;\n        padding-right: 100px; /* Make space for the button */\n      }\n      .copy-btn {\n        position: absolute;\n        top: 5px;\n        right: 5px;\n        padding: 5px 10px;\n        font-size: 0.8em;\n      }\n      .subscription-info {\n        margin-top: 20px;\n        background-color: #222222;\n        border-radius: 4px;\n        padding: 15px;\n      }\n      .subscription-info h3 {\n        color: #ffffff;\n        margin-top: 0;\n      }\n      .subscription-info ul {\n        padding-left: 20px;\n      }\n      .subscription-info li {\n        margin-bottom: 10px;\n      }\n    </style>\n    <link rel=\"stylesheet\" href=\"https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.3/css/all.min.css\">\n  </head>\n  ";
  const _0xeaf9c9 = "\n    <div class=\"container\">\n      <h1>EDtunnel: Protocol Configuration</h1>\n      <img src=\"https://cdn.jsdelivr.net/gh/6Kmfi6HP/EDtunnel@refs/heads/main/image/logo.png\" alt=\"EDtunnel Logo\" class=\"logo\">\n      <p>Welcome! This function generates configuration for the vless protocol. If you found this useful, please check our GitHub project:</p>\n      <p><a href=\"https://github.com/6Kmfi6HP/EDtunnel\" target=\"_blank\" style=\"color: #00ff00;\">EDtunnel - https://github.com/6Kmfi6HP/EDtunnel</a></p>\n      <div style=\"clear: both;\"></div>\n      <div class=\"btn-group\">\n        <a href=\"//" + _0x3d3dd5 + "/sub/" + _0x2ca9b8[0x0] + "\" class=\"btn\" target=\"_blank\"><i class=\"fas fa-link\"></i> VLESS Subscription</a>\n        <a href=\"clash://install-config?url=" + encodeURIComponent("https://" + _0x3d3dd5 + "/sub/" + _0x2ca9b8[0x0] + "?format=clash") + "\" class=\"btn\" target=\"_blank\"><i class=\"fas fa-bolt\"></i> Clash Subscription</a>\n        <a href=\"" + _0x30b851 + "\" class=\"btn\" target=\"_blank\"><i class=\"fas fa-bolt\"></i> Clash Link</a>\n        <a href=\"" + _0x355e9a + "\" class=\"btn\" target=\"_blank\"><i class=\"fas fa-star\"></i> Best IP Subscription</a>\n      </div>\n      <div class=\"subscription-info\">\n        <h3>Options Explained:</h3>\n        <ul>\n          <li><strong>VLESS Subscription:</strong> Direct link for VLESS protocol configuration. Suitable for clients supporting VLESS.</li>\n          <li><strong>Clash Subscription:</strong> Opens the Clash client with pre-configured settings. Best for Clash users on mobile devices.</li>\n          <li><strong>Clash Link:</strong> A web link to convert the VLESS config to Clash format. Useful for manual import or troubleshooting.</li>\n          <li><strong>Best IP Subscription:</strong> Provides a curated list of optimal server IPs for many <b>different countries</b>.</li>\n        </ul>\n        <p>Choose the option that best fits your client and needs. For most users, the VLESS or Clash Subscription will be the easiest to use.</p>\n      </div>\n    </div>\n  ";
  const _0x236c08 = _0x2ca9b8.map(_0x170413 => {
    const _0x2f0bb4 = atob("dmxlc3M=") + "://" + _0x170413 + atob("QA==") + _0x3d3dd5 + ":443" + _0x54157b;
    const _0x4d2210 = atob("dmxlc3M=") + "://" + _0x170413 + atob("QA==") + _0x17c9a6[0x0].split(":")[0x0] + ":" + proxyPort + _0x54157b;
    return "\n      <div class=\"container config-item\">\n        <h2>UUID: " + _0x170413 + "</h2>\n        <h3>Default IP Configuration</h3>\n        <div class=\"code-container\">\n          <pre><code>" + _0x2f0bb4 + "</code></pre>\n          <button class=\"btn copy-btn\" onclick='copyToClipboard(\"" + _0x2f0bb4 + "\")'><i class=\"fas fa-copy\"></i> Copy</button>\n        </div>\n        \n        <h3>Best IP Configuration</h3>\n        <div class=\"input-group mb-3\">\n          <select class=\"form-select\" id=\"proxySelect\" onchange=\"updateProxyConfig()\">\n            " + (typeof _0x17c9a6 === "string" ? "<option value=\"" + _0x17c9a6 + "\">" + _0x17c9a6 + "</option>" : Array.from(_0x17c9a6).map(_0x2f8890 => "<option value=\"" + _0x2f8890 + "\">" + _0x2f8890 + "</option>").join('')) + "\n          </select>\n        </div>\n\t\t<br>\n        <div class=\"code-container\">\n          <pre><code id=\"proxyConfig\">" + _0x4d2210 + "</code></pre>\n          <button class=\"btn copy-btn\" onclick='copyToClipboard(document.getElementById(\"proxyConfig\").textContent)'><i class=\"fas fa-copy\"></i> Copy</button>\n        </div>\n      </div>\n    ";
  }).join('');
  return "\n  <html>\n  " + _0x302b94 + "\n  <body>\n    " + _0xeaf9c9 + "\n    " + _0x236c08 + "\n    <script>\n      const userIDArray = " + JSON.stringify(_0x2ca9b8) + ";\n      const pt = \"" + "dmxlc3M=" + "\";\n      const at = \"" + "QA==" + "\";\n      const commonUrlPart = \"?encryption=none&security=tls&sni=" + _0x3d3dd5 + "&fp=randomized&type=ws&host=" + _0x3d3dd5 + "&path=%2F%3Fed%3D2048#" + _0x3d3dd5 + "\";\n\n      function copyToClipboard(text) {\n        navigator.clipboard.writeText(text)\n          .then(() => {\n            alert(\"Copied to clipboard\");\n          })\n          .catch((err) => {\n            console.error(\"Failed to copy to clipboard:\", err);\n          });\n      }\n\n      function updateProxyConfig() {\n        const select = document.getElementById('proxySelect');\n        const proxyValue = select.value;\n        const [host, port] = proxyValue.split(':');\n        const protocolSec = atob(pt) + '://' + userIDArray[0] + atob(at) + host + \":\" + port + commonUrlPart;\n        document.getElementById(\"proxyConfig\").textContent = protocolSec;\n      }\n    </script>\n  </body>\n  </html>";
}
const HttpPort = new Set([0x50, 0x1f90, 0x22b0, 0x804, 0x826, 0x82f, 0x822]);
const HttpsPort = new Set([0x1bb, 0x20fb, 0x805, 0x830, 0x827, 0x823]);
function GenSub(_0x4e55bb, _0x2c0a61, _0x48d909) {
  const _0x1792fd = new Set([_0x2c0a61, "icook.hk", "japan.com", "malaysia.com", "russia.com", "singapore.com", "www.visa.com", "www.csgo.com", "www.shopify.com", "www.whatismyip.com", "www.ipget.net", "speed.marisalnc.com", "freeyx.cloudflare88.eu.org", "cloudflare.182682.xyz", "cfip.cfcdn.vip", proxyIPs, "cf.0sm.com", "cloudflare-ip.mofashi.ltd", "cf.090227.xyz", "cname.xirancdn.us", "cf.zhetengsha.eu.org", "cloudflare.9jy.cc", "cf.zerone-cdn.pp.ua", "cfip.1323123.xyz", "cdn.tzpro.xyz", "cf.877771.xyz", "cnamefuckxxs.yuchen.icu", "cfip.xxxxxxxx.tk"]);
  const _0x1ae102 = _0x4e55bb.includes(",") ? _0x4e55bb.split(",") : [_0x4e55bb];
  const _0x37c74d = Array.isArray(_0x48d909) ? _0x48d909 : _0x48d909 ? _0x48d909.includes(",") ? _0x48d909.split(",") : [_0x48d909] : proxyIPs;
  const _0x5af9e0 = "?encryption=none&security=none&fp=random&type=ws&host=" + _0x2c0a61 + "&path=" + encodeURIComponent("/" + Math.random().toString(0x24).substring(0x2, 0xf) + "?ed=2048") + "#";
  const _0x437903 = "?encryption=none&security=tls&sni=" + _0x2c0a61 + "&fp=random&type=ws&host=" + _0x2c0a61 + "&path=%2F%3Fed%3D2048#";
  const _0xf691df = _0x1ae102.flatMap(_0x9ff978 => {
    let _0x324fbf = [];
    if (!_0x2c0a61.includes("pages.dev")) {
      _0x1792fd.forEach(_0x5d0319 => {
        Array.from(HttpPort).forEach(_0x566d87 => {
          const _0x3d8326 = _0x2c0a61.split(".")[0x0] + "-" + _0x5d0319 + "-HTTP-" + _0x566d87;
          const _0x41c3a0 = atob("dmxlc3M=") + "://" + _0x9ff978 + atob("QA==") + _0x5d0319 + ":" + _0x566d87 + _0x5af9e0 + _0x3d8326;
          _0x324fbf.push(_0x41c3a0);
        });
      });
    }
    _0x1792fd.forEach(_0x162448 => {
      Array.from(HttpsPort).forEach(_0x3011be => {
        const _0x599ba5 = _0x2c0a61.split(".")[0x0] + "-" + _0x162448 + "-HTTPS-" + _0x3011be;
        const _0x212a43 = atob("dmxlc3M=") + "://" + _0x9ff978 + atob("QA==") + _0x162448 + ":" + _0x3011be + _0x437903 + _0x599ba5;
        _0x324fbf.push(_0x212a43);
      });
    });
    _0x37c74d.forEach(_0x37061c => {
      const [_0x2db6de, _0x4700fc = "443"] = _0x37061c.split(":");
      const _0x55e97f = _0x2c0a61.split(".")[0x0] + "-" + _0x2db6de + "-HTTPS-" + _0x4700fc;
      const _0x591cee = atob("dmxlc3M=") + "://" + _0x9ff978 + atob("QA==") + _0x2db6de + ":" + _0x4700fc + _0x437903 + _0x55e97f + "-" + atob("RUR0dW5uZWw=");
      _0x324fbf.push(_0x591cee);
    });
    return _0x324fbf;
  });
  return btoa(_0xf691df.join("\n"));
}
function handleProxyConfig(_0x56b3c2) {
  if (_0x56b3c2) {
    const _0x369ef3 = _0x56b3c2.split(",").map(_0x5b1495 => _0x5b1495.trim());
    const _0x326ec2 = selectRandomAddress(_0x369ef3);
    const [_0x294ec2, _0x4f596c = "443"] = _0x326ec2.split(":");
    const _0x419d9a = {
      ip: _0x294ec2,
      port: _0x4f596c
    };
    return _0x419d9a;
  } else {
    const _0x4153b5 = proxyIP.includes(":") ? proxyIP.split(":")[0x1] : "443";
    const _0x32791a = proxyIP.split(":")[0x0];
    const _0x504697 = {
      ip: _0x32791a,
      port: _0x4153b5
    };
    return _0x504697;
  }
}
function selectRandomAddress(_0x1042be) {
  const _0xfd4b1d = typeof _0x1042be === "string" ? _0x1042be.split(",").map(_0x4cf7d8 => _0x4cf7d8.trim()) : _0x1042be;
  return _0xfd4b1d[Math.floor(Math.random() * _0xfd4b1d.length)];
}
