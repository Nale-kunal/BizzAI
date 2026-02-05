import { calculateGST, calculateItemTotal, calculateBillTotal } from '../../../utils/gstCalculator.js';

describe('GST Calculator Utilities', () => {
    describe('calculateGST', () => {
        test('should calculate GST correctly for intrastate transaction', () => {
            const result = calculateGST(1000, 18, true);

            expect(result.taxableValue).toBe(1000);
            expect(result.cgst).toBe(90); // 9% of 1000
            expect(result.sgst).toBe(90); // 9% of 1000
            expect(result.igst).toBe(0);
            expect(result.totalTax).toBe(180);
            expect(result.total).toBe(1180);
        });

        test('should calculate GST correctly for interstate transaction', () => {
            const result = calculateGST(1000, 18, false);

            expect(result.taxableValue).toBe(1000);
            expect(result.cgst).toBe(0);
            expect(result.sgst).toBe(0);
            expect(result.igst).toBe(180); // 18% of 1000
            expect(result.totalTax).toBe(180);
            expect(result.total).toBe(1180);
        });

        test('should handle zero tax rate', () => {
            const result = calculateGST(1000, 0, true);

            expect(result.taxableValue).toBe(1000);
            expect(result.cgst).toBe(0);
            expect(result.sgst).toBe(0);
            expect(result.igst).toBe(0);
            expect(result.totalTax).toBe(0);
            expect(result.total).toBe(1000);
        });

        test('should handle decimal amounts correctly', () => {
            const result = calculateGST(1234.56, 18, true);

            expect(result.taxableValue).toBe(1234.56);
            expect(result.cgst).toBeCloseTo(111.11, 2);
            expect(result.sgst).toBeCloseTo(111.11, 2);
            expect(result.totalTax).toBeCloseTo(222.22, 2);
            expect(result.total).toBeCloseTo(1456.78, 2);
        });

        test('should apply discount before calculating GST', () => {
            const result = calculateGST(1000, 18, true, 100);

            expect(result.taxableValue).toBe(900); // 1000 - 100
            expect(result.cgst).toBe(81); // 9% of 900
            expect(result.sgst).toBe(81); // 9% of 900
            expect(result.totalTax).toBe(162);
            expect(result.total).toBe(1062);
        });
    });

    describe('calculateItemTotal', () => {
        test('should calculate item total with GST', () => {
            const item = {
                quantity: 10,
                purchaseRate: 100,
                taxRate: 18,
                discount: 0
            };

            const result = calculateItemTotal(item, true);

            expect(result.taxableValue).toBe(1000);
            expect(result.cgst).toBe(90);
            expect(result.sgst).toBe(90);
            expect(result.total).toBe(1180);
        });

        test('should handle item-level discount', () => {
            const item = {
                quantity: 10,
                purchaseRate: 100,
                taxRate: 18,
                discount: 100
            };

            const result = calculateItemTotal(item, true);

            expect(result.taxableValue).toBe(900);
            expect(result.total).toBe(1062);
        });
    });

    describe('calculateBillTotal', () => {
        test('should calculate bill total with multiple items', () => {
            const items = [
                {
                    quantity: 10,
                    purchaseRate: 100,
                    taxRate: 18,
                    discount: 0,
                    cgst: 90,
                    sgst: 90,
                    total: 1180
                },
                {
                    quantity: 5,
                    purchaseRate: 200,
                    taxRate: 12,
                    discount: 0,
                    cgst: 60,
                    sgst: 60,
                    total: 1120
                }
            ];

            const result = calculateBillTotal(items, 0, 0);

            expect(result.subtotal).toBe(2000);
            expect(result.totalCGST).toBe(150);
            expect(result.totalSGST).toBe(150);
            expect(result.totalIGST).toBe(0);
            expect(result.totalAmount).toBe(2300);
        });

        test('should apply bill-level discount', () => {
            const items = [
                {
                    quantity: 10,
                    purchaseRate: 100,
                    taxRate: 18,
                    discount: 0,
                    cgst: 90,
                    sgst: 90,
                    total: 1180
                }
            ];

            const result = calculateBillTotal(items, 100, 0);

            expect(result.billDiscount).toBe(100);
            expect(result.totalAmount).toBe(1080); // 1180 - 100
        });

        test('should add shipping charges', () => {
            const items = [
                {
                    quantity: 10,
                    purchaseRate: 100,
                    taxRate: 18,
                    discount: 0,
                    cgst: 90,
                    sgst: 90,
                    total: 1180
                }
            ];

            const result = calculateBillTotal(items, 0, 50);

            expect(result.shippingCharges).toBe(50);
            expect(result.totalAmount).toBe(1230); // 1180 + 50
        });
    });
});
