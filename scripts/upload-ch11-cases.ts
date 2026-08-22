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
  const models = ['gemini-flash-lite-latest', 'gemini-flash-latest']
  for (const model of models) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GOOGLE_API_KEY}`
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: 'application/json' },
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
  throw new Error('All model endpoints failed')
}

const CASE_A_ID = '55bc23ac-fa69-4f4a-a499-dc3fab1a5afd'
const CASE_B_ID = '8515e4ae-05be-4722-a4c8-b2c48b7eb6df'

const CASE_A_QUESTIONS = [
  {
    num: 1,
    statement: 'Why is the patient advised to eat potassium-rich foods such as bananas or orange juice while taking hydrochlorothiazide (HCTZ)?',
    options: {
      a: 'To increase sodium retention',
      b: 'To accelerate the rate of diuresis',
      c: 'To replenish potassium lost due to thiazide diuretic-induced hypokalemia',
      d: 'To enhance gastrointestinal drug absorption',
    },
    correct_option: 'c',
    explanation: 'Thiazide diuretics (like HCTZ) act on the distal convoluted tubule to inhibit sodium and chloride reabsorption, causing potassium excretion and increasing the risk of hypokalemia. Dietary potassium from orange juice or bananas helps replenish lost potassium.',
  },
  {
    num: 2,
    statement: 'Angiotensin-converting enzyme (ACE) inhibitors tend to increase serum potassium levels, whereas thiazide diuretics increase potassium excretion.',
    options: {
      a: 'Both statements are TRUE.',
      b: 'Both statements are FALSE.',
      c: 'The first statement is TRUE; the second statement is FALSE.',
      d: 'The first statement is FALSE; the second statement is TRUE.',
    },
    correct_option: 'a',
    explanation: 'Both statements are true. ACE inhibitors (like enalapril) reduce aldosterone secretion, leading to potassium retention (hyperkalemia risk), while thiazide diuretics promote potassium wasting (hypokalemia risk). When used in combination, they help balance serum potassium.',
  },
  {
    num: 3,
    statement: 'To prevent orthostatic hypotension in patients taking antihypertensive medications like enalapril/HCTZ, the dental hygienist should:',
    options: {
      a: 'Dismiss the patient immediately after uprighting the chair',
      b: 'Raise the dental chair slowly and have the patient sit upright for several minutes before standing',
      c: 'Administer 100% oxygen prior to standing',
      d: 'Place the patient in Trendelenburg position before standing',
    },
    correct_option: 'b',
    explanation: 'Antihypertensive medications cause orthostatic (postural) hypotension by impairing sympathetic baroreceptor reflexes. Raising the chair slowly and allowing the patient to dangle their legs and establish circulation prevents cerebral hypoperfusion and syncope.',
  },
  {
    num: 4,
    statement: 'Which medication taken by the patient functions as an HMG-CoA reductase inhibitor to lower serum cholesterol?',
    options: {
      a: 'Atorvastatin (Lipitor)',
      b: 'Niacin',
      c: 'Gemfibrozil',
      d: 'Cholestyramine',
    },
    correct_option: 'a',
    explanation: 'Atorvastatin (Lipitor) is an HMG-CoA reductase inhibitor ("statin") that blocks the rate-limiting step of hepatic cholesterol synthesis, lowering LDL cholesterol.',
  },
  {
    num: 5,
    statement: 'Which cholesterol-lowering medication works by binding to bile acids in the intestine to form an insoluble complex excreted in feces?',
    options: {
      a: 'Clofibrate',
      b: 'Ezetimibe',
      c: 'Icosapent ethyl',
      d: 'Cholestyramine',
    },
    correct_option: 'd',
    explanation: 'Cholestyramine is a bile acid sequestrant resin that binds bile acids in the intestine, preventing their enterohepatic reabsorption and forcing the liver to consume LDL cholesterol to synthesize new bile acids.',
  },
  {
    num: 6,
    statement: 'In patients with Type 2 diabetes and hypertension, ACE inhibitors (such as enalapril) are considered first-line agents primarily because they:',
    options: {
      a: 'Directly stimulate insulin release from pancreatic beta cells',
      b: 'Eliminate the risk of hypoglycemia',
      c: 'Retard the progression of diabetic nephropathy and protect renal microvasculature',
      d: 'Prevent all forms of diabetic neuropathy',
    },
    correct_option: 'c',
    explanation: 'ACE inhibitors preferentially dilate efferent renal arterioles, reducing intraglomerular pressure and significantly slowing the progression of diabetic nephropathy, making them the drug of choice in hypertensive diabetic patients.',
  },
  {
    num: 7,
    statement: 'Which of the following newer cholesterol-lowering agents is a monoclonal antibody that functions as a PCSK9 inhibitor?',
    options: {
      a: 'Ticagrelor',
      b: 'Rivaroxaban',
      c: 'Apixaban',
      d: 'Evolocumab (Repatha)',
    },
    correct_option: 'd',
    explanation: 'Evolocumab (Repatha) is a monoclonal antibody PCSK9 inhibitor that prevents degradation of LDL receptors, dramatically increasing LDL clearance from the blood.',
  },
  {
    num: 8,
    statement: 'The biguanide oral antihyperglycemic medication metformin carries a boxed warning for which rare but potentially fatal metabolic complication?',
    options: {
      a: 'Diabetic ketoacidosis',
      b: 'Lactic acidosis',
      c: 'Acute pancreatitis',
      d: 'Thyroid C-cell carcinoma',
    },
    correct_option: 'b',
    explanation: 'Metformin (a biguanide) inhibits hepatic gluconeogenesis and can cause lactic acidosis, particularly in patients with predisposing factors such as renal impairment, alcoholism, binge drinking, or severe hypoxemia.',
  },
  {
    num: 9,
    statement: 'Which protocol is recommended when scheduling dental hygiene appointments for a diabetic patient taking oral antidiabetic medications?',
    options: {
      a: 'Schedule morning appointments shortly after the patient has eaten a normal meal and taken their medication',
      b: 'Instruct the patient to fast for 8 hours before the dental hygiene appointment',
      c: 'Require the patient to bring their laboratory A1C test kit to every appointment',
      d: 'Withhold all oral antidiabetic medications on the morning of dental scaling',
    },
    correct_option: 'a',
    explanation: 'Diabetic patients should be scheduled in the morning, approximately 1.5–2 hours after breakfast and normal medication administration, when blood glucose is most stable, minimizing the risk of hypoglycemia during treatment.',
  },
  {
    num: 10,
    statement: 'The patient is taking semaglutide (Ozempic). Semaglutide belongs to which pharmacological class of antidiabetic agents?',
    options: {
      a: 'Sulfonylurea insulin secretagogue',
      b: 'SGLT2 (Sodium-Glucose Co-transporter 2) inhibitor',
      c: 'GLP-1 (Glucagon-Like Peptide-1) receptor agonist',
      d: 'Thiazolidinedione (TZD) insulin sensitizer',
    },
    correct_option: 'c',
    explanation: 'Semaglutide (Ozempic) is a glucagon-like peptide-1 (GLP-1) receptor agonist that stimulates glucose-dependent insulin secretion, delays gastric emptying, and reduces glucagon release.',
  },
]

const CASE_B_QUESTIONS = [
  {
    num: 1,
    statement: 'The patient complains of a sore throat and dry mouth. Which component of his inhaler therapy is MOST likely contributing to these oral symptoms?',
    options: {
      a: 'Inhaled beta-2 adrenergic agonists and anticholinergics administered via oral metered-dose inhaler',
      b: 'Fexofenadine (Allegra)',
      c: 'Apixaban (Eliquis)',
      d: 'Daily multivitamin',
    },
    correct_option: 'a',
    explanation: 'Inhaled aerosolized beta-adrenergic agonists (albuterol/formoterol) and muscarinic anticholinergics (glycopyrrolate) dry and irritate the pharyngeal and oral mucosa, causing localized irritation, sore throat, and xerostomia.',
  },
  {
    num: 2,
    statement: 'The patient carries an albuterol inhaler. Albuterol is classified as a:',
    options: {
      a: 'Short-acting bronchodilator used for sudden, acute breathing distress',
      b: 'Long-acting maintenance corticosteroid',
      c: 'Mast-cell stabilizer for seasonal allergy prophylaxis',
      d: 'Leukotriene receptor antagonist',
    },
    correct_option: 'a',
    explanation: 'Albuterol is a Short-Acting Beta-2 Agonist (SABA) bronchodilator used for emergency relief of acute bronchospasm and dyspnea in patients with COPD or asthma.',
  },
  {
    num: 3,
    statement: 'The patient presents with white milky discharge/plaques in the oral cavity. What is the MOST likely cause of this finding?',
    options: {
      a: 'Allergic reaction to fexofenadine',
      b: 'Gingival bleeding secondary to apixaban therapy',
      c: 'Vitamin deficiency stomatitis',
      d: 'Oral candidiasis (thrush) secondary to the inhaled corticosteroid component (budesonide)',
    },
    correct_option: 'd',
    explanation: 'Inhaled corticosteroids (budesonide in Breztri) suppress local mucosal cell-mediated immunity, promoting the overgrowth of Candida albicans (pseudomembranous candidiasis/thrush).',
  },
  {
    num: 4,
    statement: 'What crucial home care instruction should the dental hygienist give this patient to prevent recurrent oral candidiasis from his Breztri inhaler?',
    options: {
      a: 'Rinse the mouth thoroughly with water and spit it out (or brush) immediately after every inhaler use',
      b: 'Discontinue the inhaler immediately whenever white spots appear',
      c: 'Swallow a full glass of milk before using the inhaler',
      d: 'Use the inhaler only once per week',
    },
    correct_option: 'a',
    explanation: 'Patients using inhaled corticosteroids must be instructed to rinse their mouth vigorously with water and expectorate (or brush teeth) after each inhalation to remove residual steroid particles from oral tissues, preventing fungal candidiasis.',
  },
  {
    num: 5,
    statement: 'Patients with severe COPD using daily combination inhaled corticosteroids are at an increased risk for which systemic respiratory infection?',
    options: {
      a: 'Streptococcal pharyngitis',
      b: 'Pulmonary embolism',
      c: 'Pneumonia',
      d: 'Acute rhinitis',
    },
    correct_option: 'c',
    explanation: 'High-dose inhaled corticosteroids can locally suppress pulmonary immune defenses, increasing the clinical incidence and susceptibility to pneumonia in elderly patients with COPD.',
  },
  {
    num: 6,
    statement: 'Glycopyrrolate is an active component in the patient\'s Breztri inhaler. What is the pharmacological mechanism of glycopyrrolate?',
    options: {
      a: 'Long-acting muscarinic anticholinergic antagonist (LAMA) that blocks acetylcholine receptors on bronchial smooth muscle',
      b: 'Inhaled corticosteroid that inhibits leukotriene synthesis',
      c: 'Short-acting beta-2 adrenergic agonist that stimulates cyclic AMP',
      d: 'Phosphodiesterase-4 (PDE4) inhibitor',
    },
    correct_option: 'a',
    explanation: 'Glycopyrrolate is a Long-Acting Muscarinic Antagonist (LAMA) that blocks acetylcholine muscarinic (M3) receptors in airway smooth muscle, preventing bronchoconstriction.',
  },
  {
    num: 7,
    statement: 'The patient takes fexofenadine (Allegra) for seasonal allergies. Why does fexofenadine cause significantly less sedation than first-generation antihistamines like diphenhydramine (Benadryl)?',
    options: {
      a: 'Fexofenadine acts on alpha-1 adrenergic receptors rather than histamine receptors',
      b: 'Fexofenadine is a second-generation H1-blocker that does not readily cross the blood-brain barrier',
      c: 'Fexofenadine stimulates central nervous system serotonin receptors',
      d: 'Fexofenadine undergoes complete first-pass hepatic metabolism',
    },
    correct_option: 'b',
    explanation: 'Fexofenadine (Allegra) is a second-generation peripheral H1-receptor antagonist. Due to its polar chemical structure, it does not easily cross the blood-brain barrier, resulting in minimal CNS depression and lack of sedation.',
  },
  {
    num: 8,
    statement: 'The patient takes apixaban (Eliquis) for atrial fibrillation. What is the mechanism of action of apixaban?',
    options: {
      a: 'Vitamin K epoxide reductase inhibitor',
      b: 'Direct thrombin (Factor IIa) inhibitor',
      c: 'Direct Factor Xa inhibitor',
      d: 'Irreversible cyclooxygenase-1 (COX-1) inhibitor',
    },
    correct_option: 'c',
    explanation: 'Apixaban (Eliquis) is a Direct Oral Anticoagulant (DOAC) that directly and selectively inhibits Factor Xa in both the intrinsic and extrinsic coagulation pathways, preventing thrombin generation and clot formation.',
  },
  {
    num: 9,
    statement: 'The patient has a prescription for sublingual nitroglycerin for acute angina. Which protocol should the dental team follow regarding nitroglycerin during dental appointments?',
    options: {
      a: 'Keep the patient\'s nitroglycerin bottle on the bracket table and ensure office emergency kit nitroglycerin is accessible',
      b: 'Instruct the patient to take one sublingual tablet prophylacticly 30 minutes before every dental visit',
      c: 'Store nitroglycerin in an unsealed plastic cup on the counter',
      d: 'Administer nitroglycerin continuously every 2 minutes if chest pain occurs',
    },
    correct_option: 'a',
    explanation: 'For patients with a history of angina, the patient\'s personal nitroglycerin should be placed within immediate reach on the bracket table. Nitroglycerin must be stored in its original dark glass container (it adsorbs to plastic and is degraded by heat/moisture). In an acute attack, 1 tablet is given sublingually every 5 minutes (maximum 3 doses in 15 minutes); if pain persists, call 911 immediately.',
  },
  {
    num: 10,
    statement: 'Nitroglycerin is strictly contraindicated within 24 hours of taking which class of medications due to the risk of severe, fatal hypotension?',
    options: {
      a: 'Phosphodiesterase-5 (PDE-5) inhibitors (e.g., sildenafil, tadalafil)',
      b: 'Second-generation antihistamines (fexofenadine)',
      c: 'Beta-2 adrenergic agonists (albuterol)',
      d: 'Inhaled corticosteroids (budesonide)',
    },
    correct_option: 'a',
    explanation: 'Combining nitrates with PDE-5 inhibitors (sildenafil/Viagra within 24 hrs, tadalafil/Cialis within 48 hrs) produces synergistic cyclic GMP accumulation and profound systemic vasodilation, resulting in life-threatening hypotension and cardiovascular collapse.',
  },
]

async function translateBatch(qs: typeof CASE_A_QUESTIONS): Promise<Record<number, any>> {
  const payload = qs.map((q) => ({
    num: q.num,
    question_text: q.statement,
    option_a: q.options.a,
    option_b: q.options.b,
    option_c: q.options.c,
    option_d: q.options.d,
    explanation: q.explanation,
  }))

  const prompt = `You are an expert dental hygiene board exam (NBDHE) translator. Translate the following array of case study pharmacology questions into professional dental Spanish (Latin America and Spain). Preserve pharmacological terms and dental accuracy.

