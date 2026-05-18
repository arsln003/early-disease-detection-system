/**
 * @file apiService.ts
 * @description Centralized API service for Authentication and Admin operations.
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

// ==========================================
// 1. INTERFACES (Mapped from Backend DTOs)
// ==========================================

export interface CreateDoctorDto {
  fullname: string;
  email: string;
  password?: string;
  specialization?: string;
  experience?: number;
  contactnumber?: string;
  status?: string;
}

export interface UpdateDoctorDto {
  fullname?: string;
  specialization?: string;
  email?: string;
  status?: string;
  password?: string;
}

export interface CreatePatientDto {
  fullname: string;
  email: string;
  age?: number;
  gender?: string;
  contactnumber?: string;
  address?: string;
  doctorName?: string;
}

export interface UpdatePatientDto {
  fullname?: string;
  email?: string;
  age?: number;
  gender?: string;
  contactnumber?: string;
  address?: string;
}

export interface CreateRadiologistDto {
  fullname: string;
  email: string;
  password?: string;
  contactnumber?: string;
  status?: string;
}

export interface UpdateRadiologistDto {
  fullname?: string;
  email?: string;
  password?: string;
  contactnumber?: string;
  status?: string;
}

// ==========================================
// 2. CORE FETCH WRAPPER
// ==========================================

async function fetchWithAuth<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
  
  const headers = new Headers(options.headers);

  // Set Content-Type to JSON if not sending FormData
  if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  // Inject JWT token if it exists
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  // Handle HTTP Errors
  if (!response.ok) {
    let errorMessage = 'API request failed';
    try {
      const errorData = await response.json();
      errorMessage = errorData.message || errorMessage;
    } catch (e) {
      errorMessage = response.statusText || errorMessage;
    }
    throw new Error(errorMessage);
  }

  // Handle empty responses
  const text = await response.text();
  return text ? JSON.parse(text) : ({} as T);
}

// ==========================================
// 3. AUTHENTICATION APIs
// ==========================================

export const adminLogin = async (data: any): Promise<any> => {
  return fetchWithAuth('/auth/admin/login', {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

export const doctorLogin = async (data: any): Promise<any> => {
  return fetchWithAuth('/auth/doctor/login', {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

export const radiologistLogin = async (data: any): Promise<any> => {
  return fetchWithAuth('/auth/radiologist/login', {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

// ==========================================
// 4. ADMIN DASHBOARD APIs
// ==========================================

export const getDashboardStats = async (): Promise<any> => {
  return fetchWithAuth('/admin/dashboard/stats', {
    method: 'GET',
  });
};

// ==========================================
// 5. ADMIN - DOCTORS APIs
// ==========================================

export const getDoctors = async (): Promise<any[]> => {
  return fetchWithAuth('/admin/doctors', {
    method: 'GET',
  });
};

export const createDoctor = async (data: CreateDoctorDto): Promise<any> => {
  return fetchWithAuth('/admin/doctors', {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

export const updateDoctor = async (id: number, data: UpdateDoctorDto): Promise<any> => {
  return fetchWithAuth(`/admin/doctors/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
};

export const deleteDoctor = async (id: number): Promise<any> => {
  return fetchWithAuth(`/admin/doctors/${id}`, {
    method: 'DELETE',
  });
};

// ==========================================
// 6. ADMIN - PATIENTS APIs
// ==========================================

export const getPatients = async (): Promise<any[]> => {
  return fetchWithAuth('/admin/patients', {
    method: 'GET',
  });
};

export const createPatient = async (data: CreatePatientDto): Promise<any> => {
  return fetchWithAuth('/admin/patients', {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

export const updatePatient = async (id: number, data: UpdatePatientDto): Promise<any> => {
  return fetchWithAuth(`/admin/patients/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
};

export const deletePatient = async (id: number): Promise<any> => {
  return fetchWithAuth(`/admin/patients/${id}`, {
    method: 'DELETE',
  });
};

// ==========================================
// 7. ADMIN - RADIOLOGISTS APIs
// ==========================================

export const getRadiologists = async (): Promise<any[]> => {
  return fetchWithAuth('/admin/radiologists', {
    method: 'GET',
  });
};

export const getRadiologistsWithReportCount = async (): Promise<any[]> => {
  return fetchWithAuth('/admin/radiologists/with-report-count', {
    method: 'GET',
  });
};

export const createRadiologist = async (data: CreateRadiologistDto): Promise<any> => {
  return fetchWithAuth('/admin/radiologists', {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

export const updateRadiologist = async (id: number, data: UpdateRadiologistDto): Promise<any> => {
  return fetchWithAuth(`/admin/radiologists/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
};

export const deleteRadiologist = async (id: number): Promise<any> => {
  return fetchWithAuth(`/admin/radiologists/${id}`, {
    method: 'DELETE',
  });
};

// ==========================================
// 8. RADIOLOGIST PORTAL APIs
// ==========================================

/**
 * Get logged-in radiologist's profile (including their reports)
 */
