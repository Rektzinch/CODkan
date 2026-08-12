-- Memberikan izin eksplisit kepada peran authenticated pada tabel profiles
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;

-- Memastikan izin SELECT tersedia untuk public (anon) agar listing tetap terbaca
GRANT SELECT ON public.profiles TO anon;
