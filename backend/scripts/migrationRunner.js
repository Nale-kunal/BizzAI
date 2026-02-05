import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Migration Runner
 * Executes migration scripts in order
 */

class MigrationRunner {
    constructor() {
        this.migrationsPath = path.join(__dirname, '../migrations');
        this.executedMigrations = [];
    }

    /**
     * Get all migration files
     * @returns {Array} Migration files sorted by name
     */
    getMigrationFiles() {
        if (!fs.existsSync(this.migrationsPath)) {
            console.log('No migrations directory found');
            return [];
        }

        const files = fs.readdirSync(this.migrationsPath)
            .filter(file => file.endsWith('.js'))
            .sort();

        return files;
    }

    /**
     * Run all pending migrations
     */
    async runMigrations() {
        try {
            console.log('🚀 Starting migrations...\n');

            const files = this.getMigrationFiles();

            if (files.length === 0) {
                console.log('No migrations to run');
                return;
            }

            for (const file of files) {
                await this.runMigration(file);
            }

            console.log('\n✅ All migrations completed successfully!');

        } catch (error) {
            console.error('\n❌ Migration failed:', error);
            throw error;
        }
    }

    /**
     * Run a single migration
     * @param {String} filename - Migration filename
     */
    async runMigration(filename) {
        try {
            console.log(`📦 Running migration: ${filename}`);

            const migrationPath = path.join(this.migrationsPath, filename);
            const migration = await import(`file://${migrationPath}`);

            // Execute migration
            if (typeof migration.default === 'function') {
                await migration.default();
            } else if (typeof migration.up === 'function') {
                await migration.up();
            } else {
                throw new Error(`Migration ${filename} does not export a default function or up() function`);
            }

            this.executedMigrations.push(filename);
            console.log(`✅ Completed: ${filename}\n`);

        } catch (error) {
            console.error(`❌ Failed: ${filename}`);
            throw error;
        }
    }

    /**
     * Rollback last migration
     */
    async rollback() {
        try {
            const files = this.getMigrationFiles();
            const lastFile = files[files.length - 1];

            if (!lastFile) {
                console.log('No migrations to rollback');
                return;
            }

            console.log(`🔄 Rolling back: ${lastFile}`);

            const migrationPath = path.join(this.migrationsPath, lastFile);
            const migration = await import(`file://${migrationPath}`);

            if (typeof migration.down === 'function') {
                await migration.down();
                console.log(`✅ Rolled back: ${lastFile}`);
            } else {
                console.log(`⚠️  No rollback function found in ${lastFile}`);
            }

        } catch (error) {
            console.error('❌ Rollback failed:', error);
            throw error;
        }
    }
}

// CLI execution
if (process.argv[1] === fileURLToPath(import.meta.url)) {
    const command = process.argv[2] || 'up';
    const runner = new MigrationRunner();

    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/bizzai';

    mongoose.connect(mongoUri)
        .then(async () => {
            console.log('📊 Connected to MongoDB\n');

            if (command === 'up') {
                await runner.runMigrations();
            } else if (command === 'down') {
                await runner.rollback();
            } else {
                console.log('Usage: node migrationRunner.js [up|down]');
            }

            await mongoose.disconnect();
            console.log('\n📊 Disconnected from MongoDB');
            process.exit(0);
        })
        .catch(error => {
            console.error('Failed to connect to MongoDB:', error);
            process.exit(1);
        });
}

export default MigrationRunner;
