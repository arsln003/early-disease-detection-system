import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
// Yahan teeno APIs import ki hain
import { getAllReports, getPrediction, uploadOcrReport, getAllPatients, createPrediction,uploadCadicaVideosFile } from '@/services/apiService';
import { sendReportToDoctor } from '@/services/apiService';

import { 
  getAllCadicaVideoReports, 
  getCadicaVideoReportsByPatientId,
  getAllStrokeReports,
  getStrokeReportsByPatientId,
  uploadStrokeImageForPatient 
} from '@/services/apiService';

export interface UploadRecord {
  id: number;
  patientName: string;
  age: number | string;
  gender: string;
  reportType: string;
  uploadDate: string;
  status: string;
  prediction: number | null;
  features: any;
  notes?: string;
  filename?: string;
}

interface ReportState {
  uploads: UploadRecord[];
  loading: boolean;
  error: string | null;
  patients: any[];
  selectedPredictionData: any | null;
  isPredictionLoading: boolean;
  isPatientsLoading: boolean;
  
  // --- FIX: NAYI STATES ADD KI HAIN ---
  strokeReports: any[];
  cadicaReports: any[];
  isUploadingStroke: boolean; 
}

const initialState: ReportState = {
  uploads: [],
  loading: false,
  error: null,
  patients: [],
  selectedPredictionData: null,
  isPredictionLoading: false,
  isPatientsLoading: false,
  
  // --- FIX: INIT NAYI STATES ---
  strokeReports: [],
  cadicaReports: [],
  isUploadingStroke: false,
};

// --- THUNKS (API CALLS) ---

// 1. Table ke liye saari reports layen
export const fetchHistory = createAsyncThunk(
  'reports/fetchHistory',
  async (_, { rejectWithValue }) => {
    try {
      const data:any = await getAllReports(); 
      
      const reportsArray = Array.isArray(data) ? data : data.reports || [];

      const mappedReports: UploadRecord[] = reportsArray.map((r: any) => {
        let currentStatus = 'Processed';
        let predictionVal = null;

        if (r.feature && r.feature.cardio !== undefined) {
          predictionVal = r.feature.cardio;
          currentStatus = predictionVal === 1 ? 'High Risk' : 'Low Risk';
        }

        return {
          id: r.reportid || r.id || Math.random(),
          patientName: r.patient?.fullname || 'Unknown Patient',
          age: r.patient?.age || 'N/A',
          gender: r.patient?.gender == 1 ? 'Female' : 'Male',
          reportType: r.filename || 'Document',
          uploadDate: r.uploadedat ? new Date(r.uploadedat).toLocaleDateString() : 'N/A',
          status: currentStatus,
          prediction: predictionVal,
          features: r.feature || null,
          notes: r.comment || 'No notes added.',
          filename: r.filename
        };
      });
      
      return mappedReports.reverse();
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to load upload history.');
    }
  }
);

// 2. Naya Thunk: View button dabane par specific prediction layega
export const fetchPredictionData = createAsyncThunk(
  'reports/fetchPredictionData',
  async (reportId: number, { rejectWithValue }) => {
    try {
      const data = await getPrediction(reportId);
      return data; 
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to load prediction details.');
    }
  }
);
export const createPredictionData = createAsyncThunk(
  'reports/createPredictionData',
  async (reportId: number, { rejectWithValue }) => {
    try {
      const data = await createPrediction(reportId);
      return data; 
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to load prediction details.');
    }
  }
);

// 3. Upload Report Thunk (Yeh aapke code se miss ho gaya tha)
export const uploadReport = createAsyncThunk(
  'reports/uploadReport',
  async (formData: FormData, { rejectWithValue }) => {
    try {
      const response = await uploadOcrReport(formData);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Upload failed.');
    }
  }
);

export const fetchPatients = createAsyncThunk(
  'reports/fetchPatients',
  async (_, { rejectWithValue }) => {
    try {
      const data: any = await getAllPatients();
      // Agar API array bhej rahi hai toh direct return karein, warna data.data waghera check kar lein
      return Array.isArray(data) ? data : data.patients || [];
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to load patients.');
    }
  }
);

export const uploadCadicaVideos = createAsyncThunk<
  any, 
  { patientId: number; formData: FormData }
>(
  'reports/uploadCadicaVideos',
  async ({ patientId, formData }, { rejectWithValue }) => {
    try {
      const response = await uploadCadicaVideosFile(patientId, formData);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to upload CADICA videos');
    }
  }

  
);


