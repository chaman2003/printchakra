from fpdf import FPDF

# Create instance of FPDF class
pdf = FPDF()

# Add a page
pdf.add_page()

# Save the pdf
pdf.output('blank.pdf')

print("Blank PDF created successfully!")
