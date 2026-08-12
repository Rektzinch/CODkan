"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

type Profile = { id:string; display_name:string; phone:string|null; area:string; avatar_url:string|null; completed_deals:number; no_shows:number; created_at:string; onboarded:boolean };
type PublicProfile = Omit<Profile,"phone">;
type Media = { id:string; public_url:string; sort_order:number };
type Listing = { id:string; seller_id:string; title:string; description:string; price:number; category:string; condition:string; negotiable:boolean; area:string; visibility_radius_km:number; status:string; created_at:string; listing_media:Media[]; seller:PublicProfile };
type Offer = { id:string; listing_id:string; buyer_id:string; amount:number; attempt_number:number|null; source:string; status:string; created_at:string; listing:{title:string;price:number}|null; buyer:PublicProfile };
type CodSchedule = { id:string; proposed_by:string; scheduled_at:string; location_name:string; location_address:string; notes:string|null; status:string };
type Deal = { id:string; listing_id:string; buyer_id:string; seller_id:string; final_price:number; status:string; created_at:string; buyer_history_deleted_at:string|null; seller_history_deleted_at:string|null; listing:{title:string;listing_media:Media[]}|null; buyer:PublicProfile; seller:PublicProfile; cod_schedules:CodSchedule|CodSchedule[]|null; deal_confirmations:Array<{user_id:string}> };
type Contact = { deal_id:string; display_name:string; phone:string|null };
type Notification = { id:string; type:string; entity_type:string; entity_id:string; payload:Record<string,unknown>; read_at:string|null; created_at:string };

// Resolved on first property access so the module stays importable during
// prerender, where the public Supabase env vars are not present.
const supabase = new Proxy({} as ReturnType<typeof createClient>, {
  get: (_target, property) => {
    const instance = createClient();
    const value = Reflect.get(instance, property);
    return typeof value === "function" ? value.bind(instance) : value;
  },
});
const categories = ["Elektronik","Komputer","Fashion","Furnitur","Rumah","Hobi","Otomotif","Usaha","Produk Lokal","Lainnya"];
const conditions = ["Baru","Seperti baru","Bekas baik","Bekas"];
const MAX_PHOTO_BYTES = 5*1024*1024;
const formatNumber = (value:string|number) => new Intl.NumberFormat("id-ID",{maximumFractionDigits:0}).format(Number(String(value).replace(/\D/g,""))||0);
const rupiah = (value:number) => `Rp${formatNumber(value)}`;
const dateTime = (value:string) => new Intl.DateTimeFormat("id-ID",{dateStyle:"medium",timeStyle:"short",timeZone:"Asia/Makassar"}).format(new Date(value));
const errorMessages:Record<string,string> = {
  "invalid login credentials":"Email atau kata sandi salah.",
  "user already registered":"Email ini sudah terdaftar. Silakan masuk.",
  "email not confirmed":"Email belum dikonfirmasi. Cek kotak masuk kamu.",
  "password should be at least 6 characters":"Kata sandi minimal 6 karakter.",
  auth_required:"Sesi berakhir. Silakan masuk lagi.",
  own_listing:"Kamu tidak bisa menawar barangmu sendiri.",
  fixed_price:"Penjual menetapkan harga pas untuk barang ini.",
  outside_area:"Barang ini berada di luar area domisilimu.",
  blocked:"Kamu tidak dapat bertransaksi dengan pengguna ini.",
  offer_limit_reached:"Batas tiga tawaran untuk barang ini sudah habis.",
  pending_offer_exists:"Masih ada tawaran yang menunggu jawaban penjual.",
  listing_unavailable:"Barang ini sudah tidak tersedia.",
  offer_not_actionable:"Tawaran ini sudah tidak bisa dijawab.",
  invalid_deal_state:"Status transaksi tidak memungkinkan aksi ini.",
  deal_forbidden:"Kamu bukan peserta transaksi ini.",
  schedule_in_past:"Jadwal COD harus di waktu yang akan datang.",
  schedule_not_actionable:"Jadwal ini sudah tidak bisa disetujui.",
  other_party_must_accept:"Jadwal usulanmu menunggu persetujuan pihak lain.",
  profile_incomplete:"Lengkapi profil dan area domisilimu dulu.",
  deal_already_exists:"Barang ini sudah masuk Deal Room dengan pembeli lain.",
  deal_not_archivable:"Hanya deal selesai atau dibatalkan yang dapat dihapus dari riwayat.",
  invalid_counter:"Nominal tawaran balasan tidak valid.",
  invalid_amount:"Nominal tawaran tidak valid.",
  invalid_action:"Aksi ini tidak berlaku untuk tawaran tersebut.",
  seller_must_propose_first:"Penjual perlu mengirim usulan jadwal COD terlebih dahulu.",
  schedule_awaiting_buyer_response:"Usulan jadwal masih menunggu respons pembeli.",
  invalid_schedule_location:"Nama tempat COD harus terdiri dari 3–160 karakter.",
  invalid_schedule_address:"Alamat titik temu harus terdiri dari 3–300 karakter.",
  invalid_schedule_notes:"Catatan pertemuan terlalu panjang.",
  "violates foreign key constraint":"Profil salah satu pihak belum lengkap. Minta pihak lain melengkapi profilnya.",
};
function friendlyError(value:string){
  const key=value.toLowerCase().trim();
  for(const [needle,text] of Object.entries(errorMessages)) if(key.includes(needle)) return text;
  return value;
}
const notificationLabels:Record<string,string> = {
  "offer.created":"Tawaran baru masuk",
  "offer.rejected":"Tawaran ditolak",
  "offer.countered":"Ada tawaran balasan",
  "deal.created":"Deal Room telah dibuat",
  "cod.schedule.proposed":"Usulan jadwal COD baru",
  "cod.schedule.countered":"Usulan jadwal alternatif",
  "cod.schedule.accepted":"Jadwal COD disetujui",
  "cod.schedule.rejected":"Usulan jadwal ditolak",
  "deal.cancelled":"Deal dibatalkan",
  "deal.confirmation":"Konfirmasi COD dari pihak lain",
  "deal.completed":"COD telah selesai",
};

