# Learning notebook PDF

Profile exports use jsPDF with jsPDF-AutoTable, loaded only when the learner requests an export. Fonts and the logo load in parallel from local assets; generation runs on the device and retains the existing section choices and account-change cancellation.

The A4 notebook has a branded cover with counts from selected records, clickable contents pointing to actual section pages, repeated table headings, generous margins, running section labels and page numbers. Vocabulary puts each German word, English meaning, example, personal hint, Arabic translation and review information in one row. Rows remain together when they fit on a page. Long records wrap and can continue across pages. Empty sections stay compact.

Noto Sans regular/bold covers German letters; Amiri renders connected Arabic with explicit right-to-left drawing in its own vocabulary column. All fonts are embedded for offline reading and printing. Their licenses are in `public/fonts/pdf/OFL.txt` and `Amiri-OFL.txt`. Saved records are preserved without including authentication credentials or database information.
