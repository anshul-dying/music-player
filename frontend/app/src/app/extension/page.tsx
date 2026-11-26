'use client';

import React from 'react';
import {
  Download,
  FolderDown,
  Chrome,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import {
  Button,
  Card,
  Stack,
  Flex,
  Box,
  Text,
  Badge,
  Container,
  Separator,
} from '@mp/dying';
import { useYouTubeAuthStore } from '@/stores/youtubeAuthStore';

export default function ExtensionPage() {
  const { isExtensionInstalled, isChecking, checkStatus } = useYouTubeAuthStore();
  const chromeStoreUrl = process.env.NEXT_PUBLIC_CHROME_WEB_STORE_URL?.trim();

  return (
    <Container size="md" className="py-8">
      <Stack gap="6">
        {/* Header */}
        <Stack gap="2">
          <Flex align="center" gap="3">
            <Text size="2xl" weight="bold" className="text-text-primary">
              GaneGan Companion Extension
            </Text>
            {isExtensionInstalled ? (
              <Badge variant="success" size="sm">
                Connected
              </Badge>
            ) : (
              <Badge variant="warning" size="sm">
                Not Installed
              </Badge>
            )}
          </Flex>
          <Text size="sm" variant="secondary">
            Enables high-fidelity YouTube Music streaming, instant direct Opus playback, and personal library synchronization without CORS restrictions or cloud rate limits.
          </Text>
        </Stack>

        {/* Status Card */}
        <Card variant="default" className="p-5 border-border-subtle bg-surface">
          <Flex justify="between" align="center" className="flex-wrap gap-4">
            <Flex align="center" gap="3">
              <Box className="p-2.5 rounded-xl bg-surface-active text-text-primary">
                {isExtensionInstalled ? (
                  <CheckCircle2 size={24} className="text-emerald-400" />
                ) : (
                  <AlertCircle size={24} className="text-amber-400" />
                )}
              </Box>
              <Stack gap="1">
                <Text size="sm" weight="semibold" className="text-text-primary">
                  {isExtensionInstalled
                    ? 'Extension Active & Running'
                    : 'Extension Not Detected'}
                </Text>
                <Text size="xs" variant="secondary">
                  {isExtensionInstalled
                    ? 'Direct client CDN playback active. No server proxy latency.'
                    : 'Install the companion extension below to enable uninterrupted music streaming.'}
                </Text>
              </Stack>
            </Flex>

            <Flex align="center" gap="2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => checkStatus()}
                isLoading={isChecking}
                leftIcon={<RefreshCw size={14} />}
              >
                Check Connection
              </Button>
              {chromeStoreUrl && (
                <a
                  href={chromeStoreUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="no-underline"
                >
                  <Button variant="accent" size="sm" leftIcon={<Chrome size={14} />} rightIcon={<ExternalLink size={12} />}>
                    Add to Chrome
                  </Button>
                </a>
              )}
              <a
                href="/downloads/ganegan-extension.zip"
                download="ganegan-extension.zip"
                className="no-underline"
              >
                <Button variant={chromeStoreUrl ? 'secondary' : 'primary'} size="sm" leftIcon={<Download size={14} />}>
                  {chromeStoreUrl ? 'Manual (.zip)' : 'Download (.zip)'}
                </Button>
              </a>
            </Flex>
          </Flex>
        </Card>

        {/* Installation Instructions */}
        <Card variant="default" className="p-6 border-border-subtle bg-surface">
          <Stack gap="5">
            <Stack gap="1">
              <Text size="base" weight="semibold" className="text-text-primary">
                Quick 3-Step Setup (Chrome, Brave, Edge)
              </Text>
              <Text size="xs" variant="secondary">
                Takes less than 30 seconds to load into your browser.
              </Text>
            </Stack>

            <Stack gap="4">
              <Flex align="start" gap="4">
                <Box className="p-2.5 rounded-xl bg-surface-active border border-border-subtle text-text-primary shrink-0 mt-0.5">
                  <FolderDown size={18} />
                </Box>
                <Stack gap="1">
                  <Text size="sm" weight="medium" className="text-text-primary">
                    1. Download & Extract the ZIP
                  </Text>
                  <Text size="xs" variant="secondary">
                    Click the &ldquo;Download (.zip)&rdquo; button above to save{' '}
                    <code className="text-text-primary bg-surface-active px-1.5 py-0.5 rounded font-mono text-[11px]">
                      ganegan-extension.zip
                    </code>{' '}
                    and extract it to a folder on your computer.
                  </Text>
                </Stack>
              </Flex>

              <Separator />

              <Flex align="start" gap="4">
                <Box className="p-2.5 rounded-xl bg-surface-active border border-border-subtle text-text-primary shrink-0 mt-0.5">
                  <Chrome size={18} />
                </Box>
                <Stack gap="1">
                  <Text size="sm" weight="medium" className="text-text-primary">
                    2. Open Extensions Page
                  </Text>
                  <Text size="xs" variant="secondary">
                    Navigate to{' '}
                    <code className="text-text-primary bg-surface-active px-1.5 py-0.5 rounded font-mono text-[11px]">
                      chrome://extensions
                    </code>{' '}
                    (or{' '}
                    <code className="text-text-primary bg-surface-active px-1.5 py-0.5 rounded font-mono text-[11px]">
                      brave://extensions
                    </code>
                    ) and turn ON the <strong>Developer mode</strong> toggle in the top-right corner.
                  </Text>
                </Stack>
              </Flex>

              <Separator />

              <Flex align="start" gap="4">
                <Box className="p-2.5 rounded-xl bg-surface-active border border-border-subtle text-text-primary shrink-0 mt-0.5">
                  <UploadCloud size={18} />
                </Box>
                <Stack gap="1">
                  <Text size="sm" weight="medium" className="text-text-primary">
                    3. Load Unpacked
                  </Text>
                  <Text size="xs" variant="secondary">
                    Click the <strong>Load unpacked</strong> button in the top-left and select the extracted folder. Return here and click &ldquo;Check Connection&rdquo;.
                  </Text>
                </Stack>
              </Flex>
            </Stack>
          </Stack>
        </Card>

        {/* Why it works */}
        <Card variant="glass" className="p-5 border-border-subtle">
          <Stack gap="2">
            <Flex align="center" gap="2">
              <ExternalLink size={16} className="text-text-secondary" />
              <Text size="sm" weight="semibold" className="text-text-primary">
                Why does GaneGan use a companion extension?
              </Text>
            </Flex>
            <Text size="xs" variant="secondary" className="leading-relaxed">
              Cloud servers (AWS Lightsail, Vercel, DigitalOcean) are datacenter IP ranges that YouTube blocks with aggressive bot checks. The GaneGan extension routes audio requests through your browser&apos;s own residential network connection, ensuring 100% reliable ad-free playback without third-party proxy dependencies or audio compression.
            </Text>
          </Stack>
        </Card>
      </Stack>
    </Container>
  );
}
