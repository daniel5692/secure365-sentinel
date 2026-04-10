// Check Registry - Central registration system for all security checks
// Each check module registers itself here. New checks are added by creating a new file
// and calling registerCheck() - no other changes needed.

const checkRegistry = new Map();

export function registerCheck(check) {
  if (checkRegistry.has(check.id)) {
    console.warn(`Check ${check.id} already registered, skipping duplicate.`);
    return;
  }
  checkRegistry.set(check.id, check);
}

export function getCheck(id) {
  return checkRegistry.get(id);
}

export function getAllChecks() {
  return Array.from(checkRegistry.values());
}

export function getChecksByDomain(domain) {
  return getAllChecks().filter(c => c.domain === domain);
}

export function getChecksBySeverity(severity) {
  return getAllChecks().filter(c => c.severity === severity);
}

export function getChecksByFramework(framework) {
  return getAllChecks().filter(c => c.framework === framework);
}

export function getDomains() {
  const domains = new Set(getAllChecks().map(c => c.domain));
  return Array.from(domains);
}

export function getCheckStats() {
  const checks = getAllChecks();
  return {
    total: checks.length,
    byDomain: checks.reduce((acc, c) => {
      acc[c.domain] = (acc[c.domain] || 0) + 1;
      return acc;
    }, {}),
    bySeverity: checks.reduce((acc, c) => {
      acc[c.severity] = (acc[c.severity] || 0) + 1;
      return acc;
    }, {}),
    automated: checks.filter(c => c.isAutomated).length,
    manual: checks.filter(c => !c.isAutomated).length,
  };
}

// Domain metadata for display
export const DOMAIN_META = {
  entra_id: { label: 'Entra ID', labelHe: 'זהויות Entra ID', icon: 'ShieldCheck', color: 'blue' },
  conditional_access: { label: 'Conditional Access', labelHe: 'גישה מותנית', icon: 'Lock', color: 'purple' },
  exchange_online: { label: 'Exchange Online', labelHe: 'Exchange Online', icon: 'Mail', color: 'cyan' },
  defender: { label: 'Microsoft Defender', labelHe: 'Microsoft Defender', icon: 'Shield', color: 'red' },
  sharepoint: { label: 'SharePoint Online', labelHe: 'SharePoint Online', icon: 'Globe', color: 'green' },
  onedrive: { label: 'OneDrive', labelHe: 'OneDrive', icon: 'HardDrive', color: 'blue' },
  teams: { label: 'Microsoft Teams', labelHe: 'Microsoft Teams', icon: 'Users', color: 'purple' },
  purview: { label: 'Purview / Compliance', labelHe: 'Purview / תאימות', icon: 'Scale', color: 'amber' },
  external_sharing: { label: 'External Sharing', labelHe: 'שיתוף חיצוני', icon: 'Share2', color: 'orange' },
  mail_flow: { label: 'Mail Flow Protection', labelHe: 'הגנת זרימת דואר', icon: 'MailCheck', color: 'cyan' },
  secure_score: { label: 'Secure Score', labelHe: 'ציון אבטחה', icon: 'Target', color: 'green' },
  information_protection: { label: 'Information Protection', labelHe: 'הגנת מידע', icon: 'FileKey', color: 'amber' },
};

export const SEVERITY_META = {
  critical: { label: 'קריטי', color: 'red', bgClass: 'bg-red-500/10', textClass: 'text-red-400', borderClass: 'border-red-500/30' },
  high: { label: 'גבוה', color: 'orange', bgClass: 'bg-orange-500/10', textClass: 'text-orange-400', borderClass: 'border-orange-500/30' },
  medium: { label: 'בינוני', color: 'amber', bgClass: 'bg-amber-500/10', textClass: 'text-amber-400', borderClass: 'border-amber-500/30' },
  low: { label: 'נמוך', color: 'blue', bgClass: 'bg-blue-500/10', textClass: 'text-blue-400', borderClass: 'border-blue-500/30' },
  informational: { label: 'מידעי', color: 'slate', bgClass: 'bg-slate-500/10', textClass: 'text-slate-400', borderClass: 'border-slate-500/30' },
};

export const STATUS_META = {
  passed: { label: 'עבר', labelEn: 'Passed', color: 'green', bgClass: 'bg-green-500/10', textClass: 'text-green-400', borderClass: 'border-green-500/30' },
  failed: { label: 'נכשל', labelEn: 'Failed', color: 'red', bgClass: 'bg-red-500/10', textClass: 'text-red-400', borderClass: 'border-red-500/30' },
  warning: { label: 'אזהרה', labelEn: 'Warning', color: 'amber', bgClass: 'bg-amber-500/10', textClass: 'text-amber-400', borderClass: 'border-amber-500/30' },
  manual: { label: 'ידני', labelEn: 'Manual', color: 'blue', bgClass: 'bg-blue-500/10', textClass: 'text-blue-400', borderClass: 'border-blue-500/30' },
  not_applicable: { label: 'לא רלוונטי', labelEn: 'N/A', color: 'slate', bgClass: 'bg-slate-500/10', textClass: 'text-slate-400', borderClass: 'border-slate-500/30' },
  error: { label: 'שגיאה', labelEn: 'Error', color: 'red', bgClass: 'bg-red-500/10', textClass: 'text-red-400', borderClass: 'border-red-500/30' },
};