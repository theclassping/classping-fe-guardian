/** The selected child as the dashboard shows it. */
export type ChildProfile = {
  name: string;
  firstName: string;
  nickname?: string;
  initials: string;
  /** "Kelas A · Main Campus" */
  className: string;
  /** Backend class and branch ids, used when requesting an upload URL. */
  classId?: number;
  branchId?: number;
};

/** Shown while the child cannot be loaded; never invents data. */
export const UNKNOWN_CHILD: ChildProfile = { name: "Siswa", firstName: "Siswa", initials: "S", className: "Kelas belum tersedia" };

// Backend shapes (Django serializers), as far as the portal reads them.
export type ApiClass = { id?: number | string; name?: string; branch?: number | string; branch_name?: string; academic_year?: number | string; academic_year_name?: string };
export type ApiClassStudent = { id?: number | string; student?: number | string; student_id?: number | string; class_id?: number | string; class_name?: string; is_current?: boolean; class?: ApiClass };
export type ApiStudentGuardian = { id?: number; guardian_id?: number; guardian_name?: string; relationship?: string; is_primary?: boolean };
export type ApiStudent = { id?: number; first_name?: string; middle_name?: string; last_name?: string; nickname?: string; location_id?: number | string | null; class_students?: ApiClassStudent[]; student_guardians?: ApiStudentGuardian[] };
export type ApiBranch = { id?: number | string; school?: number | string; name?: string; code?: string; address?: string; phone?: string; email?: string; location_id?: number | string; is_payment_gateway_enabled?: boolean };
export type ApiSchool = { id?: number; name?: string; register_number?: string; image_data?: string; description?: string; branches?: ApiBranch[] };
export type ApiAcademicYear = { id?: number | string; branch?: number | string; name?: string; is_current?: boolean };
export type ApiGuardian = { id?: number | string; user?: number | string | { id?: number | string }; user_id?: number | string; name?: string; email?: string; phone_number?: string };

/** `GET /api/parent/context/?student_id=` — each part has the shape of its own endpoint (students/, students/{id}/, classes/{id}/, branches/{id}/, schools/{id}/). */
export type ApiParentContext = {
  students?: ApiStudent[];
  student?: ApiStudent | null;
  current_class?: ApiClass | null;
  branch?: ApiBranch | null;
  school?: ApiSchool | null;
};

/** School card: the school with its branch's contact details, academic year and online-payment switch. */
export type GuardianSchool = ApiSchool & { address?: string; phone_number?: string; email?: string; branch_name?: string; branch_id?: number; academic_year?: string; payment_gateway_enabled?: boolean };
