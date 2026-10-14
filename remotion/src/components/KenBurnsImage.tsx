import React from 'react';
import { interpolate, useCurrentFrame, Img } from 'remotion';

interface KenBurnsImageProps {
  imagePath: string;
  durationInFrames: number;
  effect?: 'zoom_in' | 'zoom_out' | 'pan_left' | 'pan_right' | string;
}

export const KenBurnsImage: React.FC<KenBurnsImageProps> = ({
  imagePath,
  durationInFrames,
  effect = 'zoom_in',
}) => {
  const frame = useCurrentFrame();

  let scale = 1.0;
  let translateX = 0;
  let translateY = 0;

  if (effect === 'zoom_in') {
    scale = interpolate(frame, [0, durationInFrames], [1.0, 1.18], {
      extrapolateRight: 'clamp',
    });
  } else if (effect === 'zoom_out') {
    scale = interpolate(frame, [0, durationInFrames], [1.18, 1.0], {
      extrapolateRight: 'clamp',
    });
  } else if (effect === 'pan_left') {
    scale = 1.15;
    translateX = interpolate(frame, [0, durationInFrames], [0, -35], {
      extrapolateRight: 'clamp',
    });
  } else if (effect === 'pan_right') {
    scale = 1.15;
    translateX = interpolate(frame, [0, durationInFrames], [-35, 0], {
      extrapolateRight: 'clamp',
    });
  }

  // Fade-in at start, fade-out at end
  const opacity = interpolate(
    frame,
    [0, 10, durationInFrames - 10, durationInFrames],
    [0, 1, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        backgroundColor: '#0a0a0c',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        opacity,
      }}
    >
      {/* Blurred background glow */}
      <img
        src={imagePath}
        alt=""
        style={{
          position: 'absolute',
          width: '110%',
          height: '110%',
          objectFit: 'cover',
          filter: 'blur(30px) brightness(0.4)',
          transform: `scale(${scale})`,
        }}
      />
      {/* Sharp foreground image */}
      <img
        src={imagePath}
        alt="Reel scene"
        style={{
          position: 'relative',
          maxWidth: '100%',
          maxHeight: '100%',
          objectFit: 'contain',
          transform: `scale(${scale}) translate(${translateX}px, ${translateY}px)`,
          boxShadow: '0 20px 50px rgba(0,0,0,0.8)',
        }}
      />
    </div>
  );
};
