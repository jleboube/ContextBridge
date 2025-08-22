import React from "react";

export default function Privacy() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-12 text-gray-800">
      <h1 className="text-3xl font-bold mb-6">Privacy Policy</h1>
      <p className="mb-4">
        At <strong>ContextBridge</strong>, your privacy is important to us. This Privacy Policy explains how we
        collect, use, and protect your personal information when you use our website and services.
      </p>

      <h2 className="text-xl font-semibold mt-8 mb-2">1. Information We Collect</h2>
      <p className="mb-4">
        We may collect information that you provide directly to us (such as account registration
        details, email address, or support requests) and information automatically collected
        through your use of the service (such as usage data, cookies, and log files).
      </p>

      <h2 className="text-xl font-semibold mt-8 mb-2">2. How We Use Information</h2>
      <p className="mb-4">
        We use collected information to:
      </p>
      <ul className="list-disc list-inside mb-4">
        <li>Provide and improve ContextBridge services</li>
        <li>Personalize user experience and maintain context continuity</li>
        <li>Send important service updates and security notifications</li>
        <li>Ensure compliance with legal obligations</li>
      </ul>

      <h2 className="text-xl font-semibold mt-8 mb-2">3. Data Security</h2>
      <p className="mb-4">
        We implement enterprise-grade security measures, including SOC2 compliance. Sensitive data
        can be deployed on-premise to meet strict organizational requirements.
      </p>

      <h2 className="text-xl font-semibold mt-8 mb-2">4. Sharing of Information</h2>
      <p className="mb-4">
        We do not sell or rent your personal information. We may share limited data with trusted
        service providers to operate and improve our services, subject to strict confidentiality
        obligations.
      </p>

      <h2 className="text-xl font-semibold mt-8 mb-2">5. Your Rights</h2>
      <p className="mb-4">
        You may access, correct, or delete your personal data at any time by contacting our support
        team. You may also opt out of marketing emails.
      </p>

      <h2 className="text-xl font-semibold mt-8 mb-2">6. Contact Us</h2>
      <p>
        If you have any questions about this Privacy Policy, please contact us at:{" "}
        <a href="mailto:support@context-bridge.com" className="text-blue-600 underline">
          support@context-bridge.com
        </a>.
      </p>
    </div>
  );
}
