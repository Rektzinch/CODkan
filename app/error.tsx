"use client";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return <main className="center">
    <h1>Halaman gagal dimuat</h1>
    <p>Terjadi kendala saat menampilkan data. Coba muat ulang, datamu tetap tersimpan.</p>
    <button className="primary" onClick={reset}>Coba lagi</button>
  </main>;
}
