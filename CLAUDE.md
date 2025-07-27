# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

EDtunnel is a Cloudflare Worker/Pages-based VLESS proxy tool that implements WebSocket transport protocol for tunneling traffic. It runs on Cloudflare's serverless infrastructure and provides a web-based proxy service with multi-protocol support.

## Core Architecture

### Main Files

- **`index.js`** - Main source code (1517 lines) containing all functionality
- **`_worker.js`** - Obfuscated production version for deployment (462KB)
- **`wrangler.toml`** - Cloudflare Worker deployment configuration

### Key Components

- **Request routing system** with path-based dispatch (`/cf`, `/{userID}`, `/sub/{userID}`, etc.)
- **VLESS protocol over WebSocket** transport implementation
- **Multi-UUID authentication** with comma-separated configuration
- **SOCKS5 proxy integration** with authentication support
- **Subscription generation** for VLESS links and Clash configurations
- **DNS query handling** over UDP with outbound TCP connections

## Development Commands

```bash
# Local development
npm run dev          # Development with Wrangler
npm run dev-local    # Local development with index.js

# Production deployment
npm run build        # Dry-run deployment check
npm run deploy       # Deploy to Cloudflare Workers
npm run obfuscate    # Obfuscate index.js → _worker.js
```

## Configuration

The application uses environment variables for configuration:

- **UUID** - User authentication (supports comma-separated multiple UUIDs)
- **PROXYIP** - Proxy server addresses (comma-separated)
- **SOCKS5** - SOCKS5 proxy configuration with auth
- **SOCKS5_RELAY** - SOCKS5 relay endpoints

Configuration can be overridden via URL query parameters: `proxyip`, `socks5`, `socks5_relay`.

## Architecture Patterns

### Request Flow

1. **Main handler** processes all incoming requests
2. **Route dispatch** based on URL path patterns
3. **WebSocket upgrade** for protocol tunneling
4. **Environment/query parameter** configuration resolution
5. **Multi-proxy load balancing** with random selection

### Protocol Implementation

- **VLESS over WebSocket** as primary transport
- **Base64 encoding/decoding** for parameter handling
- **UUID validation** and multi-user support
- **DNS resolution** with fallback mechanisms
- **TCP connection management** with retry logic

## Deployment Options

1. **Cloudflare Workers** - Direct serverless deployment
2. **Cloudflare Pages** - Static site with Functions integration
3. **GitHub integration** - One-click deployment support

## Security Features

- **JavaScript obfuscation** pipeline using `javascript-obfuscator`
- **UUID-based authentication** system
- **TLS encryption** through Cloudflare infrastructure
- **Environment variable protection** for sensitive configuration
