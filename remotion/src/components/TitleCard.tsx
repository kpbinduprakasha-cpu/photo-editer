import React from 'react';
import { interpolate, useCurrentFrame, spring, useVideoConfig } from 'remotion';

interface TitleCardProps {
  title: string;
  durationInFrames: number;
}

export const TitleCard: React.FC<TitleCardProps> = ({ title, durationInFrames }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  if (!title) return null;

  const anim = spring({
    frame,
    fps,
    config: { damping: 16, stiffness: 100 },
  });

  const scale = interpolate(anim, [0, 1], [0.85, 1.0]);
  const opacity = interpolate(
    frame,
    [0, 10, durationInFrames - 15, durationInFrames],
    [0, 1, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  return (
    <div
      style={{
        position: 'absolute',
        top: '15%',
        left: '6%',
        right: '6%',
        zIndex: 30,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        opacity,
        transform: `scale(${scale})`,
      }}
    >
      <div
        style={{
          background: 'linear-gradient(135deg, rgba(234, 88, 12, 0.9), rgba(217, 70, 239, 0.85))',
          padding: '6px 20px',
          borderRadius: '999px',
          marginBottom: '12px',
          boxShadow: '0 4px 14px rgba(234, 88, 12, 0.4)',
        }}
      >
        <span
          style={{
            fontFamily: 'system-ui, sans-serif',
            fontSize: '18px',
            fontWeight: 700,
            color: '#ffffff',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
          }}
        >
          Featured Story
        </span>
      </div>
      <h1
        style={{
          fontFamily: 'Inter, system-ui, sans-serif',
          fontSize: '48px',
          fontWeight: 800,
          color: '#ffffff',
          textAlign: 'center',
          margin: 0,
          textShadow: '0 4px 20px rgba(0,0,0,0.8)',
          letterSpacing: '-0.03em',
          lineHeight: 1.15,
        }}
      >
        {title}
      </h1>
    </div>
  );
};
