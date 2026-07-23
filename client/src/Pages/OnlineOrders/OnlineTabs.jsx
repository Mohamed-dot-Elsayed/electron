"use client";
import React from "react";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import OnlineOrders from "./OnlineOrders";
import ExpensesList from "./ExpensesList";

export default function OnlineTabs() {
  return (
    <div className="w-full p-4">
      <Tabs defaultValue="orders" className="w-full">

        {/* === TABS HEADER === */}
        <TabsList className="grid grid-cols-2 md:grid-cols-3 gap-1 p-4 pt-2 h-12 !shadow-none !bg-none w-full">
          <TabsTrigger
            value="orders"
            className="text-xs  data-[state=active]:bg-bg-primary data-[state=active]:text-white rounded-md"
          >
            Online Orders
          </TabsTrigger>

          <TabsTrigger
            value="expenses"
            className="text-xs  data-[state=active]:bg-bg-primary data-[state=active]:text-white rounded-md"
          >
            Expenses
          </TabsTrigger>
        </TabsList>

        {/* === ONLINE ORDERS CONTENT === */}
        <TabsContent value="orders" className="mt-6">
            <OnlineOrders/>
        </TabsContent>

        {/* === EXPENSES CONTENT === */}
        <TabsContent value="expenses" className="mt-6">
          <ExpensesList/>

        </TabsContent>

      </Tabs>
    </div>
  );
}
