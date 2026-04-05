type ChannelType = 'rectangular' | 'trapezoidal' | 'circular' | 'triangular';

interface Props {
  channelType: ChannelType;
  depth: number;
  width?: number;
  bottomWidth?: number;
  sideSlope?: number;
  diameter?: number;
  triSideSlope?: number;
  topWidth?: number | null;
  flow?: number;
  n?: number;
  slope?: number;
}

const SVG_W = 580;
const SVG_H = 360;
const SOIL_COLOR = '#94a3b8';
const WATER_COLOR = '#60a5fa';
const DIM_COLOR = '#1e293b';
const FREEBOARD_COLOR = '#ef4444';

function Arrow({ x1, y1, x2, y2, id }: { x1: number; y1: number; x2: number; y2: number; id: string }) {
  return (
    <>
      <defs>
        <marker id={id} markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
          <path d="M0,0 L0,6 L6,3 z" fill={DIM_COLOR} />
        </marker>
        <marker id={`${id}r`} markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto-start-reverse">
          <path d="M0,0 L0,6 L6,3 z" fill={DIM_COLOR} />
        </marker>
      </defs>
      <line
        x1={x1} y1={y1} x2={x2} y2={y2}
        stroke={DIM_COLOR}
        strokeWidth="1"
        markerEnd={`url(#${id})`}
        markerStart={`url(#${id}r)`}
      />
    </>
  );
}

function DimLine({ x1, y1, x2, y2, label, labelX, labelY, id }: {
  x1: number; y1: number; x2: number; y2: number;
  label: string; labelX: number; labelY: number; id: string;
}) {
  return (
    <g>
      <Arrow x1={x1} y1={y1} x2={x2} y2={y2} id={id} />
      <text x={labelX} y={labelY} textAnchor="middle" fontSize="11" fill={DIM_COLOR} fontFamily="monospace">
        {label}
      </text>
    </g>
  );
}

