# Self-host Studio full audit - 2026-07-26

Bu belge `supabase-v2.aqenta.com.tr/project/default` icin self-host Studio durumunu sayfa/ozellik bazinda izlemek icin hazirlandi.

## Canli erisim notu

- Coolify deployment son durumda ayakta: `https://supabase-v2.aqenta.com.tr` artik `503` degil, gateway/auth katmanindan `401` donuyor.
- Codex in-app browser Basic/Auth oturumu olmadigi icin Studio sayfasini dogrudan gezemedi: `ERR_INVALID_AUTH_CREDENTIALS`.
- Kullanici Edge tarafinda Studio'yu acik gordu. Bu nedenle bu turun audit'i kaynak kod, onceki canli console hatalari ve self-host API handler kapsami uzerinden yapildi. Gorsel sayfa sayfa smoke, tarayici oturumu kontrol edilebilir hale geldiginde ayni matrise eklenecek.

## Hemen duzeltilen console gurultuleri

| Belirti | Koken | Durum |
| --- | --- | --- |
| `/api/get-deployment-commit` 401 | Platform build davranisi self-host runtime'da da calisiyordu. | `useCheckLatestDeploy` runtime deployment-mode kesinlesmeden commit sorgusu yapmiyor. |
| `/favicon/manifest.json` 401 | Manifest linki self-host Basic/Auth altinda public gibi isteniyordu. | Manifest linki sadece platform runtime icin basiliyor. |
| `/img/regions/local.svg` 404 | Self-host default project region `local`, ama asset yoktu. | `public/img/regions/local.svg` eklendi. |

## Ana menu kapsam durumu

| Alan | Sayfalar / sekmeler | Self-host durum | Eksik / risk |
| --- | --- | --- | --- |
| Project Overview | `/project/default`, connection popover, operations, usage, advisors | Kismen bagli. Runtime saglik ve operasyon kartlari var. | Usage kartlari `logs.all` saglam degilse bos/500 gorunur. Dashboardda tekrar eden saglik kartlari sade tutulmali. |
| Table Editor | Tables, table detail, row editor | Pg-meta uzerinden self-host icin calismasi beklenir. | Canli UI smoke gerekli: tablo listeleme, insert/update/delete, RLS etkisi. |
| SQL Editor | Snippets, new query, examples/templates | SQL endpoint self-host adapter'a bagli. | Canli smoke gerekli: query run, result table, error state, snippets persistence. |
| Database Management | Schema Visualizer, Tables, Functions, Triggers, Types, Extensions, Indexes, Publications | Pg-meta handler'lari mevcut. | Her alt sayfada read/write smoke gerekli. Extensions/Postgres 17 farklari dokumante edilmeli. |
| Database Access Control | Policies, Roles, Column Privileges | Self-host'ta menu acik. | Column privileges feature preview davranisi ve role mutation smoke gerekiyor. |
| Database Platform | Replication, Backups, Migrations | Migrations adapter mevcut. Backups/PITR operator kaniti bekliyor. Replication backend yok. | `/api/platform/replication/default/*` 404. Bu alan sadece flag acmakla calismaz; self-host replication operator API lazim. |
| Auth | Users, Providers, URL config, Email Templates, MFA, Hooks, Rate Limits, Sessions, SMTP, Protection, Passkeys, OAuth, Third-party | Self-host auth config handler'lari mevcut. | Her formun Gotrue env/config'e yazma modeli netlestirilmeli. Bazi ayarlar runtime env ile yonetiliyorsa UI read-only/uyari olmali. |
| Storage | Buckets, policies, settings, S3, analytics, vectors | Storage bucket/object/vector handler'lari mevcut. | S3 credential create/delete self-host'ta runtime secret manager'a bagli. Analytics yine `logs.all` durumuna bagli. |
| Edge Functions | List, new, code, details, invocations, logs, secrets | Functions artifact store ve secrets self-host adapter'lari mevcut. | Deployment path, file persistence, secret write, invocation logs tek tek smoke edilmeli. |
| Realtime | Inspector, Policies, Settings | Self-host config read/update handler'lari mevcut. | Inspector canli websocket smoke gerekli. Settings runtime env ile yonetiliyorsa write path sinirli olabilir. |
| Logs | API, Postgres, Auth, Storage, Realtime, Edge Functions, Explorer, Cron, Pooler, Replication, Pg upgrade | Endpoint var, Logflare'a proxy ediyor. | Canli console'da `logs.all` 500 gorundu. Muhtemel neden: Logflare tablo/semalar veya token/env uyumsuzlugu. Once Logflare response body yakalanmali. |
| Observability | Overview, API, Auth, Database, Edge Functions, PostgREST, Realtime, Storage, Query insights/performance | Buyuk olcude analytics/log sorgularina bagli. | `logs.all` 500 cozulmeden bu bolum tam calismaz. `local.svg` asset fixlendi. |
| Advisors | Security, Performance, Rules | Self-host lint adapter mevcut. | Rules create/enable/disable cloud davranisindan ayrilmali; canli write smoke gerekiyor. |
| API Docs | REST/GraphQL docs, API keys | REST/GraphQL endpoint handler'lari mevcut. | API key ekraninda self-host key modeli tek publishable/secret olabilir; Cloud Pro gibi coklu key icin operator-backed key registry gerekir. |
| Integrations | Data API, Vault, marketplace/detail pages | Data API/Vault linkleri menuye alinmis. | Marketplace/cloud entegrasyonlari self-host operator modeline gore ayiklanmali. |
| Settings | General, Compute and Disk, Infrastructure, Integrations, API Keys, JWT Keys, Log Drains, Add-ons, Dashboard | Bir kismi self-host runtime/config adapter'li. | Compute/disk, infra, add-ons, log drains ve billing tarzi alanlar operator backend olmadan gercek Cloud Pro gibi calismaz. |

