"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { useState } from "react";

type Props = {
  student: { id: number; name: string; nickname?: string; initials: string };
  selectedStudentId?: number;
};

export default function LinkedStudentActivityLink({ student, selectedStudentId }: Props) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function openActivities(event: React.MouseEvent<HTMLAnchorElement>) {
    if (selectedStudentId === student.id) return;
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setError("");
    try {
      const response = await fetch("/api/session/current-student", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ student_id: student.id }),
      });
      if (!response.ok) throw new Error("Tidak dapat memilih siswa ini. Silakan muat ulang halaman.");
      router.push("/dashboard/activities");
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Terjadi kesalahan. Silakan coba lagi.");
      setPending(false);
    }
  }

  return (
    <>
      <Link href="/dashboard/activities" onClick={openActivities} aria-busy={pending}>
        <span>{student.initials}</span>
        <div><strong>{student.name}</strong><small>{student.nickname || "Siswa terhubung"}</small></div>
        <b>{pending ? "Membuka aktivitas…" : "Buka aktivitas"} <ArrowRight /></b>
      </Link>
      {error && <p className="profile-empty-state" role="alert">{error}</p>}
    </>
  );
}
