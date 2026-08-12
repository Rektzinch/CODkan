-- Izinkan pemilik menghapus listing meskipun statusnya sudah 'sold' atau 'reserved'
DROP POLICY IF EXISTS "listings_own_delete" ON public.listings;

CREATE POLICY "listings_own_delete"
ON public.listings
FOR DELETE
USING (auth.uid() = seller_id);

-- Bersihkan kolom deletion_requested_at pada profiles jika ada (karena sekarang menggunakan penghapusan instan)
ALTER TABLE public.profiles DROP COLUMN IF EXISTS deletion_requested_at;
