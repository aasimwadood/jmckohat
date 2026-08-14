// Hand-authored from supabase/migrations/0001-0010, mirroring the shape
// `supabase gen types typescript` would produce. Once a live Supabase
// project has these migrations applied, regenerate with `npm run db:types`
// and this file becomes the source of truth again — diff against it rather
// than trusting this by hand indefinitely.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

// A convenience helper (not part of the generated-types convention, but
// keeps this hand-written file from being 3x longer): marks `K` optional
// on `T`, for building Insert types from a Row type where columns have
// defaults/are nullable/are generated.
type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

// Enums -------------------------------------------------------------------

export type UserRoleEnum =
  | "admin" | "faculty" | "student" | "department"
  | "controller" | "coordinator" | "principal" | "administration";
export type AdmissionStatusEnum = "pending" | "fee_approved" | "admitted" | "canceled";
export type PromotionStatusEnum =
  | "pending_registration" | "registration_complete" | "fee_pending" | "promoted";
export type FypGroupStatusEnum =
  | "supervisor_pending" | "proposal_pending" | "proposal_approved" | "in_progress"
  | "mid_semester_review" | "final_submission" | "completed" | "archived";
export type FypDeliverableTypeEnum =
  | "proposal" | "progress_report" | "final_report" | "source_code" | "demo_video" | "slides";
export type AnnouncementScopeEnum = "institution" | "department" | "course";
export type MaterialTypeEnum = "lecture_slides" | "notes" | "assignment" | "reference" | "other";
export type EnrollmentStatusEnum = "active" | "completed" | "dropped";
export type AttendanceStatusEnum = "present" | "absent" | "leave";
export type MeritCategoryEnum =
  | "open_merit" | "local_area" | "special_merit" | "sports_quota"
  | "college_employee_child" | "minority_quota" | "disabled_person_quota";
export type FeeStatusEnum = "pending" | "paid";
export type FypEvaluationCriterionEnum =
  | "innovation" | "technical_implementation" | "problem_solving"
  | "documentation" | "presentation_and_demo" | "teamwork";

// Row shapes ----------------------------------------------------------------

type DepartmentsRow = {
  id: string; name: string; code: string; hod_profile_id: string | null;
  description: string | null; image_path: string | null; established_year: number | null;
  labs_count: number; created_at: string; updated_at: string;
};
type ProfilesRow = {
  id: string; role: UserRoleEnum; full_name: string; email: string; phone: string | null;
  department_id: string | null; avatar_path: string | null; current_semester_id: string | null;
  is_active: boolean; created_at: string; updated_at: string;
};
type ProgramsRow = {
  id: string; department_id: string; name: string; degree_level: string; created_at: string;
};
type AcademicSessionsRow = { id: string; label: string; is_active: boolean; created_at: string };
type SemestersRow = {
  id: string; academic_session_id: string; number: number; is_current: boolean; created_at: string;
};

type CoursesRow = {
  id: string; code: string; title: string; credits: number; department_id: string;
  program_id: string | null; created_at: string; updated_at: string;
};
type CourseFacultyRow = { course_id: string; faculty_profile_id: string; semester_id: string };
type EnrollmentsRow = {
  id: string; student_profile_id: string; course_id: string; semester_id: string;
  status: EnrollmentStatusEnum; created_at: string;
};
type TimetableEntriesRow = {
  id: string; course_id: string; faculty_profile_id: string | null; department_id: string;
  semester_id: string; day_of_week: number; start_time: string; end_time: string;
  room: string | null; group_name: string | null; created_at: string; updated_at: string;
};

