"use client";
import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import ReusableTable from '@/components/ui/ReusableTable';
import GenericFormModal from '@/components/ui/GenericFormModal';
import { Loader2 } from 'lucide-react';
import { getRadiologistsWithReportCount, createRadiologist, updateRadiologist, deleteRadiologist } from '@/services/apiService';
import toast from 'react-hot-toast';

// ==========================================
// TYPES & INTERFACES
// ==========================================

// Backend se aane walay radiologist ka structure
interface RadiologistResponse {
  radiologistid: number;
  fullname: string;
  email: string;
  contactnumber?: string;
  status?: string;
  reportCount?: number | string; // Api se count aayega
}

// Frontend table mein jo data map hoga
interface RadiologistTableRow {
  id: number;
  name: string;
  email: string;
  contact: string;
  reports: string | number;
  original: RadiologistResponse;
}

// Modal se jo data aayega
interface RadiologistFormData {
  fullName: string;
  email: string;
  contact: string;
  password?: string;
}

// Payload jo backend ko bheja jayega
interface RadiologistPayload {
  fullname: string;
  email?: string;
  contactnumber: string;
  password?: string;
  status?: string;
}

export default function ManageRadiologists() {
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isSidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const [currentRadiologist, setCurrentRadiologist] = useState<RadiologistTableRow | null>(null);

  const [radiologistsData, setRadiologistsData] = useState<RadiologistTableRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const columns = [
    { header: 'Radiologist Name', accessor: 'name' },
    { header: 'Email', accessor: 'email' },
    { header: 'Contact Number', accessor: 'contact' },
    { header: 'Reports Uploaded', accessor: 'reports' },
  ];

  // ==========================================
  // 1. FETCH DATA (GET)
  // ==========================================
  const loadData = async () => {
    setLoading(true);
    try {
      // Yahan hum explicitly count wali API hit kar rahay hain
      const data = await getRadiologistsWithReportCount() as RadiologistResponse[];
      
      const formattedData: RadiologistTableRow[] = data.map((rad) => ({
        id: rad.radiologistid,
        name: rad.fullname,
        email: rad.email,
        contact: rad.contactnumber || 'N/A',
        reports: rad.reportCount || '0', // Agar count na ho to 0 dikhao
        original: rad
      }));
      
      setRadiologistsData(formattedData);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
      toast.error("Error loading radiologists")
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // ==========================================
  // 2. DELETE DATA (DELETE)
  // ==========================================
  const handleDelete = async (row: RadiologistTableRow) => {
    if(confirm(`Are you sure you want to delete Radiologist ${row.name}?`)) {
      try {
        await deleteRadiologist(row.id);
        toast.success("Radiologist deleted successfully!");
        loadData(); 
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
        toast.error("Failed to delete")
      }
    }
  };

  // ==========================================
  // 3. ADD / UPDATE DATA (POST / PATCH)
  // ==========================================
  const handleSaveRadiologist = async (formData: RadiologistFormData) => {
    try {
      
      if (currentRadiologist) {
        // --- UPDATE LOGIC ---
        const updatePayload: RadiologistPayload = {
          fullname: formData.fullName,
          contactnumber: String(formData.contact),
        };

        // Sirf email change hui ho toh bhejo
        if (formData.email !== currentRadiologist.email) {
          updatePayload.email = formData.email;
        }
        
        // Agar password dia gaya hai, tabhi bhejo
        if (formData.password && formData.password.trim() !== '') {
          updatePayload.password = formData.password;
        }

        await updateRadiologist(currentRadiologist.id, updatePayload);
        toast.success("Radiologist updated successfully!");
      } else {
        // --- CREATE LOGIC ---
        const createPayload: RadiologistPayload = {
          fullname: formData.fullName,
          email: formData.email,
          contactnumber: String(formData.contact),
          password: formData.password || '123456', // Failsafe fallback
          status: 'Active'
        };

        await createRadiologist(createPayload as any); // Type assertion for strict payload
        toast.success("New Radiologist added successfully!");
      }

      setIsModalOpen(false);
      setCurrentRadiologist(null);
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
  const handleEdit = (row: RadiologistTableRow) => {
    setCurrentRadiologist(row);
    setIsModalOpen(true);
  };

  const openAddModal = () => {
    setCurrentRadiologist(null);
    setIsModalOpen(true);
  };

  // --- FORM FIELDS ---
  // const radiologistFields = [
  //   { name: 'fullName', label: 'Full Name', type: 'text', placeholder: 'Dr. John Smith', required: true },
  //   { name: 'email', label: 'Email Address', type: 'email', placeholder: 'radiologist@hospital.com', required: true },
  //   { name: 'contact', label: 'Contact Number', type: 'number', placeholder: '03001234567', required: true },
  //   { name: 'password', label: 'Password', type: 'password', placeholder: currentRadiologist ? 'Leave blank to keep same' : '........', required: !currentRadiologist },
  // ];

  // --- FORM FIELDS ---
  const radiologistFields = [
    { 
      name: 'fullName', label: 'Full Name', type: 'text', placeholder: 'Dr. John Smith', required: true,
      pattern: { value: /^[A-Za-z. ]+$/, message: 'Only alphabets are allowed' }
    },
    { 
      name: 'email', label: 'Email Address', type: 'email', placeholder: 'radiologist@hospital.com', required: true,
      pattern: { value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i, message: 'Invalid email format' }
    },
    { 
      name: 'contact', label: 'Contact Number', type: 'number', placeholder: '03001234567', required: true,
      minLength: 11, pattern: { value: /^[0-9]+$/, message: 'Invalid phone number' }
    },
    { 
      name: 'password', label: 'Password', type: 'password', placeholder: currentRadiologist ? 'Leave blank to keep same' : '........', 
      required: !currentRadiologist, minLength: 8 
    },
  ];

  return (
    <div className="flex bg-slate-50 min-h-screen font-sans">
      <Sidebar role="admin" isOpen={isSidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      <main className="w-full lg:ml-64 p-4 sm:p-6 lg:p-8 transition-all duration-300">
        <Header title="Manage Radiologists" onMenuClick={() => setSidebarOpen(true)} />
        
        {loading ? (
          <div className="flex justify-center items-center h-64">
             <Loader2 className="animate-spin text-indigo-600" size={40} />
          </div>
        ) : (
          <ReusableTable 
            title="All Radiologists" 
            columns={columns} 
            data={radiologistsData} 
            actionLabel="Add New Radiologist"
            onAdd={openAddModal}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        )}

        <GenericFormModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={currentRadiologist ? "Edit Radiologist" : "Add New Radiologist"}
          fields={radiologistFields}
          onSubmit={handleSaveRadiologist}
          submitLabel={currentRadiologist ? "Update Radiologist" : "Save Radiologist"}
          initialData={currentRadiologist ? {
              fullName: currentRadiologist.name,
              email: currentRadiologist.email,
              contact: currentRadiologist.contact
          } : null}
        />
      </main>
    </div>
  );
}