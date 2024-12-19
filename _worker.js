import { connect } from "cloudflare:sockets";
let a0_0xaa7123 = "f5d09650-b154-4192-97c5-633ea7717364";
const a0_0x4a6d13 = ["104.248.145.216"];
let a0_0x1b8029 = a0_0x4a6d13[Math.floor(Math.random() * a0_0x4a6d13.length)];
let a0_0x540d61 = a0_0x1b8029.includes(":") ? a0_0x1b8029.split(":")[0x1] : "443";
let a0_0x20f603 = '';
let a0_0x270c07 = false;
if (!a0_0x15259b(a0_0xaa7123)) {
  throw new Error("uuid is not valid");
}
let a0_0x11b54a = {};
let a0_0x51ca75 = false;
export default {
  async "fetch"(_0x3213c6, _0x1aeb0c, _0x1c7092) {
    try {
      const {
        UUID: _0x3de50e,
        PROXYIP: _0x45c215,
        SOCKS5: _0x1af8df,
        SOCKS5_RELAY: _0x3f7c7f
      } = _0x1aeb0c;
      a0_0xaa7123 = _0x3de50e || a0_0xaa7123;
      a0_0x20f603 = _0x1af8df || a0_0x20f603;
      a0_0x270c07 = _0x3f7c7f || a0_0x270c07;
      const _0x55b94d = a0_0x5f17a0(_0x45c215);
      a0_0x1b8029 = _0x55b94d.ip;
      a0_0x540d61 = _0x55b94d.port;
      if (a0_0x20f603) {
        try {
          const _0x308b8a = a0_0x5c6906(a0_0x20f603);
          a0_0x11b54a = a0_0x8a68c6(_0x308b8a);
          a0_0x51ca75 = true;
        } catch (_0x40114b) {
          console.log(_0x40114b.toString());
          a0_0x51ca75 = false;
        }
      }
      const _0x58055e = a0_0xaa7123.includes(",") ? a0_0xaa7123.split(",").map(_0x4ba7e1 => _0x4ba7e1.trim()) : [a0_0xaa7123];
      const _0x637a3a = new URL(_0x3213c6.url);
      const _0x5c04be = _0x3213c6.headers.get("Host");
      const _0x1d6419 = _0x637a3a.pathname.substring(0x1);
      const _0x15aeae = _0x58055e.length === 0x1 ? _0x1d6419 === _0x58055e[0x0] || _0x1d6419 === "sub/" + _0x58055e[0x0] || _0x1d6419 === "bestip/" + _0x58055e[0x0] ? _0x58055e[0x0] : null : _0x58055e.find(_0xe92718 => {
        const _0x1df86b = [_0xe92718, "sub/" + _0xe92718, "bestip/" + _0xe92718];
        return _0x1df86b.some(_0x1a6cc3 => _0x1d6419.startsWith(_0x1a6cc3));
      });
      if (_0x3213c6.headers.get("Upgrade") !== "websocket") {
        if (_0x637a3a.pathname === "/cf") {
          const _0xd1d612 = {
            "Content-Type": "application/json;charset=utf-8"
          };
          const _0x9ccca5 = {
            "status": 0xc8,
            "headers": _0xd1d612
          };
          return new Response(JSON.stringify(_0x3213c6.cf, null, 0x4), _0x9ccca5);
        }
        if (_0x15aeae) {
          if (_0x637a3a.pathname === "/" + _0x15aeae || _0x637a3a.pathname === "/sub/" + _0x15aeae) {
            const _0x3714a3 = _0x637a3a.pathname.startsWith("/sub/");
            const _0x53f079 = _0x45c215 ? _0x45c215.split(",").map(_0x24a28f => _0x24a28f.trim()) : a0_0x1b8029;
            const _0x44b356 = _0x3714a3 ? a0_0x531d9d(_0x15aeae, _0x5c04be, _0x53f079) : a0_0x46c440(_0x15aeae, _0x5c04be, _0x53f079);
            const _0xc5412f = {
              "Content-Type": _0x3714a3 ? "text/plain;charset=utf-8" : "text/html; charset=utf-8"
            };
            const _0x35188c = {
              "status": 0xc8,
              "headers": _0xc5412f
            };
            return new Response(_0x44b356, _0x35188c);
          } else {
            if (_0x637a3a.pathname === "/bestip/" + _0x15aeae) {
              const _0x2c1e32 = {
                "headers": _0x3213c6.headers
              };
              return fetch("https://sub.xf.free.hr/auto?host=" + _0x5c04be + "&uuid=" + _0x15aeae + "&path=/", _0x2c1e32);
            }
          }
        }
        return a0_0x570da9(_0x637a3a, _0x3213c6);
      } else {
        return await a0_0x270434(_0x3213c6);
      }
    } catch (_0x491323) {
      return new Response(_0x491323.toString());
    }
  }
};
async function a0_0x570da9(_0x38e0d5, _0x572917) {
  const _0x122078 = _0x572917.headers.get("Host");
  const _0x4f66d8 = "\n\t  <!DOCTYPE html>\n\t  <html lang=\"en\">\n\t  <head>\n\t\t  <meta charset=\"UTF-8\">\n\t\t  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n\t\t  <title>" + _0x122078 + " - Cloud Drive</title>\n\t\t  <style>\n\t\t\t  body {\n\t\t\t\t  font-family: Arial, sans-serif;\n\t\t\t\t  line-height: 1.6;\n\t\t\t\t  margin: 0;\n\t\t\t\t  padding: 20px;\n\t\t\t\t  background-color: #f4f4f4;\n\t\t\t  }\n\t\t\t  .container {\n\t\t\t\t  max-width: 800px;\n\t\t\t\t  margin: auto;\n\t\t\t\t  background: white;\n\t\t\t\t  padding: 20px;\n\t\t\t\t  border-radius: 5px;\n\t\t\t\t  box-shadow: 0 0 10px rgba(0,0,0,0.1);\n\t\t\t  }\n\t\t\t  h1 {\n\t\t\t\t  color: #333;\n\t\t\t  }\n\t\t\t  .file-list {\n\t\t\t\t  list-style-type: none;\n\t\t\t\t  padding: 0;\n\t\t\t  }\n\t\t\t  .file-list li {\n\t\t\t\t  background: #f9f9f9;\n\t\t\t\t  margin-bottom: 10px;\n\t\t\t\t  padding: 10px;\n\t\t\t\t  border-radius: 3px;\n\t\t\t\t  display: flex;\n\t\t\t\t  align-items: center;\n\t\t\t  }\n\t\t\t  .file-list li:hover {\n\t\t\t\t  background: #f0f0f0;\n\t\t\t  }\n\t\t\t  .file-icon {\n\t\t\t\t  margin-right: 10px;\n\t\t\t\t  font-size: 1.2em;\n\t\t\t  }\n\t\t\t  .file-link {\n\t\t\t\t  text-decoration: none;\n\t\t\t\t  color: #0066cc;\n\t\t\t\t  flex-grow: 1;\n\t\t\t  }\n\t\t\t  .file-link:hover {\n\t\t\t\t  text-decoration: underline;\n\t\t\t  }\n\t\t\t  .upload-area {\n\t\t\t\t  margin-top: 20px;\n\t\t\t\t  padding: 40px;\n\t\t\t\t  background: #e9e9e9;\n\t\t\t\t  border: 2px dashed #aaa;\n\t\t\t\t  border-radius: 5px;\n\t\t\t\t  text-align: center;\n\t\t\t\t  cursor: pointer;\n\t\t\t\t  transition: all 0.3s ease;\n\t\t\t  }\n\t\t\t  .upload-area:hover, .upload-area.drag-over {\n\t\t\t\t  background: #d9d9d9;\n\t\t\t\t  border-color: #666;\n\t\t\t  }\n\t\t\t  .upload-area h2 {\n\t\t\t\t  margin-top: 0;\n\t\t\t\t  color: #333;\n\t\t\t  }\n\t\t\t  #fileInput {\n\t\t\t\t  display: none;\n\t\t\t  }\n\t\t\t  .upload-icon {\n\t\t\t\t  font-size: 48px;\n\t\t\t\t  color: #666;\n\t\t\t\t  margin-bottom: 10px;\n\t\t\t  }\n\t\t\t  .upload-text {\n\t\t\t\t  font-size: 18px;\n\t\t\t\t  color: #666;\n\t\t\t  }\n\t\t\t  .upload-status {\n\t\t\t\t  margin-top: 20px;\n\t\t\t\t  font-style: italic;\n\t\t\t\t  color: #666;\n\t\t\t  }\n\t\t\t  .file-actions {\n\t\t\t\t  display: flex;\n\t\t\t\t  gap: 10px;\n\t\t\t  }\n\t\t\t  .delete-btn {\n\t\t\t\t  color: #ff4444;\n\t\t\t\t  cursor: pointer;\n\t\t\t\t  background: none;\n\t\t\t\t  border: none;\n\t\t\t\t  padding: 5px;\n\t\t\t  }\n\t\t\t  .delete-btn:hover {\n\t\t\t\t  color: #ff0000;\n\t\t\t  }\n\t\t\t  .clear-all-btn {\n\t\t\t\t  background-color: #ff4444;\n\t\t\t\t  color: white;\n\t\t\t\t  border: none;\n\t\t\t\t  padding: 10px 15px;\n\t\t\t\t  border-radius: 4px;\n\t\t\t\t  cursor: pointer;\n\t\t\t\t  margin-bottom: 20px;\n\t\t\t  }\n\t\t\t  .clear-all-btn:hover {\n\t\t\t\t  background-color: #ff0000;\n\t\t\t  }\n\t\t  </style>\n\t  </head>\n\t  <body>\n\t\t  <div class=\"container\">\n\t\t\t  <h1>Cloud Drive</h1>\n\t\t\t  <p>Welcome to your personal cloud storage. Here are your uploaded files:</p>\n\t\t\t  <button id=\"clearAllBtn\" class=\"clear-all-btn\">Clear All Files</button>\n\t\t\t  <ul id=\"fileList\" class=\"file-list\">\n\t\t\t  </ul>\n\t\t\t  <div id=\"uploadArea\" class=\"upload-area\">\n\t\t\t\t  <div class=\"upload-icon\">📁</div>\n\t\t\t\t  <h2>Upload a File</h2>\n\t\t\t\t  <p class=\"upload-text\">Drag and drop a file here or click to select</p>\n\t\t\t\t  <input type=\"file\" id=\"fileInput\" hidden>\n\t\t\t  </div>\n\t\t\t  <div id=\"uploadStatus\" class=\"upload-status\"></div>\n\t\t  </div>\n\t\t  <script>\n\t\t\t  function loadFileList() {\n\t\t\t\t  const fileList = document.getElementById('fileList');\n\t\t\t\t  const savedFiles = JSON.parse(localStorage.getItem('uploadedFiles')) || [];\n\t\t\t\t  fileList.innerHTML = '';\n\t\t\t\t  savedFiles.forEach((file, index) => {\n\t\t\t\t\t  const li = document.createElement('li');\n\t\t\t\t\t  li.innerHTML = `\n\t\t\t\t\t\t  <span class=\"file-icon\">📄</span>\n\t\t\t\t\t\t  <a href=\"https://ipfs.io/ipfs/${file.Url.split('/').pop()}\" class=\"file-link\" target=\"_blank\">${file.Name}</a>\n\t\t\t\t\t\t  <div class=\"file-actions\">\n\t\t\t\t\t\t\t  <button class=\"delete-btn\" onclick=\"deleteFile(${index})\">\n\t\t\t\t\t\t\t\t  <span class=\"file-icon\">❌</span>\n\t\t\t\t\t\t\t  </button>\n\t\t\t\t\t\t  </div>\n\t\t\t\t\t  `;\n\t\t\t\t\t  fileList.appendChild(li);\n\t\t\t\t  });\n\t\t\t  }\n\n\t\t\t  function deleteFile(index) {\n\t\t\t\t  const savedFiles = JSON.parse(localStorage.getItem('uploadedFiles')) || [];\n\t\t\t\t  savedFiles.splice(index, 1);\n\t\t\t\t  localStorage.setItem('uploadedFiles', JSON.stringify(savedFiles));\n\t\t\t\t  loadFileList();\n\t\t\t  }\n\n\t\t\t  document.getElementById('clearAllBtn').addEventListener('click', () => {\n\t\t\t\t  if (confirm('Are you sure you want to clear all files?')) {\n\t\t\t\t\t  localStorage.removeItem('uploadedFiles');\n\t\t\t\t\t  loadFileList();\n\t\t\t\t  }\n\t\t\t  });\n\n\t\t\t  loadFileList();\n\n\t\t\t  const uploadArea = document.getElementById('uploadArea');\n\t\t\t  const fileInput = document.getElementById('fileInput');\n\t\t\t  const uploadStatus = document.getElementById('uploadStatus');\n\n\t\t\t  uploadArea.addEventListener('dragover', (e) => {\n\t\t\t\t  e.preventDefault();\n\t\t\t\t  uploadArea.classList.add('drag-over');\n\t\t\t  });\n\n\t\t\t  uploadArea.addEventListener('dragleave', () => {\n\t\t\t\t  uploadArea.classList.remove('drag-over');\n\t\t\t  });\n\n\t\t\t  uploadArea.addEventListener('drop', (e) => {\n\t\t\t\t  e.preventDefault();\n\t\t\t\t  uploadArea.classList.remove('drag-over');\n\t\t\t\t  const files = e.dataTransfer.files;\n\t\t\t\t  if (files.length) {\n\t\t\t\t\t  handleFileUpload(files[0]);\n\t\t\t\t  }\n\t\t\t  });\n\n\t\t\t  uploadArea.addEventListener('click', () => {\n\t\t\t\t  fileInput.click();\n\t\t\t  });\n\n\t\t\t  fileInput.addEventListener('change', (e) => {\n\t\t\t\t  const file = e.target.files[0];\n\t\t\t\t  if (file) {\n\t\t\t\t\t  handleFileUpload(file);\n\t\t\t\t  }\n\t\t\t  });\n\n\t\t\t  async function handleFileUpload(file) {\n\t\t\t\t  uploadStatus.textContent = `Uploading: ${file.name}...`;\n\t\t\t\t  \n\t\t\t\t  const formData = new FormData();\n\t\t\t\t  formData.append('file', file);\n\n\t\t\t\t  try {\n\t\t\t\t\t  const response = await fetch('https://app.img2ipfs.org/api/v0/add', {\n\t\t\t\t\t\t  method: 'POST',\n\t\t\t\t\t\t  body: formData,\n\t\t\t\t\t\t  headers: {\n\t\t\t\t\t\t\t  'Accept': 'application/json',\n\t\t\t\t\t\t  },\n\t\t\t\t\t  });\n\n\t\t\t\t\t  if (!response.ok) {\n\t\t\t\t\t\t  throw new Error('Upload failed');\n\t\t\t\t\t  }\n\n\t\t\t\t\t  const result = await response.json();\n\t\t\t\t\t  uploadStatus.textContent = `File uploaded successfully! IPFS Hash: ${result.Hash}`;\n\t\t\t\t\t  \n\t\t\t\t\t  const savedFiles = JSON.parse(localStorage.getItem('uploadedFiles')) || [];\n\t\t\t\t\t  savedFiles.push(result);\n\t\t\t\t\t  localStorage.setItem('uploadedFiles', JSON.stringify(savedFiles));\n\t\t\t\t\t  \n\t\t\t\t\t  loadFileList();\n\t\t\t\t\t  \n\t\t\t\t  } catch (error) {\n\t\t\t\t\t  console.error('Error:', error);\n\t\t\t\t\t  uploadStatus.textContent = 'Upload failed. Please try again.';\n\t\t\t\t  }\n\t\t\t  }\n\t\t  </script>\n\t  </body>\n\t  </html>\n\t";
  const _0x3f9f9c = {
    "content-type": "text/html;charset=UTF-8"
  };
  const _0x483b02 = {
    "headers": _0x3f9f9c
  };
  return new Response(_0x4f66d8, _0x483b02);
}
async function a0_0x270434(_0x91f67) {
  const _0x2e5c9b = new WebSocketPair();
  const [_0x3a7d39, _0xf10bef] = Object.values(_0x2e5c9b);
  _0xf10bef.accept();
  let _0xa1a1b9 = '';
  let _0x19e2b2 = '';
  const _0xe02cc9 = (_0x366f3a, _0x550cff) => {
    console.log("[" + _0xa1a1b9 + ":" + _0x19e2b2 + "] " + _0x366f3a, _0x550cff || '');
  };
  const _0x524ad9 = _0x91f67.headers.get("sec-websocket-protocol") || '';
  const _0x13e81a = a0_0x427abb(_0xf10bef, _0x524ad9, _0xe02cc9);
  const _0x36f80e = {
    value: null
  };
  let _0x52f79f = false;
  _0x13e81a.pipeTo(new WritableStream({
    async "write"(_0x1f6f0f, _0x592764) {
      if (_0x52f79f) {
        return await a0_0x23a0d6(_0x1f6f0f, _0xf10bef, null, _0xe02cc9);
      }
      const _0x4bcb43 = null.writable.getWriter();
      await _0x4bcb43.write(_0x1f6f0f);
      _0x4bcb43.releaseLock();
      return;
      const {
        hasError: _0x5cb613,
        message: _0x52e9da,
        addressType: _0x101a3c,
        portRemote = 0x1bb,
        addressRemote = '',
        rawDataIndex: _0x374300,
        ProtocolVersion = new Uint8Array([0x0, 0x0]),
        isUDP: _0x1b9cb8
      } = a0_0x24e165(_0x1f6f0f, a0_0xaa7123);
      _0xa1a1b9 = addressRemote;
      _0x19e2b2 = portRemote + "--" + Math.random() + " " + (_0x1b9cb8 ? "udp " : "tcp ") + " ";
      if (_0x5cb613) {
        throw new Error(_0x52e9da);
      }
      if (_0x1b9cb8) {
        if (portRemote === 0x35) {
          _0x52f79f = true;
        } else {
          throw new Error("UDP proxy is only enabled for DNS (port 53)");
        }
        return;
      }
      const _0x5d803b = new Uint8Array([ProtocolVersion[0x0], 0x0]);
      const _0x4ab5f2 = _0x1f6f0f.slice(_0x374300);
      if (_0x52f79f) {
        return a0_0x23a0d6(_0x4ab5f2, _0xf10bef, _0x5d803b, _0xe02cc9);
      }
      a0_0x45b46c(_0x36f80e, _0x101a3c, addressRemote, portRemote, _0x4ab5f2, _0xf10bef, _0x5d803b, _0xe02cc9);
    },
    "close"() {
      _0xe02cc9("readableWebSocketStream is close");
    },
    "abort"(_0x19f1d6) {
      _0xe02cc9("readableWebSocketStream is abort", JSON.stringify(_0x19f1d6));
    }
  }))["catch"](_0x52b022 => {
    _0xe02cc9("readableWebSocketStream pipeTo error", _0x52b022);
  });
  const _0x1951e2 = {
    "status": 0x65,
    "webSocket": _0x3a7d39
  };
  return new Response(null, _0x1951e2);
}
async function a0_0x45b46c(_0x33492a, _0x255202, _0x3b161e, _0xc1fd85, _0x4916f2, _0x7ada02, _0x56933a, _0x14b11b) {
  async function _0x50fe5b(_0x29cb09, _0x2faffe, _0x35f430 = false) {
    let _0x36f861;
    if (a0_0x270c07) {
      _0x36f861 = await a0_0x2cc850(_0x255202, _0x29cb09, _0x2faffe, _0x14b11b);
    } else {
      _0x36f861 = _0x35f430 ? await a0_0x2cc850(_0x255202, _0x29cb09, _0x2faffe, _0x14b11b) : connect({
        "hostname": _0x29cb09,
        "port": _0x2faffe
      });
    }
    _0x33492a.value = _0x36f861;
    _0x14b11b("connected to " + _0x29cb09 + ":" + _0x2faffe);
    const _0x371ad6 = _0x36f861.writable.getWriter();
    await _0x371ad6.write(_0x4916f2);
    _0x371ad6.releaseLock();
    return _0x36f861;
  }
  async function _0x5132b7() {
    if (a0_0x51ca75) {
      _0x511c5d = await _0x50fe5b(_0x3b161e, _0xc1fd85, true);
    } else {
      _0x511c5d = await _0x50fe5b(a0_0x1b8029 || _0x3b161e, a0_0x540d61 || _0xc1fd85, false);
    }
    _0x511c5d.closed["catch"](_0x1f8fcd => {
      console.log("retry tcpSocket closed error", _0x1f8fcd);
    })["finally"](() => {
      a0_0x767ee6(_0x7ada02);
    });
    a0_0x27557f(_0x511c5d, _0x7ada02, _0x56933a, null, _0x14b11b);
  }
  let _0x511c5d = await _0x50fe5b(_0x3b161e, _0xc1fd85);
  a0_0x27557f(_0x511c5d, _0x7ada02, _0x56933a, _0x5132b7, _0x14b11b);
}
function a0_0x427abb(_0x82a9c8, _0x40497b, _0x1a68c2) {
  let _0x1407d5 = false;
  const _0x29bbf6 = new ReadableStream({
    "start"(_0x30d164) {
      _0x82a9c8.addEventListener("message", _0x5b12fe => {
        const _0x6b57c2 = _0x5b12fe.data;
        _0x30d164.enqueue(_0x6b57c2);
      });
      _0x82a9c8.addEventListener("close", () => {
        a0_0x767ee6(_0x82a9c8);
        _0x30d164.close();
      });
      _0x82a9c8.addEventListener("error", _0x1bb1b9 => {
        _0x1a68c2("webSocketServer has error");
        _0x30d164.error(_0x1bb1b9);
      });
      const {
        earlyData: _0x462359,
        error: _0x4d5271
      } = a0_0x1a0ee3(_0x40497b);
      if (_0x4d5271) {
        _0x30d164.error(_0x4d5271);
      } else {
        if (_0x462359) {
          _0x30d164.enqueue(_0x462359);
        }
      }
    },
    "pull"(_0x19ca1f) {},
    "cancel"(_0x415d9b) {
      _0x1a68c2("ReadableStream was canceled, due to " + _0x415d9b);
      _0x1407d5 = true;
      a0_0x767ee6(_0x82a9c8);
    }
  });
  return _0x29bbf6;
}
function a0_0x24e165(_0x3eb58c, _0x39ea57) {
  if (_0x3eb58c.byteLength < 0x18) {
    const _0x44b848 = {
      "hasError": true,
      "message": "invalid data"
    };
    return _0x44b848;
  }
  const _0x46c818 = new DataView(_0x3eb58c);
  const _0x5c28b1 = _0x46c818.getUint8(0x0);
  const _0x4805ed = a0_0x367045(new Uint8Array(_0x3eb58c.slice(0x1, 0x11)));
  const _0x572887 = _0x39ea57.includes(",") ? _0x39ea57.split(",") : [_0x39ea57];
  const _0x3f3329 = _0x572887.some(_0x49dd8f => _0x4805ed === _0x49dd8f.trim()) || _0x572887.length === 0x1 && _0x4805ed === _0x572887[0x0].trim();
  console.log("userID: " + _0x4805ed);
  if (!_0x3f3329) {
    const _0x9b9efe = {
      "hasError": true,
      "message": "invalid user"
    };
    return _0x9b9efe;
  }
  const _0x15330e = _0x46c818.getUint8(0x11);
  const _0x240220 = _0x46c818.getUint8(0x12 + _0x15330e);
  if (_0x240220 !== 0x1 && _0x240220 !== 0x2) {
    const _0x555b8d = {
      "hasError": true,
      "message": "command " + _0x240220 + " is not supported, command 01-tcp,02-udp,03-mux"
    };
    return _0x555b8d;
  }
  const _0x1bb233 = 0x12 + _0x15330e + 0x1;
  const _0xbecb01 = _0x46c818.getUint16(_0x1bb233);
  const _0x59f322 = _0x46c818.getUint8(_0x1bb233 + 0x2);
  let _0x3faa85;
  let _0x50ac00;
  let _0x1a1ee;
  switch (_0x59f322) {
    case 0x1:
      _0x50ac00 = 0x4;
      _0x1a1ee = _0x1bb233 + 0x3;
      _0x3faa85 = new Uint8Array(_0x3eb58c.slice(_0x1a1ee, _0x1a1ee + _0x50ac00)).join(".");
      break;
    case 0x2:
      _0x50ac00 = _0x46c818.getUint8(_0x1bb233 + 0x3);
      _0x1a1ee = _0x1bb233 + 0x4;
      _0x3faa85 = new TextDecoder().decode(_0x3eb58c.slice(_0x1a1ee, _0x1a1ee + _0x50ac00));
      break;
    case 0x3:
      _0x50ac00 = 0x10;
      _0x1a1ee = _0x1bb233 + 0x3;
      const _0x3e100b = {
        "length": 0x8
      };
      _0x3faa85 = Array.from(_0x3e100b, (_0x15fb4e, _0x13f88d) => _0x46c818.getUint16(_0x1a1ee + _0x13f88d * 0x2).toString(0x10)).join(":");
      break;
    default:
      const _0x960d63 = {
        "hasError": true,
        "message": "invalid addressType: " + _0x59f322
      };
      return _0x960d63;
  }
  if (!_0x3faa85) {
    const _0x4615f5 = {
      "hasError": true,
      "message": "addressValue is empty, addressType is " + _0x59f322
    };
    return _0x4615f5;
  }
  return {
    "hasError": false,
    "addressRemote": _0x3faa85,
    "addressType": _0x59f322,
    "portRemote": _0xbecb01,
    "rawDataIndex": _0x1a1ee + _0x50ac00,
    "protocolVersion": new Uint8Array([_0x5c28b1]),
    "isUDP": _0x240220 === 0x2
  };
}
async function a0_0x27557f(_0x198b8b, _0x115bfe, _0x2b5d8d, _0x31a357, _0x383ff8) {
  let _0x16812b = false;
  try {
    await _0x198b8b.readable.pipeTo(new WritableStream({
      async "write"(_0x408272) {
        if (_0x115bfe.readyState !== 0x1) {
          throw new Error("WebSocket is not open");
        }
        _0x16812b = true;
        if (_0x2b5d8d) {
          _0x115bfe.send(await new Blob([_0x2b5d8d, _0x408272]).arrayBuffer());
          _0x2b5d8d = null;
        } else {
          _0x115bfe.send(_0x408272);
        }
      },
      "close"() {
        _0x383ff8("Remote connection readable closed. Had incoming data: " + _0x16812b);
      },
      "abort"(_0x3e317d) {
        console.error("Remote connection readable aborted:", _0x3e317d);
      }
    }));
  } catch (_0x50d7a4) {
    console.error("RemoteSocketToWS error:", _0x50d7a4.stack || _0x50d7a4);
    a0_0x767ee6(_0x115bfe);
  }
  if (!_0x16812b && _0x31a357) {
    _0x383ff8("No incoming data, retrying");
    await _0x31a357();
  }
}
function a0_0x1a0ee3(_0x9bf15e) {
  if (!_0x9bf15e) {
    const _0x2209ad = {
      "earlyData": null,
      "error": null
    };
    return _0x2209ad;
  }
  try {
    _0x9bf15e = _0x9bf15e.replace(/-/g, "+").replace(/_/g, "/");
    const _0x27fd97 = atob(_0x9bf15e);
    const _0x35ce1c = new ArrayBuffer(_0x27fd97.length);
    const _0x3eba70 = new Uint8Array(_0x35ce1c);
    for (let _0x180ccf = 0x0; _0x180ccf < _0x27fd97.length; _0x180ccf++) {
      _0x3eba70[_0x180ccf] = _0x27fd97.charCodeAt(_0x180ccf);
    }
    const _0x349c76 = {
      "earlyData": _0x35ce1c,
      "error": null
    };
    return _0x349c76;
  } catch (_0x5ce029) {
    const _0x148f57 = {
      "earlyData": null,
      "error": _0x5ce029
    };
    return _0x148f57;
  }
}
function a0_0x15259b(_0x2568e0) {
  const _0x21d732 = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return _0x21d732.test(_0x2568e0);
}
function a0_0x767ee6(_0x52e4ed) {
  try {
    if (_0x52e4ed.readyState === 0x1 || _0x52e4ed.readyState === 0x2) {
      _0x52e4ed.close();
    }
  } catch (_0x3a19c7) {
    console.error("safeCloseWebSocket error:", _0x3a19c7);
  }
}
const a0_0xa977a9 = {
  length: 0x100
};
const a0_0x1c2f46 = Array.from(a0_0xa977a9, (_0x54ad32, _0x443b9c) => (_0x443b9c + 0x100).toString(0x10).slice(0x1));
function a0_0x751fec(_0x4f1c09, _0x1e43dd = 0x0) {
  return [a0_0x1c2f46[_0x4f1c09[_0x1e43dd]], a0_0x1c2f46[_0x4f1c09[_0x1e43dd + 0x1]], a0_0x1c2f46[_0x4f1c09[_0x1e43dd + 0x2]], a0_0x1c2f46[_0x4f1c09[_0x1e43dd + 0x3]], "-", a0_0x1c2f46[_0x4f1c09[_0x1e43dd + 0x4]], a0_0x1c2f46[_0x4f1c09[_0x1e43dd + 0x5]], "-", a0_0x1c2f46[_0x4f1c09[_0x1e43dd + 0x6]], a0_0x1c2f46[_0x4f1c09[_0x1e43dd + 0x7]], "-", a0_0x1c2f46[_0x4f1c09[_0x1e43dd + 0x8]], a0_0x1c2f46[_0x4f1c09[_0x1e43dd + 0x9]], "-", a0_0x1c2f46[_0x4f1c09[_0x1e43dd + 0xa]], a0_0x1c2f46[_0x4f1c09[_0x1e43dd + 0xb]], a0_0x1c2f46[_0x4f1c09[_0x1e43dd + 0xc]], a0_0x1c2f46[_0x4f1c09[_0x1e43dd + 0xd]], a0_0x1c2f46[_0x4f1c09[_0x1e43dd + 0xe]], a0_0x1c2f46[_0x4f1c09[_0x1e43dd + 0xf]]].join('').toLowerCase();
}
function a0_0x367045(_0x3c9be3, _0x575ad8 = 0x0) {
  const _0x1c8bc9 = a0_0x751fec(_0x3c9be3, _0x575ad8);
  if (!a0_0x15259b(_0x1c8bc9)) {
    throw new TypeError("Stringified UUID is invalid");
  }
  return _0x1c8bc9;
}
async function a0_0x23a0d6(_0x41347c, _0x75be6, _0x45c45e, _0x6b27aa) {
  try {
    let _0x35235b = _0x45c45e;
    const _0x46eb7e = {
      "hostname": "8.8.4.4",
      "port": 0x35
    };
    const _0x1ddfc4 = connect(_0x46eb7e);
    _0x6b27aa("connected to 8.8.4.4:53");
    const _0x417bef = _0x1ddfc4.writable.getWriter();
    await _0x417bef.write(_0x41347c);
    _0x417bef.releaseLock();
    await _0x1ddfc4.readable.pipeTo(new WritableStream({
      async "write"(_0x42ac09) {
        if (_0x75be6.readyState === 0x1) {
          if (_0x35235b) {
            _0x75be6.send(await new Blob([_0x35235b, _0x42ac09]).arrayBuffer());
            _0x35235b = null;
          } else {
            _0x75be6.send(_0x42ac09);
          }
        }
      },
      "close"() {
        _0x6b27aa("dns server(8.8.4.4) tcp is close");
      },
      "abort"(_0x20eb0f) {
        console.error("dns server(8.8.4.4) tcp is abort", _0x20eb0f);
      }
    }));
  } catch (_0x5cc82f) {
    console.error("handleDNSQuery have exception, error: " + _0x5cc82f.message);
  }
}
async function a0_0x2cc850(_0x550f62, _0xed2e8c, _0x40c7af, _0x1e5e5f) {
  const {
    username: _0x221dee,
    password: _0x302422,
    hostname: _0x49d619,
    port: _0x99da81
  } = a0_0x11b54a;
  const _0x1b1977 = {
    "hostname": _0x49d619,
    "port": _0x99da81
  };
  const _0x95844a = connect(_0x1b1977);
  const _0x4aff3f = new Uint8Array([0x5, 0x2, 0x0, 0x2]);
  const _0x1395b8 = _0x95844a.writable.getWriter();
  await _0x1395b8.write(_0x4aff3f);
  _0x1e5e5f("sent socks greeting");
  const _0x17736e = _0x95844a.readable.getReader();
  const _0x519184 = new TextEncoder();
  let _0x503a0b = (await _0x17736e.read()).value;
  if (_0x503a0b[0x0] !== 0x5) {
    _0x1e5e5f("socks server version error: " + _0x503a0b[0x0] + " expected: 5");
    return;
  }
  if (_0x503a0b[0x1] === 0xff) {
    _0x1e5e5f("no acceptable methods");
    return;
  }
  if (_0x503a0b[0x1] === 0x2) {
    _0x1e5e5f("socks server needs auth");
    if (!_0x221dee || !_0x302422) {
      _0x1e5e5f("please provide username/password");
      return;
    }
    const _0x51cd5e = new Uint8Array([0x1, _0x221dee.length, ..._0x519184.encode(_0x221dee), _0x302422.length, ..._0x519184.encode(_0x302422)]);
    await _0x1395b8.write(_0x51cd5e);
    _0x503a0b = (await _0x17736e.read()).value;
    if (_0x503a0b[0x0] !== 0x1 || _0x503a0b[0x1] !== 0x0) {
      _0x1e5e5f("fail to auth socks server");
      return;
    }
  }
  let _0x34fd79;
  switch (_0x550f62) {
    case 0x1:
      _0x34fd79 = new Uint8Array([0x1, ..._0xed2e8c.split(".").map(Number)]);
      break;
    case 0x2:
      _0x34fd79 = new Uint8Array([0x3, _0xed2e8c.length, ..._0x519184.encode(_0xed2e8c)]);
      break;
    case 0x3:
      _0x34fd79 = new Uint8Array([0x4, ..._0xed2e8c.split(":").flatMap(_0x2eacac => [parseInt(_0x2eacac.slice(0x0, 0x2), 0x10), parseInt(_0x2eacac.slice(0x2), 0x10)])]);
      break;
    default:
      _0x1e5e5f("invild  addressType is " + _0x550f62);
      return;
  }
  const _0x2fd099 = new Uint8Array([0x5, 0x1, 0x0, ..._0x34fd79, _0x40c7af >> 0x8, _0x40c7af & 0xff]);
  await _0x1395b8.write(_0x2fd099);
  _0x1e5e5f("sent socks request");
  _0x503a0b = (await _0x17736e.read()).value;
  if (_0x503a0b[0x1] === 0x0) {
    _0x1e5e5f("socks connection opened");
  } else {
    _0x1e5e5f("fail to open socks connection");
    return;
  }
  _0x1395b8.releaseLock();
  _0x17736e.releaseLock();
  return _0x95844a;
}
function a0_0x8a68c6(_0x2d898f) {
  let [_0x292fc3, _0x286606] = _0x2d898f.split("@").reverse();
  let _0x1a1888;
  let _0x5ef25d;
  let _0x4e6bf3;
  let _0x2b7581;
  if (_0x286606) {
    const _0x5557ac = _0x286606.split(":");
    if (_0x5557ac.length !== 0x2) {
      throw new Error("Invalid SOCKS address format");
    }
    [_0x1a1888, _0x5ef25d] = _0x5557ac;
  }
  const _0x52df60 = _0x292fc3.split(":");
  _0x2b7581 = Number(_0x52df60.pop());
  if (isNaN(_0x2b7581)) {
    throw new Error("Invalid SOCKS address format");
  }
  _0x4e6bf3 = _0x52df60.join(":");
  const _0xa5802f = /^\[.*\]$/;
  if (_0x4e6bf3.includes(":") && !_0xa5802f.test(_0x4e6bf3)) {
    throw new Error("Invalid SOCKS address format");
  }
  const _0x1bbcb0 = {
    "username": _0x1a1888,
    "password": _0x5ef25d,
    "hostname": _0x4e6bf3,
    "port": _0x2b7581
  };
  return _0x1bbcb0;
}
function a0_0x46c440(_0x2b8edf, _0x102d7c, _0x4e8aa3) {
  const _0x499255 = "?encryption=none&security=tls&sni=" + _0x102d7c + "&fp=randomized&type=ws&host=" + _0x102d7c + "&path=%2F%3Fed%3D2048#" + _0x102d7c;
  const _0x3fae84 = _0x2b8edf.split(",");
  const _0x5cec03 = "https://" + _0x102d7c + "/bestip/" + _0x3fae84[0x0];
  const _0x232b51 = "https://url.v1.mk/sub?target=clash&url=" + encodeURIComponent("https://" + _0x102d7c + "/sub/" + _0x3fae84[0x0] + "?format=clash") + "&insert=false&emoji=true&list=false&tfo=false&scv=true&fdn=false&sort=false&new_name=true";
  const _0x21353a = "\n  <head>\n    <title>EDtunnel: Configuration</title>\n    <meta name='viewport' content='width=device-width, initial-scale=1'>\n    <meta property='og:site_name' content='EDtunnel: Protocol Configuration' />\n    <meta property='og:type' content='website' />\n    <meta property='og:title' content='EDtunnel - Protocol Configuration and Subscribe Output' />\n    <meta property='og:description' content='Use Cloudflare Pages and Worker serverless to implement protocol' />\n    <meta property='og:url' content='https://" + _0x102d7c + "/' />\n    <meta property='og:image' content='https://cdn.jsdelivr.net/gh/6Kmfi6HP/EDtunnel@refs/heads/main/image/logo.png' />\n    <meta name='twitter:card' content='summary_large_image' />\n    <meta name='twitter:title' content='EDtunnel - Protocol Configuration and Subscribe Output' />\n    <meta name='twitter:description' content='Use Cloudflare Pages and Worker serverless to implement protocol' />\n    <meta name='twitter:url' content='https://" + _0x102d7c + "/' />\n    <meta name='twitter:image' content='https://cdn.jsdelivr.net/gh/6Kmfi6HP/EDtunnel@refs/heads/main/image/logo.png' />\n    <meta property='og:image:width' content='1500' />\n    <meta property='og:image:height' content='1500' />\n\n    <style>\n      body {\n        font-family: 'Roboto', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;\n        background-color: #000000;\n        color: #ffffff;\n        line-height: 1.6;\n        padding: 20px;\n        max-width: 1200px;\n        margin: 0 auto;\n      }\n      .container {\n        background-color: #111111;\n        border-radius: 8px;\n        box-shadow: 0 4px 6px rgba(255, 255, 255, 0.1);\n        padding: 20px;\n        margin-bottom: 20px;\n      }\n      h1, h2 {\n        color: #ffffff;\n      }\n      .config-item {\n        background-color: #222222;\n        border: 1px solid #333333;\n        border-radius: 4px;\n        padding: 15px;\n        margin-bottom: 15px;\n      }\n      .config-item h3 {\n        margin-top: 0;\n        color: #ffffff;\n      }\n      .btn {\n        background-color: #ffffff;\n        color: #000000;\n        border: none;\n        padding: 10px 15px;\n        border-radius: 4px;\n        cursor: pointer;\n        transition: background-color 0.3s, color 0.3s;\n      }\n      .btn:hover {\n        background-color: #cccccc;\n      }\n      .btn-group {\n        margin-top: 10px;\n      }\n      .btn-group .btn {\n        margin-right: 10px;\n      }\n      pre {\n        background-color: #333333;\n        border: 1px solid #444444;\n        border-radius: 4px;\n        padding: 10px;\n        white-space: pre-wrap;\n        word-wrap: break-word;\n        color: #00ff00;\n      }\n      .logo {\n        float: left;\n        margin-right: 20px;\n        margin-bottom: 20px;\n\t\tmax-width: 30%;\n      }\n      @media (max-width: 768px) {\n        .logo {\n          float: none;\n          display: block;\n          margin: 0 auto 20px;\n          max-width: 90%; /* Adjust the max-width to fit within the container */\n        }\n        .btn-group {\n          display: flex;\n          flex-direction: column;\n          align-items: center;\n        }\n        .btn-group .btn {\n          margin-bottom: 10px;\n          width: 100%;\n          text-align: center;\n        }\n      }\n      .code-container {\n        position: relative;\n        margin-bottom: 15px;\n      }\n      .code-container pre {\n        margin: 0;\n        padding-right: 100px; /* Make space for the button */\n      }\n      .copy-btn {\n        position: absolute;\n        top: 5px;\n        right: 5px;\n        padding: 5px 10px;\n        font-size: 0.8em;\n      }\n      .subscription-info {\n        margin-top: 20px;\n        background-color: #222222;\n        border-radius: 4px;\n        padding: 15px;\n      }\n      .subscription-info h3 {\n        color: #ffffff;\n        margin-top: 0;\n      }\n      .subscription-info ul {\n        padding-left: 20px;\n      }\n      .subscription-info li {\n        margin-bottom: 10px;\n      }\n    </style>\n    <link rel=\"stylesheet\" href=\"https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.3/css/all.min.css\">\n  </head>\n  ";
  const _0x59fdea = "\n    <div class=\"container\">\n      <h1>EDtunnel: Protocol Configuration</h1>\n      <img src=\"https://cdn.jsdelivr.net/gh/6Kmfi6HP/EDtunnel@refs/heads/main/image/logo.png\" alt=\"EDtunnel Logo\" class=\"logo\">\n      <p>Welcome! This function generates configuration for the vless protocol. If you found this useful, please check our GitHub project:</p>\n      <p><a href=\"https://github.com/6Kmfi6HP/EDtunnel\" target=\"_blank\" style=\"color: #00ff00;\">EDtunnel - https://github.com/6Kmfi6HP/EDtunnel</a></p>\n      <div style=\"clear: both;\"></div>\n      <div class=\"btn-group\">\n        <a href=\"//" + _0x102d7c + "/sub/" + _0x3fae84[0x0] + "\" class=\"btn\" target=\"_blank\"><i class=\"fas fa-link\"></i> VLESS Subscription</a>\n        <a href=\"clash://install-config?url=" + encodeURIComponent("https://" + _0x102d7c + "/sub/" + _0x3fae84[0x0] + "?format=clash") + "\" class=\"btn\" target=\"_blank\"><i class=\"fas fa-bolt\"></i> Clash Subscription</a>\n        <a href=\"" + _0x232b51 + "\" class=\"btn\" target=\"_blank\"><i class=\"fas fa-bolt\"></i> Clash Link</a>\n        <a href=\"" + _0x5cec03 + "\" class=\"btn\" target=\"_blank\"><i class=\"fas fa-star\"></i> Best IP Subscription</a>\n      </div>\n      <div class=\"subscription-info\">\n        <h3>Options Explained:</h3>\n        <ul>\n          <li><strong>VLESS Subscription:</strong> Direct link for VLESS protocol configuration. Suitable for clients supporting VLESS.</li>\n          <li><strong>Clash Subscription:</strong> Opens the Clash client with pre-configured settings. Best for Clash users on mobile devices.</li>\n          <li><strong>Clash Link:</strong> A web link to convert the VLESS config to Clash format. Useful for manual import or troubleshooting.</li>\n          <li><strong>Best IP Subscription:</strong> Provides a curated list of optimal server IPs for many <b>different countries</b>.</li>\n        </ul>\n        <p>Choose the option that best fits your client and needs. For most users, the VLESS or Clash Subscription will be the easiest to use.</p>\n      </div>\n    </div>\n  ";
  const _0x6169cd = _0x3fae84.map(_0x565d80 => {
    const _0x3d92b1 = atob("dmxlc3M=") + "://" + _0x565d80 + atob("QA==") + _0x102d7c + ":443" + _0x499255;
    const _0x12ad1d = atob("dmxlc3M=") + "://" + _0x565d80 + atob("QA==") + _0x4e8aa3[0x0].split(":")[0x0] + ":" + a0_0x540d61 + _0x499255;
    return "\n      <div class=\"container config-item\">\n        <h2>UUID: " + _0x565d80 + "</h2>\n        <h3>Default IP Configuration</h3>\n        <div class=\"code-container\">\n          <pre><code>" + _0x3d92b1 + "</code></pre>\n          <button class=\"btn copy-btn\" onclick='copyToClipboard(\"" + _0x3d92b1 + "\")'><i class=\"fas fa-copy\"></i> Copy</button>\n        </div>\n        \n        <h3>Best IP Configuration</h3>\n        <div class=\"input-group mb-3\">\n          <select class=\"form-select\" id=\"proxySelect\" onchange=\"updateProxyConfig()\">\n            " + (typeof _0x4e8aa3 === "string" ? "<option value=\"" + _0x4e8aa3 + "\">" + _0x4e8aa3 + "</option>" : Array.from(_0x4e8aa3).map(_0x1203eb => "<option value=\"" + _0x1203eb + "\">" + _0x1203eb + "</option>").join('')) + "\n          </select>\n        </div>\n\t\t<br>\n        <div class=\"code-container\">\n          <pre><code id=\"proxyConfig\">" + _0x12ad1d + "</code></pre>\n          <button class=\"btn copy-btn\" onclick='copyToClipboard(document.getElementById(\"proxyConfig\").textContent)'><i class=\"fas fa-copy\"></i> Copy</button>\n        </div>\n      </div>\n    ";
  }).join('');
  return "\n  <html>\n  " + _0x21353a + "\n  <body>\n    " + _0x59fdea + "\n    " + _0x6169cd + "\n    <script>\n      const userIDArray = " + JSON.stringify(_0x3fae84) + ";\n      const pt = \"" + "dmxlc3M=" + "\";\n      const at = \"" + "QA==" + "\";\n      const commonUrlPart = \"?encryption=none&security=tls&sni=" + _0x102d7c + "&fp=randomized&type=ws&host=" + _0x102d7c + "&path=%2F%3Fed%3D2048#" + _0x102d7c + "\";\n\n      function copyToClipboard(text) {\n        navigator.clipboard.writeText(text)\n          .then(() => {\n            alert(\"Copied to clipboard\");\n          })\n          .catch((err) => {\n            console.error(\"Failed to copy to clipboard:\", err);\n          });\n      }\n\n      function updateProxyConfig() {\n        const select = document.getElementById('proxySelect');\n        const proxyValue = select.value;\n        const [host, port] = proxyValue.split(':');\n        const protocolSec = atob(pt) + '://' + userIDArray[0] + atob(at) + host + \":\" + port + commonUrlPart;\n        document.getElementById(\"proxyConfig\").textContent = protocolSec;\n      }\n    </script>\n  </body>\n  </html>";
}
const a0_0x115ac7 = new Set([0x50, 0x1f90, 0x22b0, 0x804, 0x826, 0x82f, 0x822]);
const a0_0x167a22 = new Set([0x1bb, 0x20fb, 0x805, 0x830, 0x827, 0x823]);
function a0_0x531d9d(_0x4203f2, _0xd3a277, _0x4a86d2) {
  const _0x26ce93 = new Set([_0xd3a277, "icook.hk", "japan.com", "malaysia.com", "russia.com", "singapore.com", "www.visa.com", "www.csgo.com", "www.shopify.com", "www.whatismyip.com", "www.ipget.net", "speed.marisalnc.com", "freeyx.cloudflare88.eu.org", "cloudflare.182682.xyz", "cfip.cfcdn.vip", a0_0x4a6d13, "cf.0sm.com", "cloudflare-ip.mofashi.ltd", "cf.090227.xyz", "cname.xirancdn.us", "cf.zhetengsha.eu.org", "cloudflare.9jy.cc", "cf.zerone-cdn.pp.ua", "cfip.1323123.xyz", "cdn.tzpro.xyz", "cf.877771.xyz", "cnamefuckxxs.yuchen.icu", "cfip.xxxxxxxx.tk"]);
  const _0x18acb0 = _0x4203f2.includes(",") ? _0x4203f2.split(",") : [_0x4203f2];
  const _0x4a997e = Array.isArray(_0x4a86d2) ? _0x4a86d2 : _0x4a86d2 ? _0x4a86d2.includes(",") ? _0x4a86d2.split(",") : [_0x4a86d2] : a0_0x4a6d13;
  const _0x2c1c8d = "?encryption=none&security=none&fp=random&type=ws&host=" + _0xd3a277 + "&path=" + encodeURIComponent("/" + Math.random().toString(0x24).substring(0x2, 0xf) + "?ed=2048") + "#";
  const _0xe78da2 = "?encryption=none&security=tls&sni=" + _0xd3a277 + "&fp=random&type=ws&host=" + _0xd3a277 + "&path=%2F%3Fed%3D2048#";
  const _0x16a319 = _0x18acb0.flatMap(_0x1cdd3f => {
    let _0x1643f5 = [];
    if (!_0xd3a277.includes("pages.dev")) {
      _0x26ce93.forEach(_0x1a2653 => {
        Array.from(a0_0x115ac7).forEach(_0x2e6e06 => {
          const _0xdb165e = _0xd3a277.split(".")[0x0] + "-" + _0x1a2653 + "-HTTP-" + _0x2e6e06;
          const _0xef47ee = atob("dmxlc3M=") + "://" + _0x1cdd3f + atob("QA==") + _0x1a2653 + ":" + _0x2e6e06 + _0x2c1c8d + _0xdb165e;
          _0x1643f5.push(_0xef47ee);
        });
      });
    }
    _0x26ce93.forEach(_0x37e652 => {
      Array.from(a0_0x167a22).forEach(_0x348d36 => {
        const _0x2f97fa = _0xd3a277.split(".")[0x0] + "-" + _0x37e652 + "-HTTPS-" + _0x348d36;
        const _0x21b0b1 = atob("dmxlc3M=") + "://" + _0x1cdd3f + atob("QA==") + _0x37e652 + ":" + _0x348d36 + _0xe78da2 + _0x2f97fa;
        _0x1643f5.push(_0x21b0b1);
      });
    });
    _0x4a997e.forEach(_0x4a1db6 => {
      const [_0x51b443, _0x25ba2d = "443"] = _0x4a1db6.split(":");
      const _0x336d2d = _0xd3a277.split(".")[0x0] + "-" + _0x51b443 + "-HTTPS-" + _0x25ba2d;
      const _0x439f87 = atob("dmxlc3M=") + "://" + _0x1cdd3f + atob("QA==") + _0x51b443 + ":" + _0x25ba2d + _0xe78da2 + _0x336d2d + "-" + atob("RUR0dW5uZWw=");
      _0x1643f5.push(_0x439f87);
    });
    return _0x1643f5;
  });
  return btoa(_0x16a319.join("\n"));
}
function a0_0x5f17a0(_0x3c18aa) {
  if (_0x3c18aa) {
    const _0x450728 = _0x3c18aa.split(",").map(_0x15ad58 => _0x15ad58.trim());
    const _0x5102a = a0_0x5c6906(_0x450728);
    const [_0x2cec22, _0x328bfd = "443"] = _0x5102a.split(":");
    const _0x17a046 = {
      ip: _0x2cec22,
      "port": _0x328bfd
    };
    return _0x17a046;
  } else {
    const _0x5e238e = a0_0x1b8029.includes(":") ? a0_0x1b8029.split(":")[0x1] : "443";
    const _0x484caa = a0_0x1b8029.split(":")[0x0];
    const _0x1a394c = {
      ip: _0x484caa,
      "port": _0x5e238e
    };
    return _0x1a394c;
  }
}
function a0_0x5c6906(_0x555d94) {
  const _0x58c52d = typeof _0x555d94 === "string" ? _0x555d94.split(",").map(_0x36ca85 => _0x36ca85.trim()) : _0x555d94;
  return _0x58c52d[Math.floor(Math.random() * _0x58c52d.length)];
}
