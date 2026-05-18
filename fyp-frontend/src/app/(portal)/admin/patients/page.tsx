"use client";
import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import ReusableTable from '@/components/ui/ReusableTable';
import GenericFormModal from '@/components/ui/GenericFormModal';
import { Loader2 } from 'lucide-react';
import { getPatients, createPatient, updatePatient, deletePatient, getDoctors } from '@/services/apiService';
import toast from 'react-hot-toast';

// ==========================================
// TYPES & INTERFACES
// ==========================================

// Backend se aane walay patient ka structure
interface PatientResponse {
  patientid: number;
  fullname: string;
  email: string;
  age?: number;
  gender?: string;
  contactnumber?: string;
  address?: string;
  assignedDoctorName?: string;
}

// Backend se aane walay doctor ka structure
interface DoctorResponse {
  doctorid: number;
  fullname: string;
}

// Frontend table mein jo data map hoga uska structure
interface PatientTableRow {
  id: number;
  name: string;
  email: string;
  age?: number;
  gender?: string;
  contact?: string;
  address?: string;
  assignedDoctor: string;
  original: PatientResponse;
}

// Modal se jo form data aayega uska structure
interface PatientFormData {
  fullName: string;
  email: string;
  age: string; 
  gender: string;
  contact: string;
  address: string;
  assignedDoctor?: string;
}

// Payload jo backend ko bheja jayega
interface PatientPayload {
  fullname: string;
  age: number;
  gender: string;
  contactnumber: string;
  address: string;
  email?: string;
}

