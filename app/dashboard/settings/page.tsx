import NotificationSettings from "@/components/NotificationSettings";
import PageHeader from "@/components/PageHeader";

export default function SettingsPage() {
  return (
    <div className="content-page">
      <PageHeader eyebrow="PREFERENSI AKUN" title="Pengaturan" description="Atur notifikasi dan saluran komunikasi untuk akun wali murid Anda." />
      <NotificationSettings />
    </div>
  );
}
