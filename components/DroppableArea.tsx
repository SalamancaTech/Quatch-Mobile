import React from 'react';
import { useDroppable } from '@dnd-kit/core';

interface DroppableAreaProps {
  id: string;
  data?: Record<string, any>;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  disabled?: boolean;
}

export const DroppableArea: React.FC<DroppableAreaProps> = ({ id, data, children, className = '', style, disabled = false }) => {
  const { setNodeRef, isOver } = useDroppable({
    id,
    data,
    disabled
  });

  const finalStyle = {
    ...style,
  };

  return (
    <div ref={setNodeRef} className={`${className} ${isOver ? 'ring-2 ring-blue-400' : ''}`} style={finalStyle}>
      {children}
    </div>
  );
};
