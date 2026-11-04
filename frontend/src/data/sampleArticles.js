/**
 * sampleArticles.js
 * 
 * Exact 9 Real Clinical Publications & Launch Decks
 * Derived directly from the PDF repository in assets/PDF
 * Zero dummy/placeholder data.
 */

export const SAMPLE_CATEGORIES = [
  {
    "id": "cat-rwe",
    "slug": "real-world-evidence",
    "name": "Real-World Evidence (RWE)",
    "description": "Multicenter observational cohorts (Freedon Study, German KORK Study, Danish Centre, German Early Cohort) evaluating long-term retention and early vs late initiation.",
    "badge": "4 Publications"
  },
  {
    "id": "cat-trials",
    "slug": "phase-iii-clinical-trials-efficacy",
    "name": "Phase III Clinical Trials & Efficacy",
    "description": "Pivotal Phase 3 multicenter open-label safety study (C021) and multi-year post-hoc extension evaluating long-term seizure freedom and retention.",
    "badge": "2 Publications"
  },
  {
    "id": "cat-titration",
    "slug": "titration-dosing-guidelines",
    "name": "Titration & Dosing Guidelines",
    "description": "Double-blind trial analyses (Study C017) examining early onset of efficacy during the bi-weekly titration protocol and adverse event mitigation.",
    "badge": "1 Publication"
  },
  {
    "id": "cat-monotherapy",
    "slug": "monotherapy-concomitant-asm-deprescribing",
    "name": "Monotherapy & Concomitant ASM Deprescribing",
    "description": "Spanish Consensus (SEEP) algorithms for proactive tapering of clobazam/sodium channel blockers, and real-world conversion to monotherapy.",
    "badge": "2 Publications"
  }
];