export const getRadiologistProfile = async (): Promise<any> => {
  return fetchWithAuth('/radiologists/me', {
    method: 'GET',
  });
};

/**
 * Upload Report and run OCR (Accepts FormData containing 'file', 'patientId', 'comment')
 */
export const uploadOcrReport = async (formData: FormData): Promise<any> => {
  // fetchWithAuth automatically handles FormData headers
  return fetchWithAuth('/radiologists/upload-ocr', {
    method: 'POST',
    body: formData,
  });
};

/**
 * Get all reports for a specific patient
 */
export const getReportsByPatientId = async (patientId: number): Promise<any> => {
  return fetchWithAuth(`/radiologists/reports/${patientId}`, {
    method: 'GET',
  });
};

/**
 * Generate AI Prediction for a specific report
 */
export const generatePrediction = async (reportId: number): Promise<any> => {
  return fetchWithAuth(`/radiologists/predict/${reportId}`, {
    method: 'POST',
  });
};

/**
 * Fetch an existing prediction for a report
 */
export const getPrediction = async (reportId: number): Promise<any> => {
  return fetchWithAuth(`/radiologists/prediction/${reportId}`, {
    method: 'GET',
  });
};

export const createPrediction = async (reportId: number): Promise<any> => {
  return fetchWithAuth(`/radiologists/predict/${reportId}`, {
    method: 'POST',
  });
};

// services/api Service.ts

// Nayi API: Saari reports laane ke liye
export const getAllReports = async () => {
  return fetchWithAuth('/radiologists/all-reports', {
    method: 'GET',
  }); 
};

export const getAllPatients = async () => {
  return fetchWithAuth('/radiologists/patients', {
    method: 'GET',
  });
};  

// ==========================================
// 9. DOCTOR PORTAL APIs
// ==========================================

/**
 * Get all patients assigned to the currently logged-in doctor.
 * (Uses the JWT token to identify the doctor)
 */
export const getMyPatients = async (): Promise<any> => {
  return fetchWithAuth('/doctors/my-patients', {
    method: 'GET',
  });
};

/**
 * Get detailed list of assigned patients for a specific doctor, 
 * optionally filtered by severity (all | critical | moderate | normal)
 */
export const getAssignedPatientsWithDetails = async (
  doctorId: number, 
  severity: string = 'all' // <-- FIX: severity parameter uncomment kiya
): Promise<any> => {
  // <-- FIX: URL mein ?severity=${severity} add kiya
  return fetchWithAuth(`/doctors/${doctorId}/assigned-patients/details?severity=${severity}`, {
    method: 'GET',
  });
};

// ==========================================
// 10. NEW DOCTOR APIs (FCM & Predictions)
// ==========================================

/**
 * Save Firebase FCM Token for the logged-in doctor
 */
export const updateDoctorFcmToken = async (fcmtoken: string): Promise<any> => {
  return fetchWithAuth('/doctors/fcm-token', {
    method: 'PATCH',
    body: JSON.stringify({ fcmtoken }),
  });
};

/**
 * Generate AI Prediction for a specific report (Doctor Portal)
 */
export const doctorGeneratePrediction = async (reportId: number): Promise<any> => {
  return fetchWithAuth(`/doctors/predict/${reportId}`, {
    method: 'POST',
  });
};

/**
 * Fetch an existing prediction for a report (Doctor Portal)
 */
export const doctorGetPrediction = async (reportId: number): Promise<any> => {
  return fetchWithAuth(`/doctors/prediction/${reportId}`, {
    method: 'GET',
  });
};

// ==========================================
// 11. NEW RADIOLOGIST APIs
// ==========================================

/**
 * Send a finalized report to the assigned doctor (Triggers Notification)
 */
export const sendReportToDoctor = async (reportId: number, comment?: string): Promise<any> => {
  return fetchWithAuth(`/radiologists/send-report/${reportId}`, {
    method: 'POST',
    body: JSON.stringify({ comment }),
  });
};

/**
 * Upload CADICA Videos for a specific patient
 */
export const uploadCadicaVideosFile = async (patientId: number, formData: FormData): Promise<any> => {
  return fetchWithAuth(`/radiologists/patients/${patientId}/upload-cadica-videos`, {
    method: 'POST',
    body: formData,
  });
};

