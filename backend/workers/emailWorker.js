/**
 * BullMQ Email Worker
 * 
 * Processes email jobs asynchronously
 * Handles: Welcome emails, invoice emails, password resets, notifications
 */

import { Worker } from 'bullmq';
import nodemailer from 'nodemailer';
import IORedis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

// Redis connection for BullMQ
const connection = new IORedis({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT) || 6379,
    password: process.env.REDIS_PASSWORD,
    maxRetriesPerRequest: null,
    enableReadyCheck: false
});

// Email transporter
const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT) || 587,
    secure: false,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

/**
 * Email job processor
 */
const emailWorker = new Worker(
    'email-queue',
    async (job) => {
        const { type, to, subject, html, text, attachments } = job.data;

        console.log(`📧 Processing email job ${job.id}: ${type} to ${to}`);

        try {
            const mailOptions = {
                from: process.env.EMAIL_FROM || 'noreply@bizzai.com',
                to,
                subject,
                html,
                text,
                attachments
            };

            const info = await transporter.sendMail(mailOptions);

            console.log(`✅ Email sent: ${info.messageId}`);

            return {
                success: true,
                messageId: info.messageId,
                type
            };

        } catch (error) {
            console.error(`❌ Email failed: ${error.message}`);
            throw error; // Will trigger retry
        }
    },
    {
        connection,
        concurrency: 5, // Process 5 emails concurrently
        limiter: {
            max: 100, // Max 100 emails
            duration: 60000 // Per minute
        }
    }
);

// Event listeners
emailWorker.on('completed', (job, result) => {
    console.log(`✅ Email job ${job.id} completed: ${result.type}`);
});

emailWorker.on('failed', (job, error) => {
    console.error(`❌ Email job ${job.id} failed:`, error.message);
});

emailWorker.on('error', (error) => {
    console.error('❌ Email worker error:', error);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('📧 Shutting down email worker...');
    await emailWorker.close();
    await connection.quit();
    process.exit(0);
});

process.on('SIGINT', async () => {
    console.log('📧 Shutting down email worker...');
    await emailWorker.close();
    await connection.quit();
    process.exit(0);
});

console.log('📧 Email worker started');

export default emailWorker;
