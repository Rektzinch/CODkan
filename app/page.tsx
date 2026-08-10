"use client";

import { useEffect, useMemo, useState } from "react";

type Listing = {
  id: number;
  title: string;
  price: number;
  area: string;
  distance: string;
  condition: string;
  negotiable: boolean;
  image: string;
  category: string;
};

const listings: Listing[] = [
  { id: 1, title: "iPhone 13 128GB Mulus", price: 7150000, area: "Somba Opu", distance: "2,4 km", condition: "Bekas", negotiable: true, category: "Elektronik", image: "https://d3m9l0v76dty0.cloudfront.net/system/photos/7639591/original/4b218b678854ccb25ad42cbe76c87ade.png" },
  { id: 2, title: "Kursi Jati Rotan Minimalis", price: 850000, area: "Pallangga", distance: "3,1 km", condition: "Bekas", negotiable: true, category: "Rumah", image: "https://s.alicdn.com/%40sc04/kf/Aac6a1d19358345dc8f630769aa0770bbk/Trusted-Factory-Decorative-Wooden-Chairs-for-Dining-Teak-Wood-Chair-From-Vietnam.jpg" },
  { id: 3, title: "Sony A7 II + Kit 28–70mm", price: 8300000, area: "Panakkukang", distance: "4,8 km", condition: "Bekas", negotiable: false, category: "Elektronik", image: "https://d1v5w8bodpeh4i.cloudfront.net/dfd3367300e44c65b689a6b1df47b58f.png" },
  { id: 4, title: "Keyboard Wooting 80HE", price: 2450000, area: "Rappocini", distance: "5,2 km", condition: "Seperti baru", negotiable: true, category: "Komputer", image: "https://cdn.shopify.com/s/files/1/0259/9619/7939/files/Wooting_80HE_-_Black_e98a7a87-7791-4065-83e3-28a1d84e73b3.png?v=1769189749&width=384" },
  { id: 5, title: "iPhone 13 128GB Starlight", price: 6900000, area: "Bontomarannu", distance: "6,0 km", condition: "Bekas", negotiable: true, category: "Elektronik", image: "https://d3m9l0v76dty0.cloudfront.net/system/photos/7639591/original/4b218b678854ccb25ad42cbe76c87ade.png" },
  { id: 6, title: "Kursi Teras Kayu Solid", price: 725000, area: "Tamalate", distance: "6,7 km", condition: "Bekas", negotiable: false, category: "Rumah", image: "https://s.alicdn.com/%40sc04/kf/Aac6a1d19358345dc8f630769aa0770bbk/Trusted-Factory-Decorative-Wooden-Chairs-for-Dining-Teak-Wood-Chair-From-Vietnam.jpg" },
];

const categories = ["Semua", "Elektronik", "Komputer", "Rumah", "Fashion", "Hobi"];
const filters = ["Terdekat", "Bisa Ditawar", "Bekas", "Harga"];

function Icon({ name, size = 20 }: { name: string; size?: number }) {
  const paths: Record<string, React.ReactNode> = {
    search: <><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></>,
    pin: <><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></>,
    heart: <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5a5.5 5.5 0 0 0 1-8.9Z"/>,
    home: <><path d="m3 11 9-8 9 8"/><path d="M5 10v10h14V10M9 20v-6h6v6"/></>,
    plus: <><circle cx="12" cy="12" r="9"/><path d="M8 12h8M12 8v8"/></>,
    bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></>,
    user: <><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></>,
    chevron: <path d="m9 18 6-6-6-6"/>,
    tune: <><path d="M4 7h10M18 7h2M4 17h2M10 17h10"/><circle cx="16" cy="7" r="2"/><circle cx="8" cy="17" r="2"/></>,
    close: <><path d="m6 6 12 12M18 6 6 18"/></>,
    chat: <><path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z"/></>,
    shield: <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/></>,
    clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 10h18"/></>,
    phone: <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.4 19.4 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 2 .7 2.9a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.2-1.2a2 2 0 0 1 2.1-.5c.9.3 1.9.6 2.9.7a2 2 0 0 1 1.7 2Z"/>,
    check: <path d="m5 12 4 4L19 6"/>,
  };
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}

const rupiah = (value: number) => `Rp${new Intl.NumberFormat("id-ID").format(value)}`;

