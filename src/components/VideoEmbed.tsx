import { cn } from '@/lib/utils';
import { getVideoEmbedUrl } from '@/lib/helpers';
import { effectiveIsReel, isDirectVideoUrl, type ReelFields } from '@/lib/videoDisplay';

type VideoEmbedProps = {
  videoUrl: string;
  title: string;
  className?: string;
};

/**
 * Renders YouTube iframe or HTML5 video for direct URLs; no layout/aspect wrapper.
 */
export function VideoEmbed({ videoUrl, title, className }: VideoEmbedProps) {
  const embedUrl = getVideoEmbedUrl(videoUrl);

  if (embedUrl) {
    return (
      <iframe
        title={title}
        src={embedUrl}
        className={cn('w-full h-full border-0', className)}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    );
  }

  if (isDirectVideoUrl(videoUrl)) {
    return (
      <video
        src={videoUrl}
        controls
        playsInline
        preload="metadata"
        className={cn('w-full h-full object-contain bg-black', className)}
      >
        {title}
      </video>
    );
  }

  return (
    <div
      className={cn(
        'w-full h-full bg-black flex items-center justify-center text-muted-foreground text-sm px-4 text-center',
        className
      )}
    >
      Unsupported or invalid video URL
    </div>
  );
}

type VideoFrameProps = {
  children: React.ReactNode;
  isReel: boolean;
  className?: string;
};

/** Aspect ratio container: 9:16 for reels (centered, max width), 16:9 for landscape. */
export function VideoFrame({ children, isReel, className }: VideoFrameProps) {
  return (
    <div
      className={cn(
        'relative w-full overflow-hidden rounded-lg bg-black',
        isReel
          ? 'aspect-[9/16] max-w-[min(100%,min(360px,85vw))] mx-auto shadow-lg'
          : 'aspect-video',
        className
      )}
    >
      {children}
    </div>
  );
}

type ResponsiveVideoPlayerProps = {
  videoUrl: string;
  title: string;
  reel?: ReelFields;
  className?: string;
};

/** Embed + correct aspect ratio for reels vs landscape. */
export function ResponsiveVideoPlayer({ videoUrl, title, reel, className }: ResponsiveVideoPlayerProps) {
  const isReel = reel ? effectiveIsReel(reel) : effectiveIsReel({ video_url: videoUrl });
  return (
    <VideoFrame isReel={isReel} className={className}>
      <VideoEmbed videoUrl={videoUrl} title={title} />
    </VideoFrame>
  );
}
