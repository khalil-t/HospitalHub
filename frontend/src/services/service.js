import { auditService } from "./auditService.js";
import { authService } from "./authService.js";
import { authStorage } from "@/lib/authStorage";

const API_URL = import.meta.env.VITE_API_URL;
const getAuthToken = () => authStorage.getAccessToken();

const getAuthHeaders = () => {
  const token = getAuthToken();

  return token ? { Authorization: `Bearer ${token}` } : {};
};

const apiFetch = async (url, options = {}) => {
  let response = await fetch(url, options);

  if (
    response.status === 401 &&
    typeof url === "string" &&
    !url.includes("/auth/login") &&
    !url.includes("/auth/refresh")
  ) {
    try {
      const refreshed = await authService.refreshToken();
      if (refreshed?.access_token) {
        const retryHeaders = {
          ...(options.headers || {}),
          Authorization: `Bearer ${refreshed.access_token}`,
        };
        response = await fetch(url, { ...options, headers: retryHeaders });
      }
    } catch {
      await authService.logout();
    }
  }

  if (
    response.status === 401 &&
    authService.isAuthenticated() &&
    typeof url === "string" &&
    !url.includes("/auth/login") &&
    !url.includes("/auth/refresh")
  ) {
    await authService.logout();
  }

  return response;
};

const readError = async (response, fallback) => {
  const data = await response.json().catch(() => ({}));
  const error = new Error(data.message || fallback);
  error.status = response.status;
  return error;
};

export const serviceApi = {
  findByCode: async (code) => {
    const response = await apiFetch(`${API_URL}/services/code/${code}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(),
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to fetch service by code");
    }

    const result = await response.json();

    await auditService.logAction(
      "VIEW",
      "service_lookup",
      null,
      `Looked up service by code: ${code}`,
    );

    return result;
  },

  getAllServices: async () => {
    const response = await apiFetch(`${API_URL}/services`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(),
      },
    });

    if (!response.ok) {
      throw new Error("Failed to fetch services");
    }

    const result = await response.json();

    await auditService.logAction(
      "VIEW",
      "services_list",
      null,
      `Viewed all services - ${result.length} results`,
    );

    return result;
  },
};

export const patientService = {
  createPatient: async (patientData) => {
    const response = await apiFetch(`${API_URL}/patients`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(),
      },
      body: JSON.stringify(patientData),
    });

    if (!response.ok) {
      const error = await response.json();
      await auditService.logAction(
        "PATIENT_CREATED",
        "patient",
        null,
        `Failed to create patient: ${patientData.firstName} ${patientData.lastName} - ${error.message}`,
      );
      throw new Error(error.message || "Échec de la création du patient");
    }

    const result = await response.json();

    await auditService.logPatientCreated({
      id: result.id,
      firstName: patientData.firstName,
      lastName: patientData.lastName,
      ...patientData,
    });

    return result;
  },

  updatePatient: async (id, updateData) => {
    const oldPatient = await this.getPatientById(id).catch(() => null);

    const response = await apiFetch(`${API_URL}/patients/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(),
      },
      body: JSON.stringify(updateData),
    });

    if (!response.ok) {
      const error = await readError(
        response,
        "Échec de la mise à jour du patient",
      );
      await auditService.logAction(
        "PATIENT_UPDATED",
        "patient",
        id,
        `Failed to update patient: ${error.message}`,
      );
      throw error;
    }

    const result = await response.json();

    await auditService.logPatientUpdated(id, oldPatient, result);

    return result;
  },

  searchPatients: async (searchCriteria) => {
    const params = new URLSearchParams();

    if (searchCriteria.firstName) {
      params.append("firstName", searchCriteria.firstName);
    }
    if (searchCriteria.lastName) {
      params.append("lastName", searchCriteria.lastName);
    }

    const url = `${API_URL}/patients/search?${params.toString()}`;
    const response = await apiFetch(url, { headers: getAuthHeaders() });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Échec de la recherche de patients");
    }

    await auditService.logPatientSearch(searchCriteria, data.length || 0);

    return data;
  },

  getPatientsWithoutDoctorFromService: async (serviceId) => {
    const response = await apiFetch(
      `${API_URL}/patients/service/${serviceId}/no-doctor`,
      { headers: getAuthHeaders() },
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Failed to fetch patients");
    }

    await auditService.logAction(
      "VIEW",
      "patients_without_doctor",
      null,
      `Viewed patients without doctor for service: ${serviceId} - ${data.length} results`,
    );

    return data;
  },

  deletePatient: async (id) => {
    const patient = await this.getPatientById(id).catch(() => null);

    const response = await apiFetch(`${API_URL}/patients/${id}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      const error = await readError(
        response,
        "Échec de la suppression du patient",
      );
      await auditService.logAction(
        "PATIENT_DELETED",
        "patient",
        id,
        `Failed to delete patient: ${error.message}`,
      );
      throw error;
    }

    if (patient) {
      await auditService.logPatientDeleted(id, patient);
    }
  },

  getAllPatientsByService: async (serviceId) => {
    const url = `${API_URL}/patients/service/${serviceId}/all`;
    const response = await apiFetch(url, { headers: getAuthHeaders() });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Failed to fetch patients by service");
    }

    await auditService.logAction(
      "VIEW",
      "patients_by_service",
      null,
      `Viewed all patients for service: ${serviceId} - ${data.length} results`,
    );

    return data;
  },

  addServiceToPatient: async (patientId, serviceId) => {
    const response = await apiFetch(`${API_URL}/patients/${patientId}/services`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(),
      },
      body: JSON.stringify({ serviceId }),
    });

    if (!response.ok) {
      const error = await readError(
        response,
        `Échec de l'ajout du service ${serviceId} au patient ${patientId}`,
      );
      await auditService.logAction(
        "PATIENT_UPDATED",
        "patient_service",
        patientId,
        `Failed to add service ${serviceId} to patient ${patientId}: ${error.message}`,
      );
      throw error;
    }

    const result = await response.json();

    await auditService.logServiceAssignment(patientId, serviceId, "Added");

    return result;
  },

  removeServiceFromPatient: async (patientId, serviceId) => {
    const response = await apiFetch(
      `${API_URL}/patients/${patientId}/services/${serviceId}`,
      {
        method: "DELETE",
        headers: getAuthHeaders(),
      },
    );

    if (!response.ok) {
      const error = await readError(
        response,
        `Failed to remove service ${serviceId} from patient ${patientId}`,
      );
      await auditService.logAction(
        "PATIENT_UPDATED",
        "patient_service",
        patientId,
        `Failed to remove service ${serviceId} from patient ${patientId}: ${error.message}`,
      );
      throw error;
    }

    await auditService.logServiceAssignment(patientId, serviceId, "Removed");

    return response.status === 204 ? null : await response.json();
  },

  fetchAllPatients: async () => {
    const response = await apiFetch(`${API_URL}/patients`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(),
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Failed to load patients");
    }

    await auditService.logAction(
      "VIEW",
      "all_patients",
      null,
      `Viewed all patients - ${data.length} results`,
    );

    return data;
  },

  getPatientById: async (id) => {
    const response = await apiFetch(`${API_URL}/patients/${id}`, {
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      const requestError = new Error(
        error.message || "Failed to load patient details",
      );
      requestError.status = response.status;
      throw requestError;
    }

    const patient = await response.json();
    await auditService.logPatientViewed(
      id,
      `${patient.firstName} ${patient.lastName}`,
    );
    return patient;
  },
};

