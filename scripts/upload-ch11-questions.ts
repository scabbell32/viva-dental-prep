import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.join(__dirname, '../.env.local') })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY

async function callGemini(prompt: string): Promise<string> {
  const models = [
    'gemini-flash-lite-latest',
    'gemini-flash-latest',
  ]

  for (const model of models) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GOOGLE_API_KEY}`
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: prompt }],
            },
          ],
          generationConfig: {
            responseMimeType: 'application/json',
          },
        }),
      })

      if (response.ok) {
        const data = await response.json()
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text
        if (text) return text
      }
    } catch (err) {
      console.warn(`Model ${model} attempt error, trying next...`)
    }
  }

  throw new Error('All model endpoints failed to return response')
}

const CHAPTER_11_QUESTIONS = [
  {
    num: 1,
    statement: 'Which of the following drugs is used to treat trigeminal neuralgia?',
    options: {
      a: 'Phenytoin',
      b: 'Topiramate',
      c: 'Carbamazepine',
      d: 'Lamotrigine',
    },
    correct_option: 'c',
    explanation:
      'Carbamazepine (Tegretol), an anticonvulsant agent, is the gold standard drug of choice for managing neuropathic pain associated with trigeminal neuralgia (tic douloureux). Phenytoin (A), Topiramate (B), and Lamotrigine (D) are anticonvulsants primarily indicated for seizure disorders, migraine prophylaxis, or bipolar disorder, but carbamazepine remains the established first-line pharmacotherapy for trigeminal neuralgia.',
  },
  {
    num: 2,
    statement: 'All the drugs listed below can cause xerostomia EXCEPT one. What is the EXCEPTION?',
    options: {
      a: 'Amitriptyline',
      b: 'Fluoxetine',
      c: 'Thioridazine',
      d: 'Nortriptyline',
    },
    correct_option: 'b',
    explanation:
      'Fluoxetine (Prozac) is a Selective Serotonin Reuptake Inhibitor (SSRI). Unlike tricyclic antidepressants and typical antipsychotics, SSRIs lack strong muscarinic cholinergic receptor blockade and have significantly lower potential to cause severe anticholinergic xerostomia. In contrast, Amitriptyline (A) and Nortriptyline (D) are tricyclic antidepressants (TCAs), and Thioridazine (C) is a first-generation phenothiazine antipsychotic, all of which exhibit potent anticholinergic activity and frequently cause marked dry mouth.',
  },
  {
    num: 3,
    statement: 'Pregnant patients should not take:',
    options: {
      a: 'Amoxicillin',
      b: 'Erythromycin',
      c: 'Penicillin',
      d: 'Tetracycline',
    },
    correct_option: 'd',
    explanation:
      'Tetracycline is strictly contraindicated in pregnancy (FDA Pregnancy Category D). Tetracyclines cross the placenta and chelate with calcium orthophosphate, depositing directly into calcifying fetal bones and unerupted primary and permanent tooth germ matrices. This causes permanent intrinsic yellow-gray-brown discoloration and enamel hypoplasia in the fetus. Amoxicillin (A), Erythromycin base/stearate (B), and Penicillin VK (C) are safe to administer during pregnancy (Category B). Note: Erythromycin estolate is contraindicated in pregnancy due to maternal cholestatic hepatitis risk.',
  },
  {
    num: 4,
    statement: 'Which antiseizure drug is available as a chewable dose form designed for pediatric patients?',
    options: {
      a: 'Carbamazepine',
      b: 'Topiramate',
      c: 'Levetiracetam',
      d: 'Gabapentin',
    },
    correct_option: 'a',
    explanation:
      'Carbamazepine (Tegretol) is formulated as a chewable tablet specifically for pediatric seizure management. Dental Board Alert: Chewable carbamazepine contains approximately 63% sucrose, placing pediatric patients at substantial risk for rampant dental caries; parents and children must be counseled to rinse thoroughly or brush immediately after chewing.',
  },
  {
    num: 5,
    statement: 'Patients taking metronidazole should avoid:',
    options: {
      a: 'Mouth rinse without alcohol',
      b: 'Caffeine-free beverages',
      c: 'Mouth rinse with alcohol',
      d: 'Sugar-free beverages',
    },
    correct_option: 'c',
    explanation:
      'Metronidazole (Flagyl) inhibits the enzyme aldehyde dehydrogenase, leading to accumulation of toxic acetaldehyde when alcohol is ingested. This triggers a severe disulfiram-like (Antabuse-like) reaction characterized by violent nausea, vomiting, abdominal cramps, throbbing headache, flushing, and tachycardia. Patients must strictly avoid all alcohol-containing products, including mouth rinses containing alcohol and elixirs, during therapy and for at least 48 to 72 hours post-treatment.',
  },
  {
    num: 6,
    statement: 'Which of the following foods can cause significant drug:food interactions?',
    options: {
      a: 'Orange juice',
      b: 'Grapefruit juice',
      c: 'Avocados',
      d: 'Apple juice',
    },
    correct_option: 'b',
    explanation:
      'Grapefruit juice contains furanocoumarins that irreversibly inhibit intestinal Cytochrome P450 3A4 (CYP3A4) enzymes. This significantly diminishes first-pass metabolism, leading to dangerously elevated serum concentrations of CYP3A4 substrate drugs such as calcium channel blockers (nifedipine), statins (lovastatin, atorvastatin, simvastatin), and benzodiazepines (triazolam, midazolam).',
  },
  {
    num: 7,
    statement: 'Which drug is associated with photosensitivity?',
    options: {
      a: 'Amoxicillin',
      b: 'Phenytoin',
      c: 'Aspirin',
      d: 'Tetracycline',
    },
    correct_option: 'd',
    explanation:
      'Tetracyclines (including doxycycline and minocycline) absorb ultraviolet (UV) radiation and generate reactive oxygen species in the skin, causing marked cutaneous phototoxicity and exaggerated sunburn reactions upon minimal sunlight exposure. Patients taking tetracyclines should be counseled to wear sunscreen and protective clothing.',
  },
  {
    num: 8,
    statement: 'Which drug is a common angiotensin-converting enzyme inhibitor?',
    options: {
      a: 'Propranolol',
      b: 'Losartan',
      c: 'Enalapril',
      d: 'Nifedipine',
    },
    correct_option: 'c',
    explanation:
      'Enalapril (Vasotec) is an Angiotensin-Converting Enzyme (ACE) inhibitor (generic drug names ending in "-pril"). ACE inhibitors block the conversion of angiotensin I to the potent vasoconstrictor angiotensin II and prevent bradykinin degradation (which can lead to a dry, nonproductive hacking cough in ~10-20% of patients). Propranolol (A) is a nonselective beta-blocker, Losartan (B) is an Angiotensin Receptor Blocker (ARB), and Nifedipine (D) is a calcium channel blocker.',
  },
  {
    num: 9,
    statement: 'Aripiprazole (Abilify) is used to treat all the following EXCEPT one. What is the EXCEPTION?',
    options: {
      a: 'Schizophrenia',
      b: 'Treatment-resistant depression',
      c: 'Anxiety',
      d: 'Bipolar disorder',
    },
    correct_option: 'c',
    explanation:
      'Aripiprazole (Abilify) is an atypical (second-generation) antipsychotic functioning as a partial D2 dopamine and 5-HT1A serotonin agonist. It is FDA-approved for the management of schizophrenia (A), adjunctive therapy for major depressive disorder / treatment-resistant depression (B), and bipolar I disorder / acute mania (D). It is not an FDA-approved indication for generalized anxiety disorder.',
  },
  {
    num: 10,
    statement: 'Which drug is a common HMG-CoA reductase inhibitor?',
    options: {
      a: 'Ezetimibe',
      b: 'Lovastatin',
      c: 'Alirocumab',
      d: 'Colestipol',
    },
    correct_option: 'b',
    explanation:
      'Lovastatin (Mevacor) is an HMG-CoA reductase inhibitor ("statin") that competitively inhibits the rate-limiting enzyme in hepatic cholesterol biosynthesis. Ezetimibe (A) is a cholesterol absorption inhibitor. Alirocumab (C) is a PCSK9 inhibitor monoclonal antibody. Colestipol (D) is a bile acid sequestrant.',
  },
  {
    num: 11,
    statement: 'Which drug is a common calcium channel blocker?',
    options: {
      a: 'Enalapril',
      b: 'Nifedipine',
      c: 'Candesartan',
      d: 'Amiloride',
    },
    correct_option: 'b',
    explanation:
      'Nifedipine (Procardia) is a dihydropyridine calcium channel blocker (CCB). High-yield board alert: CCBs (nifedipine, amlodipine, diltiazem, verapamil) inhibit calcium influx into vascular smooth muscle and cardiac cells, but frequently induce drug-induced gingival enlargement (hyperplasia). Enalapril (A) is an ACE inhibitor, Candesartan (C) is an ARB, and Amiloride (D) is a potassium-sparing diuretic.',
  },
  {
    num: 12,
    statement: 'The combination of clarithromycin/amoxicillin or metronidazole/esomeprazole is used to treat:',
    options: {
      a: 'GERD',
      b: 'Treatment-resistant strep throat',
      c: 'Peptic ulcer disease',
      d: 'Treatment-resistant pneumonia',
    },
    correct_option: 'c',
    explanation:
      'Peptic ulcer disease caused by Helicobacter pylori bacterial infection is treated with combination triple therapy: a proton pump inhibitor (such as esomeprazole or omeprazole) combined with two antibiotics (clarithromycin plus amoxicillin, or metronidazole in penicillin-allergic patients) to eradicate the bacteria and promote mucosal healing.',
  },
  {
    num: 13,
    statement: 'Which drug is a second-generation antipsychotic drug?',
    options: {
      a: 'Fluoxetine',
      b: 'Promethazine',
      c: 'Fluphenazine',
      d: 'Risperidone',
    },
    correct_option: 'd',
    explanation:
      'Risperidone (Risperdal) is a second-generation (atypical) antipsychotic drug that antagonizes both serotonin (5-HT2A) and dopamine (D2) receptors, causing fewer extrapyramidal symptoms than first-generation drugs. Fluoxetine (A) is an SSRI antidepressant. Promethazine (B) is a phenothiazine antihistamine/antiemetic. Fluphenazine (C) is a first-generation (typical) high-potency phenothiazine antipsychotic.',
  },
  {
    num: 14,
    statement: 'All the following are side effects of antipsychotic drugs EXCEPT one. What is the EXCEPTION?',
    options: {
      a: 'Acute dystonic reactions',
      b: 'Sialorrhea',
      c: 'Akathisia',
      d: 'Parkinsonian symptoms',
    },
    correct_option: 'b',
    explanation:
      'Antipsychotic medications block dopamine receptors in the basal ganglia, leading to Extrapyramidal Symptoms (EPS) such as acute dystonia (spasms of tongue, face, and neck), akathisia (motor restlessness), and pseudoparkinsonism (tremors, rigidity). Due to concurrent muscarinic anticholinergic receptor blockade, antipsychotics cause xerostomia (dry mouth), NOT sialorrhea (excessive salivation).',
  },
  {
    num: 15,
    statement: 'Patients taking calcium channel blocking drugs are at risk for developing:',
    options: {
      a: 'Xerostomia',
      b: 'Gingival hyperplasia',
      c: 'Glossitis',
      d: 'Sedation',
    },
    correct_option: 'b',
    explanation:
      'Gingival hyperplasia (drug-induced gingival enlargement) is a well-documented adverse effect of calcium channel blockers (such as nifedipine, amlodipine, and verapamil). The enlargement begins in the interdental papillae and can cover the crowns of teeth if oral hygiene is poor. The other two major drug classes causing gingival hyperplasia are anticonvulsants (phenytoin) and immunosuppressants (cyclosporine).',
  },
  {
    num: 16,
    statement: 'Patients taking daily aspirin therapy to minimize the risk of an additional myocardial infarction or stroke can experience:',
    options: {
      a: 'Increased bleeding during scaling and planing',
      b: 'Decreased bleeding during scaling and planing',
      c: 'Xerostomia',
      d: 'Sialorrhea',
    },
    correct_option: 'a',
    explanation:
      'Aspirin (acetylsalicylic acid) irreversibly inhibits platelet cyclooxygenase-1 (COX-1), preventing the synthesis of thromboxane A2 (TXA2) for the entire lifespan of the platelet (7-10 days). This irreversibly impairs platelet aggregation and prolongs bleeding time, manifesting as increased bleeding during dental scaling and root planing.',
  },
  {
    num: 17,
    statement: 'Which drug is a common beta-blocker drug?',
    options: {
      a: 'Enalapril',
      b: 'Spironolactone',
      c: 'Metoprolol',
      d: 'Prazosin',
    },
    correct_option: 'c',
    explanation:
      'Metoprolol (Lopressor, Toprol-XL) is a cardioselective beta-1 adrenergic receptor blocker (generic names ending in "-olol"). Enalapril (A) is an ACE inhibitor, Spironolactone (B) is an aldosterone antagonist potassium-sparing diuretic, and Prazosin (D) is an alpha-1 blocker.',
  },
  {
    num: 18,
    statement: 'All the following drugs are used to alter blood coagulation EXCEPT one. What is the EXCEPTION?',
    options: {
      a: 'Warfarin',
      b: 'Fenofibrate',
      c: 'Rivaroxaban',
      d: 'Apixaban',
    },
    correct_option: 'b',
    explanation:
      'Fenofibrate (Tricor) is a fibric acid derivative used to lower blood triglyceride and LDL levels; it does not alter the coagulation cascade or platelet function. Warfarin (Coumadin, A) is a vitamin K antagonist, and Rivaroxaban (Xarelto, C) and Apixaban (Eliquis, D) are direct Factor Xa inhibitor anticoagulants.',
  },
  {
    num: 19,
    statement: 'Which drug is used as a rescue inhaler for acute asthma symptoms?',
    options: {
      a: 'Albuterol',
      b: 'Salmeterol',
      c: 'Cromolyn',
      d: 'Flunisolide',
    },
    correct_option: 'a',
    explanation:
      'Albuterol (Ventolin, ProAir) is a Short-Acting Beta-2 Agonist (SABA) with rapid onset of bronchodilation (within 5-15 minutes), making it the first-line emergency rescue inhaler for acute bronchospasm. Salmeterol (B) is a Long-Acting Beta-2 Agonist (LABA) with a slow onset used strictly for maintenance. Cromolyn (C) is a mast-cell stabilizer for long-term prophylaxis. Flunisolide (D) is an inhaled corticosteroid for daily maintenance.',
  },
  {
    num: 20,
    statement: 'Which drug can be safely used in a pregnant woman?',
    options: {
      a: 'Tetracycline',
      b: 'Alprazolam',
      c: 'Amoxicillin',
      d: 'Diazepam',
    },
    correct_option: 'c',
    explanation:
      'Amoxicillin is an FDA Pregnancy Category B antibiotic and is the primary antibiotic of choice for dental infections in pregnant patients. Tetracycline (A) is Category D (causes permanent intrinsic tooth discoloration and bone growth inhibition). Alprazolam (B) and Diazepam (D) are benzodiazepines (Category D/X) associated with teratogenic risks (cleft palate) and neonatal floppy infant syndrome.',
  },
  {
    num: 21,
    statement: 'Patients taking zolpidem (Ambien) for insomnia can experience all the following EXCEPT one. What is the EXCEPTION?',
    options: {
      a: 'Sleep-driving',
      b: 'Sleep-eating',
      c: 'Agitation',
      d: 'Next day sedation',
    },
    correct_option: 'c',
    explanation:
      'Zolpidem (Ambien) is a non-benzodiazepine hypnotic that binds selectively to the alpha-1 subunit of GABA-A receptors. Known adverse effects include complex parasomnia sleep-related behaviors such as sleep-driving (A), sleep-eating (B), sleep-walking, and next-day residual sedation/grogginess (D). Agitation is not a standard side effect.',
  },
  {
    num: 22,
    statement: 'Which drug irreversibly binds to the proton pump, resulting in acid suppression that lasts more than 24 hours?',
    options: {
      a: 'Famotidine',
      b: 'Esomeprazole',
      c: 'Sucralfate',
      d: 'Magnesium',
    },
    correct_option: 'b',
    explanation:
      'Esomeprazole (Nexium) is a Proton Pump Inhibitor (PPI) that forms covalent disulfide bonds with the H+/K+ ATPase enzyme system in gastric parietal cells, causing irreversible enzyme inactivation and gastric acid suppression lasting >24 hours until new pumps are synthesized. Famotidine (A) is a reversible H2-blocker. Sucralfate (C) forms a protective paste over ulcers. Magnesium (D) is an inorganic antacid.',
  },
  {
    num: 23,
    statement: 'Which drug exerts its antidepressant effect by solely blocking the reuptake of serotonin?',
    options: {
      a: 'Fluoxetine',
      b: 'Venlafaxine',
      c: 'Duloxetine',
      d: 'Amitriptyline',
    },
    correct_option: 'a',
    explanation:
      'Fluoxetine (Prozac) is a Selective Serotonin Reuptake Inhibitor (SSRI) that selectively blocks the serotonin transporter (SERT), solely inhibiting serotonin reuptake without significant norepinephrine uptake inhibition. Venlafaxine (Effexor, B) and Duloxetine (Cymbalta, C) are Serotonin-Norepinephrine Reuptake Inhibitors (SNRIs). Amitriptyline (Elavil, D) is a nonselective tricyclic antidepressant (TCA).',
  },
  {
    num: 24,
    statement: 'Which drug blocks histamine2-receptors in the stomach?',
    options: {
      a: 'Esomeprazole',
      b: 'Magnesium',
      c: 'Famotidine',
      d: 'Aluminum',
    },
    correct_option: 'c',
    explanation:
      'Famotidine (Pepcid) is an H2-receptor antagonist (ending in "-tidine") that competitively blocks histamine2-receptors on gastric parietal cells, decreasing baseline and food-stimulated hydrochloric acid secretion. Esomeprazole (A) is a proton pump inhibitor. Magnesium (B) and Aluminum (D) are neutralizing antacid bases.',
  },
  {
    num: 25,
    statement: 'Which drug is used to treat opioid overdose?',
    options: {
      a: 'Flumazenil',
      b: 'Epinephrine',
      c: 'Diphenhydramine',
      d: 'Naloxone',
    },
    correct_option: 'd',
    explanation:
      'Naloxone (Narcan) is a pure, competitive opioid receptor antagonist (mu, kappa, delta) that rapidly reverses life-threatening opioid-induced respiratory depression, central nervous system depression, and miosis. Flumazenil (Romazicon, A) is a benzodiazepine antagonist. Epinephrine (B) is used for anaphylaxis and cardiac arrest. Diphenhydramine (Benadryl, C) is an H1-antihistamine.',
  },
  {
    num: 26,
    statement: 'Patients taking large doses of acetaminophen for pain should be warned of the risk of:',
    options: {
      a: 'Sedation',
      b: 'Liver toxicity',
      c: 'Gastric bleeding',
      d: 'Ototoxicity',
    },
    correct_option: 'b',
    explanation:
      'Acetaminophen (Tylenol / APAP) hepatotoxicity occurs when excessive doses (>3000–4000 mg/day, or lower in chronic alcohol users) deplete glutathione, leading to accumulation of the toxic reactive intermediate NAPQI (N-acetyl-p-benzoquinone imine), which binds covalent bonds to hepatocytes causing acute liver necrosis. Gastric bleeding (C) is a risk of NSAIDs and aspirin, not acetaminophen. Sedation (A) occurs with opioids. Ototoxicity (D) is associated with aminoglycosides and high-dose aspirin.',
  },
  {
    num: 27,
    statement: 'Patients with renal impairment should avoid the following drugs EXCEPT for one. What is the EXCEPTION?',
    options: {
      a: 'Ibuprofen',
      b: 'Acetaminophen',
      c: 'Naproxen',
      d: 'Meloxicam',
    },
    correct_option: 'b',
    explanation:
      'Acetaminophen is primarily metabolized by hepatic glucuronidation and sulfation and lacks renal prostaglandin inhibitory effects, making it the safest non-opioid analgesic in patients with chronic kidney disease or renal failure. In contrast, NSAIDs (Ibuprofen [A], Naproxen [C], Meloxicam [D]) inhibit renal prostaglandin (PGE2, PGI2) synthesis, causing renal vasoconstriction, acute reduction in GFR, and risk of acute tubular necrosis.',
  },
  {
    num: 28,
    statement: 'Patients using nicotine chewing gum to stop smoking should be counseled about all the following side effects EXCEPT one. What is the EXCEPTION?',
    options: {
      a: 'Jaw ache',
      b: 'The ability of the gum to stick to dental work',
      c: 'Runny nose',
      d: 'Sore mouth',
    },
    correct_option: 'c',
    explanation:
      'Runny nose (rhinorrhea) and nasal irritation are characteristic side effects of nicotine nasal spray, not nicotine gum. Nicotine gum side effects include jaw soreness/ache (A, from improper continuous chewing rather than the recommended "chew and park" technique), sticking to dental restorations/crowns/dentures (B), and sore mouth/throat irritation (D).',
  },
  {
    num: 29,
    statement: 'All the following are side effects of varenicline EXCEPT one. What is the EXCEPTION?',
    options: {
      a: 'Changes in mood and behavior',
      b: 'Sleep problems',
      c: 'Constipation',
      d: 'Diarrhea',
    },
    correct_option: 'd',
    explanation:
      'Varenicline (Chantix) is an alpha-4 beta-2 nicotinic acetylcholine receptor partial agonist for smoking cessation. Documented side effects include neuropsychiatric changes (mood alterations, depression, abnormal/vivid dreams [A, B]), nausea (~30%), flatulence, and constipation (C). Diarrhea is not a characteristic adverse effect of varenicline.',
  },
  {
    num: 30,
    statement: 'Which drug is used to treat dental anxiety?',
    options: {
      a: 'Zolpidem',
      b: 'Alprazolam',
      c: 'Butabarbital',
      d: 'Buspirone',
    },
    correct_option: 'b',
    explanation:
      'Alprazolam (Xanax) is a short-to-intermediate acting benzodiazepine commonly prescribed for oral pre-procedural anxiolysis and conscious sedation in patients with acute dental anxiety. Zolpidem (A) is a hypnotic indicated for insomnia. Butabarbital (C) is an intermediate-acting barbiturate with high abuse and respiratory depression liability. Buspirone (D) requires 2 to 4 weeks of continuous daily administration and cannot be used PRN for acute situational dental anxiety.',
  },
]

async function translateBatch(batch: typeof CHAPTER_11_QUESTIONS): Promise<Record<number, any>> {
  const payload = batch.map((q) => ({
    num: q.num,
    question_text: q.statement,
    option_a: q.options.a,
    option_b: q.options.b,
    option_c: q.options.c,
    option_d: q.options.d,
    explanation: q.explanation,
  }))

  const prompt = `You are an expert translator specializing in dental hygiene board exams (NBDHE). Translate the following array of pharmacology questions, choices, and explanations into professional dental Spanish (used in Latin America and Spain). Preserve pharmacological terms, drug names, and dental clinical accuracy.

