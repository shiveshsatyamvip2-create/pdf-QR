const express = require('express');
const multer = require('multer');
const { createClient } = require('@supabase/supabase-js'); // New: Supabase client
const { PDFDocument } = require('pdf-lib');
const qrcode = require('qrcode');
const { v4: uuidv4 } = require('uuid');
const cors = require('cors');

// --- ⚠️ Configuration - FILL THESE IN (from Step 2 below) ---
const PORT = process.env.PORT || 3000;
const SUPABASE_URL = 'https://rnssvmliwgdyomonxkcu.supabase.co'; // ⚠️ e.g., https://[id].supabase.co
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJuc3N2bWxpd2dkeW9tb254a2N1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzIxODEzNywiZXhwIjoyMDc4Nzk0MTM3fQ.1xoRbfUecWW6huV6DkZUChCOYkDfG18Xw8juPP1KUdo'; // ⚠️ The secret "service_role" key
const BUCKET_NAME = 'pdf_files'; // ⚠️ The name of the bucket you will create in Supabase

// --- Initialize Supabase Admin ---
// We use the service_role key here for admin-level access to upload files.
// This key must be kept secret and *only* used on a server.
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// --- Initialize Express ---
const app = express();
app.use(cors()); // Allow requests from your frontend

// --- Configure Multer for in-memory file storage ---
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB file limit
});

// --- The Main Upload Endpoint ---
app.post('/upload', upload.single('pdf'), async (req, res) => {
    if (!req.file) {
        return res.status(400).send('No file uploaded.');
    }
    if (req.file.mimetype !== 'application/pdf') {
        return res.status(400).send('Invalid file type. Please upload a PDF.');
    }

    try {
        console.log('File received. Processing...');

        // 1. Generate unique file names and paths
        const fileId = uuidv4();
        const filePath = `processed/${fileId}.pdf`; // Path inside the Supabase bucket

        // 2. Get the public URL *before* uploading
        // This is the URL the QR code will point to.
        const { data: publicUrlData } = supabase
            .storage
            .from(BUCKET_NAME)
            .getPublicUrl(filePath);
        
        const publicUrl = publicUrlData.publicUrl;

        console.log(`Generating QR code for: ${publicUrl}`);

        // 3. Generate QR code (both as a buffer for embedding and data URL for frontend)
        const qrCodeBuffer = await qrcode.toBuffer(publicUrl);
        const qrCodeDataUrl = await qrcode.toDataURL(publicUrl);

        console.log('Embedding QR code into PDF...');

        // 4. Load the uploaded PDF buffer
        const pdfDoc = await PDFDocument.load(req.file.buffer);

        // 5. Embed the QR code image
        const qrImage = await pdfDoc.embedPng(qrCodeBuffer);
        
        // Position it (e.g., bottom-right corner)
        const firstPage = pdfDoc.getPages()[0];
        const { width: pageWidth } = firstPage.getSize();
        const qrWidth = 100;
        const qrHeight = 100;
        const xPos = pageWidth - qrWidth - 20;
        const yPos = 20; 

        firstPage.drawImage(qrImage, {
            x: xPos,
            y: yPos,
            width: qrWidth,
            height: qrHeight,
        });

        // 6. Save the modified PDF into a new buffer
        const modifiedPdfBytes = await pdfDoc.save();

        console.log('Uploading modified PDF to Supabase Storage...');

        // 7. Upload the new buffer to Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
            .from(BUCKET_NAME)
            .upload(filePath, modifiedPdfBytes, {
                contentType: 'application/pdf',
                upsert: false // Don't overwrite existing files
            });

        if (uploadError) {
            // If the upload fails, throw the error to be caught by the catch block
            throw uploadError;
        }

        console.log('Upload complete. Sending response.');

        // 8. Send the public URL and QR data back to the frontend
        res.status(200).json({
            downloadUrl: publicUrl,
            qrCodeDataUrl: qrCodeDataUrl,
        });

    } catch (error) {
        console.error('Error processing PDF:', error);
        res.status(500).send('An error occurred while processing your file.');
    }
});

// --- Start the server ---
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});