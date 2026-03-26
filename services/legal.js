// Legal Documents for DoorBot AI
// USA & Canada TCPA/CASL Compliant — March 2026

function getTermsOfService() {
  return `
DOORBOTAI TERMS OF SERVICE
Last Updated: March 2026

1. ACCEPTANCE OF TERMS
By using DoorBot AI ("Service"), you ("User", "Agent") agree to these Terms. 
If you disagree, do not use the Service.

2. SERVICE DESCRIPTION
DoorBot AI provides AI-powered voice calling software for real estate professionals. 
We are a SOFTWARE PROVIDER only — we do not make calls on our own behalf.

3. USER RESPONSIBILITIES — TCPA & CASL COMPLIANCE
YOU ARE SOLELY RESPONSIBLE FOR:
a) Obtaining prior express written consent from ALL contacts before using automated calls
b) Maintaining and honoring Do Not Call (DNC) lists
c) Complying with the Telephone Consumer Protection Act (TCPA), 47 U.S.C. § 227
d) Complying with Canada's Anti-Spam Legislation (CASL) if operating in Canada
e) Complying with all applicable federal, state, provincial, and local laws
f) Ensuring all CSV uploads contain only contacts who have given explicit consent
g) Identifying AI calls as automated/AI-generated to recipients
h) Providing opt-out mechanisms in every communication

4. PROHIBITED USES
You may NOT use DoorBot AI to:
a) Contact individuals on the National Do Not Call Registry without consent
b) Contact individuals who have opted out of communications
c) Send unsolicited commercial messages without consent
d) Violate any applicable telemarketing laws
e) Scrape or harvest contact information from third-party websites
f) Contact minors

5. TCPA COMPLIANCE (USA)
As of January 27, 2025, the FCC requires 1-to-1 written consent for automated calls.
YOU must obtain this consent BEFORE using our Service to contact any individual.
Violations can result in fines of $500-$1,500 per call.
DoorBot AI is NOT liable for your TCPA violations.

6. CASL COMPLIANCE (CANADA)
Canadian users must comply with CASL requirements for express consent.
DoorBot AI is NOT liable for your CASL violations.

7. INDEMNIFICATION
You agree to indemnify and hold harmless DoorBot AI, its owners, employees, and 
affiliates from any claims, damages, fines, or legal costs arising from your use 
of the Service, including but not limited to TCPA/CASL violations.

8. DISCLAIMER OF LIABILITY
DOORBOTAI PROVIDES SOFTWARE "AS IS". WE ARE NOT LIABLE FOR:
- Any regulatory fines or legal actions resulting from your use
- Call outcomes or lead quality
- Technical failures beyond our reasonable control

9. TERMINATION
We may terminate your account immediately for violations of these Terms.

10. GOVERNING LAW
These Terms are governed by the laws of the jurisdiction where DoorBot AI operates.

By using DoorBot AI, you confirm you have read, understood, and agree to these Terms.
`;
}

function getPrivacyPolicy() {
  return `
DOORBOTAI PRIVACY POLICY
Last Updated: March 2026

1. INFORMATION WE COLLECT
- Account information (name, email, phone)
- Agent configuration and bot training data
- Lead data you upload or generate through the platform
- Call logs and outcomes (stored securely)

2. HOW WE USE INFORMATION
- To provide and improve the Service
- To send service notifications
- We do NOT sell your data to third parties
- We do NOT use your leads for our own marketing

3. DATA SECURITY
- All data encrypted in transit (SSL/TLS)
- MongoDB Atlas with enterprise-grade security
- Regular security audits

4. DATA RETENTION
- Account data: retained while account is active + 30 days
- Lead data: retained for 12 months, then archived
- Call logs: retained for 90 days

5. YOUR RIGHTS (GDPR/CCPA/PIPEDA)
You have the right to:
- Access your data
- Delete your data
- Export your data
- Opt out of communications

6. CONTACT
privacy@doorbotai.com

By using DoorBot AI, you agree to this Privacy Policy.
`;
}

function getCSVDisclaimer() {
  return `IMPORTANT — TCPA/CASL COMPLIANCE REQUIRED

By uploading this CSV file, you confirm and warrant that:

✅ ALL contacts in this list have provided PRIOR EXPRESS WRITTEN CONSENT 
   to receive automated AI calls from YOUR specific business

✅ You have verified that NO contacts are on the National Do Not Call (DNC) Registry
   (unless they have an established business relationship with you)

✅ You will provide opt-out mechanisms and honor all opt-out requests within 10 days

✅ You are solely responsible for TCPA (USA) and CASL (Canada) compliance

✅ DoorBot AI is a software provider only — you are the caller of record

⚠️  VIOLATIONS CAN RESULT IN FINES OF $500-$1,500 PER CALL

By clicking "Upload & Call", you accept full legal responsibility for compliance.
DoorBot AI is not liable for any regulatory violations arising from your use.`;
}

function getTCPANotice() {
  return `This automated call is being made on behalf of [Agent Name] using DoorBot AI. 
You may opt out at any time by saying "remove me" or "opt out". 
This call may be recorded for quality assurance purposes.`;
}

module.exports = { getTermsOfService, getPrivacyPolicy, getCSVDisclaimer, getTCPANotice };
