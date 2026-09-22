@echo off
cd /d "%~dp0.."
node __notes_test\cellbg_palette_probe.mjs > __notes_test\_cellbg_palette_out.txt 2>&1
echo NODE_EXIT=%ERRORLEVEL% > __notes_test\_cellbg_palette_done.txt
