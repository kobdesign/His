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

export type PharmacyQueueRow = {
  name: string;
  patient: string;
  patient_name: string;
  encounter_date: string;
  encounter_time: string | null;
  practitioner_name?: string | null;
  medical_department?: string | null;
  drug_count: number;
  dispensed: boolean;
  dispense_name: string | null;
};

export type PharmacyQueueData = {
  date: string;
  encounters: PharmacyQueueRow[];
};

export type PrescriptionLine = {
  drug: string | null;
  drug_name: string | null;
  dosage: string | null;
  period: string | null;
  comment: string | null;
  item_code: string | null;
  item_name: string | null;
  stock_uom: string | null;
};

export type DispenseRecord = {
  name: string;
  warehouse: string | null;
  update_stock: 0 | 1;
  stock_entry: string | null;
  posting_date: string | null;
  items: {
    drug: string | null;
    item_code: string | null;
    item_name: string | null;
    qty: number;
    uom: string | null;
    dosage: string | null;
    instructions: string | null;
  }[];
};

export type InvoiceSummary = {
  name: string;
  status: string;
  grand_total: number;
  outstanding_amount: number;
  posting_date: string | null;
  items: {
    item_code: string;
    item_name: string;
    qty: number;
    rate: number;
    amount: number;
  }[];
};

export type BillingQueueRow = {
  name: string;
  patient: string;
  patient_name: string;
  encounter_date: string;
  encounter_time: string | null;
  practitioner_name?: string | null;
  medical_department?: string | null;
  invoice: {
    name: string;
    grand_total: number;
    outstanding_amount: number;
    status: string;
  } | null;
};

export type BillingQueueData = {
  date: string;
  encounters: BillingQueueRow[];
  billing_ready: boolean;
};

export type ChargeLine = {
  source: string;
  item_code: string;
  item_name: string | null;
  qty: number;
  rate_hint: number | null;
};

export type BillingContext = {
  encounter: {
    name: string;
    encounter_date: string | null;
    encounter_time: string | null;
    practitioner_name: string | null;
  };
  patient: {
    name: string;
    patient_name: string;
    sex: string | null;
    age: string | null;
    mobile: string | null;
    customer_ok: boolean;
  };
  charges: ChargeLine[];
  invoice: InvoiceSummary | null;
  billing_ready: boolean;
};

export type DispenseContext = {
  encounter: {
    name: string;
    encounter_date: string | null;
    encounter_time: string | null;
    practitioner_name: string | null;
  };
  patient: {
    name: string;
    patient_name: string;
    sex: string | null;
    age: string | null;
    mobile: string | null;
  };
  prescriptions: PrescriptionLine[];
  dispense: DispenseRecord | null;
};