export default function ManagePatients() {
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isSidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const [currentPatient, setCurrentPatient] = useState<PatientTableRow | null>(null);
  
  // States with proper types
  const [patientsData, setPatientsData] = useState<PatientTableRow[]>([]);
  const [doctorsList, setDoctorsList] = useState<string[]>([]); 
  const [loading, setLoading] = useState<boolean>(true);

  const columns = [
    { header: 'Patient Name', accessor: 'name' },
    { header: 'Email', accessor: 'email' },
    { header: 'Age', accessor: 'age' },
    { header: 'Gender', accessor: 'gender' },
    { header: 'Contact', accessor: 'contact' },
    { header: 'Assigned Doctor', accessor: 'assignedDoctor' }, 
  ];

  // ==========================================
  // 1. FETCH DATA (SMART VERSION)
  // ==========================================
  const loadData = async () => {
    setLoading(true);
    try {
      // --- FIX: as Promise<any> laga diya taake TS error na de ---
      const [patientsRes, doctorsRes] = await Promise.all([
        getPatients() as Promise<any>, 
        getDoctors() as Promise<any>
      ]);

      // 🔴 DEBUGGING: F12 daba kar console mein lazmi dekhna ke backend kya bhej raha hai
      console.log("RAW PATIENTS API RESPONSE:", patientsRes);
      console.log("RAW DOCTORS API RESPONSE:", doctorsRes);

      // --- SMART ARRAY EXTRACTION ---
      const actualPatientsArray = Array.isArray(patientsRes) 
        ? patientsRes 
        : (patientsRes?.data || patientsRes?.patients || []);

      const actualDoctorsArray = Array.isArray(doctorsRes) 
        ? doctorsRes 
        : (doctorsRes?.data || doctorsRes?.doctors || []);

      // Map Patients Data
      const formattedPatients: PatientTableRow[] = actualPatientsArray.map((p: any) => ({
        id: p.patientid,
        name: p.fullname,
        email: p.email,
        age: p.age,
        gender: p.gender,
        contact: p.contactnumber,
        address: p.address,
        assignedDoctor: p.assignedDoctor?.fullname || 'Unassigned',
        original: p
      }));
      setPatientsData(formattedPatients);

      // Map Doctors Data for Dropdown
      const formattedDoctors: string[] = actualDoctorsArray.map((d: any) => d.fullname);
      setDoctorsList(formattedDoctors);

    } catch (error: any) {
      console.error("GET DATA ERROR:", error);
      toast.error(error.message || "Error loading data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // ==========================================
  // 2. DELETE DATA
  // ==========================================
  const handleDelete = async (row: PatientTableRow) => {
    if(confirm(`Are you sure you want to delete ${row.name}?`)) {
      try {
        await deletePatient(row.id);
        toast.success("Patient deleted successfully!");
        loadData(); 
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
        toast.error("Failed to delete")
      }
    }
  };

//  // ==========================================
//   // 3. ADD / UPDATE DATA
//   // ==========================================
//   const handleSavePatient = async (formData: PatientFormData) => {
//     try {
//       if (currentPatient) {
//         // --- UPDATE PATIENT LOGIC ---
//         // Yahan hum UpdatePatientDto ka structure follow kar rahay hain
//         const updatePayload: any = {
//           fullname: formData.fullName,
//           age: formData.age ? parseInt(formData.age, 10) : 0,
//           gender: formData.gender,
//           contactnumber: String(formData.contact),
//           address: formData.address,
//         };

//         // Sirf tab email add karo jab change hui ho
//         if (formData.email !== currentPatient.email) {
//           updatePayload.email = formData.email;
//         }

//         await updatePatient(currentPatient.id, updatePayload);
//         toast.success("Patient updated successfully!");

//       } else {
//         // --- CREATE PATIENT LOGIC ---
//         // Yahan CreatePatientDto ka strict structure follow ho raha hai (email lazmi hai)
//         const createPayload = {
//           fullname: formData.fullName,
//           email: formData.email, // TypeScript ab khush hai kyunke email confirm string hai
//           age: formData.age ? parseInt(formData.age, 10) : 0,
//           gender: formData.gender,
//           contactnumber: String(formData.contact),
//           address: formData.address,
//         };

//         await createPatient(createPayload);
//         toast.success("New patient added successfully!");
//       }

//       setIsModalOpen(false);
//       setCurrentPatient(null);
//       loadData(); 

//     } catch (error: unknown) {
//       const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
//       toast.error("Error saving patient")
//     }
//   };

// ==========================================
  // 3. ADD / UPDATE DATA
  // ==========================================
  const handleSavePatient = async (formData: PatientFormData) => {
    try {
      if (currentPatient) {
        // --- UPDATE PATIENT LOGIC ---
        const updatePayload: any = {
          fullname: formData.fullName,
          age: formData.age ? parseInt(formData.age, 10) : 0,
          gender: formData.gender,
          contactnumber: String(formData.contact),
          address: formData.address,
        };

        if (formData.email !== currentPatient.email) {
          updatePayload.email = formData.email;
        }

        await updatePatient(currentPatient.id, updatePayload);
        toast.success("Patient updated successfully!");

      } else {
        // --- CREATE PATIENT LOGIC ---
        const createPayload = {
          fullname: formData.fullName,
          email: formData.email, 
          age: formData.age ? parseInt(formData.age, 10) : 0,
          gender: formData.gender,
          contactnumber: String(formData.contact),
          address: formData.address,
          doctorName: formData.assignedDoctor, // <-- FIX 2: Yahan se backend ko doctor ka naam jayega!
        };

        // Agar user ne dropdown se ghalti se "Loading doctors..." select kar liya toh usay mat bhejo
        if (createPayload.doctorName === 'Loading doctors...') {
           delete createPayload.doctorName;
        }

        await createPatient(createPayload);
        toast.success("New patient added & doctor assigned successfully!");
      }

      setIsModalOpen(false);
      setCurrentPatient(null);
      loadData(); 

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
      
      // 1. Toast mein backend ka asli error dikhao
      toast.error(errorMessage);
      
      // 2. ERROR KO WAPAS THROW KARO! 
      // Is line ki wajah se GenericFormModal ko pata chalega ke error aaya hai 
      // aur wo laal dabba (banner) form ke andar show karega.
      throw new Error(errorMessage);
    }
  };
  // --- MODAL HANDLERS ---
  const handleEdit = (row: PatientTableRow) => {
    setCurrentPatient(row);
    setIsModalOpen(true);
  };

  const openAddModal = () => {
    setCurrentPatient(null);
    setIsModalOpen(true);
  };

  // --- FORM FIELDS ---
  // const patientFields = [
  //   { name: 'fullName', label: 'Full Name', type: 'text', placeholder: 'John Smith', required: true },
  //   { name: 'email', label: 'Email Address', type: 'email', placeholder: 'patient@example.com', required: true },
  //   { name: 'age', label: 'Age', type: 'number', placeholder: '45', required: true },
  //   { name: 'gender', label: 'Gender', type: 'select', options: ['Male', 'Female', 'Other'], required: true },
  //   { name: 'contact', label: 'Contact Number', type: 'number', placeholder: '03001234567', required: true },
  //   { name: 'address', label: 'Address', type: 'textarea', placeholder: "Enter patient's address", required: true },
  //   { 
  //     name: 'assignedDoctor', 
  //     label: 'Assign Doctor', 
  //     type: 'select', 
  //     options: doctorsList.length > 0 ? doctorsList : ['Loading doctors...'], 
  //     required: false 
  //   },
  // ];

  // --- FORM FIELDS ---
  const patientFields = [
    { 
      name: 'fullName', label: 'Full Name', type: 'text', placeholder: 'John Smith', required: true,
      pattern: { value: /^[A-Za-z. ]+$/, message: 'Only alphabets are allowed' }
    },
    { 
      name: 'email', label: 'Email Address', type: 'email', placeholder: 'patient@example.com', required: true,
      pattern: { value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i, message: 'Invalid email format' }
    },
    { 
      name: 'age', label: 'Age', type: 'number', placeholder: '45', required: true,
      validate: (val: any) => (val > 0 && val <= 120) || 'Age must be between 1 and 120'
    },
    { name: 'gender', label: 'Gender', type: 'select', options: ['Male', 'Female', 'Other'], required: true },
    { 
      name: 'contact', label: 'Contact Number', type: 'number', placeholder: '03001234567', required: true,
      minLength: 11, pattern: { value: /^[0-9]+$/, message: 'Invalid phone number' }
    },
    { name: 'address', label: 'Address', type: 'textarea', placeholder: "Enter patient's address", required: true },
    { 
      name: 'assignedDoctor', label: 'Assign Doctor', type: 'select', 
      options: doctorsList.length > 0 ? doctorsList : ['Loading doctors...'], required: false 
    },
  ];

  return (
    <div className="flex bg-slate-50 min-h-screen font-sans">
      <Sidebar role="admin" isOpen={isSidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      <main className="w-full lg:ml-64 p-4 sm:p-6 lg:p-8 transition-all duration-300">
        <Header title="Manage Patients" onMenuClick={() => setSidebarOpen(true)} />
        
        {loading ? (
           <div className="flex justify-center items-center h-64">
             <Loader2 className="animate-spin text-indigo-600" size={40} />
           </div>
        ) : (
          <ReusableTable 
            title="All Patients" 
            columns={columns} 
            data={patientsData} 
            actionLabel="Add New Patient"
            onAdd={openAddModal}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        )}

        <GenericFormModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={currentPatient ? "Edit Patient" : "Add New Patient"}
          fields={patientFields}
          onSubmit={handleSavePatient}
          submitLabel={currentPatient ? "Update Patient" : "Save Patient"}
          initialData={currentPatient ? {
              fullName: currentPatient.name,
              email: currentPatient.email,
              age: String(currentPatient.age || ''), // Convert number to string for input
              gender: currentPatient.gender || '',
              contact: currentPatient.contact || '',
              address: currentPatient.address || '',
              assignedDoctor: currentPatient.assignedDoctor
          } : null}
        />
      </main>
    </div>
  );
}