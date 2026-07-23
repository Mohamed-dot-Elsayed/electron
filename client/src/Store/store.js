// src/redux/store.js
import { configureStore } from "@reduxjs/toolkit";
import authreducer from "./authSlice";
import loaderreducer from "./LoaderSpinner";

export const store = configureStore({
  reducer: {
    auth: authreducer,
    loader: loaderreducer,
  },
});
