"use client";

import dynamic from "next/dynamic";

const UploadForm = dynamic(() => import("./UploadForm"), {
  ssr: false,
  loading: () => (
    <div className="max-w-2xl mx-auto px-8 py-12 space-y-6">
      <div className="h-8 w-48 skeleton" />
      <div className="h-4 w-72 skeleton" />
      <div className="h-48 skeleton rounded-xl" />
    </div>
  ),
});

export default function AnalyzePage() {
  return <UploadForm />;
}
