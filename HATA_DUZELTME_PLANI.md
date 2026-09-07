# Pomodoro Library — Hata düzeltme planı

Tarih: 7 Eylül 2026.

Dayanak: [Proje durum raporu](C:/Users/Yusuf/Documents/Pomodoro-Library/PROJE_DURUM_RAPORU.md).

Hedef: Rapordaki 10 hata grubunu gidermek; mevcut kitapları, notları, rafları ve kazanımları koruyarak masaüstü ve mobil kullanımını güvenilir hale getirmek.

**Uygulama durumu:** Plan `codex/fix-audit-findings` dalında tamamlandı. Aşağıdaki maddeler tasarım ve kabul kapsamını koruyan uygulama kaydıdır; kapanış kanıtları belgenin sonundaki sonuç tablosunda yer alır.

## Uygulama sonucu

| Alan | Sonuç | Doğrulama |
|---|---|---|
| Güvenli kayıt ve geçiş | Tamamlandı | IndexedDB işlemleri, localStorage ham yedeği, yeniden deneme, JSON içe/dışa aktarma ve sekmeler arası bildirim |
| Sayaç ve ödül | Tamamlandı | Yenileme/duraklatma, erken bitiş, gerçek bitiş sınırı ve tek ödül regresyon testleri; iki sekmeli canlı doğal bitiş |
| Raf, sürükleme, kostüm | Tamamlandı | Geçersiz bırakma, açık Classic seçimi ve eksik/çift raf saati testleri |
| Mobil ve görevler | Tamamlandı | 360 × 800, 390 × 844, 768 × 1024 ve 1280 × 800; mobil ve masaüstünde 50 görev |
| Altyapı | Tamamlandı | 13 otomatik test, lint, TypeScript, üretim derlemesi, README, CI ve temiz bağımlılık denetimi |

Gerçek zaman hesabı hızlandırılmadan canlı başlatma/duraklatma/yenileme ile kontrol edildi. Doğal bitişin 25 dakikalık bekleme kısmı aynı geçişi kullanan denetlenebilir saat testleri ve kısa süreli canlı seansla doğrulandı.

## Planın davranış kararları

- Tam Pomodoro 25 dakika olarak kalacak. Günlük 200 XP sınırı ve mevcut tamamlama ödülleri korunacak.
- Hiç başlanmamış çalışmada Bitir kayıt veya ödül oluşturmayacak.
- Erken bitirme yalnız gerçekten çalışılan süreyi, erken sonlandırılmış kayıt olarak saklayacak. Tamamlanan Pomodoro sayısı, XP, kitap ve kostüm ödülü artmayacak.
- Duraklatma çalışma süresine eklenmeyecek. Çalışır durumdayken sekmenin arka planda veya kapalı kalması gerçek zaman hesabına dahil olacak. Geri dönüşte en fazla o aktif oturum tamamlanacak; zincirleme yeni seans açılmayacak.
- Sıfırla aktif oturumu ödülsüz iptal edecek. Daha önce tamamlanan kayıtları etkilemeyecek.
- Eski kayıtlar için geçmiş süreler yeniden tahmin edilmeyecek; önceki sürümde oluşmuş şüpheli seans/ödüller otomatik silinmeyecek.
- Mobil görünüm değişiklikleri kayıtlı raf koordinatlarını değiştirmeyecek.
- Bu turda hesap, bulut, mağaza veya mola sistemi geliştirilmeyecek. İşlevsiz Giriş Yap düğmesi kaldırılacak ve verilerin bu cihazda saklandığı anlaşılır biçimde belirtilecek.

## Aşama 1 — Başlangıç kaydı ve hataları yakalayan testler

**Bağımlılık:** Yok.

Yapılacaklar:

- [x] Mevcut kaynakları ilk yerel Git kaydıyla koru; düzeltmeler için `codex/` önekli dal aç. Log, derleme çıktısı, kişisel veri ve yerel yedekleri Git kapsamından çıkar. Yedek dosyalarını silme.
- [x] Mevcut veri şemasını temsil eden kişisel bilgi içermeyen örnekler hazırla: dolu raf, arşivli kitap, kostüm, görev, geçmiş seans ve eski aktif seans.
- [x] Sayaç, kayıt geçişi, ödül, sürükleme, kostüm ve tarih davranışları için otomatik test komutu oluştur. Hata düzeltmeden önce ilgili senaryonun mevcut sorunu yakaladığını göster.
- [x] Zaman, rastgele ödül ve kimlik üretimini testlerde denetlenebilir hale getir. Üretim davranışını değiştirmeyen dar kapsamlı ayrıştırma yap.

