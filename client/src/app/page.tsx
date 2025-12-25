'use client';

import React, { useState } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { Type, Image as ImageIcon, PenTool, Calendar, CheckSquare, Save } from 'lucide-react';
import dynamic from 'next/dynamic';

const PdfViewer = dynamic(() => import('@/components/PdfViewer'), { ssr: false });
import DraggableField from '@/components/DraggableField';

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [signedPdfUrl, setSignedPdfUrl] = useState<string | null>(null);
  const [isSigning, setIsSigning] = useState(false);

  const [fields, setFields] = useState<any[]>([]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSave = async () => {
    if (!file) return;

    try {
      setIsSigning(true);

      // Find the first signature field
      const signatureField = fields.find(f => f.type === 'SIGNATURE');

      if (!signatureField) {
        alert('Please place a signature field first.');
        setIsSigning(false);
        return;
      }

      // Convert fields to backend expected format
      // We need to deal with coordinates. 
      // The PdfViewer gives us percentages (x, y, width, height).
      // We assume the backend can handle percentages OR we convert them here if we knew the PDF dimensions.
      // But the backend `pdf-lib` needs POINTS.
      // Easiest way: Pass percentages to backend, and let backend calculate absolute position based on PDF page size.
      // Wait, my backend logic `pdfController` expected absolute values x, y, width, height. 
      // I should update backend to accept percentages OR calculate here.
      // Let's calculate here for better control if we had the PDF stats.
      // Since `react-pdf` gives us rendered width/height, we can do:
      // But we don't have the original PDF dimensions easily without parsing it.
      // Let's ACTUALLY update the backend to take 'percentage' or simply use the coordinates passed.
      // If I pass 600 as width to the backend `signPdf` (which I hardcoded in PdfViewer `render`), 
      // and I passed x, y in pixels relative to that 600 width.
      // Let's modify `PdfViewer` to return relative pixels to the rendered size?
      // Actually `PdfViewer` returned percentages. 
      // Let's say we pass percentages. Backend loads PDF, gets width/height (say 595x842).
      // x = (xPercent / 100) * 595.
      // This is robust against screen resizing.

      // We need a dummy signature image.
      // In a real app, user would draw a signature.
      // Here we'll use a 1x1 base64 string or a simple placeholder provided by the user (or just a hardcoded one for prototype).
      // Helper to convert file to base64
      const fileToBase64 = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = error => reject(error);
        });
      };

      const pdfBase64 = await fileToBase64(file);

      // Restore realistic signature placeholder
      const signatureImage = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAJYAAAAyCAYAAAC0iH0OAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAABwSURBVHgB7dCxDQAACAMwx/9/2BwQD0RckZtJ13WdF4+AWEAsIBYQC4gFxAJiAbGAWEAsIBYQC4gFxAJiAbGAWEAsIBYQC4gFxAJiAbGAWEAsIBYQC4gFxAJiAbGAWEAsIBYQC4gFxAJiAbGAWEAsIL4xsA1149j/yAAAAABJRU5ErkJggg==";

      const payload = {
        pdfId: 'temp-id',
        pdfBase64: pdfBase64, // Send the actual file
        signatureImage: signatureImage,
        x: signatureField.x,
        y: signatureField.y,
        width: signatureField.width,
        height: signatureField.height,
        pageIndex: (signatureField.page || 1) - 1,
        isPercentage: true
      };

      console.log('Sending payload:', JSON.stringify(payload, null, 2));

      const response = await fetch(`https://ass5-full.onrender.com/api/pdf/sign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      console.log('Server response:', data);

      if (response.ok) {
        setSignedPdfUrl(`https://ass5-full.onrender.com${data.fileUrl}`);
      } else {
        console.error('Sign Error:', data);
        alert('Error signing PDF: ' + (data.message || 'Unknown error'));
      }

    } catch (err: any) {
      console.error('Fetch Error:', err);
      alert('Failed to sign: ' + (err.message || 'Network error'));
    } finally {
      setIsSigning(false);
    }
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <main className="flex min-h-screen flex-col bg-gray-50">

        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center sticky top-0 z-50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">B</div>
            <h1 className="text-xl font-semibold text-gray-800 tracking-tight">BoloForms <span className="text-gray-400 font-light">| Signature Engine</span></h1>
          </div>

          <div className="flex items-center gap-4">
            <input
              type="file"
              accept="application/pdf"
              onChange={handleFileChange}
              className="text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
            {signedPdfUrl && (
              <a
                href={signedPdfUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-sm"
              >
                View Signed PDF
              </a>
            )}
          </div>
        </header>

        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar Tools */}
          <aside className="w-64 bg-white border-r border-gray-200 p-6 flex flex-col gap-6 overflow-y-auto z-40 shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
            <div>
              <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Fields</h2>
              <div className="flex flex-col gap-3">
                <DraggableField type="SIGNATURE" label="Signature" icon={PenTool} />
                <DraggableField type="TEXT" label="Text Box" icon={Type} />
                <DraggableField type="IMAGE" label="Image" icon={ImageIcon} />
                <DraggableField type="DATE" label="Date" icon={Calendar} />
                <DraggableField type="CHECKBOX" label="Checkbox" icon={CheckSquare} />
              </div>
            </div>

            <div className="mt-auto">
              <button
                onClick={() => {
                  // We need a reference to the fields from PdfViewer to save.
                  // I'll force a save action via a ref or context in a real app.
                  // For this prototype, I'll pass the save triggers differently or lift state up.
                  // I'll lift state up in next iteration or just rely on PdfViewer bubbling up changes?
                  // Let's modify PdfViewer to expose fields or have a ref.
                  // Actually, I can just pass a "Save" button INTO the PdfViewer or right here if I lift state.

                  alert("Please drop a signature field on the PDF and click the floating action button that appears (not implemented), or I'll add a save button in the main area.");
                }}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Reset
              </button>
            </div>
          </aside>

          {/* Main Workspace */}
          <div className="flex-1 bg-gray-100/50 p-8 overflow-auto flex justify-center relative">
            <div className="w-full max-w-4xl">
              <PdfViewer
                file={file}
                fields={fields}
                onFieldsChange={setFields}
              />
            </div>
          </div>

          {/* Floating Save Button (Simulated 'Burn In') */}
          {file && (
            <div className="fixed bottom-8 right-8">
              <button
                onClick={handleSave}
                className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-transform hover:scale-105"
              >
                <Save size={20} />
                <span>Burn In Signature</span>
              </button>
            </div>
          )}
        </div>
      </main>
    </DndProvider>
  );
}
