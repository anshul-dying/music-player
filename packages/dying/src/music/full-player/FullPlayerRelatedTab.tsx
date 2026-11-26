import React from "react";
import { Disc, Music2, Play } from "lucide-react";
import { EmptyState } from "../../components/Feedback";

export interface RelatedItem {
  id: string;
  title: string;
  subtitle?: string;
  type?: "song" | "album" | "playlist" | "artist";
  thumbnail?: string;
  thumbnailUrl?: string;
  videoId?: string;
  browseId?: string;
}

export interface FullPlayerRelatedTabProps {
  related: RelatedItem[];
  onSelectRelated?: (item: RelatedItem) => void;
}

export const FullPlayerRelatedTab: React.FC<FullPlayerRelatedTabProps> = ({
  related = [],
  onSelectRelated,
}) => {
  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="pb-3 mb-2 border-b border-border-subtle shrink-0 px-2">
        <h3 className="text-sm font-bold uppercase tracking-wider text-text-primary">
          Related tracks & albums
        </h3>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar space-y-2 pr-1">
        {related.length > 0 ? (
          related.map((item) => {
            const itemThumb = item.thumbnailUrl || item.thumbnail;
            return (
              <div
                key={item.id}
                role="button"
                tabIndex={0}
                onClick={() => onSelectRelated?.(item)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelectRelated?.(item);
                  }
                }}
                className="group flex items-center justify-between p-2.5 rounded-xl hover:bg-surface-hover/80 transition-all cursor-pointer select-none border border-transparent hover:border-border-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
              >
                <div className="flex items-center min-w-0 flex-1 mr-3">
                  <div className="relative h-11 w-11 shrink-0 rounded-lg overflow-hidden bg-surface border border-border-subtle mr-3">
                    {itemThumb ? (
                      <img src={itemThumb} alt={item.title} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-white/[0.04] text-text-tertiary">
                        {item.type === "album" ? <Disc size={20} /> : <Music2 size={20} />}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm font-medium text-text-primary group-hover:text-white truncate">
                      {item.title}
                    </span>
                    <span className="text-xs text-text-secondary truncate">
                      {item.subtitle || item.type || "Track"}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  aria-label={`Play ${item.title}`}
                  className="opacity-0 group-hover:opacity-100 flex h-8 w-8 items-center justify-center rounded-full text-white bg-white/[0.1] hover:bg-white/[0.2] transition-all cursor-pointer"
                >
                  <Play size={14} className="fill-current ml-0.5" />
                </button>
              </div>
            );
          })
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center py-12 text-center">
            <EmptyState
              title="No related recommendations"
              description="Recommendations will appear as more tracks are explored."
              className="border-0 border-none bg-transparent rounded-none py-8 px-4"
            />
          </div>
        )}
      </div>
    </div>
  );
};

FullPlayerRelatedTab.displayName = "FullPlayerRelatedTab";
