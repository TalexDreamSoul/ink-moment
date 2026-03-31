export const MINIAPP_SESSION_TTL = 7 * 24 * 60 * 60 * 1000;
export const ADMIN_SESSION_TTL = 12 * 60 * 60 * 1000;
export const UPLOAD_TICKET_TTL = 10 * 60 * 1000;

export const USER_REQUIRED_FIELDS = [
  "name",
  "student_id",
  "college",
  "grade_major",
  "phone",
  "counselor",
  "gender",
];

export const ORG_MANAGE_ROLES = ["owner", "admin"];
export const ROLE_ORDER = {
  owner: 0,
  admin: 1,
  supervisor: 2,
  member: 3,
};

export const FEEDBACK_STATUS = {
  pending: "pending",
  replied: "replied",
  closed: "closed",
};

export const NOTIFICATION_TYPE = {
  system: "system",
  audit_result: "audit_result",
  feedback_reply: "feedback_reply",
  export_ready: "export_ready",
  invitation: "invitation",
};
