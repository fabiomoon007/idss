import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { IDSSIndicatorWeightLevel } from '../types';
const IndicatorWeightBar = ({ level }) => {
    let bgColor = '';
    let label = '';
    let textColor = 'text-gray-700'; // Default text color
    switch (level) {
        case IDSSIndicatorWeightLevel.HIGH: // Corresponds to user's "Peso 1" (Red)
            bgColor = 'bg-red-500';
            label = 'Importância: Alta (Peso 3 no Doc. ANS)';
            textColor = 'text-red-700';
            break;
        case IDSSIndicatorWeightLevel.MEDIUM: // Corresponds to user's "Peso 2" (Yellow)
            bgColor = 'bg-yellow-500';
            label = 'Importância: Média (Peso 2 no Doc. ANS)';
            textColor = 'text-yellow-700';
            break;
        case IDSSIndicatorWeightLevel.LOW: // Corresponds to user's "Peso 3" (Green)
            bgColor = 'bg-green-500';
            label = 'Importância: Baixa (Peso 1 no Doc. ANS)';
            textColor = 'text-green-700';
            break;
        default:
            return null;
    }
    return (_jsxs("div", { className: "flex items-center mt-1 mb-3", title: label, children: [_jsx("span", { className: `text-xs font-medium mr-2 ${textColor}`, children: "Relev\u00E2ncia IDSS:" }), _jsx("div", { className: `w-20 h-2.5 rounded-full ${bgColor} shadow-sm` })] }));
};
export default IndicatorWeightBar;
//# sourceMappingURL=IndicatorWeightBar.js.map