import React from 'react';
import { TelemetrySummary } from '../../shared/types';

interface Props {
  telemetry: TelemetrySummary;
}

const TelemetryPanel: React.FC<Props> = ({ telemetry }) => {
  const fastest = telemetry.laps.length
    ? telemetry.laps.reduce((best, lap) => (lap.lapTimeMs < best ? lap.lapTimeMs : best), telemetry.laps[0].lapTimeMs)
    : 0;
  return (
    <div className="telemetry-panel">
      <div className="telemetry-header">
        <h3>Telemetry</h3>
        <p className="muted">{telemetry.sourceName}</p>
      </div>
      <div className="telemetry-section">
        <h4>Lap Times</h4>
        <div className="lap-list">
          {telemetry.laps.map((lap) => (
            <div key={lap.lap} className="lap-row">
              <span>Lap {lap.lap}</span>
              <div className="lap-bar" style={{ width: fastest ? `${(fastest / lap.lapTimeMs) * 100}%` : '0%' }} />
              <span>{(lap.lapTimeMs / 1000).toFixed(2)}s</span>
            </div>
          ))}
        </div>
      </div>
      <div className="telemetry-section">
        <h4>Tyre Edge Temps</h4>
        <div className="tyre-grid">
          {telemetry.laps.slice(0, 6).map((lap) => (
            <div key={`temps-${lap.lap}`} className="tyre-card">
              <div className="card-title">Lap {lap.lap}</div>
              <div className="tyre-temp-row">FL: {lap.tyreTemps.frontLeft.outer.toFixed(1)}° / {lap.tyreTemps.frontLeft.inner.toFixed(1)}°</div>
              <div className="tyre-temp-row">FR: {lap.tyreTemps.frontRight.outer.toFixed(1)}° / {lap.tyreTemps.frontRight.inner.toFixed(1)}°</div>
              <div className="tyre-temp-row">RL: {lap.tyreTemps.rearLeft.outer.toFixed(1)}° / {lap.tyreTemps.rearLeft.inner.toFixed(1)}°</div>
              <div className="tyre-temp-row">RR: {lap.tyreTemps.rearRight.outer.toFixed(1)}° / {lap.tyreTemps.rearRight.inner.toFixed(1)}°</div>
            </div>
          ))}
        </div>
      </div>
      <div className="telemetry-section">
        <h4>Wheel Speeds Snapshot</h4>
        <div className="wheel-speed-grid">
          {telemetry.laps.slice(0, 6).map((lap) => (
            <div key={`speed-${lap.lap}`} className="wheel-speed-card">
              <div className="card-title">Lap {lap.lap}</div>
              <div className="wheel-row">FL {lap.wheelSpeeds.frontLeft.toFixed(1)} km/h</div>
              <div className="wheel-row">FR {lap.wheelSpeeds.frontRight.toFixed(1)} km/h</div>
              <div className="wheel-row">RL {lap.wheelSpeeds.rearLeft.toFixed(1)} km/h</div>
              <div className="wheel-row">RR {lap.wheelSpeeds.rearRight.toFixed(1)} km/h</div>
            </div>
          ))}
        </div>
      </div>
      <p className="muted">Insights are correlated with setup deltas when telemetry is available.</p>
    </div>
  );
};

export default TelemetryPanel;