// OCR Report upload hone ke baad Doctor ko notification bhejney ka Thunk
export const sendReportNotification = createAsyncThunk<any, { reportId: number; comment?: string }>(
  'reports/sendNotification',
  async ({ reportId, comment }, { rejectWithValue }) => {
    try {
      const response = await sendReportToDoctor(reportId, comment);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to send notification');
    }
  }
);

// --- CADICA REPORTS ---
export const fetchAllCadicaReports = createAsyncThunk(
  'reports/fetchAllCadicaReports',
  async (_, { rejectWithValue }) => {
    try {
      const response = await getAllCadicaVideoReports();
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch CADICA reports');
    }
  }
);

// --- STROKE REPORTS ---
export const fetchAllStrokeReports = createAsyncThunk(
  'reports/fetchAllStrokeReports',
  async (_, { rejectWithValue }) => {
    try {
      const response = await getAllStrokeReports();
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch Stroke reports');
    }
  }
);

// --- UPLOAD STROKE IMAGE ---
export const uploadStrokeImage = createAsyncThunk<
  any, 
  { patientId: number; formData: FormData }
>(
  'reports/uploadStrokeImage',
  async ({ patientId, formData }, { rejectWithValue }) => {
    try {
      const response = await uploadStrokeImageForPatient(patientId, formData);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to upload Stroke image');
    }
  }
);
// --- SLICE ---
const reportSlice = createSlice({
  name: 'reports',
  initialState,
  reducers: {
    // Modal band hone par purana data clear karne ke liye
    clearPredictionData: (state) => {
      state.selectedPredictionData = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // -----------------------------
      // Fetch History Cases
      // -----------------------------
      .addCase(fetchHistory.pending, (state) => { 
          state.loading = true; 
          state.error = null; 
      })
      .addCase(fetchHistory.fulfilled, (state, action: PayloadAction<UploadRecord[]>) => { 
          state.loading = false; 
          state.uploads = action.payload; 
      })
      .addCase(fetchHistory.rejected, (state, action) => { 
          state.loading = false; 
          state.error = action.payload as string; 
      })
      
      // -----------------------------
      // Fetch Specific Prediction Cases
      // -----------------------------
      .addCase(fetchPredictionData.pending, (state) => {
        state.isPredictionLoading = true;
        state.selectedPredictionData = null;
      })
      .addCase(fetchPredictionData.fulfilled, (state, action) => {
        state.isPredictionLoading = false;
        state.selectedPredictionData = action.payload;
      })
      .addCase(fetchPredictionData.rejected, (state) => {
        state.isPredictionLoading = false;
      })

      // -----------------------------
      // Upload Report Cases
      // -----------------------------
      .addCase(uploadReport.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(uploadReport.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(uploadReport.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      .addCase(fetchPatients.pending, (state) => {
        state.isPatientsLoading = true;
      })
      .addCase(fetchPatients.fulfilled, (state, action) => {
        state.isPatientsLoading = false;
        state.patients = action.payload;
      })
      .addCase(fetchPatients.rejected, (state) => {
        state.isPatientsLoading = false;
      })

      .addCase(fetchAllStrokeReports.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchAllStrokeReports.fulfilled, (state, action) => {
        state.loading = false;
        state.strokeReports = action.payload; // Stroke data save ho gaya
      })
      .addCase(fetchAllStrokeReports.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // -----------------------------
      // UPLOAD STROKE IMAGE
      // -----------------------------
      .addCase(uploadStrokeImage.pending, (state) => {
        state.isUploadingStroke = true;
        state.error = null;
      })
      .addCase(uploadStrokeImage.fulfilled, (state) => {
        state.isUploadingStroke = false;
      })
      .addCase(uploadStrokeImage.rejected, (state, action) => {
        state.isUploadingStroke = false;
        state.error = action.payload as string;
      })

      // -----------------------------
      // FETCH CADICA REPORTS
      // -----------------------------
      .addCase(fetchAllCadicaReports.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchAllCadicaReports.fulfilled, (state, action) => {
        state.loading = false;
        state.cadicaReports = action.payload; // Cadica data save ho gaya
      })
      .addCase(fetchAllCadicaReports.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
      
  },
});

export const { clearPredictionData } = reportSlice.actions;
export default reportSlice.reducer;