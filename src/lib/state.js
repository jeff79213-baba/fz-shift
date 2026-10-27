export const MONTH_STATUS = { CLOSED: "closed", OPEN: "open", ARRANGING: "arranging" };
export const LEAVE_STATUS = { DRAFT: "draft", SUBMITTED: "submitted" };
export function canStaffEditLeave(monthStatus) { return monthStatus !== MONTH_STATUS.CLOSED; }
export function isSubmitted(leaveDoc) { return !!leaveDoc && leaveDoc.status === LEAVE_STATUS.SUBMITTED; }
export function canSeeOthers(myLeaveDoc) { return isSubmitted(myLeaveDoc); }
export function isPastDeadline(deadline, now) {
  if (!deadline) return false;
  const d = deadline instanceof Date ? deadline : new Date(deadline);
  return d.getTime() < now.getTime();
}
export function nextLeaveStatusForSubmit() { return LEAVE_STATUS.SUBMITTED; }
export function nextLeaveStatusForEdit() { return LEAVE_STATUS.DRAFT; }
