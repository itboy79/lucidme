#!/usr/bin/env bash
# gen-audio.sh — suonerie e cue TLR PLACEHOLDER, sintetizzate con ffmpeg.
#
# Sostituibili 1:1 con l'audio di produzione (PM/design): bastano file con lo
# stesso nome in apps/app/public/audio/. Specifiche di riferimento (wiki 09 §3):
# suonerie 10-15s loopabili, volume gentile (mai spaventare al risveglio);
# cue TLR ~2s distinguibile ma morbido; intro TLR 3 min di tono calmo.
#
# Richiede: ffmpeg. Uso: bash apps/app/public/audio/gen-audio.sh
set -euo pipefail
cd "$(dirname "$0")"

# Parametri comuni: mono 44.1kHz, 96kbps (voce/ambiente basta), volume basso.
ENC=(-ar 44100 -ac 1 -b:a 96k)

# --- Campana: due sinusoidi (fondamentale + quinta) con decadimento lungo ---
ffmpeg -y -loglevel error \
  -f lavfi -i "sine=frequency=523.25:duration=12" \
  -f lavfi -i "sine=frequency=784:duration=12" \
  -filter_complex "\
    [0]volume=0.30[a];[1]volume=0.12[b];\
    [a][b]amix=inputs=2:duration=longest,\
    afade=t=in:d=0.01,afade=t=out:st=10:d=2,\
    aecho=0.7:0.5:120:0.22,alimiter=limit=0.7" \
  "${ENC[@]}" alarms/campana.mp3

# --- Marea: rumore marrone filtrato + lenta marea (tremolo) ---
ffmpeg -y -loglevel error \
  -f lavfi -i "anoisesrc=color=brown:duration=12:seed=7" \
  -af "\
    lowpass=f=420,highpass=f=90,\
    tremolo=f=0.13:d=0.85,\
    volume=0.55,afade=t=in:d=1.5,afade=t=out:st=10:d=2,\
    alimiter=limit=0.6" \
  "${ENC[@]}" alarms/marea.mp3

# --- Bosco: soffio pink filtrato in banda media (vente tra le fronde) ---
ffmpeg -y -loglevel error \
  -f lavfi -i "anoisesrc=color=pink:duration=12:seed=3" \
  -af "\
    bandpass=f=1400:w=900,\
    tremolo=f=0.10:d=0.7,\
    volume=0.45,afade=t=in:d=1.2,afade=t=out:st=9.5:d=2.5,\
    alimiter=limit=0.55" \
  "${ENC[@]}" alarms/bosco.mp3

# --- Cue TLR (~2s): campanella morbida, distinguibile ma non brusca ---
ffmpeg -y -loglevel error \
  -f lavfi -i "sine=frequency=660:duration=2" \
  -f lavfi -i "sine=frequency=990:duration=2" \
  -filter_complex "\
    [0]volume=0.35[a];[1]volume=0.10[b];\
    [a][b]amix=inputs=2:duration=longest,\
    afade=t=in:d=0.01,afade=t=out:st=0.6:d=1.4,\
    aecho=0.6:0.4:90:0.2,alimiter=limit=0.65" \
  "${ENC[@]}" tlr/cue.mp3

# --- Intro TLR (3 min): drone calmo a 174Hz (F3) con lieve battimento ---
ffmpeg -y -loglevel error \
  -f lavfi -i "sine=frequency=174:duration=180" \
  -f lavfi -i "sine=frequency=175.5:duration=180" \
  -filter_complex "\
    [0]volume=0.16[a];[1]volume=0.14[b];\
    [a][b]amix=inputs=2:duration=longest,\
    afade=t=in:d=6,afade=t=out:st=168:d=12,\
    alimiter=limit=0.5" \
  "${ENC[@]}" tlr/session-intro.mp3

echo "Done:"
ls -la alarms/ tlr/