export const medicalRecordService = {
  async updateMedicalRecord(id, recordData) {
    const oldRecord = await this.getMedicalRecordById(id).catch(() => null);

    const dataToSend = {
      title: recordData.title || "",
      content: recordData.content || "",
      diagnosis: recordData.diagnosis || "",
      allergies: recordData.allergies || [],
      recordDate: recordData.recordDate,
      responsibleDoctors: recordData.responsibleDoctors || [],
      prescriptions: (recordData.prescriptions || []).map((prescription) => ({
        id: prescription.id || undefined,
        medication: prescription.medication || prescription.name || "",
        dose: prescription.dose || prescription.dosage || "",
        frequency: prescription.frequency || "",
        duration: prescription.duration || "",
      })),
    };

    const response = await apiFetch(`${API_URL}/medical-records/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(),
      },
      body: JSON.stringify(dataToSend),
    });

    if (!response.ok) {
      const error = await response.json();
      await auditService.logAction(
        "RECORD_UPDATED",
        "medical_record",
        id,
        `Failed to update medical record: ${error.message}`,
      );
      throw new Error(error.message || "Failed to update medical record");
    }

    const result = await response.json();

    await auditService.logMedicalRecordUpdated(id, oldRecord, result);

    return result;
  },

  async createMedicalRecord(recordData) {
    const response = await apiFetch(`${API_URL}/medical-records`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(),
      },
      body: JSON.stringify(recordData),
    });

    const data = await response.json();

    if (!response.ok) {
      await auditService.logAction(
        "RECORD_CREATED",
        "medical_record",
        null,
        `Failed to create medical record: ${recordData.title} - ${data.message}`,
      );
      throw new Error(data.message || "Failed to create medical record");
    }

    await auditService.logMedicalRecordCreated({
      id: data.id,
      title: recordData.title,
      patientId: recordData.patientId,
    });

    return data;
  },

  async getAllMedicalRecords() {
    const response = await apiFetch(`${API_URL}/medical-records`, {
      headers: getAuthHeaders(),
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Failed to load medical records");
    }

    await auditService.logAction(
      "VIEW",
      "medical_records_list",
      null,
      `Viewed all medical records - ${data.length} results`,
    );

    return data;
  },

  async getMedicalRecordByPatient(patientId) {
    const response = await apiFetch(
      `${API_URL}/medical-records/patient/${patientId}`,
      { headers: getAuthHeaders() },
    );
    const text = await response.text();

    if (!text) {
      throw new Error("Empty response from server");
    }

    const data = JSON.parse(text);

    if (!response.ok) {
      const error = new Error(data.message || "Failed to load medical record");
      error.status = response.status;
      throw error;
    }

    await auditService.logAction(
      "RECORD_VIEWED",
      "medical_record",
      null,
      `Viewed medical records for patient: ${patientId}`,
    );

    return data;
  },

  async getPatientsForDoctor(doctorId) {
    const response = await apiFetch(
      `${API_URL}/medical-records/doctor/${doctorId}/patients`,
      { headers: getAuthHeaders() },
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.message || "Failed to load patients assigned to doctor",
      );
    }

    await auditService.logAction(
      "VIEW",
      "doctor_patients",
      doctorId,
      `Viewed patients assigned to doctor: ${doctorId} - ${data.length} results`,
    );

    return data;
  },

  async getPatientsCountByDoctor(doctorId) {
    const response = await apiFetch(
      `${API_URL}/medical-records/doctor/${doctorId}/patients-count`,
      { headers: getAuthHeaders() },
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Failed to get patients count");
    }

    await auditService.logAction(
      "VIEW",
      "doctor_patients_count",
      doctorId,
      `Viewed patient count for doctor: ${doctorId} - ${data} patients`,
    );

    return data;
  },

  async getMedicalRecordById(id) {
    const response = await apiFetch(`${API_URL}/medical-records/${id}`, {
      headers: getAuthHeaders(),
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Medical record not found");
    }

    await auditService.logMedicalRecordViewed(id, data.title);

    return data;
  },

  async deleteMedicalRecord(id) {
    const record = await this.getMedicalRecordById(id).catch(() => null);

    const response = await apiFetch(`${API_URL}/medical-records/${id}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      await auditService.logAction(
        "RECORD_DELETED",
        "medical_record",
        id,
        `Failed to delete medical record: ${err.message}`,
      );
      throw new Error(err.message || "Failed to delete medical record");
    }

    if (record) {
      await auditService.logMedicalRecordDeleted(id, record);
    }

    return true;
  },
};

