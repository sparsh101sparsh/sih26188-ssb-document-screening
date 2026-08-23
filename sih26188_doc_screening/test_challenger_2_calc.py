"""
Precise Workload and Dependency Simulator for SIH26188 (5 Students, 12 Weeks)
"""
import re

def analyze_phases():
    phases = [
        {"phase": "Phase 0", "weeks": [1], "name": "Threat Modeling & SOP", "effort": 25, "students": ["S1", "S2", "S3", "S4", "S5"]},
        {"phase": "Phase 1", "weeks": [1], "name": "Base Infra, Docker, pgvector", "effort": 35, "students": ["S1", "S4"]},
        {"phase": "Phase 2", "weeks": [2], "name": "Dataset Acquisition & Synthetic Engine", "effort": 45, "students": ["S2", "S3"]},
        {"phase": "Phase 3", "weeks": [3], "name": "Multilingual OCR & MRZ Engine", "effort": 40, "students": ["S2"]},
        {"phase": "Phase 4", "weeks": [4], "name": "Aadhaar Secure QR & Barcode", "effort": 30, "students": ["S1", "S2"]},
        {"phase": "Phase 5", "weeks": [4, 5], "name": "Deep Forensics & Tampering (DocTamper/TruFor)", "effort": 50, "students": ["S3"]},
        {"phase": "Phase 6", "weeks": [6], "name": "Biometrics & Face Anti-Spoofing", "effort": 40, "students": ["S2", "S3"]},
        {"phase": "Phase 7", "weeks": [7], "name": "Multi-Factor Risk Scoring Engine", "effort": 35, "students": ["S1", "S3"]},
        {"phase": "Phase 8", "weeks": [7], "name": "FastAPI Backend & Async APIs", "effort": 40, "students": ["S1"]},
        {"phase": "Phase 9", "weeks": [8], "name": "Officer Web Dashboard (Next.js 15)", "effort": 45, "students": ["S4"]},
        {"phase": "Phase 10", "weeks": [8, 9], "name": "Mobile Companion App (Flutter)", "effort": 50, "students": ["S5"]},
        {"phase": "Phase 11", "weeks": [9], "name": "System Integration & TensorRT Optimization", "effort": 40, "students": ["S1", "S2", "S3", "S4", "S5"]},
        {"phase": "Phase 12", "weeks": [10], "name": "Comprehensive Testing & Benchmarking", "effort": 40, "students": ["S1", "S2", "S3"]},
        {"phase": "Phase 13", "weeks": [11], "name": "Edge Deployment Packaging & Air-Gap", "effort": 25, "students": ["S1", "S5"]},
        {"phase": "Phase 14", "weeks": [11], "name": "DPDP Compliance & Audit Trail", "effort": 30, "students": ["S1", "S4"]},
        {"phase": "Phase 15", "weeks": [12], "name": "Pitch Deck & Jury Strategy", "effort": 30, "students": ["S1", "S2", "S3", "S4", "S5"]},
        {"phase": "Phase 16", "weeks": [12], "name": "Final Hardening & Deliverables", "effort": 25, "students": ["S1", "S2", "S3", "S4", "S5"]}
    ]
    
    student_totals = {"S1": 0.0, "S2": 0.0, "S3": 0.0, "S4": 0.0, "S5": 0.0}
    weekly_matrix = {w: {"S1": 0.0, "S2": 0.0, "S3": 0.0, "S4": 0.0, "S5": 0.0} for w in range(1, 13)}
    
    for p in phases:
        n_stud = len(p["students"])
        n_weeks = len(p["weeks"])
        hrs_per_student_total = p["effort"] / n_stud
        hrs_per_student_per_week = hrs_per_student_total / n_weeks
        
        for s in p["students"]:
            student_totals[s] += hrs_per_student_total
            for w in p["weeks"]:
                weekly_matrix[w][s] += hrs_per_student_per_week
                
    print("=== STUDENT TOTAL WORKLOAD ACROSS 12 WEEKS ===")
    for s, tot in sorted(student_totals.items()):
        print(f"{s}: {tot:.1f} hours ({tot/12:.1f} hrs/week avg)")
        
    print("\n=== WEEKLY WORKLOAD HEATMAP (HOURS PER STUDENT) ===")
    header = f"{'Week':<6} | " + " | ".join([f"{s:^7}" for s in ["S1", "S2", "S3", "S4", "S5"]]) + " | Total Week Hrs"
    print(header)
    print("-" * len(header))
    for w in range(1, 13):
        row = f"W{w:<4} | " + " | ".join([f"{weekly_matrix[w][s]:>6.1f}h" for s in ["S1", "S2", "S3", "S4", "S5"]])
        week_sum = sum(weekly_matrix[w].values())
        print(f"{row} | {week_sum:>6.1f}h")
        
    return phases, student_totals, weekly_matrix

if __name__ == "__main__":
    analyze_phases()
