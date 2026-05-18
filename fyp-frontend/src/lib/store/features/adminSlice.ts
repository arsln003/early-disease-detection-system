import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { 
  getDashboardStats, 
  getPatients, 
  getDoctors, 
  getRadiologists 
} from '@/services/apiService';

// ==========================================
// THUNKS (API Calls)
// ==========================================

// 1. Fetch Dashboard Stats
export const fetchAdminStats = createAsyncThunk(
  'admin/fetchStats',
  async (_, { rejectWithValue }) => {
    try {
      const response = await getDashboardStats();
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch dashboard stats');
    }
  }
);

// 2. Fetch All Patients (Used for Recent Assignments & Patients Table)
export const fetchAdminPatients = createAsyncThunk(
  'admin/fetchPatients',
  async (_, { rejectWithValue }) => {
    try {
      const response = await getPatients();
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch patients');
    }
  }
);

// 3. Fetch All Doctors
export const fetchAdminDoctors = createAsyncThunk(
  'admin/fetchDoctors',
  async (_, { rejectWithValue }) => {
    try {
      const response = await getDoctors();
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch doctors');
    }
  }
);

// 4. Fetch All Radiologists
export const fetchAdminRadiologists = createAsyncThunk(
  'admin/fetchRadiologists',
  async (_, { rejectWithValue }) => {
    try {
      const response = await getRadiologists();
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch radiologists');
    }
  }
);

// ==========================================
// INITIAL STATE & SLICE
// ==========================================

interface AdminState {
  stats: {
    totalDoctors?: number;
    totalPatients?: number;
    totalReports?: number;
    criticalCases?: number;
    [key: string]: any; // Backend ke naye stats ke liye fallback
  };
  patients: any[];
  doctors: any[];
  radiologists: any[];
  isLoading: boolean;
  error: string | null;
}

const initialState: AdminState = {
  stats: {},
  patients: [],
  doctors: [],
  radiologists: [],
  isLoading: false,
  error: null,
};

const adminSlice = createSlice({
  name: 'admin',
  initialState,
  reducers: {
    // Custom reducer agar koi local data clear karna ho
    clearAdminError: (state) => {
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // --- Fetch Stats ---
      .addCase(fetchAdminStats.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchAdminStats.fulfilled, (state, action: PayloadAction<any>) => {
        state.isLoading = false;
        state.stats = action.payload;
      })
      .addCase(fetchAdminStats.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })

      // --- Fetch Patients ---
      .addCase(fetchAdminPatients.pending, (state) => { state.isLoading = true; })
      .addCase(fetchAdminPatients.fulfilled, (state, action: PayloadAction<any[]>) => {
        state.isLoading = false;
        state.patients = action.payload;
      })
      .addCase(fetchAdminPatients.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })

      // --- Fetch Doctors ---
      .addCase(fetchAdminDoctors.pending, (state) => { state.isLoading = true; })
      .addCase(fetchAdminDoctors.fulfilled, (state, action: PayloadAction<any[]>) => {
        state.isLoading = false;
        state.doctors = action.payload;
      })
      .addCase(fetchAdminDoctors.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })

      // --- Fetch Radiologists ---
      .addCase(fetchAdminRadiologists.pending, (state) => { state.isLoading = true; })
      .addCase(fetchAdminRadiologists.fulfilled, (state, action: PayloadAction<any[]>) => {
        state.isLoading = false;
        state.radiologists = action.payload;
      })
      .addCase(fetchAdminRadiologists.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearAdminError } = adminSlice.actions;
export default adminSlice.reducer;