'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Box, Button, Card, Grainient } from '@mp/dying';

export interface AuthPageShellProps {
  children: React.ReactNode;
  backHref?: string;
  backLabel?: string;
}

export function AuthPageShell({
  children,
  backHref = '/',
  backLabel = 'Back to GaneGan',
}: AuthPageShellProps) {
  const router = useRouter();

  return (
    <Box className="relative min-h-screen w-full flex items-center justify-center p-4 sm:p-6 overflow-hidden bg-canvas select-none">
      <Grainient
          colors={["#09090b", "#141416", "#2a1210", "#D6452B", "#FF6A4D"]}
          angle={55}
          flow={0.8}
          silk={0.35}
          grainAmount={0.075}
          type="linear"
          bands={1}
          softness={1}
          scale={1}
          speed={1}
          grainSize={1.2}
          grainAnimated
          contrast={1.08}
          saturation={0.9}
          variation={0}
          interactive
          stir={1}
          clickSwirl
          intro
          lightMode={false}
          className="fixed inset-0 pointer-events-none"
      />

      <Box className="absolute top-6 left-16 sm:top-8 sm:left-16 z-20">
        <Button
          variant="glass"
          size="sm"
          leftIcon={<ArrowLeft size={15} />}
          onClick={() => router.push(backHref)}
        >
          {backLabel}
        </Button>
      </Box>

      <Card
        variant="glass"
        className="relative z-10 w-full max-w-[420px] p-6 sm:p-7 backdrop-blur-3xl shadow-2xl rounded-2xl border-border-subtle bg-surface/90"
      >
        {children}
      </Card>
    </Box>
  );
}
