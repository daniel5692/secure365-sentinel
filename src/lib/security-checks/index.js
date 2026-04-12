// Security Checks Index - Import all domain modules to register checks
// CIS Microsoft 365 Foundations Benchmark v6.0.1

import './domains/entraId';
import './domains/conditionalAccess';
import './domains/exchangeOnline';
import './domains/defender';
import './domains/sharepoint';
import './domains/teams';
import './domains/purview';
import './domains/m365AdminCenter';
import './domains/defenderEmailSecurity';
import './domains/intune';
import './domains/entraIdExtended';
import './domains/idProtection';
import './domains/idGovernance';
import './domains/exchangeExtended';
import './domains/sharepointExtended';

// Re-export registry for convenience
export {
  getAllChecks,
  getCheck,
  getChecksByDomain,
  getChecksBySeverity,
  getChecksByFramework,
  getDomains,
  getCheckStats,
  DOMAIN_META,
  SEVERITY_META,
  STATUS_META,
} from './checkRegistry';