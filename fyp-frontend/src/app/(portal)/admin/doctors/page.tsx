"use client";
import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import ReusableTable from '@/components/ui/ReusableTable';
import GenericFormModal from '@/components/ui/GenericFormModal';
import { Loader2 } from 'lucide-react';
import { getDoctors, createDoctor, updateDoctor, deleteDoctor } from '@/services/apiService';
import toast from 'react-hot-toast';

// ==========================================
// TYPES & INTERFACES
// ==========================================

// Backend se aane walay doctor ka structure
interface DoctorResponse {
  doctorid: number;
  fullname: string;
  specialization?: string;
  email: string;
  status?: string;
  contactnumber?: string;
  experience?: number;
}

// Frontend table mein jo data map hoga uska structure
interface DoctorTableRow {
  id: number;
  name: string;
  specialization: string;
  email: string;
  status: string;
  contact: string;
  experience: number;
  original: DoctorResponse;
}

// Modal se jo form data aayega uska structure
interface DoctorFormData {
  fullName: string;
  email: string;
  specialization: string;
  contact: string;
  experience: string; // Form inputs usually string return karte hain
  status: string;
  password?: string;
}

// Payload jo backend ko bheja jayega
interface DoctorPayload {
  fullname: string;
  email: string;
  specialization: string;
  contactnumber: string;
  experience: number;
  status: string;
  password?: string;
}

