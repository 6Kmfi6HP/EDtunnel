# EDtunnel

<p align="center">
  <img src="https://cloudflare-ipfs.com/ipfs/bafybeigd6i5aavwpr6wvnwuyayklq3omonggta4x2q7kpmgafj357nkcky" alt="图片描述" style="margin-bottom: -50px;">
</p>

这是 ed 哥哥 [https://github.com/zizifn/edgetunnel](https://github.com/zizifn/edgetunnel) 的 GitHub 仓库。

[![Repository](https://img.shields.io/badge/View%20on-GitHub-blue.svg)](https://github.com/zizifn/edgetunnel)

> 注意：此中文文档由 GPT 生成，在部署和配置过程中若出现问题，建议参考原英文文档以获取准确信息。

## 在 pages.dev 部署

1. 观看 YouTube 视频教程:

   [https://www.youtube.com/watch?v=8I-yTNHB0aw](https://www.youtube.com/watch?v=8I-yTNHB0aw)

2. 克隆此仓库并在 Cloudflare 页面进行部署。

## 在 worker.dev 部署

1. 从[这里](https://github.com/3Kmfi6HP/EDtunnel/blob/main/_worker.js)复制 `_worker.js` 代码。

2. 另外，你可以点击下面的按钮直接进行部署。

   [![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/3Kmfi6HP/EDtunnel)

## 如何快速使用

`aHR0cHM6Ly9vc3MudjJyYXlzZS5jb20vcHJveGllcy9kYXRhLzIwMjMtMDYtMjAvZFFOQTk3LnlhbWw=` (clash 配置)

## UUID 设置 (可选)

1. 在 Cloudflare 页面部署时，你可以在 `wrangler.toml` 文件中设置 uuid。变量名称是 `UUID`。

2. 在 worker.dev 部署时，你可以在 `_worker.js` 文件中设置 uuid。变量名称是 `userID`。

### UUID 设置示例

1. 单个 uuid 环境变量

   ```.environment
   UUID = "你想设置的 uuid"
   ```

2. 多个 uuid 环境变量

   ```.environment
   UUID = "uuid1,uuid2,uuid3"
   ```

   注意：uuid1, uuid2, uuid3 使用逗号`,`分隔。
   当你设置多个 uuid 时，可以使用 `https://edtunnel.pages.dev/uuid1` 获取 clash 配置和 vless:// 链接。

## 订阅 vless:// 链接 (可选)

1. 访问 `https://edtunnel.pages.dev/uuid 你设置的` 获取订阅链接。

2. 访问 `https://edtunnel.pages.dev/sub/uuid 你设置的` 获取包含 `uuid 你设置的` 路径的订阅内容。

   注意：`uuid 你设置的` 是你在 UUID 环境或 `wrangler.toml`, `_worker.js` 文件中设置的 uuid。
   当你设置多个 uuid 时，你可以使用 `https://edtunnel.pages.dev/sub/uuid1` 获取包含 `uuid1` 路径的订阅内容（仅支持在多个 uuid 设置中的第一个 uuid）。

3. 访问 `https://edtunnel.pages.dev/sub/uuid 你设置的/?format=clash` 获取包含 `uuid 你设置的` 路径并且格式为 `clash` 的订阅内容。内容将以 base64 编码返回。

   注意：`uuid 你设置的` 是你在 UUID 环境或 `wrangler.toml`, `_worker.js` 文件中设置的 uuid。
   当你设置多个 uuid 时，你可以使用 `https://edtunnel.pages.dev/sub/uuid1/?format=clash` 获取包含 `uuid1` 路径并且格式为 `clash` 的订阅内容（仅支持在多个 uuid 设置中的第一个 uuid）。

## 支持多端口 (可选)

有关 Cloudflare 支持的端口列表，请参阅官方[文档](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/ports)。

默认的端口是 80 和 443。如果你想要添加更多的端口，可以使用以下端口：

```text
80, 8080, 8880, 2052, 2086, 2095, 443, 8443, 2053, 2096, 2087, 2083
http port: 80, 8080, 8880, 2052, 2086, 2095
https port: 443, 8443, 2053, 2096, 2087, 2083
```

如果你在 Cloudflare 页面进行部署，将不支持 https 端口。直接添加多个端口节点使用订阅链接，订阅的内容将返回所有 Cloudflare 支持的端口。

## proxyIP (可选)

1. 在 Cloudflare 页面部署时，你可以在 `wrangler.toml` 文件中设置 proxyIP。变量名称是 `PROXYIP`。

2. 在 worker.dev 部署时，你可以在 `_worker.js` 文件中设置 proxyIP。变量名称是 `proxyIP`。

注意：`proxyIP` 是你想要设置的 ip 或者域名。这意味着该 proxyIP 用于通过代理路由流量，而不是直接通过使用 Cloudflare 的 CDN 进行的网站。如果你没有设置这个变量，连接到 Cloudflare IP 将被取消（或者被阻止）...

原因: Cloudflare 暂时阻止了对 Cloudflare IP 范围的主动 TCP 套接字连接，请参考 [tcp-sockets 文档](https://developers.cloudflare.com/workers/runtime-apis/tcp-sockets/#considerations)。

## 使用教程

首先，打开你的 pages.dev 域名 `https://edtunnel.pages.dev/` 在你的浏览器上，那么你可以看到以下页面：
通过路径 `/uuid 你设置的` 来获取 clash 配置和 vless:// 链接。
