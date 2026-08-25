import React from 'react';
import {
  BarChart, Bar, LineChart, Line, ScatterChart, Scatter,
  PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import type { ChartData } from '../../types';

interface ChartRendererProps {
  chart: ChartData;
}

const PALETTE = ['#4f8ef7', '#7c5cfc', '#f0456a', '#10d98a', '#f5a623', '#22d3ee', '#ec4899'];

const CUSTOM_TOOLTIP_STYLE = {
  backgroundColor: '#0f1628',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '8px',
  color: '#e8edf8',
  fontSize: '11px',
  fontFamily: 'JetBrains Mono, monospace',
  boxShadow: '0 10px 25px -5px rgba(0,0,0,0.5)',
};

const AXIS_TICK_STYLE = {
  fill: '#8b9cc8',
  fontSize: 10,
  fontFamily: 'JetBrains Mono, monospace',
};

const GRID_COLOR = 'rgba(255,255,255,0.05)';

export const ChartRenderer: React.FC<ChartRendererProps> = ({ chart }) => {
  const margin = { top: 10, right: 10, left: -15, bottom: 20 };

  switch (chart.type) {
    case 'bar':
      return (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chart.data} margin={margin}>
            <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} vertical={false} />
            <XAxis
              dataKey={chart.x_key}
              tick={AXIS_TICK_STYLE}
              axisLine={{ stroke: GRID_COLOR }}
              tickLine={false}
            />
            <YAxis
              tick={AXIS_TICK_STYLE}
              axisLine={{ stroke: GRID_COLOR }}
              tickLine={false}
            />
            <Tooltip contentStyle={CUSTOM_TOOLTIP_STYLE} cursor={{ fill: 'rgba(79,142,247,0.05)' }} />
            <Bar dataKey={chart.y_key} fill="#7c5cfc" radius={[4, 4, 0, 0]}>
              {chart.data.map((_, index) => (
                <Cell key={`cell-${index}`} fill={PALETTE[index % PALETTE.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      );

    case 'line':
      return (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chart.data} margin={margin}>
            <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} vertical={false} />
            <XAxis
              dataKey={chart.x_key}
              tick={AXIS_TICK_STYLE}
              axisLine={{ stroke: GRID_COLOR }}
              tickLine={false}
            />
            <YAxis
              tick={AXIS_TICK_STYLE}
              axisLine={{ stroke: GRID_COLOR }}
              tickLine={false}
            />
            <Tooltip contentStyle={CUSTOM_TOOLTIP_STYLE} />
            <Line
              type="monotone"
              dataKey={chart.y_key}
              stroke="#7c5cfc"
              strokeWidth={2.5}
              dot={{ fill: '#7c5cfc', r: 3, strokeWidth: 1, stroke: '#fff' }}
              activeDot={{ r: 5, fill: '#4f8ef7' }}
            />
          </LineChart>
        </ResponsiveContainer>
      );

    case 'scatter':
      return (
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={margin}>
            <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} />
            <XAxis
              dataKey={chart.x_key}
              name={chart.x_key}
              tick={AXIS_TICK_STYLE}
              axisLine={{ stroke: GRID_COLOR }}
              tickLine={false}
            />
            <YAxis
              dataKey={chart.y_key}
              name={chart.y_key}
              tick={AXIS_TICK_STYLE}
              axisLine={{ stroke: GRID_COLOR }}
              tickLine={false}
            />
            <Tooltip contentStyle={CUSTOM_TOOLTIP_STYLE} />
            <Scatter data={chart.data} fill="#10d98a" opacity={0.7} />
          </ScatterChart>
        </ResponsiveContainer>
      );

    case 'pie':
    case 'donut':
      return (
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chart.data}
              dataKey={chart.y_key}
              nameKey={chart.x_key}
              cx="50%"
              cy="50%"
              innerRadius={chart.type === 'donut' ? 42 : 0}
              outerRadius={65}
              paddingAngle={3}
            >
              {chart.data.map((_, index) => (
                <Cell key={`cell-${index}`} fill={PALETTE[index % PALETTE.length]} stroke="rgba(0,0,0,0.3)" />
              ))}
            </Pie>
            <Tooltip contentStyle={CUSTOM_TOOLTIP_STYLE} />
            <Legend
              wrapperStyle={{ fontSize: '10px', fontFamily: 'JetBrains Mono, monospace', color: '#8b9cc8' }}
            />
          </PieChart>
        </ResponsiveContainer>
      );

    case 'histogram':
      return (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chart.data} margin={margin}>
            <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} vertical={false} />
            <XAxis
              dataKey={chart.x_key}
              tick={{ ...AXIS_TICK_STYLE, fontSize: 9 }}
              axisLine={{ stroke: GRID_COLOR }}
              tickLine={false}
            />
            <YAxis
              tick={AXIS_TICK_STYLE}
              axisLine={{ stroke: GRID_COLOR }}
              tickLine={false}
            />
            <Tooltip contentStyle={CUSTOM_TOOLTIP_STYLE} cursor={{ fill: 'rgba(124,92,252,0.05)' }} />
            <Bar dataKey={chart.y_key} fill="#7c5cfc" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      );

    default:
      return (
        <div className="flex items-center justify-center h-full text-[#4a5a80] text-[11px] font-mono">
          Unsupported chart type: {(chart as any).type}
        </div>
      );
  }
};
