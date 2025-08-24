const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

async function generateContractPdf(contractData) {
    return new Promise((resolve, reject) => {
        const { user, product, contract } = contractData;
        const doc = new PDFDocument({ margin: 50 });

        // Define file path and name
        const uploadsDir = path.join(__dirname, '..', 'uploads', 'contracts');
        if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
        }
        const fileName = `contract-${contract.contractNumber}.pdf`;
        const filePath = path.join(uploadsDir, fileName);
        const fileUrl = `/uploads/contracts/${fileName}`; // The URL to store in the DB

        // Pipe the PDF output to a writable stream
        const stream = fs.createWriteStream(filePath);
        doc.pipe(stream);

        // --- Start Building the PDF Content ---

        // Header
        doc.fontSize(20).text('Rental Contract Agreement', { align: 'center' });
        doc.moveDown();

        // Contract Details
        doc.fontSize(12).text(`Contract Number: ${contract.contractNumber}`);
        doc.text(`Date: ${new Date(contract.createdAt).toLocaleDateString()}`);
        doc.moveDown();

        // Parties Involved
        doc.fontSize(14).text('Parties', { underline: true });
        doc.fontSize(12).text(`Lessor: Your Medical Devices App`);
        doc.text(`Lessee: ${user.username} (${user.email})`);
        doc.moveDown();

        // Rented Item
        doc.fontSize(14).text('Rented Item', { underline: true });
        doc.fontSize(12).text(`Product: ${product.nameEn}`);
        doc.moveDown();
        
        // Rental Period
        doc.fontSize(14).text('Rental Period', { underline: true });
        doc.fontSize(12).text(`Start Date: ${new Date(contract.startDate).toLocaleDateString()}`);
        doc.text(`End Date: ${new Date(contract.endDate).toLocaleDateString()}`);
        doc.moveDown(2);

        // Terms and Conditions (Simple Placeholder)
        doc.fontSize(14).text('Terms and Conditions', { underline: true });
        doc.fontSize(10).text(
            'The lessee agrees to the full terms and conditions as outlined on our website. ' +
            'This includes policies regarding late returns, damages, and liability. ' +
            'By proceeding with this rental, the lessee confirms they have read, understood, and agreed to these terms.',
            { align: 'justify' }
        );
        doc.moveDown();
        doc.text(`Agreement Timestamp: ${new Date(contract.agreedToTermsAt).toLocaleString()}`);
        
        // --- Finalize the PDF ---
        doc.end();

        stream.on('finish', () => {
            console.log(`PDF generated successfully: ${filePath}`);
            resolve({ filePath, fileName, fileUrl });
        });

        stream.on('error', (err) => {
            console.error('Error generating PDF:', err);
            reject(err);
        });
    });
}

module.exports = {
    generateContractPdf,
};