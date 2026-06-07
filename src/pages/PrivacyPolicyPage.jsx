import React from 'react';
import { Link } from 'react-router-dom';
import './PrivacyPolicyPage.css';

const PrivacyPolicyPage = () => {
  return (
    <div className="privacy-page-container">
      <header className="privacy-header">
        <Link to="/" className="back-link">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Back to Home
        </Link>
        <h1>Data Privacy Policy & Acceptable Use</h1>
        <p>Effective Date: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
      </header>

      <main className="privacy-content">
        <section className="privacy-section">
          <h2>1. Introduction</h2>
          <p>
            Welcome to the School LMS Portal. We respect your privacy and are committed to protecting personal information 
            in accordance with Republic Act No. 10173, also known as the <strong>Data Privacy Act of 2012 (DPA)</strong> of the Philippines, 
            its Implementing Rules and Regulations (IRR), and other relevant laws.
          </p>
          <p>
            This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our portal.
          </p>
        </section>

        <section className="privacy-section">
          <h2>2. Information We Collect</h2>
          <p>We may collect and process the following types of personal and sensitive personal information:</p>
          <ul>
            <li><strong>Student Data:</strong> Learner Reference Numbers (LRN), full names, gender, grade level, general averages, previous school records, status in government programs (e.g., 4Ps), and document submissions (e.g., SF9, Birth Certificates).</li>
            <li><strong>Personnel Data:</strong> Names, employee IDs, email addresses, contact details, roles, assignments, and digital signatures/uploaded photos.</li>
            <li><strong>System Data:</strong> Usage logs, session information, and access history for security auditing purposes.</li>
          </ul>
        </section>

        <section className="privacy-section">
          <h2>3. Purpose of Data Collection</h2>
          <p>Your personal data is collected and processed for the following legitimate purposes:</p>
          <ul>
            <li>To manage student enrolments, academic records, and track submission of requirements.</li>
            <li>To manage faculty assignments, teaching loads, and school inventory.</li>
            <li>To facilitate school administration, communication, and reporting requirements mandated by the Department of Education (DepEd).</li>
            <li>To maintain the security, functionality, and integrity of the School LMS Portal.</li>
          </ul>
        </section>

        <section className="privacy-section">
          <h2>4. Data Storage and Security</h2>
          <p>
            We implement reasonable and appropriate physical, technical, and organizational security measures to protect 
            personal data from unauthorized access, use, alteration, and destruction. All data is securely stored in 
            encrypted databases (via Google Firebase) and access is strictly limited to authorized school personnel on a 
            need-to-know basis.
          </p>
        </section>

        <section className="privacy-section">
          <h2>5. Acceptable Use Policy for Personnel</h2>
          <p>By accessing this system as a school personnel, you agree to the following conditions:</p>
          <ul>
            <li><strong>Confidentiality:</strong> You shall treat all student and personnel data accessed through this portal as strictly confidential.</li>
            <li><strong>Authorized Use:</strong> You shall only access and process data required for the legitimate performance of your official duties.</li>
            <li><strong>Data Protection:</strong> You shall not download, share, or expose sensitive personal information to unauthorized third parties. You must ensure you are logged out when using shared devices.</li>
          </ul>
        </section>

        <section className="privacy-section">
          <h2>6. Rights of the Data Subject</h2>
          <p>Under the Data Privacy Act of 2012, you are entitled to the following rights:</p>
          <ul>
            <li><strong>Right to be Informed:</strong> To know that your personal data will be, are being, or were, processed.</li>
            <li><strong>Right to Access:</strong> To request a copy of any personal data we hold about you.</li>
            <li><strong>Right to Rectify:</strong> To dispute the inaccuracy or error in your personal data and have it corrected immediately.</li>
            <li><strong>Right to Erasure or Blocking:</strong> To suspend, withdraw, or order the blocking, removal, or destruction of your personal data from our filing system upon discovery and substantial proof of conditions under the DPA.</li>
          </ul>
        </section>

        <section className="privacy-section">
          <h2>7. Contact Information</h2>
          <p>
            If you have any questions, concerns, or requests regarding this Privacy Policy or the processing of your personal data, 
            please contact the school's designated <strong>Data Protection Officer (DPO)</strong> through the school administration office.
          </p>
        </section>
      </main>
    </div>
  );
};

export default PrivacyPolicyPage;
