import React from 'react';
import { interpolate, useCurrentFrame, spring, useVideoConfig } from 'remotion';

interface CaptionOverlayProps {
  caption: string;
  durationInFrames: number;
}

export const CaptionOverlay: React.FC<CaptionOverlayProps> = ({
  caption,
  durationInFrames,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  if (!caption) return null;

  const entrance = spring({
    frame,
    fps,
    config: { damping: 14, stiffness: 120 },
  });

  const translateY = interpolate(entrance, [0, 1], [40, 0]);
  const opacity = interpolate(
    frame,
    [0, 15, durationInFrames - 15, durationInFrames],
    [0, 1, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  return (
    <div
      style={{
        position: 'absolute',
        bottom: '12%',
        left: '5%',
        right: '5%',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 20,
        opacity,
        transform: `translateY(${translateY}px)`,
      }}
    >
      <div
        style={{
          background: 'rgba(15, 17, 23, 0.78)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          borderRadius: '16px',
          padding: '16px 28px',
          boxShadow: '0 12px 32px rgba(0, 0, 0, 0.5)',
          maxWidth: '90%',
          textAlign: 'center',
        }}
      >
        <span
          style={{
            fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
            fontSize: '32px',
            fontWeight: 600,
            color: '#ffffff',
            letterSpacing: '-0.02em',
            textShadow: '0 2px 4px rgba(0,0,0,0.6)',
          }}
        >
          {caption}
        </span>
      </div>
    </div>
  );
};