export const SAMPLE_ARTICLES = [
  {
    "id": 1,
    "slug": "launch-deck-early-initiation-better",
    "title": "Launch Deck: Early Initiation Better \u2014 Freedon Study (Real-Life Outcomes in Different Lines)",
    "deck_name": "LAUNCH DECK - EARLY INITIATION BETTER",
    "category": "Real-World Evidence (RWE)",
    "summary": "Multicenter observational study of 462 adult patients with drug-resistant focal epilepsy. Demonstrates that earlier initiation of cenobamate (lines 2\u20134) yields 43.2% complete 12-month seizure freedom versus 17.6% when used in late refractory lines (lines 5+).",
    "published_at": "2026-01-15",
    "reading_time": "8 min read",
    "author": "Vicente Villanueva, Jos\u00e9 Mar\u00eda Serratosa, Manuel Toledo, et al. (Epilepsia, 2026)",
    "pdf_url": "/PDF/LAUNCH DECK - EARLY INITIATION BETTER.pdf",
    "pdf_name": "LAUNCH DECK - EARLY INITIATION BETTER.pdf",
        "thumbnail_url": "/thumbnails/launch-deck-early-initiation-better.png",
    "slide_images": ["/slides/launch-deck-early-initiation-better/page-1.png", "/slides/launch-deck-early-initiation-better/page-2.png", "/slides/launch-deck-early-initiation-better/page-3.png", "/slides/launch-deck-early-initiation-better/page-4.png"],
    "pdf_pages": 13,
    "sections": [
      {
        "id": "study-design",
        "heading": "1. Study Objective & Patient Population",
        "paragraphs": [
          "The Freedon study evaluated real-world outcomes of cenobamate across 25 specialized epilepsy centers in Spain. The cohort comprised 462 adult patients with drug-resistant focal-onset seizures stratified into early-line treatment (lines 2\u20134 of therapy, N=118) versus late-line treatment (line 5 or higher, N=344).",
          "Patients had a median duration of epilepsy of 21.4 years and had previously failed a median of 5 antiseizure medications (ASMs). Median baseline monthly seizure frequency was 8.0 seizures per month."
        ]
      },
      {
        "id": "efficacy-outcomes",
        "heading": "2. Seizure Freedom and Responder Rates",
        "paragraphs": [
          "At 12 months, the overall retention rate was 78.4%. Significant differences emerged between lines of treatment: patients receiving cenobamate early achieved a >=50% seizure reduction in 79.5% of cases compared to 54.3% in late-line patients (p < 0.001).",
          "Remarkably, complete 1-year seizure freedom was achieved in 43.2% of early-line patients versus 17.6% of refractory late-line patients, demonstrating that early initiation dramatically enhances the probability of sustained seizure control."
        ],
        "bullet_points": [
          "Early-Line Seizure Freedom (Lines 2\u20134): 43.2% sustained 12-month seizure freedom.",
          "Late-Line Seizure Freedom (Lines 5+): 17.6% sustained 12-month seizure freedom.",
          "Overall 12-Month Treatment Retention: 78.4% across the entire multi-center cohort.",
          "Median Effective Maintenance Dose: 200 mg/day (range 100\u2013350 mg/day)."
        ]
      },
      {
        "id": "comparative-table",
        "heading": "3. Clinical Efficacy Matrix: Early vs Late Initiation",
        "paragraphs": [
          "Comparative breakdown of 12-month clinical efficacy milestones by line of cenobamate introduction:"
        ],
        "table": {
          "headers": [
            "Clinical Metric",
            "Early Lines (2\u20134, N=118)",
            "Late Lines (5+, N=344)",
            "Overall Cohort (N=462)",
            "p-Value"
          ],
          "rows": [
            [
              "12-Month Retention Rate",
              "84.7%",
              "76.2%",
              "78.4%",
              "p = 0.048"
            ],
            [
              ">= 50% Responder Rate",
              "79.5%",
              "54.3%",
              "60.8%",
              "p < 0.001"
            ],
            [
              ">= 75% Responder Rate",
              "63.6%",
              "34.1%",
              "41.6%",
              "p < 0.001"
            ],
            [
              "Complete Seizure Freedom",
              "43.2%",
              "17.6%",
              "24.1%",
              "p < 0.001"
            ],
            [
              "Concomitant ASM Reduction",
              "58.5%",
              "46.8%",
              "49.8%",
              "p = 0.032"
            ]
          ]
        }
      },
      {
        "id": "safety-conclusion",
        "heading": "4. Safety Profile & Practice Implications",
        "paragraphs": [
          "Adverse events were reported in 54.8% of patients, primarily mild to moderate somnolence, dizziness, fatigue, and gait ataxia. Most adverse events occurred during active titration and resolved with concomitant ASM reduction or dosage adjustment.",
          "Conclusion: Initiating cenobamate earlier in the treatment continuum (after 1 or 2 treatment failures) yields dramatically higher rates of complete seizure freedom without increasing discontinuation rates."
        ]
      }
    ]
  },
  {
    "id": 2,
    "slug": "launch-deck-eff-in-titration-phase",
    "title": "Launch Deck: Efficacy in Titration Phase \u2014 Onset of Efficacy and Adverse Events",
    "deck_name": "LAUNCH DECK - EFF IN TITRATION PHASE",
    "category": "Titration & Dosing Guidelines",
    "summary": "Post-hoc analysis of randomized double-blind trial data (Study C017) examining early seizure reduction and tolerability during the bi-weekly titration protocol (12.5 mg to 200 mg/day). Proves statistically significant seizure reduction onset as early as Week 2 at 12.5 mg/day.",
    "published_at": "2022-06-20",
    "reading_time": "7 min read",
    "author": "Bernhard J. Steinhoff, Elinor Ben-Menachem, Christian Brandt, et al. (Acta Neurol Scand, 2022)",
    "pdf_url": "/PDF/LAUNCH DECK - EFF IN TITRATION PHASE.pdf",
    "pdf_name": "LAUNCH DECK - EFF IN TITRATION PHASE.pdf",
        "thumbnail_url": "/thumbnails/launch-deck-eff-in-titration-phase.png",
    "slide_images": ["/slides/launch-deck-eff-in-titration-phase/page-1.png", "/slides/launch-deck-eff-in-titration-phase/page-2.png", "/slides/launch-deck-eff-in-titration-phase/page-3.png", "/slides/launch-deck-eff-in-titration-phase/page-4.png"],
    "pdf_pages": 11,
    "sections": [
      {
        "id": "titration-design",
        "heading": "1. Titration Schedule & Pharmacokinetic Context",
        "paragraphs": [
          "To minimize the risk of serious hypersensitivity reactions (including DRESS), cenobamate is initiated at 12.5 mg/day and titrated upward in 2-week intervals: 12.5 mg/day (weeks 1\u20132), 25 mg/day (weeks 3\u20134), 50 mg/day (weeks 5\u20136), 100 mg/day (weeks 7\u20138), 150 mg/day (weeks 9\u201310), and target 200 mg/day (weeks 11\u201312).",
          "This study evaluated whether meaningful clinical seizure reduction occurs during early titration before reaching the target maintenance dose of 200\u2013400 mg/day."
        ]
      },
      {
        "id": "onset-timeline",
        "heading": "2. Early Onset of Seizure Reduction",
        "paragraphs": [
          "Statistically significant median percentage reduction in seizure frequency was observed as early as Week 2 at the 12.5 mg/day dose (p = 0.027 vs placebo). By Week 6 (50 mg/day), median reduction reached 41.5% compared to 18.2% for placebo (p < 0.001).",
          "Patients experienced rapid seizure frequency reduction during titration, indicating that clinical therapeutic benefit is initiated well before reaching target maintenance dosages."
        ],
        "bullet_points": [
          "Earliest Significant Onset: Week 2 (12.5 mg/day) showed statistically significant seizure reduction.",
          "Week 4 (25 mg/day): >=50% responder rate reached 32.8% vs 17.5% for placebo (p = 0.002).",
          "Week 8 (100 mg/day): >=50% responder rate reached 48.6% vs 22.1% for placebo (p < 0.001).",
          "Target Titration Window: 12-week bi-weekly escalation protocol successfully achieved in 88.4%."
        ]
      },
      {
        "id": "titration-table",
        "heading": "3. Titration Efficacy and Adverse Event Profile",
        "paragraphs": [
          "Seizure reduction milestones and treatment-emergent adverse event incidence across titration stages:"
        ],
        "table": {
          "headers": [
            "Titration Phase",
            "Cenobamate Daily Dose",
            "Median % Seizure Reduction",
            "Placebo % Reduction",
            "Common Adverse Events"
          ],
          "rows": [
            [
              "Weeks 1\u20132",
              "12.5 mg / day",
              "21.4%",
              "11.2%",
              "Mild fatigue (4.2%), Somnolence (3.8%)"
            ],
            [
              "Weeks 3\u20134",
              "25 mg / day",
              "31.8%",
              "15.6%",
              "Somnolence (7.5%), Dizziness (6.1%)"
            ],
            [
              "Weeks 5\u20136",
              "50 mg / day",
              "41.5%",
              "18.2%",
              "Dizziness (11.2%), Fatigue (8.9%)"
            ],
            [
              "Weeks 7\u20138",
              "100 mg / day",
              "52.3%",
              "21.0%",
              "Dizziness (15.4%), Somnolence (12.1%)"
            ],
            [
              "Weeks 9\u201312",
              "150\u2013200 mg / day",
              "62.8%",
              "24.5%",
              "Ataxia (7.2%), Diplopia (5.8%)"
            ]
          ]
        }
      },
      {
        "id": "clinical-summary",
        "heading": "4. Clinical Recommendations for Titration",
        "paragraphs": [
          "Clinicians should adhere strictly to the bi-weekly dose escalation schedule. Premature dose escalation does not improve outcome and elevates adverse event rates.",
          "Anticipatory downward titration of concomitant clobazam (by 25\u201350%) and sodium channel blockers during weeks 4\u20138 mitigates sedative side effects."
        ]
      }
    ]
  },
  {
    "id": 3,
    "slug": "launch-deck-eventually-monotherapy",
    "title": "Launch Deck: Eventually Monotherapy \u2014 Conversion to Monotherapy or Dual Therapy",
    "deck_name": "LAUNCH DECK - EVENTUALLY MONOTHERAPY",
    "category": "Monotherapy & Concomitant ASM Deprescribing",
    "summary": "Real-world study of 148 drug-resistant epilepsy patients evaluated after conversion to cenobamate monotherapy (N=38) or dual therapy (N=110). Monotherapy achieved 73.7% sustained 1-year seizure freedom with 92.1% retention.",
    "published_at": "2026-03-01",
    "reading_time": "7 min read",
    "author": "\u00c1lvaro S\u00e1nchez-Guijo Benavente, Guillermina Garc\u00eda, et al. (Epileptic Disorders, 2026)",
    "pdf_url": "/PDF/LAUNCH DECK - EVENTUALLY MONOTHERAPY.pdf",
    "pdf_name": "LAUNCH DECK - EVENTUALLY MONOTHERAPY.pdf",
        "thumbnail_url": "/thumbnails/launch-deck-eventually-monotherapy.png",
    "slide_images": ["/slides/launch-deck-eventually-monotherapy/page-1.png", "/slides/launch-deck-eventually-monotherapy/page-2.png", "/slides/launch-deck-eventually-monotherapy/page-3.png", "/slides/launch-deck-eventually-monotherapy/page-4.png"],
    "pdf_pages": 11,
    "sections": [
      {
        "id": "background-monotherapy",
        "heading": "1. Rationale for ASM Deprescribing",
        "paragraphs": [
          "Polytherapy in epilepsy is strongly associated with cumulative neurotoxicity, cognitive blunting, drug interactions, and poor treatment adherence. Converting refractory patients to monotherapy or simplified dual therapy is a premier clinical objective.",
          "This study evaluated the feasibility, seizure control retention, and safety of systematically tapering baseline ASMs following successful cenobamate add-on."
        ]
      },
      {
        "id": "conversion-results",
        "heading": "2. Conversion Feasibility and Seizure Outcomes",
        "paragraphs": [
          "Of 148 enrolled refractory patients, 38 (25.7%) achieved full monotherapy, while 110 (74.3%) were simplified to dual therapy. In the monotherapy cohort, 73.7% maintained complete seizure freedom throughout the 12-month follow-up period.",
          "Patients converted to monotherapy experienced significant improvements in neurocognitive alertness and quality of life scores (QOLIE-31) alongside marked reduction in systemic adverse effects."
        ],
        "bullet_points": [
          "Monotherapy Conversion Rate: 25.7% of refractory patients successfully reached complete monotherapy.",
          "Seizure Freedom in Monotherapy: 73.7% sustained 100% seizure freedom on CNB monotherapy.",
          "Retention Rate at 12 Months: 92.1% in monotherapy group vs 81.8% in dual therapy group.",
          "Cognitive & Alertness Improvement: 82.5% of monotherapy patients reported subjective cognitive recovery."
        ]
      },
      {
        "id": "monotherapy-table",
        "heading": "3. Monotherapy vs Dual Therapy Clinical Comparison",
        "paragraphs": [
          "Key therapeutic outcomes in patients converted to cenobamate monotherapy versus dual therapy:"
        ],
        "table": {
          "headers": [
            "Outcome Measure",
            "Monotherapy Group (N=38)",
            "Dual Therapy Group (N=110)",
            "Overall Cohort (N=148)"
          ],
          "rows": [
            [
              "Mean Cenobamate Daily Dose",
              "225 mg / day",
              "185 mg / day",
              "195 mg / day"
            ],
            [
              "12-Month Retention Rate",
              "92.1%",
              "81.8%",
              "84.5%"
            ],
            [
              "Complete Seizure Freedom",
              "73.7%",
              "35.5%",
              "45.3%"
            ],
            [
              ">= 50% Seizure Reduction",
              "94.7%",
              "69.1%",
              "75.7%"
            ],
            [
              "Adverse Event Incidence",
              "26.3%",
              "49.1%",
              "43.2%"
            ],
            [
              "QOLIE-31 Score Improvement",
              "+14.8 points",
              "+8.2 points",
              "+9.9 points"
            ]
          ]
        }
      },
      {
        "id": "monotherapy-guidance",
        "heading": "4. Stepwise Deprescribing Protocol",
        "paragraphs": [
          "Conversion to monotherapy should be initiated once the patient achieves stable seizure control on cenobamate (typically >=6 months at maintenance dose).",
          "Deprescribing should proceed one drug at a time: taper sedating GABAergic agents and sodium channel blockers first, reducing by 20\u201325% every 3\u20134 weeks with clinical monitoring."
        ]
      }
    ]
  },
  {
    "id": 4,
    "slug": "launch-deck-phase-iii-lte-post-hoc",
    "title": "Launch Deck: Phase III LTE Post-Hoc Analysis \u2014 Long-Term Efficacy for Uncontrolled Focal Seizures",
    "deck_name": "LAUNCH DECK - PHASE III LTE POST-HOC",
    "category": "Phase III Clinical Trials & Efficacy",
    "summary": "Long-term open-label extension post-hoc analysis of 1,340 patients from Study C021. Demonstrates 80.2% median seizure reduction during months 13\u201324, with 21.1% achieving consecutive 12-month zero seizures.",
    "published_at": "2021-09-25",
    "reading_time": "9 min read",
    "author": "Michael R. Sperling, Pavel Klein, Gregory Krauss, et al. (Epilepsia, 2021)",
    "pdf_url": "/PDF/LAUNCH DECK - PHASE III LTE POST-HOC.pdf",
    "pdf_name": "LAUNCH DECK - PHASE III LTE POST-HOC.pdf",
        "thumbnail_url": "/thumbnails/launch-deck-phase-iii-lte-post-hoc.png",
    "slide_images": ["/slides/launch-deck-phase-iii-lte-post-hoc/page-1.png", "/slides/launch-deck-phase-iii-lte-post-hoc/page-2.png", "/slides/launch-deck-phase-iii-lte-post-hoc/page-3.png", "/slides/launch-deck-phase-iii-lte-post-hoc/page-4.png"],
    "pdf_pages": 11,
    "sections": [
      {
        "id": "lte-background",
        "heading": "1. Longitudinal Clinical Trial Protocol",
        "paragraphs": [
          "Study C021 was a large, multicenter, open-label Phase 3 safety and efficacy extension study. Patients had uncontrolled focal seizures despite concurrent treatment with 1 to 3 ASMs. The primary objective of this post-hoc analysis was to quantify longitudinal efficacy across up to 36 months of continuous therapy.",
          "Dosing followed the standardized start-low go-slow titration protocol to a target maintenance dose of 200\u2013400 mg/day."
        ]
      },
      {
        "id": "long-term-efficacy",
        "heading": "2. High Sustained Responder Rates Across Multi-Year Follow-up",
        "paragraphs": [
          "Among 1,340 evaluable patients, median percent reduction in monthly focal seizure frequency was 65.4% during months 1\u20136, increasing to 75.8% during months 7\u201312, and 80.2% during months 13\u201324.",
          "Sustained 100% seizure freedom for consecutive 12-month periods was achieved in 21.1% of patients, and >=75% reduction was documented in 48.2% of patients during maintenance."
        ],
        "bullet_points": [
          "Median Seizure Reduction: 80.2% median reduction observed during months 13\u201324 of maintenance.",
          "100% Seizure Freedom (Consecutive 12 Months): 21.1% achieved sustained zero seizures.",
          "Retention Rate at Year 1: 83.2% of patients remained on therapy.",
          "Retention Rate at Year 2: 76.5% long-term persistence, reflecting excellent durability."
        ]
      },
      {
        "id": "lte-matrix",
        "heading": "3. Multi-Year Seizure Reduction Matrix",
        "paragraphs": [
          "Longitudinal seizure response rates over 36 months of open-label cenobamate therapy:"
        ],
        "table": {
          "headers": [
            "Follow-up Period",
            "Evaluable Patients (N)",
            "Median % Reduction",
            ">=50% Responders",
            ">=75% Responders",
            "100% Seizure Freedom"
          ],
          "rows": [
            [
              "Months 1\u20136",
              "1,298",
              "65.4%",
              "62.4%",
              "39.1%",
              "15.8%"
            ],
            [
              "Months 7\u201312",
              "1,114",
              "75.8%",
              "71.2%",
              "51.4%",
              "22.3%"
            ],
            [
              "Months 13\u201324",
              "986",
              "80.2%",
              "74.8%",
              "56.2%",
              "27.5%"
            ],
            [
              "Months 25\u201336",
              "824",
              "84.5%",
              "77.6%",
              "61.0%",
              "31.2%"
            ]
          ]
        }
      },
      {
        "id": "durability-takeaway",
        "heading": "4. Clinical Durability Conclusions",
        "paragraphs": [
          "Unlike many antiseizure medications that demonstrate tolerance or honeymoon loss of efficacy over time, cenobamate demonstrated progressive deepening of seizure reduction throughout 3 years of therapy.",
          "Retention remained exceptionally high (>75% at 2 years), underscoring that therapeutic efficacy is maintained without tolerance emergence."
        ]
      }
    ]
  },
  {
    "id": 5,
    "slug": "launch-deck-phase-iii-lte-safety-study",
    "title": "Launch Deck: Phase III LTE Safety Study \u2014 Large Multicenter Open-Label Trial (Zero DRESS Cases)",
    "deck_name": "LAUNCH DECK - PHASE III LTE",
    "category": "Phase III Clinical Trials & Efficacy",
    "summary": "Pivotal Phase 3 multicenter safety study (Study C021) in 1,340 patients across 107 global sites. Validates the bi-weekly start-low go-slow titration protocol, demonstrating zero cases of DRESS (0.0%, 95% CI: 0\u20130.28%).",
    "published_at": "2020-04-15",
    "reading_time": "8 min read",
    "author": "Michael R. Sperling, Pavel Klein, Christian Brandt, et al. (Epilepsia, 2020)",
    "pdf_url": "/PDF/LAUNCH DECK - PHASE III LTE.pdf",
    "pdf_name": "LAUNCH DECK - PHASE III LTE.pdf",
        "thumbnail_url": "/thumbnails/launch-deck-phase-iii-lte.png",
    "slide_images": ["/slides/launch-deck-phase-iii-lte/page-1.png", "/slides/launch-deck-phase-iii-lte/page-2.png", "/slides/launch-deck-phase-iii-lte/page-3.png", "/slides/launch-deck-phase-iii-lte/page-4.png"],
    "pdf_pages": 10,
    "sections": [
      {
        "id": "safety-study-rationale",
        "heading": "1. Study Design & DRESS Mitigation Protocol",
        "paragraphs": [
          "Early clinical development of cenobamate revealed rare cases of Drug Reaction with Eosinophilia and Systemic Symptoms (DRESS) when titrated rapidly. Study C021 was prospectively designed to investigate whether a 'start-low, go-slow' titration protocol could mitigate DRESS risk.",
          "A total of 1,340 adult patients across 107 international sites were enrolled. Dosing initiated at 12.5 mg/day and was increased by 12.5\u201350 mg increments every 2 weeks to target maintenance doses of 200, 300, or 400 mg/day."
        ]
      },
      {
        "id": "safety-outcomes",
        "heading": "2. Primary Safety Endpoint: Zero DRESS Cases",
        "paragraphs": [
          "Among 1,340 treated patients with 2,423 person-years of exposure, zero cases of DRESS were observed (0%, 95% CI: 0\u20130.28%). This conclusively validated the hypothesis that slow bi-weekly titration effectively mitigates severe immune-mediated cutaneous adverse reactions.",
          "Overall, 87.2% of patients experienced at least one treatment-emergent adverse event (TEAE), the vast majority of which were central nervous system related and mild or moderate in severity."
        ],
        "bullet_points": [
          "Primary Endpoint: Zero cases of DRESS observed among 1,340 patients (0.0%).",
          "Total Exposure: 2,423 patient-years of longitudinal safety data documented.",
          "Discontinuation Due to Adverse Events: 13.9% overall across multi-year extension.",
          "Target Dose Distribution: 59.8% stabilized at 200 mg/day; 28.4% at 300\u2013400 mg/day."
        ]
      },
      {
        "id": "safety-table",
        "heading": "3. Most Frequent Treatment-Emergent Adverse Events",
        "paragraphs": [
          "Incidence of treatment-emergent adverse events occurring in >=5% of patients:"
        ],
        "table": {
          "headers": [
            "Adverse Event (Preferred Term)",
            "All Treated Patients (N=1,340)",
            "% Patients",
            "Severity (Mild / Moderate)",
            "Discontinuation Rate"
          ],
          "rows": [
            [
              "Somnolence",
              "414",
              "30.9%",
              "94.2%",
              "2.1%"
            ],
            [
              "Dizziness",
              "398",
              "29.7%",
              "92.5%",
              "2.8%"
            ],
            [
              "Fatigue",
              "256",
              "19.1%",
              "95.7%",
              "1.3%"
            ],
            [
              "Headache",
              "248",
              "18.5%",
              "96.4%",
              "0.9%"
            ],
            [
              "Diplopia / Visual Disturbance",
              "168",
              "12.5%",
              "91.1%",
              "1.6%"
            ],
            [
              "Gait Ataxia",
              "142",
              "10.6%",
              "88.7%",
              "1.8%"
            ]
          ]
        }
      },
      {
        "id": "safety-takeaway",
        "heading": "4. Prescribing Safety Conclusions",
        "paragraphs": [
          "The start-low, go-slow titration protocol is mandatory for all patients initiating cenobamate. Healthcare providers must follow the recommended 12.5 mg/day start and 2-week step increments.",
          "Most CNS-related side effects (somnolence, dizziness) can be prevented or managed by anticipatory reduction of concomitant ASMs, particularly clobazam and sodium channel modulators."
        ]
      }
    ]
  },
  {
    "id": 6,
    "slug": "launch-deck-rwe-german-comparative-kork-study",
    "title": "Launch Deck: RWE German Comparative \u2014 The Cenobamate KORK Study (Comparison vs Other ASMs)",
    "deck_name": "LAUNCH DECK - RWE - GERMAN - COMPARATIVE",
    "category": "Real-World Evidence (RWE)",
    "summary": "Prospective observational cohort study (KORK Study) from Kork Epilepsy Center in Germany evaluating 211 consecutive refractory patients (median 8 prior ASMs failed). Compares cenobamate directly against brivaracetam, eslicarbazepine, lacosamide, and perampanel.",
    "published_at": "2024-05-30",
    "reading_time": "8 min read",
    "author": "Bernhard J. Steinhoff, Christian Brandt, et al. (Epilepsia Open, 2024)",
    "pdf_url": "/PDF/LAUNCH DECK - RWE - GERMAN - COMPARATIVE.pdf",
    "pdf_name": "LAUNCH DECK - RWE - GERMAN - COMPARATIVE.pdf",
        "thumbnail_url": "/thumbnails/launch-deck-rwe-german-comparative.png",
    "slide_images": ["/slides/launch-deck-rwe-german-comparative/page-1.png", "/slides/launch-deck-rwe-german-comparative/page-2.png", "/slides/launch-deck-rwe-german-comparative/page-3.png", "/slides/launch-deck-rwe-german-comparative/page-4.png"],
    "pdf_pages": 13,
    "sections": [
      {
        "id": "kork-cohort",
        "heading": "1. Patient Demographics & Refractoriness Profile",
        "paragraphs": [
          "The KORK study prospectively evaluated cenobamate in 211 consecutive patients treated at the specialized Kork Epilepsy Center in Kehl-Kork, Germany. This cohort represented an exceptionally treatment-resistant population, having previously failed a median of 8 antiseizure medications.",
          "Baseline seizure frequency was high, with a median of 14.5 focal seizures per month, and 42.6% had concurrent structural brain lesions."
        ]
      },
      {
        "id": "kork-comparative-findings",
        "heading": "2. Comparative Efficacy vs Historical ASM Cohorts",
        "paragraphs": [
          "Cenobamate demonstrated superior efficacy compared to historical cohorts of other modern third-generation ASMs (brivaracetam, eslicarbazepine acetate, lacosamide, perampanel) evaluated in identical clinical protocols at the same center.",
          "At 6 months, >=50% responder rate was 53.6%, and 1-year retention was 76.8%. Notably, 17.5% achieved complete 6-month seizure freedom despite prior failure of >=8 ASMs."
        ],
        "bullet_points": [
          "Median Prior Failed ASMs: 8 prior medications (range 3\u201318).",
          ">=50% Responder Rate: 53.6% at 6 months; 58.2% at 12 months.",
          "Complete Seizure Freedom: 17.5% in ultra-refractory institutional cohort.",
          "Retention Rate at 12 Months: 76.8%, significantly higher than historical cohorts."
        ]
      },
      {
        "id": "kork-comparison-table",
        "heading": "3. KORK Cross-Cohort Efficacy Comparison",
        "paragraphs": [
          "Real-world clinical outcomes of cenobamate versus historical ASM cohorts at the Kork Epilepsy Center:"
        ],
        "table": {
          "headers": [
            "Antiseizure Medication",
            "Cohort Size (N)",
            "Median Prior Failed ASMs",
            "12-Month Retention Rate",
            ">=50% Responder Rate",
            "Seizure Freedom Rate"
          ],
          "rows": [
            [
              "Cenobamate (CNB)",
              "211",
              "8.0",
              "76.8%",
              "58.2%",
              "17.5%"
            ],
            [
              "Brivaracetam (BRV)",
              "185",
              "7.5",
              "54.1%",
              "32.4%",
              "6.5%"
            ],
            [
              "Perampanel (PER)",
              "192",
              "7.0",
              "48.4%",
              "34.4%",
              "5.7%"
            ],
            [
              "Lacosamide (LCM)",
              "204",
              "6.5",
              "56.9%",
              "38.2%",
              "7.8%"
            ],
            [
              "Eslicarbazepine (ESL)",
              "160",
              "6.0",
              "52.5%",
              "35.0%",
              "5.6%"
            ]
          ]
        }
      },
      {
        "id": "kork-takeaway",
        "heading": "4. Tertiary Center Practice Insights",
        "paragraphs": [
          "The KORK study demonstrates that even in ultra-refractory patients with long-standing epilepsy and multiple prior ASM failures, cenobamate provides clinically meaningful seizure reduction and seizure freedom rates previously unattainable.",
          "Careful management of concomitant medications\u2014particularly reducing clobazam when somnolence appears\u2014is critical for achieving optimal retention."
        ]
      }
    ]
  },
  {
    "id": 7,
    "slug": "launch-deck-rwe-comparative-vs-other-asms",
    "title": "Launch Deck: RWE Comparative vs Other ASMs \u2014 Early Adjunctive Treatment in Drug-Resistant Focal Seizures",
    "deck_name": "LAUNCH DECK - RWE COMPARATIVE vs OTHER ASMs",
    "category": "Real-World Evidence (RWE)",
    "summary": "German multicenter observational cohort study (N=312) in CNS Drugs evaluating clinical efficacy and quality of life when cenobamate is prescribed early (lines 2\u20133) vs late (lines 4+). Shows 81.3% responder rate in early adjunctive use.",
    "published_at": "2024-08-03",
    "reading_time": "7 min read",
    "author": "Yaroslav Winter, Raya Abou Dargham, Susana Pati\u00f1o Tob\u00f3n, et al. (CNS Drugs, 2024)",
    "pdf_url": "/PDF/LAUNCH DECK - RWE COMPARATIVE vs OTHER ASMs.pdf",
    "pdf_name": "LAUNCH DECK - RWE COMPARATIVE vs OTHER ASMs.pdf",
        "thumbnail_url": "/thumbnails/launch-deck-rwe-comparative-vs-other-asms.png",
    "slide_images": ["/slides/launch-deck-rwe-comparative-vs-other-asms/page-1.png", "/slides/launch-deck-rwe-comparative-vs-other-asms/page-2.png", "/slides/launch-deck-rwe-comparative-vs-other-asms/page-3.png", "/slides/launch-deck-rwe-comparative-vs-other-asms/page-4.png"],
    "pdf_pages": 10,
    "sections": [
      {
        "id": "cohort-rationale",
        "heading": "1. Research Question & Cohort Design",
        "paragraphs": [
          "International guidelines recommend considering new mechanism-of-action ASMs early in drug-resistant epilepsy. This observational cohort study evaluated 312 patients across German neurological centers to compare clinical outcomes when cenobamate is introduced early (2nd\u20133rd line) versus late (>=4th line).",
          "Outcomes included seizure frequency changes, retention rates, and standardized patient-reported outcome measures (QOLIE-10)."
        ]
      },
      {
        "id": "early-vs-late-outcomes",
        "heading": "2. Clinical Outcomes: Early vs Late Adjunctive Introduction",
        "paragraphs": [
          "Early adjunctive patients demonstrated superior responder rates: 81.3% achieved >=50% seizure reduction compared to 55.4% in the late cohort (p < 0.001).",
          "Complete seizure freedom was reached by 45.8% of early patients versus 18.2% of late patients. Furthermore, early patients achieved therapeutic stabilization at lower daily doses (median 150 mg/day vs 250 mg/day, p = 0.008)."
        ],
        "bullet_points": [
          "Early Cohort (Lines 2\u20133, N=96): 81.3% >=50% responders; 45.8% seizure free.",
          "Late Cohort (Lines 4+, N=216): 55.4% >=50% responders; 18.2% seizure free.",
          "Mean Daily Maintenance Dose: 150 mg/day (early) vs 250 mg/day (late).",
          "Quality of Life (QOLIE-10): Statistically significant improvement in 74.2% of early cohort."
        ]
      },
      {
        "id": "early-rwe-table",
        "heading": "3. Comparative Clinical Summary Table",
        "paragraphs": [
          "Direct outcome comparison between early and late adjunctive introduction of cenobamate:"
        ],
        "table": {
          "headers": [
            "Clinical Outcome",
            "Early Adjunctive (2nd\u20133rd Line, N=96)",
            "Late Adjunctive (>=4th Line, N=216)",
            "Relative Risk / Difference",
            "p-Value"
          ],
          "rows": [
            [
              ">= 50% Seizure Reduction",
              "81.3%",
              "55.4%",
              "RR: 1.47 (1.26\u20131.71)",
              "p < 0.001"
            ],
            [
              ">= 75% Seizure Reduction",
              "64.6%",
              "38.0%",
              "RR: 1.70 (1.35\u20132.14)",
              "p < 0.001"
            ],
            [
              "Complete Seizure Freedom",
              "45.8%",
              "18.2%",
              "RR: 2.52 (1.75\u20133.62)",
              "p < 0.001"
            ],
            [
              "12-Month Retention Rate",
              "88.5%",
              "75.0%",
              "Difference: +13.5%",
              "p = 0.007"
            ],
            [
              "Discontinuation for Toxicity",
              "7.3%",
              "16.2%",
              "RR: 0.45 (0.21\u20130.96)",
              "p = 0.035"
            ]
          ]
        }
      },
      {
        "id": "practice-recommendation",
        "heading": "4. Clinical Guideline Impact",
        "paragraphs": [
          "These findings strongly argue against delaying cenobamate introduction until late refractory stages. Initiating cenobamate as a second- or third-line treatment substantially increases seizure freedom and reduces long-term drug toxicity.",
          "Patients require lower doses when treated early, further improving tolerability and reducing polytherapy complexity."
        ]
      }
    ]
  },
  {
    "id": 8,
    "slug": "launch-deck-ultra-refractory-fos",
    "title": "Launch Deck: Ultra-Refractory FOS \u2014 Danish Epilepsy Centre Results (Add-On in Extreme Refractoriness)",
    "deck_name": "LAUNCH DECK - ULTRA-REFRACTORY FOS",
    "category": "Real-World Evidence (RWE)",
    "summary": "Real-world study in Neurological Sciences (2025) of 104 ultra-refractory epilepsy patients failing a median of 9 prior ASMs and surgery/VNS. Achieved 61.5% responder rate and 15.4% seizure freedom.",
    "published_at": "2025-04-15",
    "reading_time": "7 min read",
    "author": "Cathrine E. Gjerulfsen, Stefan Juhl, Guido Rubboli, et al. (Danish Epilepsy Centre)",
    "pdf_url": "/PDF/LAUNCH DECK - ULTRA-REFRACTORY FOS.pdf",
    "pdf_name": "LAUNCH DECK - ULTRA-REFRACTORY FOS.pdf",
        "thumbnail_url": "/thumbnails/launch-deck-ultra-refractory-fos.png",
    "slide_images": ["/slides/launch-deck-ultra-refractory-fos/page-1.png", "/slides/launch-deck-ultra-refractory-fos/page-2.png", "/slides/launch-deck-ultra-refractory-fos/page-3.png", "/slides/launch-deck-ultra-refractory-fos/page-4.png"],
    "pdf_pages": 10,
    "sections": [
      {
        "id": "danish-cohort",
        "heading": "1. Ultra-Refractory Patient Population",
        "paragraphs": [
          "This study evaluated real-world outcomes at the Danish National Tertiary Epilepsy Centre (Filadelfia, Dianalund, Denmark) in 104 consecutive adult patients with severe, drug-resistant focal epilepsy.",
          "The population represented an extreme tier of clinical refractoriness: median disease duration was 28 years, median prior ASMs failed was 9 (range 3\u201321), and 38.5% had previously undergone resective epilepsy surgery or vagus nerve stimulation (VNS)."
        ]
      },
      {
        "id": "danish-results",
        "heading": "2. Efficacy in Patients with Prior Surgery & VNS",
        "paragraphs": [
          "Despite extreme baseline refractoriness, 61.5% of patients achieved >=50% seizure reduction at 6 months, and 47.1% achieved >=75% reduction.",
          "Complete seizure freedom was maintained in 15.4% of patients. Notably, response rates were equivalent among patients who had failed prior epilepsy surgery compared to surgery-naive patients."
        ],
        "bullet_points": [
          "Median Prior Failed ASMs: 9.0 (range 3\u201321).",
          "Prior Surgery or VNS: 38.5% of cohort.",
          ">=50% Responder Rate: 61.5% at 6 months; 57.7% at 12 months.",
          "Complete Seizure Freedom: 15.4% sustained throughout 1-year follow-up.",
          "1-Year Retention Rate: 72.1% in tertiary referral cohort."
        ]
      },
      {
        "id": "danish-table",
        "heading": "3. Seizure Reduction Matrix by Subgroup",
        "paragraphs": [
          "Treatment response across specific difficult-to-treat subgroups in the Danish cohort:"
        ],
        "table": {
          "headers": [
            "Patient Subgroup",
            "Subgroup Count (N)",
            ">=50% Responder Rate",
            "100% Seizure Freedom",
            "12-Month Retention"
          ],
          "rows": [
            [
              "Overall Ultra-Refractory Cohort",
              "104",
              "61.5%",
              "15.4%",
              "72.1%"
            ],
            [
              "Failed Prior Resective Surgery",
              "26",
              "57.7%",
              "15.4%",
              "69.2%"
            ],
            [
              "Active Vagus Nerve Stimulation (VNS)",
              "24",
              "62.5%",
              "12.5%",
              "70.8%"
            ],
            [
              "Focal to Bilateral Tonic-Clonic (FBTC)",
              "68",
              "67.6%",
              "20.6%",
              "76.5%"
            ],
            [
              "Baseline >=15 Seizures / Month",
              "45",
              "57.8%",
              "11.1%",
              "68.9%"
            ]
          ]
        }
      },
      {
        "id": "danish-takeaway",
        "heading": "4. Tertiary Center Conclusions",
        "paragraphs": [
          "Cenobamate offers high clinical utility even in patients who have exhausted traditional surgical and neuromodulatory interventions.",
          "Significant reduction in focal to bilateral tonic-clonic seizures was particularly pronounced, which carries vital clinical implications for reducing SUDEP risk."
        ]
      }
    ]
  },
  {
    "id": 9,
    "slug": "reduce-1-asm-spanish-consensus",
    "title": "Spanish Consensus: Reduce 1 ASM \u2014 Management of Concomitant ASMs When Using Cenobamate",
    "deck_name": "REDUCE 1 ASM SPANISH CONSENSUS",
    "category": "Monotherapy & Concomitant ASM Deprescribing",
    "summary": "Expert Delphi consensus by the Spanish Epilepsy Society (SEEP) providing clinical algorithms for proactive tapering of clobazam (by 25\u201350%) and sodium channel blockers during cenobamate titration.",
    "published_at": "2024-03-24",
    "reading_time": "8 min read",
    "author": "Mar Carre\u00f1o, Antonio Gil-Nagel, Jos\u00e9 M. Serratosa, Manuel Toledo, et al. (Epilepsia Open, 2024)",
    "pdf_url": "/PDF/REDUCE 1 ASM SPANISH CONSENSUS.pdf",
    "pdf_name": "REDUCE 1 ASM SPANISH CONSENSUS.pdf",
        "thumbnail_url": "/thumbnails/reduce-1-asm-spanish-consensus.png",
    "slide_images": ["/slides/reduce-1-asm-spanish-consensus/page-1.png", "/slides/reduce-1-asm-spanish-consensus/page-2.png", "/slides/reduce-1-asm-spanish-consensus/page-3.png", "/slides/reduce-1-asm-spanish-consensus/page-4.png"],
    "pdf_pages": 8,
    "sections": [
      {
        "id": "consensus-rationale",
        "heading": "1. Pharmacokinetic Rationale for Concomitant ASM Adjustment",
        "paragraphs": [
          "Cenobamate is both an inhibitor and inducer of key cytochrome P450 enzymes. It inhibits CYP2C19 (increasing serum levels of active metabolites like N-desmethylclobazam by up to 2- to 3-fold) and mildly induces CYP3A4.",
          "Additionally, pharmacodynamic synergy with sodium channel blockers (carbamazepine, lacosamide, lamotrigine) can precipitate neurotoxic symptoms (ataxia, diplopia, dizziness) unless baseline doses are proactively adjusted."
        ]
      },
      {
        "id": "consensus-recommendations",
        "heading": "2. Expert Delphi Consensus Recommendations",
        "paragraphs": [
          "The Spanish Consensus panel formulated actionable clinical algorithms for dose reductions of concomitant ASMs during cenobamate titration to preserve tolerability and maintain compliance.",
          "Clobazam dose should be reduced by 25\u201350% at the 50 mg or 100 mg/day cenobamate titration step, or immediately upon appearance of daytime somnolence."
        ],
        "bullet_points": [
          "Clobazam Reduction: Reduce daily dose by 25\u201350% when cenobamate reaches 50\u2013100 mg/day.",
          "Sodium Channel Blockers: Taper carbamazepine, lacosamide, or lamotrigine by 20\u201330% if dizziness/ataxia occurs.",
          "Avoid Polypharmacy Stacking: Limit concomitant sodium channel modulators to a maximum of 1 agent.",
          "Target Monotherapy Goal: 76.5% consensus that simplifying to monotherapy should be attempted once seizure free."
        ]
      },
      {
        "id": "consensus-table",
        "heading": "3. Concomitant ASM Management & Tapering Matrix",
        "paragraphs": [
          "Standardized clinical adjustment protocols established by the Spanish Consensus:"
        ],
        "table": {
          "headers": [
            "Concomitant ASM",
            "Interaction Mechanism",
            "Timing of Adjustment",
            "Recommended Dose Modification",
            "Clinical Monitoring Parameter"
          ],
          "rows": [
            [
              "Clobazam",
              "CYP2C19 inhibition (elevates N-desmethylclobazam)",
              "At 50\u2013100 mg/day cenobamate",
              "Reduce by 25% to 50%",
              "Excessive somnolence, sedation, cognitive slowing"
            ],
            [
              "Lacosamide",
              "Pharmacodynamic sodium channel synergy",
              "At 100\u2013150 mg/day cenobamate",
              "Reduce by 25% to 50%",
              "Dizziness, PR prolongation, diplopia, ataxia"
            ],
            [
              "Carbamazepine",
              "Pharmacodynamic synergy & CYP3A4 interaction",
              "At 100\u2013200 mg/day cenobamate",
              "Reduce by 25% to 33%",
              "Ataxia, nystagmus, lethargy, diplopia"
            ],
            [
              "Lamotrigine",
              "Complex CYP and glucuronidation interactions",
              "During titration to 150 mg",
              "Monitor serum levels; adjust 20%",
              "Tremor, dizziness, rash surveillance"
            ],
            [
              "Levetiracetam",
              "No major metabolic interaction",
              "Maintenance phase (>6 months)",
              "Taper gradually toward monotherapy",
              "Seizure count and mood stability"
            ]
          ]
        }
      },
      {
        "id": "consensus-takeaway",
        "heading": "4. Clinical Implementation Summary",
        "paragraphs": [
          "Proactive and early reduction of concomitant sedating ASMs is the single most effective strategy to ensure patients successfully navigate the titration window and achieve optimal long-term cenobamate retention.",
          "Healthcare providers should educate patients on anticipated drug interactions and establish early communication checkpoints during weeks 4 through 8."
        ]
      }
    ]
  }
];
