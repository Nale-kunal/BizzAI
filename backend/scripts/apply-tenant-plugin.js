/**
 * Script to apply tenant scoping plugin to all models
 * 
 * This script adds the tenant scoping plugin import and application
 * to all models that have organizationId field
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const modelsDir = path.join(__dirname, '../models');

// Models that need tenant scoping
const modelsToUpdate = [
    'Customer.js',
    'Supplier.js',
    'Invoice.js',
    'Purchase.js',
    'Bill.js',
    'PaymentIn.js',
    'PaymentOut.js',
    'Return.js',
    'PurchaseReturn.js',
    'Expense.js',
    'StockLedger.js',
    'FinancialPeriod.js'
];

const pluginImport = `import tenantScopingPlugin from "../utils/tenantScopingPlugin.js";\n`;
const pluginApplication = `\n// Apply tenant scoping plugin\nschema.plugin(tenantScopingPlugin);\n`;

console.log('🔧 Applying tenant scoping plugin to models...\n');

modelsToUpdate.forEach(modelFile => {
    const filePath = path.join(modelsDir, modelFile);

    if (!fs.existsSync(filePath)) {
        console.log(`⚠️  Skipping ${modelFile} - file not found`);
        return;
    }

    let content = fs.readFileSync(filePath, 'utf8');

    // Check if already has plugin
    if (content.includes('tenantScopingPlugin')) {
        console.log(`✅ ${modelFile} - already has plugin`);
        return;
    }

    // Add import at the top (after mongoose import)
    const mongooseImportRegex = /import mongoose from ['"]mongoose['"];/;
    if (mongooseImportRegex.test(content)) {
        content = content.replace(
            mongooseImportRegex,
            `import mongoose from "mongoose";\n${pluginImport.trim()}`
        );
    }

    // Find schema definition and add plugin after it
    const schemaRegex = /const \w+Schema = new mongoose\.Schema\([^;]+\);/s;
    const match = content.match(schemaRegex);

    if (match) {
        const schemaDefinition = match[0];
        content = content.replace(
            schemaDefinition,
            schemaDefinition + pluginApplication
        );

        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`✅ ${modelFile} - plugin applied`);
    } else {
        console.log(`⚠️  ${modelFile} - could not find schema definition`);
    }
});

console.log('\n✅ Tenant scoping plugin application complete!');
console.log('\n📝 Summary:');
console.log(`   - Total models: ${modelsToUpdate.length}`);
console.log(`   - Plugin ensures automatic organizationId filtering`);
console.log(`   - Prevents cross-tenant data access`);
console.log('\n🔍 Next steps:');
console.log('   1. Review changes in models');
console.log('   2. Test tenant isolation');
console.log('   3. Run integration tests');
