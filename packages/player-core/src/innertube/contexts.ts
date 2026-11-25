import { InnerTubeClientName, InnerTubeContext } from '../types';
import { NetworkAdapter } from '../adapters/network';

export const INNERTUBE_PUBLIC_KEY = 'AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8';

export const INNERTUBE_CONTEXTS: Record<InnerTubeClientName, InnerTubeContext> = {
  TVHTML5: {
    client: {
      clientName: 'TVHTML5',
      clientVersion: '7.20260707.07.00',
      hl: 'en',
      gl: 'US',
      deviceMake: 'Samsung',
      deviceModel: 'SmartTV',
      osName: 'Tizen',
      platform: 'TV',
    },
  },
  ANDROID: {
    client: {
      clientName: 'ANDROID',
      clientVersion: '21.26.364',
      hl: 'en',
      gl: 'US',
      osName: 'Android',
      osVersion: '15',
      platform: 'MOBILE',
    },
  },
  VISIONOS: {
    client: {
      clientName: 'VISIONOS',
      clientVersion: '0.1',
      hl: 'en',
      gl: 'US',
      deviceMake: 'Apple',
      osName: 'visionOS',
      platform: 'MOBILE',
    },
  },
  IOS: {
    client: {
      clientName: 'iOS',
      clientVersion: '20.11.6',
      hl: 'en',
      gl: 'US',
      deviceMake: 'Apple',
      osName: 'iOS',
      platform: 'MOBILE',
    },
  },
  ANDROID_MUSIC: {
    client: {
      clientName: 'ANDROID_MUSIC',
      clientVersion: '6.40.52',
      hl: 'en',
      gl: 'US',
      osName: 'Android',
      osVersion: '14',
      platform: 'MOBILE',
    },
  },
  WEB_REMIX: {
    client: {
      clientName: 'WEB_REMIX',
      clientVersion: '1.20240101.01.00',
      hl: 'en',
      gl: 'US',
      osName: 'Windows',
      osVersion: '10.0',
      platform: 'DESKTOP',
    },
  },
  WEB: {
    client: {
      clientName: 'WEB',
      clientVersion: '2.20240101.01.00',
      hl: 'en',
      gl: 'US',
      osName: 'Windows',
      osVersion: '10.0',
      platform: 'DESKTOP',
    },
  },
  MWEB: {
    client: {
      clientName: 'MWEB',
      clientVersion: '2.20240101.01.00',
      hl: 'en',
      gl: 'US',
      osName: 'Android',
      osVersion: '14',
      platform: 'MOBILE',
    },
  },
};

export interface InnerTubeClientOptions {
  networkAdapter?: NetworkAdapter;
  baseUrl?: string;
}
