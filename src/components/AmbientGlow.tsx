import { memo } from 'react';
import './AmbientGlow.css';

function AmbientGlow() {
  return <div className="ambient-glow-stack" aria-hidden="true" />;
}

export default memo(AmbientGlow);