function Icon({name,size=20}:{name:string;size?:number}) {
  const paths:Record<string,React.ReactNode>={home:<><path d="m3 11 9-8 9 8"/><path d="M5 10v10h14V10M9 20v-6h6v6"/></>,search:<><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></>,pin:<><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></>,plus:<><circle cx="12" cy="12" r="9"/><path d="M8 12h8M12 8v8"/></>,bell:<><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></>,user:<><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></>,mail:<><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></>,phone:<><rect x="6" y="3" width="12" height="18" rx="2"/><path d="M10 18h4"/></>,lock:<><rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></>,eye:<><path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z"/><circle cx="12" cy="12" r="2.5"/></>,eyeoff:<><path d="m3 3 18 18"/><path d="M10.6 6.2A10.5 10.5 0 0 1 12 6c6 0 9.5 6 9.5 6a17.4 17.4 0 0 1-3 3.7M6.3 6.3A17.6 17.6 0 0 0 2.5 12S6 18 12 18c1.4 0 2.6-.3 3.7-.8"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/></>,close:<><path d="m6 6 12 12M18 6 6 18"/></>,shield:<><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/></>,handshake:<><path d="m8 13-2 2a2.4 2.4 0 0 1-3.4-3.4l4.1-4.1a3 3 0 0 1 3.5-.55l1.1.55 1.8-1.8a3 3 0 0 1 4.25 0l4.05 4.05a2.4 2.4 0 0 1-3.4 3.4l-2-2"/><path d="m8 13 4.2 4.2a2.15 2.15 0 0 0 3.04-3.04l-.15-.15a2.15 2.15 0 0 0 3.04-3.04l-2.9-2.9-2.3 2.3a2.2 2.2 0 0 1-3.1 0L8.2 8.75"/></>,box:<><path d="m3 7 9-4 9 4-9 4-9-4Z"/><path d="M3 7v10l9 4 9-4V7M12 11v10"/></>,check:<path d="m5 12 4 4L19 6"/>,logout:<><path d="M10 17l5-5-5-5M15 12H3"/><path d="M14 3h7v18h-7"/></>,down:<path d="m7 10 5 5 5-5"/>,upload:<><path d="M12 16V4m0 0L7 9m5-5 5 5"/><path d="M5 15v5h14v-5"/></>};
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}

function CustomSelect({name,options,defaultValue}:{name:string;options:Array<{value:string;label:string}>;defaultValue:string}){
  const [value,setValue]=useState(defaultValue); const [open,setOpen]=useState(false); const current=options.find(option=>option.value===value)?.label||value;
  return <div className={`custom-select ${open?"open":""}`} onBlur={event=>{if(!event.currentTarget.contains(event.relatedTarget))setOpen(false)}}><input type="hidden" name={name} value={value}/><button type="button" aria-haspopup="listbox" aria-expanded={open} onClick={()=>setOpen(!open)}><span>{current}</span><Icon name="down" size={17}/></button>{open&&<div className="select-menu" role="listbox">{options.map(option=><button type="button" role="option" aria-selected={value===option.value} className={value===option.value?"selected":""} key={option.value} onClick={()=>{setValue(option.value);setOpen(false)}}>{option.label}{value===option.value&&<Icon name="check" size={16}/>}</button>)}</div>}</div>;
}

function FilePicker(){const [name,setName]=useState("");return <label className="file-picker"><span>Foto barang</span><input name="photo" type="file" accept="image/jpeg,image/png,image/webp" required onChange={event=>setName(event.target.files?.[0]?.name||"")}/><span className="file-control"><span className="file-icon"><Icon name="upload"/></span><span><strong>{name||"Pilih foto barang"}</strong><small>{name?"Klik untuk mengganti foto":"JPG, PNG, atau WebP · maksimal 5 MB"}</small></span></span></label>}

function ToggleField({name,label}:{name:string;label:string}){const [enabled,setEnabled]=useState(true);return <div className="toggle-field"><input type="hidden" name={name} value={enabled?"on":""}/><button type="button" role="switch" aria-checked={enabled} className={enabled?"on":""} onClick={()=>setEnabled(!enabled)}><i/></button><span>{label}</span></div>}

function CurrencyInput({name,placeholder="Contoh: 10.000"}:{name:string;placeholder?:string}){const [digits,setDigits]=useState("");return <div className="currency-input"><span>Rp</span><input name={name} value={digits?formatNumber(digits):""} onChange={event=>setDigits(event.target.value.replace(/\D/g,"").slice(0,14))} inputMode="numeric" placeholder={placeholder} required/></div>}

function AuthScreen({busy,error,notice,onSubmit,onClear}:{busy:boolean;error:string;notice:string;onSubmit:(mode:"signin"|"signup",email:string,password:string,name?:string,phone?:string)=>void;onClear:()=>void}){
  const [mode,setMode]=useState<"signin"|"signup">("signin"); const [showPassword,setShowPassword]=useState(false); const [showConfirmation,setShowConfirmation]=useState(false); const [formError,setFormError]=useState("");
  const toggleMode=()=>{setMode(current=>current==="signin"?"signup":"signin");setFormError("");onClear()};
  return <main className="auth-page"><aside className="auth-brand"><img className="auth-wordmark" src="/brand/codkan-lockup.png" alt="CODkan — Ketemu, Tawar, Deal, COD"/><img className="auth-mascot" src="/brand/si-cod-paket.png" alt="Si COD membawa paket"/><h1>{mode==="signin"?<>Ketemu.<br/>Tawar.<br/><em>Deal.</em></>:<>Daftar.<br/>Jual.<br/><em>COD.</em></>}</h1><p>{mode==="signin"?"Masuk untuk menawar dengan aman dan melanjutkan Deal Room-mu.":"Buat akun untuk menjual, menawar, dan bertemu di tempat umum."}</p><div><Icon name="shield" size={22}/><span><strong>Kontak tetap privat</strong><small>Nomor telepon hanya terbuka setelah deal disepakati.</small></span></div></aside><form className="auth-card auth-card--full" onSubmit={event=>{event.preventDefault();const form=new FormData(event.currentTarget);const email=String(form.get("email")).trim();const password=String(form.get("password"));const name=String(form.get("name")).trim();const phone=String(form.get("phone")).trim();if(mode==="signup"){if(password!==String(form.get("confirmation"))){setFormError("Konfirmasi kata sandi belum sama.");return}if(!form.get("terms")){setFormError("Setujui ketentuan penggunaan untuk melanjutkan.");return}}setFormError("");onSubmit(mode,email,password,name,phone);}}>
    <p>{mode==="signin"?"MASUK KE AKUN":"BUAT AKUN BARU"}</p><h2>{mode==="signin"?"Selamat datang kembali":"Daftar cepat dan aman"}</h2>
    {mode==="signup"&&<label>Nama lengkap<input name="name" placeholder="Nama lengkap" autoComplete="name" minLength={2} maxLength={60} required/></label>}
    <label>Email<input name="email" type="email" placeholder="Email" autoComplete="email" required/></label>
    {mode==="signup"&&<label>Nomor HP <small>(opsional)</small><input name="phone" type="tel" placeholder="Nomor HP" autoComplete="tel" maxLength={24}/></label>}
    <label>Kata sandi<span className="password-field"><input name="password" type={showPassword?"text":"password"} placeholder="Kata sandi" autoComplete={mode==="signin"?"current-password":"new-password"} minLength={8} required/><button type="button" aria-label={showPassword?"Sembunyikan kata sandi":"Tampilkan kata sandi"} onClick={()=>setShowPassword(value=>!value)}><Icon name={showPassword?"eyeoff":"eye"} size={18}/></button></span></label>
    {mode==="signup"&&<><label>Konfirmasi kata sandi<span className="password-field"><input name="confirmation" type={showConfirmation?"text":"password"} placeholder="Ulangi kata sandi" autoComplete="new-password" minLength={8} required/><button type="button" aria-label={showConfirmation?"Sembunyikan konfirmasi kata sandi":"Tampilkan konfirmasi kata sandi"} onClick={()=>setShowConfirmation(value=>!value)}><Icon name={showConfirmation?"eyeoff":"eye"} size={18}/></button></span></label><small className="auth-password-note">Minimal 8 karakter. Gunakan kombinasi yang sulit ditebak.</small><label className="auth-terms"><input name="terms" type="checkbox" required/><span>Saya menyetujui ketentuan penggunaan CODkan.</span></label></>}
    {(formError||error)&&<div className="alert error" role="alert">{formError||error}</div>}{notice&&<div className="alert success" role="status">{notice}</div>}<button className="primary" disabled={busy}>{busy?"Memproses…":mode==="signin"?"Masuk ke CODkan":"Buat akun"}</button><button type="button" className="text-button" onClick={toggleMode}>{mode==="signin"?"Belum punya akun? Daftar sekarang":"Sudah punya akun? Masuk sekarang"}</button>
  </form></main>;
}

export default function Home(){
  const [user,setUser]=useState<User|null>(null); const [profile,setProfile]=useState<Profile|null>(null);
  const [loading,setLoading]=useState(true); const [message,setMessage]=useState(""); const [error,setError]=useState("");
  const [listings,setListings]=useState<Listing[]>([]); const [offers,setOffers]=useState<Offer[]>([]); const [myOffers,setMyOffers]=useState<Offer[]>([]); const [deals,setDeals]=useState<Deal[]>([]); const [contacts,setContacts]=useState<Contact[]>([]); const [notifications,setNotifications]=useState<Notification[]>([]);
  const [tab,setTab]=useState<"home"|"sell"|"activity"|"profile">("home"); const [query,setQuery]=useState(""); const [category,setCategory]=useState("Semua"); const [notificationOpen,setNotificationOpen]=useState(false);
  const [selected,setSelected]=useState<Listing|null>(null); const [offerAmount,setOfferAmount]=useState(""); const [submitting,setSubmitting]=useState(false); const [realtimeRetry,setRealtimeRetry]=useState(0);

  const loadData=useCallback(async(currentUser:User,currentProfile:Profile)=>{
    const offerColumns="id,listing_id,buyer_id,amount,attempt_number,source,status,created_at,listing:listings!offers_listing_id_fkey(title,price),buyer:profiles!offers_buyer_id_fkey(id,display_name,area,avatar_url,completed_deals,no_shows,created_at)";
    const [listingResult,offerResult,myOfferResult,dealResult,contactResult,notificationResult]=await Promise.all([
      supabase.from("listings").select("*,listing_media(*),seller:profiles!listings_seller_id_fkey(id,display_name,area,avatar_url,completed_deals,no_shows,created_at)").eq("status","active").order("created_at",{ascending:false}),
      supabase.from("offers").select(offerColumns).eq("seller_id",currentUser.id).eq("source","buyer").eq("status","pending").order("created_at",{ascending:false}),
      supabase.from("offers").select(offerColumns).eq("buyer_id",currentUser.id).in("status",["pending","countered"]).order("created_at",{ascending:false}),
      supabase.from("deals").select("id,listing_id,buyer_id,seller_id,final_price,status,created_at,buyer_history_deleted_at,seller_history_deleted_at,listing:listings!deals_listing_id_fkey(title,listing_media(*)),buyer:profiles!deals_buyer_id_fkey(id,display_name,area,avatar_url,completed_deals,no_shows,created_at),seller:profiles!deals_seller_id_fkey(id,display_name,area,avatar_url,completed_deals,no_shows,created_at),cod_schedules(*),deal_confirmations(user_id)").or(`buyer_id.eq.${currentUser.id},seller_id.eq.${currentUser.id}`).order("created_at",{ascending:false}),
      supabase.rpc("my_deal_contacts"),
      supabase.rpc("my_notifications",{p_limit:30})
    ]);
    if(listingResult.error) setError(friendlyError(listingResult.error.message)); else setListings((listingResult.data||[]) as unknown as Listing[]);
    if(!offerResult.error) setOffers((offerResult.data||[]) as unknown as Offer[]);
    if(!myOfferResult.error) setMyOffers((myOfferResult.data||[]) as unknown as Offer[]);
    if(!dealResult.error) setDeals((dealResult.data||[]) as unknown as Deal[]);
    if(!contactResult.error) setContacts((contactResult.data||[]) as unknown as Contact[]);
    if(!notificationResult.error) setNotifications((notificationResult.data||[]) as unknown as Notification[]);
    setProfile(currentProfile);
  },[]);

  const bootstrap=useCallback(async()=>{
    setLoading(true);
    const {data:{user:currentUser}}=await supabase.auth.getUser();
    setUser(currentUser);
    if(!currentUser){setProfile(null);setListings([]);setOffers([]);setMyOffers([]);setDeals([]);setContacts([]);setNotifications([]);setNotificationOpen(false);setLoading(false);return}
    const {data,error:profileError}=await supabase.rpc("my_profile").maybeSingle();
    if(profileError)setError(friendlyError(profileError.message));
    else if(data&&(data as Profile).onboarded){await loadData(currentUser,data as Profile)}
    else setProfile(null);
    setLoading(false);
  },[loadData]);

  useEffect(()=>{const timer=setTimeout(()=>void bootstrap(),0); const {data}=supabase.auth.onAuthStateChange(event=>{if(event==="SIGNED_IN"||event==="SIGNED_OUT")void bootstrap()}); return()=>{clearTimeout(timer);data.subscription.unsubscribe()};},[bootstrap]);
  useEffect(()=>{
    if(!user||!profile)return;
    let active=true; let retryTimer:number|undefined;
    const refresh=()=>{void loadData(user,profile)};
    const recover=()=>{if(retryTimer||!active)return;retryTimer=window.setTimeout(()=>{if(active)setRealtimeRetry(value=>value+1)},1000)};
    const onVisibilityChange=()=>{if(document.visibilityState==="visible")refresh()};
    const channel=supabase.channel(`codkan-${user.id}`)
      .on("postgres_changes",{event:"*",schema:"public",table:"offers"},refresh)
      .on("postgres_changes",{event:"*",schema:"public",table:"deals"},refresh)
      .on("postgres_changes",{event:"*",schema:"public",table:"cod_schedules"},refresh)
      .on("postgres_changes",{event:"*",schema:"public",table:"deal_confirmations"},refresh)
      .on("postgres_changes",{event:"*",schema:"public",table:"notifications"},refresh)
      .subscribe(status=>{if(status==="SUBSCRIBED")refresh();else if(status==="CHANNEL_ERROR"||status==="TIMED_OUT"||status==="CLOSED")recover()});
    document.addEventListener("visibilitychange",onVisibilityChange);
    return()=>{active=false;if(retryTimer)window.clearTimeout(retryTimer);document.removeEventListener("visibilitychange",onVisibilityChange);void supabase.removeChannel(channel)};
  },[user,profile,loadData,realtimeRetry]);

  const visible=useMemo(()=>{const needle=query.trim().toLowerCase();return listings.filter(l=>(category==="Semua"||l.category===category)&&(!needle||`${l.title} ${l.description}`.toLowerCase().includes(needle)))},[listings,category,query]);
  const unreadNotifications=useMemo(()=>notifications.filter(notification=>!notification.read_at).length,[notifications]);
  const visibleHistoryDeals=useMemo(()=>deals.filter(deal=>(deal.status==="completed"||deal.status==="cancelled")&&(deal.buyer_id===user?.id?!deal.buyer_history_deleted_at:!deal.seller_history_deleted_at)),[deals,user?.id]);
  const clear=useCallback(()=>{setError("");setMessage("")},[]);
  const fail=(value:string)=>setError(friendlyError(value));

  async function authenticate(mode:"signin"|"signup",email:string,password:string,name="",phone=""){
    clear();setSubmitting(true);
    const result=mode==="signin"
      ? await supabase.auth.signInWithPassword({email,password})
      : await supabase.auth.signUp({email,password,options:{data:{display_name:name,phone:phone||null}}});
    setSubmitting(false);
    if(result.error){fail(result.error.message);return}
    if(mode==="signup"&&!result.data.session){setMessage("Akun dibuat. Cek email untuk konfirmasi, lalu masuk.");return}
    await bootstrap();
  }
  async function signOut(){setSubmitting(true);await supabase.auth.signOut();setSubmitting(false);setTab("home");await bootstrap()}

  async function saveProfile(e:FormEvent<HTMLFormElement>){e.preventDefault();if(!user)return;clear();setSubmitting(true);const form=new FormData(e.currentTarget);const phone=String(form.get("phone")).trim();const payload={display_name:String(form.get("name")).trim(),phone:phone||null,area:String(form.get("area")).trim()};const {error:err}=await supabase.from("profiles").update(payload).eq("id",user.id);if(err){setSubmitting(false);fail(err.message);return}const {data,error:readError}=await supabase.rpc("my_profile").maybeSingle();setSubmitting(false);if(readError||!data){fail(readError?.message||"Profil tidak dapat dibaca.");return}await loadData(user,data as Profile);}
  async function createListing(e:FormEvent<HTMLFormElement>){e.preventDefault();if(!user||!profile)return;clear();const form=new FormData(e.currentTarget);const file=form.get("photo") as File;
    if(!file||file.size===0){fail("Pilih foto barang terlebih dahulu.");return}
    if(file.size>MAX_PHOTO_BYTES){fail("Ukuran foto melebihi 5 MB.");return}
    const price=Number(String(form.get("price")).replace(/\D/g,""));
    if(!price){fail("Harga barang harus lebih dari nol.");return}
    setSubmitting(true);const id=crypto.randomUUID();
    const payload={id,seller_id:user.id,title:String(form.get("title")).trim(),description:String(form.get("description")).trim(),price,category:String(form.get("category")),condition:String(form.get("condition")),negotiable:form.get("negotiable")==="on",area:profile.area,visibility_radius_km:Number(form.get("radius")),status:"draft"};
    const created=await supabase.from("listings").insert(payload);if(created.error){setSubmitting(false);fail(created.error.message);return}
    const safeName=file.name.toLowerCase().replace(/[^a-z0-9.]+/g,"-");const path=`${user.id}/${id}/${Date.now()}-${safeName}`;const uploaded=await supabase.storage.from("listing-media").upload(path,file,{contentType:file.type,upsert:false});
    if(uploaded.error){await supabase.from("listings").delete().eq("id",id);setSubmitting(false);fail(uploaded.error.message);return}
    const publicUrl=supabase.storage.from("listing-media").getPublicUrl(path).data.publicUrl;const media=await supabase.from("listing_media").insert({listing_id:id,storage_path:path,public_url:publicUrl});
    if(media.error){await supabase.storage.from("listing-media").remove([path]);await supabase.from("listings").delete().eq("id",id);setSubmitting(false);fail(media.error.message);return}
    const activated=await supabase.from("listings").update({status:"active"}).eq("id",id);setSubmitting(false);
    if(activated.error){fail(activated.error.message);return}
    setMessage("Barang berhasil dipasang.");setTab("home");await loadData(user,profile);}
  async function submitOffer(){if(!selected||!offerAmount)return;const amount=Number(offerAmount.replace(/\D/g,""));if(!amount){fail("Nominal tawaran tidak valid.");return}await sendOffer(selected.id,amount);setOfferAmount("")}
  async function buyAtAskingPrice(listing:Listing){await sendOffer(listing.id,listing.price)}
  async function sendOffer(listingId:string,amount:number){clear();setSubmitting(true);const {error:err}=await supabase.rpc("submit_offer",{p_listing_id:listingId,p_amount:amount});setSubmitting(false);if(err){fail(err.message);return}setMessage("Tawaran terkirim ke penjual.");setSelected(null);if(user&&profile)await loadData(user,profile)}
  async function respond(offerId:string,action:"accept"|"reject"|"counter",counterAmount:number|null=null){clear();setSubmitting(true);const {error:err}=await supabase.rpc("respond_offer",{p_offer_id:offerId,p_action:action,p_counter_amount:counterAmount});setSubmitting(false);if(err)fail(err.message);else{setMessage(action==="accept"?"Tawaran diterima. Deal Room dibuat.":action==="counter"?"Tawaran balasan terkirim.":"Tawaran ditolak.");if(user&&profile)await loadData(user,profile)}}
  async function proposeSchedule(e:FormEvent<HTMLFormElement>,dealId:string){e.preventDefault();clear();const formElement=e.currentTarget;const form=new FormData(formElement);const date=String(form.get("scheduled_date")).replace(/\D/g,"");const time=String(form.get("scheduled_time")).replace(/\D/g,"");if(date.length!==8||time.length!==4){fail("Isi tanggal DDMMYYYY dan waktu HHMM.");return}const day=Number(date.slice(0,2));const month=Number(date.slice(2,4));const year=Number(date.slice(4));const hour=Number(time.slice(0,2));const minute=Number(time.slice(2));const lastDay=month>=1&&month<=12?new Date(year,month,0).getDate():0;if(!lastDay||day<1||day>lastDay||hour>23||minute>59){fail("Tanggal atau waktu tidak valid.");return}const scheduled=new Date(`${year}-${String(month).padStart(2,"0")}-${String(day).padStart(2,"0")}T${String(hour).padStart(2,"0")}:${String(minute).padStart(2,"0")}:00+08:00`);if(scheduled.getTime()<=Date.now()){fail("Jadwal COD harus di waktu yang akan datang.");return}setSubmitting(true);const {error:err}=await supabase.rpc("propose_cod_schedule",{p_deal_id:dealId,p_scheduled_at:scheduled.toISOString(),p_location_name:String(form.get("location_name")).trim(),p_location_address:String(form.get("location_address")).trim(),p_notes:String(form.get("notes")).trim()||null});setSubmitting(false);if(err)fail(err.message);else{formElement.reset();setMessage("Usulan jadwal terkirim.");if(user&&profile)await loadData(user,profile)}}
  async function acceptSchedule(dealId:string){clear();setSubmitting(true);const {error:err}=await supabase.rpc("accept_cod_schedule",{p_deal_id:dealId});setSubmitting(false);if(err)fail(err.message);else{setMessage("Jadwal COD disetujui.");if(user&&profile)await loadData(user,profile)}}
  async function rejectSchedule(dealId:string){if(!window.confirm("Tolak usulan jadwal COD ini? Penjual dapat mengirim usulan baru setelahnya."))return;clear();setSubmitting(true);const {error:err}=await supabase.rpc("reject_cod_schedule",{p_deal_id:dealId});setSubmitting(false);if(err)fail(err.message);else{setMessage("Usulan jadwal ditolak. Menunggu usulan penjual berikutnya.");if(user&&profile)await loadData(user,profile)}}
  async function openNotifications(){clear();setNotificationOpen(true);if(!unreadNotifications)return;setNotifications(current=>current.map(notification=>notification.read_at?notification:{...notification,read_at:new Date().toISOString()}));const {error:err}=await supabase.rpc("mark_all_notifications_read");if(err){fail(err.message);return}if(user&&profile)await loadData(user,profile)}
  async function confirmDeal(dealId:string){clear();setSubmitting(true);const {data,error:err}=await supabase.rpc("confirm_deal_completion",{p_deal_id:dealId});setSubmitting(false);if(err)fail(err.message);else{setMessage(data==="completed"?"COD selesai dan reputasi diperbarui.":"Konfirmasi tersimpan. Menunggu pihak lain.");if(user&&profile)await loadData(user,profile)}}
  async function cancelDeal(dealId:string){if(!window.confirm("Batalkan transaksi ini? Membatalkan jadwal yang sudah disepakati akan menambah catatan no-show."))return;clear();setSubmitting(true);const {error:err}=await supabase.rpc("cancel_deal",{p_deal_id:dealId,p_reason:null});setSubmitting(false);if(err)fail(err.message);else{setMessage("Transaksi dibatalkan.");if(user&&profile)await loadData(user,profile)}}
  async function dismissDealHistory(dealId:string){if(!window.confirm("Hapus deal ini dari riwayatmu? Catatan transaksi tetap aman untuk pihak lain."))return;clear();setSubmitting(true);const {error:err}=await supabase.rpc("dismiss_deal_history",{p_deal_id:dealId});setSubmitting(false);if(err)fail(err.message);else{setMessage("Deal dihapus dari riwayatmu.");if(user&&profile)await loadData(user,profile)}}

  if(loading)return <main className="app-splash" aria-busy="true" aria-label="Memuat CODkan"><div className="app-splash__brand"><img src="/brand/codkan-lockup.png" alt="CODkan — Ketemu, Tawar, Deal, COD"/></div><img className="app-splash__mascot" src="/brand/si-cod-paket.png" alt=""/><p>Menyiapkan CODkan…</p></main>;
  if(!user)return <AuthScreen busy={submitting} error={error} notice={message} onSubmit={authenticate} onClear={clear}/>;
  if(!profile)return <main className="onboarding"><form onSubmit={saveProfile}><img className="onboarding-brand" src="/brand/codkan-lockup.png" alt="CODkan — Ketemu, Tawar, Deal, COD"/><p>LENGKAPI PROFIL</p><h1>Atur pasar lokalmu</h1><span>Area menentukan barang yang bisa kamu lihat dan tawar. Nomor telepon hanya terbuka setelah deal disepakati.</span><label>Nama tampilan<input name="name" minLength={2} maxLength={60} required/></label><label>Nomor telepon <small>(terbuka hanya setelah deal)</small><input name="phone" type="tel"/></label><label>Area domisili<input name="area" placeholder="Contoh: Somba Opu, Gowa" minLength={2} maxLength={120} required/></label>{error&&<div className="alert error">{error}</div>}<button className="primary" disabled={submitting}>{submitting?"Menyimpan…":"Simpan dan mulai"}</button><button type="button" className="text-button" onClick={signOut}>Keluar</button></form></main>;

  return <main className="app">
    <header><div className="header-inner"><button className="brand plain" aria-label="Beranda CODkan" onClick={()=>{clear();setTab("home")}}><img src="/brand/codkan-lockup.png" alt="CODkan — Ketemu, Tawar, Deal, COD"/></button><button className="area"><Icon name="pin"/><span><small>Area aktif</small><strong>{profile.area}</strong></span></button><div className="header-search"><Icon name="search"/><input aria-label="Cari barang" placeholder="Cari barang di sekitar…" value={query} onChange={e=>setQuery(e.target.value)}/></div><nav><button onClick={()=>{clear();setTab("sell")}}><Icon name="plus"/>Jual Barang</button><button aria-label="Notifikasi dan aktivitas" onClick={()=>{setTab("activity");void openNotifications()}}><Icon name="bell"/>{unreadNotifications>0&&<i>{unreadNotifications>9?"9+":unreadNotifications}</i>}</button><button onClick={()=>{clear();setTab("profile")}} className="avatar">{profile.display_name.slice(0,2).toUpperCase()}</button></nav></div></header>
    {notificationOpen&&<section className="notification-panel" role="dialog" aria-label="Notifikasi"><div className="notification-title"><div><p>NOTIFIKASI</p><h2>Pembaruan terbaru</h2></div><button aria-label="Tutup notifikasi" onClick={()=>setNotificationOpen(false)}><Icon name="close" size={17}/></button></div>{notifications.length===0?<div className="notification-empty">Belum ada notifikasi.</div>:<div className="notification-list">{notifications.map(notification=><article key={notification.id} className={notification.read_at?"":"unread"}><strong>{notificationLabels[notification.type]||"Pembaruan CODkan"}</strong><small>{dateTime(notification.created_at)}</small></article>)}</div>}</section>}
    {(error||message)&&<div className={`toast ${error?"bad":"good"}`}><span>{error||message}</span><button onClick={clear}><Icon name="close" size={17}/></button></div>}
    {tab==="home"&&<section className="page home-page"><div className="mobile-title"><p><Icon name="pin" size={15}/> {profile.area}</p><h1>Barang nyata<br/><em>dekat kamu.</em></h1></div><div className="mobile-search"><Icon name="search"/><input placeholder="Cari barang di CODkan…" value={query} onChange={e=>setQuery(e.target.value)}/></div><div className="chips"><button className={category==="Semua"?"active":""} onClick={()=>setCategory("Semua")}>Semua</button>{categories.map(c=><button className={category===c?"active":""} onClick={()=>setCategory(c)} key={c}>{c}</button>)}</div><section className="home-promo" aria-label="Mulai jual beli COD"><div><p>AMAN, LOKAL, COD KAN!</p><h2>Tawar dulu,<br/>Deal di dunia nyata.</h2><button onClick={()=>{clear();setTab("sell")}}>Mulai sekarang <span>→</span></button></div><img src="/brand/si-cod-paket.png" alt="Si COD siap membantu transaksi"/></section><div className="heading"><div><p>BARU DITAMBAHKAN</p><h1>Barang dekat kamu</h1></div><button className="view-all" onClick={()=>setCategory("Semua")}>Lihat semua <span>›</span></button></div>{visible.length===0?<div className="empty"><img src="/brand/sticker-siap-cod.jpg" alt="Si COD siap COD"/><h2>Belum ada barang di area ini</h2><p>Jadilah yang pertama memasang barang untuk pembeli di {profile.area}.</p><button className="primary" onClick={()=>setTab("sell")}>Pasang barang pertama</button></div>:<div className="grid">{visible.map(item=><article key={item.id} onClick={()=>setSelected(item)}><div className="photo">{item.listing_media[0]?<img src={item.listing_media[0].public_url} alt={item.title}/>:<span>Foto tidak tersedia</span>}{item.negotiable&&<b>Bisa ditawar</b>}</div><div className="card-copy"><strong>{rupiah(item.price)}</strong><h2>{item.title}</h2><p><Icon name="pin" size={14}/>{item.area}</p><small>{item.condition} · {dateTime(item.created_at)}</small></div></article>)}</div>}</section>}
    {tab==="sell"&&<section className="page narrow"><div className="heading heading-with-sticker"><div><p>JUAL BARANG</p><h1>Pasang barang baru</h1></div><img src="/brand/sticker-siap-cod.jpg" alt="Si COD siap membantu"/></div><form className="panel form" onSubmit={createListing}><FilePicker/><label>Judul<input name="title" minLength={5} maxLength={120} required/></label><label>Deskripsi<textarea name="description" minLength={10} maxLength={4000} rows={5} required/></label><div className="two"><label>Harga<CurrencyInput name="price"/></label><label>Radius penemuan<CustomSelect name="radius" defaultValue="10" options={[{value:"5",label:"5 km"},{value:"10",label:"10 km"},{value:"25",label:"25 km"},{value:"50",label:"50 km"}]}/></label></div><div className="two"><label>Kategori<CustomSelect name="category" defaultValue={categories[0]} options={categories.map(value=>({value,label:value}))}/></label><label>Kondisi<CustomSelect name="condition" defaultValue={conditions[0]} options={conditions.map(value=>({value,label:value}))}/></label></div><ToggleField name="negotiable" label="Harga bisa ditawar maksimal tiga kali"/><div className="safety"><Icon name="shield"/><span><strong>Pembayaran wajib COD</strong><small>Kontak dan lokasi presisi tidak ditampilkan sebelum deal.</small></span></div><button className="primary" disabled={submitting}>{submitting?"Memasang…":"Pasang barang"}</button></form></section>}
    {tab==="activity"&&<section className="page"><div className="heading heading-with-sticker"><div><p>AKTIVITAS</p><h1>Tawaran dan Deal Room</h1></div><img src="/brand/sticker-deal.jpg" alt="Si COD menyambut deal"/></div><div className="activity-layout"><section><h2>Tawaran masuk <span>{offers.length}</span></h2>{offers.length===0?<div className="mini-empty">Belum ada tawaran yang menunggu jawaban.</div>:offers.map(o=><IncomingOffer key={o.id} offer={o} busy={submitting} onRespond={respond}/>)}<h2 className="section-gap">Tawaranmu <span>{myOffers.length}</span></h2>{myOffers.length===0?<div className="mini-empty">Tawaran yang kamu kirim akan muncul di sini.</div>:myOffers.map(o=><MyOffer key={o.id} offer={o} busy={submitting} onRespond={respond}/>)}</section><section><h2>Deal aktif <span>{deals.filter(d=>d.status!=="completed"&&d.status!=="cancelled").length}</span></h2>{deals.filter(d=>d.status!=="completed"&&d.status!=="cancelled").length===0?<div className="mini-empty">Deal Room dibuat otomatis setelah tawaran diterima.</div>:deals.filter(d=>d.status!=="completed"&&d.status!=="cancelled").map(d=><DealRoom key={d.id} deal={d} userId={user.id} busy={submitting} contact={contacts.find(c=>c.deal_id===d.id)} onPropose={proposeSchedule} onAccept={acceptSchedule} onReject={rejectSchedule} onConfirm={confirmDeal} onCancel={cancelDeal} onDismiss={dismissDealHistory}/>)}<h2 className="section-gap">Riwayat Deal</h2>{visibleHistoryDeals.length===0?<div className="mini-empty">Belum ada riwayat deal selesai atau batal.</div>:visibleHistoryDeals.map(d=><DealRoom key={d.id} deal={d} userId={user.id} busy={submitting} contact={contacts.find(c=>c.deal_id===d.id)} onPropose={proposeSchedule} onAccept={acceptSchedule} onReject={rejectSchedule} onConfirm={confirmDeal} onCancel={cancelDeal} onDismiss={dismissDealHistory}/>)}</section></div></section>}
    {tab==="profile"&&<section className="page narrow"><div className="heading"><div><p>PROFIL</p><h1>{profile.display_name}</h1></div></div><div className="panel profile"><div className="profile-avatar">{profile.display_name.slice(0,2).toUpperCase()}</div><div><strong>{profile.area}</strong><p>{profile.completed_deals} COD selesai · {profile.no_shows} no-show</p><small>Bergabung {new Intl.DateTimeFormat("id-ID",{month:"long",year:"numeric"}).format(new Date(profile.created_at))}</small></div><button onClick={signOut} disabled={submitting}><Icon name="logout" size={17}/>Keluar</button></div></section>}
    {selected&&<div className="overlay" role="dialog" aria-modal="true" aria-label={selected.title}><section className="detail"><button className="close" onClick={()=>setSelected(null)}><Icon name="close"/></button><div className="detail-photo">{selected.listing_media[0]&&<img src={selected.listing_media[0].public_url} alt={selected.title}/>}</div><div className="detail-body"><div className="price-line"><strong>{rupiah(selected.price)}</strong>{selected.negotiable&&<span>Bisa Ditawar</span>}</div><h1>{selected.title}</h1><p className="location"><Icon name="pin" size={16}/>{selected.area}</p><div className="facts"><span><small>Kondisi</small><strong>{selected.condition}</strong></span><span><small>Radius</small><strong>{selected.visibility_radius_km} km</strong></span><span><small>Dipasang</small><strong>{dateTime(selected.created_at)}</strong></span></div><h3>Deskripsi</h3><p className="description">{selected.description}</p><div className="seller"><div className="avatar">{selected.seller.display_name.slice(0,2).toUpperCase()}</div><span><strong>{selected.seller.display_name}</strong><small>{selected.seller.completed_deals} COD selesai · {selected.seller.no_shows} no-show</small></span></div><div className="safety"><Icon name="shield"/><span><strong>Kontak tetap privat sebelum deal</strong><small>Bayar saat bertemu setelah barang diperiksa.</small></span></div>{selected.seller_id!==user.id&&(selected.negotiable?<div className="offer-box"><label>Nominal tawaran<div className="currency-input"><span>Rp</span><input value={offerAmount?formatNumber(offerAmount):""} onChange={e=>setOfferAmount(e.target.value.replace(/\D/g,"").slice(0,14))} inputMode="numeric" placeholder="Contoh: 10.000"/></div></label><button className="primary" disabled={submitting||!offerAmount} onClick={submitOffer}>Kirim tawaran</button><small>Maksimal tiga tawaran untuk listing ini.</small></div>:<div className="offer-box"><button className="primary" disabled={submitting} onClick={()=>buyAtAskingPrice(selected)}>Ambil di harga {rupiah(selected.price)}</button><small>Penjual menetapkan harga pas untuk barang ini.</small></div>)}</div></section></div>}
    <nav className="bottom"><button className={tab==="home"?"active":""} onClick={()=>{clear();setTab("home")}}><Icon name="home"/><span>Beranda</span></button><button className={tab==="home"?"active":""} onClick={()=>{clear();setTab("home");window.scrollTo({top:0,behavior:"smooth"})}}><Icon name="search"/><span>Cari</span></button><button className={tab==="activity"?"active":""} onClick={()=>{clear();setTab("activity");void openNotifications()}}><Icon name="bell"/>{unreadNotifications>0&&<i>{unreadNotifications>9?"9+":unreadNotifications}</i>}<span>Tawar</span></button><button className={tab==="activity"?"active":""} onClick={()=>{clear();setTab("activity")}}><Icon name="handshake"/><span>Deal</span></button><button className={tab==="profile"?"active":""} onClick={()=>{clear();setTab("profile")}}><Icon name="user"/><span>Akun</span></button></nav>
  </main>
}

function IncomingOffer({offer,busy,onRespond}:{offer:Offer;busy:boolean;onRespond:(id:string,action:"accept"|"reject"|"counter",amount?:number|null)=>void}){
  const [countering,setCountering]=useState(false); const [amount,setAmount]=useState("");
  const value=Number(amount.replace(/\D/g,""));
  return <article className="offer"><div><small>Tawaran {offer.attempt_number}/3 · {dateTime(offer.created_at)}</small><h3>{offer.listing?.title||"Barang"}</h3><p>{offer.buyer.display_name} · {offer.buyer.completed_deals} COD selesai{offer.listing&&` · harga pasang ${rupiah(offer.listing.price)}`}</p></div><strong>{rupiah(offer.amount)}</strong>
    {countering
      ?<div className="counter-box"><label>Harga balasan<div className="currency-input"><span>Rp</span><input value={amount?formatNumber(amount):""} onChange={e=>setAmount(e.target.value.replace(/\D/g,"").slice(0,14))} inputMode="numeric" placeholder="Contoh: 10.000" autoFocus/></div></label><div><button disabled={busy} onClick={()=>{setCountering(false);setAmount("")}}>Batal</button><button className="primary" disabled={busy||!value} onClick={()=>onRespond(offer.id,"counter",value)}>Kirim balasan</button></div><small>Pembeli yang memutuskan menerima atau menolak harga balasanmu.</small></div>
      :<div><button disabled={busy} onClick={()=>onRespond(offer.id,"reject")}>Tolak</button><button disabled={busy} onClick={()=>setCountering(true)}>Tawar balik</button><button className="primary" disabled={busy} onClick={()=>onRespond(offer.id,"accept")}>Terima</button></div>}
  </article>;
}

function MyOffer({offer,busy,onRespond}:{offer:Offer;busy:boolean;onRespond:(id:string,action:"accept"|"reject"|"counter",amount?:number|null)=>void}){
  const isCounter=offer.source==="seller_counter"&&offer.status==="pending";
  return <article className="offer"><div><small>{isCounter?"BALASAN PENJUAL":offer.status==="countered"?"DIBALAS PENJUAL":`TAWARANMU ${offer.attempt_number}/3`} · {dateTime(offer.created_at)}</small><h3>{offer.listing?.title||"Barang"}</h3><p>{offer.listing?`Harga pasang ${rupiah(offer.listing.price)}`:"Barang tidak lagi tersedia"}</p></div><strong>{rupiah(offer.amount)}</strong>
    {isCounter
      ?<div><button disabled={busy} onClick={()=>onRespond(offer.id,"reject")}>Tolak</button><button className="primary" disabled={busy} onClick={()=>onRespond(offer.id,"accept")}>Terima harga ini</button></div>
      :<div><em className="waiting">{offer.status==="countered"?"Kamu sudah menjawab balasan ini.":"Menunggu jawaban penjual"}</em></div>}
  </article>;
}

function DealRoom({deal,userId,busy,contact,onPropose,onAccept,onReject,onConfirm,onCancel,onDismiss}:{deal:Deal;userId:string;busy:boolean;contact?:Contact;onPropose:(e:FormEvent<HTMLFormElement>,id:string)=>void;onAccept:(id:string)=>void;onReject:(id:string)=>void;onConfirm:(id:string)=>void;onCancel:(id:string)=>void;onDismiss:(id:string)=>void}){
  const schedule=Array.isArray(deal.cod_schedules)?deal.cod_schedules[0]:deal.cod_schedules||undefined; const other=deal.buyer_id===userId?deal.seller:deal.buyer; const confirmed=deal.deal_confirmations?.some(c=>c.user_id===userId);
  const open=deal.status!=="completed"&&deal.status!=="cancelled"; const isSeller=deal.seller_id===userId; const isBuyer=deal.buyer_id===userId;
  const sellerProposalPending=Boolean(schedule&&schedule.status==="proposed"&&schedule.proposed_by===deal.seller_id);
  const buyerCounterPending=Boolean(schedule&&schedule.status==="proposed"&&schedule.proposed_by===deal.buyer_id);
  const sellerCanStart=open&&isSeller&&(!schedule||schedule.status==="cancelled");
  const buyerCanCounter=open&&isBuyer&&sellerProposalPending;
  const [rescheduling,setRescheduling]=useState(false);
  const showForm=sellerCanStart||(buyerCanCounter&&rescheduling);
  const scheduleForm=<form className="schedule-form" onSubmit={e=>{setRescheduling(false);onPropose(e,deal.id)}}><h4>{sellerCanStart?"Usulkan jadwal COD":"Usulkan waktu lain"}</h4><p className="schedule-help">{sellerCanStart?"Sebagai penjual, tentukan waktu dan titik COD pertama.":"Usulan alternatif ini akan dikirim kembali kepada penjual untuk disetujui atau ditolak."}</p><div className="date-time-fields"><label>Tanggal WITA<input name="scheduled_date" inputMode="numeric" placeholder="DDMMYYYY" pattern="\d{8}" maxLength={8} onInput={event=>event.currentTarget.value=event.currentTarget.value.replace(/\D/g,"").slice(0,8)} required/><small>Contoh: 08092026</small></label><label>Waktu<input name="scheduled_time" inputMode="numeric" placeholder="HHMM" pattern="\d{4}" maxLength={4} onInput={event=>event.currentTarget.value=event.currentTarget.value.replace(/\D/g,"").slice(0,4)} required/><small>Contoh: 1630</small></label></div><input name="location_name" placeholder="Nama tempat umum" minLength={3} maxLength={160} required/><input name="location_address" placeholder="Alamat titik temu" minLength={3} maxLength={300} required/><textarea name="notes" placeholder="Catatan pertemuan (opsional)" maxLength={500}/><div className="schedule-actions">{buyerCanCounter&&<button type="button" disabled={busy} onClick={()=>setRescheduling(false)}>Batal</button>}<button className="primary" disabled={busy}>Kirim usulan</button></div></form>;
  return <article className="deal"><div className="deal-top"><div><small>{deal.status.replaceAll("_"," ").toUpperCase()}</small><h3>{deal.listing?.title||"Barang dalam transaksi"}</h3><p>COD dengan {other.display_name}</p></div><strong>{rupiah(deal.final_price)}</strong></div>
    {contact?.phone&&open&&<div className="safety"><Icon name="shield"/><span><strong>Kontak {contact.display_name}</strong><small><a href={`tel:${contact.phone}`}>{contact.phone}</a></small></span></div>}
    {open&&showForm&&scheduleForm}
    {open&&!showForm&&!schedule&&isBuyer&&<div className="mini-empty">Menunggu penjual mengirim usulan jadwal COD.</div>}
    {open&&!showForm&&schedule&&<div className="schedule"><p><strong>{dateTime(schedule.scheduled_at)}</strong><span>{schedule.location_name}</span><small>{schedule.location_address}</small></p>{sellerProposalPending&&isBuyer&&<div className="schedule-actions"><button disabled={busy} onClick={()=>onReject(deal.id)}>Tolak</button><button disabled={busy} onClick={()=>setRescheduling(true)}>Usulkan waktu lain</button><button className="primary" disabled={busy} onClick={()=>onAccept(deal.id)}>Setujui jadwal</button></div>}{sellerProposalPending&&isSeller&&<em>Menunggu respons pembeli</em>}{buyerCounterPending&&isSeller&&<div className="schedule-actions"><button disabled={busy} onClick={()=>onReject(deal.id)}>Tolak</button><button className="primary" disabled={busy} onClick={()=>onAccept(deal.id)}>Setujui jadwal</button></div>}{buyerCounterPending&&isBuyer&&<em>Usulan alternatifmu menunggu respons penjual</em>}{schedule.status==="accepted"&&<em>Jadwal COD telah disepakati.</em>}</div>}
    {(deal.status==="scheduled"||deal.status==="meeting")&&<button className="confirm" disabled={busy||confirmed} onClick={()=>onConfirm(deal.id)}>{confirmed?"Konfirmasi tersimpan":deal.buyer_id===userId?"Barang sudah diterima":"Barang sudah diserahkan"}</button>}
    {deal.status==="completed"&&<div className="completed"><Icon name="check"/>COD selesai oleh kedua pihak</div>}
    {deal.status==="cancelled"&&<div className="mini-empty">Transaksi dibatalkan.</div>}
    {open&&<button className="text-button" disabled={busy} onClick={()=>onCancel(deal.id)}>Batalkan transaksi</button>}
    {!open&&<button className="text-button" disabled={busy} onClick={()=>onDismiss(deal.id)}>Hapus dari riwayat</button>}
  </article>
}
