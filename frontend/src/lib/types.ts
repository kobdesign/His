/** Shape ของข้อมูลจาก his_custom.api — ใช้ร่วมกันทั้ง server/client component */

export type QueueAppointment = {
  name: string;
  patient: string;
  patient_name: string;
  status: string;
  appointment_time: string | null;
  appointment_date: string;
  department: string | null;
  practitioner_name: string | null;
  appointment_type: string | null;
  has_vitals: boolean;
};

export type QueueData = {
  date: string;
  appointments: QueueAppointment[];
  status_options: string[];
};

export type AppointmentDetail = {
  appointment: {
    name: string;
    status: string;
    appointment_date: string | null;
    appointment_time: string | null;
    department: string | null;
    practitioner_name: string | null;
    appointment_type: string | null;
  };
  patient: {
    name: string;
    patient_name: string;
    sex: string | null;
    dob: string | null;
    age: string | null;
    blood_group: string | null;
    mobile: string | null;
  };
  encounter?: EncounterData | null;
  latest_vitals: {
    name: string;
    signs_date: string;
    signs_time: string;
    temperature: number | null;
    pulse: number | null;
    respiratory_rate: number | null;
    bp_systolic: number | null;
    bp_diastolic: number | null;
    height: number | null;
    weight: number | null;
    bmi: number | null;
  } | null;
};

export type DrugRow = {
  drug: string | null;
  drug_name?: string | null;
  dosage: string | null;
  period: string | null;
  dosage_form: string | null;
  comment: string | null;
};

export type EncounterData = {
  name: string;
  docstatus: 0 | 1 | 2;
  symptoms: string[];
  diagnosis: string[];
  drugs: DrugRow[];
  lab_tests: string[];
  notes: string;
};

export type LinkOption = { value: string; label: string };

