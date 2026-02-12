import PDFDocument from 'pdfkit';
import { Response } from 'express';
import { db } from '../lib/db';
import { AuthRequest } from '../middleware/auth';

export const generateSalesReceipt = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const bike = await db.bike.findFirst({
            where: { id, companyId: req.user!.companyId! },
            include: { company: true, addedBy: { select: { email: true } } }
        });
        
        if (!bike || !bike.isSold) {
            return res.status(404).json({ error: 'Bike not found or not sold' });
        }

        const doc = new PDFDocument();
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=receipt-${bike.regNo}.pdf`);
        
        doc.pipe(res);
        
        // Header
        doc.fontSize(25).text(bike.company.name, 100, 100);
        doc.fontSize(16).text('Sales Receipt', 100, 150);
        doc.moveTo(100, 170).lineTo(500, 170).stroke();
        
        // Bike details
        doc.fontSize(14);
        doc.text(`Receipt ID: ${bike.id}`, 100, 200);
        doc.text(`Date: ${new Date().toLocaleDateString()}`, 100, 220);
        doc.text(`Bike Name: ${bike.name}`, 100, 250);
        doc.text(`Registration No: ${bike.regNo}`, 100, 270);
        doc.text(`Sale Price: $${bike.soldPrice?.toFixed(2)}`, 100, 290);
        
        // Footer
        doc.fontSize(10);
        doc.text('Thank you for your business!', 100, 350);
        doc.text(`Processed by: ${bike.addedBy.email}`, 100, 370);
        
        doc.end();
    } catch (error) {
        res.status(500).json({ error: 'Failed to generate receipt' });
    }
};