export function ChannelCrossSectionSVG({
  channelType, depth,
  width = 2, bottomWidth = 2, sideSlope = 1.5,
  diameter = 1.2, triSideSlope = 2,
  topWidth, flow, n, slope,
}: Props) {
  const svgId = 'channel-cross-section';

  function downloadSVG() {
    const el = document.getElementById(svgId);
    if (!el) return;
    const data = new XMLSerializer().serializeToString(el);
    const blob = new Blob([data], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `seccion_${channelType}_${Date.now()}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ── Layout constants ────────────────────────────────────────────────────────
  const cx = SVG_W / 2;
  const baseY = SVG_H - 80;    // bottom of channel
  const rightDimX = SVG_W - 40;

  // Freeboard = 25% of depth for open channels, remaining for circular
  const freeboard = channelType === 'circular' ? (diameter - depth) : depth * 0.25;
  const totalH = depth + freeboard;

  // Scale: channel occupies ~55% of SVG width, 55% of height
  const maxDrawW = SVG_W * 0.55;
  const maxDrawH = SVG_H * 0.55;

  // ── Section geometry ────────────────────────────────────────────────────────
  type SectionSVG = {
    channelPts: string;    // polygon points for channel outline
    waterPts: string;      // polygon points for water fill
    freebordY: number;     // Y coordinate of freeboard top
    waterSurfY: number;    // Y coordinate of water surface
    channelBottomY: number;
    leftX: number;         // bottom-left X
    rightX: number;        // bottom-right X
    topLeftX: number;      // top-left X (for full section height)
    topRightX: number;
    waterLeftX: number;    // water surface left X
    waterRightX: number;
    actualTopWidth: number; // T in meters
  };

  let sec: SectionSVG;

  if (channelType === 'rectangular') {
    const scale = Math.min(maxDrawW / width, maxDrawH / totalH);
    const bPx = width * scale;
    const yPx = depth * scale;
    const fbPx = freeboard * scale;
    const lx = cx - bPx / 2;
    const rx = cx + bPx / 2;
    const wSurfY = baseY - yPx;
    const topY = wSurfY - fbPx;
    sec = {
      channelPts: `${lx},${topY} ${rx},${topY} ${rx},${baseY} ${lx},${baseY}`,
      waterPts: `${lx},${wSurfY} ${rx},${wSurfY} ${rx},${baseY} ${lx},${baseY}`,
      freebordY: topY,
      waterSurfY: wSurfY,
      channelBottomY: baseY,
      leftX: lx, rightX: rx,
      topLeftX: lx, topRightX: rx,
      waterLeftX: lx, waterRightX: rx,
      actualTopWidth: width,
    };
  } else if (channelType === 'trapezoidal') {
    const topW = bottomWidth + 2 * sideSlope * totalH;
    const scale = Math.min(maxDrawW / topW, maxDrawH / totalH);
    const bPx = bottomWidth * scale;
    const yPx = depth * scale;
    const fullHPx = totalH * scale;
    const lbx = cx - bPx / 2;
    const rbx = cx + bPx / 2;
    const topLx = lbx - sideSlope * fullHPx;
    const topRx = rbx + sideSlope * fullHPx;
    const wSurfY = baseY - yPx;
    const topY = baseY - fullHPx;
    const wLx = lbx - sideSlope * yPx;
    const wRx = rbx + sideSlope * yPx;
    sec = {
      channelPts: `${topLx},${topY} ${topRx},${topY} ${rbx},${baseY} ${lbx},${baseY}`,
      waterPts: `${wLx},${wSurfY} ${wRx},${wSurfY} ${rbx},${baseY} ${lbx},${baseY}`,
      freebordY: topY,
      waterSurfY: wSurfY,
      channelBottomY: baseY,
      leftX: lbx, rightX: rbx,
      topLeftX: topLx, topRightX: topRx,
      waterLeftX: wLx, waterRightX: wRx,
      actualTopWidth: bottomWidth + 2 * sideSlope * depth,
    };
  } else if (channelType === 'circular') {
    const scale = Math.min(maxDrawW / diameter, maxDrawH / diameter);
    const r = (diameter / 2) * scale;
    const cirCx = cx;
    const cirCy = baseY - r;
    const yPx = depth * scale;
    const waterY = cirCy + r - yPx;
    sec = {
      channelPts: '',  // handled separately with circle
      waterPts: '',
      freebordY: cirCy - r,
      waterSurfY: waterY,
      channelBottomY: cirCy + r,
      leftX: cirCx - r, rightX: cirCx + r,
      topLeftX: cirCx - r, topRightX: cirCx + r,
      waterLeftX: cirCx - r, waterRightX: cirCx + r,
      actualTopWidth: topWidth ?? diameter,
      // store extras for circular rendering
      ...(({ r, cirCx, cirCy, waterY } as unknown) as object),
    } as SectionSVG & { r: number; cirCx: number; cirCy: number; waterY: number };

    // Reassign properly
    const circSec = sec as SectionSVG & { r: number; cirCx: number; cirCy: number; waterY: number };
    circSec.r = r;
    circSec.cirCx = cirCx;
    circSec.cirCy = cirCy;
    circSec.waterY = waterY;
  } else {
    // Triangular
    const topW = 2 * triSideSlope * totalH;
    const scale = Math.min(maxDrawW / Math.max(topW, 0.1), maxDrawH / Math.max(totalH, 0.1));
    const yPx = depth * scale;
    const fullHPx = totalH * scale;
    const tipX = cx; const tipY = baseY;
    const topLx = tipX - triSideSlope * fullHPx;
    const topRx = tipX + triSideSlope * fullHPx;
    const wSurfY = baseY - yPx;
    const wLx = tipX - triSideSlope * yPx;
    const wRx = tipX + triSideSlope * yPx;
    sec = {
      channelPts: `${topLx},${tipY - fullHPx} ${topRx},${tipY - fullHPx} ${tipX},${tipY}`,
      waterPts: `${wLx},${wSurfY} ${wRx},${wSurfY} ${tipX},${tipY}`,
      freebordY: tipY - fullHPx,
      waterSurfY: wSurfY,
      channelBottomY: baseY,
      leftX: tipX, rightX: tipX,
      topLeftX: topLx, topRightX: topRx,
      waterLeftX: wLx, waterRightX: wRx,
      actualTopWidth: 2 * triSideSlope * depth,
    };
  }

  const isCircular = channelType === 'circular';
  const cs = sec as SectionSVG & { r?: number; cirCx?: number; cirCy?: number; waterY?: number };

  // Dimension labels
  const depthLabel = `y = ${depth.toFixed(2)} m`;
  const fbLabel = `BL = ${freeboard.toFixed(2)} m`;
  const bLabel = channelType === 'rectangular'
    ? `b = ${width.toFixed(2)} m`
    : channelType === 'trapezoidal'
    ? `b = ${bottomWidth.toFixed(2)} m`
    : channelType === 'circular'
    ? `D = ${diameter.toFixed(2)} m`
    : `z = ${triSideSlope.toFixed(1)}`;
  const tLabel = `T = ${(sec.actualTopWidth).toFixed(2)} m`;

  const sectionTitle =
    channelType === 'rectangular' ? 'Sección rectangular'
    : channelType === 'trapezoidal' ? 'Sección trapezoidal'
    : channelType === 'circular' ? 'Sección circular'
    : 'Sección triangular';

  return (
    <div className="space-y-2">
      <svg
        id={svgId}
        viewBox={`0 0 ${SVG_W} ${SVG_H}`}
        xmlns="http://www.w3.org/2000/svg"
        className="w-full border border-gray-100 rounded-lg bg-white"
        style={{ fontFamily: 'monospace' }}
      >
        {/* Background */}
        <rect width={SVG_W} height={SVG_H} fill="white" />

        {/* Title */}
        <text x={SVG_W / 2} y={22} textAnchor="middle" fontSize="13" fontWeight="bold" fill={DIM_COLOR}>
          {sectionTitle}
        </text>

        {/* Legend */}
        <text x={12} y={SVG_H - 10} fontSize="9.5" fill="#64748b">
          {[
            flow != null ? `Q = ${flow.toFixed(3)} m³/s` : null,
            n != null ? `n = ${n}` : null,
            slope != null ? `S = ${slope}` : null,
          ].filter(Boolean).join('   ·   ')}
        </text>

        {/* ── Channel section ─────────────────────────────────────────────── */}
        {!isCircular && (
          <>
            {/* Soil fill above water (freeboard zone) */}
            <polygon
              points={sec.channelPts}
              fill={SOIL_COLOR}
              fillOpacity="0.15"
              stroke={SOIL_COLOR}
              strokeWidth="2.5"
            />
            {/* Water fill */}
            <polygon
              points={sec.waterPts}
              fill={WATER_COLOR}
              fillOpacity="0.45"
            />
            {/* Water surface line */}
            <line
              x1={sec.waterLeftX} y1={sec.waterSurfY}
              x2={sec.waterRightX} y2={sec.waterSurfY}
              stroke="#2563eb" strokeWidth="1.5"
            />
            {/* Freeboard dashed line */}
            <line
              x1={sec.topLeftX} y1={sec.freebordY}
              x2={sec.topRightX} y2={sec.freebordY}
              stroke={FREEBOARD_COLOR} strokeWidth="1" strokeDasharray="5 3"
            />
          </>
        )}

        {isCircular && cs.r != null && cs.cirCx != null && cs.cirCy != null && cs.waterY != null && (
          <>
            <defs>
              <clipPath id="circClipSec">
                <circle cx={cs.cirCx} cy={cs.cirCy} r={cs.r} />
              </clipPath>
            </defs>
            <circle cx={cs.cirCx} cy={cs.cirCy} r={cs.r} fill={SOIL_COLOR} fillOpacity="0.15" stroke={SOIL_COLOR} strokeWidth="2.5" />
            <rect
              x={cs.cirCx - cs.r} y={cs.waterY}
              width={cs.r * 2} height={cs.cirCy + cs.r - cs.waterY}
              fill={WATER_COLOR} fillOpacity="0.45"
              clipPath="url(#circClipSec)"
            />
            {/* Water surface */}
            <line
              x1={cs.cirCx - cs.r} y1={cs.waterY}
              x2={cs.cirCx + cs.r} y2={cs.waterY}
              stroke="#2563eb" strokeWidth="1.5"
              clipPath="url(#circClipSec)"
            />
          </>
        )}

        {/* ── Dimension: depth y (right side) ─────────────────────────────── */}
        {!isCircular && (
          <DimLine
            x1={rightDimX - 10} y1={sec.waterSurfY}
            x2={rightDimX - 10} y2={sec.channelBottomY}
            label={depthLabel}
            labelX={rightDimX + 28}
            labelY={(sec.waterSurfY + sec.channelBottomY) / 2 + 4}
            id="dim-y"
          />
        )}
        {isCircular && cs.r != null && cs.cirCy != null && cs.waterY != null && (
          <DimLine
            x1={rightDimX - 10} y1={cs.waterY}
            x2={rightDimX - 10} y2={cs.cirCy + cs.r}
            label={depthLabel}
            labelX={rightDimX + 28}
            labelY={(cs.waterY + cs.cirCy + cs.r) / 2 + 4}
            id="dim-y-circ"
          />
        )}

        {/* ── Dimension: freeboard (right side, above water) ───────────────── */}
        {!isCircular && (
          <>
            <DimLine
              x1={rightDimX - 10} y1={sec.freebordY}
              x2={rightDimX - 10} y2={sec.waterSurfY}
              label={fbLabel}
              labelX={rightDimX + 28}
              labelY={(sec.freebordY + sec.waterSurfY) / 2 + 4}
              id="dim-fb"
            />
            {/* Freeboard label color override */}
            <text
              x={rightDimX + 28}
              y={(sec.freebordY + sec.waterSurfY) / 2 + 4}
              textAnchor="middle" fontSize="11"
              fill={FREEBOARD_COLOR} fontFamily="monospace"
            >
              {fbLabel}
            </text>
          </>
        )}

        {/* ── Dimension: bottom width b / diameter D (bottom) ─────────────── */}
        {channelType === 'rectangular' && (
          <DimLine
            x1={sec.leftX} y1={baseY + 18}
            x2={sec.rightX} y2={baseY + 18}
            label={bLabel}
            labelX={cx} labelY={baseY + 32}
            id="dim-b"
          />
        )}
        {channelType === 'trapezoidal' && (
          <>
            <DimLine
              x1={sec.leftX} y1={baseY + 18}
              x2={sec.rightX} y2={baseY + 18}
              label={bLabel}
              labelX={cx} labelY={baseY + 32}
              id="dim-b-trap"
            />
            {/* Top width T */}
            <DimLine
              x1={sec.topLeftX} y1={sec.freebordY - 14}
              x2={sec.topRightX} y2={sec.freebordY - 14}
              label={tLabel}
              labelX={cx} labelY={sec.freebordY - 22}
              id="dim-t"
            />
            {/* Slope label */}
            <text
              x={sec.topLeftX - 4} y={(sec.freebordY + baseY) / 2}
              textAnchor="end" fontSize="10" fill={DIM_COLOR}
            >
              z = {sideSlope.toFixed(1)}
            </text>
          </>
        )}
        {channelType === 'circular' && cs.r != null && cs.cirCx != null && cs.cirCy != null && (
          <DimLine
            x1={cs.cirCx - cs.r} y1={cs.cirCy}
            x2={cs.cirCx + cs.r} y2={cs.cirCy}
            label={bLabel}
            labelX={cx} labelY={cs.cirCy - 4}
            id="dim-d"
          />
        )}
        {channelType === 'triangular' && (
          <>
            {/* Water surface width T */}
            <DimLine
              x1={sec.waterLeftX} y1={sec.waterSurfY - 14}
              x2={sec.waterRightX} y2={sec.waterSurfY - 14}
              label={tLabel}
              labelX={cx} labelY={sec.waterSurfY - 22}
              id="dim-t-tri"
            />
            {/* Slope label */}
            <text
              x={sec.topLeftX - 4} y={(sec.freebordY + baseY) / 2}
              textAnchor="end" fontSize="10" fill={DIM_COLOR}
            >
              {bLabel}
            </text>
          </>
        )}

        {/* ── Water surface T label for rectangular/circular ───────────────── */}
        {(channelType === 'rectangular' || channelType === 'circular') && (
          <DimLine
            x1={sec.waterLeftX} y1={sec.waterSurfY - 14}
            x2={sec.waterRightX} y2={sec.waterSurfY - 14}
            label={tLabel}
            labelX={cx} labelY={sec.waterSurfY - 22}
            id="dim-t-rect"
          />
        )}

        {/* ── Legend symbols ───────────────────────────────────────────────── */}
        <rect x={12} y={36} width={12} height={8} fill={WATER_COLOR} fillOpacity="0.45" />
        <text x={28} y={44} fontSize="9.5" fill="#64748b">Agua (tirante y)</text>
        <line x1={60} y1={52} x2={72} y2={52} stroke={FREEBOARD_COLOR} strokeWidth="1" strokeDasharray="4 2" />
        <text x={76} y={56} fontSize="9.5" fill="#64748b">Borde libre</text>
      </svg>

      {/* Download button */}
      <button
        type="button"
        onClick={downloadSVG}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-300 bg-white text-xs font-medium text-gray-600 hover:bg-gray-50 hover:border-gray-400 transition-colors"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
        Descargar sección (SVG)
      </button>
    </div>
  );
}
