import { YouTubeAuthStatus } from '../types';
import { buildStreamProxyUrl } from './streamProxyUrl';

/**
 * Pluggable Network Adapters for InnerTube and streaming transport
 */

export interface NetworkAdapter {
  readonly name: string;
  fetch(url: string, init?: RequestInit): Promise<Response>;
  postJson<T = any>(url: string, body: any, headers?: Record<string, string>): Promise<T>;
  resolveStreamUrl?(url: string, videoId?: string): string;
  checkExtension?(): Promise<boolean>;
  getYouTubeAuthStatus?(): Promise<YouTubeAuthStatus>;
  fetchAuthenticated?<T = any>(urlOrEndpoint: string, body?: any): Promise<T>;
}

/**
 * Native direct fetch adapter (Used in Electron, Mobile, Node, and unrestricted environments)
 */
export class NativeHttpAdapter implements NetworkAdapter {
  readonly name = 'native-http';

  async fetch(url: string, init?: RequestInit): Promise<Response> {
    return fetch(url, init);
  }

  async postJson<T = any>(url: string, body: any, headers: Record<string, string> = {}): Promise<T> {
    const response = await this.fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain',
        ...headers,
      },
      body: typeof body === 'string' ? body : JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`[NativeHttpAdapter] HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json() as Promise<T>;
  }
}

declare global {
  interface Window {
    __MP_EXTENSION_ACTIVE__?: boolean;
  }
}

/**
 * DevProxyAdapter: Routes metadata requests through a local proxy endpoint (e.g. Next.js /api/yt/*)
 * Enables zero-install instant web streaming without CORS restrictions.
 */
export interface DevProxyOptions {
  proxyBaseUrl?: string; // defaults to '/api/yt'
}

export class DevProxyAdapter implements NetworkAdapter {
  readonly name = 'dev-proxy';
  private proxyBaseUrl: string;

  constructor(options: DevProxyOptions = {}) {
    this.proxyBaseUrl = options.proxyBaseUrl || '/api/yt';
  }

  resolveStreamUrl(url: string, videoId?: string): string {
    return buildStreamProxyUrl(url, videoId, { proxyBaseUrl: this.proxyBaseUrl });
  }

  private resolveUrl(targetUrl: string): string {
    try {
      const parsed = new URL(targetUrl);
      if (parsed.pathname.startsWith(this.proxyBaseUrl)) {
        return targetUrl;
      }
      const cleanPath = parsed.pathname.replace(/^\/youtubei\/v1/, '');
      const search = parsed.search;
      return `${this.proxyBaseUrl}${cleanPath}${search}`;
    } catch {
      if (targetUrl.startsWith(this.proxyBaseUrl)) {
        return targetUrl;
      }
      return targetUrl;
    }
  }

  async fetch(url: string, init?: RequestInit): Promise<Response> {
    const proxiedUrl = this.resolveUrl(url);
    const headers = new Headers(init?.headers);
    if (!headers.has('x-target-url')) {
      headers.set('x-target-url', url);
    }

    return fetch(proxiedUrl, {
      ...init,
      headers,
    });
  }

  async postJson<T = any>(url: string, body: any, headers: Record<string, string> = {}): Promise<T> {
    const proxiedUrl = this.resolveUrl(url);
    const response = await fetch(proxiedUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain',
        'x-target-url': url,
        ...headers,
      },
      body: typeof body === 'string' ? body : JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`[DevProxyAdapter] HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json() as Promise<T>;
  }
}

export * from './webExtensionAdapter';
