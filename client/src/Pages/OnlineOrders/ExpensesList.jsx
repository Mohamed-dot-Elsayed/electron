import React, { useState } from "react";
import { useGet } from "@/Hooks/useGet";
import { Edit } from "lucide-react";
import EditExpenseModal from "../ExpensesModal";
import Loading from "@/components/Loading";

export default function ExpensesList() {
  const { data, loading, refetch } = useGet("api/expense");
  const [selectedExpense, setSelectedExpense] = useState(null);

  if (loading) return <Loading />;

  // استخراج expenses من الـ API الصحيح
  const expenses = data?.data?.expenses || [];

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-4">Expenses</h1>

      <div className="space-y-3">
        {expenses.map((item) => (
          <div
            key={item._id}
            className="p-4 border rounded-lg flex justify-between items-center bg-white"
          >
            <div>
              <p className="font-bold">{item.name}</p>
              <p>Price: {item.amount}</p>

              <p>
                Category: {item.Category_id?.name || "-"}
              </p>

              <p>
                Financial Account: {item.financial_accountId?.name || "-"}
              </p>

              <p>Note: {item.note || "-"}</p>
            </div>

            <Edit
              className="cursor-pointer text-bg-primary hover:text-bg-primary/80"
              onClick={() => setSelectedExpense(item)}
            />
          </div>
        ))}
      </div>

      {/* Modal */}
      {selectedExpense && (
        <EditExpenseModal
        key={selectedExpense._id}
          expense={selectedExpense}
          onClose={() => setSelectedExpense(null)}
          refetchParent={refetch}
        />
      )}
    </div>
  );
}
