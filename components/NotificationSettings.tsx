"use client";

import { BellRing, Check, Mail, MessageCircleMore, Smartphone } from "lucide-react";
import { useState } from "react";

const initial = {
  activity: true,
  assessment: true,
  payment: true,
  whatsapp: true,
  email: false,
};

export default function NotificationSettings() {
  const [settings, setSettings] = useState(initial);
  const [saved, setSaved] = useState(false);

  function toggle(key: keyof typeof settings) {
    setSaved(false);
    setSettings((current) => ({ ...current, [key]: !current[key] }));
  }

  return (
    <div className="settings-grid">
      <section className="settings-card panel">
        <header><BellRing /><div><h2>Jenis notifikasi</h2><p>Pilih informasi tentang Alya yang ingin Anda terima.</p></div></header>
        <SettingRow title="Aktivitas baru" description="Saat guru membagikan foto atau catatan kegiatan." checked={settings.activity} onChange={() => toggle("activity")} />
        <SettingRow title="Penilaian dipublikasi" description="Saat laporan perkembangan baru tersedia." checked={settings.assessment} onChange={() => toggle("assessment")} />
        <SettingRow title="SPP & jatuh tempo" description="Pengingat tagihan, status pembayaran, dan denda." checked={settings.payment} onChange={() => toggle("payment")} />
      </section>
      <section className="settings-card panel">
        <header><Smartphone /><div><h2>Saluran pengiriman</h2><p>Atur cara ClassPing mengirimkan pengingat.</p></div></header>
        <SettingRow icon={<MessageCircleMore />} title="WhatsApp" description="+62 812-3456-7890" checked={settings.whatsapp} onChange={() => toggle("whatsapp")} />
        <SettingRow icon={<Mail />} title="Email" description="ani.dua.anak@gmail.com" checked={settings.email} onChange={() => toggle("email")} />
      </section>
      <button className="primary-button settings-save" type="button" onClick={() => setSaved(true)}>{saved ? <><Check /> Pengaturan tersimpan</> : "Simpan pengaturan"}</button>
    </div>
  );
}

function SettingRow({ title, description, checked, onChange, icon }: { title: string; description: string; checked: boolean; onChange: () => void; icon?: React.ReactNode }) {
  return (
    <div className="setting-row">
      {icon && <span className="setting-icon">{icon}</span>}
      <div><strong>{title}</strong><small>{description}</small></div>
      <label className="switch"><input type="checkbox" checked={checked} onChange={onChange} aria-label={title} /><span /></label>
    </div>
  );
}
