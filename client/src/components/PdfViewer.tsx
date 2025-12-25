'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { useDrop } from 'react-dnd';
import { Trash2, ChevronLeft, ChevronRight } from 'lucide-react';

// Configure worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

export interface DroppedField {
    id: string;
    type: string;
    label: string;
    x: number; // Percentage
    y: number; // Percentage
    width: number; // Percentage
    height: number; // Percentage
    value?: string;
    page: number; // 1-based page number
}

interface PdfViewerProps {
    file: string | File | null;
    fields: DroppedField[];
    onFieldsChange: (fields: DroppedField[]) => void;
}

const PdfViewer: React.FC<PdfViewerProps> = ({ file, fields, onFieldsChange }) => {
    const [numPages, setNumPages] = useState<number>(0);
    const [pageNumber, setPageNumber] = useState<number>(1);
    const [selectedField, setSelectedField] = useState<string | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Fix: Use ref for fields to access latest state in useDrop without recreating the hook
    const fieldsRef = useRef(fields);
    useEffect(() => {
        fieldsRef.current = fields;
    }, [fields]);

    const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
        setNumPages(numPages);
        setPageNumber(1);
    };

    // Stable drop handler
    const [, drop] = useDrop(() => ({
        accept: 'FIELD',
        drop: (item: { type: string; label: string }, monitor) => {
            const offset = monitor.getClientOffset();
            const containerRect = containerRef.current?.getBoundingClientRect();

            if (offset && containerRect) {
                const x = offset.x - containerRect.left;
                const y = offset.y - containerRect.top;

                const xPercent = (x / containerRect.width) * 100;
                const yPercent = (y / containerRect.height) * 100;

                const newField: DroppedField = {
                    id: Math.random().toString(36).substr(2, 9),
                    type: item.type,
                    label: item.label,
                    x: xPercent,
                    y: yPercent,
                    width: item.type === 'CHECKBOX' ? 5 : 20, // Smaller default for checkbox
                    height: item.type === 'CHECKBOX' ? 3 : 5,
                    value: '',
                    page: pageNumber // Match current page
                };

                // Use ref to get latest fields
                onFieldsChange([...fieldsRef.current, newField]);
            }
        },
    }), [pageNumber, onFieldsChange]); // Depend on pageNumber so we drop on correct page

    const handleRemoveField = (id: string) => {
        onFieldsChange(fields.filter(f => f.id !== id));
        setSelectedField(null);
    };

    const handleFieldChange = (id: string, value: string) => {
        onFieldsChange(fields.map(f => f.id === id ? { ...f, value } : f));
    }

    const toggleCheckbox = (id: string) => {
        const field = fields.find(f => f.id === id);
        if (!field) return;
        const newValue = field.value === 'true' ? 'false' : 'true';
        handleFieldChange(id, newValue);
    }

    const handleResizeStart = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        const field = fields.find(f => f.id === id);
        if (!field) return;

        const startX = e.clientX;
        const startY = e.clientY;
        const startWidth = field.width;
        const startHeight = field.height;
        const containerRect = containerRef.current?.getBoundingClientRect();

        if (!containerRect) return;

        const handleMouseMove = (moveEvent: MouseEvent) => {
            const deltaX = moveEvent.clientX - startX;
            const deltaY = moveEvent.clientY - startY;

            const deltaWidthPercent = (deltaX / containerRect.width) * 100;
            const deltaHeightPercent = (deltaY / containerRect.height) * 100;

            const newWidth = Math.max(2, startWidth + deltaWidthPercent);
            const newHeight = Math.max(2, startHeight + deltaHeightPercent);

            onFieldsChange(fields.map(f =>
                f.id === id ? { ...f, width: newWidth, height: newHeight } : f
            ));
        };

        const handleMouseUp = () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    };

    const renderFieldInput = (field: DroppedField) => {
        switch (field.type) {
            case 'TEXT':
                return (
                    <input
                        type="text"
                        value={field.value || ''}
                        placeholder="Type..."
                        onChange={(e) => handleFieldChange(field.id, e.target.value)}
                        className="w-full h-full bg-transparent border-none outline-none text-xs p-1 resize-none font-bold text-blue-900"
                        style={{ fontSize: 'inherit' }}
                    />
                );
            case 'DATE':
                return (
                    <input
                        type="date"
                        value={field.value || ''}
                        onChange={(e) => handleFieldChange(field.id, e.target.value)}
                        className="w-full h-full bg-transparent border-none outline-none text-xs p-1 font-bold text-blue-900"
                    />
                );
            case 'CHECKBOX':
                return (
                    <div className="flex items-center justify-center w-full h-full">
                        <input
                            type="checkbox"
                            checked={field.value === 'true'}
                            onChange={() => toggleCheckbox(field.id)}
                            className="w-4 h-4 cursor-pointer text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                    </div>
                );
            case 'SIGNATURE':
                return (
                    <div className="flex items-center justify-center w-full h-full bg-blue-50 text-blue-800 text-xs font-bold border border-blue-200">
                        Signature
                    </div>
                );
            default:
                return <span className="text-xs font-bold text-blue-800 pointer-events-none select-none">{field.label}</span>;
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-[500px] bg-gray-100 p-4 rounded-xl relative">
            {file && (
                <div className="mb-4 flex items-center gap-4 bg-white px-4 py-2 rounded-lg shadow-sm z-50 border border-gray-200">
                    <button
                        disabled={pageNumber <= 1}
                        onClick={() => setPageNumber(prev => prev - 1)}
                        className="p-1 hover:bg-gray-100 rounded-full disabled:opacity-30 transition-colors"
                        title="Previous Page"
                    >
                        <ChevronLeft className="w-5 h-5 text-gray-700" />
                    </button>
                    <span className="font-medium text-gray-700 select-none min-w-[100px] text-center">
                        Page {pageNumber} of {numPages || '--'}
                    </span>
                    <button
                        disabled={pageNumber >= numPages}
                        onClick={() => setPageNumber(prev => prev + 1)}
                        className="p-1 hover:bg-gray-100 rounded-full disabled:opacity-30 transition-colors"
                        title="Next Page"
                    >
                        <ChevronRight className="w-5 h-5 text-gray-700" />
                    </button>
                </div>
            )}

            {!file ? (
                <div className="text-gray-400">No PDF selected</div>
            ) : (
                <div ref={(node) => { if (drop) drop(node); }} className="relative shadow-lg border border-gray-300 bg-white">
                    <div ref={containerRef} className="relative inline-block">
                        <Document
                            file={file}
                            onLoadSuccess={onDocumentLoadSuccess}
                            className="flex flex-col items-center"
                        >
                            <Page
                                pageNumber={pageNumber}
                                renderTextLayer={false}
                                renderAnnotationLayer={false}
                                width={600}
                            />
                        </Document>

                        {/* Overlay Fields - Filter by current Page */}
                        {fields.filter(f => f.page === pageNumber).map((field) => (
                            <div
                                key={field.id}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedField(field.id);
                                }}
                                style={{
                                    position: 'absolute',
                                    left: `${field.x}%`,
                                    top: `${field.y}%`,
                                    width: `${field.width}%`,
                                    height: `${field.height}%`,
                                }}
                                className={`absolute border-2 cursor-pointer flex items-center justify-center group
                            ${selectedField === field.id ? 'border-blue-600 z-50 bg-blue-50/50' : 'border-blue-400 border-dashed hover:border-solid z-10 bg-blue-100/30'}
                        `}
                            >
                                {renderFieldInput(field)}

                                {selectedField === field.id && (
                                    <>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleRemoveField(field.id);
                                            }}
                                            className="absolute -top-3 -right-3 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 shadow-sm z-50"
                                        >
                                            <Trash2 size={12} />
                                        </button>

                                        {/* Resize Handle */}
                                        <div
                                            onMouseDown={(e) => handleResizeStart(e, field.id)}
                                            className="absolute bottom-0 right-0 w-4 h-4 bg-blue-600 rounded-tl cursor-se-resize z-50"
                                        />
                                    </>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default PdfViewer;
