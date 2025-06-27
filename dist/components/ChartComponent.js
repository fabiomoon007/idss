import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
const ChartComponent = ({ data, valueLabel, isRate }) => {
    if (!data || data.length === 0) {
        return _jsx("p", { className: "text-sm text-gray-500 mt-4", children: "Sem dados peri\u00F3dicos preenchidos para o ano atual." });
    }
    return (_jsx("div", { className: "h-64 w-full mt-4", children: _jsx(ResponsiveContainer, { width: "100%", height: "100%", children: _jsxs(BarChart, { data: data, margin: { top: 5, right: 20, left: 0, bottom: 5 }, children: [_jsx(CartesianGrid, { strokeDasharray: "3 3" }), _jsx(XAxis, { dataKey: "periodLabel", tick: { fontSize: 10 } }), _jsx(YAxis, { tickFormatter: isRate ? (value) => `${value}%` : (value) => value.toString(), tick: { fontSize: 10 }, domain: ['auto', 'auto'] }), _jsx(Tooltip, { formatter: (value, name, props) => {
                            const formattedValue = isRate ? `${Number(value).toFixed(2)}%` : Number(value).toFixed(2);
                            return [formattedValue, valueLabel];
                        } }), _jsx(Legend, { formatter: () => valueLabel }), _jsx(Bar, { dataKey: "value", name: valueLabel, children: data.map((entry, index) => (_jsx(Cell, { fill: entry.fillColor }, `cell-${index}`))) })] }) }) }));
};
export default ChartComponent;
//# sourceMappingURL=ChartComponent.js.map