**Tamamlanma ölçütü:** Kaynaklara geri dönülebiliyor; testler çalıştırılabiliyor ve rapordaki hataları yakalayan başlangıç senaryoları mevcut. Uzak depo kurulması bu aşamanın önkoşulu değil.

## Aşama 2 — Güvenilir yerel kayıt ve veri geçişi

**Kapsanan bulgu:** 5 — kayıt dayanıklılığı ve sekmeler arası tutarlılık.

**Bağımlılık:** Aşama 1. Sayaç entegrasyonundan önce bitmeli.

Yapılacaklar:

- [x] Tüm değişikliklerin kullanacağı ortak kayıt katmanını oluştur. Planlanan çözüm, yeni sunucu/paket gerektirmeyen IndexedDB üzerinde işlemsel yazma: güncel kaydı oku, işlemi uygula, yeni sürümü tek işlemde kaydet.
- [x] React durumunu her değişimde bağımsız olarak bütün kayıt üzerine yazan akışı kaldır. Not, görev, raf, kostüm, süre ve ödül değişikliklerinin tamamı aynı yazma yolundan geçsin.
- [x] Sekmelere kayıt değişikliği bildir ve güncel sürümü okut. Bildirim tek başına çakışma önleme sayılmayacak; aynı anda yazmalar kayıt işlemi içinde sıralanacak.
- [x] İki sekmede aynı not düzenlenirse eski taslağı sessizce ezme. Taslağı koru, çakışmayı göster ve kullanıcının seçimini al. Farklı not/görev değişiklikleri birlikte korunmalı.
- [x] Mevcut localStorage kaydını doğrula, ham yedeğini koru ve yeni şemaya bir kez taşı. Kitap, raf, görev, arşiv, kostüm, XP ve seans kimliklerini koru. Geçiş tekrar çalışsa da kayıtları çoğaltmasın.
- [x] Veri yüklenmeden varsayılan kütüphaneyi kaydetme. Bozuk veya desteklenmeyen veriyi başlangıç verisiyle ezme; kurtarma ekranı ve ham yedeği alma olanağı sun.
- [x] Eski aktif seansın kalan süresi güvenilir biçimde bilinmiyorsa bu kaydı kurtarma yedeğinde koru; yeni sayaçta otomatik çalıştırma/ödüllendirme yapma ve yeniden başlatılması gerektiğini bildir.
- [x] Yazma başarısızlığında Kaydedilemedi durumu, yeniden deneme ve bekleyen değişiklikleri dışa aktarma sun. Başarı mesajını yalnız kayıt tamamlandığında göster.
- [x] Sürümlü JSON dışa/içe aktarma ekle. İçe aktarmadan önce veriyi doğrula, mevcut kaydı yedekle ve değiştirilecek verinin özetini göster. İçe aktarılan aktif seans kendiliğinden ödül üretmesin.

**Tamamlanma ölçütleri:** Eski veri kayıpsız açılıyor; iki sekmenin farklı değişiklikleri korunuyor; aynı not çakışması görünür; kota/yazma hatası sessiz kalmıyor; dışa aktarılan yedek geri yüklenebiliyor; yarım kalmış geçişten tekrar açılış güvenli.

## Aşama 3 — Doğru sayaç, tek ödül ve doğru istatistik

**Kapsanan bulgular:** 1, 2, 3, 5'in zaman hesabı kısmı ve 10.

**Bağımlılık:** Aşama 2.

Yapılacaklar:

- [x] Oturum kimliği, hedef süre, çalışma/duraklatma durumu, birikmiş aktif süre ve son devam zamanını kalıcı olarak sakla. Kalan süreyi gerçek zamandan hesapla; interval yalnız ekranı güncellesin.
- [x] Başlat, duraklat, devam et, sıfırla, erken bitir ve doğal bitiş işlemlerini açık durum geçişleri haline getir. İlk yüklemede kayıtlı durumu geri getir.
- [x] State güncelleme fonksiyonlarından zamanlayıcı, rastgele ödül üretimi ve başka state güncellemesi gibi yan etkileri çıkar. Strict Mode açık kalsın.
- [x] Tamamlanma kontrolü, seans kaydı, XP/kitap/kostüm değişimi ve aktif seansın kapanmasını aynı kayıt işlemine al. Aynı oturum kimliği daha önce sonlandırılmışsa tekrar işlem yapma.
- [x] Erken biten seansın gerçek süresini sakla; bunu tam Pomodoro sayısından ayır. Başlangıçta Bitir etkisiz olsun. Tam bitişle aynı anda gelen erken bitirme/sıfırlama yalnız bir geçerli sonuç üretsin.
- [x] Sekme kapalıyken bitmiş seansı açılışta bir kez tamamla. Bitiş tarihini uygulamanın yeniden açıldığı saate kaydırma; günlük XP sınırını ilgili yerel tamamlanma gününe göre hesapla.
- [x] Son çalışma tarihini XP verilip verilmediğinden bağımsız güncelle; kitap alanı ile seans geçmişinden en güncel geçerli tarihi kullan. Bugün/Dün etiketlerini yerel takvim gününe göre hesapla.

