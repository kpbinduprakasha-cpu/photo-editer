import React from 'react';
import { Composition } from 'remotion';
import { ReelComposition, ReelCompositionProps } from './Composition';

const defaultProps: ReelCompositionProps = {
  title: 'FotoOwl Reel',
  aspectRatio: '9:16',
  scenes: [],
  musicEnabled: true,
  captionsEnabled: true,
};

export const Root: React.FC = () => {
  return (
    <>
      <Composition
        id="ReelComposition"
        component={ReelComposition}
        durationInFrames={450}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={defaultProps}
      />
    </>
  );
};
