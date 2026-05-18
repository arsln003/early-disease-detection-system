import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

// APIs Import (Nayi aur Purani sab)
import { 
  getAssignedPatientsWithDetails, 
  updateDoctorFcmToken,
  doctorPredictCadica, 
  doctorGetCadicaPrediction, 
  doctorGetStrokePrediction,
  getDoctorPatientOcrHistory, 
  getDoctorPatientStrokeHistory, 
  getDoctorPatientCadicaHistory,
  getCardioReportDetails // 🔥 Nayi NLP wali API
} from '@/services/apiService';

// NOTE: Is slice ko apne store.ts mein reducers k andar zaroor add karna (e.g., doctor: doctorReducer)

export interface PatientRecord {
  id: number;
  name: string;
  age: number | string;
  gender: string;
  status: string;
  risk: string;
  riskColor: string;
  rawReports?: any[]; 
  strokeReports?: any[];
  cadicaReports?: any[]; 
}

interface DoctorState {
  patients: PatientRecord[];
  loading: boolean;
  error: string | null;
  // History States
  ocrHistory: any[];
  strokeHistory: any[];
  cadicaHistory: any[];
}

const initialState: DoctorState = {
  patients: [],
  loading: false,
  error: null,
  ocrHistory: [],
  strokeHistory: [],
  cadicaHistory: [],
};

// --- FETCH ASSIGNED PATIENTS ---
export const fetchAssignedPatients = createAsyncThunk<
  PatientRecord[], 
  { doctorId: number; severity?: string } 
>(
  'doctor/fetchAssignedPatients',
  async ({ doctorId, severity = 'all' }, { rejectWithValue }) => {
    try {
      const response = await getAssignedPatientsWithDetails(doctorId, severity);
      
      const formattedPatients: PatientRecord[] = response.map((assignment: any) => {
        const p = assignment.patient || {}; 
        const category = assignment.patientRiskCategory || 'Normal';
        
        let riskColor = 'bg-slate-500 shadow-slate-200';
        if (category === 'Critical' || category === 'High Risk') riskColor = 'bg-rose-500 shadow-rose-200';
        else if (category === 'Moderate' || category === 'Intermediate') riskColor = 'bg-amber-500 shadow-amber-200';
        else if (category === 'Normal' || category === 'Low Risk') riskColor = 'bg-emerald-500 shadow-emerald-200';

        return {
          id: p.patientid || Math.random(),
          name: p.fullname || 'Unknown Patient',
          age: p.age || 'N/A',
          gender: p.gender === 1 ? 'Female' : p.gender === 2 ? 'Male' : p.gender || 'N/A',
          status: category,
          risk: category === 'No AI Result' ? 'N/A' : 'Check Details', 
          riskColor,
          rawReports: p.reports || [],
          strokeReports: p.strokeReports || [], 
          cadicaReports: p.cadicaVideoReports || [], 
        };
      });

      return formattedPatients;
    } catch (error: any) {
      console.error("API Error in fetchAssignedPatients:", error);
      return rejectWithValue(error.message || 'Failed to fetch patients');
    }
  }
);

// --- GENERATE CADICA PREDICTION ---
export const generateCadicaPredictionThunk = createAsyncThunk(
  'doctor/generateCadicaPrediction',
  async (cadicaVideoReportId: number, { rejectWithValue }) => {
    try {
      const response = await doctorPredictCadica(cadicaVideoReportId);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to generate CADICA prediction');
    }
  }
);

// --- GET EXISTING CADICA PREDICTION ---
export const fetchCadicaPredictionThunk = createAsyncThunk(
  'doctor/fetchCadicaPrediction',
  async (cadicaVideoReportId: number, { rejectWithValue }) => {
    try {
      const response = await doctorGetCadicaPrediction(cadicaVideoReportId);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch CADICA prediction');
    }
  }
);

// --- GET STROKE PREDICTION ---
export const fetchStrokePredictionThunk = createAsyncThunk(
  'doctor/fetchStrokePrediction',
  async (strokeReportId: number, { rejectWithValue }) => {
    try {
      const response = await doctorGetStrokePrediction(strokeReportId);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch Stroke prediction');
    }
  }
);

// --- GET CARDIO (OCR + NLP) PREDICTION DETAILS ---
export const fetchCardioReportDetailsThunk = createAsyncThunk(
  'doctor/fetchCardioReportDetails',
  async (reportId: number, { rejectWithValue }) => {
    try {
      // 🔥 Nayi API hit kar rahay hain jo NLP data bhi layegi
      const response = await getCardioReportDetails(reportId);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch Cardio report details');
    }
  }
);

// --- SAVE DOCTOR FCM TOKEN ---
export const saveDoctorFcmToken = createAsyncThunk<any, string>(
  'doctor/saveFcmToken',
  async (token, { rejectWithValue }) => {
    try {
      const response = await updateDoctorFcmToken(token);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to save FCM token');
    }
  }
);

// --- HISTORY THUNKS ---

export const fetchPatientOcrHistoryThunk = createAsyncThunk(
  'doctor/fetchOcrHistory',
  async (patientId: number, { rejectWithValue }) => {
    try {
      const response = await getDoctorPatientOcrHistory(patientId);
      // Data safe extraction: array aaye ya object, donon cover hain
      if (Array.isArray(response)) {
          return response[0]?.patient?.reports || response;
      }
      return response.reports || response.data || []; 
    } catch (error: any) { return rejectWithValue(error.message); }
  }
);

export const fetchPatientStrokeHistoryThunk = createAsyncThunk(
  'doctor/fetchStrokeHistory',
  async (patientId: number, { rejectWithValue }) => {
    try {
      const response = await getDoctorPatientStrokeHistory(patientId);
      // Data safe extraction
      if (Array.isArray(response)) {
          return response[0]?.patient?.strokeReports || response;
      }
      return response.strokeReports || response.data || []; 
    } catch (error: any) { return rejectWithValue(error.message); }
  }
);

export const fetchPatientCadicaHistoryThunk = createAsyncThunk(
  'doctor/fetchCadicaHistory',
  async (patientId: number, { rejectWithValue }) => {
    try {
      const response = await getDoctorPatientCadicaHistory(patientId);
      // Data safe extraction
      if (Array.isArray(response)) {
          return response[0]?.patient?.cadicaVideoReports || response;
      }
      return response.cadicaVideoReports || response.data || []; 
    } catch (error: any) { return rejectWithValue(error.message); }
  }
);

// --- REDUX SLICE ---
const doctorSlice = createSlice({
  name: 'doctor',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      // Fetch Assigned Patients
      .addCase(fetchAssignedPatients.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAssignedPatients.fulfilled, (state, action) => {
        state.loading = false;
        state.patients = action.payload;
      })
      .addCase(fetchAssignedPatients.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // OCR History
      .addCase(fetchPatientOcrHistoryThunk.fulfilled, (state, action) => {
        state.ocrHistory = action.payload;
      })
      // Stroke History
      .addCase(fetchPatientStrokeHistoryThunk.fulfilled, (state, action) => {
        state.strokeHistory = action.payload;
      })
      // Cadica History
      .addCase(fetchPatientCadicaHistoryThunk.fulfilled, (state, action) => {
        state.cadicaHistory = action.payload;
      });
  },
});

export default doctorSlice.reducer;