**Tamamlanma ölçütleri:**

- [x] Çalışan sayaç yenileme ve yeniden açmada doğru kalan süreden sürüyor; duraklatılmış sayaç ilerlemiyor.
- [x] 10 dakika çalışma + 5 dakika duraklama, 10 dakika çalışma olarak hesaplanıyor.
- [x] Hiç başlamadan Bitir: 0 kayıt, 0 XP, 0 kitap. Erken bitirme: gerçek süre, 0 tam Pomodoro ödülü.
- [x] Tek tam oturum: yalnız bir seans ve mevcut kurallara uygun tek ödül. Çift tıklama, Strict Mode, yeniden açılış ve iki sekmenin aynı anda bitişinde sonuç değişmiyor.
- [x] Arka plan gecikmesi ve uyku dönüşünde sayaç doğru; kalan süre negatif olmuyor. Saatin ileri/geri değiştirilmesi ayrıca sınanıyor.
- [x] Günlük XP sınırı doluyken de çalışma süresi ve son çalışma tarihi güncelleniyor. Gece yarısı ve yıl geçişinde tarihler doğru.

## Aşama 4 — Raf, sürükleme ve kostüm tutarlılığı

**Kapsanan bulgular:** 6, 7 ve 9.

**Bağımlılık:** Aşama 2. Saf yerleşim/kostüm düzeltmeleri Aşama 3 ile paralel hazırlanabilir; ödülle raf açma entegrasyonu ortak doğrulanmalı.

Yapılacaklar:

- [x] Bırakma hedefini önce özgün öğeyi değiştirmeden hesapla. Geçerli sonuç varsa konumu kaydet. Geçersiz bırakma, iptal veya pencere dışına bırakma özgün konum türünü, rafı ve koordinatları korusun.
- [x] Açıkça seçilen Classic kostümü ile Tür varsayılanını kullan durumunu ayrı temsil et. Göç ve normalizasyon bu tercihi silmesin; arşiv/geri yükleme de tercihi korusun.
- [x] Elle raf ekleme, dolu rafa kitap ekleme, ödülle raf açma ve depodan geri getirme için ortak raf oluşturma işlevi kullan. Her rafın tek kalıcı saati olsun ve yer arama saatin alanını hesaba katsın.
- [x] Mevcut saatsiz rafları göç sırasında onar. Yer yoksa öğe kaybetmeden taşma rafı oluştur; aynı onarımın ikinci çalışması yeni saat veya raf çoğaltmasın.

**Tamamlanma ölçütleri:** Geçersiz sürükleme tüm özgün yerleşim alanlarını koruyor; Arcane varsayılanı altında bir kitapta seçilen Classic, yenileme ve görev değişiminden sonra kalıyor; dolu rafı genişleten bütün yollar kalıcı, kostümü değiştirilebilir tek saat oluşturuyor; yerleşimde çakışma veya kayıp yok.

## Aşama 5 — Mobil görünüm ve uzun görev listesi

**Kapsanan bulgular:** 4 ve 8.

**Bağımlılık:** Aşama 1 sonrası hazırlanabilir. Son sürükleme kontrolü Aşama 4 ile birlikte yapılmalı.

Yapılacaklar:

- [x] Masaüstündeki 28 sütunlu mantıksal düzeni koru. Mobilde rafı minik hücrelere sıkıştırmak yerine okunabilir asgari boyutta kaydırılabilir bir raf alanında göster.
- [x] Mobil yan sütun boşluklarını ve raf başlığını dar ekrana uyarla. Görev, saat, kostüm ve ekleme kontrollerini erişilebilir konumlara yerleştir; alt raf menüsüne ayrılmış alan bırak.
- [x] Dokunarak rafı kaydırma ile öğe sürüklemeyi ayır; kaydırma hareketi yanlışlıkla obje taşımasın. Kaydırılmış rafın bırakma koordinatlarını doğru hesapla.
- [x] Görev paneline ekran yüksekliği sınırı ve içeride kaydırma ekle. Başlık, ekleme alanı ve kapatma kontrolü erişilebilir kalsın; Escape ile kapanma ve klavye odağı davranışını tamamla.

