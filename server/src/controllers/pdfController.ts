import { Request, Response } from 'express';
import { PDFDocument } from 'pdf-lib';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import mongoose from 'mongoose';
import SignedDocument from '../models/SignedDocument';

// Helper to calculate SHA-256 hash of a buffer
const calculateHash = (buffer: Buffer): string => {
    return crypto.createHash('sha256').update(buffer).digest('hex');
};

export const signPdf = async (req: Request, res: Response): Promise<void> => {
    console.log('--- Received Sign Request ---');
    console.log('Body:', JSON.stringify(req.body, null, 2));

    try {
        const { pdfId, signatureImage, x, y, width, height, pageIndex } = req.body;

        if (!signatureImage || x === undefined || y === undefined || width === undefined || height === undefined) {
            console.error('Missing required fields');
            res.status(400).json({ message: 'Missing required fields' });
            return;
        }

        // In a real app, we would fetch the PDF based on pdfId. 
        // For this prototype, we'll use a sample PDF stored locally or fetched from a URL.
        // Let's assume there is a sample.pdf in the server root or assets folder.
        // For simplicity, let's just use a dummy empty PDF if one doesn't exist, OR strictly require a sample.pdf.
        // I'll create a sample PDF if it doesn't exist for testing.

        let existingPdfBytes: Buffer;

        if (req.body.pdfBase64) {
            console.log('Using provided PDF from request body...');
            const base64Data = req.body.pdfBase64.split(',')[1];
            existingPdfBytes = Buffer.from(base64Data, 'base64');
        } else {
            const samplePdfPath = path.join(__dirname, '../../sample.pdf');
            console.log('Sample PDF Path resolved to:', samplePdfPath);

            if (!fs.existsSync(samplePdfPath)) {
                console.log('Sample PDF not found, creating new one...');
                // Create a basic blank PDF for testing if not present
                const doc = await PDFDocument.create();
                const page = doc.addPage([595.28, 841.89]); // A4
                page.drawText('Sample Contract for Signature', { x: 50, y: 700, size: 20 });
                page.drawText('Please sign below:', { x: 50, y: 600, size: 12 });
                const pdfBytes = await doc.save();
                fs.writeFileSync(samplePdfPath, pdfBytes);
                console.log('Sample PDF created.');
            }
            console.log('Reading PDF...');
            existingPdfBytes = fs.readFileSync(samplePdfPath);
        }

        // 1. Calculate Audit Hash (Before)
        const originalHash = calculateHash(existingPdfBytes);
        console.log('Original Hash:', originalHash);

        // 2. Load PDF
        console.log('Loading PDF Document...');
        const pdfDoc = await PDFDocument.load(existingPdfBytes);

        // 3. Embed Signature Image
        console.log('Embedding Image...');

        // DEBUG: Force Red Dot image to rule out corruption
        const debugSignature = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUAAAAFCAYAAACNbyblAAAAHElEQVQI12P4//8/w38GIAXDIBKE0DHxgljNBAAO9TXL0Y4OHwAAAABJRU5ErkJggg==";
        const base64Data = debugSignature.split(',')[1];

        const imageBytes = Buffer.from(base64Data, 'base64');

        let embeddedImage;
        try {
            console.log('Detected PNG (Forced Debug), calling embedPng...');
            embeddedImage = await pdfDoc.embedPng(imageBytes);
            console.log('embedPng returned successfully.');
        } catch (embedError) {
            console.error('CRITICAL ERROR during embedding:', embedError);
            throw new Error('Failed to embed image: ' + (embedError as Error).message);
        }
        console.log('Image embedded object created.');

        // 4. Calculate Dimensions (Aspect Ratio Constraint)
        const imgDims = embeddedImage.scale(1);
        const imgWidth = imgDims.width;
        const imgHeight = imgDims.height;

        // Get PDF Page Dimensions
        const pages = pdfDoc.getPages();
        const page = pages[pageIndex || 0];
        const { width: pageWidth, height: pageHeight } = page.getSize();

        console.log(`Page Size: ${pageWidth}x${pageHeight}`);

        let finalX, finalY, boxWidth, boxHeight;

        if (req.body.isPercentage) {
            // Convert Percentage to Points
            // x and y in body are top-left based percentages
            // pdf-lib logic: (0,0) is bottom-left

            // Calculate box dimensions in points
            boxWidth = (Number(width) / 100) * pageWidth;
            boxHeight = (Number(height) / 100) * pageHeight; // Note: 'height' acts as percentage here

            // Calculate X and Y in points
            // Client X % -> Page X Points
            finalX = (Number(x) / 100) * pageWidth;

            // Client Y % -> Page Y Points
            // Since Client Y is from Top, we need to flip it.
            // Client Top Y = 10% -> 0.1 * H from Top.
            // PDF Y = H - (0.1 * H) - boxHeight (because PDF Y is bottom of the object usually? No, PDF lib drawsImage at bottom-left of image)
            // Correct: PDF Y = PageHeight - (TopY_Pixels + Height_Pixels)
            //          PDF Y = PageHeight - ((y/100 * PageHeight) + (height/100 * PageHeight))

            finalY = pageHeight - ((Number(y) / 100) * pageHeight) - boxHeight;

        } else {
            // Absolute logic (legacy/fallback)
            boxWidth = Number(width);
            boxHeight = Number(height);
            finalX = Number(x);
            finalY = Number(y);
        }

        console.log(`Calculated Box: x=${finalX}, y=${finalY}, w=${boxWidth}, h=${boxHeight}`);

        // Calculate scale factor to fit CONTAIN within the box
        const scaleX = boxWidth / imgWidth;
        const scaleY = boxHeight / imgHeight;
        const scale = Math.min(scaleX, scaleY);

        const newWidth = imgWidth * scale;
        const newHeight = imgHeight * scale;

        // Center the image in the box
        // New X = BoxStartX + (BoxWidth - ImgWidth)/2
        const xOffset = (boxWidth - newWidth) / 2;
        // New Y = BoxStartY + (BoxHeight - ImgHeight)/2
        const yOffset = (boxHeight - newHeight) / 2;

        const drawX = finalX + xOffset;
        const drawY = finalY + yOffset;

        console.log(`Drawing Image at: x=${drawX}, y=${drawY}, w=${newWidth}, h=${newHeight}`);

        // 5. Draw Image
        page.drawImage(embeddedImage, {
            x: drawX,
            y: drawY,
            width: newWidth,
            height: newHeight,
        });

        // 6. Save Signed PDF
        console.log('Saving PDF...');
        const pdfBytes = await pdfDoc.save();

        // 7. Calculate Audit Hash (After)
        const finalHash = calculateHash(Buffer.from(pdfBytes));

        // Save to disk (uploads folder)
        const uploadsDir = path.join(__dirname, '../../uploads');
        if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
        }

        const fileName = `signed_${Date.now()}.pdf`;
        const filePath = path.join(uploadsDir, fileName);
        fs.writeFileSync(filePath, pdfBytes);
        console.log('PDF saved to:', filePath);

        // 8. Store Audit Trail
        // Check if mongoose is connected
        if (mongoose.connection.readyState === 1) {
            const signedDoc = new SignedDocument({
                originalHash,
                finalHash,
                pdfId: pdfId || 'sample-pdf',
                filePath: filePath
            });
            await signedDoc.save();
            console.log('Audit trail saved to DB.');
        } else {
            console.warn('MongoDB not connected, skipping audit trail save.');
        }

        // 9. Return URL
        // Assuming we serve uploads statically
        const fileUrl = `/uploads/${fileName}`;

        res.status(200).json({
            message: 'PDF signed successfully',
            fileUrl,
            originalHash,
            finalHash
        });

    } catch (error) {
        console.error('Error signing PDF:', error);
        res.status(500).json({ message: 'Internal Server Error', error: (error as Error).message });
    }
};
