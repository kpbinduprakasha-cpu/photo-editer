import React from 'react';
import { Layers, Clock, Sparkles, MoveRight } from 'lucide-react';
import type { Storyboard, ImageItem } from '../types';
import { getFileUrl } from '../api';

interface StoryboardViewerProps {
  storyboard: Storyboard | null;
  images: ImageItem[];
}

export const StoryboardViewer: React.FC<StoryboardViewerProps> = ({
  storyboard,
  images,
}) => {
  if (!storyboard || !storyboard.scenes || storyboard.scenes.length === 0) {
    return null;
  }

  const imageMap = new Map(images.map((img) => [img.id, img]));

  return (
    <div className="card-panel">
      <div className="panel-header">
        <div className="flex items-center gap-2">
          <Layers className="text-orange-400" size={18} />
          <div>
            <h2 className="panel-title">Storyboard & Narrative Sequence</h2>
            <p className="text-xs text-zinc-400">
              Title: <strong className="text-zinc-200">"{storyboard.title}"</strong> • Total Duration: {storyboard.total_duration_seconds}s
            </p>
          </div>
        </div>
        <span className="photo-count-badge">
          {storyboard.scenes.length} Scenes Orchestrated
        </span>
      </div>

      <div className="storyboard-grid">
        {storyboard.scenes.map((scene, idx) => {
          const imgItem = imageMap.get(scene.image_id) || images[idx % images.length];

          return (
            <div key={`scene-${idx}`} className="scene-card">
              <div className="scene-preview-wrap">
                {imgItem ? (
                  <img
                    src={getFileUrl(imgItem.preview_url)}
                    alt={scene.filename}
                    className="scene-img"
                  />
                ) : (
                  <div className="scene-placeholder" />
                )}

                <div className="scene-number-tag">Scene {idx + 1}</div>

                <div className="scene-duration-tag">
                  <Clock size={11} />
                  <span>{scene.duration_seconds}s</span>
                </div>
              </div>

              <div className="scene-details">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span className="effect-badge">
                    <MoveRight size={10} />
                    <span>Transition: {scene.transition}</span>
                  </span>
                  <span className="effect-badge effect-badge-amber">
                    <Sparkles size={10} />
                    <span>Pan/Zoom: {scene.ken_burns_effect}</span>
                  </span>
                </div>

                {scene.caption ? (
                  <div className="scene-caption-box">
                    <p className="scene-caption-text">"{scene.caption}"</p>
                  </div>
                ) : (
                  <p className="text-xs text-zinc-500 italic">No caption overlay</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
