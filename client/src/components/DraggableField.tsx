'use client';

import React from 'react';
import { useDrag } from 'react-dnd';
import { LucideIcon } from 'lucide-react';

interface DraggableFieldProps {
    type: string;
    label: string;
    icon: LucideIcon;
}

const DraggableField: React.FC<DraggableFieldProps> = ({ type, label, icon: Icon }) => {
    const [{ isDragging }, drag] = useDrag(() => ({
        type: 'FIELD',
        item: { type, label },
        collect: (monitor) => ({
            isDragging: monitor.isDragging(),
        }),
    }));

    return (
        <div
            ref={(node) => {
                drag(node);
            }}
            className={`flex items-center gap-2 p-3 bg-white rounded-lg border border-gray-200 shadow-sm cursor-move transition-all ${isDragging ? 'opacity-50 ring-2 ring-blue-500' : 'hover:border-blue-400 hover:shadow-md'
                }`}
        >
            <Icon className="w-5 h-5 text-gray-600" />
            <span className="font-medium text-gray-700">{label}</span>
        </div>
    );
};

export default DraggableField;
