# Pomodoro Library — Proje durum raporu

İnceleme tarihi: 7 Eylül 2026.

## Düzeltme sonrası güncel durum

Rapordaki 10 hata grubu `codex/fix-audit-findings` dalında kapatıldı. Sayaç artık gerçek zamana ve kalıcı oturum durumuna dayanıyor; erken bitiş ödülsüz gerçek süre kaydı oluşturuyor; doğal bitiş oturum kimliğiyle yalnız bir kez ödüllendiriliyor. Veriler işlemsel IndexedDB katmanında tutuluyor, sekmeler eşitleniyor ve JSON yedekleme/geri yükleme mevcut.

Mobil raf 360, 390 ve 768 piksel genişliklerde okunabilir ölçüyü koruyarak yatay kayıyor. Alt kontroller çakışmıyor ve görev paneli 50 kayıtta içeriden kaydırılıyor. Geçersiz sürükleme, Classic kostüm seçimi, kalıcı raf saati ve yerel takvim tarihi için regresyon testleri eklendi.

Son doğrulama: 13 otomatik test, ESLint, TypeScript ve Next.js 16.3.4 üretim derlemesi geçti; `npm audit` 0 açık bildirdi. Geliştirme tarayıcısında çalışan/duraklatılmış sayaç yenilemesi, erken bitiş, iki sekmeli tek doğal ödül, not çakışması, 50 görev ve yedekten geri yükleme canlı olarak kontrol edildi. Aşağıdaki bölümler düzeltme öncesi denetim kaydını korur.

## Düzeltme öncesi denetim kaydı

Proje masaüstünde çalışan, yerel veri saklayan bir prototip/MVP aşamasındaydı. Görsel kütüphane, kitap notları ve ödül sistemi mevcuttu; zamanlayıcı doğruluğu, veri güvenilirliği ve mobil kullanım için aşağıdaki düzeltmeler gerekiyordu.

## Doğrulama kapsamı

- Kaynak kodu ve yapılandırmalar incelendi. Uygulama kaynakları değiştirilmedi.
- `npm run lint`, `npm run build` ve `tsc --noEmit --incremental false` başarıyla tamamlandı.
- Next.js 16.2.7 ile yerel sayfa, ayrı bir test tarayıcı oturumunda açıldı. Başlık Pomodoro Library; başlangıçta boş sayfa, hata katmanı veya tarayıcı çalışma hatası görülmedi.
- Masaüstü ve 390 × 844 mobil görünüm incelendi.
- Kitap notunun kaydedilip yenilemede korunması, kitabın depoya kaldırılması ve yeniden rafa alınması doğrulandı.
- Sayaç yenileme, erken bitirme, hızlandırılmış doğal bitiş ve 20 görev içeren liste denendi. Hızlandırma yalnız test tarayıcısındaki interval süresine uygulandı; kaynak kodu değiştirilmedi.
- Kostüm normalizasyonu, geçersiz bırakma ve tarih hesapları gerçek kaynak modülleri bellekte çalıştırılarak kontrol edildi.
- Uzun süreli gerçek arka plan/uyku deneyi, bulut yayını ve gerçek cihaz testi yapılmadı. İlgili bulgular aşağıda kod incelemesi olarak ayrıldı.

## Mevcut özellikler

| Alan | Durum |
|---|---|
| Kütüphane | Ahşap raf görünümü, kitap/dekor ekleme, raf ekleme/adlandırma/geçiş/silme ve sürükleme akışları mevcut. Sınır durumlarında hatalar var. |
| Kitaplar | Başlık ve not düzenleme, kaydetme, depolama ve geri yükleme mevcut. Not kaydı ve depo dönüşü canlı denemede geçti. |
| Pomodoro | Sabit 25 dakika; başlat, duraklat, sıfırla, bitir ve hedef kitap seçimi mevcut. Oturum doğruluğu henüz güvenilir değil. |
| Oyunlaştırma | Seans başına 25 XP, günlük 200 XP sınırı, seviyeler, kitap/kostüm ödülleri ve kostüm paneli mevcut. |
| Görevler | Görev ekleme ve tamamlandı işaretleme mevcut. Düzenleme/silme yok. |
| İstatistik | Kitap bazında seans, toplam süre, XP ve son çalışma gösterimi mevcut. Bazı kayıt/tarih hesapları hatalı. |
| Veri | localStorage kaydı ve şema normalizasyonu mevcut. Hesap/bulut eşitleme ve dışa aktarma yok. |

