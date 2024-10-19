# EDtunnel

<p align="center">
  <img src="https://ipfs.io/ipfs/bafybeigd6i5aavwpr6wvnwuyayklq3omonggta4x2q7kpmgafj357nkcky" alt="edgetunnel" style="margin-bottom: -50px;">
</p>

GitHub Repository for [https://github.com/zizifn/edgetunnel](https://github.com/zizifn/edgetunnel)

ask question and cloudflare ips: [https://t.me/edtunnel](https://t.me/edtunnel)

[![Repository](https://img.shields.io/badge/View%20on-GitHub-blue.svg)](https://github.com/zizifn/edgetunnel)

## available branches and explain

| Branch Name   | Description                                                   |
| ------------- | ------------------------------------------------------------- |
| remote-socks5 | Branch for remote SOCKS5 proxy pool used implementation       |
| socks5        | Branch for SOCKS5 proxyIP implementation                      |
| vless         | Branch for outbound VLESS protocol implementation             |
| vless2        | Branch for alternative outbound VLESS protocol implementation |
| code1         | Branch for code1 feature development                          |
| code2         | Branch for code2 alternative feature development              |
| dns           | Branch for DNS alternative related development                |
| main          | Main branch for the project                                   |
| pages         | New version for deployment on Cloudflare Pages                |

## Deploy in pages.dev

1. See YouTube Video:

   [https://www.youtube.com/watch?v=8I-yTNHB0aw](https://www.youtube.com/watch?v=8I-yTNHB0aw)

2. Clone this repository deploy in cloudflare pages.

<!-- 3. Add `nodejs_compat` at setting Compatibility flags -->

<!-- ![note](image/image.png) -->

## Deploy in worker.dev

1. Copy `_worker.js` code from [here](https://github.com/6Kmfi6HP/EDtunnel/blob/main/_worker.js).

2. Alternatively, you can click the button below to deploy directly.

   [![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/6Kmfi6HP/EDtunnel)

<!-- 3. Noneed add `nodejs_compat` at setting Compatibility flags -->

## How to use non 443 port as proxyIP

1. copy `ProxyIP:proxyport` to `https://proxyip.edtunnel.best/` and click `Check` button.
2. if `Proxy IP` is `true`, you can use this `ProxyIP:proxyport` as `ProxyIP`
3. if `Proxy IP` is `false`, you can see `Origin` is `443` this means the port can be accessed website.
4. edit worker `PROXYIP` variable example `211.230.110.231:50008`

Note: the proxyIP with port may not vaild some cloudflare site that use http only.

## How to change UUID

1. edit `wrangler.toml` file `UUID` variable(not recommended at public repo)
2. edit `UUID` in cloudflare dashboard secret enviroment variable (recommended)

## Support Environment Variables

| Variable       | Required | Example                                                                                                                                                                       | Description                        |
| -------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------- |
| `UUID`         | No       | `12345678-1234-1234-1234-123456789012`                                                                                                                                        | Unique identifier                  |
| `PROXYIP`      | No       | `1.1.1.1` or `cdn.xn--b6gac.eu.org` or with port `1.1.1.1:9443` or `[2a01:4f8:c2c:123f:64:5:6810:c55a]:443` or use multiple proxyIPs `1.1.1.1:80,2.2.2.2:443,example.com:443` | Redirect cloudflare ips to ProxyIP |
| `SOCKS5`       | No       | `1.1.1.1:1080` or `user:pass@host:port`                                                                                                                                       | SOCKS5 proxy cloudflare ips        |
| `SOCKS5_RELAY` | No       | `true` or `false`                                                                                                                                                             | Enable SOCKS5 relaying all traffic |

### Enviroment variable setting workers.dev

![workers](image/image-1.png)

### Enviroment variable setting pages.dev

![pages](image/image-2.png)

<!-- ## How to use trojan

1. the `UUID` enviroment variable is `trojan` password
2. v2ray path is `/trojan` -->

## Lazy to deploy

subscribe link`https://sub.xf.free.hr/auto` (auto detect client config)

## UUID Setting (Optional)

1. When deploy in cloudflare pages, you can set uuid in `wrangler.toml` file. variable name is `UUID`. `wrangler.toml` file is also supported. (recommended) in case deploy in webpages, you can not set uuid in `wrangler.toml` file.

2. When deploy in worker.dev, you can set uuid in `_worker.js` file. variable name is `userID`. `wrangler.toml` file is also supported. (recommended) in case deploy in webpages, you can not set uuid in `wrangler.toml` file. in this case, you can also set uuid in `UUID` enviroment variable.

Note: `UUID` is the uuid you want to set. pages.dev and worker.dev all of them method supported, but depend on your deploy method.

### UUID Setting Example

1. single uuid environment variable

   ```.environment
   UUID = "uuid here your want to set"
   ```

2. multiple uuid environment variable

   ```.environment
   UUID = "uuid1,uuid2,uuid3"
   ```

   note: uuid1, uuid2, uuid3 are separated by commas`,`.
   when you set multiple uuid, you can use `https://edtunnel.pages.dev/uuid1` to get the clash config and vless:// link.

## subscribe vless:// link (Optional)

1. visit `https://edtunnel.pages.dev/uuid your set` to get the subscribe link.

2. visit `https://edtunnel.pages.dev/sub/uuid your set` to get the subscribe content with `uuid your set` path.

   Note: `uuid_your_set` is the uuid you set in UUID enviroment or `wrangler.toml`, `_worker.js` file.
   when you set multiple uuid, you can use `https://edtunnel.pages.dev/sub/uuid1` to get the subscribe content with `uuid1` path.(only support first uuid in multiple uuid set)

3. visit `https://edtunnel.pages.dev/sub/uuid_your_set/?format=clash` to get the subscribe content with `uuid_your_set` path and `clash` format. content will return with base64 encode.

   Note: `uuid_your_set` is the uuid you set in UUID enviroment or `wrangler.toml`, `_worker.js` file.
   when you set multiple uuid, you can will use `https://edtunnel.pages.dev/sub/uuid1/?format=clash` to get the subscribe content with `uuid1` path and `clash` format.(only support first uuid in multiple uuid set)

## subscribe Cloudflare bestip(pure ip) link

1. visit `https://edtunnel.pages.dev/bestip/uuid_your_set` to get subscribe info.

2. cpoy subscribe url link `https://edtunnel.pages.dev/bestip/uuid_your_set` to any clients(clash/v2rayN/v2rayNG) you want to use.

3. done. if have any questions please join [@edtunnel](https://t.me/edtunnel)

## multiple port support (Optional)

   <!-- let portArray_http = [80, 8080, 8880, 2052, 2086, 2095];
	let portArray_https = [443, 8443, 2053, 2096, 2087, 2083]; -->

For a list of Cloudflare supported ports, please refer to the [official documentation](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/ports).

By default, the port is 80 and 443. If you want to add more ports, you can use the following ports:

```text
80, 8080, 8880, 2052, 2086, 2095, 443, 8443, 2053, 2096, 2087, 2083
http port: 80, 8080, 8880, 2052, 2086, 2095
https port: 443, 8443, 2053, 2096, 2087, 2083
```

if you deploy in cloudflare pages, https port is not supported. Simply add multiple ports node drictly use subscribe link, subscribe content will return all Cloudflare supported ports.

## proxyIP (Optional)

1. When deploy in cloudflare pages, you can set proxyIP in `wrangler.toml` file. variable name is `PROXYIP`.

2. When deploy in worker.dev, you can set proxyIP in `_worker.js` file. variable name is `proxyIP`.

3. You can now set multiple proxy IPs by separating them with commas. For example:
   ```
   PROXYIP = "1.1.1.1:443,2.2.2.2:8443,example.com:443"
   ```
   The system will randomly select one of these proxy addresses for each request, providing basic load balancing.

Note: `proxyIP` is the ip or domain you want to set. This means that the proxyIP is used to route traffic through a proxy rather than directly to a website that is using Cloudflare's (CDN). If you don't set this variable, connection to the Cloudflare IP will be cancelled (or blocked).

Reasons: Outbound TCP sockets to Cloudflare IP ranges are temporarily blocked, please refer to the [tcp-sockets documentation](https://developers.cloudflare.com/workers/runtime-apis/tcp-sockets/#considerations)

## Usage

frist, open your pages.dev domain `https://edtunnel.pages.dev/` in your browser, then you can see the following page:
The path `/uuid_your_set` to get the clash config and vless:// link.
you will see the following page:

![alt text](/image/image-3.png)

## Star History

<a href="https://star-history.com/#6Kmfi6HP/EDtunnel&Date">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/svg?repos=6Kmfi6HP/EDtunnel&type=Date&theme=dark" />
    <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/svg?repos=6Kmfi6HP/EDtunnel&type=Date" />
    <img alt="Star History Chart" src="https://api.star-history.com/svg?repos=6Kmfi6HP/EDtunnel&type=Date" />
  </picture>
</a>
