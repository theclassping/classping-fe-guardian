import Brand from "@/components/Brand";

export default function LoginShowcase() {
  return (
    <section className="login-showcase" aria-label="Tentang ClassPing Guardian">
      <Brand inverse />
      <div className="login-showcase__content">
        <span className="eyebrow-pill">PORTAL WALI</span>
        <h1>Setiap langkah kecil, terasa lebih dekat.</h1>
        <p>
          Ikuti aktivitas, perkembangan, dan informasi sekolah anak dalam
          satu ruang yang aman dan mudah dipahami.
        </p>
        <div className="login-preview" aria-hidden="true">
          <div className="login-preview__art">🎨</div>
          <div>
            <span>Aktivitas hari ini</span>
            <strong>Melukis dengan Jari</strong>
            <small>Anak belajar mengenal warna baru.</small>
          </div>
        </div>
      </div>
      <p className="login-showcase__footer">
        © 2026 ClassPing · Tumbuh bersama, setiap hari.
      </p>
    </section>
  );
}
