import { memo } from 'react';
import Svg, { Defs, LinearGradient, Path, Stop, Circle } from 'react-native-svg';
import { colors } from '../theme';

/** Tiny price chart: line with a soft fill, colored by direction, with a dot on the latest price. */
function SparklineImpl({ points, width, height }: { points: number[]; width: number; height: number }) {
  const data = points.length >= 2 ? points : [points[0] ?? 1, points[0] ?? 1];
  const min = Math.min(...data);
  const max = Math.max(...data);
  const span = max - min || max * 0.01 || 1;
  const pad = 3;
  const xy = data.map((p, i) => [
    (i / (data.length - 1)) * (width - pad * 2) + pad,
    height - pad - ((p - min) / span) * (height - pad * 2),
  ]);
  const line = xy.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`).join('');
  const area = `${line}L${xy[xy.length - 1][0].toFixed(1)} ${height}L${xy[0][0].toFixed(1)} ${height}Z`;
  const up = data[data.length - 1] >= data[0];
  const color = up ? colors.green : colors.danger;
  const id = up ? 'sparkUp' : 'sparkDown';
  const [lx, ly] = xy[xy.length - 1];

  return (
    <Svg width={width} height={height}>
      <Defs>
        <LinearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={color} stopOpacity="0.35" />
          <Stop offset="1" stopColor={color} stopOpacity="0" />
        </LinearGradient>
      </Defs>
      <Path d={area} fill={`url(#${id})`} />
      <Path d={line} stroke={color} strokeWidth={2} fill="none" strokeLinejoin="round" strokeLinecap="round" />
      <Circle cx={lx} cy={ly} r={3.5} fill={color} />
    </Svg>
  );
}

export const Sparkline = memo(SparklineImpl);