type AssignmentsRow = {
  id: string; course_id: string; faculty_profile_id: string; title: string;
  description: string | null; due_date: string; created_at: string; updated_at: string;
};
type AssignmentSubmissionsRow = {
  id: string; assignment_id: string; student_profile_id: string; file_path: string | null;
  submitted_at: string; grade: number | null; graded_at: string | null; graded_by: string | null;
};
type CourseMaterialsRow = {
  id: string; course_id: string; faculty_profile_id: string; title: string;
  description: string | null; type: MaterialTypeEnum; file_path: string;
  created_at: string; updated_at: string;
};
type ExamSchedulesRow = {
  id: string; course_id: string; semester_id: string; exam_date: string; start_time: string;
  end_time: string; room: string | null; created_by: string | null; created_at: string;
};
type ResultsRow = {
  id: string; student_profile_id: string; course_id: string; semester_id: string;
  quiz1: number; quiz2: number; midterm: number; assignments_score: number; total: number;
  submitted_by: string | null; submitted_at: string; updated_at: string;
};
type AttendanceRow = {
  id: string; student_profile_id: string; course_id: string; semester_id: string;
  session_date: string; status: AttendanceStatusEnum; marked_by: string | null; created_at: string;
};

type AdmissionSettingsRow = {
  department_id: string; academic_session_id: string; is_enabled: boolean;
  enabled_by: string | null; enabled_at: string | null;
};
type AdmissionsRow = {
  id: string; temporary_id: string; full_name: string; cnic: string | null;
  contact_number: string | null; email: string | null; department_id: string;
  program_id: string | null; merit_category: MeritCategoryEnum; merit_number: number | null;
  status: AdmissionStatusEnum; registration_fee: number; crf_fee: number; admission_fee: number;
  tuition_fee: number; examination_fee: number; hostel_fee: number; transport_fee: number;
  fee_receipt_number: string | null; fee_paid_at: string | null; fee_approved_by: string | null;
  registration_number: string | null; semester_id: string | null; created_by: string;
  approved_by: string | null; approved_at: string | null; canceled_by: string | null;
  canceled_at: string | null; cancel_reason: string | null; student_profile_id: string | null;
  created_at: string; updated_at: string;
};
type RegistrationCountersRow = { department_id: string; academic_year: number; last_seq: number };
type AdmissionDocumentsRow = {
  id: string; admission_id: string; label: string; file_path: string;
  uploaded_by: string | null; uploaded_at: string;
};

type FeePaymentsRow = {
  id: string; student_profile_id: string; semester_id: string | null; fee_type: string;
  amount: number; status: FeeStatusEnum; receipt_number: string | null;
  verified_by: string | null; verified_at: string | null; due_date: string | null;
  created_at: string;
};
type PromotionsRow = {
  id: string; student_profile_id: string; from_semester_id: string; to_semester_id: string;
  cgpa: number | null; academic_standing: string; max_courses: number;
  status: PromotionStatusEnum; fee_receipt_number: string | null;
  fee_verified_by: string | null; fee_verified_at: string | null;
  created_at: string; updated_at: string;
};

type FypSemesterConfigRow = {
  department_id: string; semester_id: string; proposal_deadline: string | null;
  mid_semester_deadline: string | null; final_deadline: string | null;
  supervisor_quota: number; max_members: number; is_enabled: boolean;
  created_by: string | null; created_at: string;
};
type FypGroupsRow = {
  id: string; department_id: string; semester_id: string; title: string | null;
  supervisor_profile_id: string | null; status: FypGroupStatusEnum; is_nominated: boolean;
  created_by: string; created_at: string; updated_at: string;
};
type FypMembersRow = {
  fyp_group_id: string; student_profile_id: string; is_leader: boolean; joined_at: string;
};
type FypProposalsRow = {
  id: string; fyp_group_id: string; file_path: string; status: string;
  reviewed_by: string | null; reviewed_at: string | null; submitted_at: string;
};
type FypDeliverablesRow = {
  id: string; fyp_group_id: string; type: FypDeliverableTypeEnum; file_path: string;
  submitted_by: string | null; submitted_at: string;
};
type FypEvaluationsRow = {
  id: string; fyp_group_id: string; criterion: FypEvaluationCriterionEnum; max_score: number;
  score: number; evaluator_profile_id: string; evaluated_at: string;
};

