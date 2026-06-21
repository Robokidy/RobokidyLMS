import AdminShell from "@/components/layout/AdminShell";
import CertificateWorkspace from "@/pages/certificates/CertificateWorkspace";

export default function AdminCertificatesPage() {
  return (
    <AdminShell title="Certificates" subtitle="Generate, verify, revoke, export, and analyze student certificates">
      <CertificateWorkspace />
    </AdminShell>
  );
}
