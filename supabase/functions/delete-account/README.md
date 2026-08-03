# Бүртгэл устгах — тохируулах заавар

Хэрэглэгч профайл хуудаснаасаа өөрийн бүртгэлээ устгах товч ажиллахын тулд
энэ Edge Function-ыг нэг удаа deploy хийх шаардлагатай (client талын anon
key-ээр өөр хэрэглэгч устгах боломжгүй тул заавал сервер тал хэрэгтэй).

## Deploy хийх

Төслийн үндсэн хавтаснаас:

```
npx supabase login
npx supabase functions deploy delete-account --project-ref vbgqgwfcklkfecvocsyt
```

(`--no-verify-jwt` ХЭРЭГГҮЙ шүү — энэ функц дуудагчийн JWT-г заавал шалгадаг,
эс тэгвэл дурын хэрэглэгч өөр хэн нэгний бүртгэлийг устгах боломжтой болно.)

## Шаардлагатай environment variable-ууд

`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` эдгээр нь
Supabase Edge Functions дээр **автоматаар** бэлэн байдаг тул тусдаа
`secrets set` хийх шаардлагагүй.

## Тест хийх

Сайтаас нэвтэрсэн хэрэглэгчээр Профайл → Бүртгэл устгах товчийг дараад,
акаунт устсан эсэхийг Supabase Dashboard → Authentication → Users хэсгээс
шалгаж болно.
