import React from 'react';
import { FaTh, FaList } from 'react-icons/fa';

type ViewMode = 'cards' | 'table';

interface ViewToggleProps {
  currentView: ViewMode;
  onViewChange: (view: ViewMode) => void;
  className?: string;
}

const ViewToggle: React.FC<ViewToggleProps> = ({
  currentView,
  onViewChange,
  className = ''
}) => {
  return (
    <div className={`flex items-center bg-white rounded-lg border p-1 ${className}`}>
      <button
        type="button"
        onClick={() => onViewChange('cards')}
        className={`px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
          currentView === 'cards'
            ? 'bg-primary text-white'
            : 'text-gray-700 hover:bg-gray-100'
        }`}
        title="Vista de tarjetas"
      >
        <FaTh size={14} />
        <span className="hidden sm:inline">Tarjetas</span>
      </button>
      <button
        type="button"
        onClick={() => onViewChange('table')}
        className={`px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
          currentView === 'table'
            ? 'bg-primary text-white'
            : 'text-gray-700 hover:bg-gray-100'
        }`}
        title="Vista de tabla"
      >
        <FaList size={14} />
        <span className="hidden sm:inline">Tabla</span>
      </button>
    </div>
  );
};

export default ViewToggle;
