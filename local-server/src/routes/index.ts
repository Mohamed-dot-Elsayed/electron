import { Router } from "express";
import { authenticated } from "../middlewares/authenticated";
import authRouter from "./auth";
import tenantInfoRouter from "./tenantInfo";
import { authorizeRoles } from "../middlewares/authorized";
import { enforceWarehouseScope } from "../middlewares/warehouseScope";
import PosHomeRouter from "./POSHomeRoutes"
import OnlineOrdersRouter from './onlineOrders'
import SaleRouter from './POSRoutes'
import ExpensesRouter from './expenses'
import DiscountRouter from './discount'
import ReturnRouter from "./ReturnSaleRoutes"
import TaxesRouter from './Taxes'
import syncRouter from "./sync";
import CashierShiftRouter from './CashierShiftRoutes'

export const route = Router();
route.use("/", tenantInfoRouter);
route.use("/sync",syncRouter);
route.use("/auth", authRouter);
route.use(authenticated, authorizeRoles("admin", "superadmin"));
route.use(enforceWarehouseScope);
route.use("/pos-home", PosHomeRouter)
route.use("/online-order",OnlineOrdersRouter)
route.use("/pos", SaleRouter)   
route.use("/expense", ExpensesRouter)
route.use("/discount", DiscountRouter)
route.use("/return-sale", ReturnRouter)
route.use("/taxes", TaxesRouter)
route.use("/cashier-shift",CashierShiftRouter)

export default route;