type AnnouncementsRow = {
  id: string; author_profile_id: string; scope: AnnouncementScopeEnum;
  department_id: string | null; course_id: string | null; title: string; body: string;
  published_at: string | null; created_at: string; updated_at: string;
};
type NotificationsRow = {
  id: string; profile_id: string; title: string; body: string | null;
  related_entity: string | null; related_id: string | null; read_at: string | null;
  created_at: string;
};
type TranscriptRequestsRow = {
  id: string; student_profile_id: string; status: string; requested_at: string;
  processed_by: string | null; processed_at: string | null; file_path: string | null;
};
type ResultQueriesRow = {
  id: string; student_profile_id: string; course_id: string; reason: string; status: string;
  resolution_note: string | null; fee_receipt_number: string | null; requested_at: string;
  resolved_by: string | null; resolved_at: string | null;
};
type AcademicCalendarEventsRow = {
  id: string; title: string; description: string | null; event_date: string;
  department_id: string | null; created_by: string | null; created_at: string;
};
type LibraryItemsRow = {
  id: string; title: string; author: string | null; isbn: string | null;
  total_copies: number; available_copies: number; created_at: string;
};
type SupportTicketsRow = {
  id: string; raised_by: string | null; subject: string; description: string | null;
  status: string; resolved_by: string | null; resolved_at: string | null; created_at: string;
};
type CampusEventsRow = {
  id: string; title: string; description: string | null; event_date: string;
  location: string | null; created_by: string | null; created_at: string;
};
type ScholarshipsRow = {
  id: string; student_profile_id: string; name: string; amount: number;
  academic_session_id: string | null; awarded_by: string | null; awarded_at: string;
};
type CourseFileReportsRow = {
  id: string; course_id: string; semester_id: string; faculty_profile_id: string;
  content: Json; updated_at: string;
};
type RolePermissionsRow = {
  role: UserRoleEnum; resource: string; can_view: boolean; can_edit: boolean;
};
type AuditLogRow = {
  id: string; actor_profile_id: string | null; action: string; entity: string;
  entity_id: string | null; metadata: Json | null; created_at: string;
};
type MessagesRow = {
  id: string; name: string; email: string; phone_number: string | null; subject: string | null;
  body: string; created_at: string;
};

type SiteSettingsRow = { key: string; value: string; updated_at: string };
type LeadershipRow = {
  id: string; title: string | null; first_name: string | null; last_name: string | null;
  position: string | null; department: string | null; message: string | null;
  photo_path: string | null; display_order: number;
};
type PortalHighlightsRow = {
  id: string; title: string; description: string | null; display_order: number;
};
type PortalNewsRow = {
  id: string; title: string; body: string | null; category: string | null; published_at: string;
};
type PortalStatsRow = { id: string; label: string; value: string; display_order: number };
type PortalFeaturesRow = {
  id: string; title: string; description: string | null; icon: string | null;
  gradient: string | null; stat: string | null; stat_label: string | null; display_order: number;
};
type InstitutionFacultiesRow = {
  id: string; name: string; dean: string | null; description: string | null;
  full_detail: string | null; image_path: string | null; color: string | null;
  programs: string[]; display_order: number;
};
type PortalQuickStatsRow = {
  id: string; icon: string | null; label: string; value: string; color_class: string | null;
  display_order: number;
};
type FacultyCategoriesRow = { id: string; name: string; display_order: number };
type FacultyDirectoryRow = {
  id: string; category_id: string | null; department_id: string | null; name: string;
  designation: string | null; qualification: string | null; photo_path: string | null;
  specialization: string | null; email: string | null; phone: string | null;
  publications_count: number; display_order: number;
};
type DownloadCategoriesRow = { id: string; name: string; display_order: number };
type DownloadsRow = {
  id: string; category_id: string | null; title: string; file_path: string;
  file_size_bytes: number | null; uploaded_at: string;
};
type ProgramCategoriesRow = { id: string; name: string; display_order: number };
type ProgramDetailsRow = {
  id: string; category_id: string | null; department_id: string | null; name: string;
  duration: string | null; description: string | null; credit_hours: number | null;
  eligibility: string | null; specializations: string | null; display_order: number;
};
type ProgramRequirementsRow = {
  id: string; category_id: string | null; requirement: string; requirement_type: string;
  display_order: number;
};
type ProgramFeesRow = {
  id: string; category_id: string | null; program_name: string; admission_fee: number;
  tuition_fee: number; total_fee: number; display_order: number;
};
type AdditionalFeeCategoriesRow = { id: string; name: string; display_order: number };
type AdditionalFeeItemsRow = {
  id: string; category_id: string | null; item_name: string; amount: number; display_order: number;
};
type ApplyStepsRow = {
  id: string; step_number: number; title: string; description: string | null;
  icon: string | null; color: string | null;
};
type ImportantDatesRow = {
  id: string; event: string; start_date: string | null; end_date: string | null; display_order: number;
};
type FooterInfoRow = {
  id: string; location: string | null; phone_no: string | null; email: string | null;
  copyright: string | null;
};
type ContactInfoRow = {
  id: string; icon: string | null; title: string | null; description: string | null;
  details: string | null; display_order: number;
};
type OfficeHoursRow = {
  id: string; day: string | null; opening_time: string | null; closing_time: string | null;
  status: string; display_order: number;
};
type DepartmentContactsRow = {
  id: string; department_id: string | null; phone: string | null; email: string | null;
};
type CampusLocationsRow = {
  id: string; name: string; address: string | null; map_url: string | null;
  phone: string | null; email: string | null;
};

