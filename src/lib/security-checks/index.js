// Security Checks Index - Import all domain modules to register checks
// Adding a new domain: create a new file in domains/ and import it here

import './domains/entraId';
import './domains/conditionalAccess';
import './domains/exchangeOnline';
import './domains/defender';
import './domains/sharepoint';
import './domains/purview';

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