Return a valid JSON array of objects matching this exact schema:
[
  {
    "num": 1,
    "question_text_es": "translated question",
    "option_a_es": "translated option A",
    "option_b_es": "translated option B",
    "option_c_es": "translated option C",
    "option_d_es": "translated option D",
    "explanation_es": "translated clinical rationale"
  }
]

Here is the JSON data to translate:
${JSON.stringify(payload, null, 2)}`

  const jsonText = await callGemini(prompt)
  const parsed = JSON.parse(jsonText.trim())
  const dict: Record<number, any> = {}
  for (const item of parsed) {
    dict[item.num] = item
  }
  return dict
}

async function main() {
  console.log('=== Step 1: Cleaning up old/legacy Chapter 11 / Week 6 questions from Supabase ===')

  const { error: delErr } = await supabase
    .from('questions')
    .delete()
    .eq('chapter_tag', 'ch11')

  if (delErr) {
    console.error('Error deleting old ch11 questions:', delErr.message)
    process.exit(1)
  }
  console.log('✅ Old ch11 questions deleted.')

  const { error: delW6Err } = await supabase
    .from('questions')
    .delete()
    .eq('track', 'nbdhe')
    .eq('week_number', 6)

  if (delW6Err) {
    console.warn('Note on deleting week 6:', delW6Err.message)
  } else {
    console.log('✅ Week 6 NBDHE table cleaned up.')
  }

  console.log('\n=== Step 2: Translating 30 questions in 2 batches ===')
  const batch1 = CHAPTER_11_QUESTIONS.slice(0, 15)
  const batch2 = CHAPTER_11_QUESTIONS.slice(15, 30)

  console.log('Translating Batch 1 (Q1 to Q15)...')
  const trans1 = await translateBatch(batch1)
  console.log(`✅ Batch 1 translated: ${Object.keys(trans1).length} questions.`)

  await new Promise((r) => setTimeout(r, 1000))

  console.log('Translating Batch 2 (Q16 to Q30)...')
  const trans2 = await translateBatch(batch2)
  console.log(`✅ Batch 2 translated: ${Object.keys(trans2).length} questions.`)

  const allTranslations = { ...trans1, ...trans2 }

  console.log('\n=== Step 3: Inserting 30 bilingual questions into Supabase ===')
  const rowsToInsert = CHAPTER_11_QUESTIONS.map((q) => {
    const es = allTranslations[q.num] || {}
    return {
      track: 'nbdhe',
      week_number: 6,
      chapter_tag: 'ch11',
      question_text: q.statement,
      option_a: q.options.a,
      option_b: q.options.b,
      option_c: q.options.c,
      option_d: q.options.d,
      correct_option: q.correct_option,
      explanation: q.explanation,
      difficulty: 'medium',
      is_active: true,
      sequence_order: q.num,
      question_text_es: es.question_text_es || null,
      option_a_es: es.option_a_es || null,
      option_b_es: es.option_b_es || null,
      option_c_es: es.option_c_es || null,
      option_d_es: es.option_d_es || null,
      explanation_es: es.explanation_es || null,
    }
  })

  const { data: insData, error: insErr } = await supabase
    .from('questions')
    .insert(rowsToInsert)
    .select('id, sequence_order, question_text, question_text_es, correct_option')

  if (insErr) {
    console.error('❌ Insert failed:', insErr.message)
    process.exit(1)
  }

  console.log(`\n🎉 Successfully inserted ${insData?.length} bilingual questions into Supabase!`)

  // Step 4: Verification
  const { data: checkData, error: checkErr } = await supabase
    .from('questions')
    .select('id, sequence_order, question_text, question_text_es, correct_option')
    .eq('chapter_tag', 'ch11')
    .eq('week_number', 6)
    .order('sequence_order', { ascending: true })

  console.log('\n=== Supabase Verification Report ===')
  console.log(`Total questions in Chapter 11 (Week 6): ${checkData?.length}`)
  console.log('Sample rows:')
  checkData?.slice(0, 5).forEach((row) => {
    console.log(`  [Q${row.sequence_order}] Ans: ${row.correct_option.toUpperCase()}`)
    console.log(`    EN: ${row.question_text}`)
    console.log(`    ES: ${row.question_text_es}`)
  })
}

main()
