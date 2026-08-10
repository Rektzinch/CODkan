"use client";

import { useMemo, useState } from "react";

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
  };
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}

const rupiah = (value: number) => `Rp${new Intl.NumberFormat("id-ID").format(value)}`;

export default function Home() {
  const [category, setCategory] = useState("Semua");
  const [activeFilters, setActiveFilters] = useState<string[]>(["Terdekat"]);
  const [query, setQuery] = useState("");
  const [favorites, setFavorites] = useState<number[]>([]);

  const shown = useMemo(() => listings.filter((item) => {
    const matchesCategory = category === "Semua" || item.category === category;
    const matchesSearch = item.title.toLowerCase().includes(query.toLowerCase());
    const matchesOffer = !activeFilters.includes("Bisa Ditawar") || item.negotiable;
    return matchesCategory && matchesSearch && matchesOffer;
  }), [category, query, activeFilters]);

  const toggleFilter = (filter: string) => setActiveFilters((current) => current.includes(filter) ? current.filter((item) => item !== filter) : [...current, filter]);

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

      <div className="content" id="top">
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
                <div className="listing-copy"><strong className="price">{rupiah(item.price)}</strong><h3>{item.title}</h3><p><Icon name="pin" size={14}/>{item.area} <span>·</span> {item.distance}</p><div className="card-foot"><span>{item.condition}</span><button type="button" aria-label={`Buka ${item.title}`}><Icon name="chevron" size={18}/></button></div></div>
              </article>)}
            </div> : <div className="empty"><h3>Belum ada barang yang cocok.</h3><p>Coba ganti kata pencarian atau filtermu.</p><button type="button" onClick={() => {setQuery(""); setCategory("Semua"); setActiveFilters(["Terdekat"]);}}>Reset pencarian</button></div>}
          </section>
        </div>
      </div>

      <nav className="bottom-nav" aria-label="Navigasi seluler">
        <button className="active" type="button"><Icon name="home"/><span>Beranda</span></button>
        <button type="button"><Icon name="search"/><span>Cari</span></button>
        <button className="sell" type="button"><Icon name="plus"/><span>Jual</span></button>
        <button type="button"><Icon name="bell"/><span>Aktivitas</span><i/></button>
        <button type="button"><Icon name="user"/><span>Profil</span></button>
      </nav>
    </main>
  );
}
