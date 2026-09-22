@echo off
cd /d "%~dp0"
for %%t in (part11_smart_text_tool part12_smart_tables part14_smart_images part15_smart_logo part16_smart_page_design part17_smart_signature part18_smart_signature_protection part19_smart_pages part20_smart_save) do (
  echo. >> __p21_regression2.log
  node tests\%%t.test.mjs >> __p21_regression2.log 2>&1
)
echo BATCH_DONE >> __p21_regression2.log
