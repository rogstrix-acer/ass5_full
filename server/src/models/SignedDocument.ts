import mongoose, { Document, Schema } from 'mongoose';

export interface ISignedDocument extends Document {
    originalHash: string;
    finalHash: string;
    pdfId: string;
    timestamp: Date;
    filePath: string;
}

const SignedDocumentSchema: Schema = new Schema({
    originalHash: { type: String, required: true },
    finalHash: { type: String, required: true },
    pdfId: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    filePath: { type: String, required: true }
});

export default mongoose.model<ISignedDocument>('SignedDocument', SignedDocumentSchema);