export default function ManageDoctors() {
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isSidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const [currentDoctor, setCurrentDoctor] = useState<DoctorTableRow | null>(null);
  
  // States with proper types
  const [doctorsData, setDoctorsData] = useState<DoctorTableRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const columns = [
    { header: 'Doctor Name', accessor: 'name' },
    { header: 'Specialization', accessor: 'specialization' },
    { header: 'Email', accessor: 'email' },
    { header: 'Status', accessor: 'status' },
  ];

  // ==========================================
  // 1. FETCH DATA (GET)
  // ==========================================
  const loadDoctors = async () => {
    setLoading(true);
    try {
      const data = await getDoctors() as DoctorResponse[];
      
      const formattedData: DoctorTableRow[] = data.map((doc) => ({
        id: doc.doctorid,
        name: doc.fullname,
        specialization: doc.specialization || 'N/A',
        email: doc.email,
        status: doc.status || 'Active',
        contact: doc.contactnumber || '',
        experience: doc.experience || 0,
        original: doc
      }));
      
      setDoctorsData(formattedData);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
      // alert("Error loading doctors: " + errorMessage);
      toast.error("Error loading doctors")
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDoctors();
  }, []);

  // ==========================================
  // 2. DELETE DATA (DELETE)
  // ==========================================
  const handleDelete = async (row: DoctorTableRow) => {
    if(confirm(`Are you sure you want to delete ${row.name}?`)) {
      try {
        await deleteDoctor(row.id);
        // alert("Doctor deleted successfully!");
        toast.success("Doctor deleted successfully!")
        loadDoctors(); 
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
        // alert("Failed to delete: " + errorMessage);
        toast.error("Failed to delete")
      }
    }
  };

  // ==========================================
  // 3. ADD / UPDATE DATA (POST / PATCH)
  // ==========================================
  const handleSaveDoctor = async (formData: DoctorFormData) => {
    try {
      const payload: DoctorPayload = {
        fullname: formData.fullName,
        email: formData.email,
        specialization: formData.specialization,
        contactnumber: String(formData.contact), 
        experience: formData.experience ? parseInt(formData.experience, 10) : 0,
        status: formData.status
      };

      // Sirf tab password bhejo jab naya doctor add ho raha ho, 
      // ya update k waqt user ne explicitly naya password dala ho
      if (!currentDoctor || (formData.password && formData.password.trim() !== '')) {
        payload.password = formData.password;
      }

      if (currentDoctor) {
        await updateDoctor(currentDoctor.id, payload);
        // alert("Doctor updated successfully!");
        toast.success("Doctor updated successfully!")   
      } else {
        await createDoctor(payload);
        // alert("New doctor added successfully!");
        toast.success("New doctor added successfully!")
      }

      setIsModalOpen(false);
      setCurrentDoctor(null);
      loadDoctors(); 

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
  const handleEdit = (row: DoctorTableRow) => {
    setCurrentDoctor(row);
    setIsModalOpen(true);
  };

  const openAddModal = () => {
    setCurrentDoctor(null);
    setIsModalOpen(true);
  };

  // // --- FORM FIELDS ---
  // const doctorFields = [
  //   { name: 'fullName', label: 'Full Name', type: 'text', placeholder: 'Dr. John Smith', required: true },
  //   { name: 'specialization', label: 'Specialization', type: 'select', options: ['Cardiology', 'Neurology', 'Orthopedics', 'Pediatrics', 'General'], required: true },
  //   { name: 'email', label: 'Email Address', type: 'email', placeholder: 'doctor@hospital.com', required: true },
  //   { name: 'status', label: 'Status', type: 'select', options: ['Active', 'Inactive'], required: true },
  //   { name: 'password', label: 'Password', type: 'password', placeholder: currentDoctor ? 'Leave blank to keep same' : '........', required: !currentDoctor },
  //   { name: 'contact', label: 'Contact Number', type: 'number', placeholder: '03001234567', required: true },
  //   { name: 'experience', label: 'Experience (Years)', type: 'number', placeholder: '5', required: true },
  // ];

  // --- FORM FIELDS ---
  const doctorFields = [
    { 
      name: 'fullName', label: 'Full Name', type: 'text', placeholder: 'Dr. John Smith', required: true,
      pattern: { value: /^[A-Za-z. ]+$/, message: 'Only alphabets are allowed' }
    },
    { name: 'specialization', label: 'Specialization', type: 'select', options: ['Cardiology', 'Neurology', 'Orthopedics', 'Pediatrics', 'General'], required: true },
    { 
      name: 'email', label: 'Email Address', type: 'email', placeholder: 'doctor@hospital.com', required: true,
      pattern: { value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i, message: 'Invalid email format' }
    },
    { name: 'status', label: 'Status', type: 'select', options: ['Active', 'Inactive'], required: true },
    { 
      name: 'password', label: 'Password', type: 'password', placeholder: currentDoctor ? 'Leave blank to keep same' : '........', 
      required: !currentDoctor, minLength: 8 
    },
    { 
      name: 'contact', label: 'Contact Number', type: 'number', placeholder: '03001234567', required: true,
      minLength: 11, pattern: { value: /^[0-9]+$/, message: 'Invalid phone number' } 
    },
    { 
      name: 'experience', label: 'Experience (Years)', type: 'number', placeholder: '5', required: true,
      validate: (val: any) => (val >= 0 && val <= 60) || 'Experience must be between 0 and 60 years' 
    },
  ];

  return (
    <div className="flex bg-slate-50 min-h-screen font-sans">
      <Sidebar role="admin" isOpen={isSidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="w-full lg:ml-64 p-4 sm:p-6 lg:p-8 transition-all duration-300">
        <Header title="Manage Doctors" onMenuClick={() => setSidebarOpen(true)} />
        
        {loading ? (
          <div className="flex justify-center items-center h-64">
             <Loader2 className="animate-spin text-indigo-600" size={40} />
          </div>
        ) : (
          <ReusableTable 
            title="All Doctors" 
            columns={columns} 
            data={doctorsData} 
            actionLabel="Add New Doctor"
            onAdd={openAddModal}
            onEdit={handleEdit}   
            onDelete={handleDelete} 
          />
        )}

        <GenericFormModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={currentDoctor ? "Edit Doctor" : "Add New Doctor"}
          fields={doctorFields}
          onSubmit={handleSaveDoctor}
          submitLabel={currentDoctor ? "Update Doctor" : "Save Doctor"}
          initialData={currentDoctor ? {
              fullName: currentDoctor.name,
              email: currentDoctor.email,
              specialization: currentDoctor.specialization,
              contact: currentDoctor.contact,
              experience: String(currentDoctor.experience), // Number ko string banaya form k liye
              status: currentDoctor.status
          } : null}
        />
      </main>
    </div>
  );
}