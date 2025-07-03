
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';

export interface PeriodicChartDataPoint {
  periodLabel: string;
  value: number; // Actual result value for the period
  fillColor: string; // Color determined by the score of this period's value
}

interface ChartComponentProps {
  data: PeriodicChartDataPoint[];
  valueLabel: string;
  isRate?: boolean;
}

export const ChartComponent: React.FC<ChartComponentProps> = ({ data, valueLabel, isRate }) => {
  if (!data || data.length === 0) {
    return <p className="text-sm text-gray-500 mt-4">Sem dados periódicos preenchidos para o ano atual.</p>;
  }
  
  return (
    <div className="h-64 w-full mt-4">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
          <XAxis dataKey="periodLabel" tick={{ fontSize: 10, fill: '#6b7280' }} />
          <YAxis 
            tickFormatter={isRate ? (value: number) => `${value}%` : (value: number) => value.toString()} 
            tick={{ fontSize: 10, fill: '#6b7280' }}
            domain={['auto', 'auto']}
          />
          <Tooltip 
            contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e0e0e0', borderRadius: '0.5rem' }}
            labelStyle={{ color: '#1f2937', fontWeight: 'bold' }}
            formatter={(value: number, name: string, props: any) => {
              const formattedValue = isRate ? `${Number(value).toFixed(2)}%` : Number(value).toFixed(3);
              return [formattedValue, valueLabel];
            }}
          />
          <Legend formatter={(value) => <span className="text-gray-700">{value}</span>} />
          <Bar dataKey="value" name={valueLabel}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.fillColor} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};