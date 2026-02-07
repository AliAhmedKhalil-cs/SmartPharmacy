import csv
import random

base = [
    ("Panadol", "Paracetamol"),
    ("Brufen", "Ibuprofen"),
    ("Voltaren", "Diclofenac"),
    ("Amoxicillin", "Amoxicillin"),
    ("Augmentin", "Amoxicillin+Clav"),
    ("Algamed", "Alginate"),
    ("Prospan", "Hedera Helix Extract"),
    ("Strepsils", "Benzydamine"),
    ("Neurofen", "Ibuprofen"),
    ("Telfast", "Fexofenadine"),
    ("Voltaren Emulgel", "Diclofenac"),
    ("Flucon", "Fluconazole"),
    ("Augmentin Duo", "Amoxicillin+Clav"),
    ("Cetrizine", "Cetirizine"),
    ("Nurofen Plus", "Ibuprofen+Codeine"),
    ("Panadol Extra", "Paracetamol+Caffeine"),
    ("Omeprazole", "Omeprazole"),
    ("Losec", "Omeprazole"),
    ("Metronidazole", "Metronidazole"),
    ("Flagyl", "Metronidazole"),
    ("Ciprofloxacin", "Ciprofloxacin"),
    ("Cipro", "Ciprofloxacin"),
    ("Metaflam", "Diclofenac"),
    ("Dicloran", "Diclofenac"),
    ("Augmentin Syrup", "Amoxicillin+Clav"),
    ("Augmentin 875", "Amoxicillin+Clav"),
    ("Panadol Cold & Flu", "Paracetamol+Phenylephrine"),
    ("Voltaren Rapid", "Diclofenac"),
    ("Brufen Rapid", "Ibuprofen"),
    ("Amoxi-Drops", "Amoxicillin"),
    ("Cataflam", "Diclofenac"),
    ("Naproxen", "Naproxen"),
    ("Voltaren SR", "Diclofenac"),
    ("Aspirin", "Aspirin"),
    ("Cardiprin", "Aspirin"),
    ("Diclofenac SR", "Diclofenac"),
    ("Diclofenac Plus", "Diclofenac+Paracetamol"),
    ("Paracetamol Syrup", "Paracetamol"),
    ("Paracetamol 500", "Paracetamol"),
    ("Cipro 500", "Ciprofloxacin"),
    ("Azithromycin", "Azithromycin"),
    ("Azithro", "Azithromycin"),
    ("Levofloxacin", "Levofloxacin"),
    ("Panadol Infant", "Paracetamol"),
    ("Brufen Infant", "Ibuprofen"),
    ("Amoxil", "Amoxicillin"),
    ("Voltaren Max", "Diclofenac"),
    ("Ciproxin", "Ciprofloxacin"),
    ("Omeprazole SR", "Omeprazole"),
]

forms = ["tablet", "capsule", "syrup", "gel", "drops"]
strengths = ["500 mg", "250 mg", "200 mg", "100 mg/5ml", "50 mg", "1%", "100 mg"]
pack_sizes = ["10 tabs", "20 tabs", "30 tabs", "100 ml", "50 g", "15 ml"]

def random_entry():
    trade, act = random.choice(base)
    form = random.choice(forms)
    strength = random.choice(strengths)
    pack = random.choice(pack_sizes)
    otc = random.choice(["TRUE", "FALSE"])
    return {
        "trade_name": trade,
        "active_ingredient": act,
        "strength": strength,
        "form": form,
        "manufacturer": "PharmaCo"+str(random.randint(1,50)),
        "pack_size": pack,
        "otc": otc
    }

with open("data/drugs_seed_300.csv", "w", newline='', encoding='utf8') as f:
    writer = csv.DictWriter(f, fieldnames=["trade_name","active_ingredient","strength","form","manufacturer","pack_size","otc"])
    writer.writeheader()
    seen = set()
    while len(seen) < 300:
        e = random_entry()
        key = (e["trade_name"], e["strength"], e["form"])
        if key in seen:
            continue
        seen.add(key)
        writer.writerow(e)

print("Generated 300 drug entries → data/drugs_seed_300.csv")