## Önce düzeltilmesi gerekenler

### 1. P1 — Sayaç yenilemede sıfırlanıyor

**Canlı doğrulandı:** Sayaç 24:57 gösterirken sayfa yenilendi; 25:00 ve durdurulmuş duruma döndü. Buna rağmen eski `activeFocusSession` kimliği ve başlangıç tarihi kayıtta kaldı.

Kalan süre ve çalışma durumu React belleğinde tutuluyor; kayıtlı aktif oturumdan geri yüklenmiyor. Duraklatma/yeniden açma sonrasında da kalan süre korunmuyor.

Kaynak: [usePomodoroTimer.ts:14](C:/Users/Yusuf/Documents/Pomodoro-Library/src/hooks/usePomodoroTimer.ts:14), [LibraryGrid.tsx:2551](C:/Users/Yusuf/Documents/Pomodoro-Library/src/components/LibraryGrid.tsx:2551).

### 2. P1 — Çalışmadan tam seans/ödül yazılabiliyor

**Canlı doğrulandı:** Başlat'a basmadan Bitir seçildi. Seans sayısı 0 → 1, kitap sayısı 2 → 3 oldu; 1500 saniye ve 25 XP yazıldı. İşlem tekrar edilebiliyor. Erken bitirme bilinçli bir özellik olsa bile hiç çalışılmamış süreyi 25 dakika olarak kaydetmek istatistikleri bozuyor.

Kaynak: [TimerControlDialog.tsx:209](C:/Users/Yusuf/Documents/Pomodoro-Library/src/components/TimerControlDialog.tsx:209), [usePomodoroTimer.ts:64](C:/Users/Yusuf/Documents/Pomodoro-Library/src/hooks/usePomodoroTimer.ts:64), [LibraryGrid.tsx:2521](C:/Users/Yusuf/Documents/Pomodoro-Library/src/components/LibraryGrid.tsx:2521).

### 3. P1 — Geliştirme modunda doğal bitiş çift ödül yazıyor

**Hızlandırılmış canlı doğrulandı:** Tek doğal bitiş sonrasında seans sayısı 1 → 3, XP 25 → 75, kitap sayısı 3 → 5 oldu. İki kaydın bitiş zamanı aynıydı.

Tamamlanma yan etkisi state güncelleme fonksiyonunun içinde. Strict Mode geliştirmede bu fonksiyonu iki kez çalıştırınca iki tamamlanma planlanıyor. Bu tespit geliştirme modu içindir; üretimde aynı çift çağrı ayrıca doğrulanmadı.

Kaynak: [usePomodoroTimer.ts:28](C:/Users/Yusuf/Documents/Pomodoro-Library/src/hooks/usePomodoroTimer.ts:28), [next.config.ts:4](C:/Users/Yusuf/Documents/Pomodoro-Library/next.config.ts:4).

### 4. P1 — Mobil görünüm temel etkileşimleri engelliyor

**390 × 844 görünümde canlı doğrulandı:** Deep Work ve Notes düğmeleri yaklaşık 2 × 2,44 piksele küçüldü. Raflar üstte sıkıştı. Görev notuna tıklama, üstünü kapatan raf adı alanı nedeniyle engellendi. Saat 138 piksel alt sınırını korurken kitaplar küçülüyor.

Neden: 28 sütun, sabit aralıklar ve iki yandan 86 piksel iç boşluk dar ekrana aynı anda sığdırılıyor. Alt kontrol paneli de kullanılabilir alanı kapatıyor.

Kaynak: [LibraryGrid.tsx:1340](C:/Users/Yusuf/Documents/Pomodoro-Library/src/components/LibraryGrid.tsx:1340), [LibraryGrid.tsx:217](C:/Users/Yusuf/Documents/Pomodoro-Library/src/components/LibraryGrid.tsx:217), [gridLogic.ts:114](C:/Users/Yusuf/Documents/Pomodoro-Library/src/lib/gridLogic.ts:114).

Kanıt: [Mobil ekran görüntüsü](C:/Users/Yusuf/Documents/Pomodoro-Library/.codex-logs/audit-mobile.png).

