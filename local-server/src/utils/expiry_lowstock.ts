import { ProductModel } from "../models/product";
import { PurchaseItemModel } from "../models/purchaseItem";
import cron from "node-cron";
import { Server } from "socket.io";

export class NotificationService {
  constructor(private io: Server) {}

  async checkLowStock(productId: string) {
    const product = await ProductModel.findById(productId);
    if (!product) return;

    const qty = product.quantity ?? 0;
    if (product.low_stock && qty <= product.low_stock) {
      console.log(
        `[Low Stock Info] Product ${product.name} has low stock (${qty}).`,
      );
    }
  }

  async checkExpiry() {
    const now = new Date();
    const soon = new Date();
    soon.setDate(now.getDate() + 7);

    now.setHours(0, 0, 0, 0);
    soon.setHours(23, 59, 59, 999);

    const expiringItems = PurchaseItemModel.find({
      item_type: "product",
    }).filter((item) => {
      const expiryDate = new Date(item.date_of_expiery);
      return expiryDate <= soon && expiryDate >= now && item.quantity > 0;
    });

    if (expiringItems.length > 0) {
      console.log(`[Expiry Info] ${expiringItems.length} items expiring soon.`);
    }
  }

  async checkExpired() {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const expiredItems = PurchaseItemModel.find({
      item_type: "product",
    }).filter((item) => {
      const expiryDate = new Date(item.date_of_expiery);
      return expiryDate < now && item.quantity > 0;
    });

    if (expiredItems.length > 0) {
      console.log(`[Expired Info] ${expiredItems.length} items expired.`);
    }
  }

  async checkAllLowStock() {
    const products = await ProductModel.find({
      low_stock: { $exists: true, $ne: null },
    });

    const lowStockCount = products.filter(
      (p) =>
        p.quantity != null && p.low_stock != null && p.quantity <= p.low_stock,
    ).length;

    if (lowStockCount > 0) {
      console.log(
        `[Low Stock Summary] ${lowStockCount} products are low in stock.`,
      );
    }
  }
}

export function startCron(io: Server) {
  const service = new NotificationService(io);

  // فحص الصلاحية الساعة 3 عصراً
  cron.schedule("0 15 * * *", async () => {
    await service.checkExpiry();
  });

  // فحص المنتهي الساعة 3:30 عصراً
  cron.schedule("30 15 * * *", async () => {
    await service.checkExpired();
  });

  // فحص النواقص الساعة 4 عصراً
  cron.schedule("0 16 * * *", async () => {
    await service.checkAllLowStock();
  });

  console.log("✅ Cron jobs scheduled successfully");
}
