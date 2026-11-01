const API_URL = import.meta.env.VITE_API_URL;

const getAuthToken = () => localStorage.getItem("access_token");

const getCurrentUser = () => {
  const userStr = localStorage.getItem("user");
  return userStr ? JSON.parse(userStr) : null;
};

const authHeaders = () => {
  const token = getAuthToken();
  return {
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
  };
};

export const auditService = {
  getAuthToken,

  getCurrentUser,

  async logAction(
    action,
    resource,
    resourceId,
    details,
    oldValues = null,
    newValues = null,
  ) {
    try {
      const response = await fetch(`${API_URL}/audit/log`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          action,
          resource,
          resourceId,
          details,
          oldValues,
          newValues,
        }),
      });

      return await response.json();
    } catch {
      return undefined;
    }
  },

  async fetchLogs(page = 1, limit = 50, filters = {}) {
    const token = getAuthToken();
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...filters,
    });

    const response = await fetch(`${API_URL}/audit/logs?${params}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch logs: ${response.status}`);
    }

    return await response.json();
  },

  async fetchDashboardStats() {
    const token = getAuthToken();

    const response = await fetch(`${API_URL}/audit/dashboard`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch dashboard stats: ${response.status}`);
    }

    return await response.json();
  },

  logDashboardAccess(dashboardName) {
    return this.logAction(
      "DASHBOARD_ACCESSED",
      "dashboard",
      null,
      `Accessed ${dashboardName}`,
    );
  },

  logPageVisit(pageName) {
    return this.logAction("PAGE_VISITED", "page", null, `Visited ${pageName}`);
  },

  logSearch(searchType, searchData, resultsCount) {
    return this.logAction(
      "SEARCH_PERFORMED",
      "search",
      null,
      `Searched ${searchType}: ${JSON.stringify(searchData)} - ${resultsCount} results`,
    );
  },

  logPatientCreated(patientData) {
    return this.logAction(
      "PATIENT_CREATED",
      "patient",
      patientData.id,
      `Patient created: ${patientData.firstName} ${patientData.lastName}`,
      null,
      patientData,
    );
  },

  logPatientUpdated(patientId, oldData, newData) {
    return this.logAction(
      "PATIENT_UPDATED",
      "patient",
      patientId,
      `Patient updated: ${newData.firstName} ${newData.lastName}`,
      oldData,
      newData,
    );
  },

  logPatientDeleted(patientId, patientData) {
    return this.logAction(
      "PATIENT_DELETED",
      "patient",
      patientId,
      `Patient deleted: ${patientData.firstName} ${patientData.lastName}`,
      patientData,
      null,
    );
  },

  logMedicalRecordViewed(recordId, title) {
    return this.logAction(
      "RECORD_VIEWED",
      "medical_record",
      recordId,
      `Medical record viewed: ${title}`,
    );
  },

  logMedicalRecordCreated(recordData) {
    return this.logAction(
      "RECORD_CREATED",
      "medical_record",
      recordData.id,
      `Medical record created: ${recordData.title}`,
      null,
      recordData,
    );
  },

  logMedicalRecordUpdated(recordId, oldData, newData) {
    return this.logAction(
      "RECORD_UPDATED",
      "medical_record",
      recordId,
      `Medical record updated: ${newData.title}`,
      oldData,
      newData,
    );
  },

  logMedicalRecordDeleted(recordId, record) {
    return this.logAction(
      "RECORD_DELETED",
      "medical_record",
      recordId,
      `Medical record deleted: ${record.title}`,
      record,
      null,
    );
  },

  logLogin(username) {
    return this.logAction(
      "LOGIN",
      "authentication",
      null,
      `User logged in: ${username}`,
    );
  },

  logLogout(username) {
    return this.logAction(
      "LOGOUT",
      "authentication",
      null,
      `User logged out: ${username}`,
    );
  },

  logExternalDoctorRequest(doctorData) {
    return this.logAction(
      "EXTERNAL_DOCTOR_REQUEST",
      "external_doctor",
      doctorData.id,
      `External doctor access requested: Dr. ${doctorData.firstName} ${doctorData.lastName}`,
      null,
      doctorData,
    );
  },

  logPatientSearch(searchCriteria, resultsCount) {
    return this.logAction(
      "PATIENT_SEARCH",
      "patient",
      null,
      `Patient search: ${JSON.stringify(searchCriteria)} - ${resultsCount} results`,
    );
  },

  logPatientViewed(patientId, patientName) {
    return this.logAction(
      "PATIENT_VIEWED",
      "patient",
      patientId,
      `Viewed patient profile: ${patientName}`,
    );
  },

  logServiceAssignment(patientId, serviceId, actionType) {
    return this.logAction(
      "PATIENT_SERVICE_UPDATED",
      "patient_service",
      patientId,
      `${actionType} service ${serviceId} for patient ${patientId}`,
    );
  },

  logDoctorCreated(doctorData) {
    return this.logAction(
      "DOCTOR_CREATED",
      "doctor",
      doctorData.id,
      `Doctor created: ${doctorData.name} (${doctorData.email})`,
      null,
      doctorData,
    );
  },

  logDoctorUpdated(doctorId, oldData, newData) {
    return this.logAction(
      "DOCTOR_UPDATED",
      "doctor",
      doctorId,
      `Doctor updated: ${newData.fullName || newData.name || doctorId}`,
      oldData,
      newData,
    );
  },

  logDoctorDeleted(doctorId, doctorData) {
    return this.logAction(
      "DOCTOR_DELETED",
      "doctor",
      doctorId,
      `Doctor deleted: ${doctorData.fullName || doctorData.name || doctorId}`,
      doctorData,
      null,
    );
  },
};