## Kritik eksik backendler

1. Replication/read replicas
   - UI ve feature flag acik.
   - Kaynak kod `/platform/replication/{ref}/sources`, `destinations`, `pipelines` endpointlerini cagiriyor.
   - `pages/api/platform/replication/...` self-host route'lari yok.
   - Gerekli is: self-host replication operator API tasarimi. Minimum: sources list, publications/tables, destinations list, pipeline CRUD, status, start/stop, version, rollback-tables.

2. Logs/Observability analytics
   - API route var: `pages/api/platform/projects/[ref]/analytics/endpoints/[name].ts`.
   - Handler `LOGFLARE_URL` ve `LOGFLARE_PRIVATE_ACCESS_TOKEN` ile Logflare `endpoints/query/{name}` cagriyor.
   - Canli console `logs.all` icin 500 gosterdi.
   - Gerekli is: canli response body ve Logflare container logu yakalanacak; sonra tablo/endpoint/token uyumsuzlugu kalici duzeltilecek.

3. Backups/PITR/restore
   - Studio sayfalari var.
   - Tek Docker stack icinde Cloud PITR/restore-to-new-project otomatik olarak gelmez.
   - Gerekli is: operator-managed backup service. Minimum: backup catalog, verified restore point, restore job status, download/retention policy.

4. Multi-project model
   - Self-host resmi model genelde tek stack/tek default project.
   - Kullanici ihtiyaci: birden fazla proje olusturabilmek.
   - Gerekli is: Coolify/Docker operator API ile her proje icin ayri stack/env/domain/database provisioning. Cloud/VPS satisi olmayacak, sadece kendi altyapimizdaki project lifecycle yonetilecek.

5. API keys Pro parity
   - Self-host mevcut key modeli runtime/env tabanli.
   - Coklu publishable/secret key, revoke/rotate, scoped key gibi Cloud Pro davranislari icin key registry ve Kong/Auth entegrasyonu gerekir.

## Cloud/VPS satisi haric tutulacak alanlar

- Billing, subscription, plan purchase, compute product purchase.
- Cloud provider/region satis akisi.
- Hosted platform support ticket, org billing, invoice/payment forms.
- Compute resize/disk autoscaling UI ancak kendi operator backend'i ile teknik kapasite yonetimi olarak yeniden yazilirsa kullanilabilir.

## Siradaki kalici is listesi

1. Canli `logs.all` 500 response body ve Logflare logs yakala.
2. Replication endpointleri icin self-host API route iskeleti ekle; en azindan 404 yerine operator-not-configured veya gercek local source list donsun.
3. Backups/PITR sayfalarini operator kaniti olmadan "aktif" gostermeyi durdur; ya gercek adapter ekle ya da read-only operator bekliyor durumu.
4. Multi-project provisioning tasarimini ayri operator service olarak yaz.
5. Tum ana menu ve alt sayfalari tarayici smoke listesiyle tek tek isaretle.
6. Topluluk duyurusu ancak canli smoke ve deploy SHA kanitindan sonra yazilsin.
