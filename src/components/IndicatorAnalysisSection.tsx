
import React from 'react';
import { Brain, AlertCircle, X, Loader2 } from 'lucide-react';

type LocalAnalysisType = 'lastPeriod' | 'yearlyConsolidated' | 'yearlyComparison';

interface IndicatorAnalysisSectionProps {
    type: LocalAnalysisType;
    label: string;
    analysis?: string;
    error?: string;
    loading: boolean;
    disabled: boolean;
    onTrigger: (type: LocalAnalysisType) => void;
    onClose: (type: LocalAnalysisType) => void;
}

export const IndicatorAnalysisSection: React.FC<IndicatorAnalysisSectionProps> = ({
    type,
    label,
    analysis,
    error,
    loading,
    disabled,
    onTrigger,
    onClose
}) => {
    return (
        <div>
            <button
              onClick={() => { if (!disabled) onTrigger(type); }}
              disabled={disabled || loading}
              className="w-full bg-accent hover:bg-accent-focus text-white font-semibold py-2 px-3 text-xs rounded-md shadow-md transition duration-150 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {loading ? <Loader2 size={16} className="mr-2 animate-spin" /> : <Brain size={16} className="mr-2" />}
              {loading ? 'Analisando...' : `Analisar: ${label}`}
            </button>
            {analysis && (
              <div className="relative mt-2 p-3 pt-5 bg-green-50 border border-green-200 rounded-md shadow-sm">
                <button 
                  onClick={() => onClose(type)} 
                  className="absolute top-1 right-1 p-0.5 bg-gray-200 hover:bg-gray-300 rounded-full text-gray-500 hover:text-gray-700 transition-colors" 
                  aria-label="Fechar análise"
                >
                  <X size={14} />
                </button>
                <pre className="text-xs text-green-800 whitespace-pre-wrap font-sans">{analysis}</pre>
              </div>
            )}
            {error && (
              <div className="mt-1 p-1.5 bg-red-50 border border-red-200 rounded-md text-xs text-error flex items-center">
                <AlertCircle size={14} className="mr-1.5 flex-shrink-0" /> {error}
              </div>
            )}
      </div>
    );
};