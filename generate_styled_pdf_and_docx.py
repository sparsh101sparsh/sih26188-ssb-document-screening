import subprocess
import os

def generate_documents():
    md_file = "/Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/SIH26188_TEAM_ONBOARDING_30_PHASES.md"
    pdf_out = "/Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/SIH26188_Team_Onboarding_30_Phases.pdf"
    docx_out = "/Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/SIH26188_Team_Onboarding_30_Phases.docx"
    
    docs_pdf_out = "/Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/sih26188_project/docs/SIH26188_Team_Onboarding_30_Phases.pdf"
    docs_docx_out = "/Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/sih26188_project/docs/SIH26188_Team_Onboarding_30_Phases.docx"

    print("Generating Typst intermediate file from Markdown...")
    typ_file = "/Users/iamsparsh00321/Documents/antigravity/vibrant-rutherford/temp_styled_onboarding.typ"
    
    # 1. Convert MD to Typst via Pandoc
    subprocess.run(["pandoc", md_file, "-o", typ_file], check=True)
    
    # 2. Add high-grade Typst header styles
    with open(typ_file, "r", encoding="utf-8") as f:
        typ_content = f.read()

    custom_header = """
#set page(
  paper: "a4",
  margin: (top: 2.2cm, bottom: 2.2cm, left: 2.2cm, right: 2.2cm),
  header: align(right)[
    #text(8pt, fill: rgb("#64748b"))[
      *SIH26188 — MHA / SSB AI Document Screening Blueprint*
    ]
  ],
  footer: [
    #line(length: 100%, stroke: 0.5pt + rgb("#cbd5e1"))
    #grid(
      columns: (1fr, 1fr),
      align(left)[#text(8pt, fill: rgb("#94a3b8"))[Ministry of Home Affairs • Sashastra Seema Bal]],
      align(right)[#text(8pt, fill: rgb("#94a3b8"))[Page #context counter(page).display()]]
    )
  ]
)

#set text(
  font: ("Arial", "Helvetica"),
  size: 10pt,
  fill: rgb("#0f172a"),
  lang: "en"
)

#set par(justify: true, leading: 0.65em)

#show heading.where(level: 1): it => block(
  above: 1.5em, below: 0.8em,
  text(weight: "bold", size: 15pt, fill: rgb("#1e3a8a"))[#it.body]
)

#show heading.where(level: 2): it => block(
  above: 1.2em, below: 0.6em,
  text(weight: "bold", size: 12.5pt, fill: rgb("#0f766e"))[#it.body]
)

#show heading.where(level: 3): it => block(
  above: 1.0em, below: 0.4em,
  text(weight: "bold", size: 10.5pt, fill: rgb("#1e293b"))[#it.body]
)

#show raw.where(block: true): it => block(
  fill: rgb("#f1f5f9"),
  inset: 8pt,
  radius: 4pt,
  stroke: 0.5pt + rgb("#cbd5e1"),
  width: 100%,
  text(size: 7.5pt, fill: rgb("#0f172a"))[#it]
)

#show table: set text(size: 8.5pt)
#set table(stroke: 0.5pt + rgb("#cbd5e1"), inset: 5pt)

"""
    
    with open(typ_file, "w", encoding="utf-8") as f:
        f.write(custom_header + "\n" + typ_content)

    print("Compiling Typst to styled PDF...")
    subprocess.run(["typst", "compile", typ_file, pdf_out], check=True)
    
    print("Generating DOCX via Pandoc...")
    subprocess.run(["pandoc", md_file, "-o", docx_out], check=True)
    
    # Copy to docs/
    subprocess.run(["cp", pdf_out, docs_pdf_out], check=True)
    subprocess.run(["cp", docx_out, docs_docx_out], check=True)
    
    # Clean up temp
    if os.path.exists(typ_file):
        os.remove(typ_file)
        
    print(f"Generated PDF: {pdf_out} ({round(os.path.getsize(pdf_out)/1024, 1)} KB)")
    print(f"Generated DOCX: {docx_out} ({round(os.path.getsize(docx_out)/1024, 1)} KB)")

if __name__ == "__main__":
    generate_documents()
