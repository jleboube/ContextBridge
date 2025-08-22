import React from "react";

export default function Integrations() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-12 text-gray-800">
      <h1 className="text-3xl font-bold mb-6">Integrations</h1>
      <p className="mb-4">
        ContextBridge connects seamlessly with your favorite GenAI providers. By adding your API
        keys, you can unlock persistent memory and cross-platform continuity across different AI
        models.
      </p>

      <h2 className="text-xl font-semibold mt-8 mb-2">🔗 How It Works</h2>
      <ol className="list-decimal list-inside mb-6 space-y-2">
        <li>Create an account with your preferred GenAI provider (e.g., OpenAI, Anthropic, Google).</li>
        <li>Obtain your API key from the provider’s developer dashboard.</li>
        <li>In ContextBridge, navigate to <strong>Integrations</strong> and paste your API key into the secure field.</li>
        <li>Save your integration — your conversations will now seamlessly flow across providers.</li>
      </ol>

      <h2 className="text-xl font-semibold mt-8 mb-4">🌐 Supported Providers</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="p-4 border rounded-xl shadow-sm bg-white">
          <h3 className="text-lg font-semibold">OpenAI (ChatGPT, GPT-4)</h3>
          <p className="text-sm mt-2 text-gray-600">
            Add your OpenAI API key to use GPT-3.5 and GPT-4 models with memory persistence.
          </p>
          <a
            href="https://platform.openai.com/account/api-keys"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 underline text-sm mt-2 inline-block"
          >
            Get API Key →
          </a>
        </div>

        <div className="p-4 border rounded-xl shadow-sm bg-white">
          <h3 className="text-lg font-semibold">Anthropic (Claude)</h3>
          <p className="text-sm mt-2 text-gray-600">
            Connect your Claude API key for long-form reasoning and continuity across projects.
          </p>
          <a
            href="https://console.anthropic.com/account/keys"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 underline text-sm mt-2 inline-block"
          >
            Get API Key →
          </a>
        </div>

        <div className="p-4 border rounded-xl shadow-sm bg-white">
          <h3 className="text-lg font-semibold">Google (Gemini)</h3>
          <p className="text-sm mt-2 text-gray-600">
            Add your Google Gemini API key to integrate with Google’s multimodal AI services.
          </p>
          <a
            href="https://makersuite.google.com/app/apikey"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 underline text-sm mt-2 inline-block"
          >
            Get API Key →
          </a>
        </div>

        <div className="p-4 border rounded-xl shadow-sm bg-white">
          <h3 className="text-lg font-semibold">Custom Providers</h3>
          <p className="text-sm mt-2 text-gray-600">
            ContextBridge is extensible. Add custom API endpoints for other GenAI providers or
            self-hosted models.
          </p>
          <a
            href="/docs"
            className="text-blue-600 underline text-sm mt-2 inline-block"
          >
            View Developer Docs →
          </a>
        </div>
      </div>

      <h2 className="text-xl font-semibold mt-10 mb-2">🔒 Security</h2>
      <p className="mb-4">
        Your API keys are encrypted and stored securely. Keys are only used for making calls to
        the selected providers on your behalf. You can update or revoke integrations at any time.
      </p>

      <h2 className="text-xl font-semibold mt-8 mb-2">📞 Need Help?</h2>
      <p>
        Visit our <a href="/support" className="text-blue-600 underline">Help Center</a> for
        step-by-step guides, or contact{" "}
        <a href="mailto:support@context-bridge.com" className="text-blue-600 underline">
          support@context-bridge.com
        </a>.
      </p>
    </div>
  );
}
