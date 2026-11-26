import { NetworkAdapter } from './network';
import { buildStreamProxyUrl } from './streamProxyUrl';
import { YouTubeAuthStatus } from '../types';
import { ExtensionBridgeRequest, ExtensionBridgeResponse } from './extensionTypes';
import {
  generateRequestId,
  isExtensionActive,
  checkExtension,
  getYouTubeAuthStatus,
  fetchAuthenticated,
} from './extensionBridge';

export type { ExtensionBridgeRequest, ExtensionBridgeResponse };
export { checkExtension, getYouTubeAuthStatus, fetchAuthenticated, isExtensionActive };

/**
 * WebExtensionAdapter: Communicates with WXT / WebExtension background via window.postMessage bridge.
 * Enables DNR header modification (Referer, Origin, SAPISIDHASH) and CORS bypass in web apps.
 */
export class WebExtensionAdapter implements NetworkAdapter {
  readonly name = 'web-extension';
  private timeoutMs: number;

  constructor(timeoutMs = 15000) {
    this.timeoutMs = timeoutMs;
  }

  isExtensionActive(): boolean {
    return isExtensionActive();
  }

  resolveStreamUrl(url: string, videoId?: string): string {
    return buildStreamProxyUrl(url, videoId);
  }

  private async fallbackProxyFetch(url: string, init?: RequestInit): Promise<Response> {
    try {
      const parsed = new URL(url);
      const cleanPath = parsed.pathname.replace(/^\/youtubei\/v1/, '');
      const proxiedUrl = `/api/yt${cleanPath}${parsed.search}`;
      const headers = new Headers(init?.headers);
      if (!headers.has('x-target-url')) headers.set('x-target-url', url);
      return await fetch(proxiedUrl, { ...init, headers });
    } catch {
      return await fetch(url, init);
    }
  }

  async fetch(url: string, init?: RequestInit): Promise<Response> {
    if (typeof window === 'undefined') {
      throw new Error('[WebExtensionAdapter] Cannot be used in non-browser context');
    }
    try {
      const resp = await this.fetchViaExtension(url, init);
      if (resp.ok) return resp;
      if (url.includes('/youtubei/v1/player')) {
        const proxyResp = await this.fallbackProxyFetch(url, init);
        if (proxyResp.ok) return proxyResp;
      }
      return resp;
    } catch (err: any) {
      console.warn('[WebExtensionAdapter] Extension fetch failed, falling back to proxy:', err?.message || err);
      return this.fallbackProxyFetch(url, init);
    }
  }

  private fetchViaExtension(url: string, init?: RequestInit): Promise<Response> {
    const requestId = generateRequestId();
    const headersObj: Record<string, string> = {};
    if (init?.headers) {
      new Headers(init.headers).forEach((value, key) => {
        headersObj[key] = value;
      });
    }

    const bodyStr = init?.body
      ? typeof init.body === 'string'
        ? init.body
        : JSON.stringify(init.body)
      : undefined;

    return new Promise<Response>((resolve, reject) => {
      let settled = false;

      const timer = setTimeout(() => {
        if (!settled) {
          settled = true;
          window.removeEventListener('message', handleMessage);
          reject(new Error(`[WebExtensionAdapter] Request timed out after ${this.timeoutMs}ms`));
        }
      }, this.timeoutMs);

      const handleMessage = (event: MessageEvent) => {
        if (event.source !== window || !event.data || event.data.type !== 'MP_EXT_FETCH_RESPONSE') {
          return;
        }

        const resp = event.data as ExtensionBridgeResponse;
        if (resp.requestId !== requestId) return;

        settled = true;
        clearTimeout(timer);
        window.removeEventListener('message', handleMessage);

        if (resp.error) {
          reject(new Error(`[WebExtensionAdapter] ${resp.error}`));
          return;
        }

        const bodyData =
          typeof resp.data === 'string'
            ? resp.data
            : resp.data !== undefined
              ? JSON.stringify(resp.data)
              : '';

        resolve(
          new Response(bodyData, {
            status: resp.status || 200,
            statusText: resp.statusText || 'OK',
            headers: resp.headers || {},
          })
        );
      };

      window.addEventListener('message', handleMessage);
      window.postMessage(
        {
          type: 'MP_EXT_FETCH_REQUEST',
          requestId,
          url,
          method: init?.method || 'GET',
          headers: headersObj,
          body: bodyStr,
        },
        '*'
      );
    });
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
      throw new Error(`[WebExtensionAdapter] HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json() as Promise<T>;
  }

  checkExtension(timeoutMs = 400): Promise<boolean> {
    return checkExtension(timeoutMs);
  }

  getYouTubeAuthStatus(timeoutMs = 3000): Promise<YouTubeAuthStatus> {
    return getYouTubeAuthStatus(timeoutMs);
  }

  fetchAuthenticated<T = any>(
    urlOrEndpoint: string,
    body?: any,
    timeoutMs = this.timeoutMs
  ): Promise<T> {
    return fetchAuthenticated<T>(urlOrEndpoint, body, timeoutMs);
  }
}
