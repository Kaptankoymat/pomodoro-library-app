# Pomodoro Library

Pomodoro Library, odak oturumlarını kitap ve raflarla birleştiren yerel bir Next.js uygulamasıdır. Kitap notları, görevler, raf düzeni, çalışma geçmişi ve kazanımlar tarayıcıdaki IndexedDB deposunda saklanır.

## Çalıştırma

Node.js 22 veya daha yeni bir sürüm önerilir.

```powershell
npm install
npm run dev
```

Uygulama varsayılan olarak `http://localhost:3000` adresinde açılır.

## Kontroller

```powershell
npm run test
npm run lint
npx tsc --noEmit --incremental false
npm run build
```

Hepsini sırayla çalıştırmak için:

```powershell
npm run check
```

## Veri saklama ve yedekleme

- Veriler bu tarayıcıda ve cihazda tutulur; hesap veya bulut eşitleme yoktur.
- Alt raf çubuğundaki **Yedekle** düğmesi sürümlü bir JSON dosyası indirir.
- **Yükle** düğmesi dosyayı doğrular, içeriğin özetini gösterir ve onaydan sonra mevcut kütüphaneyi değiştirir.
- İçe aktarma öncesinde mevcut kayıt tarayıcıda bir kurtarma kopyası olarak saklanır.
- Yazma başarısız olursa uygulama hata gösterir ve son değişikliği yeniden deneme seçeneği sunar.

Önceki localStorage sürümünden ilk açılışta otomatik ve tek seferlik geçiş yapılır. Eski ham kayıt `pomodoro-library-state-v3:legacy-backup` anahtarında korunur. Eski sürümden yarım kalmış bir sayaç için süre veya ödül tahmin edilmez; kullanıcı yeni bir çalışma başlatır.

## Sayaç davranışı

- Tam odak süresi 25 dakikadır.
- Yenileme, sekmenin arka planda kalması ve tarayıcının yeniden açılması sırasında gerçek geçen zaman kullanılır.
- Duraklatılan süre çalışma süresine eklenmez.
- Erken bitirilen çalışma gerçek süresiyle kaydedilir; XP veya tam Pomodoro ödülü vermez.
- Aynı oturum kimliği yalnız bir kez tamamlanabilir ve ödüllendirilebilir.

## Geliştirme notları

Durum ve uygulama sırası için [proje durum raporuna](./PROJE_DURUM_RAPORU.md) ve [hata düzeltme planına](./HATA_DUZELTME_PLANI.md) bakılabilir.
