import React, { ReactNode } from 'react';

interface EmptyStateProps {
  title: string;
  message: string;
  icon?: ReactNode;
  actionText?: string;
  onActionClick?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ title, message, icon, actionText, onActionClick }) => {
  return (
    <div className="text-center py-16">
      {icon && <div className="mx-auto text-6xl text-gray-400 mb-4">{icon}</div>}
      <h3 className="text-2xl font-semibold text-gray-800 mb-2">{title}</h3>
      <p className="text-gray-600 mb-6">{message}</p>
      {actionText && onActionClick && (
        <button
          onClick={onActionClick}
          className="bg-blue-500 text-white font-bold py-2 px-4 rounded hover:bg-blue-600"
        >
          {actionText}
        </button>
      )}
    </div>
  );
};