Return a valid JSON array matching this schema:
[
  {
    "num": 1,
    "question_text_es": "translated question",
    "option_a_es": "translated option A",
    "option_b_es": "translated option B",
    "option_c_es": "translated option C",
    "option_d_es": "translated option D",
    "explanation_es": "translated explanation"
  }
]

JSON payload:
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
  console.log('=== Step 1: Translating Case A (10 questions) ===')
  const transA = await translateBatch(CASE_A_QUESTIONS)
  console.log(`✅ Translated Case A: ${Object.keys(transA).length} questions.`)

  console.log('\n=== Step 2: Translating Case B (10 questions) ===')
  const transB = await translateBatch(CASE_B_QUESTIONS)
  console.log(`✅ Translated Case B: ${Object.keys(transB).length} questions.`)

  console.log('\n=== Step 3: Inserting Case A questions into Supabase ===')
  const rowsA = CASE_A_QUESTIONS.map((q) => {
    const es = transA[q.num] || {}
    return {
      track: 'nbdhe',
      week_number: 6,
      chapter_tag: 'ch11',
      case_set_id: CASE_A_ID,
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

  const { data: insA, error: errA } = await supabase
    .from('questions')
    .insert(rowsA)
    .select('id, sequence_order, question_text')

  if (errA) {
    console.error('Error inserting Case A:', errA.message)
  } else {
    console.log(`✅ Inserted ${insA?.length} questions for Case A!`)
  }

  console.log('\n=== Step 4: Inserting Case B questions into Supabase ===')
  const rowsB = CASE_B_QUESTIONS.map((q) => {
    const es = transB[q.num] || {}
    return {
      track: 'nbdhe',
      week_number: 6,
      chapter_tag: 'ch11',
      case_set_id: CASE_B_ID,
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

  const { data: insB, error: errB } = await supabase
    .from('questions')
    .insert(rowsB)
    .select('id, sequence_order, question_text')

  if (errB) {
    console.error('Error inserting Case B:', errB.message)
  } else {
    console.log(`✅ Inserted ${insB?.length} questions for Case B!`)
  }

  // Verification
  console.log('\n=== Final Supabase Case Verification ===')
  const { data: totalCaseQs } = await supabase
    .from('questions')
    .select('id, chapter_tag, week_number, case_set_id')
    .eq('chapter_tag', 'ch11')
    .not('case_set_id', 'is', null)

  const { data: totalStandaloneQs } = await supabase
    .from('questions')
    .select('id, chapter_tag, week_number, case_set_id')
    .eq('chapter_tag', 'ch11')
    .is('case_set_id', null)

  console.log(`Total Chapter 11 Standalone Questions in DB: ${totalStandaloneQs?.length}`)
  console.log(`Total Chapter 11 Case Questions in DB: ${totalCaseQs?.length}`)
  console.log(`Grand Total Chapter 11 Questions in DB: ${(totalStandaloneQs?.length || 0) + (totalCaseQs?.length || 0)}`)
}

main()