export const externalDoctorService = {
  async createRequest(requestData) {
    const response = await apiFetch(`${API_URL}/external-doctors/request`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestData),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(
        data.message || "Failed to submit external doctor request",
      );
    }

    return data;
  },

  async getRequests(status) {
    const query = status ? `?status=${encodeURIComponent(status)}` : "";
    const response = await apiFetch(
      `${API_URL}/external-doctors/requests${query}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${getAuthToken()}`,
          "Content-Type": "application/json",
        },
      },
    );

    if (!response.ok) {
      throw new Error(
        `Failed to fetch external doctor requests: ${response.status}`,
      );
    }

    return response.json();
  },

  async getRequest(id) {
    const response = await apiFetch(`${API_URL}/external-doctors/requests/${id}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${getAuthToken()}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(
        `Failed to fetch external doctor request: ${response.status}`,
      );
    }

    return response.json();
  },

  async reviewRequest(id, { approved, rejectionReason }) {
    const response = await apiFetch(
      `${API_URL}/external-doctors/requests/${id}/review`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${getAuthToken()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ approved, rejectionReason }),
      },
    );

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const error = new Error(
        data.message || `Failed to review request: ${response.status}`,
      );
      error.status = response.status;
      throw error;
    }

    return data;
  },

  async checkExpiredAccounts() {
    const response = await apiFetch(`${API_URL}/external-doctors/check-expired`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${getAuthToken()}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error("Failed to check expired external doctor accounts");
    }

    return response.json();
  },

  async deactivateExpiredAccounts() {
    const response = await apiFetch(
      `${API_URL}/external-doctors/deactivate-expired`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${getAuthToken()}`,
          "Content-Type": "application/json",
        },
      },
    );

    if (!response.ok) {
      throw new Error("Failed to deactivate expired external doctor accounts");
    }

    return response.json();
  },

  async getPatientsByEmail(email) {
    const response = await apiFetch(
      `${API_URL}/external-doctors/patients/${encodeURIComponent(email)}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      },
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch patients: ${response.status}`);
    }

    return response.json();
  },
};

const adminHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${getAuthToken()}`,
});

export const roleService = {
  async getAllRoles() {
    const response = await apiFetch(`${API_URL}/roles`, {
      headers: adminHeaders(),
    });

    if (!response.ok) {
      throw await readError(response, "Failed to fetch roles");
    }

    return response.json();
  },

  async assignRole(userId, roleId) {
    const response = await apiFetch(
      `${API_URL}/roles/${userId}/assign/${roleId}`,
      {
        method: "POST",
        headers: adminHeaders(),
      },
    );

    if (!response.ok) {
      throw await readError(response, "Failed to assign role");
    }

    return response.json();
  },

  async removeRole(userId, roleId) {
    const response = await apiFetch(
      `${API_URL}/roles/${userId}/remove/${roleId}`,
      {
        method: "DELETE",
        headers: adminHeaders(),
      },
    );

    if (!response.ok) {
      throw await readError(response, "Failed to remove role");
    }

    return response.json();
  },
};

export const userService = {
  async getUsers() {
    const response = await apiFetch(`${API_URL}/users`, {
      headers: adminHeaders(),
    });

    if (!response.ok) {
      throw await readError(response, "Failed to fetch users");
    }

    return response.json();
  },

  async getUser(id) {
    const response = await apiFetch(`${API_URL}/users/${id}`, {
      headers: adminHeaders(),
    });

    if (!response.ok) {
      throw await readError(response, "Failed to fetch user");
    }

    return response.json();
  },

  async createUser(userData) {
    const response = await apiFetch(`${API_URL}/users`, {
      method: "POST",
      headers: adminHeaders(),
      body: JSON.stringify(userData),
    });

    if (!response.ok) {
      throw await readError(response, "Failed to create user");
    }

    return response.json();
  },

  async updateUser(id, userData) {
    const response = await apiFetch(`${API_URL}/users/${id}`, {
      method: "PATCH",
      headers: adminHeaders(),
      body: JSON.stringify(userData),
    });

    if (!response.ok) {
      throw await readError(response, "Failed to update user");
    }

    return response.json();
  },

  async deleteUser(id) {
    const response = await apiFetch(`${API_URL}/users/${id}`, {
      method: "DELETE",
      headers: adminHeaders(),
    });

    if (!response.ok) {
      throw await readError(response, "Failed to delete user");
    }

    return true;
  },

  async getAssignableRoles() {
    const response = await apiFetch(`${API_URL}/users/assignable-roles`, {
      headers: adminHeaders(),
    });

    if (!response.ok) {
      throw await readError(response, "Failed to fetch assignable roles");
    }

    return response.json();
  },
};

export const adminService = {
  async getUsers() {
    const response = await apiFetch(`${API_URL}/admin/users`, {
      headers: adminHeaders(),
    });

    if (!response.ok) {
      throw await readError(response, "Failed to fetch users");
    }

    return response.json();
  },

  async createUser(userData) {
    const response = await apiFetch(`${API_URL}/admin/new_med`, {
      method: "POST",
      headers: adminHeaders(),
      body: JSON.stringify(userData),
    });

    if (!response.ok) {
      throw await readError(response, `Error: ${response.status}`);
    }

    return response.json();
  },

  async updateUser(id, userData) {
    const response = await apiFetch(`${API_URL}/admin/users/${id}`, {
      method: "PUT",
      headers: adminHeaders(),
      body: JSON.stringify(userData),
    });

    if (!response.ok) {
      throw await readError(
        response,
        `Failed to update user (${response.status})`,
      );
    }

    return response.json();
  },

  async deleteUser(id) {
    const response = await apiFetch(`${API_URL}/admin/users/${id}`, {
      method: "DELETE",
      headers: adminHeaders(),
    });

    if (!response.ok) {
      throw await readError(response, "Failed to delete user");
    }

    return true;
  },

  async getServices() {
    const response = await apiFetch(`${API_URL}/services`, {
      headers: adminHeaders(),
    });

    if (!response.ok) {
      throw await readError(response, "Failed to fetch services");
    }

    return response.json();
  },
};
