import React from 'react';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';

interface DraggableCardProps {
  id: string;
  data?: Record<string, any>;
  droppableData?: Record<string, any>;
  children: React.ReactNode;
  disabled?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export const DraggableCard: React.FC<DraggableCardProps> = ({ id, data, droppableData, children, disabled = false, className = '', style: propStyle }) => {
  const { attributes, listeners, setNodeRef: setDragNodeRef, transform, isDragging } = useDraggable({
    id,
    data,
    disabled,
  });

  const { setNodeRef: setDropNodeRef } = useDroppable({
    id,
    data: droppableData,
    disabled: !droppableData
  });

  const setMergedRef = (node: HTMLElement | null) => {
    setDragNodeRef(node);
    if (droppableData) {
      setDropNodeRef(node);
    }
  };

  const style: React.CSSProperties = {
    ...propStyle,
    transform: CSS.Translate.toString(transform) || propStyle?.transform,
    opacity: isDragging ? 0 : (propStyle?.opacity !== undefined ? propStyle.opacity : 1),
    touchAction: 'none', // Important for pointer events
    cursor: disabled ? 'default' : 'grab',
  };

  return (
    <div ref={setMergedRef} style={style} {...listeners} {...attributes} className={className}>
      {children}
    </div>
  );
};
