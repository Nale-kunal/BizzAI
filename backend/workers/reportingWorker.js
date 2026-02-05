/**
 * BullMQ Reporting Worker
 * 
 * Processes background report generation jobs
 * Handles: Financial reports, inventory reports, sales reports, custom exports
 */

import { Worker } from 'bullmq';
import IORedis from 'ioredis';
import mongoose from 'mongoose';
import PDFDocument from 'pdfkit';
import ExcelJS from 'exceljs';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

// Redis connection
const connection = new IORedis({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT) || 6379,
    password: process.env.REDIS_PASSWORD,
    maxRetriesPerRequest: null,
    enableReadyCheck: false
});

/**
 * Generate financial report
 */
async function generateFinancialReport(organizationId, startDate, endDate, format = 'pdf') {
    const JournalEntry = mongoose.model('JournalEntry');

    // Get journal entries
    const entries = await JournalEntry.find({
        organization: organizationId,
        date: { $gte: startDate, $lte: endDate },
        status: 'posted'
    })
        .populate('lines.account')
        .sort({ date: 1 });

    // Calculate totals
    let totalDebits = 0;
    let totalCredits = 0;

    entries.forEach(entry => {
        entry.lines.forEach(line => {
            totalDebits += line.debit;
            totalCredits += line.credit;
        });
    });

    const reportData = {
        organizationId,
        startDate,
        endDate,
        entries,
        totalDebits,
        totalCredits,
        balance: totalDebits - totalCredits
    };

    if (format === 'pdf') {
        return await generatePDFReport(reportData, 'financial');
    } else {
        return await generateExcelReport(reportData, 'financial');
    }
}

/**
 * Generate inventory report
 */
async function generateInventoryReport(organizationId, format = 'pdf') {
    const Item = mongoose.model('Item');

    const items = await Item.find({ organizationId })
        .sort({ name: 1 });

    const reportData = {
        organizationId,
        items,
        totalItems: items.length,
        totalValue: items.reduce((sum, item) => sum + (item.currentStock * item.sellingPrice), 0),
        lowStockItems: items.filter(item => item.currentStock <= item.minStockLevel)
    };

    if (format === 'pdf') {
        return await generatePDFReport(reportData, 'inventory');
    } else {
        return await generateExcelReport(reportData, 'inventory');
    }
}

/**
 * Generate PDF report
 */
async function generatePDFReport(data, type) {
    const doc = new PDFDocument();
    const fileName = `${type}-report-${Date.now()}.pdf`;
    const filePath = path.join(process.cwd(), 'reports', fileName);

    // Ensure reports directory exists
    if (!fs.existsSync(path.join(process.cwd(), 'reports'))) {
        fs.mkdirSync(path.join(process.cwd(), 'reports'), { recursive: true });
    }

    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    // Add content based on type
    doc.fontSize(20).text(`${type.toUpperCase()} REPORT`, { align: 'center' });
    doc.moveDown();

    if (type === 'financial') {
        doc.fontSize(12).text(`Period: ${data.startDate.toDateString()} - ${data.endDate.toDateString()}`);
        doc.text(`Total Debits: ₹${data.totalDebits.toFixed(2)}`);
        doc.text(`Total Credits: ₹${data.totalCredits.toFixed(2)}`);
        doc.text(`Balance: ₹${data.balance.toFixed(2)}`);
    } else if (type === 'inventory') {
        doc.fontSize(12).text(`Total Items: ${data.totalItems}`);
        doc.text(`Total Value: ₹${data.totalValue.toFixed(2)}`);
        doc.text(`Low Stock Items: ${data.lowStockItems.length}`);
    }

    doc.end();

    return new Promise((resolve, reject) => {
        stream.on('finish', () => resolve({ filePath, fileName }));
        stream.on('error', reject);
    });
}

/**
 * Generate Excel report
 */
async function generateExcelReport(data, type) {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Report');

    const fileName = `${type}-report-${Date.now()}.xlsx`;
    const filePath = path.join(process.cwd(), 'reports', fileName);

    // Ensure reports directory exists
    if (!fs.existsSync(path.join(process.cwd(), 'reports'))) {
        fs.mkdirSync(path.join(process.cwd(), 'reports'), { recursive: true });
    }

    if (type === 'financial') {
        worksheet.columns = [
            { header: 'Date', key: 'date', width: 15 },
            { header: 'Entry No', key: 'entryNo', width: 15 },
            { header: 'Account', key: 'account', width: 30 },
            { header: 'Debit', key: 'debit', width: 15 },
            { header: 'Credit', key: 'credit', width: 15 }
        ];

        data.entries.forEach(entry => {
            entry.lines.forEach(line => {
                worksheet.addRow({
                    date: entry.date.toDateString(),
                    entryNo: entry.entryNumber,
                    account: line.account?.name || 'Unknown',
                    debit: line.debit,
                    credit: line.credit
                });
            });
        });
    } else if (type === 'inventory') {
        worksheet.columns = [
            { header: 'Item Name', key: 'name', width: 30 },
            { header: 'SKU', key: 'sku', width: 15 },
            { header: 'Current Stock', key: 'stock', width: 15 },
            { header: 'Unit Price', key: 'price', width: 15 },
            { header: 'Total Value', key: 'value', width: 15 }
        ];

        data.items.forEach(item => {
            worksheet.addRow({
                name: item.name,
                sku: item.sku,
                stock: item.currentStock,
                price: item.sellingPrice,
                value: item.currentStock * item.sellingPrice
            });
        });
    }

    await workbook.xlsx.writeFile(filePath);

    return { filePath, fileName };
}

/**
 * Reporting job processor
 */
const reportingWorker = new Worker(
    'reporting-queue',
    async (job) => {
        const { type, organizationId, params } = job.data;

        console.log(`📊 Processing reporting job ${job.id}: ${type}`);

        try {
            let result;

            switch (type) {
                case 'financial':
                    result = await generateFinancialReport(
                        organizationId,
                        new Date(params.startDate),
                        new Date(params.endDate),
                        params.format
                    );
                    break;

                case 'inventory':
                    result = await generateInventoryReport(organizationId, params.format);
                    break;

                default:
                    throw new Error(`Unknown report type: ${type}`);
            }

            console.log(`✅ Report generated:`, result);

            return {
                success: true,
                type,
                ...result
            };

        } catch (error) {
            console.error(`❌ Report generation failed: ${error.message}`);
            throw error;
        }
    },
    {
        connection,
        concurrency: 2 // Process 2 reports concurrently
    }
);

// Event listeners
reportingWorker.on('completed', (job, result) => {
    console.log(`✅ Reporting job ${job.id} completed: ${result.type}`);
});

reportingWorker.on('failed', (job, error) => {
    console.error(`❌ Reporting job ${job.id} failed:`, error.message);
});

reportingWorker.on('error', (error) => {
    console.error('❌ Reporting worker error:', error);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('📊 Shutting down reporting worker...');
    await reportingWorker.close();
    await connection.quit();
    process.exit(0);
});

process.on('SIGINT', async () => {
    console.log('📊 Shutting down reporting worker...');
    await reportingWorker.close();
    await connection.quit();
    process.exit(0);
});

console.log('📊 Reporting worker started');

export default reportingWorker;
