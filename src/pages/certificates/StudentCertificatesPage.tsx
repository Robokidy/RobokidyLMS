/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import { Award, Download, Share2 } from "lucide-react";
import { apiFetch } from "@/api/client";
import { useAuth } from "@/context/AuthContext";
import StudentLmsShell from "@/components/layout/StudentLmsShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

function dateLabel(value?: string) {
  return value ? new Date(value).toLocaleDateString() : "-";
}

export default function StudentCertificatesPage() {
  const { token } = useAuth();
  const [certificates, setCertificates] = useState<any[]>([]);

  useEffect(() => {
    if (!token) return;
    apiFetch("/certificates/my", {}, token).then(setCertificates).catch(() => setCertificates([]));
  }, [token]);

  return (
    <StudentLmsShell title="My Certificates" subtitle="Download and share your verified Robokidy certificates.">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {certificates.map((certificate) => (
          <Card key={certificate._id} className="border-white/70 bg-white/90 shadow-lg shadow-slate-200/50">
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-3">
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-[#c9a227]/15 text-[#9a7a18]"><Award className="h-6 w-6" /></span>
                <Badge className={certificate.status === "active" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}>{certificate.status}</Badge>
              </div>
              <h3 className="mt-4 text-lg font-bold">{certificate.courseName}</h3>
              <p className="mt-1 text-sm text-slate-500">Grade {certificate.grade} | {certificate.schoolName}</p>
              <p className="mt-4 font-mono text-xs text-slate-600">ID: {certificate.certificateId}</p>
              <p className="mt-1 text-sm text-slate-500">Issued: {dateLabel(certificate.issueDate)}</p>
              <div className="mt-5 flex gap-2">
                <Button size="sm" asChild><a href={certificate.certificatePdfUrl} target="_blank" rel="noreferrer"><Download className="mr-2 h-4 w-4" />Download</a></Button>
                <Button size="sm" variant="outline" onClick={() => navigator.clipboard?.writeText(certificate.verificationUrl)}><Share2 className="mr-2 h-4 w-4" />Share</Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {!certificates.length && <div className="rounded-xl border border-dashed bg-white/70 p-10 text-center text-slate-500 md:col-span-2 xl:col-span-3">No certificates have been issued yet.</div>}
      </div>
    </StudentLmsShell>
  );
}