// ==========================================
// 12. STROKE & CADICA APIs (RADIOLOGIST)
// ==========================================

export const getAllCadicaVideoReports = async (): Promise<any> => {
  return fetchWithAuth('/radiologists/all-cadica-video-reports', { method: 'GET' });
};

export const getCadicaVideoReportsByPatientId = async (patientId: number): Promise<any> => {
  return fetchWithAuth(`/radiologists/patients/${patientId}/cadica-video-reports`, { method: 'GET' });
};

export const getAllStrokeReports = async (): Promise<any> => {
  return fetchWithAuth('/radiologists/all-stroke-reports', { method: 'GET' });
};

export const getStrokeReportsByPatientId = async (patientId: number): Promise<any> => {
  return fetchWithAuth(`/radiologists/patients/${patientId}/stroke-reports`, { method: 'GET' });
};

export const uploadStrokeImageForPatient = async (patientId: number, formData: FormData): Promise<any> => {
  return fetchWithAuth(`/radiologists/patients/${patientId}/upload-stroke-image`, {
    method: 'POST',
    body: formData,
  });
};

// ==========================================
// 13. STROKE & CADICA PREDICTION APIs (DOCTOR)
// ==========================================

export const doctorPredictCadica = async (cadicaVideoReportId: number): Promise<any> => {
  return fetchWithAuth(`/doctors/cadica-video-reports/${cadicaVideoReportId}/predict`, { method: 'POST' });
};

export const doctorGetCadicaPrediction = async (cadicaVideoReportId: number): Promise<any> => {
  return fetchWithAuth(`/doctors/cadica-video-reports/${cadicaVideoReportId}/prediction`, { method: 'GET' });
};

export const doctorGetStrokePrediction = async (strokeReportId: number): Promise<any> => {
  return fetchWithAuth(`/doctors/stroke-reports/${strokeReportId}/prediction`, { method: 'GET' });
};

// ==========================================
// 14. DOCTOR: PATIENT REPORT HISTORY APIs
// ==========================================

export const getDoctorPatientOcrHistory = async (patientId: number): Promise<any> => {
  return fetchWithAuth(`/doctors/all-reports/${patientId}`, { method: 'GET' });
};

export const getDoctorPatientCadicaHistory = async (patientId: number): Promise<any> => {
  return fetchWithAuth(`/doctors/all-cadica-video-reports/${patientId}`, { method: 'GET' });
};

export const getDoctorPatientStrokeHistory = async (patientId: number): Promise<any> => {
  return fetchWithAuth(`/doctors/all-stroke-reports/${patientId}`, { method: 'GET' });
};

// ==========================================
// DOCTOR DASHBOARD - NEW APIs
// ==========================================

export const getAssignedPatientsCount = async (doctorId: number): Promise<any> => {
  return fetchWithAuth(`/doctors/assigned-patients-count/${doctorId}`, { method: 'GET' });
};

export const getAssignedCardioPatients = async (doctorId: number): Promise<any> => {
  return fetchWithAuth(`/doctors/${doctorId}/assigned-cardio-patients/details?severity=all`, { method: 'GET' });
};

export const getAssignedStrokePatients = async (doctorId: number): Promise<any> => {
  return fetchWithAuth(`/doctors/${doctorId}/assigned-stroke-patients/details?severity=all`, { method: 'GET' });
};

export const getAssignedCadicaPatients = async (doctorId: number): Promise<any> => {
  return fetchWithAuth(`/doctors/${doctorId}/assigned-cadica-patients/details`, { method: 'GET' });
};

// ==========================================
// SINGLE REPORT DETAILS APIs (For Notifications)
// ==========================================

export const getCardioReportDetails = async (reportId: number): Promise<any> => {
  return fetchWithAuth(`/doctors/cardio-reports/${reportId}`, { method: 'GET' });
};

// Agar stroke ki single API pehle se nahi hai toh yeh add kar lo:
export const getStrokeReportDetails = async (strokeReportId: number): Promise<any> => {
  return fetchWithAuth(`/doctors/stroke-reports/${strokeReportId}`, { method: 'GET' });
};

// ==========================================
// ADMIN PROFILE API
// ==========================================
export const getAdminProfile = async (adminId: number): Promise<any> => {
  return fetchWithAuth(`/admin/get-profile/${adminId}`, {
    method: 'GET',
  });
};

// ==========================================
// DOCTOR PROFILE API
// ==========================================
export const getDoctorProfileData = async (doctorId: number): Promise<any> => {
  return fetchWithAuth(`/doctors/get-profile/${doctorId}`, {
    method: 'GET',
  });
};