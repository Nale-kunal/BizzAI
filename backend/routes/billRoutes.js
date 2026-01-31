import express from "express";
import {
  getAllBills,
  createBill,
  getBillById,
  updateBill,
  deleteBill,
  recordPayment,
  applyCreditNote,
  getBillAging,
  getBillAnalytics,
  approveBill,
  rejectBill,
  getBillsBySupplier,
  getOverdueBills,
  bulkPayment
} from "../controllers/billController.js";
import { protect } from "../middlewares/authMiddleware.js";

const router = express.Router();

// Analytics and reports (must come before :id routes)
router.get("/aging", protect, getBillAging);
router.get("/analytics", protect, getBillAnalytics);
router.get("/overdue", protect, getOverdueBills);
router.get("/supplier/:supplierId", protect, getBillsBySupplier);

// Bulk operations
router.post("/bulk-payment", protect, bulkPayment);

// CRUD operations
router.get("/", protect, getAllBills);
router.post("/", protect, createBill);
router.get("/:id", protect, getBillById);
router.put("/:id", protect, updateBill);
router.delete("/:id", protect, deleteBill);

// Bill-specific actions
router.post("/:id/payment", protect, recordPayment);
router.post("/:id/apply-credit", protect, applyCreditNote);
router.post("/:id/approve", protect, approveBill);
router.post("/:id/reject", protect, rejectBill);

export default router;