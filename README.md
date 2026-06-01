# 🏆 Shensha Axiom — Gold Compounding Plan

Un'app web completa per tracciare e ottimizzare il tuo piano di trading con compounding giornaliero.

## 📊 Features

### Dashboard Principale
- Account cards con balance live aggiornato
- Master + Copy Accounts con gestione dinamica
- Stats: giorni del piano, data inizio, daily target %, estimated total
- Valuta in Dollar ($)

### 🗓️ 60-Day Tracker
- Tabella con 60 righe (una per giorno)
- Calendario Mon–Fri only (salta sabato/domenica)
- Colonne: Day · Date · Balance Start · Daily Target · Actual P/L · P/L % · Balance End · Variation · Pause
- Update in cascata del balance

### ☕ Rest / Pause Days
- Marcare giorni di pausa
- Balance congelato
- Non conta nelle statistiche
- Appare grigio nel heatmap

### 🔥 Streak Tracker
- Streak attuale e massimo
- Heatmap: 🟢 verde (sopra target) · 🔴 rosso (sotto) · ☕ grigio (rest)
- Performance % vs target

### 📅 Weekly Summary
- Raggruppamento ogni 5 giorni di trading
- Balance iniziale/finale, P/L totale, avg %

### 📈 Charts
- Compound Growth Line Chart (reale vs teorica)
- Daily P/L Bar Chart con target overlay

### 🎯 Sistema Target Dinamico
- Imposta Final Target ($)
- Sistema calcola % richiesta ogni giorno automaticamente
- Target dinamico basato su performance

### 🎯 Progress Bar
- Balance attuale vs target
- Tempo usato vs days totali
- Status On Track / Behind
- Days left stimati

### ⚙️ Settings
- Start Date
- Starting Balance
- Daily Target %
- Final Target $
- Daily Stop Loss
- Max Trades/Day
- Salvataggio in localStorage

### 🔬 What-If Simulator
- Compara 2%, 3%, 4%, 5%, 6% + custom
- Balance finale, guadagno, crescita %
- Grafico comparativo

### 💸 Withdrawal Calculator
- Simula prelievi Daily / Weekly / Monthly
- Mostra balance con/senza prelievi
- Avviso di depletion

### 🎯 Goal Calculator
- Target → giorni esatti necessari
- Milestones: 25% · 50% · 75% · 100%
- Compatibile con prelievi

### 💾 Persistenza & Export
- LocalStorage per salvataggio
- Export CSV
- Reset P/L mantenendo settings

## 🚀 Come Usare

1. Apri `index.html` direttamente nel browser (no server richiesto!)
2. O deploya su GitHub Pages, Vercel, Netlify

## 📦 Tech Stack
- HTML5
- CSS3
- Vanilla JavaScript
- Chart.js (CDN)

## 💾 Dati
Tutti i dati sono salvati in localStorage - non hai bisogno di database!

---

**Versione:** 1.0  
**Creato per:** Trading Compounding Plan Tracking
