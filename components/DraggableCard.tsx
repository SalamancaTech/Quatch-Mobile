import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';

interface DraggableCardProps {
  id: string;
  data?: Record<string, any>;
  children: React.ReactNode;
  disabled?: boolean;
  className?: string;
}

export const DraggableCard: React.FC<DraggableCardProps> = ({ id, data, children, disabled = false, className = '' }) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id,
    data,
    disabled,
  });

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0 : 1, // Hide the original element while dragging (the overlay will show it)
    touchAction: 'none', // Important for pointer events
    cursor: disabled ? 'default' : 'grab',
  };

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes} className={className}>
      {children}
    </div>
  );
};
