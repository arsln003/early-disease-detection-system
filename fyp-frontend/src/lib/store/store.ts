import { configureStore } from '@reduxjs/toolkit';
import authReducer from './features/authSlice';
import reportReducer from './features/reportSlice';
import doctorReducer from './features/doctorSlice';
import adminReducer from './features/adminSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    reports: reportReducer,
    doctor: doctorReducer,
    admin: adminReducer,
  },
  // Redux Toolkit ki default middleware configurations
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;