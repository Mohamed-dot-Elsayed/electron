import { Circle, Hourglass, CheckCircle, ChefHat, Trash2 } from "lucide-react";

export const TAX_RATE = 0;
export const OTHER_CHARGE = 0;

export const PREPARATION_STATUSES = {
  pending: {
    label: "Pending",
    icon: Circle,
    color: "text-gray-400",
    nextStatus: "preparing",
    canSendToAPI: false,
  },
  watting: {
    label: "Waiting",
    icon: Circle,
    color: "text-yellow-400",
    nextStatus: "preparing",
    canSendToAPI: false,
  },
  preparing: {
    label: "Preparing",
    icon: Hourglass,
    color: "text-orange-500",
    nextStatus: "pick_up",
    apiValue: "preparing",
    canSendToAPI: true,
  },
  pick_up: {
    label: "Pick Up",
    icon: ChefHat,
    color: "text-blue-500",
    nextStatus: "done",
    apiValue: "pick_up",
    canSendToAPI: true,
  },
  done: {
    label: "Done",
    icon: CheckCircle,
    color: "text-green-500",
    nextStatus: "done",
    apiValue: "done",
    canSendToAPI: true,
  },
};

export const statusOrder = ["pending", "watting", "preparing", "pick_up", "done"];