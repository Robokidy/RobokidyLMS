/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Award, CheckCircle2, Download, Eye, Search, XCircle } from "lucide-react";
import { apiFetch } from "@/api/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

function dateLabel(value?: string) {
  return value ? new Date(value).toLocaleDateString() : "-";
}

export default function VerifyCertificatePage() {
  const params = useParams();
  const [certificateId, setCertificateId] = useState(params.certificateId || "");
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const verify = async (id = certificateId) => {
    if (!id) return;
    setLoading(true);
    try {
      setResult(await apiFetch(`/certificates/verify/${encodeURIComponent(id)}`));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (params.certificateId) verify(params.certificateId);
  }, [params.certificateId]);

  return (
    <div className="min-h-screen bg-[#f8f9fa] px-4 py-10 text-[#1a1a2e]">
      <div className="mx-auto max-w-3xl space-y-5">
        <div className="text-center">
          <img src="/logo.png" alt="Robokidy" className="mx-auto h-16 rounded-xl bg-white p-2 shadow" />
          <h1 className="mt-4 text-3xl font-bold">Robokidy Certificate Verification</h1>
          <p className="mt-2 text-sm text-slate-600">Authenticate a certificate issued by Robokidy Education.</p>
        </div>
        <Card className="border-white bg-white shadow-lg">
          <CardContent className="p-5">
            <div className="flex flex-col gap-3 sm:flex-row">
              <Input value={certificateId} onChange={(event) => setCertificateId(event.target.value)} placeholder="Enter certificate ID" className="font-mono" />
              <Button className="bg-[#1a1a2e]" onClick={() => verify()} disabled={loading}><Search className="mr-2 h-4 w-4" />Verify</Button>
            </div>
          </CardContent>
        </Card>

        {result && (
          <Card className={`border-white bg-white shadow-xl ${result.verified ? "shadow-green-100" : "shadow-red-100"}`}>
            <CardContent className="p-7">
              <div className="flex items-center gap-3">
                {result.verified ? <CheckCircle2 className="h-10 w-10 text-green-600" /> : <XCircle className="h-10 w-10 text-red-600" />}
                <div>
                  <h2 className="text-2xl font-bold">{result.verified ? "VERIFIED" : "NOT VERIFIED"}</h2>
                  <p className="text-sm text-slate-600">{result.verified ? "Certificate authenticated" : result.message || "Certificate not found or revoked"}</p>
                </div>
              </div>
              {result.verified && (
                <>
                  <div className="mt-6 grid gap-3 rounded-xl bg-slate-50 p-5 sm:grid-cols-2">
                    <Field label="Student Name" value={result.studentName} />
                    <Field label="Roll Number" value={result.rollNumber} />
                    <Field label="School" value={result.schoolName} />
                    <Field label="Grade" value={result.grade} />
                    <Field label="Course" value={result.courseName} />
                    <Field label="Certificate ID" value={result.certificateId} mono />
                    <Field label="Issue Date" value={dateLabel(result.issueDate)} />
                    <Field label="Issued By" value={result.issuedBy || "Robokidy"} />
                  </div>
                  <div className="mt-5 flex flex-wrap gap-2">
                    <Button asChild><a href={result.certificatePdfUrl} target="_blank" rel="noreferrer"><Download className="mr-2 h-4 w-4" />Download Certificate PDF</a></Button>
                    <Button variant="outline" asChild><a href={result.certificatePdfUrl} target="_blank" rel="noreferrer"><Eye className="mr-2 h-4 w-4" />View Certificate</a></Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}
        <div className="rounded-xl border bg-white p-4 text-center text-sm text-slate-500">
          <Award className="mx-auto mb-2 h-5 w-5 text-[#c9a227]" />
          This certificate is verified by Robokidy Education Pvt Ltd.
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, mono }: { label: string; value: any; mono?: boolean }) {
  return <div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p><p className={`mt-1 font-semibold ${mono ? "font-mono text-sm" : ""}`}>{value || "-"}</p></div>;
}