### 5. P2 — Gerçek zaman ve kayıt dayanıklılığı eksik

**Kod incelemesi:** Sayaç her interval çağrısında bir saniye azaltıyor; gerçek geçen zamanı veya hedef bitiş tarihini esas almıyor. Arka plan gecikmesi/cihaz uykusu sonrası telafi yok; ne kadar sapacağı ortama bağlı.

localStorage yalnız açılışta okunuyor, her değişimde bütün veri yeniden yazılıyor. Sekmeler arası değişiklik dinlenmediğinden iki sekme birbirinin not/görev değişikliklerini ezebilir. Kayıt yazma hataları sessizce yutuluyor. Kullanıcıya yedekleme/dışa aktarma veya kurtarma akışı sunulmuyor.

Kaynak: [usePomodoroTimer.ts:27](C:/Users/Yusuf/Documents/Pomodoro-Library/src/hooks/usePomodoroTimer.ts:27), [useLocalStorageState.ts:18](C:/Users/Yusuf/Documents/Pomodoro-Library/src/hooks/useLocalStorageState.ts:18).

### 6. P2 — Geçersiz bırakma yan sütundaki objeyi taşıyor

**Gerçek modülle doğrulandı:** Bırakma çözümü `snap-back / out-of-bounds` döndüğü halde öğe `left-column / slot6` konumundan `shelf / row2 / col3` konumuna geçti. Öğe, geçerli bırakma doğrulanmadan raf öğesine dönüştürülüyor ve başarısız sonuç da kaydediliyor.

Kaynak: [LibraryGrid.tsx:2773](C:/Users/Yusuf/Documents/Pomodoro-Library/src/components/LibraryGrid.tsx:2773).

### 7. P2 — Seçilen klasik kostüm korunmuyor

**Gerçek modülle doğrulandı:** Kitap türünün varsayılanı Arcane iken bir kitabı Classic yapmak başlangıçta doğru görünüyor; normalizasyon sonrası Arcane'a dönüyor. Klasik kostüm kimliği koşulsuz kaldırıldığı için yeniden açma veya görev/seans değişimi seçimi bozuyor.

Kaynak: [libraryCostumeDefinitions.ts:382](C:/Users/Yusuf/Documents/Pomodoro-Library/src/lib/libraryCostumeDefinitions.ts:382).

### 8. P2 — Uzun görev listesinde kontroller ekran dışına çıkıyor

**Canlı doğrulandı:** 1280 × 800 ekranda 20 görev ile kapatma düğmesinin dikey konumu -162,5 piksel oldu. Panelin yükseklik sınırı ve kaydırma alanı yok; üst kontroller ve listenin bir kısmı erişilemez hale geliyor.

Kaynak: [LibraryGrid.tsx:1950](C:/Users/Yusuf/Documents/Pomodoro-Library/src/components/LibraryGrid.tsx:1950). [Ekran görüntüsü](C:/Users/Yusuf/Documents/Pomodoro-Library/.codex-logs/audit-tasks-overflow.png).

### 9. P2 — Otomatik oluşturulan rafın saati kalıcı envanterde yok

**Kod akışından doğrulandı; canlı denenmedi:** Dolu rafa kitap eklenince otomatik açılan raf yalnız kitabı kaydediyor. Saat görüntüleme sırasında ekleniyor; gerçek envanterde olmadığından o saate kostüm uygulamak sessizce sonuçsuz kalabiliyor. Yer arama da bu saatin kapladığı alanı görmüyor. Elle raf ekleme yolu bundan etkilenmiyor.

Kaynak: [LibraryGrid.tsx:181](C:/Users/Yusuf/Documents/Pomodoro-Library/src/components/LibraryGrid.tsx:181), [LibraryGrid.tsx:406](C:/Users/Yusuf/Documents/Pomodoro-Library/src/components/LibraryGrid.tsx:406), [LibraryGrid.tsx:2658](C:/Users/Yusuf/Documents/Pomodoro-Library/src/components/LibraryGrid.tsx:2658).

### 10. P2/P3 — Son çalışma tarihi hatalı olabiliyor

**Gerçek modüllerle doğrulandı:** Günlük XP sınırı dolu olduğunda yeni seans kaydı oluşsa bile kitabın son çalışma tarihi eskide kalıyor. Örnekte 6 ve 7 Eylül seansları mevcutken son çalışma 6 Eylül kaldı. Ayrıca takvim günü yerine geçen 24 saat kullanıldığı için 6 Eylül 23:55 çalışması 7 Eylül 00:05'te Bugün gösteriliyor.