// Table<Row, InsertOptionalKeys> builds the Supabase-style
// { Row, Insert, Update, Relationships: [] } entry from a Row type.
type Table<Row, InsertOptionalKeys extends keyof Row> = {
  Row: Row;
  Insert: Optional<Row, InsertOptionalKeys>;
  Update: Partial<Row>;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      departments: Table<DepartmentsRow, "id" | "hod_profile_id" | "description" | "image_path" | "established_year" | "labs_count" | "created_at" | "updated_at">;
      profiles: Table<ProfilesRow, "phone" | "department_id" | "avatar_path" | "current_semester_id" | "is_active" | "created_at" | "updated_at">;
      programs: Table<ProgramsRow, "id" | "created_at">;
      academic_sessions: Table<AcademicSessionsRow, "id" | "is_active" | "created_at">;
      semesters: Table<SemestersRow, "id" | "is_current" | "created_at">;

      courses: Table<CoursesRow, "id" | "credits" | "program_id" | "created_at" | "updated_at">;
      course_faculty: Table<CourseFacultyRow, never>;
      enrollments: Table<EnrollmentsRow, "id" | "status" | "created_at">;
      timetable_entries: Table<TimetableEntriesRow, "id" | "faculty_profile_id" | "room" | "group_name" | "created_at" | "updated_at">;

      assignments: Table<AssignmentsRow, "id" | "description" | "created_at" | "updated_at">;
      assignment_submissions: Table<AssignmentSubmissionsRow, "id" | "file_path" | "submitted_at" | "grade" | "graded_at" | "graded_by">;
      course_materials: Table<CourseMaterialsRow, "id" | "description" | "type" | "created_at" | "updated_at">;
      exam_schedules: Table<ExamSchedulesRow, "id" | "room" | "created_by" | "created_at">;
      results: Table<ResultsRow, "id" | "quiz1" | "quiz2" | "midterm" | "assignments_score" | "total" | "submitted_by" | "submitted_at" | "updated_at">;
      attendance: Table<AttendanceRow, "id" | "marked_by" | "created_at">;

      admission_settings: Table<AdmissionSettingsRow, "is_enabled" | "enabled_by" | "enabled_at">;
      admissions: Table<AdmissionsRow, "id" | "cnic" | "contact_number" | "email" | "merit_category" | "merit_number" | "status" | "registration_fee" | "crf_fee" | "admission_fee" | "tuition_fee" | "examination_fee" | "hostel_fee" | "transport_fee" | "fee_receipt_number" | "fee_paid_at" | "fee_approved_by" | "registration_number" | "semester_id" | "approved_by" | "approved_at" | "canceled_by" | "canceled_at" | "cancel_reason" | "student_profile_id" | "created_at" | "updated_at">;
      registration_counters: Table<RegistrationCountersRow, "last_seq">;
      admission_documents: Table<AdmissionDocumentsRow, "id" | "uploaded_by" | "uploaded_at">;

      fee_payments: Table<FeePaymentsRow, "id" | "semester_id" | "status" | "receipt_number" | "verified_by" | "verified_at" | "due_date" | "created_at">;
      promotions: Table<PromotionsRow, "id" | "cgpa" | "academic_standing" | "max_courses" | "status" | "fee_receipt_number" | "fee_verified_by" | "fee_verified_at" | "created_at" | "updated_at">;

      fyp_semester_config: Table<FypSemesterConfigRow, "proposal_deadline" | "mid_semester_deadline" | "final_deadline" | "supervisor_quota" | "max_members" | "is_enabled" | "created_by" | "created_at">;
      fyp_groups: Table<FypGroupsRow, "id" | "title" | "supervisor_profile_id" | "status" | "is_nominated" | "created_at" | "updated_at">;
      fyp_members: Table<FypMembersRow, "is_leader" | "joined_at">;
      fyp_proposals: Table<FypProposalsRow, "id" | "status" | "reviewed_by" | "reviewed_at" | "submitted_at">;
      fyp_deliverables: Table<FypDeliverablesRow, "id" | "submitted_by" | "submitted_at">;
      fyp_evaluations: Table<FypEvaluationsRow, "id" | "evaluated_at">;

      announcements: Table<AnnouncementsRow, "id" | "department_id" | "course_id" | "published_at" | "created_at" | "updated_at">;
      notifications: Table<NotificationsRow, "id" | "body" | "related_entity" | "related_id" | "read_at" | "created_at">;
      transcript_requests: Table<TranscriptRequestsRow, "id" | "status" | "requested_at" | "processed_by" | "processed_at" | "file_path">;
      result_queries: Table<ResultQueriesRow, "id" | "status" | "resolution_note" | "fee_receipt_number" | "requested_at" | "resolved_by" | "resolved_at">;
      academic_calendar_events: Table<AcademicCalendarEventsRow, "id" | "description" | "department_id" | "created_by" | "created_at">;
      library_items: Table<LibraryItemsRow, "id" | "author" | "isbn" | "total_copies" | "available_copies" | "created_at">;
      support_tickets: Table<SupportTicketsRow, "id" | "raised_by" | "description" | "status" | "resolved_by" | "resolved_at" | "created_at">;
      campus_events: Table<CampusEventsRow, "id" | "description" | "location" | "created_by" | "created_at">;
      scholarships: Table<ScholarshipsRow, "id" | "academic_session_id" | "awarded_by" | "awarded_at">;
      course_file_reports: Table<CourseFileReportsRow, "id" | "content" | "updated_at">;
      role_permissions: Table<RolePermissionsRow, "can_view" | "can_edit">;
      audit_log: Table<AuditLogRow, "id" | "actor_profile_id" | "metadata" | "created_at">;
      messages: Table<MessagesRow, "id" | "subject" | "created_at">;

      site_settings: Table<SiteSettingsRow, "value" | "updated_at">;
      leadership: Table<LeadershipRow, "id" | "title" | "first_name" | "last_name" | "position" | "department" | "message" | "photo_path" | "display_order">;
      portal_highlights: Table<PortalHighlightsRow, "id" | "description" | "display_order">;
      portal_news: Table<PortalNewsRow, "id" | "body" | "category" | "published_at">;
      portal_stats: Table<PortalStatsRow, "id" | "display_order">;
      portal_features: Table<PortalFeaturesRow, "id" | "description" | "icon" | "gradient" | "stat" | "stat_label" | "display_order">;
      institution_faculties: Table<InstitutionFacultiesRow, "id" | "dean" | "description" | "full_detail" | "image_path" | "color" | "programs" | "display_order">;
      portal_quick_stats: Table<PortalQuickStatsRow, "id" | "icon" | "color_class" | "display_order">;
      faculty_categories: Table<FacultyCategoriesRow, "id" | "display_order">;
      faculty_directory: Table<FacultyDirectoryRow, "id" | "category_id" | "department_id" | "designation" | "qualification" | "photo_path" | "specialization" | "email" | "phone" | "publications_count" | "display_order">;
      download_categories: Table<DownloadCategoriesRow, "id" | "display_order">;
      downloads: Table<DownloadsRow, "id" | "category_id" | "file_size_bytes" | "uploaded_at">;
      program_categories: Table<ProgramCategoriesRow, "id" | "display_order">;
      program_details: Table<ProgramDetailsRow, "id" | "category_id" | "department_id" | "duration" | "description" | "credit_hours" | "eligibility" | "specializations" | "display_order">;
      program_requirements: Table<ProgramRequirementsRow, "id" | "category_id" | "requirement_type" | "display_order">;
      program_fees: Table<ProgramFeesRow, "id" | "category_id" | "admission_fee" | "tuition_fee" | "total_fee" | "display_order">;
      additional_fee_categories: Table<AdditionalFeeCategoriesRow, "id" | "display_order">;
      additional_fee_items: Table<AdditionalFeeItemsRow, "id" | "category_id" | "display_order">;
      apply_steps: Table<ApplyStepsRow, "id" | "description" | "icon" | "color">;
      important_dates: Table<ImportantDatesRow, "id" | "start_date" | "end_date" | "display_order">;
      footer_info: Table<FooterInfoRow, "id" | "location" | "phone_no" | "email" | "copyright">;
      contact_info: Table<ContactInfoRow, "id" | "icon" | "title" | "description" | "details" | "display_order">;
      office_hours: Table<OfficeHoursRow, "id" | "day" | "opening_time" | "closing_time" | "status" | "display_order">;
      department_contacts: Table<DepartmentContactsRow, "id" | "department_id" | "phone" | "email">;
      campus_locations: Table<CampusLocationsRow, "id" | "address" | "map_url" | "phone" | "email">;
    };
    Views: { [_ in never]: never };
    Functions: {
      admit_student: { Args: { p_admission_id: string }; Returns: AdmissionsRow };
      approve_admission_fee: { Args: { p_admission_id: string; p_receipt_number: string }; Returns: AdmissionsRow };
      cancel_admission: { Args: { p_admission_id: string; p_reason: string }; Returns: AdmissionsRow };
      register_for_promotion: { Args: { p_promotion_id: string; p_course_ids: string[] }; Returns: PromotionsRow };
      verify_promotion_fee: { Args: { p_promotion_id: string; p_receipt_number: string }; Returns: PromotionsRow };
      create_fyp_group: {
        Args: {
          p_department_id: string; p_semester_id: string; p_member_ids: string[];
          p_supervisor_profile_id: string; p_title?: string | null;
        };
        Returns: FypGroupsRow;
      };
      respond_to_fyp_supervision: { Args: { p_group_id: string; p_approve: boolean }; Returns: FypGroupsRow };
      nominate_fyp_group: { Args: { p_group_id: string }; Returns: FypGroupsRow };
      archive_fyp_group: { Args: { p_group_id: string }; Returns: FypGroupsRow };
      current_user_role: { Args: Record<string, never>; Returns: UserRoleEnum };
      current_department_id: { Args: Record<string, never>; Returns: string };
      is_staff: { Args: Record<string, never>; Returns: boolean };
      teaches_course: { Args: { target_course_id: string }; Returns: boolean };
    };
    Enums: {
      user_role: UserRoleEnum;
      admission_status: AdmissionStatusEnum;
      promotion_status: PromotionStatusEnum;
      fyp_group_status: FypGroupStatusEnum;
      fyp_deliverable_type: FypDeliverableTypeEnum;
      announcement_scope: AnnouncementScopeEnum;
      material_type: MaterialTypeEnum;
      enrollment_status: EnrollmentStatusEnum;
      attendance_status: AttendanceStatusEnum;
      merit_category: MeritCategoryEnum;
      fee_status: FeeStatusEnum;
    };
  };
};