**Tamamlanma ölçütleri:** 360 × 800, 390 × 844, 768 × 1024 ve 1280 × 800 görünümlerde kitaplara ve tüm temel kontrollere erişilebiliyor; 20 ve 50 görev kaydırılarak kullanılabiliyor; portre/yatay geçişi raf verisini değiştirmiyor; dokunma ve fareyle yerleştirme doğru.

## Aşama 6 — Bütünleşik kontrol ve teslim

**Kapsam:** On hata grubunun kapanışı ve temel proje temizliği.

**Bağımlılık:** Aşama 3, 4 ve 5.

Yapılacaklar:

- [x] İşlevsiz Giriş Yap düğmesini kaldır; yerel saklama/yedekleme bilgisini ilgili ekranda göster. Etkilenen etiketleri tutarlı Türkçeye çevir.
- [x] Kullanılmayan eski zamanlayıcı bileşenlerini ve Firebase bağımlılığını doğrulayarak temizle. Büyük kapsamlı yeniden yazım yerine yalnız düzeltilen kayıt/sayaç/görev sorumluluklarını ayır. Kullanılmayan veri alanlarını bu turda eski yedeklerden silme.
- [x] Not kaydet → yenile → depola → geri getir; raf ekle/sil; kostüm seç; görev tamamla; Pomodoro tamamla akışlarını baştan sona dene.
- [x] Otomatik davranış testlerini, lint, TypeScript ve üretim derlemesini çalıştır. Geliştirme ve üretim sunucusunda sayaç bitişini, iki sekmeyi ve mobil görünümü ayrıca doğrula. Hızlandırılmış testlere ek olarak gerçek süreli bir Pomodoro denemesi yap.
- [x] README'ye kurulum, çalıştırma, testler, yerel kayıt sınırları, veri geçişi ve yedekten dönme adımlarını yaz. Tek yerel kontrol komutu hazırla; CI'nin uzak depo bağlandığında aynı kontrolleri çalıştırmasını sağla.
- [x] Durum raporunda her bulguyu doğrulama kanıtıyla güncelle. Değişiklikleri mantıklı yerel Git kayıtlarına böl. Uzak yayımlama bu planın teslim şartı değil.

**Tamamlanma ölçütü:** Aşağıdaki eşlemenin tamamı doğrulanmış; eski veriler korunmuş; önce çalışan not/depo akışları bozulmamış; son kaynak için kontroller geçmiş. Yalnız derleme başarısı hata kapanışı sayılmayacak.

## Raporla eşleme

| Rapor bulgusu | Düzeltme aşaması | Kapanış kanıtı |
|---|---|---|
| 1 — Yenilemede sayaç sıfırlanması | 2–3 | Çalışan ve duraklatılmış oturumun yeniden açılması |
| 2 — Çalışmadan tam seans/ödül | 3 | Başlatmadan ve erken bitirerek kayıt/ödül kontrolü |
| 3 — Çift tamamlanma | 2–3 | Strict Mode, çift tıklama, iki sekme ve tekrar açılış |
| 4 — Mobil yerleşim | 5 | Dar ekran, dokunma, kaydırma ve veri karşılaştırması |
| 5 — Zaman/kayıt dayanıklılığı | 2–3 | Uyku dönüşü, yazma hatası, eşzamanlı değişiklik, yedek dönüşü |
| 6 — Geçersiz sürükleme | 4 | Özgün konumun tamamen korunması |
| 7 — Klasik kostüm kaybı | 4 | Varsayılan farklıyken açık seçimin kalıcılığı |
| 8 — Uzun görev listesi | 5 | 20/50 görevde kontroller ve kaydırma |
| 9 — Kalıcı olmayan raf saati | 4 | Bütün raf oluşturma yolları ve eski raf onarımı |
| 10 — Hatalı tarihler | 3 | XP sınırı, gece yarısı, yıl geçişi |

## Sonraki ürün aşaması

Hata düzeltmeleri tamamlandıktan sonra süre ayarı, mola döngüsü, bitiş bildirimi/sesi, görev düzenleme/silme, dekor kaldırma, genel çalışma geçmişi, arama ve hesap/bulut eşitleme ayrıca planlanabilir. Bu özellikler, rapordaki on hatayı kapatmanın tamamlanma koşulu değildir.
