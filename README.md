# 🧠 QuizVault

General-purpose quiz & assessment platform. Drop your materials into `/vault`, push to GitHub, dan Vercel akan otomatis deploy.

---

## 🚀 Deploy ke Vercel (via GitHub CI/CD)

### 1. Push ke GitHub

```bash
git init
git add .
git commit -m "initial commit"
git branch -M main
git remote add origin https://github.com/USERNAME/quizvault.git
git push -u origin main
```

### 2. Connect ke Vercel

1. Buka [vercel.com](https://vercel.com) → **Add New Project**
2. Import repository GitHub kamu
3. **Framework Preset**: pilih **Other**
4. Biarkan semua pengaturan default → klik **Deploy**

Selesai! Setiap `git push` akan otomatis trigger deployment baru.

---

## 📁 Struktur Project

```
quizvault/
├── api/
│   └── vault.js              ← Serverless function (ganti server.py)
├── vault/
│   └── simple-present-tense/
│       └── questions.json    ← Materi quiz
├── index.html
├── style.css
├── script.js
├── vercel.json
├── package.json
└── .gitignore
```

---

## ➕ Menambah Materi Quiz Baru

1. Buat folder baru di dalam `vault/`, misalnya `vault/past-tense/`
2. Buat file `questions.json` di dalam folder tersebut
3. Push ke GitHub → Vercel otomatis deploy

### Format `questions.json`

```json
[
  {
    "question": "Teks pertanyaan di sini?",
    "options": ["Pilihan A", "Pilihan B", "Pilihan C", "Pilihan D"],
    "answer": 0,
    "explanation": "Penjelasan mengapa jawaban ini benar."
  }
]
```

| Field | Type | Keterangan |
|-------|------|------------|
| `question` | string | Teks soal |
| `options` | array of string | 2–8 pilihan jawaban |
| `answer` | number | Index jawaban benar (0-based) |
| `explanation` | string | Penjelasan yang muncul di halaman review |

---

## ⌨️ Keyboard Shortcuts (saat quiz berlangsung)

| Tombol | Aksi |
|--------|------|
| `←` / `→` | Soal sebelumnya / berikutnya |
| `1`–`8` | Pilih jawaban |
| `M` | Toggle mark for review |
