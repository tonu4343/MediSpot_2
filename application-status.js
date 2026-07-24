// Shared 9-stage application status pipeline (seeker_applications.status):
// applied -> screening -> offer_pending -> hired -> working -> completed
// (rejected / withdrawn / cancelled are branch exits).
// Centralized here because this mapping is used by 10+ pages; keeping a
// hand-duplicated copy of a multi-branch table in every file is exactly the
// kind of duplication this codebase's usual per-page boilerplate pattern
// doesn't scale to.
window.MEDISPOT_STATUS = (function () {
  const LABELS = {
    applied: '応募済み',
    screening: '選考中',
    offer_pending: '採用承諾待ち',
    hired: '採用決定',
    working: '勤務中',
    completed: '完了',
    rejected: '不採用',
    withdrawn: '辞退',
    cancelled: 'キャンセル'
  };
  const CLASSES = {
    screening: 'status-selection',
    offer_pending: 'status-selection',
    hired: 'status-hired',
    working: 'status-working',
    completed: 'status-completed',
    rejected: 'status-rejected',
    withdrawn: 'status-rejected',
    cancelled: 'status-rejected'
  };
  const PRE_HIRE = ['applied', 'screening', 'offer_pending'];
  const HIRED_PLUS = ['hired', 'working', 'completed'];
  const CANCELABLE = ['hired', 'working'];
  const CLOSED = ['applied', 'rejected', 'withdrawn', 'cancelled'];

  function label(status) { return LABELS[status] || status || '-'; }
  function cssClass(status) { return CLASSES[status] || ''; }
  function isPreHire(status) { return PRE_HIRE.indexOf(status) !== -1; }
  function isHiredOrLater(status) { return HIRED_PLUS.indexOf(status) !== -1; }
  function isCancelable(status) { return CANCELABLE.indexOf(status) !== -1; }
  function isChatOpen(status) { return CLOSED.indexOf(status) === -1; }

  return {
    LABELS: LABELS,
    PRE_HIRE: PRE_HIRE,
    HIRED_PLUS: HIRED_PLUS,
    CANCELABLE: CANCELABLE,
    CLOSED: CLOSED,
    label: label,
    cssClass: cssClass,
    isPreHire: isPreHire,
    isHiredOrLater: isHiredOrLater,
    isCancelable: isCancelable,
    isChatOpen: isChatOpen
  };
})();
