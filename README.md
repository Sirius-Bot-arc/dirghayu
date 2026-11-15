# Dirghayu — Long life, on their own terms.

**An elder-first medication management and care coordination platform.**

> A little more independence. A little less uncertainty. A more connected circle of care.

[![Next.js](https://img.shields.io/badge/Next.js-14-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict-blue)](https://www.typescriptlang.org/)
[![Firebase](https://img.shields.io/badge/Database-Firebase-orange)](https://firebase.google.com/)
[![AI](https://img.shields.io/badge/AI-Google%20Gemini-4285F4)](https://ai.google.dev/)

**GitHub:** https://github.com/Sirius-Bot-arc/dirghayu

---

## 1. What is Dirghayu?

Dirghayu (दीर्घायु) is a Sanskrit-derived word associated with a long life.

It is also the idea behind our project.

As people grow older, managing medicines, appointments, prescriptions and communication between family members can become increasingly complicated.

Existing digital solutions often focus on reminders, tracking or caregiver oversight. But there is another question worth asking:

**What if the older adult remained at the centre of every care decision?**

Dirghayu is designed around that principle.

It aims to connect older adults, caregivers, family members and healthcare professionals through one coordinated platform, while preserving the older adult's autonomy, dignity and control.

Our guiding philosophy:

**Elders should not lose their independence just because they need support.**

---

## 2. Why did we choose this problem?

Medication management is not simply about remembering to take a pill.

It involves several interconnected responsibilities:

- Remembering medication schedules.
- Understanding prescriptions and instructions.
- Keeping track of appointments.
- Communicating changes to family members.
- Identifying missed doses.
- Preparing useful information for doctor visits.

When these responsibilities are distributed across different people and tools, important information can become fragmented.

Caregivers may not know whether a medicine was taken. Older adults may find complicated interfaces difficult to navigate. Family members may want updates without needing access to every personal detail.

We chose this problem because elderly care deserves more than another reminder application.

We wanted to explore how technology could make care more coordinated without making older adults feel monitored or controlled.

---

## 3. Who is Dirghayu built for?

Our primary focus is the **older adult**.

We designed the platform around four participants:

| User | Role |
|---|---|
| Older adult | Primary decision-maker and owner of their care journey |
| Caregiver | Helps with daily medication and appointment coordination |
| Family member | Receives appropriate updates and provides support |
| Doctor / healthcare professional | Receives a concise summary to support consultations |

The older adult comes first.

Caregivers assist, family members support, and healthcare professionals receive relevant information. The platform is intended to make collaboration possible without removing the older adult's authority.

---

## 4. Research behind our approach

Our design was informed by the research paper:

**"Mobile Health Apps, Family Caregivers, and Care Planning: Scoping Review."**

Authors: Kelley MM, Powell T, Camara D, et al.  
Published in: Journal of Medical Internet Research, 2024  
Volume: 26  
Article: e46108  
DOI: https://doi.org/10.2196/46108

Research link: https://www.jmir.org/2024/1/e46108/

### What did we learn?

The review examined 34 papers representing 25 studies.

It identified an evidence gap: none of the included studies assessed a caregiver-app intervention for care planning and coordination for people with multiple chronic conditions. The review also highlighted the need for better coordination between caregivers, care recipients and healthcare professionals.

This does not mean that no care coordination apps exist. Rather, it demonstrates an important gap in the research evidence examined by the authors.

### How did this influence Dirghayu?

We translated those observations into design priorities:

1. Elder-first decision-making.
2. Shared care coordination.
3. Transparent activity records.
4. Controlled information visibility.
5. Better preparation for doctor consultations.

Our goal is to explore a more respectful model of connected elderly care.

---

## 5. What makes Dirghayu different?

We do not claim that medication reminders, AI assistance or appointment management are individually new inventions.

Our differentiation lies in how these capabilities are brought together.

### A. Elder-first governance

The older adult is not simply a profile managed by a caregiver.

Our intended design gives elders control over caregiver participation, approvals and information visibility.

### B. A connected care circle

Instead of treating medication, appointments and family coordination as isolated activities, Dirghayu brings them into one shared care environment.

### C. AI as an assistant, not an authority

Gemini is intended to help interpret prescription information and explain medicine-related information in simpler language.

AI outputs must be reviewed and confirmed by the user. They are not a substitute for a doctor or pharmacist.

### D. Doctor Visit Summary

We designed a summary concept that brings together medication adherence information, missed doses, pending changes and questions from the older adult.

The intention is to make consultations more informed and organised.

### E. Dignity-centred design

We want to avoid interfaces that shame users for missed doses or treat older adults as incapable.

The goal is support, not surveillance.

---

## 6. Features and development status

We have established the technical foundation and developed parts of the application. The following table distinguishes existing foundations from workflows that still require end-to-end verification.

| Feature | Current status |
|---|---|
| Project structure and branding | Foundation established |
| Authentication and role-based architecture | Implemented foundation; full flow needs verification |
| Household and care-circle APIs | Implemented foundation; integration needs verification |
| Medication management | Routes and UI foundation; complete workflow needs testing |
| Appointment management | Routes and UI foundation; complete workflow needs testing |
| Elder Simple Mode | UI work initiated; accessibility testing pending |
| Gemini integration | Server-side integration foundation; outputs need validation |
| Prescription extraction | Integration foundation; full workflow needs verification |
| Adherence summaries | API and summary foundation; accuracy needs testing |
| Doctor Visit Summary | Summary page foundation; complete handoff needs verification |
| Consent and audit architecture | Supporting libraries and authorization foundation |
| Email reminders | Notification foundation; real SMTP delivery not confirmed |
| Cloud Run deployment | Pending |

### Planned extensions

- Multilingual and voice-assisted experiences.
- Offline and low-connectivity support.
- Medication refill tracking.
- More advanced adherence analytics.
- FHIR-style interoperability and healthcare data exchange.
- Improved clinical review and validation of AI-generated information.

---

## 7. Technology stack

Dirghayu uses a modern web application architecture.

| Layer | Technology |
|---|---|
| Frontend | Next.js 14, React 18 |
| Language | TypeScript (strict mode) |
| Styling | Tailwind CSS |
| Backend | Next.js App Router API routes |
| Database foundation | Firebase Firestore |
| Server-side Firebase access | firebase-admin |
| AI integration | Google Gemini |
| Validation | Zod |
| Password hashing | bcryptjs |
| Session and token handling | jose, HTTP-only cookies |
| Email infrastructure | Nodemailer |
| Testing | Vitest |
| Deployment target | Google Cloud Run |

### Architecture overview

The application uses a Next.js frontend connected to server-side API routes.

These routes handle authentication, household management, medication records, appointments, AI-assisted features, summaries and notifications.

Firestore is the intended persistent database. An in-memory repository is also available for local development and testing.

Gemini is accessed server-side rather than exposing API credentials in the browser.

---

## 8. Privacy, security and responsible AI

Elderly care involves sensitive personal information. Privacy must therefore be part of the architecture, not an afterthought.

Our design includes foundations for:

- Role-based access control.
- Consent-aware operations.
- Elder approval of caregiver changes.
- Password hashing.
- HTTP-only session cookies.
- Input validation.
- Activity and audit logging.
- Controlled visibility of care information.

### Responsible AI principles

AI-generated information is intended to be supportive, not authoritative.

- Prescription extraction must be confirmed by the user.
- Medicine explanations must not replace professional advice.
- Potential interaction flags require pharmacist or doctor verification.
- No medication changes should be made solely on an AI recommendation.

These principles guide the intended product behaviour. Production security and privacy compliance still require independent testing and review.

---

## 9. Development progress

We have moved beyond an idea and established a working software foundation.

### Verified development milestones

- Created the Next.js application structure.
- Established the TypeScript and Tailwind development environment.
- Developed the main application pages and supporting API architecture.
- Added Firebase repository infrastructure and local testing support.
- Established authentication, validation and authorization foundations.
- Added Gemini integration foundations.
- Created project branding and visual identity.
- Published the source code to GitHub.
- Successfully completed a production Next.js build.
- Successfully passed TypeScript type-checking.

### Current limitations

We are continuing to validate the application.

The previous full test run reported 123 passing tests and 18 failures across four test suites. These failures still need to be resolved.

Live Firestore integration, actual email delivery, complete AI workflows, production security and Cloud Run deployment have not yet been confirmed.

We do not describe Dirghayu as production-ready.

---

## 10. What would we do next?

We see several opportunities to make Dirghayu more useful and reliable.

**1. Real-world elder co-design**

Test the interface with older adults and caregivers, observe usability challenges and incorporate their feedback.

**2. Accessibility and inclusion**

Introduce multilingual support, voice interaction, larger controls and offline-friendly experiences.

**3. Clinical validation**

Work with qualified healthcare professionals to validate medication-related explanations, interaction warnings and summary formats.

**4. Better interoperability**

Explore FHIR-based integration so relevant information can be exchanged with compatible healthcare systems.

**5. Stronger reliability**

Complete end-to-end testing, validate reminder escalation, test real notification delivery and conduct security reviews.

**6. Deployment and evaluation**

Deploy the application on Google Cloud Run and evaluate the experience with real users in a controlled pilot.

---

## 11. Why we built Dirghayu

We built Dirghayu because growing older should not mean losing control over everyday decisions.

A person may need help remembering a medicine, organising an appointment or communicating with family. That does not mean they should lose their voice in those decisions.

We wanted to build something that recognises both sides of elderly care:

The need for support, and the right to independence.

We are not trying to replace caregivers or healthcare professionals.

We are trying to help the people involved work together, with the older adult remaining at the centre.

**Dirghayu — Long life, on their own terms.**

---

## 12. Project links

- GitHub repository: https://github.com/Sirius-Bot-arc/dirghayu
- Research paper: https://www.jmir.org/2024/1/e46108/
- Google Gemini: https://ai.google.dev/
- Google Cloud Run: https://cloud.google.com/run

### Demo and deployment

- Live application: Pending deployment
- Demo video: To be added
- Screenshots: To be added

---

*Dirghayu is an evolving prototype and is intended for project demonstration and further evaluation. It is not a medical device and does not provide professional medical advice.*
