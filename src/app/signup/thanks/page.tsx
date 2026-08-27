import Link from "next/link";

export default function SignupThanksPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 text-center">
        <p className="text-xs tracking-[0.2em] text-teal-700 uppercase">Newbill SaaS</p>
        <h1 className="mt-2 text-xl font-semibold text-slate-900">Pembayaran diterima</h1>
        <p className="mt-2 text-sm text-slate-600">
          Jika pembayaran sukses, tenant akan aktif otomatis. Login di client area dengan email yang didaftarkan.
          Kalau belum muncul, tunggu callback gateway atau hubungi admin untuk bayar tunai.
        </p>
        <div className="mt-5 flex justify-center gap-3 text-sm">
          <Link href="/client/login" className="text-teal-700 hover:underline">
            Client login
          </Link>
          <Link href="/signup" className="text-slate-500 hover:underline">
            Daftar lagi
          </Link>
        </div>
      </div>
    </div>
  );
}
