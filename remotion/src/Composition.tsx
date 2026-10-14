import React from 'react';
import { Sequence } from 'remotion';
import { CaptionOverlay } from './components/CaptionOverlay';
import { KenBurnsImage } from './components/KenBurnsImage';
import { TitleCard } from './components/TitleCard';

export interface SceneItem {
  sceneIndex: number;
  imageId: string;
  filename: string;
  imagePath: string;
  durationInFrames: number;
  startFrame: number;
  caption?: string;
  transition?: string;
  kenBurnsEffect?: string;
  overlayTitle?: string;
}

export interface ReelCompositionProps {
  title: string;
  aspectRatio: string;
  scenes: SceneItem[];
  musicEnabled?: boolean;
  captionsEnabled?: boolean;
}

export const ReelComposition: React.FC<ReelCompositionProps> = ({
  title,
  scenes = [],
  captionsEnabled = true,
}) => {
  return (
    <div
      style={{
        flex: 1,
        backgroundColor: '#050508',
        position: 'relative',
        width: '100%',
        height: '100%',
      }}
    >
      {scenes.map((scene, idx) => (
        <Sequence
          key={`scene-${idx}-${scene.imageId}`}
          from={scene.startFrame}
          durationInFrames={scene.durationInFrames}
        >
          <KenBurnsImage
            imagePath={scene.imagePath}
            durationInFrames={scene.durationInFrames}
            effect={scene.kenBurnsEffect || 'zoom_in'}
          />

          {idx === 0 && scene.overlayTitle && (
            <TitleCard
              title={scene.overlayTitle || title}
              durationInFrames={Math.min(90, scene.durationInFrames)}
            />
          )}

          {captionsEnabled && scene.caption && (
            <CaptionOverlay
              caption={scene.caption}
              durationInFrames={scene.durationInFrames}
            />
          )}
        </Sequence>
      ))}
    </div>
  );
};