Kaynak: [libraryProgression.ts:156](C:/Users/Yusuf/Documents/Pomodoro-Library/src/lib/libraryProgression.ts:156), [libraryStats.ts:38](C:/Users/Yusuf/Documents/Pomodoro-Library/src/lib/libraryStats.ts:38), [libraryStats.ts:66](C:/Users/Yusuf/Documents/Pomodoro-Library/src/lib/libraryStats.ts:66).

## Yarım kalan veya henüz uygulanmamış alanlar

- **Giriş Yap:** Görünür düğmenin bağlantısı/işleyicisi yok. Firebase paketi kurulu fakat kaynaklarda kullanımı yok. Hesap ve bulut eşitleme uygulanmamış. [LibraryGrid.tsx:3256](C:/Users/Yusuf/Documents/Pomodoro-Library/src/components/LibraryGrid.tsx:3256).
- **Pomodoro döngüsü:** Süre ayarı, kısa/uzun mola, otomatik döngü ve bitiş sesi/bildirimi yok.
- **Görevler ve dekor:** Görev düzenleme/silme ve dekoru tek başına kaldırma arayüzü yok.
- **Arama/odak modu/mağaza:** `searchQuery`, `focusMode`, `wardrobe.tokens` alanları var; bunlara karşılık çalışan kullanıcı akışları yok. Bunların mutlaka ürün kapsamına alınması gerektiği sonucu çıkarılmamalı; ya tamamlanmalı ya da temizlenmeli.
- **İstatistik ekranı:** Kitap özetleri var; genel seans geçmişi ve günlük/haftalık rapor arayüzü yok.
- **Dil tutarlılığı:** Türkçe, İngilizce ve Türkçe karaktersiz etiketler birlikte kullanılıyor.

## Proje altyapısının durumu

- Git deposunda henüz hiç commit yok; izlenen dosya listesi boş ve remote tanımlı değil. Bu depoda geri dönülebilir sürüm geçmişi/uzak yedek yok. Yerel `.codex-backups` kopyaları mevcut; başka yerdeki yedekler incelenmedi.
- Otomatik davranış testleri, test komutu ve CI iş akışı bulunamadı. [package.json:5](C:/Users/Yusuf/Documents/Pomodoro-Library/package.json:5).
- README, kurulum, veri saklama ve yayımlama yönergesi yok.
- `.codex-backups`, `.codex-logs`, kaynak içindeki `.bak` kopyaları ve boş `old_dialog.tsx` için depo temizliği gerekiyor. [gitignore](C:/Users/Yusuf/Documents/Pomodoro-Library/.gitignore:1).
- `LibraryGrid.tsx` yaklaşık 3400 satır; raf sahnesi, görev paneli, kostüm paneli ve uygulama durumunu birlikte yönetiyor. Kullanılmayan eski `TimerModal` ve `FocusTimerBar` da var. Bu yapı hata düzeltme ve bakım maliyetini artırıyor.

## Önerilen uygulama sırası

1. Mevcut kaynaklar için ilk Git kaydını oluştur; yedek/log kapsamını düzenle.
2. Zamanlayıcıyı gerçek geçen süreye ve kalıcı oturum durumuna bağla; erken bitirme davranışını belirle; tek oturuma tek kayıt/ödül garantisi getir.
3. Kayıt hatası bildirimi, yedek dışa/içe aktarma ve sekmeler arası tutarlılığı tamamla.
4. Mobil raf düzenini ve kaydırılabilir görev panelini düzelt.
5. Geçersiz sürükleme, kostüm seçiminin korunması, otomatik raf saati ve tarih hesaplarını düzelt; bu senaryolara davranış testleri ekle.
6. Ürün kapsamına göre mola/bildirim/süre ayarını ekle; giriş/bulut, mağaza ve arama alanlarını tamamla veya arayüzden/veri modelinden çıkar.

Denetim sonucu: Temel deneyim hazır, günlük güvenilir kullanım ve mobil kullanım için yukarıdaki öncelikli düzeltmeler gerekli. Kaynak koduna düzeltme uygulanmadı.
