import React, { useState } from "react";
import { Dialog as RadixDialog, VisuallyHidden as RadixVisuallyHidden } from "radix-ui";
import { Menu, X } from "lucide-react";
import { cn } from "../utils/cn";

export interface AppShellProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Fixed left navigation sidebar slot.
   */
  sidebar?: React.ReactNode;

  /**
   * Top navigation or search header slot.
   */
  header?: React.ReactNode;

  /**
   * Floating bottom player dock slot (e.g. FloatingPlayerPill).
   */
  playerDock?: React.ReactNode;

  /**
   * Bottom player dock variant: 'floating' (default) or 'docked' (full-width bottom bar).
   */
  playerDockVariant?: 'floating' | 'docked';

  /**
   * Whether children stage content should be full-bleed (no max-w or padding, e.g. Watch view).
   */
  isFullBleed?: boolean;

  /**
   * Full immersion overlay slot (e.g. SyncedLyrics immersion view or modals).
   */
  overlay?: React.ReactNode;

  /**
   * Main scrollable stage content.
   */
  children: React.ReactNode;

  /**
   * Optional custom styling for the inner content container.
   */
  stageClassName?: string;
}

/**
 * AppShell: Apple Music & YouTube Music dark responsive frame.
 * Features:
 * - Desktop: fixed 240px left sidebar rail.
 * - Mobile/Tablet: accessible slide-over drawer with Radix Dialog focus trapping & backdrop blur.
 * - Full-width scrollable main stage with scrollbar locked cleanly to the right edge.
 * - Centered floating bottom player dock.
 * - Full-screen overlay portal slot (e.g. Synced Lyrics).
 */
export const AppShell = React.forwardRef<HTMLDivElement, AppShellProps>(
  (
    {
      className,
      sidebar,
      header,
      playerDock,
      playerDockVariant = 'floating',
      isFullBleed = false,
      overlay,
      children,
      stageClassName,
      ...props
    },
    ref
  ) => {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    return (
      <div
        ref={ref}
        className={cn(
          "relative flex h-screen w-full overflow-hidden bg-canvas text-text-primary antialiased select-none",
          className
        )}
        {...props}
      >
        {/* Desktop Fixed Left Navigation Sidebar Rail */}
        {sidebar && (
          <aside className="relative shrink-0 z-20 h-screen hidden lg:flex">
            {sidebar}
          </aside>
        )}

        {/* Mobile Slide-Over Drawer with Radix Dialog (Full WCAG focus trap & aria-modal) */}
        {sidebar && (
          <RadixDialog.Root open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
            <RadixDialog.Portal>
              <RadixDialog.Overlay
                className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md transition-opacity data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
              />
              <RadixDialog.Content
                aria-describedby={undefined}
                className={cn(
                  "fixed inset-y-0 left-0 z-50 h-full w-[260px] max-w-[85vw] bg-sidebar border-r border-border-subtle shadow-2xl flex flex-col focus:outline-none",
                  "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left duration-300"
                )}
              >
                <RadixVisuallyHidden.Root>
                  <RadixDialog.Title>Navigation Menu</RadixDialog.Title>
                </RadixVisuallyHidden.Root>

                <div className="absolute top-3.5 right-3 z-30">
                  <RadixDialog.Close asChild>
                    <button
                      type="button"
                      className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                      aria-label="Close navigation menu"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </RadixDialog.Close>
                </div>

                <div
                  className="h-full overflow-y-auto"
                  onClick={(e) => {
                    if ((e.target as HTMLElement).closest("a, button")) {
                      setIsMobileMenuOpen(false);
                    }
                  }}
                >
                  {sidebar}
                </div>
              </RadixDialog.Content>
            </RadixDialog.Portal>
          </RadixDialog.Root>
        )}

        {/* Scrollable Main Content Stage */}
        <div className="relative flex flex-1 flex-col h-screen min-w-0 overflow-hidden">
          {/* Mobile Top Header (lg:hidden) */}
          {!isFullBleed && (
            <header className="lg:hidden flex items-center justify-between h-14 px-4 border-b border-border-subtle bg-sidebar shrink-0 z-30 select-none">
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(true)}
                className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                aria-label="Open navigation menu"
              >
                <Menu className="h-5 w-5" />
              </button>
              <div className="text-sm font-semibold tracking-tight text-white flex items-center gap-2">
                <span>GaneGan</span>
              </div>
              <div className="w-9" aria-hidden="true" />
            </header>
          )}

          {/* Global / Desktop Header Slot */}
          {header && (
            <div className="shrink-0 z-20 w-full border-b border-border-subtle bg-canvas/80 backdrop-blur-xl">
              {header}
            </div>
          )}

          {/* Full-width scrollable viewport (scrollbar stays at the far right edge) */}
          <main
            className={cn(
              "relative flex-1 w-full overflow-x-hidden",
              isFullBleed ? "overflow-y-hidden" : "overflow-y-auto scroll-smooth"
            )}
          >
            {/* Responsive centered content container */}
            <div
              className={cn(
                isFullBleed
                  ? "w-full h-full p-0"
                  : "w-full max-w-7xl mx-auto px-4 sm:px-6 md:px-8 lg:px-10 py-6 md:py-8",
                stageClassName
              )}
            >
              {children}
            </div>

            {/* Bottom spacer ensuring scrollable content clears the player dock */}
            {playerDock && !isFullBleed && (
              <div
                className={cn(
                  "w-full shrink-0",
                  playerDockVariant === "docked" ? "h-24" : "h-28 sm:h-32"
                )}
                aria-hidden="true"
              />
            )}
          </main>
        </div>

        {/* Bottom Player Dock Slot */}
        {playerDock && (
          <div
            className={cn(
              "z-40 flex",
              playerDockVariant === "docked"
                ? "fixed bottom-0 inset-x-0 w-full"
                : "pointer-events-none fixed bottom-3 sm:bottom-6 inset-x-0 justify-center px-2 sm:px-4"
            )}
          >
            {playerDock}
          </div>
        )}

        {/* Full Immersion Overlay Slot (e.g. Synced Lyrics / Modals) */}
        {overlay && (
          <div className="fixed inset-0 z-50 overflow-hidden">
            {overlay}
          </div>
        )}
      </div>
    );
  }
);

AppShell.displayName = "AppShell";
