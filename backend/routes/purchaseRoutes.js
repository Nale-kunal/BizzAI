import express from "express";
import {
    createPurchase,
    getAllPurchases,
    getPurchaseById,
    getDraftPurchases,
    updatePurchase,
    finalizePurchase,
    cancelPurchase,
} from "../controllers/purchaseController.js";
import { protect } from "../middlewares/authMiddleware.js";
import { validatePeriodLock, validatePeriodLockForUpdate } from "../middlewares/periodLockingMiddleware.js";
import Purchase from "../models/Purchase.js";

const router = express.Router();

// All routes require authentication
router.use(protect);

// Purchase CRUD
router.post("/", validatePeriodLock, createPurchase);
router.get("/", getAllPurchases);
router.get("/drafts", getDraftPurchases);
router.get("/:id", getPurchaseById);
router.put("/:id", validatePeriodLockForUpdate(Purchase), updatePurchase);

// Purchase actions
router.post("/:id/finalize", validatePeriodLock, finalizePurchase);
router.post("/:id/cancel", cancelPurchase);

export default router;
