import { createBrowserRouter } from "react-router-dom";
import Login from "./components/Login";
import ProtAuth from "./components/Auth/ProtAuth";
import MainLayouts from "./Layout/MainLayouts";
import AuthLayout from "./Layout/AuthLayout";
import ProtectedRoute from "./components/Auth/ProtectedRoute";
import Home from "./Pages/Home";
import Cashier from "./Pages/Cashier";
import Item from "./Pages/Item";
import Orders from "./Pages/OrdersView";
import TakeAway from "./Pages/TakeAway";
import NotFound from "./Pages/NotFound";
import OrdersView from "./Pages/OrdersView";
import Shift from "./Pages/Shift";
import PendingOrders from "./Pages/PendingOrders";
import Profile from "./Pages/Profile";
import DueUsers from "./Pages/Due/DueUsers";
import AllOrders from "./Pages/AllOrders/AllOrders";
import SinglePage from "./Pages/OnlineOrders/SinglePage";
import OnlineTabs from "./Pages/OnlineOrders/OnlineTabs";
import ReturnSalePage from "./Pages/Return/ReturnSalePage";

const router = createBrowserRouter(
  [
    {
      element: <AuthLayout />,
      children: [
        {
          path: "login",
          element: (
            <ProtAuth>
              <Login />
            </ProtAuth>
          ),
        },

      ],
    },

    {
      element: <MainLayouts />,
      children: [
        // for take away
        {
          path: "/",
          element: (
            <ProtectedRoute>
              <Home />
            </ProtectedRoute>
          ),
        },


        // for dine in
        {
          path: "/order-page",
          element: (
            <ProtectedRoute>
              {" "}
              {/* نفس permission الـ Home */}
              <Home />
            </ProtectedRoute>
          ),
        },
        {
          path: "/profile",
          element: (
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          ),
        },
        {
          path: "/delivery-order",
          element: (
            <ProtectedRoute>
              <Home />
            </ProtectedRoute>
          ),
        },

        {
          path: "cashier",
          children: [
            {
              index: true,
              element: (
                <ProtectedRoute>
                  <Cashier />
                </ProtectedRoute>
              ),
            },
          ],
        },

        {
          path: "item",
          children: [
            {
              index: true,
              element: (
                <ProtectedRoute>
                  <Item />
                </ProtectedRoute>
              ),
            },
          ],
        },

        {
          path: "order",
          children: [
            {
              index: true,
              element: (
                <ProtectedRoute>
                  <Orders />
                </ProtectedRoute>
              ),
            },
          ],
        },
        {
          path: "take",
          children: [
            {
              index: true,
              element: (
                <ProtectedRoute>
                  <TakeAway />
                </ProtectedRoute>
              ),
            },
          ],
        },


        {
          path: "orders",
          element: <OrdersView />,
        },
        {
          path: "shift",
          element: (
            <ProtectedRoute>
              <Shift />
            </ProtectedRoute>
          ),
        },
        {
          path: "pending-orders",
          element: (
            <ProtectedRoute>
              <PendingOrders />
            </ProtectedRoute>
          ),
        },
        {
          path: "due",
          element: (
            <ProtectedRoute>
              <DueUsers />
            </ProtectedRoute>
          ),
        },

        {
          path: "*",
          element: <NotFound />,
        },

                {
          path:"/all-orders"
          ,          element:(
            <ProtectedRoute>
              <AllOrders/>
            </ProtectedRoute>
          )
        },
        {
          path:"/online-orders",
          element:(
            <ProtectedRoute>
              <OnlineTabs/>
            </ProtectedRoute>
          )
        },
                {
          path:"/online-orders/:id",
          element:(
            <ProtectedRoute>
              <SinglePage/>
            </ProtectedRoute>
          )
        },
       { path:"/return-sale" ,element:(<ReturnSalePage />)}
      ],
    },
  ],
  {
    basename: "/point-of-sale",
  }
);

export default router;