export default function Home() {
  const [category, setCategory] = useState("Semua");
  const [activeFilters, setActiveFilters] = useState<string[]>(["Terdekat"]);
  const [query, setQuery] = useState("");
  const [favorites, setFavorites] = useState<number[]>([]);
  const [selected, setSelected] = useState<Listing | null>(null);
  const [offerOpen, setOfferOpen] = useState(false);
  const [offerAmount, setOfferAmount] = useState("6200000");
  const [attempts, setAttempts] = useState(0);
  const [offerMessage, setOfferMessage] = useState("");
  const [dealActive, setDealActive] = useState(false);
  const [showDeal, setShowDeal] = useState(false);
  const [scheduled, setScheduled] = useState(false);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => undefined);
  }, []);

  const shown = useMemo(() => listings.filter((item) => {
    const matchesCategory = category === "Semua" || item.category === category;
    const matchesSearch = item.title.toLowerCase().includes(query.toLowerCase());
    const matchesOffer = !activeFilters.includes("Bisa Ditawar") || item.negotiable;
    return matchesCategory && matchesSearch && matchesOffer;
  }), [category, query, activeFilters]);

  const toggleFilter = (filter: string) => setActiveFilters((current) => current.includes(filter) ? current.filter((item) => item !== filter) : [...current, filter]);
  const submitOffer = () => {
    if (!offerAmount || Number(offerAmount) < 100000) return;
    const next = attempts + 1;
    setAttempts(next);
    if (next === 1) {
      setOfferMessage(`Tawaran ${rupiah(Number(offerAmount))} ditolak. Coba lagi—masih ada 2 kesempatan.`);
      setOfferAmount("6600000");
    } else {
      setDealActive(true);
      setShowDeal(true);
      setOfferOpen(false);
      setSelected(null);
      setOfferMessage("");
    }
  };

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="topbar-inner">
          <a className="brand" href="#top" aria-label="CODkan beranda">COD<span>kan</span></a>
          <button className="area-button" type="button"><Icon name="pin" size={18}/><span><small>Area kamu</small><strong>Somba Opu, Gowa</strong></span><span className="down">⌄</span></button>
          <div className="desktop-search search-box"><Icon name="search"/><input aria-label="Cari barang" placeholder="Cari barang di sekitar..." value={query} onChange={(e) => setQuery(e.target.value)}/></div>
          <nav className="desktop-actions" aria-label="Navigasi utama">
            <button type="button"><Icon name="plus"/><span>Jual Barang</span></button>
            <button className="icon-btn" type="button" aria-label="Aktivitas"><Icon name="bell"/></button>
            <button className="avatar" type="button" aria-label="Profil saya">AR</button>
          </nav>
        </div>
      </header>

      {showDeal ? <section className="deal-room" id="top">
        <div className="deal-title-row"><div><p className="eyebrow">DEAL ROOM</p><h1>COD dengan Fajar</h1><span>Kesepakatan aktif · kontak sudah terbuka</span></div><button type="button" onClick={() => setShowDeal(false)}>Kembali ke beranda</button></div>
        <div className="deal-layout">
          <div className="deal-main">
            {completed && <div className="completion-banner"><span><Icon name="check"/></span><div><strong>COD selesai</strong><p>Kedua pihak sudah mengonfirmasi serah terima.</p></div></div>}
            <article className="deal-product"><img src={listings[0].image} alt={listings[0].title}/><div><span>{completed ? "SELESAI" : scheduled ? "COD TERJADWAL" : "DEAL DIBUAT"}</span><h2>{listings[0].title}</h2><strong>{rupiah(6600000)}</strong><p>Harga final terkunci · bayar saat bertemu</p></div></article>
            <section className="timeline-card"><h2>Perjalanan COD</h2><div className="timeline">
              {["Deal dibuat","Kontak dibuka","Jadwal disepakati","COD berlangsung","Selesai"].map((step,index) => <div className={(index < 2 || scheduled && index < 4 || completed) ? "done" : ""} key={step}><i>{index < 2 || scheduled && index < 4 || completed ? <Icon name="check" size={14}/> : index + 1}</i><span>{step}</span></div>)}
            </div></section>
            <section className="schedule-card"><div className="section-title"><div><p>LANGKAH BERIKUTNYA</p><h2>{scheduled ? "Jadwal COD" : "Atur waktu dan tempat COD"}</h2></div><Icon name="calendar"/></div>
              {scheduled ? <div className="schedule-result"><div><Icon name="calendar"/><span><small>Waktu</small><strong>Rabu, 12 Agustus · 16.30 WITA</strong></span></div><div><Icon name="pin"/><span><small>Titik COD</small><strong>Alfamart Jl. Tun Abdul Razak</strong><em>1,8 km dari kamu · tempat umum</em></span></div><button type="button">Buka Maps</button></div> : <><div className="schedule-fields"><label>Tanggal<input type="date" defaultValue="2026-08-12"/></label><label>Jam<input type="time" defaultValue="16:30"/></label><label className="full">Titik temu<select defaultValue="alfamart"><option value="alfamart">Alfamart Jl. Tun Abdul Razak</option><option value="mall">Mall Panakkukang — Lobby Utama</option></select></label></div><button className="primary-action" type="button" onClick={() => setScheduled(true)}>Usulkan jadwal COD</button></>}
            </section>
          </div>
          <aside className="deal-side">
            <section><p>KONTAK PENJUAL</p><div className="seller-row"><span className="seller-avatar">FA</span><div><strong>Fajar Akbar</strong><small>24 COD selesai · 0 no-show</small></div></div><a href="tel:+6281234567890"><Icon name="phone"/> 0812 3456 7890</a><button type="button"><Icon name="chat"/> Buka chat</button></section>
            <section className="safe-card"><Icon name="shield"/><div><strong>Bayar setelah diperiksa</strong><p>CODkan tidak memproses transfer. Bertemu di tempat umum dan cek kondisi barang.</p></div></section>
            {scheduled && !completed && <button className="complete-button" type="button" onClick={() => setCompleted(true)}>Barang sudah diterima</button>}
          </aside>
        </div>
      </section> : <div className="content" id="top">
        <section className="mobile-intro">
          <p className="eyebrow"><Icon name="pin" size={16}/> Menampilkan barang dalam 10 km</p>
          <h1>Temukan barang<br/><em>dekat kamu.</em></h1>
        </section>

        <div className="mobile-search search-box"><Icon name="search"/><input aria-label="Cari barang" placeholder="Cari barang di sekitar..." value={query} onChange={(e) => setQuery(e.target.value)}/><button type="button" aria-label="Atur pencarian"><Icon name="tune"/></button></div>

        <section className="categories" aria-label="Kategori barang">
          {categories.map((item) => <button key={item} type="button" className={category === item ? "active" : ""} onClick={() => setCategory(item)}>{item}</button>)}
        </section>

        <div className="market-layout">
          <aside className="filter-panel">
            <div><span className="filter-kicker">AREA AKTIF</span><strong>Somba Opu, Gowa</strong><p>Radius penemuan 10 km</p></div>
            <hr/>
            <h2>Filter barang</h2>
            <label>Urutkan<select defaultValue="nearest"><option value="nearest">Jarak terdekat</option><option value="newest">Paling baru</option><option value="low">Harga terendah</option></select></label>
            <label className="check-row"><input type="checkbox" checked={activeFilters.includes("Bisa Ditawar")} onChange={() => toggleFilter("Bisa Ditawar")}/><span>Bisa ditawar</span></label>
            <label className="check-row"><input type="checkbox"/><span>Harga pas</span></label>
            <button className="outline-button" type="button">Atur filter</button>
            <div className="safety-mini"><strong>COD dengan aman</strong><p>Pilih tempat umum, periksa barang, lalu bayar saat bertemu.</p></div>
          </aside>

          <section className="feed">
            <div className="feed-heading">
              <div><p>DEKAT DARI KAMU</p><h2>Barang terbaru di sekitar</h2></div>
              <span>{shown.length} barang</span>
            </div>
            <div className="filter-chips">
              {filters.map((item) => <button key={item} type="button" onClick={() => toggleFilter(item)} className={activeFilters.includes(item) ? "selected" : ""}>{item}{item === "Harga" && <span>⌄</span>}</button>)}
            </div>

            {shown.length ? <div className="listing-grid">
              {shown.map((item) => <article className="listing-card" key={item.id}>
                <div className="image-wrap"><img src={item.image} alt={item.title}/><button type="button" className={favorites.includes(item.id) ? "favorite active" : "favorite"} aria-label={favorites.includes(item.id) ? "Hapus dari favorit" : "Simpan ke favorit"} onClick={() => setFavorites((current) => current.includes(item.id) ? current.filter((id) => id !== item.id) : [...current, item.id])}><Icon name="heart" size={19}/></button>{item.negotiable && <span className="offer-tag">Bisa Ditawar</span>}</div>
                <div className="listing-copy"><strong className="price">{rupiah(item.price)}</strong><h3>{item.title}</h3><p><Icon name="pin" size={14}/>{item.area} <span>·</span> {item.distance}</p><div className="card-foot"><span>{item.condition}</span><button type="button" aria-label={`Buka ${item.title}`} onClick={() => setSelected(item)}><Icon name="chevron" size={18}/></button></div></div>
              </article>)}
            </div> : <div className="empty"><h3>Belum ada barang yang cocok.</h3><p>Coba ganti kata pencarian atau filtermu.</p><button type="button" onClick={() => {setQuery(""); setCategory("Semua"); setActiveFilters(["Terdekat"]);}}>Reset pencarian</button></div>}
          </section>
        </div>
      </div>}

      {selected && <div className="overlay" role="dialog" aria-modal="true" aria-label={`Detail ${selected.title}`}>
        <div className="detail-modal">
          <button className="modal-close" type="button" aria-label="Tutup detail" onClick={() => setSelected(null)}><Icon name="close"/></button>
          <div className="detail-image"><img src={selected.image} alt={selected.title}/><span>1 / 4</span></div>
          <div className="detail-copy">
            <div className="detail-price-row"><div><strong>{rupiah(selected.price)}</strong>{selected.negotiable && <span>Bisa Ditawar</span>}</div><button className={favorites.includes(selected.id) ? "favorite-detail active" : "favorite-detail"} type="button" aria-label="Simpan favorit" onClick={() => setFavorites((current) => current.includes(selected.id) ? current.filter((id) => id !== selected.id) : [...current, selected.id])}><Icon name="heart"/></button></div>
            <h2>{selected.title}</h2><p className="detail-location"><Icon name="pin" size={17}/>{selected.area}, Gowa · sekitar {selected.distance}</p>
            <div className="facts"><div><small>Kondisi</small><strong>{selected.condition}</strong></div><div><small>Diposting</small><strong>2 jam lalu</strong></div><div><small>Radius</small><strong>10 km</strong></div></div>
            <section className="description"><h3>Deskripsi barang</h3><p>Kondisi sangat terawat, semua fungsi normal. Kelengkapan sesuai foto dan bisa dicek sepuasnya saat COD. Tidak melayani transfer atau pengiriman.</p></section>
            <section className="seller-detail"><span className="seller-avatar">FA</span><div><strong>Fajar Akbar <i>✓</i></strong><p>24 COD selesai · 0 no-show</p><small>Bergabung 8 bulan</small></div><button type="button">Lihat profil</button></section>
            <div className="privacy-note"><Icon name="shield"/><div><strong>Lokasi dan kontak tetap privat</strong><p>Kontak penjual terbuka setelah tawaran disepakati.</p></div></div>
            <div className="detail-actions"><button className="chat-button" type="button"><Icon name="chat"/> Chat</button><button className="primary-action" type="button" onClick={() => selected.negotiable ? setOfferOpen(true) : (setDealActive(true), setShowDeal(true), setSelected(null))}>{selected.negotiable ? "Tawar Harga" : "Ajukan COD"}</button></div>
          </div>
        </div>
      </div>}

      {offerOpen && selected && <div className="sheet-overlay" role="dialog" aria-modal="true" aria-label="Tawar harga">
        <div className="offer-sheet"><div className="sheet-handle"/><button className="modal-close" type="button" aria-label="Tutup tawaran" onClick={() => setOfferOpen(false)}><Icon name="close"/></button><p className="sheet-kicker">NEGOSIASI TERSTRUKTUR</p><h2>Tawar harga</h2><p className="seller-price">Harga penjual <strong>{rupiah(selected.price)}</strong></p>
          <div className="attempt-row"><span>Kesempatan tawar</span><div>{[0,1,2].map((i)=><i className={i < attempts ? "used" : ""} key={i}/>)}</div><strong>{3-attempts} tersisa</strong></div>
          {offerMessage && <div className="offer-alert">{offerMessage}</div>}
          <label className="currency-label">Tawaran kamu<div><span>Rp</span><input type="text" inputMode="numeric" value={new Intl.NumberFormat("id-ID").format(Number(offerAmount || 0))} onChange={(e) => setOfferAmount(e.target.value.replace(/\D/g,""))}/></div></label>
          <div className="quick-offers">{[6000000,6300000,6600000].map((value)=><button type="button" key={value} onClick={()=>setOfferAmount(String(value))}>{rupiah(value)}</button>)}</div>
          {attempts === 2 && <p className="last-warning">Ini kesempatan tawar terakhir untuk barang ini.</p>}
          <button className="primary-action send-offer" type="button" onClick={submitOffer}>Kirim Tawaran {attempts + 1}/3</button>
          <p className="sheet-note"><Icon name="shield" size={16}/> Bayar tunai saat bertemu setelah barang diperiksa.</p>
        </div>
      </div>}

      {dealActive && !showDeal && <button className="deal-toast" type="button" onClick={() => setShowDeal(true)}><span>DEAL</span><div><strong>Tawaranmu diterima!</strong><small>Buka Deal Room untuk atur COD</small></div><Icon name="chevron"/></button>}

      <nav className="bottom-nav" aria-label="Navigasi seluler">
        <button className="active" type="button"><Icon name="home"/><span>Beranda</span></button>
        <button type="button"><Icon name="search"/><span>Cari</span></button>
        <button className="sell" type="button"><Icon name="plus"/><span>Jual</span></button>
        <button type="button" onClick={() => dealActive && setShowDeal(true)}><Icon name="bell"/><span>Aktivitas</span>{dealActive && <i/>}</button>
        <button type="button"><Icon name="user"/><span>Profil</span></button>
      </nav>
    </main>
  );
}
